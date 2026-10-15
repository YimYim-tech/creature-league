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
export const HISTORY_LABEL={cup:'גביע החופים',wild:'קרב פרא',story:'מסע השרשרת',league:'ליגה',tower:'מגדל המסכה',versus:'חבר נגד חבר',coop:'ביחד נגד ענק',online:'חבר משני טלפונים',quick:'אימון',wonder:'הפלא של היום'};
export const historyLabel=(mode,challengeTitle)=>mode==='challenge'?challengeTitle:HISTORY_LABEL[mode]||'אימון';
// A painted arena for the thumbnail on the "one more" button; the coast when there is none.
// The Land of Two Tracks is painted too; until its painting is on a phone, a page picture falls back to the wind island.
const PAINTED=['wind','sea','fire','mirror','castle','echo','tracks'],STAND_IN={tracks:'wind'};
export const arenaPicture=a=>{const id=PAINTED.includes(a)?a:STAND_IN[a];return id?'./art/gen/arena-'+id+'.jpg':'./art/2026-09-15__Coastal-Arena__Background__v01__FINAL.png';};
export const arenaFallback=a=>arenaPicture(STAND_IN[a]||null);
// The two-thumb hold of the Power Form ritual: it fills while held, and drains twice as fast when let go.
// A step back in time (a first frame older than the opening) counts as no time: nobody's hold grows by itself.
export const holdStep=(p,held,dt)=>{dt=Math.max(0,+dt||0);return held?p+dt:Math.max(0,p-dt*2);};
// The big "one more" button wakes only for a fresh press: 600 ms after it appeared, 600 ms after the last finger
// lifted, and with no other finger still down. A thumb held on fire through the finish never starts a battle.
export const pressWakes=({at,shownAt,lastUp=0,held=0})=>held===0&&at>=shownAt+WAKE_MS&&at>=lastUp+WAKE_MS;
// Hebrew for one creature follows that creature; everything for the children stays plural.
export const byGender=(c,male,female)=>c?.female?female:male;
// ------------------------------------------------------------------ wave 2: my creature, my style
// The announcer counts 3-2-1 only for the first battle of a session: a session with a battle in it is not fresh.
export const freshSession=(s,now)=>!(sessionLive(s,now)?.battles>0);
// The Lab's file for the repository: one a month, lab-YYYY-MM.json.
export const labFileName=(date=new Date())=>'lab-'+date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'.json';
// A Lab row while it is being chosen: the saved design, or nothing picked yet. Ready when it has a picture and a mechanic.
export function labDraft(saved,options,names){const i=options.indexOf(saved?.option);return {option:i>=0?saved.option:null,name:i>=0?(saved.name||names[i]||''):'',mech:i>=0?saved.mech||null:null};}
export const labReady=d=>!!(d?.option&&d.mech);
// Changing the picture also changes the name, unless the name was typed by hand (then it stays).
export function labPick(draft,option,options,names){const before=options.indexOf(draft.option),typed=!!draft.name&&!names.includes(draft.name)&&before>=0;const i=options.indexOf(option);
  return {...draft,option:i>=0?option:draft.option,name:typed?draft.name:(names[i]||draft.name)};}
// The mix pages of the Star Book: one page per creature on the team, a slot for every creature whose super it can copy.
export function mixPages(team,mixes,copyable){return team.map(id=>{const kinds=Array.isArray(mixes?.[id])?mixes[id]:[],slots=copyable.filter(k=>k!==id);
  return {id,slots:slots.map(kind=>({kind,got:kinds.includes(kind)})),got:slots.filter(k=>kinds.includes(k)).length,total:slots.length};});}
// The beat bridge: a tap counts when it lands near a beat of the playing part (from the first playing beat on), once per beat.
// The window is forgiving but never the whole beat, so the taps still follow the drum.
export const beatWindow=period=>Math.min(.3,period*.35);
export function beatJudge(t,{period,from=0,used=[],win=beatWindow(period)}={}){if(!(period>0)||!Number.isFinite(t))return -1;const n=Math.round(t/period);
  return n>=from&&Math.abs(t-n*period)<=win&&!used.includes(n)?n:-1;}
