// The simulation is independent of the browser. Positions are feet on the arena floor.
import {cleanUpgrades,buildSpec,UPGRADE_IDS} from './upgrades.js';
export const WORLD = { width: 1280, height: 720, cx: 640, cy: 395, rx: 536, ry: 251 };
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CREATURES = Object.freeze({
  maimi: { id:'maimi', magic:70, name:'מיימי', element:'מים', role:'שולט במרחק', color:'#49d9ef', dark:'#096c92', hp:190, speed:244, damage:13, interval:.39, shotSpeed:560, armor:0, radius:23, height:112, specialCooldown:7, special:'גל גאות', specialIcon:'wave', description:'גל רחב שדוחף את היריב ומפנה לך מקום.', tip:'שמרו מרחק. גל הגאות מרחיק את היריב גם כשאין לאן לברוח.', number:'07', rarity:'נדיר', starter:true, aiRange:290, specialRange:540 },
  havzuk: { id:'havzuk', magic:75, name:'הבזוק', element:'חשמל', role:'מהיר ומפתיע', color:'#ffe06b', dark:'#a7650d', hp:150, speed:298, damage:8, interval:.25, shotSpeed:700, armor:0, radius:20, height:108, specialCooldown:6, special:'הבזק חשמלי', specialIcon:'bolt', description:'זינוק לכיוון התנועה ופרץ חשמל במקום הנחיתה.', tip:'זוזו בזמן הירי. כוונו את ההבזק ליד היריב כדי לחשמל אותו.', number:'10', rarity:'רגיל', starter:true, aiRange:225, specialRange:310 },
  slauz: { id:'slauz', magic:80, name:'סלעוז', element:'עוצמה', role:'חזק ועמיד', color:'#ffb786', dark:'#a15324', hp:230, speed:182, damage:24, interval:.72, shotSpeed:440, armor:.16, radius:30, height:85, specialCooldown:8, special:'רעידת אדמה', specialIcon:'mountain', description:'רעידה חזקה סביבך ושריון מוגבר לשתי שניות.', tip:'התקרבו דרך מחסה. הרעידה פוגעת גם מעבר לאבן.', number:'04', rarity:'נדיר', starter:true, facesLeft:true, shotRadius:10, aiRange:175, specialRange:180 },
  lohatan: { id:'lohatan', magic:85, name:'לוהטן', element:'אש', role:'כבד ולוהט', color:'#ff7a3d', dark:'#9c2b0c', hp:215, speed:205, damage:22, interval:.62, shotSpeed:470, armor:.08, radius:26, height:122, specialCooldown:7, special:'כדור אש', specialIcon:'flame', description:'כדור אש ענק שמתפוצץ ומשאיר אדמה בוערת.', tip:'כוונו את כדור האש לאן שהיריב בורח. האש על הרצפה סוגרת לו את הדרך.', number:'21', rarity:'נדיר', facesLeft:true, shotRadius:11, aiRange:240, specialRange:520 },
  tehomon: { id:'tehomon', magic:90, name:'תהומון', element:'מים', role:'ענק הים העמוק', color:'#4f86ff', dark:'#14327e', hp:265, speed:165, damage:14, interval:.46, shotSpeed:520, armor:.1, radius:30, height:112, specialCooldown:8, special:'מערבולת', specialIcon:'swirl', description:'מערבולת ענקית שמושכת את היריב פנימה ומאטה אותו.', tip:'הניחו את המערבולת על היריב ותקפו כשהוא תקוע בתוכה.', number:'33', rarity:'אגדי', facesLeft:true, aiRange:270, specialRange:420 },
  zikuk: { id:'zikuk', magic:80, name:'זיקוק', element:'אור', role:'צלף מדויק', color:'#ffc93d', dark:'#6b3fa8', hp:140, speed:285, damage:15, interval:.42, shotSpeed:900, armor:0, radius:21, height:100, specialCooldown:6.5, special:'קרן אור', specialIcon:'sun', description:'קרן אור ישרה שחוצה את כל הזירה ופוגעת מיד.', tip:'שמרו מרחק. הקרן פוגעת רחוק, אבל רק בקו ישר.', number:'12', rarity:'נדיר', facesLeft:true, aiRange:380, specialRange:760 },
  retetoz: { id:'retetoz', magic:70, name:'רטטוז', element:'רעד', role:'מפתיע מתחת לאדמה', color:'#e0a96d', dark:'#7a4a22', hp:195, speed:230, damage:12, interval:.36, shotSpeed:600, armor:.05, radius:24, height:88, specialCooldown:7, special:'מחילה', specialIcon:'burrow', description:'נעלם מתחת לאדמה, צץ ממש ליד היריב ומרעיד הכל.', tip:'השתמשו במחילה כשהיריב רחוק: אתם צצים ממש לידו.', number:'08', rarity:'רגיל', aiRange:200, specialRange:900, specialMin:170 },
  tzlilon: { id:'tzlilon', magic:95, name:'צלילון', element:'היפנוט', role:'קטן ואמיץ', color:'#b88cff', dark:'#5b2ea6', hp:130, speed:300, damage:9, interval:.27, shotSpeed:640, armor:0, radius:19, height:92, specialCooldown:9, special:'היפנוט', specialIcon:'spiral', description:'גל מחשבה שמהפנט את היריב: הוא קופא במקום ולא יכול לתקוף.', tip:'התקרבו, הפנטו ותקפו בכל הכוח כשהיריב מסוחרר.', number:'01', rarity:'אגדי', aiRange:230, specialRange:230 },
  shorshu: { id:'shorshu', magic:75, name:'שורשו', element:'טבע', role:'שומר היער', color:'#86d957', dark:'#2f6a1c', hp:220, speed:195, damage:7, interval:.5, shotSpeed:520, armor:.12, radius:26, height:96, specialCooldown:7.5, special:'שורשים', specialIcon:'leaf', description:'שורשים צומחים מתחת ליריב ותופסים אותו במקום.', tip:'מקרוב זה הכי חזק: שלושה זרעים יחד פוגעים בבת אחת.', number:'15', rarity:'רגיל', facesLeft:true, spread:3, shotLife:.85, aiRange:170, specialRange:460 },
  windguard: { id:'windguard', magic:90, name:'שומר הרוחות', element:'רוח', role:'ציפור הסערה', color:'#3cc7c9', dark:'#16626a', hp:205, speed:270, damage:13, interval:.34, shotSpeed:760, armor:.06, radius:26, height:124, specialCooldown:7, special:'משב סערה', specialIcon:'swirl', description:'משב רוח ענק שעף קדימה, פוגע ודוחף את היריב רחוק.', tip:'השתמשו במשב כשהיריב ליד הקיר: הוא נדחף ולא יכול לברוח.', number:'41', rarity:'אגדי', facesLeft:true, aiRange:300, specialRange:560, guardian:true },
  seaguard: { id:'seaguard', magic:85, name:'שומר הים', element:'מים', role:'הצב העתיק', color:'#2f8fd6', dark:'#10467a', hp:290, speed:150, damage:17, interval:.5, shotSpeed:470, armor:.2, radius:32, height:112, specialCooldown:8, special:'טבעת הגאות', specialIcon:'wave', description:'טבעת גאות סביב הצב: פוגעת, מאטה, והשריון מתחזק לשתי שניות.', tip:'הצב איטי אבל חזק. תנו לו להתקרב ואז הפעילו את טבעת הגאות.', number:'42', rarity:'אגדי', facesLeft:true, shotRadius:11, aiRange:190, specialRange:200 },
  fireguard: { id:'fireguard', magic:90, name:'שומר האש', element:'אש', role:'אריה הלבה', color:'#ff8a2a', dark:'#8a2c0a', hp:235, speed:230, damage:19, interval:.48, shotSpeed:560, armor:.1, radius:28, height:118, specialCooldown:7.5, special:'שאגת להבה', specialIcon:'flame', description:'שאגה ששולחת שלושה כדורי אש במניפה ומשאירה אדמה בוערת.', tip:'השאגה רחבה: גם יריב שמתחמק נתפס באחד מכדורי האש.', number:'43', rarity:'אגדי', facesLeft:true, shotRadius:10, aiRange:240, specialRange:480 },
  galgalor: { id:'galgalor', magic:65, name:'גלגל אור', element:'אנרגיה', role:'מבולגן בכוונה', color:'#7fe8ff', dark:'#1f7f9c', hp:165, speed:265, damage:11, interval:.3, shotSpeed:620, armor:0, radius:22, height:84, specialCooldown:7, special:'פיצוץ אנרגיה', specialIcon:'sparkle', description:'שחרור אנרגיה לכל הכיוונים: עשרה קליעים בבת אחת.', tip:'קפצו לאמצע הקרב ושחררו את הפיצוץ קרוב ליריב.', number:'05', rarity:'רגיל', wobble:.13, aiRange:220, specialRange:260 },
});
export const LEVELS = {
  rookie:{name:'חימום', subtitle:'לומדים את הזירה', reaction:.50, fireScale:2.2, aimError:.27, speedScale:.80, specialDelay:4},
  challenger:{name:'אתגר', subtitle:'כבר יודעים להתחמק', reaction:.30, fireScale:1.65, aimError:.18, speedScale:.92, specialDelay:2.5},
  veteran:{name:'ותיקים', subtitle:'כמעט אלופים', reaction:.25, fireScale:1.45, aimError:.14, speedScale:.96, specialDelay:1.8},
  champion:{name:'אלופים', subtitle:'היריב לא מוותר', reaction:.20, fireScale:1.25, aimError:.105, speedScale:1, specialDelay:1},
};
export const CUP = [
  {title:'רבע הגמר', rival:'havzuk', level:'rookie', club:'ניצוצי החוף'},
  {title:'חצי הגמר', rival:'maimi', level:'challenger', club:'גלי הטורקיז'},
  {title:'הגמר הגדול', rival:'slauz', level:'champion', club:'שומרי האבן'},
];
export const CHALLENGE = Object.freeze({id:'crumbling',title:'הזירה המתפוררת',rival:'havzuk',level:'champion'});
export const challengeUnlocked=profile=>profile.cups>0;
export const STARTERS=Object.keys(CREATURES).filter(id=>CREATURES[id].starter);
export const WILD=Object.keys(CREATURES).filter(id=>!CREATURES[id].starter);
export const RARITY={'רגיל':{stars:1},'נדיר':{stars:2},'אגדי':{stars:3}};
export const isUnlocked=(profile,id)=>!!CREATURES[id]&&(CREATURES[id].starter||profile.unlocked.includes(id));
export const releasedCount=profile=>WILD.filter(id=>profile.unlocked.includes(id)).length;
export function wildLevel(profile){const n=releasedCount(profile);return n<2?'rookie':n<5?'challenger':'champion';}
export function makeWildMatch(profile,rival,options={}) {
  if(!WILD.includes(rival)||isUnlocked(profile,rival))return null;
  const player=isUnlocked(profile,profile.selected)?profile.selected:'maimi';
  return makeMatch({...options,player,rival,level:wildLevel(profile),wild:rival});
}
// Skins are earned by winning with a creature. Nothing is ever bought.
export const SKINS=[
  {id:'base',name:'רגיל',wins:0},
  {id:'ice',name:'קרח',wins:1,tint:'#bff6ff',alpha:.42},
  {id:'night',name:'צל לילה',wins:3,tint:'#3b1d7a',alpha:.5},
  {id:'gold',name:'זהב אלופים',wins:6,tint:'#ffcf3a',alpha:.55,sparkle:true},
];
export const skinById=id=>SKINS.find(s=>s.id===id)||SKINS[0];
export const skinUnlocked=(profile,id,skin)=>(profile.creatures[id]?.wins||0)>=skinById(skin).wins;
export const skinOf=(profile,id)=>{const skin=profile.skins?.[id];return skin&&skinUnlocked(profile,id,skin)?skin:'base';};
export function chooseSkin(profile,id,skin){if(!isUnlocked(profile,id)||!SKINS.some(s=>s.id===skin)||!skinUnlocked(profile,id,skin))return false;profile.skins[id]=skin;return true;}
export function flipCard(profile,id){const i=profile.newCards.indexOf(id);if(i<0)return false;profile.newCards.splice(i,1);return true;}
// Card bars compare creatures on the same 0-100 scale.
export function cardStats(c){
  const dps=c.damage*(c.spread||1)/c.interval;
  return [['חיים',c.hp,c.hp/270],['חוזק',Math.round(dps),dps/45],['מהירות',c.speed,c.speed/300],['הגנה',Math.round(c.armor*100)+'%',.15+c.armor*4.5],['קסם',c.magic||60,(c.magic||60)/100]].map(([label,value,pct])=>({label,value,pct:Math.round(clamp(pct,.06,1)*100)}));
}
export function journeyView(profile) {
  if(profile.cup)return needsUpgrade(profile)?'workshop':'cup';
  return challengeUnlocked(profile)?'challenge':'lobby';
}
export function makeChallengeMatch(profile,options={}) {
  if(!challengeUnlocked(profile))return null;
  const build=profile.lastBuild||{player:profile.selected,upgrades:[]};
  return makeMatch({...options,player:build.player,upgrades:build.upgrades,rival:CHALLENGE.rival,level:CHALLENGE.level,challenge:CHALLENGE.id});
}
const length=(x,y)=>Math.hypot(x,y);
const norm=(x,y)=>{const d=length(x,y)||1;return {x:x/d,y:y/d};};
export function seeded(seed=1) { let s=seed>>>0; return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;}; }
export function segmentCircle(ax,ay,bx,by,cx,cy,r) {
  const dx=bx-ax,dy=by-ay,fx=ax-cx,fy=ay-cy,a=dx*dx+dy*dy;
  if(fx*fx+fy*fy<=r*r)return 0;
  if(a<1e-9)return null;
  const b=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-r*r,d=b*b-4*a*c;
  if(d<0)return null;
  const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
}
export function confine(actor) {
  const rx=WORLD.rx-actor.radius,ry=WORLD.ry-actor.radius*.7;
  const x=(actor.x-WORLD.cx)/rx,y=(actor.y-WORLD.cy)/ry,d=length(x,y);
  if(d>1){actor.x=WORLD.cx+x/d*rx;actor.y=WORLD.cy+y/d*ry;}
}
// ------------------------------------------------------------------ island missions
// Every mission keeps shooting, specials and dodges; only the goal changes.
export const MODES={
  lava:{name:'טבעת הלבה',goal:'הלבה סוגרת את הזירה. שברו סלעים, אספו גחלי כוח ותגדלו.',duration:100},
  wind:{name:'תפוס את הרוח',goal:'אספו 6 נוצות רוח והחזיקו אותן 10 שניות.',duration:120},
  ball:{name:'כדור הגאות',goal:'הכניסו את הפנינה לשער של היריב! מי שמגיע ראשון ל־5 גולים מנצח.',duration:90},
  trio:{name:'קרב השלישייה',goal:'שלושה יצורים מול שלושה. כשיצור נופל, הבא נכנס לזירה.',duration:150},
};
export const WIND_TARGET=6,WIND_HOLD=10,MAX_POWER=5,BALL_GOALS=5;
// The goals sit at the two ends of the oval; the player defends the left one.
export const GOALS=[{x:WORLD.cx-WORLD.rx+34,y:WORLD.cy,half:60},{x:WORLD.cx+WORLD.rx-34,y:WORLD.cy,half:60}];
export const BALL_TUNE={aiKick:260,drag:3,carry:.75,fumble:3,rockX:150,rockY:100};
const SPAWN=[{x:285,y:420},{x:995,y:420}];
function setupMode(m,mode){
  m.mode=mode;m.duration=MODES[mode].duration;
  for(const a of m.actors){a.power=0;a.feathers=0;a.out=0;}
  if(mode==='lava'){m.lava={scale:1,next:6,eruptions:[],embers:[],nextEmber:16};
    // A long fight is the point: both sides get the stamina to collect, grow and outlast the lava.
    for(const a of m.actors){a.spec={...a.spec,hp:Math.round(a.spec.hp*LAVA_STAMINA)};a.hp=a.spec.hp;}
    for(const [x,y] of [[640,300],[520,470],[760,470]])m.lava.embers.push({x,y,age:0});}
  if(mode==='wind'){m.wind={feathers:[],next:1.5,holder:-1,hold:0};m.covers=m.covers.filter((c,i)=>i<2);}
  if(mode==='ball'){m.ball={x:WORLD.cx,y:WORLD.cy,vx:0,vy:0,carrier:-1,carryTime:0,hits:0,noPick:[0,0],score:[0,0],overtime:false};m.covers=m.covers.filter((c,i)=>i>=2);
    // Reef rocks guard each goal: a straight kick from far away usually hits one.
    for(const G of GOALS)for(const dy of [-1,1])m.covers.push({x:G.x+(G.x<WORLD.cx?1:-1)*BALL_TUNE.rockX,y:G.y+dy*BALL_TUNE.rockY,r:30,hp:9999,maxHp:9999,reef:true});}
  if(mode==='trio'){m.trio={teams:[m.teamIds[0],m.teamIds[1]],idx:[0,0]};}
}
// Respawning modes: a knocked-out creature leaves for a moment and comes back whole.
function stepRespawns(m,dt,onKo){
  for(const a of m.actors){
    if(a.out>0){a.out-=dt;if(a.out<=0){a.out=0;a.hp=a.spec.hp;a.x=SPAWN[a.side].x;a.y=SPAWN[a.side].y;a.invincible=1.5;event(m,'respawn',{side:a.side});}continue;}
    if(a.hp<=0){onKo(a);a.out=2.5;a.hp=0;event(m,'ko',{side:a.side});}}
}
function kickBall(m,a,big){const B=m.ball;if(B.carrier!==a.side||B.carryTime<.22)return;
  B.carrier=-1;B.noPick[a.side]=.45;const sp=big?1050:740;B.vx=Math.cos(a.aim)*sp;B.vy=Math.sin(a.aim)*sp*.85;B.x=a.x+Math.cos(a.aim)*(a.radius+18);B.y=a.y+Math.sin(a.aim)*(a.radius+18);
  a.attack=.2;event(m,'kick',{side:a.side,big});if(big)effect(m,'big-kick',a.x,a.y,{color:a.spec.color});}
