// Friend battles across two phones. The host's phone runs the battle; the guest's phone draws what the host sends
// and sends back its own moves. Everything here is plain data, so the browser and the tests share it.
// cleanStart lives in core.js (so app.js reaches it as sim.cleanStart) and is shared from here too.
export {cleanStart} from './core.js';
import {DRUM_TILES} from './core.js';
// Version 3: hats, Lab designs, copy stars, the comeback star, comeback cards and the new Wonders travel too,
// so a phone with the older picture layout must not pair with a new one.
export const PROTOCOL=3,SNAPSHOT_EVERY=3,INPUT_HZ=30;
// A room code is three creature pictures out of nine: 729 rooms, easy to tap and to say out loud.
export const CODE_CREATURES=['maimi','havzuk','slauz','lohatan','tehomon','zikuk','shorshu','tzlilon','galgalor'];
export const peerId=code=>'creature-league-v'+PROTOCOL+'-'+code.map(id=>CODE_CREATURES.indexOf(id)).join('');
export const randomCode=(random=Math.random)=>Array.from({length:3},()=>CODE_CREATURES[Math.floor(random()*CODE_CREATURES.length)]);
export function codeFromText(text){const ids=String(text||'').split(/[-,\s]+/).filter(id=>CODE_CREATURES.includes(id));return ids.length===3?ids:null;}
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100,f2=v=>Math.floor(v*100+1e-6)/100;
// Booleans travel as 0/1. Appended in this order after the older keys; a dash travels after them as [t,vx,vy] or 0.
// megaPending and windupSurge let the guest draw a MEGA super's warning ring as wide as the real one; star is the comeback star.
const ACTOR_KEYS=['hit','attack','stun','out','invincible','windup','guard','root','slow','lightShield','power','feathers','regen','form','pips','sz','canForm','formUsed','tellT','hear','silence','radius','megaPending','windupSurge','star'];
// A shot's flags: it bounced, it is a Lab afterimage, it is a Wonder bubble. Sent only when there is something to send.
const shotFlags=s=>(s.bounced?1:0)|(s.ghost?2:0)|(s.bubble?4:0);
const tagOf=o=>o.src?{src:o.src,tint2:o.tint2||null}:{};
// The public part of the Wonders' state, small: flies [x,y], mushrooms [x,y,up], kernels [x,y,h], the swap timer.
function packWonderX(X){if(!X)return null;const out={};
  if(X.flies)out.f=X.flies.map(f=>[r1(f.x),r1(f.y)]);if(X.shrooms)out.s=X.shrooms.map(s=>[s.x,s.y,s.up?1:0]);
  if(X.kernels)out.k=X.kernels.map(k=>[r1(k.x),r1(k.y),r2(k.h||0)]);if(X.swapIn!=null)out.w=r2(X.swapIn);return out;}
function unpackWonderX(w){if(!w)return null;const out={};
  if(w.f)out.flies=w.f.map(([x,y])=>({x,y}));if(w.s)out.shrooms=w.s.map(([x,y,up])=>({x,y,up}));if(w.k)out.kernels=w.k.map(([x,y,h])=>({x,y,h,hop:1}));if(w.w!=null)out.swapIn=w.w;return out;}
