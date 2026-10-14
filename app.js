import {CREATURES,LEVELS,CUP,CHALLENGE,challengeUnlocked,journeyView,makeChallengeMatch,makeMatch,step,readProfile,saveProfile,recordResult,resultStats,clamp,startCup,needsUpgrade,chooseUpgrade,STARTERS,WILD,RARITY,SKINS,isUnlocked,releasedCount,wildLevel,makeWildMatch,skinById,skinUnlocked,skinOf,chooseSkin,flipCard,cardStats,finish} from './core.js';
import {upgradeOptions,cleanUpgrades} from './upgrades.js';
import {MODES,WIND_TARGET,WIND_HOLD,MAX_POWER,BALL_GOALS,trioLeft,GOALS} from './core.js';
import {SPARKS_PER_BOX,BOX_TIERS,FRAMES,boxTier,boxesWaiting,roadAhead,addSparks,openBox,chooseBoxPrize} from './core.js';
import {GOAL_SPARKS,dayKey,refreshDaily,progressDaily} from './core.js';
import {COOP_GIANTS,COOP_LEVELS} from './core.js';
import {PROTOCOL,SNAPSHOT_EVERY,INPUT_HZ,CODE_CREATURES,randomCode,codeFromText,snapshot,applySnapshot,coast,packInput,unpackInput} from './net.js';
import {openHost,openGuest} from './link.js';
import * as sim from './core.js';
import * as gfx from './art.js';
import {BLESSINGS,TOWER_GUARD_EVERY,TOWER_PICK_EVERY,towerFloor,towerStats,startTowerRun,makeTowerMatch,recordTower,chooseTowerPick,endTowerRun} from './core.js';
import {creatureLevel,levelProgress,levelBoost,MAX_LEVEL,LEVEL_BONUS,RANKS,PRIZE_EVERY,LEAGUE_SAFE,rankOf,nextRank,leagueLevel,nextPrizeAt,makeLeagueMatch,recordLeague} from './core.js';
import {WORLDS,CHAPTER2_START,inChapter2,bridgePieces,completeBridge,chapterOf,chapterSteps,chapterStars,worldReady} from './story.js';
import {trioTeam,missionEased,missionLevel,ISLANDS,STEPS,STORY_CARDS,STORY_CARD_IDS,currentStep,storyComplete,litIslands,starLit,islandOf,homeIsland,makeStoryMatch,recordStory,completeCastle,storyCardOwned,BATTLE_STEPS,starsOf,totalStars,islandStars,canReplay,friendlyStep,stepIndex} from './story.js';
import * as rules from './core.js';
import {RITUAL_HOLD,sessionAfterBattle,sessionRested,campfireReady,sparkWord,sparkTotal,sparkSteps,formCard,formBars,formDots,wonderPage,mostPlayed,historyLabel,arenaPicture,holdStep,pressWakes,byGender} from './meta.js';
import {loadArt,createPuppet,drawPortrait,Renderer} from './art.js';
import {Sound} from './audio.js';
const $=id=>document.getElementById(id);
if('scrollRestoration' in history)history.scrollRestoration='manual';
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const storagePrefix=new URLSearchParams(location.search).has('verify')?'creature-league-check.':'';
// Players on this device: each child has a name, a face and a separate save. Nothing leaves the device and there are no accounts.
// The first player keeps the original save, so a child who played before keeps everything.
const PLAYERS_KEY='creature-league.players',MAX_PLAYERS=6,FACES=Object.keys(CREATURES).filter(id=>!CREATURES[id].star);
const playerStorage=id=>{const suffix=id==='p1'?'':'.'+id;return {getItem:key=>localStorage.getItem(storagePrefix+key+suffix),setItem:(key,value)=>localStorage.setItem(storagePrefix+key+suffix,value)};};
function readPlayers(){
  try{const d=JSON.parse(localStorage.getItem(storagePrefix+PLAYERS_KEY)),list=Array.isArray(d?.players)?d.players.filter(p=>p&&/^p\d{1,3}$/.test(p.id)).map(p=>({id:p.id,name:String(p.name||'').trim().slice(0,12),face:CREATURES[p.face]?p.face:null})):[];
    if(list.length)return {players:list,active:list.some(p=>p.id===d.active)?d.active:list[0].id};}catch{}
  return {players:[{id:'p1',name:'',face:null}],active:'p1'};
}
let players=readPlayers(),storage=playerStorage(players.active);
let profile=readProfile(storage),art,renderer,screen='lobby',match=null,mode='quick',cupFinal=false,previousStatus='playing';
let frameTime=0,clock=0,accumulator=0,lastHUD=0,toastUntil=0,noticeTimer,saveNoticeShown=false;
const sound=new Sound();sound.enabled=profile.sound;
const keys=new Set(),input={pointerFire:false,buttonFire:false,toggleFire:false,aim:null,stickX:0,stickY:0,special:false},input2={stickX:0,stickY:0,special:false};
// Every animated creature picture on screen, keyed by its canvas id.
const portraits=new Map();
function livePortrait(canvasId,id,opts={}){const old=portraits.get(canvasId);portraits.set(canvasId,{id,puppet:old?.id===id?old.puppet:createPuppet(id),opts});}
let replayStep=null,pendingReveal=false,wildTarget=null,cardTarget=null,storyIntro=false,storyEvent=null,castle={phase:'mend',filled:0,taps:0};
// Where each island sits on the painted map, in percent.
const MAP_SPOTS={wind:[17,30],sea:[24,66],fire:[78,70],mirror:[84,30],castle:[50,17]};
// Chapter 2: the mask shard in the middle, and a piece from every world whose bridge is mended.
const MAP2_SPOTS={echo:[19,27],tracks:[22,64],patch:[78,67],distance:[80,27],tower:[50,21]},PIECE_ICON={echo:'ear',tracks:'pair',patch:'patch',distance:'arch'},BRIDGE_NAME={echo:'גשר הקול'};
function bridgeHTML(){const have=bridgePieces(profile);return WORLDS.slice(0,2).map((w,i)=>piece(w,have)).join('')+'<img class="bridge-shard" src="./art/gen/story-mask-shard.png" alt="שבר המסכה">'+WORLDS.slice(2).map(w=>piece(w,have)).join('');}
const piece=(w,have)=>`<span class="gem piece${have.includes(w.id)?' lit':''}" data-piece="${w.id}" style="--g:${w.gem}" title="${w.piece}">${icon(PIECE_ICON[w.id])}</span>`;
const progressHTML=()=>inChapter2(profile)?bridgeHTML():necklaceHTML();
// While some world of chapter 2 still waits for its steps, the end of the built steps is not the end of the journey.
const storyGoesOn=()=>WORLDS.some(w=>!STEPS.some(s=>s.island===w.id&&s.kind==='bridge'));
const journeyEnd=()=>storyGoesOn()?'ההמשך בדרך…':'המסע הושלם!';
function stepTitle(step){if(!step)return journeyEnd();if(step.kind==='castle')return 'מתקנים את הכוכב';if(step.kind==='bridge')return BRIDGE_NAME[step.island]||'הגשר';if(step.kind==='mission')return 'משימה: '+MODES[step.mode].name;
  if(step.kind==='free')return (step.hide?'מחבואים עם ':step.flee?'תופסים את ':'משחררים את ')+CREATURES[step.rival].name;return step.kind==='mirror'?'הבבואה שלך':step.title||'שומר האי';}
function necklaceHTML(){const lit=litIslands(profile);return ISLANDS.map(i=>`<span class="gem${lit.includes(i.id)?' lit':''}" style="--g:${i.gem}" title="האור ${i.gemName}"></span>`).join('')+`<span class="gem star${starLit(profile)?' lit':''}" title="הכוכב הזהוב"></span>`;}
function say(id,line,{who='shadow',voice=null}={}){const g=$(id);if(!g)return;if(voice)sound.line(voice);g.querySelector('.guide-line').textContent=line;g.querySelector('.guide-name').textContent=who==='ron'?'רון':'הצל הקטן';g.querySelector('.guide-face').src=who==='ron'?'./art/gen/story-ron.png':'./art/gen/story-little-shadow.png';g.classList.remove('pop');void g.offsetWidth;g.classList.add('pop');}
function stepLabel(step){if(!step)return journeyEnd();if(step.kind==='castle')return 'הטירה הזהובה · מתקנים את הכוכב';return islandOf(step.island).name+' · '+stepTitle(step);}
function renderHome(){
  const step=currentStep(profile),c=CREATURES[profile.selected]||CREATURES.maimi;
  $('home-name').textContent=c.name;$('home-gems').innerHTML=progressHTML();$('home-gems').classList.toggle('bridge-row',inChapter2(profile));
  $('home-where').textContent=!step?journeyEnd():step.kind==='castle'?'הטירה הזהובה':islandOf(step.island).name+(step.kind==='castle'?'':' · שלב '+(STEPS.filter(s=>s.island===step.island).indexOf(step)+1)+' מתוך '+STEPS.filter(s=>s.island===step.island).length);
  $('home-title').textContent=!step?'קרב ליגה · דרגת '+rankOf(profile.league.trophies).name:stepTitle(step);
  livePortrait('home-portrait',c.id,{skin:skinOf(profile,c.id)});renderBoxStrip();renderLeagueStrip();renderTowerStrip();renderGoalsStrip();
  $('home-name').innerHTML=esc(c.name)+' · רמה '+creatureLevel(profile,c.id)+(formOn(c.id)?`<span class="home-crown" title="צורת־עוצמה">${crownArt()}</span>`:'');
  // A new player sees one road; the cup and training open after the first island.
  $('lobby').classList.toggle('early',profile.story.done<4);
}
// The old story panel stays hidden inside the home stage, so the home fills only what is shown.
function renderStoryPanel(){renderHome();}
let mapChapter=null;
function renderStory(){
  const ch2=inChapter2(profile),ch=mapChapter||(ch2?2:1);$('map-tabs').hidden=!ch2;
  document.querySelectorAll('[data-map-ch]').forEach(b=>{b.setAttribute('aria-pressed',String(+b.dataset.mapCh===ch));b.onclick=()=>{sound.click();mapChapter=+b.dataset.mapCh;renderStory();};});
  $('story-map-img').src=ch===2?'./art/gen/story-map-2.jpg':'./art/gen/story-map.jpg';$('story-eyebrow').textContent=ch===2?'פרק 2 · המפריד במסכה':'מסע השרשרת';
  $('story-title').innerHTML=ch===2?'ארבעה עולמות. <em>גשר אחד חי.</em>':'ארבעה איים. <em>חמישה אורות.</em>';
  if(ch===2){renderStory2();return;}
  const step=currentStep(profile),lit=litIslands(profile);
  $('story-necklace').innerHTML=necklaceHTML();$('story-necklace').classList.remove('bridge-row');$('story-stars').textContent='★ '+chapterStars(profile,1)+'/'+chapterSteps(1).length*3;
  const order=[...ISLANDS.map(i=>i.id),'castle'];
  $('map-spots').innerHTML=order.map(id=>{const steps=STEPS.filter(s=>s.island===id),first=STEPS.indexOf(steps[0]),last=STEPS.indexOf(steps.at(-1)),done=profile.story.done>last,here=profile.story.done>=first&&!done,[x,y]=MAP_SPOTS[id],name=id==='castle'?'הטירה הזהובה':islandOf(id).name;
    const st=islandStars(profile,id),progress=done&&st.max?`<small class="spot-stars">★ ${st.got}/${st.max}</small>`:id==='castle'?'':`<small>${Math.min(steps.length,Math.max(0,profile.story.done-first))} מתוך ${steps.length}</small>`;
    return `<button class="map-spot ${done?'done':here?'here':'locked'}" data-spot="${id}" style="right:${100-x}%;top:${y}%;--g:${id==='castle'?'#e8b931':islandOf(id).gem}"><span class="spot-dot">${done?icon('check'):here?icon('star'):icon('lock')}</span><b>${name}</b>${progress}</button>`;}).join('');
  document.querySelectorAll('[data-spot]').forEach(el=>el.onclick=()=>{sound.click();const id=el.dataset.spot;
    if(el.classList.contains('here'))(BATTLE_STEPS.some(s=>s.island===id&&canReplay(profile,s.id))?openIsland(id):goStory());else if(el.classList.contains('done'))openIsland(id);else say('story-guide','עוד לא. קודם מסיימים את '+stepLabel(step)+'.');});
  const line=storyEvent?.step?.after||(ch2?STEPS[CHAPTER2_START-1].after:!step?STEPS.at(-1).after:profile.story.done===0?'היי, אני הצל הקטן. פעם הייתי הצל הגדול, ועכשיו אני רוצה לתקן. השרשרת שלי מובילה לארבעה איים. בוא נשחרר את היצורים שעדיין בצל!':step.kind==='castle'?'ארבעת האורות דולקים, והכוכב הזהוב מוביל לטירה. אני... קצת מפחד. תבוא איתי?':'הבא בתור: '+stepLabel(step)+'.');
  const holdLine=pendingReveal||$('reveal-dialog').open;
  if(!holdLine)say('story-guide',line,{voice:storyEvent?.step?(chapterOf(storyEvent.step)<=2?'voice-shadow-after-'+storyEvent.step.id:null):ch2?null:!step?'voice-shadow-after-castle':profile.story.done===0?'voice-shadow-hello':step?.kind==='castle'?'voice-shadow-castle-door':null});
  if(!holdLine&&storyEvent?.lit)setTimeout(()=>document.querySelector(`#story-necklace .gem:nth-child(${ISLANDS.findIndex(i=>i.id===storyEvent?.lit)+1})`)?.classList.add('just-lit'),300);
  if(!holdLine)storyEvent=null;
  $('story-go').innerHTML=(!step?'לאלבום הקלפים':step.kind==='castle'?'נכנסים לטירה':ch2?'למפת פרק 2':'לקרב: '+stepLabel(step))+' '+icon('arrow');
  if(ch2)$('story-go').onclick=()=>{sound.click();mapChapter=2;renderStory();};else $('story-go').onclick=()=>{sound.click();goStory();};
}
// Chapter 2's map: four worlds and the mask tower, and the living bridge instead of the necklace.
function renderStory2(){
  const step=currentStep(profile),order=[...WORLDS.map(w=>w.id),'tower'];
  $('story-necklace').innerHTML=bridgeHTML();$('story-necklace').classList.add('bridge-row');$('story-stars').textContent='★ '+chapterStars(profile,2)+'/'+chapterSteps(2).length*3;
  $('map-spots').innerHTML=order.map(id=>{const steps=STEPS.filter(s=>s.island===id),[x,y]=MAP2_SPOTS[id],name=id==='tower'?'מגדל המסכה':islandOf(id).name,gem=id==='tower'?'#c9d3dc':islandOf(id).gem;
    if(!steps.length)return `<button class="map-spot locked soon" data-soon style="right:${100-x}%;top:${y}%;--g:${gem}"><span class="spot-dot">${icon('lock')}</span><b>${name}</b><small>בקרוב</small></button>`;
    const first=STEPS.indexOf(steps[0]),last=STEPS.indexOf(steps.at(-1)),done=worldReady(id)&&profile.story.done>last,here=profile.story.done>=first&&!done,st=islandStars(profile,id);
    const progress=done&&st.max?`<small class="spot-stars">★ ${st.got}/${st.max}</small>`:profile.story.done>last?'<small>ההמשך בדרך</small>':`<small>${Math.min(steps.length,Math.max(0,profile.story.done-first))} מתוך ${steps.length}</small>`;
    return `<button class="map-spot ${done?'done':here?'here':'locked'}" data-spot="${id}" style="right:${100-x}%;top:${y}%;--g:${gem}"><span class="spot-dot">${done?icon('check'):here?icon('star'):icon('lock')}</span><b>${name}</b>${progress}</button>`;}).join('');
  document.querySelectorAll('[data-spot]').forEach(el=>el.onclick=()=>{sound.click();const id=el.dataset.spot;
    if(el.classList.contains('here'))(BATTLE_STEPS.some(s=>s.island===id&&canReplay(profile,s.id))?openIsland(id):step?goStory():openIsland(id));else if(el.classList.contains('done'))openIsland(id);else say('story-guide','עוד לא. קודם מסיימים את '+stepLabel(step)+'.');});
  document.querySelectorAll('[data-soon]').forEach(el=>el.onclick=()=>{sound.click();say('story-guide','העולם הזה עוד מנותק. נגיע אליו אחרי ארץ שני המסלולים.');});
  const first=profile.story.done===CHAPTER2_START&&!storyEvent,holdLine=pendingReveal||$('reveal-dialog').open;
  const line=storyEvent?.step?.after||(first?'שבר המסכה... הסמל עליו מתחיל לזהור! ארבעה גשרים נותקו. אם לא נחבר אותם, הבא עלול להיות שלנו. מתחילים בעמק ההדים. רון!':!step?'זנקור הצטרף אלינו! ההמשך של ארץ שני המסלולים עוד בדרך. בינתיים אפשר לשחק שוב ולאסוף כוכבים.':'הבא בתור: '+stepLabel(step)+'.');
  if(!holdLine){say('story-guide',line,{who:first?'ron':'shadow'});if(storyEvent?.bridge){const id=storyEvent.bridge;setTimeout(()=>document.querySelector(`#story-necklace [data-piece="${id}"]`)?.classList.add('just-lit'),300);}storyEvent=null;}
  $('story-go').innerHTML=(!step?'לאלבום הקלפים':step.kind==='bridge'?'ל'+(BRIDGE_NAME[step.island]||'גשר'):'לקרב: '+stepLabel(step))+' '+icon('arrow');$('story-go').onclick=()=>{sound.click();goStory();};
}
function goStory(){replayStep=null;const step=currentStep(profile);if(!step){showView('cards');return;}if(step.kind==='castle'){castle={phase:'mend',filled:0,taps:0};showView('castle');return;}
  if(step.kind==='bridge'){bridge={phase:'intro',got:0,step};showView('bridge');return;}storyIntro=true;wildTarget=step.rival||null;showView('wild');}
function openIsland(id){
  const isl=islandOf(id),steps=BATTLE_STEPS.filter(s=>s.island===id),st=islandStars(profile,id);
  $('island-title').textContent=isl.name;$('island-stars').textContent='★ '+st.got+' מתוך '+st.max;
  $('island-steps').innerHTML=steps.map(s=>{const n=starsOf(profile,s.id),open=canReplay(profile,s.id),next=currentStep(profile)?.id===s.id;return `<div class="island-step"><div><b>${s.kind==='mission'?MODES[s.mode].name:s.kind==='free'?CREATURES[s.rival].name:s.kind==='mirror'?'הבבואה שלך':s.title}</b><small>${s.kind==='mission'?'משימה':s.kind==='free'?'שחרור מהצל':s.kind==='mirror'?'האומץ שלך':'שומר האי'}</small></div><span class="island-step-stars" aria-label="${n} כוכבים">${stars(n)}</span>${open?`<button class="button ${n<3?'primary':'secondary'}" data-replay="${s.id}">${n<3?'לשלושה כוכבים':'שוב'}</button>`:next?'<button class="button primary" data-next-step>לשלב הבא!</button>':'<span class="island-step-lock">'+icon('lock')+'</span>'}</div>`;}).join('');
  {const cur=currentStep(profile);if(cur&&cur.island===id&&!steps.includes(cur))$('island-steps').insertAdjacentHTML('beforeend',`<div class="island-step"><div><b>${stepLabel(cur)}</b><small>השלב הבא</small></div><span></span><button class="button primary" data-next-step>לשלב הבא!</button></div>`);}
  document.querySelector('[data-next-step]')?.addEventListener('click',()=>{sound.click();$('island-dialog').close();goStory();});
  document.querySelectorAll('[data-replay]').forEach(el=>el.onclick=()=>{sound.click();$('island-dialog').close();replayStep=STEPS[stepIndex(el.dataset.replay)];storyIntro=true;wildTarget=null;showView('wild');});
  if(!$('island-dialog').open)$('island-dialog').showModal();
}
const STAR_POINTS=Array.from({length:5},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/5,b=a+Math.PI/5;return [[Math.cos(a)*100,Math.sin(a)*100],[Math.cos(b)*42,Math.sin(b)*42]];});
function renderCastle(){
  const step=currentStep(profile);if(step?.kind!=='castle'&&castle.phase!=='hatched'){showView('story');return;}
  const pieces=STAR_POINTS.map(([[x,y],[bx,by]],i)=>{const [px,py]=STAR_POINTS[(i+4)%5][1];return `<path class="star-piece${i<castle.filled?' on':''}" style="--g:${ISLANDS[i%4].gem}" d="M0 0 L${px.toFixed(1)} ${py.toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} Z" transform="translate(${i<castle.filled?0:(x*.18).toFixed(1)} ${i<castle.filled?0:(y*.18).toFixed(1)}) rotate(${i<castle.filled?0:(i*9-18)})"/>`;}).join('');
  $('star-svg').innerHTML=pieces;$('castle-stage').classList.toggle('egg-phase',castle.phase!=='mend');$('star-svg').classList.toggle('whole',castle.filled>=5);
  $('castle-gems').innerHTML=[...ISLANDS,{id:'star',gem:'#e8b931',gemName:'הזהוב'}].map((g,i)=>`<button class="gem${i<castle.filled&&castle.phase==='mend'?' spent':' lit'}${g.id==='star'?' star':''}" data-gem="${i}" style="--g:${g.gem}" aria-label="האור ${g.gemName}" ${i!==castle.filled||castle.phase!=='mend'?'disabled':''}></button>`).join('');
  document.querySelectorAll('[data-gem]').forEach(el=>el.onclick=()=>{castle.filled++;sound.tone?.(400+castle.filled*120,.35,'triangle',.12);if(castle.filled>=5){castle.phase='egg';sound.reveal();}renderCastle();});
  $('castle-egg').hidden=castle.phase!=='egg';$('castle-egg').dataset.taps=castle.taps;$('ron-hatched').hidden=castle.phase!=='hatched';
  $('castle-hint').textContent=castle.phase==='mend'?'הקישו על האורות שבשרשרת, אחד אחרי השני, כדי להחזיר את האור לכוכב.':castle.phase==='egg'?'הכוכב שלם! ובתוכו... ביצה. הקישו עליה.':'רון בקע! ושני שומרי הכוכב, זוהרון וכוכבית, התעוררו ומצטרפים אליך!';
  $('castle-title').innerHTML=castle.phase==='hatched'?'רון <em>בקע!</em>':'מתקנים את <em>הכוכב.</em>';
  if(castle.phase==='mend')say('castle-guide',castle.filled===0?STEPS.find(s=>s.kind==='castle')?.intro||'':['האור הירוק חוזר!','עכשיו הכחול!','האדום!','הלבן! עוד אחד...'][castle.filled-1]||'',{voice:castle.filled===0?'voice-shadow-castle':null});
  else if(castle.phase==='egg')say('castle-guide',['הכוכב שלם! מה זה בתוכו?','היא זזה!','עוד קצת!'][Math.min(2,castle.taps)]);
  else say('castle-guide','רון!',{who:'ron'});
  $('castle-next').hidden=castle.phase!=='hatched';$('castle-next').innerHTML='מקבלים את הקלפים '+icon('arrow');
}
function tapEgg(){if(castle.phase!=='egg')return;castle.taps++;sound.tone?.(300+castle.taps*90,.2,'triangle',.12);const egg=$('castle-egg');egg.classList.remove('wobble');void egg.offsetWidth;egg.classList.add('wobble');
  if(castle.taps>=3){castle.phase='hatched';completeCastle(profile);persist();sound.reveal(true);}renderCastle();}
const NOTE_FREQ=[523,659,784];let bridge={phase:'intro',got:0,step:null},bridgeTimers=[];
function playBridgeTune(){bridgeTimers.forEach(clearTimeout);bridgeTimers=[];bridge.phase='listen';bridge.got=0;renderBridge();
  const notes=bridge.step.notes;notes.forEach((n,i)=>bridgeTimers.push(setTimeout(()=>{if(screen!=='bridge')return;sound.tone?.(NOTE_FREQ[n],.55,'triangle',.16);sound.tone?.(NOTE_FREQ[n],.4,'sine',.05,0,.22);const el=document.querySelector(`[data-pad="${n}"]`);el?.classList.remove('sing');void el?.offsetWidth;el?.classList.add('sing');},500+i*820)));
  bridgeTimers.push(setTimeout(()=>{if(screen!=='bridge')return;bridge.phase='play';renderBridge();},500+notes.length*820+200));}
function renderBridge(){
  const step=bridge.step;if(!step){showView('story');return;}
  $('bridge-eyebrow').textContent=islandOf(step.island).name;$('bridge-title').innerHTML=bridge.phase==='done'?'הגשר <em>חזר!</em>':(BRIDGE_NAME[step.island]||'הגשר').replace(/ (\S+)$/,' <em>$1.</em>');
  $('bridge-hint').textContent=bridge.phase==='intro'?'מקשיבים לשלושה צלילים, ואז מקישים אותם באותו הסדר.':bridge.phase==='listen'?'מקשיבים…':bridge.phase==='play'?'עכשיו אתם! הקישו על האבנים לפי הסדר.':'כל הכבוד!';
  // One long arch from cliff to cliff, in three parts that light up one by one.
  $('bridge-arc').innerHTML=[0,1,2].map(i=>{const pts=[];for(let k=0;k<=12;k++){const x=20+(i+k/12)*120,y=104-86*(1-((x-200)/180)**2);pts.push(x.toFixed(1)+' '+y.toFixed(1));}return `<path class="arc-seg${i<bridge.got||bridge.phase==='done'?' on':''}" d="M${pts.join(' L')}"/>`;}).join('');
  $('bridge-pads').innerHTML=[0,1,2].map(n=>`<button class="echo-pad n${n}" data-pad="${n}" aria-label="אבן ${n+1}" ${bridge.phase!=='play'?'disabled':''}>${icon('sound')}</button>`).join('');
  document.querySelectorAll('[data-pad]').forEach(el=>el.onclick=()=>tapPad(+el.dataset.pad));
  $('bridge-play').hidden=bridge.phase!=='intro'&&bridge.phase!=='play';$('bridge-play').innerHTML=(bridge.phase==='intro'?'מקשיבים':'עוד פעם')+' '+icon('sound');
  $('bridge-next').hidden=bridge.phase!=='done';$('bridge-next').innerHTML='ממשיכים '+icon('arrow');
  $('bridge-symbol').innerHTML=bridgeHTML();
  if(bridge.phase==='intro')say('bridge-guide',step.intro);else if(bridge.phase==='done')say('bridge-guide',step.after);
}
function tapPad(n){if(bridge.phase!=='play')return;const want=bridge.step.notes[bridge.got];sound.tone?.(NOTE_FREQ[n],.4,'triangle',.15);
  if(n!==want){sound.tone?.(180,.3,'sawtooth',.06,-60);say('bridge-guide','כמעט! מקשיבים שוב מההתחלה.');bridgeTimers.push(setTimeout(playBridgeTune,900));bridge.phase='listen';renderBridge();return;}
  bridge.got++;if(bridge.got<bridge.step.notes.length){renderBridge();return;}
  // The bridge is back: the world's piece joins the living bridge, and a star box spark for the way.
  const world=completeBridge(profile);addSparks(profile,SPARKS_PER_BOX);persist();bridge.phase='done';storyEvent={step:bridge.step,bridge:world};sound.reveal(true);renderBridge();
  setTimeout(()=>document.querySelector(`#bridge-symbol [data-piece="${world}"]`)?.classList.add('just-lit'),200);notify('קיבלתם תיבת כוכב על הגשר!');}
let selectedUpgrade=null;
const buildChips=(id,ids)=>upgradeOptions(CREATURES[id]).filter(u=>cleanUpgrades(ids).includes(u.id)).map(u=>`<span class="build-chip">${icon(u.icon)}${u.name}</span>`).join('');
const bossAdvice='המגן של סלעוז חוסם ירי מלפנים. זוזו ממסלול ההסתערות ותקפו כשהוא מתאושש.';
const rivalAdvice={slauz:bossAdvice,havzuk:'הבזוק מהיר אבל יש לו פחות חיים. התרחקו מפרץ החשמל ותקפו אחרי ההבזק.',maimi:'הגל של מיימי דוחף ומאט. זנקו הצדה וחזרו לתקוף.',
  windguard:'שומר הרוחות שולח טורנדו. זוזו הצידה מהדרך שלו!',seaguard:'הצב העתיק איטי מאוד. כשהוא מפעיל את טבעת הגאות, חכו שהיא תיעלם ורק אז תירו.',fireguard:'אריה האש שואג אש קדימה. אל תעמדו מולו מקרוב, וזוזו מהרצפה הבוערת.',zoharon:'כשמופיעים עיגולים זהובים על הרצפה, צאו מהם מהר: כוכבים נופלים!',chutal:'חוטל זורקת חוט אור שמושך אליה. כשהחוט עף, זוזו הצידה.',ozenav:'כשזזים, אוזנב נעלם. עמדו רגע בשקט, ראו איפה הוא, ואז ירו לשם.',rishrush:'כשהפעמונים מצלצלים ומאירים, עוד רגע יוצא עיגול צלילים. התרחקו, או התקרבו ממש אליו.',kashevet:'כשהאבן על החזה מאירה, צאו מהעיגול: גל השקט לא נותן לירות. בחצי החיים היא עפה ונוצות נופלות: זוזו מהעיגולים.',zankor:'זנקור בורח מהר. אל תרדפו אחריו: חכו שייעצר בקצה, ואז ירו.',hedanon:'כשמופיעות טבעות סגולות על הרצפה, צאו מהן: ההד פוגע פעמיים.',tlaor:'טלאור מתקן אבנים ואת עצמו. תקפו אותו מהר, לפני שהוא תופר הכל.',kokhavit:'כשהמגן שלה מאיר, הפגיעות הראשונות נבלעות. תירו כמה יריות קטנות כדי לשבור אותו.',
  lohatan:'לוהטן כבד ואיטי. זוזו הצידה מכדור האש ואל תעמדו על אדמה בוערת.',tehomon:'לתהומון המון חיים. כשמופיעה מערבולת, צאו ממנה מהר, והיא גם בולעת קליעים.',zikuk:'זיקוק יורה קרן ישרה ורחוקה. אל תעמדו מולו בקו ישר, והתקרבו אליו.',
  retetoz:'רטטוז צץ פתאום לידכם. כשהוא נעלם, התכוננו לחמוק.',tzlilon:'צלילון קטן וחלש, אבל ההיפנוט שלו מקפיא. שמרו ממנו מרחק.',shorshu:'כשמופיע עיגול ירוק מתחתיכם, זוזו לפני שהשורשים תופסים!',galgalor:'גלגל אור יורה לכל הכיוונים. רחוק ממנו פחות קליעים פוגעים.'};