function looseBall(m,a,push=260){const B=m.ball;if(B.carrier!==a.side)return;B.carrier=-1;B.hits=0;B.noPick[a.side]=.6;const ang=Math.atan2(WORLD.cy-a.y,WORLD.cx-a.x)+(m.random()-.5)*2.2;B.vx=Math.cos(ang)*push;B.vy=Math.sin(ang)*push*.8;event(m,'ball-loose',{side:a.side});}
function scoreGoal(m,side){const B=m.ball;B.score[side]++;event(m,'goal',{side,score:[...B.score]});effect(m,'goal',GOALS[1-side].x,GOALS[1-side].y,{color:'#ffe08a'});
  if(B.score[side]>=BALL_GOALS||B.overtime){finish(m,side,'goals');return;}
  Object.assign(B,{x:WORLD.cx,y:WORLD.cy,vx:0,vy:0,carrier:1-side,carryTime:0,hits:0,noPick:[0,0]});
  for(const a of m.actors){a.x=SPAWN[a.side].x;a.y=SPAWN[a.side].y;a.hp=a.spec.hp;a.out=0;a.invincible=0;}
  m.shots=[];m.waves=[];m.zones=[];m.status='countdown';m.countdown=1.6;}
function stepBall(m,dt){const B=m.ball;
  stepRespawns(m,dt,a=>looseBall(m,a,200));
  for(let i=0;i<2;i++)B.noPick[i]=Math.max(0,B.noPick[i]-dt);
  if(B.carrier>=0){const a=m.actors[B.carrier];B.carryTime+=dt;B.x=a.x+a.facing*(a.radius+12);B.y=a.y+6;}
  else{B.carryTime=0;const drag=Math.max(0,1-dt*BALL_TUNE.drag);B.vx*=drag;B.vy*=drag;B.x+=B.vx*dt;B.y+=B.vy*dt;
    for(const c of m.covers)if(c.hp>0){const dx=B.x-c.x,dy=B.y-c.y,d=length(dx,dy),r=c.r+16;if(d<r){const n=norm(dx||.01,dy);B.x=c.x+n.x*r;B.y=c.y+n.y*r;const dot=B.vx*n.x+B.vy*n.y;if(dot<0){B.vx-=1.7*dot*n.x;B.vy-=1.7*dot*n.y;}}}
    for(const a of m.actors)if(!(a.out>0)&&a.hp>0&&B.noPick[a.side]<=0&&length(a.x-B.x,a.y-B.y)<a.radius+20){B.carrier=a.side;B.carryTime=0;B.hits=0;event(m,'ball-pick',{side:a.side});break;}}
  // A goal: the ball crosses either end inside the goal mouth.
  for(let g=0;g<2;g++){const G=GOALS[g];if(Math.abs(B.y-G.y)<G.half&&(g===0?B.x<G.x:B.x>G.x)){scoreGoal(m,1-g);return;}}
  const od=length((B.x-WORLD.cx)/(WORLD.rx-14),(B.y-WORLD.cy)/(WORLD.ry-10));
  if(od>1){const nx=(B.x-WORLD.cx)/(WORLD.rx*WORLD.rx),ny=(B.y-WORLD.cy)/(WORLD.ry*WORLD.ry),n=norm(nx,ny);B.x=WORLD.cx+(B.x-WORLD.cx)/od;B.y=WORLD.cy+(B.y-WORLD.cy)/od;const dot=B.vx*n.x+B.vy*n.y;if(dot>0){B.vx-=1.6*dot*n.x;B.vy-=1.6*dot*n.y;}}
}
function stepTrio(m,dt){const T=m.trio;
  for(let side=0;side<2;side++){const a=m.actors[side];if(a.hp>0)continue;
    if(T.idx[side]>=2){finish(m,1-side,'trio');return;}
    T.idx[side]++;const next=actor(T.teams[side][T.idx[side]],side);next.x=SPAWN[side].x;next.y=SPAWN[side].y;next.invincible=1.5;next.power=0;next.out=0;
    m.actors[side]=next;m.shots=m.shots.filter(s=>s.owner!==1-side);effect(m,'swap',next.x,next.y,{color:next.spec.color});event(m,'swap',{side,id:next.id,left:2-T.idx[side]});}
}
export const trioLeft=(m,side)=>m.trio?2-m.trio.idx[side]+(m.actors[side].hp>0?1:0):0;
// How much of the arena is still safe: 1 is the full oval, it closes to .45.
export const LAVA_STAMINA=5.5;
export const lavaScale=t=>1-.6*clamp((t-3)/40,0,1);
const ovalDistance=(x,y)=>length((x-WORLD.cx)/WORLD.rx,(y-WORLD.cy)/WORLD.ry);
function stepMode(m,dt){
  if(m.ball){stepBall(m,dt);return;}
  if(m.trio){stepTrio(m,dt);return;}
  if(m.lava){const L=m.lava;L.scale=lavaScale(m.time);
    if(m.time>1&&m.time<4&&!L.warned){L.warned=true;event(m,'lava-warning');}
    for(const a of m.actors){if(a.hp<=0)continue;
      if(ovalDistance(a.x,a.y)>L.scale){a.burn=(a.burn||0)-dt;a.slow=Math.max(a.slow,.2);if(a.burn<=0){a.burn=.33;damage(m,a,3,null,{special:true});effect(m,'burn',a.x,a.y,{color:'#ff7a2c'});}}}
    for(const c of m.covers)if(c.hp<=0&&!c.dropped){c.dropped=true;L.embers.push({x:c.x,y:c.y,age:0});event(m,'ember-drop');}
    if(m.time>=L.nextEmber){L.nextEmber=m.time+20;const ang=m.random()*Math.PI*2,r=m.random()*L.scale*.6;L.embers.push({x:WORLD.cx+Math.cos(ang)*WORLD.rx*r,y:WORLD.cy+Math.sin(ang)*WORLD.ry*r,age:0});event(m,'ember-drop');}
    for(const e of L.embers){e.age+=dt;if(ovalDistance(e.x,e.y)>L.scale){const k=L.scale*.9/ovalDistance(e.x,e.y);e.x=WORLD.cx+(e.x-WORLD.cx)*k;e.y=WORLD.cy+(e.y-WORLD.cy)*k;}
      for(const a of m.actors)if(!e.taken&&a.hp>0&&a.power<MAX_POWER&&length(a.x-e.x,a.y-e.y)<a.radius+20){e.taken=true;a.power++;a.spec={...a.spec,hp:a.spec.hp+20};a.hp+=20;effect(m,'ember',a.x,a.y,{color:'#ffb43a'});event(m,'ember',{side:a.side,power:a.power});}}
    L.embers=L.embers.filter(e=>!e.taken);
    if(m.time>=L.next){L.next=m.time+(m.time>30?3.5:4.5);const target=m.actors[m.random()<.5?0:1],spot=m.random()<.6?{x:target.x,y:target.y}:{x:WORLD.cx+(m.random()-.5)*WORLD.rx*L.scale,y:WORLD.cy+(m.random()-.5)*WORLD.ry*L.scale};L.eruptions.push({...spot,r:72,delay:1.2,age:0});}
    for(const e of L.eruptions){e.age+=dt;if(!e.done&&e.age>=e.delay){e.done=true;m.waves.push({kind:'blast',visual:true,owner:-1,x:e.x,y:e.y,age:0,r:e.r,life:.5,hit:[]});event(m,'blast',{side:-1});
      for(const a of m.actors)if(a.hp>0&&a.invincible<=0&&length(a.x-e.x,a.y-e.y)<e.r+a.radius)damage(m,a,18,null,{special:true,pushX:Math.sign(a.x-e.x||1)*30});}}
    L.eruptions=L.eruptions.filter(e=>e.age<e.delay+.6);
  }
  if(m.wind){const W=m.wind;
    for(const a of m.actors){
      if(a.out>0){a.out-=dt;if(a.out<=0){a.out=0;a.hp=a.spec.hp;a.x=a.side?995:285;a.y=420;a.invincible=1.5;event(m,'respawn',{side:a.side});}continue;}
      if(a.hp<=0){dropFeathers(m,a,a.feathers);a.out=2.5;a.hp=0;effect(m,'blown',a.x,a.y,{color:'#cfffff'});event(m,'ko',{side:a.side});}}
    if(m.time>=W.next&&W.feathers.length<8){W.next=m.time+3;const ang=m.random()*Math.PI*2;W.feathers.push({x:WORLD.cx,y:WORLD.cy,vx:Math.cos(ang)*90,vy:Math.sin(ang)*70,age:0});event(m,'feather-spawn');}
    for(const f of W.feathers){f.age+=dt;const drag=Math.max(0,1-dt*1.6);f.vx*=drag;f.vy*=drag;f.x+=f.vx*dt;f.y+=f.vy*dt;
      if(ovalDistance(f.x,f.y)>.92){const k=.92/ovalDistance(f.x,f.y);f.x=WORLD.cx+(f.x-WORLD.cx)*k;f.y=WORLD.cy+(f.y-WORLD.cy)*k;f.vx*=-.4;f.vy*=-.4;}
      if(f.age<.5)continue;
      for(const a of m.actors)if(!f.taken&&a.out<=0&&a.hp>0&&length(a.x-f.x,a.y-f.y)<a.radius+18){f.taken=true;a.feathers++;event(m,'feather',{side:a.side,count:a.feathers});}}
    W.feathers=W.feathers.filter(f=>!f.taken);
    const [p,e]=m.actors,holder=p.feathers>=WIND_TARGET&&p.feathers>e.feathers?0:e.feathers>=WIND_TARGET&&e.feathers>p.feathers?1:-1;
    if(holder!==W.holder){W.holder=holder;W.hold=WIND_HOLD;if(holder>=0)event(m,'hold-start',{side:holder});}
    if(holder>=0){W.hold-=dt;if(W.hold<=0)finish(m,holder,'feathers');}
  }
}
function dropFeathers(m,a,count){
  for(let i=0;i<count&&a.feathers>0;i++){a.feathers--;const ang=m.random()*Math.PI*2,sp=140+m.random()*120;m.wind.feathers.push({x:a.x,y:a.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp*.8,age:0});}
  if(count)event(m,'feathers-drop',{side:a.side});
}
// What the opponent wants in a mission, blended with how it fights.
function modeGoal(m,a,p,d){
  if(m.lava){const L=m.lava,od=ovalDistance(a.x,a.y);
    if(od>L.scale-.08){const q=norm(WORLD.cx-a.x,WORLD.cy-a.y);return {x:q.x*2.2,y:q.y*2.2,keep:.4};}
    for(const e of L.eruptions)if(!e.done&&length(a.x-e.x,a.y-e.y)<e.r+a.radius+30){const q=norm(a.x-e.x||.01,a.y-e.y);return {x:q.x*2.5,y:q.y*2.5,keep:.3};}
    let best=null;for(const e of L.embers){const dist=length(e.x-a.x,e.y-a.y);if(a.power<MAX_POWER&&(dist<d*.9||dist<420)&&(!best||dist<best.dist))best={e,dist};}
    if(best){const q=norm(best.e.x-a.x,best.e.y-a.y);return {x:q.x*2,y:q.y*2,keep:.35};}
    if(L.scale<.9){const target=m.covers.find(c=>c.hp>0&&a.power<MAX_POWER);if(target&&m.level!=='rookie'){/* shooting covers is left to the normal aim */}}
    return null;}
  if(m.ball){const B=m.ball;
    if(B.carrier===1){const G=GOALS[0],q=norm(G.x-a.x,G.y-a.y);return {x:q.x*2.4,y:q.y*2.4,keep:.25};}
    if(B.carrier===0&&!(p.out>0)){const G=GOALS[1],near=length(p.x-a.x,p.y-a.y)<170,tx=near?p.x:p.x+(G.x-p.x)*.35,ty=near?p.y:p.y+(G.y-p.y)*.35,q=norm(tx-a.x,ty-a.y);return {x:q.x*2.2,y:q.y*2.2,keep:.3};}
    if(B.carrier<0){const q=norm(B.x-a.x,B.y-a.y);return {x:q.x*2.2,y:q.y*2.2,keep:.3};}
    return null;}
  if(m.wind){const W=m.wind;
    if(W.holder===1){const q=norm(a.x-p.x||.01,a.y-p.y);return {x:q.x*1.4,y:q.y*1.4,keep:.6};}
    if(W.holder===0&&p.out<=0){const q=norm(p.x-a.x,p.y-a.y);return {x:q.x*1.5,y:q.y*1.5,keep:.5};}
    let best=null;for(const f of W.feathers){const dist=length(f.x-a.x,f.y-a.y);if(!best||dist<best.dist)best={f,dist};}
    if(best&&(best.dist<320||p.out>0)){const q=norm(best.f.x-a.x,best.f.y-a.y);return {x:q.x*1.7,y:q.y*1.7,keep:.45};}
    return null;}
  return null;
}
function actor(id,side,ids=[]) {
  if(!CREATURES[id])throw new Error('Unknown creature');
  const upgrades=cleanUpgrades(ids),spec=buildSpec(CREATURES[id],upgrades);
  return {id,side,spec,upgrades,x:side===0?285:995,y:420,hp:spec.hp,radius:spec.radius,fireCd:0,specialCd:0,superCharge:0,dashCd:0,invincible:0,guard:0,stun:0,slow:0,root:0,windup:0,hit:0,attack:0,moveX:0,moveY:0,facing:side===0?1:-1,aim:side===0?0:Math.PI,
    stats:{shots:0,hits:0,damage:0,blocked:0,specials:0,dodges:0,healed:0,weakHits:0},trail:[]};
}
export function makeMatch({player='maimi',rival='slauz',level='rookie',seed=Date.now(),upgrades=[],boss=false,challenge=null,wild=null,story=null,giant=false,mirror=false,arena=null,mode=null,team=null,rivalTeam=null}={}) {
  if(!LEVELS[level])throw new Error('Unknown difficulty');
  // A trio match starts with the first creature of each team.
  const teamIds=mode==='trio'?[(team||[player,'havzuk','slauz']).filter(id=>CREATURES[id]).slice(0,3),(rivalTeam||[rival,'lohatan','zikuk']).filter(id=>CREATURES[id]).slice(0,3)]:null;
  if(teamIds){if(teamIds[0].length<3||teamIds[1].length<3)throw new Error('A trio needs three creatures');player=teamIds[0][0];rival=teamIds[1][0];upgrades=[];}
  const enemy=actor(rival,1);
  // An island guardian is the same creature, grown huge by the shadow.
  if(giant){enemy.spec={...enemy.spec,hp:Math.round(enemy.spec.hp*1.6),height:enemy.spec.height*1.3,radius:Math.round(enemy.spec.radius*1.25),damage:Math.round(enemy.spec.damage*1.1)};enemy.hp=enemy.spec.hp;enemy.radius=enemy.spec.radius;enemy.giant=true;}
  if(boss&&rival==='slauz')enemy.boss={phase:'guard',timer:3.8,angle:Math.PI,hit:false};
  const match={id:seed+'-'+player+'-'+rival,random:seeded(seed),level,challenge:challenge===CHALLENGE.id?challenge:null,wild:WILD.includes(wild)&&wild===rival?wild:null,story:typeof story==='string'?story:null,arena:typeof arena==='string'?arena:null,mirror:!!mirror,actors:[actor(player,0,upgrades),enemy],time:0,duration:90,countdown:2.3,status:'countdown',winner:null,
    shots:[],waves:[],zones:[],effects:[],events:[],nextId:0,pickup:null,pickupAt:12,ai:{timer:0,angle:0,strafe:1,strafeTime:0,moveX:0,moveY:0,aimX:0,aimY:0,fire:false,special:false,dash:false},
    covers:[{x:449,y:350,r:35,hp:80,maxHp:80},{x:831,y:440,r:35,hp:80,maxHp:80},{x:650,y:237,r:28,hp:65,maxHp:65},{x:630,y:555,r:28,hp:65,maxHp:65}].map((c,i)=>({...c,...(challenge===CHALLENGE.id?{collapseAt:5+i*4}:{})}))};
  match.teamIds=teamIds;
  if(MODES[mode])setupMode(match,mode);
  return match;
}
function event(m,type,data={}) {m.events.push({type,...data});}
function effect(m,type,x,y,data={}) {m.effects.push({type,x,y,age:0,...data});}
function damage(m,a,raw,source,{pushX=0,pushY=0,special=false,hitAngle=null}={}) {
  if(a.hp<=0)return;
  if(a.invincible>0){a.stats.dodges++; effect(m,'evade',a.x,a.y,{color:'#ffffff'});return;}
  const exposed=a.boss?.phase==='recover',front=a.boss&&['guard','windup'].includes(a.boss.phase)&&hitAngle!=null&&Math.cos(hitAngle-a.boss.angle)>Math.cos(1.05);
  if(source?.power)raw*=1+.12*source.power;
  if(m.wind&&special&&a.feathers>0&&a.invincible<=0)dropFeathers(m,a,1);
  if(m.ball&&m.ball.carrier===a.side&&a.invincible<=0){m.ball.hits++;if(special||m.ball.hits>=BALL_TUNE.fumble)looseBall(m,a,320);else event(m,'ball-hit',{side:a.side,hits:m.ball.hits});}
  const reduction=exposed?0:front?.8:a.guard>0?.72:a.spec.armor,amount=raw*(exposed?1.5:1)*(1-reduction),actual=Math.min(a.hp,amount);
  a.stats.blocked+=Math.max(0,raw-amount);a.hp=Math.max(0,a.hp-amount);a.hit=.17;a.calm=0;if(source)source.calm=0;
  if(source&&source.side!=null&&!special&&amount>0)chargeSuper(m,source,amount/((CREATURES[a.id]?.hp||a.spec.hp)*SUPER_SHARE));
  if(front)effect(m,'guard-block',a.x,a.y,{color:'#ffe5a7'});
  if(exposed&&source){source.stats.weakHits++;effect(m,'weak-hit',a.x,a.y,{color:'#95ffe0'});}
  if(source){source.stats.damage+=actual;if(!special)source.stats.hits++;}
  a.x+=pushX;a.y+=pushY;confine(a);resolveCover(m,a);
  effect(m,'hit',a.x,a.y,{color:a.spec.color,amount:Math.round(actual)});event(m,'hit',{side:a.side,amount:actual});
}
function resolveCover(m,a) {
  for(let pass=0;pass<2;pass++)for(const c of m.covers){if(c.hp<=0)continue;const dx=a.x-c.x,dy=a.y-c.y,d=length(dx,dy),r=a.radius+c.r;
    if(d<r){const n=norm(dx||.01,dy);a.x=c.x+n.x*r;a.y=c.y+n.y*r;}}
  confine(a);
}
function move(m,a,x,y,dt,scale=1) {
  const n=length(x,y)>1?norm(x,y):{x,y};const speed=a.spec.speed*scale*(a.slow>0?.55:1)*(a.windup>0?.2:1)*(a.root>0?0:1)*(m.ball?.carrier===a.side?BALL_TUNE.carry:1);
  a.moveX=n.x;a.moveY=n.y;a.x+=n.x*speed*dt;a.y+=n.y*speed*dt*.8;confine(a);resolveCover(m,a);
}
export function shoot(m,a,angle,scale=1) {a.calm=0;
  if(a.fireCd>0||a.windup>0||a.hp<=0)return false;
  const s=a.spec;a.fireCd=s.interval*scale;a.attack=.16;a.aim=angle;if(Math.abs(Math.cos(angle))>.12)a.facing=Math.cos(angle)>0?1:-1;
  const scatter=a.upgrades.includes('scatter'),fan=s.spread===3;
  const offsets=fan?(scatter?[-.4,-.2,0,.2,.4]:[-.22,0,.22]):scatter?[-.19,0,.19]:[0],wobble=s.wobble?(m.random()-.5)*2*s.wobble:0;
  for(const offset of offsets){const aim=angle+offset+wobble;
    m.shots.push({id:++m.nextId,owner:a.side,x:a.x+Math.cos(aim)*(a.radius+9),y:a.y+Math.sin(aim)*(a.radius+9),vx:Math.cos(aim)*s.shotSpeed,vy:Math.sin(aim)*s.shotSpeed,r:s.shotRadius||7,damage:scatter?Math.round(s.damage*.6):s.damage,life:s.shotLife||1.65,color:s.color,kind:a.id});a.stats.shots++;
  }event(m,'shoot',{kind:a.id,side:a.side});return true;
}
export function useSpecial(m,a,input={}) {
  if(a.windup>0||a.hp<=0)return false;
  a.stats.specials++;a.attack=.4;const surge=a.upgrades.includes('surge');
  if(a.id==='maimi') {
    m.waves.push({kind:'wave',owner:a.side,x:a.x,y:a.y,angle:a.aim,age:0,speed:470,r:surge?105:74,damage:surge?46:34,push:surge?110:65,life:1.15,hit:[]});
  } else if(a.id==='havzuk') {
    let n=norm(input.moveX||0,input.moveY||0);if(!input.moveX&&!input.moveY)n={x:Math.cos(a.aim),y:Math.sin(a.aim)};
    const start={x:a.x,y:a.y};a.invincible=.38;
    // Sweep the blink in small steps so solid cover cannot be crossed.
    for(let i=0;i<18;i++){a.x+=n.x*10;a.y+=n.y*8;confine(a);resolveCover(m,a);}
    effect(m,'blink',a.x,a.y,{from:start,color:a.spec.color});
    m.waves.push({kind:'electric',owner:a.side,x:a.x,y:a.y,age:0,r:surge?170:125,damage:surge?46:32,life:.55,hit:[]});
  } else if(a.id==='slauz'){a.windup=surge?.85:.6;a.guard=a.windup+2;effect(m,'charge',a.x,a.y,{owner:a.side,color:a.spec.color});}
  else wildSpecial(m,a,surge);
  event(m,'special',{kind:a.id,side:a.side});return true;
}
// Where a placed power lands: on the opponent, but never further than its reach.
function landing(m,a,reach){const t=m.actors[1-a.side],d=Math.min(reach,length(t.x-a.x,t.y-a.y));return {x:a.x+Math.cos(a.aim)*d,y:a.y+Math.sin(a.aim)*d*.8};}
function wildSpecial(m,a,surge) {
  const t=m.actors[1-a.side],dir={x:Math.cos(a.aim),y:Math.sin(a.aim)};
  if(a.id==='lohatan'){
    m.shots.push({id:++m.nextId,owner:a.side,x:a.x+dir.x*(a.radius+12),y:a.y+dir.y*(a.radius+12),vx:dir.x*430,vy:dir.y*430,r:17,damage:20,life:1.3,color:a.spec.color,kind:'fireball',explode:{r:surge?140:105,damage:surge?42:30}});
  } else if(a.id==='tehomon'){
    const p=landing(m,a,420);m.zones.push({owner:a.side,kind:'vortex',x:p.x,y:p.y,r:surge?125:95,age:0,life:3,pulse:.2,damage:surge?9:7});
  } else if(a.id==='zikuk'){
    const ex=a.x+dir.x*1100,ey=a.y+dir.y*1100;
    if(segmentCircle(a.x,a.y,ex,ey,t.x,t.y,t.radius+16)!=null)damage(m,t,surge?52:38,a,{special:true,pushX:dir.x*30,pushY:dir.y*24});
    for(const c of m.covers)if(c.hp>0&&segmentCircle(a.x,a.y,ex,ey,c.x,c.y,c.r)!=null){c.hp=Math.max(0,c.hp-30);effect(m,'stone',c.x,c.y,{color:'#fff1b0'});}
    m.waves.push({kind:'beam',visual:true,owner:a.side,x:a.x,y:a.y,angle:a.aim,age:0,life:.45,r:surge?20:13,hit:[]});
  } else if(a.id==='retetoz'){
    const start={x:a.x,y:a.y},away=norm(a.x-t.x||.01,a.y-t.y),gap=a.radius+t.radius+12;
    a.x=t.x+away.x*gap;a.y=t.y+away.y*gap;confine(a);resolveCover(m,a);a.invincible=.45;
    effect(m,'burrow',a.x,a.y,{from:start,color:a.spec.color});
    m.waves.push({kind:'quake',owner:a.side,x:a.x,y:a.y,age:0,r:surge?195:150,damage:surge?46:34,life:.7,hit:[]});event(m,'quake',{side:a.side});
  } else if(a.id==='tzlilon'){
    m.waves.push({kind:'mind',owner:a.side,x:a.x,y:a.y,age:0,r:surge?290:230,damage:12,stun:surge?1.6:1.2,push:0,life:.6,hit:[]});
  } else if(a.id==='shorshu'){
    const p=landing(m,a,460);m.zones.push({owner:a.side,kind:'roots',x:p.x,y:p.y,r:surge?95:75,age:0,life:2.2,delay:.45,done:false,root:surge?2.2:1.6,damage:surge?34:26});
  } else if(a.id==='windguard'){
    m.waves.push({kind:'wave',owner:a.side,x:a.x,y:a.y,angle:a.aim,age:0,speed:620,r:surge?120:90,damage:surge?48:36,push:surge?150:115,life:1.1,hit:[]});
  } else if(a.id==='seaguard'){
    a.guard=Math.max(a.guard,2);m.waves.push({kind:'quake',owner:a.side,x:a.x,y:a.y,age:0,r:surge?240:190,damage:surge?50:38,slow:1.4,life:.7,hit:[]});event(m,'quake',{side:a.side});
  } else if(a.id==='fireguard'){
    for(const off of surge?[-.36,-.18,0,.18,.36]:[-.26,0,.26]){const ang=a.aim+off;
      m.shots.push({id:++m.nextId,owner:a.side,x:a.x+Math.cos(ang)*(a.radius+12),y:a.y+Math.sin(ang)*(a.radius+12),vx:Math.cos(ang)*440,vy:Math.sin(ang)*440,r:15,damage:16,life:1.1,color:a.spec.color,kind:'fireball',explode:{r:surge?100:80,damage:surge?24:18}});}
  } else if(a.id==='galgalor'){
    const n=surge?14:10;for(let i=0;i<n;i++){const ang=a.aim+i*Math.PI*2/n;
      m.shots.push({id:++m.nextId,owner:a.side,x:a.x+Math.cos(ang)*(a.radius+8),y:a.y+Math.sin(ang)*(a.radius+8),vx:Math.cos(ang)*560,vy:Math.sin(ang)*560,r:8,damage:surge?13:12,life:1.1,color:a.spec.color,kind:'galgalor'});}
  }
}
const TRAIL={windguard:'electric',seaguard:'water',fireguard:'fire',maimi:'water',tehomon:'water',tzlilon:'water',havzuk:'electric',zikuk:'electric',galgalor:'electric',lohatan:'fire',slauz:'shield',retetoz:'shield',shorshu:'shield'};
export const trailKind=id=>TRAIL[id]||'shield';
export function dodge(m,a,input={}) {
  if(a.dashCd>0||a.windup>0||a.hp<=0)return false;
  let n=norm(input.moveX||0,input.moveY||0);if(!input.moveX&&!input.moveY)n={x:Math.cos(a.aim),y:Math.sin(a.aim)};
  const start={x:a.x,y:a.y};for(let i=0;i<10;i++){a.x+=n.x*9;a.y+=n.y*7;confine(a);resolveCover(m,a);}
  a.dashCd=a.spec.dashCooldown;a.invincible=.24;
  if(m.ball&&m.ball.carrier===1-a.side){const c=m.actors[1-a.side];if(length(c.x-a.x,c.y-a.y)<a.radius+c.radius+40&&c.invincible<=0){m.ball.carrier=a.side;m.ball.carryTime=0;m.ball.hits=0;m.ball.noPick[1-a.side]=.6;event(m,'steal',{side:a.side});effect(m,'steal',c.x,c.y,{color:a.spec.color});}}
  if(a.upgrades.includes('trail')){
    const kind=trailKind(a.id);
    if(kind==='shield')a.guard=Math.max(a.guard,1.6);
    else m.zones.push({owner:a.side,kind,x:start.x,y:start.y,r:kind==='water'?78:66,age:0,life:kind==='water'?3.5:2.5,pulse:0});
  }
  effect(m,'dash',a.x,a.y,{from:start,color:a.spec.color});event(m,'dash',{side:a.side});return true;
}
function stepBoss(m,a,dt) {
  const b=a.boss,p=m.actors[0];b.timer-=dt;a.moveX=0;a.moveY=0;
  if(b.timer<=0){
    if(b.phase==='guard'){b.phase='windup';b.timer=1.05;b.hit=false;event(m,'boss-windup');}
    else if(b.phase==='windup'){b.phase='charge';b.timer=.55;event(m,'boss-charge');}
    else if(b.phase==='charge'){b.phase='recover';b.timer=2.8;event(m,'boss-open');}
    else{b.phase='guard';b.timer=3.8;event(m,'boss-guard');}
  }
  if(b.phase==='guard'){
    const angle=Math.atan2(p.y-a.y,p.x-a.x),delta=Math.atan2(Math.sin(angle-b.angle),Math.cos(angle-b.angle));b.angle+=clamp(delta,-dt*1.05,dt*1.05);a.aim=b.angle;
    const d=length(p.x-a.x,p.y-a.y);if(d>265)move(m,a,Math.cos(b.angle),Math.sin(b.angle),dt,.65);
    if(Math.abs(delta)<.25&&d<700)shoot(m,a,b.angle,LEVELS[m.level].fireScale*1.3);
  }else if(b.phase==='charge'){
    const old={x:a.x,y:a.y};a.moveX=Math.cos(b.angle);a.moveY=Math.sin(b.angle);a.x+=a.moveX*760*dt;a.y+=a.moveY*760*dt*.8;confine(a);
    for(const c of m.covers)if(c.hp>0&&segmentCircle(old.x,old.y,a.x,a.y,c.x,c.y,c.r+a.radius)!=null){c.hp=0;effect(m,'stone',c.x,c.y,{color:'#e9c790'});event(m,'cover',{broken:true});}
    if(!b.hit&&segmentCircle(old.x,old.y,a.x,a.y,p.x,p.y,p.radius+a.radius)!=null){b.hit=true;damage(m,p,32,a,{special:true,pushX:Math.cos(b.angle)*65,pushY:Math.sin(b.angle)*50});}
  }
  a.aim=b.angle;a.facing=Math.cos(b.angle)>0?1:-1;
}
function aiInput(m,dt) {
  const ai=m.ai,a=m.actors[1],p=m.actors[0],level=LEVELS[m.level];ai.timer-=dt;ai.strafeTime-=dt;
  if(ai.timer>0)return m.calm?{...ai,fire:false,special:false}:ai;
  ai.timer=level.reaction;
  if(ai.strafeTime<=0){ai.strafe= m.random()>.5?1:-1;ai.strafeTime=1.5+m.random()*2;}
  const dx=p.x-a.x,dy=p.y-a.y,d=length(dx,dy),n=norm(dx,dy),wanted=a.spec.aiRange||225;
  let toward=d>wanted+45?1:d<wanted-40?-.9:.05;
  let mx=n.x*toward-n.y*.65*ai.strafe,my=n.y*toward+n.x*.65*ai.strafe;
  if(m.pickup&&a.hp<a.spec.hp*.7){const q=norm(m.pickup.x-a.x,m.pickup.y-a.y);mx=q.x;my=q.y;}
  // React to approaching projectiles; the easier opponent only responds late.
  for(const s of m.shots)if(s.owner===0&&length(s.x-a.x,s.y-a.y)<(m.level==='rookie'?75:150)){
    const cross=s.vx*(a.y-s.y)-s.vy*(a.x-s.x),avoid=norm(-s.vy,s.vx);mx+=avoid.x*Math.sign(cross||1)*1.4;my+=avoid.y*Math.sign(cross||1)*1.4;
  }
  for(const c of m.covers)if(c.hp>0){const ax=a.x-c.x,ay=a.y-c.y,dist=length(ax,ay),r=c.r+a.radius+45;
    if(dist<r){const push=(r-dist)/45;mx+=ax/(dist||1)*push*2;my+=ay/(dist||1)*push*2;}}
  const goal=modeGoal(m,a,p,d);if(goal){mx=mx*goal.keep+goal.x;my=my*goal.keep+goal.y;}
  const move=norm(mx,my);ai.moveX=move.x;ai.moveY=move.y;
  const lead=m.level==='rookie'?0:d/a.spec.shotSpeed*.55;
  const angle=Math.atan2(dy+p.moveY*p.spec.speed*lead*.8,dx+p.moveX*p.spec.speed*lead)+(m.random()-.5)*level.aimError*2;
  ai.aimX=a.x+Math.cos(angle)*500;ai.aimY=a.y+Math.sin(angle)*500;ai.fire=d<760&&!(p.out>0);
  if(m.ball?.carrier===1){const G=GOALS[0],gd=length(G.x-a.x,G.y-a.y);ai.aimX=G.x;ai.aimY=G.y+(m.random()-.5)*G.half;ai.fire=gd<BALL_TUNE.aiKick*(m.level==='rookie'?.8:1);ai.special=gd<BALL_TUNE.aiKick*1.5&&gd>BALL_TUNE.aiKick&&a.superCharge>=1;}
  ai.special=m.time>level.specialDelay&&d<(a.spec.specialRange||300)&&d>(a.spec.specialMin||0)&&p.stun<=0;
  ai.dash=m.level==='champion'&&d<130&&!['slauz','tehomon','seaguard'].includes(a.id)&&a.dashCd<=0;
  if(m.ball?.carrier===0&&d<150&&a.dashCd<=0&&!(p.invincible>0))ai.dash=true;if(m.calm){ai.fire=false;ai.special=false;}return ai;
}
// Like Brawl Stars: after a few calm seconds without hitting or being hit, health refills.
export const REGEN_DELAY=3,REGEN_RATE=.13;
export const SUPER_SHARE=+(globalThis.process?.env?.SUPER_SHARE||.33),SUPER_PASSIVE=+(globalThis.process?.env?.SUPER_PASSIVE||30);
function chargeSuper(m,a,amount){if(!a||a.hp<=0)return;amount*=(CREATURES[a.id]?.specialCooldown||1)/(a.spec.specialCooldown||1);const before=a.superCharge||0;a.superCharge=Math.min(1,before+amount);if(before<1&&a.superCharge>=1)event(m,'super-ready',{side:a.side});}
function regenerate(a,dt){a.calm=(a.calm||0)+dt;a.regen=0;if(a.hp>0&&!(a.out>0)&&a.hp<a.spec.hp&&a.calm>=REGEN_DELAY){a.hp=Math.min(a.spec.hp,a.hp+a.spec.hp*REGEN_RATE*dt);a.regen=1;}}
function stepActor(m,a,input,dt,scale=1) {
  regenerate(a,dt);if(!(a.out>0)&&m.status==='playing')chargeSuper(m,a,dt/SUPER_PASSIVE);
  for(const key of ['fireCd','specialCd','dashCd','invincible','guard','stun','slow','root','hit','attack'])a[key]=Math.max(0,a[key]-dt);
  if(a.out>0){a.moveX=0;a.moveY=0;return;}
  if(a.stun>0){a.moveX=0;a.moveY=0;return;}
  if(a.boss){stepBoss(m,a,dt);return;}
  if(a.windup>0){a.windup-=dt;if(a.windup<=0){const surge=a.upgrades.includes('surge');m.waves.push({kind:'quake',owner:a.side,x:a.x,y:a.y,age:0,r:surge?235:182,damage:surge?65:46,life:.7,hit:[]});event(m,'quake',{side:a.side});}}
  if(a.stun>0)return;
  move(m,a,input.moveX||0,input.moveY||0,dt,scale);
  if(input.aimX!=null)a.aim=Math.atan2(input.aimY-a.y,input.aimX-a.x);
  else {const target=m.actors[1-a.side],distance=length(target.x-a.x,target.y-a.y),lead=distance/a.spec.shotSpeed*.72,speed=target.spec.speed*(target.side?LEVELS[m.level].speedScale:1);a.aim=Math.atan2(target.y+target.moveY*speed*lead*.8-a.y,target.x+target.moveX*speed*lead-a.x);}
  if(Math.abs(Math.cos(a.aim))>.15)a.facing=Math.cos(a.aim)>0?1:-1;
  if(input.dash)dodge(m,a,input);
  if(m.ball&&m.ball.carrier===a.side){
    if(input.aimX==null){const G=GOALS[1-a.side];a.aim=Math.atan2(G.y-a.y,G.x-a.x);a.facing=Math.cos(a.aim)>0?1:-1;}
    if(input.special&&a.superCharge>=1&&m.ball.carryTime>=.22){a.superCharge=0;kickBall(m,a,true);}else if(input.fire)kickBall(m,a,false);
    return;}
  if(input.special&&a.superCharge>=1&&useSpecial(m,a,input)){a.superCharge=0;event(m,'super',{side:a.side});}
  if(input.fire)shoot(m,a,a.aim,a.side?LEVELS[m.level].fireScale:1);
}
function updateProjectiles(m,dt) {
  for(const s of m.shots){
    const x=s.x+s.vx*dt,y=s.y+s.vy*dt;s.life-=dt;
    let hit=null,t=2;
    const target=m.actors[1-s.owner],enemyT=target.out>0?null:segmentCircle(s.x,s.y,x,y,target.x,target.y,s.r+target.radius);
    if(enemyT!=null){hit=target;t=enemyT;}
    if(m.ball&&m.ball.carrier<0){const bt=segmentCircle(s.x,s.y,x,y,m.ball.x,m.ball.y,s.r+16);if(bt!=null&&bt<t){s.life=0;m.ball.vx+=s.vx*.4;m.ball.vy+=s.vy*.4;effect(m,'stone',m.ball.x,m.ball.y,{color:'#d6f1ff'});continue;}}
    for(const c of m.covers)if(c.hp>0){const ct=segmentCircle(s.x,s.y,x,y,c.x,c.y,c.r+s.r);if(ct!=null&&ct<t){hit=c;t=ct;}}
    if(hit){s.x+=(x-s.x)*t;s.y+=(y-s.y)*t;s.life=0;if(s.explode)burst(m,s);
      if(hit.side!=null){damage(m,hit,s.damage,m.actors[s.owner],{special:s.kind!==m.actors[s.owner]?.id&&s.kind!=='blast',hitAngle:Math.atan2(-s.vy,-s.vx),pushX:s.kind==='maimi'?s.vx*.018:0,pushY:s.kind==='maimi'?s.vy*.018:0});}
      else{hit.hp=Math.max(0,hit.hp-s.damage);effect(m,'stone',s.x,s.y,{color:'#ead2a9'});event(m,'cover',{broken:hit.hp===0});}
    }else{s.x=x;s.y=y;}
  }
  for(const s of m.shots)if(s.explode&&!s.burst&&(s.life<=0||s.x<=40||s.x>=1240||s.y<=85||s.y>=710))burst(m,s);
  m.shots=m.shots.filter(s=>s.life>0&&s.x>40&&s.x<1240&&s.y>85&&s.y<710);
  for(const w of m.waves){w.age+=dt;if(w.visual)continue;if(w.kind==='wave'){w.x+=Math.cos(w.angle)*w.speed*dt;w.y+=Math.sin(w.angle)*w.speed*dt;}
    const a=m.actors[w.owner],target=m.actors[1-w.owner],r=w.kind==='wave'?w.r:w.r*Math.min(1,w.age/.22);
    if(!w.hit.includes(target.side)&&length(target.x-w.x,target.y-w.y)<r+target.radius){
      w.hit.push(target.side);const n=norm(target.x-w.x,target.y-w.y),push=w.push??(w.kind==='wave'?65:32);
      if(w.slow&&target.invincible<=0)target.slow=Math.max(target.slow,w.slow);
      if(w.stun&&target.invincible<=0){target.stun=Math.max(target.stun,w.stun);effect(m,'dizzy',target.x,target.y,{color:'#d7b8ff'});}
      damage(m,target,w.damage??(w.kind==='wave'?34:w.kind==='electric'?32:46),a,{pushX:n.x*push,pushY:n.y*push,special:true});if(w.kind==='wave')target.slow=1;
    }
    for(let i=0;i<m.covers.length;i++){const c=m.covers[i];if(c.hp>0&&!w.hit.includes('c'+i)&&length(c.x-w.x,c.y-w.y)<r+c.r){w.hit.push('c'+i);c.hp=Math.max(0,c.hp-42);effect(m,'stone',c.x,c.y,{color:'#ead2a9'});}}
  }
  m.waves=m.waves.filter(w=>w.age<w.life);
  for(const z of m.zones){z.age+=dt;z.pulse-=dt;const a=m.actors[z.owner],target=m.actors[1-z.owner];
    const inside=length(target.x-z.x,target.y-z.y)<z.r+target.radius;
    if(z.kind==='roots'){if(!z.done&&z.age>=z.delay){z.done=true;if(inside&&target.invincible<=0){target.root=Math.max(target.root,z.root);damage(m,target,z.damage,a,{special:true});effect(m,'rooted',target.x,target.y,{color:'#9be06a'});}}continue;}
    if(z.kind==='vortex'&&inside){target.slow=Math.max(target.slow,.25);const n=norm(z.x-target.x,z.y-target.y);if(target.invincible<=0&&!target.boss){target.x+=n.x*110*dt;target.y+=n.y*90*dt;confine(target);resolveCover(m,target);}if(z.pulse<=0){damage(m,target,z.damage,a,{special:true});z.pulse=.5;}continue;}
    if(inside){if(z.kind==='water')target.slow=Math.max(target.slow,.2);else if(z.pulse<=0){damage(m,target,6,a,{special:true});z.pulse=.5;}}
  }m.zones=m.zones.filter(z=>z.age<z.life);
}
function burst(m,s){s.burst=true;const p={x:s.x,y:s.y};
  m.waves.push({kind:'blast',owner:s.owner,x:p.x,y:p.y,age:0,r:s.explode.r,damage:s.explode.damage,push:40,life:.5,hit:[]});
  m.zones.push({owner:s.owner,kind:'fire',x:p.x,y:p.y,r:s.explode.r*.62,age:0,life:2.5,pulse:.3});event(m,'blast',{side:s.owner});}
