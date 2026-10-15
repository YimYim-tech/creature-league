// The Land of Two Tracks: the armour hill, the pair race with a friend at your side, the Rhythm Deer's beat with its
// drum tiles, and the spectacle guardian's staged beat. Plain logic: core.js passes in its tools (api), imports this
// file and re-exports the public constants, so nobody else imports it and nothing here imports core.
// HILL_RATE: points a second for whoever stands alone in the ring (a point and a half: a hill took too long at one).
export const HILL_TARGET=25,HILL_R=120,HILL_MOVE=15,HILL_WARN=2,HILL_RATE=+(globalThis.process?.env?.HILL_RATE||1.5);
// A child who stays in the ring while Tzadon stands in it too still scores HILL_SHARE of the rate (he scores only alone): a
// young child who holds the ring is rewarded even while losing the shootout. A child knocked out comes back after HILL_OUT.
export const HILL_SHARE=+(globalThis.process?.env?.HILL_SHARE||.2),HILL_OUT=+(globalThis.process?.env?.HILL_OUT||1.6);
// The ring starts on the painted sun, then moves between open spots of the field.
export const HILL_SPOTS=Object.freeze([{x:640,y:330},{x:380,y:270},{x:900,y:270},{x:420,y:520},{x:870,y:550},{x:640,y:420}]);
// Five gates one after another on the painted orange track; the fifth is the finish arch. The rival team passes one of its
// own gates every RACE_PACE seconds (the first after RACE_FIRST); a super that hits Tzadon holds it back RACE_DELAY seconds.
// RACE_FILL: both friends stand in the gate together this long before it swings open (a ring of light fills on its floor);
// stepping out only pauses it. Without it a race was over in fifteen seconds, before the rival team mattered.
export const RACE_GATES=5,RACE_TOGETHER=1.5,RACE_PACE=+(globalThis.process?.env?.RACE_PACE||6),RACE_FIRST=+(globalThis.process?.env?.RACE_FIRST||8),RACE_DELAY=3,GATE_R=70,WISPS=6,WISP_SLOW=1.1,RUSH=3,BRIDGE_WINDOW=1.5,
  RACE_FILL=+(globalThis.process?.env?.RACE_FILL||4);
// The rival team is slower against a gentler level (and after two lost races, when the step eases).
export const RACE_LEVEL={beginner:1.4,rookie:1.15,challenger:1,veteran:.9,champion:.8};
const racePace=m=>RACE_PACE*(RACE_LEVEL[m.level]||1);
// The gates zig-zag from one side of the track to the other, so the race crosses the whole field.
export const RACE_SPOTS=Object.freeze([{x:198,y:318},{x:1045,y:284},{x:480,y:575},{x:600,y:186},{x:1022,y:505}]);
export const RHYTHM_BPM=[100,130],CRACK_WINDOW=[.3,.8],SPECTACLE_COUNTDOWN=2.8,SPECTACLE_BEAT=1,CRUMBLE_AT=.35;
// Six floor drums in a ring, clear of the four stones and both starting spots.
export const DRUM_TILES=Object.freeze([{x:940,y:395,r:58},{x:790,y:525,r:58},{x:490,y:525,r:58},{x:340,y:395,r:58},{x:490,y:265,r:58},{x:790,y:265,r:58}].map(t=>Object.freeze(t)));
const len=(x,y)=>Math.hypot(x,y),unit=(x,y)=>{const d=len(x,y)||1;return {x:x/d,y:y/d};};
const segDist=(ax,ay,bx,by,px,py)=>{const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l)):0;return len(ax+dx*t-px,ay+dy*t-py);};
const alive=a=>a&&a.hp>0&&!(a.out>0);

