(function(g){'use strict';
const MANUAL_FROM='2026-11-22',HISTORY_END='2026-08-31';
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function clean(value){const days={};for(const [date,r] of Object.entries(value?.days||{})){const n=r?.minutes;if(validDate(date)&&date>HISTORY_END&&Number.isFinite(n)&&n>=0&&n<=1440)days[date]={minutes:n,updatedAt:typeof r.updatedAt==='string'?r.updatedAt:''}}return {manualFrom:MANUAL_FROM,days}}
function rows(pianoDates,value){const p=clean(value),days=new Map();for(const date of pianoDates)if(validDate(date)&&date<MANUAL_FROM)days.set(date,{date,minutes:60,estimated:true});for(const [date,r] of Object.entries(p.days))days.set(date,{date,minutes:r.minutes,estimated:false});return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({...r,id:'classical:'+r.date,track:'classical',title:r.estimated?'Classique · estimation conservée':'Classique · durée renseignée'}))}
const api={MANUAL_FROM,HISTORY_END,validDate,clean,rows};g.ClassicalPractice=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
