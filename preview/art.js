import {Skeleton,Animator,drawSkeleton} from './vendor/rig.js';
import {CREATURES,WORLD,clamp,skinById,GOALS,BALL_GOALS,HIDE_LISTEN} from './core.js';
import * as core from './core.js';
import * as rig from './vendor/rig.js';
import {numberKids,numberCounts,newTally,tallyHit,tallyPop,NUMBER_LIFE,countdownShow} from './meta.js';
export const ARENA_URL='./art/2026-09-15__Coastal-Arena__Background__v01__FINAL.png';
// Each island of the necklace journey has its own painted arena; a missing one falls back to the coast.
export const ISLAND_ARENAS=['wind','sea','fire','mirror','castle','echo','tracks'];
// A world whose arena is not painted yet borrows one that fits.
const ARENA_STAND_IN={};
// Rocks for a world without its own set: the stone canyon gets carved castle blocks. The Two Tracks field gets hay bales (drawn, see hayProp).
const PROP_STAND_IN={echo:'castle'};
// Painted effect sprites (art/gen/fx-<name>.png). Only names in this list are ever requested, so a missing file never costs a 404.
export const FX_NAMES=['aura','banner','blossom-1','blossom-2','blossom-3','blossom-4','chip-1','chip-2','chip-3','cocoon','crack-1','crack-2','crown','crown-frame','dab',
  'flake-1','flake-2','flake-3','flake-4','flake-5','flake-6','fleck-1','fleck-2','fleck-3','fleck-4','inkstar','petal-1','petal-2','petal-3','pip','puff',
  'seed-1','seed-2','seed-3','seed-rainbow','splat-water','splat-spark','splat-stone','splat-fire','splat-light','splat-nature','splat-sound','splat-wind','stamp',
  'stroke-1','stroke-2','stroke-3','stroke-4','wonder-ice','wonder-giant','wonder-bigheads','wonder-storm','wonder-meteors','wonder-bouncy',
  'copy-star','comeback-star','ccard-super','ccard-crystal','ccard-decoy','ccard-speed','ccard-heart','card-back-blue',
  'drip-1','drip-2','drip-3','drip-4','ink-pool','gate-closed','gate-open','wisp-1','wisp-2','drum','drum-lit','bridge-light','finish-arch',
  'wonder-fireflies','wonder-mushrooms','wonder-popcorn','wonder-swap','wonder-bubbles','wonder-dance'];
// Names still being painted. They are never loaded until the file arrives and the name moves up into FX_NAMES.
export const FX_LATER=[];
// The hat wardrobe (art/gen/hat-<id>.png) and the Lab's Power Form headpieces (art/gen/form-<creature>-<option>.png). Only these are requested.
export const HAT_ART=['astronaut','beanie','chef','cowboy','flowers','goggles','knight','leaves','party','pirate','propeller','sailor','sunglasses','tophat','viking','wizard'];
const FORM_OPTS={maimi:['coral','shell','wave'],havzuk:['bolts','mane','visor'],slauz:['geode','moss','peaks'],lohatan:['obsidian','phoenix','volcano'],zankor:['flame','goggles','sunrays'],zoharon:['comet','moon','stars']};
export const FORM_ART=Object.entries(FORM_OPTS).flatMap(([id,o])=>o.map(x=>'form-'+id+'-'+x));
// Painted arena variants: a Wonder's backdrop (ice coast, bubble sea, cloud-floor wind) and the spectacle guardian's second stage.
export const ARENA_VARIANTS=['coast-ice','sea-bubbles','wind-clouds','tracks-night'];
const WONDER_ARENA={ice:{coast:'coast-ice'},bubbles:{sea:'sea-bubbles'},storm:{wind:'wind-clouds'}},PHASE2_ARENA={tracks:'tracks-night'};
// The two Two Tracks creatures have rigs before they have cards, so the ?attach tuner can fit them on any branch.
const EXTRA_RIGS=['tzadon','rhythmdeer'];
const loaded=new Map();
let FX={},FIT={},HATS={},FORMS={};
function loadImage(url) {return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image failed: '+url));img.src=url;});}
// A picture that did not arrive (a phone's connection dropped for a moment) is asked for once more after 3 s, and again at the next battle.
let missing=[];
function fetchInto(store,key,url,again=true){loadImage(url).then(img=>{store[key]=img;},()=>{if(!again){missing.push([store,key,url]);return;}const t=setTimeout(()=>fetchInto(store,key,url,false),3000);t?.unref?.();});}
export function retryArt(){const list=missing;missing=[];for(const [store,key,url] of list)fetchInto(store,key,url,false);return list.length;}
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
  // The painted effects, hats, headpieces and arena variants fill in behind the first screen; every draw has a fallback until they arrive.
  const fx={},hats={},forms={},variants={};FX=fx;FIT=fit;HATS=hats;FORMS=forms;missing=[];for(const n of FX_NAMES)fetchInto(fx,n,'./art/gen/fx-'+n+'.png');
  for(const n of HAT_ART)fetchInto(hats,n,'./art/gen/hat-'+n+'.png');
  for(const n of FORM_ART)fetchInto(forms,n,'./art/gen/'+n+'.png');
  for(const n of ARENA_VARIANTS)fetchInto(variants,n,'./art/gen/arena-'+n+'.jpg');
  const art={arena,arenas,entries,props,fx,fit,hats,forms,variants};
  if(/[?&]attach\b/.test(globalThis.location?.search||''))setTimeout(()=>openAttachDebug(art),0);
  return art;
}
const PROP_KEYS=['coast','wind','sea','fire','mirror','castle'];
export const SHOT_ART={zoharon:'beam',kokhavit:'spark',maimi:'water',havzuk:'lightning',slauz:'stone',lohatan:'fire',tehomon:'whirl',zikuk:'beam',retetoz:'wave',tzlilon:'hypno',shorshu:'leaf',windguard:'wind',seaguard:'spear',fireguard:'fireball',fireball:'fireball',galgalor:'spark',chutal:'water',hedanon:'wave',tlaor:'spark',thread:'beam',ozenav:'wave',rishrush:'spark',bell:'spark',kashevet:'wind',zankor:'lightning',tzadon:'stone',rhythmdeer:'wave',antler:'beam'};
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
const RAINBOW=['#ff6b6b','#ffb347','#fff36b','#6bff9c','#6bc8ff','#b98cff'];
// A page icon (#i-<name> in the sprite sheet) as a small picture for the canvas: an ink outline under the colour line. Made once per icon and colour.
const icons=new Map();
function iconImage(name,color=INK){if(!name||typeof document?.getElementById!=='function')return null;const k=name+'|'+color;if(icons.has(k))return icons.get(k);icons.set(k,null);
  const sym=document.getElementById('i-'+name);if(!sym)return null;const vb=sym.getAttribute('viewBox')||'0 0 24 24',body=sym.innerHTML;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="96" height="96" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${INK}" stroke-width="4.4">${body}</g><g stroke="${color}" stroke-width="2.3">${body}</g></svg>`;
  const img=new Image();img.onload=()=>icons.set(k,img);img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);return null;}
// The middle of a bone's painted part, in the puppet's own space (for a glow on the antlers or a crack on the chest).
function partCenter(p,name){const i=p.skeleton.byName.get(name);if(i==null)return null;const b=p.skeleton.bones[i],w=b.world,part=b.part;if(!part?.rect)return {x:w.x,y:w.y};
  const ps=part.scale??1,cr=Math.cos(part.rotation||0),sr=Math.sin(part.rotation||0),hw=part.rect.width/2,hh=part.rect.height/2,lx=((part.offset?.x||0)+hw*cr-hh*sr)*ps,ly=((part.offset?.y||0)+hw*sr+hh*cr)*ps,ca=Math.cos(w.angle),sa=Math.sin(w.angle);
  return {x:w.x+(lx*ca-ly*sa)*w.scale,y:w.y+(lx*sa+ly*ca)*w.scale};}
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
// ay is where the picture sits on that point (.85 = a crown's band, .5 = glasses on the eyes). A hat may lag (spin), squash (sx, sy) and face the other way (mirror).
function attach(ctx,p,list){const H=p.rig.artworkSize.height;for(const a of list){const i=p.skeleton.byName.get(a.bone);if(i==null)continue;const w=p.skeleton.bones[i].world;
  ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.angle);ctx.scale(w.scale,w.scale);ctx.translate(a.x||0,a.y||0);ctx.rotate((a.r||0)+(a.spin||0));if(a.alpha!=null)ctx.globalAlpha*=a.alpha;
  if(a.track){a.track.m=ctx.getTransform();a.track.s=(a.s||.3)*H;}if(a.sx||a.sy)ctx.scale(a.sx||1,a.sy||1);if(a.mirror)ctx.scale(-1,1);
  const s=(a.s||.3)*H,ay=a.ay??.85;if(a.img?.width){const h=s*a.img.height/a.img.width;ctx.drawImage(a.img,-s/2,-h*ay,s,h);}else if(a.shape)a.shape(ctx,s);else crownShape(ctx,s);
  ctx.restore();}}
// How far above the feet the highest attachment reaches, in the drawing's own units (the drawing itself is artworkSize.height tall).
function attachTop(p,list){const H=p.rig.artworkSize.height,oy=p.rig.origin?.y??-H;let top=0;for(const a of list){const i=p.skeleton.byName.get(a.bone);if(i==null)continue;const w=p.skeleton.bones[i].world,s=(a.s||.3)*H,h=a.img?.width?s*a.img.height/a.img.width:s*.85,ay=a.ay??.85;
  const ca=Math.cos(w.angle),sa=Math.sin(w.angle),py=w.y+((a.x||0)*sa+(a.y||0)*ca)*w.scale,g=w.angle+(a.r||0),cg=Math.cos(g),sg=Math.sin(g);
  for(const [u,v] of [[-s/2,-h*ay],[s/2,-h*ay],[-s/2,h*(1-ay)],[s/2,h*(1-ay)]])top=Math.max(top,-(py+(u*sg+v*cg)*w.scale)+(oy+H));}return top;}
function crownShape(c,w){const h=w*.62;c.beginPath();c.moveTo(-w/2,h*.15);c.lineTo(-w/2,-h*.45);c.lineTo(-w*.25,-h*.12);c.lineTo(0,-h*.8);c.lineTo(w*.25,-h*.12);c.lineTo(w/2,-h*.45);c.lineTo(w/2,h*.15);c.closePath();c.fillStyle='#ffd23a';c.fill();c.lineJoin='round';c.lineWidth=Math.max(1,w*.07);c.strokeStyle=INK;c.stroke();ellipse(c,0,-h*.1,w*.08,w*.08,'#49d9ef');}
// The star crown for a creature in its Power Form, placed by art/attach-fit.json. A creature with a Lab design wears its own headpiece instead.
function crownFor(p,id,alpha,option=null){const key=option&&FORM_OPTS[id]?.includes(option)?id+'-'+option:null,img=key?FORMS['form-'+key]:null;
  if(img){const f=fitFor(p,id,'form',key);return {img,bone:f.bone,x:f.x,y:f.y,s:f.s,r:f.r,ay:f.ay??.85,alpha};}
  const f=FIT.crown?.[id]||{};return {img:FX.crown||null,bone:f.bone&&p.skeleton.byName.has(f.bone)?f.bone:anchorBone(p),x:f.x||0,y:f.y||0,s:f.s||.3,r:f.r||0,alpha};}
// The Power Form attachment for any drawing of a creature (the crown, or its Lab headpiece when option is one of its three).
export const formAttachment=(p,id,option=null,alpha=1)=>crownFor(p,id,alpha,option);
// A slot's fit (crown, head, face, form) from art/attach-fit.json. A missing one borrows the crown's: a hat a little bigger, glasses lower and smaller.
function fitFor(p,id,slot,key=id){const f=FIT[slot]?.[key];if(f&&p.skeleton.byName.has(f.bone))return f;
  const c=FIT.crown?.[id],bone=c?.bone&&p.skeleton.byName.has(c.bone)?c.bone:anchorBone(p);if(!c)return {bone,x:0,y:0,s:slot==='face'?.2:.3,r:0};
  const H=p.rig.artworkSize.height,d=slot==='face'?H*.1:slot==='head'?H*.03:0;return {bone,x:c.x-Math.sin(c.r)*d,y:c.y+Math.cos(c.r)*d,s:c.s*(slot==='face'?.75:slot==='form'?1.2:1.1),r:c.r};}
// Each hat sits on the fitted point at its own height (ay) and width (k). A hat with a front (a visor, a peak, a trailing tip) turns with the drawing.
export const HAT_LOOK={astronaut:{ay:.78,k:1.2,face:-1},beanie:{ay:.8,k:1},chef:{ay:.84,k:1},cowboy:{ay:.72,k:1.4},flowers:{ay:.62,k:1.15},knight:{ay:.8,k:1.15,face:1},leaves:{ay:.8,k:1.2},
  party:{ay:.9,k:.72},pirate:{ay:.78,k:1.25},propeller:{ay:.8,k:1.08,face:-1},sailor:{ay:.8,k:1.08},tophat:{ay:.86,k:1},viking:{ay:.78,k:1.2},wizard:{ay:.84,k:1.15,face:-1},
  goggles:{ay:.5,k:1.05,face:1,slot:'face'},sunglasses:{ay:.5,k:1,face:-1,slot:'face'}};
export const hatSlot=h=>core.hatById?.(h)?.slot||HAT_LOOK[h]?.slot||'head';
// Until a hat's picture arrives: a little party cone, or round glasses.
function hatShape(slot){return slot==='face'?(c,w)=>{for(const s of [-1,1])ellipse(c,s*w*.24,0,w*.2,w*.17,'#1d2a5acc','#ffd23a',Math.max(1,w*.05));line(c,[[-w*.06,0],[w*.06,0]],'#ffd23a',Math.max(1,w*.05));}
  :(c,w)=>{c.beginPath();c.moveTo(-w*.32,0);c.lineTo(0,-w*.85);c.lineTo(w*.32,0);c.closePath();c.fillStyle='#ff8f8f';c.fill();c.lineJoin='round';c.lineWidth=Math.max(1,w*.06);c.strokeStyle=INK;c.stroke();ellipse(c,0,-w*.85,w*.1,w*.1,'#ffd23a',INK,Math.max(1,w*.04));};}
// The hats one creature wears: head and face. In a Power Form the head belongs to the crown, so only the face hat stays.
export function hatList(p,id,worn,{form=false,phys=null,track=null,noHead=false}={}){const out=[];if(!worn)return out;const artFace=facesLeft(id)?-1:1;
  for(const slot of ['head','face']){const h=worn[slot];if(!h||typeof h!=='string'||slot==='head'&&(form||noHead))continue;const L=HAT_LOOK[h]||{},f=fitFor(p,id,slot),img=HATS[h]||null;
    const o={img,bone:f.bone,x:f.x,y:f.y,s:f.s*(L.k||1),r:f.r,ay:L.ay??(slot==='face'?.5:.8),mirror:!!L.face&&L.face!==artFace,shape:img?null:hatShape(slot),hat:h,slot};
    if(slot==='head'&&phys){o.spin=phys.spin;o.sx=phys.sx;o.sy=phys.sy;o.track=track;}out.push(o);}
  return out;}
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
// The Two Tracks field has no painted rocks: its covers are round hay bales (the painting has them by the fence), drawn once and kept.
const HAY={};
const RUBBLE_FLAT={sea:[.85,.65]};
function hayProp(rubble=false){const k=rubble?'rubble':'bale';if(HAY[k])return HAY[k];const cv=document.createElement('canvas'),W=256,H=rubble?120:200;cv.width=W;cv.height=H;cv.src='hay-'+k;const g=cv.getContext('2d'),R=rnd(rubble?91:57),ink='#2a1d2a';
  if(!g){HAY[k]=cv;return cv;}
  const straw=(x,y,len,ang,col,w)=>{g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(ang)*len*.5,y+Math.sin(ang)*len*.5-3,x+Math.cos(ang)*len,y+Math.sin(ang)*len);g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.stroke();};
  if(rubble){g.fillStyle='#00000026';g.beginPath();g.ellipse(128,92,108,20,0,0,TAU);g.fill();
    for(const [x,y,rx,ry] of [[84,82,48,20],[158,86,56,22],[122,72,36,16]]){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);const gr=g.createLinearGradient(0,y-ry,0,y+ry);gr.addColorStop(0,'#f6d36e');gr.addColorStop(1,'#b37a2a');g.fillStyle=gr;g.fill();g.lineWidth=4;g.strokeStyle=ink;g.stroke();}
    for(let i=0;i<46;i++)straw(30+R()*196,60+R()*40,10+R()*18,(R()-.5)*1.2+(R()<.5?0:Math.PI),R()<.5?'#fbe08a':'#a8702a',2.2);HAY[k]=cv;return cv;}
  g.fillStyle='#00000030';g.beginPath();g.ellipse(140,186,118,13,0,0,TAU);g.fill();
  const body=()=>{g.beginPath();g.moveTo(86,32);g.lineTo(194,28);g.ellipse(194,106,46,78,0,-Math.PI/2,Math.PI/2);g.lineTo(86,186);g.closePath();};
  body();const gr=g.createLinearGradient(0,28,0,186);gr.addColorStop(0,'#f8dc7e');gr.addColorStop(.45,'#e6b24a');gr.addColorStop(1,'#a8702a');g.fillStyle=gr;g.fill();
  g.save();body();g.clip();for(let i=0;i<120;i++){const x=90+R()*150,y=34+R()*150;straw(x,y,12+R()*20,(R()-.5)*.5,R()<.55?'#fbe592':'#9c6524',1.6+R()*1.4);}
    for(const bx of [128,166]){g.beginPath();g.ellipse(bx,107,12,80,0,-Math.PI/2,Math.PI/2);g.strokeStyle='#6e3418';g.lineWidth=6;g.stroke();g.beginPath();g.ellipse(bx-1,107,12,80,0,-Math.PI/2,Math.PI/2);g.strokeStyle='#c98a5a';g.lineWidth=2;g.stroke();}g.restore();
  body();g.lineJoin='round';g.lineWidth=6;g.strokeStyle=ink;g.stroke();
  g.beginPath();g.ellipse(86,109,60,78,0,0,TAU);const fg=g.createRadialGradient(80,100,6,86,109,78);fg.addColorStop(0,'#fff0b0');fg.addColorStop(.7,'#ecbd58');fg.addColorStop(1,'#c78c34');g.fillStyle=fg;g.fill();
  g.beginPath();for(let i=0;i<=120;i++){const a=i*.21,rr=i/120;g.lineTo(86+Math.cos(a)*56*rr,109+Math.sin(a)*72*rr);}g.strokeStyle='#a8702a';g.lineWidth=3;g.stroke();
  g.beginPath();for(let i=0;i<=120;i++){const a=i*.21+.5,rr=i/120*.92;g.lineTo(84+Math.cos(a)*56*rr,107+Math.sin(a)*72*rr);}g.strokeStyle='#fff4c8';g.lineWidth=1.6;g.stroke();
  g.beginPath();g.ellipse(86,109,60,78,0,0,TAU);g.lineWidth=6;g.strokeStyle=ink;g.stroke();
  for(let i=0;i<14;i++){const a=-Math.PI*.95+R()*Math.PI*.9,x=86+Math.cos(a)*60,y=109+Math.sin(a)*78;straw(x,y,8+R()*10,a+(R()-.5)*.6,R()<.5?'#fbe592':'#c08a3a',2);}
  for(let i=0;i<10;i++)straw(100+R()*90,30+R()*4,8+R()*10,-Math.PI/2+(R()-.5)*1.4,'#f3d070',2);
  HAY[k]=cv;return cv;}
