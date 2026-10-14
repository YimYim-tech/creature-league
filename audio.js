// Sound: two music tracks, voice lines and a procedural effects engine.
// Every effect is built from layers (a noise snap, a filtered noise sweep, a pitched body, a small room made from generated noise),
// so each element has its own voice and nothing sounds like a beep. A recorded file wins when its name is listed in Sound.SAMPLES.
const midi=n=>440*2**((n-69)/12),PENTA=[0,2,4,7,9],penta=(i,base=72)=>midi(base+12*Math.floor(i/5)+PENTA[i%5]),jitter=a=>1+(Math.random()-.5)*2*a;
// Each creature's voice: its element family (the same as core's familyOf) and its own pitch.
export const VOICES=Object.freeze({maimi:['water',1.05],tehomon:['water',.8],seaguard:['water',.62],chutal:['water',1.3],havzuk:['spark',1.2],galgalor:['spark',.88],slauz:['stone',.78],retetoz:['stone',1.1],lohatan:['fire',.95],fireguard:['fire',.72],zikuk:['light',1.4],zoharon:['light',.85],kokhavit:['light',1.15],shorshu:['nature',.85],tlaor:['nature',1.15],tzlilon:['sound',1.3],ozenav:['sound',.95],rishrush:['sound',1.1],kashevet:['sound',.75],windguard:['wind',.8],hedanon:['wind',1.1],zankor:['wind',1.35],tzadon:['stone',.62],rhythmdeer:['sound',.62]});
export const SFX_FAMILIES=['water','spark','stone','fire','light','nature','sound','wind'];

// The instrument kit: every call schedules a few nodes at time t into `out`, and they stop by themselves.
export class Kit{
  constructor(x,bufs){this.x=x;this.bufs=bufs;this.lazy=false;}
  // Notes far ahead are built just before they sound, so one frame never makes hundreds of nodes (live sound only; an offline render builds at once).
  later(t,fn){const lead=t-this.x.currentTime;if(!this.lazy||lead<.35)return fn();setTimeout(()=>{if(t>this.x.currentTime&&this.x.state!=='closed')fn();},(lead-.25)*1000);}
  // The gain starts closed, so not one sample of a source slips out before its envelope opens (a noise source would click).
  env(t,v,a,d,h,out){const g=this.x.createGain(),p=g.gain;p.value=0;p.setValueAtTime(0,t);p.linearRampToValueAtTime(v,t+a);if(h)p.setValueAtTime(v,t+a+h);p.exponentialRampToValueAtTime(.0001,t+a+(h||0)+d);g.connect(out);return g;}
  filter(type,f,out,q=.7){const fl=this.x.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;fl.connect(out);return fl;}
  pan(out,v){if(!this.x.createStereoPanner)return out;const p=this.x.createStereoPanner();p.pan.value=v;p.connect(out);return p;}
  tone(t,{f=440,f2=0,type='sine',v=.2,a=.003,d=.2,h=0,out}){const o=this.x.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+a+h+d*.85);o.connect(this.env(t,v,a,d,h,out));o.start(t);o.stop(t+a+h+d+.03);return o;}
  hiss(t,{v=.2,a=.002,d=.1,h=0,type='bandpass',f=1200,f2=0,q=.8,buf='white',out}){const s=this.x.createBufferSource(),b=this.bufs[buf],len=a+h+d+.03,fl=this.x.createBiquadFilter();s.buffer=b;s.loop=len>b.duration*.8;fl.type=type;fl.Q.value=q;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+a+h+d*.85);s.connect(fl);fl.connect(this.env(t,v,a,d,h,out));s.start(t,s.loop?0:Math.random()*(b.duration-len));s.stop(t+len);}
  // A struck bell: a sine whose pitch is wobbled by a second sine that calms down as it rings.
  bell(t,{f=880,ratio=3.5,index=1.5,v=.15,a=.002,d=.6,out}){const m=this.x.createOscillator(),mg=this.x.createGain();m.frequency.value=f*ratio;mg.gain.setValueAtTime(f*index,t);mg.gain.exponentialRampToValueAtTime(f*index*.04+1,t+a+d*.7);m.connect(mg);mg.connect(this.tone(t,{f,v,a,d,out}).frequency);m.start(t);m.stop(t+a+d+.03);}
  mallet(t,{f=660,v=.2,d=.3,out}){this.tone(t,{f,v,a:.002,d,out});this.tone(t,{f:f*4,v:v*.28,a:.001,d:.035,out});this.tone(t,{f:f*9.9,v:v*.07,a:.001,d:.012,out});this.hiss(t,{type:'lowpass',f:2600,d:.008,v:v*.35,out});}
  pluck(t,{f=660,v=.12,d=.35,out}){this.tone(t,{f,v,a:.002,d,out});this.tone(t,{type:'triangle',f:f*2,v:v*.3,a:.001,d:.07,out});this.hiss(t,{type:'highpass',f:5000,d:.006,v:v*.25,out});}
  // A taiko: a deep skin, its overtones and the stick, so a phone speaker still hears the hit.
  drum(t,{f=90,v=.6,d=.5,out}){this.tone(t,{f,f2:f*.5,v,a:.002,d,out});this.tone(t,{f:f*1.6,f2:f*.8,v:v*.45,a:.002,d:d*.4,out});this.tone(t,{type:'triangle',f:f*3.2,f2:f*1.8,v:v*.12,a:.002,d:d*.2,out});this.hiss(t,{f:320,q:1.2,d:.12,v:v*.6,out});this.hiss(t,{type:'highpass',f:2200,d:.012,v:v*.25,out});}
  cymbal(t,{v=.15,d=1.2,a=.002,out}){this.hiss(t,{type:'highpass',f:5200,q:.5,a,d,v,out});this.hiss(t,{f:9000,q:.6,a,d:d*.45,v:v*.6,out});}
  // Brass: detuned saws through one opening low-pass, with a slow vibrato.
  brass(t,{notes,v=.25,a=.05,h=.4,d=.4,bright=2600,out}){const x=this.x,end=t+a+h+d,fl=x.createBiquadFilter(),lfo=x.createOscillator(),lg=x.createGain();fl.type='lowpass';fl.Q.value=1.1;fl.frequency.setValueAtTime(320,t);fl.frequency.exponentialRampToValueAtTime(bright,t+a+.05);fl.frequency.exponentialRampToValueAtTime(bright*.4,end);fl.connect(this.env(t,v/Math.sqrt(notes.length*2),a,d,h,out));
    lfo.frequency.value=5.3;lg.gain.value=0;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(8,t+a+h);lfo.connect(lg);lfo.start(t);lfo.stop(end+.03);
    for(const n of notes)for(const c of [-6,6]){const o=x.createOscillator();o.type='sawtooth';o.frequency.value=midi(n);o.detune.value=c;lg.connect(o.detune);o.connect(fl);o.start(t);o.stop(end+.03);}}
  pebbles(t,{n=5,v=.2,spread=.3,out}){for(let i=0;i<n;i++)this.hiss(t+Math.random()*spread,{f:1500+Math.random()*3000,q:5,d:.015+Math.random()*.03,v:v*(1-i/n*.6),out});}
  // A tone whose pitch is shaken by a second sine: a spring when the shake is fast and dies away, a slide whistle's vibrato when it is slow and steady.
  wobble(t,{f=300,f2=0,rate=16,depth=.3,settle=true,type='sine',v=.2,a=.004,d=.4,h=0,out}){const x=this.x,l=x.createOscillator(),lg=x.createGain(),o=this.tone(t,{f,f2,type,v,a,d,h,out});l.frequency.value=rate;lg.gain.setValueAtTime(f*depth,t);if(settle)lg.gain.exponentialRampToValueAtTime(f*depth*.03+.1,t+a+h+d);l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+a+h+d+.03);return o;}
  boing(t,{f=220,v=.2,d=.45,out}){this.wobble(t,{f,f2:f*1.5,rate:17,depth:.32,v,d,out});this.tone(t,{type:'triangle',f:f*2,f2:f*3,d:.08,v:v*.3,out});return d;}
  pop(t,{f=700,v=.2,out}){this.hiss(t,{f:f*2.4,q:1.4,a:.001,d:.025,v:v*1.6,out});this.tone(t,{f,f2:f*.45,d:.07,v,out});}
}
// Noise made once per context: white, sparse crackle, dense electric buzz, leafy rustle, and a small stereo room for the reverb.
export function makeBuffers(x){const sr=x.sampleRate,len=Math.floor(sr*2),step=Math.floor(sr/38),mk=(fill,rms=0)=>{const b=x.createBuffer(1,len,sr),d=b.getChannelData(0);fill(d);if(rms){let e=0;for(let i=0;i<len;i++)e+=d[i]*d[i];const k=rms/Math.sqrt(e/len||1);for(let i=0;i<len;i++)d[i]*=k;}return b;};
  const white=mk(d=>{for(let i=0;i<len;i++)d[i]=Math.random()*2-1;}),
    crackle=mk(d=>{let e=0;for(let i=0;i<len;i++){if(Math.random()<.003)e=(Math.random()<.5?-1:1)*(.35+Math.random()*.65);d[i]=e*(Math.random()*.6+.4);e*=.86;}},.22),
    buzz=mk(d=>{let e=0;for(let i=0;i<len;i++){if(Math.random()<.012)e=(Math.random()<.5?-1:1)*(.3+Math.random()*.7);d[i]=e;e*=.7;}},.3),
    rustle=mk(d=>{let m=0,target=0;for(let i=0;i<len;i++){if(i%step===0)target=Math.random()**2;m+=(target-m)*.004;d[i]=(Math.random()*2-1)*(.15+m);}},.4),
    rl=Math.floor(sr*1.1),room=x.createBuffer(2,rl,sr);
  for(let c=0;c<2;c++){const d=room.getChannelData(c);let lp=0;for(let i=0;i<rl;i++){const k=i/sr,early=k<.04&&Math.random()<.004?(Math.random()*2-1)*1.5:0,a=.55-.4*Math.min(1,k/.6);lp+=a*((Math.random()*2-1)-lp);d[i]=(lp+early)*Math.exp(-k/.22);}}
  return {white,crackle,buzz,rustle,room};}