export function finish(m,winner,reason='knockout') {
  if(m.status==='finished')return;
  m.winner=winner;m.reason=reason;m.status='finished';event(m,'finish',{winner});
}
export function step(m,input={},dt=1/60) {
  dt=clamp(dt,0,1/30);m.events=[];
  for(const e of m.effects)e.age+=dt;m.effects=m.effects.filter(e=>e.age<1);
  if(m.status==='finished'||m.status==='paused')return;
  if(m.status==='countdown'){m.countdown-=dt;if(m.countdown<=0){m.status='playing';event(m,'go');}return;}
  m.time+=dt;
  for(const c of m.covers)if(c.hp>0&&c.collapseAt!=null&&m.time>=c.collapseAt){
    c.hp=0;effect(m,'stone',c.x,c.y,{color:'#ffd586'});event(m,'collapse');
  }
  const ai=aiInput(m,dt);stepActor(m,m.actors[0],input,dt);stepActor(m,m.actors[1],ai,dt,LEVELS[m.level].speedScale);
  // Fighters cannot occupy the same physical space.
  const [a,b]=m.actors,d=length(a.x-b.x,a.y-b.y),r=a.radius+b.radius;
  if(d<r){const n=norm(a.x-b.x||.01,a.y-b.y),shift=(r-d)/2;a.x+=n.x*shift;a.y+=n.y*shift;b.x-=n.x*shift;b.y-=n.y*shift;resolveCover(m,a);resolveCover(m,b);}
  updateProjectiles(m,dt);
  if(m.mode)stepMode(m,dt);
  if(m.status==='finished')return;
  if(!m.pickup&&m.time>=m.pickupAt&&!m.mode){m.pickup={x:640,y:395,life:12};m.pickupAt=m.time+20;event(m,'pickup-ready');}
  if(m.pickup){m.pickup.life-=dt;for(const actor of m.actors)if(m.pickup&&actor.hp>0&&actor.hp<actor.spec.hp&&length(actor.x-m.pickup.x,actor.y-m.pickup.y)<actor.radius+22){
    const amount=Math.min(30,actor.spec.hp-actor.hp);actor.hp+=amount;actor.stats.healed+=amount;effect(m,'heal',actor.x,actor.y,{amount,color:'#91f5be'});event(m,'heal',{side:actor.side,amount});m.pickup=null;
  }if(m.pickup?.life<=0)m.pickup=null;}
  if(m.ball){if(m.time>=m.duration){const B=m.ball;if(B.score[0]!==B.score[1])finish(m,B.score[0]>B.score[1]?0:1,'time');else if(!B.overtime){B.overtime=true;m.duration+=40;event(m,'overtime');}else{const difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,Math.abs(difference)<.002?-1:difference>0?0:1,'time');}}return;}
  if(m.trio){if(m.time>=m.duration){const l0=trioLeft(m,0),l1=trioLeft(m,1),x=m.actors[0],y=m.actors[1],difference=x.hp/x.spec.hp-y.hp/y.spec.hp;finish(m,l0!==l1?(l0>l1?0:1):Math.abs(difference)<.002?-1:difference>0?0:1,'time');}return;}
  if(m.wind){if(m.time>=m.duration){const lead=a.feathers-b.feathers,difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,lead?(lead>0?0:1):Math.abs(difference)<.002?-1:difference>0?0:1,'time');}return;}
  if(a.hp<=0||b.hp<=0)finish(m,a.hp<=0&&b.hp<=0?-1:a.hp<=0?1:0);
  else if(m.time>=m.duration){const difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,Math.abs(difference)<.002?-1:difference>0?0:1,'time');}
}
export function resultStats(m) {const a=m.actors[0];return {damage:Math.round(a.stats.damage),blocked:Math.round(a.stats.blocked),accuracy:a.stats.shots?Math.round(a.stats.hits/a.stats.shots*100):0,specials:a.stats.specials,healed:Math.round(a.stats.healed),weakHits:a.stats.weakHits,seconds:Math.round(m.time)};}
export const STORAGE_KEY='creature-league.v1';
export function freshProfile() {return {version:1,selected:'maimi',level:'rookie',sound:true,wins:0,played:0,cups:0,challengeWins:0,bestStreak:0,streak:0,history:[],creatures:{},cup:null,unlocked:[],newCards:[...STARTERS],skins:{},story:{done:0,v:3},storyCards:[],missionStars:{},missionLosses:{}};}
export function readProfile(storage) {
  const fresh=freshProfile();try{const data=JSON.parse(storage.getItem(STORAGE_KEY));if(!data||data.version!==1)return fresh;
    for(const key of ['wins','played','cups','challengeWins','bestStreak','streak'])fresh[key]=Number.isFinite(data[key])?clamp(Math.floor(data[key]),0,1e8):0;
    if(!fresh.cups)fresh.challengeWins=0;
    if(CREATURES[data.selected])fresh.selected=data.selected;if(LEVELS[data.level])fresh.level=data.level;fresh.sound=data.sound!==false;
    fresh.history=Array.isArray(data.history)?data.history.filter(h=>h&&CREATURES[h.player]&&CREATURES[h.rival]&&typeof h.id==='string'&&Number.isFinite(h.damage)&&Number.isFinite(h.accuracy)).slice(0,12):[];
    for(const id of Object.keys(CREATURES)){const c=data.creatures?.[id];if(c&&Number.isFinite(c.wins)&&Number.isFinite(c.played))fresh.creatures[id]={wins:clamp(c.wins,0,1e8),played:clamp(c.played,0,1e8),damage:Number.isFinite(c.damage)?clamp(c.damage,0,1e10):0};}
    if(data.cup&&Number.isInteger(data.cup.stage)&&data.cup.stage>=0&&data.cup.stage<3)fresh.cup={stage:data.cup.stage,player:CREATURES[data.cup.player]?data.cup.player:fresh.selected,upgrades:cleanUpgrades(data.cup.upgrades).slice(0,data.cup.stage)};
    fresh.unlocked=Array.isArray(data.unlocked)?[...new Set(data.unlocked.filter(id=>WILD.includes(id)))]:[];
    {let done=Number.isInteger(data.story?.done)?clamp(data.story.done,0,100):0;
    // Version 3 added the tide ball before the sea guardian (step 6) and the trio gate before the castle (step 13).
    if((data.story?.v||2)<3)done+=(done>6?1:0)+(done>13?1:0);
    fresh.story={done,v:3};}
    for(const key of ['missionStars','missionLosses'])if(data[key]&&typeof data[key]==='object')for(const [id,n] of Object.entries(data[key]))if(/^[a-z0-9-]{1,32}$/.test(id)&&Number.isFinite(n))fresh[key][id]=clamp(Math.floor(n),0,key==='missionStars'?3:99);
    fresh.storyCards=Array.isArray(data.storyCards)?[...new Set(data.storyCards.filter(id=>typeof id==='string'&&/^[a-zA-Z]{1,24}$/.test(id)))]:[];
    if(Array.isArray(data.newCards))fresh.newCards=[...new Set(data.newCards.filter(id=>isUnlocked(fresh,id)||fresh.storyCards.includes(id)))];
    for(const id of Object.keys(CREATURES)){const skin=data.skins?.[id];if(typeof skin==='string'&&SKINS.some(s=>s.id===skin))fresh.skins[id]=skin;}
    if(!isUnlocked(fresh,fresh.selected))fresh.selected='maimi';
    if(data.lastBuild&&CREATURES[data.lastBuild.player])fresh.lastBuild={player:data.lastBuild.player,upgrades:cleanUpgrades(data.lastBuild.upgrades)};return fresh;
  }catch{return fresh;}
}
export function saveProfile(storage,profile) {try{storage.setItem(STORAGE_KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function startCup(profile) {
  if(!profile.cup)profile.cup={stage:0,player:profile.selected,upgrades:[]};
  if(!profile.cup.player)profile.cup.player=profile.selected;
  profile.cup.upgrades=cleanUpgrades(profile.cup.upgrades);return profile.cup;
}
export function needsUpgrade(profile) {return !!profile.cup&&profile.cup.stage>(profile.cup.upgrades?.length??0);}
export function chooseUpgrade(profile,id) {
  if(!needsUpgrade(profile)||!UPGRADE_IDS.includes(id)||profile.cup.upgrades?.includes(id))return false;
  startCup(profile);profile.cup.upgrades.push(id);return true;
}
export function recordResult(profile,m,mode) {
  if(m.status!=='finished'||profile.history.some(h=>h.id===m.id))return false;
  const won=m.winner===0;profile.played++;if(won){profile.wins++;profile.streak++;profile.bestStreak=Math.max(profile.bestStreak,profile.streak);}else profile.streak=0;
  const id=m.actors[0].id,c=profile.creatures[id]??{wins:0,played:0,damage:0};c.played++;if(won)c.wins++;c.damage+=Math.round(m.actors[0].stats.damage);profile.creatures[id]=c;
  profile.history.unshift({id:m.id,player:id,rival:m.actors[1].id,won,draw:m.winner===-1,mode,upgrades:[...m.actors[0].upgrades],...resultStats(m)});profile.history=profile.history.slice(0,12);
  if(mode==='cup'&&won&&profile.cup){profile.cup.stage++;if(profile.cup.stage>=3){profile.cups++;profile.lastBuild={player:id,upgrades:[...m.actors[0].upgrades]};profile.cup=null;}}
  if(mode==='challenge'&&m.challenge===CHALLENGE.id&&challengeUnlocked(profile)&&won)profile.challengeWins=(profile.challengeWins||0)+1;
  if(mode==='wild'&&won&&m.wild&&!isUnlocked(profile,m.wild)){profile.unlocked.push(m.wild);profile.newCards.push(m.wild);}
  return true;
}