const levelName=level=>LEVELS[level].name;
const stars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
const ELEMENT_ART={'קול':'nebula','מהירות':'canyon','רוח':'storm','מים':'water','חשמל':'storm','עוצמה':'canyon','אש':'volcano','אור':'light','רעד':'quake','היפנוט':'nebula','טבע':'forest','אנרגיה':'crystal'};
// A trading card. The art window is a live canvas so skins and idle motion show on the card.
// Its Power Form side keeps the same five bars from the stronger form; what the form adds shows in gold.
function cardBars(c,form){
  if(!form)return cardStats(c).map(s=>`<li><span>${s.label}</span><i><em style="width:${s.pct}%"></em></i><b>${s.value}</b></li>`).join('');
  return formBars(cardStats(c),cardStats(formCard(c,formSpecOf(c)))).map(s=>`<li${s.gain?' class="up"':''}><span>${s.label}</span><i><em style="width:${s.base}%"></em>${s.gain?`<em class="gain" style="width:${s.gain}%"></em>`:''}</i><b>${s.value}</b></li>`).join('');
}
function cardHTML(id,{canvasId,skin='base',big=false,frame=profile.frame,form=false}={}){
  const c=CREATURES[id],r=RARITY[c.rarity]||RARITY['רגיל'],look=skinById(skin);
  return `<article class="tcard rarity-${r.stars} skin-${look.id}${big?' big':''}${frame?' frame-'+frame:''}${form?' form':''}" style="--c:${c.color};--d:${c.dark}" data-el="${ELEMENT_ART[c.element]||'water'}">
    <header><span class="tcard-num">#${c.number}</span>${profile.creatures[id]&&creatureLevel(profile,id)>1?`<span class="tcard-level${creatureLevel(profile,id)>=MAX_LEVEL?' master':''}">רמה ${creatureLevel(profile,id)}</span>`:''}<span class="tcard-el">${icon(c.specialIcon)}${c.element}</span></header>
    <div class="tcard-art"><canvas id="${canvasId}" aria-hidden="true"></canvas>${look.id!=='base'?`<span class="tcard-skin">${look.name}</span>`:''}${form?`<span class="tcard-stamp">${crownArt()}עוצמה</span>`:''}</div>
    <div class="tcard-title"><h3>${c.name}</h3><small>${form?'צורת־עוצמה':c.role}</small></div>
    <div class="tcard-special">${icon(c.specialIcon)}<b>${c.special}</b></div>
    <ul class="tcard-bars">${cardBars(c,form)}</ul>
    <footer><span class="tcard-stars" aria-label="${c.rarity}">${stars(r.stars)}</span><span>${c.rarity}</span></footer>
  </article>`;
}
function storyCardHTML(id,{big=false}={}){const c=STORY_CARDS[id];
  return `<article class="tcard story-card rarity-${(RARITY[c.rarity]||RARITY['רגיל']).stars}${big?' big':''}" style="--c:${c.color};--d:${c.dark}"><header><span class="tcard-num">${c.number}</span><span class="tcard-el">${icon('star')}${c.element}</span></header>
    <div class="tcard-art story-art"><img src="${c.art}" alt=""></div><div class="tcard-title"><h3>${c.name}</h3><small>${c.role}</small></div><div class="tcard-special">${icon('sparkle')}<b>${c.special}</b></div>
    ${c.bars.length?`<ul class="tcard-bars">${c.bars.map(([label,value,pct])=>`<li><span>${label}</span><i><em style="width:${pct}%"></em></i><b>${value}</b></li>`).join('')}</ul>`:`<p class="tcard-note">${c.description}</p>`}
    <footer><span class="tcard-stars">${stars((RARITY[c.rarity]||RARITY['רגיל']).stars)}</span><span>קלף סיפור</span></footer></article>`;}
function cardBack(id,{label='ליגת היצורים'}={}){const c=CREATURES[id]||STORY_CARDS[id];return `<article class="tcard tcard-back" style="--c:${c?.color||'#68ebcf'}"><div class="tcard-emblem">${icon('bolt')}</div><b>${label}</b>${c?`<small>${/^[0-9]/.test(c.number)?'#':''}${c.number}</small>`:''}</article>`;}
function notify(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,5000);}
function persist(){if(!saveProfile(storage,profile)&&!saveNoticeShown){notify('השמירה במכשיר אינה זמינה. אפשר להמשיך לשחק עד שסוגרים את הדף.');saveNoticeShown=true;}updateHeader();}
function updateHeader(){{const p=activePlayer();$('player-chip-name').textContent=playerName(p);livePortrait('player-chip-face',faceOf(p),{skin:skinOf(profile,faceOf(p))});}$('header-wins').textContent=profile.league.trophies;$('cards-badge').hidden=!profile.newCards.length;$('cards-badge').textContent=profile.newCards.length;$('sound-toggle').innerHTML=icon(profile.sound?'sound':'muted');$('sound-toggle').setAttribute('aria-label',profile.sound?'השתקת צליל':'הפעלת צליל');$('sound-toggle').setAttribute('aria-pressed',String(!profile.sound));}
function showView(name){
  const from=screen;metaInit();
  // Coming to the boxes from anywhere else always starts at the waiting chest, never at the last box's prizes.
  if(name==='boxes'&&from!=='boxes')boxUI={taps:0,result:null,chosen:null};
  if(screen!==name)window.scrollTo(0,0);
  screen=name;for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;
  document.body.classList.toggle('battle-active',name==='battle');if(name!=='battle')chosenTrio=null;
  {const v=$(name);if(v&&name!=='battle'){v.classList.remove('view-enter');void v.offsetWidth;v.classList.add('view-enter');}}
  // On a touch screen a battle goes full screen and asks for landscape.
  if(name==='battle'&&matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>window.screen.orientation?.lock?.('landscape')).catch(()=>{});
  if(name==='battle')window.scrollTo(0,0);
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===name||el.dataset.view==='lobby'&&['cup','workshop','challenge','wild','story','castle','versus','boxes','league','tower','goals','online','bridge','campfire'].includes(name)));
  if(name!=='battle'){clearInput();sound.setScene('lobby');sound.resume();document.body.classList.remove('versus-play');}
  if(name!=='wild')storyIntro=storyIntro&&name==='battle';
  if(name==='lobby'){buildRoster();refreshSelection();renderStoryPanel();}if(name==='wild')renderWild();if(name==='story')renderStory();if(name==='castle')renderCastle();if(name==='cards')renderAlbum();if(name==='cup')renderCup();if(name==='workshop')renderWorkshop();if(name==='records')renderRecords();if(name==='challenge')renderChallenge();if(name==='versus')renderVersus();if(name==='players'){$('player-form').hidden=true;renderPlayers();}if(name==='boxes')renderBoxes();if(name==='league')renderLeague();if(name==='tower')renderTower();if(name==='goals'){refreshTodayGoals();renderGoals();}if(name==='online')renderOnline();if(name==='bridge')renderBridge();if(name==='campfire')renderCampfire();
  if(['lobby','story','cards','league','tower'].includes(name))setTimeout(()=>{if(screen===name)maybeRitual();},650);
  window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
}
function buildRoster(){
  $('roster').innerHTML=Object.values(CREATURES).map(c=>!isUnlocked(profile,c.id)&&c.box?`<button class="creature-card locked star-wait" data-boxes aria-label="${c.name}: יצור מתיבת זהב" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('star')}תיבת זהב</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('star')} מחכה בתיבת זהב</div></div></button>`:!isUnlocked(profile,c.id)&&c.star?`<button class="creature-card locked star-wait" data-star="${c.id}" aria-label="${c.name}: ${c.female?'שומרת':'שומר'} הכוכב, מחכה בטירה הזהובה" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('star')}${c.female?'שומרת':'שומר'} הכוכב</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('star')} מחכה בטירה הזהובה</div></div></button>`:!isUnlocked(profile,c.id)?`<button class="creature-card locked" data-wild="${c.id}" aria-label="יצור פרא: ${c.name}. נצחו אותו כדי לשחרר" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('lock')}יצור פרא</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('lock')} מחכה ב${islandOf(homeIsland(c.id))?.name||'מסע השרשרת'}</div></div></button>`:`<button class="creature-card" data-creature="${c.id}" aria-label="בחירת ${c.name}, ${c.role}" aria-pressed="false" style="--accent:${c.color};--accent-glow:${c.color}1a"><span class="selected-mark">${icon('check')}</span><div class="card-top"><span class="element-label">${icon(c.specialIcon)}${c.element}</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.role}</span></div><div class="stat-grid"><div><strong>${c.hp}</strong><small>חיים</small><span class="stat-bar"><i style="width:${c.hp/230*100}%"></i></span></div><div><strong>${c.speed}</strong><small>מהירות</small><span class="stat-bar"><i style="width:${c.speed/298*100}%"></i></span></div><div><strong>${c.damage}</strong><small>נזק לפגיעה</small><span class="stat-bar"><i style="width:${c.damage/24*100}%"></i></span></div></div><div class="card-bottom"><span>ירי כל ${c.interval.toFixed(2)} שנ׳</span><b>${c.armor?'שריון סופג '+Math.round(c.armor*100)+'%':'כוח מיוחד כל '+c.specialCooldown+' שנ׳'}</b></div></div></button>`).join('');
  for(const c of Object.values(CREATURES))livePortrait('portrait-'+c.id,c.id,{roster:true});
  document.querySelectorAll('[data-creature]').forEach(el=>el.addEventListener('click',()=>{profile.selected=el.dataset.creature;persist();refreshSelection();sound.click();}));
  document.querySelectorAll('[data-star]').forEach(el=>el.addEventListener('click',()=>{sound.click();notify('שומרי הכוכב מחכים בטירה הזהובה. כשתתקנו את הכוכב, הם יצטרפו אליכם.');}));
  document.querySelectorAll('#roster [data-boxes]').forEach(el=>el.addEventListener('click',()=>{sound.click();notify('יצורי התיבה מגיעים בתיבות הזהב. בכל תיבת זהב בוחרים אחד מתוך שניים.');showView('boxes');}));
  document.querySelectorAll('[data-wild]').forEach(el=>el.addEventListener('click',()=>{sound.click();const w=CREATURES[el.dataset.wild];notify(w.name+' עדיין בצל. '+byGender(w,'הוא מחכה','היא מחכה')+' ב'+(islandOf(homeIsland(w.id))?.name||'מסע השרשרת')+'.');showView('story');}));
  $('team-count').textContent=(STARTERS.length+profile.unlocked.length)+' מתוך '+Object.keys(CREATURES).length;
  const rivalNow=$('rival').value||'slauz';$('rival').innerHTML=Object.values(CREATURES).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');$('rival').value=rivalNow;
}
function refreshSelection(){
  const c=CREATURES[profile.selected];document.querySelectorAll('[data-creature]').forEach(el=>{const selected=el.dataset.creature===c.id;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});
  $('power-title').textContent=c.special;$('power-description').textContent=c.description;$('power-icon').innerHTML=icon(c.specialIcon);$('power-icon').style.color=c.color;$('difficulty').value=profile.level;
  renderJourney();
}
function openWild(id){wildTarget=id;showView('wild');}
function renderWild(){
  const step=storyIntro?(replayStep||currentStep(profile)):null,replay=!!(step&&replayStep);
  if(storyIntro&&(!step||step.kind==='castle')){storyIntro=false;showView('story');return;}
  if(step)wildTarget=step.kind==='mission'?step.opponent:step.kind==='mirror'?(isUnlocked(profile,profile.selected)?profile.selected:'maimi'):step.rival;
  if(!step&&(!wildTarget||isUnlocked(profile,wildTarget))){wildTarget=WILD.find(id=>!isUnlocked(profile,id));if(!wildTarget){showView('cards');return;}}
  const c=CREATURES[wildTarget],level=step?step.level:wildLevel(profile);
  $('wild-stage').style.setProperty('--c',c.color);$('wild-stage').dataset.el=ELEMENT_ART[c.element]||'water';
  $('wild-progress').textContent=replay?islandOf(step.island).name+' · קרב חוזר · השיא שלך: '+stars(starsOf(profile,step.id)):step?(islandOf(step.island).name+' · שלב '+(STEPS.filter(s=>s.island===step.island).indexOf(step)+1)+' מתוך '+STEPS.filter(s=>s.island===step.island).length):releasedCount(profile)+' מתוך '+WILD.length+' יצורי פרא כבר בנבחרת שלך';
  $('wild-guide').hidden=!step;if(replay)say('wild-guide','קרב חוזר! שלושה כוכבים מקבלים כשנשאר לך הרבה חיים, או כשהמשימה הולכת ממש טוב.');else if(step)say('wild-guide',missionEased(profile,step)?(step.easier||'הפעם היריב קצת עייף. אתם יכולים!')+' '+step.intro:step.intro,{voice:'voice-shadow-'+step.id});
  const ch2step=chapterOf(step)===2;document.querySelector('#wild .wild-tag').textContent=step?.kind==='mission'?(ch2step?'משימת העולם':'משימת האי'):step?.kind==='guardian'?(ch2step?(c.female?'שומרת העולם':'שומר העולם'):'שומר האי'):step?.kind==='mirror'?'הבבואה':'אחוז בצל';
  $('wild-name').textContent=step?.kind==='mission'?MODES[step.mode].name:step?.kind==='mirror'?'הבבואה של '+c.name:step?.title||c.name;$('wild-name').style.color=c.color;$('wild-role').textContent=c.role+' · כוח '+c.element+' · '+c.rarity;
  $('wild-power-icon').innerHTML=icon(step?.kind==='mission'?MISSION_ICON[step.mode]:c.specialIcon);$('wild-power-icon').style.color=c.color;$('wild-power-title').textContent=step?.kind==='mission'?'איך מנצחים':c.special;$('wild-power-label').textContent=step?.kind==='mission'?'המשימה':byGender(c,'הכוח המיוחד שלו','הכוח המיוחד שלה');$('wild-power-description').textContent=step?.kind==='mission'?MODES[step.mode].goal:c.description;
  if(step?.kind==='mission')$('wild-role').textContent=(step.rivals?'היריבים: '+step.rivals.map(id=>CREATURES[id].name).join(', ')+' בצל · ':friendlyStep(profile,step)?c.name+' רוצה להתחרות · ':'היריב: '+c.name+' בצל · ')+(profile.missionStars[step.id]?'השיא שלך: '+stars(profile.missionStars[step.id]):'עד שלושה כוכבים');
  $('wild-level').textContent='רמת היריב: '+levelName(step?.kind==='mission'?missionLevel(profile,step):level)+'. '+(step?.kind==='mission'?MISSION_HINT[step.mode]:'')+(step?.kind==='mirror'?'הבבואה יודעת כל מה שאתם יודעים. תפתיעו אותה.':rivalAdvice[c.id]||'');
  const theirCard=c.name+' והקלף '+byGender(c,'שלו','שלה');
  document.querySelector('#wild .wild-prize strong').textContent=replay?'הפרס: עוד כוכבים, וניצוצות לתיבת הכוכב':step?(step.kind==='mission'?'הפרס: עד שלושה כוכבים, והדרך לשומר':step.kind==='free'?'הפרס: '+theirCard:step.kind==='guardian'?(ch2step?'הפרס: '+theirCard+', והדרך ל'+(BRIDGE_NAME[step.island]||'גשר'):'הפרס: האור '+islandOf(step.island).gemName+', '+theirCard):'הפרס: האור הלבן והכוכב הזהוב'):'הפרס: '+theirCard;
  if(!isUnlocked(profile,profile.selected))profile.selected='maimi';
  $('wild-fighters').innerHTML=Object.values(CREATURES).filter(f=>isUnlocked(profile,f.id)).map(f=>`<button class="fighter-chip${f.id===profile.selected?' chosen':''}" data-fighter="${f.id}" aria-pressed="${f.id===profile.selected}" style="--c:${f.color}"><canvas id="chip-${f.id}" aria-hidden="true"></canvas><b>${f.name}</b><small class="chip-level">רמה ${creatureLevel(profile,f.id)}</small></button>`).join('');
  for(const f of Object.values(CREATURES))if(isUnlocked(profile,f.id))livePortrait('chip-'+f.id,f.id,{skin:skinOf(profile,f.id)});
  livePortrait('wild-portrait',c.id,{big:true,skin:step?.kind==='mirror'?'night':null});
  document.querySelectorAll('[data-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.fighter;persist();sound.click();renderWild();});
  $('wild-start').onclick=()=>startBattle(step?'story':'wild');
  $('wild').classList.toggle('is-mission',step?.kind==='mission');
  $('wild-start').innerHTML=(replay?'לקרב החוזר!':step?.kind==='mission'?'למשימה!':step?.kind==='guardian'?'לקרב מול השומר!':step?.kind==='mirror'?'מול הבבואה!':step?'לשחרר מהצל!':'לקרב הפרא!')+' '+icon('arrow');
}
const albumTotal=()=>Object.keys(CREATURES).length+STORY_CARD_IDS.length,albumOwned=()=>Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)).length+profile.storyCards.length;
let albumTab='creatures';
function renderAlbum(){
  const owned=[...Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),...profile.storyCards],total=albumTotal(),W=wonderPage(wonderList(),profile.wonders?.seen),seenW=W.filter(w=>w.seen).length;
  // The Star Book has two pages: the creatures, and the Wonders seen in battle.
  $('album-tabs').hidden=!W.length;if(!W.length)albumTab='creatures';
  $('album-tab-creatures').textContent=owned.length+'/'+total;$('album-tab-wonders').textContent=seenW+'/'+W.length;
  document.querySelectorAll('[data-album-tab]').forEach(b=>{const on=b.dataset.albumTab===albumTab;b.setAttribute('aria-selected',String(on));b.classList.toggle('chosen',on);b.onclick=()=>{if(on)return;sound.click();albumTab=b.dataset.albumTab;renderAlbum();};});
  $('album-creatures').hidden=albumTab!=='creatures';$('album-wonders').hidden=albumTab!=='wonders';
  if(albumTab==='wonders'){$('album-progress').textContent=seenW+' מתוך '+W.length+' פלאים';renderWonders();return;}
  $('album-progress').textContent=owned.length+' מתוך '+total+' קלפים'+(profile.newCards.length?' · '+profile.newCards.length+' מחכים שתהפכו אותם!':'');
  $('album-meter').style.width=owned.length/total*100+'%';renderFramePicker();
  $('album').innerHTML=Object.values(CREATURES).map(c=>{
    if(!isUnlocked(profile,c.id)){const where=c.box?'בתיבת זהב':c.star?'בטירה הזהובה':'ב'+(islandOf(homeIsland(c.id))?.name||'מסע השרשרת');return `<button class="album-slot locked" data-album-wild="${c.id}" aria-label="קלף נעול: ${c.name}. מחכה ${where}">${cardBack(c.id,{label:c.box?'יצור תיבה':c.star?'שומר הכוכב':'יצור בצל'})}<span class="album-hint">${icon('lock')} מחכה ${where}</span></button>`;}
    if(profile.newCards.includes(c.id))return `<button class="album-slot fresh" data-album-new="${c.id}" aria-label="קלף חדש של ${c.name}. הקישו כדי להפוך">${cardBack(c.id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`;
    return `<button class="album-slot" data-album-card="${c.id}" aria-label="הקלף של ${c.name}">${cardHTML(c.id,{canvasId:'album-'+c.id,skin:skinOf(profile,c.id)})}${formBadge(c.id)}</button>`;
  }).join('');
  for(const c of Object.values(CREATURES))if(isUnlocked(profile,c.id)&&!profile.newCards.includes(c.id))livePortrait('album-'+c.id,c.id,{skin:skinOf(profile,c.id),card:true});
  $('album-story').innerHTML=STORY_CARD_IDS.map(id=>!storyCardOwned(profile,id)?`<div class="album-slot locked">${cardBack(id,{label:'קלף סיפור'})}<span class="album-hint">${icon('lock')} בטירה הזהובה</span></div>`:profile.newCards.includes(id)?`<button class="album-slot fresh" data-album-new="${id}">${cardBack(id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`:`<div class="album-slot">${storyCardHTML(id)}</div>`).join('');
  document.querySelectorAll('#album-story [data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  document.querySelectorAll('[data-album-wild]').forEach(el=>el.onclick=()=>{sound.click();const c=CREATURES[el.dataset.albumWild];if(c.box){notify(c.name+' מחכה בתיבת זהב. בכל תיבת זהב בוחרים אחד מתוך שניים.');showView('boxes');return;}notify(c.star?'שומרי הכוכב מחכים בטירה הזהובה. כשתתקנו את הכוכב, הם יצטרפו אליכם.':c.name+' עדיין בצל. '+byGender(c,'הוא מחכה','היא מחכה')+' ב'+(islandOf(homeIsland(c.id))?.name||'מסע השרשרת')+'.');showView('story');});
  document.querySelectorAll('[data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  document.querySelectorAll('[data-album-card]').forEach(el=>el.onclick=()=>{sound.click();openCard(el.dataset.albumCard);});
}
// The castle hands over the story cards, then the star guardians join, one card after another.
function revealCastle(){const [next,...rest]=profile.newCards.filter(id=>STORY_CARD_IDS.includes(id)||CREATURES[id]?.star);if(!next){showView('cards');return;}revealCard(next,{back:'story',joined:!!CREATURES[next],chain:rest.length?revealCastle:null});}
function revealCard(id,{joined=false,back=null,chain=null}={}){
  const c=CREATURES[id]||STORY_CARDS[id];flipCard(profile,id);persist();
  $('reveal-back').innerHTML=cardBack(id);$('reveal-front').innerHTML=STORY_CARDS[id]?storyCardHTML(id,{big:true}):cardHTML(id,{canvasId:'reveal-art',skin:skinOf(profile,id),big:true});if(CREATURES[id])livePortrait('reveal-art',id,{skin:skinOf(profile,id),card:true});
  const d=$('reveal-dialog');d.style.setProperty('--c',c.color);$('reveal-flip').classList.remove('flipped');d.classList.remove('burst','ritual','ritual-done','holding');ritual=null;$('ritual-skip').hidden=true;
  $('reveal-kicker').textContent=joined?'יצור חדש בנבחרת!':'קלף חדש!';$('reveal-title').textContent='';$('reveal-text').textContent='';
  if(chain){$('reveal-primary').textContent='לקלף הבא';$('reveal-primary').onclick=()=>{d.close();chain();};}
  else if(back){$('reveal-primary').textContent=inChapter2(profile)?'חזרה למפה':'חזרה למפת השרשרת';$('reveal-primary').onclick=()=>{d.close();showView(back);};}
  else if(!CREATURES[id]){$('reveal-primary').textContent='לאלבום הקלפים';$('reveal-primary').onclick=()=>{d.close();showView('cards');};}
  else{$('reveal-primary').textContent='לקרב עם '+c.name;$('reveal-primary').onclick=()=>{d.close();profile.selected=id;persist();showView('lobby');};}
  $('reveal-secondary').onclick=()=>{d.close();showView('cards');};
  if(!d.open)d.showModal();sound.unlock();
  setTimeout(()=>{$('reveal-flip').classList.add('flipped');d.classList.add('burst');sound.reveal(joined);$('reveal-title').textContent=c.name+(joined?(c.female?' הצטרפה אליכם!':' הצטרף אליכם!'):'');$('reveal-text').textContent=c.special+': '+c.description;},650);
  if(screen==='story')renderStory();
  if(screen==='cards')renderAlbum();
}
function openCard(id,{form=false}={}){
  cardTarget=id;const c=CREATURES[id],skin=skinOf(profile,id),wins=profile.creatures[id]?.wins||0,side=form&&formOn(id);
  $('card-dialog-card').innerHTML=cardHTML(id,{canvasId:'dialog-art',skin,big:true,form:side});livePortrait('dialog-art',id,{skin,card:true,form:side});
  // An unlocked Power Form turns the card over to its form side; before that, the crown shows the wins to go.
  {const left=formToGo(id);$('card-form').innerHTML=formOn(id)?`<div class="form-toggle" role="group" aria-label="צד הקלף"><button type="button" data-card-side="base" aria-pressed="${!side}">רגיל</button><button type="button" data-card-side="form" aria-pressed="${side}">${crownArt()}עוצמה</button></div>`:`<div class="form-road">${icon('crown')}<span class="form-dots">${formDots(left,FORM_WINS()).map(on=>`<i class="${on?'on':''}"></i>`).join('')}</span><small>עוד ${left} ${left===1?'ניצחון':'ניצחונות'} לצורת־עוצמה</small></div>`;}
  document.querySelectorAll('[data-card-side]').forEach(el=>el.onclick=()=>{const f=el.dataset.cardSide==='form';if(f===side)return;sound.click();openCard(id,{form:f});});
  $('card-dialog-title').textContent=c.name;$('card-dialog-title').style.color=c.color;
  {const lp=levelProgress(profile,id);$('card-level').innerHTML=`<b>רמה ${lp.level}${lp.level>=MAX_LEVEL?' · אלוף '+esc(c.name)+'!':''}</b><span class="level-bar"><i style="width:${Math.round(lp.pct*100)}%"></i></span><small>${lp.level>=MAX_LEVEL?'הרמה הכי גבוהה. כל הכבוד!':'עוד '+lp.toNext+' נקודות ניסיון לרמה '+(lp.level+1)+'. כל רמה מוסיפה '+Math.round(LEVEL_BONUS*100)+'% חיים וכוח.'}</small>`;}
  $('skin-picker').innerHTML=SKINS.filter(k=>!k.box||skinUnlocked(profile,id,k.id)).map(k=>{const open=skinUnlocked(profile,id,k.id),need=(k.wins||0)-wins;return `<button class="skin-option skin-${k.id}${k.id===skin?' chosen':''}" data-skin="${k.id}" ${open?'':'disabled'} aria-pressed="${k.id===skin}" style="--c:${c.color}"><span class="skin-swatch"></span><b>${k.name}</b><small>${open?(k.id===skin?'נבחר':'פתוח'):'עוד '+need+' '+(need===1?'ניצחון':'ניצחונות')}</small></button>`;}).join('');
  if(SKINS.some(k=>k.box&&!skinUnlocked(profile,id,k.id)))$('skin-picker').insertAdjacentHTML('beforeend','<button class="skin-option skin-more" data-boxes><span class="skin-swatch"></span><b>עוד מראות</b><small>בתיבות כוכב</small></button>');
  document.querySelector('#skin-picker [data-boxes]')?.addEventListener('click',()=>{sound.click();$('card-dialog').close();showView('boxes');});
  document.querySelectorAll('[data-skin]').forEach(el=>el.onclick=()=>{if(chooseSkin(profile,id,el.dataset.skin)){persist();sound.click();openCard(id,{form:side});if(screen==='cards')renderAlbum();}});
  $('card-dialog-play').textContent=profile.selected===id?c.name+' כבר בחר לקרב':'בוחרים את '+c.name+' לקרב';
  $('card-dialog-play').onclick=()=>{profile.selected=id;persist();sound.click();$('card-dialog').close();showView('lobby');};
  if(!$('card-dialog').open)$('card-dialog').showModal();
}
// ------------------------------------------------------------------ Power Forms and Wonders in the Star Book
// The rules come from core; until a rule is there, the same numbers are worked out here.
const FORM_AT=()=>rules.FORM_LEVEL??3,XP_TABLE=()=>rules.LEVEL_XP||[0,20,50,90,140,200,270,350,440,540],FORM_XP=()=>XP_TABLE()[FORM_AT()-1]??50,FORM_WINS=()=>Math.ceil(FORM_XP()/(rules.XP_WIN??10));
const formOn=id=>rules.formUnlocked?rules.formUnlocked(profile,id):creatureLevel(profile,id)>=FORM_AT();
const formToGo=id=>rules.formWinsToGo?rules.formWinsToGo(profile,id):formOn(id)?0:Math.ceil((FORM_XP()-(profile.creatures[id]?.xp||0))/(rules.XP_WIN??10));
const formSpecOf=c=>rules.formSpec?.(c)||{...c,damage:c.damage*1.15,specialCooldown:c.specialCooldown/1.5};
const wonderList=()=>Array.isArray(rules.WONDERS)?rules.WONDERS:[];
// A painted piece from the FX sheet once it has loaded, else the line icon.
const fxSrc=name=>art?.fx?.[name]?.src||'';
const crownArt=()=>fxSrc('crown')?`<img class="crown-art" src="${fxSrc('crown')}" alt="">`:icon('crown');
const stickerArt=w=>{const src=fxSrc(w.sticker||'wonder-'+w.id);return src?`<img src="${src}" alt="">`:icon(w.icon||'sparkle');};
const dotsHTML=left=>formDots(left,FORM_WINS()).map(on=>`<i class="${on?'on':''}"></i>`).join('');
function formBadge(id){
  if(formOn(id))return `<span class="tcard-crown" title="צורת־עוצמה">${crownArt()}</span>`;
  const left=formToGo(id);return `<span class="form-dots" title="עוד ${left} ${left===1?'ניצחון':'ניצחונות'} לצורת־עוצמה">${dotsHTML(left)}</span>`;
}
// Only Wonders that exist get a place, so the page can always be filled. An unseen one is a dark shape and a question mark.
function renderWonders(){
  const W=wonderPage(wonderList(),profile.wonders?.seen);
  $('album-wonders').innerHTML=`<p class="wonders-lead">${icon('book')} פלאים מהקרבות. כל פלא חוזר!</p><div class="wonder-grid">${W.map(w=>`<div class="wonder-sticker ${w.seen?'seen':'unseen'}" style="--w:${w.color||'#ffd23a'}"><span class="wonder-pic">${stickerArt(w)}${w.seen?'':'<b class="wonder-q" aria-hidden="true">?</b>'}</span><b>${w.seen?esc(w.name):'?'}</b><small>${w.seen?'ראיתם ×'+w.count:'עוד לא ראיתם'}</small></div>`).join('')}</div>`;
}
// ------------------------------------------------------------------ the Power Form ritual
// The first time a creature's form opens, the child holds two thumbs on its card until the card turns over.
let ritual=null,formWaiting=null;const ritualAsked=new Set();
const ritualDone=id=>(profile.forms?.ritual||[]).includes(id);
function markRitualFor(id){if(rules.markRitual)return rules.markRitual(profile,id);if(!CREATURES[id])return false;profile.forms??={ritual:[],seen:[]};if(profile.forms.ritual.includes(id))return false;profile.forms.ritual.push(id);return true;}
const twoThumbs=()=>matchMedia('(pointer:coarse)').matches&&navigator.maxTouchPoints>1;
function openRitual(id,{back=null,label=null}={}){
  const c=CREATURES[id];if(!c||!isUnlocked(profile,id))return false;ritualAsked.add(id);if(formWaiting===id)formWaiting=null;
  const skin=skinOf(profile,id),d=$('reveal-dialog'),two=twoThumbs();
  ritual={id,back,p:0,held:[null,null],key:false,done:false,tick:0,raf:0};
  d.style.setProperty('--c',c.color);d.style.setProperty('--hold','0');d.classList.remove('burst','ritual-done','holding');d.classList.add('ritual');d.classList.toggle('one-thumb',!two);
  $('reveal-flip').classList.remove('flipped');
  $('reveal-back').innerHTML=cardHTML(id,{canvasId:'ritual-base',skin,big:true});$('reveal-front').innerHTML=cardHTML(id,{canvasId:'ritual-form',skin,big:true,form:true});
  livePortrait('ritual-base',id,{skin,card:true});livePortrait('ritual-form',id,{skin,card:true,form:true});
  $('reveal-kicker').textContent='צורת־עוצמה חדשה!';$('reveal-title').textContent=c.name;$('reveal-text').textContent=two?'החזיקו את שני העיגולים':'החזיקו את העיגול, או את הרווח';
  $('ritual-skip').hidden=true;setTimeout(()=>{if(ritual?.id===id&&!ritual.done)$('ritual-skip').hidden=false;},500);
  $('reveal-primary').textContent=label||(back?'ממשיכים!':'יאללה!');$('reveal-primary').onclick=()=>{const b=ritual?.back;d.close();if(typeof b==='function')b();};
  $('reveal-secondary').onclick=()=>{d.close();match=null;showView('cards');};
  if(!d.open)d.showModal();sound.unlock?.();
  ritualLoop();return true;
}
function ritualLoop(){
  // The first frame's time can be older than the moment the ritual opened: time never runs backwards into a hold nobody made.
  const R=ritual;let last=null;
  const loop=now=>{if(ritual!==R||R.done||!$('reveal-dialog').open)return;const dt=last==null?0:Math.max(0,Math.min(.1,(now-last)/1000)),d=$('reveal-dialog');last=now;
    const ready=twoThumbs()?R.held[0]!=null&&R.held[1]!=null:R.held[0]!=null||R.held[1]!=null||R.key;
    R.p=holdStep(R.p,ready,dt);if(ready&&(R.tick-=dt)<=0){R.tick=.25;ding('hold');}if(!ready)R.tick=0;
    d.style.setProperty('--hold',Math.min(1,R.p/RITUAL_HOLD).toFixed(3));d.classList.toggle('holding',ready);
    if(R.p>=RITUAL_HOLD){ritualFlip();return;}R.raf=requestAnimationFrame(loop);};
  R.raf=requestAnimationFrame(loop);
}
function ritualFlip(){
  const R=ritual;if(!R||R.done)return;R.done=true;cancelAnimationFrame(R.raf);const c=CREATURES[R.id],d=$('reveal-dialog');
  markRitualFor(R.id);persist();
  $('reveal-flip').classList.add('flipped');d.classList.add('burst','ritual-done');d.classList.remove('holding');d.style.setProperty('--hold','1');$('ritual-skip').hidden=true;
  if(sound.formBurst)sound.formBurst(0,{sting:true});else sound.reveal(true);
  $('reveal-title').textContent=c.name+' · צורת־עוצמה!';
  $('reveal-text').innerHTML=`<span class="ritual-how" aria-hidden="true">${icon('bolt')}${icon('bolt')}<b>←</b>${crownArt()}</span>שני כוחות־על פוגעים, ואז לוחצים!`;
}
// The ritual waits for a calm moment on the island screens: the creature just unlocked, or the one chosen.
// The first check on a save gives every form that was already open its crown without a ritual.
function maybeRitual(){
  if(screen==='battle'||document.querySelector('dialog[open]'))return;
  const sel=profile.selected;
  if(!(profile.forms?.ritual||[]).length){let any=false;for(const k of Object.keys(CREATURES))if(k!==sel&&isUnlocked(profile,k)&&formOn(k))any=markRitualFor(k)||any;if(any)persist();}
  const id=[formWaiting,sel].find(k=>k&&isUnlocked(profile,k)&&formOn(k)&&!ritualDone(k)&&!ritualAsked.has(k));
  if(id)openRitual(id);
}
function continueJourney(){match=null;const next=journeyView(profile);showView(next==='lobby'?'cup':next);}
function renderJourney(){
  const active=profile.cup,done=active?active.stage:profile.challengeWins?4:challengeUnlocked(profile)?3:0;
  const pending=needsUpgrade(profile),hero=CREATURES[active?.player||profile.selected];
  $('journey-progress').textContent=done===4?'המסע הראשון הושלם!':`${done} מתוך 4 אתגרים הושלמו`;
  $('journey-title').textContent=pending?'ניצחת! כוח חדש מחכה לך':done<3?`${CUP[done].title} · מול ${CREATURES[CUP[done].rival].name}`:done===3?'נפתח: הזירה המתפוררת':'הגביע ותג האלוף שלך';
  $('journey-detail').textContent=pending?`בוחרים כוח, ואז ממשיכים ל${CUP[active.stage].title}.`:done<3?`${hero.name} בדרך לגביע. אחרי כל אחד משני הקרבות הראשונים בוחרים כוח חדש.`:done===3?'המחסות מתפוררים. השילוב שזכה בגביע ממשיך איתך לאתגר.':'השלמת את ארבעת האתגרים. אפשר לנסות שוב או לבנות שילוב אחר בגביע נוסף.';
  $('journey-start').innerHTML=`${done===4?'משחקים שוב באתגר':active||done>0?'ממשיכים במסע':'מתחילים את המסע'} ${icon('arrow')}`;
  $('journey-track').innerHTML=[...CUP.map(r=>r.title),'הזירה המתפוררת'].map((title,i)=>`<li class="${i<done?'done':i===done?'current':''}" ${i===done?'aria-current="step"':''}><span>${i<done?icon('check'):i+1}</span><strong>${title}</strong><small>${i<done?'הושלם':i===done?'הבא שלך':i===3?'נפתח אחרי הגביע':'בהמשך המסע'}</small></li>`).join('');
  $('cup-teaser').hidden=!challengeUnlocked(profile)||!!profile.cup;
}
function renderChallenge(){
  if(!challengeUnlocked(profile)){showView('lobby');return;}
  const build=profile.lastBuild||{player:profile.selected,upgrades:[]},hero=CREATURES[build.player],done=profile.challengeWins>0;
  $('challenge-status').textContent=done?'4 מתוך 4 · המסע הראשון הושלם!':'3 מתוך 4 · הגביע פתח אתגר חדש';
  $('challenge-intro').textContent=done?'תג אלוף הזירה הפתוחה שלך. אפשר לשחק שוב ולנסות דרך אחרת.':'ניצחת בגביע. עכשיו הזירה עצמה משתנה.';
  $('challenge-build').innerHTML=`<div><span class="micro-label">השילוב שזכה בגביע ממשיך איתך</span><h2 style="color:${hero.dark}">${hero.name} מול הבזוק</h2></div><div class="build-chips">${buildChips(hero.id,build.upgrades)||'<span class="muted">הכוחות הבסיסיים שלך</span>'}</div><small>הכוחות והשילוב נשמרים גם אחרי יציאה או הפסד.</small>`;
  $('challenge-start').innerHTML=`${done?'משחקים שוב באתגר':'לאתגר החדש'} ${icon('arrow')}`;
}
function renderCup(){
  const stage=profile.cup?.stage??0;
  $('cup-track').innerHTML=CUP.map((r,i)=>`<article class="cup-round ${i===stage?'current':i<stage?'done':'locked'}"><div class="round-num">${i<stage?icon('check'):i+1}</div><h3>${r.title}</h3><div class="round-rival" style="color:${CREATURES[r.rival].dark}">${CREATURES[r.rival].name}</div><p>${r.club}</p><div class="round-state">${i<stage?'ניצחתם!':i===stage?'הקרב הבא שלכם':'בהמשך הדרך'}</div></article>`).join('');
  const hero=CREATURES[profile.cup?.player||profile.selected],rival=CREATURES[CUP[stage].rival];$('cup-matchup').innerHTML=`<strong>${hero.name} <span class="muted">מול</span> ${rival.name}</strong><p>${rivalAdvice[rival.id]}</p>`;
  $('cup-build').innerHTML=`<div><span class="micro-label">${profile.cup?'היצור שבונה את הדרך לגביע':'היצור שלך לגביע'}</span><h2 style="color:${hero.dark}">${hero.name}</h2></div><div class="build-chips">${buildChips(hero.id,profile.cup?.upgrades)||'<span class="muted">ניצחון פותח בחירה בכוח חדש.</span>'}</div><small>היצור והכוחות שבחרת יישארו איתך עד סוף הגביע.</small>`;
  $('cup-start').innerHTML=`${needsUpgrade(profile)?'בוחרים כוח חדש':stage===0?'מתחילים את הגביע':stage===2?'לגמר הגדול':'לחצי הגמר'} ${icon('arrow')}`;
  document.querySelector('.cup-heading .eyebrow').textContent=`שלב ${stage+1} מתוך 4 · גביע החופים`;
  document.querySelector('.cup-heading p').textContent='שני ניצחונות פותחים כוחות. זכייה בגמר פותחת את הזירה המתפוררת. ההתקדמות נשמרת.';
}
function renderWorkshop(){
  if(!needsUpgrade(profile)){showView('cup');return;}
  startCup(profile);selectedUpgrade=null;const cup=profile.cup,hero=CREATURES[cup.player];
  $('workshop-title').textContent='מה הכוח הבא של '+hero.name+'?';$('workshop-subtitle').textContent=`בוחרים כוח ${cup.upgrades.length+1} מתוך 2. הבחירה תלווה אותך עד סוף הגביע.`;
  $('workshop-build').innerHTML=buildChips(hero.id,cup.upgrades)||'<span class="muted">זה השדרוג הראשון שלך. כל בחירה פותחת דרך אחרת לשחק.</span>';
  $('upgrade-cards').innerHTML=upgradeOptions(hero).map(u=>{const owned=cup.upgrades.includes(u.id);return `<button class="upgrade-card ${owned?'owned':''}" data-upgrade="${u.id}" ${owned?'disabled':''} aria-pressed="false" style="--upgrade-color:${hero.color}"><div class="upgrade-art ${u.id}">${icon(u.icon)}${u.id==='scatter'?'<i></i><i></i><i></i>':''}</div><span class="micro-label">${u.kind}</span><h2>${u.name}</h2><p>${u.description}</p><strong class="upgrade-benefit">${u.benefit}</strong><small class="upgrade-cost">${u.cost}</small><span class="upgrade-choice">${owned?'כבר בשילוב שלך':'בחירת הכוח'}</span></button>`;}).join('');
  $('upgrade-confirm').disabled=true;$('upgrade-confirm').textContent='בחרו כוח כדי להמשיך';
  document.querySelectorAll('[data-upgrade]').forEach(el=>el.onclick=()=>{selectedUpgrade=el.dataset.upgrade;sound.click();document.querySelectorAll('[data-upgrade]').forEach(card=>{const chosen=card===el;card.classList.toggle('chosen',chosen);card.setAttribute('aria-pressed',String(chosen));});$('upgrade-confirm').disabled=false;$('upgrade-confirm').textContent='מוסיפים '+upgradeOptions(hero).find(u=>u.id===selectedUpgrade).name+' '+ 'וממשיכים';});
}
function confirmUpgrade(){
  if(!chooseUpgrade(profile,selectedUpgrade))return;
  const name=upgradeOptions(CREATURES[profile.cup.player]).find(u=>u.id===selectedUpgrade).name;persist();sound.click();notify('כוח חדש בשילוב שלך: '+name);showView(needsUpgrade(profile)?'workshop':'cup');
}
function renderRecords(){
  const totals=[[profile.wins,'ניצחונות'],[profile.league.trophies,'גביעי ליגה'],[profile.played?Math.round(profile.wins/profile.played*100)+'%':'—','אחוז ניצחונות'],[profile.bestStreak,'שיא רצף ניצחונות']];
  $('record-totals').innerHTML=totals.map(([n,label])=>`<div class="total-card"><strong>${n}</strong><span>${label}</span></div>`).join('');
  const achievements=[['star','הניצוץ הראשון','לנצח בקרב הראשון',profile.wins>0],['bolt','על הגל','שלושה ניצחונות ברצף',profile.bestStreak>=3],['shield','נבחרת מנצחת','ניצחון עם כל שלושת היצורים הראשונים',STARTERS.every(id=>profile.creatures[id]?.wins>0)],['bolt','שובר פראים','לשחרר יצור פרא ראשון',releasedCount(profile)>0],['star','האלבום המלא','לאסוף את כל '+albumTotal()+' הקלפים',albumOwned()>=albumTotal()],['trophy','אלוף החופים','לזכות בגביע',profile.cups>0],['mountain','אלוף הזירה הפתוחה','לנצח בזירה המתפוררת',profile.challengeWins>0]];
  $('achievements').innerHTML=achievements.map(([i,title,desc,done])=>`<div class="achievement ${done?'unlocked':''}" aria-label="${title}: ${done?'הושג':'טרם הושג'}">${icon(i)}<div><strong>${title}</strong><small>${desc}</small></div></div>`).join('');
  $('winning-build').hidden=!profile.lastBuild;if(profile.lastBuild)$('winning-build').innerHTML=`<span class="micro-label">השילוב האחרון שזכה בגביע</span><h2>${CREATURES[profile.lastBuild.player].name}</h2><div class="build-chips">${buildChips(profile.lastBuild.player,profile.lastBuild.upgrades)||'ניצחון בכוחות הבסיסיים'}</div>`;
  $('creature-records').innerHTML=Object.values(CREATURES).map(c=>{const record=profile.creatures[c.id]||{wins:0,played:0,damage:0};return `<tr><td style="color:${c.dark};font-weight:bold">${c.name}</td><td>${record.played}</td><td>${record.wins}</td><td>${Math.round(record.damage).toLocaleString('he-IL')}</td></tr>`;}).join('');
  $('history').innerHTML=profile.history.length?profile.history.map(h=>`<div class="history-row"><div><strong>${CREATURES[h.player].name} מול ${CREATURES[h.rival].name}</strong><small>${historyLabel(h.mode,CHALLENGE.title)} ·${Math.round(h.damage)} נזק · ${Math.round(h.accuracy)}% דיוק</small></div><span class="history-outcome ${h.won?'won':''}">${h.draw?'תיקו':h.won?'ניצחון':'הפסד'}</span></div>`).join(''):'<p class="empty-history">הקרב הראשון שלכם עוד לפניכם. כל היצורים כבר מחכים בזירה.</p>';
}
function clearInput(){keys.clear();input.pointerFire=false;input.buttonFire=false;input.toggleFire=false;input.aim=null;input.stickX=0;input.stickY=0;input.special=false;input2.stickX=0;input2.stickY=0;input2.special=false;$('joystick-knob-2').style.transform='';document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));$('joystick-knob').style.transform='';}
function currentInput(){
  const moveX=input.stickX+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),moveY=input.stickY+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  return {moveX,moveY,fire:input.pointerFire||input.buttonFire||input.toggleFire||keys.has('Space')||keys.has('KeyJ'),special:input.special,...(input.pointerFire&&input.aim?{aimX:input.aim.x,aimY:input.aim.y}:{})};
}
let chosenTrio=null;
const MISSION_ICON={lava:'flame',wind:'swirl',ball:'spiral',trio:'star',echo:'sound'};
const MISSION_HINT={echo:'מקשיבים לאבנים, ואז דורכים עליהן לפי הסדר. טעיתם? המנגינה מתנגנת שוב. ',lava:'זוזו מהעיגולים המהבהבים והישארו בתוך הטבעת.',wind:'מי שנופל מפיל את כל הנוצות. שמרו עליהן!',ball:'עם הפנינה אי אפשר לירות: ירי בועט אותה לשער. שלוש פגיעות והיא נופלת.',trio:'כשיצור נופל, הבא בתור נכנס. כל יצור שנשאר חשוב.'};
const MISSION_TIP={lava:'אספו גחלים כדי לגדול, וזוזו מהעיגולים המהבהבים.',wind:'מי שנופל מפיל את הנוצות. החזיקו מרחק כשאתם מובילים.',ball:'כשליריב יש את הפנינה, פגעו בו שלוש פעמים, או הפעילו עליו את כוח־העל, והפנינה נופלת.',trio:'שמרו על החיים של כל יצור, וחכו עם הכוח המיוחד לרגע הנכון.',echo:'מקשיבים למנגינה עד הסוף, ואז דורכים על האבנים לפי הסדר.'};
const wantsTrio=m=>m==='quick'?$('training-mode').value==='trio':m==='story'?(s=>s?.kind==='mission'&&s.mode==='trio')(replayStep||currentStep(profile)):false;
// The trio picker: tap three released creatures; the order is the order they enter.
function openTeamPicker(nextMode){
  let picked=[];const ids=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id));
  const draw=()=>{for(const id of ids){const b=document.querySelector(`[data-team="${id}"]`),n=picked.indexOf(id);b.classList.toggle('picked',n>=0);b.querySelector('.team-order').textContent=n>=0?n+1:'';}
    $('team-go').disabled=picked.length<3;$('team-go').textContent=picked.length<3?'בחרו עוד '+(3-picked.length):'יוצאים לקרב!';};
  $('team-grid').innerHTML=ids.map(id=>`<button class="team-pick" data-team="${id}" style="--c:${CREATURES[id].color}"><canvas id="team-p-${id}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b><span class="team-order"></span></button>`).join('');
  for(const id of ids){livePortrait('team-p-'+id,id,{skin:skinOf(profile,id)});document.querySelector(`[data-team="${id}"]`).onclick=()=>{sound.click();picked=picked.includes(id)?picked.filter(x=>x!==id):picked.length<3?[...picked,id]:picked;draw();};}
  $('team-go').onclick=()=>{if(picked.length<3)return;chosenTrio=picked;$('team-dialog').close();startBattle(nextMode);};
  draw();$('team-dialog').showModal();
}
// The match a start builds, without touching the screen. The same call pre-rolls the next battle for the 'עוד קרב!' button.
// Who may grow a Power Form: the child once the creature reached its level; a rival only from challenger up (quick); never in a cup.
function buildMatch(nextMode,{seed=Date.now()+Math.floor(Math.random()*1e5)}={}){
  const player=isUnlocked(profile,profile.selected)?profile.selected:'maimi',wonders=['quick','league','tower','wild','story'].includes(nextMode)?sim.wonderOptions?.(profile)||{}:{};
  const boost=levelBoost(profile,nextMode==='challenge'?(profile.lastBuild?.player||player):player);
  if(nextMode==='tower')return makeTowerMatch(profile,{seed,...wonders});
  if(nextMode==='league')return makeLeagueMatch(profile,{seed,...wonders});
  if(nextMode==='challenge')return makeChallengeMatch(profile,{seed,boost});
  if(nextMode==='story')return makeStoryMatch(profile,{seed,team:chosenTrio,replay:replayStep?.id,boost,...wonders});
  if(nextMode==='wild')return wildTarget?makeWildMatch(profile,wildTarget,{seed,boost,...wonders}):null;
  if(nextMode!=='quick')return null;
  const rival=$('rival').value,level=profile.level,kind=$('training-mode').value||null;
  return makeMatch({player,rival,level,boost,boss:rival==='slauz'&&!kind,seed,mode:kind,arena:({lava:'fire',wind:'wind',ball:'sea',trio:'castle'})[kind]||null,...wonders,life:kind?1:sim.quickLife?.(level)??1,
    forms:[sim.formUnlocked?.(profile,player)??false,['challenger','veteran','champion'].includes(level),false],
    ...(kind==='trio'?{team:trioTeam(profile,chosenTrio),rivalTeam:Object.keys(CREATURES).filter(id=>CREATURES[id].rarity!=='אגדי').sort(()=>Math.random()-.5).slice(0,3)}:{})});
}
// The next battle waits ready under the result's big button: same mode, same creature, same child, a fresh seed.
let queued=null;
// A tower key names the climb itself (its seed), not only the floor: a new climb never meets the old climb's rival.
const queueKey=m=>{const r=profile.tower.run;return m==='quick'?[$('rival').value,$('training-mode').value,profile.level].join('|'):m==='tower'?(r?[r.seed,r.floor,r.picks.length,r.creature].join('|'):''):m==='league'?leagueLevel(profile):'';};
function queueNext(nextMode){queued=null;
  if(!['league','quick','tower'].includes(nextMode)||nextMode==='tower'&&(!profile.tower.run||profile.tower.run.pending)||wantsTrio(nextMode))return null;
  try{const m=buildMatch(nextMode);if(!m)return null;queued={match:m,mode:nextMode,player:profile.selected,who:players.active,floor:profile.tower.run?.floor??null,key:queueKey(nextMode)};}catch{queued=null;return null;}
  return nextPreview();}
