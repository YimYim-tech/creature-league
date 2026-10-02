export class Sound {
  constructor(){this.enabled=true;this.sources=[];this.buffers={};this.scene='lobby';this.next=0;this.loading=null;}
  async unlock(){
    if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.55;this.master.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.musicBus.gain.value=Sound.MUSIC_LEVEL[this.scene]||.2;this.musicBus.connect(this.master);this.loading=this.load();this.timer=setInterval(()=>this.schedule(),300);}
    if(this.enabled)await this.ctx.resume().catch(()=>{});
  }
  // Short generated clips: card flip, fanfare and the Hebrew announcer.
  // Music sits under speech and effects: battle music is quieter so the action stays clear.
  static MUSIC_LEVEL={lobby:.22,battle:.15};
  static DUCK=.3;
  static CLIPS=['sfx-card-flip','sfx-join-fanfare','voice-wild-battle','voice-victory','voice-new-creature','voice-new-card'];
  play(name,{delay=0,volume=.9}={}){if(!this.ctx||!this.enabled||!this.clips?.[name])return;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.clips[name];gain.gain.value=volume;source.connect(gain);gain.connect(this.master);const at=this.ctx.currentTime+delay;source.start(at);if(name.startsWith('voice-'))this.duck(at,source.buffer.duration);}
  // While someone speaks the music drops, then comes back.
  duck(at,duration){if(!this.musicBus)return;const g=this.musicBus.gain,level=Sound.MUSIC_LEVEL[this.scene]||.2,end=at+duration;g.cancelScheduledValues(at);g.setTargetAtTime(level*Sound.DUCK,at,.08);g.setTargetAtTime(level,end+.1,.35);this.duckUntil=Math.max(this.duckUntil||0,end);}
  async load(){this.clips={};await Promise.all(Sound.CLIPS.map(async name=>{try{const r=await fetch('./art/gen/'+name+'.mp3');this.clips[name]=await this.ctx.decodeAudioData(await r.arrayBuffer());}catch{/* A missing clip is silent. */}}));
    for(const id of ['lobby','battle'])try{const r=await fetch('./art/gen/'+({lobby:'music-map',battle:'music-battle'})[id]+'.mp3');this.buffers[id]=await this.ctx.decodeAudioData(await r.arrayBuffer());}catch{/* Sound never blocks a playable game. */}this.schedule();}
  setEnabled(value){this.enabled=value;if(this.ctx){this.master.gain.setTargetAtTime(value?.55:0,this.ctx.currentTime,.05);if(value)this.ctx.resume().catch(()=>{});}this.schedule();}
  setScene(scene){if(scene===this.scene)return;this.scene=scene;this.stopMusic();if(this.musicBus&&!(this.duckUntil>this.ctx.currentTime))this.musicBus.gain.setTargetAtTime(Sound.MUSIC_LEVEL[scene]||.2,this.ctx.currentTime,.2);this.schedule();}
  stopMusic(){if(!this.ctx)return;for(const s of this.sources){try{s.gain.gain.cancelScheduledValues(this.ctx.currentTime);s.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.15);s.source.stop(this.ctx.currentTime+.6);}catch{}}this.sources=[];this.next=0;}
  pause(){this.stopMusic();this.paused=true;}
  resume(){this.paused=false;this.schedule();}
  schedule(){if(!this.ctx||!this.enabled||this.paused)return;const buffer=this.buffers[this.scene];if(!buffer)return;const now=this.ctx.currentTime;if(this.next>now+1)return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(this.musicBus);const start=Math.max(now,this.next),duration=buffer.duration;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(1,start+1);gain.gain.setValueAtTime(1,start+duration-1);gain.gain.linearRampToValueAtTime(0,start+duration);source.start(start);source.stop(start+duration);this.sources.push({source,gain});source.onended=()=>this.sources=this.sources.filter(s=>s.source!==source);this.next=start+duration-1;
  }
  tone(freq,duration=.12,type='sine',volume=.12,slide=0,delay=0){if(!this.ctx||!this.enabled||this.paused)return;const now=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),now+duration);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration);}
  effect(event){if(event.type==='shoot'){const t=this.ctx?.currentTime||0;if(event.side===1?Math.random()>.2:t-(this.lastShot||0)<.22)return;if(event.side===0)this.lastShot=t;const voice={havzuk:[560,'sine'],maimi:[340,'sine'],slauz:[95,'triangle'],lohatan:[150,'sawtooth'],tehomon:[220,'sine'],zikuk:[880,'square'],retetoz:[260,'triangle'],tzlilon:[720,'sine'],shorshu:[300,'triangle'],galgalor:[640,'triangle']}[event.kind]||[340,'sine'];this.tone(voice[0],.1,voice[1],voice[1]==='square'||voice[1]==='sawtooth'?.022:.04,-90);}
    if(event.type==='hit')this.tone(event.side===0?130:210,.13,'triangle',.11,-80);
    if(event.type==='special'){this.tone(180,.35,'sawtooth',.075,580);this.tone(530,.4,'sine',.12,-130,.08);}
    if(event.type==='goal'){[523,659,784,1047].forEach((f,i)=>this.tone(event.side===0?f:f/2,.3,'triangle',.12,0,i*.09));}
    if(event.type==='steal'){this.tone(700,.15,'square',.06,500);}
    if(event.type==='kick'){this.tone(event.big?220:320,.18,'sine',.1,-160);}
    if(event.type==='ball-hit'){this.tone(980,.06,'sine',.05);}
    if(event.type==='swap'){[392,523].forEach((f,i)=>this.tone(f,.2,'triangle',.09,0,i*.1));}
    if(event.type==='feather'){this.tone(event.side===0?880:520,.12,'sine',.07,240);}
    if(event.type==='ember'){this.tone(330,.25,'triangle',.11,330);this.tone(660,.3,'sine',.08,0,.08);}
    if(event.type==='hold-start'){[523,659,784].forEach((f,i)=>this.tone(f,.25,'triangle',.11,0,i*.1));}
    if(event.type==='ko'){this.tone(300,.5,'sawtooth',.08,-220);}
    if(event.type==='blast'){this.tone(90,.45,'sawtooth',.12,-40);this.tone(240,.3,'triangle',.1,-160);}
    if(event.type==='quake'){this.tone(70,.4,'triangle',.2,-30);}
    if(event.type==='dash')this.tone(380,.16,'sine',.06,400);
    if(event.type==='heal'||event.type==='pickup-ready'){this.tone(660,.16,'sine',.08);this.tone(880,.25,'sine',.08,0,.12);}
    if(event.type==='finish'){const notes=event.winner===0?[523,659,784,1047]:[392,349,294];notes.forEach((f,i)=>this.tone(f,.5,'triangle',.15,0,i*.15));}
    if(event.type==='go')this.tone(740,.2,'triangle',.13);
  }
  reveal(joined=false){if(this.clips?.['sfx-card-flip'])this.play('sfx-card-flip');else [523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.6,'triangle',.13,0,i*.08));
    if(joined){this.play('sfx-join-fanfare',{delay:.5,volume:.8});this.play('voice-new-creature',{delay:1.3});}else this.play('voice-new-card',{delay:.9});}
  // Spoken guide lines load on first use; a line without a recording simply stays silent.
  async line(name){if(!this.ctx||!this.enabled||!name)return;this.wantedLine=name;this.lines??={};this.lineSource?.stop?.();
    try{if(!this.lines[name]){const res=await fetch('./art/gen/'+name+'.mp3');if(!res.ok)return;this.lines[name]=await this.ctx.decodeAudioData(await res.arrayBuffer());}
      if(this.wantedLine!==name)return;this.lineSource?.stop?.();
      const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=this.lines[name];g.gain.value=1;s.connect(g);g.connect(this.master);s.start();this.lineSource=s;this.duck(this.ctx.currentTime,s.buffer.duration);}catch{/* silent */}}
  click(){this.tone(610,.055,'sine',.06,150);}
}