// ------------------------------------------------------------------ the armour hill
// Whoever stands alone inside the ring scores points. Both inside, or nobody: nothing. First to 25.
export function setupHill(m,{seed=1}={},api){
  m.hillRandom=api.stream(seed,0x41117);
  m.hill={x:HILL_SPOTS[0].x,y:HILL_SPOTS[0].y,r:HILL_R,points:[0,0],in:[false,false],holder:-1,next:null,moveAt:HILL_MOVE,spot:0};
}
const inHill=(H,a)=>alive(a)&&len(a.x-H.x,(a.y-H.y)/.8)<H.r;
export function stepHill(m,dt,api){const H=m.hill,help=!api.isHuman(m,1);
  api.stepRespawns(m,dt,()=>{},a=>help&&a.side===0?HILL_OUT:2.5);
  H.in=[0,1].map(side=>inHill(H,m.actors[side]));
  const holder=H.in[0]&&!H.in[1]?0:H.in[1]&&!H.in[0]?1:-1,shared=holder<0&&H.in[0]&&H.in[1]&&help;
  if(holder!==H.holder){H.holder=holder;if(holder>=0)api.event(m,'hill-take',{side:holder});}
  if(holder>=0||shared){const s=shared?0:holder;H.points[s]=Math.min(HILL_TARGET,H.points[s]+dt*HILL_RATE*(shared?HILL_SHARE:1));if(H.points[s]>=HILL_TARGET-1e-9){H.points[s]=HILL_TARGET;api.finish(m,s,'hill');return;}}
  if(!H.next&&m.time>=H.moveAt-HILL_WARN){const r=m.hillRandom,options=HILL_SPOTS.map((s,i)=>i).filter(i=>i!==H.spot&&len(HILL_SPOTS[i].x-H.x,HILL_SPOTS[i].y-H.y)>180);
    const i=options[Math.floor(r()*options.length)];H.nextSpot=i;H.next={x:HILL_SPOTS[i].x,y:HILL_SPOTS[i].y};api.event(m,'hill-warn',{x:H.next.x,y:H.next.y});}
  if(H.next&&m.time>=H.moveAt){H.x=H.next.x;H.y=H.next.y;H.spot=H.nextSpot;H.next=null;H.moveAt+=HILL_MOVE;api.effect(m,'hill-move',H.x,H.y,{r:H.r});api.event(m,'hill-move',{x:H.x,y:H.y});}
}
// The rival heads for the ring; inside it, it keeps to the middle while it fights.
export function hillGoal(m,a){const H=m.hill,d=len(a.x-H.x,(a.y-H.y)/.8),q=unit(H.x-a.x,H.y-a.y);
  if(d>H.r*.55)return {x:q.x*2.4,y:q.y*2.4,keep:.3};return {x:q.x*.6,y:q.y*.6,keep:.7};}
export const hillStars=m=>{const lead=m.hill.points[0]-m.hill.points[1];return lead>=15?3:lead>=8?2:1;};
export const hillLeader=m=>{const [p,q]=m.hill.points;return Math.abs(p-q)<1e-6?-1:p>q?0:1;};

// ------------------------------------------------------------------ the pair race
// A gate opens only when both friends were inside it within RACE_TOGETHER of each other. The rival team passes its own
// gates on a timer; a super that hits the rival holds it back. Shadow wisps drift and slow whoever they touch.
export function setupRace(m,{seed=1,ally='zankor',script=false}={},api){
  const r=api.stream(seed,0x7ace5);m.raceRandom=r;
  const friend=api.actor(ally,2);Object.assign(friend,api.SPAWN[2]);friend.facing=1;friend.aim=0;friend.canForm=false;friend.lab=null;m.actors.push(friend);m.allied=true;
  m.race={gates:RACE_SPOTS.map(({x,y})=>({x,y,r:GATE_R})),at:0,lastIn:[-9,-9],fill:0,wisps:[],rival:0,bridged:0,openAt:0,rivalAt:RACE_FIRST*(RACE_LEVEL[m.level]||1),superAt:[-9,-9,-9],script:!!script,scriptAt:null,ready:[false,false],held:[-1,-1,-1]};
  for(let i=0;i<WISPS;i++)m.race.wisps.push(wispAt(m,r,api));
}
function wispAt(m,r,{WORLD}){let best=null;
  for(let k=0;k<12;k++){const ang=r()*Math.PI*2,rad=.25+Math.sqrt(r())*.55,x=WORLD.cx+Math.cos(ang)*WORLD.rx*rad,y=WORLD.cy+Math.sin(ang)*WORLD.ry*rad;
    const near=Math.min(...m.actors.filter(a=>a.side!==1).map(a=>len(a.x-x,a.y-y)));if(!best||near>best.near)best={x,y,near};if(near>220)break;}
  const ang=r()*Math.PI*2,sp=40+r()*40;return {x:Math.round(best.x),y:Math.round(best.y),vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp*.7};}