// The painted aura ring under a Power Form creature. Three specks run around it so it reads as turning.
function auraRing(c,x,y,rx,t,img=FX.aura){if(!sprite(c,img,x,y,rx*2.3)){ellipse(c,x,y,rx,rx*.36,null,'#ffd23a',4);ellipse(c,x,y,rx*.82,rx*.28,null,'#fff3b0',2);}
  for(let i=0;i<3;i++){const a=t*1.1+i*TAU/3;star(c,x+Math.cos(a)*rx*.95,y+Math.sin(a)*rx*.34,4.5,'#fff3b0');}}
// clip may be a list (['idle','run']): the picture takes turns, 2.4 s each, like the Lab's moving preview.
// hats ({head,face}) sit over the picture only (a card's stat bars are page text, never drawn here); lab ({option}) dresses the Power Form.
export function drawPortrait(canvas,p,id,t,dt,{active=false,locked=false,skin=null,glowColor=null,form=false,clip='idle',hats=null,lab=null}={}) {
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),w=rect.width,h=rect.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(Array.isArray(clip))clip=clip.length?clip[Math.floor(Math.max(0,t)/2.4)%clip.length]:'idle';
  const c=CREATURES[id]||{color:'#ffd23a'},cy=h*.89,crown=form&&!locked,worn=locked?null:hats,tall=!!(worn?.head&&!crown);
  glow(ctx,w/2,h*.54,w*.49,(glowColor||c.color)+(active?'27':'14'));
  ellipse(ctx,w/2,cy,w*.32,13,c.color+'15',c.color+(active?'66':'22'),1);
  ellipse(ctx,w/2,cy,w*.22,7,'#00000066');
  if(crown)auraRing(ctx,w/2,cy,w*.3,t);
  ctx.save();ctx.translate(w/2,h*.47);ctx.rotate(t*.08);ctx.setLineDash([2,9]);ellipse(ctx,0,0,Math.min(w*.37,h*.36),Math.min(w*.37,h*.36),null,c.color+'24');ctx.restore();
  const att=[...(crown?[crownFor(p,id,1,lab?.option||null)]:[]),...hatList(p,id,worn,{form:crown})];
  // A tall hat or headpiece must stay inside the picture: the creature is drawn a little smaller when its top would leave the frame.
  const art=p.rig.artworkSize,aspect=art.width/art.height;let height=Math.min(h*(crown?.72:tall?.7:.8),w*.86/aspect);
  if(att.length){pose(p,clip||'idle',0);const top=attachTop(p,att);if(top>art.height)height=Math.min(height,(cy-7-6)*art.height/top);}
  drawPuppet(ctx,p,w/2,cy-7,height,{dt,clip:clip||'idle',flip:facesLeft(id),skin,silhouette:locked?(c.star?'#fff4cf':'#06131c'):null,time:t,attachments:att.length?att:null});
  if(locked){ctx.save();ctx.font='900 '+Math.round(h*.22)+'px Heebo, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c.color;ctx.shadowColor=c.color;ctx.shadowBlur=18;ctx.fillText('?',w/2,h*.5);ctx.restore();}
  for(let i=0;i<7;i++){const px=w*(.15+(i*.137)% .72),py=(h*.9-(t*14+i*32)%(h*.8));ellipse(ctx,px,py,1.5,1.5,c.color+(active?'aa':'44'));}
}
// Sideways phone: the whole play area, still, under the HUD band. The view starts above the bar of the tallest creature standing at the
// top of the oval, so no head or bar walks under the clock, the pause button or the score; the band shows the stands, mirrored past the painting.
const PHONE_WIDE=window.matchMedia('(max-height:600px) and (orientation:landscape)'),PHONE_TALL=window.matchMedia('(max-width:620px) and (orientation:portrait)'),REDUCED=window.matchMedia('(prefers-reduced-motion: reduce)');
const PLAY_VIEW={x:72,y:-28,w:1136,h:678},HUD_BAND=34;
export class Renderer {
  constructor(canvas,art) {this.canvas=canvas;this.ctx=canvas.getContext('2d');this.art=art;this.puppets=[];this.skins=[null,null];this.clock=0;this.scale=1;this.offsetX=0;this.offsetY=0;this.shake=0;this.phone=false;this.cam=null;
    this.localSide=0;this.hudBottom=0;this.numberTop=0;this.pauseRect=null;this.ema=1/60;this.lite=false;this.dt=0;this.realDt=0;this.cutins=[];this.cutinIds=[];this.st=[];this.moments=[];this.bursts=[];this.bits=[];this.impact=0;this.impacts=[];this.fin={};this.coverFx=[];this.seenWonder=null;this.budget=120;this.m=null;
    this.resetWave2();this.resetWords();}
  // Wave 3, the battle's few words: the one damage number (its tally and the one on screen) and what the countdown drew, for the checks.
  resetWords(){this.tally=newTally();this.num=null;this.numCount=0;this.cdWords=[];}
  // Wave 2 drawing state: hat flights, backdrop crossfades, the hill's slide, drum pulses, the beat's parity and the decoy's own puppet.
  resetWave2(){this.flying=[];this.hatFlown=false;this.beatAt=null;this.variant={name:null,mix:0};this.night=0;this.hillAt=null;this.hillPts=[0,0];this.pops=[];this.drumFx=[];this.lastLit=[];this.strongN=null;this.decoyPup=null;this.decoyId=null;this.crumble=[];}
  // Read-only: the device asks for calm motion (no impact frames, no shake).
  get reduced(){return REDUCED.matches;}
  swap(side,id,skin=null) {this.puppets[side]=createPuppet(id);this.cutins[side]=createPuppet(id);this.cutinIds[side]=id;this.skins[side]=skin;this.st[side]=null;}
  setMatch(m,skins=[null,null],{local=0}={}) {this.cam=null;this.puppets=m.actors.map(a=>createPuppet(a.id));this.cutins=m.actors.map(a=>createPuppet(a.id));this.cutinIds=m.actors.map(a=>a.id);this.skins=skins;this.buddy=m.echo?.buddy?createPuppet(m.echo.buddy.id):null;
    this.localSide=local===1?1:0;this.st=[];this.moments=[];this.bursts=[];this.bits=[];this.impact=0;this.fin={};this.coverFx=[];this.seenWonder=null;this.shake=0;this.m=m;this.punch=null;this.resetWave2();this.resetWords();retryArt();}
  resize() {this.wide=PHONE_WIDE.matches||PHONE_TALL.matches;this.phone=false;this.size=this.wide?1.3:1;const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.w=rect.width;this.h=rect.height;this.dpr=dpr;
    if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)){this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);}
    this.scale=Math.min(rect.width/WORLD.width,rect.height/WORLD.height);this.offsetX=(rect.width-WORLD.width*this.scale)/2;this.offsetY=(rect.height-WORLD.height*this.scale)/2;
  }
  // The HUD band's foot in screen pixels (the clock, the pause button, the score and the chip all sit above it).
  get band(){return this.wide?(this.hudBottom>0?this.hudBottom:HUD_BAND)+4:0;}
  // The view: the whole play area and, after the finish only, the winner's short push-in. Nothing moves during the countdown or play.
  follow(m,dt) {
    let k,cx,cy,mid=this.h/2;
    if(this.wide){const V=PLAY_VIEW,top=this.band;k=Math.min(this.w/V.w,(this.h-top)/V.h);cx=V.x+V.w/2;cy=V.y+V.h/2;mid=top+(this.h-top)/2;}
    else{k=Math.min(this.w/WORLD.width,this.h/WORLD.height);cx=WORLD.width/2;cy=WORLD.height/2;}
    this.cam=null;
    // A cinematic moment (the finale): ease in toward something important, hold, ease back.
    const P=this.punch;
    if(P){P.age+=dt;const u=P.age/P.dur;if(u>=1)this.punch=null;else{const e=u<.2?u/.2:u>.7?(1-u)/.3:1,s=e*e*(3-2*e);k*=1+(P.zoom-1)*s;cx+=(P.x-cx)*s*.9;cy+=(P.y-cy)*s*.9;}}
    // The desktop never shows past the edge of the arena picture; a sideways phone mirrors the painting there instead (drawBackdrop).
    const hw=this.w/2/k,hh=this.h/2/k;
    if(!this.wide){cx=hw*2>=WORLD.width?WORLD.width/2:Math.max(hw,Math.min(WORLD.width-hw,cx));cy=hh*2>=WORLD.height?WORLD.height/2:Math.max(hh,Math.min(WORLD.height-hh,cy));}
    this.scale=k;this.offsetX=this.w/2-cx*k;this.offsetY=mid-cy*k;this.zoomed=!!this.punch;
  }
  cinematic(x,y,zoom=1.4,dur=1.6){if(REDUCED.matches)return;this.punch={x,y,zoom,dur,age:0};}
  point(clientX,clientY) {const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.offsetX)/this.scale,y:(clientY-r.top-this.offsetY)/this.scale+38*(this.size||1)};}
  // How big a creature is drawn: its Power Form, a giant/tiny Wonder. The phone factor comes on top.
  bodyScale(a){return (a.form>0?core.FORM_SIZE??1.15:1)*(a.sz||1);}
  render(m,dt,clock,realDt=dt) {
    this.m=m;this.dt=dt;this.realDt=realDt;this.resize();this.follow(m,realDt);this.clock=clock;
    // The effects governor: a slow phone drops to lite mode (half the particles, no impact frames, no flecks) and climbs back when it recovers.
    this.ema=this.ema*.95+Math.min(.1,Math.max(0,realDt))*.05;if(this.ema>.022)this.lite=true;else if(this.ema<.018)this.lite=false;this.budget=this.lite?60:120;
    this.propKey=PROP_KEYS.includes(m.arena)?m.arena:m.arena==='tracks'?'tracks':PROP_STAND_IN[m.arena]||'coast';this.shadowed=core.isShadowed?!!core.isShadowed(m):!m.versus&&!m.coop&&(!!m.wild||!!m.story&&!m.mirror&&!m.friendly);this.versus=!!m.versus;
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#0b2026';c.fillRect(0,0,this.w,this.h);
    // Shake: only ever small on a phone, and none at all when the device asks for calm motion.
    this.shake=Math.min(this.reduced?0:this.wide?3:9,Math.max(0,this.shake-realDt*22));c.translate(this.offsetX,this.offsetY);c.scale(this.scale,this.scale);
    if(this.shake>0)c.translate(Math.sin(clock*93)*this.shake,Math.cos(clock*117)*this.shake*.6);
    this.drawBackdrop(m);
    // Hide-and-seek: the rival is hidden until the child stands still and listens.
    this.hidden=!!m.hide&&m.hide.seen<=0&&m.status==='playing'&&m.actors[1].hp>0;
    // A gentle edge shade leaves the arena floor bright and readable.
    const shade=c.createLinearGradient(0,0,0,720),V=this.seen();shade.addColorStop(0,'#102b3866');shade.addColorStop(.25,'#102b3800');shade.addColorStop(.8,'#102b3800');shade.addColorStop(1,'#102b3844');c.fillStyle=shade;c.fillRect(V.x,V.y,V.w,V.h);
    c.save();c.globalAlpha=.5;c.setLineDash([5,12]);ellipse(c,WORLD.cx,WORLD.cy,WORLD.rx,WORLD.ry,null,'#a7f3e4',2);c.restore();
    this.watch(m,dt);
    if(m.spectacle)this.drawEntrance(m);
    this.drawWonderFloor(m);
    this.drawFloorExtras(m,clock);
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
      if(a.side===1&&this.hidden||a.out>0||this.riseOf(a,m)?.hide)continue;
      // A flying creature casts a smaller, softer shadow: it is up in the air. Shadow and ring grow with the drawn body.
      const fly=a.spec.flies&&a.hp>0,R=(CREATURES[a.id]?.radius||a.radius)*(a.giant?1.25:1)*f0*this.bodyScale(a);
      ellipse(c,a.x,a.y+3,R*(fly?1.1:1.45),R*(fly?.36:.48),fly?'#182b3540':'#182b3555');
      if(a.form>0)auraRing(c,a.x,a.y+3,R*1.9,clock,this.art.fx?.aura);
      ellipse(c,a.x,a.y+3,R*1.5,R*.58,null,sideColor(a.side,this.localSide),3);
      if(a.side===this.localSide&&this.youPulse(m))this.drawYouPulse(a,R);
      if(a.tellT>0)this.drawTell(a);
      if(a.windup>0){const surge=!!a.windupSurge||a.upgrades.includes('surge'),r=surge?235:182,pct=1-a.windup/(surge?.85:.6);ellipse(c,a.x,a.y,r,r*.8,'#fc713027','#fa9858',2);ellipse(c,a.x,a.y,r*pct,r*.8*pct,'#ffbc6544');}
    }
    const B=m.echo?.buddy;
    const things=[...m.covers.map((o,i)=>({y:o.y,cover:o,i})).filter(o=>o.cover.hp>0),...m.actors.filter(a=>!(a.out>0)).map(a=>({y:a.y,actor:a})),...(B&&this.buddy?[{y:B.y,buddy:B}]:[]),...this.props(m,dt,clock)].sort((a,b)=>a.y-b.y);
    for(const obj of things){if(obj.draw)obj.draw();else if(obj.cover)this.drawCover(obj.cover,m.time,obj.i);else if(obj.buddy)this.drawBuddy(obj.buddy,dt,m.status);else this.drawActor(obj.actor,dt,m.status,m);}
    if(m.wonder?.id==='fireflies')this.drawFireflies(m,clock);
    if(this.flying.length)this.drawFlying(dt);
    // The impact frame: two linocut frames, cream paper and ink creatures, with the super itself in colour on top.
    if(this.impact>0){this.impact--;if(!this.lite&&!this.reduced){const V=this.seen();c.save();c.globalAlpha=.85;c.fillStyle='#f6ecd8';c.fillRect(V.x-200,V.y-200,V.w+400,V.h+400);c.restore();
      for(const a of m.actors)if(!(a.out>0)&&!(a.side===1&&this.hidden)){const p=this.puppets[a.side],S=f0*this.bodyScale(a),lift=a.spec.flies&&a.hp>0?(a.giant?32:24):0;drawPuppet(c,p,a.x,a.y-lift*S,a.spec.height*S,{flip:facesLeft(a.id)?a.facing>0:a.facing<0,clip:cur(p),dt:0,silhouette:INK});}
      for(const z of m.zones)this.drawZone(z,clock);for(const w of m.waves)this.drawWave(w,m,clock);}}
    const enemy=m.actors[1];if(!m.versus&&!this.hidden&&m.status==='playing'&&enemy.fireCd<.23&&enemy.windup<=0&&(!enemy.boss||enemy.boss.phase==='guard')){const ey=enemy.y-38*f0;c.save();c.globalAlpha=.65;c.setLineDash([5,5]);line(c,[[enemy.x,ey],[enemy.x+Math.cos(enemy.aim)*78,ey+Math.sin(enemy.aim)*78]],'#d53c5b',3);c.restore();}
    for(const s of m.shots)this.drawShot(s,clock,m);
    // The hits of a child here add up quietly; now and then their sum pops over the rival (drawNumber, after the creatures).
    this.tallyNumbers(m);
    for(const e of m.effects)this.drawEffect(e,m);
    if(m.wonder?.id==='swap')this.drawSwapTell(m);
    if(this.pops.length)this.drawPops();
    this.drawWorldMoments(m);
    if(m.wind)for(const a of m.actors)if(!(a.out>0))this.drawCarry(a,m);
    // In the lava, an arrow above the player points back to safety.
    if(m.lava)for(const a of m.versus?m.actors:[m.actors[0]]){const o=Math.hypot((a.x-WORLD.cx)/WORLD.rx,(a.y-WORLD.cy)/WORLD.ry);if(a.hp>0&&o>m.lava.scale){const ang=Math.atan2(WORLD.cy-a.y,WORLD.cx-a.x),y=a.y-a.spec.height*f0*this.bodyScale(a)-46+Math.sin(this.clock*8)*4;c.save();c.translate(a.x,y);c.rotate(ang);c.fillStyle='#fff1a8';c.strokeStyle='#7a2a00';c.lineWidth=4;c.beginPath();c.moveTo(30,0);c.lineTo(4,-18);c.lineTo(4,-8);c.lineTo(-22,-8);c.lineTo(-22,8);c.lineTo(4,8);c.lineTo(4,18);c.closePath();c.stroke();c.fill();c.restore();}}
    if(m.ball&&m.ball.carrier>=0)this.drawBall(m,clock);
    this.drawNumber(m);
    // Friends' names: small tags in each player's colour under their creature, during the countdown only (never in play).
    if((m.versus||m.coop)&&m.status==='countdown'&&!(m.time>0))m.actors.forEach((a,i)=>{if(a.side===1&&m.coop||a.out>0)return;const n=m.names?.[a.side]||(m.versus?'שחקן '+(i+1):'');if(n)this.tag(n,a.x,a.y+46*f0,22*f0,sideColor(a.side,this.localSide));});
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.drawScreenMoments(m);
    if(m.status==='countdown')this.drawCountdown(m);
  }
  // The countdown, in screen pixels: a big 3-2-1 only when the announcer counts it (m.bigCount), then 'קדימה!'; any other start shows only a
  // short 'קדימה!' burst at its end, and a goal's kick-off nothing (countdownShow). No veil over the arena and no label under the word.
  drawCountdown(m){const show=countdownShow(m);if(!show)return;const c=this.ctx,{text,u,burst}=show,big=clamp(this.h*.22,54,120)*(burst?.82:1),
    pop=this.reduced?1:burst?.6+.55*ease(u/.35):1+.18*ease((u-.8)/.2),a=burst&&u>.75?1-(u-.75)/.25:1;if(!this.cdWords.includes(text))this.cdWords.push(text);
    c.save();c.globalAlpha*=a;c.translate(this.w/2,this.band+(this.h-this.band)*.5);c.scale(pop,pop);inkText(c,text,0,0,big,'#ffffff',INK,Math.max(5,big*.09));c.restore();}
  // A small name tag in a player's colour (friend battles, the countdown only).
  tag(text,x,y,size,color){const c=this.ctx;c.save();c.font=`900 ${size}px 'Frank Ruhl Libre', Heebo, Arial`;c.direction=LTR(String(text))?'ltr':'inherit';c.textAlign='center';c.textBaseline='middle';
    const w=(c.measureText(text).width||size*2)+size*1.1,h=size*1.5;c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,h/2);c.fillStyle=color;c.fill();c.lineWidth=2;c.strokeStyle=INK;c.stroke();c.fillStyle='#ffffff';c.fillText(text,x,y+1);c.restore();}
  // 'This one is you', without a word: the child's teal ring breathes brighter in the countdown and the first three seconds.
  // Two children on one screen get their name tags instead.
  youPulse(m){return !m.coop&&!(m.versus&&!m.online)&&(m.status==='countdown'&&!(m.time>0)||m.status==='playing'&&m.time<3);}
  drawYouPulse(a,R){const c=this.ctx,q=this.reduced?1:.5+.5*Math.sin(this.clock*7),col=sideColor(a.side,this.localSide);
    c.save();c.globalCompositeOperation='lighter';c.translate(a.x,a.y+3);c.scale(1,.39);glow(c,0,0,R*2.3,col+'77');c.restore();
    ellipse(c,a.x,a.y+3,R*1.5*(1+.07*q),R*.58*(1+.07*q),null,'#ffffff',1.5+2*q);ellipse(c,a.x,a.y+3,R*1.5,R*.58,null,col,5);}
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
    // The comeback star leaves a short trail of rainbow sparkles.
    if(a.star>0&&a.hp>0&&!(a.out>0)&&(moving||!s.trail?.length)){s.tr=(s.tr||0)-dt;if(s.tr<=0){s.tr=this.lite?.1:.05;(s.trail||=[]).push({x:a.x+Math.sin(this.clock*9)*a.radius*.6,y:a.y-a.spec.height*(.25+.4*Math.abs(Math.sin(this.clock*5))),t:0,col:RAINBOW[Math.floor(this.clock*12)%6]});if(s.trail.length>12)s.trail.shift();}}
    if(s.trail)for(let i=s.trail.length-1;i>=0;i--){s.trail[i].t+=dt;if(s.trail[i].t>=.45)s.trail.splice(i,1);}
    if(s.out>0&&!(a.out>0)&&a.hp>0){this.burst(a.x,a.y,'puff');if(s.hat){s.hat.sq.velocity+=7;s.hat.ang=null;}}s.out=a.out||0;}
    // A big hit (over 15) sets a worn hat wobbling, away from the one who hit.
    if(!this.lite&&!this.reduced)for(const e of m.effects)if(e.type==='hit'&&!e.hw&&e.age<.12){e.hw=1;const t=m.actors[e.side];if(e.amount>15&&t&&this.st[t.side]?.hat){const by=m.actors[e.by];this.st[t.side].hat.wob.velocity+=(by?(t.x>=by.x?1:-1):1)*7;}}
    // Strong beats come every second beat: learn which from the first one heard, so the antlers glow before the right ones.
    for(const e of m.events||[])if(e.type==='beat'){this.beatAt=this.clock;if(e.strong&&Number.isFinite(e.n))this.strongN=e.n;}
    this.hatOff(m);
    // A Wonder seed that has just been touched opens with a blossom.
    const W=m.wonder,st=W?.state||null;if(st==='active'&&this.seenWonder&&this.seenWonder!=='active'&&W.x!=null)this.burst(W.x,W.y-30,'blossom');this.seenWonder=st;}
  drawDabs(){const c=this.ctx,f=this.size||1;for(const s of this.st)if(s)for(const d of s.dabs){if(this.budget--<=0)return;const a=Math.min(1,(1-d.t/.5)*1.6),img=tint(this.art.fx?.dab,d.col);c.save();c.translate(d.x,d.y+2);c.scale(1,.55);c.globalAlpha=a;
    if(img){const w=36*f;c.rotate(d.rot);c.drawImage(img,-w/2,-w/2,w,w*img.height/img.width);c.globalAlpha=a*.55;c.drawImage(img,-w*.4,-w*.4,w*.8,w*.8*img.height/img.width);}else ellipse(c,0,0,15*f,13*f,d.col,INK,1.5);c.restore();}
    for(const s of this.st)if(s?.trail)for(const d of s.trail){if(this.budget--<=0)return;const q=d.t/.45;c.save();c.globalAlpha=1-q;star(c,d.x,d.y-q*10,(7-4*q)*f,d.col);c.restore();}}
  drawCover(o,time,i=0) {const c=this.ctx,x=o.x,y=o.y,r=o.r,st=this.coverFx[i]||(this.coverFx[i]={hp:o.hp,t:0});
    // A rock wobbles for a moment when a shot chips it.
    if(o.hp<st.hp-.01)st.t=.32;st.hp=o.hp;if(st.t>0)st.t=Math.max(0,st.t-this.realDt);
    // A stone about to crumble (the challenge, the tower's twist) glows at its cracks and shakes harder as the moment comes: no numbers.
    const left=o.collapseAt!=null?o.collapseAt-time:9,crumble=left<=2&&o.hp>0,quake=crumble?(1-Math.max(0,left)/2):0,wob=this.reduced?0:st.t>0?Math.sin(st.t*55)*3.2*st.t/.32:crumble?Math.sin(time*46)*(1+2.6*quake):0;
    if(crumble){const pulse=.5+.5*Math.sin(time*(8+10*quake));ellipse(c,x,y,r+13,(r+13)*.7,'#ffb22d33','#ffe27c',4);c.save();c.globalCompositeOperation='lighter';glow(c,x,y-r*.6,r*(1.5+.5*pulse),'#ff9a2e'+(pulse>.5?'aa':'66'));c.restore();}
    // A cover that grows back mid-battle (the spectacle beat, the end of popcorn) pops up over .4 s.
    const born=Number.isFinite(o.born)?time-o.born:9,grow=born<.4&&!this.reduced?(born<0?0:born<.28?1.12*ease(born/.28):1.12-.12*ease((born-.28)/.12)):1;if(grow<=0)return;
    const hay=this.propKey==='tracks',img=hay?hayProp():this.art.props?.['rock-'+this.propKey],ratio=o.maxHp?o.hp/o.maxHp:1,stage=crumble||ratio<.4?2:ratio<.75?1:0;
    if(img){const w=r*3.1,h=w*img.height/img.width,fx=this.art.fx||{},rock=this.hurtRock(img,Math.round((1-ratio)*5),hay?0:stage);c.save();c.translate(x+wob,y+r*.6);c.rotate(wob*.012);if(grow!==1)c.scale(grow,grow);c.drawImage(rock,-w/2,-h,w,h);
      if(hay&&stage)for(let k=0;k<stage*3;k++){const R=rnd(i*17+k*5+1),sx=(R()-.5)*w*.7,sy=-h*(.25+R()*.5);line(c,[[sx,sy],[sx+(R()-.5)*18,sy-8-R()*10]],'#fff1b8',2.5);}
      if(!hay&&stage&&!fx['crack-1']){line(c,[[0,-h*.78],[-w*.07,-h*.55],[w*.05,-h*.38]],'#2b2f7a',3);if(stage>1)line(c,[[-w*.07,-h*.55],[-w*.2,-h*.45]],'#2b2f7a',3);}c.restore();return;}
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
  // The sea's broken coral is painted almost as tall as the whole one, so it lies lower and narrower: gone must read as gone.
  drawRubble(o){const c=this.ctx,img=this.propKey==='tracks'?hayProp(true):this.art.props?.['rubble-'+this.propKey];if(img){const [kw,kh]=RUBBLE_FLAT[this.propKey]||[1,1],w=o.r*3.1*kw,h=w*img.height/img.width*kh/kw;c.drawImage(img,o.x-w/2,o.y+o.r*.6-h,w,h);return;}for(let i=0;i<7;i++){const a=i*2.39,r=o.r*(.3+(i%3)*.3);c.save();c.translate(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r*.5);c.rotate(a);c.fillStyle=i%2?'#a8ad92':'#bdc2a4';c.fillRect(-5,-3,12,7);c.restore();}}
  // Big heads: the head bone (the whole body for the three rigs without one) grows and shrinks back smoothly.
  bigHeads(m,p){const W=m?.wonder;if(W?.id!=='bigheads'||W.state!=='active')return null;const A=core.WONDER_TIMES?.active??12,e=ease(Math.min(1,W.age/.4,(A-W.age)/.4));if(e<=0)return null;const b=anchorBone(p);return {[b]:1+(b==='head'?.8:.25)*e};}
  drawActor(a,dt,status,m=this.m) {
    const c=this.ctx,s=this.stateOf(a),F=this.fin[a.side],T=F?this.clock-F.start:0,rise=this.riseOf(a,m);if(rise?.hide)return;
    let clip=a.hp<=0?'defeat':a.hit>0?'hit':a.windup>0?'telegraph':a.attack>0?'attack':Math.hypot(a.moveX,a.moveY)>.2?'run':'idle';
    if(a.hp>0&&a.boss?.phase==='windup')clip='telegraph';if(a.hp>0&&a.boss?.phase==='recover')clip='hit';
    if(status==='countdown')clip='idle';const puppet=this.puppets[a.side],f=this.size||1,k=this.bodyScale(a);let S=f*k;
    // The Wonder's giant near the top of the oval is drawn only as tall as the room under the HUD band (never smaller than its own size): no head under the clock.
    if((a.sz||1)>1&&this.wide){const room=a.y-(this.band+4-this.offsetY)/this.scale,need=(a.spec.height+(a.spec.flies?32:0))*S;if(room>0&&need>room)S=Math.max(f*(k/(a.sz||1)),S*room/need);}
    let ox=0,oy=0,sx=1,sy=1,rot=0,ink=0,aura=a.side===1&&this.shadowed;
    // Only one rig has a wind-up clip: the others crouch and tremble while they gather a big attack.
    if(clip==='telegraph'&&!puppet.animator.has('telegraph')){clip='idle';const q=this.clock;sx=1.05+.02*Math.sin(q*40);sy=.93;ox=Math.sin(q*55)*1.4;}
    // The finish: a freed creature sheds its ink, then hops; a beaten one shakes off dizzy stars; the child's creature sits, dusts off and bounces up.
    if(F){if(F.kind==='liberate'){if(T<F.T1)ink=.8*(1-T/F.T1);else{aura=false;clip='idle';const h=(T-F.T1)/.35;if(h<1)oy-=30*Math.sin(Math.PI*h);else if(!F.landed){F.landed=1;s.sq.value=1;s.sq.velocity=0;s.hold=.05;if(s.hat)s.hat.sq.velocity+=7;}}}
      else if(F.kind==='puff'){if(T>=.8)clip='idle';}
      else if(F.kind==='sit'){if(T<.5){clip='hit';sy*=.88;sx*=1.07;}else if(T<.95){clip='idle';rot=Math.sin((T-.5)*26)*.06;}else{clip='idle';const h=(T-.95)/.35;if(h<1)oy-=18*Math.sin(Math.PI*h);else if(!F.landed){F.landed=1;s.sq.value=.8;s.sq.velocity=0;if(s.hat)s.hat.sq.velocity+=6;}}}}
    if(s.sq.value){const v=clamp(s.sq.value,-.6,1);sx*=1+.12*v;sy*=1-.1*v;}
    if(s.rec>0){ox+=s.rx;oy+=s.ry;}
    // A spectacle guardian rises out of its ink pool: it climbs through the floor line, grows past its size and settles, still dark with ink.
    if(rise){oy+=rise.oy;sx*=rise.k;sy*=rise.k;ink=Math.max(ink,rise.ink);c.save();c.beginPath();c.rect(a.x-600,-400,1200,a.y+4+400);c.clip();}
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
    // The Power Form wears the star crown, or the creature's own Lab headpiece. Hats ride the head and face; in a Power Form the head hat steps aside.
    const lab=a.lab?.option||m?.labs?.[a.side]?.[a.id]?.option||null,worn=hidden?null:m?.hats?.[a.side]?.[a.id]||null,phys=!this.lite&&!this.reduced,hs=this.hatState(s);
    const crown=a.form>0&&!hidden?[crownFor(puppet,a.id,a.form<3&&Math.sin(this.clock*TAU*6)<0?.25:1,lab)]:[];
    const hats=hatList(puppet,a.id,worn,{form:a.form>0,noHead:s.hatGone,track:hs.t,phys:phys?{spin:clamp(hs.lag.value-(hs.ang??hs.lag.value),-.5,.5)+clamp(hs.wob.value,-.45,.45),sx:1+.16*clamp(hs.sq.value,-.5,1),sy:1-.2*clamp(hs.sq.value,-.5,1)}:null});
    const att=crown.length||hats.length?[...crown,...hats]:null,bs=this.bigHeads(m,puppet),height=a.spec.height*(1+.07*(a.power||0));
    // The comeback star dresses its holder in the rainbow look, whatever skin it wears.
    const opts={flip,clip:a.stun>0&&a.hp>0?'hit':clip,dt:status==='paused'||a.stun>0?0:dt,alpha:hidden?.1:a.invincible>0&&!(a.star>0)&&!m?.ending&&status!=='finished'?.65:1,skin:a.star>0?'rainbow':this.skins[a.side],time:this.clock,attachments:att,boneScale:bs};
    const px=a.x+ox,py=a.y+oy,bent=sx!==1||sy!==1||rot;
    if(bent){c.save();c.translate(px,py);if(rot)c.rotate(rot);c.scale(sx,sy);c.translate(-px,-py);}
    drawPuppet(c,puppet,px,py,height,opts);
    // The hit flash: one or two frames of cream paper over the creature. Crowns and hats are never flashed: they go back on top.
    if(a.hit>.11&&a.hp>0&&!hidden&&!(m?.spectacle?.beat>0)){drawPuppet(c,puppet,px,py,height,{...opts,dt:0,skin:null,silhouette:CREAM,alpha:Math.min(.7,(a.hit-.11)*12),attachments:null});if(att)drawAttachments(c,puppet,px,py,height,flip,att,opts.alpha);}
    if(ink>0)drawPuppet(c,puppet,px,py,height,{...opts,dt:0,skin:null,silhouette:'#1b1030',alpha:ink,attachments:null});
    if(bent)c.restore();
    if(hats.length)this.hatAfter(a,s,puppet,hats,dt,phys);else hs.w=null;
    if(s.puff>=0&&!hidden){const q=s.puff/.07,mx=a.x+Math.cos(s.ang)*(a.radius+12),my=a.y-38+Math.sin(s.ang)*a.radius*.8;if(!sprite(c,this.art.fx?.puff,mx,my,(14+16*q),0,1-q*.6))ellipse(c,mx,my,6+8*q,5+6*q,'#fff4dccc',INK,1);}
    if(hidden){c.restore();if(S!==1)c.restore();if(rise)c.restore();return;}
    if(a.hear>0&&a.hp>0)this.drawHearing(a);
    if(a.silence>0&&a.hp>0)this.drawSilence(a);
    if(a.stun>0&&a.hp>0)this.drawDizzy(a);
    if(F?.kind==='puff'&&T<.8)this.drawDizzy(a);
    if(a.regen){c.save();for(let i=0;i<5;i++){const q=(this.clock*.9+i/5)%1,qx=a.x+Math.sin(i*2.4+this.clock*2)*a.radius*.9,qy=a.y-10-q*a.spec.height*.9;c.globalAlpha=(1-q)*.9;c.fillStyle='#5dff9e';c.fillRect(qx-2,qy-7,4,14);c.fillRect(qx-7,qy-2,14,4);}c.restore();}
    if(a.guard>0){c.save();c.globalAlpha=.35;ellipse(c,a.x,a.y-a.spec.height*.45,a.radius*1.6,a.spec.height*.65,'#92e9ff33','#cffbff',3);c.restore();}
    if(a.id==='rhythmdeer'&&a.hp>0&&m?.rhythm&&m.rhythm.side===a.side)this.drawDeerBeat(a,puppet,height,flip,px,py,S,lift,m);
    c.restore();if(S!==1)c.restore();if(rise)c.restore();
    // The health bar and light gem keep the phone size only, so a giant or a Power Form never makes them chunky.
    if(f!==1){c.save();c.translate(a.x,a.y);c.scale(f,f);c.translate(-a.x,-a.y);}
    // Near the top the bar stops under the HUD band (a giant, a flyer), so health is never hidden. A tall hat lifts it a little, so it never sits on the hat.
    const grown=bs?a.spec.height*((bs.head||bs.body||1)-1)*.5:0,barW=70,topWorld=(Math.max(this.band,6)+2-this.offsetY)/this.scale,hatUp=hs.w&&!s.hatGone?Math.min(0,(hs.w.top-12-a.y)/f+(lift+a.spec.height+grown+17)*(S/f)):0;
    s.hatBar=s.hatBar==null?hatUp:s.hatBar+(hatUp-s.hatBar)*Math.min(1,this.realDt*8);const barY=Math.max(a.y-(lift+a.spec.height+grown+17)*(S/f)+s.hatBar,a.y+(topWorld-a.y)/f),paint=rise?rise.bar:1;
    // Where the bar is, in the world: the damage number stands above it and a heal sparkles along it.
    s.bar={x:a.x,y:a.y+(barY-a.y)*f,w:barW*f,h:7*f};
    c.fillStyle='#092432bb';c.beginPath();c.roundRect(a.x-barW/2,barY,barW*paint,7,4);c.fill();c.fillStyle=barColor(a.side,this.localSide);c.beginPath();c.roundRect(a.x-barW/2+1,barY+1,Math.max(0,(barW*paint-2)*a.hp/a.spec.hp),5,3);c.fill();
    if((a.side!==1||this.versus||a.side===this.localSide)&&a.hp>0&&!(a.out>0)&&paint>=1)this.drawLightGem(a.x-barW/2-13,barY+3,a.superCharge||0,a.spec.color,a);
    // The friend who runs beside the child (the pair race): a gold star at the end of its bar.
    if(m?.allied&&a.side===2&&a.hp>0&&!(a.out>0))star5(c,a.x+barW/2+11,barY+3,8,'#f2c14e',INK,2);
    if(f!==1)c.restore();
  }
  // ---- Hats: the spring that makes them lag, squash and wobble, and the one that flies off at the final blow.
  hatState(s){return s.hat||(s.hat={lag:new rig.Spring({stiffness:300,damping:26}),wob:new rig.Spring({stiffness:170,damping:5}),sq:new rig.Spring({stiffness:320,damping:13}),ang:null,y:null,vy:0,t:{},w:null});}
  // After the creature is drawn: the head bone's turn and drop drive the springs; the hat's place is kept in world units for the health bar and the final blow.
  hatAfter(a,s,p,hats,dt,phys){const hs=this.hatState(s),head=hats.find(h=>h.slot==='head'&&h.track);if(!head){hs.w=null;return;}const b=p.skeleton.boneWorld(head.bone),H=p.rig.artworkSize.height;
    if(b&&dt>0&&phys){if(hs.ang==null){hs.ang=b.angle;hs.lag.value=hs.lag.target=b.angle;hs.lag.velocity=0;hs.y=b.y;}
      else{hs.ang+=rig.shortestAngle(hs.ang,b.angle);hs.lag.target=hs.ang;const vy=(b.y-hs.y)/dt/H;if(hs.vy>.12&&vy<=.02)hs.sq.velocity+=Math.min(9,hs.vy*22);hs.vy=vy;hs.y=b.y;}
      hs.lag.update(dt);hs.wob.update(dt);hs.sq.update(dt);}
    const M=head.track.m;if(!M)return;const k=this.dpr*this.scale,tx=x=>(x/this.dpr-this.offsetX)/this.scale,ty=y=>(y/this.dpr-this.offsetY)/this.scale,img=head.img;
    const sW=head.track.s,hW=img?.width?sW*img.height/img.width:sW*.85,ay=head.ay,cy=-hW*(ay-.5);
    hs.w={x:tx(M.c*cy+M.e),y:ty(M.d*cy+M.f),top:ty(M.d*(-hW*ay)+M.f),u:[M.a/k,M.b/k],v:[M.c/k,M.d/k],img,shape:head.shape,s:sW,h:hW,mirror:head.mirror,at:this.clock};}
  // The final blow knocks the loser's head hat off: it spins up, bounces twice and lies on the floor until the next battle.
  hatOff(m){if(this.hatFlown||!m.ending)return;this.hatFlown=true;const L=m.ending.loser,st=this.st[L],w=st?.hat?.w,a=m.actors[L],o=m.actors[m.ending.winner];
    if(L==null||L<0||!a||!w||this.lite||this.reduced||this.clock-w.at>.5)return;const dir=o?(a.x>=o.x?1:-1):1,half=Math.hypot(w.v[0],w.v[1])*w.h*.5;
    st.hatGone=true;this.flying.push({...w,vx:dir*(170+(a.x%7)*9),vy:-440,spin:dir*9,rot:0,b:0,floor:a.y+6-half*.8,ground:a.y+6,dir,rest:false});}
  drawFlying(dt){const c=this.ctx;for(const h of this.flying){if(dt>0&&!h.rest){h.vy+=1500*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.rot+=h.spin*dt;
      if(h.y>=h.floor&&h.vy>0){h.y=h.floor;if(h.b<2){h.vy=-h.vy*.42;h.vx*=.6;h.spin*=.5;h.b++;}else{h.vy=0;h.rest=true;}}}
    if(h.rest&&dt>0){h.vx*=Math.max(0,1-dt*6);h.x+=h.vx*dt;h.rot+=(h.dir*.35-h.rot)*Math.min(1,dt*8);}
    const up=Math.max(0,h.ground-h.y);ellipse(c,h.x,h.ground,h.s*Math.hypot(...h.u)*.45*clamp(1-up/400,.4,1),8*clamp(1-up/400,.3,1),'#182b3544');
    c.save();c.translate(h.x,h.y);c.rotate(h.rot);c.transform(h.u[0],h.u[1],h.v[0],h.v[1],0,0);if(h.mirror)c.scale(-1,1);
    if(h.img?.width)c.drawImage(h.img,-h.s/2,-h.h/2,h.s,h.h);else if(h.shape){c.translate(0,h.h*.35);h.shape(c,h.s);}c.restore();}}
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
  drawLava(m,t){const c=this.ctx,L=m.lava,s=L.scale,V=this.seen();
    c.save();c.beginPath();c.rect(V.x,V.y,V.w,V.h);c.ellipse(WORLD.cx,WORLD.cy,WORLD.rx*s,WORLD.ry*s,0,0,Math.PI*2);
    const g=c.createRadialGradient(WORLD.cx,WORLD.cy,WORLD.rx*s*.8,WORLD.cx,WORLD.cy,WORLD.rx*1.1);g.addColorStop(0,'#ff6a1acc');g.addColorStop(.5,'#c2300fcc');g.addColorStop(1,'#5a1206dd');
    c.fillStyle=g;c.globalAlpha=s<.995?.78:.0;c.fill('evenodd');
    if(s<.995){c.globalAlpha=.6;for(let i=0;i<26;i++){const ang=i/26*Math.PI*2+t*.15,r=1+.05*Math.sin(t*2+i);ellipse(c,WORLD.cx+Math.cos(ang)*WORLD.rx*s*r*1.06,WORLD.cy+Math.sin(ang)*WORLD.ry*s*r*1.06,10+4*Math.sin(t*3+i),5,'#ffd25a88');}}
    c.globalAlpha=1;c.setLineDash([]);c.lineWidth=5;c.strokeStyle=s<.995?'#ffcf5a':'#ffcf5a66';c.beginPath();c.ellipse(WORLD.cx,WORLD.cy,WORLD.rx*s,WORLD.ry*s,0,0,Math.PI*2);c.stroke();c.restore();
    for(const e of L.eruptions){if(e.done)continue;const p=Math.min(1,e.age/e.delay);c.save();ellipse(c,e.x,e.y,e.r,e.r*.7,'#ff3b1a'+(p>.6&&Math.sin(t*30)>0?'66':'33'),'#ffd25a',3);ellipse(c,e.x,e.y,e.r*p,e.r*.7*p,'#ff7a2c55');c.restore();}
  }
  drawEmber(e,t){const c=this.ctx,y=e.y-22+Math.sin(t*3+e.x)*4,img=this.art.props?.ember;if(img){glow(c,e.x,y,40,'#ffb43a88');ellipse(c,e.x,e.y,16,6,'#00000033');const s=58/Math.max(img.width,img.height);c.drawImage(img,e.x-img.width*s/2,y-img.height*s/2,img.width*s,img.height*s);return;}glow(c,e.x,y,34,'#ffb43a88');ellipse(c,e.x,e.y,16,6,'#00000033');c.save();c.translate(e.x,y);c.rotate(Math.PI/4+Math.sin(t*2)*.2);c.fillStyle='#ff8a2a';c.strokeStyle='#fff1a8';c.lineWidth=2;c.beginPath();c.roundRect(-9,-9,18,18,3);c.fill();c.stroke();c.restore();ellipse(c,e.x-2,y-3,3,2,'#fff6d0');}
  drawFeather(f,t){const c=this.ctx,y=f.y-26+Math.sin(t*2.5+f.x*.03)*5,img=this.art.props?.feather;if(img){ellipse(c,f.x,f.y,14,5,'#00000033');glow(c,f.x,y,30,'#bffcff66');const s=72/Math.max(img.width,img.height);c.save();c.translate(f.x,y);c.rotate(Math.sin(t*2+f.y)*.25);c.drawImage(img,-img.width*s/2,-img.height*s/2,img.width*s,img.height*s);c.restore();return;}ellipse(c,f.x,f.y,14,5,'#00000033');c.save();c.translate(f.x,y);c.rotate(-.6+Math.sin(t*2+f.y)*.25);
    glow(c,0,0,26,'#bffcff66');c.beginPath();c.moveTo(-16,0);c.quadraticCurveTo(0,-11,17,0);c.quadraticCurveTo(0,11,-16,0);c.fillStyle='#effcfc';c.fill();c.strokeStyle='#3cc7c9';c.lineWidth=2;c.stroke();line(c,[[-18,1],[16,0]],'#e0b13a',1.6);c.restore();}
  // The feathers a creature carries: one small feather each over its head, gold while it holds them all (the score pill has the numbers).
  drawCarry(a,m){if(!a.feathers)return;const c=this.ctx,n=Math.min(8,a.feathers),y=a.y-a.spec.height*(this.size||1)*this.bodyScale(a)*(1+.07*(a.power||0))-38,hold=m.wind.holder===a.side,gap=13;
    c.save();c.translate(a.x-(n-1)*gap/2,y);for(let i=0;i<n;i++){c.save();c.translate(i*gap,Math.sin(this.clock*4+i)*(this.reduced?0:1.5));c.rotate(-.9);c.beginPath();c.moveTo(-9,0);c.quadraticCurveTo(0,-6.5,10,0);c.quadraticCurveTo(0,6.5,-9,0);
      c.fillStyle=hold?'#ffcf3a':'#effcfc';c.fill();c.lineWidth=2;c.strokeStyle='#2a1d11';c.stroke();line(c,[[-8,0],[8,0]],hold?'#a8560a':'#3cc7c9',1.5);c.restore();}c.restore();}
  // Tide gates: the left (blue) one is yours to defend, the right (gold) one is where you score. Their colours say whose is whose; the wild intro says it in words.
  drawGoals(m,t){const c=this.ctx;
    for(let g=0;g<2;g++){const G=GOALS[g],dir=g===0?-1:1,col=g===0?'#59c9ff':'#ffcf5a',top=G.y-G.half,bot=G.y+G.half,H=78;
      c.save();c.globalAlpha=.22+.06*Math.sin(t*3);ellipse(c,G.x,G.y,110,G.half+34,col);c.restore();
      const gate=this.art.props?.[g===0?'gate-blue':'gate-gold'];
      if(gate){const h=G.half*2+H+30,w=h*gate.width/gate.height;c.save();c.translate(G.x,0);if(g===1)c.scale(-1,1);c.drawImage(gate,-w/2,bot+14-h,w,h);c.restore();continue;}
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
  // A shot: a bubble in the bubbles Wonder, half see-through as an afterimage (ghost), ringed in the holder's colour when it comes from a copied super.
  drawShot(s,t,m=this.m){const c=this.ctx,x=s.x,y=s.y-38*(this.size||1);
    if(m?.wonder?.id==='bubbles'&&m.wonder.state==='active')return this.drawBubbleShot(s,t,x,y);
    if(s.ghost){c.save();c.globalAlpha*=.5;this.drawShotBody(s,t,m);c.restore();}else this.drawShotBody(s,t,m);
    if(typeof s.tint2==='string'){const r=(s.r||8)*1.9;ellipse(c,x,y,r,r,null,INK,5);ellipse(c,x,y,r,r,null,s.tint2,3);}}
  drawBubbleShot(s,t,x,y){const c=this.ctx,r=Math.max(9,(s.r||8)*1.3),col=s.owner===1?'#ff6b8a':s.color||'#9fe8ff',w=this.reduced?0:Math.sin(t*9+(s.id||0))*.07;
    ellipse(c,s.x,s.y+1,r*.8,r*.24,'#12393222');if(s.bounced)ellipse(c,x,y,r*1.5,r*1.5,null,'#9be86a',3);c.save();c.translate(x,y);c.scale(1+w,1-w);
    const g=c.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);g.addColorStop(0,'#ffffff66');g.addColorStop(.6,col+'26');g.addColorStop(1,col+'77');ellipse(c,0,0,r,r,g,INK,2.5);ellipse(c,0,0,r-2.5,r-2.5,null,col,2);
    c.beginPath();c.arc(0,0,r*.68,-2.7,-1.7);c.strokeStyle='#ffffffdd';c.lineWidth=Math.max(2,r*.16);c.lineCap='round';c.stroke();ellipse(c,r*.38,r*.34,r*.1,r*.1,'#ffffffaa');c.restore();
    if(typeof s.tint2==='string')ellipse(c,x,y,r*1.25,r*1.25,null,s.tint2,3);}
  drawShotBody(s,t,m=this.m) {const c=this.ctx,x=s.x,y=s.y-38*(this.size||1),bouncy=m?.wonder?.id==='bouncy'&&m.wonder.state==='active';ellipse(c,s.x,s.y+1,s.r,s.r*.3,'#12393233');
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
  // A copied super keeps its own colour (src) with the holder's colour as a second ring (tint2).
  drawWave(w,m,t) {const c=this.ctx,color=w.src&&CREATURES[w.src]?CREATURES[w.src].color:w.owner>=0?CREATURES[m.actors[w.owner]?.id]?.color||'#ff7a2c':'#ff7a2c',t2=typeof w.tint2==='string'?w.tint2:null,pct=w.age/w.life;c.save();c.globalAlpha=Math.max(0,1-pct);
    if(w.kind==='beam'){c.translate(w.x,w.y-40);c.rotate(w.angle);c.shadowColor='#ffd54a';c.shadowBlur=30;if(t2){c.fillStyle=t2;c.fillRect(0,-w.r*1.3,1100,w.r*2.6);}c.fillStyle='#ffe58a';c.fillRect(0,-w.r,1100,w.r*2);c.fillStyle='#ffffff';c.fillRect(0,-w.r*.4,1100,w.r*.8);}
    else if(w.kind==='mind'){const r=w.r*Math.min(1,w.age/.3);for(let i=0;i<3;i++){const q=r*(1-i*.22);ellipse(c,w.x,w.y-20,q,q*.75,i===0?'#a77bff22':null,i===1?'#ffffff':'#b88cff',4-i);}if(t2)ellipse(c,w.x,w.y-20,r*1.1,r*.83,null,t2,4);
      for(let i=0;i<6;i++){const ang=t*3+i*1.05;star(c,w.x+Math.cos(ang)*r*.8,w.y-20+Math.sin(ang)*r*.6,6,'#f3e8ff');}}
    else if(w.kind==='blast'){const r=w.r*Math.min(1,w.age/.18);glow(c,w.x,w.y-10,r*1.2,'#ff8a2a88');ellipse(c,w.x,w.y,r,r*.8,'#ff5a1f33','#ffb43a',6);ellipse(c,w.x,w.y,r*.6,r*.48,null,'#fff1a8',3);if(t2)ellipse(c,w.x,w.y,r*1.1,r*.88,null,t2,4);}
    else if(w.kind==='wave'){c.translate(w.x,w.y-27);c.rotate(w.angle);c.shadowColor=color;c.shadowBlur=20;for(let i=0;i<3;i++){c.beginPath();c.ellipse(-i*14,0,31,w.r,0,-Math.PI/2,Math.PI/2);c.lineWidth=15-i*4;c.strokeStyle=i===0?'#c1ffff':color;c.stroke();}
      if(t2){c.beginPath();c.ellipse(-46,0,31,w.r*1.04,0,-Math.PI/2,Math.PI/2);c.lineWidth=6;c.strokeStyle=t2;c.stroke();}}
    else{const r=w.r*Math.min(1,w.age/.22);ellipse(c,w.x,w.y,r,r*.8,color+'18',color,5);ellipse(c,w.x,w.y,r*.7,r*.56,null,'#fff8d2',2);if(t2)ellipse(c,w.x,w.y,r*1.1,r*.88,null,t2,4);
      if(w.kind==='electric')for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.5;line(c,[[w.x,w.y-25],[w.x+Math.cos(a)*r*.6+9,w.y+Math.sin(a)*r*.45-20],[w.x+Math.cos(a)*r,w.y+Math.sin(a)*r*.8-12]],'#fff4aa',3);}}
    c.restore();
  }
  drawZone(z,t){const c=this.ctx;
    if(typeof z.tint2==='string'&&!z.done&&z.kind!=='bells'){c.save();c.globalAlpha=Math.max(0,Math.min(1,(z.life-z.age)*2))*.8;ellipse(c,z.x,z.y,(z.r||60)*1.1,(z.r||60)*.88,null,z.tint2,4);c.restore();}
    if(z.kind==='stomp')return this.drawStompZone(z,t);if(z.kind==='pendulum')return this.drawPendulum(z,t);if(z.kind==='puddle')return this.drawPuddle(z,t);
    this.drawZoneKind(z,t);}
  // Tzadon's stomps: a ring marks each one before it lands (the landing itself is the 'stomp' effect).
  drawStompZone(z,t){const c=this.ctx,d=z.delay||0;if(z.age>=d||z.done)return;const pct=clamp(z.age/Math.max(.01,d),0,1);c.save();c.globalAlpha=.55+.45*pct;c.setLineDash([10,8]);c.lineDashOffset=this.reduced?0:-t*30;ellipse(c,z.x,z.y,z.r,z.r*.8,'#8a5a2c18','#e0a96d',3);c.restore();ellipse(c,z.x,z.y,z.r*pct,z.r*.8*pct,'#c98a4a38');}
  // The Rhythm Deer's pendulum: first the whole sweep is marked (dashed), then a copper weight swings from a0 to a1 and leaves a glow where it passed.
  drawPendulum(z,t){const c=this.ctx,d=z.delay||0,life=z.life||d+1,q=clamp((z.age-d)/Math.max(.01,life-d),0,1),a0=+z.a0||0,a1=Number.isFinite(+z.a1)?+z.a1:a0+1,ang=a0+(a1-a0)*q,r=z.r||200,ry=.8,dir=Math.sign(a1-a0)||1;
    const sector=(u0,u1,rr=r)=>{c.beginPath();c.moveTo(z.x,z.y);for(let i=0;i<=18;i++){const a=u0+(u1-u0)*i/18;c.lineTo(z.x+Math.cos(a)*rr,z.y+Math.sin(a)*rr*ry);}c.closePath();};
    c.save();c.globalAlpha=Math.max(0,Math.min(1,(life-z.age)*3));
    // The warning: the whole sweep is painted copper and fills from the deer outward until the weight swings.
    if(z.age<d){const k=clamp(z.age/Math.max(.01,d),0,1),hot=Math.sin(t*18)>0;sector(a0,a1);c.fillStyle=hot?'#ff9a2e55':'#ff9a2e30';c.fill();sector(a0,a1,r*k);c.fillStyle='#ff9a2e44';c.fill();
      sector(a0,a1);c.lineJoin='round';c.strokeStyle=INK+'aa';c.lineWidth=5;c.stroke();c.setLineDash([12,9]);c.lineDashOffset=this.reduced?0:-t*30;c.strokeStyle='#ffd27a';c.lineWidth=3;c.stroke();c.setLineDash([]);
      const wx=z.x+Math.cos(a0)*r*.88,wy=z.y+Math.sin(a0)*r*ry*.88;ellipse(c,wx,wy,30,24,null,INK,5);ellipse(c,wx,wy,30,24,null,'#ffd27a',3);ellipse(c,wx,wy,30*k,24*k,'#e0893f66');}
    else{sector(a0,ang);c.fillStyle='#ffb45a40';c.fill();
      for(let i=1;i<=3;i++){const b0=ang-dir*.28*i,rr=r*(.5+.15*i);c.beginPath();c.ellipse(z.x,z.y,rr,rr*ry,0,Math.min(b0,ang-dir*.05),Math.max(b0,ang-dir*.05));c.strokeStyle=i===1?'#fff3c4':'#ffd27a';c.lineWidth=4-i;c.globalAlpha*=.85;c.stroke();}
      const wx=z.x+Math.cos(ang)*r*.88,wy=z.y+Math.sin(ang)*r*ry*.88-16;c.globalAlpha=1;c.save();c.globalCompositeOperation='lighter';glow(c,wx,wy,46,'#ffb45a88');c.restore();
      ellipse(c,wx,wy+16,15,5,'#182b3544');const g=c.createRadialGradient(wx-5,wy-6,2,wx,wy,17);g.addColorStop(0,'#ffe2b8');g.addColorStop(.5,'#e0893f');g.addColorStop(1,'#8a3e12');ellipse(c,wx,wy,17,17,g,INK,3);line(c,[[wx-12,wy-2],[wx+12,wy-2]],'#ffd27a',2.5);ellipse(c,wx-5,wy-7,4,3,'#fff4dc');}
    c.restore();}
  // A slow puddle (the Lab's puddle shot): water only, it never hurts.
  drawPuddle(z,t){const c=this.ctx,fade=Math.max(0,Math.min(1,(z.life-z.age)*3,z.age*8)),r=z.r||34;c.save();c.globalAlpha=fade*.85;ellipse(c,z.x,z.y,r,r*.55,'#36c9ed55','#d4ffff',2);if(!this.reduced)for(let i=0;i<2;i++){const q=(t*1.2+i*.5)%1;ellipse(c,z.x,z.y,r*q,r*.55*q,null,'#ffffff88',1.5);}c.restore();}
  drawZoneKind(z,t){
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
    // The opening: a bright ring that breathes (its own sound, 'boss-open', says now).
    if(b.phase==='recover'){
      const q=this.reduced?1:.5+.5*Math.sin(t*9);ellipse(c,a.x,a.y,62,43,'#66ffd538','#95ffe2',4);ellipse(c,a.x,a.y,62+10*q,43+7*q,null,'#e9fff8',2+2*q);
    }c.restore();
  }
  drawPickup(p,t) {const c=this.ctx,y=p.y-17+Math.sin(t*3)*4,img=this.art.props?.crystal;if(img){glow(c,p.x,y,54,'#6ff1ad66');ellipse(c,p.x,p.y,24,10,'#00000033');const s=58/Math.max(img.width,img.height);c.drawImage(img,p.x-img.width*s/2,y-img.height*s/2,img.width*s,img.height*s);return;}glow(c,p.x,p.y,50,'#6ff1ad66');ellipse(c,p.x,p.y,28,13,'#76e8be44','#c9ffe4',2);c.save();c.translate(p.x,y);c.rotate(Math.PI/4);c.fillStyle='#5bd5a1';c.strokeStyle='#e7fff5';c.lineWidth=2;c.beginPath();c.roundRect(-12,-12,24,24,4);c.fill();c.stroke();c.restore();line(c,[[p.x-7,y],[p.x+7,y]],'#fff',4);line(c,[[p.x,y-7],[p.x,y+7]],'#fff',4);}
  // Wonder floor layers: frost creeping in from the oval's edge on ice, ink lightning on the rim in a storm.
  // Where a Wonder has its own painted arena (ice on the coast, bubbles at sea, the storm in the wind), the painting is the whole show; elsewhere an overlay.
  drawWonderFloor(m){const W=m.wonder;if(!W||W.state!=='active')return;const A=core.WONDER_TIMES?.active??12,e=Math.max(0,Math.min(1,W.age/.5,W.endless?1:(A-W.age)/.5));if(e<=0)return;
    if(this.variant.name&&this.variant.mix>0)return;
    if(W.id==='ice')this.drawFrost(e);else if(W.id==='storm')this.drawStorm(e,W.age);else if(W.id==='bubbles')this.drawBubbleRim(e,W.age);}
  // Ice: a pale frost vignette only at the oval's edge (the floor stays clear and bright), with snowflakes on the rim.
  drawFrost(e){const c=this.ctx,{cx,cy,rx,ry}=WORLD;c.save();c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU);c.clip();
    c.save();c.translate(cx,cy);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,rx*.8,0,0,rx);g.addColorStop(0,'#e8f8ff00');g.addColorStop(.55,'#e4f6ff26');g.addColorStop(1,'#f4fbff80');c.globalAlpha=e;c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();
    c.globalAlpha=e*.9;for(let i=0;i<22;i++){const a=i/22*TAU+.13,x=cx+Math.cos(a)*rx*.95,y=cy+Math.sin(a)*ry*.94,r=6+(i%3)*2.5;for(let k=0;k<3;k++){const b=k*Math.PI/3+i;line(c,[[x-Math.cos(b)*r,y-Math.sin(b)*r],[x+Math.cos(b)*r,y+Math.sin(b)*r]],'#7fb8e0',3.5);line(c,[[x-Math.cos(b)*r,y-Math.sin(b)*r],[x+Math.cos(b)*r,y+Math.sin(b)*r]],'#ffffff',1.6);}}
    c.restore();}
  // Bubbles away from the sea: big soap bubbles drift up around the rim.
  drawBubbleRim(e,age){const c=this.ctx,{cx,cy,rx,ry}=WORLD,n=this.lite?7:14;c.save();c.globalAlpha=e*.9;
    for(let i=0;i<n;i++){const j=this.lite?i*2:i,a=j/14*TAU+.2,q=(age*.18+j*.37)%1,x=cx+Math.cos(a)*rx*(.9+.06*Math.sin(age+j)),y=cy+Math.sin(a)*ry*.92-q*90,r=9+(j%4)*4;c.globalAlpha=e*.85*Math.sin(Math.PI*q);
      ellipse(c,x,y,r,r,'#bff3ff22','#e8fbff',2);c.beginPath();c.arc(x,y,r*.65,-2.6,-1.7);c.strokeStyle='#ffffffcc';c.lineWidth=2;c.stroke();}c.restore();}
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
  // ---- Wave 2: the backdrop, the spectacle entrance, the Two Tracks floor and props, the comeback and copy stars, the new Wonders.
  // The arena, with a Wonder's own painting fading in over it (.6 s in at the start, .6 s out before the end, read from the Wonder's age so a guest sees it too),
  // and the spectacle guardian's night falling over 1 s of real time at its staged beat. Calm motion: .2 s fades.
  drawBackdrop(m){const c=this.ctx,A=this.art,base=A.arenas?.[m.arena]||A.arenas?.[ARENA_STAND_IN[m.arena]]||A.arena;c.drawImage(base,0,0,1280,720);this.mirrorBackdrop(base);
    const W=m.wonder,name=W?.state==='active'?WONDER_ARENA[W.id]?.[m.arena||'coast']:null,img=name?A.variants?.[name]:null,T=this.reduced?.2:.6,act=core.WONDER_TIMES?.active??12;
    const mix=img?clamp(W.endless?W.age/T:Math.min(W.age/T,(act-W.age)/T),0,1):0;this.variant={name:img?name:null,mix};
    if(mix>0){c.save();c.globalAlpha=mix;c.drawImage(img,0,0,1280,720);this.mirrorBackdrop(img);c.restore();}
    const N=PHASE2_ARENA[m.arena],night=N?A.variants?.[N]:null,want=!!m.spectacle&&(m.spectacle.stage===2||m.spectacle.beat>0);
    this.night=want?Math.min(1,this.night+this.realDt/(this.reduced?.2:1)):0;if(night&&this.night>0){c.save();c.globalAlpha=ease(this.night);c.drawImage(night,0,0,1280,720);this.mirrorBackdrop(night);c.restore();}
    this.shadeBand();}
  // What the screen shows of the world: the painting's 1280x720, and on a sideways phone past its edges to the screen's (a little over, for the shake).
  // A veil or tint over the whole arena fills this, so it never ends in a hard edge across the mirrored stands.
  seen(){if(!this.wide||!(this.scale>0))return {x:0,y:0,w:1280,h:720};const k=this.scale,x0=Math.min(0,-this.offsetX/k-4),y0=Math.min(0,-this.offsetY/k-4),x1=Math.max(1280,(this.w-this.offsetX)/k+4),y1=Math.max(720,(this.h-this.offsetY)/k+4);return {x:x0,y:y0,w:x1-x0,h:y1-y0};}
  // A sideways phone sees past the painting's edges (its stands, and the HUD band above the arena): the painting goes on there, mirrored at its edge.
  mirrorBackdrop(img){if(!this.wide||!img?.width)return;const c=this.ctx,k=this.scale,x0=-this.offsetX/k,x1=(this.w-this.offsetX)/k,y0=-this.offsetY/k;if(x0>=0&&x1<=1280&&y0>=0)return;
    const sx=img.width/1280,sy=img.height/720,a=clamp(2-x0,0,1280),r=clamp(x1-1278,0,1280),b=clamp(2-y0,0,720);
    const part=(ex,ey,fx,fy,u,v,w,h)=>{if(w<=0||h<=0)return;c.save();c.translate(ex,ey);c.scale(fx,fy);c.drawImage(img,u*sx,v*sy,w*sx,h*sy,u,v,w,h);c.restore();};
    for(const [ey,fy,v,h] of [[0,1,0,720],[0,-1,0,b]]){if(fy<0)part(0,0,1,-1,0,0,1280,h);part(0,ey,-1,fy,0,v,a,h);part(2560,ey,-1,fy,1280-r,v,r,h);}}
  // The band above the arena is the stands in shade, so the clock, the pause button and the score read on it; the shade reaches past the painting's edge.
  // The mirrored stands at the sides fade into shade too, so the eye stays on the arena.
  shadeBand(){if(!this.wide)return;const c=this.ctx,k=this.scale,x0=-this.offsetX/k,x1=(this.w-this.offsetX)/k,y0=-this.offsetY/k,y2=(this.h-this.offsetY)/k;
    for(const [a,b] of [[0,x0],[1280,x1]])if(Math.abs(b-a)>2){const g=c.createLinearGradient(a,0,b,0);g.addColorStop(0,'#0b1a2200');g.addColorStop(1,'#0b1a22a6');c.fillStyle=g;c.fillRect(Math.min(a,b),y0,Math.abs(b-a),y2-y0);}
    if(this.offsetY<=0)return;const y1=Math.max((this.band+6-this.offsetY)/k,16/k),g=c.createLinearGradient(0,y0,0,Math.max(y1,y0+1));
    g.addColorStop(0,'#0b1a22e6');g.addColorStop(.75,'#0b1a2299');g.addColorStop(1,'#0b1a2200');c.fillStyle=g;c.fillRect(Math.min(x0,0)-2,y0,Math.max(x1,1280)-Math.min(x0,0)+4,y1-y0);}
  // How far the spectacle entrance has come (0..1), from the countdown alone: nothing in the battle moves while it plays.
  entrance(m){if(!m?.spectacle||m.status!=='countdown')return null;return clamp(1-m.countdown/(core.SPECTACLE_COUNTDOWN??2.8),0,1);}
  riseOf(a,m){if(!m?.spectacle||a.side!==m.spectacle.side)return null;const u=this.entrance(m);if(u==null)return null;if(u<.45)return {hide:true};
    const q=clamp((u-.45)/.45,0,1),still=this.reduced;return {oy:still?0:80*(1-ease(q)),k:still?1:q<.7?.6+.5*ease(q/.7):1.1-.1*ease((q-.7)/.3),ink:.85*(1-ease(clamp(q*1.25,0,1))),bar:ease(clamp((u-.8)/.2,0,1))};}
  // Twelve ink drips stretch down from the top of the arena and an ink pool spreads under the guardian; both fade in the first second of the fight.
  drawEntrance(m){const S=m.spectacle,g=m.actors[S.side],u=this.entrance(m),after=u==null?m.time:0;if(!g||u==null&&after>1.2)return;const c=this.ctx,fx=this.art.fx||{},U=u??1,fade=u!=null?1:clamp(1-after/1.2,0,1);
    const top=Math.max(0,-this.offsetY/this.scale)-4,n=this.lite?6:12;
    for(let i=0;i<n;i++){const j=this.lite?i*2:i,R=rnd(j*31+7),x=96+j*99+(R()-.5)*44,len=(110+R()*170)*ease(clamp((U-j*.015)/.42,0,1)),w=22+R()*14,img=fx['drip-'+(j%4+1)];if(len<3)continue;
      c.save();c.globalAlpha=fade;if(img?.width)c.drawImage(img,x-w/2,top,w,len);else{c.fillStyle='#24163c';c.beginPath();c.roundRect(x-w*.18,top,w*.36,len-w*.3,w*.18);c.fill();ellipse(c,x,top+len-w*.32,w*.3,w*.36,'#24163c');ellipse(c,x-w*.08,top+len-w*.4,w*.07,w*.1,'#8a6fd0');}c.restore();}
    const q=ease(clamp((U-.18)/.4,0,1));if(q>0){const w=g.radius*5.4*q*(this.size||1);c.save();c.globalAlpha=fade;if(!sprite(c,fx['ink-pool'],g.x,g.y+4,w,0,1,.55))ellipse(c,g.x,g.y+4,w*.5,w*.2,'#22163acc',INK,2);c.restore();}}
  // Things that lie on the floor under everyone: the hill, the drum tiles, the gate's floor ring, a Wonder's floor items.
  drawFloorExtras(m,t){if(m.hill)this.drawHill(m,t);if(m.drums)this.drawDrums(m,t);if(m.race)this.drawGateFloor(m,t);}
  drawHill(m,t){const H=m.hill,c=this.ctx,L=this.localSide,r=H.r||core.HILL_R||120,ry=r*.8;
    // The ring slides to its new spot instead of jumping.
    if(!this.hillAt)this.hillAt={x:H.x,y:H.y};else{const k=this.reduced?1:Math.min(1,this.realDt*6);this.hillAt.x+=(H.x-this.hillAt.x)*k;this.hillAt.y+=(H.y-this.hillAt.y)*k;}
    const x=this.hillAt.x,y=this.hillAt.y,in0=!!H.in?.[0],in1=!!H.in?.[1],hold=H.holder??-1,pulse=.5+.5*Math.sin(t*6);
    // The warning: a dashed ring where it goes next, and an arrow from here to there.
    if(H.next){c.save();c.globalAlpha=.55+.35*(.5+.5*Math.sin(t*10));c.setLineDash([12,10]);c.lineDashOffset=-t*40;ellipse(c,H.next.x,H.next.y,r,ry,'#fff3c41c','#fff3c4',4);c.restore();
      const dx=H.next.x-x,dy=H.next.y-y,d=Math.hypot(dx,dy);if(d>r){const ux=dx/d,uy=dy/d,x0=x+ux*r*.95,y0=y+uy*ry*.95,x1=H.next.x-ux*r*.95,y1=H.next.y-uy*ry*.95,ang=Math.atan2(y1-y0,x1-x0);
        c.save();c.setLineDash([6,10]);c.lineDashOffset=-t*50;line(c,[[x0,y0],[x1,y1]],INK,7);line(c,[[x0,y0],[x1,y1]],'#ffe27a',3.5);c.restore();c.save();c.translate(x1,y1);c.rotate(ang);c.beginPath();c.moveTo(4,0);c.lineTo(-16,-12);c.lineTo(-16,12);c.closePath();c.fillStyle='#ffe27a';c.fill();c.lineWidth=3;c.strokeStyle=INK;c.stroke();c.restore();}}
    // The fill: the holder's colour; both colours when both stand in it; nothing when it is empty.
    c.save();c.beginPath();c.ellipse(x,y,r,ry,0,0,TAU);c.clip();
    if(in0&&in1){c.globalAlpha=.32;c.fillStyle=sideColor(0,L);c.fillRect(x-r,y-ry,r,ry*2);c.fillStyle=sideColor(1,L);c.fillRect(x,y-ry,r,ry*2);c.globalAlpha=.6;c.setLineDash([8,8]);line(c,[[x,y-ry],[x,y+ry]],'#fff4dc',3);}
    else if(hold>=0||in0||in1){const s=hold>=0?hold:in0?0:1;c.globalAlpha=.26+.1*pulse;c.fillStyle=sideColor(s,L);c.fillRect(x-r,y-ry,r*2,ry*2);}
    else{c.globalAlpha=.12;c.fillStyle='#fff3c4';c.fillRect(x-r,y-ry,r*2,ry*2);}c.restore();
    // The painted ring: ink, cream and a gold band that turns while someone holds it.
    ellipse(c,x,y,r,ry,null,INK,9);ellipse(c,x,y,r,ry,null,'#f3e2b8',5);c.save();c.setLineDash([14,12]);c.lineDashOffset=hold>=0&&!this.reduced?-t*36:0;ellipse(c,x,y,r-1,ry-1,null,hold>=0?sideColor(hold,L):'#ffd23a',3);c.restore();
    for(let i=0;i<4;i++){const g=i*TAU/4+Math.PI/4;star5(c,x+Math.cos(g)*r,y+Math.sin(g)*ry,7,'#ffd23a',INK,2);}
    // A point scored: a little gold star rises from the holder.
    const P=H.points||[0,0];for(const s of [0,1]){const n=Math.floor(P[s]||0);if(n>this.hillPts[s]&&n-this.hillPts[s]<3){const a=m.actors[s];if(a)this.pops.push({x:a.x,y:a.y-a.spec.height*(this.size||1)-30,t:0,col:sideColor(s,L)});}this.hillPts[s]=n;}}
  // Drum tiles (the dance Wonder, the Rhythm Deer's second stage): a lit tile shines and pops on its beat.
  drawDrums(m,t){const D=m.drums,c=this.ctx,fx=this.art.fx||{};if(!Array.isArray(D?.tiles))return;
    D.tiles.forEach((T,i)=>{const lit=!!D.lit?.[i];if(lit&&!this.lastLit[i])this.drumFx[i]=.28;this.lastLit[i]=lit;const beat=lit&&this.beatAt!=null?Math.max(0,.2-(this.clock-this.beatAt)):0,p=this.drumFx[i]=Math.max(0,(this.drumFx[i]||0)-this.realDt),k=1+(this.reduced?0:.16*Math.max(p/.28,beat/.2*.6)),r=T.r||46,w=r*2.3*k;
      ellipse(c,T.x,T.y+r*.32,r*1.08,r*.36,'#182b3544');if(lit){c.save();c.globalCompositeOperation='lighter';glow(c,T.x,T.y,r*1.7,'#ffd23a77');c.restore();}
      if(!sprite(c,fx[lit?'drum-lit':'drum'],T.x,T.y,w,0,1,.55)){ellipse(c,T.x,T.y+r*.18,r*1.05*k,r*.5*k,'#b8743a',INK,3);ellipse(c,T.x,T.y,r*k,r*.45*k,lit?'#ffe27a':'#f3e2b8',INK,3);star5(c,T.x,T.y,r*.22*k,lit?'#ff9a2e':'#e0b170',INK,1.5);}});}
  // The current gate's floor ring and two lights, one per ally: a light stays full while that ally counts as inside (RACE_TOGETHER).
  drawGateFloor(m,t){const R=m.race,g=R.gates?.[R.at];if(!g)return;const c=this.ctx,L=this.localSide,r=g.r||70,T=core.RACE_TOGETHER??1.5,last=R.lastIn||[];
    c.save();c.globalAlpha=.7+.2*Math.sin(t*5);c.setLineDash([12,9]);c.lineDashOffset=-t*30;ellipse(c,g.x,g.y,r,r*.8,'#ffe27a22','#ffe27a',4);c.restore();
    // Standing in it together fills the gate's ring of light; full, it swings open.
    {const v=clamp((R.fill||0)/(core.RACE_FILL||1),0,1);if(v>0){c.save();c.lineCap='round';for(const [col,w] of [[INK,10],['#ffd23a',6]]){c.beginPath();c.ellipse(g.x,g.y,r,r*.8,0,-Math.PI/2,-Math.PI/2+v*TAU);c.strokeStyle=col;c.lineWidth=w;c.stroke();}c.restore();}}
    [[0,sideColor(0,L)],[1,sideColor(2,L)]].forEach(([k,col],i)=>{const v=Number.isFinite(last[k])?clamp(1-(m.time-last[k])/T,0,1):0,x=g.x+(i?1:-1)*r*.42,y=g.y+r*.8+12;
      ellipse(c,x,y,11,11,'#0b2430cc',INK,2.5);if(v>0){c.beginPath();c.moveTo(x,y);c.arc(x,y,9,-Math.PI/2,-Math.PI/2+v*TAU);c.closePath();c.fillStyle=col;c.fill();}ellipse(c,x,y,11,11,null,v>=1?'#fff4dc':col,2);});}
  // Things that stand in the arena and take their turn by depth with the creatures.
  props(m,dt,t){const out=[];
    if(m.decoy&&m.decoy.t>0)out.push({y:m.decoy.y,draw:()=>this.drawDecoy(m.decoy,dt,m)});
    if(m.race)this.raceProps(m,t,out);
    for(const s of m.copyStars||[])out.push({y:s.y,draw:()=>this.drawCopyStar(s,t)});
    if(m.comeback)out.push({y:m.comeback.y,draw:()=>this.drawComeback(m.comeback,t)});
    const X=m.wonderX,W=m.wonder;if(X&&W?.state==='active'){if(W.id==='mushrooms')for(const s of X.shrooms||[])out.push({y:s.y,draw:()=>this.drawShroom(s,t)});
      if(W.id==='popcorn')for(const k of X.kernels||[])out.push({y:k.y,draw:()=>this.drawKernel(k,t)});}
    return out;}
  // The pair race: the gate to open now (closed), the one after it (faint), the gates already passed (open), the finish arch on the fifth; shadow wisps drift.
  raceProps(m,t,out){const R=m.race,n=R.gates?.length||0,at=R.at??0,fx=this.art.fx||{};
    (R.gates||[]).forEach((g,i)=>{if(i>at+1)return;const opening=m.effects.find(e=>e.type==='gate-open'&&e.gate===i),last=i===n-1;
      out.push({y:g.y,draw:()=>{const c=this.ctx,r=g.r||70,w=r*2.3,p=opening?opening.age:null;
        if(last){const a=i<=at?1:.35,img=fx['finish-arch'];if(!sprite(c,img,g.x,g.y+r*.18,r*2.5,0,a,.94)){c.save();c.globalAlpha=a;line(c,[[g.x-r,g.y],[g.x-r,g.y-r*1.6],[g.x+r,g.y-r*1.6],[g.x+r,g.y]],INK,9);line(c,[[g.x-r,g.y],[g.x-r,g.y-r*1.6],[g.x+r,g.y-r*1.6],[g.x+r,g.y]],'#e0893f',5);c.restore();}return;}
        // A passed gate stands open for a moment, then fades away so the field stays clear.
        if(i<at&&!(p!=null&&p<.45)){if(p!=null)this.gateSprite(g,'open',1-ease((p-.45)/.55),1);return;}
        if(p!=null&&p<.45){const q=p/.45;this.gateSprite(g,'closed',1-q,1);this.gateSprite(g,'open',q,this.reduced?1:.85+.15*Math.sin(q*Math.PI)+.15*q);return;}
        this.gateSprite(g,'closed',i===at?1:.35,1);}});});
    (R.wisps||[]).forEach((wv,i)=>out.push({y:wv.y,draw:()=>{const c=this.ctx,f=this.size||1,bob=this.reduced?0:Math.sin(t*3+i*1.7)*6,y=wv.y-34*f+bob,w=62*f,img=fx['wisp-'+(i%2+1)];
      ellipse(c,wv.x,wv.y+2,22*f,7*f,'#120a1f40');c.save();c.translate(wv.x,y);if((wv.vx||0)>0)c.scale(-1,1);if(!this.reduced)c.rotate(Math.sin(t*2+i)*.08);
      if(!sprite(c,img,0,0,w,0,.92)){ellipse(c,0,0,w*.32,w*.38,'#2a1840cc');for(const s of [-1,1])ellipse(c,s*w*.1,-w*.06,w*.05,w*.04,'#e9d8ff');}c.restore();}}));}
  gateSprite(g,kind,alpha,k){if(alpha<=0)return;const c=this.ctx,r=g.r||70,w=r*2.3*k,img=this.art.fx?.['gate-'+kind];
    if(sprite(c,img,g.x,g.y+r*.15,w,0,alpha,kind==='open'?.93:.9))return;c.save();c.globalAlpha*=alpha;for(const s of [-1,1]){c.fillStyle='#8a5a2c';c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.roundRect(g.x+s*r*.9-7,g.y-r*.9,14,r*.9+6,4);c.fill();c.stroke();}
    if(kind==='closed'){line(c,[[g.x-r*.9,g.y-r*.55],[g.x+r*.9,g.y-r*.55]],INK,11);line(c,[[g.x-r*.9,g.y-r*.55],[g.x+r*.9,g.y-r*.55]],'#ff9a2e',7);}else{line(c,[[g.x-r*.9,g.y-r*.6],[g.x-r*.3,g.y-r*1.6]],INK,11);line(c,[[g.x-r*.9,g.y-r*.6],[g.x-r*.3,g.y-r*1.6]],'#ff9a2e',7);}c.restore();}
  // A copy star: the painted star with the copied creature's super picture in its blank middle, a ring in the owner's colour, a hop as it lands, a blink before it goes.
  drawCopyStar(s,t){const c=this.ctx,f=this.size||1,still=this.reduced,hop=s.age<.5&&!still?Math.sin(Math.PI*s.age/.5)*70:0,bob=still?0:Math.sin(t*3+s.x*.01)*4*f,y=s.y-32*f-hop-bob,w=58*f,cr=CREATURES[s.kind];
    const a=s.t<1.5&&Math.sin(t*22)<0?.35:1;ellipse(c,s.x,s.y+2,24*f,8*f,'#182b3544');ellipse(c,s.x,s.y+2,30*f,11*f,null,sideColor(s.owner,this.localSide),3);
    c.save();c.globalAlpha=a;c.globalCompositeOperation='lighter';glow(c,s.x,y,w*.9,'#fff3b066');c.restore();
    if(!sprite(c,this.art.fx?.['copy-star'],s.x,y,w,still?0:Math.sin(t*2)*.08,a)){c.save();c.globalAlpha=a;star5(c,s.x,y,w*.5,'#ffd23a',INK,3);ellipse(c,s.x,y+w*.03,w*.2,w*.2,CREAM,INK,1.5);c.restore();}
    const ic=iconImage(cr?.specialIcon,cr?.dark||INK);c.save();c.globalAlpha=a;if(ic)c.drawImage(ic,s.x-w*.18,y+w*.04-w*.18,w*.36,w*.36);else ellipse(c,s.x,y+w*.03,w*.12,w*.12,cr?.color||'#ffd23a',INK,1.5);c.restore();}
  // The comeback star falls from the sky with its paper tail (COMEBACK_FALL), then bobs where it landed; a ring in the side's colour marks the spot.
  drawComeback(S,t){const c=this.ctx,f=this.size||1,F=core.COMEBACK_FALL??.8,fall=S.age<F,q=fall?ease(S.age/F):1,still=this.reduced,img=this.art.fx?.['comeback-star'];
    const a=!fall&&S.t<1.5&&Math.sin(t*22)<0?.35:1,bob=fall||still?0:Math.sin(t*3.2)*5*f,x=S.x-(still?0:(1-q)*220),y=S.y-36*f-(still?0:(1-q)*480)-bob,w=92*f;
    ellipse(c,S.x,S.y+2,26*f*(.4+.6*q),9*f*(.4+.6*q),'#182b3544');c.save();c.globalAlpha=.5+.4*Math.sin(t*8);ellipse(c,S.x,S.y+2,34*f,13*f,null,sideColor(S.side,this.localSide),3);c.restore();
    c.save();c.globalCompositeOperation='lighter';c.globalAlpha=a;glow(c,x,y,w*.8,'#fff3b077');c.restore();
    if(img?.width){const h=w*img.height/img.width;c.save();c.globalAlpha=a;c.drawImage(img,x-w*.73,y-h*.68,w,h);c.restore();}
    else{c.save();c.globalAlpha=a;RAINBOW.forEach((col,i)=>line(c,[[x-w*.55,y-w*.5+i*4],[x-w*.1,y-w*.1+i*3]],col,4));star5(c,x,y,w*.28,'#ffe27a',INK,3);c.restore();}
    if(!fall&&S.age<F+.4&&!still){const u=(S.age-F)/.4;for(let i=0;i<8;i++){const g=i*TAU/8;star(c,S.x+Math.cos(g)*(20+u*70)*f,S.y-20*f+Math.sin(g)*(10+u*30)*f,7*(1-u)+1,RAINBOW[i%6]);}}}
  // The decoy card: a see-through copy of that side's creature runs its mirrored path, with a faint ink shimmer.
  drawDecoy(D,dt,m){const a=m.actors[D.side];if(!a)return;if(this.decoyId!==a.id||!this.decoyPup){this.decoyPup=createPuppet(a.id);this.decoyId=a.id;}
    const p=this.decoyPup,c=this.ctx,f=this.size||1,S=f*this.bodyScale(a),flip=facesLeft(a.id)?(D.facing??1)>0:(D.facing??1)<0,lift=a.spec.flies?24:0,fade=Math.min(1,D.t/.4),worn=m.hats?.[D.side]?.[a.id]||null;
    ellipse(c,D.x,D.y+3,a.radius*1.45*S,a.radius*.48*S,'#182b3533');c.save();c.translate(D.x,D.y);c.scale(S,S);c.translate(-D.x,-D.y);
    const att=hatList(p,a.id,worn,{});drawPuppet(c,p,D.x,D.y-lift,a.spec.height,{flip,clip:'run',dt,alpha:.55*fade,skin:this.skins[D.side],time:this.clock,attachments:att.length?att:null});
    drawPuppet(c,p,D.x,D.y-lift,a.spec.height,{flip,clip:'run',dt:0,silhouette:'#2b2f7a',alpha:(.14+.1*Math.sin(this.clock*9))*fade});c.restore();}
  // Healing mushrooms: painted caps; one that was eaten grows back from a little bud.
  drawShroom(s,t){const c=this.ctx,f=this.size||1,g=typeof s.up==='number'?clamp(s.up,0,1):s.up?1:.2,k=(.3+.7*ease(g))*f*1.35,x=s.x,y=s.y,bob=g>=1&&!this.reduced?Math.sin(t*3+x)*1.5:0;
    ellipse(c,x,y+2,22*k,7*k,'#182b3544');if(g>=1){c.save();c.globalCompositeOperation='lighter';glow(c,x,y-20*k,38*k,'#ff9fb055');c.restore();}
    c.fillStyle='#fff1d6';c.strokeStyle=INK;c.lineWidth=2.5;c.beginPath();c.roundRect(x-7*k,y-24*k,14*k,24*k,6*k);c.fill();c.stroke();
    const top=y-22*k-bob,grd=c.createLinearGradient(x,top-22*k,x,top+4*k);grd.addColorStop(0,'#ff8a8a');grd.addColorStop(1,'#d94f63');c.beginPath();c.ellipse(x,top,26*k,20*k,0,Math.PI,TAU);c.quadraticCurveTo(x,top+9*k,x-26*k,top);c.closePath();c.fillStyle=grd;c.fill();c.lineWidth=3;c.stroke();
    for(const [u,v,r] of [[-12,-8,4.5],[3,-14,5],[13,-5,3.5],[-2,-4,3]])ellipse(c,x+u*k,top+v*k,r*k,r*.8*k,'#fff6e6');
    if(g>=1&&!this.reduced){const q=(t*.8+x*.01)%1;c.save();c.globalAlpha=1-q;c.fillStyle='#5dff9e';const px=x+14*k,py=top-26*k-q*16;c.fillRect(px-1.5,py-5,3,10);c.fillRect(px-5,py-1.5,10,3);c.restore();}}
  // Popcorn: fluffy kernels hop three times; h is the height of the hop (0..1).
  drawKernel(K,t){const c=this.ctx,f=this.size||1,h=clamp(K.h||0,0,1),x=K.x,y=K.y-h*58*f-9*f,rot=this.reduced?0:Math.sin(t*4+x)*.4;ellipse(c,x,K.y+2,11*f*(1-h*.4),4*f*(1-h*.4),'#182b3544');
    const puffs=[[0,0,7],[-6,-3,5.5],[6,-4,5.5],[1,-8,5],[-3,4,4.5]];c.save();c.translate(x,y);c.rotate(rot);c.scale(f,f);
    for(const [u,v,r] of puffs)ellipse(c,u,v,r+1.6,r+1.6,INK);for(const [u,v,r] of puffs)ellipse(c,u,v,r,r,'#fff6dc');ellipse(c,2,3,3,2.2,'#ffcf5a');ellipse(c,-2,-5,2,1.4,'#ffffff');c.restore();}
  // Night of the fireflies: the arena goes dark except for soft light around each fighter and the seed's spot; the fireflies glow.
  drawFireflies(m,t){const W=m.wonder;if(W.state!=='active')return;const act=core.WONDER_TIMES?.active??12,T=this.reduced?.2:.6,e=clamp(W.endless?W.age/T:Math.min(W.age/T,(act-W.age)/T),0,1);if(e<=0)return;
    const c=this.ctx,k=.25,V=this.seen(),cv=this.darkCv||(this.darkCv=document.createElement('canvas')),w=Math.ceil(V.w*k),h=Math.ceil(V.h*k);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}const g=cv.getContext('2d'),R=(core.FIREFLY_LIGHT??220)*k,flies=m.wonderX?.flies||[];
    g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,w,h);g.fillStyle='#0a1030';g.globalAlpha=.74;g.fillRect(0,0,w,h);g.globalAlpha=1;g.globalCompositeOperation='destination-out';
    const hole=(x,y,r)=>{x-=V.x;y-=V.y;const gr=g.createRadialGradient(x*k,y*k,0,x*k,y*k,r);gr.addColorStop(0,'#000');gr.addColorStop(.5,'#000');gr.addColorStop(1,'#0000');g.fillStyle=gr;g.fillRect(x*k-r,y*k-r,r*2,r*2);};
    for(const a of m.actors)if(a.hp>0&&!(a.out>0))hole(a.x,a.y-a.spec.height*.45,R);if(W.x!=null)hole(W.x,W.y,R*.8);for(const fl of flies)hole(fl.x,fl.y-30,R*.13);g.globalCompositeOperation='source-over';
    c.save();c.globalAlpha=e;c.drawImage(cv,V.x,V.y,w/k,h/k);c.restore();
    const n=this.lite?Math.ceil(flies.length/2):flies.length;c.save();c.globalAlpha=e;for(let i=0;i<n;i++){const fl=flies[this.lite?i*2:i];if(!fl)continue;const p=.6+.4*Math.sin(t*6+i*2),x=fl.x+(this.reduced?0:Math.cos(t*2+i*1.7)*4),y=fl.y-30+(this.reduced?0:Math.sin(t*3+i)*6);
      glow(c,x,y,30*p,'#ffe066aa');glow(c,x,y,12,'#fffbe0');for(const s of [-1,1])ellipse(c,x+s*6,y-5,6,3.5,'#e8f6ffcc',INK,1);ellipse(c,x,y,4.5,6,'#ffe94a',INK,1.5);ellipse(c,x,y-5,3,3,'#3a2a1a');}c.restore();}
  // Swap: in the last .8 s before the fighters trade places, three dots light up over each one and a dotted arc joins them.
  drawSwapTell(m){const X=m.wonderX,W=m.wonder;if(W.state!=='active'||!X||!(X.swapIn>0&&X.swapIn<=.8)||!W.endless&&W.age+X.swapIn>(core.WONDER_TIMES?.active??12)-.6)return;const c=this.ctx,f=this.size||1,q=1-X.swapIn/.8,n=Math.min(3,1+Math.floor(q*3)),live=m.actors.filter(a=>a.side!==2&&a.hp>0&&!(a.out>0));
    for(const a of live){const y=a.y-(a.spec.height*this.bodyScale(a)+(a.spec.flies?24:0)+54)*f;for(let i=0;i<3;i++)ellipse(c,a.x+(i-1)*15*f,y,5.5*f,5.5*f,i<n?'#c9a7ff':'#fff4dc88',INK,2);}
    if(live.length>=2){const [a,b]=live,my=Math.min(a.y,b.y)-150;c.save();c.setLineDash([3,10]);c.lineDashOffset=this.reduced?0:-this.clock*30;c.lineCap='round';c.beginPath();c.moveTo(a.x,a.y-50);c.quadraticCurveTo((a.x+b.x)/2,my,b.x,b.y-50);c.strokeStyle='#c9a7ff';c.lineWidth=4;c.stroke();c.restore();}}
  // The Rhythm Deer: a gold crack opens on its chest between beats (hits there count extra), and its antlers glow just before a strong beat.
  drawDeerBeat(a,p,height,flip,px,py,S,lift,m){const R=m.rhythm,c=this.ctx,sc=height/p.rig.artworkSize.height,t=this.clock,at=b=>{const q=partCenter(p,b);return q?{x:px+(flip?-1:1)*sc*q.x,y:py+sc*q.y}:null;};
    if(R.crack){const q=at('chest');if(q){const pulse=.75+.25*Math.sin(t*14),r=a.radius*1.1;c.save();c.globalCompositeOperation='lighter';glow(c,q.x,q.y,r*1.7*pulse,'#ffd23aaa');c.restore();
      const pts=[[0,-1],[.3,-.45],[-.2,-.05],[.25,.35],[-.05,.75],[.12,1]].map(([u,v])=>[q.x+u*r*.45,q.y+v*r*.5]);line(c,pts,INK,7);line(c,pts,'#ffe27a',3.5);line(c,[pts[2],[pts[2][0]-r*.3,pts[2][1]+r*.12]],'#ffe27a',2.5);}}
    const next=(R.beat|0)+1,strong=this.strongN!=null?((next-this.strongN)%2+2)%2===0:next%2===1,k=strong?clamp(((R.phase||0)-.7)/.3,0,1):0;
    if(k>0){c.save();c.globalCompositeOperation='lighter';for(const b of ['antlerFar','antlerNear']){const q=at(b);if(q)glow(c,q.x,q.y,26+34*k,k>.6?'#ffd27aee':'#ffd27a99');}c.restore();}}
  drawPops(){const c=this.ctx,f=this.size||1;for(let i=this.pops.length-1;i>=0;i--){const P=this.pops[i];P.t+=this.realDt;if(P.t>.8){this.pops.splice(i,1);continue;}const q=P.t/.8;c.save();c.globalAlpha=1-q*q;star5(c,P.x,P.y-q*40*f,(9-3*q)*f,'#ffd23a',INK,2);c.restore();}}
  drawEffect(e,m=this.m) {const c=this.ctx,p=e.age,f=this.size||1;c.save();c.globalAlpha=Math.max(0,1-p*1.4);
    // A hit is the attacker's painted splat: it pops from .55 to 1.1 in 120 ms and is gone by 350 ms, with paper flecks. Its number, if any, is drawNumber's.
    if(e.type==='hit'){const tg=(e.side!=null&&m?.actors?.[e.side])||this.nearest(e,m),th=tg?tg.spec.height*this.bodyScale(tg)+(tg.spec.flies?24:0):96,hy=e.y-th*.45*f,fam=e.fam||this.guessFam(e,m),img=this.art.fx?.['splat-'+fam],big=(e.special?1.3:1)*(e.form?1.15:1),R=rnd(seedOf(e.x,e.y));c.globalAlpha=1;
      if(p<.35){const sc=(.55+.55*ease(p/.12))*big,a=p<.2?1:1-(p-.2)/.15,rot=(e.x*13+e.y*7)%TAU,size=84*f*sc;if(!sprite(c,img,e.x,hy,size,rot,a))splatShape(c,e.x,hy,size*.42,rot,FAM_COLOR[fam]||'#ffe08a',a);}
      if(!this.lite&&p<.4){const n=3+Math.floor(R()*3);for(let i=0;i<n;i++){if(this.budget--<=0)break;const ang=-Math.PI/2+(R()-.5)*2.6,v=220+R()*260,x=e.x+Math.cos(ang)*v*p,y=hy+Math.sin(ang)*v*p+450*p*p,rot=R()*TAU+p*9,img2=this.art.fx?.['fleck-'+(i%4+1)];if(!sprite(c,img2,x,y,13*f,rot,1-p/.4))bitShape(c,x,y,8*f,rot,i%2?CREAM:FAM_COLOR[fam]||CREAM,1-p/.4);}}}
    // A shot that strikes stone: a little dust and chips. 'chip' is a rock being chipped by a shot.
    if(e.type==='stone'||e.type==='chip'){const big=e.type==='chip';c.globalAlpha=1;if(p<.45&&!sprite(c,this.art.fx?.puff,e.x,e.y-20*f,(big?30:24)*f*(1+p*1.6),0,1-p/.45))ellipse(c,e.x,e.y-20*f,(10+p*30)*f,(7+p*20)*f,'#fff4dc99');this.drawChips(e,big?3:2,big?.6:.45);}
    // Healing: green sparkles run along the creature's bar while it fills (the heal sound is the chime). No number.
    if(e.type==='heal'&&p<.75){const t=this.nearest(e,m),B=t&&this.st[t.side]?.bar;if(B){c.globalAlpha=1;for(let i=0;i<6;i++){const q=(p/.75+i/6)%1,x=B.x-B.w/2+B.w*((i*.37+p*.9)%1),y=B.y-q*22*f,s=(5-3*q)*f;c.save();c.globalAlpha=(1-q)*(1-p/.75*.5);c.fillStyle=i%2?'#5dff9e':'#d8ffe9';c.fillRect(x-s/4,y-s,s/2,s*2);c.fillRect(x-s,y-s/4,s*2,s/2);c.restore();}}}
    // A dodge: a small puff and two quick lines beside the creature (and a soft chirp). No word.
    if(e.type==='evade'&&p<.4){const h=(this.nearest(e,m)?.spec?.height||100)*f,y=e.y-h*.55;c.globalAlpha=1;if(!sprite(c,this.art.fx?.puff,e.x,y,(26+p*50)*f,0,1-p/.4))ellipse(c,e.x,y,(10+p*26)*f,(8+p*18)*f,'#fff4dcaa');
      for(const s of [-1,1])line(c,[[e.x+s*(22+p*40)*f,y-8*f],[e.x+s*(34+p*52)*f,y-12*f]],(e.color||'#ffffff')+'cc',3*(1-p/.4)+1);}
    if(e.type==='starfall'){const q=Math.min(1,p*2.2),b=this.art.props?.['burst-star'];c.save();c.globalAlpha=1-q;c.globalCompositeOperation='lighter';glow(c,e.x,e.y-10,(e.r||54)*1.6,'#fff3b0cc');if(b){const sz=(e.r||54)*(1.4+q*1.2);c.drawImage(b,e.x-sz/2,e.y-10-sz/2,sz,sz);}c.restore();}
    if(e.type==='echo'){const r=(e.r||84)*(.6+p*1.1);c.save();c.globalCompositeOperation='lighter';for(let i=0;i<3;i++)ellipse(c,e.x,e.y-14,r*(1-i*.22),r*.75*(1-i*.22),null,i===1?'#ffffff':(e.color||'#b7a6ff'),5-i);c.restore();}
    if(e.type==='thread'&&e.from&&e.to){c.save();c.globalCompositeOperation='lighter';c.setLineDash([10,6]);line(c,[[e.to.x,e.to.y-45],[(e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2-80],[e.x,e.y-45]],'#e9fbff',5);c.setLineDash([]);line(c,[[e.to.x,e.to.y-45],[e.x,e.y-45]],e.color||'#9fe8ff',2);c.restore();}
    if(e.type==='stitch'){for(let i=0;i<8;i++){const ang=i*.785+p*3,r=18+p*46;line(c,[[e.x+Math.cos(ang)*r,e.y-30+Math.sin(ang)*r*.6],[e.x+Math.cos(ang+.35)*(r+10),e.y-30+Math.sin(ang+.35)*(r+10)*.6]],i%2?'#fff3c4':(e.color||'#ffd27a'),4*(1-p));}}
    // A blocked shot: the light shield flashes (its sound says so); the boss's front guard flashes on the side it faces. No words.
    if(e.type==='light-block'&&p<.35){const t=this.nearest(e,m),h=(t?.spec?.height||100)*f,r=(t?.radius||24)*1.9*f,q=p/.35;c.globalAlpha=1-q;c.save();c.globalCompositeOperation='lighter';glow(c,e.x,e.y-h*.45,r*1.4,'#fff3b0cc');c.restore();ellipse(c,e.x,e.y-h*.45,r*(1+.25*q),r*1.05*(1+.25*q),null,'#ffffff',5*(1-q)+1);}
    if(e.type==='guard-block'&&p<.3){const b=this.nearest(e,m),ang=b?.boss?.angle??0,q=p/.3;c.globalAlpha=1-q;c.save();c.translate(e.x,e.y);c.scale(1,.8);c.beginPath();c.arc(0,0,60+14*q,ang-1.05,ang+1.05);c.lineWidth=14*(1-q)+3;c.strokeStyle='#ffffff';c.stroke();c.restore();}
    if(e.type==='weak-hit')ellipse(c,e.x,e.y-45,25+p*35,25+p*35,null,'#7effd9',3);
    if(e.type==='ember'){for(let i=0;i<10;i++){const ang=i*.63,r=10+p*70;ellipse(c,e.x+Math.cos(ang)*r,e.y-50+Math.sin(ang)*r*.6,4*(1-p),4*(1-p),'#ffb43a');}}
    if(e.type==='burn')ellipse(c,e.x,e.y-20-p*30,6*(1-p),6*(1-p),'#ff7a2c');
    if(e.type==='blown'){for(let i=0;i<12;i++){const ang=i*.52,r=p*120;ellipse(c,e.x+Math.cos(ang)*r,e.y-50+Math.sin(ang)*r*.6,7*(1-p),3*(1-p),'#cfffff');}}
    if(e.type==='goal'){for(let i=0;i<18;i++){const ang=i*.35,r=20+p*190;ellipse(c,e.x+Math.cos(ang)*r*.6,e.y-40+Math.sin(ang)*r,8*(1-p),8*(1-p),i%2?'#ffe08a':'#ffffff');}}
    if(e.type==='swap'){ellipse(c,e.x,e.y,40+p*120,(40+p*120)*.4,null,e.color||'#fff',5);}
    if(e.type==='big-kick'){ellipse(c,e.x,e.y,30+p*90,(30+p*90)*.4,null,e.color||'#fff',4);}
    if(e.type==='roar'){c.save();c.translate(e.x,e.y-40);c.rotate(e.angle);c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,0,e.reach,0);g.addColorStop(0,'#fff1a8');g.addColorStop(.5,(e.color||'#ff8a2a')+'cc');g.addColorStop(1,'#ff3b1a00');c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.arc(0,0,e.reach*(.6+p*.6),-e.half,e.half);c.closePath();c.fill();c.restore();}
    // Dizzy, rooted and silenced creatures wear their stars, vines and quiet sign (drawActor); the moment it starts only pops a small ring.
    if((e.type==='dizzy'||e.type==='rooted'||e.type==='silenced')&&p<.3){const t=this.nearest(e,m),h=(t?.spec?.height||100)*f,q=p/.3;c.globalAlpha=1-q;ellipse(c,e.x,e.y-h-30,(20+30*q)*f,(8+10*q)*f,null,e.type==='rooted'?'#8fcf55':e.type==='dizzy'?'#c9a7ff':'#cfe0ff',3);}
    if(e.type==='burrow'){for(let i=0;i<6;i++){const q=i/5;ellipse(c,e.from.x+(e.x-e.from.x)*q,e.from.y+(e.y-e.from.y)*q,16*(1-p),7*(1-p),'#8a5a2c99');}ellipse(c,e.x,e.y,40+p*40,16+p*16,null,'#e0a96d',4);}
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
    // Wave 2. A spark pops (a firefly, a kernel, a copy or comeback star taken): little stars burst out.
    if(e.type==='spark-pop'){c.globalAlpha=1;const n=Math.round((e.big?10:6)*(this.lite?.5:1)),r=(8+p*(e.big?80:46))*f,y=e.y-30*f;c.save();c.globalCompositeOperation='lighter';
      for(let i=0;i<n;i++){const g=i*TAU/n+(e.x%7);star(c,e.x+Math.cos(g)*r,y+Math.sin(g)*r*.6,((e.big?9:6)*(1-p)+1)*f,i%2?'#fff3b0':(e.color||'#ffe27a'));}c.restore();if(p<.6)ellipse(c,e.x,y,r*.8,r*.5,null,e.color||'#ffe27a',3*(1-p/.6)+.5);}
    // The comeback star's bump: a comic pow ring with short ink lines.
    if(e.type==='bump'){c.globalAlpha=Math.max(0,1-p*1.6);const r=(24+p*60)*f,y=e.y-34*f;for(let i=0;i<8;i++){const g=i*TAU/8+.2;line(c,[[e.x+Math.cos(g)*r*.6,y+Math.sin(g)*r*.42],[e.x+Math.cos(g)*r,y+Math.sin(g)*r*.7]],INK,5);line(c,[[e.x+Math.cos(g)*r*.62,y+Math.sin(g)*r*.43],[e.x+Math.cos(g)*r*.95,y+Math.sin(g)*r*.67]],e.color||'#fff36b',2.5);}star5(c,e.x,y,(14*(1-p)+4)*f,e.color||'#fff36b',INK,2);}
    // A gate opens: a ring of gold sparkles where it stood (the gate itself swings open in raceProps).
    if(e.type==='gate-open'){c.globalAlpha=1;const n=this.lite?6:12;for(let i=0;i<n;i++){const g=i*TAU/n,r=(20+p*120)*f;star(c,e.x+Math.cos(g)*r,e.y-40*f+Math.sin(g)*r*.55-p*30,(8*(1-p)+1)*f,i%3?'#ffe27a':'#fff4dc');}}
    // The Bridge Super: a bridge of light between the two friends for a moment, with sparkles running along it.
    if(e.type==='bridge'&&e.from&&e.to){const a0=p<.15?p/.15:p>.7?Math.max(0,1-(p-.7)/.3):1,x0=e.from.x,y0=e.from.y-46*f,x1=e.to.x,y1=e.to.y-46*f,len=Math.hypot(x1-x0,y1-y0),ang=Math.atan2(y1-y0,x1-x0),img=this.art.fx?.['bridge-light'];
      c.globalAlpha=1;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=a0*.7;line(c,[[x0,y0],[x1,y1]],(e.color||'#ffe27a')+'88',26*f);c.restore();
      c.save();c.translate(x0,y0);c.rotate(ang);c.globalAlpha=a0;if(img?.width){const h=Math.min(90*f,len*img.height/img.width);c.drawImage(img,0,-h*.62,len,h);}else{line(c,[[0,0],[len,0]],INK,9);line(c,[[0,0],[len,0]],'#ffe27a',5);for(let i=1;i<8;i++)line(c,[[len*i/8,-8],[len*i/8,8]],'#fff4dc',3);}c.restore();
      if(!this.reduced)for(let i=0;i<(this.lite?3:6);i++){const q=(p*1.6+i/6)%1;star(c,x0+(x1-x0)*q,y0+(y1-y0)*q-10-Math.sin(q*Math.PI)*16,7*a0,'#fff3b0');}}
    // The hill lands at its new spot: a gold ring settles and a few stars pop around it.
    if(e.type==='hill-move'){c.globalAlpha=Math.max(0,1-p*1.3);const R=(e.r||120)*(1.25-.25*ease(Math.min(1,p*2.5)));ellipse(c,e.x,e.y,R,R*.8,null,'#ffd23a',5*(1-p)+1);
      for(let i=0;i<(this.lite?4:8);i++){const g=i*TAU/(this.lite?4:8)+p,rr=R*(1+p*.25);star(c,e.x+Math.cos(g)*rr,e.y+Math.sin(g)*rr*.8-p*20,(8*(1-p)+1)*f,'#fff3b0');}}
    // The spectacle beat's shockwave: two rings, ink and light, rolling out from the guardian.
    if(e.type==='shock'){c.globalAlpha=Math.max(0,1-p);const R=(e.r||420)*ease(Math.min(1,p*1.4));ellipse(c,e.x,e.y,R,R*.62,null,INK,10*(1-p)+2);ellipse(c,e.x,e.y,R,R*.62,null,e.color||'#fff3c4',5*(1-p)+1);ellipse(c,e.x,e.y,R*.8,R*.5,null,'#ffffff88',3);}
    // Tzadon's stomp lands: a ring of dust and a few chips.
    if(e.type==='stomp'){c.globalAlpha=1;const r=(e.r||90)*(.5+.6*ease(Math.min(1,p*2))),n=this.lite?4:8;for(let i=0;i<n;i++){const g=i*TAU/n,x=e.x+Math.cos(g)*r,y=e.y+Math.sin(g)*r*.6;if(!sprite(c,tint(this.art.fx?.puff,e.color||'#c98a4a',.4),x,y-12,(30+p*30)*f,0,Math.max(0,1-p*1.3)))ellipse(c,x,y-10,14*(1-p)+4,10*(1-p)+3,'#c98a4a88');}
      if(p<.5)ellipse(c,e.x,e.y,r,r*.6,null,'#7a4a1c',4*(1-p*2)+1);this.drawChips(e,3,.5);}
    c.restore();
  }
  // Chips fly off a rock; on the Two Tracks field they are straw.
  drawChips(e,n,life){const c=this.ctx,p=e.age,f=this.size||1,hay=this.propKey==='tracks';if(p>=life)return;const R=rnd(seedOf(e.x,e.y)+7);for(let i=0;i<n;i++){if(this.budget--<=0)return;const ang=-Math.PI/2+(R()-.5)*2.2,v=170+R()*150,x=e.x+Math.cos(ang)*v*p,y=e.y-24*f+Math.sin(ang)*v*p+450*p*p,rot=R()*TAU+p*10,img=this.art.fx?.['chip-'+(i%3+1)],a=1-p/life;
    if(hay){c.save();c.globalAlpha=a;c.translate(x,y);c.rotate(rot);line(c,[[-7*f,0],[7*f,0]],'#5a3a14',4);line(c,[[-7*f,0],[7*f,0]],i%2?'#ffe08a':'#e8b64a',2.2);c.restore();}else if(!sprite(c,img,x,y,(12+R()*6)*f,rot,a))bitShape(c,x,y,9*f,rot,'#8f8a7a',a);}}
  nearest(e,m){let best=null,bd=Infinity;for(const a of m?.actors||[]){if(a.out>0)continue;const d=Math.hypot(a.x-e.x,a.y-e.y);if(d<bd){bd=d;best=a;}}return best;}
  // The damage number: the hits of a child here on a rival add up quietly (numberCounts, tallyHit); a sum pops when a fresh hit lands
  // 4.2 s of battle time after the last number (tallyPop). Never a number over a child's own creature, never for lava or burning ground.
  tallyNumbers(m){if(!m)return;const kids=numberKids(m,this.localSide),same=!!m.versus&&!m.online;
    for(const e of m.effects)if(e.type==='hit'&&!e.tl){e.tl=1;if(numberCounts(e,kids,same))tallyHit(this.tally,e,(m.time||0)-(e.age||0));}
    const n=tallyPop(this.tally,m.time||0,{busy:!!this.num&&this.clock-this.num.at<NUMBER_LIFE});if(n&&m.actors[n.side]){this.num={...n,at:this.clock};this.numCount++;}}
  // The one number on screen: gold with a super in it, amber for the Power Form, white otherwise. It stands above the rival's bar and follows
  // it, never on the bar, never in the HUD band and never over a child's own creature: else beside the bar (away from the light gem), or higher.
  drawNumber(m){const N=this.num;if(!N)return;const u=this.clock-N.at,a=m?.actors?.[N.side],B=a&&!(a.out>0)&&this.st[a.side]?.bar;if(u>=NUMBER_LIFE||!B){if(u>=NUMBER_LIFE)this.num=null;return;}
    const c=this.ctx,f=this.size||1,big=this.scale<.6?Math.min(1.5,.78/Math.max(.3,this.scale)):1,size=26*f*big,pop=this.reduced?1:u<.12?1.3-.3*(u/.12):1,al=u<.6?1:Math.max(0,1-(u-.6)/(NUMBER_LIFE-.6)),
      w0=((String(N.num).length+1)*.62+.4)*size,h=size*.6,top=(Math.max(this.numberTop||0,this.band)-this.offsetY)/this.scale,left=-this.offsetX/this.scale,right=(this.w-this.offsetX)/this.scale,rise=this.reduced?0:10*f*Math.min(1,u/.6);
    const spots=[[B.x,B.y-.8*size-rise],[B.x+B.w/2+8*f+w0/2,B.y+B.h/2],[B.x-B.w/2-28*f-w0/2,B.y+B.h/2],[B.x,B.y-2*size-rise],[B.x+B.w/2+8*f+w0/2,B.y-1.6*size-rise],[B.x-B.w/2-28*f-w0/2,B.y-1.6*size-rise]],kids=numberKids(m,this.localSide).filter(s=>s!==N.side).map(s=>m.actors[s]).filter(k=>k&&!(k.out>0));
    const onKid=(x,y)=>kids.some(k=>{const S=f*this.bodyScale(k),hw=Math.max(k.radius*3,k.spec.height*.75)*S/2+6*f,ht=k.spec.height*S+(k.spec.flies?24*S:0)+26*f;return x+w0/2>k.x-hw&&x-w0/2<k.x+hw&&y+h>k.y-ht&&y-h<k.y+8;});
    // A child's creature in every free place (one standing right behind a giant, say): the number waits a frame rather than cover the child.
    const fits=([x,y])=>y-h>=top&&x-w0/2>=left&&x+w0/2<=right,spot=spots.find(p=>fits(p)&&!onKid(...p))||(kids.length?null:spots.find(fits)||spots[1]);if(!spot)return;const [x,y]=spot;
    // The 4.2 s to the next number run from when this one shows, not from when it waited for a free place: never two closer than that on screen.
    if(!N.shown){N.shown=1;this.tally.last=Math.max(this.tally.last,m?.time||0);if(u>.05){N.at=this.clock;return;}}
    c.save();c.globalAlpha=al;c.translate(x,y);c.scale(pop,pop);inkText(c,'‎−'+N.num,0,0,size,N.special?'#ffd23a':N.form?'#ffb000':'#ffffff',INK,5);c.restore();}
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
  // A short screen (under 360 px high, an iPhone in Safari) gets no banner at all: the brush frame tells the moment there.
  cutinRect(side){if(!(this.h>=360))return null;const o=this.oval(),top=(this.hudBottom||0)+2,band=o.y-o.ry-top,left=this.screenX(side)<this.w/2;
    if(band>=48){const h=Math.min(band,150),w=Math.min(this.w*.48,h*3.2);return {x:left?0:this.w-w,y:top+(band-h)/2,w,h,left,corner:false};}
    // The corner banner starts a little below the HUD band, so its painted edge never touches the pause button.
    const h=Math.min(this.h*.3,112),w=Math.min(this.w*.3,h*1.7);return h<48?null:{x:left?0:this.w-w,y:top+10,w,h,left,corner:true};}
  // The cut-in never covers a creature or the number over its head: the other side when the near one is taken, else no cut-in
  // (the brush frame still plays). Chosen once, where everyone stands as the super starts.
  cutinPick(side){const r=this.cutinRect(side);if(!r)return null;const alt={...r,left:!r.left,x:r.left?this.w-r.w:0};return [r,alt].find(q=>!this.coversActor(q)&&!this.overPause(q))||null;}
  // Never over the pause button (measured by the battle, in canvas pixels), with 8 px to spare.
  overPause(r){const p=this.pauseRect,pad=8;return !!p&&p.w>0&&r.x<p.x+p.w+pad&&r.x+r.w>p.x-pad&&r.y<p.y+p.h+pad&&r.y+r.h>p.y-pad;}
  coversActor(r){const k=this.scale||1,f=this.size||1,pad=12;
    return (this.m?.actors||[]).some(a=>{if(a.out>0||a.side===1&&this.hidden)return false;const x=this.offsetX+a.x*k,y=this.offsetY+a.y*k,b=this.bodyScale(a),h=((a.spec.height*b+(a.spec.flies?32:0)+30)*f+64)*k,w=Math.max(a.radius*3,a.spec.height*.75)*b*f*k;
      return x+w/2+pad>r.x&&x-w/2-pad<r.x+r.w&&y+pad>r.y&&y-h-pad<r.y+r.h;});}
  drawScreenMoments(m){const c=this.ctx,now=this.clock;this.moments=this.moments.filter(M=>now-M.start<M.dur);
    for(const M of this.moments){const u=(now-M.start)/M.dur;if(M.kind==='frame')this.drawBrushFrame(M,u);else if(M.kind==='cutin')this.drawCutin(M,u);else if(M.kind==='rival')this.drawRivalStroke(M,u);}
    for(const [side,F] of Object.entries(this.fin))if(F?.kind==='liberate')this.drawFlakes(F,m.actors[side]);
    if(this.bits.length){const T=now-this.confettiAt;if(T>1.8)this.bits=[];else this.drawConfetti(T);}}
  // On a sideways phone the strokes are thinner and stay in the top corners: the thumbs' controls in the bottom corners stay clear.
  drawBrushFrame(M,u){const c=this.ctx,ti=.15/.65,to=.45/.65,e=u<ti?ease(u/ti):u>to?1-ease((u-to)/(1-to)):1,still=this.reduced,L=Math.max(this.w,this.h)*(this.wide?.22:.31),col=M.mega?'#ffd23a':M.col;
    c.save();this.clipOutsideOval();[[0,0,1,1],[this.w,0,-1,1],[0,this.h,1,-1],[this.w,this.h,-1,-1]].slice(0,this.wide?2:4).forEach(([x,y,dx,dy],i)=>{const off=still?0:(1-e)*L*.8,img=tint(this.art.fx?.['stroke-'+(i+1)],col);
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
    // The child's own creature in the banner wears its hat (and its crown or Lab headpiece in a Power Form).
    const a=this.m?.actors?.[M.side],form=a?.id===M.id&&a.form>0,worn=this.m?.hats?.[M.side]?.[M.id]||null,att=[...(form?[crownFor(p,M.id,1,a.lab?.option||this.m?.labs?.[M.side]?.[M.id]?.option||null)]:[]),...hatList(p,M.id,worn,{form})];
    drawPuppet(c,p,x,r.h*.97,ph,{clip:'attack',dt:this.realDt,flip:facesLeft(M.id)?face>0:face<0,attachments:att.length?att:null});c.restore();}
  // The rival's super: a thin red stroke down its side of the screen, between the HUD band and the controls (a sideways phone keeps the corners for thumbs).
  drawRivalStroke(M,u){const c=this.ctx,left=this.screenX(M.side)<this.w/2,a=u<.15?u/.15:u>.6?Math.max(0,1-(u-.6)/.4):1,top=this.band+4,bot=this.h-(this.wide?150:0),H=Math.max(40,bot-top),img=this.art.fx?.['stroke-4'];
    c.save();this.clipOutsideOval();c.beginPath();c.rect(0,top,this.w,H);c.clip();c.globalAlpha=a;c.translate(left?0:this.w,top+H/2);if(!left)c.scale(-1,1);
    if(img){const red=tint(img,'#c43c5a'),ink=tint(img,'#2b2f7a'),h=H*1.05,w=h*img.width/img.height*.6;c.translate(Math.min(30,this.w*.035),0);c.rotate(-.45);c.drawImage(ink,-w/2+3,-h/2+3,w,h);c.drawImage(red,-w/2,-h/2,w,h);}
    else{c.lineCap='round';c.beginPath();c.moveTo(8,-H*.44);c.quadraticCurveTo(26,0,8,H*.44);c.lineWidth=14;c.strokeStyle='#2b2f7a';c.stroke();c.lineWidth=9;c.strokeStyle='#c43c5a';c.stroke();}
    c.restore();}
  drawFlakes(F,a){if(!a)return;const c=this.ctx,T=this.clock-F.start,f=this.size||1,fx=this.art.fx||{},k=this.bodyScale(a);if(T>F.T1+.1)return;
    for(const fl of F.flakes){const q=(T-fl.delay)/fl.dur;if(q<0||q>1)continue;if(this.budget--<=0)break;const wx=a.x+fl.ox*a.radius*2*f,wy=a.y-fl.oy*a.spec.height*f*k,sx=this.offsetX+wx*this.scale,sy=this.offsetY+wy*this.scale,tx=F.target.x,ty=F.target.y;
      const e=ease(q),mx=(sx+tx)/2+fl.bend*120,my=Math.min(sy,ty)-60-Math.abs(fl.bend)*40,x=(1-e)*(1-e)*sx+2*(1-e)*e*mx+e*e*tx,y=(1-e)*(1-e)*sy+2*(1-e)*e*my+e*e*ty;
      const peel=q<.15?.5+q/.15*.5:1,size=fl.size*peel*(1-.45*e),al=q<.85?1:1-(q-.85)/.15,rot=fl.rot+fl.spin*q;if(!sprite(c,fx[fl.img],x,y,size,rot,al))inkDrop(c,x,y,size,rot,al);}}
  drawConfetti(T){const c=this.ctx,g=700*Math.max(.6,this.h/390),k=Math.max(.6,this.h/390),fx=this.art.fx||{},a=T<1.4?1:1-(T-1.4)/.4;
    for(const b of this.bits){if(this.budget--<=0)break;const x=(b.left?0:this.w)+(b.left?1:-1)*b.vx*k*T+Math.sin(T*8+b.ph)*10*T,y=this.h+b.vy*k*T+.5*g*T*T,rot=b.rot+b.spin*T;if(y>this.h+30)continue;
      if(!sprite(c,fx[b.img],x,y,b.size*1.3,rot,a)){c.save();c.globalAlpha=a;c.translate(x,y);c.rotate(rot);c.fillStyle=b.col;c.fillRect(-b.size/2,-b.size/3,b.size,b.size*.66);c.restore();}}}
}
// ---- Stand-in stickers for the six Wonders still being painted: a cream disc ringed in the Wonder's colour with a small drawing. Made once, as a picture address.
const STICKERS={},STICKER_ART={
  fireflies:['#ffe98a',g=>{ellipse(g,64,66,40,40,'#1b2550',INK,3);g.beginPath();g.arc(80,48,11,0,TAU);g.arc(85,44,10,0,TAU,true);g.fillStyle='#fff4c4';g.fill('evenodd');for(const [x,y,r] of [[48,62,7],[66,82,6],[78,70,5]]){glow(g,x,y,r*3,'#ffe98add');ellipse(g,x,y,r*.6,r*.6,'#fffbe0');for(const s of [-1,1])ellipse(g,x+s*r*.7,y-r*.5,r*.6,r*.35,'#e8f6ffcc');}}],
  mushrooms:['#ff8f8f',g=>{for(const [x,y,k] of [[50,84,1],[82,90,.8]]){g.fillStyle='#fff1d6';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.roundRect(x-8*k,y-26*k,16*k,28*k,6*k);g.fill();g.stroke();g.beginPath();g.ellipse(x,y-24*k,28*k,22*k,0,Math.PI,TAU);g.closePath();g.fillStyle='#e8566a';g.fill();g.stroke();for(const [u,v,r] of [[-12,-8,5],[4,-15,5],[14,-5,4]])ellipse(g,x+u*k,y-24*k+v*k,r*k,r*.8*k,'#fff6e6');}}],
  popcorn:['#ffcf5a',g=>{g.beginPath();g.moveTo(40,58);g.lineTo(88,58);g.lineTo(82,100);g.lineTo(46,100);g.closePath();g.fillStyle='#fff6dc';g.fill();g.lineWidth=3;g.strokeStyle=INK;g.stroke();for(const x of [52,64,76])line(g,[[x,60],[x-1,98]],'#e8566a',5);
    for(const [x,y] of [[46,50],[60,42],[74,46],[86,52],[66,30]]){for(const [u,v,r] of [[0,0,8],[-6,-3,6],[6,-4,6],[1,-8,5.5]])ellipse(g,x+u,y+v,r+1.8,r+1.8,INK);for(const [u,v,r] of [[0,0,8],[-6,-3,6],[6,-4,6],[1,-8,5.5]])ellipse(g,x+u,y+v,r,r,'#fff6dc');ellipse(g,x+2,y+2,3,2,'#ffcf5a');}}],
  swap:['#c9a7ff',g=>{for(const s of [-1,1]){g.save();g.translate(64,64);g.rotate(s>0?0:Math.PI);g.beginPath();g.arc(0,0,30,Math.PI*1.1,Math.PI*1.85);g.lineWidth=11;g.strokeStyle=INK;g.lineCap='round';g.stroke();g.lineWidth=6;g.strokeStyle=s>0?'#9b6bff':'#11bcca';g.stroke();
    const a=Math.PI*1.85,x=Math.cos(a)*30,y=Math.sin(a)*30;g.beginPath();g.moveTo(x+12,y+2);g.lineTo(x-6,y-12);g.lineTo(x-4,y+12);g.closePath();g.fillStyle=s>0?'#9b6bff':'#11bcca';g.fill();g.lineWidth=3;g.strokeStyle=INK;g.stroke();g.restore();}ellipse(g,64,64,7,7,'#fff4dc',INK,2);}],
  bubbles:['#9fe8ff',g=>{for(const [x,y,r] of [[54,70,24],[84,52,14],[82,86,10],[42,40,8]]){const gr=g.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r);gr.addColorStop(0,'#ffffffaa');gr.addColorStop(1,'#6fd6ff66');ellipse(g,x,y,r,r,gr,INK,2.5);g.beginPath();g.arc(x,y,r*.66,-2.7,-1.7);g.strokeStyle='#fff';g.lineWidth=Math.max(2,r*.14);g.lineCap='round';g.stroke();}}],
  dance:['#ff9a2e',g=>{ellipse(g,60,82,36,14,'#b8743a',INK,3);g.fillStyle='#d48a42';g.fillRect(24,66,72,16);line(g,[[24,66],[24,82]],INK,3);line(g,[[96,66],[96,82]],INK,3);ellipse(g,60,66,36,14,'#ffe27a',INK,3);star5(g,60,66,8,'#ff9a2e',INK,1.5);
    line(g,[[88,24],[88,50]],INK,4);ellipse(g,82,52,8,6,INK);g.beginPath();g.moveTo(88,24);g.quadraticCurveTo(100,28,98,40);g.lineWidth=4;g.strokeStyle=INK;g.stroke();}]};