// One picture of the battle: where everyone is, what flies, what lies on the floor, and what just happened.
// superCharge is floored, so the guest never shows a super as ready before the host does.
export function snapshot(m,events=[],effects=[]){
  return {
    t:r2(m.time),st:m.status,cd:r2(m.countdown),w:m.winner,rs:m.reason||null,du:m.duration,
    a:m.actors.map(a=>[r1(a.x),r1(a.y),r1(a.hp),a.spec.hp,f2(a.superCharge||0),a.facing,r2(a.aim),r2(a.moveX||0),r2(a.moveY||0),...ACTOR_KEYS.map(k=>r2(+a[k]||0)),a.dash?[r2(a.dash.t),r1(a.dash.vx),r1(a.dash.vy)]:0]),
    s:m.shots.map(s=>{const base=[s.id,r1(s.x),r1(s.y),r1(s.vx),r1(s.vy),s.r,s.owner,s.kind,s.color,s.life>0?1:0],fl=shotFlags(s);return fl||s.tint2?[...base,fl,s.tint2||0]:base;}),
    wv:m.waves.map(w=>({kind:w.kind,owner:w.owner,x:r1(w.x),y:r1(w.y),angle:r2(w.angle||0),age:r2(w.age),r:w.r,life:w.life,speed:w.speed||0,visual:!!w.visual,...tagOf(w)})),
    z:m.zones.map(z=>({kind:z.kind,owner:z.owner,x:r1(z.x),y:r1(z.y),r:z.r,age:r2(z.age),life:z.life,delay:z.delay||0,done:!!z.done,...tagOf(z),...(z.a0!=null?{a0:z.a0,a1:z.a1}:{}),...(z.trail?{trail:true}:{})})),
    cv:m.covers.map(c=>c.born!=null?[r1(c.hp),c.collapseAt??null,c.hitAt!=null?r2(c.hitAt):null,r2(c.born)]:[r1(c.hp),c.collapseAt??null,c.hitAt!=null?r2(c.hitAt):null]),
    pk:m.pickup?[m.pickup.x,m.pickup.y]:null,
    b:m.ball?{x:r1(m.ball.x),y:r1(m.ball.y),c:m.ball.carrier,sc:m.ball.score,o:m.ball.overtime}:null,
    wd:m.wind?{f:m.wind.feathers.map(f=>[r1(f.x),r1(f.y)]),h:m.wind.holder,hd:r2(m.wind.hold)}:null,
    lv:m.lava?{s:r2(m.lava.scale),e:m.lava.embers.map(e=>[r1(e.x),r1(e.y)]),er:m.lava.eruptions.map(e=>[r1(e.x),r1(e.y),e.r,e.delay,r2(e.age),e.done?1:0])}:null,
    wn:m.wonder?[m.wonder.state,m.wonder.x,m.wonder.y,m.wonder.id,m.wonder.owner,r2(m.wonder.age),m.wonder.endless?1:0]:null,
    wx:packWonderX(m.wonderX),
    dr:m.drums?[m.drums.src,...m.drums.lit]:null,
    cs:m.copyStars?.length?m.copyStars.map(s=>[s.x,s.y,s.kind,s.owner,r2(s.t),r2(s.age)]):null,
    cp:m.actors.some(a=>a.copy)?m.actors.map(a=>a.copy||0):null,
    cb:m.comeback?[m.comeback.x,m.comeback.y,r2(m.comeback.t),m.comeback.side,r2(m.comeback.age)]:null,
    dc:m.decoy?[m.decoy.side,r1(m.decoy.x),r1(m.decoy.y),m.decoy.facing,r2(m.decoy.t)]:null,
    hl:m.hill?[m.hill.x,m.hill.y,m.hill.r,r1(m.hill.points[0]),r1(m.hill.points[1]),m.hill.holder,m.hill.in[0]?1:0,m.hill.in[1]?1:0,m.hill.next?.x??null,m.hill.next?.y??null]:null,
    rc:m.race?{at:m.race.at,li:m.race.lastIn.map(r2),w:m.race.wisps.map(w=>[r1(w.x),r1(w.y)]),rv:m.race.rival,b:m.race.bridged,f:r2(m.race.fill||0)}:null,
    rh:m.rhythm?[m.rhythm.bpm,m.rhythm.beat,m.rhythm.phase,m.rhythm.stage,m.rhythm.crack?1:0]:null,
    sp:m.spectacle?[m.spectacle.stage,r2(m.spectacle.beat)]:null,
    // The final blow has landed: the guest draws the slow ending as the host does (the winner solid, the loser's shadow kept).
    en:m.ending?[r2(m.ending.at),m.ending.winner,m.ending.loser]:null,
    ev:events.map(e=>({...e})),fx:effects.map(e=>({...e,age:0})),
  };
}
// On the guest: lay the picture over the guest's own copy of the match. Positions are kept as targets, so the
// creatures glide there instead of jumping twenty times a second.
export function applySnapshot(m,snap){
  m.time=snap.t;m.status=snap.st;m.countdown=snap.cd;m.winner=snap.w;m.reason=snap.rs;if(snap.du>0)m.duration=snap.du;
  snap.a.forEach((v,i)=>{const a=m.actors[i];if(!a)return;const [x,y,hp,maxHp,charge,facing,aim,mx,my,...rest]=v;
    if(a.netX==null||Math.hypot(x-a.x,y-a.y)>120){a.x=x;a.y=y;}a.netX=x;a.netY=y;
    a.hp=hp;if(a.spec.hp!==maxHp)a.spec={...a.spec,hp:maxHp};a.superCharge=charge;a.facing=facing;a.aim=aim;a.moveX=mx;a.moveY=my;
    ACTOR_KEYS.forEach((k,j)=>{if(rest[j]!=null)a[k]=rest[j];});
    const dash=rest[ACTOR_KEYS.length];a.dash=Array.isArray(dash)?{t:dash[0],vx:dash[1],vy:dash[2],hit:[]}:null;
    a.copy=snap.cp?.[i]||null;});
  m.shots=snap.s.map(([id,x,y,vx,vy,r,owner,kind,color,alive,fl=0,tint2=0])=>({id,x,y,vx,vy,r,owner,kind,color,life:alive?1:0,...(fl&1?{bounced:true}:{}),...(fl&2?{ghost:true}:{}),...(fl&4?{bubble:true}:{}),...(tint2?{tint2}:{})}));
  m.waves=snap.wv.map(w=>({...w,hit:[]}));m.zones=snap.z.map(z=>({...z,pulse:1,hit:[]}));
  snap.cv.forEach(([hp,collapseAt,hitAt,born],i)=>{const c=m.covers[i];if(c){c.hp=hp;if(collapseAt!=null)c.collapseAt=collapseAt;if(hitAt!=null)c.hitAt=hitAt;if(born!=null)c.born=born;}});
  m.pickup=snap.pk?{x:snap.pk[0],y:snap.pk[1],life:1}:null;
  if(snap.b&&m.ball)Object.assign(m.ball,{x:snap.b.x,y:snap.b.y,carrier:snap.b.c,score:snap.b.sc,overtime:snap.b.o});
  if(snap.wd&&m.wind)Object.assign(m.wind,{feathers:snap.wd.f.map(([x,y])=>({x,y,age:1})),holder:snap.wd.h,hold:snap.wd.hd});
  if(snap.lv&&m.lava)Object.assign(m.lava,{scale:snap.lv.s,embers:snap.lv.e.map(([x,y])=>({x,y,age:1})),eruptions:snap.lv.er.map(([x,y,r,delay,age,done])=>({x,y,r,delay,age,done:!!done}))});
  if('en' in snap)m.ending=Array.isArray(snap.en)?{at:snap.en[0],winner:snap.en[1],loser:snap.en[2]}:null;
  if('wn' in snap){const w=snap.wn;m.wonder=Array.isArray(w)?{state:w[0],x:w[1],y:w[2],id:w[3],owner:w[4],age:w[5],started:w[0]==='active'||w[0]==='done',endless:!!w[6]}:null;}
  if('wx' in snap)m.wonderX=unpackWonderX(snap.wx);
  if('dr' in snap)m.drums=Array.isArray(snap.dr)?{tiles:DRUM_TILES,lit:snap.dr.slice(1),src:snap.dr[0]}:null;
  if('cs' in snap)m.copyStars=(snap.cs||[]).map(([x,y,kind,owner,t,age])=>({x,y,kind,owner,t,age:age??1}));
  if('cb' in snap)m.comeback=Array.isArray(snap.cb)?{x:snap.cb[0],y:snap.cb[1],t:snap.cb[2],side:snap.cb[3],age:snap.cb[4]}:null;
  if('dc' in snap)m.decoy=Array.isArray(snap.dc)?{side:snap.dc[0],x:snap.dc[1],y:snap.dc[2],facing:snap.dc[3],t:snap.dc[4]}:null;
  if(Array.isArray(snap.hl)){const [x,y,r,p0,p1,holder,in0,in1,nx,ny]=snap.hl;m.hill={...(m.hill||{}),x,y,r,points:[p0,p1],holder,in:[!!in0,!!in1],next:nx!=null?{x:nx,y:ny}:null};}
  if(snap.rc&&m.race)Object.assign(m.race,{at:snap.rc.at,lastIn:snap.rc.li,wisps:snap.rc.w.map(([x,y])=>({x,y,vx:0,vy:0})),rival:snap.rc.rv,bridged:snap.rc.b,fill:snap.rc.f||0});
  if(Array.isArray(snap.rh)){const [bpm,beat,phase,stage,crack]=snap.rh;m.rhythm={...(m.rhythm||{side:1}),bpm,beat,phase,stage,crack:!!crack};}
  if(Array.isArray(snap.sp))m.spectacle={...(m.spectacle||{side:1}),stage:snap.sp[0],beat:snap.sp[1]};
  // The guest records its own mixes from the copied supers it fired, so every copy-used that arrives is kept.
  m.copyLog??=[];for(const e of snap.ev||[])if(e.type==='copy-used')m.copyLog.push({side:e.side,id:e.by,kind:e.kind});
  m.effects.push(...snap.fx);
  return snap.ev;
}
// Between pictures the guest moves things on by itself: shots fly on, creatures glide, timers tick for drawing.
export function coast(m,dt){
  for(const e of m.effects)e.age+=dt;m.effects=m.effects.filter(e=>e.age<1);
  if(m.status!=='playing')return;
  for(const a of m.actors)if(a.netX!=null){const k=Math.min(1,dt*14);a.x+=(a.netX-a.x)*k;a.y+=(a.netY-a.y)*k;}
  for(const s of m.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;}
  for(const w of m.waves){w.age+=dt;if(w.kind==='wave'&&w.speed){w.x+=Math.cos(w.angle)*w.speed*dt;w.y+=Math.sin(w.angle)*w.speed*dt;}}
  for(const z of m.zones)z.age+=dt;
  if(m.wonder&&m.wonder.state!=='wait'&&m.wonder.state!=='done')m.wonder.age+=dt;
  for(const s of m.copyStars||[]){s.age+=dt;s.t=Math.max(0,s.t-dt);}
  if(m.comeback){m.comeback.age+=dt;if(m.comeback.age>=.8)m.comeback.t=Math.max(0,m.comeback.t-dt);}
  if(m.decoy)m.decoy.t=Math.max(0,m.decoy.t-dt);
  if(m.wonderX?.swapIn!=null)m.wonderX.swapIn=Math.max(0,m.wonderX.swapIn-dt);
  if(m.rhythm){const per=60/(m.rhythm.bpm||100);m.rhythm.phase=Math.min(.999,m.rhythm.phase+dt/per);}
}
// The guest's moves. A tap on the super is a counter, so a tap is never lost or counted twice. A tap-to-aim on the
// guest's screen travels too, so both phones aim the same way.
export const packInput=(input,supers)=>({mx:r2(input.moveX||0),my:r2(input.moveY||0),f:input.fire?1:0,sp:supers,...(Number.isFinite(input.aimX)&&Number.isFinite(input.aimY)?{ax:r1(input.aimX),ay:r1(input.aimY)}:{})});
export function unpackInput(msg,state){const special=msg.sp>(state.sp??0);state.sp=Math.max(state.sp??0,msg.sp);
  const out={moveX:+msg.mx||0,moveY:+msg.my||0,fire:!!msg.f,special},ax=+msg.ax,ay=+msg.ay;
  if(msg.ax!=null&&msg.ay!=null&&Number.isFinite(ax)&&Number.isFinite(ay)){out.aimX=Math.max(0,Math.min(1280,ax));out.aimY=Math.max(0,Math.min(720,ay));}
  return out;}