const friends=m=>m.actors.filter(a=>a.side!==1);
const nearest=(m,w)=>{let best=null;for(const a of friends(m))if(alive(a)){const d=len(a.x-w.x,a.y-w.y);if(!best||d<best.d)best={a,d};}return best;};
export function stepRace(m,dt,api){const R=m.race;
  api.stepRespawns(m,dt,()=>{});
  // The current gate: each friend's presence counts for a moment after it stepped out, so nobody has to be pixel-perfect.
  if(R.at<RACE_GATES){const G=R.gates[R.at],inside=[false,false];
    [0,2].forEach((side,i)=>{const a=m.actors[side];if(alive(a)&&len(a.x-G.x,(a.y-G.y)/.8)<G.r){if(!R.ready[i])api.event(m,'gate-ready',{side,gate:R.at});R.ready[i]=true;R.lastIn[i]=m.time;inside[i]=true;}
      else if(m.time-R.lastIn[i]>RACE_TOGETHER)R.ready[i]=false;});
    // Together (each one's step out still counts for a moment) and at least one of them really inside: the gate's light fills.
    const together=m.time-R.lastIn[0]<=RACE_TOGETHER&&m.time-R.lastIn[1]<=RACE_TOGETHER;
    if(together&&(inside[0]||inside[1]))R.fill=Math.min(RACE_FILL,(R.fill||0)+dt);
    if(together&&(R.fill||0)>=RACE_FILL-1e-9){api.effect(m,'gate-open',G.x,G.y,{gate:R.at});api.event(m,'gate-open',{gate:R.at,of:RACE_GATES});
      R.at++;R.lastIn=[-9,-9];R.ready=[false,false];R.fill=0;R.openAt=m.time;if(R.at>=RACE_GATES){api.finish(m,0,'gates');return;}}}
  if(m.time>=R.rivalAt){R.rival++;R.rivalAt=m.time+racePace(m);api.event(m,'race-rival',{n:R.rival});if(R.rival>=RACE_GATES){api.finish(m,1,'gates');return;}}
  // Wisps drift inside the field; one that touches a friend slows it and drifts off to another place.
  const {WORLD}=api;
  for(const w of R.wisps){const f=nearest(m,w);if(f&&f.d<240){const q=unit(f.a.x-w.x,f.a.y-w.y);w.vx+=q.x*60*dt;w.vy+=q.y*45*dt;}const sp=len(w.vx,w.vy);if(sp>95){w.vx*=95/sp;w.vy*=95/sp;}
    w.x+=w.vx*dt;w.y+=w.vy*dt;const ox=(w.x-WORLD.cx)/WORLD.rx,oy=(w.y-WORLD.cy)/WORLD.ry,od=len(ox,oy);
    if(od>.82){const n=unit(ox/WORLD.rx,oy/WORLD.ry),dot=w.vx*n.x+w.vy*n.y;if(dot>0){w.vx-=2*dot*n.x;w.vy-=2*dot*n.y;}}
    for(const a of friends(m))if(alive(a)&&a.invincible<=0&&len(a.x-w.x,a.y-w.y)<a.radius+22){a.slow=Math.max(a.slow,WISP_SLOW);api.effect(m,'wonder-puff',w.x,w.y,{id:'wisp'});api.event(m,'wisp',{side:a.side});Object.assign(w,wispAt(m,m.raceRandom,api));break;}}
}
// The rival is held back by a super that hits it: once per super.
export function raceHit(m,a,source){const R=m.race;if(!R||a.side!==1||!source||source.side===1)return;if(R.held[source.side]===source.superSeq)return;R.held[source.side]=source.superSeq;R.rivalAt+=RACE_DELAY;}
// Two friends' supers within a moment of each other build a bridge of light between them: it clears the wisps it
// crosses, hits the rival if it stands across it, and both friends run faster for a little while.
export function raceSuper(m,a,api){const R=m.race;if(!R||a.side===1)return;
  R.superAt[a.side]=m.time;const other=a.side===0?2:0;
  if(a.side===0&&R.script&&!R.scripted){R.scripted=true;R.scriptAt=m.time+.35;}
  if(a.side===2)R.scriptAt=null;
  if(m.time-R.superAt[other]>BRIDGE_WINDOW)return;
  const p=m.actors[0],q=m.actors[2],rival=m.actors[1];R.superAt=[-9,-9,-9];R.bridged++;
  api.event(m,'bridge-super',{sides:[0,2],x1:p.x,y1:p.y,x2:q.x,y2:q.y});api.effect(m,'bridge',p.x,p.y,{from:{x:p.x,y:p.y},to:{x:q.x,y:q.y},color:'#ffd27a'});
  for(const w of R.wisps)if(segDist(p.x,p.y,q.x,q.y,w.x,w.y)<60){api.effect(m,'wonder-puff',w.x,w.y,{id:'wisp'});Object.assign(w,wispAt(m,m.raceRandom,api));}
  if(alive(rival)&&segDist(p.x,p.y,q.x,q.y,rival.x,rival.y)<rival.radius+30)api.damage(m,rival,30,p,{special:true,minor:true});
  for(const f of [p,q])if(alive(f))f.rush=RUSH;
}
// The friend at your side: walks to the gate when you come near it, otherwise stays close to you; it shoots the rival,
// and supers when it is ready and you just used yours (which makes a bridge). Its first super can be the scripted lesson.
export function allyInput(m,dt,api){const a=m.actors[2],R=m.race,p=m.actors[0],t=m.actors[1],A=m.allyAi??={timer:0,input:{}};
  if(!a||!alive(a))return {};
  A.timer-=dt;
  if(R?.scriptAt!=null&&m.time>=R.scriptAt){if(a.superCharge<1)api.fillSuper(m,a,1);return {...A.input,special:true};}
  if(A.timer>0)return {...A.input,special:false};A.timer=.22;
  const G=R&&R.at<RACE_GATES?R.gates[R.at]:null,toGate=G&&len(p.x-G.x,p.y-G.y)<260&&!(p.out>0);
  let goal=toGate?{x:G.x+(a.x<G.x?-12:12),y:G.y}:{x:p.x-60*p.facing,y:p.y+40},q=unit(goal.x-a.x,goal.y-a.y),d=len(goal.x-a.x,goal.y-a.y);
  let mx=d>(toGate?18:70)?q.x:0,my=d>(toGate?18:70)?q.y:0;
  if(!a.spec.flies)for(const c of m.covers)if(c.hp>0){const ax=a.x-c.x,ay=a.y-c.y,dist=len(ax,ay),r=c.r+a.radius+30;if(dist<r){const push=(r-dist)/30;mx+=ax/(dist||1)*push;my+=ay/(dist||1)*push;}}
  const lvl=api.LEVELS[m.level]||api.LEVELS.rookie,err=(m.raceRandom()-.5)*lvl.aimError*1.4,ang=Math.atan2(t.y-a.y,t.x-a.x)+err,dt2=len(t.x-a.x,t.y-a.y);
  const special=a.superCharge>=1&&alive(t)&&m.time-(R?.superAt[0]??-9)<=4&&dt2<(a.spec.specialRange||400)&&dt2>(a.spec.specialMin||0);
  A.input={moveX:mx,moveY:my,aimX:a.x+Math.cos(ang)*400,aimY:a.y+Math.sin(ang)*400,fire:alive(t)&&dt2<700,special:false};
  return {...A.input,special};
}
// Tzadon guards the gate the friends need next: he walks to it and holds it, fighting whoever comes.
export function raceGoal(m,a){const R=m.race;if(!R||R.at>=RACE_GATES)return null;const G=R.gates[R.at],d=len(a.x-G.x,a.y-G.y),q=unit(G.x-a.x,G.y-a.y);
  return d>110?{x:q.x*2,y:q.y*2,keep:.35}:{x:q.x*.4,y:q.y*.4,keep:.8};}
