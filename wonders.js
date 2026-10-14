// Wonder Seeds: the mended star drops a surprise into the arena, a different one each time.
// Plain data and small functions. core.js passes in what they need (api), so this file imports nothing,
// and core.js re-exports the public part: nobody else imports this file.
// The seed comes early (about 40% into a typical battle) and waits only a little, so its twelve seconds fit inside the fight.
export const WONDER_TIMES={at:[10,14],sprout:2,ready:5,active:12};
// A fighter this close to the seed takes it; unseen Wonders come first this often.
export const WONDER_REACH=40,WONDER_PREFER=.7,METEOR_EVERY=2.2,METEOR_R=50,METEOR_DELAY=1.1,METEOR_DAMAGE=10;
const rng=seed=>{let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};
const r2=v=>Math.round(v*100)/100;
// Uneven Wonders give their better side to the owner: the one who touched the seed first (-1: nobody did).
export const WONDERS=[
  {id:'ice',name:'משטח קרח',icon:'sparkle',sticker:'wonder-ice',color:'#bfeaff',affinity:{sea:2,coast:2},
    // Everyone slides; the owner keeps a firm grip for the first moments.
    apply(m,owner){m.wonderFx.ice={grip:owner>=0?{side:owner,until:m.time+4}:null};for(const a of m.actors){a.vx=(a.moveX||0)*a.spec.speed;a.vy=(a.moveY||0)*a.spec.speed;}},
    tick(){},end(m){m.wonderFx.ice=null;}},
  {id:'giant',name:'ענק וגמד',icon:'mountain',sticker:'wonder-giant',color:'#ffb786',affinity:{castle:2},
    // The owner looks huge and hits harder; the hitboxes change only a little, so owning it never means being easier to hit.
    apply(m,owner,api){for(const a of m.actors){const k=owner<0?{sz:1.4,r:1.2,d:1,s:.95}:a.side===owner?{sz:1.6,r:1.05,d:1.35,s:1}:{sz:.65,r:.95,d:.9,s:1.05};
      a.baseSpec={radius:a.spec.radius,damage:a.spec.damage,speed:a.spec.speed,r:a.radius};a.sz=k.sz;
      a.spec={...a.spec,radius:Math.round(a.spec.radius*k.r),damage:a.spec.damage*k.d,speed:a.spec.speed*k.s};a.radius=Math.round(a.radius*k.r);api.confine(a);}},
    tick(){},
    end(m,api){for(const a of m.actors){if(a.baseSpec){const b=a.baseSpec;a.spec={...a.spec,radius:b.radius,damage:b.damage,speed:b.speed};a.radius=b.r;a.baseSpec=null;api.confine(a);}a.sz=1;}}},
  // Only the picture changes: the renderer draws big heads from m.wonder.
  {id:'bigheads',name:'ראשים ענקיים',icon:'expand',sticker:'wonder-bigheads',color:'#ffd23a',affinity:{},apply(){},tick(){},end(){}},
  {id:'storm',name:'סערת על',icon:'bolt',sticker:'wonder-storm',color:'#9fb8ff',affinity:{},
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
];
export const WONDER_IDS=WONDERS.map(w=>w.id);
export const wonderById=id=>WONDERS.find(w=>w.id===id)||null;
// A meteor first marks its spot with a gold circle, then lands.
function meteor(m,x,y,api){const {cx,cy,rx,ry}=api.WORLD,d=Math.hypot((x-cx)/rx,(y-cy)/ry),k=d>.94?.94/d:1;
  m.zones.push({owner:m.wonder.owner,kind:'meteor',x:Math.round(cx+(x-cx)*k),y:Math.round(cy+(y-cy)*k),r:METEOR_R,age:0,life:METEOR_DELAY+.35,delay:METEOR_DELAY,done:false,damage:METEOR_DAMAGE*(m.superHit||1)});}

// The seed's own random stream: turning Wonders on never changes the battle's other random rolls.
export function setupWonder(m,{seed=1,prefer=[],avoid=null}={}){
  const r=rng((seed^0x5eed5)>>>0);r();const [a,b]=WONDER_TIMES.at;
  m.wonderRandom=r;m.wonderFx={};m.wonderPrefer=(Array.isArray(prefer)?prefer:[]).filter(id=>WONDER_IDS.includes(id));m.wonderAvoid=WONDER_IDS.includes(avoid)?avoid:null;
  m.wonder={state:'wait',at:r2(a+r()*(b-a)),age:0,x:null,y:null,id:null,owner:-1,chase:false,started:false};
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
function chooseWonder(m,r){
  let pool=WONDER_IDS.filter(id=>id!==m.wonderAvoid);const fresh=pool.filter(id=>m.wonderPrefer.includes(id));
  if(r()<WONDER_PREFER&&fresh.length)pool=fresh;
  const arena=m.arena||'coast',w=pool.map(id=>wonderById(id).affinity[arena]||1);let t=r()*w.reduce((s,x)=>s+x,0);
  for(let i=0;i<pool.length;i++){t-=w[i];if(t<0)return pool[i];}return pool.at(-1);
}
function start(m,owner,api){const W=m.wonder;W.state='active';W.age=0;W.owner=owner;W.started=true;m.wonderFx={};
  if(owner>=0)api.fillSuper(m,m.actors[owner],.25);
  wonderById(W.id).apply(m,owner,api);api.event(m,'wonder-start',{id:W.id,owner,x:W.x,y:W.y});}
function stop(m,api){const W=m.wonder;wonderById(W.id).end(m,api);m.wonderFx={};W.state='done';W.age=0;
  api.event(m,'wonder-end',{id:W.id,owner:W.owner,x:W.x,y:W.y});api.effect(m,'wonder-puff',W.x,W.y,{id:W.id});}
// wait → sprout (a seed grows) → ready (the first fighter to touch it owns it) → active → done.
export function stepWonder(m,dt,api){const W=m.wonder;if(!W||W.state==='done'||m.status!=='playing')return;
  if(W.state==='wait'){if(m.time<W.at||m.ending)return;const r=m.wonderRandom,p=chooseSpot(m,r,api.WORLD);
    W.x=p.x;W.y=p.y;W.id=chooseWonder(m,r);const roll=r();W.chase=!m.versus&&roll<(api.LEVELS[m.level]?.wonderChase||0);
    W.state='sprout';W.age=0;api.event(m,'wonder-sprout',{id:W.id,x:W.x,y:W.y});return;}
  W.age+=dt;
  if(W.state==='sprout'){if(W.age>=WONDER_TIMES.sprout){W.state='ready';W.age=0;api.event(m,'wonder-ready',{id:W.id,x:W.x,y:W.y});}return;}
  if(W.state==='ready'){let best=null,bd=Infinity;
    for(const a of m.actors){if(a.hp<=0||a.out>0)continue;const d=Math.hypot(a.x-W.x,a.y-W.y);if(d<a.radius+WONDER_REACH&&d<bd){bd=d;best=a;}}
    if(best||W.age>=WONDER_TIMES.ready)start(m,best?best.side:-1,api);return;}
  if(W.state==='active'){wonderById(W.id).tick(m,dt,api);if(W.age>=WONDER_TIMES.active)stop(m,api);}
}
