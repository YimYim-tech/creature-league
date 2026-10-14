// Wonder Seeds: the mended star drops a surprise into the arena, a different one each time.
// Plain data and small functions. core.js passes in what they need (api), so this file imports nothing,
// and core.js re-exports the public part: nobody else imports this file.
// The seed comes early (about 40% into a typical battle) and waits only a little, so its twelve seconds fit inside the fight.
export const WONDER_TIMES={at:[10,14],sprout:2,ready:5,active:12};
// A fighter this close to the seed takes it; unseen Wonders come first this often.
export const WONDER_REACH=40,WONDER_PREFER=.7,METEOR_EVERY=2.2,METEOR_R=50,METEOR_DELAY=1.1,METEOR_DAMAGE=10;
// The six Wonders of wave 2. The Wonder of the Day is there from WONDER_DAY_AT to the end, for nobody in particular.
export const WONDER_DAY_AT=3,FIREFLIES=10,FIREFLY_SUPER=.12,SHROOM_HP=+(globalThis.process?.env?.SHROOM_HP||14),SHROOM_REGROW=8,KERNELS=8,KERNEL_SUPER=.04,KERNEL_HOPS=3,SWAP_EVERY=4,DANCE_BPM=100,GIFT_REACH=22;
// A Wonder of the Day lasts the whole fight: there the mushrooms heal half as much and grow back slower, and the bubbles are
// less slow (with the same reach), or the fight dragged to the clock.
export const SHROOM_DAY=.5,SHROOM_DAY_REGROW=1.5,BUBBLE_SLOW=.55,BUBBLE_DAY_SLOW=.75;
const rng=seed=>{let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};
const r2=v=>Math.round(v*100)/100,len=(x,y)=>Math.hypot(x,y);
const alive=a=>a&&a.hp>0&&!(a.out>0);
// Uneven Wonders give their better side to the owner: the one who touched the seed first (-1: nobody did).
export const WONDERS=[
  {id:'ice',name:'משטח קרח',icon:'sparkle',sticker:'wonder-ice',color:'#bfeaff',affinity:{sea:2,coast:2},
    // Everyone slides; the owner keeps a firm grip for the first moments.
    apply(m,owner){m.wonderFx.ice={grip:owner>=0?{side:owner,until:m.time+4}:null};for(const a of m.actors){a.vx=(a.moveX||0)*a.spec.speed;a.vy=(a.moveY||0)*a.spec.speed;}},
    tick(){},end(m){m.wonderFx.ice=null;}},
  {id:'giant',name:'ענק וגמד',icon:'mountain',sticker:'wonder-giant',color:'#ffb786',affinity:{castle:2},
    // The owner looks huge and hits harder; the hitboxes change only a little, so owning it never means being easier to hit.
    // A computer that owns it hits only a little harder, and the child it shrinks keeps its full strength.
    apply(m,owner,api){const bot=owner>=0&&!api.isHuman(m,owner);
      for(const a of m.actors){const k=owner<0?{sz:1.4,r:1.2,d:1,s:.95}:a.side===owner?{sz:1.6,r:1.05,d:bot?1.12:1.35,s:1}:{sz:.65,r:.95,d:bot?1:.9,s:1.05};
      a.baseSpec={radius:a.spec.radius,damage:a.spec.damage,speed:a.spec.speed,r:a.radius};a.sz=k.sz;
      a.spec={...a.spec,radius:Math.round(a.spec.radius*k.r),damage:a.spec.damage*k.d,speed:a.spec.speed*k.s};a.radius=Math.round(a.radius*k.r);api.confine(a);}},
    tick(){},
    end(m,api){for(const a of m.actors){if(a.baseSpec){const b=a.baseSpec;a.spec={...a.spec,radius:b.radius,damage:b.damage,speed:b.speed};a.radius=b.r;a.baseSpec=null;api.confine(a);}a.sz=1;}}},
  // Only the picture changes: the renderer draws big heads from m.wonder.
  {id:'bigheads',name:'ראשים ענקיים',icon:'expand',sticker:'wonder-bigheads',color:'#ffd23a',affinity:{},apply(){},tick(){},end(){}},
  {id:'storm',name:'סערת על',icon:'bolt',sticker:'wonder-storm',color:'#9fb8ff',affinity:{wind:2},
    apply(m,owner,api){m.wonderFx.storm=true;if(owner>=0)api.fillSuper(m,m.actors[owner],1);},tick(){},end(m){m.wonderFx.storm=false;}},
  {id:'meteors',name:'גשם מטאורים',icon:'flame',sticker:'wonder-meteors',color:'#ff8a2a',affinity:{fire:2},
    apply(m){m.wonderFx.meteorAt=m.time+1;},
    // Every few seconds: a meteor near each fighter who is not the owner, and one somewhere on the floor.
    tick(m,dt,api){if(m.time<m.wonderFx.meteorAt)return;m.wonderFx.meteorAt=m.time+METEOR_EVERY;const W=m.wonder,r=m.wonderRandom,{cx,cy,rx,ry}=api.WORLD;
      for(const a of m.actors)if(a.side!==W.owner&&a.hp>0&&!(a.out>0)){const ang=r()*Math.PI*2,d=r()*80;meteor(m,a.x+Math.cos(ang)*d,a.y+Math.sin(ang)*d*.8,api);}
      const ang=r()*Math.PI*2,rad=Math.sqrt(r())*.85;meteor(m,cx+Math.cos(ang)*rx*rad,cy+Math.sin(ang)*ry*rad,api);},
    end(m){m.wonderFx.meteorAt=null;m.zones=m.zones.filter(z=>z.kind!=='meteor'||z.done);}},
  {id:'bouncy',name:'יריות קופצות',icon:'spiral',sticker:'wonder-bouncy',color:'#86d957',affinity:{},
    apply(m){m.wonderFx.bouncy=true;},tick(){},end(m){m.wonderFx.bouncy=false;}},
  // Night falls: light circles around the fighters, and ten fireflies drift about. Each one caught fills a little super.
  {id:'fireflies',name:'לילה של גחליליות',icon:'firefly',sticker:'wonder-fireflies',color:'#ffe98a',affinity:{echo:2},
    apply(m,owner,api){const r=m.wonderRandom;m.wonderX={flies:Array.from({length:FIREFLIES},()=>spot(m,r,api,.8,140))};for(const f of m.wonderX.flies){const ang=r()*Math.PI*2;f.vx=Math.cos(ang)*45;f.vy=Math.sin(ang)*35;}},
    tick(m,dt,api){const X=m.wonderX,r=m.wonderRandom;if(!X)return;
      for(const f of X.flies){f.vx+=(r()-.5)*90*dt;f.vy+=(r()-.5)*70*dt;const sp=len(f.vx,f.vy);if(sp>70){f.vx*=70/sp;f.vy*=70/sp;}f.x+=f.vx*dt;f.y+=f.vy*dt;keepIn(f,api.WORLD,.84);
        for(const a of m.actors)if(alive(a)&&len(a.x-f.x,a.y-f.y)<a.radius+GIFT_REACH){f.taken=true;api.fillSuper(m,a,FIREFLY_SUPER);api.effect(m,'spark-pop',f.x,f.y,{color:'#ffe98a',big:false});api.event(m,'wonder-firefly',{side:a.side,x:Math.round(f.x),y:Math.round(f.y)});break;}}
      X.flies=X.flies.filter(f=>!f.taken);},
    end(){}},
  // Three healing mushrooms, two of them on the owner's side. One that is eaten grows back a few seconds later.
  {id:'mushrooms',name:'פטריות מרפאות',icon:'mushroom',sticker:'wonder-mushrooms',color:'#ff8f8f',affinity:{wind:2},
    apply(m,owner,api){const r=m.wonderRandom,{cx}=api.WORLD,L=x=>x<cx-60,R=x=>x>cx+60,M=x=>Math.abs(x-cx)<140,halves=owner===0?[L,L,R]:owner===1?[R,R,L]:[L,R,M];
      m.wonderX={shrooms:halves.map(ok=>{const s=spot(m,r,api,.75,120,ok);return {x:s.x,y:s.y,up:1};})};m.wonderFx.regrow=[0,0,0];},
    tick(m,dt,api){const X=m.wonderX;if(!X)return;
      X.shrooms.forEach((s,i)=>{if(!s.up){if(m.time>=m.wonderFx.regrow[i])s.up=1;return;}
        const day=!!m.wonder?.endless;
        for(const a of m.actors)if(alive(a)&&a.hp<a.spec.hp&&len(a.x-s.x,a.y-s.y)<a.radius+GIFT_REACH+4){const amount=Math.min(a.spec.hp-a.hp,SHROOM_HP*(m.superHit||1)*(day?SHROOM_DAY:1));a.hp+=amount;a.stats.healed+=amount;
          api.effect(m,'heal',a.x,a.y,{amount,color:'#ff8f8f'});api.event(m,'wonder-shroom',{side:a.side,x:s.x,y:s.y,amount});s.up=0;m.wonderFx.regrow[i]=m.time+SHROOM_REGROW*(day?SHROOM_DAY_REGROW:1);break;}});},
    end(){}},
  // Every stone bursts into popcorn: kernels hop three times and wait on the floor, each one a little super. The stones grow back.
  {id:'popcorn',name:'הר געש של פופקורן',icon:'popcorn',sticker:'wonder-popcorn',color:'#fff1c4',affinity:{fire:2},
    apply(m,owner,api){const r=m.wonderRandom,kernels=[];m.wonderFx.popped=[];
      m.covers.forEach((c,i)=>{if(c.hp<=0||c.reef)return;m.wonderFx.popped.push({i,hp:c.hp});c.hp=0;api.effect(m,'stone',c.x,c.y,{color:'#fff1c4'});
        for(let k=0;k<KERNELS;k++){const ang=k*Math.PI*2/KERNELS+r()*.5,sp=90+r()*90;kernels.push({x:c.x,y:c.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp*.8,h:0,hop:0,t:0});}});
      m.wonderX={kernels};},
    tick(m,dt,api){const X=m.wonderX;if(!X)return;
      for(const k of X.kernels){if(k.hop<KERNEL_HOPS){k.t+=dt;const T=.36;k.x+=k.vx*dt;k.y+=k.vy*dt;keepIn(k,api.WORLD,.92);k.h=r2(Math.sin(Math.PI*Math.min(1,k.t/T))*(1-k.hop*.28));
          if(k.t>=T){k.t=0;k.hop++;k.vx*=.5;k.vy*=.5;k.h=0;}}
        if(k.hop<1)continue;
        for(const a of m.actors)if(alive(a)&&len(a.x-k.x,a.y-k.y)<a.radius+16){k.taken=true;api.fillSuper(m,a,KERNEL_SUPER);api.effect(m,'spark-pop',k.x,k.y,{color:'#fff1c4',big:false});api.event(m,'wonder-kernel',{side:a.side,x:Math.round(k.x),y:Math.round(k.y)});break;}}
      X.kernels=X.kernels.filter(k=>!k.taken);},
    end(m){for(const p of m.wonderFx.popped||[]){const c=m.covers[p.i];if(c&&c.hp<=0){c.hp=p.hp;c.born=m.time;}}}},
  // Every four seconds the two fighters swap places, with a puff at both spots.
  {id:'swap',name:'החלפה!',icon:'pair',sticker:'wonder-swap',color:'#c9a7ff',affinity:{mirror:2},
    apply(m){m.wonderX={swapIn:SWAP_EVERY};},
    tick(m,dt,api){const X=m.wonderX,W=m.wonder;if(!X)return;X.swapIn=Math.max(0,X.swapIn-dt);if(X.swapIn>0)return;X.swapIn=SWAP_EVERY;
      if(!W.endless&&W.age>WONDER_TIMES.active-.6)return;const [p,q]=m.actors;if(!alive(p)||!alive(q))return;
      const a={x:p.x,y:p.y},b={x:q.x,y:q.y};p.x=b.x;p.y=b.y;q.x=a.x;q.y=a.y;for(const x of [p,q]){x.vx=0;x.vy=0;api.confine(x);}
      api.effect(m,'wonder-puff',a.x,a.y,{id:'swap'});api.effect(m,'wonder-puff',b.x,b.y,{id:'swap'});api.event(m,'wonder-swap',{x0:Math.round(a.x),y0:Math.round(a.y),x1:Math.round(b.x),y1:Math.round(b.y)});},
    end(){}},
  // Slow, round bubbles instead of shots: half as fast, twice as big, and each bounces once off the edge.
  {id:'bubbles',name:'ים של בועות',icon:'bubble',sticker:'wonder-bubbles',color:'#9fe8ff',affinity:{sea:2},
    apply(m){m.wonderFx.bubbles=m.wonder?.endless?BUBBLE_DAY_SLOW:BUBBLE_SLOW;m.wonderX={};},tick(){},end(m){m.wonderFx.bubbles=false;}},
  // A dance floor: six drums light up on the beat. On a lit drum feet are quicker and the super fills twice as fast.
  {id:'dance',name:'רחבת ריקודים',icon:'drum',sticker:'wonder-dance',color:'#ff9a2e',affinity:{tracks:2},
    apply(m,owner,api){m.wonderX={};m.wonderFx.danceT=0;m.wonderFx.beat=0;m.drums={tiles:api.DRUM_TILES,lit:api.DRUM_TILES.map(()=>0),src:'dance'};api.lightDrums(m,m.wonderRandom,2);},
    tick(m,dt,api){const F=m.wonderFx,per=60/DANCE_BPM;if(!m.drums)return;F.danceT=(F.danceT||0)+dt;F.beat??=0;
      while(F.danceT>=per){F.danceT-=per;F.beat++;api.event(m,'beat',{n:F.beat,strong:(F.beat-1)%4===0||(F.beat-1)%4===2,bpm:DANCE_BPM,src:'dance'});api.lightDrums(m,m.wonderRandom,2);}},
    end(m){if(m.drums?.src==='dance')m.drums=null;}},
];
export const WONDER_IDS=WONDERS.map(w=>w.id);
export const wonderById=id=>WONDERS.find(w=>w.id===id)||null;
// A meteor first marks its spot with a gold circle, then lands.
function meteor(m,x,y,api){const {cx,cy,rx,ry}=api.WORLD,d=Math.hypot((x-cx)/rx,(y-cy)/ry),k=d>.94?.94/d:1;
  m.zones.push({owner:m.wonder.owner,kind:'meteor',x:Math.round(cx+(x-cx)*k),y:Math.round(cy+(y-cy)*k),r:METEOR_R,age:0,life:METEOR_DELAY+.35,delay:METEOR_DELAY,done:false,damage:METEOR_DAMAGE*(m.superHit||1)});}