function nextPreview(){const m=queued?.match;return m?{mode:queued.mode,rival:m.actors[1].id,arena:m.arena||null,giant:!!m.actors[1].giant,floor:m.tower?.floor??null,level:m.level}:null;}
function startBattle(nextMode=mode){
  const q=queued;queued=null;
  if(!art)return;if(wantsTrio(nextMode)&&!chosenTrio){openTeamPicker(nextMode);return;}if(nextMode==='challenge'&&!challengeUnlocked(profile)){showView('lobby');return;}mode=nextMode;cupFinal=false;
  if(nextMode==='wild'&&(!wildTarget||isUnlocked(profile,wildTarget))){showView('lobby');return;}
  if(nextMode==='story'&&!makeStoryMatch(profile,{replay:replayStep?.id})){showView('story');return;}
  let rival,level,player,upgrades;
  const rematch=!!q&&q.mode===nextMode&&q.player===profile.selected&&q.who===players.active&&q.key===queueKey(nextMode)&&(nextMode!=='tower'||q.floor===(profile.tower.run?.floor??null));
  if(mode==='cup'){startCup(profile);if(needsUpgrade(profile)){showView('workshop');return;}const r=CUP[profile.cup.stage];cupFinal=profile.cup.stage===2;player=profile.cup.player;persist();
    match=makeMatch({player,rival:r.rival,level:r.level,upgrades:profile.cup.upgrades,boost:levelBoost(profile,player),boss:r.rival==='slauz',seed:Date.now()+Math.floor(Math.random()*1e5),forms:[sim.formUnlocked?.(profile,player)??false,false]});}
  else match=rematch?q.match:buildMatch(mode);
  if(!match){showView('lobby');return;}
  // A pre-rolled rematch skips the long wait: a tap on 'עוד קרב!' reaches 'go' in under a second and a half.
  if(rematch)match.countdown=Math.min(match.countdown,1.4);
  player=match.actors[0].id;rival=match.actors[1].id;level=match.level;upgrades=match.actors[0].upgrades;sound.versus=false;sound.online=false;document.querySelector('.player-info .fighter-lines span').textContent='אתם';renderer.setMatch(match,[skinOf(profile,match.actors[0].id),match.mirror?'night':null],{local:0});clearInput();accumulator=0;resetBattleFx();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');sound.unlock();sound.setScene('battle');sound.resume();sound.setLocalSide?.(0);sound.setMusicRate?.(1);if(mode==='wild')sound.play('voice-wild-battle',{delay:.2});
  const p=match.actors[0].spec,r=match.actors[1].spec;
  const storyStep=match.story?STEPS.find(s=>s.id===match.story):null;
  $('player-name').textContent=p.name;$('rival-name').textContent=storyStep?.kind==='mirror'?'הבבואה שלך':storyStep?.title||r.name;$('player-symbol').innerHTML=icon(p.specialIcon);$('rival-symbol').innerHTML=icon(r.specialIcon);$('rival-level').textContent=LEVELS[level].name;
  $('match-label').textContent=mode==='cup'?CUP[profile.cup.stage].title:mode==='challenge'?CHALLENGE.title:match.mode?MODES[match.mode].name:mode==='story'?islandOf(storyStep.island).name:mode==='wild'?'קרב פרא':mode==='league'?'ליגת היצורים':mode==='tower'?'מגדל המסכה':'אימון';$('round-label').textContent=match.mode?({wind:'אספו '+WIND_TARGET+' נוצות והחזיקו '+WIND_HOLD+' שניות',lava:'גחלי כוח מגדילים אתכם · הלבה סוגרת',ball:'ראשון ל־'+BALL_GOALS+' גולים מנצח',trio:'שלושה מול שלושה',echo:'מי שמשלים 3 מנגינות מנצח'})[match.mode]:mode==='cup'?`שלב ${profile.cup.stage+1} מתוך 4`:mode==='challenge'?'שלב 4 מתוך 4':mode==='story'?(match.replay?'קרב חוזר · עד שלושה כוכבים':storyStep.kind==='free'?'ניצחון משחרר את '+r.name+' מהצל':storyStep.kind==='mirror'?'אומץ זה לפעול למרות הפחד':'ניצחון מדליק את האור '+islandOf(storyStep.island).gemName):mode==='wild'?'ניצחון משחרר את '+r.name:mode==='tower'?'קומה '+match.tower.floor+(match.tower.guard?' · שומר הקומה':match.twist==='crumble'?' · האבנים מתפוררות':match.twist==='open'?' · בלי אבנים':''):mode==='league'?'דרגת '+rankOf(profile.league.trophies).name+' · '+profile.league.trophies+' גביעים':'קרב בודד · אינו מקדם את המסע';
  $('special-action-icon').innerHTML=icon(p.specialIcon);$('special-action-name').textContent=p.special;$('special-button').style.setProperty('--c',p.color);
  $('arena-tip').textContent=rival==='slauz'&&match.actors[1].boss?bossAdvice:(mode==='wild'||mode==='story'||mode==='league')&&rivalAdvice[rival]&&!match.mirror?rivalAdvice[rival]:'רווח או כפתור ירי מכוונים ליריב. זוזו כדי להתחמק.';$('arena-tip').style.opacity='1';$('match-toast').classList.remove('visible');toastUntil=0;
  $('battle-build').innerHTML=buildChips(player,upgrades);$('battle-build').hidden=!upgrades.length;$('boss-banner').hidden=!match.actors[1].boss;
  $('challenge-banner').hidden=mode!=='challenge';$('mode-banner').hidden=!match.mode;$('hold-count').hidden=true;
  if(match.mode)$('arena-tip').textContent=MODES[match.mode].goal;
  if(match.hide)$('arena-tip').textContent='כשזזים הוא נעלם. עצרו רגע בשקט, ותראו איפה הוא.';
  if(match.flee)$('arena-tip').textContent='זנקור בורח! ירו בו כשהוא נעצר.';
  startTutorial();
  if(match.tower){const shown=match;setTimeout(()=>{if(match===shown&&match.status!=='finished')cue('tower','קומה '+match.tower.floor,1.6);},2400);}
  // The guardian's entrance ends inside the countdown: during play the whole arena stays still on screen.
  {const r=match.actors[1];if(!rematch&&(r.boss||storyStep&&['guardian','mirror'].includes(storyStep.kind)))renderer.cinematic(r.x,r.y-80,1.55,2.1);}
  $('goal-card').hidden=!match.mode;if(match.mode){$('goal-icon').innerHTML=icon(MISSION_ICON[match.mode]);$('goal-name').textContent=MODES[match.mode].name;$('goal-text').textContent=MODES[match.mode].goal;goalUntil=clock+3;}
  $('leave-button').textContent=mode==='tower'?'הפסקה · חזרה למגדל':mode==='league'?'הפסקה · חזרה לליגה':mode==='story'?'הפסקה · חזרה למפה':mode==='quick'||mode==='wild'?'חזרה לבחירת יצור':'הפסקה · חזרה למסע';
  renderHUD();$('arena').focus({preventScroll:true});
}
let goalUntil=0;
const TUT_KEY='creature-league.tutorial';
let tutorial=null;
const TUT_TEXT={touch:['שימו אגודל בצד שמאל וגררו כדי לזוז','לחצו כדי לירות על היריב','כוח־העל מלא! לחצו עליו','מעולה! עכשיו נצחו!'],keys:['זוזו עם החצים או W A S D','רווח כדי לירות על היריב','כוח־העל מלא! לחצו E','מעולה! עכשיו נצחו!']};
const TUT_TARGET=['joystick','fire-button','special-button',null];
function startTutorial(){
  let seen=false;try{seen=storage.getItem(TUT_KEY)==='1';}catch{}
  tutorial=null;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  if(seen||match.mode||match.boss||match.actors[1].boss)return;
  const me=match.actors[0];tutorial={step:0,hold:0,shots:me.stats.shots,specials:me.stats.specials,age:0,touch:matchMedia('(pointer:coarse)').matches};match.calm=true;showTutorial();
}
function showTutorial(){if(!tutorial)return;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));const t=TUT_TARGET[tutorial.step];if(t&&tutorial.touch)$(t).classList.add('tut-glow');
  // The last step is praise, not an instruction: it moves off the arena into a cue chip under the clock.
  const el=$('tutorial');if(tutorial.step>=3){el.hidden=true;cue('star','מעולה! נצחו!',2.2);return;}el.hidden=false;el.dataset.step=tutorial.step;el.classList.toggle('touch',tutorial.touch);$('tut-text').textContent=TUT_TEXT[tutorial.touch?'touch':'keys'][tutorial.step];}