// The element's own colour inside a hit; n is the damage tier 0..2.
const TEX={
  water:(k,t,n,p,o)=>{k.hiss(t,{f:2100*p,f2:650*p,q:1.3,d:.13+.07*n,v:.32,out:o});k.tone(t,{f:540*p,f2:190*p,d:.08,v:.2,out:o});k.tone(t+.045,{f:950*p,f2:420*p,d:.06,v:.12,out:o});if(n>1)k.hiss(t+.01,{type:'lowpass',f:3200,f2:700,a:.01,d:.32,v:.26,out:o});},
  spark:(k,t,n,p,o)=>{k.hiss(t,{buf:'buzz',f:3600*p,q:.7,d:.11+.07*n,v:.45,out:o});k.tone(t,{type:'square',f:1500*p,f2:120*p,d:.09,v:.14,out:k.filter('lowpass',3500,o)});if(n>1){k.hiss(t,{type:'highpass',f:1500,d:.04,v:.3,out:o});k.hiss(t+.02,{type:'lowpass',f:900,f2:250,d:.45,v:.3,out:o});}},
  stone:(k,t,n,p,o)=>{k.hiss(t,{type:'lowpass',f:1100*p,f2:260,d:.1+.06*n,v:.45,out:o});k.hiss(t+.008,{buf:'crackle',f:1600*p,q:.7,d:.09+.05*n,v:.6,out:o});k.hiss(t,{f:700*p,q:3,d:.03,v:.35,out:o});if(n>1)k.pebbles(t+.05,{n:5,v:.18,spread:.25,out:o});},
  fire:(k,t,n,p,o)=>{k.hiss(t,{f:2400*p,f2:520*p,q:.9,a:.008,d:.17+.08*n,v:.45,out:o});k.hiss(t+.025,{buf:'crackle',type:'highpass',f:2300,d:.25+.1*n,v:.34,out:o});k.tone(t,{type:'sawtooth',f:95*p,f2:48,d:.13,v:.05,out:o});},
  light:(k,t,n,p,o)=>{k.bell(t,{f:1760*p,ratio:2.76,index:1.2,d:.3+.15*n,v:.17,out:o});k.bell(t+.03,{f:2637*p,ratio:2,index:.6,d:.2,v:.07,out:o});k.hiss(t,{type:'highpass',f:5500,d:.05,v:.12,out:o});},
  nature:(k,t,n,p,o)=>{k.hiss(t,{buf:'rustle',f:3000*p,q:.7,d:.14+.07*n,v:.5,out:o});k.tone(t,{type:'triangle',f:310*p,f2:165*p,d:.08,v:.4,out:o});k.hiss(t,{f:1300*p,q:4,d:.03,v:.32,out:o});},
  sound:(k,t,n,p,o)=>{k.bell(t,{f:880*p,ratio:3.01,index:2,d:.4+.18*n,v:.17,out:o});k.bell(t+.012,{f:1320*p,ratio:1.41,index:1,d:.26,v:.07,out:o});},
  wind:(k,t,n,p,o)=>{k.hiss(t,{f:2700*p,f2:620*p,q:1.2,a:.02,d:.12+.06*n,v:.42,out:o});k.tone(t+.01,{f:1800*p,f2:900*p,a:.02,d:.12,v:.08,out:o});k.hiss(t,{type:'highpass',f:3200,d:.02,v:.2,out:o});},
};
// The element's signature after a super's whoosh: a wave, a thunderclap, a rockslide, a roar, a chord of light, leaves, a gong, a gust.
const SIGN={
  water:(k,t,p,o)=>{k.hiss(t+.02,{type:'lowpass',f:4200,f2:500,a:.02,d:.6,v:.35,out:o});for(let i=0;i<4;i++)k.tone(t+.08+i*.07,{f:(700+i*180)*p,f2:(320+i*80)*p,d:.07,v:.09,out:o});},
  spark:(k,t,p,o)=>{k.hiss(t,{type:'highpass',f:1200,a:.001,d:.06,v:.45,out:o});k.hiss(t+.05,{type:'lowpass',f:1400,f2:300,a:.04,d:.7,v:.35,out:o});k.hiss(t,{buf:'buzz',f:2800,q:.6,d:.3,v:.3,out:o});},
  stone:(k,t,p,o)=>{k.hiss(t,{buf:'crackle',f:1300,q:.6,a:.01,d:.6,v:.5,out:o});k.pebbles(t+.08,{n:8,v:.22,spread:.5,out:o});k.tone(t,{type:'triangle',f:180*p,f2:90,d:.3,v:.2,out:o});},
  fire:(k,t,p,o)=>{k.hiss(t,{f:300,f2:1400,q:1,a:.06,d:.5,v:.45,out:o});k.tone(t,{type:'sawtooth',f:110*p,f2:70*p,a:.04,d:.45,v:.06,out:k.filter('lowpass',900,o)});k.hiss(t+.1,{buf:'crackle',f:3000,q:.7,d:.5,v:.3,out:o});},
  light:(k,t,p,o)=>bells(k,t+.02,[84,88,91],o,{gap:.04,ratio:2.76,index:1,d:.9,v:.1}),
  nature:(k,t,p,o)=>{k.hiss(t,{buf:'rustle',f:2500,q:.6,a:.03,d:.6,v:.45,out:o});[0,.09,.17].forEach((d,i)=>k.tone(t+d,{type:'triangle',f:(420-i*60)*p,f2:(250-i*30)*p,d:.07,v:.2,out:o}));},
  sound:(k,t,p,o)=>{k.bell(t,{f:220*p,ratio:1.41,index:2.5,d:1.2,v:.22,out:o});k.bell(t+.01,{f:440*p,ratio:2.76,index:1,d:.8,v:.08,out:o});},
  wind:(k,t,p,o)=>{k.hiss(t,{f:500,f2:3600,q:1.6,a:.12,d:.4,v:.35,out:o});k.tone(t+.05,{f:1400*p,f2:700*p,a:.05,d:.35,v:.05,out:o});},
};
// A shot leaving the creature: short, light and different for each family.
const SHOT={
  water:(k,t,p,o)=>{k.tone(t,{f:880*p,f2:330*p,v:.2,d:.09,out:o});k.tone(t+.004,{f:1760*p,f2:720*p,v:.05,d:.05,out:o});k.hiss(t,{f:2600*p,f2:1100*p,q:1.6,d:.07,v:.14,out:o});return .12;},
  spark:(k,t,p,o)=>{k.hiss(t,{buf:'buzz',type:'highpass',f:2400*p,d:.08,v:.3,out:o});k.tone(t,{type:'square',f:1700*p,f2:300*p,v:.06,d:.08,out:k.filter('lowpass',4000,o)});k.tone(t,{f:1100*p,f2:500*p,v:.06,d:.06,out:o});return .11;},
  stone:(k,t,p,o)=>{k.tone(t,{type:'triangle',f:300*p,f2:130*p,v:.24,d:.1,out:o});k.hiss(t,{type:'lowpass',f:1600*p,f2:400,d:.08,v:.3,out:o});k.hiss(t,{f:900*p,q:1.5,d:.03,v:.2,out:o});k.hiss(t,{type:'highpass',f:3500,d:.01,v:.1,out:o});return .13;},
  fire:(k,t,p,o)=>{k.hiss(t,{f:450*p,f2:1900*p,q:1.1,a:.025,d:.12,v:.3,out:o});k.hiss(t+.02,{buf:'crackle',type:'highpass',f:2400,d:.1,v:.16,out:o});k.tone(t,{type:'triangle',f:150*p,f2:80*p,v:.1,d:.12,out:o});return .17;},
  light:(k,t,p,o)=>{k.bell(t,{f:1320*p,ratio:3,index:1.1,v:.12,d:.2,out:o});k.tone(t,{f:2640*p,f2:2900*p,v:.04,d:.07,out:o});k.hiss(t,{type:'highpass',f:6500,d:.035,v:.07,out:o});return .22;},
  nature:(k,t,p,o)=>{k.hiss(t,{f:2300*p,q:2.5,d:.035,v:.35,out:o});k.hiss(t+.01,{buf:'rustle',f:4200,q:.8,d:.06,v:.25,out:o});k.tone(t,{type:'triangle',f:540*p,f2:390*p,v:.15,d:.07,out:o});return .1;},
  sound:(k,t,p,o)=>{const w=k.x.createOscillator(),wg=k.x.createGain();w.frequency.value=28;wg.gain.value=60*p;w.connect(wg);wg.connect(k.tone(t,{f:620*p,f2:900*p,a:.01,d:.13,v:.14,out:o}).frequency);w.start(t);w.stop(t+.2);k.bell(t,{f:1240*p,ratio:2,index:.8,v:.04,d:.1,out:o});return .17;},
  wind:(k,t,p,o)=>{k.hiss(t,{f:900*p,f2:3400*p,q:1.5,a:.018,d:.09,v:.3,out:o});k.hiss(t,{type:'highpass',f:5000,d:.04,v:.07,out:o});k.tone(t,{f:520*p,f2:980*p,v:.04,d:.06,out:o});return .13;},
};
const bells=(k,t,notes,out,{gap=.06,ratio=4,index=.8,d=.5,v=.12}={})=>notes.forEach((n,i)=>k.bell(t+i*gap,{f:midi(n),ratio,index,d,v,out}));
// A hit: a snap, a body thump that drops in pitch, and the attacker's element. A hit on the local creature is darker and lower.
// Each family's colour is brought to the same loudness (measured), so no element sounds weaker than another.
const TEX_GAIN={water:1,spark:.9,stone:1.4,fire:1,light:.68,nature:.8,sound:.63,wind:1.1};
const HIT=(k,t,o)=>{const n=o.tier||0,p=o.p||1,T=1+n*.45,out=o.out,lp=o.ouch?k.filter('lowpass',2000,out):out,fam=TEX[o.fam]?o.fam:'stone',tg=k.x.createGain();tg.gain.value=TEX_GAIN[fam];tg.connect(lp);
  k.hiss(t,{type:'highpass',f:2600,q:.7,d:.016,v:.3*T,out:lp});k.tone(t,{f:(o.ouch?140:200)*p,f2:(o.ouch?70:95)*p,d:.1+.05*n,v:.12*T,out});k.tone(t,{type:'triangle',f:(o.ouch?260:380)*p,f2:(o.ouch?130:180)*p,d:.07,v:.16*T,out});
  if(n>1||o.special)k.tone(t,{f:78,f2:45,d:.3,v:.14,out});TEX[fam](k,t+.003,n,p,tg);return .3+.15*n;};