// A free spot on the floor, inside `rad` of the oval and away from the fighters and stones (best of a few tries).
function spot(m,r,{WORLD},rad,away,ok=()=>true){let best=null;
  for(let i=0;i<20;i++){const ang=r()*Math.PI*2,q=Math.sqrt(r())*rad,x=Math.round(WORLD.cx+Math.cos(ang)*WORLD.rx*q),y=Math.round(WORLD.cy+Math.sin(ang)*WORLD.ry*q);if(!ok(x))continue;
    const near=Math.min(...m.actors.map(a=>len(a.x-x,a.y-y)),...m.covers.filter(c=>c.hp>0).map(c=>len(c.x-x,c.y-y)+40));if(!best||near>best.near)best={x,y,near};if(near>away)break;}
  return best?{x:best.x,y:best.y}:{x:WORLD.cx,y:WORLD.cy};}
function keepIn(p,{cx,cy,rx,ry},lim){const d=Math.hypot((p.x-cx)/rx,(p.y-cy)/ry);if(d>lim){p.x=cx+(p.x-cx)*lim/d;p.y=cy+(p.y-cy)*lim/d;if(p.vx!=null){p.vx*=-1;p.vy*=-1;}}}

// The seed's own random stream: turning Wonders on never changes the battle's other random rolls.
// day: the Wonder of the Day, which starts at WONDER_DAY_AT for nobody and lasts to the end (endless).
export function setupWonder(m,{seed=1,prefer=[],avoid=null,day=null}={}){
  const r=rng((seed^0x5eed5)>>>0);r();const [a,b]=WONDER_TIMES.at;
  m.wonderRandom=r;m.wonderFx={};m.wonderX=null;m.wonderPrefer=(Array.isArray(prefer)?prefer:[]).filter(id=>WONDER_IDS.includes(id));m.wonderAvoid=WONDER_IDS.includes(avoid)?avoid:null;
  if(WONDER_IDS.includes(day)){m.wonder={state:'wait',at:WONDER_DAY_AT,age:0,x:null,y:null,id:day,owner:-1,chase:false,started:false,endless:true};return;}
  m.wonder={state:'wait',at:r2(a+r()*(b-a)),age:0,x:null,y:null,id:null,owner:-1,chase:false,started:false,endless:false};
}
// A spot both sides can reach in about the same time, away from stones; a side far behind gets it a little closer.
function chooseSpot(m,r,{cx,cy,rx,ry}){
  const [p,q]=m.actors,share=a=>a.hp/a.spec.hp,gap=share(p)-share(q),behind=gap<=-.2?0:gap>=.2?1:-1,target=behind<0?.5:behind===0?.4:.6;
  let best=null,score=Infinity;
  for(let i=0;i<24;i++){const ang=r()*Math.PI*2,rad=Math.sqrt(r())*.8,x=Math.round(cx+Math.cos(ang)*rx*rad),y=Math.round(cy+Math.sin(ang)*ry*rad);
    if(m.covers.some(c=>c.hp>0&&Math.hypot(c.x-x,c.y-y)<140))continue;
    const d0=Math.hypot(p.x-x,p.y-y),d1=Math.hypot(q.x-x,q.y-y);if(d0<120||d1<120)continue;
    if(behind<0&&Math.abs(d0-d1)/Math.max(d0,d1)>=.15)continue;
    const s=Math.abs(d0/(d0+d1)-target);if(s<score){score=s;best={x,y};}}
  return best||{x:cx,y:cy};
}
// Unseen Wonders first most of the time, never the last one seen twice in a row, and some suit an arena better.
// The dance floor never comes where the Rhythm Deer already plays its own drums.
function chooseWonder(m,r){
  let pool=WONDER_IDS.filter(id=>id!==m.wonderAvoid&&!(id==='dance'&&m.rhythm));const fresh=pool.filter(id=>m.wonderPrefer.includes(id));
  if(r()<WONDER_PREFER&&fresh.length)pool=fresh;
  const arena=m.arena||'coast',w=pool.map(id=>wonderById(id).affinity[arena]||1);let t=r()*w.reduce((s,x)=>s+x,0);
  for(let i=0;i<pool.length;i++){t-=w[i];if(t<0)return pool[i];}return pool.at(-1);
}
function start(m,owner,api){const W=m.wonder;W.state='active';W.age=0;W.owner=owner;W.started=true;m.wonderFx={};m.wonderX=null;
  if(owner>=0)api.fillSuper(m,m.actors[owner],.25);
  wonderById(W.id).apply(m,owner,api);api.event(m,'wonder-start',{id:W.id,owner,x:W.x,y:W.y,endless:!!W.endless});}