export const raceStars=m=>{const n=m.race.rival;return n<=1?3:n<=3?2:1;};
export const raceLeader=m=>{const R=m.race;return R.at===R.rival?-1:R.at>R.rival?0:1;};

// ------------------------------------------------------------------ the Rhythm Deer and the drums
// The deer's attacks come on the beat (beats 1 and 3 of every four). Between beats a gold crack opens on its chest.
export function setupRhythm(m,{seed=1,side=1}={},api){m.rhythm={side,bpm:RHYTHM_BPM[0],beat:0,phase:0,stage:1,crack:false};m.rhythmT=0;m.drumRandom??=api.stream(seed,0xd2a5);}
export const strongBeat=n=>(n-1)%4===0||(n-1)%4===2;
export function stepRhythm(m,dt,api){const R=m.rhythm,deer=m.actors[R.side],per=60/R.bpm;
  m.rhythmT+=dt;
  while(m.rhythmT>=per){m.rhythmT-=per;R.beat++;const strong=strongBeat(R.beat);api.event(m,'beat',{n:R.beat,strong,bpm:R.bpm,src:'rhythm'});
    if(m.drums?.src==='rhythm')lightDrums(m,m.drumRandom,2);
    if(strong&&alive(deer)&&!m.ending&&!m.calm&&deer.stun<=0&&!(deer.silence>0)&&!deer.dash)api.onBeat(m,deer,(R.beat-1)%4===2);}
  R.phase=+(m.rhythmT/per).toFixed(3);R.crack=alive(deer)&&R.phase>=CRACK_WINDOW[0]&&R.phase<=CRACK_WINDOW[1];
}
// Stage 2: the beat quickens and the drums light up.
export function rhythmStage2(m){const R=m.rhythm;if(!R)return;R.stage=2;R.bpm=RHYTHM_BPM[1];m.rhythmT=0;m.drums={tiles:DRUM_TILES,lit:DRUM_TILES.map(()=>0),src:'rhythm'};lightDrums(m,m.drumRandom,2);}
export function lightDrums(m,r,n){const lit=DRUM_TILES.map(()=>0),pool=DRUM_TILES.map((t,i)=>i);for(let k=0;k<n&&pool.length;k++)lit[pool.splice(Math.floor(r()*pool.length),1)[0]]=1;m.drums.lit=lit;}
export const onLitDrum=(m,a)=>!!m.drums&&DRUM_TILES.some((t,i)=>m.drums.lit[i]&&len(a.x-t.x,(a.y-t.y)/.8)<t.r);