// ------------------------------------------------------------------ the sideways phone (wave 3): plain rules, each part under its own line
// The shell and the way around.
// The journey and the screens before a battle.
// The cards, the boxes and the reveals.
// Home and friends.
// A goal of the day opens the screen where it is played (the Wonder of the Day starts its battle); the rest are played from Home's big button.
export const goalPlace=type=>type==='wonderDay'?'wonder':type==='league'?'league':type==='tower'?'tower':type==='friend'?'versus':type==='story'||type==='replayStars'?'story':'lobby';
// The arenas (the league, the tower, the cup, training) open after the first island; before that their door wiggles and says when.
export const arenasOpen=done=>(done|0)>=4;
// The battle's few words, numbers and chips.
// A damage number shows only a child here hitting a rival: the hits add up quietly per rival, and the sum pops when a fresh hit lands
// at least 4.2 s of battle time after the last number. One number on screen, about nine in 40 s at most. Lava, burning ground and falling
// stars (by<0) never count; between two children on one screen only supers and the Power Form do.
export const NUMBER_GAP=4.2,NUMBER_LIFE=.9;
export const numberKids=(m,local=0)=>m?.online?[local]:m?.versus?[0,1]:m?.coop?[0,2]:[local];
export function numberCounts(e,kids,same=false){return !!e&&e.amount>0&&e.by>=0&&kids.includes(e.by)&&e.side!==e.by&&(!kids.includes(e.side)||same&&!!(e.special||e.form));}
export const newTally=()=>({last:-1e9,wait:{}});
export function tallyHit(T,e,t){const w=T.wait[e.side]??={sum:0,special:false,form:false,at:t};w.sum+=e.amount;w.special||=!!e.special;w.form||=!!e.form;w.at=Math.max(w.at,t);return w;}
// The number to show at battle time t, or null: nothing on screen, gap seconds since the last one, a hit within `fresh` s on that rival. A sum with a super goes first.
export function tallyPop(T,t,{gap=NUMBER_GAP,fresh=.35,busy=false}={}){if(busy||t-T.last<gap)return null;
  const ready=Object.entries(T.wait).filter(([,w])=>w.sum>0&&t-w.at<=fresh).sort(([,a],[,b])=>(b.special-a.special)||(b.form-a.form)||(b.sum-a.sum));if(!ready.length)return null;
  const [side,w]=ready[0];delete T.wait[side];T.last=t;return {side:+side,num:Math.round(w.sum),special:w.special,form:w.form};}
// What the countdown shows: a goal's kick-off (battle time already running) nothing; a counted start (bigCount: the announcer says 3-2-1)
// its numbers and then 'קדימה!'; any other start only a .6 s 'קדימה!' burst at its end. u runs over the word shown.
export function countdownShow(m){if(!m||m.status!=='countdown'||m.time>0)return null;const cd=Math.max(0,+m.countdown||0),go=m.bigCount?.3:.6;
  if(cd>go)return m.bigCount?{text:String(Math.ceil(cd-.3)),u:(cd-.3)%1,burst:false}:null;return {text:'קדימה!',u:1-cd/go,burst:true};}
// The chip slot in the HUD band: one chip at a time, 4 s between two, six a battle; a chip that waited 3 s is dropped. chipTick returns the chip to show now.
export const CHIP_GAP=4,CHIP_MAX=6,CHIP_STALE=3;
export const newChips=()=>({now:null,next:null,end:-1e9,count:0});
export function chipAsk(S,c,t){if(S.count<CHIP_MAX)S.next={...c,at:t};return !!S.next;}
export function chipTick(S,t){if(S.now&&t>=S.now.until){S.end=S.now.until;S.now=null;}if(S.next&&t-S.next.at>CHIP_STALE)S.next=null;
  if(!S.next||S.now||t-S.end<CHIP_GAP||S.count>=CHIP_MAX)return null;const c=S.next;S.next=null;S.count++;S.now={...c,until:t+(c.seconds||1.4)};return S.now;}