const tex=(k,t,fam,n,p,out)=>{fam=TEX[fam]?fam:'stone';const g=k.x.createGain();g.gain.value=TEX_GAIN[fam];g.connect(out);TEX[fam](k,t,n,p,g);};
// Musical stings (the recorded sting-*.mp3 files replace them once they are listed in SAMPLES).
const STING={
  // Taiko and low brass: the Power Form arrives.
  'sting-form':(k,t,o)=>{const out=o.out;k.cymbal(t,{a:.8,d:.06,v:.1,out});[[0,80,.55],[.3,96,.35],[.45,96,.4],[.6,110,.35]].forEach(([d,f,v])=>k.drum(t+d,{f,v,out}));
    k.later(t+.9,()=>{k.drum(t+.9,{f:66,v:.8,d:.7,out});k.cymbal(t+.9,{v:.15,d:1.5,out});k.brass(t+.9,{notes:[48,55,60,64,67],v:.34,h:.7,d:.25,out});});
    k.later(t+1.85,()=>{k.drum(t+1.85,{f:90,v:.45,out});k.brass(t+1.85,{notes:[46,53,58,62,65],v:.3,a:.03,h:.18,d:.12,out});k.drum(t+2.05,{f:90,v:.45,out});});
    k.later(t+2.25,()=>{k.drum(t+2.25,{f:62,v:.9,d:.9,out});k.cymbal(t+2.25,{v:.2,d:1.8,out});k.brass(t+2.25,{notes:[48,55,60,64,67,72],v:.38,a:.04,h:.65,d:.8,bright:3200,out});bells(k,t+2.25,[84,88,91,96],out,{d:1,v:.06});});return 3.8;},
  // Ta-ta-ta-taaa, then a bright last chord.
  'sting-victory':(k,t,o)=>{const out=o.out;[0,.13,.26].forEach(d=>{k.brass(t+d,{notes:[67,79],v:.22,a:.015,h:.05,d:.06,bright:3000,out});k.drum(t+d,{f:130,v:.22,d:.2,out});});
    k.brass(t+.4,{notes:[60,64,67,72],v:.32,a:.03,h:.42,d:.12,out});k.drum(t+.4,{f:78,v:.6,out});k.cymbal(t+.4,{v:.1,d:.8,out});
    k.later(t+.95,()=>{k.brass(t+.95,{notes:[65,69,72,77],v:.26,a:.02,h:.12,d:.08,out});k.drum(t+.95,{f:110,v:.3,d:.25,out});k.brass(t+1.15,{notes:[67,71,74,79],v:.26,a:.02,h:.12,d:.08,out});k.drum(t+1.15,{f:110,v:.3,d:.25,out});});
    k.later(t+1.35,()=>{k.brass(t+1.35,{notes:[60,64,67,72,76],v:.36,a:.03,h:.55,d:.75,bright:3400,out});k.drum(t+1.35,{f:66,v:.85,d:.8,out});k.cymbal(t+1.35,{v:.2,d:1.6,out});bells(k,t+1.35,[84,88,91,96],out,{gap:.05,d:.9,v:.07});});return 2.9;},
  // A harp run into a soft bell chord: a Wonder begins.
  'sting-wonder':(k,t,o)=>{const out=o.out;k.cymbal(t,{a:.35,d:.08,v:.09,out});for(let i=0;i<12;i++)k.pluck(t+i*.03,{f:penta(i,72),v:.07+i*.004,d:.45,out});
    bells(k,t+.38,[72,76,79,83],out,{gap:.02,ratio:3.5,index:1,d:1.4,v:.08});[60,64,67,71].forEach(n=>k.tone(t+.38,{f:midi(n),a:.08,h:.3,d:1,v:.04,out}));k.hiss(t+.38,{type:'highpass',f:7000,a:.05,d:.9,v:.06,out});k.drum(t+.38,{f:90,v:.3,out});return 1.9;},
};
const SFX={
  ...Object.fromEntries(SFX_FAMILIES.map(f=>['sfx-shot-'+f,(k,t,o)=>SHOT[f](k,t,o.p||1,o.out)])),
  'sfx-hit-1':HIT,'sfx-hit-2':HIT,'sfx-hit-3':HIT,...STING,'sfx-victory-sting':STING['sting-victory'],'sfx-wonder-start':STING['sting-wonder'],
  'sfx-chain':(k,t,o)=>{bells(k,t,[84,88,91,96],o.out,{gap:.045,d:.35,v:.12});k.hiss(t,{buf:'crackle',type:'highpass',f:5000,d:.3,v:.14,out:o.out});return .55;},
  // A glass ding with a breath of air: the shot just missed.
  'sfx-near-miss':(k,t,o)=>{k.bell(t,{f:2637,ratio:2.76,index:.7,d:.55,v:.16,out:o.out});k.tone(t,{f:3951,d:.25,v:.04,out:o.out});k.hiss(t,{f:1800,f2:5200,q:1,a:.03,d:.07,v:.1,out:o.out});return .6;},
  'chip':(k,t,o)=>{k.hiss(t,{f:2600,q:2.2,d:.025,v:.3,out:o.out});k.tone(t,{type:'triangle',f:760,f2:420,d:.035,v:.12,out:o.out});k.pebbles(t,{n:2,v:.1,spread:.08,out:o.out});return .14;},
  'sfx-cover-crack':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'highpass',f:1600,a:.001,d:.04,v:.5,out});k.hiss(t+.01,{type:'lowpass',f:900,f2:200,a:.01,d:.4,v:.35,out});k.tone(t,{f:95,f2:50,d:.22,v:.2,out});k.tone(t,{type:'triangle',f:260,f2:130,d:.12,v:.2,out});k.hiss(t,{buf:'crackle',f:1800,q:.7,d:.25,v:.5,out});k.pebbles(t+.04,{n:7,v:.3,spread:.4,out});return .7;},
  'sfx-ready':(k,t,o)=>{bells(k,t,[79,84,88],o.out,{gap:.07,d:.55,v:.13,index:.7});[91,96].forEach((n,i)=>k.tone(t+.07+i*.07,{f:midi(n),d:.3,v:.03,out:o.out}));return .75;},
  'pip':(k,t,o)=>{k.bell(t,{f:o.f,ratio:4,index:.9,d:.45,v:.15,out:o.out});k.tone(t,{f:o.f*2,d:.2,v:.04,out:o.out});k.hiss(t,{type:'highpass',f:7000,d:.12,v:.05,out:o.out});return .5;},
  'form-ready':(k,t,o)=>{bells(k,t,[72,76,79,84,88],o.out,{ratio:3.5,index:.9,d:.9,v:.1});k.hiss(t,{type:'highpass',f:7000,a:.25,d:.6,v:.07,out:o.out});k.tone(t,{f:523,f2:1046,d:.5,v:.04,out:o.out});return 1.3;},
  'form-end':(k,t,o)=>{bells(k,t,[88,84,79],o.out,{d:.3,v:.07});k.hiss(t,{type:'lowpass',f:3000,f2:600,a:.02,d:.3,v:.12,out:o.out});return .55;},
  'star-lend':(k,t,o)=>{for(let i=0;i<11;i++)k.pluck(t+i*.035,{f:penta(i,72),v:.08,d:.5,out:o.out});[60,64,67].forEach(n=>k.tone(t,{f:midi(n),a:.25,h:.3,d:1,v:.05,out:o.out}));k.bell(t+.4,{f:midi(96),ratio:4,index:.6,d:1,v:.06,out:o.out});return 1.7;},
  'sfx-seed-sprout':(k,t,o)=>{bells(k,t,[76,79,84],o.out,{gap:.12,ratio:3.5,d:.5,v:.11});k.tone(t+.3,{f:300,f2:900,a:.01,d:.25,v:.08,out:o.out});k.hiss(t+.3,{buf:'rustle',f:4000,q:.8,d:.2,v:.1,out:o.out});return .9;},
  'wonder-ready':(k,t,o)=>{bells(k,t,[93,100],o.out,{gap:.09,index:.5,d:.35,v:.06});return .5;},
  'wonder-end':(k,t,o)=>{k.hiss(t,{type:'lowpass',f:2600,f2:420,a:.02,d:.35,v:.28,out:o.out});bells(k,t+.05,[91,88,84],o.out,{d:.3,v:.06});return .65;},
  'meteor':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'lowpass',f:2400,f2:300,a:.003,d:.45,v:.55,out});k.tone(t,{f:115,f2:38,d:.4,v:.3,out});k.tone(t,{type:'triangle',f:280,f2:110,d:.15,v:.25,out});k.hiss(t,{buf:'crackle',f:2200,q:.6,d:.35,v:.4,out});k.bell(t,{f:1760,ratio:2.76,index:1,d:.3,v:.08,out});return .55;},
  'ko':(k,t,o)=>{const out=o.out;k.tone(t,{type:'triangle',f:620,f2:130,d:.45,v:.2,out});k.hiss(t,{type:'lowpass',f:520,d:.15,v:.45,out});k.tone(t,{f:95,f2:45,d:.22,v:.45,out});return .5;},
  'respawn':(k,t,o)=>{k.tone(t,{f:420,f2:1260,a:.01,d:.25,v:.1,out:o.out});k.bell(t+.15,{f:midi(84),ratio:4,index:.7,d:.45,v:.1,out:o.out});return .65;},
  'quake':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'lowpass',f:260,a:.03,h:.15,d:.55,v:.6,out});k.hiss(t,{f:600,q:.8,a:.02,h:.1,d:.45,v:.55,out});k.tone(t,{f:50,f2:32,a:.01,d:.7,v:.35,out});k.tone(t,{type:'triangle',f:160,f2:80,d:.3,v:.25,out});k.hiss(t,{buf:'crackle',f:1300,q:.6,d:.5,v:.45,out});k.pebbles(t+.05,{n:6,v:.2,spread:.5,out});return .9;},
  'blast':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'lowpass',f:3200,f2:280,a:.002,d:.5,v:.65,out});k.tone(t,{f:105,f2:35,d:.5,v:.4,out});k.tone(t,{type:'triangle',f:260,f2:100,d:.2,v:.25,out});k.hiss(t,{buf:'crackle',f:1600,d:.4,v:.45,out});return .65;},
  // The guardian's big attack: a growl that rises for exactly the windup, then a whoosh, then a bright 'now!'.
  'boss-windup':(k,t,o)=>{const lp=k.filter('lowpass',700,o.out,3);k.tone(t,{type:'sawtooth',f:70,f2:150,a:.9,d:.15,v:.12,out:lp});k.hiss(t,{type:'lowpass',f:300,f2:1400,a:.9,d:.12,v:.28,out:o.out});k.hiss(t,{f:400,f2:1800,q:1.2,a:.9,d:.12,v:.22,out:o.out});k.tone(t,{f:110,f2:220,a:.9,d:.12,v:.1,out:o.out});return 1.1;},
  'boss-charge':(k,t,o)=>{k.hiss(t,{f:420,f2:2600,q:1.2,a:.06,d:.28,v:.42,out:o.out});k.tone(t,{type:'sawtooth',f:90,f2:55,d:.3,v:.06,out:o.out});return .4;},
  'boss-open':(k,t,o)=>{bells(k,t,[84,91],o.out,{gap:.07,index:.9,d:.45,v:.17});k.tone(t,{f:2093,d:.15,v:.04,out:o.out});return .55;},
  'boss-guard':(k,t,o)=>{k.bell(t,{f:420,ratio:2.41,index:3,d:.32,v:.15,out:o.out});k.hiss(t,{type:'highpass',f:2200,d:.03,v:.25,out:o.out});return .4;},
  'collapse':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'lowpass',f:1200,f2:200,a:.01,d:.7,v:.55,out});k.hiss(t,{buf:'crackle',f:1500,q:.6,d:.6,v:.55,out});k.tone(t,{f:70,f2:34,d:.6,v:.35,out});k.tone(t,{type:'triangle',f:180,f2:90,d:.25,v:.2,out});k.pebbles(t+.05,{n:8,v:.25,spread:.6,out});return 1;},
  'echo-turn':(k,t,o)=>{k.mallet(t,{f:midi(79),v:.2,d:.3,out:o.out});k.mallet(t+.13,{f:midi(84),v:.22,d:.4,out:o.out});return .55;},
  'echo-again':(k,t,o)=>{k.mallet(t,{f:midi(84),v:.16,d:.3,out:o.out});k.mallet(t+.13,{f:midi(79),v:.16,d:.4,out:o.out});return .55;},
  'lava-warning':(k,t,o)=>{k.hiss(t,{type:'lowpass',f:220,a:.25,h:.2,d:.5,v:.4,out:o.out});k.hiss(t,{f:520,q:1,a:.25,h:.2,d:.5,v:.3,out:o.out});k.tone(t,{type:'triangle',f:110,f2:90,a:.2,h:.2,d:.5,v:.12,out:o.out});for(let i=0;i<5;i++)k.tone(t+.1+i*.15+Math.random()*.05,{f:320,f2:760,d:.06,v:.14,out:o.out});return 1.1;},
  'light-block':(k,t,o)=>{k.bell(t,{f:1568,ratio:1.5,index:2,d:.4,v:.14,out:o.out});k.hiss(t,{type:'highpass',f:4200,d:.05,v:.14,out:o.out});return .45;},
  'pull':(k,t,o)=>{k.hiss(t,{f:700,f2:3200,q:2,a:.01,d:.14,v:.4,out:o.out});k.tone(t,{f:500,f2:1400,d:.12,v:.08,out:o.out});return .2;},
  'ball-pick':(k,t,o)=>{k.tone(t,{f:420,f2:840,d:.12,v:.17,out:o.out});k.bell(t+.05,{f:1320,ratio:4,index:.6,d:.22,v:.06,out:o.out});return .3;},
  'ball-loose':(k,t,o)=>{k.tone(t,{f:760,f2:300,d:.22,v:.16,out:o.out});k.hiss(t,{type:'lowpass',f:900,d:.05,v:.15,out:o.out});return .3;},
  'ball-hit':(k,t,o)=>{k.mallet(t,{f:1046,v:.08,d:.08,out:o.out});return .1;},
  'kick':(k,t,o)=>{const f=o.big?330:480;k.tone(t,{f,f2:f*.5,d:.18,v:.12,out:o.out});k.hiss(t,{f:900,q:1,d:.04,v:.35,out:o.out});return .25;},
  'goal':(k,t,o)=>{if(o.me){bells(k,t,[72,76,79,84],o.out,{gap:.09,d:.5,v:.12});k.drum(t+.27,{f:80,v:.45,out:o.out});}else [67,64].forEach((n,i)=>k.mallet(t+i*.12,{f:midi(n),v:.12,d:.3,out:o.out}));return .8;},
  'overtime':(k,t,o)=>{for(let i=0;i<8;i++)k.drum(t+i*.05,{f:160,v:.06+i*.02,d:.1,out:o.out});bells(k,t+.45,[84,88],o.out,{gap:.08,d:.5,v:.12});return 1;},
  'go':(k,t,o)=>{const out=o.out;k.bell(t,{f:523,ratio:1.5,index:2.2,d:.9,v:.16,out});k.bell(t,{f:784,ratio:1.5,index:1.5,d:.7,v:.1,out});k.hiss(t,{f:600,f2:3200,q:1,a:.05,d:.18,v:.16,out});k.drum(t,{f:85,v:.45,out});return 1;},
  'swap':(k,t,o)=>{k.mallet(t,{f:midi(67),v:.15,d:.25,out:o.out});k.mallet(t+.1,{f:midi(72),v:.17,d:.35,out:o.out});return .45;},
  'feather':(k,t,o)=>{k.bell(t,{f:midi(o.me?88:79),ratio:4,index:.6,d:.25,v:.09,out:o.out});k.hiss(t,{type:'highpass',f:6000,d:.05,v:.05,out:o.out});return .3;},
  'ember':(k,t,o)=>{k.tone(t,{type:'triangle',f:330,f2:660,d:.25,v:.1,out:o.out});k.bell(t+.08,{f:midi(88),ratio:4,index:.7,d:.3,v:.07,out:o.out});k.hiss(t,{buf:'crackle',type:'highpass',f:3000,d:.2,v:.12,out:o.out});return .45;},
  'hold-start':(k,t,o)=>{bells(k,t,[72,76,79],o.out,{gap:.1,d:.35,v:.1});return .6;},
  'heal':(k,t,o)=>{bells(k,t,[76,81],o.out,{gap:.12,index:.6,d:.4,v:.09});return .55;},
  'echo-note':(k,t,o)=>{k.bell(t,{f:o.f,ratio:2,index:.9,d:.9,v:.14,out:o.out});k.tone(t+.25,{f:o.f,d:.4,v:.04,out:o.out});return 1;},
  'echo-step':(k,t,o)=>{k.mallet(t,{f:o.f,v:o.me?.18:.07,d:.35,out:o.out});return .4;},
  'echo-miss':(k,t,o)=>{const lp=k.filter('lowpass',1800,o.out);k.mallet(t,{f:392,v:.12,d:.2,out:lp});k.mallet(t+.12,{f:330,v:.11,d:.3,out:lp});return .45;},
  'echo-song':(k,t,o)=>{bells(k,t,o.me?[72,76,79,84]:[60,64,67,72],o.out,{gap:.08,d:.3,v:.1});return .6;},
  'bells':(k,t,o)=>{bells(k,t,[88,91,93],o.out,{gap:.05,ratio:3.5,index:1.4,d:.35,v:.07});return .5;},
  'tell':(k,t,o)=>{if(o.kind==='kashevet')k.bell(t,{f:330,ratio:1.41,index:1.5,d:.6,v:.08,out:o.out});else if(o.kind==='form'){k.bell(t,{f:659,ratio:1.5,index:2.5,d:.9,v:.12,out:o.out});k.hiss(t,{f:6000,q:.8,a:.15,d:.5,v:.025,out:o.out});}else k.bell(t,{f:988,ratio:3.5,index:1,d:.5,v:.08,out:o.out});return .9;},
  'silenced':(k,t,o)=>{k.tone(t,{type:'triangle',f:420,f2:200,d:.35,v:.12,out:k.filter('lowpass',1200,o.out)});k.hiss(t,{f:3000,f2:1500,q:.7,a:.05,d:.3,v:.2,out:o.out});return .45;},
  'phase2':(k,t,o)=>{k.tone(t,{type:'triangle',f:220,f2:660,d:.7,v:.1,out:o.out});k.bell(t+.2,{f:660,ratio:3.5,index:1,d:.5,v:.06,out:o.out});k.hiss(t,{f:500,f2:3000,a:.3,d:.3,v:.15,out:o.out});return .8;},
  'reveal':(k,t,o)=>{k.bell(t,{f:1046,ratio:3.5,index:.8,d:.3,v:.07,out:o.out});return .35;},
  'buddy-hint':(k,t,o)=>{k.mallet(t,{f:784,v:.1,d:.2,out:o.out});k.mallet(t+.12,{f:1046,v:.1,d:.3,out:o.out});return .45;},
  'finish-win':(k,t,o)=>{bells(k,t,[72,76,79,84],o.out,{gap:.12,d:.7,v:.12,index:.7});[72,76,79,84].forEach((n,i)=>k.mallet(t+i*.12,{f:midi(n-12),v:.1,d:.4,out:o.out}));return 1.2;},
  'finish-lose':(k,t,o)=>{[67,64,60].forEach((n,i)=>k.mallet(t+i*.16,{f:midi(n),v:.14,d:.5,out:o.out}));return .9;},
  'finish-draw':(k,t,o)=>{[64,67].forEach((n,i)=>k.mallet(t+i*.16,{f:midi(n),v:.12,d:.45,out:o.out}));return .65;},
  // The super: a rising whoosh that lands on the creature's element. A full moment adds a deep drop; a MEGA adds drum and brass.
  'sfx-super-whoosh':(k,t,o)=>{const out=o.out,p=o.p||1,hit=t+.26;k.hiss(t,{f:350,f2:4200,q:1.3,a:.24,d:.07,v:.5,out});k.hiss(t,{f:5000,q:.7,a:.22,d:.06,v:.08,out});k.tone(t,{f:220*p,f2:880*p,a:.22,d:.05,v:.05,out});
    tex(k,hit,o.fam,2,p,out);(SIGN[o.fam]||SIGN.stone)(k,hit,p,out);k.hiss(hit,{type:'highpass',f:2600,d:.02,v:.35,out});
    if(o.full){k.tone(hit,{f:120,f2:50,d:.45,v:.3,out});k.tone(hit,{type:'triangle',f:260,f2:110,d:.25,v:.2,out});k.hiss(hit,{f:900,q:.8,d:.12,v:.4,out});}
    if(o.mega){k.drum(hit,{f:70,v:.7,d:.7,out});k.brass(hit,{notes:[48,55,60,64,67],v:.3,a:.02,h:.25,d:.35,bright:3200,out});k.cymbal(hit,{v:.14,d:1.2,out});}return o.mega?1.3:.9;},
  // The rival's super: a dark rising swell, a fair cue to move.
  'sfx-rival-swell':(k,t,o)=>{const out=o.out,lp=k.filter('lowpass',260,out,2);lp.frequency.setValueAtTime(260,t);lp.frequency.exponentialRampToValueAtTime(1800,t+.55);for(const [a,b] of [[50,57],[62,69],[63,70]])k.tone(t,{type:'sawtooth',f:midi(a),f2:midi(b),a:.5,d:.14,v:.07,out:lp});
    k.hiss(t,{f:1200,f2:3500,q:.9,a:.5,d:.06,v:.08,out});k.tone(t+.5,{f:110,f2:60,d:.2,v:.3,out});k.tone(t+.5,{type:'triangle',f:220,f2:120,d:.12,v:.1,out});k.hiss(t+.5,{type:'lowpass',f:700,d:.08,v:.3,out});return .8;},
  'sfx-form-burst':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'lowpass',f:7000,f2:700,a:.004,d:.55,v:.5,out});k.tone(t,{f:110,f2:42,d:.6,v:.45,out});k.tone(t,{type:'triangle',f:220,f2:110,d:.3,v:.16,out});k.tone(t,{f:400,f2:1600,a:.01,d:.35,v:.08,out});
    bells(k,t+.03,[84,88,91,96],out,{gap:.025,ratio:3.5,index:1.2,d:.9,v:.09});k.hiss(t+.05,{type:'highpass',f:6500,a:.03,d:.8,v:.08,out});tex(k,t,o.fam||'light',1,o.p||1,out);return 1.1;},
  // Lub-dub, twice. The knock above the thump keeps it audible on a phone speaker.
  'sfx-heartbeat':(k,t,o)=>{const out=o.out;[[0,1],[.75,.7]].forEach(([d,v])=>[[0,1],[.2,.68]].forEach(([e,w])=>{const s=t+d+e,g=v*w;k.tone(s,{f:70,f2:45,d:.2,v:.3*g,out});k.tone(s,{type:'triangle',f:220,f2:140,d:.12,v:.35*g,out});k.hiss(s,{f:700,q:1.2,d:.06,v:1.2*g,out});k.hiss(s,{type:'lowpass',f:300,d:.08,v:.3*g,out});}));return 1.25;},
  'sfx-confetti':(k,t,o)=>{for(const [d,side] of [[0,-1],[.09,1]]){const out=k.pan(o.out,side*.7);k.hiss(t+d,{f:1000,q:1.2,a:.001,d:.06,v:.8,out});k.tone(t+d,{f:620,f2:260,d:.07,v:.2,out});k.hiss(t+d+.02,{buf:'rustle',f:4200,q:.6,a:.12,d:1.1,v:.25,out});}
    for(let i=0;i<7;i++)k.bell(t+.2+i*.11+Math.random()*.05,{f:penta(5+Math.floor(Math.random()*7),72),ratio:4,index:.6,d:.3,v:.06,out:o.out});return 1.6;},
  'sfx-stamp':(k,t,o)=>{const out=o.out;k.tone(t,{f:150,f2:60,d:.22,v:.2,out});k.tone(t,{type:'triangle',f:420,f2:220,d:.08,v:.3,out});k.hiss(t,{f:1200,q:.7,a:.001,d:.07,v:.7,out});k.hiss(t,{type:'lowpass',f:450,d:.12,v:.35,out});k.hiss(t,{type:'highpass',f:3000,d:.008,v:.2,out});return .35;},
  'star':(k,t,o)=>{k.bell(t,{f:o.f,ratio:4,index:.9,d:.9,v:.15,out:o.out});k.tone(t,{f:o.f*2,d:.35,v:.04,out:o.out});k.hiss(t,{type:'highpass',f:7000,d:.14,v:.05,out:o.out});return 1;},
  'pluck':(k,t,o)=>{k.pluck(t,{f:o.f,v:.12*(o.level??1),d:.3,out:o.out});return .35;},
  'bloom':(k,t,o)=>{bells(k,t,[72,76,79,86],o.out,{gap:.05,ratio:3.5,index:.6,d:1.1,v:.06});[60,67].forEach(n=>k.tone(t,{f:midi(n),a:.2,h:.2,d:.8,v:.04,out:o.out}));return 1.4;},
  'lose-bounce':(k,t,o)=>{k.mallet(t,{f:midi(67),v:.16,d:.35,out:o.out});k.mallet(t+.16,{f:midi(72),v:.18,d:.5,out:o.out});k.tone(t+.12,{f:220,f2:440,a:.01,d:.15,v:.05,out:o.out});return .75;},
  // Warm wooden clicks for the interface.
  'ui-tap':(k,t,o)=>{k.mallet(t,{f:659,v:.16,d:.14,out:o.out});k.hiss(t,{f:1800,q:3,d:.01,v:.1,out:o.out});return .16;},
  'ui-segment':(k,t,o)=>{k.mallet(t,{f:880,v:.1,d:.09,out:o.out});return .1;},
  'ui-deny':(k,t,o)=>{const lp=k.filter('lowpass',2000,o.out);k.mallet(t,{f:392,v:.14,d:.12,out:lp});k.mallet(t+.08,{f:330,v:.12,d:.15,out:lp});return .25;},
  'ui-ready':(k,t,o)=>{k.mallet(t,{f:523,v:.12,d:.2,out:o.out});k.mallet(t+.07,{f:784,v:.14,d:.3,out:o.out});return .4;},
  'ui-hold':(k,t,o)=>{k.hiss(t,{f:2000,q:6,d:.018,v:.18,out:o.out});k.tone(t,{f:1250,d:.02,v:.06,out:o.out});return .05;},
  // Wave 2. Copy stars: a soft twinkle when one pops out, a sparkle and a harp run when it is caught, a two-tone when the borrowed super comes out.
  'copy-drop':(k,t,o)=>{bells(k,t,[91,96,100],o.out,{gap:.05,ratio:4,index:.5,d:.3,v:.07});k.tone(t+.12,{f:880,f2:1320,a:.01,d:.12,v:.04,out:o.out});k.hiss(t,{type:'highpass',f:6500,a:.02,d:.22,v:.04,out:o.out});return .5;},
  'sfx-spark':(k,t,o)=>{bells(k,t,[96,100,103,108],o.out,{gap:.03,ratio:4,index:.7,d:.35,v:.07});k.hiss(t,{type:'highpass',f:5000,f2:9000,a:.01,d:.35,v:.1,out:o.out});k.tone(t,{f:1760,f2:3520,a:.005,d:.15,v:.04,out:o.out});return .55;},
  'shimmer':(k,t,o)=>{for(let i=0;i<7;i++)k.pluck(t+i*.035,{f:penta(i+(o.base??5),72),v:.05+i*.006,d:.4,out:o.out});k.hiss(t+.05,{type:'highpass',f:7000,a:.1,d:.4,v:.05,out:o.out});return .7;},
  'copy-used':(k,t,o)=>{k.mallet(t,{f:midi(79),v:.14,d:.25,out:o.out});k.bell(t+.09,{f:midi(86),ratio:3.5,index:.8,d:.45,v:.1,out:o.out});k.tone(t+.09,{f:midi(79),d:.3,v:.04,out:o.out});return .6;},
  // The comeback star: a slide whistle as it falls, a soft landing; the catch is a power-up run; a bump is a spring.
  'comeback-fall':(k,t,o)=>{k.wobble(t,{f:1900,f2:620,rate:6.5,depth:.025,settle:false,a:.04,h:.55,d:.2,v:.12,out:o.out});k.hiss(t,{f:2600,f2:900,q:1,a:.3,d:.45,v:.05,out:o.out});
    k.tone(t+.8,{type:'triangle',f:330,f2:160,d:.12,v:.16,out:o.out});k.hiss(t+.8,{type:'lowpass',f:900,d:.06,v:.25,out:o.out});k.bell(t+.82,{f:midi(91),ratio:4,index:.6,d:.4,v:.07,out:o.out});return 1.25;},
  'comeback':(k,t,o)=>{const out=o.out;[60,64,67,72,76,79,84].forEach((n,i)=>{k.pluck(t+i*.045,{f:midi(n+12),v:.08,d:.3,out});k.tone(t+i*.045,{type:'square',f:midi(n),d:.05,v:.018,out:k.filter('lowpass',2400,out)});});
    k.later(t+.32,()=>{bells(k,t+.32,[84,88,91,96],out,{gap:.015,ratio:3.5,index:.9,d:.9,v:.07});[72,76,79].forEach(n=>k.tone(t+.32,{f:midi(n),a:.02,h:.15,d:.5,v:.05,out}));k.hiss(t+.32,{type:'highpass',f:6500,a:.02,d:.6,v:.07,out});});return 1.3;},
  'comeback-bump':(k,t,o)=>{k.boing(t,{f:330,v:.2,d:.38,out:o.out});k.hiss(t,{f:900,q:1,a:.001,d:.05,v:.35,out:o.out});k.tone(t,{f:150,f2:80,d:.1,v:.08,out:o.out});return .45;},
  'comeback-end':(k,t,o)=>{bells(k,t,[91,86,84],o.out,{gap:.08,ratio:4,index:.5,d:.35,v:.06});k.hiss(t,{type:'highpass',f:6000,f2:3000,a:.02,d:.3,v:.04,out:o.out});return .6;},
  // A comeback card turns over, and a decoy goes up in a puff.
  'card':(k,t,o)=>{k.hiss(t,{f:2600,q:1.6,a:.002,d:.035,v:.35,out:o.out});k.hiss(t+.07,{f:3400,q:1.6,a:.002,d:.03,v:.25,out:o.out});k.bell(t+.1,{f:midi(88),ratio:4,index:.6,d:.4,v:.08,out:o.out});return .55;},
  'puff':(k,t,o)=>{k.hiss(t,{f:900,f2:2600,q:.9,a:.03,d:.22,v:.3,out:o.out});k.hiss(t,{type:'lowpass',f:700,d:.08,v:.2,out:o.out});return .3;},
  // The six new Wonders.
  'wonder-firefly':(k,t,o)=>{k.bell(t,{f:penta(5+(o.i??0)%8,72),ratio:4,index:.5,d:.3,v:.09,out:o.out});k.hiss(t,{type:'highpass',f:7000,d:.05,v:.04,out:o.out});return .35;},
  'wonder-kernel':(k,t,o)=>{k.pop(t,{f:620*(o.p||1),v:.16,out:o.out});k.bell(t+.02,{f:2093,ratio:4,index:.4,d:.12,v:.03,out:o.out});return .15;},
  'popcorn-burst':(k,t,o)=>{for(let i=0;i<14;i++){const d=Math.random()*.9;k.pop(t+d,{f:420+Math.random()*500,v:.07+Math.random()*.08,out:o.out});}return 1.1;},
  'wonder-shroom':(k,t,o)=>{k.tone(t,{f:260,f2:720,a:.01,d:.14,v:.14,out:o.out});k.tone(t+.01,{type:'triangle',f:520,f2:1100,d:.1,v:.05,out:o.out});bells(k,t+.1,[76,81,88],o.out,{gap:.08,ratio:3.5,index:.6,d:.45,v:.08});return .7;},
  'shrooms':(k,t,o)=>{[0,.18,.36].forEach((d,i)=>k.boing(t+d,{f:180+i*60,v:.1,d:.3,out:o.out}));return .8;},
  'wonder-swap':(k,t,o)=>{k.hiss(t,{f:500,f2:3600,q:1.2,a:.12,d:.08,v:.3,out:k.pan(o.out,-.6)});k.hiss(t+.16,{f:3600,f2:600,q:1.2,a:.02,d:.2,v:.3,out:k.pan(o.out,.6)});k.pop(t+.2,{f:900,v:.1,out:o.out});return .45;},
  'bubbles':(k,t,o)=>{for(let i=0;i<6;i++){const d=i*.09+Math.random()*.05,f=300+Math.random()*400;k.tone(t+d,{f,f2:f*2.6,a:.004,d:.07,v:.12,out:o.out});k.tone(t+d,{f:f*3,d:.02,v:.03,out:o.out});}return .7;},
  'bubble-shot':(k,t,o)=>{const f=330*(o.p||1);k.tone(t,{f,f2:f*2.4,a:.004,d:.09,v:.18,out:o.out});k.tone(t+.005,{f:f*3.1,d:.025,v:.05,out:o.out});return .12;},
  'fireflies':(k,t,o)=>{for(let i=0;i<6;i++)k.bell(t+i*.13+Math.random()*.05,{f:penta(8+Math.floor(Math.random()*6),72),ratio:4,index:.4,d:.35,v:.045,out:o.out});k.tone(t,{f:196,a:.25,h:.2,d:.6,v:.04,out:o.out});return 1.2;},
  // Beats: the Rhythm Deer's taiko (strong beats louder), the dance floor's soft kick, and the bridge scene's tick.
  'beat-rhythm':(k,t,o)=>{if(o.strong){k.drum(t,{f:210,v:.35,d:.28,out:o.out});k.hiss(t,{f:1300,q:1.3,a:.001,d:.05,v:.7,out:o.out});k.mallet(t,{f:660,v:.12,d:.08,out:o.out});}else{k.mallet(t,{f:1175,v:.12,d:.05,out:o.out});k.hiss(t,{f:2500,q:3,d:.012,v:.15,out:o.out});}return .4;},
  'beat-dance':(k,t,o)=>{k.tone(t,{f:120,f2:48,d:.16,v:.22,out:o.out});k.tone(t,{type:'triangle',f:420,f2:160,d:.05,v:.16,out:o.out});k.hiss(t,{f:1000,q:2,d:.012,v:.2,out:o.out});if(o.strong)k.hiss(t,{f:1500,q:.9,a:.002,d:.07,v:.3,out:o.out});else k.hiss(t,{type:'highpass',f:7000,d:.03,v:.08,out:o.out});return .2;},
  'beat-tick':(k,t,o)=>{const s=o.strong;k.drum(t,{f:s?190:250,v:s?.28:.18,d:s?.32:.2,out:o.out});k.hiss(t,{f:s?1200:1800,q:1.3,a:.001,d:.05,v:s?.6:.35,out:o.out});k.mallet(t,{f:s?988:784,v:s?.12:.08,d:.08,out:o.out});return .45;},
  // The Land of Two Tracks: the hill, the gates, the rival's pace, the wisps, the Bridge Super, Tzadon's stomp and the guardian's staged beat.
  'hill-warn':(k,t,o)=>{[0,.2].forEach(d=>k.bell(t+d,{f:1397,ratio:2.76,index:1.1,d:.4,v:.12,out:o.out}));return .65;},
  'hill-move':(k,t,o)=>{k.hiss(t,{f:400,f2:2400,q:1.2,a:.18,d:.1,v:.25,out:o.out});k.tone(t+.28,{f:110,f2:60,d:.2,v:.25,out:o.out});k.hiss(t+.28,{type:'lowpass',f:800,d:.08,v:.3,out:o.out});k.bell(t+.3,{f:midi(84),ratio:4,index:.5,d:.4,v:.06,out:o.out});return .75;},
  'hill-take':(k,t,o)=>{const n=o.me?[79,84]:[67,62];n.forEach((m,i)=>k.mallet(t+i*.08,{f:midi(m),v:.12,d:.25,out:o.out}));return .35;},
  'hill-point':(k,t,o)=>{const n=o.n|0,big=n>0&&n%5===0,f=o.me?midi(72+Math.min(14,Math.floor(n/2))):midi(60+Math.min(7,Math.floor(n/4)));k.mallet(t,{f,v:big?.16:.11,d:big?.3:.12,out:o.out});if(big&&o.me)k.bell(t+.03,{f:f*2,ratio:4,index:.5,d:.35,v:.05,out:o.out});return big?.4:.15;},
  'gate-ready':(k,t,o)=>{k.bell(t,{f:1568,ratio:3.01,index:.8,d:.45,v:.11,out:o.out});k.tone(t,{f:3136,d:.12,v:.02,out:o.out});return .5;},
  'gate-open':(k,t,o)=>{const out=o.out;k.hiss(t,{f:500,f2:1500,q:1.4,a:.08,d:.08,v:.12,out});k.brass(t+.05,{notes:[67,74],v:.18,a:.015,h:.06,d:.05,bright:2800,out});k.brass(t+.2,{notes:[72,76,79],v:.24,a:.02,h:.22,d:.3,bright:3000,out});
    bells(k,t+.2,[84,88,91],out,{gap:.03,d:.6,v:.06});k.drum(t+.2,{f:110,v:.25,d:.25,out});return .9;},
  'race-rival':(k,t,o)=>{k.mallet(t,{f:523,v:.16,d:.15,out:o.out});k.mallet(t+.12,{f:392,v:.15,d:.25,out:o.out});k.tone(t+.12,{f:196,d:.2,v:.05,out:o.out});return .45;},
  'wisp':(k,t,o)=>{k.wobble(t,{f:880,f2:470,rate:7,depth:.03,settle:false,a:.05,d:.45,v:.08,out:o.out});k.hiss(t,{f:1200,f2:500,q:1.4,a:.08,d:.4,v:.1,out:o.out});return .6;},
  'bridge-super':(k,t,o)=>{const out=o.out;k.hiss(t,{f:400,f2:5000,q:1,a:.2,d:.05,v:.25,out});k.later(t+.22,()=>{k.drum(t+.22,{f:90,v:.45,d:.6,out});k.cymbal(t+.22,{v:.15,d:1.4,out});
    k.brass(t+.22,{notes:[55,62,67,71,74],v:.3,a:.03,h:.45,d:.6,bright:3200,out});bells(k,t+.24,[79,83,86,91,95],out,{gap:.035,ratio:3.5,index:.9,d:1.1,v:.07});k.hiss(t+.22,{type:'highpass',f:6500,a:.05,d:.9,v:.06,out});});return 1.7;},
  'stomp':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'lowpass',f:500,a:.005,d:.3,v:.35,out});k.hiss(t,{f:700,q:.9,a:.003,d:.12,v:.4,out});k.hiss(t,{f:1100,q:.8,a:.002,d:.15,v:.4,out});k.tone(t,{f:72,f2:40,d:.35,v:.22,out});k.tone(t,{type:'triangle',f:190,f2:90,d:.14,v:.25,out});k.hiss(t+.01,{buf:'crackle',f:1200,q:.6,d:.25,v:.3,out});k.pebbles(t+.04,{n:3,v:.14,spread:.25,out});return .5;},
  // The staged beat: a crack, a low brass hit with two taiko, a crash and rubble: the biggest single moment of a guardian fight.
  'phase-beat':(k,t,o)=>{const out=o.out;k.hiss(t,{type:'highpass',f:3000,a:.001,d:.05,v:.5,out});k.brass(t,{notes:[36,43,48,55],v:.36,a:.01,h:.3,d:.9,bright:2200,out});k.drum(t,{f:200,v:.4,d:.7,out});k.drum(t+.02,{f:140,v:.28,d:.9,out});
    k.cymbal(t,{v:.4,d:2.4,out});k.hiss(t,{f:1200,q:.6,a:.002,d:.9,v:.4,out});k.hiss(t+.03,{f:3000,f2:500,q:.8,a:.02,d:.7,v:.25,out});k.hiss(t+.1,{buf:'crackle',f:1400,q:.6,d:.8,v:.3,out});return 2.4;},
  // A mission won (the hill held, the race finished): a short fanfare under the confetti of the result.
  'mode-finish':(k,t,o)=>{const out=o.out;for(let i=0;i<6;i++)k.drum(t+i*.06,{f:150,v:.08+i*.03,d:.1,out});k.brass(t+.38,{notes:[60,67],v:.22,a:.015,h:.08,d:.06,bright:3000,out});
    k.later(t+.55,()=>{k.brass(t+.55,{notes:[60,64,67,72,76],v:.34,a:.03,h:.5,d:.7,bright:3400,out});k.drum(t+.55,{f:70,v:.7,d:.7,out});k.cymbal(t+.55,{v:.18,d:1.4,out});bells(k,t+.55,[84,88,91,96],out,{gap:.05,d:.9,v:.07});});return 2.1;},
  // The spectacle guardian's entrance: ink drips, then a roar that rises out of the ink.
  'ink-drip':(k,t,o)=>{const p=o.p||1;k.tone(t,{f:1100*p,f2:320*p,a:.003,d:.09,v:.13,out:o.out});k.tone(t+.06,{f:520*p,f2:260*p,d:.06,v:.05,out:o.out});k.hiss(t,{type:'lowpass',f:1500,d:.03,v:.08,out:o.out});return .2;},
  'roar':(k,t,o)=>{const x=k.x,out=o.out,end=t+1.45,b1=k.filter('bandpass',650,out,3),b2=k.filter('bandpass',1250,out,4),b3=k.filter('bandpass',2600,out,5),am=x.createGain(),trem=x.createOscillator(),tg=x.createGain();
    b1.frequency.setValueAtTime(520,t);b1.frequency.linearRampToValueAtTime(760,t+.5);b1.frequency.linearRampToValueAtTime(480,end);
    am.gain.value=1;trem.frequency.value=23;tg.gain.value=.45;trem.connect(tg);tg.connect(am.gain);trem.start(t);trem.stop(end+.05);am.connect(b1);am.connect(b2);am.connect(b3);
    for(const [f0,c] of [[82,-8],[82,9],[123,0]]){const o2=x.createOscillator(),g=k.env(t,.42,.18,.65,.5,am);o2.type='sawtooth';o2.detune.value=c;o2.frequency.setValueAtTime(f0*.8,t);o2.frequency.linearRampToValueAtTime(f0*1.25,t+.35);o2.frequency.linearRampToValueAtTime(f0*1.05,t+.8);o2.frequency.exponentialRampToValueAtTime(f0*.7,end);o2.connect(g);o2.start(t);o2.stop(end+.05);}
    k.hiss(t,{f:900,f2:600,q:1.2,a:.2,h:.5,d:.6,v:.35,out:am});k.hiss(t,{type:'lowpass',f:400,a:.15,h:.5,d:.6,v:.35,out});k.tone(t,{f:55,f2:42,a:.15,h:.5,d:.6,v:.2,out});return 1.5;},
  // The Lab and the wardrobe: a hat goes on with a spring and comes off with a pop; a design option swishes in; saving stamps it.
  'ui-hat':(k,t,o)=>{k.boing(t,{f:260,v:.16,d:.32,out:o.out});k.bell(t+.06,{f:midi(88),ratio:4,index:.5,d:.25,v:.05,out:o.out});return .4;},
  'ui-hat-off':(k,t,o)=>{k.pop(t,{f:760,v:.18,out:o.out});k.tone(t+.03,{f:900,f2:600,d:.06,v:.04,out:o.out});return .15;},
  'ui-lab-option':(k,t,o)=>{k.hiss(t,{f:700,f2:4200,q:1.1,a:.09,d:.08,v:.2,out:o.out});bells(k,t+.1,[84,88,91],o.out,{gap:.035,ratio:3.5,index:.7,d:.35,v:.07});return .55;},
  'ui-lab-name':(k,t,o)=>{k.pluck(t,{f:midi(79),v:.12,d:.3,out:o.out});k.pluck(t+.07,{f:midi(84),v:.1,d:.35,out:o.out});return .45;},
  'ui-lab-mech':(k,t,o)=>{k.hiss(t,{f:2600,q:1.6,a:.002,d:.03,v:.3,out:o.out});k.mallet(t+.04,{f:midi(76),v:.13,d:.2,out:o.out});k.mallet(t+.11,{f:midi(83),v:.12,d:.3,out:o.out});return .45;},
  'ui-lab-save':(k,t,o)=>{SFX['sfx-stamp'](k,t,o);bells(k,t+.12,[72,76,79,84,88],o.out,{gap:.05,ratio:3.5,index:.8,d:.7,v:.08});return 1;},
  // A new mix: two different bells meet in one chord, then a sparkle.
  'mix-fanfare':(k,t,o)=>{const out=o.out;k.bell(t,{f:midi(79),ratio:2.76,index:1,d:.5,v:.11,out:k.pan(out,-.5)});k.bell(t+.12,{f:midi(86),ratio:3.5,index:1,d:.5,v:.11,out:k.pan(out,.5)});
    k.later(t+.3,()=>{bells(k,t+.3,[79,83,86,91,95],out,{gap:.03,ratio:3.5,index:.9,d:1,v:.07});[67,71,74].forEach(n=>k.tone(t+.3,{f:midi(n),a:.04,h:.25,d:.6,v:.05,out}));k.drum(t+.3,{f:100,v:.28,d:.3,out});for(let i=0;i<8;i++)k.pluck(t+.45+i*.03,{f:penta(i+8,72),v:.05,d:.35,out});});return 1.4;},
};
// Room per sound (0..1): bells and stings ring, thumps stay dry.
const ROOM={'sfx-chain':.35,'sfx-near-miss':.4,'sfx-ready':.35,'pip':.35,'form-ready':.45,'star-lend':.5,'sfx-seed-sprout':.4,'wonder-ready':.45,'sting-form':.4,'sting-victory':.35,'sting-wonder':.5,'sfx-victory-sting':.35,'sfx-wonder-start':.5,'sfx-form-burst':.4,'sfx-super-whoosh':.25,'go':.35,'star':.4,'bloom':.5,'pluck':.3,'echo-note':.45,'finish-win':.35,'boss-open':.3,'sfx-heartbeat':.1,'sfx-stamp':.12,'ui-tap':.05,'ui-segment':.05,'ui-deny':.05,'ui-hold':.03,
  'copy-drop':.4,'sfx-spark':.35,'shimmer':.4,'copy-used':.3,'comeback-fall':.2,'comeback':.35,'comeback-end':.4,'card':.15,'wonder-firefly':.4,'wonder-shroom':.3,'fireflies':.5,'shrooms':.2,'bubbles':.2,
  'beat-rhythm':.15,'beat-dance':.05,'beat-tick':.15,'hill-warn':.3,'gate-ready':.35,'gate-open':.3,'bridge-super':.35,'phase-beat':.3,'mode-finish':.35,'roar':.25,'ink-drip':.3,'mix-fanfare':.45,
  'ui-hat':.05,'ui-hat-off':.05,'ui-lab-option':.2,'ui-lab-name':.1,'ui-lab-mech':.05,'ui-lab-save':.15};
