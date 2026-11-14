/* Piano cloud sync v1.0.0. Only publishable configuration belongs in this file. */
(function (global) {
  'use strict';
  const PROJECT_URL = 'https://bwsqextibrjbunlpdwok.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_cEcuxPKe1l55D-7WROwbwA_DTWAlGe3';
  const LABELS = {blues:'Blues', jazz:'Jazz', bases:'Bases de l’impro', ear:'Écoute intérieure'};
  const KEYS = {
    blues:['parcours-improvisation-olivier-v2'],
    jazz:['parcours-improvisation-jazz-olivier-v4','parcours-improvisation-jazz-olivier-v3'],
    bases:['bases_improvisation_132_olivier_v1','bases_improvisation_208_olivier_v4'],
    ear:['olivier.ecoute-interieure.v1']
  };
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o || {},k);
  const object = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  function stable(value) {
    if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
    if (object(value)) return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  function fingerprint(value) {
    const text=stable(value); let h=2166136261;
    for(let i=0;i<text.length;i++) h=Math.imul(h^text.charCodeAt(i),16777619);
    return text.length+':'+(h>>>0);
  }
  function recordMap(app,raw) {
    if (!object(raw)) return null;
    if (app==='ear') {
      if(raw.appId!=='ecoute-interieure'||raw.version!==1||!Array.isArray(raw.records)) return null;
      const result=Object.create(null);
      for(const r of raw.records) if(object(r)&&r.id) result[String(r.id)]=r;
      return result;
    }
    const records=raw[app==='bases'?'sessionRecords':'sessions'];
    return object(records)?records:null;
  }
  function observe(app,raw,previous,now=Date.now()) {
    const records=recordMap(app,raw);
    if(!records) throw new Error('Journal de séances incompatible.');
    const sig=fingerprint(raw);
    if(previous?.sig===sig) return previous;
    const meta={sig,revision:Math.max(now,(previous?.revision||0)+1),records:{},
      clocks:{...(previous?.clocks||{})},tombstones:{...(previous?.tombstones||{})},
      acks:{...(previous?.acks||{})},lastSuccess:previous?.lastSuccess||null};
    for(const [id,record] of Object.entries(records)) {
      meta.records[id]=fingerprint(record);
      if(previous && (!own(previous.records,id)||previous.records[id]!==meta.records[id])) meta.clocks[id]=now;
      else if(!own(meta.clocks,id)) meta.clocks[id]=0;
      // A record explicitly brought back after removal is a new edit.
      if(own(meta.tombstones,id)) {meta.clocks[id]=now;delete meta.tombstones[id];}
    }
    if(previous) for(const id of Object.keys(previous.records||{})) if(!own(records,id)) {
      meta.tombstones[id]=now;delete meta.clocks[id];
    }
    return meta;
  }
  function completed(app,r) {return app==='blues'||app==='jazz'?r?.completed===true:r?.done===true;}
  // Installations keep independent snapshots. Merge session IDs, never totals.
  // Per-record clocks let a correction replace an older duration, and tombstones
  // prevent a removed session reappearing from an older installation.
  function mergeSnapshots(app,snapshots) {
    const valid=snapshots.filter(s=>s.app_id===app&&recordMap(app,s.payload));
    if(!valid.length) return null;
    valid.sort((a,b)=>String(a.updated_at||'').localeCompare(String(b.updated_at||''))||String(a.device_id).localeCompare(String(b.device_id)));
    const base=JSON.parse(JSON.stringify(valid.at(-1).payload));
    const winners=new Map();
    for(const snapshot of valid) {
      for(const [id,record] of Object.entries(recordMap(app,snapshot.payload))) {
        const clock=Number(snapshot.record_clocks?.[id])||0, old=winners.get(id);
        // At initial import the edit time is unknown (0). Prefer a completed
        // session over an untouched default from another installation.
        const preferBaseline=clock===0 && old?.clock===0 && !old.deleted && completed(app,old.record) && !completed(app,record);
        if(!preferBaseline && (!old||clock>=old.clock)) winners.set(id,{clock,record,deleted:false});
      }
      for(const [id,time] of Object.entries(snapshot.tombstones||{})) {
        const clock=Number(time)||0,old=winners.get(id);
        if(clock>0&&(!old||clock>=old.clock)) winners.set(id,{clock,deleted:true});
      }
    }
    const merged=Object.create(null);
    for(const [id,w] of winners) if(!w.deleted) merged[id]=w.record;
    if(app==='ear') base.records=Object.values(merged);
    else base[app==='bases'?'sessionRecords':'sessions']=merged;
    return base;
  }
  const core={KEYS,LABELS,recordMap,observe,mergeSnapshots,fingerprint,completed};
  if(typeof module==='object'&&module.exports) {module.exports=core;return;}
  global.PianoCloudCore=core;
  const script=document.currentScript,app=script?.dataset.pianoApp;
  if(!app || (!KEYS[app]&&app!=='dashboard')) return;
  const start=()=>boot(app,core);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();

  function boot(app,core) {
    if(document.getElementById('piano-cloud-host')) return;
    const isDashboard=app==='dashboard',AUTH_KEY='piano-cloud-auth-v1';
    const META_KEY='piano-cloud-meta-v1:'+app,DEVICE_KEY='piano-cloud-device-v1';
    const host=document.createElement('div');host.id='piano-cloud-host';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>
      :host{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172a40}
      *{box-sizing:border-box}button,input,a{font:inherit}button{cursor:pointer;min-height:44px;border:1px solid #cbd8df;border-radius:10px;padding:9px 15px;background:white;color:#172a40}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #1e7d9c;outline-offset:3px}button:disabled{opacity:.6;cursor:wait}
      #launch{position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));right:14px;z-index:9900;box-shadow:0 3px 18px #17314522;background:#fff;border-color:#b7cbd5;font-size:13px;font-weight:650;max-width:calc(100vw - 28px)}
      dialog{width:min(500px,calc(100vw - 28px));max-height:85dvh;overflow:auto;border:0;border-radius:20px;padding:25px;box-shadow:0 15px 80px #11273844;color:#172a40;background:#fff}
      dialog::backdrop{background:#10273d66}h2{font-size:23px;margin:0 36px 10px 0}p{margin:10px 0}.muted,small{color:#596d7c}small{display:block}.close{position:absolute;right:13px;top:12px;font-size:22px;padding:0;width:40px;border:0}
      label{display:block;font-weight:600;margin-top:15px}input{display:block;width:100%;margin-top:5px;padding:11px 12px;border:1px solid #bccbd4;border-radius:9px;background:#fff;color:#172a40;min-height:46px;font-size:16px}
      .primary{background:#175e76;color:white;border-color:#175e76}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.status{background:#eff6f8;border-radius:10px;padding:12px;margin:15px 0;overflow-wrap:anywhere}.error{color:#a63131}ul{padding-left:20px}li{margin:6px 0}a{color:#175e76}details{font-size:13px;margin-top:18px}summary{cursor:pointer;min-height:30px}code{font-size:12px}#account{overflow-wrap:anywhere;font-size:13px}#message{min-height:24px} [hidden]{display:none!important}
      @media print{:host{display:none}}
    </style><button id="launch" type="button">☁ Connecter mon suivi</button>
    <dialog aria-labelledby="cloud-title"><button class="close" id="close" type="button" aria-label="Fermer">×</button>
      <h2 id="cloud-title">Mon suivi synchronisé</h2>
      <p class="muted">${isDashboard?'Retrouve ici les séances transmises par tes quatre applications.':'Ton suivi '+LABELS[app]+' rejoint automatiquement le tableau de bord, même depuis cette icône sur iPad.'}</p>
      <div class="status" id="message" role="status" aria-live="polite">Connecte ton accès Piano pour activer la synchronisation.</div>
      <form id="login"><label>Adresse e-mail<input name="email" type="email" autocomplete="username" required></label><label>Mot de passe de ton accès Piano<input name="password" type="password" autocomplete="current-password" required></label><div class="actions"><button class="primary" type="submit">Se connecter</button></div>
      <details><summary>Première connexion</summary><p>Crée une seule fois ton accès Piano dans <a href="https://supabase.com/dashboard/project/bwsqextibrjbunlpdwok/auth/users" target="_blank" rel="noopener noreferrer">la page Utilisateurs de ton projet</a> : Add user → Create new user, avec ton e-mail et un mot de passe. Laisse « Auto Confirm User » activé. Réutilise ce même accès dans les cinq applications.</p></details></form>
      <div id="connected" hidden><p id="account"></p><div class="actions"><button class="primary" id="sync" type="button">${isDashboard?'Actualiser le tableau de bord':'Synchroniser maintenant'}</button><button id="logout" type="button">Déconnecter cette application</button></div><ul id="sources" hidden></ul></div>
      <p><small>Les séances restent enregistrées sur cet appareil. La synchronisation transmet le suivi, les durées et les notes à ton espace privé. En cas de coupure, rouvre l’application avec Internet pour terminer l’envoi.</small></p>
      ${!isDashboard?'<p><a href="https://olivierplataroti-svg.github.io/parcours-improvisation-piano/tableau-de-bord-piano/" target="_blank" rel="noopener noreferrer">Ouvrir mon tableau de bord</a></p>':''}
    </dialog>`;
    document.body.append(host);
    // The Jazz site's React hydration can replace its document body. Keep the
    // independent sync control mounted without changing the application's tree.
    if(global.MutationObserver)new MutationObserver(()=>{
      if(!host.isConnected&&document.body)document.body.append(host);
    }).observe(document.documentElement,{childList:true,subtree:true});
    const $=id=>shadow.getElementById(id),dialog=shadow.querySelector('dialog');
    const launch=$('launch'),message=$('message'),form=$('login');
    let session=null,busy=false,timer=null,refreshNeeded=false,lastRows=[],lastCloudSignature='';
    const rawSet=Storage.prototype.setItem;
    function read(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
    function save(key,value){rawSet.call(localStorage,key,JSON.stringify(value));}
    function status(text,tone=''){message.textContent=text;message.classList.toggle('error',tone==='error');}
    function badge(text){launch.textContent='☁ '+text;}
    function accountUI(){form.hidden=!!session;$('connected').hidden=!session;$('account').textContent=session?'Accès connecté : '+session.user.email:'';}
    function problem(error){
      if(navigator.onLine===false||error instanceof TypeError||/Failed to fetch|NetworkError|Load failed/i.test(error?.message||'')) {
        badge('En attente de connexion');status('Connexion indisponible. Ton suivi local est conservé ; l’envoi reprendra à la prochaine ouverture avec Internet.');
      } else if(error?.status===401||/JWT|refresh token|Invalid login|Email not confirmed/i.test(error?.message||'')) {
        badge('Connexion à renouveler');status('Vérifie ton adresse et le mot de passe de ton accès Piano. Ton compte de gestion Supabase peut utiliser un autre accès.','error');
      } else {badge('Synchronisation à vérifier');status('La synchronisation n’a pas abouti. Ton suivi reste sur cet appareil. Réessaie avec « Synchroniser maintenant ».','error');}
    }
    $('close').onclick=()=>dialog.close();launch.onclick=()=>{accountUI();dialog.showModal();};
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    if(!global.supabase?.createClient){badge('Connexion indisponible');status('Rouvre cette application avec Internet pour terminer sa mise à jour.','error');return;}
    const client=global.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    function device(){let id=read(DEVICE_KEY);if(!id){id=crypto.randomUUID();save(DEVICE_KEY,id);}return id;}
    function localPayload(){
      for(const key of KEYS[app]||[]) {const raw=read(key);if(recordMap(app,raw))return raw;}
      return null;
    }
    function capture(){
      const raw=localPayload();if(!raw)return null;
      const previous=read(META_KEY),meta=observe(app,raw,previous);
      if(meta!==previous)save(META_KEY,meta);
      return {raw,meta};
    }
    function schedule(){clearTimeout(timer);timer=setTimeout(()=>sync(),1400);}
    // Observe the existing save path. Never rewrite any application's data key.
    if(!isDashboard){
      Storage.prototype.setItem=function(key,value){
        rawSet.call(this,key,value);
        if(this===localStorage&&KEYS[app].includes(String(key))) {
          try{capture();if(session){badge('Mise à jour en attente');schedule();}}catch{badge('Suivi conservé localement');}
        }
      };
      try{capture();}catch{/* The application still owns and saves its local data. */}
    }
    async function publish(){
      const current=capture();
      if(!current){badge('En attente d’un suivi');status('Ouvre ton parcours et enregistre une séance pour démarrer la synchronisation.');return;}
      const {raw,meta}=current,uid=session.user.id;
      if(meta.acks?.[uid]===meta.revision){badge('Suivi synchronisé');status('Ton suivi est synchronisé'+(meta.lastSuccess?' · '+new Date(meta.lastSuccess).toLocaleString('fr-FR'):'')+'.');return;}
      badge('Envoi du suivi…');status('Envoi de ton suivi vers ton espace privé…');
      const {data,error}=await client.rpc('piano_publish_snapshot',{p_app:app,p_device:device(),p_revision:meta.revision,p_payload:raw,p_record_clocks:meta.clocks,p_tombstones:meta.tombstones});
      if(error)throw error;
      const accepted=data?.[0];if(!accepted)throw new Error('No acknowledgement');
      const latest=read(META_KEY);
      if(Number(accepted.client_revision)>meta.revision){latest.revision=Number(accepted.client_revision)+1;save(META_KEY,latest);refreshNeeded=true;return;}
      latest.acks[uid]=meta.revision;latest.lastSuccess=accepted.updated_at;save(META_KEY,latest);
      if(latest.revision!==meta.revision){refreshNeeded=true;return;}
      badge('Suivi synchronisé');status('Ton historique et tes modifications sont synchronisés · '+new Date(accepted.updated_at).toLocaleString('fr-FR')+'.');
    }
    async function receive(){
      const {data,error}=await client.from('piano_snapshots').select('app_id,device_id,payload,record_clocks,tombstones,updated_at,client_revision').eq('user_id',session.user.id).order('updated_at');
      if(error)throw error;
      lastRows=data||[];
      const sources={};for(const track of Object.keys(KEYS)){const raw=mergeSnapshots(track,lastRows);if(raw)sources[track]=raw;}
      const sig=fingerprint(sources);
      if(sig!==lastCloudSignature){
        if(!global.PianoDashboard?.applyCloudSources)throw new Error('Dashboard adapter unavailable');
        global.PianoDashboard.applyCloudSources(sources,session.user.id);lastCloudSignature=sig;
      }
      const count=Object.keys(sources).length;
      badge(count+' / 4 parcours synchronisés');
      status(count?'Tableau de bord actualisé · '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'.':'Aucun parcours reçu pour le moment. Connecte le même accès Piano depuis chacune de tes quatre icônes.');
      $('sources').hidden=false;$('sources').replaceChildren();
      for(const track of Object.keys(KEYS)) {
        const li=document.createElement('li');const rs=sources[track]?recordMap(track,sources[track]):null;
        const n=rs?Object.values(rs).filter(r=>completed(track,r)).length:0;
        li.textContent=LABELS[track]+' : '+(rs?n+' séance(s) terminée(s)':'en attente de la première connexion');$('sources').append(li);
      }
    }
    async function sync(){
      if(!session||document.hidden)return;
      if(busy){refreshNeeded=true;return;}
      if(navigator.onLine===false){problem(new TypeError('Offline'));return;}
      busy=true;$('sync').disabled=true;
      try{if(isDashboard)await receive();else await publish();}catch(error){problem(error);}
      finally{busy=false;$('sync').disabled=false;if(refreshNeeded){refreshNeeded=false;schedule();}}
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();const submit=form.querySelector('button[type=submit]');submit.disabled=true;
      try{
        status('Connexion en cours…');
        const {data,error}=await client.auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
        if(error)throw error;
        session=data.session;form.elements.password.value='';accountUI();await sync();
      }catch(error){problem(error);}finally{submit.disabled=false;}
    });
    $('sync').onclick=()=>sync();
    $('logout').onclick=async()=>{
      const {error}=await client.auth.signOut({scope:'local'});if(error){problem(error);return;}
      session=null;lastCloudSignature='';accountUI();badge('Connecter mon suivi');status('Cette application est déconnectée. Les données locales sont conservées.');
    };
    client.auth.onAuthStateChange((event,next)=>{
      session=next;accountUI();
      if(next)setTimeout(()=>sync(),0);
      else {badge('Connecter mon suivi');if(event==='SIGNED_OUT')status('Connecte ton accès Piano pour reprendre la synchronisation.');}
    });
    client.auth.getSession().then(({data,error})=>{if(error)throw error;session=data.session;accountUI();if(session)sync();}).catch(problem);
    window.addEventListener('online',()=>sync());window.addEventListener('focus',()=>sync());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
    window.addEventListener('storage',e=>{if(!isDashboard&&KEYS[app].includes(e.key))schedule();});
    // No background-execution claim: iPad may suspend a closed application.
    setInterval(()=>{if(!document.hidden)sync();},isDashboard?30000:20000);
    global.PianoCloudSync={sync,open:()=>{accountUI();dialog.showModal();},version:'1.0.0'};
  }
})(globalThis);