function stop(m,api){const W=m.wonder;wonderById(W.id).end(m,api);m.wonderFx={};m.wonderX=null;W.state='done';W.age=0;
  api.event(m,'wonder-end',{id:W.id,owner:W.owner,x:W.x,y:W.y});api.effect(m,'wonder-puff',W.x,W.y,{id:W.id});}
// wait → sprout (a seed grows) → ready (the first fighter to touch it owns it) → active → done.
// During the final blow's slow ending a growing seed holds still: it neither ripens nor starts.
export function stepWonder(m,dt,api){const W=m.wonder;if(!W||W.state==='done'||m.status!=='playing')return;
  if(W.state==='wait'){if(m.time<W.at||m.ending)return;
    if(W.endless){W.x=api.WORLD.cx;W.y=api.WORLD.cy;start(m,-1,api);return;}
    const r=m.wonderRandom,p=chooseSpot(m,r,api.WORLD);
    W.x=p.x;W.y=p.y;W.id=chooseWonder(m,r);const roll=r();W.chase=!m.versus&&roll<(api.LEVELS[m.level]?.wonderChase||0);
    W.state='sprout';W.age=0;api.event(m,'wonder-sprout',{id:W.id,x:W.x,y:W.y});return;}
  if(m.ending&&(W.state==='sprout'||W.state==='ready'))return;
  W.age+=dt;
  if(W.state==='sprout'){if(W.age>=WONDER_TIMES.sprout){W.state='ready';W.age=0;api.event(m,'wonder-ready',{id:W.id,x:W.x,y:W.y});}return;}
  if(W.state==='ready'){let best=null,bd=Infinity;
    for(const a of m.actors){if(a.hp<=0||a.out>0)continue;const d=Math.hypot(a.x-W.x,a.y-W.y);if(d<a.radius+WONDER_REACH&&d<bd){bd=d;best=a;}}
    if(best||W.age>=WONDER_TIMES.ready)start(m,best?best.side:-1,api);return;}
  if(W.state==='active'){wonderById(W.id).tick(m,dt,api);if(!W.endless&&W.age>=WONDER_TIMES.active)stop(m,api);}
}
// What a computer rival goes for while a Wonder plays: a mushroom when it is hurt, a firefly or a kernel close by, a lit drum.
export function wonderGoal(m,a){const X=m.wonderX,id=m.wonder?.id;let best=null,bd=Infinity;const consider=(x,y,reach)=>{const d=len(x-a.x,y-a.y);if(d<reach&&d<bd){bd=d;best={x,y};}};
  if(id==='mushrooms'&&X&&a.hp<a.spec.hp*.5)for(const s of X.shrooms)if(s.up)consider(s.x,s.y,300);
  if(id==='fireflies'&&X)for(const f of X.flies)consider(f.x,f.y,200);
  if(id==='popcorn'&&X)for(const k of X.kernels)consider(k.x,k.y,170);
  if(id==='dance'&&m.drums)m.drums.tiles.forEach((t,i)=>{if(m.drums.lit[i])consider(t.x,t.y,240);});
  return best;}