// The lesson counts as learned only when every step was done; a fight that ends sooner shows it again next time.
function endTutorial(done=false){if(!tutorial)return;tutorial=null;if(match)match.calm=false;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));if(done)try{storage.setItem(TUT_KEY,'1');}catch{}}
// Each step moves on only after the child has done it.
function updateTutorial(dt){
  if(!tutorial||!match)return;if(match.status==='finished'){endTutorial(tutorial.step>=3);return;}if(match.status!=='playing')return;
  const me=match.actors[0];tutorial.age+=dt;
  // A lesson never holds a battle hostage: after 40 s the rival may fall and fire again (the lesson comes back next time).
  if(tutorial.step<3&&tutorial.age>40){endTutorial(false);return;}
  if(tutorial.step===0){if(Math.hypot(me.moveX||0,me.moveY||0)>.3)tutorial.hold+=dt;if(tutorial.hold>.7){tutorial.step=1;showTutorial();}}
  else if(tutorial.step===1){if(me.stats.shots>=tutorial.shots+3){tutorial.step=2;match.calm=false;me.superCharge=1;tutorial.specials=me.stats.specials;showTutorial();}}
  else if(tutorial.step===2){if(me.stats.specials>tutorial.specials){tutorial.step=3;tutorial.doneAt=tutorial.age;showTutorial();}}
  else if(tutorial.age-tutorial.doneAt>2.2)endTutorial(true);
}
// Until the child has tried the super, the first rival cannot fall: the fight waits for the end of the lesson.
function tutorialGuard(){if(tutorial&&tutorial.step<3&&match?.status==='playing'){const r=match.actors[1];if(r.hp>0)r.hp=Math.max(r.hp,r.spec.hp*.35);}}
// A mission's score under the clock: numbers and pictures only, the left number for the left creature, this child's in teal.
const scoreSide=(i,v)=>`<span class="mb-side ${i===localSide()?'me':'foe'}">${v}</span>`,scoreRow=(v0,mid,v1)=>scoreSide(0,v0)+(mid?`<span class="mb-goal">${mid}</span>`:'')+scoreSide(1,v1);
function renderHUD(){if(!match)return;const [a,b]=match.actors,L=localSide();
  // A creature under the HUD fades the clock, never a cue that is showing: a warning must stay readable.
  {const fade=renderer.wide&&match.actors.some(x=>!(x.out>0)&&renderer.offsetY+(x.y-x.spec.height*(renderer.size||1))*renderer.scale<70);document.querySelector('.battle-top').classList.toggle('hud-fade',fade);$('mode-banner').classList.toggle('hud-fade',fade);$('cue-row').classList.toggle('hud-fade',fade&&!cueNow);}
  // The mission's card explains the goal during the countdown only; during play the arena is free of sentences.
  if(!$('goal-card').hidden&&(clock>goalUntil||match.status!=='countdown'))$('goal-card').hidden=true;
  $('fire-button').setAttribute('aria-pressed',String(input.toggleFire));$('fire-button').classList.toggle('latched',input.toggleFire);
  // The left bar is always this child's creature: on the phone that joined a two-phone room that is side 1.
  {const me=match.online?match.actors[L]:a,foe=match.online?match.actors[1-L]:b;$('player-health').style.width=100*me.hp/me.spec.hp+'%';$('rival-health').style.width=100*foe.hp/foe.spec.hp+'%';$('player-hp').textContent=Math.ceil(me.hp)+' / '+me.spec.hp;$('rival-hp').textContent=Math.ceil(foe.hp)+' / '+foe.spec.hp;}
  const seconds=Math.max(0,Math.ceil(match.duration-match.time));$('timer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');document.querySelector('.match-clock').classList.toggle('urgent',seconds<=15);
  {const me=match.actors[L]||a,ch=me.superCharge||0,full=ch>=1;superHUD($('special-button'),me,0);$('special-button').classList.toggle('cooling',!full);$('special-button').classList.toggle('super-ready',full);$('special-button').style.setProperty('--cooldown',(1-ch)*100+'%');$('special-button').style.setProperty('--charge',ch);$('special-cooldown').textContent=full?'מוכן!':Math.floor(ch*100)+'%';$('special-button').setAttribute('aria-label',me.spec.special+(full?', מוכן':', נטען '+Math.floor(ch*100)+' אחוז'));}
  if(match.time>8)$('arena-tip').style.opacity='0';
  if(b.boss){const phase=b.boss.phase;$('boss-banner').dataset.phase=phase;$('boss-banner').textContent={guard:'מגן קדמי · נסו מהצד',windup:'הסתערות בדרך · זוזו הצדה!',charge:'הסתערות!',recover:'עכשיו! פגיעות חזקות ב־50%'}[phase];}
  if(match.coop){const q=match.actors[2],ch=q.superCharge||0,full=ch>=1;$('special-button-2').classList.toggle('cooling',!full);$('special-button-2').classList.toggle('super-ready',full);$('special-button-2').style.setProperty('--charge',ch);superHUD($('special-button-2'),q,1);
    $('mode-banner').innerHTML=`<span class="mb-side me">${icon('duo')}</span><span class="mb-side foe">${icon('mountain')}${Math.max(0,Math.ceil(b.hp/b.spec.hp*100))}%</span>`;}
  if(match.versus&&!match.online){const ch=b.superCharge||0,full=ch>=1;$('special-button-2').classList.toggle('cooling',!full);$('special-button-2').classList.toggle('super-ready',full);$('special-button-2').style.setProperty('--charge',ch);superHUD($('special-button-2'),b,1);
    if(!match.mode)$('mode-banner').innerHTML=scoreRow(`<b class="mb-score">${versus.wins[0]}</b>`,':',`<b class="mb-score">${versus.wins[1]}</b>`);}
  if(match.mode){const [me,foe]=match.actors;
    if(match.wind){$('mode-banner').innerHTML=scoreRow(icon('feather')+me.feathers+'/'+WIND_TARGET,icon('swirl'),foe.feathers+'/'+WIND_TARGET+icon('feather'));const h=match.wind.holder;$('hold-count').hidden=h<0;if(h>=0){$('hold-count').textContent=Math.ceil(match.wind.hold);$('hold-count').classList.toggle('foe',h!==L);}}
    else if(match.ball){const [s0,s1]=match.ball.score;$('mode-banner').innerHTML=scoreRow(`<b class="mb-score">${s0}</b>`,match.ball.overtime?icon('trophy'):icon('target')+`<small>${BALL_GOALS}</small>`,`<b class="mb-score">${s1}</b>`);}
    else if(match.echo){const E=match.echo;$('mode-banner').innerHTML=scoreRow(`<b class="mb-score">${E.songs[0]}</b>`,E.phase==='listen'?icon('ear'):E.phase==='play'?icon('sound')+`<small>${E.progress[L]??E.progress[0]}/${E.song.length}</small>`:icon('sparkle'),`<b class="mb-score">${E.songs[1]}</b>`);}
    else if(match.trio){const dots=n=>`<span class="trio-dots">${[0,1,2].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;$('mode-banner').innerHTML=scoreRow(dots(trioLeft(match,0)),'',dots(trioLeft(match,1)));}
    else{$('mode-banner').innerHTML=scoreRow(icon('flame')+me.power+'/'+MAX_POWER,match.lava.scale<.99?`<i class="mb-closing">${icon('target')}</i>`:'',foe.power+'/'+MAX_POWER+icon('flame'));}}
  if(match.challenge){const next=match.covers.filter(c=>c.hp>0).sort((a,b)=>a.collapseAt-b.collapseAt)[0];$('challenge-banner').textContent=next?`מחסה מתפורר בעוד ${Math.max(0,Math.ceil(next.collapseAt-match.time))} שנ׳ · המשיכו לזוז`:'הזירה פתוחה · אין יותר מחסות!';}
  if(clock>toastUntil)$('match-toast').classList.remove('visible');
  wonderHUD();cueTick();
}
// The super button tells everything without words: a ring in three parts that click as they fill, two gold pips
// for the landed supers, and the star crown when the Power Form is one press away.
function superHUD(el,a,slot){if(!el||!a)return;const ch=a.superCharge||0,seg=Math.min(3,Math.floor(ch*3+1e-6)),can=!!a.canForm&&!a.formUsed;
  if(seg>(segSeen[slot]??3)&&seg<3&&match.status==='playing')uiSound('segment');segSeen[slot]=seg;
  el.classList.toggle('can-form',can);el.classList.toggle('form-ready',can&&(a.pips||0)>=(sim.FORM_PIPS??2));el.classList.toggle('in-form',(a.form||0)>0);
  el.querySelectorAll('.pips i').forEach((p,i)=>p.classList.toggle('on',i<(a.pips||0)));
  const crown=art?.fx?.['crown-frame'];if(crown?.src&&!el.classList.contains('has-crown-art')){el.style.setProperty('--crown-frame',`url("${crown.src}")`);el.classList.add('has-crown-art');}}
// While a Wonder runs: its picture under the clock with a ring that empties over its twelve seconds. No words.
function wonderHUD(){const W=match?.wonder,el=$('wonder-chip');if(!el)return;const on=W?.state==='active'&&!!W.id;
  if(on){if(el.dataset.id!==W.id){const w=sim.wonderById?.(W.id),sticker=art?.fx?.['wonder-'+W.id];el.dataset.id=W.id;el.innerHTML=(sticker?.src?`<img src="${sticker.src}" alt="">`:icon(w?.icon||'sparkle'))+'<b></b><i class="wonder-ring"></i>';el.style.setProperty('--w',w?.color||'#ffd23a');}
    el.style.setProperty('--p',Math.max(0,Math.min(1,1-(W.age||0)/(sim.WONDER_TIMES?.active||12))).toFixed(3));}
  else el.dataset.id='';if(el.hidden===on)el.hidden=!on;}
function toast(text,seconds=2){$('match-toast').textContent=text;$('match-toast').classList.add('visible');toastUntil=clock+seconds;}
function pauseBattle(e){if(match?.online&&online?.role==='guest'){if(e?.type==='click'){pauseText(true);if(!$('pause-dialog').open)$('pause-dialog').showModal();}else{clearInput();onlineSend({type:'in',...packInput({},online.supers)});}return;}if(!match||screen!=='battle'||match.status==='finished'||match.status==='paused')return;previousStatus=match.status;match.status='paused';clearInput();sound.pause();if(match.online)onlineSend({type:'snap',snap:snapshot(match)});pauseText(false);if(!$('pause-dialog').open)$('pause-dialog').showModal();}
// The friend's phone runs a two-phone battle, so the guest's pause cannot stop it: the dialog says so honestly.
const PAUSE_TEXT={};
function pauseText(guest){const d=$('pause-dialog'),h=d.querySelector('h2'),p=d.querySelector('p');if(!h||!p)return;PAUSE_TEXT.h??=h.textContent;PAUSE_TEXT.p??=p.textContent;h.textContent=guest?'הקרב ממשיך':PAUSE_TEXT.h;p.textContent=guest?'בקרב משני טלפונים אין עצירה: היצור שלכם עדיין בזירה. חוזרים מהר!':PAUSE_TEXT.p;}
function resumeBattle(){if(match?.online&&online?.role==='guest'){$('pause-dialog').close();return;}if(!match||match.status!=='paused'){if($('pause-dialog').open)$('pause-dialog').close();return;}$('pause-dialog').close();match.status=previousStatus;clearInput();accumulator=0;sound.resume();$('arena').focus({preventScroll:true});}
function leaveBattle(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());slows=[];sound.setMusicRate?.(1);
  // A two-phone battle (running, or just over) always leads back to the room while the friend is still linked.
  if(match?.online||!match&&mode==='online'&&online){if(match?.online&&match.status!=='finished')onlineSend({type:'abort'});match=null;showView('online');return;}match=null;showView(mode==='versus'||mode==='coop'?'versus':mode==='tower'?'tower':mode==='league'?'league':mode==='story'?'story':mode==='quick'?'lobby':mode==='wild'?(wildTarget&&!isUnlocked(profile,wildTarget)?'wild':'lobby'):journeyView(profile));}
function onFinish(){
  if(match.online){finishOnline();return;}
  if(match.versus){finishVersusRound();return;}
  if(match.coop){finishCoop();return;}
  const boxStart=profile.box.earned,sparkStart=sparkTotal(profile.box,SPARKS_PER_BOX);
  const finalWin=mode==='cup'&&cupFinal&&match.winner===0;
  const storyResult=mode==='story'?recordStory(profile,match):null;if(storyResult&&!storyResult.replay)storyEvent=storyResult;
  const hero=match.actors[0].id,winsBefore=profile.creatures[hero]?.wins||0,xpBefore=profile.creatures[hero]?.xp||0,wildId=storyResult?.released||match.wild,wasLocked=!!storyResult?.released||(wildId&&!isUnlocked(profile,wildId));
  const levelBefore=creatureLevel(profile,hero),formBefore=formOn(hero),leagueResult=mode==='league'?recordLeague(profile,match):null,towerResult=mode==='tower'?recordTower(profile,match):null;
  recordResult(profile,match,mode);const wonder=rules.recordWonder?.(profile,match)||null;rules.recordFormUse?.(profile,match);persist();
  refreshTodayGoals();const daily=progressDaily(profile,{win:match.winner===0,creature:hero,supers:match.actors[0].stats.specials,mode,towerCleared:!!towerResult?.won,storyStep:!!(storyResult&&!storyResult.replay),replayStars:storyResult?.replay?storyResult.stars:0});persist();clearInput();
  const winsAfter=profile.creatures[hero]?.wins||0,newSkin=SKINS.find(k=>k.wins>winsBefore&&k.wins<=winsAfter),released=wasLocked&&isUnlocked(profile,wildId),freed=released?CREATURES[wildId]:null;
  const p=match.actors[0],r=match.actors[1],rc=CREATURES[r.id],stats=resultStats(match),win=match.winner===0,draw=match.winner===-1;
  const challengeWin=mode==='challenge'&&win;
  const missionStep=match.story&&STEPS.find(s=>s.id===match.story&&s.kind==='mission');
  // The stamp says it in a word or two; the longer story of the battle waits behind the "?" button.
  let stamp=match.mode&&win?(missionStep?'המשימה הושלמה!':'ניצחון!'):storyResult?.step.kind==='mirror'?'ניצחתם את הפחד!':storyResult?.lit&&!released?'האור נדלק!':freed?freed.name+byGender(freed,' השתחרר!',' השתחררה!'):finalWin?'הגביע שלכם!':challengeWin?'הזירה שלכם!':win?'ניצחון!':draw?'תיקו!':'כמעט!';
  let sub=match.mode&&win?(storyResult?.stars?(storyResult.stars===3?'מושלם! שלושה כוכבים.':'רוצים שלושה כוכבים? אפשר לשחק שוב מהמפה.'):({wind:'החזקתם את הרוח עד הסוף!',lava:'שרדתם את טבעת הלבה!',ball:'איזה משחק! '+match.ball?.score.join(' : '),trio:'השלישייה שלכם ניצחה ביחד!',echo:'השלמתם את המנגינות!'})[match.mode]||'כל הכבוד!'):match.mode&&missionStep?(missionEased(profile,missionStep)?'בניסיון הבא יהיה קצת יותר קל. אתם יכולים!':MISSION_TIP[match.mode]||'עוד ניסיון אחד, ואתם שם!'):storyResult?.step.kind==='mirror'?'האור הלבן נדלק בשרשרת, והכוכב הזהוב מוביל לטירה.':mode==='story'&&!win?(draw?'כמעט! עוד ניסיון אחד.':'הצל הקטן מאמין בכם. מנסים שוב, אולי בדרך אחרת?'):freed&&storyResult?.lit?freed.name+byGender(freed,' השתחרר',' השתחררה')+', והאור '+islandOf(storyResult.lit).gemName+' נדלק בשרשרת!':freed?freed.name+byGender(freed,' מצטרף לנבחרת, והקלף שלו מחכה שתהפכו אותו!',' מצטרפת לנבחרת, והקלף שלה מחכה שתהפכו אותו!'):mode==='wild'?rc.name+' עדיין '+byGender(rc,'פראי','פראית')+'. '+(draw?'עוד ניסיון?':'כל ניסיון מלמד משהו חדש.'):finalWin?'זכיתם בגביע! נפתחה הזירה המתפוררת, והשילוב שלכם ממשיך איתכם.':challengeWin?'השלמתם את כל ארבעת האתגרים! התג נוסף להישגים שלכם.':win?(mode==='cup'?`השלמתם ${profile.cup.stage} מתוך 4 אתגרים. עכשיו בוחרים כוח, ואז ${CUP[profile.cup.stage].title} מול ${CREATURES[CUP[profile.cup.stage].rival].name}.`:'ניצחון באימון! עוד קרב, או ממשיכים במסע.'):draw?'אותו אחוז חיים נשאר לשני היצורים. מנסים שוב?':mode==='quick'?'לכל יריב יש נקודת חולשה. מנסים דרך אחרת?':'השלב והכוחות שלכם נשמרו. מנסים שוב בדרך אחרת?';
  if(towerResult){stamp=towerResult.won?(match.tower.guard?'השומר הובס!':'קומה '+towerResult.cleared+'!'):'כמעט!';sub=towerResult.won?(towerResult.record?'שיא חדש במגדל!':'ממשיכים לטפס.')+(towerResult.pick?' עכשיו בוחרים כוח חדש לטיפוס.':''):towerResult.retry?'כוכב ההצלה שלכם נדלק: מנסים שוב את קומה '+towerResult.floor+'.':'הגעתם לקומה '+towerResult.floor+'. השיא שלכם: קומה '+towerResult.best+'.';}
  if(leagueResult){sub=leagueResult.rankUp?'עליתם לדרגת '+leagueResult.rankUp.name+'!':win?'עוד '+(nextPrizeAt(profile)-profile.league.best)+' גביעים לתיבה הבאה בדרך.':draw?'צמוד! הגביעים נשארו במקום.':leagueResult.delta?'הקרב הבא יהיה קצת יותר קל. אתם יכולים!':'עד '+LEAGUE_SAFE+' גביעים הפסד לא מוריד כלום.';}
  if(storyResult?.replay){stamp=storyResult.improved?'שיא חדש!':win?'ניצחון!':'כמעט!';if(win)sub=storyResult.stars===3?'שלושה כוכבים! מושלם.':storyResult.improved?'השיא החדש שלכם: '+storyResult.stars+' כוכבים.':'השיא שלכם: '+storyResult.best+' כוכבים. אפשר לנסות שוב.';}
  // The tip names what this rival does, from the same advice the briefing gives.
  let tip=r.boss?(stats.weakHits>0?`ניצלתם את רגע ההתאוששות של סלעוז ${stats.weakHits} פעמים!`:bossAdvice):win?p.spec.tip:match.mirror?'הבבואה זזה כמוכם. הפתיעו אותה מהצד.':rivalAdvice[r.id]||'זוזו הצידה מהירי, ותקפו כשהיריב עוצר.';
  if(match.reason==='time')tip=match.ball?'הזמן נגמר: מי שהבקיע יותר גולים ניצח.':match.trio?'הזמן נגמר: מי שנשארו לו יותר יצורים ניצח.':'הזמן נגמר: הניצחון נקבע לפי אחוז החיים שנותר לכל יצור.';
  const starCount=win?(storyResult?.stars||(p.hp/p.spec.hp>=.5?3:p.hp/p.spec.hp>=.25?2:1)):0;
  const kicker=`${mode==='cup'?'גביע החופים':mode==='challenge'?CHALLENGE.title:mode==='wild'?'קרב פרא':mode==='story'?(inChapter2(profile)?'פרק 2 · המפריד במסכה':'מסע השרשרת'):mode==='league'?'ליגת היצורים':mode==='tower'?'מגדל המסכה':'אימון · קרב בודד'} · ${LEVELS[match.level].name}`;
  sessionTick();if(typeof queueNext==='function')queueNext(mode);lastArena=match.arena||null;
  const formNew=!formBefore&&formOn(hero);if(formNew)formWaiting=hero;
  // What the big button does. Story keeps its own targets: the card to flip, the map.
  const again=m=>()=>startBattle(m),toCampfire=()=>{match=null;showView('campfire');};
  let base;
  if(released)base={label:'הופכים את הקלף!',icon:'cards',go:()=>{match=null;pendingReveal=!!storyResult;showView(storyResult?'story':'cards');revealCard(wildId,{joined:true,back:storyResult?'story':null});pendingReveal=false;}};
  else if(storyResult)base={label:inChapter2(profile)?'חזרה למפה':'חזרה למפת השרשרת',icon:'arrow',go:()=>{match=null;showView('story');}};
  else if(finalWin)base={label:'לאתגר החדש שנפתח',icon:'arrow',go:continueJourney};
  else if(challengeWin)base={label:'לצפייה בתג שלי',icon:'trophy',go:()=>{match=null;showView('records');}};
  else if(mode==='cup'&&win)base={label:'בוחרים כוח וממשיכים',icon:'arrow',go:()=>{match=null;showView('workshop');}};
  else if(towerResult&&!towerResult.retry&&!(towerResult.won&&!towerResult.pick))base={label:towerResult.pick?'בוחרים כוח':'טיפוס חדש',icon:'tower',go:()=>{match=null;showView('tower');}};
  else base={label:['league','quick'].includes(mode)?'עוד קרב!':towerResult?.won?'לקומה '+(profile.tower.run?.floor||'')+'!':draw?'קרב הכרעה':'מנסים שוב!',icon:'play',battle:true,next:['league','quick','tower'].includes(mode),go:again(mode)};
  let primary=base,secondary=mode==='league'?{label:'דרך הגביעים',go:()=>{match=null;showView('league');}}:towerResult&&base.battle?{label:'למגדל',go:()=>{match=null;showView('tower');}}:mode==='quick'&&win&&currentStep(profile)?{label:'ממשיכים במסע',go:()=>{match=null;goStory();}}:mode==='story'&&!storyResult?{label:inChapter2(profile)?'למפה':'למפת השרשרת',go:()=>{match=null;showView('story');}}:null;
  // After about ten battles or twenty-five minutes the big button is the campfire; one more battle is still a small button.
  const rest=campfireDue();
  if(rest&&primary.battle){secondary={label:primary.label.replace('!',''),battle:true,go:primary.go};primary={label:'מנוחה ליד המדורה',icon:'campfire',go:toCampfire};}
  let pv=primary.next&&typeof nextPreview==='function'?nextPreview():null;
  // A form unlocked in this battle: the big button opens the ritual first. A next battle (or the campfire) never starts from the ritual:
  // the result comes back with its calm big button and the next rival's face.
  if(formNew&&!released){const later={primary,secondary,preview:pv&&pv.mode===mode?pv:null,homeCampfire:rest&&!primary.battle&&primary.go!==toCampfire},back=primary.battle||primary.go===toCampfire?()=>resultAgain(later):primary.go;
    primary={label:'צורת־עוצמה חדשה!',icon:'crown',form:true,go:()=>openRitual(hero,{back})};pv=null;}
  const team=!rest&&!released&&!match.trio&&(['league','quick','wild'].includes(mode)||mode==='story'&&!storyResult)?mostPlayed(profile.creatures,Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),hero,5):[];
  // Chips: what moved in this battle, in pictures.
  const chips=[];
  if(leagueResult){const d=leagueResult.delta;chips.push(`<div class="rchip league${d>0?' up':d<0?' down':''}">${rankBadge(leagueResult.rank)}<b dir="ltr" data-count="${d}">${d>0?'+':d<0?'−':''}${Math.abs(d)}</b>${icon('trophy')}${leagueResult.rankUp?`<em>${esc(leagueResult.rankUp.name)}!</em>`:''}</div>`);}
  if(towerResult)chips.push(`<div class="rchip tower"><span class="tower-badge">${icon('tower')}</span><b>${towerResult.won?'קומה '+towerResult.cleared+' ✓':towerResult.retry?'כוכב הצלה':'קומה '+towerResult.floor}</b>${towerResult.record?'<em>שיא!</em>':''}</div>`);
  if(match.ball||match.trio){const s=match.ball?match.ball.score:[trioLeft(match,0)+'/3',trioLeft(match,1)+'/3'];chips.push(`<div class="rchip score"><b>${s[0]} : ${s[1]}</b></div>`);}
  chips.push(xpChip(hero,xpBefore,levelBefore,formBefore));
  if(newSkin)chips.push(`<div class="rchip unlock" style="--c:${p.spec.color}"><span class="skin-swatch skin-${newSkin.id}"></span><b>${esc(newSkin.name)}</b><button class="button secondary" id="result-wear" type="button">ללבוש!</button></div>`);
  if(wonder){const w=rules.wonderById?.(wonder.id)||wonderList().find(x=>x.id===wonder.id)||{id:wonder.id,name:'',icon:'sparkle'};chips.push(`<div class="rchip wonder${wonder.first?' first':''}" style="--w:${w.color||'#ffd23a'}" title="${esc(w.name)}"><span class="wonder-fly">${stickerArt(w)}</span><span class="rchip-book">${icon('book')}</span><b dir="ltr">${wonder.first?'+1':'×'+wonder.count}</b></div>`);}
  if(daily.bonus||daily.moved.some(g=>g.done))chips.push(`<div class="rchip goals">${icon('target')}<span class="goals-dots">${profile.daily.goals.map(g=>`<i class="${g.done?'on':''}"></i>`).join('')}</span>${daily.bonus?chestHTML('gold',{mini:true}):''}</div>`);
  if(!win&&!towerResult&&!(leagueResult?.delta<0))chips.push(`<div class="rchip safe">${icon('shield')}<b>הכל שמור</b></div>`);
  // Sparks fly into the box meter one by one; boxes from the road, the tower or the goals pop the chest too.
  const directBoxes=(leagueResult?.boxes||0)+(towerResult?.boxes||0)+(daily.bonus?1:0),gained=Math.max(0,sparkTotal(profile.box,SPARKS_PER_BOX)-sparkStart-directBoxes*SPARKS_PER_BOX),newBoxes=profile.box.earned-boxStart,waiting=boxesWaiting(profile)+(profile.box.pending?1:0);
  const sparksHTML=`<span class="rs-label">${gained?`<b dir="ltr">+${gained}</b> ${sparkWord(gained)}`:''}</span><span class="spark-meter big">${sparkMeter(sparkStart%SPARKS_PER_BOX)}</span><span class="rs-chest">${chestHTML(profile.box.pending?'gold':boxTier(profile.box.opened),{mini:true})}<b class="rs-new" dir="ltr">+${newBoxes}</b></span>${waiting&&!released?`<button class="button secondary rs-open" id="result-box-open" type="button">פותחים!${waiting>1?`<small>${waiting}</small>`:''}</button>`:''}`;
  resultLayout({hero,skin:skinOf(profile,hero),win,stamp,kicker,stars:starCount,chips,sparksHTML,steps:sparkSteps(sparkStart,sparkStart+gained,SPARKS_PER_BOX),newBoxes,newSkin,mode,
    content:`<p class="result-sub">${esc(sub)}</p>${tip?`<p class="result-tip">${esc(tip)}</p>`:''}`,primary,secondary,team,homeCampfire:rest&&!primary.battle&&primary.go!==toCampfire,preview:pv&&pv.mode===mode?pv:null});
  showResult(match,{voice:win?'voice-victory':null});
}
// ------------------------------------------------------------------ the league and creature levels
const rankBadge=(rank,{big=false}={})=>`<span class="rank-shield${big?' big':''}" style="--r:${rank.color}">${icon('trophy')}</span>`;
function renderLeagueStrip(){
  const L=profile.league,rank=rankOf(L.trophies),next=nextPrizeAt(profile),prev=next-PRIZE_EVERY;
  $('home-rank').innerHTML=rankBadge(rank);$('home-league-title').innerHTML='<span class="strip-long">ליגה · '+rank.name+' · </span><span class="strip-short">ליגה · </span>'+L.trophies+' 🏆';$('home-league-bar').style.width=Math.round((L.best-prev)/PRIZE_EVERY*100)+'%';
}
function renderLeague(){
  const L=profile.league,rank=rankOf(L.trophies),up=nextRank(L.trophies),next=nextPrizeAt(profile),prev=next-PRIZE_EVERY;
  $('league-badge').innerHTML=rankBadge(rank,{big:true});$('league-rank').textContent='דרגת '+rank.name;
  $('league-trophies').textContent=L.trophies+' גביעים'+(up?' · עוד '+(up.at-L.trophies)+' לדרגת '+up.name:' · הדרגה הכי גבוהה!')+' · היריבים ברמת '+LEVELS[leagueLevel(profile)].name;
  $('league-next').textContent='התיבה הבאה בעוד '+(next-L.best)+' גביעים';$('league-bar').style.width=Math.round((L.best-prev)/PRIZE_EVERY*100)+'%';
  // The road: a few prizes behind, the next one, and what waits ahead. A new rank gives one more box.
  const first=Math.max(PRIZE_EVERY,prev-PRIZE_EVERY*2),stops=[...new Set([...Array.from({length:8},(_,i)=>first+i*PRIZE_EVERY),...RANKS.map(k=>k.at).filter(at=>at>=first)])].sort((x,y)=>x-y).slice(0,8);
  $('league-road').innerHTML=stops.map(t=>{const r=RANKS.find(k=>k.at===t),got=L.best>=t,isNext=t===next;return `<li class="road-stop${got?' got':''}${isNext?' next':''}">${r?rankBadge(r):chestHTML(got?'wood':isNext?'silver':'wood',{mini:true})}<b>${t}</b><small>${got?'✓':r?'דרגת '+r.name:isNext?'הבאה':''}</small></li>`;}).join('');
  const ids=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id));if(!ids.includes(profile.selected))profile.selected='maimi';
  $('league-fighters').innerHTML=ids.map(f=>`<button class="fighter-chip${f===profile.selected?' chosen':''}" data-league-fighter="${f}" aria-pressed="${f===profile.selected}" style="--c:${CREATURES[f].color}"><canvas id="lchip-${f}" aria-hidden="true"></canvas><b>${CREATURES[f].name}</b><small class="chip-level">רמה ${creatureLevel(profile,f)}</small></button>`).join('');
  for(const f of ids)livePortrait('lchip-'+f,f,{skin:skinOf(profile,f)});
  document.querySelectorAll('[data-league-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.leagueFighter;persist();sound.click();renderLeague();});
}
// ------------------------------------------------------------------ the result: a four-second show, then one calm tap
// 0 s the stamp, the creature and its stars; 1.2 s the chips; 2.4 s the sparks; 3.4 s the buttons. Any tap jumps to the buttons.
const BEAT=[0,1200,2400,3400],RESULT_DELAY=1200;
let stage={run:null,timers:[],flights:[]},resultWait=0,lastArena=null;
// Sounds of the result and the ritual; a short tone until the new sound kit is there.
function ding(kind,i=0){
  if(kind==='stamp')sound.stamp?sound.stamp():sound.tone?.(150,.18,'triangle',.2,-70);
  else if(kind==='star')sound.starNote?sound.starNote(i):sound.tone?.([523,659,784][i]||784,.35,'triangle',.12);
  else if(kind==='spark')sound.sparkPluck?sound.sparkPluck(i):sound.tone?.(880*2**(Math.min(i,9)/12),.12,'sine',.07);
  else if(kind==='ready'||kind==='hold')sound.uiClick?sound.uiClick(kind):sound.tone?.(kind==='ready'?988:660,.07,'sine',.05,kind==='ready'?120:0);
}
// The creature's bar: before its Power Form it runs to the crown, with a dot for each win still to go; then it shows the level.
function xpChip(id,xpBefore,levelBefore,formBefore){
  const c=CREATURES[id];if(!c||!profile.creatures[id])return '';
  const X=XP_TABLE(),xp=profile.creatures[id].xp||0,lv=creatureLevel(profile,id),crossed=formOn(id)&&!formBefore;
  if(!formOn(id)||crossed){const pct=v=>Math.round(Math.min(1,v/FORM_XP())*100);
    return `<div class="rchip xp to-form${crossed?' crossed':''}" style="--c:${c.color}"><b>${esc(c.name)}</b><span class="xp-bar" style="--from:${pct(xpBefore)}%;--to:${pct(xp)}%"><i></i></span><span class="xp-crown">${crownArt()}</span>${crossed?'<em>עוצמה!</em>':`<span class="form-dots">${dotsHTML(formToGo(id))}</span>`}</div>`;}
  const at=v=>{let l=0;while(l<X.length-1&&v>=X[l+1])l++;return l>=X.length-1?100:Math.round((v-X[l])/(X[l+1]-X[l])*100);},up=lv>levelBefore;
  return `<div class="rchip xp${up?' up':''}" style="--c:${c.color}"><span class="xp-crown">${crownArt()}</span><b>${up?'רמה '+lv+'!':'רמה '+lv}</b><span class="xp-bar" style="--from:${up?0:at(xpBefore)}%;--to:${at(xp)}%"><i></i></span></div>`;
}
function stageStop(){stage.timers.forEach(clearTimeout);stage.timers=[];stage.flights.forEach(f=>f.cancel());stage.flights=[];}
// Fills the window: the stage for one child's battle, or the plain words of a friend battle. The buttons wait asleep.
function resultLayout(R){
  const d=$('result-dialog'),plain=!!R.plain;stageStop();clearTimeout(resultWait);
  d.classList.toggle('stage',!plain);d.classList.toggle('plain',plain);d.classList.remove('b1','b2','b3','b4','show-tip','won','lost');if(!plain)d.classList.add(R.win?'won':'lost');
  if(!plain){
    const img=$('result-stamp').querySelector('img'),src=fxSrc('stamp');img.hidden=!src;if(src)img.src=src;$('result-stamp').classList.toggle('painted',!!src);
    $('result-stamp-text').textContent=R.stamp;$('result-stamp').classList.toggle('long',R.stamp.length>11);
    livePortrait('result-portrait',R.hero,{skin:R.skin,clip:R.win?'attack':'idle'});
    $('result-stars').hidden=!R.stars;$('result-stars').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<R.stars?'earned':''}">${icon('star')}</span>`).join('');
    $('result-kicker').textContent=R.kicker;$('result-chips').innerHTML=R.chips.filter(Boolean).join('');$('result-sparks').innerHTML=R.sparksHTML||'';$('result-sparks').hidden=!R.sparksHTML;
    $('result-content').innerHTML=R.content;
    $('result-box-open')?.addEventListener('click',()=>{$('result-dialog').close();match=null;sound.click();showView('boxes');});
    $('result-wear')?.addEventListener('click',e=>{if(!chooseSkin(profile,R.hero,R.newSkin.id))return;persist();sound.click();stage.run.skin=R.newSkin.id;e.currentTarget.outerHTML='<span class="worn">✓</span>';livePortrait('result-portrait',R.hero,{skin:R.newSkin.id});});
  }
  const P=$('result-primary'),A=R.primary;P.className='button primary full result-primary'+(R.preview?' with-next':'')+(A.form?' form-new':'');
  P.innerHTML=R.preview?`<span class="next-face"><img src="${arenaPicture(R.preview.arena)}" alt=""><canvas id="result-next" aria-hidden="true"></canvas></span><b>${esc(A.label)}</b>`:`${A.icon?icon(A.icon):''}<b>${esc(A.label)}</b>`;
  if(R.preview)livePortrait('result-next',R.preview.rival,{still:true});
  const S=$('result-secondary');S.hidden=!R.secondary;S.onclick=null;if(R.secondary){S.textContent=R.secondary.label;S.className='button secondary full'+(R.secondary.battle?' again':'');}
  const T=$('result-team'),team=plain?[]:R.team||[];T.hidden=!team.length;
  T.innerHTML=team.map(id=>`<button type="button" class="result-pick${id===R.hero?' chosen':''}" data-result-pick="${id}" style="--c:${CREATURES[id].color}" aria-label="עוד קרב עם ${CREATURES[id].name}"><canvas id="result-pick-${id}" aria-hidden="true"></canvas></button>`).join('');
  for(const id of team)livePortrait('result-pick-'+id,id,{skin:skinOf(profile,id),still:true});
  $('result-home').hidden=plain;$('result-home').innerHTML=icon(R.homeCampfire?'campfire':'home');$('result-home').setAttribute('aria-label',R.homeCampfire?'מנוחה ליד המדורה':'הביתה');$('result-tip').hidden=plain;$('result-tip').setAttribute('aria-expanded','false');
  d.querySelector('.result-actions').inert=!plain;
  stage.run={...R,actionsShown:false};
}
// After the ritual the same result comes back, its show already over, with the calm big button (it wakes after a lifted finger).
function resultAgain(o){const R=stage.run;if(!R||!match)return;resultLayout({...R,...o});const d=$('result-dialog');if(!d.open)d.showModal();d.focus({preventScroll:true});d.scrollTop=0;dialogPortraits();finishBeats();}
// Friend battles keep their own words, and share the window, the session count and the calm big button.
function plainResult(R){resultLayout({...R,plain:true});showResult(match,{voice:R.voice});}
// The window opens 1.2 s after the finish, and only once the freeing finale is over. It opens at the top, on the window itself.
function showResult(shown,{voice=null}={}){
  clearTimeout(resultWait);const t0=performance.now();
  const tick=()=>{
    if(match!==shown)return;const age=performance.now()-t0,left=typeof finaleLeft==='function'?finaleLeft():0;
    if((age<RESULT_DELAY||left>0)&&age<9000){resultWait=setTimeout(tick,100);return;}
    const d=$('result-dialog');if(d.open)return;if($('pause-dialog').open)$('pause-dialog').close();
    sound.setScene('lobby');if(voice)sound.play(voice,{delay:.35});
    d.showModal();d.focus({preventScroll:true});d.scrollTop=0;requestAnimationFrame(()=>{d.scrollTop=0;});
    dialogPortraits();if(stage.run?.plain)showActions();else runBeats();
  };
  resultWait=setTimeout(tick,100);
}
function runBeats(){
  const R=stage.run,d=$('result-dialog');if(!R)return;stageStop();
  const at=(ms,f)=>stage.timers.push(setTimeout(f,ms));
  d.classList.add('b1');ding('stamp');
  $('result-stars').querySelectorAll('span.earned').forEach((s,i)=>at(380+i*300,()=>{s.classList.add('on');ding('star',i);}));
  if(R.win)at(1000,()=>livePortrait('result-portrait',R.hero,{skin:R.skin}));
  at(BEAT[1],()=>{d.classList.add('b2');countUp();});
  at(BEAT[2],()=>{d.classList.add('b3');R.steps.forEach((s,i)=>at(i*230,()=>sparkTo(s,i)));at(R.steps.length*230+420,()=>{document.querySelectorAll('#result-sparks .spark-meter i').forEach((e,j)=>e.classList.toggle('on',j<profile.box.sparks));if(R.newBoxes)document.querySelector('#result-sparks .rs-chest')?.classList.add('got');});});
  at(Math.max(BEAT[3],BEAT[2]+R.steps.length*230+450),showActions);
}
function countUp(){document.querySelectorAll('#result-chips [data-count]').forEach(b=>{const n=+b.dataset.count,sign=n>0?'+':n<0?'−':'';let k=0;const step=()=>{k++;b.textContent=sign+Math.round(Math.abs(n)*Math.min(1,k/10));if(k<10)stage.timers.push(setTimeout(step,45));};step();});}
// Each spark flies from the creature into its diamond, then lights it; the third one pops the chest.
function sparkTo(s,i){
  const m=[...document.querySelectorAll('#result-sparks .spark-meter i')],to=m[s.lit-1],from=document.querySelector('#result-stage .result-spot'),d=$('result-dialog');
  const land=()=>{m.forEach((e,j)=>e.classList.toggle('on',j<s.lit));if(to){to.classList.remove('pop');void to.offsetWidth;to.classList.add('pop');}ding('spark',i);
    if(s.box){const c=document.querySelector('#result-sparks .rs-chest');if(c){c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop','got');}if(stage.run&&!stage.run.rung){stage.run.rung=true;sound.sting?.('sting-reward',{v:.85});}}};
  if(!to||!from||!Element.prototype.animate||matchMedia('(prefers-reduced-motion: reduce)').matches){land();return;}
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),o=d.getBoundingClientRect(),x=a.left+a.width/2,y=a.top+a.height*.45,f=document.createElement('i');
  f.className='spark-fly';f.style.left=(x-o.left-d.clientLeft)+'px';f.style.top=(y-o.top-d.clientTop)+'px';d.appendChild(f);
  const fly=f.animate([{transform:'translate(-50%,-50%) rotate(45deg) scale(.5)',opacity:0},{opacity:1,offset:.2},{transform:`translate(calc(-50% + ${b.left+b.width/2-x}px),calc(-50% + ${b.top+b.height/2-y}px)) rotate(45deg) scale(1)`,opacity:1}],{duration:360,easing:'cubic-bezier(.4,0,.2,1)'});
  stage.flights.push(fly);fly.onfinish=()=>{f.remove();land();};fly.oncancel=()=>f.remove();
}
// A tap during the show jumps straight to the end of it.
function finishBeats(){
  const R=stage.run,d=$('result-dialog');if(!R||R.actionsShown)return;stageStop();d.classList.add('b1','b2','b3');
  $('result-stars').querySelectorAll('span.earned').forEach(s=>s.classList.add('on'));
  document.querySelectorAll('#result-chips [data-count]').forEach(b=>{const n=+b.dataset.count;b.textContent=(n>0?'+':n<0?'−':'')+Math.abs(n);});
  document.querySelectorAll('#result-sparks .spark-meter i').forEach((e,j)=>e.classList.toggle('on',j<profile.box.sparks));
  if(R.newBoxes)document.querySelector('#result-sparks .rs-chest')?.classList.add('got');
  livePortrait('result-portrait',R.hero,{skin:R.skin});showActions();
}
function showActions(){
  const R=stage.run,d=$('result-dialog');if(!R||R.actionsShown)return;R.actionsShown=true;d.classList.add('b4');d.querySelector('.result-actions').inert=false;
  const close=f=>()=>{d.close();f();};
  armPrimary($('result-primary'),close(R.primary.go));
  if(R.secondary){if(R.secondary.battle)armPrimary($('result-secondary'),close(R.secondary.go));else $('result-secondary').onclick=close(()=>{sound.click();R.secondary.go();});}
  document.querySelectorAll('[data-result-pick]').forEach(el=>armPrimary(el,close(()=>{profile.selected=el.dataset.resultPick;persist();startBattle(R.mode);})));
  $('result-home').onclick=close(()=>{match=null;sound.click();showView(R.homeCampfire?'campfire':'lobby');});
  $('result-tip').onclick=()=>{const on=d.classList.toggle('show-tip');$('result-tip').setAttribute('aria-expanded',String(on));sound.click();};
}
// ------------------------------------------------------------------ the calm big button
// It wakes only for a fresh press: 600 ms after it appeared, 600 ms after the last finger or fire key lifted,
// with nothing else held. A thumb still on the fire button never starts a battle. No autoplay, no countdown.
const held=new Map(),armed=new Set(),WAKE_KEYS=['Space','Enter','NumpadEnter','KeyJ'];let lastLift=0,armTimer=0;
function trackInput(){
  const lift=k=>{if(held.delete(k))lastLift=performance.now();};
  window.addEventListener('pointerdown',e=>held.set('p'+e.pointerId,performance.now()),true);
  for(const t of ['pointerup','pointercancel'])window.addEventListener(t,e=>lift('p'+e.pointerId),true);
  window.addEventListener('touchend',e=>{if(e.touches.length)return;let any=false;for(const k of [...held.keys()])if(k[0]==='p'){held.delete(k);any=true;}if(any)lastLift=performance.now();},true);
  window.addEventListener('keydown',e=>{if(WAKE_KEYS.includes(e.code)&&!e.repeat)held.set('k'+e.code,performance.now());},true);
  window.addEventListener('keyup',e=>lift('k'+e.code),true);
  window.addEventListener('blur',()=>held.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)held.clear();});
}
function armPrimary(btn,go){
  btn._arm={shownAt:performance.now(),go,awake:false};btn._press=null;btn.classList.add('sleep');btn.classList.remove('awake');btn.setAttribute('aria-disabled','true');armed.add(btn);
  btn.onpointerdown=e=>{const now=performance.now(),others=[...held.keys()].filter(k=>k!=='p'+e.pointerId).length;btn._press={at:now,ok:!!btn._arm&&pressWakes({at:now,shownAt:btn._arm.shownAt,lastUp:lastLift,held:others})};};
  btn.onclick=e=>{const a=btn._arm;if(!a)return;const ok=e.detail===0?a.awake:!!btn._press?.ok&&performance.now()-btn._press.at<3000;btn._press=null;
    if(!ok){btn.classList.remove('nudge');void btn.offsetWidth;btn.classList.add('nudge');return;}
    disarm();a.go();};
  if(!armTimer)armTimer=setInterval(armWatch,100);
}
function armWatch(){
  let woke=false;const now=performance.now();
  for(const b of armed){if(!b.isConnected||!b.closest('dialog[open]')||!b._arm){armed.delete(b);continue;}const a=b._arm;if(a.awake)continue;
    if(pressWakes({at:now,shownAt:a.shownAt,lastUp:lastLift,held:held.size})){a.awake=true;b.classList.remove('sleep');b.classList.add('awake');b.removeAttribute('aria-disabled');woke=true;}}
  if(woke)ding('ready');
  if(!armed.size){clearInterval(armTimer);armTimer=0;}
}
function disarm(){for(const b of armed){b._arm=null;b.classList.remove('sleep','awake');b.removeAttribute('aria-disabled');}armed.clear();}
// Pictures inside an open window keep moving after the finish, until the battle loop draws them itself.
let dialogLoop=0;
function dialogPortraits(){
  if(dialogLoop||typeof timeScale==='function')return;let last=null;
  const tick=now=>{dialogLoop=0;if(screen!=='battle'||!document.querySelector('dialog[open]'))return;const dt=last==null?0:Math.max(0,Math.min(.1,(now-last)/1000));last=now;
    for(const [canvasId,entry] of portraits){const el=$(canvasId),o=entry.opts;if(!el||!el.closest('dialog[open]'))continue;if(o.still){if(now-(entry.drawn||0)<250)continue;entry.drawn=now;}
      drawPortrait(el,entry.puppet,entry.id,clock,dt*(o.speed??1),{active:true,skin:o.skin||null,form:!!o.form,clip:o.clip||'idle',glowColor:o.glowColor||null});}
    dialogLoop=requestAnimationFrame(tick);};
  dialogLoop=requestAnimationFrame(tick);
}
// ------------------------------------------------------------------ the session and the campfire
// A gentle stopping point: after about ten battles or twenty-five minutes the big button becomes the campfire.
// There is no reward for going on and no penalty for stopping; a rest at the fire starts the count again.
const SESSION_KEY=storagePrefix+'creature-league.session';let sessionMemo=null;
function readSession(){try{const v=sessionStorage.getItem(SESSION_KEY);if(v)return JSON.parse(v);}catch{}return sessionMemo;}
function writeSession(s){sessionMemo=s;try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));}catch{}}
function sessionTick(){const s=sessionAfterBattle(readSession(),Date.now());writeSession(s);return s;}
function campfireDue(){return campfireReady(readSession(),Date.now());}
function renderCampfire(){
  const id=isUnlocked(profile,profile.selected)?profile.selected:'maimi';
  $('campfire-arena').src=arenaPicture(lastArena||'wind');livePortrait('campfire-portrait',id,{skin:skinOf(profile,id),speed:.5});
  say('campfire-guide','איזה יום! עכשיו כולם נחים ליד המדורה.',{voice:'voice-shadow-hello'});
  sound.setScene('campfire');sound.sting?.('sting-campfire',{delay:.2});writeSession(sessionRested(Date.now()));
}
// ------------------------------------------------------------------ meta controls, bound once
let metaBound=false;
function metaInit(){
  if(metaBound)return;metaBound=true;trackInput();
  // Screens that fill a sideways phone measure the bar above them.
  {const bar=document.querySelector('.header'),fit=()=>document.documentElement.style.setProperty('--header-h',(bar?.offsetHeight||0)+'px');fit();if(window.ResizeObserver&&bar)new ResizeObserver(fit).observe(bar);window.addEventListener('resize',fit);}
  document.querySelectorAll('.ritual-thumb').forEach(el=>{const i=+el.dataset.thumb;
    el.addEventListener('pointerdown',e=>{e.preventDefault();if(!ritual||ritual.done)return;ritual.held[i]=e.pointerId;try{el.setPointerCapture(e.pointerId);}catch{}el.classList.add('held');sound.unlock?.();});
    for(const t of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(t,e=>{if(ritual&&ritual.held[i]===e.pointerId)ritual.held[i]=null;el.classList.remove('held');});
    el.addEventListener('contextmenu',e=>e.preventDefault());});
  $('ritual-skip').onclick=()=>{sound.click();ritualFlip();};
  // Space holds the ritual on a computer.
  window.addEventListener('keydown',e=>{if(e.code==='Space'&&ritual&&!ritual.done&&$('reveal-dialog').open){e.preventDefault();ritual.key=true;}});
  window.addEventListener('keyup',e=>{if(e.code==='Space'&&ritual){if(!ritual.done)e.preventDefault();ritual.key=false;}});
  // A ritual closed early still counts as shown: its crown waits in the album.
  $('reveal-dialog').addEventListener('close',()=>{const R=ritual;if(!R)return;cancelAnimationFrame(R.raf);if(!R.done){markRitualFor(R.id);persist();}ritual=null;$('reveal-dialog').classList.remove('ritual','ritual-done','holding','one-thumb');document.querySelectorAll('.ritual-thumb').forEach(b=>b.classList.remove('held'));
    // Closed with Esc over a finished battle: carry on the way the big button would have, never leave a frozen arena.
    if(screen==='battle'&&match?.status==='finished'&&!document.querySelector('dialog[open]')){if(typeof R.back==='function')R.back();else{match=null;showView('lobby');}}});
  $('result-dialog').addEventListener('pointerdown',()=>{if($('result-dialog').open&&stage.run&&!stage.run.actionsShown)finishBeats();});
  $('result-dialog').addEventListener('keydown',e=>{const R=stage.run;if(!R)return;if(!R.actionsShown){if(e.code!=='Escape')finishBeats();return;}
    if((e.code==='Enter'||e.code==='NumpadEnter')&&!e.repeat&&document.activeElement===$('result-dialog')&&$('result-primary')._arm?.awake){e.preventDefault();$('result-primary').click();}});
  $('result-dialog').addEventListener('close',()=>{stageStop();clearTimeout(resultWait);disarm();});
  $('campfire-back').onclick=()=>{sound.click();showView('lobby');};
}
// Read-only test hooks for the screens around the battles.
window.__LEAGUE_META__=Object.freeze({session:()=>readSession(),queued:()=>typeof nextPreview==='function'?nextPreview():null,ritual:id=>openRitual(id||profile.selected)});
// ------------------------------------------------------------------ friend battles across two phones
// The host runs the battle and sends a picture of it twenty times a second; the guest draws it and sends its moves.
// Only a name, a creature and its look travel between the phones.
let online=null,onlineTimer=null;
const myName=()=>playerName(activePlayer());
const onlineSend=msg=>online?.link?.send(msg);
function onlineSay(text){$('online-status').textContent=text;}
function onlineHello(){const id=isUnlocked(profile,profile.selected)?profile.selected:'maimi';onlineSend({type:'hello',v:PROTOCOL,name:myName(),creature:id,skin:skinOf(profile,id)});}
function onlineReset(text=''){if(online?.link)try{online.link.close();}catch{}online=null;clearInterval(onlineTimer);onlineTimer=null;if(text)notify(text);if(screen==='online')renderOnline();}
function onlineHandlers(){return {
  onOpen:()=>{if(!online)return;online.connected=true;online.heard=performance.now();onlineHello();renderOnline();sound.reveal?.(false);},
  onMessage:data=>{if(!online||!data||typeof data!=='object')return;online.heard=performance.now();onlineMessage(data);},
  onClose:()=>{if(!online)return;if(!online.connected){onlineHandlers().onError('no-line');return;}const name=online.friend?.name||'החבר';if(screen==='battle'&&match?.online){match=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('online');}onlineReset(name+' יצא מהחדר.');},
  onError:kind=>{if(!online)return;onlineReset(kind==='no-room'?'לא מצאנו חדר עם הקוד הזה. בודקים את התמונות ומנסים שוב.':kind==='network'?'אין חיבור לאינטרנט כרגע. אפשר לשחק על מסך אחד.':kind==='no-line'?'הטלפונים לא הצליחו לדבר. כדאי ששניהם יתחברו ל-Wi-Fi ולנסות שוב.':'החיבור לא הצליח. אפשר לנסות שוב, או לשחק על מסך אחד.');},
};}
function onlineMessage(msg){
  if(msg.type==='hello'){if(msg.v!==PROTOCOL){onlineReset('לחבר יש גרסה אחרת של המשחק. מרעננים את הדף בשני הטלפונים.');return;}
    online.friend={name:String(msg.name||'חבר').replace(/[<>]/g,'').slice(0,12),creature:CREATURES[msg.creature]?msg.creature:'maimi',skin:SKINS.some(k=>k.id===msg.skin)?msg.skin:'base'};if(screen==='online')renderOnline();return;}
  // A start this phone cannot build (another version of the game) is refused, never half-built.
  if(msg.type==='start'&&online.role==='guest'){const cfg=sim.cleanStart?sim.cleanStart(msg):msg;if(!cfg){onlineReset('לחבר יש גרסה אחרת של המשחק. מרעננים את הדף בשני הטלפונים.');return;}startOnline(cfg);return;}
  if(msg.type==='snap'&&online.role==='guest'&&match?.online){const events=applySnapshot(match,msg.snap);for(const e of events)battleEvent(e);
    // The battle ended while this child had the pause note open: the note goes, the result comes.
    if(match.status==='finished'&&!online.finished){online.finished=true;if($('pause-dialog').open)$('pause-dialog').close();startFinale();onFinish();}return;}
  if(msg.type==='in'&&online.role==='host'){const next=unpackInput(msg,online.inState);next.special=next.special||online.remote.special;online.remote=next;return;}
  if(msg.type==='abort'&&screen==='battle'&&match?.online){match=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('online');notify((online.friend?.name||'החבר')+' עצר את הקרב.');return;}
  if(msg.type==='bye')onlineHandlers().onClose();
  // The friend's game went to the background, or came back: the host pauses or goes on at once, the same way as for a quiet line.
  if(msg.type==='ping'){const away=!!msg.away;if(away!==!!online.friendAway){online.friendAway=away;onlineBeat(false);}}
}
// Once a second: a ping, and a look at whether the friend is still there. A phone whose game is hidden (the child switched
// apps) says so in its ping: its timers still run there, so the pings alone would hide that nobody plays on it.
const AWAY_CLOSE=120000;
function onlineBeat(ping=true){
  if(!online?.connected)return;if(ping)onlineSend({type:'ping',...(document.hidden?{away:1}:{})});const quiet=performance.now()-online.heard,away=!!online.friendAway;
  // A quiet line closes after 20 s; a friend who only switched apps (to send the link, say) gets two minutes even if that phone goes quiet.
  if(quiet>(away?AWAY_CLOSE:20000)){onlineHandlers().onClose();return;}
  if(screen==='battle'&&match?.online){const wait='מחכים ל'+(online.friend?.name||'חבר')+'…';
    // The host stops and starts the battle itself, and tells the guest with a picture, so both phones say the same thing.
    if(quiet>3000||away){toast(wait,1.2);if(online.role==='host'&&match.status==='playing'){match.status='paused';online.netPaused=true;onlineSend({type:'snap',snap:snapshot(match)});}}
    else if(online.netPaused&&match.status==='paused'){match.status='playing';online.netPaused=false;onlineSend({type:'snap',snap:snapshot(match)});}
    else if(online.role==='guest'&&match.status==='paused')toast(wait,1.2);}
}
async function openRoom(){
  sound.click();online={role:'host',code:randomCode(),connected:false,friend:null,wins:[0,0],mode:'',remote:{},inState:{},supers:0,pending:{ev:[],fx:[]},steps:0};onlineSay('פותחים חדר…');renderOnline();
  for(let tries=0;tries<4&&online;tries++){
    try{const link=await openHost(online.code,onlineHandlers());if(!online){link.close();return;}online.link=link;break;}
    catch(e){if(!online)return;if(e.message==='taken'){online.code=randomCode();continue;}onlineReset('אין חיבור לאינטרנט כרגע. אפשר לשחק על מסך אחד.');return;}}
  if(!online?.link)return;onlineTimer=setInterval(onlineBeat,1000);renderOnline();
}
async function joinRoom(code){
  online={role:'guest',code,connected:false,friend:null,wins:[0,0],remote:{},inState:{},supers:0,sendClock:0};onlineSay('מתחברים לחדר…');renderOnline();
  try{const link=await openGuest(code,onlineHandlers());if(!online){link.close();return;}online.link=link;onlineTimer=setInterval(onlineBeat,1000);}
  catch{onlineReset('אין חיבור לאינטרנט כרגע. אפשר לשחק על מסך אחד.');}
}
const joinUrl=code=>{const u=new URL(location.href);u.searchParams.set('join',code.join('-'));return u.toString();};
let qrLoading=null;
const loadQr=()=>window.qrcode?Promise.resolve():qrLoading??=new Promise((ok,fail)=>{const s=document.createElement('script');s.src='./vendor/qrcode.js';s.onload=ok;s.onerror=()=>{qrLoading=null;fail();};document.head.appendChild(s);});
async function drawRoomQr(code){
  try{await loadQr();}catch{return;}const qr=window.qrcode(0,'M');qr.addData(joinUrl(code));qr.make();
  const n=qr.getModuleCount(),cv=$('room-qr'),cell=4,pad=3;cv.width=cv.height=(n+pad*2)*cell;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#1b120a';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))c.fillRect((x+pad)*cell,(y+pad)*cell,cell,cell);
}
const codePics=(code,prefix)=>code.map((id,i)=>`<span class="code-pic" style="--c:${CREATURES[id].color}"><canvas id="${prefix}-${i}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b></span>`).join('');
function renderOnline(){
  const o=online,ids=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id));if(!ids.includes(profile.selected))profile.selected='maimi';
  $('online-start').hidden=!!o;$('online-room').hidden=!(o?.role==='host'&&!o.connected);$('online-pad').hidden=!(o?.role==='guest'&&!o.code);
  if(!o)onlineSay('כל חבר משחק בטלפון שלו, גם מבית אחר. פותחים חדר ושולחים לחבר את הקוד.');
  else if(o.role==='host'&&!o.connected)onlineSay(o.link?'מחכים לחבר… שלחו לו את הקישור, או שיקיש את שלוש התמונות.':'פותחים חדר…');
  else if(o.role==='guest'&&!o.code)onlineSay('מקישים את שלוש התמונות שמופיעות בטלפון של החבר. טעיתם? נוגעים בתמונה כדי למחוק.');
  else if(o.role==='guest'&&!o.connected)onlineSay('מתחברים לחדר…');
  else if(o.connected)onlineSay(o.friend?'מחוברים! '+(o.role==='host'?'בוחרים סוג קרב ומתחילים.':'מחכים ש'+o.friend.name+' יבחר ויתחיל.'):'מחוברים…');
  if(o?.role==='host'&&!o.connected){$('room-code').innerHTML=codePics(o.code,'rc');o.code.forEach((id,i)=>livePortrait('rc-'+i,id));drawRoomQr(o.code);}
  if(o?.role==='guest'&&!o.code){const typed=o.typed||[];$('pad-code').innerHTML=[0,1,2].map(i=>typed[i]?`<button class="code-pic" data-unpad="${i}" aria-label="מוחקים את ${CREATURES[typed[i]].name}" style="--c:${CREATURES[typed[i]].color}"><canvas id="pc-${i}" aria-hidden="true"></canvas><b>${CREATURES[typed[i]].name}</b></button>`:'<span class="code-pic empty">?</span>').join('');typed.forEach((id,i)=>livePortrait('pc-'+i,id));
    $('pad-keys').innerHTML=CODE_CREATURES.map(id=>`<button class="fighter-chip" data-pad="${id}" style="--c:${CREATURES[id].color}"><canvas id="pk-${id}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b></button>`).join('');CODE_CREATURES.forEach(id=>livePortrait('pk-'+id,id));
    document.querySelectorAll('[data-pad]').forEach(el=>el.onclick=()=>{sound.click();o.typed=[...(o.typed||[]),el.dataset.pad];if(o.typed.length>=3){joinRoom(o.typed.slice(0,3));}else renderOnline();});
    document.querySelectorAll('[data-unpad]').forEach(el=>el.onclick=()=>{sound.click();o.typed=o.typed.slice(0,+el.dataset.unpad);renderOnline();});}
  $('online-friends').hidden=!o?.connected;
  if(o?.connected){const me=isUnlocked(profile,profile.selected)?profile.selected:'maimi',f=o.friend;
    $('online-friends').innerHTML=`<div class="online-who" style="--c:${CREATURES[me].color}"><canvas id="of-me" aria-hidden="true"></canvas><b></b><small>${CREATURES[me].name}</small></div><span class="versus-vs">VS</span><div class="online-who" style="--c:${f?CREATURES[f.creature].color:'#8fa9b3'}">${f?'<canvas id="of-friend" aria-hidden="true"></canvas>':''}<b></b><small>${f?CREATURES[f.creature].name:'…'}</small></div>`;
    const names=document.querySelectorAll('#online-friends .online-who b');names[0].textContent=myName();names[1].textContent=f?.name||'…';
    livePortrait('of-me',me,{skin:skinOf(profile,me)});if(f)livePortrait('of-friend',f.creature,{skin:f.skin});}
  $('online-modes').hidden=!(o?.connected&&o.role==='host');
  if(o?.connected&&o.role==='host'){$('online-modes').innerHTML=VS_MODES.map(m=>`<button class="vs-mode${m.id===o.mode?' chosen':''}" data-online-mode="${m.id}" aria-pressed="${m.id===o.mode}">${icon(m.icon)}<b>${m.name}</b><small>${m.text}</small></button>`).join('');
    document.querySelectorAll('[data-online-mode]').forEach(el=>el.onclick=()=>{o.mode=el.dataset.onlineMode;sound.click();renderOnline();});}
  $('online-go').hidden=!(o?.connected&&o.role==='host'&&o.friend);
  $('online-fighters').innerHTML=ids.map(f=>`<button class="fighter-chip${f===profile.selected?' chosen':''}" data-online-fighter="${f}" aria-pressed="${f===profile.selected}" style="--c:${CREATURES[f].color}"><canvas id="ochip-${f}" aria-hidden="true"></canvas><b>${CREATURES[f].name}</b></button>`).join('');
  for(const f of ids)livePortrait('ochip-'+f,f,{skin:skinOf(profile,f)});
  document.querySelectorAll('[data-online-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.onlineFighter;persist();sound.click();if(online?.connected)onlineHello();renderOnline();});
}
// The host starts each battle; both phones build the same match from the same numbers.
function hostStartOnline(){
  const o=online;if(!o?.connected||!o.friend||o.role!=='host')return;const me=isUnlocked(profile,profile.selected)?profile.selected:'maimi';
  const cfg={type:'start',seed:Date.now()%2147483647,mode:o.mode||null,arena:({lava:'fire',wind:'wind',ball:'sea'})[o.mode]||VS_ARENAS[Math.floor(Math.random()*VS_ARENAS.length)],ids:[me,o.friend.creature],names:[myName(),o.friend.name],skins:[skinOf(profile,me),o.friend.skin],wins:o.wins,wonderOpts:sim.wonderOptions?.(profile)||null};
  onlineSend(cfg);startOnline(cfg);
}
function startOnline(cfg){
  if(!art||!online)return;const o=online;mode='online';cupFinal=false;o.finished=false;o.netPaused=false;o.remote={};o.inState={};o.supers=0;o.pending={ev:[],fx:[]};o.steps=0;o.sendClock=0;if(Array.isArray(cfg.wins))o.wins=[...cfg.wins];
  // Both phones grow the same Wonder from the same numbers: the host's choice travels in the start.
  const w=cfg.wonderOpts&&typeof cfg.wonderOpts==='object'?cfg.wonderOpts:{};
  match=makeMatch({player:cfg.ids[0],rival:cfg.ids[1],level:'champion',seed:cfg.seed,mode:cfg.mode,arena:cfg.arena,versus:true,wonder:!!w.wonder,wonderPrefer:Array.isArray(w.wonderPrefer)?w.wonderPrefer:[],wonderAvoid:w.wonderAvoid??null});match.online=true;match.names=cfg.names;
  let skins=[...cfg.skins];if(cfg.ids[0]===cfg.ids[1]&&skins[0]===skins[1])skins[1]=skins[0]==='night'?'ice':'night';
  renderer.setMatch(match,skins,{local:localSide()});clearInput();accumulator=0;sound.versus=true;sound.online=true;resetBattleFx();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');sound.unlock();sound.setScene('battle');sound.resume();sound.setLocalSide?.(localSide());sound.setMusicRate?.(1);
  // The top HUD follows this phone's child: its own creature in the 'me' slot, the friend's in the other.
  const L=localSide(),me=match.actors[L],friend=match.actors[1-L];
  $('player-name').textContent=me.spec.name;document.querySelector('.player-info .fighter-lines span').textContent=cfg.names[L];$('rival-name').textContent=friend.spec.name;$('rival-level').textContent=cfg.names[1-L];
  $('player-symbol').innerHTML=icon(me.spec.specialIcon);$('rival-symbol').innerHTML=icon(friend.spec.specialIcon);
  $('match-label').textContent='חבר משני טלפונים';$('round-label').textContent=cfg.names[0]+' '+o.wins[0]+' : '+o.wins[1]+' '+cfg.names[1];
  $('special-action-icon').innerHTML=icon(me.spec.specialIcon);$('special-action-name').textContent=me.spec.special;$('special-button').style.setProperty('--c',me.spec.color);
  $('arena-tip').textContent=o.role==='host'?'אתם בצד שמאל.':'אתם בצד ימין.';$('arena-tip').style.opacity='1';$('match-toast').classList.remove('visible');toastUntil=0;
  $('battle-build').hidden=true;$('boss-banner').hidden=true;$('challenge-banner').hidden=true;$('mode-banner').hidden=!match.mode;$('hold-count').hidden=true;
  tutorial=null;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  $('goal-card').hidden=!match.mode;if(match.mode){$('goal-icon').innerHTML=icon(MISSION_ICON[match.mode]);$('goal-name').textContent=MODES[match.mode].name;$('goal-text').textContent=MODES[match.mode].goal;goalUntil=clock+3;}
  setTimeout(()=>{if(match?.online)cue('target',o.role==='host'?'אתם משמאל':'אתם מימין',1.6);},300);
  $('leave-button').textContent='עוצרים · חזרה לחדר';renderHUD();$('arena').focus({preventScroll:true});
}
// The host: after each step, gather what happened; every third step send the picture.
function hostAfterStep(){const o=online;if(!o)return;o.pending.ev.push(...match.events);o.pending.fx.push(...match.effects.filter(e=>e.age===0));
  if(++o.steps%SNAPSHOT_EVERY===0||match.status==='finished'){onlineSend({type:'snap',snap:snapshot(match,o.pending.ev,o.pending.fx)});o.pending={ev:[],fx:[]};}}
