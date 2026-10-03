import {Skeleton,Animator,drawSkeleton} from './vendor/rig.js';
import {CREATURES,WORLD,clamp,skinById,GOALS,BALL_GOALS} from './core.js';
export const ARENA_URL='./art/2026-09-15__Coastal-Arena__Background__v01__FINAL.png';
// Each island of the necklace journey has its own painted arena; a missing one falls back to the coast.
export const ISLAND_ARENAS=['wind','sea','fire','mirror','castle'];
const loaded=new Map();
function loadImage(url) {return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image failed: '+url));img.src=url;});}
export async function loadArt(onProgress=()=>{}) {
  let count=0;const total=Object.keys(CREATURES).length+1,tick=()=>onProgress(++count/total);
  const entries=await Promise.all(Object.keys(CREATURES).map(async id=>{
    const [rig,clips,atlas]=await Promise.all([fetch('./art/'+id+'.rig.json').then(r=>{if(!r.ok)throw Error('rig');return r.json();}),fetch('./art/'+id+'.clips.json').then(r=>{if(!r.ok)throw Error('clips');return r.json();}),loadImage('./art/'+id+'.parts.png')]);
    atlas.atlasScale=rig.atlasScale??1;const value={rig,clips:clips.clips,atlas};loaded.set(id,value);tick();return value;
  }));
  const arena=await loadImage(ARENA_URL);tick();
  const arenas={};await Promise.all(ISLAND_ARENAS.map(async id=>{try{arenas[id]=await loadImage('./art/gen/arena-'+id+'.jpg');}catch{}}));
  const props={};await Promise.all(PROP_NAMES.map(async n=>{try{props[n]=await loadImage('./art/gen/prop-'+n+'.png');}catch{}}));
  return {arena,arenas,entries,props};
}
const PROP_KEYS=['coast','wind','sea','fire','mirror','castle'];
export const SHOT_ART={maimi:'water',havzuk:'lightning',slauz:'stone',lohatan:'fire',tehomon:'whirl',zikuk:'beam',retetoz:'wave',tzlilon:'hypno',shorshu:'leaf',windguard:'wind',seaguard:'spear',fireguard:'fireball',fireball:'fireball',galgalor:'spark'};
export const PROP_NAMES=[...PROP_KEYS.flatMap(k=>['rock-'+k,'rubble-'+k]),'pearl','feather','ember','crystal','gate-blue','gate-gold',...Object.values(SHOT_ART).filter((v,i,a)=>a.indexOf(v)===i).map(v=>'shot-'+v),'burst-star','burst-splash'];
export function createPuppet(id) {const data=loaded.get(id);const skeleton=new Skeleton(data.rig);return {...data,skeleton,animator:new Animator(skeleton,data.clips)};}
function ellipse(ctx,x,y,rx,ry,fill,stroke,width=1) {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(ctx,points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
function glow(ctx,x,y,r,color) {const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
export const facesLeft=id=>!!CREATURES[id]?.facesLeft;
export function drawPuppet(ctx,p,x,y,height,{flip=false,clip='idle',dt=0,hit=false,alpha=1,skin=null,silhouette=null,time=0}={}) {
  const look=skin&&skin!=='base'?skinById(skin):null;
  if(look||silhouette){drawTinted(ctx,p,x,y,height,{flip,clip,dt,hit,alpha,look,silhouette,time});return;}
  p.animator.play(p.animator.has(clip)?clip:'idle',{fade:.12});p.animator.update(dt);p.skeleton.update({x:p.rig.origin.x,y:p.rig.origin.y});
  const scale=height/p.rig.artworkSize.height;
  ctx.save();ctx.translate(x,y);ctx.scale(flip?-scale:scale,scale);ctx.globalAlpha=alpha;
  if(hit)ctx.filter='brightness(1.65)';drawSkeleton(ctx,p.skeleton,p.atlas);ctx.restore();
}
function drawTinted(ctx,p,x,y,height,{flip,clip,dt,hit,alpha,look,silhouette,time}) {
  const art=p.rig.artworkSize,width=height*art.width/art.height,boxW=width*1.2,boxH=height*1.15,m=ctx.getTransform(),k=Math.max(.5,Math.hypot(m.a,m.b));
  const w=Math.max(2,Math.ceil(boxW*k)),h=Math.max(2,Math.ceil(boxH*k));
  const buffer=p.buffer||(p.buffer=document.createElement('canvas'));if(buffer.width<w||buffer.height<h){buffer.width=Math.max(w,buffer.width);buffer.height=Math.max(h,buffer.height);}
  const b=buffer.getContext('2d');b.setTransform(1,0,0,1,0,0);b.clearRect(0,0,buffer.width,buffer.height);b.globalCompositeOperation='source-over';
  b.setTransform(k,0,0,k,0,0);drawPuppet(b,p,boxW/2,height*1.07,height,{flip,clip,dt,hit});b.setTransform(1,0,0,1,0,0);
  b.globalCompositeOperation='source-atop';
  if(silhouette){b.fillStyle=silhouette;b.fillRect(0,0,w,h);}
  else{b.globalAlpha=look.alpha;b.fillStyle=look.tint;b.fillRect(0,0,w,h);b.globalAlpha=1;
    if(look.id==='gold'){const g=b.createLinearGradient(0,0,w,h),o=(time*.35)%1;g.addColorStop(Math.max(0,o-.12),'#fff0');g.addColorStop(o,'#fff8');g.addColorStop(Math.min(1,o+.12),'#fff0');b.fillStyle=g;b.fillRect(0,0,w,h);}}
  b.globalCompositeOperation='source-over';
  ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(buffer,0,0,w,h,x-boxW/2,y-height*1.07,boxW,boxH);ctx.restore();
  if(look?.sparkle)for(let i=0;i<6;i++){const a=time*1.7+i*1.05,r=(.45+.15*Math.sin(time*3+i))*width;star(ctx,x+Math.cos(a)*r*.7,y-height*.5+Math.sin(a)*height*.42,3+2*Math.sin(time*6+i),'#fff3b0');}
}
function star(ctx,x,y,r,color){ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,d=i%2?r*.35:r;ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
export function drawPortrait(canvas,p,id,t,dt,{active=false,locked=false,skin=null,glowColor=null}={}) {
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),w=rect.width,h=rect.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const c=CREATURES[id],cy=h*.89;
  glow(ctx,w/2,h*.54,w*.49,(glowColor||c.color)+(active?'27':'14'));
  ellipse(ctx,w/2,cy,w*.32,13,c.color+'15',c.color+(active?'66':'22'),1);
  ellipse(ctx,w/2,cy,w*.22,7,'#00000066');
  ctx.save();ctx.translate(w/2,h*.47);ctx.rotate(t*.08);ctx.setLineDash([2,9]);ellipse(ctx,0,0,Math.min(w*.37,h*.36),Math.min(w*.37,h*.36),null,c.color+'24');ctx.restore();
  const art=p.rig.artworkSize,aspect=art.width/art.height,height=Math.min(h*.8,w*.86/aspect);
  drawPuppet(ctx,p,w/2,cy-7,height,{dt,clip:'idle',flip:facesLeft(id),skin,silhouette:locked?'#06131c':null,time:t});
  if(locked){ctx.save();ctx.font='900 '+Math.round(h*.22)+'px Heebo, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.color;ctx.shadowColor=c.color;ctx.shadowBlur=18;ctx.fillText('?',w/2,h*.5);ctx.restore();}
  for(let i=0;i<7;i++){const px=w*(.15+(i*.137)% .72),py=(h*.9-(t*14+i*32)%(h*.8));ellipse(ctx,px,py,1.5,1.5,c.color+(active?'aa':'44'));}
}
// Sideways phone: the whole play area, cropped tight. Upright phone: a close camera that follows the player.
const PHONE_WIDE=window.matchMedia('(max-height:600px) and (orientation:landscape)'),PHONE_TALL=window.matchMedia('(max-width:620px) and (orientation:portrait)');
const PLAY_VIEW={x:72,y:26,w:1136,h:668};
export class Renderer {
  constructor(canvas,art) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.art=art;this.puppets=[];this.skins=[null,null];this.clock=0;this.scale=1;this.offsetX=0;this.offsetY=0;this.shake=0;this.phone=false;this.cam=null;}
  swap(side,id,skin=null) {this.puppets[side]=createPuppet(id);this.skins[side]=skin;}
  setMatch(m,skins=[null,null]) {this.cam=null;this.puppets=m.actors.map(a=>createPuppet(a.id));this.skins=skins;}
  resize() {this.wide=PHONE_WIDE.matches||PHONE_TALL.matches;this.phone=false;this.size=this.wide?1.3:1;const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.w=rect.width;this.h=rect.height;this.dpr=dpr;
    if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
    this.scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height);this.offsetX=(rect.width-WORLD.width*this.scale)/2;this.offsetY=(rect.height-WORLD.height*this.scale)/2;
  }
  // The view: the whole play area, an optional close camera, and short cinematic push-ins.
  follow(m,dt) {
    let k,cx,cy;
    if(this.wide){const V=PLAY_VIEW;k=Math.min(this.w/V.w,this.h/V.h);cx=V.x+V.w/2;cy=V.y+V.h/2;}
    else{k=Math.min(this.w/WORLD.width,this.h/WORLD.height);cx=WORLD.width/2;cy=WORLD.height/2;}
    // Close camera (chosen in the pause menu, phones only): a little closer, and it moves only when the player nears the edge.
    if(this.wide&&this.closeCam){
      k*=1.3;const p=m.actors[0],hw=this.w/2/k,hh=this.h/2/k,px=p.x,py=p.y-40;
      if(!this.cam)this.cam={x:px,y:py};
      const dzx=hw*.3,dzy=hh*.25;let tx=this.cam.x,ty=this.cam.y;
      if(px>tx+dzx)tx=px-dzx;else if(px<tx-dzx)tx=px+dzx;if(py>ty+dzy)ty=py-dzy;else if(py<ty-dzy)ty=py+dzy;
      const t=Math.min(1,dt*3);this.cam.x+=(tx-this.cam.x)*t;this.cam.y+=(ty-this.cam.y)*t;cx=this.cam.x;cy=this.cam.y;
    }else this.cam=null;
    // A cinematic moment: ease in toward something important, hold, ease back.
    const P=this.punch;
    if(P){P.age+=dt;const u=P.age/P.dur;if(u>=1)this.punch=null;else{const e=u<.2?u/.2:u>.7?(1-u)/.3:1,s=e*e*(3-2*e);k*=1+(P.zoom-1)*s;cx+=(P.x-cx)*s*.9;cy+=(P.y-cy)*s*.9;}}
    // Never show past the edge of the arena picture.
    const hw=this.w/2/k,hh=this.h/2/k;
    cx=hw*2>=WORLD.width?WORLD.width/2:Math.max(hw,Math.min(WORLD.width-hw,cx));cy=hh*2>=WORLD.height?WORLD.height/2:Math.max(hh,Math.min(WORLD.height-hh,cy));
    this.scale=k;this.offsetX=this.w/2-cx*k;this.offsetY=this.h/2-cy*k;this.zoomed=!!(this.cam||this.punch);
  }
  cinematic(x,y,zoom=1.4,dur=1.6){if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;this.punch={x,y,zoom,dur,age:0};}
  // A small arrow at the screen edge shows where an off-screen rival is.
  drawOffscreen(m) {
    const c=this.ctx,f=m.actors[1];if(f.out>0)return;const sx=this.offsetX+f.x*this.scale,sy=this.offsetY+(f.y-40)*this.scale,pad=26;
    if(sx>pad&&sx<this.w-pad&&sy>pad&&sy<this.h-pad)return;
    const x=Math.max(pad,Math.min(this.w-pad,sx)),y=Math.max(pad+40,Math.min(this.h-pad,sy)),ang=Math.atan2(sy-y,sx-x);
    c.save();c.translate(x,y);c.rotate(ang);c.fillStyle=CREATURES[f.id].color;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(16,0);c.lineTo(-10,-13);c.lineTo(-4,0);c.lineTo(-10,13);c.closePath();c.stroke();c.fill();c.restore();
  }
  point(clientX,clientY) {const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.offsetX)/this.scale,y:(clientY-r.top-this.offsetY)/this.scale+38};}
  render(m,dt,clock) {
    this.resize();this.follow(m,dt);this.clock=clock;this.propKey=PROP_KEYS.includes(m.arena)?m.arena:'coast';this.shadowed=!!m.story&&!m.mirror;const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0b2026';c.fillRect(0,0,this.w,this.h);
    this.shake=Math.max(0,this.shake-dt*22);c.translate(this.offsetX,this.offsetY);c.scale(this.scale,this.scale);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!reduced&&this.shake>0)c.translate(Math.sin(clock*93)*this.shake,Math.cos(clock*117)*this.shake*.6);
    c.drawImage(this.art.arenas?.[m.arena]||this.art.arena,0,0,1280,720);
    // A gentle edge shade leaves the arena floor bright and readable.
    const shade=c.createLinearGradient(0,0,0,720);shade.addColorStop(0,'#102b3866');shade.addColorStop(.25,'#102b3800');shade.addColorStop(.8,'#102b3800');shade.addColorStop(1,'#102b3844');c.fillStyle=shade;c.fillRect(0,0,1280,720);
    c.save();c.globalAlpha=.5;c.setLineDash([5,12]);ellipse(c,WORLD.cx,WORLD.cy,WORLD.rx,WORLD.ry,null,'#a7f3e4',2);c.restore();
    if(m.lava)this.drawLava(m,clock);
    for(const cover of m.covers)if(cover.hp<=0)this.drawRubble(cover);
    if(m.lava)for(const e of m.lava.embers)this.drawEmber(e,clock);
    if(m.wind)for(const f of m.wind.feathers)this.drawFeather(f,clock);
    if(m.ball){this.drawGoals(m,clock);if(m.ball.carrier<0)this.drawBall(m,clock);}
    for(const z of m.zones)this.drawZone(z,clock);
    for(const a of m.actors)if(a.boss)this.drawBossPlan(a,clock);
    if(m.pickup)this.drawPickup(m.pickup,clock);
    for(const w of m.waves)this.drawWave(w,m,clock);
    for(const a of m.actors){
      ellipse(c,a.x,a.y+3,a.radius*1.45,a.radius*.48,'#182b3555');
      ellipse(c,a.x,a.y+3,a.radius*1.5,a.radius*.58,null,a.side===0?'#11bcca':'#d24f63',3);
      if(a.windup>0){const surge=a.upgrades.includes('surge'),r=surge?235:182,pct=1-a.windup/(surge?.85:.6);ellipse(c,a.x,a.y,r,r*.8,'#fc713027','#fa9858',2);ellipse(c,a.x,a.y,r*pct,r*.8*pct,'#ffbc6544');}
    }
    const things=[...m.covers.filter(c=>c.hp>0).map(c=>({y:c.y,cover:c})),...m.actors.filter(a=>!(a.out>0)).map(a=>({y:a.y,actor:a}))].sort((a,b)=>a.y-b.y);
    for(const obj of things){if(obj.cover)this.drawCover(obj.cover,m.time);else this.drawActor(obj.actor,dt,m.status);}
    const enemy=m.actors[1];if(m.status==='playing'&&enemy.fireCd<.23&&enemy.windup<=0&&(!enemy.boss||enemy.boss.phase==='guard')){c.save();c.globalAlpha=.65;c.setLineDash([5,5]);line(c,[[enemy.x,enemy.y-38],[enemy.x+Math.cos(enemy.aim)*78,enemy.y-38+Math.sin(enemy.aim)*78]],'#d53c5b',3);c.restore();}
    for(const s of m.shots)this.drawShot(s,clock);
    for(const e of m.effects)this.drawEffect(e);
    if(m.wind)for(const a of m.actors)if(!(a.out>0))this.drawCarry(a,m);
    if(m.ball&&m.ball.carrier>=0)this.drawBall(m,clock);
    if(this.cam){c.setTransform(this.dpr,0,0,this.dpr,0,0);this.drawOffscreen(m);}
    if(m.status==='countdown'){
      if(this.zoomed){const k=this.h/720*.8;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.translate(this.w/2-640*k,this.h/2-390*k);c.scale(k,k);}
      const label=m.countdown>.3?String(Math.ceil(m.countdown-.3)):'קדימה!';c.save();if(!this.zoomed){c.fillStyle='#072c3b40';c.fillRect(0,0,1280,720);}this.label(label,640,372,84,'#fff','center');this.label('קרב על הזירה',640,428,22,'#ffffff','center');c.restore();
    }
    if(m.status==='playing'&&m.time<5){this.label('אתם',m.actors[0].x,m.actors[0].y+42,18,'#08424b','center');}
  }
  label(text,x,y,size,color='#fff',align='center') {const c=this.ctx;c.font=`900 ${size}px 'Frank Ruhl Libre', Heebo, Arial`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(text,x,y);}
  drawCover(o,time) {const c=this.ctx,x=o.x,y=o.y,r=o.r;
    if(o.collapseAt!=null&&o.collapseAt-time<=2){ellipse(c,x,y,r+13,(r+13)*.7,'#ffb22d33','#ffe27c',4);this.label(String(Math.max(1,Math.ceil(o.collapseAt-time))),x,y-r-33,24,'#513009');}
    const img=this.art.props?.['rock-'+this.propKey];
    if(img){const w=r*3.1,h=w*img.height/img.width,hurt=o.hp<o.maxHp?1-o.hp/o.maxHp:0,wob=hurt>0&&o.hitAt!=null?0:0;c.save();if(hurt>.5)c.filter='brightness('+(1-hurt*.35)+')';c.drawImage(img,x-w/2+wob,y+r*.6-h,w,h);c.restore();return;}
    ellipse(c,x+5,y+6,r*1.1,r*.51,'#123c3a44');
    const top=[[-r,-r*.3],[-r*.6,-r*.83],[r*.55,-r*.8],[r,-r*.15],[r*.57,r*.45],[-r*.64,r*.42]];
    c.save();c.translate(x,y-11);c.beginPath();top.forEach(([px,py],i)=>i?c.lineTo(px,py+22):c.moveTo(px,py+22));c.closePath();c.fillStyle='#6b786e';c.fill();
    c.beginPath();top.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#e4dec0');g.addColorStop(1,'#9bb1a0');c.fillStyle=g;c.fill();c.strokeStyle='#fff5d4';c.lineWidth=2;c.stroke();
    line(c,[[-r*.5,-r*.35],[-r*.15,-r*.15],[r*.3,-r*.45]],'#829b8e',2);
    if(o.hp<o.maxHp*.75)line(c,[[0,-r*.6],[-r*.15,0],[r*.12,r*.3]],'#526c62',3);
    if(o.hp<o.maxHp*.4)line(c,[[-r*.15,0],[-r*.65,r*.12]],'#526c62',3);
    c.fillStyle='#315750';c.fillRect(-r*.7,r*.7,r*1.4,4);c.fillStyle='#abddc8';c.fillRect(-r*.7,r*.7,r*1.4*o.hp/o.maxHp,4);c.restore();
  }
  drawRubble(o){const c=this.ctx,img=this.art.props?.['rubble-'+this.propKey];if(img){const w=o.r*3.1,h=w*img.height/img.width;c.drawImage(img,o.x-w/2,o.y+o.r*.6-h,w,h);return;}for(let i=0;i<7;i++){const a=i*2.39,r=o.r*(.3+(i%3)*.3);c.save();c.translate(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r*.5);c.rotate(a);c.fillStyle=i%2?'#a8ad92':'#bdc2a4';c.fillRect(-5,-3,12,7);c.restore();}}
  drawActor(a,dt,status) {
    const c=this.ctx;let clip=a.hp<=0?'defeat':a.hit>0?'hit':a.windup>0?'telegraph':a.attack>0?'attack':Math.hypot(a.moveX,a.moveY)>.2?'run':'idle';
    if(a.hp>0&&a.boss?.phase==='windup')clip='telegraph';if(a.hp>0&&a.boss?.phase==='recover')clip='hit';
    if(status==='countdown')clip='idle';const puppet=this.puppets[a.side],f=this.size||1;
    if(f!==1){c.save();c.translate(a.x,a.y);c.scale(f,f);c.translate(-a.x,-a.y);}
    // Some drawings face left in the source art; flipping follows the drawing.
    const flip=facesLeft(a.id)?a.facing>0:a.facing<0;
    if(a.side===0&&a.hp>0&&!(a.out>0)){const ch=a.superCharge||0,full=ch>=1,rx=a.radius*1.35,ry=a.radius*.55;c.save();c.lineWidth=5;c.strokeStyle='#00000055';c.beginPath();c.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);c.stroke();c.strokeStyle=full?'#ffd23a':'#f2b134';if(full){c.shadowColor='#ffd23a';c.shadowBlur=14+6*Math.sin(this.clock*8);}c.beginPath();c.ellipse(a.x,a.y,rx,ry,0,-Math.PI/2,-Math.PI/2+Math.PI*2*ch);c.stroke();c.restore();}
    if(a.root>0)this.drawRoots(a);
    if(a.side===1&&this.shadowed&&a.hp>0)this.drawShadowAura(a);
    if(a.power>0){c.save();c.globalAlpha=.35+.08*Math.sin(this.clock*6);ellipse(c,a.x,a.y,a.radius*(1.7+a.power*.12),a.radius*.62,'#ff8a2a55','#ffb43a',3);c.restore();}
    drawPuppet(c,puppet,a.x,a.y,a.spec.height*(1+.07*(a.power||0)),{flip,clip:a.stun>0&&a.hp>0?'hit':clip,dt:status==='paused'||a.stun>0?0:dt,hit:a.hit>.05,alpha:a.invincible>0?.65:1,skin:this.skins[a.side],time:this.clock});
    if(a.hit>.06&&a.hp>0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,a.hit*5);glow(c,a.x,a.y-a.spec.height*.5,a.spec.height*.55,'#ffffffcc');c.restore();}
    if(a.stun>0&&a.hp>0)this.drawDizzy(a);
    if(a.regen){c.save();for(let i=0;i<5;i++){const k=(this.clock*.9+i/5)%1,px=a.x+Math.sin(i*2.4+this.clock*2)*a.radius*.9,py=a.y-10-k*a.spec.height*.9;c.globalAlpha=(1-k)*.9;c.fillStyle='#5dff9e';c.fillRect(px-2,py-7,4,14);c.fillRect(px-7,py-2,14,4);}c.restore();}
    if(a.guard>0){c.save();c.globalAlpha=.35;ellipse(c,a.x,a.y-a.spec.height*.45,a.radius*1.6,a.spec.height*.65,'#92e9ff33','#cffbff',3);c.restore();}
    // Near the top edge the bar stops at the screen edge, so health never leaves the screen.
    const barW=70,topWorld=-this.offsetY/this.scale+6,barY=Math.max(a.y-a.spec.height-17,a.y+(topWorld-a.y)/f);c.fillStyle='#092432bb';c.beginPath();c.roundRect(a.x-barW/2,barY,barW,7,4);c.fill();c.fillStyle=a.side===0?'#39dccc':'#fc7a7f';c.beginPath();c.roundRect(a.x-barW/2+1,barY+1,Math.max(0,(barW-2)*a.hp/a.spec.hp),5,3);c.fill();
    if(f!==1)c.restore();
  }
  // Creatures still held by the shadow trail dark smoke until they are freed.
  drawShadowAura(a){const c=this.ctx,t=this.clock,h=a.spec.height;c.save();for(let i=0;i<9;i++){const k=(t*.6+i/9)%1,ang=i*2.1+t*.7,r=a.radius*(1.1+k*1.4);c.globalAlpha=.32*(1-k);ellipse(c,a.x+Math.cos(ang)*r*.6,a.y-h*(.15+k*.8),r*.55,r*.42,i%2?'#2a1840':'#120a1f');}c.restore();}
  drawLava(m,t){const c=this.ctx,L=m.lava,s=L.scale;
    c.save();c.beginPath();c.rect(0,0,1280,720);c.ellipse(WORLD.cx,WORLD.cy,WORLD.rx*s,WORLD.ry*s,0,0,Math.PI*2);
    const g=c.createRadialGradient(WORLD.cx,WORLD.cy,WORLD.rx*s*.8,WORLD.cx,WORLD.cy,WORLD.rx*1.1);g.addColorStop(0,'#ff6a1acc');g.addColorStop(.5,'#c2300fcc');g.addColorStop(1,'#5a1206dd');
    c.fillStyle=g;c.globalAlpha=s<.995?.78:.0;c.fill('evenodd');
    if(s<.995){c.globalAlpha=.6;for(let i=0;i<26;i++){const ang=i/26*Math.PI*2+t*.15,r=1+.05*Math.sin(t*2+i);ellipse(c,WORLD.cx+Math.cos(ang)*WORLD.rx*s*r*1.06,WORLD.cy+Math.sin(ang)*WORLD.ry*s*r*1.06,10+4*Math.sin(t*3+i),5,'#ffd25a88');}}
    c.globalAlpha=1;c.setLineDash([]);c.lineWidth=5;c.strokeStyle=s<.995?'#ffcf5a':'#ffcf5a66';c.beginPath();c.ellipse(WORLD.cx,WORLD.cy,WORLD.rx*s,WORLD.ry*s,0,0,Math.PI*2);c.stroke();c.restore();
    for(const e of L.eruptions){if(e.done)continue;const p=Math.min(1,e.age/e.delay);c.save();ellipse(c,e.x,e.y,e.r,e.r*.7,'#ff3b1a'+(p>.6&&Math.sin(t*30)>0?'66':'33'),'#ffd25a',3);ellipse(c,e.x,e.y,e.r*p,e.r*.7*p,'#ff7a2c55');c.restore();}
  }
  drawEmber(e,t){const c=this.ctx,y=e.y-22+Math.sin(t*3+e.x)*4,img=this.art.props?.ember;if(img){glow(c,e.x,y,40,'#ffb43a88');ellipse(c,e.x,e.y,16,6,'#00000033');const s=58/Math.max(img.width,img.height);c.drawImage(img,e.x-img.width*s/2,y-img.height*s/2,img.width*s,img.height*s);return;}glow(c,e.x,y,34,'#ffb43a88');ellipse(c,e.x,e.y,16,6,'#00000033');c.save();c.translate(e.x,y);c.rotate(Math.PI/4+Math.sin(t*2)*.2);c.fillStyle='#ff8a2a';c.strokeStyle='#fff1a8';c.lineWidth=2;c.beginPath();c.roundRect(-9,-9,18,18,3);c.fill();c.stroke();c.restore();ellipse(c,e.x-2,y-3,3,2,'#fff6d0');}
  drawFeather(f,t){const c=this.ctx,y=f.y-26+Math.sin(t*2.5+f.x*.03)*5,img=this.art.props?.feather;if(img){ellipse(c,f.x,f.y,14,5,'#00000033');glow(c,f.x,y,30,'#bffcff66');const s=72/Math.max(img.width,img.height);c.save();c.translate(f.x,y);c.rotate(Math.sin(t*2+f.y)*.25);c.drawImage(img,-img.width*s/2,-img.height*s/2,img.width*s,img.height*s);c.restore();return;}ellipse(c,f.x,f.y,14,5,'#00000033');c.save();c.translate(f.x,y);c.rotate(-.6+Math.sin(t*2+f.y)*.25);
    glow(c,0,0,26,'#bffcff66');c.beginPath();c.moveTo(-16,0);c.quadraticCurveTo(0,-11,17,0);c.quadraticCurveTo(0,11,-16,0);c.fillStyle='#effcfc';c.fill();c.strokeStyle='#3cc7c9';c.lineWidth=2;c.stroke();line(c,[[-18,1],[16,0]],'#e0b13a',1.6);c.restore();}
  drawCarry(a,m){if(!a.feathers)return;const c=this.ctx,y=a.y-a.spec.height*(this.size||1)*(1+.07*(a.power||0))-38,hold=m.wind.holder===a.side;c.save();c.translate(a.x,y);
    c.fillStyle=hold?'#ffcf3a':'#f3e6c8';c.strokeStyle='#2a1d11';c.lineWidth=2;c.beginPath();c.roundRect(-26,-13,52,26,13);c.fill();c.stroke();
    c.save();c.translate(-12,0);c.rotate(-.6);c.beginPath();c.moveTo(-8,0);c.quadraticCurveTo(0,-6,9,0);c.quadraticCurveTo(0,6,-8,0);c.fillStyle='#3cc7c9';c.fill();c.restore();
    c.restore();this.label(String(a.feathers),a.x+9,y+1,18,'#2a1d11','center');}
  // Tide gates: the left one is yours to defend, the right one is where you score.
  drawGoals(m,t){const c=this.ctx;
    for(let g=0;g<2;g++){const G=GOALS[g],dir=g===0?-1:1,col=g===0?'#59c9ff':'#ffcf5a',top=G.y-G.half,bot=G.y+G.half,H=78;
      c.save();c.globalAlpha=.22+.06*Math.sin(t*3);ellipse(c,G.x,G.y,110,G.half+34,col);c.restore();
      const gate=this.art.props?.[g===0?'gate-blue':'gate-gold'];
      if(gate){const h=G.half*2+H+30,w=h*gate.width/gate.height;c.save();c.translate(G.x,0);if(g===1)c.scale(-1,1);c.drawImage(gate,-w/2,bot+14-h,w,h);c.restore();if(m.time<8||m.status==='countdown')this.label(g===0?'השער שלכם':'שער היריב',G.x-dir*70,top-H-26,22,g===0?'#0d4f78':'#7a4a00','center');continue;}
      // Water curtain and net between the posts.
      c.save();c.beginPath();c.moveTo(G.x,top-H);c.lineTo(G.x,bot-H);c.lineTo(G.x,bot);c.lineTo(G.x,top);c.closePath();
      c.beginPath();c.moveTo(G.x,top);c.lineTo(G.x+dir*34,top-12);c.lineTo(G.x+dir*34,bot-12);c.lineTo(G.x,bot);c.closePath();c.fillStyle=col+'55';c.fill();
      c.beginPath();c.rect(G.x-6,top-H,12,bot-top);c.fillStyle=col+'66';c.fill();
      c.strokeStyle='#ffffffaa';c.lineWidth=1.5;for(let i=0;i<=6;i++){const y=top+(bot-top)*i/6;c.beginPath();c.moveTo(G.x,y-H*(1-i/6)*0);c.lineTo(G.x+dir*34,y-12);c.stroke();}
      for(let i=0;i<4;i++){const y0=top-H+((t*50+i*36)%(bot-top+H*0));c.strokeStyle='#ffffffcc';c.lineWidth=2;c.beginPath();c.moveTo(G.x-7,y0);c.quadraticCurveTo(G.x,y0-5,G.x+7,y0);c.stroke();}
      c.restore();
      // Posts and crossbar.
      for(const py of [top,bot]){ellipse(c,G.x,py+4,16,6,'#00000055');c.fillStyle='#efe2c4';c.strokeStyle='#4a2f14';c.lineWidth=3;c.beginPath();c.roundRect(G.x-9,py-H,18,H+4,6);c.fill();c.stroke();}
      c.lineWidth=10;c.strokeStyle='#4a2f14';c.beginPath();c.moveTo(G.x,top-H);c.lineTo(G.x,bot-H);c.stroke();c.lineWidth=6;c.strokeStyle='#efe2c4';c.stroke();
      for(const py of [top,bot]){glow(c,G.x,py-H-4,22,col+'aa');ellipse(c,G.x,py-H-4,9,9,col,'#4a2f14',2);}
      const name=g===0?'השער שלכם':'שער היריב',show=m.time<8||m.status==='countdown';
      if(show)this.label(name,G.x-dir*70,top-H-26,22,g===0?'#0d4f78':'#7a4a00','center');
    }
    if(m.ball.carrier===0&&m.time>=8){const G=GOALS[1],a=.6+.4*Math.sin(t*6);c.save();c.globalAlpha=a;this.label('תבקיעו כאן!',G.x-80,G.y-G.half-104,26,'#7a4a00','center');c.restore();}
  }
  drawBall(m,t){const c=this.ctx,B=m.ball,free=B.carrier<0,carrier=free?null:m.actors[B.carrier],lift=free?16+Math.sin(t*4)*3:(carrier.spec.height*(this.size||1)*.45);
    const x=B.x,y=B.y;if(free){ellipse(c,x,y,16,6,'#00000044');c.save();c.globalAlpha=.45+.25*Math.sin(t*5);ellipse(c,x,y,30+6*Math.sin(t*5),11,null,'#bffcff',3);c.restore();}
    const g=c.createRadialGradient(x-5,y-lift-6,2,x,y-lift,17);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#f7dcea');g.addColorStop(1,'#a58ccf');
    const pearl=this.art.props?.pearl;if(pearl){glow(c,x,y-lift,34,'#e8f6ff88');const s=66/Math.max(pearl.width,pearl.height);c.drawImage(pearl,x-pearl.width*s/2,y-lift-pearl.height*s/2,pearl.width*s,pearl.height*s);}else{glow(c,x,y-lift,30,'#e8f6ff88');c.fillStyle=g;c.strokeStyle='#3a2a4a';c.lineWidth=2;c.beginPath();c.arc(x,y-lift,18,0,Math.PI*2);c.fill();c.stroke();ellipse(c,x-5,y-lift-6,4,2.5,'#ffffff');}
    if(carrier){const hy=carrier.y-carrier.spec.height*(this.size||1)*(1+.07*(carrier.power||0))-34;for(let i=0;i<3;i++)ellipse(c,carrier.x-18+i*18,hy,6.5,6.5,i<B.hits?'#e8432c':'#f3e6c8','#2a1d11',2);}
  }
  drawDizzy(a){const c=this.ctx,y=a.y-a.spec.height-30,t=this.clock;c.save();c.globalAlpha=.9;ellipse(c,a.x,y,34,11,null,'#c9a7ff',3);
    for(let i=0;i<3;i++){const ang=t*5+i*2.09;star(c,a.x+Math.cos(ang)*34,y+Math.sin(ang)*11,7,i?'#ffe57a':'#ffffff');}this.label('מהופנט!',a.x,y-24,17,'#5b2ea6');c.restore();}
  drawRoots(a){const c=this.ctx;c.save();for(let i=0;i<7;i++){const ang=i*.9+.3,len=a.radius*1.6;line(c,[[a.x+Math.cos(ang)*a.radius*1.4,a.y+Math.sin(ang)*a.radius*.6+6],[a.x+Math.cos(ang)*a.radius*.4,a.y-len*.5],[a.x+Math.cos(ang+1)*a.radius*.25,a.y-len]],i%2?'#5c8c2c':'#8fcf55',6);}c.restore();}
  drawShot(s,t) {const c=this.ctx,x=s.x,y=s.y-38;ellipse(c,s.x,s.y+1,s.r,s.r*.3,'#12393233');
    const a=Math.atan2(s.vy,s.vx);c.save();c.translate(x,y);c.rotate(a);
    {const tl=Math.min(70,Math.hypot(s.vx,s.vy)*.08),col=s.owner===1?'#ff6b8a':s.color||'#ffffff',g=c.createLinearGradient(-tl,0,0,0);g.addColorStop(0,col+'00');g.addColorStop(1,col+'cc');c.save();c.globalCompositeOperation='lighter';c.strokeStyle=g;c.lineCap='round';c.lineWidth=(s.r||8)*1.6;c.beginPath();c.moveTo(-tl,0);c.lineTo(0,0);c.stroke();c.restore();}
    c.scale(1.5,1.5);glow(c,0,0,s.owner===1?30:26,s.owner===1?'#ed385e88':s.color+'88');
    {const img=this.art.props?.['shot-'+SHOT_ART[s.kind]];if(img){const L=Math.max(26,(s.r||8)*4.6),H=L*img.height/img.width;if(s.kind==='slauz'||s.kind==='shorshu')c.rotate(t*6);c.drawImage(img,-L*.62,-H/2,L,H);c.restore();return;}}
    if(s.kind==='havzuk'){line(c,[[-20,0],[-7,-4],[-9,4],[8,0]],'#fff6b3',4);line(c,[[-25,0],[-14,2],[-11,-3],[5,0]],s.color,2);}
    else if(s.kind==='slauz'){c.rotate(t*8);c.beginPath();for(let i=0;i<6;i++){const ang=i*Math.PI/3;const x=Math.cos(ang)*10,y=Math.sin(ang)*8;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle='#bea37a';c.fill();c.strokeStyle='#fff4d1';c.lineWidth=2;c.stroke();}
    else if(s.kind==='fireball'){c.rotate(-a);glow(c,0,0,48,'#ff8a2a99');for(let i=0;i<6;i++){const ang=t*9+i;ellipse(c,Math.cos(ang)*9,Math.sin(ang)*7,9,9,i%2?'#ffb43a':'#ff5a1f');}ellipse(c,0,0,11,11,'#fff1a8');}
    else if(s.kind==='lohatan'){ellipse(c,-9,0,20,8,'#ff6a2a66');ellipse(c,0,0,11,10,'#ff7a2c','#ffe08a',2);ellipse(c,3,-3,4,3,'#fff3c4');}
    else if(s.kind==='tehomon'){ellipse(c,-6,0,17,8,'#3060ff55');ellipse(c,0,0,10,10,'#2448c9','#a9c4ff',2);ellipse(c,3,-4,3,2,'#ffffff');}
    else if(s.kind==='zikuk'){line(c,[[-34,0],[10,0]],'#ffe9a0',6);line(c,[[-26,0],[12,0]],'#ffffff',2);}
    else if(s.kind==='retetoz'){for(let i=0;i<3;i++){c.beginPath();c.arc(-i*7,0,6+i*3,-1,1);c.strokeStyle=i?'#e0a96d':'#fff1d6';c.lineWidth=3;c.stroke();}}
    else if(s.kind==='tzlilon'){ellipse(c,0,0,9,9,'#9b6bff','#f0e2ff',2);c.rotate(t*10);line(c,[[0,0],[4,-1],[5,3],[1,5],[-3,3]],'#ffffff',1.5);}
    else if(s.kind==='shorshu'){c.rotate(t*6);c.beginPath();c.ellipse(0,0,9,5,0,0,Math.PI*2);c.fillStyle='#7fd34e';c.fill();c.strokeStyle='#e5ffc9';c.lineWidth=2;c.stroke();line(c,[[-9,0],[9,0]],'#3f7d22',1.5);}
    else if(s.kind==='windguard'){c.rotate(Math.sin(t*12)*.3);c.beginPath();c.ellipse(0,0,14,5,0,0,Math.PI*2);c.fillStyle='#e9fbfb';c.fill();c.strokeStyle='#3cc7c9';c.lineWidth=2;c.stroke();line(c,[[-14,0],[14,0]],'#e0b13a',1.5);}
    else if(s.kind==='seaguard'){ellipse(c,0,0,12,12,'#2f8fd6aa','#d6f1ff',2);ellipse(c,4,-4,4,3,'#ffffff');}
    else if(s.kind==='fireguard'){ellipse(c,-8,0,18,8,'#ff8a2a66');ellipse(c,0,0,10,9,'#ff8a2a','#ffe08a',2);}
    else if(s.kind==='galgalor'){c.rotate(t*7);c.beginPath();c.moveTo(0,-9);c.lineTo(7,0);c.lineTo(0,9);c.lineTo(-7,0);c.closePath();c.fillStyle='#c9f7ff';c.fill();c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();}
    else{ellipse(c,-6,0,17,7,'#2cbfdf77');ellipse(c,0,0,9,9,'#25b5ed','#bdfaff',2);ellipse(c,2,-3,3,2,'#ffffff');}c.restore();
  }
  drawWave(w,m,t) {const c=this.ctx,color=w.owner>=0?CREATURES[m.actors[w.owner].id].color:'#ff7a2c',pct=w.age/w.life;c.save();c.globalAlpha=1-pct;
    if(w.kind==='beam'){c.translate(w.x,w.y-40);c.rotate(w.angle);c.shadowColor='#ffd54a';c.shadowBlur=30;c.fillStyle='#ffe58a';c.fillRect(0,-w.r,1100,w.r*2);c.fillStyle='#ffffff';c.fillRect(0,-w.r*.4,1100,w.r*.8);}
    else if(w.kind==='mind'){const r=w.r*Math.min(1,w.age/.3);for(let i=0;i<3;i++){const q=r*(1-i*.22);ellipse(c,w.x,w.y-20,q,q*.75,i===0?'#a77bff22':null,i===1?'#ffffff':'#b88cff',4-i);}
      for(let i=0;i<6;i++){const ang=t*3+i*1.05;star(c,w.x+Math.cos(ang)*r*.8,w.y-20+Math.sin(ang)*r*.6,6,'#f3e8ff');}}
    else if(w.kind==='blast'){const r=w.r*Math.min(1,w.age/.18);glow(c,w.x,w.y-10,r*1.2,'#ff8a2a88');ellipse(c,w.x,w.y,r,r*.8,'#ff5a1f33','#ffb43a',6);ellipse(c,w.x,w.y,r*.6,r*.48,null,'#fff1a8',3);}
    else if(w.kind==='wave'){c.translate(w.x,w.y-27);c.rotate(w.angle);c.shadowColor=color;c.shadowBlur=20;for(let i=0;i<3;i++){c.beginPath();c.ellipse(-i*14,0,31,w.r,0,-Math.PI/2,Math.PI/2);c.lineWidth=15-i*4;c.strokeStyle=i===0?'#c1ffff':color;c.stroke();}}
    else{const r=w.r*Math.min(1,w.age/.22);ellipse(c,w.x,w.y,r,r*.8,color+'18',color,5);ellipse(c,w.x,w.y,r*.7,r*.56,null,'#fff8d2',2);
      if(w.kind==='electric')for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.5;line(c,[[w.x,w.y-25],[w.x+Math.cos(a)*r*.6+9,w.y+Math.sin(a)*r*.45-20],[w.x+Math.cos(a)*r,w.y+Math.sin(a)*r*.8-12]],'#fff4aa',3);}}
    c.restore();
  }
  drawZone(z,t){
    const c=this.ctx,color={water:'#36c9ed',fire:'#ff7a2c',vortex:'#4f86ff',roots:'#86d957'}[z.kind]||'#ffe56d';c.save();c.globalAlpha=Math.min(1,(z.life-z.age)*2);
    if(z.kind==='roots'){if(!z.done){const pct=Math.min(1,z.age/z.delay);ellipse(c,z.x,z.y,z.r,z.r*.8,'#86d95722','#c8ff9a',2);ellipse(c,z.x,z.y,z.r*pct,z.r*.8*pct,'#86d95744');}
      else{for(let i=0;i<9;i++){const ang=i*.7,rr=z.r*(.3+(i%3)*.25),grow=Math.min(1,(z.age-z.delay)/.2);line(c,[[z.x+Math.cos(ang)*rr,z.y+Math.sin(ang)*rr*.7],[z.x+Math.cos(ang)*rr*.8,z.y+Math.sin(ang)*rr*.6-28*grow],[z.x+Math.cos(ang+.5)*rr*.6,z.y+Math.sin(ang)*rr*.5-52*grow]],i%2?'#4f8a25':'#8fcf55',7);}}
      c.restore();return;}
    if(z.kind==='vortex'){ellipse(c,z.x,z.y,z.r,z.r*.8,'#1d3fae55','#7fa6ff',3);for(let i=0;i<4;i++){c.beginPath();for(let k=0;k<=24;k++){const q=k/24,ang=-t*4+i*Math.PI/2+q*4.5,rr=z.r*(1-q);c.lineTo(z.x+Math.cos(ang)*rr,z.y+Math.sin(ang)*rr*.8);}c.strokeStyle=i%2?'#bcd2ff':'#4f86ff';c.lineWidth=4;c.stroke();}c.restore();return;}
    ellipse(c,z.x,z.y,z.r,z.r*.8,color+'38',color+'aa',2);
    if(z.kind==='water'){for(let i=0;i<3;i++)ellipse(c,z.x,z.y,z.r*(.25+i*.25),z.r*(.2+i*.2),null,'#d4ffff77',2);}
    else if(z.kind==='fire'){for(let i=0;i<7;i++){const ang=i*.9,rr=z.r*(.2+(i%3)*.28),fx=z.x+Math.cos(ang)*rr,fy=z.y+Math.sin(ang)*rr*.75,hgt=14+8*Math.sin(t*12+i);c.beginPath();c.moveTo(fx-7,fy);c.quadraticCurveTo(fx,fy-hgt*2,fx+7,fy);c.closePath();c.fillStyle=i%2?'#ffb43a':'#ff5a1f';c.fill();}}
    else for(let i=0;i<4;i++){const angle=t*2+i*Math.PI/2;line(c,[[z.x,z.y],[z.x+Math.cos(angle)*z.r*.4+8,z.y+Math.sin(angle)*z.r*.35],[z.x+Math.cos(angle)*z.r*.8,z.y+Math.sin(angle)*z.r*.6]],'#fff6ad',3);}
    c.restore();
  }
  drawBossPlan(a,t){
    const c=this.ctx,b=a.boss;c.save();
    if(b.phase==='windup'){
      c.beginPath();c.ellipse(WORLD.cx,WORLD.cy,WORLD.rx,WORLD.ry,0,0,Math.PI*2);c.clip();
      const ex=a.x+Math.cos(b.angle)*418,ey=a.y+Math.sin(b.angle)*334;
      line(c,[[a.x,a.y],[ex,ey]],'#ed542e44',100);c.setLineDash([13,9]);line(c,[[a.x,a.y],[ex,ey]],'#e94729',4);c.setLineDash([]);
      ellipse(c,ex,ey,40,30,'#f05b3f44','#ffd2a6',3);
    }
    if(['guard','windup'].includes(b.phase)){
      c.translate(a.x,a.y);c.scale(1,.8);c.beginPath();c.arc(0,0,60,b.angle-1.05,b.angle+1.05);c.lineWidth=10;c.strokeStyle='#ffda85';c.stroke();c.lineWidth=3;c.strokeStyle='#fff6db';c.stroke();
    }
    if(b.phase==='recover'){
      ellipse(c,a.x,a.y,62,43,'#66ffd538','#95ffe2',4);this.label('עכשיו!',a.x,a.y-a.spec.height-38,22,'#087050');
    }c.restore();
  }
  drawPickup(p,t) {const c=this.ctx,y=p.y-17+Math.sin(t*3)*4,img=this.art.props?.crystal;if(img){glow(c,p.x,y,54,'#6ff1ad66');ellipse(c,p.x,p.y,24,10,'#00000033');const s=58/Math.max(img.width,img.height);c.drawImage(img,p.x-img.width*s/2,y-img.height*s/2,img.width*s,img.height*s);return;}glow(c,p.x,p.y,50,'#6ff1ad66');ellipse(c,p.x,p.y,28,13,'#76e8be44','#c9ffe4',2);c.save();c.translate(p.x,y);c.rotate(Math.PI/4);c.fillStyle='#5bd5a1';c.strokeStyle='#e7fff5';c.lineWidth=2;c.beginPath();c.roundRect(-12,-12,24,24,4);c.fill();c.stroke();c.restore();line(c,[[p.x-7,y],[p.x+7,y]],'#fff',4);line(c,[[p.x,y-7],[p.x,y+7]],'#fff',4);}
  drawEffect(e) {const c=this.ctx,p=e.age;c.save();c.globalAlpha=Math.max(0,1-p*1.4);
    if(e.type==='hit'||e.type==='stone'){const hy=e.y-44;{const b=this.art.props?.['burst-star'];if(b&&p<.45){const q=p/.45,sz=40+q*70;c.save();c.globalAlpha=1-q;c.translate(e.x,hy);c.rotate(q*.6);c.drawImage(b,-sz/2,-sz/2,sz,sz);c.restore();}}c.save();c.globalCompositeOperation='lighter';if(p<.25)glow(c,e.x,hy,46*(1-p*2),'#ffffffdd');c.strokeStyle=e.color||'#fff';c.lineWidth=5*(1-p);c.beginPath();c.ellipse(e.x,hy,12+p*70,(12+p*70)*.7,0,0,Math.PI*2);c.stroke();
      for(let i=0;i<10;i++){const a=i*.628+.3,r1=10+p*40,r2=r1+18*(1-p);c.strokeStyle=i%2?'#ffffff':(e.color||'#ffe08a');c.lineWidth=3.5*(1-p);c.beginPath();c.moveTo(e.x+Math.cos(a)*r1,hy+Math.sin(a)*r1*.7);c.lineTo(e.x+Math.cos(a)*r2,hy+Math.sin(a)*r2*.7);c.stroke();}c.restore();
      for(let i=0;i<8;i++){const a=i*2.4,r=8+p*85;ellipse(c,e.x+Math.cos(a)*r,e.y-34+Math.sin(a)*r*.6,4*(1-p),4*(1-p),e.color);}if(e.amount)this.label('−'+e.amount,e.x,e.y-105-p*44,23,'#793f32');}
    if(e.type==='heal')this.label('+'+Math.round(e.amount),e.x,e.y-110-p*40,25,'#0b8761');
    if(e.type==='evade')this.label('חמיקה!',e.x,e.y-110-p*35,18,'#176b92');
    if(e.type==='guard-block')this.label('מגן',e.x+22,e.y-83-p*30,16,'#8e5b14');
    if(e.type==='weak-hit')ellipse(c,e.x,e.y-45,25+p*35,25+p*35,null,'#7effd9',3);
    if(e.type==='ember'){for(let i=0;i<10;i++){const ang=i*.63,r=10+p*70;ellipse(c,e.x+Math.cos(ang)*r,e.y-50+Math.sin(ang)*r*.6,4*(1-p),4*(1-p),'#ffb43a');}this.label('+כוח',e.x,e.y-130-p*30,22,'#8a2c0a');}
    if(e.type==='burn')ellipse(c,e.x,e.y-20-p*30,6*(1-p),6*(1-p),'#ff7a2c');
    if(e.type==='blown'){for(let i=0;i<12;i++){const ang=i*.52,r=p*120;ellipse(c,e.x+Math.cos(ang)*r,e.y-50+Math.sin(ang)*r*.6,7*(1-p),3*(1-p),'#cfffff');}this.label('נוצות עפו!',e.x,e.y-110-p*30,22,'#16626a');}
    if(e.type==='goal'){for(let i=0;i<18;i++){const ang=i*.35,r=20+p*190;ellipse(c,e.x+Math.cos(ang)*r*.6,e.y-40+Math.sin(ang)*r,8*(1-p),8*(1-p),i%2?'#ffe08a':'#ffffff');}this.label('גול!',e.x+(e.x<640?90:-90),e.y-90-p*40,72,'#ffd23a');}
    if(e.type==='steal')this.label('נחטף!',e.x,e.y-120-p*40,30,'#ffffff');
    if(e.type==='swap'){ellipse(c,e.x,e.y,40+p*120,(40+p*120)*.4,null,e.color||'#fff',5);}
    if(e.type==='big-kick'){ellipse(c,e.x,e.y,30+p*90,(30+p*90)*.4,null,e.color||'#fff',4);}
    if(e.type==='dizzy')this.label('מהופנט!',e.x,e.y-125-p*30,22,'#6b3fbf');
    if(e.type==='rooted')this.label('נתפס!',e.x,e.y-120-p*30,22,'#2f6a1c');
    if(e.type==='burrow'){for(let i=0;i<6;i++){const q=i/5;ellipse(c,e.from.x+(e.x-e.from.x)*q,e.from.y+(e.y-e.from.y)*q,16*(1-p),7*(1-p),'#8a5a2c99');}ellipse(c,e.x,e.y,40+p*40,16+p*16,null,'#e0a96d',4);}
    if(e.type==='blink'||e.type==='dash'){for(let i=1;i<=5;i++){const t=i/5;ellipse(c,e.from.x+(e.x-e.from.x)*t,e.from.y+(e.y-e.from.y)*t-30,12*(1-p),22*(1-p),e.color+'77');}}
    c.restore();
  }
}
