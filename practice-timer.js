(function(g){'use strict';
// One stopwatch per application; independent of practice records and cloud snapshots.
const app=typeof document!=='undefined'?document.currentScript?.dataset.practiceApp:'test';
function clean(v){return {piano:Math.max(0,Number(v?.piano)||0),off:Math.max(0,Number(v?.off)||0),started:Number.isFinite(v?.started)&&v.started>0?v.started:null,mode:v?.mode==='off'?'off':'piano',reported:v?.reported===true}}
function elapsed(s,now=Date.now()){const v=clean(s);if(v.started)v[v.mode]+=Math.max(0,now-v.started);v.started=null;return v}
function pause(s,now=Date.now()){return elapsed(s,now)}
function start(s,now=Date.now()){const v=s.reported?clean({mode:s.mode}):clean(s);if(!v.started)v.started=now;return v}
function switchMode(s,mode,now=Date.now()){const running=!!s.started,v=elapsed(s,now);v.mode=mode==='off'?'off':'piano';if(running)v.started=now;return v}
function minutes(ms){return ms>0?Math.max(1,Math.round(ms/60000)):0}
function report(s,now=Date.now()){const v=elapsed(s,now),pianoMinutes=minutes(v.piano),offPianoMinutes=minutes(v.off);return {pianoMinutes,offPianoMinutes,minutes:pianoMinutes+offPianoMinutes,activityMode:pianoMinutes&&offPianoMinutes?'mixed':offPianoMinutes?'off-piano':'piano'}}
function fromLegacy(old){if(!old||typeof old!=='object')return null;return clean({mode:'off',off:Math.max(0,(Number(old.elapsed)||0)*1000),started:old.running?Number(old.startedAt):null})}
const api={clean,elapsed,pause,start,switchMode,minutes,report,fromLegacy};
if(typeof module!=='undefined')module.exports=api;
if(typeof document==='undefined')return;
g.PracticeTimer=api;
const KEY='olivier.practice-timer.v1.'+app,isVocab=app==='vocab',isEar=app==='ear';let state=clean({mode:isEar?'off':'piano'}),storageOK=true;
try{state=clean(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){storageOK=false}
// Preserve an unfinished measurement from the retired ear-training timer once.
if(isEar){try{if(!localStorage.getItem(KEY)){const old=JSON.parse(localStorage.getItem('olivier.ecoute-interieure.v1')||'null')?.timer;if(old){state=fromLegacy(old);persist();}}}catch(e){storageOK=false}}
api.pauseNow=()=>{state=pause(state);persist();paint()};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true}catch(e){storageOK=false}}
const style=document.createElement('style');style.textContent=`
.pt-widget{box-sizing:border-box;border:1px solid #8fabbf;border-radius:14px;background:${isVocab?'#faedf4':'#f4f8fc'};color:#142f43;padding:14px;font:16px/1.45 system-ui,sans-serif;grid-column:1/-1;margin:12px 0}
.pt-widget button,.pt-widget select{font:inherit;min-height:42px;border:1px solid #91a5b5;border-radius:8px;padding:8px 12px;background:white;color:#142f43;cursor:pointer}
.pt-widget button:disabled{opacity:.5;cursor:default}.pt-widget button:focus-visible{outline:3px solid #245b83;outline-offset:2px}
.pt-widget [data-pt=start]{background:#164a6f;color:white}.pt-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pt-clock{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:1px}.pt-note{font-size:14px;margin:8px 0 0}.pt-widget h3{font:700 17px system-ui;margin:0 0 8px}
[data-practice-timer-slot]{grid-column:1/-1;padding:0;background:none;display:block;min-width:0}.pt-home{width:100%;margin:0 0 24px;position:relative;z-index:1}.pt-home .pt-clock{font-size:30px}.pt-widget label{display:inline-flex;align-items:center;gap:8px}.pt-widget [hidden]{display:none!important}
@media print{.pt-widget{display:none}}`;

function content(){return `<h3>Chronomètre de pratique</h3><div class="pt-row"><output class="pt-clock" aria-label="Temps écoulé" data-pt-clock>00:00</output>${isVocab?'<label>Travail <select data-pt-mode aria-label="Nature du temps chronométré"><option value="piano">Au piano</option><option value="off">Hors piano</option></select></label>':''}</div><div class="pt-row" style="margin-top:10px"><button type="button" data-pt="start">Démarrer</button><button type="button" data-pt="pause">Pause</button><button type="button" data-pt="use">Utiliser la durée</button><button type="button" data-pt="reset">Remettre à zéro</button></div><p class="pt-note" data-pt-message role="status"></p>`}
const home=document.createElement('section');home.id='pt-home';home.className='pt-widget pt-home';home.setAttribute('aria-label','Chronomètre de pratique');home.innerHTML=content();
let message='',scheduled=false;
function format(ms){const sec=Math.floor(ms/1000),h=Math.floor(sec/3600),m=Math.floor(sec/60)%60,s=sec%60;return(h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function target(){if(isEar)return document.querySelector('dialog[open] form[data-form=record] input[name=minutes]');if(isVocab)return document.querySelector('#sessionForm .session-time,#lickSessionForm .session-time');const bases=document.getElementById('editActual');if(bases&&bases.closest('.modal.open'))return bases;return [...document.querySelectorAll('.editor-form input[type=number]')].find(el=>/durée/i.test(el.closest('label')?.textContent||''))||null}
function write(input,value){if(!input)return;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,String(value));
 // React-controlled inputs retain their existing change handler in the deployed exports.
 const propsKey=Object.keys(input).find(k=>k.startsWith('__reactProps$'));const handler=propsKey&&input[propsKey]?.onChange;
 if(handler)handler({target:input,currentTarget:input});else{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}
}
function useDuration(){const dest=target();if(!dest){message='Ouvre la fiche de séance à enregistrer, puis touche « Utiliser la durée ».';return}
 const t=report(state);if(!t.minutes){message='Démarre le chronomètre avant de reporter une durée.';return}
 if(isVocab){if(t.minutes>720){message='La séance dépasse la limite de 720 minutes. Ajuste la durée manuellement.';return}const mode=dest.querySelector('[data-time-mode]');mode.value=t.activityMode;mode.dispatchEvent(new Event('change',{bubbles:true}));if(t.activityMode==='mixed'){write(dest.querySelector('[data-time-value=piano]'),t.pianoMinutes);write(dest.querySelector('[data-time-value=off]'),t.offPianoMinutes)}else write(dest.querySelector('[data-time-value=single]'),t.minutes)}
 else{dest.min='1';if(t.minutes>Number(dest.max||1440)){message='La durée dépasse la limite de la séance. Ajuste-la manuellement.';return}write(dest,t.minutes)}
 state=pause(state);state.reported=true;persist();message='Durée reportée : '+t.minutes+' min. Enregistre la séance pour actualiser les compteurs.';
}
function paint(){const t=elapsed(state),total=t.piano+t.off;for(const el of document.querySelectorAll('[data-pt-clock],[data-pt-summary]')){const value=format(total)+(state.started?' · en cours':'');if(el.textContent!==value)el.textContent=value}
 for(const box of document.querySelectorAll('.pt-widget')){const b=box.querySelector('[data-pt=start]');b.textContent=state.reported?'Nouveau chrono':total?'Reprendre':'Démarrer';b.disabled=!!state.started;box.querySelector('[data-pt=pause]').disabled=!state.started;box.querySelector('[data-pt=use]').disabled=!total;const mode=box.querySelector('[data-pt-mode]');if(mode)mode.value=state.mode;const p=box.querySelector('[data-pt-message]');const text=message||(!storageOK?'Chronomètre en mémoire uniquement : garde cette page ouverte.':isVocab?'Piano : '+format(t.piano)+' · hors piano : '+format(t.off):'Le chronomètre ne valide aucune séance automatiquement.');if(p.textContent!==text)p.textContent=text}
}
function attach(){scheduled=false;
 // Wait until React has hydrated; otherwise it removes nodes appended during startup.
 const status=document.querySelector('.save-state');if(status&&/Ouverture/.test(status.textContent))return;
 if(!style.isConnected)document.head.appendChild(style);
 const parentSlot=document.querySelector('[data-practice-timer-slot]')||document.querySelector('.page-stack')||document.querySelector('.page.active')||document.querySelector('main#main')||document.querySelector('#content');
 if(parentSlot&&!parentSlot.contains(home)){const heading=parentSlot.querySelector(':scope > .page-head');if(heading)heading.after(home);else parentSlot.prepend(home)}
 const dest=target();if(dest){const parent=isVocab?dest:dest.closest('.editor-form,#sessionModalContent,form[data-form=record]');if(parent&&!parent.querySelector('.pt-inline')){const box=document.createElement('section');box.className='pt-widget pt-inline';box.innerHTML=content();parent.prepend(box)}}paint()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pt]');if(!b)return;e.preventDefault();message='';switch(b.dataset.pt){case'start':state=start(state);persist();break;case'pause':state=pause(state);persist();break;case'use':useDuration();break;case'reset':if((elapsed(state).piano+elapsed(state).off)>0&&!g.confirm('Remettre le chronomètre à zéro ? Les séances enregistrées sont conservées.'))return;state=clean({mode:state.mode});persist();break}paint()});
document.addEventListener('change',e=>{if(e.target.matches('[data-pt-mode]')){state=state.reported?clean({mode:e.target.value}):switchMode(state,e.target.value);message='';persist();paint()}});
// Observe form changes only; ticking clocks do not enqueue another observer cycle.
new MutationObserver(records=>{if(records.every(r=>(r.target.nodeType===3?r.target.parentElement:r.target).closest?.('.pt-widget')))return;if(!scheduled){scheduled=true;requestAnimationFrame(attach)}}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
g.addEventListener('storage',e=>{if(e.key===KEY){try{state=clean(JSON.parse(e.newValue));paint()}catch(err){}}});
document.addEventListener('visibilitychange',()=>{persist();paint()});g.addEventListener('pagehide',persist);setInterval(()=>{attach()},1000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})(typeof window!=='undefined'?window:globalThis);