// Loudness per sound, measured the way a phone speaker hears it (350 Hz to 8 kHz) against the voice lines:
// shots sit about 14 dB under a voice, hits 4 to 9 dB under, supers and stings level with it.
const TRIM={'sfx-shot-water':0.7,'sfx-shot-spark':1.2,'sfx-shot-stone':1.37,'sfx-shot-fire':2.6,'sfx-shot-light':0.81,'sfx-shot-nature':1.25,'sfx-shot-sound':0.78,'sfx-shot-wind':1.75,'sfx-hit-1':1.23,'sfx-hit-2':1.49,'sfx-hit-3':1.64,'sfx-chain':1.6,'sfx-near-miss':1.02,'chip':1.54,'sfx-cover-crack':2.34,'sfx-ready':1.35,'pip':1.11,'form-ready':1.5,'form-end':1.64,'star-lend':1.35,'sfx-seed-sprout':1.8,'wonder-ready':1.59,'wonder-end':1.52,'meteor':1.2,'ko':1.45,'respawn':1.53,'quake':1.9,'blast':1.05,'collapse':1.52,'boss-windup':1.87,'boss-charge':2.57,'boss-open':1.3,'boss-guard':1.31,'echo-turn':1.18,'echo-again':1.34,'lava-warning':2.69,'light-block':1.26,'pull':1.8,'ball-pick':1.93,'ball-loose':1.24,'ball-hit':1.95,'kick':2.11,'goal':2.28,'overtime':1.88,'go':1.7,'swap':1.45,'feather':1.55,'ember':2.43,'hold-start':2.07,'heal':1.68,'echo-note':1.98,'echo-step':1.23,'echo-miss':1.95,'echo-song':2.57,'bells':2.24,'tell':2.95,'silenced':2.19,'phase2':3.27,'reveal':1.51,'buddy-hint':2.09,'finish-win':1.88,'finish-lose':2.69,'finish-draw':2.82,'sfx-super-whoosh':1.42,'sfx-rival-swell':3.31,'sfx-form-burst':1.21,'sfx-heartbeat':2.13,'sfx-confetti':2.54,'sfx-stamp':2.65,'star':1.62,'pluck':1.4,'bloom':1.95,'lose-bounce':1.72,'ui-tap':1.08,'ui-segment':1.2,'ui-deny':2.04,'ui-ready':1.23,'ui-hold':2.54,'sting-form':1.2,'sting-victory':1.1,'sting-wonder':1.58,'sfx-victory-sting':1.1,'sfx-wonder-start':1.58,'copy-drop':1.62,'sfx-spark':2.45,'shimmer':1.35,'copy-used':1.5,'comeback-fall':0.95,'comeback':1.57,'comeback-bump':1.63,'comeback-end':2.25,'card':2.19,'puff':1.99,'wonder-firefly':1.47,'wonder-kernel':1.43,'popcorn-burst':2.5,'wonder-shroom':2.24,'shrooms':3.09,'wonder-swap':2.5,'bubbles':2.82,'bubble-shot':1.45,'fireflies':2.96,'beat-rhythm':1.62,'beat-dance':2.44,'beat-tick':2.73,'hill-warn':1.86,'hill-move':2.88,'hill-take':1.35,'hill-point':1.86,'gate-ready':1.36,'gate-open':0.99,'race-rival':1.64,'wisp':1.47,'bridge-super':1.23,'stomp':2.45,'phase-beat':1.9,'mode-finish':1.05,'ink-drip':1.68,'roar':1.26,'ui-hat':2.48,'ui-hat-off':1.37,'ui-lab-option':1.68,'ui-lab-name':1.03,'ui-lab-mech':1.18,'ui-lab-save':1.8,'mix-fanfare':1.45};
// A recorded file can stand in for a sound: four shot files serve the eight families.
const SAMPLE_OF={'sfx-shot-light':'sfx-shot-spark','sfx-shot-nature':'sfx-shot-stone','sfx-shot-sound':'sfx-shot-water','sfx-shot-wind':'sfx-shot-water'};
// The same four files would serve the eight families' hits, like the shots.
const HIT_FILE={water:'sfx-hit-water',spark:'sfx-hit-spark',stone:'sfx-hit-stone',fire:'sfx-hit-fire',light:'sfx-hit-spark',nature:'sfx-hit-stone',sound:'sfx-hit-water',wind:'sfx-hit-water'};
export const SFX_NAMES=Object.keys(SFX);

