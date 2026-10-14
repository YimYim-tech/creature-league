import {Skeleton,Animator,drawSkeleton} from './vendor/rig.js';
import {CREATURES,WORLD,clamp,skinById,GOALS,BALL_GOALS,HIDE_LISTEN} from './core.js';
import * as core from './core.js';
import * as rig from './vendor/rig.js';
export const ARENA_URL='./art/2026-09-15__Coastal-Arena__Background__v01__FINAL.png';
// Each island of the necklace journey has its own painted arena; a missing one falls back to the coast.
export const ISLAND_ARENAS=['wind','sea','fire','mirror','castle','echo'];
// A world whose arena is not painted yet borrows one that fits.
const ARENA_STAND_IN={tracks:'wind'};
// Rocks for a world without its own set: the stone canyon gets carved castle blocks, the meadow the wind runestones.
const PROP_STAND_IN={echo:'castle',tracks:'wind'};
// Painted effect sprites (art/gen/fx-<name>.png). Only names in this list are ever requested, so a missing file never costs a 404.
export const FX_NAMES=['aura','banner','blossom-1','blossom-2','blossom-3','blossom-4','chip-1','chip-2','chip-3','cocoon','crack-1','crack-2','crown','crown-frame','dab',
  'flake-1','flake-2','flake-3','flake-4','flake-5','flake-6','fleck-1','fleck-2','fleck-3','fleck-4','inkstar','petal-1','petal-2','petal-3','pip','puff',
  'seed-1','seed-2','seed-3','seed-rainbow','splat-water','splat-spark','splat-stone','splat-fire','splat-light','splat-nature','splat-sound','splat-wind','stamp',
  'stroke-1','stroke-2','stroke-3','stroke-4','wonder-ice','wonder-giant','wonder-bigheads','wonder-storm','wonder-meteors','wonder-bouncy'];