// The guest: send its moves about thirty times a second.
function guestTick(dt){const o=online;if(!o?.connected)return;if(input.special){o.supers++;input.special=false;}o.sendClock+=dt;
  if(o.sendClock>=1/INPUT_HZ){o.sendClock=0;onlineSend({type:'in',...packInput(currentInput(),o.supers)});}}
function finishOnline(){
  const o=online,w=match.winner,meSide=o?.role==='guest'?1:0;if(o&&w>=0)o.wins[w]++;clearInput();
  const won=w===meSide;
  // A Wonder seen for the first time gives its own spark: the chip and the words say so.
  addSparks(profile,won?2:1);const wonder=rules.recordWonder?.(profile,match)||null;refreshTodayGoals();progressDaily(profile,{friend:true});persist();sessionTick();
  const names=match.names||['',''],sparks=(won?2:1)+(wonder?.first?1:0),wl=wonder&&(rules.wonderById?.(wonder.id)||{id:wonder.id,name:'',icon:'sparkle'});
  const wonderChip=wl?`<div class="result-chips-plain"><div class="rchip wonder${wonder.first?' first':''}" style="--w:${wl.color||'#ffd23a'}" title="${esc(wl.name)}"><span class="wonder-fly">${stickerArt(wl)}</span><span class="rchip-book">${icon('book')}</span><b dir="ltr">${wonder.first?'+1':'×'+wonder.count}</b></div></div>`:'';
  $('result-content').innerHTML=`${won?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${won?'gold':w<0?'':'loss'}">${icon(won?'trophy':w<0?'shield':'star')}</div><span class="result-kicker">חבר משני טלפונים</span><h2 class="result-title"></h2><div class="result-score versus-score"><div><strong>${o?.wins[0]??0}</strong><span></span></div><span>:</span><div><strong>${o?.wins[1]??0}</strong><span></span></div></div>${wonderChip}<p class="result-tip">קיבלתם ${sparks===1?'ניצוץ':sparks+' ניצוצות'} לתיבת הכוכב${!won&&w>=0?', גם על הפסד':''}.</p>`;
  document.querySelector('#result-content .result-title').textContent=w<0?'תיקו!':'ניצחון ל'+names[w]+'!';
  document.querySelectorAll('#result-content .versus-score div span').forEach((el,i)=>{el.textContent=names[i];});
  const host=o?.role==='host';
  // The friend on the other phone is waiting, so here the big button stays "one more" and the host decides when to stop.
  plainResult({voice:won?'voice-victory':null,primary:{label:host?'עוד קרב!':'חזרה לחדר',battle:host,go:()=>{if(host&&online?.connected)hostStartOnline();else{match=null;showView('online');}}},
    secondary:{label:host?'חזרה לחדר':'יוצאים מהחדר',go:()=>{match=null;if(host)showView('online');else{onlineSend({type:'bye'});onlineReset();showView('versus');}}}});
}
// ------------------------------------------------------------------ goals of the day
function refreshTodayGoals(){if(refreshDaily(profile,dayKey(),{seed:players.active,friends:players.players.length>1,storyLeft:!!currentStep(profile)}))persist();}
function goalText(g){const c=CREATURES[g.param];return {winElement:'נצחו קרב עם יצור '+g.param,winWith:'נצחו קרב עם '+(c?.name||''),wins:'נצחו '+g.need+' קרבות',league:'שחקו '+g.need+' קרבות ליגה',tower:'טפסו '+g.need+' קומות במגדל',supers:'השתמשו '+g.need+' פעמים בכוח־העל',story:'התקדמו שלב אחד במסע',replayStars:'שלושה כוכבים בקרב חוזר במפה',friend:'משחק עם חבר'}[g.type]||'';}
const ELEMENT_ICON={'מים':'wave','חשמל':'bolt','עוצמה':'mountain','אש':'flame','אור':'sun','רעד':'burrow','היפנוט':'spiral','טבע':'leaf','רוח':'swirl','אנרגיה':'sparkle'};
function goalPicture(g,i){
  if(g.type==='winWith')return `<canvas id="goal-art-${i}" aria-hidden="true"></canvas>`;
  const name=g.type==='winElement'?ELEMENT_ICON[g.param]||'star':{wins:'star',league:'trophy',tower:'tower',supers:'bolt',story:'arrow',replayStars:'star',friend:'duo'}[g.type]||'star';return icon(name);
}
function renderGoalsStrip(){const G=profile.daily.goals,done=G.filter(g=>g.done).length;$('home-goals-title').innerHTML='<span class="strip-long">משימות היום · </span><span class="strip-short">משימות </span>'+done+'/'+G.length;$('home-goals-dots').innerHTML=G.map(g=>`<i class="${g.done?'on':''}"></i>`).join('');$('home-goals').classList.toggle('ready',done<G.length);}
function renderGoals(){
  const G=profile.daily.goals,today=dayKey();
  $('goals-list').innerHTML=G.map((g,i)=>`<div class="goal${g.done?' done':''}"><div class="goal-pic" style="--c:${CREATURES[g.param]?.color||'#f2c14e'}">${goalPicture(g,i)}</div><div class="goal-copy"><b>${goalText(g)}</b><span class="level-bar"><i style="width:${Math.round(g.have/g.need*100)}%"></i></span><small>${g.done?'הושלם! +'+GOAL_SPARKS+' ניצוצות':g.have+' מתוך '+g.need+' · פרס: '+GOAL_SPARKS+' ניצוצות'}</small></div>${g.done?'<span class="goal-check">✓</span>':`<button class="button secondary" data-goal-go="${i}">יאללה</button>`}</div>`).join('');
  G.forEach((g,i)=>{if(g.type==='winWith')livePortrait('goal-art-'+i,g.param,{skin:skinOf(profile,g.param)});});
  $('goals-bonus').textContent=profile.daily.bonusDay===today?'כל משימות היום הושלמו, והתיבה במתנה כבר אצלכם!':'עוד '+G.filter(g=>!g.done).length+' משימות לתיבה במתנה.';
  // Each goal knows where it is played.
  document.querySelectorAll('[data-goal-go]').forEach(el=>el.onclick=()=>{sound.click();const g=G[+el.dataset.goalGo];
    if(g.type==='winWith'){profile.selected=g.param;persist();}
    if(g.type==='winElement'){const id=Object.keys(CREATURES).find(k=>isUnlocked(profile,k)&&CREATURES[k].element===g.param);if(id){profile.selected=id;persist();}}
    const open=profile.story.done>=4;
    if(g.type==='league'||(['winWith','winElement','wins','supers'].includes(g.type)&&open&&!currentStep(profile)))showView('league');else if(g.type==='tower')showView('tower');else if(g.type==='friend')showView('versus');else if(g.type==='replayStars')showView('story');else if(g.type==='story')goStory();else showView('lobby');});
}
// ------------------------------------------------------------------ the mask tower
const pickInfo=(run,id)=>{const b=BLESSINGS.find(x=>x.id===id);if(b)return {name:b.name,text:b.text,icon:b.icon};const u=upgradeOptions(CREATURES[run.creature]).find(x=>x.id===id);return u?{name:u.name,text:u.benefit,icon:u.icon}:{name:id,text:'',icon:'star'};};
function renderTowerStrip(){const T=profile.tower;$('home-tower-title').innerHTML='<span class="strip-long">מגדל המסכה</span><span class="strip-short">מגדל</span>';$('home-tower-sub').textContent=T.run?'קומה '+T.run.floor+' · ממשיכים לטפס':T.best?'השיא: קומה '+T.best:'טיפוס ראשון מחכה';$('home-tower').classList.toggle('ready',!!T.run);}
function renderTower(){
  renderTowerStrip();const T=profile.tower,run=T.run,next=run?towerFloor(run.seed,run.floor,run.creature):null;
  // The tower picture: a few floors below the climber and a few above, guardians marked, the record on its floor.
  const at=run?run.floor:Math.max(1,T.best+1),low=Math.max(1,at-2),floors=Array.from({length:7},(_,i)=>low+i).reverse();
  $('tower-art').innerHTML=floors.map(f=>`<li class="tower-floor${f<at?' done':''}${f===at?' here':''}${f%TOWER_GUARD_EVERY===0?' guard':''}"><b>${f}</b>${f%TOWER_GUARD_EVERY===0?'<span>שומר</span>':''}${f===T.best?'<em>השיא</em>':''}</li>`).join('');
  $('tower-eyebrow').textContent=run?'טיפוס פעיל · קומה '+run.floor:T.best?'השיא שלך: קומה '+T.best:'עוד לא טיפסת';
  $('tower-text').textContent=run?(run.pending?'עליתם '+(run.floor-1)+' קומות! בוחרים כוח אחד לשאר הטיפוס.':'בקומה '+run.floor+': '+CREATURES[next.rival].name+(next.giant?', שומר ענק':'')+(next.mode?' · '+MODES[next.mode].name:'')+(next.twist==='crumble'?' · האבנים מתפוררות':next.twist==='open'?' · בלי אבנים':'')+'.'):'מטפסים קומה אחרי קומה. בכל קומה יריב אחר, בכל קומה חמישית שומר ענק, וכל שתי קומות בוחרים כוח. הפסד אחד נסלח בעזרת כוכב ההצלה.';
  $('tower-run').innerHTML=run?`<span class="tower-hero" style="--c:${CREATURES[run.creature].color}">${esc(CREATURES[run.creature].name)} · רמה ${creatureLevel(profile,run.creature)}</span>${run.picks.map(id=>{const p=pickInfo(run,id);return `<span class="build-chip">${icon(p.icon)}${p.name}</span>`;}).join('')}<span class="tower-lives">${run.lives?'★ כוכב הצלה':'☆ בלי כוכב הצלה'}</span>`:'';
  $('tower-picks').innerHTML=run?.pending?run.pending.map(id=>{const p=pickInfo(run,id);return `<button class="upgrade-card tower-pick" data-tower-pick="${id}" style="--upgrade-color:${CREATURES[run.creature].color}"><div class="upgrade-art">${icon(p.icon)}</div><h2>${p.name}</h2><p>${p.text}</p><span class="upgrade-choice">לוקחים</span></button>`;}).join(''):'';
  document.querySelectorAll('[data-tower-pick]').forEach(el=>el.onclick=()=>{if(chooseTowerPick(profile,el.dataset.towerPick)){persist();sound.reveal?.(false);renderTower();}});
  $('tower-fighters-title').hidden=!!run;$('tower-fighters').hidden=!!run;
  if(!run){const ids=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id));if(!ids.includes(profile.selected))profile.selected='maimi';
    $('tower-fighters').innerHTML=ids.map(f=>`<button class="fighter-chip${f===profile.selected?' chosen':''}" data-tower-fighter="${f}" aria-pressed="${f===profile.selected}" style="--c:${CREATURES[f].color}"><canvas id="tchip-${f}" aria-hidden="true"></canvas><b>${CREATURES[f].name}</b><small class="chip-level">רמה ${creatureLevel(profile,f)}</small></button>`).join('');
    for(const f of ids)livePortrait('tchip-'+f,f,{skin:skinOf(profile,f)});
    document.querySelectorAll('[data-tower-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.towerFighter;persist();sound.click();renderTower();});}
  $('tower-start').hidden=!!run?.pending;$('tower-start').innerHTML=(run?'לקומה '+run.floor+'!':'מתחילים לטפס!')+' '+icon('play');$('tower-quit').hidden=!run;
}
// ------------------------------------------------------------------ star boxes
// Three taps open a box: it shakes, its colour climbs to the colour the road already showed, then the prizes turn over.
const TIER_ORDER=['wood','silver','gold'];
const chestHTML=(tier,{mini=false}={})=>`<span class="chest${mini?' mini':''}" data-tier="${tier}"><span class="chest-glow"></span><span class="chest-lid"></span><span class="chest-body"></span><span class="chest-lock"></span></span>`;
const sparkMeter=n=>Array.from({length:SPARKS_PER_BOX},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('');
let boxUI={taps:0,result:null,chosen:null};
function renderBoxStrip(){
  const waiting=boxesWaiting(profile)+(profile.box.pending?1:0),left=SPARKS_PER_BOX-profile.box.sparks;
  $('home-box-chest').innerHTML=chestHTML(profile.box.pending?'gold':boxTier(profile.box.opened),{mini:true});$('home-box').classList.toggle('ready',waiting>0);
  $('home-box-title').innerHTML='<span class="strip-short">תיבות</span>';$('home-box-title').insertAdjacentHTML('afterbegin','<span class="strip-long"></span>');$('home-box-title').querySelector('.strip-long').textContent=profile.box.pending?'תיבת הזהב מחכה שתבחרו!':waiting>1?waiting+' תיבות מחכות לכם!':waiting?'תיבה מחכה לכם!':'עוד '+(left===1?'ניצוץ אחד':left+' ניצוצות')+' לתיבה';
  $('home-box-meter').innerHTML=sparkMeter(profile.box.sparks);$('home-box-badge').hidden=!waiting;$('home-box-badge').textContent=waiting;
}
function prizeHTML(p,i,choice){
  const button=choice?`<button class="button primary" data-choose="${String(i).replace(/^c/,'')}">את זה!</button>`:'';
  if(p.type==='look'){const c=CREATURES[p.creature],k=skinById(p.skin),worn=skinOf(profile,p.creature)===p.skin;
    return `<div class="prize${choice?' choice':''}" style="--c:${c.color}"><div class="prize-art"><canvas id="prize-${i}" aria-hidden="true"></canvas></div><small class="prize-kind">${k.box==='legendary'?'מראה אגדי':k.box==='rare'?'מראה נדיר':'מראה חדש'}</small><b>${c.name} · ${k.name}</b>${button||(worn?'<span class="prize-worn">לובש עכשיו ✓</span>':`<button class="button secondary" data-wear="${p.creature}:${p.skin}">ללבוש עכשיו</button>`)}</div>`;}
  if(p.type==='frame'){const f=FRAMES.find(x=>x.id===p.frame),id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',on=profile.frame===f.id;
    return `<div class="prize${choice?' choice':''}"><div class="prize-art"><article class="tcard frame-sample frame-${f.id}"><canvas id="prize-${i}" aria-hidden="true"></canvas></article></div><small class="prize-kind">${f.tier==='legendary'?'מסגרת אגדית':f.tier==='rare'?'מסגרת נדירה':'מסגרת חדשה'}</small><b>מסגרת ${f.name}</b>${button||(on?'<span class="prize-worn">על הקלפים ✓</span>':`<button class="button secondary" data-frame-on="${f.id}">לשים על הקלפים</button>`)}</div>`;}
  const c=CREATURES[p.id];
  return `<div class="prize${choice?' choice':''}" style="--c:${c.color}"><div class="prize-art"><canvas id="prize-${i}" aria-hidden="true"></canvas></div><small class="prize-kind">יצור חדש!</small><b>${c.name}</b>${button}</div>`;
}
function prizePortrait(p,i){const id=p.type==='look'?p.creature:p.type==='frame'?(isUnlocked(profile,profile.selected)?profile.selected:'maimi'):p.id;livePortrait('prize-'+i,id,{skin:p.type==='look'?p.skin:skinOf(profile,id)});}
function renderBoxes(){
  const waiting=boxesWaiting(profile),pending=profile.box.pending,result=boxUI.result,showing=result||pending;
  $('boxes-meter').innerHTML=sparkMeter(profile.box.sparks);
  $('boxes-sub').textContent=pending?'תיבת זהב! בוחרים אחד משני הפרסים.':waiting&&!result?(waiting>1?waiting+' תיבות מחכות! הקישו על התיבה.':'הקישו על התיבה שלוש פעמים.'):'כל קרב נותן ניצוץ, וניצחון נותן שניים. שלושה ניצוצות הם תיבה.';
  $('box-road').innerHTML=roadAhead(profile,6).map((r,i)=>`<li class="road-box${r.ready?' ready':''}${i===0&&!showing?' next':''}">${chestHTML(r.tier,{mini:true})}<small>${r.ready?'מחכה!':r.tier==='gold'?'זהב: בוחרים':BOX_TIERS[r.tier].name.replace('תיבת ','')}</small></li>`).join('');
  const chest=$('box-chest');$('box-stage').hidden=!!showing;$('boxes').classList.toggle('showing',!!showing);
  if(!showing){const tier=boxTier(profile.box.opened);chest.dataset.tier=boxUI.taps?TIER_ORDER[Math.min(TIER_ORDER.indexOf(tier),boxUI.taps-1)]:'wood';chest.classList.toggle('ready',waiting>0);chest.classList.toggle('empty',!waiting);chest.disabled=!waiting;
    $('box-hint').textContent=waiting?['הקישו על התיבה!','עוד פעמיים!','עוד פעם אחת!'][Math.min(2,boxUI.taps)]:'אין תיבה כרגע. עוד '+(SPARKS_PER_BOX-profile.box.sparks)+' ניצוצות והיא כאן.';}
  const prizes=result?result.prizes:[],choice=pending?pending.choice:null;
  $('box-prizes-title').hidden=!showing;$('box-prizes').hidden=!showing;
  $('box-prizes-title').textContent=choice?'בוחרים פרס אחד:':result?(BOX_TIERS[result.tier].name+(prizes.length?'':' · אספתם כבר הכל!')):'';
  if(showing){
    $('box-prizes').innerHTML=(choice?choice.map((p,i)=>prizeHTML(p,'c'+i,true)):[]).join('')+(choice&&prizes.length?'<span class="prize-plus">ובנוסף:</span>':'')+prizes.map((p,i)=>prizeHTML(p,i,false)).join('');
    $('box-prizes').classList.toggle('has-choice',!!choice);
    if(choice)choice.forEach((p,i)=>prizePortrait(p,'c'+i));prizes.forEach((p,i)=>prizePortrait(p,i));
    document.querySelectorAll('[data-choose]').forEach(el=>el.onclick=()=>{const p=chooseBoxPrize(profile,+el.dataset.choose);if(!p)return;persist();sound.reveal(true);boxUI.result={tier:'gold',prizes:[p,...(boxUI.result?.prizes||[])]};renderBoxes();renderBoxStrip();});
    document.querySelectorAll('[data-wear]').forEach(el=>el.onclick=()=>{const [id,skin]=el.dataset.wear.split(':');if(chooseSkin(profile,id,skin)){persist();sound.click();renderBoxes();}});
    document.querySelectorAll('[data-frame-on]').forEach(el=>el.onclick=()=>{profile.frame=el.dataset.frameOn;persist();sound.click();renderBoxes();});
  }
  const more=boxesWaiting(profile)>0&&!pending&&!!result;
  $('box-actions').innerHTML=(more?`<button class="button primary" id="box-next">לתיבה הבאה!${boxesWaiting(profile)>1?` <small>עוד ${boxesWaiting(profile)}</small>`:''}</button>`:'')+(pending?'':`<button class="button ${more?'secondary':'primary'}" id="box-play">לקרב!</button>`);
  $('box-next')?.addEventListener('click',()=>{sound.click();boxUI={taps:0,result:null};renderBoxes();});
  $('box-play')?.addEventListener('click',()=>{sound.click();boxUI={taps:0,result:null};showView('lobby');});
}
function tapChest(){
  if(boxesWaiting(profile)<=0||boxUI.result||profile.box.pending)return;
  const chest=$('box-chest'),tier=boxTier(profile.box.opened);boxUI.taps++;sound.unlock();
  chest.dataset.tier=TIER_ORDER[Math.min(TIER_ORDER.indexOf(tier),boxUI.taps-1)];chest.classList.remove('shake');void chest.offsetWidth;chest.classList.add('shake');
  sound.tone?.(260+boxUI.taps*150,.22,'triangle',.12,120);$('box-hint').textContent=['','עוד פעמיים!','עוד פעם אחת!','!'][Math.min(3,boxUI.taps)];
  if(boxUI.taps<3)return;
  const r=openBox(profile);persist();if(!r)return;boxUI.result={tier:r.tier,prizes:r.prizes};
  chest.classList.add('open');sound.reveal(true);
  setTimeout(()=>{chest.classList.remove('open');boxUI.taps=0;if(screen==='boxes')renderBoxes();renderBoxStrip();},650);
}
function renderFramePicker(){
  const owned=FRAMES.filter(f=>profile.frames.includes(f.id));$('frame-picker').hidden=!owned.length;if(!owned.length)return;
  $('frame-options').innerHTML=[{id:null,name:'רגילה'},...owned].map(f=>`<button class="frame-option${f.id?' frame-'+f.id:''}${profile.frame===f.id?' chosen':''}" data-frame="${f.id||''}" aria-pressed="${profile.frame===f.id}"><span></span>${f.name}</button>`).join('');
  document.querySelectorAll('[data-frame]').forEach(el=>el.onclick=()=>{profile.frame=el.dataset.frame||null;persist();sound.click();renderAlbum();});
}
// ------------------------------------------------------------------ who is playing?
function savePlayers(){try{localStorage.setItem(storagePrefix+PLAYERS_KEY,JSON.stringify(players));}catch{}}
const findPlayer=id=>players.players.find(p=>p.id===id);
const activePlayer=()=>findPlayer(players.active)||players.players[0];
const playerName=p=>p?.name||'שחקן '+(players.players.indexOf(p)+1);
const profileOf=id=>id===players.active?profile:readProfile(playerStorage(id));
const faceOf=p=>p.face||(isUnlocked(profileOf(p.id),profileOf(p.id).selected)?profileOf(p.id).selected:'maimi');
function switchPlayer(id){
  if(!findPlayer(id))return;players.active=id;savePlayers();storage=playerStorage(id);profile=readProfile(storage);sound.setEnabled(profile.sound);
  match=null;wildTarget=null;storyEvent=null;versus.players=[id,null];refreshTodayGoals();updateHeader();showView('lobby');
}
function renderPlayers(){
  const form=!$('player-form').hidden;$('players-grid').hidden=form;
  $('players-grid').innerHTML=players.players.map(p=>{const pp=profileOf(p.id),done=pp.story.done>=STEPS.length;
    return `<div class="player-card${p.id===players.active?' active':''}"><button class="player-pick" data-player="${p.id}"><canvas id="player-face-${p.id}" aria-hidden="true"></canvas><b></b><small>${done?journeyEnd():pp.story.done?'במסע: '+(stepLabel(STEPS[pp.story.done])||''):'עוד לא התחיל'}</small></button><button class="player-edit" data-player-edit="${p.id}" aria-label="עריכה">✎</button></div>`;}).join('')+
    (players.players.length<MAX_PLAYERS?`<button class="player-card player-new" id="player-new"><span class="player-plus">+</span><b>שחקן חדש</b><small>מתחילים מסע משלך</small></button>`:'');
  players.players.forEach(p=>{const card=document.querySelector(`[data-player="${p.id}"]`);card.querySelector('b').textContent=playerName(p);card.setAttribute('aria-label','משחקים בתור '+playerName(p));livePortrait('player-face-'+p.id,faceOf(p),{skin:skinOf(profileOf(p.id),faceOf(p))});});
  document.querySelectorAll('[data-player]').forEach(el=>el.onclick=()=>{sound.click();switchPlayer(el.dataset.player);});
  document.querySelectorAll('[data-player-edit]').forEach(el=>el.onclick=()=>{sound.click();openPlayerForm(el.dataset.playerEdit);});
  if($('player-new'))$('player-new').onclick=()=>{sound.click();openPlayerForm();};
}
let editingPlayer=null,formFace='maimi';
function openPlayerForm(id=null){
  editingPlayer=id;const p=id?findPlayer(id):null;formFace=p?faceOf(p):STARTERS[Math.floor(Math.random()*STARTERS.length)];
  $('player-form').hidden=false;$('players-grid').hidden=true;$('player-form-title').textContent=p?'עריכת שחקן':'שחקן חדש';$('player-name-input').value=p?.name||'';$('player-save').textContent=p?'שומרים':'יוצאים לדרך!';
  drawFaces();setTimeout(()=>$('player-name-input').focus({preventScroll:true}),60);
}
function drawFaces(){
  $('player-faces').innerHTML=FACES.map(id=>`<button type="button" class="fighter-chip${id===formFace?' chosen':''}" data-face="${id}" aria-pressed="${id===formFace}" style="--c:${CREATURES[id].color}"><canvas id="face-${id}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b></button>`).join('');
  for(const id of FACES)livePortrait('face-'+id,id);
  document.querySelectorAll('[data-face]').forEach(el=>el.onclick=()=>{formFace=el.dataset.face;sound.click();drawFaces();});
}
function closePlayerForm(){$('player-form').hidden=true;editingPlayer=null;renderPlayers();}
function savePlayerForm(e){
  e.preventDefault();const name=$('player-name-input').value.replace(/[<>]/g,'').trim().slice(0,12);if(!name){$('player-name-input').focus();notify('כתבו שם, ואפשר גם כינוי.');return;}
  if(editingPlayer){const p=findPlayer(editingPlayer);p.name=name;p.face=formFace;savePlayers();updateHeader();closePlayerForm();return;}
  const id='p'+(Math.max(...players.players.map(p=>+p.id.slice(1)))+1);players.players.push({id,name,face:formFace});savePlayers();$('player-form').hidden=true;
  switchPlayer(id);if(STARTERS.includes(formFace)){profile.selected=formFace;persist();renderHome();}
}
// ------------------------------------------------------------------ friend battle: two players, one screen
// Best of three. Whoever loses a round gets an extra heart in the next one, so nobody falls far behind.
const VS_MODES=[{id:'',name:'קרב',icon:'bolt',text:'מי שמפיל את השני'},{id:'ball',name:'כדור הגאות',icon:'spiral',text:'ראשון ל־'+BALL_GOALS+' גולים'},{id:'wind',name:'תפוס את הרוח',icon:'swirl',text:WIND_TARGET+' נוצות, '+WIND_HOLD+' שניות'},{id:'lava',name:'טבעת הלבה',icon:'flame',text:'שורדים בלבה'}];
const VS_ARENAS=['wind','sea','fire','mirror','castle'],VS_WINS=2;
let versus={kind:'vs',giant:'fireguard',coopLevel:'normal',players:[null,null],ids:['maimi','havzuk'],hearts:[0,0],mode:'',wins:[0,0],round:1,catchup:[0,0]},touchVersus=false;
// Each side plays as a player on this device, with that player's creatures and looks, or as a guest with the three first creatures.
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const vsProfile=i=>versus.players[i]==='guest'?null:profileOf(versus.players[i]);
const vsCreatures=i=>{const pp=vsProfile(i);return pp?Object.keys(CREATURES).filter(id=>isUnlocked(pp,id)):[...STARTERS];};
const vsSkin=(i,id)=>{const pp=vsProfile(i);return pp?skinOf(pp,id):'base';};
function vsName(i){const id=versus.players[i];if(id!=='guest')return playerName(findPlayer(id));return versus.players[1-i]==='guest'?'אורח '+(i+1):'אורח';}
function renderVersus(){
  const touch=matchMedia('(pointer:coarse)').matches;
  versus.players=versus.players.map((id,i)=>id==='guest'||findPlayer(id)?id:i===0?players.active:players.players.find(p=>p.id!==players.active)?.id||'guest');
  if(versus.players[0]===versus.players[1]&&versus.players[0]!=='guest')versus.players[1]='guest';
  for(const n of [0,1]){const k=n+1,ids=vsCreatures(n);if(!ids.includes(versus.ids[n]))versus.ids[n]=ids[n%ids.length];
    const id=versus.ids[n],c=CREATURES[id],h=versus.hearts[n];
    $('versus-who-'+k).textContent=vsName(n);
    $('versus-players-'+k).innerHTML=[...players.players.map(p=>p.id),'guest'].map(pid=>{const p=findPlayer(pid),taken=pid!=='guest'&&versus.players[1-n]===pid;return `<button class="vs-player${pid===versus.players[n]?' chosen':''}" data-vs-player="${n}:${pid}" ${taken?'disabled':''} aria-pressed="${pid===versus.players[n]}"><b>${esc(p?playerName(p):'אורח')}</b></button>`;}).join('');
    $('versus-keys-'+k).textContent=touch?(n?'אגודל בצד ימין של המסך':'אגודל בצד שמאל של המסך'):(n?'חצים · Enter · Shift ימני':'W A S D · רווח · E');
    $('versus-name-'+k).textContent=c.name;$('versus-name-'+k).style.color=c.dark;livePortrait('versus-portrait-'+k,id,{skin:vsSkin(n,id)});
    $('versus-hearts-'+k).innerHTML=[0,1,2].map(i=>`<button class="vs-heart${i<=h?' on':''}" data-vs-heart="${n}:${i}" aria-label="${i+1} לבבות" aria-pressed="${i===h}">♥</button>`).join('')+`<small>${h?'עוד '+h*25+'% חיים':'חיים רגילים'}</small>`;
    $('versus-fighters-'+k).innerHTML=ids.map(f=>`<button class="fighter-chip${f===id?' chosen':''}" data-vs-fighter="${n}:${f}" aria-pressed="${f===id}" style="--c:${CREATURES[f].color}"><canvas id="vs-chip-${k}-${f}" aria-hidden="true"></canvas><b>${CREATURES[f].name}</b></button>`).join('');
    for(const f of ids)livePortrait(`vs-chip-${k}-${f}`,f,{skin:vsSkin(n,f)});}
  const coop=versus.kind==='coop';
  $('vs-kind').innerHTML=[['vs','נגד','bolt'],['coop','ביחד נגד ענק','duo'],['online','משני טלפונים','target']].map(([k,t,i])=>`<button class="vs-kind-btn${versus.kind===k?' chosen':''}" data-vs-kind="${k}" aria-pressed="${versus.kind===k}">${icon(i)}${t}</button>`).join('');
  $('versus-title').innerHTML=coop?'ביחד <em>נגד</em> ענק':'חבר <em>נגד</em> חבר';document.querySelector('.versus-vs').textContent=coop?'+':'VS';
  $('coop-levels').hidden=!coop;$('coop-levels').innerHTML=Object.entries(COOP_LEVELS).map(([k,L])=>`<button class="vs-player${versus.coopLevel===k?' chosen':''}" data-coop-level="${k}" aria-pressed="${versus.coopLevel===k}">${L.name}</button>`).join('');
  $('versus-modes').classList.toggle('giants',coop);
  $('versus-modes').innerHTML=coop?COOP_GIANTS.map(g=>`<button class="vs-mode giant${g===versus.giant?' chosen':''}" data-coop-giant="${g}" aria-pressed="${g===versus.giant}"><canvas id="giant-${g}" aria-hidden="true"></canvas><b>${CREATURES[g].name}</b><small>${CREATURES[g].role}</small></button>`).join(''):VS_MODES.map(m=>`<button class="vs-mode${m.id===versus.mode?' chosen':''}" data-vs-mode="${m.id}" aria-pressed="${m.id===versus.mode}">${icon(m.icon)}<b>${m.name}</b><small>${m.text}</small></button>`).join('');
  document.querySelectorAll('[data-vs-player]').forEach(el=>el.onclick=()=>{const [n,pid]=el.dataset.vsPlayer.split(':');versus.players[+n]=pid;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-fighter]').forEach(el=>el.onclick=()=>{const [n,f]=el.dataset.vsFighter.split(':');versus.ids[+n]=f;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-heart]').forEach(el=>el.onclick=()=>{const [n,i]=el.dataset.vsHeart.split(':').map(Number);versus.hearts[n]=i;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-mode]').forEach(el=>el.onclick=()=>{versus.mode=el.dataset.vsMode;sound.click();renderVersus();});
  if(coop)for(const g of COOP_GIANTS)livePortrait('giant-'+g,g);
  document.querySelectorAll('[data-vs-kind]').forEach(el=>el.onclick=()=>{sound.click();if(el.dataset.vsKind==='online'){showView('online');return;}versus.kind=el.dataset.vsKind;renderVersus();});
  document.querySelectorAll('[data-coop-giant]').forEach(el=>el.onclick=()=>{versus.giant=el.dataset.coopGiant;sound.click();renderVersus();});
  document.querySelectorAll('[data-coop-level]').forEach(el=>el.onclick=()=>{versus.coopLevel=el.dataset.coopLevel;sound.click();renderVersus();});
  $('versus-start').innerHTML=(coop?'יוצאים ביחד!':'יאללה, לקרב!')+' '+icon('play');
}
const versusRoundLabel=()=>versus.wins.every(n=>n===VS_WINS-1)?'סיבוב ההכרעה':'סיבוב '+versus.round;
function startVersus(fresh=false){
  if(!art)return;if(fresh)Object.assign(versus,{wins:[0,0],round:1,catchup:[0,0]});
  mode='versus';cupFinal=false;touchVersus=matchMedia('(pointer:coarse)').matches;
  const arena=({lava:'fire',wind:'wind',ball:'sea'})[versus.mode]||VS_ARENAS[Math.floor(Math.random()*VS_ARENAS.length)];
  match=makeMatch({player:versus.ids[0],rival:versus.ids[1],level:'champion',seed:Date.now()+Math.floor(Math.random()*1e5),mode:versus.mode||null,arena,versus:true,hearts:versus.hearts.map((h,i)=>Math.min(2,h+versus.catchup[i])),...(sim.wonderOptions?.(profile)||{})});
  match.roundLabel=versusRoundLabel();
  const [a,b]=match.actors,skinA=vsSkin(0,a.id);let skinB=vsSkin(1,b.id);match.names=[vsName(0),vsName(1)];
  // The same creature on both sides: player two wears night colours so the two are easy to tell apart.
  if(a.id===b.id&&skinA===skinB)skinB=skinA==='night'?'ice':'night';
  renderer.setMatch(match,[skinA,skinB],{local:0});clearInput();accumulator=0;sound.versus=true;sound.online=false;resetBattleFx();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');document.body.classList.add('versus-play');sound.unlock();sound.setScene('battle');sound.resume();sound.setLocalSide?.(0);sound.setMusicRate?.(1);
  $('player-name').textContent=a.spec.name;document.querySelector('.player-info .fighter-lines span').textContent=vsName(0);$('rival-name').textContent=b.spec.name;$('rival-level').textContent=vsName(1);
  $('player-symbol').innerHTML=icon(a.spec.specialIcon);$('rival-symbol').innerHTML=icon(b.spec.specialIcon);
  $('match-label').textContent='חבר נגד חבר';$('round-label').textContent=match.roundLabel+' · '+versus.wins.join(' : ');
  $('special-action-icon').innerHTML=icon(a.spec.specialIcon);$('special-action-name').textContent=a.spec.special;$('special-button').style.setProperty('--c',a.spec.color);
  $('special-action-icon-2').innerHTML=icon(b.spec.specialIcon);$('special-button-2').style.setProperty('--c',b.spec.color);
  $('arena-tip').textContent=touchVersus?'כל אחד מזיז את האגודל בצד שלו. הירי אוטומטי!':'שחקן 1: W A S D ורווח · שחקן 2: חצים ו־Enter';$('arena-tip').style.opacity='1';$('match-toast').classList.remove('visible');toastUntil=0;
  $('battle-build').hidden=true;$('boss-banner').hidden=true;$('challenge-banner').hidden=true;$('mode-banner').hidden=false;$('hold-count').hidden=true;
  tutorial=null;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  $('goal-card').hidden=!match.mode;if(match.mode){$('goal-icon').innerHTML=icon(MISSION_ICON[match.mode]);$('goal-name').textContent=MODES[match.mode].name;$('goal-text').textContent=MODES[match.mode].goal;goalUntil=clock+3;}
  $('leave-button').textContent='הפסקה · חזרה לבחירה';
  renderHUD();$('arena').focus({preventScroll:true});
}
function startCoop(){
  if(!art)return;mode='coop';cupFinal=false;touchVersus=matchMedia('(pointer:coarse)').matches;
  const L=COOP_LEVELS[versus.coopLevel]||COOP_LEVELS.normal,g=versus.giant,arena=({fireguard:'fire',seaguard:'sea',windguard:'wind',tehomon:'sea'})[g]||'castle';
  match=makeMatch({player:versus.ids[0],rival:g,level:L.level,giantRival:true,arena,seed:Date.now()+Math.floor(Math.random()*1e5),coop:{partner:versus.ids[1],hpMul:L.hp,hearts:versus.hearts}});
  const [a,b,c]=match.actors,skinA=vsSkin(0,a.id);let skinC=vsSkin(1,c.id);if(a.id===c.id&&skinA===skinC)skinC=skinA==='night'?'ice':'night';
  // Both children are human to the sound (side 2 always is); the giant is not, so its super never chimes like a child's.
  match.names=[vsName(0),'',vsName(1)];renderer.setMatch(match,[skinA,null,skinC],{local:0});clearInput();accumulator=0;sound.versus=!!match.versus;sound.online=false;resetBattleFx();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');document.body.classList.add('versus-play');sound.unlock();sound.setScene('battle');sound.resume();sound.setLocalSide?.(0);sound.setMusicRate?.(1);
  $('player-name').textContent=a.spec.name;document.querySelector('.player-info .fighter-lines span').textContent=vsName(0);$('rival-name').textContent=b.spec.name;$('rival-level').textContent='ענק · '+L.name;
  $('player-symbol').innerHTML=icon(a.spec.specialIcon);$('rival-symbol').innerHTML=icon(b.spec.specialIcon);
  $('match-label').textContent='ביחד נגד ענק';$('round-label').textContent=vsName(0)+' ו'+vsName(1)+' נגד '+b.spec.name;
  $('special-action-icon').innerHTML=icon(a.spec.specialIcon);$('special-action-name').textContent=a.spec.special;$('special-button').style.setProperty('--c',a.spec.color);
  $('special-action-icon-2').innerHTML=icon(c.spec.specialIcon);$('special-button-2').style.setProperty('--c',c.spec.color);
  $('arena-tip').textContent=rivalAdvice[g]||'תקפו את הענק משני הצדדים!';$('arena-tip').style.opacity='1';$('match-toast').classList.remove('visible');toastUntil=0;
  $('battle-build').hidden=true;$('boss-banner').hidden=true;$('challenge-banner').hidden=true;$('mode-banner').hidden=false;$('hold-count').hidden=true;$('goal-card').hidden=true;
  tutorial=null;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  renderer.cinematic(b.x,b.y-90,1.5,2.1);$('leave-button').textContent='הפסקה · חזרה לבחירה';
  renderHUD();$('arena').focus({preventScroll:true});
}
// Nobody loses to a friend here: the giant wins or loses against both together.
function finishCoop(){
  const won=match.winner===0;clearInput();sessionTick();
  versus.players.forEach((pid,i)=>{if(pid==='guest'||(i===1&&versus.players[0]===pid))return;const pp=pid===players.active?profile:readProfile(playerStorage(pid));addSparks(pp,won?2:1);refreshDaily(pp,dayKey(),{seed:pid,friends:true,storyLeft:!!currentStep(pp)});progressDaily(pp,{friend:true});if(pid===players.active)persist();else saveProfile(playerStorage(pid),pp);});
  const b=match.actors[1],left=Math.max(0,Math.ceil(b.hp/b.spec.hp*100));
  $('result-content').innerHTML=`${won?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${won?'gold':'loss'}">${icon(won?'trophy':'shield')}</div><span class="result-kicker">ביחד נגד ענק</span><h2 class="result-title"></h2><p></p>${versus.players.some(p=>p!=='guest')?'<p class="result-tip">כל שחקן קיבל ניצוצות לתיבת הכוכב.</p>':''}`;
  document.querySelector('#result-content .result-title').textContent=won?'ניצחתם ביחד!':'הענק ניצח הפעם';
  document.querySelector('#result-content > p').textContent=won?vsName(0)+' ו'+vsName(1)+' הפילו את '+b.spec.name+' ב־'+Math.round(match.time)+' שניות.':'נשארו לו עוד '+left+'% חיים. עוד ניסיון ביחד? אפשר גם לבחור ענק קל יותר.';
  const rest=campfireDue();
  plainResult({voice:won?'voice-victory':null,primary:rest?{label:'מנוחה ליד המדורה',icon:'campfire',go:()=>{match=null;showView('campfire');}}:{label:'עוד פעם ביחד!',battle:true,go:startCoop},
    secondary:rest?{label:'עוד פעם ביחד',battle:true,go:startCoop}:{label:'חזרה לבחירה',go:leaveBattle}});
}
// Player one: W A S D, Space, E. Player two: arrows, Enter, right Shift. On a touch screen each player has half the screen and fires on their own.
function versusInputs(){
  const k=code=>keys.has(code)?1:0;
  return [{moveX:input.stickX+k('KeyD')-k('KeyA'),moveY:input.stickY+k('KeyS')-k('KeyW'),fire:touchVersus||!!(k('Space')||k('KeyF')),special:input.special},
    {moveX:input2.stickX+k('ArrowRight')-k('ArrowLeft'),moveY:input2.stickY+k('ArrowDown')-k('ArrowUp'),fire:touchVersus||!!(k('Enter')||k('NumpadEnter')||k('Numpad0')||k('Slash')),special:input2.special}];
}
function finishVersusRound(){
  const w=match.winner;clearInput();sessionTick();
  // A Wonder seen in a friend battle goes into each player's Star Book on this device.
  versus.players.forEach((pid,i)=>{if(pid==='guest'||(i===1&&versus.players[0]===pid))return;const pp=pid===players.active?profile:readProfile(playerStorage(pid));if(!rules.recordWonder?.(pp,match))return;if(pid===players.active)persist();else saveProfile(playerStorage(pid),pp);});
  if(w>=0){versus.wins[w]++;versus.catchup[1-w]=Math.min(2,versus.catchup[1-w]+1);versus.catchup[w]=0;}
  versus.round++;const done=versus.wins.some(n=>n>=VS_WINS),[a,b]=match.actors;
  const title=w<0?'תיקו!':done?'ניצחון ל'+vsName(w)+'!':'הסיבוב ל'+vsName(w)+'!';
  const sub=done?'איזה קרב! עוד אחד?':w<0?'אף אחד לא לקח את הסיבוב. עוד סיבוב!':'עוד לב ♥ ל'+vsName(1-w)+' בסיבוב הבא.';
  if(done){versus.players.forEach((pid,i)=>{if(pid==='guest'||(i===1&&versus.players[0]===pid))return;const pp=pid===players.active?profile:readProfile(playerStorage(pid));addSparks(pp,i===w?2:1);refreshDaily(pp,dayKey(),{seed:pid,friends:true,storyLeft:!!currentStep(pp)});progressDaily(pp,{friend:true});if(pid===players.active)persist();else saveProfile(playerStorage(pid),pp);});}
  $('result-content').innerHTML=`${done?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${done?'gold':''}">${icon(done?'trophy':w<0?'shield':'star')}</div><span class="result-kicker">חבר נגד חבר</span><h2 class="result-title"></h2><div class="result-score versus-score"><div><strong>${versus.wins[0]}</strong><span></span></div><span>:</span><div><strong>${versus.wins[1]}</strong><span></span></div></div><p></p>`;
  document.querySelector('#result-content .result-title').textContent=title;document.querySelector('#result-content > p').textContent=sub;
  document.querySelectorAll('#result-content .versus-score div span').forEach((el,i)=>{el.textContent=vsName(i)+' · '+match.actors[i].spec.name;});
  if(done&&versus.players.some(p=>p!=='guest'))$('result-content').insertAdjacentHTML('beforeend','<p class="result-tip">כל שחקן קיבל ניצוצות לתיבת הכוכב, וגם מי שהפסיד.</p>');
  const rest=done&&campfireDue(),next={label:done?'עוד קרב!':'ל'+versusRoundLabel()+'!',battle:true,go:()=>startVersus(done)};
  plainResult({voice:done?'voice-victory':null,primary:rest?{label:'מנוחה ליד המדורה',icon:'campfire',go:()=>{match=null;showView('campfire');}}:next,
    secondary:rest?{label:'עוד קרב',battle:true,go:next.go}:{label:'החלפת יצורים',go:leaveBattle}});
}
// The loop must survive any drawing error: a frozen game is worse than one missed frame.
let frameErrors=0;
// ------------------------------------------------------------------ the show around a battle: slow motion, cue chips, the finale
// Slow motion only for moments a child makes (a super, a Power Form, the final blow): never online, never on a device that asks for calm motion.
const CALM=matchMedia('(prefers-reduced-motion: reduce)');
let slows=[],cueNow=null,cueNext=null,cueAt=-9,cueLast=null,finaleUntil=0,lastMoment=[],impactArm=[],segSeen=[];const flashTimers=new Map();
function slowmo(scale,real,ease=.12){if(match?.online||CALM.matches)return;slows.push({scale,until:clock+real,ease});}
// The slowest moment wins; each one eases back to full speed over its last fraction of a second.
function timeScale(){slows=slows.filter(s=>clock<s.until+s.ease);let k=1;for(const s of slows)k=Math.min(k,clock<s.until?s.scale:s.scale+(1-s.scale)*(clock-s.until)/s.ease);return k;}
// This phone's child: side 0, or side 1 on the phone that joined a two-phone room.
function localSide(){return match?.online&&online?.role==='guest'?1:0;}
function humanSide(side){if(!match)return side!==1;return sim.isHuman?sim.isHuman(match,side):side!==1||!!match.versus;}
// A cue chip under the clock: an icon and at most two words, never over the arena. One a second; the newest waiting one wins.
function cue(iconId,words='',seconds=1.2){words=String(words||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ');cueLast={icon:iconId,words};cueNext={icon:iconId,words,seconds,at:clock};cueTick();}
// A mission banner steps aside while a cue shows in its place: on a phone there is no room for both above the arena floor.
function cueTick(){const el=$('match-cue');if(!el)return;if(cueNow&&clock>=cueNow.until){cueNow=null;el.classList.remove('on');$('mode-banner').classList.remove('cue-over');}if(cueNext&&clock-cueNext.at>3)cueNext=null;
  if(!cueNext||clock-cueAt<1||!$('goal-card').hidden)return;const c=cueNext;cueNext=null;cueAt=clock;cueNow={...c,until:clock+c.seconds};
  el.innerHTML=icon(c.icon)+'<b></b>';el.querySelector('b').textContent=c.words;el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');$('mode-banner').classList.add('cue-over');}
function resetCue(){cueNow=cueNext=null;cueAt=-9;const el=$('match-cue');if(el){el.classList.remove('on');el.hidden=true;}$('mode-banner').classList.remove('cue-over');}
// Where the HUD ends over the canvas, so the super cut-in fits between it and the arena floor.
// numberTop: damage numbers stay below the HUD band and the cue chip row (one chip high) under the clock.
function measureHud(){if(!renderer)return;const c=$('arena').getBoundingClientRect(),t=document.querySelector('.battle-top')?.getBoundingClientRect(),q=$('cue-row')?.getBoundingClientRect();renderer.hudBottom=t?.height&&c.height?Math.max(0,Math.round(t.bottom-c.top)):0;
  renderer.numberTop=c.height?Math.max(renderer.hudBottom,q?Math.round(q.top-c.top+28):0):0;}
function resetBattleFx(){slows=[];lastMoment=[];impactArm=[];segSeen=[];finaleUntil=0;resetCue();const w=$('wonder-chip');if(w){w.hidden=true;w.dataset.id='';}
  for(const id of ['special-button','special-button-2'])$(id).classList.remove('pop','pip-pop','deny','form-ready','in-form','can-form');requestAnimationFrame(measureHud);}
function flash(el,cls,ms=400){if(!el)return;const key=el.id+' '+cls;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);clearTimeout(flashTimers.get(key));flashTimers.set(key,setTimeout(()=>el.classList.remove(cls),ms));}
function uiSound(kind){if(sound.uiClick)sound.uiClick(kind);else if(kind==='deny')sound.tone(196,.14,'sine',.05,-50);else if(kind==='segment')sound.tone(988,.035,'triangle',.03);}
// The super button of a child on this device: this phone's child, or player two on a shared screen.
function superButton(side){if(!match)return null;if(side===localSide())return $('special-button');return !match.online&&(match.versus&&side===1||match.coop&&side===2)?$('special-button-2'):null;}
// A super pressed before it is full: a wiggle and a soft low note, so 'not yet' never feels like 'broken'.
function pressSpecial(slot=0){if(slot)input2.special=true;else input.special=true;if(match?.status!=='playing')return;
  const a=match.actors[slot?(match.coop?2:1):localSide()];if(a&&!(a.out>0)&&(a.superCharge||0)<1){flash($(slot?'special-button-2':'special-button'),'deny',380);uiSound('deny');}}
// The middle of the clock, where a freed creature's shadow ink flies to (CSS px from the canvas corner).
function clockCenter(){const c=$('arena').getBoundingClientRect(),k=document.querySelector('.match-clock')?.getBoundingClientRect();return k?.width?{x:k.left+k.width/2-c.left,y:k.top+k.height/2-c.top}:{x:c.width/2,y:24};}
// The end of a battle on the arena itself, before the result: confetti for a child's knockout, the shadow ink peeling off a freed
// creature, a puff for a beaten computer rival, and a losing child's creature that sits, dusts itself off and bounces up.
// A push-in only toward a child's win over the computer: never on a losing child, never between friends.
function startFinale(){const m=match;finaleUntil=clock;sound.setMusicRate?.(1);if(!m)return;
  const single=!m.versus&&!m.coop&&!m.online,rival=m.actors[1],freed=m.winner===0&&!m.versus&&(sim.isShadowed?sim.isShadowed(m):!m.coop&&(!!m.wild||!!m.story&&!m.mirror&&!m.friendly));let d=0;
  // On a phone of its own, only the child who won celebrates; a shared screen celebrates any child's win.
  if(m.reason==='knockout'&&m.winner>=0&&humanSide(m.winner)&&(!m.online||m.winner===localSide())){renderer.confetti?.();sound.confetti?.();}
  if(freed){const short=(sim.finaleViews?.(profile,rival.id)??0)>=3;d=renderer.liberate?.(1,clockCenter(),{short})||0;sound.liberationTicks?.({gap:short?.03:.05});sim.recordFinaleView?.(profile,rival.id);}
  else if(m.winner===0&&!m.versus)d=renderer.loserPuff?.(1)||0;
  if(single&&m.winner===1){d=renderer.sitUp?.(0)||0;sound.loseBounce?.({delay:d*.7});}
  if(single&&m.winner===0){const t=freed?rival:m.actors[0];renderer.cinematic(t.x,t.y-(freed?80:70),freed?1.35:1.5,freed?d+.4:1.9);}
  finaleUntil=clock+d;}
function finaleLeft(){return Math.max(0,Math.round((finaleUntil-clock)*1000));}
function frame(timestamp){
  try{frameBody(timestamp);}catch(error){if(frameErrors++<5)console.error('frame',error);window.__LEAGUE_LAST_ERROR__=String(error?.stack||error);}
  requestAnimationFrame(frame);
}
// Every battle event: its sound first, then what the child sees. Words only as a cue chip under the clock.
function battleEvent(e){const n=sound.effect(e),L=localSide(),t=e.type,vs=!!match.versus,same=vs&&!match.online,nm=side=>match.online?(match.names?.[side]||''):match.coop?vsName(side===2?1:0):vsName(side),foeOfLocal=side=>match.coop?side===1:side!==L;
  if(t==='hit'){if(humanSide(e.side))renderer.shake=Math.max(renderer.shake,e.side===L?2.2:.8);
    if(n===5&&e.by>=0&&humanSide(e.by))renderer.burst?.(e.x,e.y,'inkstar');
    // The first landed hit of a child's super prints two linocut frames (the renderer keeps them rare).
    if(e.special&&e.by>=0&&impactArm[e.by]!=null&&match.time-impactArm[e.by]<=.6){impactArm[e.by]=null;renderer.impactFrame?.();}}
  else if(t==='quake')renderer.shake=Math.max(renderer.shake,5);
  else if(t==='special'){const s=e.side,mega=!!e.mega;
    // A full moment (slow motion and the cut-in) at most every 5 s per child; the Power Form's MEGA super always gets one (its own slow motion came with 'form').
    // Two children against one giant share those 5 s, and their slow motion is lighter, so the battle never feels stuck.
    if(humanSide(s)){const k=match.coop?'team':s,full=mega||clock-(lastMoment[k]??-9)>=5;if(full&&!mega)slowmo(match.coop?.5:.25,.3);if(full)lastMoment[k]=clock;renderer.superMoment?.(s,e.kind,{full,mega});sound.superMoment?.(s,{full,mega});impactArm[s]=match.time;}
    else{renderer.rivalSuper?.(s);sound.rivalSwell?.(s);}}
  else if(t==='super-ready')flash(superButton(e.side),'pop',400);
  else if(t==='pip')flash(superButton(e.side),'pip-pop',450);
  else if(t==='form'){renderer.formMoment?.(e.side);if(humanSide(e.side)){slowmo(.15,.45,.2);sound.formBurst?.(e.side,{sting:true});}else sound.formBurst?.(e.side,{sting:false});}
  else if(t==='final-blow'){slowmo(.3,1,.2);sound.finalBlow?.();}
  else if(t==='star-lend'){cue('star','הכוכב עוזר',1.6);flash(superButton(e.side),'pip-pop',450);}
  else if(t==='wonder-sprout')cue('seed','זרע פלא');
  else if(t==='wonder-start'){wonderHUD();sound.setMusicRate?.(1.08);}
  else if(t==='wonder-end'){wonderHUD();sound.setMusicRate?.(1);}
  else if(t==='lava-warning')cue('flame','הלבה!');
  else if(t==='echo-turn')cue('sound','תורכם');
  else if(t==='echo-again')cue('sound','שוב');
  else if(t==='echo-song'){if(e.side===L||same)cue('sound',same?nm(e.side):'מנגינה!');}
  else if(t==='buddy-hint'){if(!match.hinted&&match.echo?.buddy){match.hinted=true;cue('ear',CREATURES[match.echo.buddy.id].name);}}
  // The child plays the listening creature itself: the next stone hums, and the cue names who heard it.
  else if(t==='echo-hint'){if(!match.hinted&&!match.echo?.buddy){match.hinted=true;cue('ear',CREATURES[match.actors[0].id]?.name||'שמעתם!');}}
  else if(t==='reveal'){if((match.reveals=(match.reveals||0)+1)<=2)cue('ear','שמעתם!');}
  else if(t==='phase2')cue('feather','נוצות!');
  else if(t==='silenced'){if(e.side===L||!match.online&&humanSide(e.side))cue('muted','שקט!');}
  else if(t==='tell'){if(same||foeOfLocal(e.side))cue(e.kind==='kashevet'?'muted':e.kind==='form'?'star':'bell','זוזו!');}
  else if(t==='hold-start')cue('swirl',vs?nm(e.side):e.side===L?'החזיקו!':'תפסו!');
  else if(t==='ko'){if(match.coop)cue(e.side===1?'star':'shield',e.side===1?'הפלתם!':nm(e.side));else if(vs)cue('star',nm(1-e.side));else cue('star',foeOfLocal(e.side)?'הפלתם!':'חוזרים');}
  else if(t==='goal')cue('trophy',vs?'גול ל'+nm(e.side):e.side===L?'גול!':'גול ליריב');
  else if(t==='overtime')cue('trophy','גול זהב');
  else if(t==='ball-loose'){if(match.status==='playing'&&(e.side===L||same))cue('spiral','נפלה!');}
  else if(t==='kick-far'){if(e.side===L||same)cue('arrow','קרוב יותר');}
  else if(t==='swap'){const c=CREATURES[e.id];renderer.swap(e.side,e.id,e.side===0?skinOf(profile,e.id):null);if(e.side===0){$('player-name').textContent=c.name;$('player-symbol').innerHTML=icon(c.specialIcon);$('special-action-icon').innerHTML=icon(c.specialIcon);$('special-action-name').textContent=c.special;$('special-button').style.setProperty('--c',c.color);}else{$('rival-name').textContent=c.name;$('rival-symbol').innerHTML=icon(c.specialIcon);}cue('swap',c.name);}}
function frameBody(timestamp){
  if(!frameTime)frameTime=timestamp;const dt=Math.min(.1,(timestamp-frameTime)/1000);frameTime=timestamp;clock+=dt;
  // Creature pictures move on every screen; during a battle only the ones inside an open dialog (the result, a new card).
  if(screen!=='battle'||document.querySelector('dialog[open]'))for(const [canvasId,entry] of portraits){const el=$(canvasId);if(!el){portraits.delete(canvasId);continue;}const open=el.closest('dialog[open]');if(screen==='battle'?!open:!el.offsetParent&&!open)continue;
    const o=entry.opts;entry.wait=(entry.wait||0)+dt;if(o.still&&entry.drawn&&entry.wait<.25)continue;const pdt=entry.wait;entry.wait=0;entry.drawn=true;
    const locked=!isUnlocked(profile,entry.id);drawPortrait(el,entry.puppet,entry.id,clock,pdt*(o.speed??1),{active:o.roster?entry.id===profile.selected:true,locked:o.roster&&locked,skin:o.roster?(locked?null:skinOf(profile,entry.id)):o.skin,form:!!o.form,clip:o.clip||'idle',glowColor:o.glowColor||null});}
  if(screen==='battle'&&match){
    // Slow motion slows the world and its drawing; the clock, the HUD and the screen-space moments stay in real time.
    const ts=timeScale();
    if(match.online&&online?.role==='guest'){if(match.status==='finished')settleBattle(dt);else coast(match,dt);guestTick(dt);}
    else if(match.status==='finished')settleBattle(dt*ts);
    else if(match.status!=='paused'){
      accumulator+=dt*ts;
      while(accumulator>=1/60){tutorialGuard();
        if(match.online){step(match,currentInput(),1/60,online?.remote||{});if(online)online.remote.special=false;}else if(match.versus||match.coop){const [one,two]=versusInputs();step(match,one,1/60,two);input2.special=false;}else step(match,currentInput(),1/60);input.special=false;accumulator-=1/60;
        if(match.online)hostAfterStep();
        for(const e of match.events)battleEvent(e);
        if(match.status==='finished'){startFinale();onFinish();break;}
      }
    }
    if(match){updateTutorial(dt);renderer.render(match,dt*ts,clock,dt);if(clock-lastHUD>.05){renderHUD();lastHUD=clock;}}
  }
}
// After the finish nothing is decided any more, but the picture keeps moving: shots fly out and splats fade.
function settleBattle(dt){if(sim.settle)sim.settle(match,dt);else step(match,{},dt);}
function openHelp(){pauseBattle();if(!$('help-dialog').open)$('help-dialog').showModal();}
function handleNavigation(view){sound.click();if(screen==='battle'&&match?.status!=='finished'){pauseBattle();return;}match=null;showView(view);}
function bindControls(){
  $('quick-start').onclick=()=>startBattle('quick');$('home-play').onclick=()=>{sound.click();if(currentStep(profile))goStory();else startBattle('league');};$('bridge-play').onclick=()=>{sound.unlock?.();playBridgeTune();};$('bridge-back').onclick=()=>{bridgeTimers.forEach(clearTimeout);sound.click();showView('story');};$('bridge-next').onclick=()=>{sound.click();showView('story');};
  $('online-host').onclick=openRoom;$('online-join').onclick=()=>{sound.click();online={role:'guest',code:null,typed:[],connected:false,friend:null,wins:[0,0],remote:{},inState:{},supers:0,sendClock:0};renderOnline();};
  $('online-back').onclick=()=>{sound.click();onlineSend({type:'bye'});onlineReset();showView('versus');};$('online-go').onclick=()=>{sound.click();hostStartOnline();};
  $('room-share').onclick=async()=>{sound.click();const url=joinUrl(online?.code||[]);try{if(navigator.share){await navigator.share({title:'ליגת היצורים',text:'בוא לקרב איתי בליגת היצורים!',url});return;}await navigator.clipboard.writeText(url);notify('הקישור הועתק. שולחים אותו לחבר.');}catch{}};
  $('home-goals').onclick=()=>{sound.click();showView('goals');};$('home-tower').onclick=()=>{sound.click();showView('tower');};$('tower-start').onclick=()=>{sound.click();if(!profile.tower.run){startTowerRun(profile,profile.selected);persist();}startBattle('tower');};$('tower-quit').onclick=()=>{sound.click();endTowerRun(profile);persist();renderTower();renderTowerStrip();};$('home-league').onclick=()=>{sound.click();showView('league');};$('league-start').onclick=()=>{sound.click();startBattle('league');};$('home-map').onclick=()=>{sound.click();showView('story');};$('home-change').onclick=()=>{sound.click();$('roster').scrollIntoView({behavior:'smooth',block:'start'});};
  $('story-continue').onclick=()=>{sound.click();showView('story');};$('story-mini').onclick=()=>{sound.click();showView('story');};$('story-go').onclick=()=>{sound.click();goStory();};$('castle-egg').onclick=tapEgg;$('castle-back').onclick=()=>showView('story');$('castle-next').onclick=revealCastle;$('cup-start').onclick=()=>startBattle('cup');$('cup-teaser').onclick=()=>showView('cup');$('journey-start').onclick=continueJourney;$('challenge-start').onclick=()=>startBattle('challenge');$('upgrade-confirm').onclick=confirmUpgrade;$('workshop-back').onclick=()=>showView('cup');
  $('difficulty').onchange=()=>{profile.level=$('difficulty').value;persist();};
  $('brand-home').onclick=()=>handleNavigation('lobby');document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>handleNavigation(el.dataset.view));document.querySelectorAll('[data-home]').forEach(el=>el.onclick=()=>showView('lobby'));
  $('sound-toggle').onclick=()=>{profile.sound=!profile.sound;sound.unlock();sound.setEnabled(profile.sound);persist();};
  // A pinch or double tap during a battle would zoom the page and move what the child sees.
  for(const type of ['gesturestart','gesturechange','dblclick'])document.addEventListener(type,e=>{if(screen==='battle')e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',e=>{if(e.cancelable&&screen==='battle'&&(e.touches.length>1||!e.target.closest('dialog')))e.preventDefault();},{passive:false});
  // A phone with rotation locked can still play upright.
  $('rotate-anyway').onclick=()=>{document.body.classList.add('portrait-ok');try{localStorage.setItem('creature-league.portrait-ok','1');}catch{}};
  try{if(localStorage.getItem('creature-league.portrait-ok')==='1')document.body.classList.add('portrait-ok');}catch{}
  $('reveal-dialog').addEventListener('close',()=>{if(screen==='story'&&storyEvent)renderStory();});
  // Phones show the whole arena, still, unless the pause menu asks for the close camera (the old setting is not carried over).
  const readCam=()=>{try{return localStorage.getItem('creature-league.close-camera.v2')==='1';}catch{return false;}};renderer.closeCam=readCam();
  const camLabel=()=>{$('camera-toggle').textContent=renderer.closeCam?'מצלמה: קרובה · לחצו לכל הזירה':'מצלמה: כל הזירה · לחצו למצלמה קרובה';};camLabel();
  $('camera-toggle').onclick=()=>{sound.click();renderer.closeCam=!renderer.closeCam;renderer.cam=null;try{localStorage.setItem('creature-league.close-camera.v2',renderer.closeCam?'1':'0');}catch{}camLabel();};
  window.addEventListener('resize',()=>{if(screen==='battle')requestAnimationFrame(measureHud);});
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('אפשר לשחק גם בתצוגה הזאת.');}};
  $('help-open').onclick=openHelp;$('help-inline').onclick=openHelp;document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>$(el.dataset.close).close());
  $('pause-button').onclick=pauseBattle;$('resume-button').onclick=resumeBattle;$('leave-button').onclick=leaveBattle;
  $('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeBattle();});$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();leaveBattle();});
  window.addEventListener('keydown',e=>{
    if(screen!=='battle'||!match)return;
    if(e.code==='Escape'){if($('help-dialog').open)return;if(match.status==='paused'){e.preventDefault();resumeBattle();}else if(match.status!=='finished'){e.preventDefault();pauseBattle();}return;}
    if(document.querySelector('dialog[open]')||match.status==='paused'||match.status==='finished')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyJ'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='KeyE')pressSpecial(0);
    }
    // Player two's keys sit on the right of the keyboard.
    else if((match.versus||match.coop)&&['Enter','NumpadEnter','Numpad0','Slash','KeyF','KeyQ','ShiftRight','Period'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='KeyQ')pressSpecial(0);if(!e.repeat&&['ShiftRight','Period'].includes(e.code))pressSpecial(1);
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pauseBattle);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseBattle();if(online?.connected)onlineSend({type:'ping',...(document.hidden?{away:1}:{})});});
  const canvas=$('arena');canvas.addEventListener('contextmenu',e=>e.preventDefault());
  // A thumb that lands just beside the fire or super button meant that button: never a stream of manual shots into the corner.
  // After the finish a tap on the arena skips a freeing the child has already seen three times.
  let thumbFire=null,aimPointer=null;
  const nearButton=(x,y)=>{let best=null,bd=40;for(const id of ['fire-button','special-button']){const r=$(id).getBoundingClientRect();if(!r.width)continue;const d=Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom));if(d<bd){bd=d;best=id;}}return best;};
  canvas.addEventListener('pointerdown',e=>{if(match?.status==='finished'){if(renderer.skipFinale?.())finaleUntil=clock;return;}
    const near=e.pointerType==='mouse'?null:nearButton(e.clientX,e.clientY);if(match?.status!=='playing'&&!(near==='fire-button'&&match?.status==='countdown'))return;sound.unlock();e.preventDefault();
    if(near==='fire-button'){thumbFire=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}input.buttonFire=true;$('fire-button').classList.add('held');return;}
    if(near==='special-button'){pressSpecial(0);return;}
    canvas.focus({preventScroll:true});try{canvas.setPointerCapture(e.pointerId);}catch{}aimPointer=e.pointerId;input.aim=renderer.point(e.clientX,e.clientY);if(e.button===2)pressSpecial(0);else input.pointerFire=true;});
  canvas.addEventListener('pointermove',e=>{if(input.pointerFire&&e.pointerId===aimPointer)input.aim=renderer.point(e.clientX,e.clientY);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===thumbFire){thumbFire=null;input.buttonFire=false;$('fire-button').classList.remove('held');}else if(aimPointer==null||e.pointerId===aimPointer){aimPointer=null;input.pointerFire=false;input.aim=null;}});
  for(const [id,kind] of [['fire-button','fire'],['special-button','special']]){
    const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();if(match?.status!=='playing'&&!(kind==='fire'&&match?.status==='countdown'))return;sound.unlock();try{el.setPointerCapture(e.pointerId);}catch{}el.classList.add('held');if(kind==='fire')input.buttonFire=true;else pressSpecial(0);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>{el.classList.remove('held');if(kind==='fire')input.buttonFire=false;});
    el.addEventListener('keydown',e=>{if(e.code==='Enter'&&(match?.status==='playing'||kind==='fire'&&match?.status==='countdown')){e.preventDefault();if(!e.repeat){if(kind==='fire')input.toggleFire=!input.toggleFire;else pressSpecial(0);}}});el.addEventListener('blur',()=>{if(kind==='fire')input.buttonFire=false;});
  }
  // The joystick appears wherever the thumb lands on its side of the screen. In a friend battle the right side is player two's.
  bindStick($('stick-zone'),$('joystick'),$('joystick-knob'),input);bindStick($('stick-zone-2'),$('joystick-2'),$('joystick-knob-2'),input2);
  $('special-button-2').addEventListener('pointerdown',e=>{e.preventDefault();if(match?.status!=='playing')return;sound.unlock();try{$('special-button-2').setPointerCapture(e.pointerId);}catch{}$('special-button-2').classList.add('held');pressSpecial(1);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('special-button-2').addEventListener(event,()=>$('special-button-2').classList.remove('held'));
  $('home-versus').onclick=()=>{sound.click();showView('versus');};$('home-box').onclick=()=>{sound.click();showView('boxes');};$('box-chest').onclick=tapChest;
  $('player-chip').onclick=()=>handleNavigation('players');$('player-form').addEventListener('submit',savePlayerForm);$('player-cancel').onclick=()=>{sound.click();closePlayerForm();};$('versus-start').onclick=()=>{sound.click();if(versus.kind==='coop')startCoop();else startVersus(true);};
  for(const type of ['pointerdown','touchend','click','keydown'])document.addEventListener(type,()=>{if(sound.ctx?.state!=='running')sound.unlock();},{passive:true});
  document.addEventListener('click',()=>{if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>window.screen.orientation?.lock?.('landscape')).catch(()=>{});},{once:true});
}
function bindStick(zone,joystick,knob,state){
  let pointer=null;const ring=joystick.querySelector('.joystick-ring');
  const set=e=>{const rect=ring.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,r=rect.width*.42;let x=(e.clientX-cx)/r,y=(e.clientY-cy)/r;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}
    const power=d<.12?0:Math.min(1,d/.4);state.stickX=d?x/Math.min(1,d)*power:0;state.stickY=d?y/Math.min(1,d)*power:0;knob.style.transform=`translate(${x*r}px,${y*r}px)`;};
  const release=()=>{pointer=null;state.stickX=0;state.stickY=0;knob.style.transform='';for(const k of ['left','right','top','bottom'])joystick.style[k]='';joystick.classList.remove('floating');};
  zone.addEventListener('pointerdown',e=>{if(pointer!==null||match?.status==='finished')return;e.preventDefault();pointer=e.pointerId;try{zone.setPointerCapture(e.pointerId);}catch{}const box=joystick.offsetParent?.getBoundingClientRect()||{left:0,top:0};joystick.classList.add('floating');joystick.style.right='auto';joystick.style.left=(e.clientX-box.left-joystick.offsetWidth/2)+'px';joystick.style.top=(e.clientY-box.top-joystick.offsetHeight/2)+'px';joystick.style.bottom='auto';set(e);});
  zone.addEventListener('pointermove',e=>{if(e.pointerId===pointer)set(e);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(type,e=>{if(e.pointerId===pointer)release();});
  joystick.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;try{joystick.setPointerCapture(e.pointerId);}catch{}set(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)set(e);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(e.pointerId===pointer){pointer=null;state.stickX=0;state.stickY=0;knob.style.transform='';}});
}
// Read-only diagnostics. Browser journeys still operate the real controls.
// Verification only: advance a battle by simulated time and draw one frame, even in a hidden tab.
// With live=true the battle reads the real controls (sticks, buttons, keys), the way the frame loop does.
const advance=(seconds,input={},live=false)=>{if(!storagePrefix||!match)return false;for(let i=0;i<seconds*60&&match&&match.status!=='finished';i++){if(match.online&&online?.role==='guest'){coast(match,1/60);guestTick(1/60);continue;}tutorialGuard();if(match.online){step(match,live?currentInput():{fire:true,...input},1/60,online?.remote||{});if(online)online.remote.special=false;hostAfterStep();for(const e of match.events)if(e.type==='finish'){startFinale();onFinish();}continue;}if(live&&(match.versus||match.coop)){const [one,two]=versusInputs();step(match,one,1/60,two);input2.special=false;}else step(match,live?currentInput():{fire:true,...input},1/60);for(const e of match.events)if(e.type==='finish'){startFinale();onFinish();}}updateTutorial(seconds);if(!match)return false;renderer.render(match,1/60,clock+=seconds,1/60);renderHUD();return match.status;};
window.__LEAGUE__=Object.freeze({advance,online:()=>online?{role:online.role,code:online.code,connected:online.connected,friend:online.friend,wins:online.wins}:null,stick:()=>({x:+input.stickX.toFixed(2),y:+input.stickY.toFixed(2)}),audio:()=>({ctx:sound.ctx?.state||'none',scene:sound.scene,music:Object.fromEntries(Object.entries(sound.music||{}).map(([k,t])=>[k,{paused:t.el.paused,time:+t.el.currentTime.toFixed(1),ready:t.el.readyState,gain:+t.g.gain.value.toFixed(2)}]))}),skip:()=>{if(!match||match.status==='finished')return false;finish(match,0,'test');startFinale();onFinish();return true;},timeScale:()=>+timeScale().toFixed(3),cue:()=>cueLast&&{...cueLast},finale:()=>finaleLeft(),
  // Verification only: inject a battle event (a pip, a Wonder, a final blow…) or pre-roll the next battle.
  event:e=>{if(!storagePrefix||!match||!e||typeof e.type!=='string')return false;battleEvent({...e});renderHUD();return true;},queue:m=>storagePrefix?queueNext(m):null,camera:()=>({scale:+renderer.scale.toFixed(3),offsetX:Math.round(renderer.offsetX),offsetY:Math.round(renderer.offsetY),close:!!renderer.cam,cinematic:!!renderer.punch,size:renderer.size,lite:!!renderer.lite,ema:+(renderer.ema||0).toFixed(4),hud:renderer.hudBottom||0,cutin:(renderer.moments||[]).filter(M=>M.kind==='cutin'&&M.rect).map(M=>({side:M.side,x:Math.round(M.rect.x),y:Math.round(M.rect.y),w:Math.round(M.rect.w),h:Math.round(M.rect.h),corner:!!M.rect.corner}))}),snapshot:()=>({screen,mode,profile:JSON.parse(JSON.stringify(profile)),match:match?{status:match.status,challenge:match.challenge,time:match.time,countdown:match.countdown,level:match.level,winner:match.winner,reason:match.reason,mode:match.mode||null,wonder:match.wonder?{...match.wonder}:null,ending:match.ending?{...match.ending}:null,ball:match.ball?{x:match.ball.x,y:match.ball.y,carrier:match.ball.carrier,score:[...match.ball.score]}:null,wind:match.wind?{holder:match.wind.holder,feathers:match.wind.feathers.map(f=>({x:f.x,y:f.y}))}:null,lava:match.lava?{scale:match.lava.scale,embers:match.lava.embers.map(e=>({x:e.x,y:e.y}))}:null,trio:match.trio?[trioLeft(match,0),trioLeft(match,1)]:null,actors:match.actors.map(a=>({id:a.id,side:a.side,x:a.x,y:a.y,hp:a.hp,out:a.out||0,feathers:a.feathers||0,power:a.power||0,maxHp:a.spec.hp,superCharge:a.superCharge,form:a.form||0,pips:a.pips||0,canForm:!!a.canForm,formUsed:!!a.formUsed,sz:a.sz||1,upgrades:[...a.upgrades],boss:a.boss?{...a.boss}:null,stats:{...a.stats}})),covers:match.covers.map(c=>({...c})),zones:match.zones.map(z=>({...z})),shots:match.shots.length,shotDetails:match.shots.map(s=>({x:s.x,y:s.y,vx:s.vx,vy:s.vy,owner:s.owner})),pickup:match.pickup?{...match.pickup}:null}:null})});
async function boot(){
  $('load-retry').hidden=true;try{art=await loadArt(p=>$('loading-bar').style.width=p*100+'%');renderer=new Renderer($('arena'),art);refreshTodayGoals();buildRoster();renderStoryPanel();bindControls();updateHeader();
    {const q=new URLSearchParams(location.search),code=codeFromText(q.get('join'));if(code){q.delete('join');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''));showView('online');joinRoom(code);}else showView(players.players.length>1?'players':'lobby');}$('loading').hidden=true;$('app').hidden=false;requestAnimationFrame(frame);
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(error){console.error(error);$('loading-text').textContent='חלק מהציורים לא נטענו. בדקו שהמשחק נפתח דרך קובץ ההפעלה ונסו שוב.';$('load-retry').hidden=false;}
}
$('load-retry').onclick=()=>location.reload();if(location.protocol!=='file:')boot();