// Each new Wonder adds its own little signature under the Wonder sting.
const WONDER_SIG={popcorn:'popcorn-burst',bubbles:'bubbles',fireflies:'fireflies',mushrooms:'shrooms'};
// The announcer says these at most once a battle.
const ONCE=['super','form','wonder'];

export class Sound {
  constructor(){this.enabled=true;this.sources=[];this.buffers={};this.scene='lobby';this.next=0;this.loading=null;this.local=0;this.streak={};this.voices=[];this.lastShots=[];this.lastHit=[];this.kinds=[];this.fams=[];this.missing=new Set();this.rate=1;this.baseRate=1;this.starRate=false;this.dropped=false;this.offset=0;
    this.battleTrack='battle';this.want=new Set();this.spoken=[];this.said=new Set();this.countSkip=false;this.wonder=null;this.allied=false;this.last={};this.flies=0;}
  async unlock(){
    if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.attach(new Audio());this.kit.lazy=true;this.initMusic();this.loading=this.load();this.timer=setInterval(()=>this.schedule(),300);}
    // On iPhone the silent switch mutes web sound unless the page asks for playback sound.
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
    if(this.enabled)await this.ctx.resume().catch(()=>{});
    // Phones start a music track only from a tap, so both copies of every track get their first play here (a world's own tracks once a battle asked for them).
    for(const [id,t] of Object.entries(this.music||{}))if(t.armed)this.prime(id,t);
    this.schedule();
  }
  // A play that our own pause interrupts (AbortError) still counts: the tap has unlocked the element; only a refusal asks again at the next tap.
  prime(id,t){if(t.primed)return;t.primed=true;t.els.forEach((el,i)=>el.play().then(()=>{if(i!==t.cur||id!==this.track()||!this.enabled||this.paused)el.pause();}).catch(e=>{if(e?.name!=='AbortError')t.primed=false;}));}
  // A world's track loads the first time a battle asks for it (inside that tap, so a phone lets it play later).
  arm(id){this.want.add(id);const t=this.music?.[id];if(!t||t.armed)return;t.armed=true;t.els.forEach((e,i)=>e.preload=i===t.cur?'auto':'metadata');this.prime(id,t);}
  // The sound graph: effects (with a small room) and music meet in the master, then a limiter keeps stacked sounds from clipping. Works on an offline context too.
  attach(x){this.ctx=x;const c=x.createDynamicsCompressor();c.threshold.value=-2;c.knee.value=1;c.ratio.value=20;c.attack.value=.001;c.release.value=.12;this.limiter=c;
    // A soft edge after the limiter: anything that still pokes over is rounded, never clipped.
    const edge=x.createWaveShaper(),curve=new Float32Array(1025);for(let i=0;i<1025;i++){const v=i/512-1,a=Math.abs(v);curve[i]=a<.85?v:Math.sign(v)*(.85+.15*Math.tanh((a-.85)/.15));}edge.curve=curve;c.connect(edge);edge.connect(x.destination);
    this.master=x.createGain();this.master.gain.value=this.enabled?Sound.LEVEL:0;this.master.connect(c);
    this.bufs=makeBuffers(x);this.kit=new Kit(x,this.bufs);this.sfx=x.createGain();
    // Effects lose only the deep rumble no phone can play, which leaves the limiter room for the sounds a child does hear.
    const hp=x.createBiquadFilter();hp.type='highpass';hp.frequency.value=70;hp.Q.value=.6;hp.connect(this.master);this.sfx.connect(hp);
    this.verb=x.createConvolver();this.verb.buffer=this.bufs.room;this.wet=x.createGain();this.wet.gain.value=.35;this.verb.connect(this.wet);this.wet.connect(hp);
    this.musicBus=x.createGain();this.musicBus.gain.value=Sound.MUSIC_LEVEL[this.scene]||.2;this.duckG=x.createGain();this.dropG=x.createGain();this.musicBus.connect(this.duckG);this.duckG.connect(this.dropG);this.dropG.connect(this.master);return this;}
  // Short generated clips: card flip, fanfare and the Hebrew announcer.
  // Music sits under speech and effects: battle music is quieter so the action stays clear; the campfire is the lobby track, softly.
  static MUSIC_LEVEL={lobby:.22,battle:.15,campfire:.1};
  static DUCK=.3;static STING_UNDER=.3;
  // The limiter adds about 1 dB, so the master is .49 instead of .55 and music and voices keep their old loudness.
  static LEVEL=.49;
  static CLIPS=['sfx-card-flip','sfx-join-fanfare','voice-wild-battle','voice-victory','voice-new-creature','voice-new-card',...['3','2','1','go','super','form','wonder','almost'].map(w=>'voice-announcer-'+w)];
  // Recorded effects that exist in art/gen (only these are ever fetched). Every name has a procedural stand-in,
  // except the campfire and reward stings and the crowd cheer, which are simply silent without their file.
  static SAMPLES=['sting-form','sting-victory','sting-wonder','sting-campfire','sting-reward','sfx-spark','sfx-cheer'];
  // Recorded files carry their own room and loudness: this brings each to the level its procedural stand-in was measured at
  // (phone band, against the voice lines). The campfire stays a little softer.
  static SAMPLE_TRIM={'sting-form':1.7,'sting-victory':1.88,'sting-wonder':.93,'sting-campfire':.93,'sting-reward':1.62,'sfx-spark':.61,'sfx-cheer':.36,
    // Measured against the big procedural hit but not listed: the procedural hits won the A/B (see the wave-2 report).
    'sfx-hit-water':.72,'sfx-hit-spark':1.19,'sfx-hit-stone':.85,'sfx-hit-fire':1.15};
  // A recording that runs longer than its moment stops here, with a short fade.
  static SAMPLE_CUT={'sfx-hit-water':.45,'sfx-hit-spark':.45,'sfx-hit-stone':.45,'sfx-hit-fire':.45};
  // The announcer's words, each brought to the loudness of the win line (phone band).
  static WORDS=['3','2','1','go','super','form','wonder','almost'];
  static WORD_LEVEL={'3':.79,'2':.76,'1':.92,go:.85,super:1,form:.92,wonder:.92,almost:.95};
  static VOICE_CAP=8;static STREAK=1.2;static XFADE=2.4;static VOICE_WAIT=2.5;static LINE_WAIT=1.5;static STAR_RATE=1.15;static SURGE=5;
  now(){return (globalThis.performance?.now?.()??Date.now())/1000;}
  time(){return this.ctx.currentTime+.004+this.offset;}
  live(){return !!this.ctx&&this.enabled&&!this.paused;}
  // A child's side: this phone's child, a friend on the same screen, or the child's side in a co-op; a race's computer friend (side 2) is not one.
  human(side){return side===this.local||!!this.versus||side!==1&&!(side===2&&this.allied);}
  // Whose moment a sound is: on two phones only this phone's child, on one screen every child.
  mine(side){return side!=null&&(this.online?side===this.local:this.human(side));}
  setLocalSide(side){this.local=side===1?1:0;this.streak={};this.lastShots=[];this.lastHit=[];this.kinds=[];this.fams=[];this.said=new Set();this.countSkip=false;this.wonder=null;this.flies=0;if(this.starRate){this.starRate=false;this.applyRate();}}
  play(name,{delay=0,volume=.9}={}){if(!this.ctx||!this.enabled||!this.clips?.[name])return false;const at=this.ctx.currentTime+delay;if(name.startsWith('voice-'))return this.voice(name,at,volume);
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.clips[name];gain.gain.value=volume;source.connect(gain);gain.connect(this.master);source.start(at);return true;}
  // One voice at a time: the announcer, the spoken clips and the Little Shadow's lines share one channel, so two voices never overlap.
  // A clip waits for the voice in front of it (an announcer word only a moment, 'almost' up to 1.5 s, other clips up to VOICE_WAIT) or is skipped.
  voice(name,at,volume){const word=name.startsWith('voice-announcer-')?name.slice(16):null,wait=word==='almost'?1.5:word?.15:Sound.VOICE_WAIT,free=this.voiceFree();
    if(free>at+.02){if(free-at>wait)return false;at=free+.08;}this.voiceAt(this.clips[name],at,volume*(word?Sound.WORD_LEVEL[word]??1:1),word?'word':'clip');return true;}
  voiceFree(){const now=this.ctx.currentTime;this.spoken=this.spoken.filter(v=>v.end>now);return this.spoken.reduce((m,v)=>Math.max(m,v.end),0);}
  voiceBusy(){return !!this.ctx&&this.voiceFree()>this.ctx.currentTime+.02;}
  voiceAt(buffer,at,volume,kind){const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=buffer;g.gain.value=volume;s.connect(g);g.connect(this.master);s.start(at);const v={s,g,kind,start:at,end:at+buffer.duration};this.spoken.push(v);this.speak(at,buffer.duration);return v;}
  // A voice that gives way fades out in 80 ms; the channel is free once the fade is over, so the next voice never starts under it.
  hush(v){if(!v||v.cut)return;v.cut=true;const now=this.ctx.currentTime,p=v.g.gain,stop=Math.max(now+.1,v.start+.01);v.end=Math.min(v.end,stop);try{p.cancelScheduledValues(now);p.setValueAtTime(p.value,now);p.linearRampToValueAtTime(0,now+.08);v.s.stop(stop);}catch{}}
  // A voice is always heard: the music ducks, the effects step back a little and a crowd cheer gives way while it speaks.
  // A musical sting steps far back under the voice and swells again after it, so 'פלא!' and 'צורת עוצמה!' stay clear on a phone.
  speak(at,duration){this.duck(at,duration);for(const c of this.cheers||[])if(c.end>at){const p=c.g.gain;p.cancelScheduledValues(at);p.setTargetAtTime(0,at,.08);c.end=at;}this.cheers=[];this.cheering=null;
    for(const o of this.stingsLive||[])if(!o.out&&o.end>at)this.underVoice(o,at,at+duration);
    if(!this.sfx)return;const g=this.sfx.gain;g.cancelScheduledValues(at);g.setTargetAtTime(.5,at,.05);g.setTargetAtTime(1,at+duration+.05,.25);}
  // While someone speaks (or a sting plays) the music drops, then comes back. While two ducks overlap the deeper one wins.
  duck(at,duration,level=Sound.DUCK){if(!this.duckG)return;const g=this.duckG.gain,now=this.ctx.currentTime;if(this.duckUntil>now)level=Math.min(level,this.duckLevel);const back=Math.max(at+duration,this.duckUntil||0);g.cancelScheduledValues(at);g.setTargetAtTime(level,at,.06);g.setTargetAtTime(1,back+.1,.35);this.duckUntil=back;this.duckLevel=level;}
  // The announcer: '3','2','1','go','super','form','wonder','almost' (battle decides when). A word never talks over another voice,
  // a countdown that lost a number stays quiet until 'go', and 'super', 'form' and 'wonder' are said at most once a battle.
  announce(word){word=String(word);if(!Sound.WORDS.includes(word)||!this.ctx||!this.enabled)return false;
    if(word==='3')this.countSkip=false;if((word==='2'||word==='1')&&this.countSkip)return false;if(ONCE.includes(word)&&this.said.has(word))return false;
    const ok=this.play('voice-announcer-'+word,{volume:.9});if(ok)this.said.add(word);else if(word==='3'||word==='2')this.countSkip=true;if(word==='go')this.countSkip=false;return ok;}
  static MUSIC={lobby:'music-map',battle:'music-battle',tracks:'music-tracks',boss:'music-boss'};
  // A world's own battle tracks load only when a battle first asks for them.
  static LAZY=['tracks','boss'];
  // Each track's level against the first battle track (phone band), so a new world is not quieter.
  static MUSIC_TRIM={tracks:1.08,boss:1.15};
  // A track that ends in a fade-out loops before it, so the crossing never dips.
  static TAIL={tracks:3,boss:.8};
  // Where a track enters when it takes over in the middle of a battle: past its quiet first bar.
  static ENTRY={boss:1.4};
  static TRACK={campfire:'lobby'};
  track(){return this.scene==='battle'?this.battleTrack||'battle':Sound.TRACK[this.scene]||this.scene;}
  // Two copies of each track: near the end the other copy starts from the top and the two cross, so the loop never jumps.
  initMusic(){this.music={};for(const [id,file] of Object.entries(Sound.MUSIC)){const g=this.ctx.createGain(),armed=!Sound.LAZY.includes(id)||this.want.has(id);g.gain.value=0;g.connect(this.musicBus);const t={g,els:[],hs:[],cur:0,primed:false,armed,swap:0,tail:Sound.TAIL[id]||0,get el(){return this.els[this.cur];}};
    for(let i=0;i<2;i++){const el=new Audio('./art/gen/'+file+'.mp3');el.loop=true;el.preload=!armed?'none':i?'metadata':'auto';el.setAttribute('playsinline','');const h=this.ctx.createGain();h.gain.value=i?0:1;try{this.ctx.createMediaElementSource(el).connect(h);}catch{}h.connect(g);t.els.push(el);t.hs.push(h);}
    this.music[id]=t;}}
  async load(){this.clips={};await Promise.all([...Sound.CLIPS,...Sound.SAMPLES].map(async name=>{try{const r=await fetch('./art/gen/'+name+'.mp3');if(!r.ok)return;this.clips[name]=await this.ctx.decodeAudioData(await r.arrayBuffer());}catch{/* A missing clip is silent. */}}));this.schedule();}
  setEnabled(value){this.enabled=value;if(this.ctx){this.master.gain.setTargetAtTime(value?Sound.LEVEL:0,this.ctx.currentTime,.05);if(value)this.ctx.resume().catch(()=>{});}this.schedule();}
  // A scene picks its music. In a battle it is `track` ('battle', a world's 'tracks' or a spectacle guardian's 'boss'); asking again in the
  // same battle for another track crosses into it from the top. Every call brings the music speed back to 1.
  setScene(scene,{track=null}={}){if(this.ctx&&this.dropped){const g=this.dropG.gain,now=this.ctx.currentTime;g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.setTargetAtTime(1,now+.4,.45);}this.dropped=false;
    const bt=scene==='battle'?(['tracks','boss'].includes(track)?track:'battle'):null,fresh=scene!==this.scene;
    if(fresh){this.said=new Set();this.countSkip=false;this.wonder=null;this.starRate=false;if(scene!=='battle')this.allied=false;}this.setMusicRate(1);
    if(!fresh&&(!bt||bt===this.battleTrack)){this.schedule();return;}this.scene=scene;
    // A battle starts its music from the top; the tracks of the Land of Two Tracks also get the guardian's track ready.
    // A switch in the middle of a battle (the guardian's second stage) is an event: the new track comes in at once, past its quiet first bar, swells, then settles.
    const mid=bt&&!fresh;if(bt){this.battleTrack=bt;this.arm(bt);if(bt==='tracks')this.arm('boss');const t=this.music?.[bt],el=t&&t.els[t.cur];if(el&&el.paused)try{el.currentTime=mid?Sound.ENTRY[bt]||0:0;}catch{}if(mid&&t)t.g.gain.setTargetAtTime(Sound.MUSIC_TRIM[bt]??1,this.ctx.currentTime,.1);}
    if(mid&&this.musicBus){const g=this.musicBus.gain,now=this.ctx.currentTime,L=Sound.MUSIC_LEVEL.battle;g.cancelScheduledValues(now);g.setTargetAtTime(L*Sound.SURGE,now+.1,.25);g.setTargetAtTime(L,now+4,1.5);}
    else if(this.musicBus){const g=this.musicBus.gain,now=this.ctx.currentTime;g.cancelScheduledValues(now);g.setTargetAtTime(Sound.MUSIC_LEVEL[scene]||.2,now,.2);}this.schedule();}
  // A Wonder speeds the music up a little (1.08, battle asks) and a comeback star a little more (1.15) while it shines; a new scene brings it back to 1.
  setMusicRate(r=1){this.baseRate=Math.max(.5,Math.min(2,+r||1));this.applyRate();}
  applyRate(){this.rate=this.starRate?Math.max(this.baseRate,Sound.STAR_RATE):this.baseRate;for(const t of Object.values(this.music||{}))for(const el of t.els)try{el.playbackRate=this.rate;}catch{}}
  stopMusic(){if(!this.music)return;for(const t of Object.values(this.music)){t.g.gain.setTargetAtTime(0,this.ctx.currentTime,.12);}}
  pause(){this.stopMusic();this.paused=true;}
  resume(){this.paused=false;this.schedule();}
  schedule(){if(!this.ctx||!this.music)return;const now=this.ctx.currentTime,want=this.enabled&&!this.paused?this.track():null;
    for(const [id,t] of Object.entries(this.music)){const el=t.els[t.cur];if(id===want){if(el.paused&&t.primed){el.playbackRate=this.rate;el.play().catch(()=>{});}t.g.gain.setTargetAtTime(Sound.MUSIC_TRIM[id]??1,now,.5);this.seam(t,now);}else{t.g.gain.setTargetAtTime(0,now,.2);if(t.g.gain.value<.02)for(const e of t.els)if(!e.paused)e.pause();}}
  }
  seam(t,now){const el=t.els[t.cur],d=el.duration-(t.tail||0);if(el.paused||!(d>Sound.XFADE*3)||now<t.swap)return;const left=(d-el.currentTime)/(el.playbackRate||1);if(left>Sound.XFADE+.45||left<.15)return;
    const fade=Math.max(.3,Math.min(Sound.XFADE,left-.05)),nx=t.els[1-t.cur],curves=[new Float32Array(32),new Float32Array(32)];for(let i=0;i<32;i++){curves[0][i]=Math.cos(i/31*Math.PI/2);curves[1][i]=Math.sin(i/31*Math.PI/2);}
    try{nx.currentTime=0;}catch{}nx.playbackRate=this.rate;nx.play().catch(()=>{});
    [t.hs[t.cur].gain,t.hs[1-t.cur].gain].forEach((p,i)=>{p.cancelScheduledValues(now);try{p.setValueCurveAtTime(curves[i],now,fade);}catch{p.setValueAtTime(curves[i][0],now);p.linearRampToValueAtTime(curves[i][31],now+fade);}});
    t.cur=1-t.cur;t.swap=now+fade+.5;setTimeout(()=>{if(t.els[t.cur]!==el)el.pause();},(fade+.3)*1000);}
  tone(freq,duration=.12,type='sine',volume=.12,slide=0,delay=0){if(!this.ctx||!this.enabled||this.paused)return;const now=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),now+duration);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration);}
  // At most VOICE_CAP effects sound together. A new one replaces the weakest (the oldest among equals); the local side's sounds weigh more.
  room(prio){const now=this.ctx.currentTime;this.voices=this.voices.filter(v=>v.end>now);if(this.voices.length<Sound.VOICE_CAP)return true;let low=null;for(const v of this.voices)if(!low||v.prio<low.prio||v.prio===low.prio&&v.start<low.start)low=v;if(low.prio>prio)return false;
    this.voices.splice(this.voices.indexOf(low),1);const g=low.g.gain;g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(0,now+.025);return true;}
  // One effect voice: a decoded file when it is listed and loaded, else its procedural recipe. Returns its length in seconds (0 when silent).
  fx(name,{delay=0,p=1,v=1,x=null,prio=3,cap=true,sample=null,...o}={}){if(!this.live())return 0;const ctx=this.ctx,t=this.time()+delay,key=sample||SAMPLE_OF[name]||name,buf=this.clips?.[key],recipe=SFX[name];if(!buf&&!recipe)return 0;if(cap&&!this.room(prio))return 0;
    const g=ctx.createGain(),send=ctx.createGain(),panned=x!=null&&!!ctx.createStereoPanner,level=v*(buf?Sound.SAMPLE_TRIM[key]??1:TRIM[name]??1)*(panned?1.41:1);g.gain.value=level;send.gain.value=buf?Math.min(.12,ROOM[name]??.12):ROOM[name]??.12;g.connect(panned?this.kit.pan(this.sfx,Math.max(-1,Math.min(1,(x-640)/640))*.4):this.sfx);g.connect(send);send.connect(this.verb);
    let d;if(buf){const s=ctx.createBufferSource(),cut=Sound.SAMPLE_CUT[key];s.buffer=buf;s.playbackRate.value=p;s.connect(g);d=buf.duration/p;s.start(t);
      if(cut&&cut<d){g.gain.setValueAtTime(level,t+cut-.12);g.gain.linearRampToValueAtTime(0,t+cut);s.stop(t+cut+.02);d=cut;}}else d=recipe(this.kit,t,{...o,p,out:g});
    this.lastG=g;if(cap)this.voices.push({g,start:t,end:t+d,prio});return d;}
  // A sting: the recorded file when listed (or its alternative), else the synthesized one, over ducked music.
  // A new sting while an older one still sounds (a Power Form and a Wonder a moment apart): the older one fades out, so two never stack.
  sting(name,{delay=0,alt=null,v=1}={}){if(!this.live())return 0;const use=this.clips?.[name]?name:alt&&this.clips?.[alt]?alt:null,t=this.time()+delay;
    this.stingsLive=(this.stingsLive||[]).filter(o=>o.end>this.ctx.currentTime);for(const o of this.stingsLive)if(!o.out){o.out=true;const p=o.g.gain;p.cancelScheduledValues(t);p.setTargetAtTime(0,t,.12);}
    const d=this.fx(name,{delay,v,cap:false,sample:use});if(!d)return 0;this.duck(t,d,.25);
    const o={g:this.lastG,lvl:this.lastG.gain.value,start:t,end:t+d};this.stingsLive.push(o);const free=this.voiceFree();if(free>t)this.underVoice(o,t,free);return d;}
  underVoice(o,from,to){const p=o.g.gain;p.cancelScheduledValues(from);p.setValueAtTime(o.lvl*Sound.STING_UNDER,from);p.setTargetAtTime(o.lvl,to+.05,.3);}
  // A shot: its creature's family and pitch. The deer's antler shots keep the deer's voice; inside the bubbles Wonder every shot also blubs.
  shot(e){const t=this.time(),me=e.side===this.local,hum=this.human(e.side);if(t-(this.lastShots[e.side]??-9)<(me||this.versus?.07:.2))return;this.lastShots[e.side]=t;
    const [fam0,pitch]=VOICES[e.kind]||VOICES[this.kinds[e.side]]||['stone',1],fam=e.fam||fam0,prio=1+(me?10:0),v=me?1:hum?.8:.5;
    if(this.wonder==='bubbles'){this.fx('bubble-shot',{prio,p:pitch*jitter(.06),v});this.fx('sfx-shot-'+fam,{prio,p:pitch,v:v*.35});return;}
    this.fx('sfx-shot-'+fam,{prio,p:pitch*jitter(.03),v});}
  // Hits in a row by the same attacker climb in pitch (n=0..7). The count runs even while muted, so the picture stays in step with it.
  hit(e){const by=e.by??(e.side===1?0:1),now=this.now(),s=this.streak[by],n=s&&now-s.t<=Sound.STREAK?Math.min(7,s.n+1):0;this.streak[by]={n,t:now};
    if(this.live()){const t=this.time(),amt=e.amount||0,tier=amt<12?0:amt<25?1:2,last=this.lastHit[e.side],local=e.side===this.local||by===this.local;
      if(!(last&&t-last.t<.045&&tier<=last.tier)){this.lastHit[e.side]={t,tier};const fam=e.fam||VOICES[this.kinds[by]]?.[0]||'stone';
        // A recorded family hit (when listed) only for the big ones, so a 40-second fight never tires the ear; the streak still climbs.
        const rec=(tier>1||e.special)&&this.clips?.[HIT_FILE[fam]]?HIT_FILE[fam]:null,ouch=e.side===this.local&&by!==e.side;
        this.fx('sfx-hit-'+(tier+1),{p:2**(n/12)*jitter(.04)*(rec&&ouch?.89:1),v:jitter(.1)*(local?1:.75)*(e.special?1.15:1),x:e.x,prio:3+tier+(e.special?2:0)+(local?10:0),fam,tier,special:!!e.special,ouch,sample:rec});}
      // A chain of six is a little fanfare, but only for a child's own creature.
      if(n===5&&by>=0&&this.human(by))this.fx('sfx-chain',{delay:.03,x:e.x,cap:false});}
    return n;}
  effect(e){const T=e.type;if(T==='hit')return this.hit(e);
    // The super, the Power Form and the final blow are voiced by superMoment, rivalSwell, formBurst and finalBlow, which battle calls.
    if(T==='special'||T==='form'){if(e.side!=null){this.kinds[e.side]=e.kind;this.fams[e.side]=e.fam||VOICES[e.kind]?.[0];}return;}
    // What the sound keeps track of, even while muted: the Wonder in play, a comeback star's faster music, a race's computer friend.
    if(T==='wonder-start')this.wonder=e.id;else if(T==='wonder-end')this.wonder=null;
    if(T==='comeback'&&this.mine(e.side)){this.starSide=e.side;this.starRate=true;this.applyRate();}
    if(this.starRate&&(T==='comeback-end'&&e.side===this.starSide||T==='final-blow'||T==='finish')){this.starRate=false;this.applyRate();}
    if(T==='gate-ready'||T==='gate-open'||T==='race-rival'||T==='bridge-super'||T==='wisp')this.allied=true;
    if(T==='final-blow'||!this.live())return;
    if(T==='shoot'){if(VOICES[e.kind])this.kinds[e.side]=e.kind;this.shot(e);return;}
    const me=e.side===this.local,hum=e.side!=null&&this.human(e.side),x=e.x,fx=(name,o={})=>this.fx(name,{x,prio:me?14:6,...o}),mine=this.mine(e.side),now=this.time(),gap=(k,s)=>{if(now-(this.last[k]??-9)<s)return false;this.last[k]=now;return true;};
    if(T==='near-miss'){if(me||hum)fx('sfx-near-miss',{prio:me?17:7});return;}
    if(T==='cover'){if(e.broken)fx('sfx-cover-crack',{prio:8});else if(gap('chip',.09))fx('chip',{prio:2,v:.8});return;}
    if(T==='super-ready'){if(hum)fx('sfx-ready',{prio:me?18:9});return;}
    if(T==='pip'){fx('pip',{f:midi(e.pips>=2?91:88)/(hum?1:2),v:hum?1:.5});return;}
    if(T==='form-ready'){fx('form-ready',{v:hum?1:.45,prio:me?18:9});return;}
    if(T==='form-end'){fx('form-end',{v:hum?1:.6});return;}
    if(T==='star-lend'){fx('star-lend',{cap:false});return;}
    if(T==='wonder-sprout'){fx('sfx-seed-sprout',{cap:false});return;}
    if(T==='wonder-ready'){fx('wonder-ready',{cap:false});return;}
    if(T==='wonder-start'){this.sting('sting-wonder',{alt:'sfx-wonder-start'});if(WONDER_SIG[e.id])fx(WONDER_SIG[e.id],{delay:.45,cap:false,x:null});return;}
    if(T==='wonder-end'){fx('wonder-end',{cap:false});return;}
    if(T==='meteor'){if(gap('meteor',.15))fx('meteor',{prio:7});return;}
    // Two phones: each phone cheers only its own child's win (the battle sets this.online). A mission won gets its own fanfare and the crowd.
    if(T==='finish'){const w=e.winner;if(w==null)return;const win=w>=0&&(this.online?w===this.local:this.human(w));if(e.reason==='knockout'&&win)this.sting('sting-victory',{alt:'sfx-victory-sting'});
      else if(win&&(e.reason==='gates'||e.reason==='hill'))this.sting('mode-finish');else fx(w<0?'finish-draw':win?'finish-win':'finish-lose',{cap:false});return;}
    if(T==='go'){fx('go',{prio:20});return;}
    if(T==='tell'){fx('tell',{kind:e.kind,prio:9});return;}
    if(T==='silenced'){if(me||hum)fx('silenced',{prio:9});return;}
    if(T==='goal'){fx('goal',{me:me||!!this.versus,cap:false});return;}
    if(T==='echo-note'){fx('echo-note',{f:[523,587,659,784,880][e.stone]||660,cap:false});return;}
    if(T==='echo-step'){fx('echo-step',{f:([523,587,659,784,880][e.stone]||660)/(me||this.versus?1:2),me:me||!!this.versus});return;}
    if(T==='echo-miss'){if(me)fx('echo-miss');return;}
    if(T==='echo-song'){fx('echo-song',{me:me||!!this.versus,cap:false});return;}
    if(T==='feather'){fx('feather',{me:me||!!this.versus});return;}
    if(T==='heal'||T==='pickup-ready'){fx('heal');return;}
    if(T==='kick'){fx('kick',{big:e.big});return;}
    // Wave 2: copy stars. A star pops out for its owner; catching it sparkles; the borrowed super adds a two-tone.
    if(T==='copy-drop'){const m=this.mine(e.owner);fx('copy-drop',{prio:m?12:4,v:m?1:.5});return;}
    if(T==='copy'){if(mine){fx('sfx-spark',{cap:false});fx('shimmer',{delay:.08,cap:false,x:null});}else fx('sfx-spark',{prio:4,v:.35});return;}
    if(T==='copy-used'){fx('copy-used',{delay:.05,prio:mine?15:5,v:mine?1:.5});return;}
    // The comeback star whistles down for the child it is for; catching it is a power-up; a bump boings; when it fades the music settles.
    if(T==='comeback-fall'){if(mine)fx('comeback-fall',{cap:false});return;}
    if(T==='comeback'){if(mine){fx('sfx-spark',{cap:false});fx('comeback',{delay:.05,cap:false,x:null});}return;}
    if(T==='comeback-bump'){fx('comeback-bump',{prio:12});return;}
    if(T==='comeback-end'){if(mine)fx('comeback-end',{cap:false});return;}
    if(T==='card'){fx('card',{cap:false,x:null});return;}
    if(T==='decoy-end'){fx('puff',{prio:5,v:.7});return;}
    // The new Wonders: tiny pickups (never a flood), a heal, a swap.
    if(T==='wonder-firefly'){if(gap('firefly',.1))fx('wonder-firefly',{i:this.flies++,prio:mine?12:4,v:mine?1:.5});return;}
    if(T==='wonder-kernel'){if(gap('kernel',.06))fx('wonder-kernel',{p:jitter(.15),prio:mine?11:3,v:mine?1:.5});return;}
    if(T==='wonder-shroom'){fx('wonder-shroom',{prio:mine?13:5,v:mine?1:.55});return;}
    if(T==='wonder-swap'){fx('wonder-swap',{cap:false,x:null});return;}
    // Beats: the Rhythm Deer's drum on the sim's own beat (strong beats louder), and the dance floor very softly.
    if(T==='beat'){if(e.src==='dance')fx('beat-dance',{strong:!!e.strong,prio:2,x:null});else fx('beat-rhythm',{strong:!!e.strong,prio:e.strong?9:4,x:null});return;}
    // The Land of Two Tracks.
    if(T==='hill-warn'){fx('hill-warn',{cap:false});return;}
    if(T==='hill-move'){fx('hill-move',{cap:false});return;}
    if(T==='hill-take'){if((mine||!this.online)&&gap('hill-take',.8))fx('hill-take',{me:mine,prio:8,v:mine?1:.6,x:null});return;}
    if(T==='gate-ready'){fx('gate-ready',{prio:mine?12:6,v:mine?1:.55});return;}
    if(T==='gate-open'){fx('gate-open',{cap:false});return;}
    if(T==='race-rival'){fx('race-rival',{prio:8,x:null});return;}
    if(T==='wisp'){if(mine)fx('wisp',{prio:12});return;}
    if(T==='bridge-super'){fx('bridge-super',{cap:false,x:null});this.duck(now,1,.3);return;}
    if(T==='stomp'){if(gap('stomp',.08))fx('stomp',{prio:9});return;}
    if(T==='phase-beat'){fx('phase-beat',{cap:false,x:null});return;}
    if(Sound.SIMPLE.includes(T))fx(T,{prio:T.startsWith('boss')||T==='quake'?9:me?14:6});
  }
  static SIMPLE=['ko','respawn','quake','blast','boss-windup','boss-charge','boss-open','boss-guard','collapse','echo-turn','echo-again','lava-warning','light-block','pull','ball-pick','ball-loose','ball-hit','overtime','swap','ember','hold-start','bells','phase2','reveal','buddy-hint'];
  // Battle calls these at the big moments.
  superMoment(side,{full=true,mega=false}={}){if(!this.live())return;const kind=this.kinds[side];this.fx('sfx-super-whoosh',{cap:false,fam:this.fams[side]||VOICES[kind]?.[0]||'stone',p:VOICES[kind]?.[1]||1,full,mega,v:full?1:.8});if(full)this.duck(this.time(),.5,.25);}
  rivalSwell(side){if(!this.live())return;this.fx('sfx-rival-swell',{cap:false,v:side===this.local?.6:1});}
  formBurst(side,{sting=true}={}){if(!this.live())return;const kind=this.kinds[side];this.fx('sfx-form-burst',{cap:false,fam:this.fams[side]||VOICES[kind]?.[0]||'light',p:VOICES[kind]?.[1]||1,v:sting?1:.7});if(sting)this.sting('sting-form',{delay:.3});}
  // The last hit: the music drops away in 50 ms and stays down until the next scene; a heartbeat follows.
  finalBlow(){if(!this.ctx)return;const g=this.dropG.gain,now=this.ctx.currentTime;g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(0,now+.05);this.dropped=true;this.fx('sfx-heartbeat',{delay:.1,cap:false});}
  confetti(){this.fx('sfx-confetti',{cap:false});this.cheer({delay:.12});}
  // A short crowd cheer under a child's win: only while no voice speaks, and it gives way when one starts.
  // One crowd at a time: a cheer asked for while one still sounds is not doubled (a won race or hill finishes with confetti too).
  cheer({delay=0}={}){if(!this.live()||!this.clips?.['sfx-cheer']||this.voiceBusy())return 0;const now=this.time();this.cheers=(this.cheers||[]).filter(c=>c.end>now);if(this.cheers.length)return 0;
    const d=this.fx('sfx-cheer',{delay,cap:false});if(d){this.cheering={g:this.lastG,end:now+delay+d};this.cheers.push(this.cheering);}return d;}
  // The shadow peels off: three rising pentatonic waves (C D E G A), then a soft bloom when the colours return.
  liberationTicks({count=24,gap=.05,delay=0}={}){if(!this.live())return;const t=this.time();for(let i=0;i<count;i+=6)this.kit.later(t+delay+i*gap,()=>{for(let j=i;j<Math.min(count,i+6);j++)this.fx('pluck',{cap:false,delay:t+delay+j*gap-this.time(),f:penta(j%8+2*Math.floor(j/8),72),level:.55+.45*j/Math.max(1,count-1)});});
    this.kit.later(t+delay+count*gap,()=>this.fx('bloom',{cap:false,delay:t+delay+count*gap+.05-this.time()}));}
  loseBounce({delay=0}={}){this.fx('lose-bounce',{cap:false,delay});}
  stamp(){this.fx('sfx-stamp',{cap:false});}
  starNote(i){this.fx('star',{cap:false,f:midi([72,76,79][Math.max(0,Math.min(2,i|0))])});}
  // A spark flying into the box meter: the recorded sparkle, a step higher each time (pentatonic, one octave at most).
  sparkPluck(i){const n=Math.max(0,Math.min(5,i|0));if(this.clips?.['sfx-spark'])this.fx('sfx-spark',{cap:false,p:.8*2**([0,2,4,7,9,12][n]/12),v:.6});else this.fx('pluck',{cap:false,f:penta(Math.min((i|0)+3,12),72)});}
  uiClick(kind='tap'){this.fx(SFX['ui-'+kind]?'ui-'+kind:'ui-tap',{cap:false});}
  // The wardrobe: a hat goes on with a spring, comes off with a pop.
  hat(on=true){this.uiClick(on?'hat':'hat-off');}
  // A new mix in the reveal dialog.
  mixFanfare(){return this.sting('mix-fanfare');}
  // A comeback card turning over in the picker.
  cardFlip(){return this.fx('card',{cap:false});}
  // The spectacle guardian's entrance (battle calls it as the countdown starts): ink drips, then the roar as it rises out of the ink.
  roar({delay=0}={}){this.arm('boss');if(!this.live())return 0;for(let i=0;i<4&&.1+i*.28<delay-.15;i++)this.fx('ink-drip',{cap:false,delay:.1+i*.28+Math.random()*.06,p:1.15-.1*i});const d=this.fx('roar',{cap:false,delay});if(d)this.duck(this.time()+delay,d,.3);return delay+d;}
  // The tracks-bridge scene keeps time with a taiko tick (strong = the accent); the music steps back while it ticks.
  beatTick(strong=false){if(!this.live())return 0;this.duck(this.time(),.8,.4);return this.fx('beat-tick',{strong:!!strong,cap:false});}
  // A point on the armour hill (battle calls it when a side's whole points go up): the child's ticks climb, the rival's stay low and soft.
  hillPoint(side,n=0){if(!this.live())return 0;const me=this.mine(side);if(this.online&&!me)return 0;return this.fx('hill-point',{me,n:n|0,prio:me?7:3,v:me?1:.5});}
  reveal(joined=false){if(this.clips?.['sfx-card-flip'])this.play('sfx-card-flip');else [523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.6,'triangle',.13,0,i*.08));
    if(joined){this.play('sfx-join-fanfare',{delay:.5,volume:.8});this.play('voice-new-creature',{delay:1.3});}else this.play('voice-new-card',{delay:.9});}
  // Spoken guide lines load on first use; a line without a recording stays silent and is never asked for again.
  // A new line replaces the line before it; a short clip still speaking finishes first, a long one gives way.
  async line(name){if(!this.ctx||!this.enabled||!name)return;this.wantedLine=name;this.lines??={};this.hushLines();if(this.missing.has(name))return;
    try{if(!this.lines[name]){this.lineLoads??={};const load=this.lineLoads[name]??=fetch('./art/gen/'+name+'.mp3').then(res=>{if(!res.ok){this.missing.add(name);return null;}return res.arrayBuffer().then(b=>this.ctx.decodeAudioData(b)).catch(()=>{this.missing.add(name);return null;});}).finally(()=>{delete this.lineLoads[name];});
        const buffer=await load;if(!buffer)return;this.lines[name]=buffer;}
      if(this.wantedLine!==name)return;this.hushLines();
      let at=this.ctx.currentTime;const free=this.voiceFree();if(free>at+.02){if(free-at<=Sound.LINE_WAIT)at=free+.08;else{for(const v of this.spoken)this.hush(v);at+=.09;}}
      this.lineSource=this.voiceAt(this.lines[name],at,1,'line').s;}catch{/* silent */}}
  hushLines(){for(const v of this.spoken)if(v.kind==='line')this.hush(v);}
  // A battle starting ends the Little Shadow's line (a short fade), and a line still loading never starts: the countdown is heard.
  // The music and the effects come back up at once instead of waiting for where the line would have ended.
  endLines(){this.wantedLine=null;if(!this.ctx)return;const now=this.ctx.currentTime,cut=this.spoken.some(v=>v.kind==='line'&&!v.cut&&v.end>now);this.hushLines();if(!cut)return;
    const rest=this.spoken.reduce((t,v)=>v.cut||v.end<=now?t:Math.max(t,v.end),now);
    for(const p of [this.duckG?.gain,this.sfx?.gain])if(p){p.cancelScheduledValues(now);p.setValueAtTime(p.value,now);p.setTargetAtTime(1,rest+.1,.3);}if(this.duckG)this.duckUntil=rest;}
  click(){this.uiClick('tap');}
}
