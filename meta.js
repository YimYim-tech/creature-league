// The screens around the battles share a few small rules: the session and the campfire, the words for sparks,
// the Power Form side of a card and the Star Book pages. Plain functions without the browser, so the tests run them.
export const SESSION_GAP=20*60e3,CAMPFIRE_BATTLES=10,CAMPFIRE_TIME=25*60e3,WAKE_MS=600,RITUAL_HOLD=1.5;
const num=v=>Number.isFinite(v)?v:null;
// A session is {start,last,battles}. Twenty minutes without a battle start a new one.
export function sessionLive(s,now){
  if(!s||typeof s!=='object')return null;const start=num(s.start),last=num(s.last),battles=num(s.battles);
  if(start==null||last==null||battles==null||last<start||last>now+60e3||now-last>SESSION_GAP)return null;
  return {start,last,battles:Math.max(0,Math.floor(battles))};
}
export function sessionAfterBattle(s,now){const v=sessionLive(s,now)||{start:now,last:now,battles:0};return {start:v.start,last:now,battles:v.battles+1};}
// A rest at the campfire starts the count again: no reward for going on, no penalty for stopping.
export const sessionRested=now=>({start:now,last:now,battles:0});
export function campfireReady(s,now){const v=sessionLive(s,now);return !!v&&(v.battles>=CAMPFIRE_BATTLES||now-v.start>=CAMPFIRE_TIME);}
// One spark, more sparks.
export const sparkWord=n=>n===1?'ניצוץ':'ניצוצות';
export const sparkTotal=(box,per)=>(box?.earned||0)*per+(box?.sparks||0);
// Every spark of a battle in order: how many diamonds shine after it, and whether it closed a box.
export function sparkSteps(before,after,per){const out=[];for(let t=before+1;t<=after;t++){const lit=t%per;out.push({lit:lit||per,box:lit===0});}return out;}
// The form side of a card: the same bars, from the stronger form, with what the form adds shown apart.
// A form fills its super faster (its super time is shorter), so its magic bar grows by the same share.
export function formCard(c,spec){const k=c.specialCooldown&&spec.specialCooldown?c.specialCooldown/spec.specialCooldown:1;return {...spec,magic:Math.min(100,Math.round((c.magic||60)*k))};}
export function formBars(base,form){return form.map((s,i)=>{const b=base[i]?.pct??s.pct;return {...s,base:Math.min(b,s.pct),gain:Math.max(0,s.pct-b)};});}
// Wins to go as dots: the lit ones are the wins already behind.
export function formDots(toGo,total){const n=Math.max(1,Math.floor(total)||1),left=Math.min(n,Math.max(0,Math.ceil(toGo)||0));return Array.from({length:n},(_,i)=>i<n-left);}
// The Wonder page shows only Wonders that exist, so it can always be finished.
export function wonderPage(list,seen){return (Array.isArray(list)?list:[]).filter(w=>w&&w.id).map(w=>{const n=Math.max(0,Math.min(9999,Math.floor(Number(seen?.[w.id])||0)));return {id:w.id,name:w.name,icon:w.icon,color:w.color,sticker:w.sticker,count:n,seen:n>0};});}
// The five creatures played most, the one just played first.
export function mostPlayed(creatures,ids,first=null,n=5){const order=[...ids].sort((a,b)=>(creatures?.[b]?.played||0)-(creatures?.[a]?.played||0));const top=first&&ids.includes(first)?[first,...order.filter(id=>id!==first)]:order;return top.slice(0,n);}
export const HISTORY_LABEL={cup:'גביע החופים',wild:'קרב פרא',story:'מסע השרשרת',league:'ליגה',tower:'מגדל המסכה',versus:'חבר נגד חבר',coop:'ביחד נגד ענק',online:'חבר משני טלפונים',quick:'אימון'};
export const historyLabel=(mode,challengeTitle)=>mode==='challenge'?challengeTitle:HISTORY_LABEL[mode]||'אימון';
// A painted arena for the thumbnail on the "one more" button; the coast when there is none.
const PAINTED=['wind','sea','fire','mirror','castle','echo'],STAND_IN={tracks:'wind'};
export const arenaPicture=a=>{const id=PAINTED.includes(a)?a:STAND_IN[a];return id?'./art/gen/arena-'+id+'.jpg':'./art/2026-09-15__Coastal-Arena__Background__v01__FINAL.png';};
// The two-thumb hold of the Power Form ritual: it fills while held, and drains twice as fast when let go.
// A step back in time (a first frame older than the opening) counts as no time: nobody's hold grows by itself.
export const holdStep=(p,held,dt)=>{dt=Math.max(0,+dt||0);return held?p+dt:Math.max(0,p-dt*2);};
// The big "one more" button wakes only for a fresh press: 600 ms after it appeared, 600 ms after the last finger
// lifted, and with no other finger still down. A thumb held on fire through the finish never starts a battle.
export const pressWakes=({at,shownAt,lastUp=0,held=0})=>held===0&&at>=shownAt+WAKE_MS&&at>=lastUp+WAKE_MS;
// Hebrew for one creature follows that creature; everything for the children stays plural.
export const byGender=(c,male,female)=>c?.female?female:male;