// ------------------------------------------------------------------ the spectacle guardian
// An ink entrance inside a longer countdown (drawn from the countdown), and once, at half life, a staged beat: the
// battle holds still for both sides for a second, the stones crumble, two new ones grow, and the second stage begins.
export function setupSpectacle(m,{side=1}={}){m.spectacle={side,stage:1,beat:0};m.countdown=Math.max(m.countdown,SPECTACLE_COUNTDOWN);}
// Where the two new stones may grow: clear of the drum tiles, the farthest from both fighters first.
const NEW_COVERS=[{x:640,y:270},{x:640,y:520},{x:415,y:460},{x:865,y:330},{x:415,y:330},{x:865,y:460}];
// Called before the clock moves. True while the beat holds the battle still.
export function stepSpectacle(m,dt,api){const S=m.spectacle,g=m.actors[S.side];
  if(S.beat>0){S.beat=Math.max(0,S.beat-dt);
    if(!S.crumbled&&SPECTACLE_BEAT-S.beat>=CRUMBLE_AT){S.crumbled=true;
      for(const c of m.covers)if(c.hp>0){c.hp=0;api.effect(m,'stone',c.x,c.y,{color:'#e9c790'});api.event(m,'cover',{broken:true,x:c.x,y:c.y});}
      api.effect(m,'shock',g.x,g.y,{r:560,color:g.spec.color});}
    if(S.beat<=0){const spots=[...NEW_COVERS].sort((a,b)=>far(m,b)-far(m,a)).slice(0,2);
      for(const s of spots)m.covers.push({x:s.x,y:s.y,r:32,hp:80,maxHp:80,born:m.time});
      S.stage=2;api.event(m,'phase-beat-end',{side:S.side});api.afterBeat(m);}
    return true;}
  if(!S.done&&alive(g)&&g.hp<g.spec.hp*.5&&!m.calm&&!m.ending&&m.status==='playing'){S.done=true;S.beat=SPECTACLE_BEAT;S.crumbled=false;api.event(m,'phase-beat',{side:S.side,x:g.x,y:g.y});return true;}
  return false;
}
const far=(m,s)=>Math.min(...m.actors.map(a=>len(a.x-s.x,a.y-s.y)));
