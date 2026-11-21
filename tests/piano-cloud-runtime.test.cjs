const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const code=fs.readFileSync(require('node:path').join(__dirname,'../piano-sync.js'),'utf8');
const settle=()=>new Promise(r=>setTimeout(r,25));

function runtime({offline=false,fail=false,rows=[],app='jazz'}={}){
 class Storage{constructor(){this.data=new Map()}getItem(k){return this.data.get(k)||null}setItem(k,v){this.data.set(k,String(v))}}
 const storage=new Storage();
 const key=app==='vocab'?'olivier.vocabulaire-ii-v-i.v1':'parcours-improvisation-jazz-olivier-v4';
 const original=app==='vocab'?{app:'vocabulaire-ii-v-i',version:1,sessions:[{id:'v1',completed:true,date:'2026-11-20',minutes:17,pianoMinutes:12,offPianoMinutes:5,notes:'private note',lickIds:['one','two']}],licks:[{id:'one',supports:['private URL']},{id:'two'}]}:{version:5,sessions:{S1:{completed:true,date:'2026-11-14',duration:20}}};
 storage.setItem(key,JSON.stringify(original));
 const elements=new Map(),calls=[],applied=[];
 const node=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,textContent:'',value:'',classList:{toggle(){}},addEventListener(type,cb){this[type]=cb},replaceChildren(){},append(){},showModal(){},close(){},elements:{email:{value:'piano@example.test'},password:{value:'secret-input'}},querySelector(){return node('submit')}});return elements.get(id)};
 const shadow={set innerHTML(v){},getElementById:node,querySelector(){return node('dialog')}};
 const host={id:'',attachShadow(){return shadow}};
 const session={user:{id:'owner',email:'piano@example.test'}};
 const client={auth:{onAuthStateChange(){},getSession:async()=>({data:{session}}),signOut:async()=>({}),signInWithPassword:async()=>({data:{session}})},
  async rpc(name,params){calls.push({name,params});return fail?{error:new TypeError('NetworkError')}:{data:[{client_revision:params.p_revision,updated_at:'2026-11-14T12:00:00Z'}]};},
  from(){return{select(){return this},eq(){return this},order:async()=>({data:rows})}}};
 const ctx={console,Storage,localStorage:storage,crypto:webcrypto,navigator:{onLine:!offline},supabase:{createClient(){return client}},
  document:{currentScript:{dataset:{pianoApp:app}},readyState:'complete',hidden:false,getElementById(){return null},createElement(type){return type==='div'?host:node('li'+Math.random())},body:{append(){}},addEventListener(){}},
  setTimeout(fn,ms){return setTimeout(fn,Math.min(ms,5))},clearTimeout,setInterval(){},PianoDashboard:{applyCloudSources(sources,user){applied.push({sources,user})}},addEventListener(){}};
 ctx.window=ctx;ctx.globalThis=ctx;vm.runInNewContext(code,ctx);
 return {ctx,storage,key,original,calls,applied,node,connect(){ctx.navigator.onLine=true;fail=false;}};
}
test('first connection sends existing history without changing the source application key',async()=>{
 const r=runtime();await settle();
 assert.equal(r.calls.length,1);assert.equal(r.calls[0].params.p_payload.sessions.S1.duration,20);
 assert.equal(r.storage.getItem(r.key),JSON.stringify(r.original));
 assert.equal(JSON.parse(r.storage.getItem('piano-cloud-meta-v1:jazz')).acks.owner,r.calls[0].params.p_revision);
});
test('an offline edit survives and is uploaded automatically when connectivity returns',async()=>{
 const r=runtime({offline:true});await settle();assert.equal(r.calls.length,0);
 r.storage.setItem(r.key,JSON.stringify({version:5,sessions:{S1:{completed:true,date:'2026-11-14',duration:35}}}));
 await settle();assert.equal(r.calls.length,0);
 const pending=JSON.parse(r.storage.getItem('piano-cloud-meta-v1:jazz'));assert.notEqual(pending.acks.owner,pending.revision);
 r.connect();await r.ctx.PianoCloudSync.sync();
 assert.equal(r.calls.length,1);assert.equal(r.calls[0].params.p_payload.sessions.S1.duration,35);
});
test('a failed upload is not acknowledged; manual retry keeps the full history',async()=>{
 const r=runtime({fail:true});await settle();
 assert.equal(JSON.parse(r.storage.getItem('piano-cloud-meta-v1:jazz')).acks.owner,undefined);
 r.connect();await r.ctx.PianoCloudSync.sync();
 assert.equal(r.calls.length,2);assert.equal(r.calls[1].params.p_payload.sessions.S1.duration,20);
});
test('dashboard receives cloud snapshots and passes merged raw data to its existing calculator',async()=>{
 const rows=[{app_id:'jazz',device_id:'d1',updated_at:'2026-11-14',record_clocks:{},tombstones:{},payload:{sessions:{S1:{completed:true,date:'2026-11-14',duration:20}}}}];
 const r=runtime({app:'dashboard',rows});await settle();
 assert.equal(r.calls.length,0);assert.equal(r.applied.length,1);assert.equal(r.applied[0].sources.jazz.sessions.S1.duration,20);assert.equal(r.applied[0].user,'owner');
 await r.ctx.PianoCloudSync.sync();assert.equal(r.applied.length,1);
});
test('Vocabulaire runtime publishes only its dashboard projection and acknowledges subsequent manual corrections',async()=>{
 const r=runtime({app:'vocab'});await settle();assert.equal(r.calls.length,1);
 assert.equal(r.calls[0].params.p_payload.sessions[0].pianoMinutes,12);
 assert.doesNotMatch(JSON.stringify(r.calls[0].params.p_payload),/private|lickIds/);
 r.storage.setItem(r.key,JSON.stringify({...r.original,sessions:[{...r.original.sessions[0],pianoMinutes:0,offPianoMinutes:17}]}));
 await settle();assert.equal(r.calls.length,2);assert.equal(r.calls[1].params.p_payload.sessions[0].offPianoMinutes,17);
 assert.equal(JSON.parse(r.storage.getItem(r.key)).licks.length,2);
});