// Names still being painted. They are never loaded until the file arrives and the name moves up into FX_NAMES.
export const FX_LATER=[];
const loaded=new Map();
let FX={},FIT={};
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
  let fit={};try{const r=await fetch('./art/attach-fit.json');if(r.ok)fit=await r.json();}catch{}
  // The painted effects fill in behind the first screen; every draw has a fallback until they arrive.
  const fx={};FX=fx;FIT=fit;for(const n of FX_NAMES)loadImage('./art/gen/fx-'+n+'.png').then(img=>{fx[n]=img;},()=>{});
  const art={arena,arenas,entries,props,fx,fit};
  if(/[?&]attach\b/.test(globalThis.location?.search||''))setTimeout(()=>openAttachDebug(art),0);
  return art;
}
const PROP_KEYS=['coast','wind','sea','fire','mirror','castle'];
export const SHOT_ART={zoharon:'beam',kokhavit:'spark',maimi:'water',havzuk:'lightning',slauz:'stone',lohatan:'fire',tehomon:'whirl',zikuk:'beam',retetoz:'wave',tzlilon:'hypno',shorshu:'leaf',windguard:'wind',seaguard:'spear',fireguard:'fireball',fireball:'fireball',galgalor:'spark',chutal:'water',hedanon:'wave',tlaor:'spark',thread:'beam',ozenav:'wave',rishrush:'spark',bell:'spark',kashevet:'wind',zankor:'lightning'};
export const PROP_NAMES=[...PROP_KEYS.flatMap(k=>['rock-'+k,'rubble-'+k]),'pearl','feather','ember','crystal','gate-blue','gate-gold',...Object.values(SHOT_ART).filter((v,i,a)=>a.indexOf(v)===i).map(v=>'shot-'+v),'burst-star'];
export function createPuppet(id) {const data=loaded.get(id);const skeleton=new Skeleton(data.rig);return {...data,skeleton,animator:new Animator(skeleton,data.clips)};}
const TAU=Math.PI*2,INK='#1d2a5a',CREAM='#fff4dc';
const ease=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function rnd(seed){let s=(seed>>>0)||1;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const seedOf=(x,y)=>(Math.round(x*13)*7919+Math.round(y*7)*104729)>>>0;
// Splat and sound families. Sim owns the table; this copy only fills in when an older core runs.
const FAMILY_OF={'מים':'water','חשמל':'spark','אנרגיה':'spark','עוצמה':'stone','רעד':'stone','אש':'fire','אור':'light','כוכב':'light','טבע':'nature','קול':'sound','היפנוט':'sound','רוח':'wind','מהירות':'wind'};
export const famOf=id=>core.familyOf?.(id)||FAMILY_OF[CREATURES[id]?.element]||'stone';
const FAM_COLOR={water:'#36c9ed',spark:'#ffe06b',stone:'#b8946a',fire:'#ff7a2c',light:'#ffd23a',nature:'#86d957',sound:'#b88cff',wind:'#bdf3ee'};
// The child's own side wears teal wherever they sit (the online guest is side 1); a co-op friend is gold; rivals are red.
export const sideColor=(side,local=0)=>side===local?'#11bcca':side===2?'#f2c14e':'#d24f63';
const barColor=(side,local=0)=>side===local?'#39dccc':side===2?'#f2c14e':'#fc7a7f';
export const anchorBone=p=>p.skeleton.byName.has('head')?'head':'body';
function ellipse(ctx,x,y,rx,ry,fill,stroke,width=1) {ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(ctx,points,color,width=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
function glow(ctx,x,y,r,color) {const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
// A cream sprite takes a colour by multiplying it in; the copy is cached per colour. Strokes, petals, dabs and the banner use it.
const tints=new Map();
function tint(img,color,alpha=1){if(!img)return null;const k=(img.src||img.width+'x'+img.height)+'|'+color+'|'+alpha;let t=tints.get(k);if(t)return t;if(tints.size>240)tints.clear();
  t=document.createElement('canvas');t.width=img.width;t.height=img.height;const g=t.getContext('2d');g.drawImage(img,0,0);g.globalAlpha=alpha;g.globalCompositeOperation='multiply';g.fillStyle=color;g.fillRect(0,0,t.width,t.height);
  g.globalAlpha=1;g.globalCompositeOperation='destination-in';g.drawImage(img,0,0);g.globalCompositeOperation='source-over';tints.set(k,t);return t;}
function sprite(c,img,x,y,w,rot=0,alpha=1,ay=.5){if(!img||!img.width)return false;const h=w*img.height/img.width;c.save();c.translate(x,y);if(rot)c.rotate(rot);c.globalAlpha*=alpha;c.drawImage(img,-w/2,-h*ay,w,h);c.restore();return true;}
// Chunky outlined text: readable on grass, sand and lava alike.
const LTR=t=>!/[֐-׿]/.test(t);
function inkText(c,text,x,y,size,fill,edge=INK,width=5){c.font=`900 ${size}px 'Frank Ruhl Libre', Heebo, Arial`;c.direction=LTR(text)?'ltr':'inherit';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=width;c.strokeStyle=edge;c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);}
const lum=h=>{if(typeof h!=='string'||h[0]!=='#')return 1;if(h.length<7)h='#'+[...h.slice(1,4)].map(x=>x+x).join('');const v=parseInt(h.slice(1,7),16);return ((v>>16)*.299+((v>>8)&255)*.587+(v&255)*.114)/255;};
export const facesLeft=id=>!!CREATURES[id]?.facesLeft;
const cur=p=>p.animator.current?.name||'idle';
function pose(p,clip,dt,boneScale){p.animator.play(p.animator.has(clip)?clip:'idle',{fade:.12});p.animator.update(dt);if(boneScale)for(const k in boneScale)p.skeleton.scaleBone(k,boneScale[k]);p.skeleton.update({x:p.rig.origin.x,y:p.rig.origin.y});}
// iPhone Safari ignores canvas filters, so the hit flash is a second, tinted draw (see drawActor), never a filter.
export function drawPuppet(ctx,p,x,y,height,{flip=false,clip='idle',dt=0,alpha=1,skin=null,silhouette=null,time=0,attachments=null,boneScale=null}={}) {
  const look=skin&&skin!=='base'?skinById(skin):null;
  if(look||silhouette){drawTinted(ctx,p,x,y,height,{flip,clip,dt,alpha,look,silhouette,time,boneScale});if(attachments?.length)drawAttachments(ctx,p,x,y,height,flip,attachments,alpha);return;}
  pose(p,clip,dt,boneScale);
  const scale=height/p.rig.artworkSize.height;
  ctx.save();ctx.translate(x,y);ctx.scale(flip?-scale:scale,scale);ctx.globalAlpha*=alpha;
  drawSkeleton(ctx,p.skeleton,p.atlas);if(attachments?.length)attach(ctx,p,attachments);ctx.restore();
}
function drawAttachments(ctx,p,x,y,height,flip,list,alpha=1){const scale=height/p.rig.artworkSize.height;ctx.save();ctx.translate(x,y);ctx.scale(flip?-scale:scale,scale);ctx.globalAlpha*=alpha;attach(ctx,p,list);ctx.restore();}
// Crowns and hats ride a bone: they nod, turn and grow with it. The fit offset is in that bone's own frame; s is the width as a share of the creature's height.
function attach(ctx,p,list){const H=p.rig.artworkSize.height;for(const a of list){const i=p.skeleton.byName.get(a.bone);if(i==null)continue;const w=p.skeleton.bones[i].world;
  ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.angle);ctx.scale(w.scale,w.scale);ctx.translate(a.x||0,a.y||0);ctx.rotate(a.r||0);if(a.alpha!=null)ctx.globalAlpha*=a.alpha;
  const s=(a.s||.3)*H;if(a.img?.width){const h=s*a.img.height/a.img.width;ctx.drawImage(a.img,-s/2,-h*.85,s,h);}else crownShape(ctx,s);ctx.restore();}}
function crownShape(c,w){const h=w*.62;c.beginPath();c.moveTo(-w/2,h*.15);c.lineTo(-w/2,-h*.45);c.lineTo(-w*.25,-h*.12);c.lineTo(0,-h*.8);c.lineTo(w*.25,-h*.12);c.lineTo(w/2,-h*.45);c.lineTo(w/2,h*.15);c.closePath();c.fillStyle='#ffd23a';c.fill();c.lineJoin='round';c.lineWidth=Math.max(1,w*.07);c.strokeStyle=INK;c.stroke();ellipse(c,0,-h*.1,w*.08,w*.08,'#49d9ef');}
// The star crown for a creature in its Power Form, placed by art/attach-fit.json.
function crownFor(p,id,alpha){const f=FIT.crown?.[id]||{};return {img:FX.crown||null,bone:f.bone&&p.skeleton.byName.has(f.bone)?f.bone:anchorBone(p),x:f.x||0,y:f.y||0,s:f.s||.3,r:f.r||0,alpha};}
function drawTinted(ctx,p,x,y,height,{flip,clip,dt,alpha,look,silhouette,time,boneScale}) {
  const art=p.rig.artworkSize,pad=boneScale?.5:.07,grow=boneScale?1.5:1,width=height*art.width/art.height,boxW=width*1.2*grow,boxH=height*(1.08+pad),m=ctx.getTransform(),k=Math.max(.5,Math.hypot(m.a,m.b));
  const w=Math.max(2,Math.ceil(boxW*k)),h=Math.max(2,Math.ceil(boxH*k));
  const buffer=p.buffer||(p.buffer=document.createElement('canvas'));if(buffer.width<w||buffer.height<h){buffer.width=Math.max(w,buffer.width);buffer.height=Math.max(h,buffer.height);}
  const b=buffer.getContext('2d');b.setTransform(1,0,0,1,0,0);b.clearRect(0,0,buffer.width,buffer.height);b.globalCompositeOperation='source-over';b.globalAlpha=1;
  b.setTransform(k,0,0,k,0,0);drawPuppet(b,p,boxW/2,height*(1+pad),height,{flip,clip,dt,boneScale});b.setTransform(1,0,0,1,0,0);
  b.globalCompositeOperation='source-atop';
  if(silhouette){b.fillStyle=silhouette;b.fillRect(0,0,w,h);}
  else{b.globalAlpha=look.alpha;b.fillStyle=look.tint;b.fillRect(0,0,w,h);b.globalAlpha=1;
    if(look.id==='gold'){const g=b.createLinearGradient(0,0,w,h),o=(time*.35)%1;g.addColorStop(Math.max(0,o-.12),'#fff0');g.addColorStop(o,'#fff8');g.addColorStop(Math.min(1,o+.12),'#fff0');b.fillStyle=g;b.fillRect(0,0,w,h);}
    // The rainbow look: bands of colour drift slowly across the creature.
    if(look.rainbow){const g=b.createLinearGradient(0,h,w,0),o=(time*.18)%1;['#ff6b6b','#ffb347','#fff36b','#6bff9c','#6bc8ff','#b98cff'].forEach((col,i)=>g.addColorStop((i/6+o)%1,col));b.globalAlpha=.5;b.fillStyle=g;b.fillRect(0,0,w,h);b.globalAlpha=1;}}
  b.globalCompositeOperation='source-over';
  ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(buffer,0,0,w,h,x-boxW/2,y-height*(1+pad),boxW,boxH);ctx.restore();
  if(look?.sparkle)for(let i=0;i<6;i++){const a=time*1.7+i*1.05,r=(.45+.15*Math.sin(time*3+i))*width;star(ctx,x+Math.cos(a)*r*.7,y-height*.5+Math.sin(a)*height*.42,3+2*Math.sin(time*6+i),look.sparkleColor||'#fff3b0');}
}
function star(ctx,x,y,r,color){ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,d=i%2?r*.35:r;ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
function star5(c,x,y,r,fill,edge=INK,width=2){c.save();c.translate(x,y);c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.45:r;c.lineTo(Math.cos(a)*d,Math.sin(a)*d);}c.closePath();c.fillStyle=fill;c.fill();c.lineJoin='round';c.lineWidth=width;c.strokeStyle=edge;c.stroke();c.restore();}
// Hand-drawn stand-ins, used until (or unless) the painted sprite is there.
function splatShape(c,x,y,r,rot,col,alpha=1){c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;c.beginPath();for(let i=0;i<=18;i++){const a=i/18*TAU,k=i%2?.62:1+.12*Math.sin(i*2.7),px=Math.cos(a)*r*k,py=Math.sin(a)*r*k;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle=col;c.fill();c.lineJoin='round';c.lineWidth=Math.max(2,r*.08);c.strokeStyle=INK;c.stroke();for(let i=0;i<5;i++){const a=i*1.31+.4;ellipse(c,Math.cos(a)*r*1.25,Math.sin(a)*r*1.25,r*.11,r*.11,col,INK,1.5);}c.restore();}
function petalShape(c,x,y,w,rot,col,alpha=1){c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;c.beginPath();c.moveTo(0,-w*.6);c.quadraticCurveTo(w*.42,0,0,w*.6);c.quadraticCurveTo(-w*.42,0,0,-w*.6);c.fillStyle=col;c.fill();c.lineWidth=1.5;c.strokeStyle=INK;c.stroke();c.restore();}
function flowerShape(c,x,y,w,rot,col,alpha=1){c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(c,Math.cos(a)*w*.24,Math.sin(a)*w*.24,w*.2,w*.2,col,INK,1.2);}ellipse(c,0,0,w*.12,w*.12,'#ffd23a',INK,1);c.restore();}
function inkDrop(c,x,y,w,rot,alpha=1){c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;c.beginPath();c.moveTo(0,-w*.6);c.quadraticCurveTo(w*.45,w*.15,0,w*.5);c.quadraticCurveTo(-w*.45,w*.15,0,-w*.6);c.fillStyle='#22163a';c.fill();c.restore();}
function bitShape(c,x,y,w,rot,col,alpha=1){c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha*=alpha;c.beginPath();c.moveTo(-w*.5,-w*.3);c.lineTo(w*.4,-w*.45);c.lineTo(w*.5,w*.25);c.lineTo(-w*.35,w*.45);c.closePath();c.fillStyle=col;c.fill();c.lineWidth=1.2;c.strokeStyle=INK;c.stroke();c.restore();}
function sproutShape(c,x,y,h,stage){c.save();c.translate(x,y);ellipse(c,0,0,h*.32,h*.1,'#7a5236',INK,2);line(c,[[0,0],[0,-h*.55]],'#4f8a25',Math.max(2,h*.07));
  for(const s of [-1,1]){c.save();c.translate(0,-h*.42);c.rotate(s*.9);ellipse(c,s*h*.14,0,h*.16,h*.07,'#86d957',INK,1.5);c.restore();}
  ellipse(c,0,-h*.62,h*(stage>2?.2:.13),h*(stage>2?.18:.15),stage>2?'#ffe27a':'#fff4dc',INK,2);if(stage>2)star5(c,0,-h*.63,h*.1,'#ffd23a',INK,1.2);c.restore();}
// The painted aura ring under a Power Form creature. Three specks run around it so it reads as turning.
function auraRing(c,x,y,rx,t,img=FX.aura){if(!sprite(c,img,x,y,rx*2.3)){ellipse(c,x,y,rx,rx*.36,null,'#ffd23a',4);ellipse(c,x,y,rx*.82,rx*.28,null,'#fff3b0',2);}
  for(let i=0;i<3;i++){const a=t*1.1+i*TAU/3;star(c,x+Math.cos(a)*rx*.95,y+Math.sin(a)*rx*.34,4.5,'#fff3b0');}}
export function drawPortrait(canvas,p,id,t,dt,{active=false,locked=false,skin=null,glowColor=null,form=false,clip='idle'}={}) {
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),w=rect.width,h=rect.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const c=CREATURES[id],cy=h*.89,crown=form&&!locked;
  glow(ctx,w/2,h*.54,w*.49,(glowColor||c.color)+(active?'27':'14'));
  ellipse(ctx,w/2,cy,w*.32,13,c.color+'15',c.color+(active?'66':'22'),1);
  ellipse(ctx,w/2,cy,w*.22,7,'#00000066');
  if(crown)auraRing(ctx,w/2,cy,w*.3,t);
  ctx.save();ctx.translate(w/2,h*.47);ctx.rotate(t*.08);ctx.setLineDash([2,9]);ellipse(ctx,0,0,Math.min(w*.37,h*.36),Math.min(w*.37,h*.36),null,c.color+'24');ctx.restore();
  const art=p.rig.artworkSize,aspect=art.width/art.height,height=Math.min(h*(crown?.72:.8),w*.86/aspect);
  drawPuppet(ctx,p,w/2,cy-7,height,{dt,clip:clip||'idle',flip:facesLeft(id),skin,silhouette:locked?(c.star?'#fff4cf':'#06131c'):null,time:t,attachments:crown?[crownFor(p,id)]:null});
  if(locked){ctx.save();ctx.font='900 '+Math.round(h*.22)+'px Heebo, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.color;ctx.shadowColor=c.color;ctx.shadowBlur=18;ctx.fillText('?',w/2,h*.5);ctx.restore();}
  for(let i=0;i<7;i++){const px=w*(.15+(i*.137)% .72),py=(h*.9-(t*14+i*32)%(h*.8));ellipse(ctx,px,py,1.5,1.5,c.color+(active?'aa':'44'));}
}
// Sideways phone: the whole play area, cropped tight. Upright phone: a close camera that follows the player.
const PHONE_WIDE=window.matchMedia('(max-height:600px) and (orientation:landscape)'),PHONE_TALL=window.matchMedia('(max-width:620px) and (orientation:portrait)'),REDUCED=window.matchMedia('(prefers-reduced-motion: reduce)');
const PLAY_VIEW={x:72,y:26,w:1136,h:668};
export class Renderer {
  constructor(canvas,art) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.art=art;this.puppets=[];this.skins=[null,null];this.clock=0;this.scale=1;this.offsetX=0;this.offsetY=0;this.shake=0;this.phone=false;this.cam=null;
    this.localSide=0;this.hudBottom=0;this.numberTop=0;this.ema=1/60;this.lite=false;this.dt=0;this.realDt=0;this.cutins=[];this.cutinIds=[];this.st=[];this.moments=[];this.bursts=[];this.bits=[];this.impact=0;this.impacts=[];this.fin={};this.coverFx=[];this.seenWonder=null;this.budget=120;this.m=null;}
  // Read-only: the device asks for calm motion (no impact frames, no shake).
  get reduced(){return REDUCED.matches;}
  swap(side,id,skin=null) {this.puppets[side]=createPuppet(id);this.cutins[side]=createPuppet(id);this.cutinIds[side]=id;this.skins[side]=skin;this.st[side]=null;}
  setMatch(m,skins=[null,null],{local=0}={}) {this.cam=null;this.puppets=m.actors.map(a=>createPuppet(a.id));this.cutins=m.actors.map(a=>createPuppet(a.id));this.cutinIds=m.actors.map(a=>a.id);this.skins=skins;this.buddy=m.echo?.buddy?createPuppet(m.echo.buddy.id):null;
    this.localSide=local===1?1:0;this.st=[];this.moments=[];this.bursts=[];this.bits=[];this.impact=0;this.fin={};this.coverFx=[];this.seenWonder=null;this.shake=0;this.m=m;}
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
    // A friend battle always shows the whole arena: a camera that follows one player is unfair to the other.
    if(this.wide&&this.closeCam&&!m.versus&&!m.coop){
      k*=1.3;const p=m.actors[this.localSide]||m.actors[0],hw=this.w/2/k,hh=this.h/2/k,px=p.x,py=p.y-40;
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
  cinematic(x,y,zoom=1.4,dur=1.6){if(REDUCED.matches)return;this.punch={x,y,zoom,dur,age:0};}
  // A small arrow at the screen edge shows where an off-screen rival is.
  drawOffscreen(m) {
    const c=this.ctx,f=m.actors[1-this.localSide]||m.actors[1];if(!f||f.out>0)return;const sx=this.offsetX+f.x*this.scale,sy=this.offsetY+(f.y-40)*this.scale,pad=26;
    if(sx>pad&&sx<this.w-pad&&sy>pad&&sy<this.h-pad)return;
    const x=Math.max(pad,Math.min(this.w-pad,sx)),y=Math.max(pad+40,Math.min(this.h-pad,sy)),ang=Math.atan2(sy-y,sx-x);
    c.save();c.translate(x,y);c.rotate(ang);c.fillStyle=CREATURES[f.id].color;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(16,0);c.lineTo(-10,-13);c.lineTo(-4,0);c.lineTo(-10,13);c.closePath();c.stroke();c.fill();c.restore();
  }
  point(clientX,clientY) {const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.offsetX)/this.scale,y:(clientY-r.top-this.offsetY)/this.scale+38*(this.size||1)};}
  // How big a creature is drawn: its Power Form, a giant/tiny Wonder. The phone factor comes on top.
  bodyScale(a){return (a.form>0?core.FORM_SIZE??1.15:1)*(a.sz||1);}
  render(m,dt,clock,realDt=dt) {
    this.m=m;this.dt=dt;this.realDt=realDt;this.resize();this.follow(m,realDt);this.clock=clock;
    // The effects governor: a slow phone drops to lite mode (half the particles, no impact frames, no flecks) and climbs back when it recovers.
    this.ema=this.ema*.95+Math.min(.1,Math.max(0,realDt))*.05;if(this.ema>.022)this.lite=true;else if(this.ema<.018)this.lite=false;this.budget=this.lite?60:120;
    this.propKey=PROP_KEYS.includes(m.arena)?m.arena:PROP_STAND_IN[m.arena]||'coast';this.shadowed=core.isShadowed?!!core.isShadowed(m):!m.versus&&!m.coop&&(!!m.wild||!!m.story&&!m.mirror&&!m.friendly);this.versus=!!m.versus;
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0b2026';c.fillRect(0,0,this.w,this.h);
    // Shake: only ever small on a phone, and none at all when the device asks for calm motion.
    this.shake=Math.min(this.reduced?0:this.wide?3:9,Math.max(0,this.shake-realDt*22));c.translate(this.offsetX,this.offsetY);c.scale(this.scale,this.scale);
    if(this.shake>0)c.translate(Math.sin(clock*93)*this.shake,Math.cos(clock*117)*this.shake*.6);
    c.drawImage(this.art.arenas?.[m.arena]||this.art.arenas?.[ARENA_STAND_IN[m.arena]]||this.art.arena,0,0,1280,720);
    // Hide-and-seek: the rival is hidden until the child stands still and listens.
    this.hidden=!!m.hide&&m.hide.seen<=0&&m.status==='playing'&&m.actors[1].hp>0;
    // A gentle edge shade leaves the arena floor bright and readable.
    const shade=c.createLinearGradient(0,0,0,720);shade.addColorStop(0,'#102b3866');shade.addColorStop(.25,'#102b3800');shade.addColorStop(.8,'#102b3800');shade.addColorStop(1,'#102b3844');c.fillStyle=shade;c.fillRect(0,0,1280,720);
    c.save();c.globalAlpha=.5;c.setLineDash([5,12]);ellipse(c,WORLD.cx,WORLD.cy,WORLD.rx,WORLD.ry,null,'#a7f3e4',2);c.restore();
    this.watch(m,dt);
    this.drawWonderFloor(m);
    if(m.lava)this.drawLava(m,clock);
    for(const cover of m.covers)if(cover.hp<=0)this.drawRubble(cover);
    if(m.lava)for(const e of m.lava.embers)this.drawEmber(e,clock);
    if(m.wind)for(const f of m.wind.feathers)this.drawFeather(f,clock);
    if(m.echo)this.drawEchoStones(m,clock);
    if(m.hide&&this.hidden)this.drawListening(m);
    if(m.ball){this.drawGoals(m,clock);if(m.ball.carrier<0)this.drawBall(m,clock);}
    for(const z of m.zones)this.drawZone(z,clock);
    this.drawSeed(m);
    for(const a of m.actors)if(a.boss)this.drawBossPlan(a,clock);
    if(m.pickup)this.drawPickup(m.pickup,clock);
    for(const w of m.waves)this.drawWave(w,m,clock);
    this.drawDabs();
    const f0=this.size||1;
    for(const a of m.actors){
      if(a.side===1&&this.hidden||a.out>0)continue;
      // A flying creature casts a smaller, softer shadow: it is up in the air. Shadow and ring grow with the drawn body.
      const fly=a.spec.flies&&a.hp>0,R=(CREATURES[a.id]?.radius||a.radius)*(a.giant?1.25:1)*f0*this.bodyScale(a);
      ellipse(c,a.x,a.y+3,R*(fly?1.1:1.45),R*(fly?.36:.48),fly?'#182b3540':'#182b3555');
      if(a.form>0)auraRing(c,a.x,a.y+3,R*1.9,clock,this.art.fx?.aura);
      ellipse(c,a.x,a.y+3,R*1.5,R*.58,null,sideColor(a.side,this.localSide),3);
      if(a.tellT>0)this.drawTell(a);
      if(a.windup>0){const surge=!!a.windupSurge||a.upgrades.includes('surge'),r=surge?235:182,pct=1-a.windup/(surge?.85:.6);ellipse(c,a.x,a.y,r,r*.8,'#fc713027','#fa9858',2);ellipse(c,a.x,a.y,r*pct,r*.8*pct,'#ffbc6544');}
    }
    const B=m.echo?.buddy;
    const things=[...m.covers.map((o,i)=>({y:o.y,cover:o,i})).filter(o=>o.cover.hp>0),...m.actors.filter(a=>!(a.out>0)).map(a=>({y:a.y,actor:a})),...(B&&this.buddy?[{y:B.y,buddy:B}]:[])].sort((a,b)=>a.y-b.y);
    for(const obj of things){if(obj.cover)this.drawCover(obj.cover,m.time,obj.i);else if(obj.buddy)this.drawBuddy(obj.buddy,dt,m.status);else this.drawActor(obj.actor,dt,m.status,m);}
    // The impact frame: two linocut frames, cream paper and ink creatures, with the super itself in colour on top.
    if(this.impact>0){this.impact--;if(!this.lite&&!this.reduced){c.save();c.globalAlpha=.85;c.fillStyle='#f6ecd8';c.fillRect(-200,-200,1680,1120);c.restore();
      for(const a of m.actors)if(!(a.out>0)&&!(a.side===1&&this.hidden)){const p=this.puppets[a.side],S=f0*this.bodyScale(a),lift=a.spec.flies&&a.hp>0?(a.giant?32:24):0;drawPuppet(c,p,a.x,a.y-lift*S,a.spec.height*S,{flip:facesLeft(a.id)?a.facing>0:a.facing<0,clip:cur(p),dt:0,silhouette:INK});}
      for(const z of m.zones)this.drawZone(z,clock);for(const w of m.waves)this.drawWave(w,m,clock);}}
    const enemy=m.actors[1];if(!m.versus&&!this.hidden&&m.status==='playing'&&enemy.fireCd<.23&&enemy.windup<=0&&(!enemy.boss||enemy.boss.phase==='guard')){const ey=enemy.y-38*f0;c.save();c.globalAlpha=.65;c.setLineDash([5,5]);line(c,[[enemy.x,ey],[enemy.x+Math.cos(enemy.aim)*78,ey+Math.sin(enemy.aim)*78]],'#d53c5b',3);c.restore();}
    for(const s of m.shots)this.drawShot(s,clock,m);
    // New hit numbers settle first (oldest first), so a number that a newer one takes over is never painted in the same frame.
    for(const e of m.effects)if(e.type==='hit'&&e.amount>0&&e.num==null)this.mergeNumber(e,m);
    this.numBoxes=[];
    for(const e of m.effects)this.drawEffect(e,m);
    this.drawWorldMoments(m);
    if(m.wind)for(const a of m.actors)if(!(a.out>0))this.drawCarry(a,m);
    // In the lava, an arrow above the player points back to safety.
    if(m.lava)for(const a of m.versus?m.actors:[m.actors[0]]){const o=Math.hypot((a.x-WORLD.cx)/WORLD.rx,(a.y-WORLD.cy)/WORLD.ry);if(a.hp>0&&o>m.lava.scale){const ang=Math.atan2(WORLD.cy-a.y,WORLD.cx-a.x),y=a.y-a.spec.height*f0*this.bodyScale(a)-46+Math.sin(this.clock*8)*4;c.save();c.translate(a.x,y);c.rotate(ang);c.fillStyle='#fff1a8';c.strokeStyle='#7a2a00';c.lineWidth=4;c.beginPath();c.moveTo(30,0);c.lineTo(4,-18);c.lineTo(4,-8);c.lineTo(-22,-8);c.lineTo(-22,8);c.lineTo(4,8);c.lineTo(4,18);c.closePath();c.stroke();c.fill();c.restore();}}
    if(m.ball&&m.ball.carrier>=0)this.drawBall(m,clock);
    // Names under the fighters stay in the world, so they sit under the right creature with any camera.
    const L=this.localSide,ls=22*f0;
    if(m.versus&&(m.status==='countdown'||m.time<5))m.actors.forEach((a,i)=>this.label(m.names?.[i]||'שחקן '+(i+1),a.x,a.y+42*f0,ls,i===L?'#08424b':'#8a1d2e','center'));
    else if(m.coop&&(m.status==='countdown'||m.time<5))m.actors.forEach(a=>{if(a.side!==1&&!(a.out>0))this.label(m.names?.[a.side]||'',a.x,a.y+42*f0,ls,a.side?'#7a5200':'#08424b','center');});
    else if(m.status==='playing'&&m.time<5&&m.actors[L]){const me=m.actors[L];this.label('אתם',me.x,me.y+42*f0,ls,'#08424b','center');}
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.cam)this.drawOffscreen(m);
    this.drawScreenMoments(m);
    if(m.status==='countdown')this.drawCountdown(m);
  }
  // The countdown always draws in screen pixels, so a close camera or a push-in never shrinks it.
  drawCountdown(m){const c=this.ctx,label=m.countdown>.3?String(Math.ceil(m.countdown-.3)):'קדימה!',u=m.countdown>.3?(m.countdown-.3)%1:0,pop=this.reduced?1:1+.18*ease((u-.8)/.2);c.save();
    if(!this.zoomed){c.fillStyle='#072c3b40';c.fillRect(0,0,this.w,this.h);}
    const big=clamp(this.h*.22,54,120),small=clamp(this.h*.055,15,26),cy=this.h*.5;
    c.translate(this.w/2,cy);c.scale(pop,pop);inkText(c,label,0,0,big,'#ffffff',INK,Math.max(5,big*.09));c.setTransform(this.dpr,0,0,this.dpr,0,0);
    inkText(c,m.roundLabel||'קרב על הזירה',this.w/2,cy+big*.66,small,'#ffffff',INK,Math.max(3,small*.24));c.restore();}
  label(text,x,y,size,color='#fff',align='center') {const c=this.ctx;c.font=`900 ${size}px 'Frank Ruhl Libre', Heebo, Arial`;c.direction=LTR(String(text))?'ltr':'inherit';c.textAlign=align;c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(3,size*.2);c.strokeStyle=lum(color)>.6?'#1d2a5acc':'#fff8e8dd';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);}
  // Per-creature drawing state: squash on a hit, recoil and a muzzle puff on a shot, paint dabs, the respawn pop.
  stateOf(a){return this.st[a.side]||(this.st[a.side]={hit:0,atk:0,sq:new rig.Spring({stiffness:260,damping:18}),hold:0,rec:0,rx:0,ry:0,puff:-1,ang:0,dab:0,dabs:[],out:a.out||0});}
  watch(m,dt){for(const a of m.actors){const s=this.stateOf(a);
    if((a.hit||0)>s.hit+.02&&a.hit>.1){s.hold=.06;s.sq.value=1;s.sq.velocity=0;}s.hit=a.hit||0;
    // A new shot lifts the attack pose to ATTACK_SHOT (a super lifts it higher, a kick lower): recoil only for the shot.
    if((a.attack||0)>s.atk+.04&&Math.abs(a.attack-(core.ATTACK_SHOT??.3))<.03){const g=a.aim||0;s.rec=.05;s.rx=-Math.cos(g)*4;s.ry=-Math.sin(g)*3.2;s.puff=0;s.ang=g;}s.atk=a.attack||0;
    if(s.hold>0)s.hold-=dt;else if(s.sq.value||s.sq.velocity){s.sq.update(dt);if(Math.abs(s.sq.value)<.002&&Math.abs(s.sq.velocity)<.02){s.sq.value=0;s.sq.velocity=0;}}
    if(s.rec>0)s.rec-=dt;if(s.puff>=0){s.puff+=this.realDt;if(s.puff>.07)s.puff=-1;}
    // A ready super, or a Power Form, leaves painted dabs behind a moving creature: the rival's ready super is readable too.
    const moving=Math.hypot(a.moveX||0,a.moveY||0)>.2&&a.hp>0&&!(a.out>0)&&m.status==='playing';
    if(moving&&((a.superCharge||0)>=1||a.form>0)){s.dab-=dt;if(s.dab<=0){s.dab=.07;const R=rnd(seedOf(a.x,a.y)+s.dabs.length);s.dabs.push({x:a.x+(R()-.5)*14,y:a.y+(R()-.5)*8,t:0,col:a.form>0?FAM_COLOR[famOf(a.id)]:a.spec.color,rot:R()*TAU});if(s.dabs.length>10)s.dabs.shift();}}
    for(let i=s.dabs.length-1;i>=0;i--){s.dabs[i].t+=dt;if(s.dabs[i].t>=.5)s.dabs.splice(i,1);}
    if(s.out>0&&!(a.out>0)&&a.hp>0)this.burst(a.x,a.y,'puff');s.out=a.out||0;}
    // A Wonder seed that has just been touched opens with a blossom.
    const W=m.wonder,st=W?.state||null;if(st==='active'&&this.seenWonder&&this.seenWonder!=='active'&&W.x!=null)this.burst(W.x,W.y-30,'blossom');this.seenWonder=st;}
  drawDabs(){const c=this.ctx,f=this.size||1;for(const s of this.st)if(s)for(const d of s.dabs){if(this.budget--<=0)return;const a=Math.min(1,(1-d.t/.5)*1.6),img=tint(this.art.fx?.dab,d.col);c.save();c.translate(d.x,d.y+2);c.scale(1,.55);c.globalAlpha=a;
    if(img){const w=36*f;c.rotate(d.rot);c.drawImage(img,-w/2,-w/2,w,w*img.height/img.width);c.globalAlpha=a*.55;c.drawImage(img,-w*.4,-w*.4,w*.8,w*.8*img.height/img.width);}else ellipse(c,0,0,15*f,13*f,d.col,INK,1.5);c.restore();}}
  drawCover(o,time,i=0) {const c=this.ctx,x=o.x,y=o.y,r=o.r,st=this.coverFx[i]||(this.coverFx[i]={hp:o.hp,t:0});
    // A rock wobbles for a moment when a shot chips it.
    if(o.hp<st.hp-.01)st.t=.32;st.hp=o.hp;if(st.t>0)st.t=Math.max(0,st.t-this.realDt);const wob=st.t>0&&!this.reduced?Math.sin(st.t*55)*3.2*st.t/.32:0;
    if(o.collapseAt!=null&&o.collapseAt-time<=2){ellipse(c,x,y,r+13,(r+13)*.7,'#ffb22d33','#ffe27c',4);this.label(String(Math.max(1,Math.ceil(o.collapseAt-time))),x,y-r-33,24,'#513009');}
    const img=this.art.props?.['rock-'+this.propKey],ratio=o.maxHp?o.hp/o.maxHp:1,stage=ratio<.4?2:ratio<.75?1:0;
    if(img){const w=r*3.1,h=w*img.height/img.width,fx=this.art.fx||{},rock=this.hurtRock(img,Math.round((1-ratio)*5),stage);c.save();c.translate(x+wob,y+r*.6);c.rotate(wob*.012);c.drawImage(rock,-w/2,-h,w,h);
      if(stage&&!fx['crack-1']){line(c,[[0,-h*.78],[-w*.07,-h*.55],[w*.05,-h*.38]],'#2b2f7a',3);if(stage>1)line(c,[[-w*.07,-h*.55],[-w*.2,-h*.45]],'#2b2f7a',3);}c.restore();return;}
    c.save();c.translate(wob,0);ellipse(c,x+5,y+6,r*1.1,r*.51,'#123c3a44');
    const top=[[-r,-r*.3],[-r*.6,-r*.83],[r*.55,-r*.8],[r,-r*.15],[r*.57,r*.45],[-r*.64,r*.42]];
    c.translate(x,y-11);c.beginPath();top.forEach(([px,py],i)=>i?c.lineTo(px,py+22):c.moveTo(px,py+22));c.closePath();c.fillStyle='#6b786e';c.fill();
    c.beginPath();top.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#e4dec0');g.addColorStop(1,'#9bb1a0');c.fillStyle=g;c.fill();c.strokeStyle='#fff5d4';c.lineWidth=2;c.stroke();
    line(c,[[-r*.5,-r*.35],[-r*.15,-r*.15],[r*.3,-r*.45]],'#829b8e',2);
    if(stage)line(c,[[0,-r*.6],[-r*.15,0],[r*.12,r*.3]],'#2b2f7a',3);
    if(stage>1)line(c,[[-r*.15,0],[-r*.65,r*.12]],'#2b2f7a',3);
    c.fillStyle='#315750';c.fillRect(-r*.7,r*.7,r*1.4,4);c.fillStyle='#abddc8';c.fillRect(-r*.7,r*.7,r*1.4*ratio,4);c.restore();
  }
  // A hurt rock: darker the more it is hurt (a multiply fill, never a canvas filter), with painted cracks below 75% and 40%. Cached per step.
  hurtRock(img,bucket,stage){const fx=this.art.fx||{},c1=fx['crack-1'],c2=fx['crack-2'];if(!bucket&&!stage)return img;const k=(img.src||'rock')+'|'+bucket+'|'+stage+'|'+(c1?1:0)+(c2?1:0);let t=tints.get(k);if(t)return t;
    t=document.createElement('canvas');t.width=img.width;t.height=img.height;const g=t.getContext('2d');g.drawImage(img,0,0);
    if(bucket){g.globalCompositeOperation='multiply';g.globalAlpha=bucket/5*.35;g.fillStyle='#5a4636';g.fillRect(0,0,t.width,t.height);g.globalAlpha=1;g.globalCompositeOperation='destination-in';g.drawImage(img,0,0);}
    g.globalCompositeOperation='source-atop';const cw=t.width*.62;
    if(stage>=1&&c1)g.drawImage(c1,t.width*.48-cw/2,t.height*.4-cw/2,cw,cw*c1.height/c1.width);
    if(stage>=2&&c2){g.save();g.translate(t.width*.56,t.height*.55);g.rotate(.7);g.drawImage(c2,-cw*.45,-cw*.45,cw*.9,cw*.9*c2.height/c2.width);g.restore();}
    g.globalCompositeOperation='source-over';tints.set(k,t);return t;}
  drawRubble(o){const c=this.ctx,img=this.art.props?.['rubble-'+this.propKey];if(img){const w=o.r*3.1,h=w*img.height/img.width;c.drawImage(img,o.x-w/2,o.y+o.r*.6-h,w,h);return;}for(let i=0;i<7;i++){const a=i*2.39,r=o.r*(.3+(i%3)*.3);c.save();c.translate(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r*.5);c.rotate(a);c.fillStyle=i%2?'#a8ad92':'#bdc2a4';c.fillRect(-5,-3,12,7);c.restore();}}
  // Big heads: the head bone (the whole body for the three rigs without one) grows and shrinks back smoothly.
  bigHeads(m,p){const W=m?.wonder;if(W?.id!=='bigheads'||W.state!=='active')return null;const A=core.WONDER_TIMES?.active??12,e=ease(Math.min(1,W.age/.4,(A-W.age)/.4));if(e<=0)return null;const b=anchorBone(p);return {[b]:1+(b==='head'?.8:.25)*e};}
  drawActor(a,dt,status,m=this.m) {
    const c=this.ctx,s=this.stateOf(a),F=this.fin[a.side],T=F?this.clock-F.start:0;
    let clip=a.hp<=0?'defeat':a.hit>0?'hit':a.windup>0?'telegraph':a.attack>0?'attack':Math.hypot(a.moveX,a.moveY)>.2?'run':'idle';
    if(a.hp>0&&a.boss?.phase==='windup')clip='telegraph';if(a.hp>0&&a.boss?.phase==='recover')clip='hit';
    if(status==='countdown')clip='idle';const puppet=this.puppets[a.side],f=this.size||1,k=this.bodyScale(a),S=f*k;
    let ox=0,oy=0,sx=1,sy=1,rot=0,ink=0,aura=a.side===1&&this.shadowed;
    // Only one rig has a wind-up clip: the others crouch and tremble while they gather a big attack.
    if(clip==='telegraph'&&!puppet.animator.has('telegraph')){clip='idle';const q=this.clock;sx=1.05+.02*Math.sin(q*40);sy=.93;ox=Math.sin(q*55)*1.4;}
    // The finish: a freed creature sheds its ink, then hops; a beaten one shakes off dizzy stars; the child's creature sits, dusts off and bounces up.
    if(F){if(F.kind==='liberate'){if(T<F.T1)ink=.8*(1-T/F.T1);else{aura=false;clip='idle';const h=(T-F.T1)/.35;if(h<1)oy-=30*Math.sin(Math.PI*h);else if(!F.landed){F.landed=1;s.sq.value=1;s.sq.velocity=0;s.hold=.05;}}}
      else if(F.kind==='puff'){if(T>=.8)clip='idle';}
      else if(F.kind==='sit'){if(T<.5){clip='hit';sy*=.88;sx*=1.07;}else if(T<.95){clip='idle';rot=Math.sin((T-.5)*26)*.06;}else{clip='idle';const h=(T-.95)/.35;if(h<1)oy-=18*Math.sin(Math.PI*h);else if(!F.landed){F.landed=1;s.sq.value=.8;s.sq.velocity=0;}}}}
    if(s.sq.value){const v=clamp(s.sq.value,-.6,1);sx*=1+.12*v;sy*=1-.1*v;}
    if(s.rec>0){ox+=s.rx;oy+=s.ry;}
    if(S!==1){c.save();c.translate(a.x,a.y);c.scale(S,S);c.translate(-a.x,-a.y);}
    // Birds fly: the body floats above its shadow, a little higher in a guardian's second stage.
    const lift=a.spec.flies&&a.hp>0?(a.giant?32:24)+(a.phase2?26:0)+Math.sin(this.clock*4+a.side*2)*5:0;c.save();c.translate(0,-lift);
    const hidden=a.side===1&&this.hidden;
    if(a.dash&&a.hp>0){c.save();c.globalCompositeOperation='lighter';for(let i=1;i<=6;i++){const q=i/6;ellipse(c,a.x-a.moveX*60*q,a.y-a.spec.height*.4-a.moveY*48*q,a.radius*(1.2-q*.6),a.spec.height*.22*(1-q*.5),a.spec.color+'55');}c.restore();}
    // Some drawings face left in the source art; flipping follows the drawing.
    const flip=facesLeft(a.id)?a.facing>0:a.facing<0;
    if(a.root>0)this.drawRoots(a);
    if(a.lightShield>0&&a.hp>0)this.drawLightShield(a);
    if(aura&&!hidden&&(a.hp>0||ink>0||status==='finished'||m?.ending))this.drawShadowAura(a,ink>0?ink/.8:1);
    if(a.power>0){c.save();c.globalAlpha=.35+.08*Math.sin(this.clock*6);ellipse(c,a.x,a.y,a.radius*(1.7+a.power*.12),a.radius*.62,'#ff8a2a55','#ffb43a',3);c.restore();}
    const height=a.spec.height*(1+.07*(a.power||0)),att=a.form>0&&!hidden?[crownFor(puppet,a.id,a.form<3&&Math.sin(this.clock*TAU*6)<0?.25:1)]:null,bs=this.bigHeads(m,puppet);
    const opts={flip,clip:a.stun>0&&a.hp>0?'hit':clip,dt:status==='paused'||a.stun>0?0:dt,alpha:hidden?.1:a.invincible>0&&!m?.ending&&status!=='finished'?.65:1,skin:this.skins[a.side],time:this.clock,attachments:att,boneScale:bs};
    const px=a.x+ox,py=a.y+oy,bent=sx!==1||sy!==1||rot;
    if(bent){c.save();c.translate(px,py);if(rot)c.rotate(rot);c.scale(sx,sy);c.translate(-px,-py);}
    drawPuppet(c,puppet,px,py,height,opts);
    // The hit flash: one or two frames of cream paper over the creature.
    if(a.hit>.11&&a.hp>0&&!hidden)drawPuppet(c,puppet,px,py,height,{...opts,dt:0,skin:null,silhouette:CREAM,alpha:Math.min(.7,(a.hit-.11)*12)});
    if(ink>0)drawPuppet(c,puppet,px,py,height,{...opts,dt:0,skin:null,silhouette:'#1b1030',alpha:ink,attachments:null});
    if(bent)c.restore();
    if(s.puff>=0&&!hidden){const q=s.puff/.07,mx=a.x+Math.cos(s.ang)*(a.radius+12),my=a.y-38+Math.sin(s.ang)*a.radius*.8;if(!sprite(c,this.art.fx?.puff,mx,my,(14+16*q),0,1-q*.6))ellipse(c,mx,my,6+8*q,5+6*q,'#fff4dccc',INK,1);}
    if(hidden){c.restore();if(S!==1)c.restore();return;}
    if(a.hear>0&&a.hp>0)this.drawHearing(a);
    if(a.silence>0&&a.hp>0)this.drawSilence(a);
    if(a.stun>0&&a.hp>0)this.drawDizzy(a);
    if(F?.kind==='puff'&&T<.8)this.drawDizzy(a);
    if(a.regen){c.save();for(let i=0;i<5;i++){const q=(this.clock*.9+i/5)%1,qx=a.x+Math.sin(i*2.4+this.clock*2)*a.radius*.9,qy=a.y-10-q*a.spec.height*.9;c.globalAlpha=(1-q)*.9;c.fillStyle='#5dff9e';c.fillRect(qx-2,qy-7,4,14);c.fillRect(qx-7,qy-2,14,4);}c.restore();}
    if(a.guard>0){c.save();c.globalAlpha=.35;ellipse(c,a.x,a.y-a.spec.height*.45,a.radius*1.6,a.spec.height*.65,'#92e9ff33','#cffbff',3);c.restore();}
    c.restore();if(S!==1)c.restore();
    // The health bar and light gem keep the phone size only, so a giant or a Power Form never makes them chunky.
    if(f!==1){c.save();c.translate(a.x,a.y);c.scale(f,f);c.translate(-a.x,-a.y);}
    // Near the top edge the bar stops at the screen edge, so health never leaves the screen.
    const grown=bs?a.spec.height*((bs.head||bs.body||1)-1)*.5:0,barW=70,topWorld=-this.offsetY/this.scale+6,barY=Math.max(a.y-(lift+a.spec.height+grown+17)*k,a.y+(topWorld-a.y)/f);c.fillStyle='#092432bb';c.beginPath();c.roundRect(a.x-barW/2,barY,barW,7,4);c.fill();c.fillStyle=barColor(a.side,this.localSide);c.beginPath();c.roundRect(a.x-barW/2+1,barY+1,Math.max(0,(barW-2)*a.hp/a.spec.hp),5,3);c.fill();
    if((a.side!==1||this.versus||a.side===this.localSide)&&a.hp>0&&!(a.out>0))this.drawLightGem(a.x-barW/2-13,barY+3,a.superCharge||0,a.spec.color,a);
    if(f!==1)c.restore();
  }
  // The freed friend who helps in the echo mission: it follows, and sits on the next stone when the child waits.
  drawBuddy(B,dt,status){const c=this.ctx,spec=CREATURES[B.id],f=this.size||1;
    if(f!==1){c.save();c.translate(B.x,B.y);c.scale(f,f);c.translate(-B.x,-B.y);}
    ellipse(c,B.x,B.y+3,spec.radius*1.2,spec.radius*.4,'#182b3544');
    if(B.on>=0){c.save();c.globalCompositeOperation='lighter';glow(c,B.x,B.y-spec.height*.9,30+5*Math.sin(this.clock*8),'#ffe27acc');c.restore();}
    const flip=facesLeft(B.id)?B.facing>0:B.facing<0;
    drawPuppet(c,this.buddy,B.x,B.y,spec.height*.8,{flip,clip:status==='countdown'||!B.moving?'idle':'run',dt:status==='paused'?0:dt,time:this.clock});
    if(f!==1)c.restore();}
  // Five singing stones. While the tune plays the singing one lights up; the friend's hint glows gold.
  drawEchoStones(m,t){const c=this.ctx,E=m.echo,listen=E.phase==='listen',buddyOn=E.buddy?.on??E.hint??-1;
    E.stones.forEach((s,i)=>{const singing=listen&&E.note>=0&&E.song[E.note]===i,rx=s.r,ry=s.r*.66;
      ellipse(c,s.x,s.y+5,rx+6,ry+5,'#1c2a3a44');
      const g=c.createRadialGradient(s.x-rx*.3,s.y-ry*.4,4,s.x,s.y,rx);g.addColorStop(0,singing?'#fff7d6':'#f3e7cc');g.addColorStop(1,singing?'#ffc95a':'#a98c63');
      ellipse(c,s.x,s.y,rx,ry,g,singing?'#fff3b0':'#5d8f9a',3);
      c.save();c.globalAlpha=singing?.95:.55;for(let k=1;k<=3;k++){c.beginPath();c.ellipse(s.x,s.y,rx*k/4,ry*k/4,0,-2.4,.8);c.strokeStyle=singing?'#a8560a':'#3f7f8c';c.lineWidth=2.5;c.stroke();}c.restore();
      if(singing){c.save();c.globalCompositeOperation='lighter';glow(c,s.x,s.y-10,rx*2.1,'#ffe27aaa');for(let k=0;k<3;k++){const q=((t*1.6+k/3)%1);ellipse(c,s.x,s.y-q*70,rx*(.6+q*.6),ry*(.6+q*.6),null,'#fff3b0',3*(1-q)+1);}c.restore();}
      if(i===buddyOn&&!singing){c.save();c.globalCompositeOperation='lighter';ellipse(c,s.x,s.y,rx+6+3*Math.sin(t*7),ry+5,null,'#ffe27a',4);c.restore();}
    });}
  // Hide-and-seek: a ring under the child fills while they stand still. Full means: now you hear it.
  drawListening(m){const c=this.ctx,p=m.actors[0],H=m.hide;if(p.out>0||p.hp<=0)return;const pct=Math.min(1,H.still/HIDE_LISTEN);
    c.save();c.globalAlpha=.85;ellipse(c,p.x,p.y+3,p.radius*2.1,p.radius*.8,null,'#ffffff55',3);
    if(pct>0){c.beginPath();c.ellipse(p.x,p.y+3,p.radius*2.1,p.radius*.8,0,-Math.PI/2,-Math.PI/2+pct*Math.PI*2);c.strokeStyle='#7ff6ff';c.lineWidth=5;c.stroke();}c.restore();}
  // A warning before a super: the creature glows, and the silence wave shows where it will reach.
  drawTell(a){const c=this.ctx,k=clamp(1-a.tellT/(a.spec.tell||.6),0,1),pulse=.5+.5*Math.sin(this.clock*22);c.save();
    if(a.id==='kashevet'){const r=a.upgrades.includes('surge')||a.megaPending?285:240;c.setLineDash([12,9]);ellipse(c,a.x,a.y,r,r*.8,'#cfe0ff'+(pulse>.5?'26':'14'),'#e7efff',3);c.setLineDash([]);ellipse(c,a.x,a.y,r*k,r*.8*k,'#cfe0ff22');}
    c.globalCompositeOperation='lighter';const lift=a.spec.flies?(a.giant?32:24):0,cy=a.y-lift-a.spec.height*(a.id==='kashevet'?.5:.75);glow(c,a.x,cy,40+30*k,(a.id==='kashevet'?'#d6e6ff':'#ffe27a')+(pulse>.4?'ee':'99'));
    if(a.id==='rishrush')for(let i=0;i<8;i++){const ang=i*Math.PI/4+this.clock*2;ellipse(c,a.x+Math.cos(ang)*a.radius*2.2,cy+Math.sin(ang)*a.radius*1.2,5,5,'#fff3b0');}
    c.restore();}
  drawHearing(a){const c=this.ctx,t=this.clock,cy=a.y-a.spec.height*.85;c.save();c.globalAlpha=.8;for(let k=0;k<3;k++){const q=(t*1.4+k/3)%1;for(const side of [-1,1]){c.beginPath();c.arc(a.x+side*a.radius*.9,cy,10+q*26,side>0?-.9:Math.PI-.9,side>0?.9:Math.PI+.9);c.strokeStyle='#bff9ff';c.lineWidth=3*(1-q)+1;c.stroke();}}c.restore();}
  drawSilence(a){const c=this.ctx,x=a.x,y=a.y-a.spec.height-34;c.save();ellipse(c,x,y,17,17,'#24306bdd','#cfe0ff',2);c.translate(x-7,y);c.fillStyle='#ffffff';c.beginPath();c.moveTo(-5,-4);c.lineTo(-1,-4);c.lineTo(4,-8);c.lineTo(4,8);c.lineTo(-1,4);c.lineTo(-5,4);c.closePath();c.fill();line(c,[[8,-5],[16,5]],'#ff8f8f',2.5);line(c,[[16,-5],[8,5]],'#ff8f8f',2.5);c.restore();}
  // Creatures still held by the shadow trail dark smoke until they are freed.
  drawShadowAura(a,k=1){const c=this.ctx,t=this.clock,h=a.spec.height;c.save();for(let i=0;i<9;i++){const q=(t*.6+i/9)%1,ang=i*2.1+t*.7,r=a.radius*(1.1+q*1.4);c.globalAlpha=.32*(1-q)*k;ellipse(c,a.x+Math.cos(ang)*r*.6,a.y-h*(.15+q*.8),r*.55,r*.42,i%2?'#2a1840':'#120a1f');}c.restore();}
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
  drawCarry(a,m){if(!a.feathers)return;const c=this.ctx,y=a.y-a.spec.height*(this.size||1)*this.bodyScale(a)*(1+.07*(a.power||0))-38,hold=m.wind.holder===a.side;c.save();c.translate(a.x,y);
    c.fillStyle=hold?'#ffcf3a':'#f3e6c8';c.strokeStyle='#2a1d11';c.lineWidth=2;c.beginPath();c.roundRect(-26,-13,52,26,13);c.fill();c.stroke();
    c.save();c.translate(-12,0);c.rotate(-.6);c.beginPath();c.moveTo(-8,0);c.quadraticCurveTo(0,-6,9,0);c.quadraticCurveTo(0,6,-8,0);c.fillStyle='#3cc7c9';c.fill();c.restore();
    c.restore();this.label(String(a.feathers),a.x+9,y+1,18,'#2a1d11','center');}
  // Tide gates: the left one is yours to defend, the right one is where you score.
  drawGoals(m,t){const c=this.ctx;
    for(let g=0;g<2;g++){const G=GOALS[g],dir=g===0?-1:1,col=g===0?'#59c9ff':'#ffcf5a',top=G.y-G.half,bot=G.y+G.half,H=78;
      c.save();c.globalAlpha=.22+.06*Math.sin(t*3);ellipse(c,G.x,G.y,110,G.half+34,col);c.restore();
      const gate=this.art.props?.[g===0?'gate-blue':'gate-gold'];
      if(gate){const h=G.half*2+H+30,w=h*gate.width/gate.height;c.save();c.translate(G.x,0);if(g===1)c.scale(-1,1);c.drawImage(gate,-w/2,bot+14-h,w,h);c.restore();if(m.time<8||m.status==='countdown')this.label(m.versus?'השער של '+(m.names?.[g]||'שחקן '+(g+1)):g===0?'השער שלכם':'שער היריב',G.x-dir*70,top-H-26,22,g===0?'#0d4f78':'#7a4a00','center');continue;}
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
    // Carrying the pearl: a painted arrow bobs over the goal to score in. No words over the arena.
    const L=this.localSide;if(m.ball.carrier===L&&m.time>=8){const G=GOALS[1-L],k=(this.size||1)*1.35,x=G.x+(L?80:-80),y=G.y-G.half-110-22*k+Math.sin(t*6)*8;c.save();c.globalAlpha=.8+.2*Math.sin(t*6);c.translate(x,y);c.scale(k,k);
      c.beginPath();c.moveTo(-11,-30);c.lineTo(11,-30);c.lineTo(11,-4);c.lineTo(24,-4);c.lineTo(0,22);c.lineTo(-24,-4);c.lineTo(-11,-4);c.closePath();
      c.lineJoin='round';c.lineWidth=6/k*1.2;c.strokeStyle=INK;c.stroke();c.fillStyle='#ffd23a';c.fill();c.restore();}
  }
  drawBall(m,t){const c=this.ctx,B=m.ball,free=B.carrier<0,carrier=free?null:m.actors[B.carrier],lift=free?16+Math.sin(t*4)*3:(carrier.spec.height*(this.size||1)*this.bodyScale(carrier)*.45);
    const x=B.x,y=B.y;if(free){ellipse(c,x,y,16,6,'#00000044');c.save();c.globalAlpha=.45+.25*Math.sin(t*5);ellipse(c,x,y,30+6*Math.sin(t*5),11,null,'#bffcff',3);c.restore();}
    const g=c.createRadialGradient(x-5,y-lift-6,2,x,y-lift,17);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#f7dcea');g.addColorStop(1,'#a58ccf');
    const pearl=this.art.props?.pearl;if(pearl){glow(c,x,y-lift,34,'#e8f6ff88');const s=66/Math.max(pearl.width,pearl.height);c.drawImage(pearl,x-pearl.width*s/2,y-lift-pearl.height*s/2,pearl.width*s,pearl.height*s);}else{glow(c,x,y-lift,30,'#e8f6ff88');c.fillStyle=g;c.strokeStyle='#3a2a4a';c.lineWidth=2;c.beginPath();c.arc(x,y-lift,18,0,Math.PI*2);c.fill();c.stroke();ellipse(c,x-5,y-lift-6,4,2.5,'#ffffff');}
    if(carrier){const hy=carrier.y-carrier.spec.height*(this.size||1)*this.bodyScale(carrier)*(1+.07*(carrier.power||0))-34;for(let i=0;i<3;i++)ellipse(c,carrier.x-18+i*18,hy,6.5,6.5,i<B.hits?'#e8432c':'#f3e6c8','#2a1d11',2);}
  }
  // The light gem fills with the super. Under it, two gold pips count the landed supers toward the Power Form.
  drawLightGem(x,y,ch,color,a=null){const c=this.ctx,full=ch>=1,s=9,form=a?.form>0;c.save();c.translate(x,y);
    const path=()=>{c.beginPath();c.moveTo(0,-s*1.3);c.lineTo(s,0);c.lineTo(0,s*1.3);c.lineTo(-s,0);c.closePath();};
    if(full){c.globalCompositeOperation='lighter';glow(c,0,0,22+4*Math.sin(this.clock*7),color+'aa');c.globalCompositeOperation='source-over';}
    path();c.fillStyle='#0b2430cc';c.fill();c.save();path();c.clip();c.fillStyle=color;c.fillRect(-s,s*1.3-ch*s*2.6,s*2,ch*s*2.6);c.restore();
    path();c.lineWidth=2;c.strokeStyle=form?'#ffd23a':full?'#ffffff':'#e8dcc0';c.stroke();if(full){c.fillStyle='#ffffff';c.fillRect(-1,-s*1.6-4*Math.abs(Math.sin(this.clock*5)),2,4);}
    if(form){c.save();c.translate(0,-s*1.9);crownShape(c,14);c.restore();}
    else if(a&&(a.canForm||a.pips>0)){const P=core.FORM_PIPS??2,n=Math.min(P,a.pips||0),ready=n>=P,bob=ready?Math.abs(Math.sin(this.clock*4))*2:0,img=this.art.fx?.pip;
      for(let i=0;i<P;i++){const px=(i-(P-1)/2)*11,py=s*1.3+8-(i<n?bob:0);if(i<n){if(!sprite(c,img,px,py,11))ellipse(c,px,py,4.5,4.5,'#ffd23a',INK,1.5);}else ellipse(c,px,py,4,4,'#0b2430aa','#e8dcc0',1.5);}}
    c.restore();}
  drawDizzy(a){const c=this.ctx,y=a.y-a.spec.height-30,t=this.clock;c.save();c.globalAlpha=.9;ellipse(c,a.x,y,34,11,null,'#c9a7ff',3);
    for(let i=0;i<3;i++){const ang=t*5+i*2.09;star(c,a.x+Math.cos(ang)*34,y+Math.sin(ang)*11,7,i?'#ffe57a':'#ffffff');}c.restore();}
  drawLightShield(a){const c=this.ctx,t=this.clock,r=a.radius*1.9,cy=a.y-a.spec.height*.45;c.save();c.globalCompositeOperation='lighter';glow(c,a.x,cy,r*1.3,'#fff3b066');c.restore();
    ellipse(c,a.x,cy,r,r*1.05,'#fff6d036','#ffe27a',5);ellipse(c,a.x,cy,r*.9,r*.95,null,'#ffffffaa',2);for(let i=0;i<a.lightShield;i++){const ang=t*2.4+i*Math.PI*2/a.lightShield;c.fillStyle='#fff8d8';star(c,a.x+Math.cos(ang)*r,cy+Math.sin(ang)*r*.4,14,'#fff8d8');}}
  drawRoots(a){const c=this.ctx;c.save();for(let i=0;i<7;i++){const ang=i*.9+.3,len=a.radius*1.6;line(c,[[a.x+Math.cos(ang)*a.radius*1.4,a.y+Math.sin(ang)*a.radius*.6+6],[a.x+Math.cos(ang)*a.radius*.4,a.y-len*.5],[a.x+Math.cos(ang+1)*a.radius*.25,a.y-len]],i%2?'#5c8c2c':'#8fcf55',6);}c.restore();}
  // Shots fly at chest height of the drawn creature (taller on a phone), not from its legs.
  drawShot(s,t,m=this.m) {const c=this.ctx,x=s.x,y=s.y-38*(this.size||1),bouncy=m?.wonder?.id==='bouncy'&&m.wonder.state==='active';ellipse(c,s.x,s.y+1,s.r,s.r*.3,'#12393233');
    if(s.bounced){ellipse(c,x,y,(s.r||8)*2.4,(s.r||8)*2.4,null,INK,6);ellipse(c,x,y,(s.r||8)*2.4,(s.r||8)*2.4,null,'#9be86a',3.5);}
    const a=Math.atan2(s.vy,s.vx);c.save();c.translate(x,y);c.rotate(a);
    {const tl=Math.min(70,Math.hypot(s.vx,s.vy)*.08),col=s.owner===1?'#ff6b8a':s.color||'#ffffff',g=c.createLinearGradient(-tl,0,0,0);g.addColorStop(0,col+'00');g.addColorStop(1,col+'cc');c.save();c.globalCompositeOperation='lighter';c.strokeStyle=g;c.lineCap='round';c.lineWidth=(s.r||8)*1.6;c.beginPath();c.moveTo(-tl,0);c.lineTo(0,0);c.stroke();c.restore();}
    if(bouncy){const q=Math.sin(t*22+(s.id||0));c.scale(1+.14*q,1-.14*q);}
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
  drawWave(w,m,t) {const c=this.ctx,color=w.owner>=0?CREATURES[m.actors[w.owner]?.id]?.color||'#ff7a2c':'#ff7a2c',pct=w.age/w.life;c.save();c.globalAlpha=Math.max(0,1-pct);
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
    if(z.kind==='tornado'){const c=this.ctx;c.save();for(let i=0;i<7;i++){const k=i/7,w=z.r*(.35+k*.75),y=z.y-k*z.r*1.6;c.globalAlpha=.55-k*.05;c.strokeStyle=i%2?'#d9fbfb':'#3cc7c9';c.lineWidth=5;c.beginPath();c.ellipse(z.x+Math.sin(t*9+i)*6,y,w,w*.32,0,t*6+i,t*6+i+Math.PI*1.6);c.stroke();}c.restore();ellipse(c,z.x,z.y,z.r*.8,z.r*.28,'#16626a33');return;}
    if(z.kind==='tidering'){const c=this.ctx,fade=Math.min(1,(z.life-z.age)*2);c.save();c.globalAlpha=.85*fade;ellipse(c,z.x,z.y-10,z.r,z.r*.62,'#2f8fd633','#d6f1ff',5);c.globalAlpha=.6*fade;for(let i=0;i<10;i++){const ang=t*1.8+i*.63;ellipse(c,z.x+Math.cos(ang)*z.r,z.y-10+Math.sin(ang)*z.r*.62,6,4,'#ffffff');}c.restore();return;}
    const c=this.ctx,color={water:'#36c9ed',fire:'#ff7a2c',vortex:'#4f86ff',roots:'#86d957'}[z.kind]||'#ffe56d';c.save();c.globalAlpha=Math.max(0,Math.min(1,(z.life-z.age)*2));
    // The echo: rings gather on the spot, then the sound lands.
    if(z.kind==='echo'){if(!z.done){const pct=Math.min(1,z.age/z.delay);ellipse(c,z.x,z.y,z.r,z.r*.8,'#b7a6ff22','#d9ceff',2);for(let i=0;i<3;i++){const q=((pct+i/3)%1);ellipse(c,z.x,z.y,z.r*(1-q),z.r*.8*(1-q),null,'#b7a6ff',3*q+1);}}c.restore();return;}
    if(z.kind==='bells'){c.restore();return;}
    // A meteor: a gold ring marks where it lands while the rock falls in from the sky.
    if(z.kind==='meteor'){if(!z.done){const pct=Math.min(1,z.age/(z.delay||1.1)),h=(1-pct)*380,r=z.r||50,mx=z.x+h*.4,my=z.y-h;ellipse(c,z.x,z.y,r,r*.8,'#ffd23a22','#ffd23a',3);ellipse(c,z.x,z.y,r*pct,r*.8*pct,'#ff8a2a44');
      c.save();c.setLineDash([7,7]);c.lineDashOffset=-t*30;ellipse(c,z.x,z.y,r*1.12,r*.9,null,'#7a4a00',2);c.restore();
      for(let i=4;i>0;i--)ellipse(c,mx+i*11,my-i*15,11+i*4,8+i*3,i>2?'#ffd25a88':i>1?'#ffb43acc':'#ff7a2c');ellipse(c,mx,my,19,17,'#8a5a36',INK,3);ellipse(c,mx-5,my-5,7,5,'#c08a5a');ellipse(c,mx+6,my+5,4,3,'#5a3a22');}c.restore();return;}
    if(z.kind==='feather'){if(!z.done){const pct=Math.min(1,z.age/z.delay),h=(1-pct)*300,img=this.art.props?.feather;ellipse(c,z.x,z.y,z.r,z.r*.8,'#cfe0ff22','#e7efff',2);ellipse(c,z.x,z.y,z.r*pct,z.r*.8*pct,'#cfe0ff44');
      if(img){const s=64/Math.max(img.width,img.height);c.save();c.translate(z.x+Math.sin(t*5+z.x)*10,z.y-h);c.rotate(Math.sin(t*4+z.y)*.5);c.drawImage(img,-img.width*s/2,-img.height*s/2,img.width*s,img.height*s);c.restore();}}c.restore();return;}
    if(z.kind==='star'){if(!z.done){const pct=Math.min(1,z.age/z.delay),h=(1-pct)*320;ellipse(c,z.x,z.y,z.r,z.r*.8,'#ffe27a22','#ffe27a',2);ellipse(c,z.x,z.y,z.r*pct,z.r*.8*pct,'#ffe27a44');c.globalCompositeOperation='lighter';glow(c,z.x,z.y-h,26,'#fff3b0cc');c.globalCompositeOperation='source-over';c.fillStyle='#fff8d8';star(c,z.x,z.y-h,14,'#fff8d8');}c.restore();return;}
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
      ellipse(c,a.x,a.y,62,43,'#66ffd538','#95ffe2',4);this.label('עכשיו!',a.x,a.y-a.spec.height*(this.size||1)-38,22,'#087050');
    }c.restore();
  }
  drawPickup(p,t) {const c=this.ctx,y=p.y-17+Math.sin(t*3)*4,img=this.art.props?.crystal;if(img){glow(c,p.x,y,54,'#6ff1ad66');ellipse(c,p.x,p.y,24,10,'#00000033');const s=58/Math.max(img.width,img.height);c.drawImage(img,p.x-img.width*s/2,y-img.height*s/2,img.width*s,img.height*s);return;}glow(c,p.x,p.y,50,'#6ff1ad66');ellipse(c,p.x,p.y,28,13,'#76e8be44','#c9ffe4',2);c.save();c.translate(p.x,y);c.rotate(Math.PI/4);c.fillStyle='#5bd5a1';c.strokeStyle='#e7fff5';c.lineWidth=2;c.beginPath();c.roundRect(-12,-12,24,24,4);c.fill();c.stroke();c.restore();line(c,[[p.x-7,y],[p.x+7,y]],'#fff',4);line(c,[[p.x,y-7],[p.x,y+7]],'#fff',4);}
  // Wonder floor layers: frost creeping in from the oval's edge on ice, ink lightning on the rim in a storm.
  drawWonderFloor(m){const W=m.wonder;if(!W||W.state!=='active')return;const A=core.WONDER_TIMES?.active??12,e=Math.max(0,Math.min(1,W.age/.5,(A-W.age)/.5));if(e<=0)return;
    if(W.id==='ice')this.drawFrost(e);else if(W.id==='storm')this.drawStorm(e,W.age);}
  drawFrost(e){const c=this.ctx,{cx,cy,rx,ry}=WORLD;c.save();c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU);c.clip();
    c.save();c.translate(cx,cy);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,rx*.6,0,0,rx);g.addColorStop(0,'#e8f8ff00');g.addColorStop(.72,'#dff4ff55');g.addColorStop(1,'#f4fbffd0');c.globalAlpha=e;c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();
    c.globalAlpha=e*.35;for(let i=0;i<5;i++){const x=cx-rx*.6+i*rx*.3,y=cy-ry*.3+(i%2)*ry*.5;line(c,[[x-40,y+16],[x+40,y-16]],'#ffffff',5);}
    c.globalAlpha=e*.9;for(let i=0;i<22;i++){const a=i/22*TAU+.13,x=cx+Math.cos(a)*rx*.93,y=cy+Math.sin(a)*ry*.92,r=6+(i%3)*2.5;for(let k=0;k<3;k++){const b=k*Math.PI/3+i;line(c,[[x-Math.cos(b)*r,y-Math.sin(b)*r],[x+Math.cos(b)*r,y+Math.sin(b)*r]],'#7fb8e0',3.5);line(c,[[x-Math.cos(b)*r,y-Math.sin(b)*r],[x+Math.cos(b)*r,y+Math.sin(b)*r]],'#ffffff',1.6);}}
    c.restore();}
  drawStorm(e,age){const c=this.ctx,{cx,cy,rx,ry}=WORLD;c.save();c.beginPath();c.ellipse(cx,cy,rx*1.06,ry*1.08,0,0,TAU);c.clip();
    c.save();c.translate(cx,cy);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,rx*.75,0,0,rx*1.06);g.addColorStop(0,'#1d2a5a00');g.addColorStop(1,'#1d2a5a88');c.globalAlpha=e;c.fillStyle=g;c.fillRect(-rx*1.1,-rx*1.1,rx*2.2,rx*2.2);c.restore();
    const b=Math.floor(age/.24),q=(age%.24)/.24;for(let k=0;k<3;k++){const R=rnd(b*7+k*13+1),a=R()*TAU,x0=cx+Math.cos(a)*rx*1.03,y0=cy+Math.sin(a)*ry*1.03,d=Math.hypot(cx-x0,cy-y0)||1,ux=(cx-x0)/d,uy=(cy-y0)/d,pts=[[x0,y0]];
      for(let i=1;i<=6;i++){const side=(i%2?1:-1)*(10+R()*10);pts.push([x0+ux*i*17-uy*side,y0+uy*i*13+ux*side*.7]);}
      const [ex,ey]=pts[pts.length-1];c.globalAlpha=e*(1-q*q);c.lineJoin='miter';line(c,pts,INK,9);line(c,pts,'#e6eeff',3.5);star5(c,ex,ey,9,'#cfe0ff',INK,2.5);}
    c.restore();}
  // The Wonder seed: a sprout, then a bud over a ring of light; when ready the bloom bobs with three specks. What it is stays a surprise.
  drawSeed(m){const W=m.wonder;if(!W||W.x==null||(W.state!=='sprout'&&W.state!=='ready'))return;const c=this.ctx,f=this.size||1,t=this.clock,S=core.WONDER_TIMES?.sprout??2,sprout=W.state==='sprout',g=sprout?Math.min(1,W.age/S):1,fx=this.art.fx||{};
    c.save();c.globalAlpha=.35+.35*g;ellipse(c,W.x,W.y,62*f*g,24*f*g,'#fff3c488',null);c.globalAlpha=.7+.3*g;ellipse(c,W.x,W.y,62*f*g,24*f*g,null,'#7a4a00',5);if(!sprout){c.setLineDash([10,8]);c.lineDashOffset=-t*24;}ellipse(c,W.x,W.y,62*f*g,24*f*g,null,'#ffe27a',3);c.restore();
    const stage=sprout?(W.age<S*.5?1:2):3,bob=sprout?0:Math.sin(t*3)*4*f,h=(sprout?.45+.55*g:1)*74*f,img=fx['seed-'+stage];
    if(!sprite(c,img,W.x,W.y+4-bob,h*(img?img.width/img.height:1),0,1,1))sproutShape(c,W.x,W.y-bob,h,stage);
    if(!sprout)for(let i=0;i<3;i++){const a=t*2.2+i*TAU/3;star(c,W.x+Math.cos(a)*40*f,W.y-h*.6+Math.sin(a)*14*f-bob,5,'#fff3b0');}}
  drawEffect(e,m=this.m) {const c=this.ctx,p=e.age,f=this.size||1;c.save();c.globalAlpha=Math.max(0,1-p*1.4);
    // A hit is the attacker's painted splat: it pops from .55 to 1.1 in 120 ms and is gone by 350 ms, with paper flecks and a chunky number.
    if(e.type==='hit'){const tg=(e.side!=null&&m?.actors?.[e.side])||this.nearest(e,m),th=tg?tg.spec.height*this.bodyScale(tg)+(tg.spec.flies?24:0):96,hy=e.y-th*.45*f,fam=e.fam||this.guessFam(e,m),img=this.art.fx?.['splat-'+fam],big=(e.special?1.3:1)*(e.form?1.15:1),R=rnd(seedOf(e.x,e.y));c.globalAlpha=1;
      if(p<.35){const sc=(.55+.55*ease(p/.12))*big,a=p<.2?1:1-(p-.2)/.15,rot=(e.x*13+e.y*7)%TAU,size=84*f*sc;if(!sprite(c,img,e.x,hy,size,rot,a))splatShape(c,e.x,hy,size*.42,rot,FAM_COLOR[fam]||'#ffe08a',a);}
      if(!this.lite&&p<.4){const n=3+Math.floor(R()*3);for(let i=0;i<n;i++){if(this.budget--<=0)break;const ang=-Math.PI/2+(R()-.5)*2.6,v=220+R()*260,x=e.x+Math.cos(ang)*v*p,y=hy+Math.sin(ang)*v*p+450*p*p,rot=R()*TAU+p*9,img2=this.art.fx?.['fleck-'+(i%4+1)];if(!sprite(c,img2,x,y,13*f,rot,1-p/.4))bitShape(c,x,y,8*f,rot,i%2?CREAM:FAM_COLOR[fam]||CREAM,1-p/.4);}}
      // The number: hits on one creature within 150 ms add up into one; bigger on a small phone screen; never up in the HUD band.
      if(e.amount>0){if(e.num==null)this.mergeNumber(e,m);
        if(e.num>0){const t=Math.min(1,p/.6),q=p-(e.popAt||0),pop=q<.12?1.3-.3*(q/.12):1,a=Math.min(p<.6?1:Math.max(0,1-(p-.6)/.3),e.cut!=null?.25*Math.max(0,1-(p-e.cut)/.15):1),big=this.scale<.6?Math.min(1.5,.78/Math.max(.3,this.scale)):1,size=26*f*big,
          top=this.numberTop>0?(this.numberTop-this.offsetY)/this.scale+size*.65:-1e9;
          // Numbers on two creatures standing close (both pushed down under the HUD band, say) never share a line: the later one steps down.
          const x0=e.x+e.jx,y1=Math.max(top,e.y-(th+30)*f-30*t),w0=((String(Math.round(e.num)).length+1)*.62+.4)*size*pop;let y0=y1+(e.ny||0);
          for(const b of this.numBoxes||[])if(Math.abs(b.x-x0)<(b.w+w0)/2&&Math.abs(b.y-y0)<size)y0=b.y+size*1.05;e.ny=Math.max(e.ny||0,y0-y1);y0=y1+e.ny;(this.numBoxes||=[]).push({x:x0,y:y0,w:w0});
          c.save();c.globalAlpha=a;c.translate(x0,y0);c.scale(pop,pop);inkText(c,'‎−'+Math.round(e.num),0,0,size,e.numForm?'#ffb000':e.numSpecial?'#ffd23a':'#ffffff',INK,5);c.restore();}}}
    // A shot that strikes stone: a little dust and chips. 'chip' is a rock being chipped by a shot.
    if(e.type==='stone'||e.type==='chip'){const big=e.type==='chip';c.globalAlpha=1;if(p<.45&&!sprite(c,this.art.fx?.puff,e.x,e.y-20*f,(big?30:24)*f*(1+p*1.6),0,1-p/.45))ellipse(c,e.x,e.y-20*f,(10+p*30)*f,(7+p*20)*f,'#fff4dc99');this.drawChips(e,big?3:2,big?.6:.45);}
    if(e.type==='heal')this.label('+'+Math.round(e.amount),e.x,e.y-110-p*40,25,'#0b8761');
    if(e.type==='evade')this.label('חמיקה!',e.x,e.y-110-p*35,18,'#176b92');
    if(e.type==='starfall'){const q=Math.min(1,p*2.2),b=this.art.props?.['burst-star'];c.save();c.globalAlpha=1-q;c.globalCompositeOperation='lighter';glow(c,e.x,e.y-10,(e.r||54)*1.6,'#fff3b0cc');if(b){const sz=(e.r||54)*(1.4+q*1.2);c.drawImage(b,e.x-sz/2,e.y-10-sz/2,sz,sz);}c.restore();}
    if(e.type==='echo'){const r=(e.r||84)*(.6+p*1.1);c.save();c.globalCompositeOperation='lighter';for(let i=0;i<3;i++)ellipse(c,e.x,e.y-14,r*(1-i*.22),r*.75*(1-i*.22),null,i===1?'#ffffff':(e.color||'#b7a6ff'),5-i);c.restore();}
    if(e.type==='thread'&&e.from&&e.to){c.save();c.globalCompositeOperation='lighter';c.setLineDash([10,6]);line(c,[[e.to.x,e.to.y-45],[(e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2-80],[e.x,e.y-45]],'#e9fbff',5);c.setLineDash([]);line(c,[[e.to.x,e.to.y-45],[e.x,e.y-45]],e.color||'#9fe8ff',2);c.restore();}
    if(e.type==='stitch'){for(let i=0;i<8;i++){const ang=i*.785+p*3,r=18+p*46;line(c,[[e.x+Math.cos(ang)*r,e.y-30+Math.sin(ang)*r*.6],[e.x+Math.cos(ang+.35)*(r+10),e.y-30+Math.sin(ang+.35)*(r+10)*.6]],i%2?'#fff3c4':(e.color||'#ffd27a'),4*(1-p));}}
    if(e.type==='light-block')this.label('מגן אור!',e.x,e.y-120-p*30,18,'#9a7a1c');
    if(e.type==='guard-block')this.label('מגן',e.x+22,e.y-83-p*30,16,'#8e5b14');
    if(e.type==='weak-hit')ellipse(c,e.x,e.y-45,25+p*35,25+p*35,null,'#7effd9',3);
    if(e.type==='ember'){for(let i=0;i<10;i++){const ang=i*.63,r=10+p*70;ellipse(c,e.x+Math.cos(ang)*r,e.y-50+Math.sin(ang)*r*.6,4*(1-p),4*(1-p),'#ffb43a');}this.label('+כוח',e.x,e.y-130-p*30,22,'#8a2c0a');}
    if(e.type==='burn')ellipse(c,e.x,e.y-20-p*30,6*(1-p),6*(1-p),'#ff7a2c');
    if(e.type==='blown'){for(let i=0;i<12;i++){const ang=i*.52,r=p*120;ellipse(c,e.x+Math.cos(ang)*r,e.y-50+Math.sin(ang)*r*.6,7*(1-p),3*(1-p),'#cfffff');}this.label('נוצות עפו!',e.x,e.y-110-p*30,22,'#16626a');}
    if(e.type==='goal'){for(let i=0;i<18;i++){const ang=i*.35,r=20+p*190;ellipse(c,e.x+Math.cos(ang)*r*.6,e.y-40+Math.sin(ang)*r,8*(1-p),8*(1-p),i%2?'#ffe08a':'#ffffff');}}
    if(e.type==='swap'){ellipse(c,e.x,e.y,40+p*120,(40+p*120)*.4,null,e.color||'#fff',5);}
    if(e.type==='big-kick'){ellipse(c,e.x,e.y,30+p*90,(30+p*90)*.4,null,e.color||'#fff',4);}
    if(e.type==='roar'){c.save();c.translate(e.x,e.y-40);c.rotate(e.angle);c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,0,e.reach,0);g.addColorStop(0,'#fff1a8');g.addColorStop(.5,(e.color||'#ff8a2a')+'cc');g.addColorStop(1,'#ff3b1a00');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.arc(0,0,e.reach*(.6+p*.6),-e.half,e.half);c.closePath();c.fill();c.restore();}
    if(e.type==='dizzy')this.label('מהופנט!',e.x,e.y-125-p*30,22,'#6b3fbf');
    if(e.type==='rooted')this.label('נתפס!',e.x,e.y-120-p*30,22,'#2f6a1c');
    if(e.type==='burrow'){for(let i=0;i<6;i++){const q=i/5;ellipse(c,e.from.x+(e.x-e.from.x)*q,e.from.y+(e.y-e.from.y)*q,16*(1-p),7*(1-p),'#8a5a2c99');}ellipse(c,e.x,e.y,40+p*40,16+p*16,null,'#e0a96d',4);}
    if(e.type==='silenced')this.label('שקט!',e.x,e.y-125-p*30,22,'#24306b');
    if(e.type==='hear'||e.type==='bells'||e.type==='reveal'||e.type==='rise'){const r=(e.type==='rise'?90:50)+p*(e.type==='rise'?170:110);c.save();c.globalCompositeOperation='lighter';ellipse(c,e.x,e.y-30,r,r*.6,null,e.color||'#ffffff',5*(1-p)+1);ellipse(c,e.x,e.y-30,r*.7,r*.42,null,'#ffffff',2);c.restore();}
    if(e.type==='featherfall'){c.save();c.globalCompositeOperation='lighter';glow(c,e.x,e.y-10,(e.r||52)*1.5*(1-p*.5),'#e7efffbb');c.restore();for(let i=0;i<8;i++){const ang=i*.785,r=10+p*60;ellipse(c,e.x+Math.cos(ang)*r,e.y-10+Math.sin(ang)*r*.5,6*(1-p),2.5*(1-p),'#ffffff');}}
    if(e.type==='echo-step'||e.type==='echo-song'){const big=e.type==='echo-song',r=40+p*(big?160:80);c.save();c.globalCompositeOperation='lighter';ellipse(c,e.x,e.y,r,r*.66,null,e.color||'#ffffff',(big?8:5)*(1-p)+1);if(big)for(let i=0;i<12;i++){const ang=i*.52,rr=20+p*150;star(c,e.x+Math.cos(ang)*rr,e.y-30+Math.sin(ang)*rr*.6,8*(1-p),'#fff3b0');}c.restore();}
    if(e.type==='echo-miss'){ellipse(c,e.x,e.y,50+p*30,(50+p*30)*.66,'#ff8f7a22',e.color||'#ff8f7a',4*(1-p)+1);}
    if(e.type==='pounce'){ellipse(c,e.x,e.y,30+p*80,(30+p*80)*.4,null,e.color||'#fff',5);}
    if(e.type==='blink'&&e.from){for(let i=1;i<=5;i++){const t=i/5;ellipse(c,e.from.x+(e.x-e.from.x)*t,e.from.y+(e.y-e.from.y)*t-30,12*(1-p),22*(1-p),(e.color||'#ffffff')+'77');}}
    // A near-miss leaves an ink afterimage of the dodger where the shot passed.
    if(e.type==='afterimage'&&p<.5){const a=m?.actors?.[e.side],pp=this.puppets[e.side];if(pp){const S=f*(a?this.bodyScale(a):1),id=e.id||a?.id,lift=CREATURES[id]?.flies?24:0;c.globalAlpha=1;drawPuppet(c,pp,e.x,e.y-lift*S,(a?.spec?.height||CREATURES[id]?.height||100)*S,{flip:facesLeft(id)?(e.facing??a?.facing??1)>0:(e.facing??a?.facing??1)<0,clip:cur(pp),dt:0,silhouette:'#2b2f7a',alpha:.45*(1-p/.5)});}}
    // The painted cocoon the Power Form bursts out of.
    if(e.type==='cocoon'){const a=m?.actors?.[e.side],x=a&&!(a.out>0)?a.x:e.x,y=a&&!(a.out>0)?a.y:e.y,h=(a?.spec?.height||100)*f*1.1;c.globalAlpha=1;
      if(p<.45){const grow=p<.25?.5+.55*ease(p/.25):1.05+.4*(p-.25)/.2,a2=p<.25?1:1-(p-.25)/.2,wob=Math.sin(p*60)*.05,img=tint(this.art.fx?.cocoon,e.color||'#ffd23a',.45);
        if(!sprite(c,img,x,y+4,h*.72*grow,wob,a2,1))for(let i=-1;i<=1;i++)petalShape(c,x+i*h*.14*grow,y-h*.42*grow,h*.5*grow,i*.35+wob,e.color||CREAM,a2);}}
    if(e.type==='ko'){c.globalAlpha=1;const pp=this.puppets[e.side],h=(CREATURES[e.id]?.height||100)*f;
      if(pp)drawPuppet(c,pp,e.x,e.y,h,{flip:facesLeft(e.id)?(e.facing??1)>0:(e.facing??1)<0,clip:'defeat',dt:this.dt,silhouette:'#2b2f7a',alpha:.6*(1-p)});
      if(p<.4&&!sprite(c,this.art.fx?.puff,e.x,e.y-h*.3,h*(.6+p*1.4),0,1-p/.4))ellipse(c,e.x,e.y-h*.3,h*(.3+p),h*(.2+p*.6),'#fff4dcaa');
      if(p<.9){const y=e.y-h-20;for(let i=0;i<3;i++){const a=this.clock*5+i*2.09;star(c,e.x+Math.cos(a)*30,y+Math.sin(a)*10,7,i?'#ffe57a':'#ffffff');}}}
    if(e.type==='meteorfall'){c.globalAlpha=1;const r=e.r||50;if(p<.4&&!sprite(c,this.art.fx?.['splat-fire'],e.x,e.y-12,r*2.3*(.6+p*1.5),e.x%6,1-p/.4))splatShape(c,e.x,e.y-12,r*(.6+p),e.x%6,'#ff8a2a',1-p/.4);this.drawChips(e,4,.55);ellipse(c,e.x,e.y,r*(1+p),r*.8*(1+p),null,'#7a4a00',3*(1-p));}
    if(e.type==='wonder-puff'){c.globalAlpha=1;if(!sprite(c,this.art.fx?.puff,e.x,e.y-20,(70+p*90)*f,0,Math.max(0,1-p)))ellipse(c,e.x,e.y-20,(30+p*50)*f,(22+p*34)*f,'#fff4dcaa');for(let i=0;i<6;i++){const a=i*TAU/6,r=(20+p*80)*f;ellipse(c,e.x+Math.cos(a)*r,e.y-20+Math.sin(a)*r*.5,4*(1-p),4*(1-p),CREAM,INK,1);}}
    // The Little Shadow lends his star: it drops onto the child's creature and rings out.
    if(e.type==='star-lend'){c.globalAlpha=1;const a=m?.actors?.[0],x=a?a.x:e.x,y=a?a.y:e.y,h=(a?.spec?.height||100)*f;if(p<.35){const q=ease(p/.35);star5(c,x,y-h-220*(1-q),18*f,e.color||'#ffe27a',INK,3);}else{const q=(p-.35)/.65;ellipse(c,x,y-h*.5,(30+q*110)*f,(20+q*70)*f,null,e.color||'#ffe27a',5*(1-q)+1);for(let i=0;i<6;i++){const g=i*TAU/6+q;star(c,x+Math.cos(g)*(30+q*90)*f,y-h*.5+Math.sin(g)*(18+q*50)*f,6*(1-q)+1,'#fff3b0');}}}
    // A rival about to burst into its Power Form: gold eyes and a little crown that blinks over its head.
    if(e.type==='tell'&&e.kind==='form'){c.globalAlpha=1;const a=m?.actors?.find?.(x=>x.side===e.side)||this.nearest(e,m),x=a?.x??e.x,h=(a?.spec?.height||100)*f*(a?this.bodyScale(a):1),y=(a?.y??e.y)-h,blink=Math.sin(this.clock*14)>-.3;
      if(blink){c.save();c.translate(x,y-18*f);crownShape(c,26*f);c.restore();}for(const s of [-1,1])ellipse(c,x+s*8*f,y+h*.22,3.5*f,2.5*f,'#ffd23a',INK,1);}
    c.restore();
  }
  drawChips(e,n,life){const c=this.ctx,p=e.age,f=this.size||1;if(p>=life)return;const R=rnd(seedOf(e.x,e.y)+7);for(let i=0;i<n;i++){if(this.budget--<=0)return;const ang=-Math.PI/2+(R()-.5)*2.2,v=170+R()*150,x=e.x+Math.cos(ang)*v*p,y=e.y-24*f+Math.sin(ang)*v*p+450*p*p,rot=R()*TAU+p*10,img=this.art.fx?.['chip-'+(i%3+1)],a=1-p/life;if(!sprite(c,img,x,y,(12+R()*6)*f,rot,a))bitShape(c,x,y,9*f,rot,'#8f8a7a',a);}}
  nearest(e,m){let best=null,bd=Infinity;for(const a of m?.actors||[]){if(a.out>0)continue;const d=Math.hypot(a.x-e.x,a.y-e.y);if(d<bd){bd=d;best=a;}}return best;}
  // Hits on one creature within 150 ms read as one number: the first one adds up the others and pops again.
  // A hit up to .6 s after the last one carries the running total ('-28') and pops it again where it lands; the older number
  // goes at once. A total runs for at most 1.2 s; then a fresh number starts and the older one drops to a faint quarter.
  // Two numbers never stand at full strength on one creature, so '-14' over '-14' never reads as '-144'.
  mergeNumber(e,m){e.num=e.amount;e.numSpecial=!!e.special;e.numForm=!!e.form;e.jx=(rnd(seedOf(e.x,e.y)+7)()-.5)*18;e.run=0;
    const same=(m?.effects||[]).filter(f=>f!==e&&f.type==='hit'&&f.num>0&&f.side===e.side&&f.age>=e.age),live=same.filter(f=>f.cut==null),lead=live.find(f=>f.age-e.age<=.15);
    if(lead){lead.num+=e.amount;lead.numSpecial||=e.numSpecial;lead.numForm||=e.numForm;lead.popAt=lead.age;e.num=0;return;}
    const last=live.filter(f=>f.age-e.age<=.6).sort((x,y)=>x.age-y.age)[0];
    if(last&&(last.run||0)+last.age-e.age<=1.2){e.num+=last.num;e.numSpecial||=last.numSpecial;e.numForm||=last.numForm;e.jx=last.jx;e.run=(last.run||0)+last.age-e.age;last.num=0;}
    for(const f of same)if(f.num>0)f.cut??=f.age;}
  // Older cores send no family with a hit: the target is whoever stands nearest, so the attacker is a foe of theirs.
  guessFam(e,m){if(e.by>=0&&m?.actors?.[e.by])return famOf(m.actors[e.by].id);const t=this.nearest(e,m),o=t&&m.actors.find(a=>a.side!==t.side&&(t.side===1||a.side===1));return o?famOf(o.id):'stone';}
  // ---- Moments the battle asks for. World ones follow the creature; screen ones live in CSS pixels and run on real time.
  burst(x,y,kind='inkstar'){this.bursts.push({x,y,kind,start:this.clock,n:this.bursts.length});if(this.bursts.length>24)this.bursts.shift();}
  superMoment(side,id,{full=true,mega=false}={}){const a=this.m?.actors?.[side];id=CREATURES[id]?id:a?.id;const col=CREATURES[id]?.color||'#ffd23a';
    this.moments.push({kind:'frame',side,col,mega,start:this.clock,dur:.65});
    const rect=full&&id&&loaded.has(id)?this.cutinPick(side):null;
    if(rect){if(this.cutinIds[side]!==id||!this.cutins[side]){this.cutins[side]=createPuppet(id);this.cutinIds[side]=id;}this.cutins[side].animator.play('attack',{fade:0,restart:true});this.moments.push({kind:'cutin',side,id,col,mega,rect,start:this.clock,dur:.5});}
    if(this.moments.length>12)this.moments.splice(0,this.moments.length-12);}
  rivalSuper(side){this.moments.push({kind:'rival',side,start:this.clock,dur:.6});}
  // Two linocut frames at the moment a child's super lands. Never more than one per 2 s or three per 10 s, never in lite or calm-motion mode.
  impactFrame(){if(this.lite||this.reduced)return false;const t=this.clock;this.impacts=this.impacts.filter(x=>t-x<10&&x<=t);if(this.impacts.length>=3||this.impacts.some(x=>t-x<2))return false;this.impacts.push(t);this.impact=2;return true;}
  formMoment(side){this.moments.push({kind:'form',side,start:this.clock,dur:.8});}
  confetti(){const n=this.lite||this.reduced?30:60,R=rnd(4242+Math.round(this.clock*10));this.bits=[];for(let i=0;i<n;i++){const left=i%2===0;this.bits.push({left,vx:(140+R()*320),vy:-(560+R()*340),spin:(R()-.5)*14,rot:R()*TAU,size:9+R()*7,img:'fleck-'+(i%4+1),col:['#ff6b6b','#ffd23a','#49d9ef','#86d957','#b88cff',CREAM][i%6],ph:R()*TAU});}this.confettiAt=this.clock;return 1.8;}
  liberate(side,target,{short=false}={}){const a=this.m?.actors?.[side];if(!a)return 0;const T1=1.2*(short?.6:1),R=rnd(77+side);
    this.fin[side]={kind:'liberate',start:this.clock,T1,short,dur:T1+.5,target:target&&isFinite(target.x)&&isFinite(target.y)?target:{x:(this.w||800)/2,y:24},
      flakes:Array.from({length:24},(_,i)=>({ox:(R()-.5)*1.1,oy:.12+R()*.78,delay:i/24*T1*.38,dur:T1*.6,img:'flake-'+(i%6+1),rot:R()*TAU,spin:(R()-.5)*7,bend:(R()-.5)*1.6,size:15+R()*11}))};
    return T1+.5;}
  loserPuff(side){if(!this.m?.actors?.[side])return 0;this.fin[side]={kind:'puff',start:this.clock,dur:.9};return .9;}
  sitUp(side){if(!this.m?.actors?.[side])return 0;this.fin[side]={kind:'sit',start:this.clock,dur:1.3};return 1.3;}
  skipFinale(){for(const F of Object.values(this.fin))if(F?.kind==='liberate'&&F.short&&this.clock-F.start<F.dur){F.start=this.clock-F.dur;F.landed=1;return true;}return false;}
  drawWorldMoments(m){const c=this.ctx,f=this.size||1,now=this.clock,fx=this.art.fx||{};
    this.bursts=this.bursts.filter(b=>now-b.start<.9);
    for(const b of this.bursts){const u=now-b.start;if(this.budget--<=0)break;
      if(b.kind==='inkstar'){if(u<.5){const sc=u<.18?.4+.75*ease(u/.18):1.15,a=u<.3?1:1-(u-.3)/.2;if(!sprite(c,fx.inkstar,b.x,b.y-50*f,64*f*sc,u*3,a))star5(c,b.x,b.y-50*f,26*f*sc,'#2b2f7a',CREAM,3);for(let i=0;i<6;i++){const g=i*TAU/6+.3,r=(20+u*130)*f;ellipse(c,b.x+Math.cos(g)*r,b.y-50*f+Math.sin(g)*r*.7,4*(1-u*2),4*(1-u*2),INK);}}}
      else if(b.kind==='puff'){if(u<.45&&!sprite(c,fx.puff,b.x,b.y-24*f,(40+u*80)*f,0,1-u/.45))ellipse(c,b.x,b.y-24*f,(16+u*40)*f,(12+u*28)*f,'#fff4dcaa');}
      else if(b.kind==='blossom'){for(let i=0;i<5;i++){const v=u-i*.05;if(v<0||v>.85)continue;const g=i*TAU/5+.4,r=(26+v*60)*f,sc=v<.15?v/.15:1,a=v<.5?1:1-(v-.5)/.35;if(!sprite(c,fx['blossom-'+(i%4+1)],b.x+Math.cos(g)*r,b.y+Math.sin(g)*r*.6,24*f*sc,v*2,a))flowerShape(c,b.x+Math.cos(g)*r,b.y+Math.sin(g)*r*.6,24*f*sc,v*2,CREAM,a);}}}
    for(const M of this.moments)if(M.kind==='form'){const u=now-M.start,a=m.actors[M.side];if(!a||u>M.dur)continue;const col=FAM_COLOR[famOf(a.id)],cy=a.y-a.spec.height*.5*f*this.bodyScale(a),reduced=this.reduced;
      for(let i=0;i<10;i++){if(this.budget--<=0)break;let r,g,al;if(u<.35){const q=u/.35;r=(170-150*ease(q))*f;g=i*TAU/10+q*(reduced?0:3);al=Math.min(1,q*3);}else{const q=(u-.35)/.45;r=(20+220*ease(q))*f;g=i*TAU/10+3+q*.8;al=1-q;}
        const x=a.x+Math.cos(g)*r,y=cy+Math.sin(g)*r*.6,img=tint(fx['petal-'+(i%3+1)],col);if(!sprite(c,img,x,y,26*f,g+Math.PI/2,al))petalShape(c,x,y,22*f,g+Math.PI/2,col,al);}}
    for(const [side,F] of Object.entries(this.fin)){const a=m.actors[side];if(!F||!a)continue;const T=now-F.start;
      if(F.kind==='liberate'&&T>=F.T1)for(let i=0;i<8;i++){const v=T-F.T1-.05-i*.05;if(v<0||v>.9)continue;if(this.budget--<=0)break;const g=i*TAU/8,x=a.x+Math.cos(g)*a.radius*2.4*f,y=a.y-a.spec.height*.45*f+Math.sin(g)*a.spec.height*.42*f,sc=v<.15?ease(v/.15):1,al=v<.6?1:1-(v-.6)/.3;if(!sprite(c,fx['blossom-'+(i%4+1)],x,y,30*f*sc,v,al))flowerShape(c,x,y,28*f*sc,v,['#fff4dc','#ffb3c1','#ffd23a','#9fd8ff'][i%4],al);}
      if(F.kind==='puff'&&T<.5){const img=tint(fx.puff,'#3a2a55');if(!sprite(c,img,a.x,a.y-a.spec.height*.4*f,(60+T*90)*f,0,1-T/.5))ellipse(c,a.x,a.y-a.spec.height*.4*f,(25+T*40)*f,(18+T*28)*f,'#3a2a55aa');}
      if(F.kind==='sit'&&T>.5&&T<1){for(const s of [-1,1]){const q=((T-.5)*2.2+(s>0?.5:0))%1;if(!sprite(c,fx.puff,a.x+s*(a.radius+8+q*18)*f,a.y-6*f-q*10*f,(16+q*18)*f,0,1-q))ellipse(c,a.x+s*(a.radius+8+q*18)*f,a.y-6*f-q*10*f,(6+q*8)*f,(5+q*6)*f,'#fff4dcaa');}}}}
  // Screen-space pass: brush frames, the cut-in, the rival's edge stroke, freed ink flakes and confetti.
  oval(){return {x:this.offsetX+WORLD.cx*this.scale,y:this.offsetY+WORLD.cy*this.scale,rx:WORLD.rx*this.scale,ry:WORLD.ry*this.scale};}
  clipOutsideOval(){const c=this.ctx,o=this.oval();c.beginPath();c.rect(0,0,this.w,this.h);c.moveTo(o.x+o.rx,o.y);c.ellipse(o.x,o.y,o.rx,o.ry,0,0,TAU,true);c.clip();}
  screenX(side){const a=this.m?.actors?.[side];return a?this.offsetX+a.x*this.scale:side===1?this.w:0;}
  // Where the cut-in goes: the strip between the HUD and the oval top; on a phone, where that strip is too thin, the top corner beside the oval.
  cutinRect(side){const o=this.oval(),top=(this.hudBottom||0)+2,band=o.y-o.ry-top,left=this.screenX(side)<this.w/2;
    if(band>=48){const h=Math.min(band,150),w=Math.min(this.w*.48,h*3.2);return {x:left?0:this.w-w,y:top+(band-h)/2,w,h,left,corner:false};}
    // The corner banner starts a little below the HUD band, so its painted edge never touches the pause button.
    const h=Math.min(this.h*.3,112),w=Math.min(this.w*.3,h*1.7);return h<48?null:{x:left?0:this.w-w,y:top+10,w,h,left,corner:true};}
  // The cut-in never covers a creature or the number over its head: the other side when the near one is taken, else no cut-in
  // (the brush frame still plays). Chosen once, where everyone stands as the super starts.
  cutinPick(side){const r=this.cutinRect(side);if(!r)return null;const alt={...r,left:!r.left,x:r.left?this.w-r.w:0};return [r,alt].find(q=>!this.coversActor(q))||null;}
  coversActor(r){const k=this.scale||1,f=this.size||1,pad=12;
    return (this.m?.actors||[]).some(a=>{if(a.out>0||a.side===1&&this.hidden)return false;const x=this.offsetX+a.x*k,y=this.offsetY+a.y*k,b=this.bodyScale(a),h=((a.spec.height*b+(a.spec.flies?32:0)+30)*f+64)*k,w=Math.max(a.radius*3,a.spec.height*.75)*b*f*k;
      return x+w/2+pad>r.x&&x-w/2-pad<r.x+r.w&&y+pad>r.y&&y-h-pad<r.y+r.h;});}
  drawScreenMoments(m){const c=this.ctx,now=this.clock;this.moments=this.moments.filter(M=>now-M.start<M.dur);
    for(const M of this.moments){const u=(now-M.start)/M.dur;if(M.kind==='frame')this.drawBrushFrame(M,u);else if(M.kind==='cutin')this.drawCutin(M,u);else if(M.kind==='rival')this.drawRivalStroke(M,u);}
    for(const [side,F] of Object.entries(this.fin))if(F?.kind==='liberate')this.drawFlakes(F,m.actors[side]);
    if(this.bits.length){const T=now-this.confettiAt;if(T>1.8)this.bits=[];else this.drawConfetti(T);}}
  drawBrushFrame(M,u){const c=this.ctx,ti=.15/.65,to=.45/.65,e=u<ti?ease(u/ti):u>to?1-ease((u-to)/(1-to)):1,still=this.reduced,L=Math.max(this.w,this.h)*.31,col=M.mega?'#ffd23a':M.col;
    c.save();this.clipOutsideOval();[[0,0,1,1],[this.w,0,-1,1],[0,this.h,1,-1],[this.w,this.h,-1,-1]].forEach(([x,y,dx,dy],i)=>{const off=still?0:(1-e)*L*.8,img=tint(this.art.fx?.['stroke-'+(i+1)],col);
      c.save();c.globalAlpha=still?e:Math.min(1,e*1.6);c.translate(x-dx*off,y-dy*off);c.scale(dx,dy);
      if(img){const w=L*.85;c.rotate(-.12);c.drawImage(img,-w*.18,-w*.16,w,w*img.height/img.width);if(M.mega){c.globalAlpha*=.6;c.drawImage(img,w*.05,w*.02,w*.8,w*.8*img.height/img.width);}}
      else{c.lineCap='round';c.beginPath();c.moveTo(-6,L*.85);c.quadraticCurveTo(L*.1,L*.1,L*.85,-6);c.lineWidth=L*.11;c.strokeStyle=INK;c.stroke();c.lineWidth=L*.08;c.strokeStyle=col;c.stroke();}
      c.restore();});c.restore();}
  drawCutin(M,u){const r=M.rect||this.cutinRect(M.side),p=this.cutins[M.side];if(!r||!p)return;const c=this.ctx,e=u<.24?ease(u/.24):u>.76?ease((1-u)/.24):1,dx=(r.left?-1:1)*(1-e)*(r.w+30);
    c.save();if(r.corner)this.clipOutsideOval();c.translate(r.x+dx,r.y);
    // The banner's ragged end points away from the edge it comes from.
    c.save();if(!r.left){c.translate(r.w,0);c.scale(-1,1);}const img=tint(this.art.fx?.banner,M.col,.35);if(img)c.drawImage(img,-r.w*.04,-r.h*.06,r.w*1.08,r.h*1.12);
    else{c.beginPath();c.moveTo(0,0);c.lineTo(r.w,0);c.lineTo(r.w-r.h*.32,r.h);c.lineTo(0,r.h);c.closePath();c.fillStyle=CREAM;c.fill();c.lineWidth=3;c.strokeStyle=INK;c.stroke();c.fillStyle=M.col;c.globalAlpha=.35;c.fillRect(0,r.h*.78,r.w-r.h*.25,r.h*.12);c.globalAlpha=1;}c.restore();
    c.beginPath();c.rect(0,0,r.w,r.h);c.clip();const ph=r.h*.9,size=p.rig.artworkSize,cx=Math.min(r.w*.34,ph*size.width/size.height*.5+10),x=r.left?cx:r.w-cx,face=r.left?1:-1;
    drawPuppet(c,p,x,r.h*.97,ph,{clip:'attack',dt:this.realDt,flip:facesLeft(M.id)?face>0:face<0});c.restore();}
  drawRivalStroke(M,u){const c=this.ctx,left=this.screenX(M.side)<this.w/2,a=u<.15?u/.15:u>.6?Math.max(0,1-(u-.6)/.4):1,H=this.h,img=this.art.fx?.['stroke-4'];
    c.save();this.clipOutsideOval();c.globalAlpha=a;c.translate(left?0:this.w,H/2);if(!left)c.scale(-1,1);
    if(img){const red=tint(img,'#c43c5a'),ink=tint(img,'#2b2f7a'),h=H*1.05,w=h*img.width/img.height;c.translate(Math.min(46,this.w*.05),0);c.rotate(-.55);c.drawImage(ink,-w/2+5,-h/2+4,w,h);c.drawImage(red,-w/2,-h/2,w,h);}
    else{c.lineCap='round';c.beginPath();c.moveTo(8,-H*.44);c.quadraticCurveTo(34,0,8,H*.44);c.lineWidth=24;c.strokeStyle='#2b2f7a';c.stroke();c.lineWidth=15;c.strokeStyle='#c43c5a';c.stroke();}
    c.restore();}
  drawFlakes(F,a){if(!a)return;const c=this.ctx,T=this.clock-F.start,f=this.size||1,fx=this.art.fx||{},k=this.bodyScale(a);if(T>F.T1+.1)return;
    for(const fl of F.flakes){const q=(T-fl.delay)/fl.dur;if(q<0||q>1)continue;if(this.budget--<=0)break;const wx=a.x+fl.ox*a.radius*2*f,wy=a.y-fl.oy*a.spec.height*f*k,sx=this.offsetX+wx*this.scale,sy=this.offsetY+wy*this.scale,tx=F.target.x,ty=F.target.y;
      const e=ease(q),mx=(sx+tx)/2+fl.bend*120,my=Math.min(sy,ty)-60-Math.abs(fl.bend)*40,x=(1-e)*(1-e)*sx+2*(1-e)*e*mx+e*e*tx,y=(1-e)*(1-e)*sy+2*(1-e)*e*my+e*e*ty;
      const peel=q<.15?.5+q/.15*.5:1,size=fl.size*peel*(1-.45*e),al=q<.85?1:1-(q-.85)/.15,rot=fl.rot+fl.spin*q;if(!sprite(c,fx[fl.img],x,y,size,rot,al))inkDrop(c,x,y,size,rot,al);}}
  drawConfetti(T){const c=this.ctx,g=700*Math.max(.6,this.h/390),k=Math.max(.6,this.h/390),fx=this.art.fx||{},a=T<1.4?1:1-(T-1.4)/.4;
    for(const b of this.bits){if(this.budget--<=0)break;const x=(b.left?0:this.w)+(b.left?1:-1)*b.vx*k*T+Math.sin(T*8+b.ph)*10*T,y=this.h+b.vy*k*T+.5*g*T*T,rot=b.rot+b.spin*T;if(y>this.h+30)continue;
      if(!sprite(c,fx[b.img],x,y,b.size*1.3,rot,a)){c.save();c.globalAlpha=a;c.translate(x,y);c.rotate(rot);c.fillStyle=b.col;c.fillRect(-b.size/2,-b.size/3,b.size,b.size*.66);c.restore();}}}
}
// ---- The ?attach tuning view: every creature idling in a grid, wearing the crown. Click one, nudge it, copy the JSON into art/attach-fit.json.
let attachView=null;
export function openAttachDebug(art){if(attachView)return attachView;const fit=JSON.parse(JSON.stringify(art?.fit||FIT||{}));fit.crown??={};const ids=Object.keys(CREATURES).filter(id=>loaded.has(id)),pups=ids.map(id=>createPuppet(id));let sel=0,big=false,last=0,run=true;
  const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:9999;background:#f4ead2;overflow:auto;direction:ltr;font:14px Heebo,Arial,sans-serif;color:#1d2a5a';
  const bar=document.createElement('div');bar.style.cssText='position:sticky;top:0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:6px 10px;background:#1d2a5a;color:#fff;z-index:1';
  const info=document.createElement('b'),help=document.createElement('span'),copy=document.createElement('button'),close=document.createElement('button'),out=document.createElement('textarea'),cv=document.createElement('canvas');
  help.textContent='click a creature · arrows move (shift ×4) · + / - size · [ ] turn · b big heads';copy.textContent='copy';close.textContent='close';out.style.cssText='display:block;width:calc(100% - 20px);margin:10px;height:110px;font:12px monospace';out.readOnly=true;cv.style.cssText='display:block;width:100%';
  bar.append(info,help,copy,close);box.append(bar,cv,out);document.body.append(box);
  const entry=i=>{const id=ids[i],p=pups[i];return fit.crown[id]??={bone:anchorBone(p),x:0,y:0,s:.3,r:0};};
  const json=()=>{const o={};for(const k in fit){o[k]={};for(const id in fit[k]){const v=fit[k][id];o[k][id]={bone:v.bone,x:Math.round(v.x),y:Math.round(v.y),s:+(+v.s).toFixed(3),r:+(+v.r).toFixed(3)};}}return JSON.stringify(o,null,1);};
  copy.onclick=()=>{out.value=json();console.log(out.value);try{navigator.clipboard?.writeText(out.value).catch(()=>{});}catch{}};
  const shut=()=>{run=false;box.remove();window.removeEventListener('keydown',key,true);attachView=null;};close.onclick=shut;
  const cols=()=>Math.max(3,Math.floor((box.clientWidth||800)/170));
  cv.onclick=e=>{const r=cv.getBoundingClientRect(),n=cols(),cell=r.width/n,i=Math.floor((e.clientY-r.top)/cell)*n+Math.floor((e.clientX-r.left)/cell);if(i>=0&&i<ids.length)sel=i;};
  // Arrows move in screen directions, so the offset is turned back into the bone's own frame.
  const key=e=>{const v=entry(sel),p=pups[sel],b=p.skeleton.bones[p.skeleton.byName.get(v.bone)],step=e.shiftKey?16:4;let dx=0,dy=0;
    if(e.key==='ArrowLeft')dx=-step;else if(e.key==='ArrowRight')dx=step;else if(e.key==='ArrowUp')dy=-step;else if(e.key==='ArrowDown')dy=step;
    else if(e.key==='+'||e.key==='=')v.s*=1.05;else if(e.key==='-'||e.key==='_')v.s/=1.05;else if(e.key===']')v.r+=.05;else if(e.key==='[')v.r-=.05;else if(e.key==='b')big=!big;else if(e.key==='Escape')shut();else return;
    if(dx||dy){const g=-(b?.world.angle||0),k=1/(b?.world.scale||1);v.x+=(dx*Math.cos(g)-dy*Math.sin(g))*k;v.y+=(dx*Math.sin(g)+dy*Math.cos(g))*k;}e.preventDefault();};
  window.addEventListener('keydown',key,true);
  const loop=t=>{if(!run)return;const dt=last?Math.min(.1,(t-last)/1000):0;last=t;const n=cols(),W=box.clientWidth||800,cell=W/n,rows=Math.ceil(ids.length/n),dpr=Math.min(window.devicePixelRatio||1,2),H=rows*cell;
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.height=H+'px';}
    const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
    ids.forEach((id,i)=>{const x=(i%n)*cell,y=Math.floor(i/n)*cell,p=pups[i],v=entry(i),size=p.rig.artworkSize,h=Math.min(cell*.62,cell*.8*size.height/size.width);
      c.fillStyle=i===sel?'#ffe9a8':'#efe2c4';c.fillRect(x+3,y+3,cell-6,cell-6);if(i===sel){c.strokeStyle='#c43c5a';c.lineWidth=3;c.strokeRect(x+4,y+4,cell-8,cell-8);}
      drawPuppet(c,p,x+cell/2,y+cell*.88,h,{dt,clip:'idle',attachments:[{img:art?.fx?.crown||FX.crown||null,...v}],boneScale:big?{[anchorBone(p)]:anchorBone(p)==='head'?1.8:1.25}:null});
      c.fillStyle='#1d2a5a';c.font='12px monospace';c.fillText(id,x+8,y+18);});
    const v=entry(sel);info.textContent=ids[sel]+' · '+v.bone+' x '+Math.round(v.x)+' y '+Math.round(v.y)+' s '+(+v.s).toFixed(3)+' r '+(+v.r).toFixed(2);requestAnimationFrame(loop);};
  requestAnimationFrame(loop);attachView=box;return box;}
