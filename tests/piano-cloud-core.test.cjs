const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../piano-sync.js');
const raw=(sessions)=>({version:5,sessions});
const session=(duration,completed=true)=>({completed,date:'2026-11-14',duration});
const snap=(app,payload,record_clocks={},tombstones={},updated_at='2026-11-14T12:00:00Z')=>({app_id:app,payload,record_clocks,tombstones,updated_at,device_id:'one'});

test('same session on two installations is counted once and a corrected duration wins',()=>{
 const rows=[snap('jazz',raw({S1:session(15)})),snap('jazz',raw({S1:session(27)}),{S1:42})];
 const merged=core.mergeSnapshots('jazz',rows);
 assert.equal(Object.keys(merged.sessions).length,1);assert.equal(merged.sessions.S1.duration,27);
});
test('unmodified defaults from a new installation do not overwrite completed history',()=>{
 const rows=[snap('jazz',raw({S1:session(25)})),snap('jazz',raw({S1:session(15,false)}),{}, {},'2026-11-14T13:00:00Z')];
 assert.equal(core.mergeSnapshots('jazz',rows).sessions.S1.duration,25);
});
test('an intentional uncheck replaces a completed session',()=>{
 const rows=[snap('jazz',raw({S1:session(25)})),snap('jazz',raw({S1:session(15,false)}),{S1:100})];
 assert.equal(core.mergeSnapshots('jazz',rows).sessions.S1.completed,false);
});
test('removal is propagated and a deliberate later restoration works',()=>{
 const first=raw({S1:session(25),S2:session(30)}),one=core.observe('jazz',first,null,100);
 const two=core.observe('jazz',raw({S2:session(30)}),one,200);
 assert.equal(two.tombstones.S1,200);
 const merged=core.mergeSnapshots('jazz',[snap('jazz',first),snap('jazz',raw({S2:session(30)}),two.clocks,two.tombstones)]);
 assert.deepEqual(Object.keys(merged.sessions),['S2']);
 const three=core.observe('jazz',first,two,300);assert.equal(three.clocks.S1,300);assert.equal(three.tombstones.S1,undefined);
});
test('offline changes remain pending until the exact revision is acknowledged',()=>{
 const first=core.observe('blues',raw({P1:session(15)}),null,100);
 first.acks.owner=first.revision;
 const offline=core.observe('blues',raw({P1:session(37)}),first,200);
 assert.notEqual(offline.acks.owner,offline.revision);assert.equal(offline.clocks.P1,200);
 assert.equal(core.observe('blues',raw({P1:session(37)}),offline,300),offline);
});
test('ear records remain an array and workshop duration changes replace the same ID',()=>{
 const ear=(minutes)=>({appId:'ecoute-interieure',version:1,records:[{id:'workshop',done:true,date:'2026-11-14',minutes}]});
 const merged=core.mergeSnapshots('ear',[snap('ear',ear(15)),snap('ear',ear(40),{workshop:200})]);
 assert.equal(merged.records.length,1);assert.equal(merged.records[0].minutes,40);
});
test('bases and legacy jazz keys are supported; incompatible payloads are ignored',()=>{
 assert.ok(core.KEYS.bases.includes('bases_improvisation_132_olivier_v1'));
 assert.ok(core.KEYS.jazz.includes('parcours-improvisation-jazz-olivier-v3'));
 const r=core.mergeSnapshots('bases',[snap('bases',{sessionRecords:{'1-0':{done:true,actualMinutes:35}}}),snap('bases',{sessions:[]})]);
 assert.equal(r.sessionRecords['1-0'].actualMinutes,35);
 assert.equal(core.mergeSnapshots('ear',[snap('ear',{records:[]})]),null);
});

