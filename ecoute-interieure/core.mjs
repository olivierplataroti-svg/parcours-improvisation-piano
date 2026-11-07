export const APP_ID='ecoute-interieure';
export const STORE_KEY='olivier.ecoute-interieure.v1';
export const OBJECTIVES=['Reproduire une mélodie entendue','Entendre une partition en la lisant','Retrouver au piano une phrase intérieure','Entendre les accords et leurs enchaînements','Préentendre une phrase avant de l’improviser'];
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function today(){return new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function dayNumber(date){return Date.parse(date+'T12:00:00Z')/86400000}
export function fresh(){return{appId:APP_ID,version:1,profile:{name:'Olivier',currentStage:1,weeklyTarget:5,defaultDuration:12,theme:'light',startDate:'',root:48,tempo:65},stageOverrides:{},stageStatus:{},stageNotes:{},plans:{},extraPlans:[],records:[],journal:[],vocabulary:[],assessments:[],keys:{},timer:null,updatedAt:new Date().toISOString()}}
export function normalizeRecord(r){
 if(!r||typeof r!=='object')throw Error('Séance invalide.');
 const minutes=Number(r.minutes),stage=Number(r.stage);
 if(!Number.isFinite(minutes)||minutes<0||minutes>1440)throw Error('La durée doit être comprise entre 0 et 1 440 minutes.');
 if(!Number.isInteger(stage)||stage<1||stage>36)throw Error('Palier de séance invalide.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')||!Number.isFinite(dayNumber(r.date))||new Date(r.date+'T12:00:00Z').toISOString().slice(0,10)!==r.date)throw Error('Date de séance invalide.');
 const trials=Number(r.trials??10);if(!Number.isInteger(trials)||trials<1||trials>1000)throw Error('Nombre d’essais invalide.');
 const score=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);if(!Number.isInteger(n)||n<0||n>trials)throw Error('Un score dépasse le nombre d’essais.');return n};
 return{...r,id:String(r.id||uid()),stage,minutes,date:r.date,done:r.done!==false,trials,pitch:score(r.pitch),rhythm:score(r.rhythm),assisted:score(r.assisted),novel:r.novel===true,technical:r.technical===true,title:String(r.title||'Séance'),kind:['guided','extra','free'].includes(r.kind)?r.kind:'free',notes:String(r.notes||''),win:String(r.win||'')};
}
function safeMap(input){if(!input||typeof input!=='object'||Array.isArray(input))return{};const out={};for(const[k,v]of Object.entries(input)){if(!['__proto__','constructor','prototype'].includes(k))out[k]=v}return out}
export function importState(input){
 if(input?.appId!==APP_ID||input.version!==1)throw Error('Choisis une sauvegarde JSON de Mon écoute intérieure (version 1).');
 const base=fresh(),out={...base};
 out.profile={...base.profile,...safeMap(input.profile)};
 if(!Number.isInteger(Number(out.profile.currentStage))||out.profile.currentStage<1||out.profile.currentStage>36)throw Error('Palier courant invalide.');
 out.profile.currentStage=Number(out.profile.currentStage);
 out.profile.weeklyTarget=Math.max(1,Math.min(7,Number(out.profile.weeklyTarget)||5));
 out.profile.defaultDuration=Math.max(10,Math.min(15,Number(out.profile.defaultDuration)||12));
 out.profile.tempo=Math.max(40,Math.min(120,Number(out.profile.tempo)||65));
 out.profile.root=Math.max(36,Math.min(60,Number(out.profile.root)||48));
 out.profile.theme=out.profile.theme==='dark'?'dark':'light';
 for(const k of ['stageOverrides','stageStatus','stageNotes','plans','keys'])out[k]=safeMap(input[k]);
 for(const k of ['records','extraPlans','journal','vocabulary','assessments']){
  if(input[k]!==undefined&&!Array.isArray(input[k]))throw Error(`Le champ ${k} est invalide.`);
  out[k]=(input[k]||[]).map(x=>k==='records'?normalizeRecord(x):({...x,id:String(x.id||uid())}));
  const ids=out[k].map(x=>x.id);if(new Set(ids).size!==ids.length)throw Error(`Identifiants en double dans ${k}.`);
 }
 out.timer=input.timer&&Number.isFinite(input.timer.elapsed)&&Number.isFinite(input.timer.stage)?{...input.timer,running:false,startedAt:null}:null;
 out.updatedAt=new Date().toISOString();return out;
}
export function mergeStates(current,incoming){
 const a=importState(current),b=importState(incoming),out={...a};
 for(const k of ['records','extraPlans','journal','vocabulary','assessments'])out[k]=[...new Map([...a[k],...b[k]].map(x=>[x.id,x])).values()];
 for(const k of ['stageOverrides','stageStatus','stageNotes','plans','keys'])out[k]={...a[k],...b[k]};
 return out;
}
export function stats(state,date=today()){
 const rs=state.records.filter(x=>x.done),start=dayNumber(date)-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7);
 const week=rs.filter(r=>dayNumber(r.date)>=start&&dayNumber(r.date)<=dayNumber(date));
 const minutes=rs.reduce((s,r)=>s+r.minutes,0),days=new Set(rs.map(r=>r.date));
 return{sessions:rs.length,minutes,average:rs.length?minutes/rs.length:0,weekSessions:week.length,weekMinutes:week.reduce((s,r)=>s+r.minutes,0),days:days.size,validated:Object.values(state.stageStatus).filter(x=>x==='done').length};
}
export function qualification(state,stage){
 const records=state.records.filter(r=>r.done&&r.stage===stage),rhythmRequired=[11,12,18,21,32,34,35,36].includes(stage);
 const passes=records.filter(r=>!r.technical&&r.novel&&r.pitch!==null&&r.pitch/r.trials>=.8&&(!rhythmRequired||(r.rhythm!==null&&r.rhythm/r.trials>=.8)));
 const dates=[...new Set(passes.map(r=>r.date))].sort(),delayed=dates.length>1&&dayNumber(dates.at(-1))-dayNumber(dates[0])>=1;
 return{sessions:records.length,days:dates.length,delayed,rhythmRequired,ready:records.length>=5&&dates.length>=3&&delayed};
}
export function timerSeconds(timer,now=Date.now()){if(!timer)return 0;return Math.max(0,Math.floor((Number(timer.elapsed)||0)+(timer.running?Math.max(0,now-(Number(timer.startedAt)||now))/1000:0)))}
export function sessionPlan(stage,index,state){
 const labels=['Découvrir et comprendre','Retrouver sans aide','Stabiliser après un délai','Transférer à la musique','Vérifier les acquis'];
 return{stage,slot:String(index),title:labels[index]||'Séance optionnelle',duration:state.profile.defaultDuration,optional:index>4,objective:stage===1?['Retenir une note après une seconde. Vérifier la fiabilité du retour audio.','Retenir la note après deux secondes, sur trois hauteurs confortables.','Réaliser dix essais nouveaux et séparer première réponse et correction.','Confirmer la tenue de la note après un jour si possible.','Vérifier de nouveau ; découvrir le changement de cible seulement après validation.'][index]||'Consolider une hauteur confortable.':labels[index]||'Réviser un acquis',instructions:'',...state.plans[stage+'-'+index]};
}
export function csv(rows){return '\ufeff'+rows.map(row=>row.map(v=>{const s=String(v??'');return /[";\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}).join(';')).join('\r\n')}
export const noteName=m=>{const names=['Do','Do♯','Ré','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];return names[((m%12)+12)%12]};
export function makeQuestion(stage,root=48,random=Math.random){
 const pick=a=>a[Math.floor(random()*a.length)];let notes=[],durations=[],mode='echo',prompt='Écoute, garde le motif intérieurement, puis chante-le.',answer=null;
 if(stage<=2){const first=root+pick([0,2,4]);notes=stage===1?[first]:[first,pick([root,root+2,root+4].filter(n=>n!==first))];prompt=stage===1?'Écoute la note. Attends une à deux secondes, puis chante-la.':'Écoute A puis B. La note à garder et à chanter est la dernière : B.';}
 else if(stage<=4){mode='direction';const interval=pick(stage===3?[-5,-4,-3,0,3,4,5]:[-2,-1,0,1,2]),first=root+pick([0,2,4]);notes=[first,first+interval];answer=interval>0?'monte':interval<0?'descend':'pareil';prompt='La deuxième note est-elle plus haute, plus basse ou identique ?';}
 else if(stage>=23&&stage<=32){mode='harmony';const I=[root,root+4,root+7],V=[root-5,root-1,root+2],IV=[root-7,root-3,root];
  let choices=stage===23?[[root,root+4]]:stage===24?[I,IV,V]:stage===25?[I,[root,root+3,root+7]]:stage===26?[V,I]:stage===27?[I,IV,V]:stage===28?[[root+2,root+5,root+9,root+12]]:stage===29?[[...V,root+5]]:stage===30?[[...I,root+10],[...I,root+11]]:stage===31?[[root+2,root+5,root+9,root+12],[...V,root+5],[...I,root+11]]:[[...I,root+10],[...IV,root+3],[...V,root+5]];
  notes=pick(choices);prompt='Écoute cet accord en arpège, garde ses sons intérieurement, puis vérifie l’accord plaqué.';
 }else{
  let set=stage===7?[0,2]:stage<=14?[0,2,4]:stage===15?[0,2,4,5]:stage===16?[0,2,4,5,7]:stage===17||stage===18?[0,2,4,5,7,9,11,12]:[0,2,4];
  const n=stage===5||stage===6?2:stage<=8?3:stage===14?2:stage===13?3:stage>=33?3:4;notes=Array.from({length:n},()=>root+pick(set));
  if(stage>=13&&stage<=18){mode='reading';prompt='Écoute uniquement le Do de référence. Lis et entends le motif intérieurement, chante-le, puis écoute la correction.';}
  if(stage>=19&&stage<=22){mode='keyboard';prompt='Écoute et chante le motif. Prévois les touches, saisis ta réponse sans son, puis vérifie.';}
  if(stage>=33){mode='create';prompt='Imagine une phrase de deux ou trois notes avant de jouer. Utilise le clavier pour noter ton intention, puis écoute-la.';notes=[];}
 }
 durations=notes.map(()=>1);if(stage===11&&notes.length===4)durations=[1,.5,.5,2];
 return{stage,root,notes,durations,mode,prompt,answer};
}