export function stickerSrc(name){const img=FX[name];if(img?.src)return img.src;if(name in STICKERS)return STICKERS[name];const S=STICKER_ART[String(name||'').replace(/^wonder-/,'')];if(!S||typeof document==='undefined')return '';
  let src='';try{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');ellipse(g,64,64,60,60,S[0],INK,4);ellipse(g,64,64,50,50,'#fff4dc',null);ellipse(g,64,64,50,50,null,'#00000022',2);S[1](g);src=cv.toDataURL?.('image/png')||'';}catch{}
  STICKERS[name]=src;return src;}
// ---- The Two Tracks beat bridge for a page picture: the bridge of light, lit a quarter per good tap (lit 0..4), with a soft pulse on the beat (0..1).
export function drawBeatBridge(canvas,{lit=0,pulse=0}={}){const rect=canvas.getBoundingClientRect?.();if(!rect?.width||!rect.height)return;const dpr=Math.min(window.devicePixelRatio||1,2),w=rect.width,h=rect.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const img=FX['bridge-light'],bw=Math.min(w*.96,h*3*.96),bh=img?.width?bw*img.height/img.width:bw/3,x0=(w-bw)/2,y0=(h-bh)/2,k=clamp(lit,0,4)/4;
  if(img?.width){c.save();c.globalAlpha=.28;c.drawImage(img,x0,y0,bw,bh);c.restore();if(k>0){c.save();c.beginPath();c.rect(x0,0,bw*k,h);c.clip();c.drawImage(img,x0,y0,bw,bh);c.globalCompositeOperation='lighter';c.globalAlpha=.25+.35*pulse;c.drawImage(img,x0,y0,bw,bh);c.restore();}}
  else{c.lineCap='round';line(c,[[x0,y0+bh*.6],[x0+bw,y0+bh*.6]],'#ffffff44',bh*.18);if(k>0)line(c,[[x0,y0+bh*.6],[x0+bw*k,y0+bh*.6]],'#ffe27a',bh*.18);}}
// ---- The ?attach tuning view: every creature idling in a grid, wearing one slot. Click one, nudge it, copy the JSON into art/attach-fit.json.
// Slots: crown (the star crown), head (hat-wizard), face (hat-sunglasses), form (each Lab creature's three headpieces in turn). All 24 creatures, the two Two Tracks rigs too.
let attachView=null;
export async function ensureRig(id){if(loaded.has(id))return true;try{const [r,cl,atlas]=await Promise.all([fetch('./art/'+id+'.rig.json').then(x=>{if(!x.ok)throw Error('rig');return x.json();}),fetch('./art/'+id+'.clips.json').then(x=>{if(!x.ok)throw Error('clips');return x.json();}),loadImage('./art/'+id+'.parts.png')]);
  atlas.atlasScale=r.atlasScale??1;loaded.set(id,{rig:r,clips:cl.clips,atlas});return true;}catch{return false;}}
export function openAttachDebug(art){if(attachView)return attachView;const fit=JSON.parse(JSON.stringify(art?.fit||FIT||{}));for(const k of ['crown','head','face','form'])fit[k]??={};
  const ids=[...Object.keys(CREATURES),...EXTRA_RIGS.filter(id=>!CREATURES[id])],pups=[];let sel=0,big=false,last=0,run=true,slot='crown',opt=0,optAt=0;
  const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:9999;background:#f4ead2;overflow:auto;direction:ltr;font:14px Heebo,Arial,sans-serif;color:#1d2a5a';
  const bar=document.createElement('div');bar.style.cssText='position:sticky;top:0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:6px 10px;background:#1d2a5a;color:#fff;z-index:1';
  const info=document.createElement('b'),help=document.createElement('span'),copy=document.createElement('button'),close=document.createElement('button'),out=document.createElement('textarea'),cv=document.createElement('canvas'),slots=document.createElement('span');
  help.textContent='click a creature · arrows move (shift ×4) · + / - size · [ ] turn · b big heads · o next headpiece';copy.textContent='copy';close.textContent='close';out.style.cssText='display:block;width:calc(100% - 20px);margin:10px;height:110px;font:12px monospace';out.readOnly=true;cv.style.cssText='display:block;width:100%';
  const pick=()=>{for(const b of slots.children)b.style.outline=b.dataset.slot===slot?'3px solid #ffd23a':'none';};
  for(const s of ['crown','head','face','form']){const b=document.createElement('button');b.textContent=s;b.dataset.slot=s;b.onclick=()=>{slot=s;pick();};slots.append(b);}pick();
  bar.append(info,slots,help,copy,close);box.append(bar,cv,out);document.body.append(box);
  Promise.all(ids.map(ensureRig)).then(ok=>{ids.forEach((id,i)=>{if(ok[i])pups[i]=createPuppet(id);});});
  const optsOf=id=>FORM_OPTS[id]||null,keyOf=i=>{const id=ids[i],o=optsOf(id);return slot==='form'?(o?id+'-'+o[opt%o.length]:null):id;};
  const entry=i=>{const p=pups[i],k=keyOf(i);if(!p||!k)return null;if(!fit[slot][k]){const d=slot==='crown'?{bone:anchorBone(p),x:0,y:0,s:.3,r:0}:fitFor(p,ids[i],slot,k);fit[slot][k]={bone:d.bone,x:d.x,y:d.y,s:d.s,r:d.r,...(d.ay!=null?{ay:d.ay}:{})};}return fit[slot][k];};
  const json=()=>{const o={};for(const k of Object.keys(fit)){o[k]={};for(const id of Object.keys(fit[k]).sort()){const v=fit[k][id];o[k][id]={bone:v.bone,x:Math.round(v.x),y:Math.round(v.y),s:+(+v.s).toFixed(3),r:+(+v.r).toFixed(3),...(v.ay!=null?{ay:+(+v.ay).toFixed(2)}:{})};}}return JSON.stringify(o,null,1);};
  copy.onclick=()=>{out.value=json();console.log(out.value);try{navigator.clipboard?.writeText(out.value).catch(()=>{});}catch{}};
  const shut=()=>{run=false;box.remove();window.removeEventListener('keydown',key,true);attachView=null;};close.onclick=shut;
  const cols=()=>Math.max(3,Math.floor((box.clientWidth||800)/170));
  cv.onclick=e=>{const r=cv.getBoundingClientRect(),n=cols(),cell=r.width/n,i=Math.floor((e.clientY-r.top)/cell)*n+Math.floor((e.clientX-r.left)/cell);if(i>=0&&i<ids.length)sel=i;};
  // Arrows move in screen directions, so the offset is turned back into the bone's own frame.
  const key=e=>{if(e.key==='o'){opt++;optAt=last;e.preventDefault();return;}if(e.key>='1'&&e.key<='4'){slot=['crown','head','face','form'][e.key-1];pick();e.preventDefault();return;}
    const v=entry(sel),p=pups[sel];if(!v||!p){if(e.key==='Escape')shut();return;}const b=p.skeleton.bones[p.skeleton.byName.get(v.bone)],step=e.shiftKey?16:4;let dx=0,dy=0;
    if(e.key==='ArrowLeft')dx=-step;else if(e.key==='ArrowRight')dx=step;else if(e.key==='ArrowUp')dy=-step;else if(e.key==='ArrowDown')dy=step;
    else if(e.key==='+'||e.key==='=')v.s*=1.05;else if(e.key==='-'||e.key==='_')v.s/=1.05;else if(e.key===']')v.r+=.05;else if(e.key==='[')v.r-=.05;else if(e.key==='b')big=!big;else if(e.key==='Escape')shut();else return;
    if(dx||dy){const g=-(b?.world.angle||0),k=1/(b?.world.scale||1);v.x+=(dx*Math.cos(g)-dy*Math.sin(g))*k;v.y+=(dx*Math.sin(g)+dy*Math.cos(g))*k;}e.preventDefault();};
  window.addEventListener('keydown',key,true);
  const look=(i,v)=>{const id=ids[i],p=pups[i],artFace=facesLeft(id)?-1:1;
    if(slot==='crown')return {img:art?.fx?.crown||FX.crown||null,...v};
    if(slot==='form'){const k=keyOf(i);return k?{img:FORMS['form-'+k]||null,...v,ay:v.ay??.85}:{img:FX.crown||null,...(fit.crown[id]||{bone:anchorBone(p)}),alpha:.35};}
    const h=slot==='head'?'wizard':'sunglasses',L=HAT_LOOK[h];return {img:HATS[h]||null,shape:HATS[h]?null:hatShape(slot),...v,s:v.s*(L.k||1),ay:L.ay,mirror:!!L.face&&L.face!==artFace};};
  const loop=t=>{if(!run)return;const dt=last?Math.min(.1,(t-last)/1000):0;last=t;if(slot==='form'&&t-optAt>1600){opt++;optAt=t;}const n=cols(),W=box.clientWidth||800,cell=W/n,rows=Math.ceil(ids.length/n),dpr=Math.min(window.devicePixelRatio||1,2),H=rows*cell;
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.height=H+'px';}
    const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
    ids.forEach((id,i)=>{const x=(i%n)*cell,y=Math.floor(i/n)*cell,p=pups[i];c.fillStyle=i===sel?'#ffe9a8':'#efe2c4';c.fillRect(x+3,y+3,cell-6,cell-6);if(i===sel){c.strokeStyle='#c43c5a';c.lineWidth=3;c.strokeRect(x+4,y+4,cell-8,cell-8);}
      c.fillStyle='#1d2a5a';c.font='12px monospace';c.fillText(slot==='form'&&keyOf(i)?keyOf(i):id,x+8,y+18);if(!p)return;
      const v=entry(i),size=p.rig.artworkSize,h=Math.min(cell*.62,cell*.8*size.height/size.width),bone=anchorBone(p);
      drawPuppet(c,p,x+cell/2,y+cell*.88,h,{dt,clip:'idle',flip:false,attachments:v||slot==='form'?[look(i,v)]:null,boneScale:big?{[bone]:bone==='head'?1.8:1.25}:null});});
    const v=entry(sel);info.textContent=ids[sel]+' · '+slot+(v?' · '+v.bone+' x '+Math.round(v.x)+' y '+Math.round(v.y)+' s '+(+v.s).toFixed(3)+' r '+(+v.r).toFixed(2):'');requestAnimationFrame(loop);};
  requestAnimationFrame(loop);attachView=box;return box;}