// Exercise the actual dashboard's adapter and calculations with a DOM stub.
function dashboard(){
 const elements=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return true}},addEventListener(){},append(){},add(){},querySelectorAll(){return[]},length:1});return elements.get(id);}
 const localStorage={data:new Map(),getItem(k){return this.data.get(k)||null},setItem(k,v){this.data.set(k,v)}};
 const ctx={console,window:null,document:{getElementById:el,querySelectorAll(){return[]},addEventListener(){},hidden:false},localStorage,location:{hostname:'olivierplataroti-svg.github.io'},setInterval(){},setTimeout(){},clearTimeout(){},Option:function(){},Intl,Date,Math,Map,Set,JSON,Array,Object,Number,String,Boolean,Blob,URL};
 ctx.window=ctx;ctx.addEventListener=()=>{};
 const html=fs.readFileSync(require('node:path').join(__dirname,'../tableau-de-bord-piano/index.html'),'utf8');
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('function calculate('));
 assert.ok(inline);vm.runInNewContext(inline,ctx);
 return ctx;
}
test('real dashboard applies all four cloud sources and corrected duration while preserving classic and ear separation',()=>{
 const ctx=dashboard();const s={
  blues:{version:5,startDate:'2026-09-01',sessions:{P1:session(20)}},
  jazz:raw({S1:session(25)}),
  bases:{sessionRecords:{'1-0':{done:true,date:'2026-11-14',actualMinutes:30}}},
  ear:{appId:'ecoute-interieure',version:1,records:[{id:'e1',done:true,date:'2026-11-14',minutes:15}]}
 };
 ctx.PianoDashboard.applyCloudSources(s,'owner');
 assert.equal(ctx.PianoDashboard.getLoadedSources().length,4);
 const before=ctx.PianoDashboard.getStatistics();assert.equal(before.recordedMinutes,75);assert.equal(before.earMinutes,15);
 s.jazz=raw({S1:session(40)});ctx.PianoDashboard.applyCloudSources(s,'owner');
 const after=ctx.PianoDashboard.getStatistics();assert.equal(after.recordedMinutes,90);
 assert.equal(ctx.PianoDashboard.getClassicalLifetime().addedDays,1);
 ctx.PianoDashboard.applyCloudSources({},'different-user');assert.equal(ctx.PianoDashboard.getLoadedSources().length,0);
});
test('a cloud deletion resulting in an empty journal clears the dashboard totals',()=>{
 const ctx=dashboard();ctx.PianoDashboard.applyCloudSources({jazz:raw({S1:session(20)})},'owner');
 ctx.PianoDashboard.applyCloudSources({jazz:raw({})},'owner');
 assert.equal(ctx.PianoDashboard.getStatistics().empty,true);
});
test('classical lifetime is 380 historical hours plus 61 unique later days, with overlaps and ear-only days excluded',()=>{
 const ctx=dashboard();
 const days=Array.from({length:61},(_,i)=>new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10));
 const pianoSession=date=>({completed:true,date,duration:20});
 const blues={sessions:Object.fromEntries(days.map((date,i)=>['P'+i,pianoSession(date)]))};
 // Historical days are already part of the 380 h estimate.
 for(let i=1;i<=21;i++)blues.sessions['old'+i]=pianoSession('2026-08-'+String(i).padStart(2,'0'));
 const jazz={sessions:Object.fromEntries(days.slice(6).map((date,i)=>['S'+i,pianoSession(date)]))};
 const bases={sessionRecords:Object.fromEntries(days.map((date,i)=>[i+'-0',{done:true,date,actualMinutes:30}]))};
 const ear={appId:'ecoute-interieure',version:1,records:[{id:'ear-only',date:'2026-11-14',done:true,minutes:15}]};
 ctx.PianoDashboard.applyCloudSources({blues,jazz,bases,ear},'owner');
 const life=ctx.PianoDashboard.getClassicalLifetime();
 assert.equal(life.addedDays,61);assert.equal(life.inHistoryDays,21);assert.equal(life.classicalMinutes,441*60);
 assert.equal(life.totalMinutes,life.classicalMinutes+life.observedMinutes);
 assert.equal(life.musicMinutes,life.totalMinutes+15);
 assert.equal(ctx.PianoDashboard.getStatistics().tracks.classical.days.size,55);
});
test('a course starting before Blues still contributes its unique classical days',()=>{
 const ctx=dashboard();
 ctx.PianoDashboard.applyCloudSources({blues:{sessions:{P1:{completed:true,date:'2026-09-15',duration:20}}},bases:{sessionRecords:{a:{done:true,date:'2026-09-02',actualMinutes:25}}}},'owner');
 assert.equal(ctx.PianoDashboard.getClassicalLifetime().classicalMinutes,382*60);
 assert.equal(ctx.PianoDashboard.getClassicalLifetime().addedDays,2);
});
