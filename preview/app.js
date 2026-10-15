import {CREATURES,LEVELS,CUP,CHALLENGE,challengeUnlocked,journeyView,makeChallengeMatch,makeMatch,step,readProfile,saveProfile,recordResult,resultStats,clamp,startCup,needsUpgrade,chooseUpgrade,STARTERS,WILD,RARITY,SKINS,isUnlocked,releasedCount,wildLevel,makeWildMatch,skinById,skinUnlocked,skinOf,chooseSkin,flipCard,cardStats,finish} from './core.js';
import {upgradeOptions,cleanUpgrades} from './upgrades.js';
import {MODES,WIND_TARGET,WIND_HOLD,MAX_POWER,BALL_GOALS,trioLeft,GOALS} from './core.js';
import {SPARKS_PER_BOX,BOX_TIERS,FRAMES,boxTier,boxesWaiting,roadAhead,addSparks,openBox,chooseBoxPrize} from './core.js';
import {GOAL_SPARKS,dayKey,refreshDaily,progressDaily} from './core.js';
import {COOP_GIANTS,COOP_LEVELS} from './core.js';
import {goalPlace,arenasOpen} from './meta.js';
import {PROTOCOL,SNAPSHOT_EVERY,INPUT_HZ,CODE_CREATURES,randomCode,codeFromText,snapshot,applySnapshot,coast,packInput,unpackInput} from './net.js';
import {openHost,openGuest} from './link.js';
import * as sim from './core.js';
import {newChips,chipAsk,chipTick} from './meta.js';
import * as gfx from './art.js';
import {BLESSINGS,TOWER_GUARD_EVERY,TOWER_PICK_EVERY,towerFloor,towerStats,startTowerRun,makeTowerMatch,recordTower,chooseTowerPick,endTowerRun} from './core.js';
import {creatureLevel,levelProgress,levelBoost,MAX_LEVEL,LEVEL_BONUS,RANKS,PRIZE_EVERY,LEAGUE_SAFE,rankOf,nextRank,leagueLevel,nextPrizeAt,makeLeagueMatch,recordLeague} from './core.js';
import {WORLDS,CHAPTER2_START,inChapter2,bridgePieces,completeBridge,chapterOf,chapterSteps,chapterStars,worldReady} from './story.js';
import {trioTeam,missionEased,missionLevel,ISLANDS,STEPS,STORY_CARDS,STORY_CARD_IDS,currentStep,storyComplete,litIslands,starLit,islandOf,homeIsland,makeStoryMatch,recordStory,completeCastle,storyCardOwned,BATTLE_STEPS,starsOf,totalStars,islandStars,canReplay,friendlyStep,stepIndex} from './story.js';
import * as rules from './core.js';
import {RITUAL_HOLD,sessionAfterBattle,sessionRested,campfireReady,sparkWord,sparkTotal,sparkSteps,formCard,formBars,formDots,wonderPage,mostPlayed,historyLabel,arenaPicture,holdStep,pressWakes,byGender,arenaFallback,freshSession,labFileName,labDraft,labReady,labPick,mixPages,beatJudge,beatWindow} from './meta.js';
import * as tale from './story.js';
import {loadArt,createPuppet,drawPortrait,Renderer} from './art.js';
import {Sound} from './audio.js';
import {CLOUD} from './cloud-config.js';
import * as cloud from './cloud.js';
const $=id=>document.getElementById(id);
if('scrollRestoration' in history)history.scrollRestoration='manual';
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const storagePrefix=new URLSearchParams(location.search).has('verify')?'creature-league-check.':'';
// The sideways phone (wave 3): one phone mode for the screens, a shorter tier for the iPhone in Safari, and the upright phone that sees only the turn card.
const PHONE_Q='(orientation:landscape) and (max-height:500px) and (pointer:coarse)',SHORT_Q='(orientation:landscape) and (max-height:360px) and (pointer:coarse)',GATE_Q='(orientation:portrait) and (pointer:coarse) and (max-width:700px)';
const PHONE=matchMedia(PHONE_Q),SHORT=matchMedia(SHORT_Q),GATE=matchMedia(GATE_Q);let navStack=['lobby'],battleOrigin=null;
// Players on this device: each child has a name, a face and a separate save. Nothing leaves the device and there are no accounts.
// The first player keeps the original save, so a child who played before keeps everything.
const PLAYERS_KEY='creature-league.players',MAX_PLAYERS=6,FACES=Object.keys(CREATURES).filter(id=>!CREATURES[id].star);
const playerStorage=id=>{const suffix=id==='p1'?'':'.'+id;return {getItem:key=>localStorage.getItem(storagePrefix+key+suffix),setItem:(key,value)=>localStorage.setItem(storagePrefix+key+suffix,value),removeItem:key=>localStorage.removeItem(storagePrefix+key+suffix)};};
function readPlayers(){
  try{const d=JSON.parse(localStorage.getItem(storagePrefix+PLAYERS_KEY)),list=Array.isArray(d?.players)?d.players.filter(p=>p&&/^p\d{1,3}$/.test(p.id)).map(p=>({id:p.id,name:String(p.name||'').trim().slice(0,12),face:CREATURES[p.face]?p.face:null})):[];
    if(list.length)return {players:list,active:list.some(p=>p.id===d.active)?d.active:list[0].id};}catch{}
  return {players:[{id:'p1',name:'',face:null}],active:'p1'};
}
let players=readPlayers(),storage=playerStorage(players.active);
// Online users (cloud.js): api is null without a project in cloud-config.js, and on a page the project does not take (the real project
// only from the published https site, a fake only from this computer): then nothing in the game asks the network for them.
// The browser key is limited to the published game's address, so each call names the page it comes from (its path, never its ?query):
// a browser alone would send only the site. While the app goes to the background the last upload may finish there (keepalive, under 60 KB).
let cloudKeep=false,cloudOff=false,cloudCheck=false,C={};
const passes=new Map(),api=cloud.cloudApi(cloud.cloudFor(CLOUD,location.href),(url,init)=>fetch(url,{...init,referrer:location.origin+location.pathname,referrerPolicy:'no-referrer-when-downgrade',...(cloudKeep&&String(init?.body||'').length<60000?{keepalive:true}:{})})),cloudSync=cloud.syncer(cloudRound);
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
const MAP2_SPOTS={echo:[19,27],tracks:[22,64],patch:[78,67],distance:[80,27],tower:[50,21]},PIECE_ICON={echo:'ear',tracks:'pair',patch:'patch',distance:'arch'},BRIDGE_NAME={echo:'גשר הקול',tracks:'גשר הקצב'};
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
  // The island being played fills its gem a step at a time, so every win shows on Home; the gem lights whole when its guardian is beaten.
  if(step&&step.kind!=='castle'&&!inChapter2(profile)){const I=STEPS.filter(s=>s.island===step.island),g=$('home-gems').children[ISLANDS.findIndex(i=>i.id===step.island)];if(g&&!g.classList.contains('lit')&&I.indexOf(step)>0){g.classList.add('part');g.style.setProperty('--p',I.indexOf(step)/I.length);}}
  $('home-where').textContent=!step?journeyEnd():step.kind==='castle'?'הטירה הזהובה':islandOf(step.island).name+(step.kind==='castle'?'':' · שלב '+(STEPS.filter(s=>s.island===step.island).indexOf(step)+1)+' מתוך '+STEPS.filter(s=>s.island===step.island).length);
  $('home-title').textContent=!step?'קרב ליגה · דרגת '+rankOf(profile.league.trophies).name:stepTitle(step);
  livePortrait('home-portrait',c.id,{skin:skinOf(profile,c.id),hats:hatsFor(c.id)});renderBoxStrip();renderLeagueStrip();renderTowerStrip();renderGoalsStrip();renderWonderStrip();
  // In chapter 2 the line under the heading speaks of the bridges between the worlds.
  $('roster-prompt').textContent=inChapter2(profile)?'מחברים גשרים בין העולמות, משחררים יצורים ואוספים קלפים.':'משחררים יצורים מהצל, מדליקים את השרשרת ואוספים קלפים.';
  $('home-name').innerHTML=esc(c.name)+' · רמה '+creatureLevel(profile,c.id)+(formOn(c.id)?`<span class="home-crown" title="צורת־עוצמה">${crownArt()}</span>`:'');
  // A new player sees one road; the cup and training open after the first island.
  $('lobby').classList.toggle('early',profile.story.done<4);homeBadges();
}
// ------------------------------------------------------------------ the sideways phone: Home, its doors and the friends' screens
// Home is one screen: the creature (a tap opens the picker), the big Play, four doors and the badges in their fixed places.
// Nothing opens by itself: a Power Form that waits is the crown on the creature, Ron's box is his gift, and each opens on a tap.
// A locked thing never sends the child anywhere: it wiggles where it stands and says where it waits.
// The arenas wait for the first island, but the Wonder of the Day (after three battles) lives there too: its door opens for it, the other tiles keep their locks.
const arenasEarly=()=>!arenasOpen(profile.story.done),wonderOpen=()=>!!rules.wonderOfDay&&(profile.played||0)>=3,homeEarly=()=>arenasEarly()&&!wonderOpen();
function wiggle(el){if(!el)return;el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge');sound.tone?.(196,.14,'triangle',.06);}
function homeBadges(){
  const early=homeEarly(),door=$('home-arenas'),crown=typeof ritualWaiting==='function'?ritualWaiting():null,gift=maybeWelcome(),p=activePlayer();
  door.classList.toggle('locked',early);door.querySelector('use').setAttribute('href',early?'#i-lock':'#i-trophy');door.querySelector('.door-wait').hidden=!early;door.setAttribute('aria-label',early?'זירות: נפתחות אחרי האי הראשון':'זירות');
  door.onclick=()=>{if(homeEarly()){wiggle(door);return;}sound.click();showView('arenas');renderArenas();};
  $('home-crown').hidden=!crown;setBadge('crown',!!crown);if(crown)$('home-crown-art').innerHTML=crownArt();
  $('home-crown').onclick=()=>{const id=typeof ritualWaiting==='function'?ritualWaiting():null;sound.click();if(id)openRitual(id,{back:()=>renderHome()});else renderHome();};
  $('home-gift').hidden=!gift;setBadge('gift',gift);$('home-gift').onclick=()=>{sound.click();if(!openWelcomeBox())renderHome();};
  setBadge('goals',profile.daily.goals.some(g=>!g.done));setBadge('cards',profile.newCards.length);
  // Who plays: a face on Home, where the bar of a computer shows the chip.
  $('home-player').hidden=!PHONE.matches;$('home-player-name').textContent=playerName(p);$('home-player').setAttribute('aria-label','מי משחק? '+playerName(p));livePortrait('home-player-face',faceOf(p),{skin:skinOf(profile,faceOf(p))});
  $('home-player').onclick=()=>{sound.click();showView('players');};$('home-change').onclick=$('home-portrait').onclick=()=>{sound.click();openPicker();};
}
// The picker: the team as chips beside the chosen creature; a tap chooses at once, the big button closes. The ones still waiting show a lock and their place.
// A computer (or a tablet) keeps its team on the page under Home, so there the button still slides down to it.
function openPicker(){if(!PHONE.matches){$('roster').scrollIntoView({behavior:'smooth',block:'start'});return false;}const d=$('pick-dialog');renderPicker();if(!d.open)d.showModal();pickInView();sound.unlock?.();return true;}
// The shelf opens at its start (a creature just freed is first there), and slides to the chosen creature when it sits past the edge.
function pickInView(){const s=$('pick-chips'),el=s.querySelector('.chosen');s.scrollLeft=0;if(!el)return;const a=s.getBoundingClientRect(),b=el.getBoundingClientRect();if(b.left<a.left||b.right>a.right)s.scrollLeft+=b.left+b.width/2-(a.left+a.width/2);}
const waitPlace=c=>c.box?'תיבת זהב':c.star?'הטירה הזהובה':islandOf(homeIsland(c.id))?.name||'מסע השרשרת',waitIn=c=>c.star?'בטירה הזהובה':'ב'+waitPlace(c);
function renderPicker(){
  const all=Object.values(CREATURES),fresh=k=>profile.newCards.includes(k.id),open=all.filter(k=>isUnlocked(profile,k.id)).sort((x,y)=>fresh(y)-fresh(x)),wait=all.filter(k=>!isUnlocked(profile,k.id));if(!isUnlocked(profile,profile.selected))profile.selected='maimi';
  $('pick-chips').innerHTML=open.map(k=>`<button class="fighter-chip${k.id===profile.selected?' chosen':''}" data-pick="${k.id}" aria-pressed="${k.id===profile.selected}" style="--c:${k.color}"><canvas id="pick-${k.id}" aria-hidden="true"></canvas><b>${k.name}</b></button>`).join('')+
    wait.map(k=>`<button class="fighter-chip waiting" data-pick-wait="${k.id}" aria-label="${k.name} מחכה ${waitIn(k)}" style="--c:${k.color}"><span class="pick-lock">${icon(k.box||k.star?'star':'lock')}</span><b>${k.name}</b><small>${waitPlace(k)}</small></button>`).join('');
  for(const k of open)livePortrait('pick-'+k.id,k.id,{skin:skinOf(profile,k.id),hats:hatsFor(k.id)});pickHero();
  document.querySelectorAll('[data-pick]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.pick;persist();sound.click();document.querySelectorAll('[data-pick]').forEach(b=>{b.classList.toggle('chosen',b===el);b.setAttribute('aria-pressed',String(b===el));});pickHero();});
  document.querySelectorAll('[data-pick-wait]').forEach(el=>el.onclick=()=>{wiggle(el);el.classList.add('told');clearTimeout(el.toldTimer);el.toldTimer=setTimeout(()=>el.classList.remove('told'),2600);});$('pick-go').onclick=()=>{sound.click();$('pick-dialog').close();};
}
function pickHero(){const c=CREATURES[profile.selected];livePortrait('pick-portrait',c.id,{skin:skinOf(profile,c.id),hats:hatsFor(c.id)});$('pick-name').textContent=c.name+' · רמה '+creatureLevel(profile,c.id);$('pick-line').textContent=c.special;$('pick-hero').style.setProperty('--c',c.color);}
// The arenas (זירות): a tile for each place to fight outside the story, and training with its three choices and its own big button.
function renderArenas(){
  const early=arenasEarly();renderLeagueStrip();renderTowerStrip();renderWonderStrip();renderJourney();$('arenas').classList.toggle('early',early);
  for(const [id,go] of [['home-league',()=>showView('league')],['home-tower',()=>showView('tower')],['home-wonder',()=>startBattle('wonder')],['journey-start',continueJourney]]){const el=$(id),lock=early&&id!=='home-wonder';
    el.classList.toggle('locked',lock);el.querySelector('.tile-wait')?.remove();if(lock)el.insertAdjacentHTML('beforeend',`<small class="tile-wait">${icon('lock')}אחרי האי הראשון</small>`);
    el.onclick=()=>{if(el.classList.contains('locked')){wiggle(el);return;}sound.click();go();};}
  // Training waits for the first island too: its button says so (the Wonder's tile may already be open beside it).
  const q=$('quick-start');q.classList.toggle('locked',early);q.innerHTML=early?icon('lock')+' אחרי האי הראשון':'לקרב! '+icon('play');
  q.onclick=()=>{if(arenasEarly()){wiggle(q);return;}startBattle('quick');};
}
// Every window over Home that can change a badge (the picker, a card or a Power Form, Ron's box) redraws Home when it closes.
for(const id of ['pick-dialog','reveal-dialog','hatbox-dialog'])$(id)?.addEventListener('close',()=>{if(screen!=='lobby')return;if(id==='pick-dialog')refreshSelection();renderHome();});
// Verification: what Home shows (doors, badges, who plays); the picker opens only on a verify save.
(window.__LEAGUE_FIT__??={}).home=()=>({doors:['home-map','home-cards','home-arenas','home-versus'].map(id=>({id,shown:!!$(id)?.offsetParent,locked:!!$(id)?.classList.contains('locked')})),
  badges:Object.fromEntries(['cards','boxes','goals','gift','crown'].map(n=>{const b=document.querySelector(`#lobby [data-badge="${n}"]`);return [n,!b||b.hidden?null:b.classList.contains('dot')?true:b.textContent];})),player:$('home-player-name').textContent,picker:$('pick-dialog').open});
window.__LEAGUE_FIT__.picker=()=>!!storagePrefix&&openPicker();
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
    if(el.classList.contains('here'))(BATTLE_STEPS.some(s=>s.island===id&&canReplay(profile,s.id))?openIsland(id):goStory());else if(el.classList.contains('done'))openIsland(id);else journeyWait(el,'עוד לא. קודם מסיימים את '+stepLabel(step)+'.');});
  const line=storyEvent?.step?.after||(ch2?STEPS[CHAPTER2_START-1].after:!step?STEPS.at(-1).after:profile.story.done===0?'היי, אני הצל הקטן. פעם הייתי הצל הגדול, ועכשיו אני רוצה לתקן. השרשרת שלי מובילה לארבעה איים. בוא נשחרר את היצורים שעדיין בצל!':step.kind==='castle'?'ארבעת האורות דולקים, והכוכב הזהוב מוביל לטירה. אני... קצת מפחד. תבוא איתי?':'הבא בתור: '+stepLabel(step)+'.');
  const holdLine=pendingReveal||$('reveal-dialog').open;
  if(!holdLine)say('story-guide',line,{voice:storyEvent?.step?(chapterOf(storyEvent.step)<=2?'voice-shadow-after-'+storyEvent.step.id:null):ch2?null:!step?'voice-shadow-after-castle':profile.story.done===0?'voice-shadow-hello':step?.kind==='castle'?'voice-shadow-castle-door':null});
  if(!holdLine&&storyEvent?.lit)setTimeout(()=>document.querySelector(`#story-necklace .gem:nth-child(${ISLANDS.findIndex(i=>i.id===storyEvent?.lit)+1})`)?.classList.add('just-lit'),300);
  if(!holdLine)storyEvent=null;
  $('story-go').innerHTML=!step?'לאלבום הקלפים '+icon('arrow'):step.kind==='castle'?'נכנסים לטירה '+icon('arrow'):ch2?'לפרק 2 '+icon('arrow'):'לקרב! '+icon('play');
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
    if(el.classList.contains('here'))(BATTLE_STEPS.some(s=>s.island===id&&canReplay(profile,s.id))?openIsland(id):step?goStory():openIsland(id));else if(el.classList.contains('done'))openIsland(id);else journeyWait(el,'עוד לא. קודם מסיימים את '+stepLabel(step)+'.');});
  const tracksDone=worldReady('tracks')&&bridgePieces(profile).includes('tracks');
  document.querySelectorAll('[data-soon]').forEach(el=>el.onclick=()=>{sound.click();journeyWait(el,tracksDone?'העולם הזה עוד מנותק. הגשר אליו נבנה עכשיו.':'העולם הזה עוד מנותק. נגיע אליו אחרי ארץ שני המסלולים.');});
  const first=profile.story.done===CHAPTER2_START&&!storyEvent,holdLine=pendingReveal||$('reveal-dialog').open;
  const line=storyEvent?.step?.after||(first?'שבר המסכה... הסמל עליו מתחיל לזהור! ארבעה גשרים נותקו. אם לא נחבר אותם, הבא עלול להיות שלנו. מתחילים בעמק ההדים. רון!':!step?(tracksDone?'גשר הקצב חזר, וזנקור וצעדון רצים עליו ביחד! יער הטלאים עוד בדרך. בינתיים אפשר לשחק שוב ולאסוף כוכבים.':'זנקור הצטרף אלינו! ההמשך של ארץ שני המסלולים עוד בדרך. בינתיים אפשר לשחק שוב ולאסוף כוכבים.'):'הבא בתור: '+stepLabel(step)+'.');
  if(!holdLine){say('story-guide',line,{who:first?'ron':'shadow'});if(storyEvent?.bridge){const id=storyEvent.bridge;setTimeout(()=>document.querySelector(`#story-necklace [data-piece="${id}"]`)?.classList.add('just-lit'),300);}storyEvent=null;}
  $('story-go').innerHTML=!step?'לאלבום הקלפים '+icon('arrow'):step.kind==='bridge'?'ל'+(BRIDGE_NAME[step.island]||'גשר')+' '+icon('arrow'):'לקרב! '+icon('play');$('story-go').onclick=()=>{sound.click();goStory();};
}
function goStory(){replayStep=null;const step=currentStep(profile);if(!step){showView('cards');return;}if(step.kind==='castle'){castle={phase:'mend',filled:0,taps:0};showView('castle');return;}
  if(step.kind==='bridge'){bridge={phase:'intro',got:0,step,used:[]};showView('bridge');sound.line?.('voice-shadow-'+step.id);return;}storyIntro=true;wildTarget=step.rival||null;showView('wild');}
function openIsland(id){
  const isl=islandOf(id),steps=BATTLE_STEPS.filter(s=>s.island===id),st=islandStars(profile,id);
  $('island-title').textContent=isl.name;$('island-stars').textContent='★ '+st.got+' מתוך '+st.max;
  $('island-steps').innerHTML=steps.map(s=>{const n=starsOf(profile,s.id),open=canReplay(profile,s.id),next=currentStep(profile)?.id===s.id;return `<div class="island-step"><div><b>${s.kind==='mission'?MODES[s.mode].name:s.kind==='free'?CREATURES[s.rival].name:s.kind==='mirror'?'הבבואה שלך':s.title}</b><small>${s.kind==='mission'?'משימה':s.kind==='free'?'שחרור מהצל':s.kind==='mirror'?'האומץ שלך':chapterOf(s)===2?byGender(CREATURES[s.rival],'שומר העולם','שומרת העולם'):'שומר האי'}</small></div><span class="island-step-stars" aria-label="${n} כוכבים">${stars(n)}</span>${open?`<button class="button ${n<3?'primary':'secondary'}" data-replay="${s.id}">${n<3?'לשלושה כוכבים':'שוב'}</button>`:next?'<button class="button primary" data-next-step>לשלב הבא!</button>':'<span class="island-step-lock">'+icon('lock')+'</span>'}</div>`;}).join('');
  {const cur=currentStep(profile);if(cur&&cur.island===id&&!steps.includes(cur))$('island-steps').insertAdjacentHTML('beforeend',`<div class="island-step"><div><b>${stepLabel(cur)}</b><small>השלב הבא</small></div><span></span><button class="button primary" data-next-step>לשלב הבא!</button></div>`);}
  document.querySelector('[data-next-step]')?.addEventListener('click',()=>{sound.click();$('island-dialog').close();goStory();});
  document.querySelectorAll('[data-replay]').forEach(el=>el.onclick=()=>{sound.click();$('island-dialog').close();replayStep=STEPS[stepIndex(el.dataset.replay)];storyIntro=true;wildTarget=null;showView('wild');});
  if(!$('island-dialog').open)$('island-dialog').showModal();
}
// ------------------------------------------------------------------ the sideways phone: the journey and the screens before a battle
// A place that is not open yet never moves the child: it wiggles where it waits, and the Little Shadow says what comes first.
function journeyWait(el,line){const d=el?.querySelector('.spot-dot')||el;if(d){d.classList.remove('nudge');void d.offsetWidth;d.classList.add('nudge');}say('story-guide',line);}
// A row of creatures that slides sideways: the chosen one is always in sight, never under the faded edge.
function shelfShow(row){const c=row?.querySelector('.chosen');if(!c||!row.clientWidth)return;const r=row.getBoundingClientRect(),b=c.getBoundingClientRect();if(b.left<r.left+32)row.scrollLeft-=r.left+32-b.left;else if(b.right>r.right-8)row.scrollLeft+=b.right-r.right+8;}
// Verification: what each journey screen must show on arrival (its big button first), and the two journey windows.
const JOURNEY_SEEN={story:['#story-go','#story .map-frame','#story-necklace','#story-stars'],wild:['#wild-start','#wild-stage','#wild-name','#wild-fighters'],league:['#league-start','#league-road','#league-rank','#league-fighters'],tower:['#tower-start','#tower-art','#tower-fighters','#tower-picks'],castle:['#castle-next','#castle-stage','#castle-gems'],bridge:['#bridge-play','#bridge-next','#bridge-stage','#bridge-pads'],campfire:['#campfire-back','#campfire-portrait']};
(window.__LEAGUE_FIT__??={}).journey=()=>({screen,seen:JOURNEY_SEEN[screen]||null,island:$('island-dialog').open,trio:$('team-dialog').open?document.querySelectorAll('#team-slots [data-slot]').length:null,chosen:document.querySelector('.view:not([hidden]) .ph-shelf .chosen b')?.textContent||null});
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
const NOTE_FREQ=[523,659,784];let bridge={phase:'intro',got:0,step:null,used:[]},bridgeTimers=[];
function playBridgeTune(){if(bridge.step?.beats){startBeats();return;}bridgeTimers.forEach(clearTimeout);bridgeTimers=[];bridge.phase='listen';bridge.got=0;renderBridge();
  const notes=bridge.step.notes;notes.forEach((n,i)=>bridgeTimers.push(setTimeout(()=>{if(screen!=='bridge')return;sound.tone?.(NOTE_FREQ[n],.55,'triangle',.16);sound.tone?.(NOTE_FREQ[n],.4,'sine',.05,0,.22);const el=document.querySelector(`[data-pad="${n}"]`);el?.classList.remove('sing');void el?.offsetWidth;el?.classList.add('sing');},500+i*820)));
  bridgeTimers.push(setTimeout(()=>{if(screen!=='bridge')return;bridge.phase='play';renderBridge();},500+notes.length*820+200));}
// The beat bridge of the Two Tracks: four drum beats to listen to, then the drum keeps the beat and the child taps along.
// A tap near a beat lights a quarter of the bridge; a miss simply does not count. After a while the drum rests until 'עוד פעם'.
const BEAT_PLAY=24,beatPeriod=()=>60/(bridge.step?.bpm||100);
function startBeats(){bridgeTimers.forEach(clearTimeout);bridgeTimers=[];const P=beatPeriod()*1000,B=bridge.step.beats;bridge.phase='listen';bridge.used=[];bridge.t0=performance.now()+500;renderBridge();
  for(let n=0;n<B+BEAT_PLAY;n++)bridgeTimers.push(setTimeout(()=>{if(screen!=='bridge'||bridge.phase==='done')return;bridgeBeat(n);},500+n*P));
  // The drum invites the taps half a beat before the first beat that counts.
  bridgeTimers.push(setTimeout(()=>{if(screen==='bridge'&&bridge.phase==='listen'){bridge.phase='play';renderBridge();}},500+(B-.5)*P));
  bridgeTimers.push(setTimeout(()=>{if(screen==='bridge'&&bridge.phase==='play'){bridge.phase='rest';renderBridge();}},500+(B+BEAT_PLAY-.5)*P));}
function bridgeBeat(n){if(sound.beatTick)sound.beatTick(n%2===0);else sound.tone?.(n%2===0?196:165,.14,'triangle',.2,-40);
  const pad=document.querySelector('[data-beat]');if(pad){pad.classList.remove('beat');void pad.offsetWidth;pad.classList.add('beat');}drawBridgeBeat(1);bridgeTimers.push(setTimeout(()=>drawBridgeBeat(0),160));}
function tapBeat(){const pad=document.querySelector('[data-beat]');if(bridge.phase!=='play'||!pad)return;pad.classList.remove('tap');void pad.offsetWidth;pad.classList.add('tap');
  const n=beatJudge((performance.now()-bridge.t0)/1000,{period:beatPeriod(),from:bridge.step.beats,used:bridge.used});
  if(n<0){sound.tone?.(262,.12,'sine',.05);return;}
  bridge.used.push(n);bridge.got++;sound.tone?.(NOTE_FREQ[Math.min(2,bridge.got-1)]*(bridge.got>3?1.5:1),.35,'triangle',.15);
  if(bridge.got>=bridge.step.beats){bridgeDone();return;}renderBridge();}
// The beat bridge drawn from the painted bridge of light when it is there; the ink arc of the echo bridge otherwise.
function drawBridgeBeat(pulse=0){const cv=$('bridge-beat');if(!cv||cv.hidden||!bridge.step?.beats)return;gfx.drawBeatBridge?.(cv,{lit:bridge.phase==='done'?bridge.step.beats:bridge.got,pulse});}
function renderBridge(){
  const step=bridge.step;if(!step){showView('story');return;}const beats=step.beats|0,parts=beats||3;
  {const img=$('bridge-img');if(img){const src=arenaPicture(step.island);img.onerror=()=>{img.onerror=null;img.src=arenaFallback(step.island);};if(img.getAttribute('src')!==src&&img.getAttribute('src')!==arenaFallback(step.island))img.src=src;}}
  $('bridge-eyebrow').textContent=islandOf(step.island).name;$('bridge-title').innerHTML=bridge.phase==='done'?'הגשר <em>חזר!</em>':(BRIDGE_NAME[step.island]||'הגשר').replace(/ (\S+)$/,' <em>$1.</em>');
  $('bridge-hint').textContent=beats?({intro:'מקשיבים לארבע פעימות, ואז מקישים על התוף איתן.',listen:'מקשיבים…',play:'עכשיו אתם! הקישו בקצב.',rest:'התוף נח. עוד פעם?',done:'כל הכבוד!'})[bridge.phase]||'':bridge.phase==='intro'?'מקשיבים לשלושה צלילים, ואז מקישים אותם באותו הסדר.':bridge.phase==='listen'?'מקשיבים…':bridge.phase==='play'?'עכשיו אתם! הקישו על האבנים לפי הסדר.':'כל הכבוד!';
  // One long arch from cliff to cliff, in parts that light up one by one (three notes, or four beats).
  $('bridge-arc').innerHTML=Array.from({length:parts},(_,i)=>{const pts=[];for(let k=0;k<=12;k++){const x=20+(i+k/12)*360/parts,y=104-86*(1-((x-200)/180)**2);pts.push(x.toFixed(1)+' '+y.toFixed(1));}return `<path class="arc-seg${i<bridge.got||bridge.phase==='done'?' on':''}" d="M${pts.join(' L')}"/>`;}).join('');
  {const cv=$('bridge-beat'),painted=!!(beats&&gfx.drawBeatBridge&&fxSrc('bridge-light'));cv.hidden=!painted;$('bridge-arc').classList.toggle('under-light',painted);if(painted)requestAnimationFrame(()=>drawBridgeBeat(0));}
  if(beats){const drum=fxSrc('drum'),lit=fxSrc('drum-lit');$('bridge-pads').innerHTML=`<button class="beat-pad${drum?' painted':''}" data-beat aria-label="תוף הקצב" ${bridge.phase==='play'?'':'disabled'}>${drum?`<img class="drum-off" src="${drum}" alt=""><img class="drum-on" src="${lit||drum}" alt="">`:icon('drum')}</button><span class="beat-dots" aria-hidden="true">${Array.from({length:beats},(_,i)=>`<i class="${i<bridge.got||bridge.phase==='done'?'on':''}"></i>`).join('')}</span>`;
    const pad=$('bridge-pads').querySelector('[data-beat]');pad.onpointerdown=e=>{e.preventDefault();tapBeat();};pad.onkeydown=e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();tapBeat();}};}
  else{$('bridge-pads').innerHTML=[0,1,2].map(n=>`<button class="echo-pad n${n}" data-pad="${n}" aria-label="אבן ${n+1}" ${bridge.phase!=='play'?'disabled':''}>${icon('sound')}</button>`).join('');
    document.querySelectorAll('[data-pad]').forEach(el=>el.onclick=()=>tapPad(+el.dataset.pad));}
  $('bridge-pads').classList.toggle('beats',!!beats);
  $('bridge-play').hidden=beats?!['intro','play','rest'].includes(bridge.phase):bridge.phase!=='intro'&&bridge.phase!=='play';$('bridge-play').innerHTML=(bridge.phase==='intro'?'מקשיבים':'עוד פעם')+' '+icon(beats?'drum':'sound');
  $('bridge-next').hidden=bridge.phase!=='done';$('bridge-next').innerHTML='ממשיכים '+icon('arrow');$('bridge-next').onclick=()=>goUp();
  $('bridge-symbol').innerHTML=bridgeHTML();
  if(bridge.phase==='intro')say('bridge-guide',step.intro);else if(bridge.phase==='done')say('bridge-guide',step.after);
}
function tapPad(n){if(bridge.phase!=='play')return;const want=bridge.step.notes[bridge.got];sound.tone?.(NOTE_FREQ[n],.4,'triangle',.15);
  if(n!==want){sound.tone?.(180,.3,'sawtooth',.06,-60);say('bridge-guide','כמעט! מקשיבים שוב מההתחלה.');bridgeTimers.push(setTimeout(playBridgeTune,900));bridge.phase='listen';renderBridge();return;}
  bridge.got++;if(bridge.got<bridge.step.notes.length){renderBridge();return;}
  bridgeDone();}
// The bridge is back: the world's piece joins the living bridge, and a star box spark for the way.
function bridgeDone(){bridgeTimers.forEach(clearTimeout);bridgeTimers=[];const world=completeBridge(profile);addSparks(profile,SPARKS_PER_BOX);persist();bridge.phase='done';storyEvent={step:bridge.step,bridge:world};sound.reveal(true);renderBridge();
  setTimeout(()=>document.querySelector(`#bridge-symbol [data-piece="${world}"]`)?.classList.add('just-lit'),200);notify('קיבלתם תיבת כוכב על הגשר!');}
let selectedUpgrade=null;
const buildChips=(id,ids)=>upgradeOptions(CREATURES[id]).filter(u=>cleanUpgrades(ids).includes(u.id)).map(u=>`<span class="build-chip">${icon(u.icon)}${u.name}</span>`).join('');
const bossAdvice='המגן של סלעוז חוסם ירי מלפנים. זוזו ממסלול ההסתערות ותקפו כשהוא מתאושש.';
const rivalAdvice={slauz:bossAdvice,havzuk:'הבזוק מהיר אבל יש לו פחות חיים. התרחקו מפרץ החשמל ותקפו אחרי ההבזק.',maimi:'הגל של מיימי דוחף ומאט. זנקו הצדה וחזרו לתקוף.',
  windguard:'שומר הרוחות שולח טורנדו. זוזו הצידה מהדרך שלו!',seaguard:'הצב העתיק איטי מאוד. כשהוא מפעיל את טבעת הגאות, חכו שהיא תיעלם ורק אז תירו.',fireguard:'אריה האש שואג אש קדימה. אל תעמדו מולו מקרוב, וזוזו מהרצפה הבוערת.',zoharon:'כשמופיעים עיגולים זהובים על הרצפה, צאו מהם מהר: כוכבים נופלים!',chutal:'חוטל זורקת חוט אור שמושך אליה. כשהחוט עף, זוזו הצידה.',ozenav:'כשזזים, אוזנב נעלם. עמדו רגע בשקט, ראו איפה הוא, ואז ירו לשם.',rishrush:'כשהפעמונים מצלצלים ומאירים, עוד רגע יוצא עיגול צלילים. התרחקו, או התקרבו ממש אליו.',kashevet:'כשהאבן על החזה מאירה, צאו מהעיגול: גל השקט לא נותן לירות. בחצי החיים היא עפה ונוצות נופלות: זוזו מהעיגולים.',zankor:'זנקור בורח מהר. אל תרדפו אחריו: חכו שייעצר בקצה, ואז ירו.',hedanon:'כשמופיעות טבעות סגולות על הרצפה, צאו מהן: ההד פוגע פעמיים.',tlaor:'טלאור מתקן אבנים ואת עצמו. תקפו אותו מהר, לפני שהוא תופר הכל.',kokhavit:'כשהמגן שלה מאיר, הפגיעות הראשונות נבלעות. תירו כמה יריות קטנות כדי לשבור אותו.',
  lohatan:'לוהטן כבד ואיטי. זוזו הצידה מכדור האש ואל תעמדו על אדמה בוערת.',tehomon:'לתהומון המון חיים. כשמופיעה מערבולת, צאו ממנה מהר, והיא גם בולעת קליעים.',zikuk:'זיקוק יורה קרן ישרה ורחוקה. אל תעמדו מולו בקו ישר, והתקרבו אליו.',
  retetoz:'רטטוז צץ פתאום לידכם. כשהוא נעלם, התכוננו לחמוק.',tzlilon:'צלילון קטן וחלש, אבל ההיפנוט שלו מקפיא. שמרו ממנו מרחק.',shorshu:'כשמופיע עיגול ירוק מתחתיכם, זוזו לפני שהשורשים תופסים!',galgalor:'גלגל אור יורה לכל הכיוונים. רחוק ממנו פחות קליעים פוגעים.',
  tzadon:'צעדון כבד ומשוריין. כשהוא דורך, צאו מהעיגולים: כל דריכה מגיעה רחוק יותר.',rhythmdeer:'אייל הקצב תוקף על הפעימה. בין פעימה לפעימה החזה שלו נפתח: זה הרגע לירות!'};
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
  const c=CREATURES[id],r=RARITY[c.rarity]||RARITY['רגיל'],look=skinById(skin),design=form?labFor(id):null,mech=design?rules.MECHS?.[design.mech]:null;
  return `<article class="tcard rarity-${r.stars} skin-${look.id}${big?' big':''}${frame?' frame-'+frame:''}${form?' form':''}" style="--c:${c.color};--d:${c.dark}" data-el="${ELEMENT_ART[c.element]||'water'}">
    <header><span class="tcard-num">#${c.number}</span>${profile.creatures[id]&&creatureLevel(profile,id)>1?`<span class="tcard-level${creatureLevel(profile,id)>=MAX_LEVEL?' master':''}">רמה ${creatureLevel(profile,id)}</span>`:''}<span class="tcard-el">${icon(c.specialIcon)}${c.element}</span></header>
    <div class="tcard-art"><canvas id="${canvasId}" aria-hidden="true"></canvas>${look.id!=='base'?`<span class="tcard-skin">${look.name}</span>`:''}${form?`<span class="tcard-stamp">${crownArt()}עוצמה</span>`:''}${mech?`<span class="tcard-mech">${icon(mech.icon)}<b>${esc(mech.words)}</b></span>`:''}</div>
    <div class="tcard-title"><h3>${design?esc(design.name):c.name}</h3><small>${form?(design?c.name+' · צורת־עוצמה':'צורת־עוצמה'):c.role}</small></div>
    <div class="tcard-special">${icon(c.specialIcon)}<b>${c.special}</b></div>
    <ul class="tcard-bars">${cardBars(c,form)}</ul>
    <footer><span class="tcard-stars" aria-label="${c.rarity}">${stars(r.stars)}</span>${design?`<span class="tcard-emblem">${icon('lab')}<small>${esc(rules.FORM_CREDIT||'')}</small></span>`:`<span>${c.rarity}</span>`}</footer>
  </article>`;
}
function storyCardHTML(id,{big=false}={}){const c=STORY_CARDS[id];
  return `<article class="tcard story-card rarity-${(RARITY[c.rarity]||RARITY['רגיל']).stars}${big?' big':''}" style="--c:${c.color};--d:${c.dark}"><header><span class="tcard-num">${c.number}</span><span class="tcard-el">${icon('star')}${c.element}</span></header>
    <div class="tcard-art story-art"><img src="${c.art}" alt=""></div><div class="tcard-title"><h3>${c.name}</h3><small>${c.role}</small></div><div class="tcard-special">${icon('sparkle')}<b>${c.special}</b></div>
    ${c.bars.length?`<ul class="tcard-bars">${c.bars.map(([label,value,pct])=>`<li><span>${label}</span><i><em style="width:${pct}%"></em></i><b>${value}</b></li>`).join('')}</ul>`:`<p class="tcard-note">${c.description}</p>`}
    <footer><span class="tcard-stars">${stars((RARITY[c.rarity]||RARITY['רגיל']).stars)}</span><span>קלף סיפור</span></footer></article>`;}
function cardBack(id,{label='ליגת היצורים'}={}){const c=CREATURES[id]||STORY_CARDS[id];return `<article class="tcard tcard-back" style="--c:${c?.color||'#68ebcf'}"><div class="tcard-emblem">${icon('bolt')}</div><b>${label}</b>${c?`<small>${/^[0-9]/.test(c.number)?'#':''}${c.number}</small>`:''}</article>`;}
function notify(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,5000);}
function persist(){if(!saveProfile(storage,profile)&&!saveNoticeShown){notify('השמירה במכשיר אינה זמינה. אפשר להמשיך לשחק עד שסוגרים את הדף.');saveNoticeShown=true;}cloudTouch();updateHeader();}
function updateHeader(){{const p=activePlayer();$('player-chip-name').textContent=playerName(p);livePortrait('player-chip-face',faceOf(p),{skin:skinOf(profile,faceOf(p))});}$('header-wins').textContent=profile.league.trophies;$('cards-badge').hidden=!profile.newCards.length;$('cards-badge').textContent=profile.newCards.length;setBadge('cards',profile.newCards.length);$('sound-toggle').innerHTML=icon(profile.sound?'sound':'muted');$('sound-toggle').setAttribute('aria-label',profile.sound?'השתקת צליל':'הפעלת צליל');$('sound-toggle').setAttribute('aria-pressed',String(!profile.sound));cloudMarks();}
function showView(name){
  if(LAB_ASKED&&!labOpened){labOpened=true;name='lab';}
  const from=screen;metaInit();
  // Coming to the boxes from anywhere else always starts at the waiting chest, never at the last box's prizes.
  if(name==='boxes'&&from!=='boxes')boxUI={taps:0,result:null,chosen:null};
  if(screen!==name)window.scrollTo(0,0);
  screen=name;for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;
  navShown(name,from);
  // Leaving the two-phone room for anything but its own battle closes the room (the house, the up arrow, the system back): the friend's phone hears it.
  if(online&&name!=='online'&&name!=='battle'){onlineSend({type:'bye'});onlineReset();}
  // A pause window never stays over a screen that is not the battle.
  if(name!=='battle'&&$('pause-dialog').open)$('pause-dialog').close();
  document.body.classList.toggle('battle-active',name==='battle');if(name!=='battle')chosenTrio=null;
  {const v=$(name);if(v&&name!=='battle'){v.classList.remove('view-enter');void v.offsetWidth;v.classList.add('view-enter');}}
  // On a touch screen a battle asks again for the full screen and the sideways lock, where the phone has them (never on an iPhone).
  if(name==='battle')fullOn();
  if(name==='battle')window.scrollTo(0,0);
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===name||el.dataset.view==='lobby'&&['cup','workshop','challenge','wild','story','castle','versus','boxes','league','tower','goals','online','bridge','campfire'].includes(name)));
  if(name!=='battle'){clearInput();sound.setScene('lobby');sound.resume();document.body.classList.remove('versus-play');}
  if(name!=='wild')storyIntro=storyIntro&&name==='battle';
  if(name==='lobby'){buildRoster();refreshSelection();renderStoryPanel();}if(name==='wild')renderWild();if(name==='story')renderStory();if(name==='castle')renderCastle();if(name==='cards')renderAlbum();if(name==='cup')renderCup();if(name==='workshop')renderWorkshop();if(name==='records')renderRecords();if(name==='challenge')renderChallenge();if(name==='versus')renderVersus();if(name==='players'){$('player-form').hidden=true;renderPlayers();}if(name==='boxes')renderBoxes();if(name==='league')renderLeague();if(name==='tower')renderTower();if(name==='goals'){refreshTodayGoals();renderGoals();}if(name==='online')renderOnline();if(name==='bridge')renderBridge();if(name==='campfire')renderCampfire();if(name==='lab')renderLab();
  // Nothing opens by itself: a Power Form waiting and Ron's box are badges on Home, opened by a tap.
  if(name==='arenas'&&typeof renderArenas==='function')renderArenas();
  window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
}
function buildRoster(){
  $('roster').innerHTML=Object.values(CREATURES).map(c=>!isUnlocked(profile,c.id)&&c.box?`<button class="creature-card locked star-wait" data-boxes aria-label="${c.name}: יצור מתיבת זהב" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('star')}תיבת זהב</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('star')} מחכה בתיבת זהב</div></div></button>`:!isUnlocked(profile,c.id)&&c.star?`<button class="creature-card locked star-wait" data-star="${c.id}" aria-label="${c.name}: ${c.female?'שומרת':'שומר'} הכוכב, מחכה בטירה הזהובה" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('star')}${c.female?'שומרת':'שומר'} הכוכב</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('star')} מחכה בטירה הזהובה</div></div></button>`:!isUnlocked(profile,c.id)?`<button class="creature-card locked" data-wild="${c.id}" aria-label="יצור פרא: ${c.name}. נצחו אותו כדי לשחרר" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('lock')}יצור פרא</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('lock')} מחכה ב${islandOf(homeIsland(c.id))?.name||'מסע השרשרת'}</div></div></button>`:`<button class="creature-card" data-creature="${c.id}" aria-label="בחירת ${c.name}, ${c.role}" aria-pressed="false" style="--accent:${c.color};--accent-glow:${c.color}1a"><span class="selected-mark">${icon('check')}</span><div class="card-top"><span class="element-label">${icon(c.specialIcon)}${c.element}</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.role}</span></div><div class="stat-grid"><div><strong>${c.hp}</strong><small>חיים</small><span class="stat-bar"><i style="width:${c.hp/230*100}%"></i></span></div><div><strong>${c.speed}</strong><small>מהירות</small><span class="stat-bar"><i style="width:${c.speed/298*100}%"></i></span></div><div><strong>${c.damage}</strong><small>נזק לפגיעה</small><span class="stat-bar"><i style="width:${c.damage/24*100}%"></i></span></div></div><div class="card-bottom"><span>ירי כל ${c.interval.toFixed(2)} שנ׳</span><b>${c.armor?'שריון סופג '+Math.round(c.armor*100)+'%':'כוח מיוחד כל '+c.specialCooldown+' שנ׳'}</b></div></div></button>`).join('');
  for(const c of Object.values(CREATURES))livePortrait('portrait-'+c.id,c.id,{roster:true,hats:hatsFor(c.id)});
  document.querySelectorAll('[data-creature]').forEach(el=>el.addEventListener('click',()=>{profile.selected=el.dataset.creature;persist();refreshSelection();sound.click();}));
  // A creature still waiting shows on its own card where it waits; a tap only wiggles it, and never moves the child.
  document.querySelectorAll('#roster [data-star],#roster [data-boxes],#roster [data-wild]').forEach(el=>el.addEventListener('click',()=>wiggle(el)));
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
  $('wild-guide').hidden=!step;if(replay)say('wild-guide','קרב חוזר! שלושה כוכבים מקבלים כשנשאר לכם הרבה חיים, או כשהמשימה הולכת ממש טוב.');else if(step)say('wild-guide',missionEased(profile,step)?(step.easier||'הפעם היריב קצת עייף. אתם יכולים!')+' '+step.intro:step.intro,{voice:'voice-shadow-'+step.id});
  const ch2step=chapterOf(step)===2;document.querySelector('#wild .wild-tag').textContent=step?.kind==='mission'?(ch2step?'משימת העולם':'משימת האי'):step?.kind==='guardian'?(ch2step?(c.female?'שומרת העולם':'שומר העולם'):'שומר האי'):step?.kind==='mirror'?'הבבואה':'אחוז בצל';
  $('wild-name').textContent=step?.kind==='mission'?MODES[step.mode].name:step?.kind==='mirror'?'הבבואה של '+c.name:step?.title||c.name;$('wild-name').style.color=c.color;$('wild-role').textContent=c.role+' · כוח '+c.element+' · '+c.rarity;
  $('wild-power-icon').innerHTML=icon(step?.kind==='mission'?MISSION_ICON[step.mode]||'star':c.specialIcon);$('wild-power-icon').style.color=c.color;$('wild-power-title').textContent=step?.kind==='mission'?'איך מנצחים':c.special;$('wild-power-label').textContent=step?.kind==='mission'?'המשימה':byGender(c,'הכוח המיוחד שלו','הכוח המיוחד שלה');$('wild-power-description').textContent=step?.kind==='mission'?MODES[step.mode].goal:c.description;
  if(step?.kind==='mission')$('wild-role').textContent=(step.rivals?'היריבים: '+step.rivals.map(id=>CREATURES[id].name).join(', ')+' בצל · ':friendlyStep(profile,step)?c.name+' רוצה להתחרות · ':'היריב: '+c.name+' בצל · ')+(profile.missionStars[step.id]?'השיא שלך: '+stars(profile.missionStars[step.id]):'עד שלושה כוכבים');
  $('wild-level').textContent='רמת היריב: '+levelName(step?.kind==='mission'?missionLevel(profile,step):level)+'. '+(step?.kind==='mission'&&MISSION_HINT[step.mode]?MISSION_HINT[step.mode]:step?.kind==='mirror'?'הבבואה יודעת כל מה שאתם יודעים. תפתיעו אותה.':rivalAdvice[c.id]||'');
  // The tip for this rival lives here now, before the battle; a ball mission also shows which gate is yours.
  {const tip=step?.kind==='mission'?MISSION_HINT[step.mode]:step?.kind==='mirror'?'הבבואה יודעת כל מה שאתם יודעים. תפתיעו אותה.':rivalAdvice[c.id];$('wild-tip').textContent=tip||'';$('wild-tip').hidden=!tip;$('wild-gates').hidden=!(step?.kind==='mission'&&step.mode==='ball');}
  const theirCard=c.name+' והקלף '+byGender(c,'שלו','שלה');
  document.querySelector('#wild .wild-prize strong').textContent=replay?'הפרס: עוד כוכבים, וניצוצות לתיבת הכוכב':step?(step.kind==='mission'?(step.rival&&!isUnlocked(profile,step.rival)?'הפרס: '+theirCard:'הפרס: עד שלושה כוכבים, והדרך לשומר'):step.kind==='free'?'הפרס: '+theirCard:step.kind==='guardian'?(ch2step?'הפרס: '+theirCard+', והדרך ל'+(BRIDGE_NAME[step.island]||'גשר'):'הפרס: האור '+islandOf(step.island).gemName+', '+theirCard):'הפרס: האור הלבן והכוכב הזהוב'):'הפרס: '+theirCard;
  if(!isUnlocked(profile,profile.selected))profile.selected='maimi';
  $('wild-fighters').innerHTML=Object.values(CREATURES).filter(f=>isUnlocked(profile,f.id)).map(f=>`<button class="fighter-chip${f.id===profile.selected?' chosen':''}" data-fighter="${f.id}" aria-pressed="${f.id===profile.selected}" style="--c:${f.color}"><canvas id="chip-${f.id}" aria-hidden="true"></canvas><b>${f.name}</b><small class="chip-level">רמה ${creatureLevel(profile,f.id)}</small></button>`).join('');
  for(const f of Object.values(CREATURES))if(isUnlocked(profile,f.id))livePortrait('chip-'+f.id,f.id,{skin:skinOf(profile,f.id),hats:hatsFor(f.id)});
  livePortrait('wild-portrait',c.id,{big:true,skin:step?.kind==='mirror'?'night':null});
  document.querySelectorAll('[data-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.fighter;persist();sound.click();renderWild();});
  $('wild-start').onclick=()=>startBattle(step?'story':'wild');
  $('wild').classList.toggle('is-mission',step?.kind==='mission');
  $('wild-start').innerHTML='לקרב! '+icon('play');shelfShow($('wild-fighters'));barTitle(step?islandOf(step.island).name:'קרב פרא');
}
const albumTotal=()=>Object.keys(CREATURES).length+STORY_CARD_IDS.length,albumOwned=()=>Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)).length+profile.storyCards.length;
let albumTab='creatures',albumFocus=null;
function renderAlbum({frames=false}={}){
  const counts=albumCounts(),{owned,total,W,seenW,mixOn,MX}=counts;
  // The Star Book has four pages: the creatures, the Wonders seen in battle, the mixes of copied supers, and the records (a screen of its own).
  if(albumTab==='wonders'&&!W.length||albumTab==='mixes'&&!mixOn||albumTab==='records')albumTab='creatures';
  albumTabs(counts);ritualWaiting();framesOpen(frames);
  $('album-creatures').hidden=albumTab!=='creatures';$('album-wonders').hidden=albumTab!=='wonders';$('album-mixes').hidden=albumTab!=='mixes';$('album-meter').parentElement.hidden=albumTab!=='creatures';
  if(albumTab!=='creatures'){$('frame-picker').hidden=true;$('frame-open').hidden=true;}
  if(albumTab==='wonders'){$('album-progress').textContent=seenW+' מתוך '+W.length+' פלאים';renderWonders();return;}
  if(albumTab==='mixes'){const got=MX.reduce((n,p)=>n+p.got,0);$('album-progress').textContent=got?got+' '+(got===1?'שילוב':'שילובים')+' בספר':'עוד אין שילובים. תפסו כוכב העתקה בקרב!';renderMixes(MX);return;}
  $('album-progress').textContent=owned.length+' מתוך '+total+' קלפים'+(profile.newCards.length?' · '+profile.newCards.length+' מחכים שתהפכו אותם!':'');
  $('album-meter').style.width=owned.length/total*100+'%';renderFramePicker();
  $('album').innerHTML=Object.values(CREATURES).map(c=>{
    if(!isUnlocked(profile,c.id)){const where=c.box?'בתיבת זהב':c.star?'בטירה הזהובה':'ב'+(islandOf(homeIsland(c.id))?.name||'מסע השרשרת');return `<button class="album-slot locked" data-album-wild="${c.id}" aria-label="קלף נעול: ${c.name}. מחכה ${where}">${cardBack(c.id,{label:c.box?'יצור תיבה':c.star?'שומר הכוכב':'יצור בצל'})}<span class="album-hint">${icon('lock')} מחכה ${where}</span></button>`;}
    if(profile.newCards.includes(c.id))return `<button class="album-slot fresh" data-album-new="${c.id}" aria-label="קלף חדש של ${c.name}. הקישו כדי להפוך">${cardBack(c.id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`;
    return `<button class="album-slot" data-album-card="${c.id}" aria-label="הקלף של ${c.name}">${cardHTML(c.id,{canvasId:'album-'+c.id,skin:skinOf(profile,c.id)})}${formBadge(c.id)}</button>`;
  }).join('');
  for(const c of Object.values(CREATURES))if(isUnlocked(profile,c.id)&&!profile.newCards.includes(c.id))livePortrait('album-'+c.id,c.id,{skin:skinOf(profile,c.id),card:true,hats:hatsFor(c.id)});
  $('album-story').innerHTML=STORY_CARD_IDS.map(id=>!storyCardOwned(profile,id)?`<div class="album-slot locked">${cardBack(id,{label:'קלף סיפור'})}<span class="album-hint">${icon('lock')} בטירה הזהובה</span></div>`:profile.newCards.includes(id)?`<button class="album-slot fresh" data-album-new="${id}">${cardBack(id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`:`<div class="album-slot">${storyCardHTML(id)}</div>`).join('');
  // A locked card never leads away: it wiggles, and its own label says where it waits.
  document.querySelectorAll('[data-album-wild]').forEach(el=>el.onclick=()=>{sound.click();nudge(el);});
  document.querySelectorAll('[data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  // A crown that pulses has its Power Form waiting: the card's tap opens the ritual, then the card is a card again.
  document.querySelectorAll('[data-album-card]').forEach(el=>el.onclick=()=>{sound.click();const id=el.dataset.albumCard;if(ritualDue(id)&&openRitual(id,{back:()=>{if(screen==='cards')renderAlbum();}}))return;openCard(id);});
  // A card just turned over (here, or in the window that sent the child here) stays in sight on the phone's shelf.
  {const el=albumFocus&&document.querySelector(`[data-album-card="${albumFocus}"]`),shelf=$('album-creatures');albumFocus=null;
    if(el&&shelf){const r=el.getBoundingClientRect(),s=shelf.getBoundingClientRect();shelf.scrollLeft+=r.left+r.width/2-(s.left+s.width/2);}}
}
// The castle hands over the story cards, then the star guardians join, one card after another; after the last one the child goes back up to the map.
function revealCastle(){const [next,...rest]=profile.newCards.filter(id=>STORY_CARD_IDS.includes(id)||CREATURES[id]?.star);if(!next){goUp();return;}revealCard(next,{joined:!!CREATURES[next],chain:rest.length?revealCastle:null});
  if(!rest.length){const d=$('reveal-dialog'),up=()=>{if(d.open)return;d.removeEventListener('close',up);if(screen==='castle')goUp();};d.addEventListener('close',up);}}
// A card turns over in its own window.
// One step only: 'ממשיכים' closes it over the screen it opened on (a back view or function says where to go on); the album is the other way, unless it opened there.
function revealCard(id,{joined=false,back=null,chain=null}={}){
  const c=CREATURES[id]||STORY_CARDS[id];flipCard(profile,id);persist();
  $('reveal-back').innerHTML=cardBack(id);$('reveal-front').innerHTML=STORY_CARDS[id]?storyCardHTML(id,{big:true}):cardHTML(id,{canvasId:'reveal-art',skin:skinOf(profile,id),big:true});if(CREATURES[id])livePortrait('reveal-art',id,{skin:skinOf(profile,id),card:true,hats:hatsFor(id)});
  const d=$('reveal-dialog');d.style.setProperty('--c',c.color);$('reveal-flip').classList.remove('flipped');d.classList.remove('burst','ritual','ritual-done','holding');ritual=null;$('ritual-skip').hidden=true;
  $('reveal-kicker').textContent=joined?'יצור חדש בנבחרת!':'קלף חדש!';$('reveal-title').textContent='';$('reveal-text').textContent='';
  if(chain){$('reveal-primary').textContent='לקלף הבא';$('reveal-primary').onclick=()=>{d.close();chain();};}
  else{$('reveal-primary').textContent='ממשיכים';$('reveal-primary').onclick=()=>{d.close();if(typeof back==='function')back();else if(back&&back!==screen)showView(back);};}
  $('reveal-secondary').textContent='לאלבום הקלפים';$('reveal-secondary').hidden=screen==='cards';$('reveal-secondary').onclick=()=>{d.close();albumTab='creatures';albumFocus=id;showView('cards');};
  if(!d.open)d.showModal();sound.unlock();
  setTimeout(()=>{$('reveal-flip').classList.add('flipped');d.classList.add('burst');sound.reveal(joined);$('reveal-title').textContent=c.name+(joined?(c.female?' הצטרפה אליכם!':' הצטרף אליכם!'):'');$('reveal-text').textContent=c.special+': '+c.description;},650);
  if(screen==='story')renderStory();
  if(screen==='cards'){albumFocus=id;renderAlbum();}
}
// The card window: the card, who it is (level and form), and its wardrobe (hats or looks, one tab at a time on a phone). Its button chooses the creature and closes.
function openCard(id,{form=false}={}){
  const again=cardTarget===id&&$('card-dialog').open,body=document.querySelector('#card-dialog .wardrobe'),top=again?body.scrollTop:0;
  cardTarget=id;const c=CREATURES[id],skin=skinOf(profile,id),wins=profile.creatures[id]?.wins||0,side=form&&formOn(id);
  $('card-dialog-card').innerHTML=cardHTML(id,{canvasId:'dialog-art',skin,big:true,form:side});livePortrait('dialog-art',id,{skin,card:true,form:side,hats:hatsFor(id),lab:side?labFor(id):null});
  // An unlocked Power Form turns the card over to its form side; before that, the crown shows the wins to go.
  {const left=formToGo(id);$('card-form').innerHTML=formOn(id)?`<div class="form-toggle" role="group" aria-label="צד הקלף"><button type="button" data-card-side="base" aria-pressed="${!side}">רגיל</button><button type="button" data-card-side="form" aria-pressed="${side}">${crownArt()}עוצמה</button></div>`:`<div class="form-road">${icon('crown')}<span class="form-dots">${formDots(left,FORM_WINS()).map(on=>`<i class="${on?'on':''}"></i>`).join('')}</span><small>עוד ${left} ${left===1?'ניצחון':'ניצחונות'} לצורת־עוצמה</small></div>`;}
  document.querySelectorAll('[data-card-side]').forEach(el=>el.onclick=()=>{const f=el.dataset.cardSide==='form';if(f===side)return;sound.click();openCard(id,{form:f});});
  $('card-dialog-title').textContent=c.name;$('card-dialog-title').style.color=c.color;
  {const lp=levelProgress(profile,id);$('card-level').innerHTML=`<b>רמה ${lp.level}${lp.level>=MAX_LEVEL?' · אלוף '+esc(c.name)+'!':''}</b><span class="level-bar"><i style="width:${Math.round(lp.pct*100)}%"></i></span><small>${lp.level>=MAX_LEVEL?'הרמה הכי גבוהה. כל הכבוד!':'עוד '+lp.toNext+' נקודות ניסיון לרמה '+(lp.level+1)+'. כל רמה מוסיפה '+Math.round(LEVEL_BONUS*100)+'% חיים וכוח.'}</small>`;}
  // A look still to earn shows its lock and the wins it needs; the looks that come from boxes wait as one tile. Nothing here leads away.
  $('skin-picker').innerHTML=SKINS.filter(k=>!k.box||skinUnlocked(profile,id,k.id)).map(k=>{const open=skinUnlocked(profile,id,k.id),need=(k.wins||0)-wins;return `<button class="skin-option skin-${k.id}${k.id===skin?' chosen':''}" data-skin="${k.id}" ${open?'':`disabled data-need="${need}"`} aria-pressed="${k.id===skin}" aria-label="${k.name}${open?'':': עוד '+need+' '+(need===1?'ניצחון':'ניצחונות')}" style="--c:${c.color}"><span class="skin-swatch"></span><b>${k.name}</b><small>${open?(k.id===skin?'נבחר':'פתוח'):'עוד '+need+' '+(need===1?'ניצחון':'ניצחונות')}</small></button>`;}).join('');
  if(SKINS.some(k=>k.box&&!skinUnlocked(profile,id,k.id)))$('skin-picker').insertAdjacentHTML('beforeend','<button class="skin-option skin-more" data-looks-more aria-label="עוד מראות מחכים בתיבות הכוכב"><span class="skin-swatch"></span><b>עוד מראות</b><small>בתיבות כוכב</small></button>');
  document.querySelectorAll('#skin-picker [data-looks-more]').forEach(el=>el.onclick=()=>{sound.click();nudge(el);});
  document.querySelectorAll('[data-skin]').forEach(el=>el.onclick=()=>{if(chooseSkin(profile,id,el.dataset.skin)){persist();sound.click();openCard(id,{form:side});if(screen==='cards')renderAlbum();}});
  renderHatPicker(id,side);wardrobe();
  $('card-dialog-play').innerHTML=profile.selected===id?icon('check')+byGender(c,'נבחר לקרב','נבחרה לקרב'):'בוחרים לקרב!';
  $('card-dialog-play').onclick=()=>{profile.selected=id;persist();sound.click();$('card-dialog').close();};
  if(!$('card-dialog').open)$('card-dialog').showModal();
  body.scrollTop=top;
}
// ------------------------------------------------------------------ the sideways phone: the cards, the boxes and the reveals
// What the Star Book holds now: the cards, the Wonders seen, and the mixes (once the rules have them).
function albumCounts(){const owned=[...Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),...profile.storyCards],W=wonderPage(wonderList(),profile.wonders?.seen),mixOn=Array.isArray(rules.COPYABLE);
  return {owned,total:albumTotal(),W,seenW:W.filter(w=>w.seen).length,mixOn,MX:mixOn?mixPages(owned.filter(id=>CREATURES[id]),profile.mixes,rules.COPYABLE):[]};}
// The Star Book's tabs: one row on the album, the same row on the records. A tab is a page of the same book, never a jump elsewhere.
function albumTabs(counts=albumCounts()){
  const {owned,total,W,seenW,mixOn,MX}=counts,on=screen==='records'?'records':albumTab;
  document.querySelector('#album-tabs [data-album-tab="wonders"]').hidden=!W.length;document.querySelector('#album-tabs [data-album-tab="mixes"]').hidden=!mixOn;
  $('album-tab-creatures').textContent=owned.length+'/'+total;$('album-tab-wonders').textContent=seenW+'/'+W.length;$('album-tab-mixes').textContent=MX.reduce((n,p)=>n+p.got,0);
  $('records-tabs').innerHTML=$('album-tabs').innerHTML.replace(/ id="[^"]*"/g,'');
  document.querySelectorAll('[data-album-tab]').forEach(b=>{const t=b.dataset.albumTab,sel=t===on;b.setAttribute('aria-selected',String(sel));b.classList.toggle('chosen',sel);
    b.onclick=()=>{if(sel)return;sound.click();if(t==='records'){showView('records');return;}albumTab=t;if(screen==='cards')renderAlbum();else showView('cards');};});
}
// A locked thing never leads away: it wiggles where it is, and its own label says where it waits.
function nudge(el){el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge');}
// On a phone the frames wait behind a small button at the end of the tabs row: lit, they take the tabs' place; the button again, or a tap anywhere else, brings the tabs back.
let framesBound=false;
PHONE.addEventListener?.('change',()=>{if(screen==='cards'&&albumTab==='creatures')renderFramePicker();if($('card-dialog').open)wardrobe();});
function framesOpen(on){$('cards').classList.toggle('frames-open',!!on);$('frame-open').setAttribute('aria-expanded',String(!!on));}
// The card window's wardrobe: hats and looks on two tabs (a phone shows one at a time, a computer both). The tab stays where the child left it.
let wardrobeTab='hats';
function wardrobe(tab){
  const d=$('card-dialog'),hats=!$('hat-picker').hidden;if(tab)wardrobeTab=tab;const on=hats?wardrobeTab:'looks';d.dataset.wear=on;d.classList.toggle('one-wardrobe',!hats);d.querySelector('.wardrobe-tabs').hidden=!hats||!PHONE.matches;
  d.querySelectorAll('[data-wardrobe]').forEach(b=>{const sel=b.dataset.wardrobe===on;b.setAttribute('aria-selected',String(sel));b.classList.toggle('chosen',sel);b.onclick=()=>{if(sel)return;sound.click();wardrobe(b.dataset.wardrobe);d.querySelector('.wardrobe').scrollTop=0;};});
}
// The Power Form ritual never opens by itself. Home's crown badge asks which creature waits for it (the one that just grew, or the one chosen)
// and opens it with openRitual; the album's crown pulses on any card whose form still waits. The first check on a save gives every form
// that was already open its crown without a ritual (mark:false only looks).
function ritualWaiting({mark=true}={}){
  const sel=profile.selected;
  if(mark&&!(profile.forms?.ritual||[]).length){let any=false;for(const k of Object.keys(CREATURES))if(k!==sel&&!labFor(k)&&isUnlocked(profile,k)&&formOn(k))any=markRitualFor(k)||any;if(any)persist();}
  return [formWaiting,sel].find(k=>k&&isUnlocked(profile,k)&&formOn(k)&&!ritualDone(k)&&(k===formWaiting||!labFor(k)))||null;
}
const ritualDue=id=>isUnlocked(profile,id)&&formOn(id)&&!ritualDone(id);
// Verification: the album's tab, the open card and its wardrobe tab, the ritual waiting, the frames, the boxes (and on a verify save, a card window by id).
(window.__LEAGUE_FIT__??={}).album=()=>({tab:screen==='records'?'records':albumTab,card:$('card-dialog').open?cardTarget:null,wear:$('card-dialog').dataset.wear||null,ritual:ritualWaiting({mark:false}),frames:$('cards').classList.contains('frames-open'),
  box:{taps:boxUI.taps,opened:!!boxUI.result,waiting:boxesWaiting(profile),pending:!!profile.box.pending}});
window.__LEAGUE_FIT__.card=id=>!!storagePrefix&&isUnlocked(profile,id)&&(openCard(id),true);
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
const stickerArt=w=>{const name=w.sticker||'wonder-'+w.id,src=fxSrc(name)||gfx.stickerSrc?.(name)||'';return src?`<img src="${src}" alt="">`:icon(w.icon&&document.getElementById('i-'+w.icon)?w.icon:'sparkle');};
const dotsHTML=left=>formDots(left,FORM_WINS()).map(on=>`<i class="${on?'on':''}"></i>`).join('');
function formBadge(id){
  if(formOn(id))return `<span class="tcard-crown${ritualDue(id)?' new-design':''}" title="צורת־עוצמה">${crownArt()}</span>`;
  const left=formToGo(id);return `<span class="form-dots" title="עוד ${left} ${left===1?'ניצחון':'ניצחונות'} לצורת־עוצמה">${dotsHTML(left)}</span>`;
}
// Only Wonders that exist get a place, so the page can always be filled. An unseen one is a dark shape and a question mark.
function renderWonders(){
  const W=wonderPage(wonderList(),profile.wonders?.seen);
  $('album-wonders').innerHTML=`<p class="wonders-lead">${icon('book')} פלאים מהקרבות. כל פלא חוזר!</p><div class="wonder-grid">${W.map(w=>`<div class="wonder-sticker ${w.seen?'seen':'unseen'}" style="--w:${w.color||'#ffd23a'}"><span class="wonder-pic">${stickerArt(w)}${w.seen?'':'<b class="wonder-q" aria-hidden="true">?</b>'}</span><b>${w.seen?esc(w.name):'?'}</b><small>${w.seen?'ראיתם ×'+w.count:'עוד לא ראיתם'}</small></div>`).join('')}</div>`;
}
// ------------------------------------------------------------------ wave 2: hats, Lab designs and mixes in the Star Book
// Hats never carry stats: any hat on any creature, earned only. The rules and the list come from core.
const HAT_LIST=()=>Array.isArray(rules.HATS)?rules.HATS:[];
function hatsFor(id,pp=profile){const h=rules.hatsOf?.(pp,id);return h&&(h.head||h.face)?h:null;}
function labFor(id,pp=profile){return rules.labOf?.(pp,id)||null;}
// A new Lab design whose form has not been shown yet: the album crown pulses until the ritual shows it.
function designFresh(id){return formOn(id)&&!!labFor(id)&&!ritualDone(id);}
// A painted picture over its line icon: when the file is missing the icon stays.
const picOver=(src,iconId,cls='')=>`<span class="pic${cls?' '+cls:''}">${icon(iconId)}<img src="${src}" alt="" onerror="this.remove()"></span>`;
const hatPic=h=>picOver('./art/gen/hat-'+h+'.png','hat','hat-pic'),hatName=h=>rules.hatById?.(h)?.name||'';
// The card dialog's hat row: the hats this child owns, and 'בלי'. A tap puts a hat on (in its own slot) or takes it off.
// A hat going on springs, a hat coming off pops.
function hatSound(pp,id,h){const on=!!h&&h!=='none'&&Object.values(rules.hatsOf?.(pp,id)||{}).includes(h);if(sound.hat)sound.hat(on);else sound.click();}
function renderHatPicker(id,side){
  const el=$('hat-picker');if(!el)return;const all=HAT_LIST();el.hidden=!all.length||!rules.wearHat;if(el.hidden)return;
  const owned=rules.ownedHats?.(profile)||[],w=rules.hatsOf?.(profile,id)||{},bare=!w.head&&!w.face;
  el.innerHTML=`<span class="micro-label">${icon('hat')}כובעים</span><div class="hat-row"><button type="button" class="hat-option none${bare?' chosen':''}" data-hat="none" aria-pressed="${bare}"><b>בלי</b></button>${owned.map(h=>{const on=w.head===h.id||w.face===h.id;return `<button type="button" class="hat-option tier-${h.tier}${on?' chosen':''}" data-hat="${h.id}" aria-pressed="${on}" aria-label="${esc(h.name)}" title="${esc(h.name)}">${hatPic(h.id)}</button>`;}).join('')}${owned.length<all.length?`<button type="button" class="hat-option more" data-hat-more aria-label="עוד כובעים מחכים בתיבות הכוכב">${icon('star')}<small>בתיבות</small></button>`:''}</div>`;
  el.querySelectorAll('[data-hat]').forEach(b=>b.onclick=()=>{const h=b.dataset.hat;if(!rules.wearHat(profile,id,h==='none'?null:h))return;persist();hatSound(profile,id,h);openCard(id,{form:side});if(screen==='cards')renderAlbum();if(screen==='lobby')renderHome();});
  el.querySelectorAll('[data-hat-more]').forEach(b=>b.onclick=()=>{sound.click();nudge(b);});
}
// The mix pages: one page per creature on the team; a slot for every super it can borrow, named by the two elements.
let mixPage=null;
function renderMixes(pages){
  if(!pages.some(p=>p.id===mixPage))mixPage=(pages.find(p=>p.id===profile.selected)||pages.find(p=>p.got)||pages[0])?.id||null;
  const P=pages.find(p=>p.id===mixPage),c=P&&CREATURES[P.id];
  $('album-mixes').innerHTML=`<p class="wonders-lead">${icon('mix')} כוכב העתקה נותן את כוח־העל של היריב. כל שילוב חדש נותן ניצוץ!</p><div class="mix-tabs ph-shelf" role="tablist" aria-label="דפי השילובים">${pages.map(p=>`<button type="button" role="tab" class="mix-tab${p.id===mixPage?' chosen':''}${p.got?' some':''}" data-mix-page="${p.id}" aria-selected="${p.id===mixPage}" style="--c:${CREATURES[p.id].color}"><b>${CREATURES[p.id].name}</b><small dir="ltr">${p.got}/${p.total}</small></button>`).join('')}</div>`+
    (P?`<section class="mix-page" style="--c:${c.color}"><header class="mix-head"><canvas id="mix-face" aria-hidden="true"></canvas><h2>${c.name} <b dir="ltr">${P.got}/${P.total}</b></h2></header><div class="mix-grid ph-scroll">${P.slots.map(s=>{const k=CREATURES[s.kind];return s.got?`<div class="mix-slot got" style="--k:${k.color}"><span class="mix-pic">${icon(k.specialIcon)}</span><b>${esc(rules.mixName?.(P.id,s.kind)||'')}</b><small>${k.name}</small></div>`:`<div class="mix-slot" style="--k:${k.color}"><span class="mix-pic">${icon(k.specialIcon)}<i>?</i></span><small>${k.name}</small></div>`;}).join('')}</div></section>`:'');
  if(P)livePortrait('mix-face',P.id,{skin:skinOf(profile,P.id),hats:hatsFor(P.id)});
  document.querySelectorAll('[data-mix-page]').forEach(b=>b.onclick=()=>{if(b.dataset.mixPage===mixPage)return;sound.click();mixPage=b.dataset.mixPage;renderMixes(pages);});
}
// ------------------------------------------------------------------ the Lab: ?lab, not linked from any menu
// A grown-up and the creative director choose each creature's Power Form together: a headpiece, a name and one of two
// mechanics. Saving puts the designs in this player's save at once (battles and the card's form side use them) and
// downloads lab-YYYY-MM.json for the repository. The only credit anywhere is the creative director's stamp.
const LAB_ASKED=new URLSearchParams(location.search).has('lab');let labOpened=false,labDrafts=null;
const labData=()=>({ids:Array.isArray(rules.LAB_CREATURES)?rules.LAB_CREATURES:[],O:rules.FORM_OPTIONS||{},N:rules.LAB_NAMES||{},LM:rules.LAB_MECHS||{},M:rules.MECHS||{}});
function labRowHTML(id){
  const {O,N,LM,M}=labData(),c=CREATURES[id],d=labDrafts[id],saved=labFor(id),same=!!saved&&saved.option===d.option&&saved.mech===d.mech&&saved.name===d.name.trim();
  return `<article class="lab-row${labReady(d)?' ready':''}" data-lab="${id}" style="--c:${c.color}"><div class="lab-stage"><canvas id="lab-pup-${id}" aria-hidden="true"></canvas><b>${c.name}</b><small class="lab-saved"${same?'':' hidden'}>${icon('check')}נשמר</small></div><div class="lab-picks">
    <div class="lab-options" role="group" aria-label="המראה של ${c.name}">${O[id].map(o=>`<button type="button" class="lab-option${d.option===o?' chosen':''}" data-lab-option="${id}:${o}" aria-pressed="${d.option===o}">${picOver('./art/gen/'+(rules.formImg?.(id,o)||'form-'+id+'-'+o)+'.png','crown','form-pic')}</button>`).join('')}</div>
    <div class="lab-names" role="group" aria-label="שם לצורה">${N[id].map((n,i)=>`<button type="button" class="lab-name${d.name===n?' chosen':''}" data-lab-name="${id}:${i}">${esc(n)}</button>`).join('')}<input id="lab-name-${id}" class="lab-name-input" maxlength="16" value="${esc(d.name)}" placeholder="שם אחר…" aria-label="שם אחר לצורה" autocomplete="off" spellcheck="false" enterkeyhint="done"></div>
    <div class="lab-mechs" role="group" aria-label="הכוח בצורת־העוצמה">${LM[id].map(m=>`<button type="button" class="lab-mech${d.mech===m?' chosen':''}" data-lab-mech="${id}:${m}" aria-pressed="${d.mech===m}">${icon(M[m]?.icon||'star')}<b>${esc(M[m]?.words||m)}</b></button>`).join('')}</div></div></article>`;
}
function labBind(id){
  const {O,N}=labData(),row=document.querySelector(`.lab-row[data-lab="${id}"]`);if(!row)return;
  livePortrait('lab-pup-'+id,id,{form:true,lab:{option:labDrafts[id].option||O[id][0]},clip:['idle','run'],hats:hatsFor(id)});
  const redraw=()=>{row.outerHTML=labRowHTML(id);labBind(id);labSaveState();};
  row.querySelectorAll('[data-lab-option]').forEach(b=>b.onclick=()=>{labClick('lab-option');labDrafts[id]=labPick(labDrafts[id],b.dataset.labOption.split(':')[1],O[id],N[id]);redraw();});
  row.querySelectorAll('[data-lab-name]').forEach(b=>b.onclick=()=>{labClick('lab-name');labDrafts[id].name=N[id][+b.dataset.labName.split(':')[1]]||'';redraw();});
  row.querySelectorAll('[data-lab-mech]').forEach(b=>b.onclick=()=>{labClick('lab-mech');labDrafts[id].mech=b.dataset.labMech.split(':')[1];redraw();});
  const input=$('lab-name-'+id);input.oninput=()=>{labDrafts[id].name=input.value.replace(/[<>&"']/g,'').slice(0,16);row.querySelectorAll('[data-lab-name]').forEach(b=>b.classList.toggle('chosen',b.textContent===labDrafts[id].name));labSaveState();};
}
const labClick=kind=>sound.uiClick?sound.uiClick(kind):sound.click();
function labSaveState(){const {ids}=labData(),ready=ids.filter(id=>labReady(labDrafts?.[id])).length;$('lab-save').disabled=!ready;$('lab-status').textContent=ids.length?'מוכנים '+ready+' מתוך '+ids.length:'';}
function renderLab(){
  // On a sideways phone the page fits the screen: the rows scroll, and the save bar keeps its own row under them (it never covers a row).
  $('lab').classList.add('ph-fit');const {ids,O,N}=labData();$('lab-credit').textContent=rules.FORM_CREDIT||'';
  if(!ids.length){$('lab-list').innerHTML='<p class="muted">המעבדה עוד לא מוכנה בגרסה הזאת של המשחק.</p>';labSaveState();return;}
  labDrafts??=Object.fromEntries(ids.map(id=>[id,labDraft(labFor(id),O[id],N[id])]));
  $('lab-list').innerHTML=ids.map(labRowHTML).join('');for(const id of ids)labBind(id);labSaveState();
}
// Saving: every ready design goes into the save (cleaned by core) and the month's file is downloaded.
function saveLabPage(){
  const {ids}=labData();let saved=0;for(const id of ids){const d=labDrafts?.[id];if(labReady(d)&&rules.saveLab?.(profile,id,{option:d.option,name:String(d.name||'').trim(),mech:d.mech}))saved++;}
  if(!saved)return false;persist();labDrafts=null;const name=labFileName();downloadText(name,JSON.stringify(rules.labExport?.(profile)||{},null,2)+'\n');
  labClick('lab-save');renderLab();$('lab-status').textContent='נשמר! כבר בקרבות ובקלפים · '+name;return true;
}
function downloadText(name,text){try{const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}catch{}}
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
  livePortrait('ritual-base',id,{skin,card:true,hats:hatsFor(id)});livePortrait('ritual-form',id,{skin,card:true,form:true,lab:labFor(id),hats:hatsFor(id)});
  $('reveal-kicker').textContent='צורת־עוצמה חדשה!';$('reveal-title').textContent=c.name;$('reveal-text').textContent=two?'החזיקו את שני העיגולים':'החזיקו את העיגול, או את הרווח';
  $('ritual-skip').hidden=true;setTimeout(()=>{if(ritual?.id===id&&!ritual.done)$('ritual-skip').hidden=false;},500);
  $('reveal-primary').textContent=label||(back?'ממשיכים!':'יאללה!');$('reveal-primary').onclick=()=>{const b=ritual?.back;d.close();if(typeof b==='function')b();};
  $('reveal-secondary').textContent='לאלבום הקלפים';$('reveal-secondary').hidden=screen==='cards';$('reveal-secondary').onclick=()=>{d.close();match=null;showView('cards');};
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
  {const d=labFor(R.id);$('reveal-title').textContent=d?d.name+'!':c.name+' · צורת־עוצמה!';}
  $('reveal-text').innerHTML=`<span class="ritual-how" aria-hidden="true">${icon('bolt')}${icon('bolt')}<b>←</b>${crownArt()}</span>שני כוחות־על פוגעים, ואז לוחצים!`;
}
// The ritual waits for a tap (Home's crown, the album's crown): the old calm-moment check only gives the old forms their crowns now.
function maybeRitual(){
  ritualWaiting();
}
function continueJourney(){match=null;const next=journeyView(profile);showView(next==='lobby'?'cup':next);}
function renderJourney(){
  const active=profile.cup,done=active?active.stage:profile.challengeWins?4:challengeUnlocked(profile)?3:0;
  const pending=needsUpgrade(profile),hero=CREATURES[active?.player||profile.selected];
  // The cup's tile in the arenas: where its road stands, in one line and four dots (three rounds and the crumbling arena).
  $('journey-progress').textContent=pending?'כוח חדש מחכה!':done<3?`${CUP[done].title} · מול ${CREATURES[CUP[done].rival].name}`:done===3?'הזירה המתפוררת':'הגביע של '+hero.name+'!';
  $('journey-track').innerHTML=Array.from({length:4},(_,i)=>`<i class="${i<done?'on':''}"></i>`).join('');$('journey-start').setAttribute('aria-label','גביע החופים · '+done+' מתוך 4');
  $('cup-teaser').hidden=!challengeUnlocked(profile)||!!profile.cup;
}
function renderChallenge(){
  if(!challengeUnlocked(profile)){showView('lobby');return;}
  const build=profile.lastBuild||{player:profile.selected,upgrades:[]},hero=CREATURES[build.player],done=profile.challengeWins>0;
  $('challenge-status').textContent=done?'4 מתוך 4 · המסע הראשון הושלם!':'3 מתוך 4 · הגביע פתח אתגר חדש';
  $('challenge-intro').textContent=done?'תג אלוף הזירה הפתוחה שלך. אפשר לשחק שוב ולנסות דרך אחרת.':'ניצחת בגביע. עכשיו הזירה עצמה משתנה.';
  $('challenge-build').innerHTML=`<div><span class="micro-label">השילוב שזכה בגביע ממשיך איתך</span><h2 style="color:${hero.dark}">${hero.name} מול הבזוק</h2></div><div class="build-chips">${buildChips(hero.id,build.upgrades)||'<span class="muted">הכוחות הבסיסיים שלך</span>'}</div><small>הכוחות והשילוב נשמרים גם אחרי יציאה או הפסד.</small>`;
  $('challenge-start').innerHTML='לקרב! '+icon('play');$('cup-teaser').hidden=!!profile.cup;
}
function renderCup(){
  const stage=profile.cup?.stage??0;
  $('cup-track').innerHTML=CUP.map((r,i)=>`<article class="cup-round ${i===stage?'current':i<stage?'done':'locked'}"><div class="round-num">${i<stage?icon('check'):i+1}</div><h3>${r.title}</h3><div class="round-rival" style="color:${CREATURES[r.rival].dark}">${CREATURES[r.rival].name}</div><p>${r.club}</p><div class="round-state">${i<stage?'ניצחתם!':i===stage?'הקרב הבא שלכם':'בהמשך הדרך'}</div></article>`).join('');
  const hero=CREATURES[profile.cup?.player||profile.selected],rival=CREATURES[CUP[stage].rival];$('cup-matchup').innerHTML=`<strong>${hero.name} <span class="muted">מול</span> ${rival.name}</strong><p>${rivalAdvice[rival.id]}</p>`;
  $('cup-build').innerHTML=`<div><span class="micro-label">${profile.cup?'היצור שבונה את הדרך לגביע':'היצור שלך לגביע'}</span><h2 style="color:${hero.dark}">${hero.name}</h2></div><div class="build-chips">${buildChips(hero.id,profile.cup?.upgrades)||'<span class="muted">ניצחון פותח בחירה בכוח חדש.</span>'}</div><small>היצור והכוחות שבחרת יישארו איתך עד סוף הגביע.</small>`;
  $('cup-start').innerHTML=needsUpgrade(profile)?'בוחרים כוח חדש '+icon('arrow'):'לקרב! '+icon('play');
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
  persist();sound.reveal?.(false);showView(needsUpgrade(profile)?'workshop':'cup');
}
function renderRecords(){
  albumTabs();
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
const MISSION_ICON={lava:'flame',wind:'swirl',ball:'spiral',trio:'star',echo:'sound',hill:'shield',race:'pair'};
const MISSION_HINT={echo:'מקשיבים לאבנים, ואז דורכים עליהן לפי הסדר. טעיתם? המנגינה מתנגנת שוב. ',lava:'זוזו מהעיגולים המהבהבים והישארו בתוך הטבעת.',wind:'מי שנופל מפיל את כל הנוצות. שמרו עליהן!',ball:'עם הפנינה אי אפשר לירות: ירי בועט אותה לשער. שלוש פגיעות והיא נופלת.',trio:'כשיצור נופל, הבא בתור נכנס. כל יצור שנשאר חשוב.',
  hill:'עמדו לבד בתוך הטבעת. כשהיא מהבהבת, היא עוברת למקום אחר.',race:'השער נפתח רק כששניכם בתוכו יחד. חכו זה לזה!'};
const MISSION_TIP={lava:'אספו גחלים כדי לגדול, וזוזו מהעיגולים המהבהבים.',wind:'מי שנופל מפיל את הנוצות. החזיקו מרחק כשאתם מובילים.',ball:'כשליריב יש את הפנינה, פגעו בו שלוש פעמים, או הפעילו עליו את כוח־העל, והפנינה נופלת.',trio:'שמרו על החיים של כל יצור, וחכו עם הכוח המיוחד לרגע הנכון.',echo:'מקשיבים למנגינה עד הסוף, ואז דורכים על האבנים לפי הסדר.',
  hill:'הישארו בתוך הטבעת, וכשהיא זזה רוצו ראשונים למקום החדש.',race:'רוצו לשער יחד עם החבר, והתרחקו מהצללים שמאטים.'};
// The round label under the clock for each mission: what wins it, in a few words.
const MISSION_ROUND={wind:'אספו '+WIND_TARGET+' נוצות והחזיקו '+WIND_HOLD+' שניות',lava:'גחלי כוח מגדילים אתכם · הלבה סוגרת',ball:'ראשון ל־'+BALL_GOALS+' גולים מנצח',trio:'שלושה מול שלושה',echo:'מי שמשלים 3 מנגינות מנצח',hill:'ראשון ל־'+(sim.HILL_TARGET??25)+' נקודות מנצח',race:'חמישה שערים, ביחד'};
// The Wonder of the Day plays on its own painted variant where there is one (ice on the coast, bubbles at sea, storm in the wind).
const WONDER_ARENA={ice:null,bubbles:'sea',storm:'wind'},WONDER_ISLANDS=[null,'wind','sea','fire','mirror','castle'];
const wantsTrio=m=>m==='quick'?$('training-mode').value==='trio':m==='story'?(s=>s?.kind==='mission'&&s.mode==='trio')(replayStep||currentStep(profile)):false;
// The trio picker: tap three released creatures; the order is the order they enter.
function openTeamPicker(nextMode){
  let picked=[];const ids=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id));
  const draw=()=>{for(const id of ids){const b=document.querySelector(`[data-team="${id}"]`),n=picked.indexOf(id);b.classList.toggle('picked',n>=0);b.querySelector('.team-order').textContent=n>=0?n+1:'';}
    $('team-go').disabled=picked.length<3;$('team-go').innerHTML=picked.length<3?'בחרו עוד '+(3-picked.length):'לקרב! '+icon('play');
    // On a sideways phone the three places sit by the button, in their order; a tap on one gives that creature back.
    $('team-slots').innerHTML=PHONE.matches?[0,1,2].map(n=>{const id=picked[n];return id?`<button class="team-slot on" data-slot="${n}" style="--c:${CREATURES[id].color}" aria-label="${n+1}: ${CREATURES[id].name}"><canvas id="team-s-${n}" aria-hidden="true"></canvas><b>${n+1}</b></button>`:`<span class="team-slot"><b>${n+1}</b></span>`;}).join(''):'';
    picked.forEach((id,n)=>{if($('team-s-'+n))livePortrait('team-s-'+n,id,{skin:skinOf(profile,id)});});
    document.querySelectorAll('[data-slot]').forEach(el=>el.onclick=()=>{sound.click();picked=picked.filter((_,n)=>n!==+el.dataset.slot);draw();});};
  $('team-grid').innerHTML=ids.map(id=>`<button class="team-pick" data-team="${id}" style="--c:${CREATURES[id].color}"><canvas id="team-p-${id}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b><span class="team-order"></span></button>`).join('');
  for(const id of ids){livePortrait('team-p-'+id,id,{skin:skinOf(profile,id)});document.querySelector(`[data-team="${id}"]`).onclick=()=>{sound.click();picked=picked.includes(id)?picked.filter(x=>x!==id):picked.length<3?[...picked,id]:picked;draw();};}
  $('team-go').onclick=()=>{if(picked.length<3)return;chosenTrio=picked;$('team-dialog').close();startBattle(nextMode);};
  draw();$('team-dialog').showModal();$('team-dialog').querySelector('.dlg-body').scrollTop=0;
}
// The match a start builds, without touching the screen. The same call pre-rolls the next battle for the 'עוד קרב!' button.
// Who may grow a Power Form: the child once the creature reached its level; a rival only from challenger up (quick); never in a cup.
// Every single-player battle carries this child's hats, Lab designs, which creatures may grow a form, copy stars and the comeback star.
function buildMatch(nextMode,{seed=Date.now()+Math.floor(Math.random()*1e5)}={}){
  const player=isUnlocked(profile,profile.selected)?profile.selected:'maimi',wonders=['quick','league','tower','wild','story'].includes(nextMode)?sim.wonderOptions?.(profile)||{}:{},play=sim.playOptions?.(profile)||{};
  const boost=levelBoost(profile,nextMode==='challenge'?(profile.lastBuild?.player||player):player);
  if(nextMode==='tower')return makeTowerMatch(profile,{seed,...play,...wonders});
  if(nextMode==='league')return makeLeagueMatch(profile,{seed,...play,...wonders});
  if(nextMode==='challenge')return makeChallengeMatch(profile,{seed,boost,...play});
  if(nextMode==='story')return makeStoryMatch(profile,{seed,team:chosenTrio,replay:replayStep?.id,boost,...play,...wonders});
  if(nextMode==='wild')return wildTarget?makeWildMatch(profile,wildTarget,{seed,boost,...play,...wonders}):null;
  // The Wonder of the Day: one level gentler than the league, a random rival, the Wonder there from the third second to the end.
  if(nextMode==='wonder'){const LL=sim.LEAGUE_LEVELS||Object.keys(LEVELS),level=LL[Math.max(0,LL.indexOf(leagueLevel(profile))-1)]||'rookie',W=sim.wonderOfDay?.(profile,players.active);if(W?.changed)persist();
    // The rival is one the child has met: a story creature (a guardian too) only once it was freed, never ahead of its story fight.
    const day=W?{wonderDay:W.id}:sim.wonderDayOptions?.(profile,players.active)||{},rivals=Object.keys(CREATURES).filter(id=>id!==player&&(!WILD.includes(id)||isUnlocked(profile,id))),rival=rivals[Math.floor(Math.random()*rivals.length)];
    const arena=day.wonderDay in WONDER_ARENA?WONDER_ARENA[day.wonderDay]:WONDER_ISLANDS[Math.floor(Math.random()*WONDER_ISLANDS.length)];
    return makeMatch({...play,...day,player,rival,level,boost,seed,arena,life:sim.quickLife?.(level)??1,forms:[sim.formUnlocked?.(profile,player)??false,LL.indexOf(level)>=2]});}
  if(nextMode!=='quick')return null;
  const rival=$('rival').value,level=profile.level,kind=$('training-mode').value||null;
  return makeMatch({...play,player,rival,level,boost,boss:rival==='slauz'&&!kind,seed,mode:kind,arena:({lava:'fire',wind:'wind',ball:'sea',trio:'castle'})[kind]||null,...wonders,life:kind?1:sim.quickLife?.(level)??1,
    forms:[sim.formUnlocked?.(profile,player)??false,['challenger','veteran','champion'].includes(level),false],
    ...(kind==='trio'?{team:trioTeam(profile,chosenTrio),rivalTeam:Object.keys(CREATURES).filter(id=>CREATURES[id].rarity!=='אגדי').sort(()=>Math.random()-.5).slice(0,3)}:{})});
}
// The next battle waits ready under the result's big button: same mode, same creature, same child, a fresh seed.
let queued=null;
// A tower key names the climb itself (its seed), not only the floor: a new climb never meets the old climb's rival.
const queueKey=m=>{const r=profile.tower.run;return m==='quick'?[$('rival').value,$('training-mode').value,profile.level].join('|'):m==='tower'?(r?[r.seed,r.floor,r.picks.length,r.creature].join('|'):''):m==='league'?leagueLevel(profile):m==='wonder'?dayKey():'';};
function queueNext(nextMode){queued=null;
  if(!['league','quick','tower','wonder'].includes(nextMode)||nextMode==='tower'&&(!profile.tower.run||profile.tower.run.pending)||wantsTrio(nextMode))return null;
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
    match=makeMatch({...(sim.playOptions?.(profile)||{}),player,rival:r.rival,level:r.level,upgrades:profile.cup.upgrades,boost:levelBoost(profile,player),boss:r.rival==='slauz',seed:Date.now()+Math.floor(Math.random()*1e5),forms:[sim.formUnlocked?.(profile,player)??false,false]});}
  else match=rematch?q.match:buildMatch(mode);
  if(!match){showView('lobby');return;}
  // A pre-rolled rematch skips the long wait: a tap on 'עוד קרב!' reaches 'go' in under a second and a half.
  if(rematch)match.countdown=Math.min(match.countdown,1.4);
  player=match.actors[0].id;rival=match.actors[1].id;level=match.level;upgrades=match.actors[0].upgrades;sound.versus=false;sound.online=false;sound.allied=!!match.allied;document.querySelector('.player-info .fighter-lines span').textContent='אתם';renderer.setMatch(match,[skinOf(profile,match.actors[0].id),match.mirror?'night':null,match.allied&&match.actors[2]?skinOf(profile,match.actors[2].id):null],{local:0});clearInput();accumulator=0;resetBattleFx();
  const storyStep=match.story?STEPS.find(s=>s.id===match.story):null;
  // The announcer counts 3-2-1 for the first battle of a session and for a guardian; every battle ends its countdown with 'קדימה!'.
  callsStart(match,{rematch,guardian:!!storyStep&&['guardian','mirror'].includes(storyStep.kind)||!!match.spectacle||!!match.tower?.guard||!!match.actors[1].boss});startCount(match);
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');sound.unlock();sound.setScene('battle',{track:musicFor(match)});sound.resume();sound.setLocalSide?.(0);sound.setMusicRate?.(1);if(mode==='wild')sound.play('voice-wild-battle',{delay:.2});
  const p=match.actors[0].spec,r=match.actors[1].spec;
  $('player-name').textContent=p.name;$('rival-name').textContent=storyStep?.kind==='mirror'?'הבבואה שלך':storyStep?.title||r.name;$('player-symbol').innerHTML=icon(p.specialIcon);$('rival-symbol').innerHTML=icon(r.specialIcon);$('rival-level').textContent=LEVELS[level].name;
  $('match-label').textContent=mode==='cup'?CUP[profile.cup.stage].title:mode==='challenge'?CHALLENGE.title:match.mode?MODES[match.mode].name:mode==='story'?islandOf(storyStep.island).name:mode==='wild'?'קרב פרא':mode==='league'?'ליגת היצורים':mode==='tower'?'מגדל המסכה':mode==='wonder'?'הפלא של היום':'אימון';$('round-label').textContent=match.mode?MISSION_ROUND[match.mode]||'':mode==='wonder'?sim.wonderById?.(match.wonder?.id)?.name||'':mode==='cup'?`שלב ${profile.cup.stage+1} מתוך 4`:mode==='challenge'?'שלב 4 מתוך 4':mode==='story'?(match.replay?'קרב חוזר · עד שלושה כוכבים':storyStep.kind==='free'?'ניצחון משחרר את '+r.name+' מהצל':storyStep.kind==='mirror'?'אומץ זה לפעול למרות הפחד':islandOf(storyStep.island).gemName?'ניצחון מדליק את האור '+islandOf(storyStep.island).gemName:'ניצחון משחרר את '+r.name+' מהצל'):mode==='wild'?'ניצחון משחרר את '+r.name:mode==='tower'?'קומה '+match.tower.floor+(match.tower.guard?' · שומר הקומה':match.twist==='crumble'?' · האבנים מתפוררות':match.twist==='open'?' · בלי אבנים':''):mode==='league'?'דרגת '+rankOf(profile.league.trophies).name+' · '+profile.league.trophies+' גביעים':'קרב בודד · אינו מקדם את המסע';
  $('special-action-icon').innerHTML=icon(p.specialIcon);$('special-action-name').textContent=p.special;$('special-button').style.setProperty('--c',p.color);
  // No sentence over the arena (wave 3): the goal, the rival's advice and the cup's build are told before the battle; the floor is on the tower screen.
  $('match-toast').classList.remove('visible');toastUntil=0;$('mode-banner').hidden=!match.mode;
  startTutorial();
  // The whole arena stays still on screen through the countdown and the battle: no push-in. A spectacle guardian rises out of its ink
  // inside the countdown, the roar comes with it, and its bar paints in.
  if(match.spectacle){$('battle').querySelector('.rival-info')?.classList.add('paint-in');$('battle').querySelector('.rival-info')?.style.setProperty('--paint',Math.max(.6,match.countdown-.3).toFixed(2)+'s');sound.roar?.({delay:Math.max(0,match.countdown-1.6)});calls.fx.push('roar');}
  // A mission's picture and target pop into the score pill while the countdown runs.
  renderHUD();if(match.mode)flash($('mode-banner'),'pop',900);$('arena').focus({preventScroll:true});
}
const TUT_KEY='creature-league.tutorial';
let tutorial=null;
// The first-fight lesson. A touch screen gets no words: the control glows, a thumb on it shows what to do (drag the stick, tap a button), and the
// Little Shadow says it once its lines are recorded. A keyboard gets one short line in the HUD band. The praise at the end is the crowd's cheer.
const TUT_TEXT=['זוזו עם החצים או W A S D','רווח כדי לירות על היריב','כוח־העל מלא! לחצו E'];
// Its three lines are the Little Shadow's: drag the thumb, press the red button, the super is full.
const TUT_TARGET=['joystick','fire-button','special-button',null],TUT_VOICE=['voice-shadow-tut-move','voice-shadow-tut-fire','voice-shadow-tut-super'];
function startTutorial(){
  let seen=false;try{seen=storage.getItem(TUT_KEY)==='1';}catch{}
  tutorial=null;$('tutorial').hidden=true;tutThumb(null);document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  if(seen||match.mode||match.boss||match.actors[1].boss)return;
  const me=match.actors[0];tutorial={step:0,hold:0,shots:me.stats.shots,specials:me.stats.specials,age:0,touch:matchMedia('(pointer:coarse)').matches};match.calm=true;showTutorial();
}
function showTutorial(){if(!tutorial)return;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));const t=TUT_TARGET[tutorial.step],el=$('tutorial');
  if(tutorial.step>=3){el.hidden=true;tutThumb(null);sound.cheer?.();return;}if(t)$(t).classList.add('tut-glow');
  if(tutorial.touch){el.hidden=true;tutThumb(t);return;}el.hidden=false;el.dataset.step=tutorial.step;$('tut-text').textContent=TUT_TEXT[tutorial.step];}
// The thumb sits on the control it teaches and moves the way the child should; it steps aside while a thumb is on the stick.
function tutThumb(id){const th=$('tut-thumb');if(!th)return;th.hidden=!id;thumbKey='';thumbUntil=clock+1.5;if(id){th.dataset.on=id;placeThumb();}}
// The HUD asks 20 times a second; the thumb is measured only when its control or the stick's state changes (a layout read is costly on a phone).
let thumbKey='',thumbUntil=0;function thumbTick(){const th=$('tut-thumb');if(!th||th.hidden)return;const k=th.dataset.on+'|'+$('joystick').classList.contains('floating');if(k!==thumbKey||clock<thumbUntil){thumbKey=k;placeThumb();}}
function placeThumb(){const th=$('tut-thumb');if(!th||th.hidden)return;const r=$(th.dataset.on)?.getBoundingClientRect();th.style.visibility=!r?.width||th.dataset.on==='joystick'&&$('joystick').classList.contains('floating')?'hidden':'';
  if(r?.width){th.style.left=Math.round(r.left+r.width/2)+'px';th.style.top=Math.round(r.top+r.height/2)+'px';}}
// The lesson counts as learned only when every step was done; a fight that ends sooner shows it again next time.
function endTutorial(done=false){if(!tutorial)return;tutorial=null;if(match)match.calm=false;$('tutorial').hidden=true;tutThumb(null);document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));if(done)try{storage.setItem(TUT_KEY,'1');}catch{}}
// Each step moves on only after the child has done it.
function updateTutorial(dt){
  if(!tutorial||!match)return;if(match.status==='finished'){endTutorial(tutorial.step>=3);return;}if(match.status!=='playing')return;
  const me=match.actors[0];tutorial.age+=dt;
  // Each step's spoken line comes once the battle runs, never over the countdown.
  if(tutorial.said!==tutorial.step&&tutorial.step<3){tutorial.said=tutorial.step;sound.line?.(TUT_VOICE[tutorial.step]);}
  // A lesson never holds a battle hostage: after 40 s the rival may fall and fire again (the lesson comes back next time).
  if(tutorial.step<3&&tutorial.age>40){endTutorial(false);return;}
  if(tutorial.step===0){if(Math.hypot(me.moveX||0,me.moveY||0)>.3)tutorial.hold+=dt;if(tutorial.hold>.7){tutorial.step=1;showTutorial();}}
  else if(tutorial.step===1){if(me.stats.shots>=tutorial.shots+3){tutorial.step=2;match.calm=false;me.superCharge=1;tutorial.specials=me.stats.specials;showTutorial();}}
  else if(tutorial.step===2){if(me.stats.specials>tutorial.specials){tutorial.step=3;tutorial.doneAt=tutorial.age;showTutorial();}}
  else if(tutorial.age-tutorial.doneAt>2.2)endTutorial(true);
}
// Until the child has tried the super, the first rival cannot fall: the fight waits for the end of the lesson.
function tutorialGuard(){if(tutorial&&tutorial.step<3&&match?.status==='playing'){const r=match.actors[1];if(r.hp>0)r.hp=Math.max(r.hp,r.spec.hp*.35);}}
// A mission's score beside the clock: numbers and pictures only, the left number for the left creature, this child's in teal.
const scoreSide=(i,v)=>`<span class="mb-side ${i===localSide()?'me':'foe'}">${v}</span>`,scoreRow=(v0,mid,v1)=>scoreSide(0,v0)+(mid?`<span class="mb-goal">${mid}</span>`:'')+scoreSide(1,v1);
// The HUD never dims (wave 3): the creatures stay below its band instead (the renderer's view), so the clock, the pause button and the score read all the time.
function renderHUD(){if(!match)return;const [a,b]=match.actors,L=localSide();
  $('fire-button').setAttribute('aria-pressed',String(input.toggleFire));$('fire-button').classList.toggle('latched',input.toggleFire);
  // The left bar is always this child's creature: on the phone that joined a two-phone room that is side 1.
  {const me=match.online?match.actors[L]:a,foe=match.online?match.actors[1-L]:b;$('player-health').style.width=100*me.hp/me.spec.hp+'%';$('rival-health').style.width=100*foe.hp/foe.spec.hp+'%';$('player-hp').textContent=Math.ceil(me.hp)+' / '+me.spec.hp;$('rival-hp').textContent=Math.ceil(foe.hp)+' / '+foe.spec.hp;}
  const seconds=Math.max(0,Math.ceil(match.duration-match.time));$('timer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');document.querySelector('.match-clock').classList.toggle('urgent',seconds<=15);
  {const me=match.actors[L]||a,ch=me.superCharge||0,full=ch>=1;superHUD($('special-button'),me,0);$('special-button').classList.toggle('cooling',!full);$('special-button').classList.toggle('super-ready',full);$('special-button').style.setProperty('--cooldown',(1-ch)*100+'%');$('special-button').style.setProperty('--charge',ch);$('special-cooldown').textContent=full?'מוכן!':Math.floor(ch*100)+'%';$('special-button').setAttribute('aria-label',me.spec.special+(full?', מוכן':', נטען '+Math.floor(ch*100)+' אחוז'));}
  if(match.coop){const q=match.actors[2],ch=q.superCharge||0,full=ch>=1;$('special-button-2').classList.toggle('cooling',!full);$('special-button-2').classList.toggle('super-ready',full);$('special-button-2').style.setProperty('--charge',ch);superHUD($('special-button-2'),q,1);
    $('mode-banner').innerHTML=`<span class="mb-side me">${icon('duo')}</span><span class="mb-side foe">${icon('mountain')}${Math.max(0,Math.ceil(b.hp/b.spec.hp*100))}%</span>`;}
  if(match.versus&&!match.online){const ch=b.superCharge||0,full=ch>=1;$('special-button-2').classList.toggle('cooling',!full);$('special-button-2').classList.toggle('super-ready',full);$('special-button-2').style.setProperty('--charge',ch);superHUD($('special-button-2'),b,1);
    if(!match.mode)$('mode-banner').innerHTML=scoreRow(`<b class="mb-score">${versus.wins[0]}</b>`,':',`<b class="mb-score">${versus.wins[1]}</b>`);}
  if(match.mode){const [me,foe]=match.actors;
    // The wind: feathers each side; while one side holds all six, its ten-second count stands in the middle of the pill.
    if(match.wind){const h=match.wind.holder;bannerHTML(scoreRow(icon('feather')+me.feathers+'/'+WIND_TARGET,h>=0?`<b class="mb-count${h!==L?' foe':''}">${Math.ceil(match.wind.hold)}</b>`:icon('swirl'),foe.feathers+'/'+WIND_TARGET+icon('feather')));}
    else if(match.ball){const [s0,s1]=match.ball.score;$('mode-banner').innerHTML=scoreRow(`<b class="mb-score">${s0}</b>`,match.ball.overtime?icon('trophy'):icon('target')+`<small>${BALL_GOALS}</small>`,`<b class="mb-score">${s1}</b>`);}
    else if(match.echo){const E=match.echo;$('mode-banner').innerHTML=scoreRow(`<b class="mb-score">${E.songs[0]}</b>`,E.phase==='listen'?icon('ear'):E.phase==='play'?icon('sound')+`<small>${E.progress[L]??E.progress[0]}/${E.song.length}</small>`:icon('sparkle'),`<b class="mb-score">${E.songs[1]}</b>`);}
    else if(match.trio){const dots=n=>`<span class="trio-dots">${[0,1,2].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;$('mode-banner').innerHTML=scoreRow(dots(trioLeft(match,0)),'',dots(trioLeft(match,1)));}
    // The armour hill: points to the target, the one standing alone in the ring marked; the pair race: gates passed by the two friends and by the rival.
    else if(match.hill){hillPoints(match.hill);const H=match.hill,T=sim.HILL_TARGET??25,pt=i=>`<b class="mb-score${H.holder===i?' mb-hold':''}">${Math.floor(H.points?.[i]||0)}</b><small>/${T}</small>`;bannerHTML(scoreRow(icon('shield')+pt(0),'',pt(1)));}
    else if(match.race){const R=match.race,G=sim.RACE_GATES??5;bannerHTML(scoreRow(icon(iconOr('gate','arch'))+`<b class="mb-score">${Math.min(G,R.at|0)}</b><small>/${G}</small>`,'',`<b class="mb-score">${Math.min(G,R.rival|0)}</b><small>/${G}</small>`));}
    else if(match.lava){$('mode-banner').innerHTML=scoreRow(icon('flame')+me.power+'/'+MAX_POWER,match.lava.scale<.99?`<i class="mb-closing">${icon('target')}</i>`:'',foe.power+'/'+MAX_POWER+icon('flame'));}}
  if(clock>toastUntil)$('match-toast').classList.remove('visible');
  // A spectacle guardian's bar paints itself in during the countdown only.
  if(match.status!=='countdown')document.querySelector('#battle .rival-info.paint-in')?.classList.remove('paint-in');
  // The friend's pause note on the guest phone stays true when the host stops or goes on.
  if(match.online&&online?.role==='guest'&&$('pause-dialog').open)pauseText(true);
  almostTick();wonderHUD();cueTick();thumbTick();
}
// Each whole point a side gains on the armour hill ticks once (the child's climb in pitch, the rival's stay soft).
let hillSeen=null;
function hillPoints(H){const p=[0,1].map(i=>Math.floor(H.points?.[i]||0));if(hillSeen?.m!==match){hillSeen={m:match,p};return;}if(match.status==='playing')for(const s of [0,1])if(p[s]>hillSeen.p[s])sound.hillPoint?.(s,p[s]);hillSeen.p=p;}
// The banner is rebuilt only when what it shows changed.
function bannerHTML(html){const el=$('mode-banner');if(el._html!==html){el._html=html;el.innerHTML=html;}}
// The super button tells everything without words: a ring in three parts that click as they fill, two gold pips
// for the landed supers, and the star crown when the Power Form is one press away.
function superHUD(el,a,slot){if(!el||!a)return;const ch=a.superCharge||0,seg=Math.min(3,Math.floor(ch*3+1e-6)),can=!!a.canForm&&!a.formUsed;
  if(seg>(segSeen[slot]??3)&&seg<3&&match.status==='playing')uiSound('segment');segSeen[slot]=seg;
  el.classList.toggle('can-form',can);el.classList.toggle('form-ready',can&&(a.pips||0)>=(sim.FORM_PIPS??2));el.classList.toggle('in-form',(a.form||0)>0);
  el.querySelectorAll('.pips i').forEach((p,i)=>p.classList.toggle('on',i<(a.pips||0)));
  const crown=art?.fx?.['crown-frame'];if(crown?.src&&!el.classList.contains('has-crown-art')){el.style.setProperty('--crown-frame',`url("${crown.src}")`);el.classList.add('has-crown-art');}
  // A caught copy star: the button shows the copied super's picture inside a ring of both colours until it is used.
  const cp=a.copy&&CREATURES[a.copy]?a.copy:'';if((el.dataset.copy||'')!==cp){el.dataset.copy=cp;el.classList.toggle('has-copy',!!cp);if(cp)el.style.setProperty('--c2',CREATURES[cp].color);else el.style.removeProperty('--c2');
    const own=CREATURES[cp||a.id],ic=el.querySelector('[id^="special-action-icon"]');if(ic&&own)ic.innerHTML=icon(own.specialIcon);if(el.id==='special-button'&&own)$('special-action-name').textContent=own.special;}}
// While a Wonder runs: its picture under the clock with a ring that empties over its twelve seconds. No words.
function wonderHUD(){const W=match?.wonder,el=$('wonder-chip');if(!el)return;const on=W?.state==='active'&&!!W.id;
  if(on){if(el.dataset.id!==W.id){const w=sim.wonderById?.(W.id),sticker=art?.fx?.['wonder-'+W.id];el.dataset.id=W.id;el.innerHTML=(sticker?.src?`<img src="${sticker.src}" alt="">`:icon(iconOr(w?.icon)))+'<b></b><i class="wonder-ring"></i>';el.style.setProperty('--w',w?.color||'#ffd23a');}
    // The Wonder of the Day lasts to the end: no ring to empty.
    el.classList.toggle('endless',!!W.endless);
    el.style.setProperty('--p',Math.max(0,Math.min(1,1-(W.age||0)/(sim.WONDER_TIMES?.active||12))).toFixed(3));}
  else el.dataset.id='';if(el.hidden===on)el.hidden=!on;}
// The two-phone wait note in the band's corner: the friend's creature as a face, and a few words.
function toast(text,seconds=2){const el=$('match-toast'),c=CREATURES[online?.friend?.creature];el.innerHTML=(c?`<i class="toast-face" style="--c:${c.color}">${icon(c.specialIcon)}</i>`:'')+'<span></span>';el.querySelector('span').textContent=text;el.classList.add('visible');toastUntil=clock+seconds;}
function pauseBattle(e){if(match?.online&&online?.role==='guest'){if(e?.type==='click'||e?.type==='keydown'){pauseText(true);if(!$('pause-dialog').open)$('pause-dialog').showModal();}else{clearInput();onlineSend({type:'in',...packInput({},online.supers)});}return;}if(!match||screen!=='battle'||match.status==='finished'||match.status==='paused')return;previousStatus=match.status;match.status='paused';clearInput();sound.pause();if(match.online)onlineSend({type:'snap',snap:snapshot(match)});pauseText(false);if(!$('pause-dialog').open)$('pause-dialog').showModal();}
// The friend's phone runs a two-phone battle, so the guest's pause cannot stop it: the dialog says so honestly. When the host's
// phone did stop the battle (its child paused, or this phone went quiet), the note says that instead, and changes back when it goes on.
const PAUSE_TEXT={};
function pauseText(guest){const d=$('pause-dialog'),h=d.querySelector('h2'),p=d.querySelector('p');if(!h||!p)return;PAUSE_TEXT.h??=h.textContent;PAUSE_TEXT.p??=p.textContent;const held=guest&&match?.status==='paused';
  const ht=!guest?PAUSE_TEXT.h:held?'הקרב עצור רגע':'הקרב ממשיך',pt=!guest?PAUSE_TEXT.p:held?'הטלפון של '+(online?.friend?.name||'החבר')+' עצר. ממשיכים ביחד.':'בשני טלפונים אין עצירה. חוזרים מהר!';
  if(h.textContent!==ht)h.textContent=ht;if(p.textContent!==pt)p.textContent=pt;}
function resumeBattle(){if(match?.online&&online?.role==='guest'){$('pause-dialog').close();return;}if(!match||match.status!=='paused'){if($('pause-dialog').open)$('pause-dialog').close();return;}$('pause-dialog').close();match.status=previousStatus;clearInput();accumulator=0;sound.resume();$('arena').focus({preventScroll:true});}
// Leaving a battle from the pause window.
function leaveBattle(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());slows=[];sound.setMusicRate?.(1);
  // Back to the screen where the battle was started (a two-phone battle's is the room; a running one tells the friend's phone first).
  if(match?.online&&match.status!=='finished')onlineSend({type:'abort'});goOrigin();}
function onFinish(){
  if(match.online){finishOnline();return;}
  if(match.versus){finishVersusRound();return;}
  if(match.coop){finishCoop();return;}
  const boxStart=profile.box.earned,sparkStart=sparkTotal(profile.box,SPARKS_PER_BOX);
  const finalWin=mode==='cup'&&cupFinal&&match.winner===0;
  const storyResult=mode==='story'?recordStory(profile,match):null;if(storyResult&&!storyResult.replay)storyEvent=storyResult;
  const hero=match.actors[0].id,winsBefore=profile.creatures[hero]?.wins||0,xpBefore=profile.creatures[hero]?.xp||0,wildId=storyResult?.released||match.wild,wasLocked=!!storyResult?.released||(wildId&&!isUnlocked(profile,wildId));
  const levelBefore=creatureLevel(profile,hero),formBefore=formOn(hero),leagueResult=mode==='league'?recordLeague(profile,match):null,towerResult=mode==='tower'?recordTower(profile,match):null;
  recordResult(profile,match,mode);const wonder=rules.recordWonder?.(profile,match)||null;rules.recordFormUse?.(profile,match);
  // A copied super fired with a creature fills its mix page (a new mix gives a spark); the Wonder of the Day and a pair race that built the bridge of light are remembered.
  const mixes=rules.recordMixes?.(profile,match)||[],mixFirst=!!mixes.length&&Object.values(profile.mixes||{}).reduce((n,l)=>n+(l?.length||0),0)===mixes.length;if(mode==='wonder')rules.recordWonderDay?.(profile);if(mode==='story')rules.recordTracks?.(profile,match);persist();
  refreshTodayGoals();const me0=match.actors[0],daily=progressDaily(profile,{win:match.winner===0,creature:hero,supers:me0.stats.specials,mode,towerCleared:!!towerResult?.won,storyStep:!!(storyResult&&!storyResult.replay),replayStars:storyResult?.replay?storyResult.stars:0,formUsed:!!me0.formUsed,newWonder:!!wonder?.first,copied:me0.stats.copies||0,wonderDay:mode==='wonder'});persist();clearInput();
  const winsAfter=profile.creatures[hero]?.wins||0,newSkin=SKINS.find(k=>k.wins>winsBefore&&k.wins<=winsAfter),released=wasLocked&&isUnlocked(profile,wildId),freed=released?CREATURES[wildId]:null;
  const p=match.actors[0],r=match.actors[1],rc=CREATURES[r.id],stats=resultStats(match),win=match.winner===0,draw=match.winner===-1;
  const challengeWin=mode==='challenge'&&win;
  const missionStep=match.story&&STEPS.find(s=>s.id===match.story&&s.kind==='mission');
  // The stamp says it in a word or two; the longer story of the battle waits behind the "?" button.
  // A mission that frees its rival (Tzadon on his hill) celebrates the friend first, like a freeing fight.
  let stamp=match.mode&&win&&!freed?(missionStep?'המשימה הושלמה!':'ניצחון!'):storyResult?.step.kind==='mirror'?'ניצחתם את הפחד!':storyResult?.lit&&!released?'האור נדלק!':freed?freed.name+byGender(freed,' השתחרר!',' השתחררה!'):finalWin?'הגביע שלכם!':challengeWin?'הזירה שלכם!':win?'ניצחון!':draw?'תיקו!':'כמעט!';
  let sub=match.mode&&win&&!freed?(storyResult?.stars?(storyResult.stars===3?'מושלם! שלושה כוכבים.':'רוצים שלושה כוכבים? אפשר לשחק שוב מהמפה.'):({wind:'החזקתם את הרוח עד הסוף!',lava:'שרדתם את טבעת הלבה!',ball:'איזה משחק! '+match.ball?.score.join(' : '),trio:'השלישייה שלכם ניצחה ביחד!',echo:'השלמתם את המנגינות!'})[match.mode]||'כל הכבוד!'):match.mode&&missionStep&&!win?(missionEased(profile,missionStep)?'בניסיון הבא יהיה קצת יותר קל. אתם יכולים!':MISSION_TIP[match.mode]||'עוד ניסיון אחד, ואתם שם!'):storyResult?.step.kind==='mirror'?'האור הלבן נדלק בשרשרת, והכוכב הזהוב מוביל לטירה.':mode==='story'&&!win?(draw?'כמעט! עוד ניסיון אחד.':'הצל הקטן מאמין בכם. מנסים שוב, אולי בדרך אחרת?'):freed&&storyResult?.lit?freed.name+byGender(freed,' השתחרר',' השתחררה')+', והאור '+islandOf(storyResult.lit).gemName+' נדלק בשרשרת!':freed?freed.name+byGender(freed,' מצטרף לנבחרת, והקלף שלו מחכה שתהפכו אותו!',' מצטרפת לנבחרת, והקלף שלה מחכה שתהפכו אותו!'):mode==='wild'?rc.name+' עדיין '+byGender(rc,'פראי','פראית')+'. '+(draw?'עוד ניסיון?':'כל ניסיון מלמד משהו חדש.'):finalWin?'זכיתם בגביע! נפתחה הזירה המתפוררת, והשילוב שלכם ממשיך איתכם.':challengeWin?'השלמתם את כל ארבעת האתגרים! התג נוסף להישגים שלכם.':win?(mode==='wonder'?'ניצחון בפלא של היום! עוד קרב?':mode==='cup'?`השלמתם ${profile.cup.stage} מתוך 4 אתגרים. עכשיו בוחרים כוח, ואז ${CUP[profile.cup.stage].title} מול ${CREATURES[CUP[profile.cup.stage].rival].name}.`:'ניצחון באימון! עוד קרב, או ממשיכים במסע.'):draw?'אותו אחוז חיים נשאר לשני היצורים. מנסים שוב?':mode==='quick'||mode==='wonder'?'לכל יריב יש נקודת חולשה. מנסים דרך אחרת?':'השלב והכוחות שלכם נשמרו. מנסים שוב בדרך אחרת?';
  if(towerResult){stamp=towerResult.won?(match.tower.guard?'השומר הובס!':'קומה '+towerResult.cleared+'!'):'כמעט!';sub=towerResult.won?(towerResult.record?'שיא חדש במגדל!':'ממשיכים לטפס.')+(towerResult.pick?' עכשיו בוחרים כוח חדש לטיפוס.':''):towerResult.retry?'כוכב ההצלה שלכם נדלק: מנסים שוב את קומה '+towerResult.floor+'.':'הגעתם לקומה '+towerResult.floor+'. השיא שלכם: קומה '+towerResult.best+'.';}
  if(leagueResult){sub=leagueResult.rankUp?'עליתם לדרגת '+leagueResult.rankUp.name+'!':win?'עוד '+(nextPrizeAt(profile)-profile.league.best)+' גביעים לתיבה הבאה בדרך.':draw?'צמוד! הגביעים נשארו במקום.':leagueResult.delta?'הקרב הבא יהיה קצת יותר קל. אתם יכולים!':'עד '+LEAGUE_SAFE+' גביעים הפסד לא מוריד כלום.';}
  if(storyResult?.replay){stamp=storyResult.improved?'שיא חדש!':win?'ניצחון!':'כמעט!';if(win)sub=storyResult.stars===3?'שלושה כוכבים! מושלם.':storyResult.improved?'השיא החדש שלכם: '+storyResult.stars+' כוכבים.':'השיא שלכם: '+storyResult.best+' כוכבים. אפשר לנסות שוב.';}
  // The tip names what this rival does, from the same advice the briefing gives.
  let tip=r.boss?(stats.weakHits>0?`ניצלתם את רגע ההתאוששות של סלעוז ${stats.weakHits} פעמים!`:bossAdvice):win?p.spec.tip:match.mirror?'הבבואה זזה כמוכם. הפתיעו אותה מהצד.':rivalAdvice[r.id]||'זוזו הצידה מהירי, ותקפו כשהיריב עוצר.';
  if(match.reason==='time')tip=match.ball?'הזמן נגמר: מי שהבקיע יותר גולים ניצח.':match.trio?'הזמן נגמר: מי שנשארו לו יותר יצורים ניצח.':'הזמן נגמר: הניצחון נקבע לפי אחוז החיים שנותר לכל יצור.';
  const starCount=win?(storyResult?.stars||(p.hp/p.spec.hp>=.5?3:p.hp/p.spec.hp>=.25?2:1)):0;
  const kicker=`${mode==='cup'?'גביע החופים':mode==='challenge'?CHALLENGE.title:mode==='wild'?'קרב פרא':mode==='story'?(inChapter2(profile)?'פרק 2 · המפריד במסכה':'מסע השרשרת'):mode==='league'?'ליגת היצורים':mode==='tower'?'מגדל המסכה':mode==='wonder'?'הפלא של היום':'אימון · קרב בודד'} · ${LEVELS[match.level].name}`;
  sessionTick();if(typeof queueNext==='function')queueNext(mode);lastArena=match.arena||null;
  // A Power Form unlocked now, or a new Lab design on its first battle: it waits as the crown on Home's creature, opened by a tap.
  const formNew=!formBefore&&formOn(hero),designNew=!formNew&&designFresh(hero);if(formNew||designNew)formWaiting=hero;
  // The buttons keep the origin rule: 'ממשיכים' goes back to the screen where the battle was started, the big button to one more of the same.
  const again=m=>()=>startBattle(m),toCampfire=()=>{match=null;showView('campfire');},onward={label:'ממשיכים',icon:'arrow',go:goOrigin};
  let base,secondary=null;
  // A freed creature's card turns over right there, over the screen the battle came from: the one extra step.
  if(released)base={label:'הופכים את הקלף!',icon:'cards',go:()=>{pendingReveal=true;goOrigin();revealCard(wildId,{joined:true});pendingReveal=false;}};
  // The cup is one place with three steps: a win goes on to its next step (the workshop, or the challenge after the final).
  else if(finalWin||mode==='cup'&&win)base={...onward,go:continueJourney};
  else if(towerResult&&!towerResult.retry&&!(towerResult.won&&!towerResult.pick))base={label:towerResult.pick?'בוחרים כוח':'טיפוס חדש',icon:'tower',go:()=>{match=null;showView('tower');}};
  else if(win&&!['league','quick','wonder','tower'].includes(mode))base=onward;
  else{base={label:['league','quick','wonder'].includes(mode)?'עוד קרב!':towerResult?.won?'לקומה '+(profile.tower.run?.floor||'')+'!':draw?'קרב הכרעה':'מנסים שוב!',icon:'play',battle:true,next:['league','quick','tower','wonder'].includes(mode),go:again(mode)};secondary=onward;}
  let primary=base;
  // After about ten battles or twenty-five minutes the big button is the campfire; one more battle is still a small button.
  const rest=campfireDue();
  if(rest&&primary.battle){secondary={label:primary.label.replace('!',''),battle:true,go:primary.go};primary={label:'מנוחה ליד המדורה',icon:'campfire',go:toCampfire};}
  let pv=primary.next&&typeof nextPreview==='function'?nextPreview():null;
  // A new mix turns over its one card first; then the same result comes back with its calm big button (a next battle never starts from it).
  if(mixes.length&&!released){const later={primary,secondary,preview:pv&&pv.mode===mode?pv:null,homeCampfire:rest&&!primary.battle&&primary.go!==toCampfire};
    primary={label:'שילוב חדש!',icon:'mix',form:true,go:()=>openMixReveal([mixes[0]],{back:()=>resultAgain(later),first:mixFirst})};pv=null;}
  const team=!rest&&!released&&!match.trio&&(['league','quick','wild','wonder'].includes(mode)||mode==='story'&&!storyResult)?mostPlayed(profile.creatures,Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),hero,5):[];
  // Chips: what moved in this battle, in pictures.
  const chips=[];
  if(leagueResult){const d=leagueResult.delta;chips.push(`<div class="rchip league${d>0?' up':d<0?' down':''}">${rankBadge(leagueResult.rank)}<b dir="ltr" data-count="${d}">${d>0?'+':d<0?'−':''}${Math.abs(d)}</b>${icon('trophy')}${leagueResult.rankUp?`<em>${esc(leagueResult.rankUp.name)}!</em>`:''}</div>`);}
  if(towerResult)chips.push(`<div class="rchip tower"><span class="tower-badge">${icon('tower')}</span><b>${towerResult.won?'קומה '+towerResult.cleared+' ✓':towerResult.retry?'כוכב הצלה':'קומה '+towerResult.floor}</b>${towerResult.record?'<em>שיא!</em>':''}</div>`);
  if(match.ball||match.trio||match.hill||match.race){const s=match.ball?match.ball.score:match.hill?(match.hill.points||[0,0]).map(Math.floor):match.race?[Math.min(5,match.race.at|0)+'/5',Math.min(5,match.race.rival|0)+'/5']:[trioLeft(match,0)+'/3',trioLeft(match,1)+'/3'];chips.push(`<div class="rchip score"><b>${s[0]} : ${s[1]}</b></div>`);}
  chips.push(xpChip(hero,xpBefore,levelBefore,formBefore));
  for(const x of mixes.slice(0,2))chips.push(`<div class="rchip mix" style="--c:${CREATURES[x.id]?.color||'#ffd23a'};--k:${CREATURES[x.kind]?.color||'#ffd23a'}">${icon('mix')}<b>${esc(x.name)}</b></div>`);
  if(newSkin)chips.push(`<div class="rchip unlock" style="--c:${p.spec.color}"><span class="skin-swatch skin-${newSkin.id}"></span><b>${esc(newSkin.name)}</b><button class="button secondary" id="result-wear" type="button">ללבוש!</button></div>`);
  if(wonder){const w=rules.wonderById?.(wonder.id)||wonderList().find(x=>x.id===wonder.id)||{id:wonder.id,name:'',icon:'sparkle'};chips.push(`<div class="rchip wonder${wonder.first?' first':''}" style="--w:${w.color||'#ffd23a'}" title="${esc(w.name)}"><span class="wonder-fly">${stickerArt(w)}</span><span class="rchip-book">${icon('book')}</span><b dir="ltr">${wonder.first?'+1':'×'+wonder.count}</b></div>`);}
  if(daily.bonus||daily.moved.some(g=>g.done))chips.push(`<div class="rchip goals">${icon('target')}<span class="goals-dots">${profile.daily.goals.map(g=>`<i class="${g.done?'on':''}"></i>`).join('')}</span>${daily.bonus?chestHTML('gold',{mini:true}):''}</div>`);
  if(!win&&!towerResult&&!(leagueResult?.delta<0))chips.push(`<div class="rchip safe">${icon('shield')}<b>הכל שמור</b></div>`);
  // Sparks fly into the box meter one by one; boxes from the road, the tower or the goals pop the chest too.
  const directBoxes=(leagueResult?.boxes||0)+(towerResult?.boxes||0)+(daily.bonus?1:0),gained=Math.max(0,sparkTotal(profile.box,SPARKS_PER_BOX)-sparkStart-directBoxes*SPARKS_PER_BOX),newBoxes=profile.box.earned-boxStart;
  const sparksHTML=`<span class="rs-label">${gained?`<b dir="ltr">+${gained}</b> ${sparkWord(gained)}`:''}</span><span class="spark-meter big">${sparkMeter(sparkStart%SPARKS_PER_BOX)}</span><span class="rs-chest">${chestHTML(profile.box.pending?'gold':boxTier(profile.box.opened),{mini:true})}<b class="rs-new" dir="ltr">+${newBoxes}</b></span>`;
  resultLayout({hero,skin:skinOf(profile,hero),win,stamp,kicker,stars:starCount,chips,sparksHTML,steps:sparkSteps(sparkStart,sparkStart+gained,SPARKS_PER_BOX),newBoxes,newSkin,mode,
    content:`<p class="result-sub">${esc(sub)}</p>${tip?`<p class="result-tip">${esc(tip)}</p>`:''}`,primary,secondary,team,homeCampfire:rest&&!primary.battle&&primary.go!==toCampfire,preview:pv&&pv.mode===mode?pv:null});
  showResult(match,{voice:win?'voice-victory':match.winner===1?'voice-announcer-almost':null});
}
// ------------------------------------------------------------------ the league and creature levels
const rankBadge=(rank,{big=false}={})=>`<span class="rank-shield${big?' big':''}" style="--r:${rank.color}">${icon('trophy')}</span>`;
function renderLeagueStrip(){
  const L=profile.league,rank=rankOf(L.trophies),next=nextPrizeAt(profile),prev=next-PRIZE_EVERY;
  $('home-rank').innerHTML=rankBadge(rank);$('home-league-sub').textContent=rank.name+' · '+L.trophies+' 🏆';$('home-league-bar').style.width=Math.round((L.best-prev)/PRIZE_EVERY*100)+'%';
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
  for(const f of ids)livePortrait('lchip-'+f,f,{skin:skinOf(profile,f),hats:hatsFor(f)});
  document.querySelectorAll('[data-league-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.leagueFighter;persist();sound.click();renderLeague();});shelfShow($('league-fighters'));
}
// ------------------------------------------------------------------ the result: a short show, and one calm tap as soon as the stamp has landed
// 0 s the stamp, the creature and its stars; 1.2 s the chips and the buttons (the big one wakes 0.6 s later); 2.4 s the sparks fly on. Any tap before 1.2 s jumps to the buttons.
const BEAT=[0,1200,2400],RESULT_DELAY=1200;
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
    livePortrait('result-portrait',R.hero,{skin:R.skin,clip:R.win?'attack':'idle',hats:hatsFor(R.hero)});
    $('result-stars').hidden=!R.stars;$('result-stars').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<R.stars?'earned':''}">${icon('star')}</span>`).join('');
    $('result-kicker').textContent=R.kicker;$('result-chips').innerHTML=R.chips.filter(Boolean).join('');$('result-sparks').innerHTML=R.sparksHTML||'';$('result-sparks').hidden=!R.sparksHTML;
    $('result-content').innerHTML=R.content;
    $('result-wear')?.addEventListener('click',e=>{if(!chooseSkin(profile,R.hero,R.newSkin.id))return;persist();sound.click();stage.run.skin=R.newSkin.id;e.currentTarget.outerHTML='<span class="worn">✓</span>';livePortrait('result-portrait',R.hero,{skin:R.newSkin.id,hats:hatsFor(R.hero)});});
  }
  const P=$('result-primary'),A=R.primary;P.className='button primary full result-primary'+(R.preview?' with-next':'')+(A.form?' form-new':'');
  P.innerHTML=R.preview?`<span class="next-face"><img src="${arenaPicture(R.preview.arena)}" alt="" onerror="this.onerror=null;this.src='${arenaFallback(R.preview.arena)}'"><canvas id="result-next" aria-hidden="true"></canvas></span><b>${esc(A.label)}</b>`:`${A.icon?icon(A.icon):''}<b>${esc(A.label)}</b>`;
  if(R.preview)livePortrait('result-next',R.preview.rival,{still:true});
  const S=$('result-secondary');S.hidden=!R.secondary;S.onclick=null;if(R.secondary){S.textContent=R.secondary.label;S.className='button secondary full'+(R.secondary.battle?' again':'');}
  const T=$('result-team'),team=plain?[]:R.team||[];T.hidden=!team.length;
  T.innerHTML=team.map(id=>`<button type="button" class="result-pick${id===R.hero?' chosen':''}" data-result-pick="${id}" style="--c:${CREATURES[id].color}" aria-label="עוד קרב עם ${CREATURES[id].name}"><canvas id="result-pick-${id}" aria-hidden="true"></canvas></button>`).join('');
  for(const id of team)livePortrait('result-pick-'+id,id,{skin:skinOf(profile,id),still:true,hats:hatsFor(id)});
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
  cloudSoon();clearTimeout(resultWait);const t0=performance.now();
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
  if(R.win)at(1000,()=>livePortrait('result-portrait',R.hero,{skin:R.skin,hats:hatsFor(R.hero)}));
  at(BEAT[1],()=>{d.classList.add('b2');countUp();});
  at(BEAT[2],()=>{d.classList.add('b3');R.steps.forEach((s,i)=>at(i*230,()=>sparkTo(s,i)));at(R.steps.length*230+420,()=>{document.querySelectorAll('#result-sparks .spark-meter i').forEach((e,j)=>e.classList.toggle('on',j<profile.box.sparks));if(R.newBoxes)document.querySelector('#result-sparks .rs-chest')?.classList.add('got');});});
  at(BEAT[1],showActions);
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
  livePortrait('result-portrait',R.hero,{skin:R.skin,hats:hatsFor(R.hero)});showActions();
}
function showActions(){
  const R=stage.run,d=$('result-dialog');if(!R||R.actionsShown)return;R.actionsShown=true;d.classList.add('b4');d.querySelector('.result-actions').inert=false;
  const close=f=>()=>{d.close();f();};
  armPrimary($('result-primary'),close(R.primary.go),{wait:R.primary.wait||null});
  if(R.secondary){if(R.secondary.battle)armPrimary($('result-secondary'),close(R.secondary.go));else $('result-secondary').onclick=close(()=>{sound.click();R.secondary.go();});}
  document.querySelectorAll('[data-result-pick]').forEach(el=>armPrimary(el,close(()=>{profile.selected=el.dataset.resultPick;persist();startBattle(R.mode);})));
  $('result-home').onclick=close(()=>{if(!R.homeCampfire){goHome();return;}match=null;sound.click();showView('campfire');});
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
function armPrimary(btn,go,{wait=null}={}){
  btn._arm={shownAt:performance.now(),go,awake:false,wait};btn._press=null;btn.classList.add('sleep');btn.classList.remove('awake');btn.setAttribute('aria-disabled','true');armed.add(btn);
  btn.onpointerdown=e=>{const now=performance.now(),others=[...held.keys()].filter(k=>k!=='p'+e.pointerId).length;btn._press={at:now,ok:!!btn._arm&&pressWakes({at:now,shownAt:btn._arm.shownAt,lastUp:lastLift,held:others})};};
  btn.onclick=e=>{const a=btn._arm;if(!a)return;const ok=e.detail===0?a.awake:!!btn._press?.ok&&performance.now()-btn._press.at<3000;btn._press=null;
    if(!ok||a.wait&&!a.wait()){btn.classList.remove('nudge');void btn.offsetWidth;btn.classList.add('nudge');return;}
    disarm();a.go();};
  if(!armTimer)armTimer=setInterval(armWatch,100);
}
function armWatch(){
  let woke=false;const now=performance.now();
  for(const b of armed){if(!b.isConnected||!b.closest('dialog[open]')||!b._arm){armed.delete(b);continue;}const a=b._arm;if(a.awake||a.wait&&!a.wait())continue;
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
      drawPortrait(el,entry.puppet,entry.id,clock,dt*(o.speed??1),{active:true,skin:o.skin||null,form:!!o.form,clip:o.clip||'idle',glowColor:o.glowColor||null,hats:o.hats||null,lab:o.lab||null});}
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
  $('campfire-arena').onerror=()=>{$('campfire-arena').onerror=null;$('campfire-arena').src=arenaFallback(lastArena);};$('campfire-arena').src=arenaPicture(lastArena||'wind');livePortrait('campfire-portrait',id,{skin:skinOf(profile,id),speed:.5,hats:hatsFor(id)});
  say('campfire-guide','איזה יום! עכשיו כולם נחים ליד המדורה.',{voice:'voice-shadow-hello'});
  sound.setScene('campfire');sound.sting?.('sting-campfire',{delay:.2});writeSession(sessionRested(Date.now()));
}
// No battle yet in this session (the wave-1 session rules): the announcer counts 3-2-1 only then.
function sessionFresh(){return freshSession(readSession(),Date.now());}
// ------------------------------------------------------------------ Ron's welcome hat box: once ever, after the update
// Three taps open the box, three hats come out (two common, one rare), one is chosen and worn at once. Closed without a
// choice, the same three wait for the next visit to the island.
let hatbox=null;
// It never opens by itself: while the box waits, Home shows Ron's gift, and a tap on the gift opens it (homeBadges).
function maybeWelcome(){return !!rules.welcomeDue?.(profile)&&!$('hatbox-dialog').open;}
// Ron's box itself: three taps, three hats, one chosen.
function openWelcomeBox(){
  if(!rules.welcomeOffer||!rules.chooseWelcomeHat||!profile.hats)return false;const offer=rules.welcomeOffer(profile);persist();if(!offer.length)return false;
  hatbox={taps:0,offer,chosen:null};renderHatbox();const d=$('hatbox-dialog');if(!d.open)d.showModal();sound.unlock?.();return true;}
function renderHatbox(){
  const H=hatbox,d=$('hatbox-dialog');if(!H)return;const opened=H.taps>=3,id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',c=CREATURES[id];
  d.classList.toggle('opened',opened);d.classList.toggle('chosen',!!H.chosen);
  $('hatbox-title').textContent=H.chosen?hatName(H.chosen)+'!':opened?'בוחרים כובע אחד':'מתנה מרון!';
  $('hatbox-line').textContent=H.chosen?'כבר על '+c.name+'! אפשר להחליף כובע בכל קלף, ועוד כובעים מחכים בתיבות הכוכב.':opened?'אחד מהם שלכם!':['הבאתי לכם תיבה. הקישו עליה!','עוד פעמיים!','עוד פעם אחת!'][H.taps];
  $('hatbox-chest').hidden=opened;$('hatbox-chest').dataset.tier=['wood','silver','gold'][Math.min(2,H.taps)];
  $('hatbox-hats').hidden=!opened||!!H.chosen;$('hatbox-hats').innerHTML=opened&&!H.chosen?H.offer.map((h,i)=>`<button type="button" class="hatbox-hat tier-${rules.hatById?.(h)?.tier||'common'}" data-hatbox="${h}" style="--i:${i}">${hatPic(h)}<b>${esc(hatName(h))}</b></button>`).join(''):'';
  $('hatbox-worn').hidden=!H.chosen;$('hatbox-done').hidden=!H.chosen;
  if(H.chosen)livePortrait('hatbox-portrait',id,{skin:skinOf(profile,id),hats:hatsFor(id),clip:'attack'});
  d.querySelectorAll('[data-hatbox]').forEach(b=>armCard(b,()=>{if(!hatbox||hatbox.chosen||!rules.chooseWelcomeHat(profile,b.dataset.hatbox))return;hatbox.chosen=b.dataset.hatbox;persist();if(sound.hat)sound.hat(true);else sound.click();renderHatbox();if(screen==='lobby'){buildRoster();refreshSelection();renderHome();}}));
}
function tapHatbox(){const H=hatbox;if(!H||H.taps>=3)return;H.taps++;const chest=$('hatbox-chest');chest.classList.remove('shake');void chest.offsetWidth;chest.classList.add('shake');
  sound.tone?.(260+H.taps*150,.22,'triangle',.12,120);if(H.taps>=3){chest.classList.add('open');sound.play?.('sfx-join-fanfare',{volume:.8});setTimeout(()=>{chest.classList.remove('open');renderHatbox();},450);}else renderHatbox();}
// ------------------------------------------------------------------ comeback cards: the loser of a round picks one of three
// Same screen: each child has a half. The loser's half shows three cards face down, the winner's half one card back.
// A calm tap turns one over (a picture and two words); a moment later the next round starts with it.
let ccard=null,onlineLastCard=null;
const CARD_FACE_ICON={super:'bolt',crystal:'sparkle',decoy:'pair',speed:'arrow',heart:'heart'};
const ccardBack=()=>`<span class="ccard-back">${picOver('./art/gen/fx-card-back-blue.png','star','ccard-pic')}</span>`;
const ccardFace=id=>`<span class="ccard-face">${picOver('./art/gen/fx-ccard-'+id+'.png',CARD_FACE_ICON[id]||'star','ccard-pic')}<b>${esc(rules.CCARD_WORDS?.[id]||'')}</b></span>`;
const ccardButtons=deal=>deal.map((id,i)=>`<button type="button" class="ccard" data-ccard="${i}" aria-label="קלף ${i+1}"><span class="ccard-inner">${ccardBack()}${ccardFace(id)}</span></button>`).join('');
// A choice a thumb still pressing from the battle must not take: the same calm-press rule as the big button.
function armCard(btn,go){const shownAt=performance.now();btn.onpointerdown=e=>{btn._ok=pressWakes({at:performance.now(),shownAt,lastUp:lastLift,held:[...held.keys()].filter(k=>k!=='p'+e.pointerId).length});};
  btn.onclick=e=>{const now=performance.now(),ok=e.detail===0?pressWakes({at:now,shownAt}):!!btn._ok;btn._ok=false;if(!ok){btn.classList.remove('nudge');void btn.offsetWidth;btn.classList.add('nudge');return;}go();};}
function turnCard(row,i){row.querySelectorAll('[data-ccard]').forEach((b,j)=>{b.disabled=true;b.classList.toggle('picked',j===i);b.classList.toggle('dropped',j!==i);});row.querySelector(`[data-ccard="${i}"]`)?.classList.add('flipped');if(sound.cardFlip)sound.cardFlip();else sound.play?.('sfx-card-flip');}
function openComebackCards(loser,{onDone=null}={}){
  const deal=rules.dealComebackCards?.(Math.random,versus.cardsUsed||[])||[];if(!deal.length||!(loser===0||loser===1)){onDone?.();return false;}
  ccard={loser,deal,picked:null,onDone};const d=$('ccard-dialog');
  [0,1].forEach(side=>{const half=d.querySelector('.ccard-half.p'+(side+1)),c=CREATURES[versus.ids[side]]||CREATURES.maimi;half.classList.toggle('picks',side===loser);
    half.innerHTML=`<div class="ccard-who" style="--c:${c.color}"><b></b><small>${c.name}</small></div><div class="ccard-row">${side===loser?ccardButtons(deal):`<span class="ccard idle"><span class="ccard-inner">${ccardBack()}</span></span>`}</div><p class="ccard-hint">${side===loser?'בוחרים קלף!':'מחכים…'}</p>`;
    half.querySelector('.ccard-who b').textContent=vsName(side);});
  d.querySelectorAll('[data-ccard]').forEach(b=>armCard(b,()=>pickComebackCard(+b.dataset.ccard)));
  if(!d.open)d.showModal();sound.unlock?.();return true;}
function pickComebackCard(i){const C=ccard,d=$('ccard-dialog');if(!C||C.picked!=null||!C.deal[i])return;C.picked=i;const id=C.deal[i];
  versus.card={side:C.loser,id};versus.cardsUsed=[...(versus.cardsUsed||[]),id];turnCard(d.querySelector('.ccard-half.picks'),i);
  setTimeout(()=>{if(ccard!==C)return;ccard=null;d.close();C.onDone?.();},1200);}
// ------------------------------------------------------------------ a new mix: its card turns over after the battle
// Two creatures and the mix's name, and its spark. The first mix ever carries the Little Shadow's 'you listened so well'.
let mixReveal=null;
function openMixReveal(mixes,{back=null,first=false}={}){
  const list=(mixes||[]).filter(x=>x&&CREATURES[x.id]&&CREATURES[x.kind]);if(!list.length){if(typeof back==='function')back();return false;}
  const [m,...rest]=list,a=CREATURES[m.id],k=CREATURES[m.kind],d=$('reveal-dialog');mixReveal={back};
  d.style.setProperty('--c',a.color);$('reveal-flip').classList.remove('flipped');d.classList.remove('burst','ritual','ritual-done','holding','one-thumb');d.classList.add('mix');ritual=null;$('ritual-skip').hidden=true;
  $('reveal-back').innerHTML=cardBack(m.id,{label:'שילוב חדש'});
  $('reveal-front').innerHTML=`<article class="tcard mix-card big" style="--c:${a.color};--d:${a.dark};--k:${k.color}"><header><span class="tcard-num">${icon('mix')}</span><span class="tcard-el">${a.element} + ${k.element}</span></header><div class="tcard-art mix-art"><canvas id="mix-a" aria-hidden="true"></canvas><span class="mix-plus" aria-hidden="true">+</span><canvas id="mix-b" aria-hidden="true"></canvas></div><div class="tcard-title"><h3>${esc(m.name)}</h3><small>${a.name} + ${k.name}</small></div><div class="tcard-special">${icon(k.specialIcon)}<b>${k.special}</b></div><footer><span class="mix-spark"><i></i><b dir="ltr">+1</b></span><span>שילוב</span></footer></article>`;
  livePortrait('mix-a',m.id,{skin:skinOf(profile,m.id),hats:hatsFor(m.id),clip:'attack'});livePortrait('mix-b',m.kind,{});
  $('reveal-kicker').textContent='שילוב חדש!';$('reveal-title').textContent='';$('reveal-text').textContent='';
  const go=f=>()=>{mixReveal=null;d.classList.remove('mix');$('reveal-secondary').textContent='לאלבום הקלפים';d.close();f();};
  $('reveal-primary').textContent=rest.length?'לשילוב הבא':'ממשיכים';$('reveal-primary').onclick=go(()=>{if(rest.length)openMixReveal(rest,{back});else if(typeof back==='function')back();});
  $('reveal-secondary').textContent='לספר השילובים';$('reveal-secondary').hidden=false;$('reveal-secondary').onclick=go(()=>{match=null;albumTab='mixes';mixPage=m.id;showView('cards');});
  if(!d.open)d.showModal();sound.unlock?.();
  setTimeout(()=>{if(mixReveal?.back!==back||!d.open)return;$('reveal-flip').classList.add('flipped');d.classList.add('burst');if(sound.mixFanfare){sound.play?.('sfx-card-flip');sound.mixFanfare();}else sound.reveal?.(false);$('reveal-title').textContent=m.name+'!';$('reveal-text').textContent=first&&tale.SHADOW_LINES?.copy?tale.SHADOW_LINES.copy:a.name+byGender(a,' השתמש',' השתמשה')+' בכוח של '+k.name+'.';},650);
  return true;}
// ------------------------------------------------------------------ the Wonder of the Day: a home tile, no timer, nothing lost by skipping a day
function renderWonderStrip(){const el=$('home-wonder');if(!el)return;const on=!!rules.wonderOfDay&&(profile.played||0)>=3;el.hidden=!on;if(!on)return;
  const W=rules.wonderOfDay(profile,players.active);if(W.changed)persist();const w=rules.wonderById?.(W.id)||wonderList().find(x=>x.id===W.id);
  $('home-wonder-pic').innerHTML=w?`<span class="wonder-pic${W.fresh?' unseen':''}" style="--w:${w.color||'#ffd23a'}">${stickerArt(w)}${W.fresh?'<b class="wonder-q" aria-hidden="true">?</b>':''}</span>`:icon('sparkle');
  el.setAttribute('aria-label','הפלא של היום'+(w&&!W.fresh?': '+w.name:''));el.classList.toggle('fresh',!!W.fresh);$('home-wonder-sub').textContent=W.fresh?'פלא חדש!':w?.name||'';}
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
    if(screen==='battle'&&match?.status==='finished'&&!document.querySelector('dialog[open]')){if(typeof R.back==='function')R.back();else goOrigin();}else if(screen==='lobby')renderHome();});
  $('result-dialog').addEventListener('pointerdown',()=>{if($('result-dialog').open&&stage.run&&!stage.run.actionsShown)finishBeats();});
  $('result-dialog').addEventListener('keydown',e=>{const R=stage.run;if(!R)return;if(!R.actionsShown){if(e.code!=='Escape')finishBeats();return;}
    if((e.code==='Enter'||e.code==='NumpadEnter')&&!e.repeat&&document.activeElement===$('result-dialog')&&$('result-primary')._arm?.awake){e.preventDefault();$('result-primary').click();}});
  $('result-dialog').addEventListener('close',()=>{stageStop();clearTimeout(resultWait);disarm();});
  $('campfire-back').onclick=()=>{sound.click();showView('lobby');};
  $('lab-save').onclick=()=>saveLabPage();$('hatbox-chest').onclick=tapHatbox;$('hatbox-done').onclick=()=>{sound.click();$('hatbox-dialog').close();};
  $('home-wonder').onclick=()=>{sound.click();startBattle('wonder');};
  // The comeback cards closed without a pick: the next round starts without a card.
  $('ccard-dialog').addEventListener('close',()=>{const C=ccard;if(!C)return;ccard=null;C.onDone?.();});
  // A mix card closed with Esc over a finished battle carries on the way its button would have.
  // (A close that arrives after the window was opened again for the next card is the old window's, and is let go.)
  $('reveal-dialog').addEventListener('close',()=>{const M=mixReveal;if(!M||$('reveal-dialog').open)return;mixReveal=null;$('reveal-dialog').classList.remove('mix');$('reveal-secondary').textContent='לאלבום הקלפים';if(screen==='battle'&&match?.status==='finished'&&!document.querySelector('dialog[open]')){if(typeof M.back==='function')M.back();else goOrigin();}});
}
// Read-only test hooks for the screens around the battles.
window.__LEAGUE_META__=Object.freeze({session:()=>readSession(),queued:()=>typeof nextPreview==='function'?nextPreview():null,ritual:id=>openRitual(id||profile.selected),
  // Wave 2: the Lab's state, Ron's hat box, the comeback cards, a mix card and the Wonder of the Day (the openers only on a verify save).
  lab:()=>({open:screen==='lab',drafts:labDrafts?JSON.parse(JSON.stringify(labDrafts)):null,saved:rules.labExport?.(profile)||{},file:labFileName()}),welcome:()=>storagePrefix?openWelcomeBox():!!hatbox,
  ccards:(loser=1)=>storagePrefix?openComebackCards(loser,{onDone:()=>{}}):false,mix:list=>storagePrefix?openMixReveal(list||[{id:profile.selected,kind:'havzuk',name:rules.mixName?.(profile.selected,'havzuk')||'שילוב חדש'}],{first:true}):false,
  wonderDay:()=>rules.wonderOfDay?{...rules.wonderOfDay(profile,players.active),played:profile.wonderDay?.played||0}:null,fresh:()=>sessionFresh()});
// ------------------------------------------------------------------ friend battles across two phones
// The host runs the battle and sends a picture of it twenty times a second; the guest draws it and sends its moves.
// Only a name, a creature and its look travel between the phones.
let online=null,onlineTimer=null;
const myName=()=>playerName(activePlayer());
const onlineSend=msg=>online?.link?.send(msg);
function onlineSay(text){$('online-status').textContent=text;}
// The hello carries the creature's look: its skin, its hats and its Lab design (only the picture and the mechanic, never the name typed for it).
function onlineHello(){const id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',lab=sim.labOf?.(profile,id),hats=sim.hatsOf?.(profile,id);onlineSend({type:'hello',v:PROTOCOL,name:myName(),creature:id,skin:skinOf(profile,id),hats:hats&&(hats.head||hats.face)?hats:null,lab:lab?{option:lab.option,mech:lab.mech}:null});}
// What arrives from the other phone is checked: only known hats in their own slot, only a design this creature can have.
const netHats=h=>{if(!h||typeof h!=='object')return null;const ok=(x,slot)=>typeof x==='string'&&sim.hatById?.(x)?.slot===slot?x:null,head=ok(h.head,'head'),face=ok(h.face,'face');return head||face?{head,face}:null;};
const netLab=(id,d)=>d&&typeof d==='object'&&sim.FORM_OPTIONS?.[id]?.includes(d.option)&&sim.LAB_MECHS?.[id]?.includes(d.mech)?{option:d.option,mech:d.mech}:null;
function onlineReset(text=''){if(online?.link)try{online.link.close();}catch{}online=null;clearInterval(onlineTimer);onlineTimer=null;if(text)notify(text);if(screen==='online')renderOnline();}
function onlineHandlers(){return {
  onOpen:()=>{if(!online)return;online.connected=true;online.heard=performance.now();onlineHello();renderOnline();sound.reveal?.(false);},
  onMessage:data=>{if(!online||!data||typeof data!=='object')return;online.heard=performance.now();onlineMessage(data);},
  onClose:()=>{if(!online)return;if(!online.connected){onlineHandlers().onError('no-line');return;}const name=online.friend?.name||'החבר';if(screen==='battle'&&match?.online){match=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('online');}onlineReset(name+' יצא מהחדר.');},
  onError:kind=>{if(!online)return;onlineReset(kind==='no-room'?'לא מצאנו חדר עם הקוד הזה. בודקים את התמונות ומנסים שוב.':kind==='network'?'אין חיבור לאינטרנט כרגע. אפשר לשחק על מסך אחד.':kind==='no-line'?'הטלפונים לא הצליחו לדבר. כדאי ששניהם יתחברו ל-Wi-Fi ולנסות שוב.':'החיבור לא הצליח. אפשר לנסות שוב, או לשחק על מסך אחד.');},
};}
function onlineMessage(msg){
  if(msg.type==='hello'){if(msg.v!==PROTOCOL){onlineReset('לחבר יש גרסה אחרת של המשחק. מרעננים את הדף בשני הטלפונים.');return;}
    {const creature=CREATURES[msg.creature]?msg.creature:'maimi';online.friend={name:String(msg.name||'חבר').replace(/[<>]/g,'').slice(0,12),creature,skin:SKINS.some(k=>k.id===msg.skin)?msg.skin:'base',hats:netHats(msg.hats),lab:netLab(creature,msg.lab)};}if(screen==='online')renderOnline();return;}
  // The friend's comeback card after a round it lost: kept for the host's next start.
  if(msg.type==='card'&&online.role==='host'){if(online.cardFor===1&&(sim.COMEBACK_CARDS||[]).includes(msg.id))online.card={side:1,id:msg.id};return;}
  // A start reaches only a child who is still in the room (or on its last battle): one who left says goodbye instead of being pulled into a battle.
  if(msg.type==='start'&&online.role==='guest'&&screen!=='online'&&!(screen==='battle'&&match?.online)){onlineSend({type:'bye'});onlineReset();return;}
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
  $('online').classList.toggle('linked',!!o?.connected);$('online-start').hidden=!!o;$('online-room').hidden=!(o?.role==='host'&&!o.connected);$('online-pad').hidden=!(o?.role==='guest'&&!o.code);
  if(!o)onlineSay('כל אחד בטלפון שלו, גם מבית אחר. פותחים חדר, או מצטרפים לחדר של חבר.');
  else if(o.role==='host'&&!o.connected)onlineSay(o.link?'מחכים… שולחים קישור, או מקישים בטלפון השני את שלוש התמונות.':'פותחים חדר…');
  else if(o.role==='guest'&&!o.code)onlineSay('מקישים את שלוש התמונות מהטלפון של החבר. טעות? נוגעים בתמונה.');
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
    livePortrait('of-me',me,{skin:skinOf(profile,me),hats:hatsFor(me)});if(f)livePortrait('of-friend',f.creature,{skin:f.skin,hats:f.hats||null});}
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
  const f=o.friend,lab=sim.labOf?.(profile,me),hats=sim.hatsOf?.(profile,me);o.round=(o.round||0)+1;
  // Both phones build the same battle: the hats and designs of both sides, the comeback card of the round's loser, and whether the
  // announcer counts 3-2-1 (only the room's first battle of a session).
  const cfg={type:'start',seed:Date.now()%2147483647,mode:o.mode||null,arena:({lava:'fire',wind:'wind',ball:'sea'})[o.mode]||VS_ARENAS[Math.floor(Math.random()*VS_ARENAS.length)],ids:[me,f.creature],names:[myName(),f.name],skins:[skinOf(profile,me),f.skin],wins:o.wins,wonderOpts:sim.wonderOptions?.(profile)||null,
    hats:[hats&&(hats.head||hats.face)?{[me]:hats}:null,f.hats?{[f.creature]:f.hats}:null],labs:[lab?{[me]:{option:lab.option,mech:lab.mech}}:null,f.lab?{[f.creature]:f.lab}:null],ccard:o.card||null,round:o.round,
    count:o.round===1&&(typeof sessionFresh==='function'?sessionFresh():true)?3:0};
  o.card=null;o.cardFor=-1;onlineSend(cfg);startOnline(cfg);
}
function startOnline(cfg){
  if(!art||!online)return;const o=online;mode='online';cupFinal=false;o.finished=false;o.netPaused=false;o.remote={};o.inState={};o.supers=0;o.pending={ev:[],fx:[]};o.steps=0;o.sendClock=0;if(Array.isArray(cfg.wins))o.wins=[...cfg.wins];
  // Both phones grow the same Wonder from the same numbers: the host's choice travels in the start.
  const w=cfg.wonderOpts&&typeof cfg.wonderOpts==='object'?cfg.wonderOpts:{};
  match=makeMatch({player:cfg.ids[0],rival:cfg.ids[1],level:'champion',seed:cfg.seed,mode:cfg.mode,arena:cfg.arena,versus:true,wonder:!!w.wonder,wonderPrefer:Array.isArray(w.wonderPrefer)?w.wonderPrefer:[],wonderAvoid:w.wonderAvoid??null,
    hats:Array.isArray(cfg.hats)?cfg.hats:null,labs:Array.isArray(cfg.labs)?cfg.labs:null,ccard:cfg.ccard||null,comeback:true});match.online=true;match.names=cfg.names;callsStart(match,{rematch:cfg.count!==3});startCount(match,cfg.count===3);
  let skins=[...cfg.skins];if(cfg.ids[0]===cfg.ids[1]&&skins[0]===skins[1])skins[1]=skins[0]==='night'?'ice':'night';
  renderer.setMatch(match,skins,{local:localSide()});clearInput();accumulator=0;sound.versus=true;sound.online=true;resetBattleFx();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');sound.unlock();sound.setScene('battle',{track:musicFor(match)});sound.resume();sound.setLocalSide?.(localSide());sound.setMusicRate?.(1);
  // The top HUD follows this phone's child: its own creature in the 'me' slot, the friend's in the other.
  const L=localSide(),me=match.actors[L],friend=match.actors[1-L];
  $('player-name').textContent=me.spec.name;document.querySelector('.player-info .fighter-lines span').textContent=cfg.names[L];$('rival-name').textContent=friend.spec.name;$('rival-level').textContent=cfg.names[1-L];
  $('player-symbol').innerHTML=icon(me.spec.specialIcon);$('rival-symbol').innerHTML=icon(friend.spec.specialIcon);
  $('match-label').textContent='חבר משני טלפונים';$('round-label').textContent=cfg.names[0]+' '+o.wins[0]+' : '+o.wins[1]+' '+cfg.names[1];
  $('special-action-icon').innerHTML=icon(me.spec.specialIcon);$('special-action-name').textContent=me.spec.special;$('special-button').style.setProperty('--c',me.spec.color);
  // Which side is whose: the teal ring under this phone's creature (it breathes at the start), never words.
  $('match-toast').classList.remove('visible');toastUntil=0;$('mode-banner').hidden=!match.mode;
  tutorial=null;$('tutorial').hidden=true;tutThumb(null);document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  renderHUD();if(match.mode)flash($('mode-banner'),'pop',900);$('arena').focus({preventScroll:true});
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
  // The child who lost this round picks a comeback card for the next one; the last one taken is dealt only if three are needed.
  const deal=w>=0&&!won&&typeof onlineCard==='function'?rules.dealComebackCards?.(Math.random,onlineLastCard?[onlineLastCard]:[])||[]:[];
  const wonderChip=wl?`<div class="result-chips-plain"><div class="rchip wonder${wonder.first?' first':''}" style="--w:${wl.color||'#ffd23a'}" title="${esc(wl.name)}"><span class="wonder-fly">${stickerArt(wl)}</span><span class="rchip-book">${icon('book')}</span><b dir="ltr">${wonder.first?'+1':'×'+wonder.count}</b></div></div>`:'';
  $('result-content').innerHTML=`${won?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${won?'gold':w<0?'':'loss'}">${icon(won?'trophy':w<0?'shield':'star')}</div><span class="result-kicker">חבר משני טלפונים</span><h2 class="result-title"></h2><div class="result-score versus-score" dir="ltr"><div><strong>${o?.wins[0]??0}</strong><span></span></div><span>:</span><div><strong>${o?.wins[1]??0}</strong><span></span></div></div>${wonderChip}${deal.length?`<div class="online-ccards"><span class="micro-label">קלף עזרה לסיבוב הבא</span><div class="ccard-row" id="online-ccards">${ccardButtons(deal)}</div></div>`:''}<p class="result-tip">קיבלתם ${sparks===1?'ניצוץ':sparks+' ניצוצות'} לתיבת הכוכב${!won&&w>=0?', גם על הפסד':''}.</p>`;
  document.querySelector('#result-content .result-title').textContent=w<0?'תיקו!':'ניצחון ל'+names[w]+'!';
  document.querySelectorAll('#result-content .versus-score div span').forEach((el,i)=>{el.textContent=names[i];});
  const host=o?.role==='host';
  // The friend on the other phone is waiting, so here the big button stays "one more" and the host decides when to stop.
  // The host's big button sleeps while the friend still picks a card (never longer than twelve seconds).
  const t0=performance.now(),wait=host?()=>typeof onlineCardReady!=='function'||onlineCardReady()||performance.now()-t0>12000:null;
  plainResult({voice:won?'voice-victory':w>=0?'voice-announcer-almost':null,primary:{label:host?'עוד קרב!':'חזרה לחדר',battle:host,wait,go:()=>{if(host&&online?.connected)hostStartOnline();else{match=null;showView('online');}}},
    secondary:{label:host?'חזרה לחדר':'יוצאים מהחדר',go:()=>{match=null;if(host)showView('online');else{onlineSend({type:'bye'});onlineReset();showView('versus');}}}});
  const row=$('online-ccards');row?.querySelectorAll('[data-ccard]').forEach(b=>armCard(b,()=>{const i=+b.dataset.ccard,id=deal[i];if(row.dataset.picked||!id||!onlineCard({side:meSide,id}))return;row.dataset.picked=id;onlineLastCard=id;turnCard(row,i);}));
}
// ------------------------------------------------------------------ goals of the day
function refreshTodayGoals(){if(refreshDaily(profile,dayKey(),{seed:players.active,friends:players.players.length>1,storyLeft:!!currentStep(profile)}))persist();}
function goalText(g){const c=CREATURES[g.param];return {winElement:'נצחו קרב עם יצור '+g.param,winWith:'נצחו קרב עם '+(c?.name||''),wins:'נצחו '+g.need+' קרבות',league:'שחקו '+g.need+' קרבות ליגה',tower:'טפסו '+g.need+' קומות במגדל',supers:'השתמשו '+g.need+' פעמים בכוח־העל',story:'התקדמו שלב אחד במסע',replayStars:'שלושה כוכבים בקרב חוזר במפה',friend:'משחק עם חבר',form:'גדלו לצורת־עוצמה',newWonder:'גלו פלא חדש',copy:'תפסו כוכב העתקה',wonderDay:'שחקו בפלא של היום'}[g.type]||'';}
const ELEMENT_ICON={'מים':'wave','חשמל':'bolt','עוצמה':'mountain','אש':'flame','אור':'sun','רעד':'burrow','היפנוט':'spiral','טבע':'leaf','רוח':'swirl','אנרגיה':'sparkle','קול':'sound','מהירות':'bolt'};
function goalPicture(g,i){
  if(g.type==='winWith')return `<canvas id="goal-art-${i}" aria-hidden="true"></canvas>`;
  if(g.type==='form')return crownArt();
  if(g.type==='wonderDay'&&rules.wonderOfDay){const W=rules.wonderOfDay(profile,players.active),w=rules.wonderById?.(W.id);if(w)return `<span class="goal-sticker${W.fresh?' unseen':''}">${stickerArt(w)}</span>`;}
  const name=g.type==='winElement'?ELEMENT_ICON[g.param]||'star':{wins:'star',league:'trophy',tower:'tower',supers:'bolt',story:'arrow',replayStars:'star',friend:'duo',newWonder:'sparkle',copy:'mix',wonderDay:'sparkle'}[g.type]||'star';return icon(name);
}
function renderGoalsStrip(){const G=profile.daily.goals,done=G.filter(g=>g.done).length;$('home-goals-title').innerHTML='<span class="strip-long">משימות היום · </span><span class="goals-count" dir="ltr">'+done+'/'+G.length+'</span>';setBadge('goals',done<G.length);$('home-goals-dots').innerHTML=G.map(g=>`<i class="${g.done?'on':''}"></i>`).join('');$('home-goals').classList.toggle('ready',done<G.length);}
function renderGoals(){
  const G=profile.daily.goals,today=dayKey();
  $('goals-list').innerHTML=G.map((g,i)=>`<div class="goal${g.done?' done':''}"><div class="goal-pic" style="--c:${CREATURES[g.param]?.color||'#f2c14e'}">${goalPicture(g,i)}</div><div class="goal-copy"><b>${goalText(g)}</b><span class="level-bar"><i style="width:${Math.round(g.have/g.need*100)}%"></i></span><small>${g.done?'הושלם! +'+GOAL_SPARKS+' ניצוצות':g.have+' מתוך '+g.need+' · פרס: '+GOAL_SPARKS+' ניצוצות'}</small></div>${g.done?'<span class="goal-check">✓</span>':`<button class="button secondary" data-goal-go="${i}">יאללה</button>`}</div>`).join('');
  G.forEach((g,i)=>{if(g.type==='winWith')livePortrait('goal-art-'+i,g.param,{skin:skinOf(profile,g.param),hats:hatsFor(g.param)});});
  $('goals-bonus').textContent=profile.daily.bonusDay===today?'כל משימות היום הושלמו, והתיבה במתנה כבר אצלכם!':'עוד '+G.filter(g=>!g.done).length+' משימות לתיבה במתנה.';
  // Each goal knows where it is played.
  document.querySelectorAll('[data-goal-go]').forEach(el=>el.onclick=()=>{sound.click();const g=G[+el.dataset.goalGo];
    if(g.type==='winWith'){profile.selected=g.param;persist();}
    if(g.type==='winElement'){const id=Object.keys(CREATURES).find(k=>isUnlocked(profile,k)&&CREATURES[k].element===g.param);if(id){profile.selected=id;persist();}}
    // The Power Form signpost picks a creature whose form is open; the Wonder of the Day starts its battle.
    if(g.type==='form'&&!formOn(profile.selected)){const id=Object.keys(CREATURES).find(k=>isUnlocked(profile,k)&&formOn(k));if(id){profile.selected=id;persist();}}
    // A goal opens the screen where it is played (goalPlace), never a battle or a step it did not name.
    const to=goalPlace(g.type);if(to==='wonder')startBattle('wonder');else showView(to);});
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
    for(const f of ids)livePortrait('tchip-'+f,f,{skin:skinOf(profile,f),hats:hatsFor(f)});
    document.querySelectorAll('[data-tower-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.towerFighter;persist();sound.click();renderTower();});}
  $('tower-start').hidden=!!run?.pending;$('tower-start').innerHTML='לקרב! '+icon('play');$('tower-quit').hidden=!run;$('tower').classList.toggle('picking',!!run?.pending);shelfShow($('tower-fighters'));
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
  $('home-box-meter').innerHTML=sparkMeter(profile.box.sparks);setBadge('boxes',waiting);
}
function prizeHTML(p,i,choice){
  const button=choice?`<button class="button primary" data-choose="${String(i).replace(/^c/,'')}">את זה!</button>`:'';
  if(p.type==='look'){const c=CREATURES[p.creature],k=skinById(p.skin),worn=skinOf(profile,p.creature)===p.skin;
    return `<div class="prize${choice?' choice':''}" style="--c:${c.color}"><div class="prize-art"><canvas id="prize-${i}" aria-hidden="true"></canvas></div><small class="prize-kind">${k.box==='legendary'?'מראה אגדי':k.box==='rare'?'מראה נדיר':'מראה חדש'}</small><b>${c.name} · ${k.name}</b>${button||(worn?'<span class="prize-worn">לובש עכשיו ✓</span>':`<button class="button secondary" data-wear="${p.creature}:${p.skin}">ללבוש עכשיו</button>`)}</div>`;}
  if(p.type==='frame'){const f=FRAMES.find(x=>x.id===p.frame),id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',on=profile.frame===f.id;
    return `<div class="prize${choice?' choice':''}"><div class="prize-art"><article class="tcard frame-sample frame-${f.id}"><canvas id="prize-${i}" aria-hidden="true"></canvas></article></div><small class="prize-kind">${f.tier==='legendary'?'מסגרת אגדית':f.tier==='rare'?'מסגרת נדירה':'מסגרת חדשה'}</small><b>מסגרת ${f.name}</b>${button||(on?'<span class="prize-worn">על הקלפים ✓</span>':`<button class="button secondary" data-frame-on="${f.id}">לשים על הקלפים</button>`)}</div>`;}
  if(p.type==='hat'){const h=rules.hatById?.(p.hat),id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',w=rules.hatsOf?.(profile,id)||{},on=w.head===p.hat||w.face===p.hat,tier=h?.tier||'common';
    return `<div class="prize hat-prize tier-${tier}${choice?' choice':''}" style="--c:${CREATURES[id].color}"><div class="prize-art"><canvas id="prize-${i}" aria-hidden="true"></canvas><span class="prize-hat">${hatPic(p.hat)}</span></div><small class="prize-kind">${tier==='legendary'?'כובע אגדי!':tier==='rare'?'כובע נדיר!':'כובע חדש!'}</small><b>${esc(h?.name||'')}</b>${button||(on?`<span class="prize-worn">על ${CREATURES[id].name} ✓</span>`:`<button class="button secondary" data-hat-on="${p.hat}">ללבוש עכשיו</button>`)}</div>`;}
  const c=CREATURES[p.id];
  return `<div class="prize${choice?' choice':''}" style="--c:${c.color}"><div class="prize-art"><canvas id="prize-${i}" aria-hidden="true"></canvas></div><small class="prize-kind">יצור חדש!</small><b>${c.name}</b>${button}</div>`;
}
function prizePortrait(p,i){const id=p.type==='look'?p.creature:p.type==='frame'||p.type==='hat'?(isUnlocked(profile,profile.selected)?profile.selected:'maimi'):p.id;
  // A hat prize shows the chosen creature already wearing it (in its own slot).
  const hats=p.type==='hat'?{...(rules.hatsOf?.(profile,id)||{}),[rules.hatById?.(p.hat)?.slot||'head']:p.hat}:hatsFor(id);livePortrait('prize-'+i,id,{skin:p.type==='look'?p.skin:skinOf(profile,id),hats});}
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
    document.querySelectorAll('[data-hat-on]').forEach(el=>el.onclick=()=>{const id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',h=el.dataset.hatOn,w=rules.hatsOf?.(profile,id)||{};if(w.head!==h&&w.face!==h&&rules.wearHat?.(profile,id,h)){persist();hatSound(profile,id,h);renderBoxes();}});
  }
  // After a box: the next box, or 'ממשיכים' Home. A waiting chest is its own button; nothing here starts a battle.
  const more=boxesWaiting(profile)>0&&!pending&&!!result,done=!pending&&(!!result||!waiting);
  $('box-actions').innerHTML=(more?`<button class="button primary" id="box-next">לתיבה הבאה!${boxesWaiting(profile)>1?` <small>עוד ${boxesWaiting(profile)}</small>`:''}</button>`:'')+(done?`<button class="button ${more?'secondary':'primary'}" id="box-play">ממשיכים</button>`:'');
  $('box-next')?.addEventListener('click',()=>{sound.click();boxUI={taps:0,result:null,chosen:null};renderBoxes();});
  $('box-play')?.addEventListener('click',()=>{boxUI={taps:0,result:null,chosen:null};goHome();});
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
  const owned=FRAMES.filter(f=>profile.frames.includes(f.id));$('frame-picker').hidden=!owned.length;$('frame-open').hidden=!owned.length||!PHONE.matches;if(!owned.length){framesOpen(false);return;}
  $('frame-options').innerHTML=[{id:null,name:'רגילה'},...owned].map(f=>`<button class="frame-option${f.id?' frame-'+f.id:''}${profile.frame===f.id?' chosen':''}" data-frame="${f.id||''}" aria-pressed="${profile.frame===f.id}"><span></span>${f.name}</button>`).join('');
  document.querySelectorAll('[data-frame]').forEach(el=>el.onclick=()=>{profile.frame=el.dataset.frame||null;persist();sound.click();renderAlbum({frames:true});});
  $('frame-open').onclick=()=>{sound.click();framesOpen(!$('cards').classList.contains('frames-open'));};
  if(!framesBound){framesBound=true;$('cards').addEventListener('click',e=>{if($('cards').classList.contains('frames-open')&&!e.target.closest('#frame-picker,#frame-open'))framesOpen(false);},true);}
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
  match=null;wildTarget=null;storyEvent=null;versus.players=[id,null];refreshTodayGoals();updateHeader();showView('lobby');cloudSoon(true);
}
function renderPlayers(){
  const form=!$('player-form').hidden;$('players-grid').hidden=form;
  $('players-grid').innerHTML=players.players.map(p=>{const pp=profileOf(p.id),done=pp.story.done>=STEPS.length;
    return `<div class="player-card${p.id===players.active?' active':''}"><button class="player-pick" data-player="${p.id}"><canvas id="player-face-${p.id}" aria-hidden="true"></canvas><b></b><small>${done?journeyEnd():pp.story.done?'במסע: '+(stepLabel(STEPS[pp.story.done])||''):'עוד לא התחיל'}</small></button><button class="player-edit" data-player-edit="${p.id}" aria-label="עריכה">✎</button></div>`;}).join('')+
    (players.players.length<MAX_PLAYERS?`<button class="player-card player-new" id="player-new"><span class="player-plus">+</span><b>שחקן חדש</b><small>מתחילים מסע משלך</small></button>`:'');
  players.players.forEach(p=>{const card=document.querySelector(`[data-player="${p.id}"]`);card.querySelector('b').textContent=playerName(p);card.setAttribute('aria-label','משחקים בתור '+playerName(p));livePortrait('player-face-'+p.id,faceOf(p),{skin:skinOf(profileOf(p.id),faceOf(p))});});
  document.querySelectorAll('[data-player]').forEach(el=>el.onclick=()=>{sound.click();switchPlayer(el.dataset.player);});
  document.querySelectorAll('[data-player-edit]').forEach(el=>el.onclick=()=>{sound.click();openPlayerForm(el.dataset.playerEdit);});
  if($('player-new'))$('player-new').onclick=()=>{sound.click();openPlayerForm();};renderCloudRow();
}
let editingPlayer=null,formFace='maimi';
function openPlayerForm(id=null){
  editingPlayer=id;const p=id?findPlayer(id):null;formFace=p?faceOf(p):STARTERS[Math.floor(Math.random()*STARTERS.length)];
  $('player-form').hidden=false;$('players-grid').hidden=true;$('player-form-title').textContent=p?'עריכת שחקן':'שחקן חדש';barTitle(p?'עריכת שחקן':'שחקן חדש');$('player-name-input').value=p?.name||'';$('player-save').textContent=p?'שומרים':'יוצאים לדרך!';
  drawFaces();setTimeout(()=>$('player-name-input').focus({preventScroll:true}),60);
}
function drawFaces(){
  $('player-faces').innerHTML=FACES.map(id=>`<button type="button" class="fighter-chip${id===formFace?' chosen':''}" data-face="${id}" aria-pressed="${id===formFace}" style="--c:${CREATURES[id].color}"><canvas id="face-${id}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b></button>`).join('');
  for(const id of FACES)livePortrait('face-'+id,id);
  document.querySelectorAll('[data-face]').forEach(el=>el.onclick=()=>{formFace=el.dataset.face;sound.click();drawFaces();});
}
function closePlayerForm(){$('player-form').hidden=true;editingPlayer=null;barTitle($('players').dataset.phoneTitle);renderPlayers();}
function savePlayerForm(e){
  e.preventDefault();const name=$('player-name-input').value.replace(/[<>]/g,'').trim().slice(0,12);if(!name){$('player-name-input').focus();wiggle($('player-name-input'));return;}
  if(editingPlayer){const p=findPlayer(editingPlayer);p.name=name;p.face=formFace;savePlayers();updateHeader();closePlayerForm();return;}
  const id='p'+(Math.max(...players.players.map(p=>+p.id.slice(1)))+1);players.players.push({id,name,face:formFace});savePlayers();$('player-form').hidden=true;
  switchPlayer(id);if(STARTERS.includes(formFace)){profile.selected=formFace;persist();renderHome();}
}
// ------------------------------------------------------------------ online users: a child's progress kept online, after a parent's consent
// Only with a project the page may use (cloud.cloudFor; api is null otherwise: the row, the marks and the window stay hidden, nothing asks the network).
// Each local player may be linked to one online user; the link (its id, refresh token and nickname) sits in that player's own save area, the
// pictures never. The local save stays what the game reads: a changed one goes up after each result, when the app goes to the background and
// every 3 minutes. A newer online copy comes down only on Home or Who plays, never in a battle or its result. Words: cloud.CLOUD_WORDS.
const freshSave=p=>!p.played&&!p.story?.done&&!Object.keys(p.creatures||{}).length&&!(p.unlocked||[]).length;
const linkOf=id=>api?cloud.readLink(playerStorage(id)):null,setLink=(id,l)=>cloud.writeLink(playerStorage(id),l);
const saveOf=id=>id===players.active?JSON.stringify(profile):playerStorage(id).getItem(sim.STORAGE_KEY);
const cloudSoon=(check=false,ms)=>{if(!api)return;cloudCheck||=check;cloudSync.soon(ms);};
// One round for every linked player on this phone; only the one playing looks online for a newer copy (check), the others only send theirs.
async function cloudRound(){
  // A battle being played is left alone: its result asks for the next round.
  if(!api||screen==='battle'&&match&&match.status!=='finished')return true;if(navigator.onLine===false){cloudOff='offline';cloudMarks();return false;}const check=cloudCheck;cloudCheck=false;let ok=true,off=false;
  for(const p of [...players.players]){const L=linkOf(p.id),save=L&&saveOf(p.id);if(!L||L.out||L.deleting||save==null)continue;const st=playerStorage(p.id);
    try{if(await cloud.syncOne(api,{link:L,save,face:faceOf(p),changedAt:L.changedAt,fresh:freshSave(profileOf(p.id)),check:check&&p.id===players.active,
      store:l=>setLink(p.id,l),backup:s=>cloud.keepBackup(st,L.uid,s),take:s=>cloudTake(p.id,s)},passes)==='later'){ok=false;cloudCheck=true;}}
    catch(e){const k=cloud.kindOf(e);if(k!=='out')ok=false;if(k==='offline'||k==='away')off=k;}}
  cloudOff=off;cloudMarks();if(screen==='players'&&!$('cloud-dialog').open)renderCloudRow();return ok;
}
// The online copy taken into a player: another player's save at once; the one playing only on Home or Who plays, with nothing open over it.
function cloudTake(id,save){
  try{if(id!==players.active){playerStorage(id).setItem(sim.STORAGE_KEY,save);return true;}
    if(!['lobby','players'].includes(screen)||document.querySelector('dialog[open]')||!$('player-form').hidden)return false;storage.setItem(sim.STORAGE_KEY,save);}catch{return false;}
  profile=readProfile(storage);sound.setEnabled(profile.sound);refreshTodayGoals();updateHeader();showView(screen);return true;
}
// Every save of the player playing marks the link as changed now; the next round sends it.
function cloudTouch(){const L=linkOf(players.active);if(!L)return;L.changedAt=Date.now();setLink(players.active,L);}
// The mark beside the player's face: kept online (ok), a change still going up (up), no connection or sign in again (off). Icon only,
// and never in a battle (phone-cloud.css hides it there).
function cloudMarkOf(id){const L=linkOf(id);if(!L)return null;if(L.out||L.deleting||cloudOff)return 'off';return !L.pending&&cloud.saveHash(saveOf(id))===L.sent?'ok':'up';}
const CLOUD_MARK={ok:'נשמר גם באינטרנט',up:'מחכה לשמירה באינטרנט',off:'אין חיבור לאינטרנט'};
function cloudMarks(){
  if(!api)return;const m=cloudMarkOf(players.active);
  for(const id of ['home-cloud','chip-cloud']){const el=$(id);if(!el)continue;el.hidden=!m;if(m){el.dataset.cloud=m;el.querySelector('use').setAttribute('href','#i-cloud-'+m);}}
  if(m)$('home-player').setAttribute('aria-label','מי משחק? '+playerName(activePlayer())+' · '+CLOUD_MARK[m]);
}
// Who plays: a small cloud on every linked player, and under them the online user of the one playing, or the way to make one.
function renderCloudRow(){
  const row=$('cloud-row');row.hidden=!api;$('players').classList.toggle('with-cloud',!!api);if(!api)return;const p=activePlayer(),L=linkOf(p.id),m=cloudMarkOf(p.id);
  document.querySelector('#players .players-heading p').textContent='לכל שחקן מסע, יצורים וקלפים משלו. הכל נשמר במכשיר, ועם משתמש מקוון גם באינטרנט.';
  $('cloud-row-mark').innerHTML=icon(L?'cloud-'+m:'cloud');row.dataset.cloud=L?m:'none';$('cloud-row-title').textContent=L?L.name+' · משתמש מקוון':'משתמש מקוון';
  $('cloud-row-sub').textContent=!L?'שומרים גם באינטרנט ונכנסים מכל טלפון.':L.deleting?'המחיקה לא הסתיימה. ״להורים״ ← ״מחיקת המשתמש״.':L.out?cloud.CLOUD_WORDS.out:m==='off'?cloud.CLOUD_WORDS[cloudOff==='away'?'away':'offline']:m==='up'?'השמירה באינטרנט מחכה לרגע הבא.':'נשמר גם באינטרנט.';
  $('cloud-create').hidden=!!L;$('cloud-parent').hidden=!L;$('cloud-signin').textContent=L?.out?'כניסה מחדש':'כבר יש לי משתמש';
  $('cloud-create').onclick=()=>{sound.click();cloudOpen('gate',{for:'create'});};$('cloud-parent').onclick=()=>{sound.click();cloudOpen('gate',{for:'rights'});};
  $('cloud-signin').onclick=()=>{sound.click();cloudOpen('name',{for:'signin',name:L?.out?L.name:''});};
  for(const pl of players.players){const card=document.querySelector(`[data-player="${pl.id}"]`)?.parentElement;if(card&&linkOf(pl.id)&&!card.querySelector('.cloud-tag'))card.insertAdjacentHTML('beforeend',`<span class="cloud-tag" title="משתמש מקוון" aria-hidden="true">${icon('cloud')}</span>`);}
}
// ---- the window, a page at a time: the parent's check, the nickname, the pictures, waiting, done or what went wrong, and the rights.
// C is the window's state while it is open: the page, what it is for, the nickname, the pictures tapped (in memory only, gone when it closes).
const CLOUD_EXPLAIN='<p><b>מה נשמר באינטרנט:</b> כינוי (לא שם מלא), הפרצוף שנבחר מהיצורים, ההתקדמות במשחק וזמן ההסכמה הזו.</p><p><b>מה לא:</b> מייל, טלפון, כתובת, גיל, תמונות, קול או מיקום. בלי פרסומות, בלי מעקב ובלי שיתוף עם אף אחד.</p>'+
  '<p><b>למה ואיפה:</b> כדי שההתקדמות תחזור בכל טלפון. אצל Google Firebase, באירופה.</p><p><b>תמיד אפשר</b> לראות את המידע, להחליף את התמונות ולמחוק את המשתמש: ״מי משחק?״ ← ״להורים״.</p>';
const CLOUD_AGREE='אני הורה/אפוטרופוס של הילד/ה ומסכים/ה ליצירת המשתמש ולשמירת המידע כמתואר';
function cloudOpen(page,opts={}){if(!api)return;C={...opts,page,picks:[],typed:'',msg:''};cloudPage();const d=$('cloud-dialog');if(!d.open)d.showModal();}
const cloudClose=()=>$('cloud-dialog').close(),cloudGo=(page,more={})=>{Object.assign(C,{page,msg:'',...more});cloudPage();};
const cloudBusy=text=>cloudGo('busy',{text}),cloudDone=(title,html,mark='cloud-ok')=>cloudGo('done',{title,html,mark});
const picHTML=picks=>picks.map(i=>{const p=cloud.PICTURES[i];return `<span class="cloud-shown" style="--pc:${p.color}" title="${p.name}">${icon(p.icon)}</span>`;}).join('');
function cloudPage(){
  const P=C.page,primary=(text,cls='')=>`<button type="button" class="button primary${cls}" id="cloud-go">${text}</button>`,second=(text,id='cloud-back')=>`<button type="button" class="button secondary" id="${id}">${text}</button>`;
  const status=`<p class="cloud-status" id="cloud-status" role="status">${esc(C.msg||'')}</p>`,tap=(id,fn)=>{const el=$(id);if(el)el.onclick=()=>{sound.click();fn(el);};};
  const show=(title,head,body,foot)=>{$('cloud-dialog').dataset.page=P;$('cloud-title').textContent=title;$('cloud-head').innerHTML=head||'';$('cloud-body').innerHTML=body||'';$('cloud-foot').innerHTML=foot||'';$('cloud-foot').hidden=!foot;};
  const L=linkOf(players.active);
  if(P==='gate'){const create=C.for==='create';C.q??=cloud.adultQuestion();
    show('להורים',`<span class="cloud-q">כמה זה <b dir="ltr">${C.q.a} × ${C.q.b}</b>?</span><output class="cloud-answer" id="cloud-answer" dir="ltr"></output>`,
      `<div class="cloud-gate"><div class="cloud-explain ph-scroll"><a class="cloud-privacy" href="./privacy.html" target="_blank" rel="noopener">מדיניות הפרטיות</a>${create?CLOUD_EXPLAIN:'<p>כאן ההורים רואים את המידע שנשמר באינטרנט, מחליפים את סיסמת התמונות או מוחקים את המשתמש.</p>'}</div>`+
      `<div class="cloud-keys" role="group" aria-label="ספרות">${[1,2,3,4,5,6,7,8,9,0].map(n=>`<button type="button" class="cloud-key" data-key="${n}">${n}</button>`).join('')}<button type="button" class="cloud-key" data-key="x" aria-label="מחיקה">${icon('backspace')}</button></div></div>`,
      (create?`<label class="cloud-agree"><input type="checkbox" id="cloud-agree"${C.agree?' checked':''}><span>${CLOUD_AGREE}</span></label>`:status)+primary('ממשיכים'));
    const ready=()=>{$('cloud-answer').textContent=C.typed;$('cloud-go').disabled=!C.typed||create&&!C.agree;};ready();
    document.querySelectorAll('#cloud-body [data-key]').forEach(el=>el.onclick=()=>{sound.click();const k=el.dataset.key;C.typed=k==='x'?C.typed.slice(0,-1):(C.typed+k).slice(0,3);ready();});
    if(create)$('cloud-agree').onchange=e=>{C.agree=e.target.checked;ready();};
    // A wrong answer gets a new sum; a right one records the consent now (create) or opens the rights.
    tap('cloud-go',()=>{if(+C.typed!==C.q.answer){C.q=cloud.adultQuestion();C.typed='';cloudPage();wiggle($('cloud-head'));return;}C.q=null;if(create){C.consent=cloud.consentRecord();cloudGo('name');}else cloudGo('rights');});return;}
  if(P==='name'){const create=C.for==='create';
    show(create?'יצירת משתמש':'כניסה למשתמש','',`<form class="cloud-name" id="cloud-name-form" autocomplete="off"><input id="cloud-name" maxlength="12" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="כינוי" aria-label="כינוי" value="${esc(C.name||'')}"><button class="button primary" id="cloud-name-go">ממשיכים</button></form><p class="cloud-hint">כינוי — לא שם מלא. 2 עד 12 אותיות או ספרות, בלי טלפון ובלי מייל.</p>${status}`,'');
    $('cloud-name-form').onsubmit=e=>{e.preventDefault();const n=$('cloud-name').value,why=cloud.nameProblem(n);if(why){C.msg=cloud.NAME_WORDS[why];$('cloud-status').textContent=C.msg;wiggle($('cloud-name'));return;}
      sound.click();C.name=cloud.showName(n);if(create&&C.first)return cloudCreate();cloudGo('pics',{round:create?'new':'signin',picks:[]});};
    setTimeout(()=>$('cloud-name')?.focus({preventScroll:true}),60);return;}
  if(P==='pics'){const R=C.round,n=C.picks.length;
    show({new:'בוחרים 4 תמונות',again:'עוד פעם, אותן תמונות',signin:'התמונות של '+C.name,old:'התמונות של היום',fresh:'4 תמונות חדשות',fresh2:'עוד פעם, החדשות',del:'התמונות של '+C.name}[R],
      `<span class="cloud-slots" role="img" aria-label="${n} מתוך 4">${[0,1,2,3].map(i=>{const p=cloud.PICTURES[C.picks[i]];return p?`<span class="cloud-slot on${i===n-1?' last':''}" style="--pc:${p.color}">${icon(p.icon)}</span>`:'<span class="cloud-slot"></span>';}).join('')}</span>`,
      `<div class="cloud-pad" role="group" aria-label="תמונות">${cloud.PICTURES.map((p,i)=>`<button type="button" class="cloud-pic" data-pic="${i}" style="--pc:${p.color}" aria-label="${p.name}">${icon(p.icon)}</button>`).join('')}</div>`,
      status+`<button type="button" class="button secondary cloud-small" id="pic-undo" aria-label="מחיקת התמונה האחרונה"${n?'':' disabled'}>${icon('undo')}</button><button type="button" class="button secondary cloud-small" id="pic-again"${n?'':' disabled'}>מההתחלה</button>`+
      primary({new:'ממשיכים',again:'יוצרים משתמש',signin:'נכנסים',old:'ממשיכים',fresh:'ממשיכים',fresh2:'מחליפים',del:'מוחקים'}[R]));
    $('cloud-go').disabled=n<cloud.PICS;
    document.querySelectorAll('#cloud-body [data-pic]').forEach(el=>el.onclick=()=>{if(C.picks.length>=cloud.PICS){wiggle($('cloud-head'));return;}sound.click();C.picks.push(+el.dataset.pic);C.msg='';cloudPage();});
    tap('pic-undo',()=>{C.picks.pop();cloudPage();});tap('pic-again',()=>{C.picks=[];cloudPage();});tap('cloud-go',cloudPicked);return;}
  if(P==='busy'){show($('cloud-title').textContent,'',`<div class="cloud-busy" role="status"><span class="cloud-spin" aria-hidden="true"></span><b>${esc(C.text)}</b></div>`,'');return;}
  if(P==='done'){show(C.title,'',`<div class="cloud-done">${icon(C.mark)}<div>${C.html}</div></div>`,primary('ממשיכים'));tap('cloud-go',cloudClose);return;}
  if(P==='fail'){const again=typeof C.retry==='function';show($('cloud-title').textContent||'משתמש מקוון','',`<div class="cloud-done fail">${icon(['offline','away'].includes(C.kind)?'cloud-off':'cloud')}<div><p>${esc(cloud.CLOUD_WORDS[C.kind]||cloud.CLOUD_WORDS.other)}</p></div></div>`,
      again?second('סגירה')+primary('מנסים שוב'):primary('סגירה'));tap('cloud-back',cloudClose);tap('cloud-go',()=>again?C.retry():cloudClose());return;}
  // The rights, behind the same check: see (and download) what is kept, new pictures, leave on this phone, delete for good.
  if(!L){cloudClose();return;}
  if(P==='rights'){show('להורים · '+L.name,'',`<div class="cloud-rights">${[['cloud-see','eye','הצגת המידע','מה נשמר, וגם להורדה'],['cloud-repics','key','שינוי סיסמת התמונות','קודם התמונות של היום'],['cloud-leave','out','יציאה בטלפון הזה','ההתקדמות נשארת'],['cloud-delete','trash','מחיקת המשתמש','מהאינטרנט, לתמיד']]
      .map(([id,ic,b,sm])=>`<button type="button" class="cloud-right${id==='cloud-delete'?' danger':''}" id="${id}">${icon(ic)}<b>${b}</b><small>${sm}</small></button>`).join('')}</div>${L.deleting?'<p class="cloud-hint">המחיקה הקודמת לא הסתיימה. לוחצים שוב על ״מחיקת המשתמש״.</p>':''}`,
      status+'<a class="text-button cloud-privacy" href="./privacy.html" target="_blank" rel="noopener">מדיניות הפרטיות</a>'+primary('סיימנו'));
    tap('cloud-see',cloudSee);tap('cloud-repics',()=>cloudGo('pics',{round:'old',name:L.name,picks:[],first:null}));tap('cloud-leave',()=>cloudGo('leave'));tap('cloud-delete',()=>cloudGo('delete1'));tap('cloud-go',cloudClose);return;}
  if(P==='data'){show('המידע שנשמר','',`<pre class="cloud-json" dir="ltr" tabindex="0">${esc(JSON.stringify(C.data,null,2))}</pre>`,second('חזרה')+primary(icon('download')+'הורדה'));
    tap('cloud-back',()=>cloudGo('rights'));tap('cloud-go',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(C.data,null,2)],{type:'application/json'}));a.download='creature-league-data.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);});return;}
  // Deleting asks twice.
  if(P==='delete1'||P==='delete2'){const first=P==='delete1';show(first?'מחיקת המשתמש':'בטוחים?','',`<div class="cloud-done warn">${icon('trash')}<div>${first?`<p>המשתמש <b>${esc(L.name)}</b> וכל מה שנשמר בו באינטרנט יימחקו.</p><p>ההתקדמות בטלפון הזה נשארת בו.</p>`:'<p>אי אפשר להחזיר משתמש שנמחק.</p>'}</div></div>`,
      second('ביטול')+primary(first?'מוחקים':'כן, מוחקים לתמיד',' danger'));tap('cloud-back',()=>cloudGo('rights'));tap('cloud-go',()=>first?cloudGo('delete2'):(C.tryPicks=null,cloudDelete()));return;}
  if(P==='leave'){show('יציאה בטלפון הזה','',`<div class="cloud-done">${icon('out')}<div><p>יוצאים מהמשתמש <b>${esc(L.name)}</b> בטלפון הזה.</p><p>ההתקדמות נשארת גם כאן וגם באינטרנט, ונכנסים שוב עם הכינוי והתמונות.</p></div></div>`,second('ביטול')+primary('יוצאים'));
    tap('cloud-back',()=>cloudGo('rights'));tap('cloud-go',cloudLeave);}
}
// Four pictures tapped: the first round of new ones asks for them again; the old ones come before the new; then the call itself.
function cloudPicked(){const R=C.round,picks=[...C.picks];C.picks=[];C.msg='';
  if(R==='new'||R==='fresh'){C.first=picks;C.round=R==='new'?'again':'fresh2';return cloudPage();}
  if(R==='again'||R==='fresh2'){if(picks.join()!==C.first.join()){C.first=null;C.round=R==='again'?'new':'fresh';C.msg='התמונות לא אותו דבר. בוחרים שוב מההתחלה.';return cloudPage();}return R==='again'?cloudCreate():cloudRepics();}
  if(R==='old'){C.old=picks;if(C.first)return cloudRepics();C.round='fresh';return cloudPage();}
  C.tryPicks=picks;return R==='del'?cloudDelete():cloudSignIn();
}
// What went wrong, where it can be fixed: the pictures again, another nickname, or a page that says it (and may try again).
function cloudFailed(e,retry,back){const k=cloud.kindOf(e);
  if(k==='wrong'&&back)return cloudGo('pics',{round:back,picks:[],msg:cloud.CLOUD_WORDS.wrong});if(k==='taken')return cloudGo('name',{msg:cloud.CLOUD_WORDS.taken});
  cloudGo('fail',{kind:k,retry:['offline','away','other'].includes(k)?retry:null});}
// Creating: the consent recorded at the check, the nickname, the pictures; the player playing is linked and its save goes up with it.
async function cloudCreate(){const p=activePlayer(),id=p.id,name=C.name,picks=C.first;if(linkOf(id))return cloudClose();cloudBusy('יוצרים את המשתמש…');
  try{const r=await cloud.createUser(api,{name,picks,face:faceOf(p),save:JSON.stringify(profile),consent:C.consent});passes.set(r.link.uid,r.session);setLink(id,r.link);if(!p.name){p.name=name;savePlayers();}updateHeader();
    cloudDone('המשתמש מוכן!',`<p>מעכשיו ההתקדמות של <b>${esc(name)}</b> נשמרת גם באינטרנט, ונכנסים אליה מכל טלפון עם הכינוי וארבע התמונות.</p><p class="cloud-hint">להורים: כדאי לזכור את הכינוי ואת סדר התמונות.</p><span class="cloud-pics">${picHTML(picks)}</span>`);}
  catch(e){cloudFailed(e,cloudCreate);}}
// Signing in: a player already linked to this user takes the newer copy (the other one waits in the backup); otherwise the online copy
// comes into a new player, or into the one playing when it was never played. Another child's save on this phone is never overwritten.
async function cloudSignIn(){const name=C.name,picks=C.tryPicks;cloudBusy('בודקים…');let r;
  try{r=await cloud.signInUser(api,{name,picks});}catch(e){return cloudFailed(e,cloudSignIn,'signin');}
  const {session:s,doc}=r,slot=cloud.chooseSlot({players:players.players,active:players.active,linked:Object.fromEntries(players.players.map(p=>[p.id,linkOf(p.id)?.uid])),fresh:freshSave(profile),uid:s.uid,max:MAX_PLAYERS});
  passes.set(s.uid,s);if(!slot)return cloudFailed(new cloud.CloudError('full'));const mine=slot.mine?findPlayer(slot.id):null;
  if(mine){const L=linkOf(mine.id),save=saveOf(mine.id),what=cloud.decide({save,changedAt:L.changedAt,fresh:freshSave(profileOf(mine.id))},doc,L);L.refreshToken=s.refreshToken;delete L.out;
    if(what==='down'){if(cloud.saveHash(save)!==L.sent)cloud.keepBackup(playerStorage(mine.id),L.uid,save);try{playerStorage(mine.id).setItem(sim.STORAGE_KEY,doc.save);}catch{}Object.assign(L,{seen:doc.updateTime,sent:cloud.saveHash(doc.save),changedAt:doc.updatedAt});}
    else if(what==='same')Object.assign(L,{seen:doc.updateTime,sent:cloud.saveHash(save)});setLink(mine.id,L);switchPlayer(mine.id);}
  else{const id=slot.id,act=findPlayer(id),face=FACES.includes(doc.face)?doc.face:null;
    if(slot.reuse){act.name||=doc.name;act.face||=face;}else players.players.push({id,name:doc.name,face});
    try{playerStorage(id).setItem(sim.STORAGE_KEY,doc.save);}catch{}setLink(id,{uid:s.uid,refreshToken:s.refreshToken,name:doc.name,seen:doc.updateTime,sent:cloud.saveHash(doc.save),changedAt:doc.updatedAt});savePlayers();switchPlayer(id);}
  cloudDone('ברוכים השבים, '+doc.name+'!',`<p>ההתקדמות של <b>${esc(doc.name)}</b> חזרה לטלפון הזה, ומעכשיו נשמרת ממנו גם באינטרנט.</p>`);}
async function cloudSee(){const id=players.active,L=linkOf(id);cloudBusy('אוספים את המידע…');
  try{C.data=await cloud.userData(api,{link:L,cache:passes});}catch(e){if(cloud.kindOf(e)==='out'){L.out=true;setLink(id,L);}return cloudFailed(e,cloudSee);}cloudGo('data');}
async function cloudRepics(){const id=players.active,L=linkOf(id),fresh=C.first;cloudBusy('מחליפים את התמונות…');
  try{const s=await cloud.changePictures(api,{name:L.name,oldPicks:C.old,newPicks:fresh});L.refreshToken=s.refreshToken;delete L.out;setLink(id,L);passes.set(L.uid,s);}catch(e){return cloudFailed(e,cloudRepics,'old');}
  cloudDone('התמונות הוחלפו',`<p>מעכשיו נכנסים ל־<b>${esc(L.name)}</b> עם התמונות החדשות. בטלפון אחר נכנסים שוב.</p><span class="cloud-pics">${picHTML(fresh)}</span>`,'key');}
// Deleting: the document, then the account (Firebase may first want the pictures); then the link goes, and the save stays on this phone.
async function cloudDelete(){const id=players.active,L=linkOf(id),picks=C.tryPicks||null;if(!L)return cloudClose();C.name=L.name;
  // Firebase lets an account go only soon after a sign-in: without one in the last minutes, the pictures come first (before anything is deleted).
  if(!picks&&!cloud.signedInLately(passes,L.uid))return cloudGo('pics',{round:'del',picks:[],msg:'כדי למחוק, בוחרים את התמונות של המשתמש.'});cloudBusy('מוחקים…');
  try{await cloud.deleteUser(api,{link:L,cache:passes,picks,gone:()=>{L.deleting=true;setLink(id,L);}});}
  catch(e){if(['old','out'].includes(cloud.kindOf(e))&&!picks)return cloudGo('pics',{round:'del',picks:[],msg:'כדי למחוק, בוחרים את התמונות של המשתמש.'});return cloudFailed(e,cloudDelete,'del');}
  setLink(id,null);try{playerStorage(id).removeItem(cloud.BACKUP_KEY);}catch{}passes.delete(L.uid);updateHeader();
  cloudDone('המשתמש נמחק',`<p>המשתמש <b>${esc(L.name)}</b> וכל מה שנשמר בו באינטרנט נמחקו.</p><p>ההתקדמות נשארת בטלפון הזה.</p>`,'trash');}
// Leaving on this phone: the last change goes up first when it can; the link goes, the save stays.
async function cloudLeave(){const id=players.active,L=linkOf(id);cloudBusy('שומרים לפני היציאה…');try{await cloudSync.now();}catch{}setLink(id,null);if(L)passes.delete(L.uid);updateHeader();
  cloudDone('יצאנו מהמשתמש',`<p>ההתקדמות נשארת בטלפון הזה, וגם באינטרנט במשתמש <b>${esc(L?.name||'')}</b>.</p>`,'out');}
// Started once the game is up: old backups go, the one playing looks online, and the triggers for the rounds.
function cloudStart(){
  if(!api)return;for(const p of players.players)cloud.pruneBackup(playerStorage(p.id));
  $('cloud-dialog').addEventListener('close',()=>{C={};if(screen==='players')renderPlayers();cloudMarks();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cloudKeep=true;cloudSync.now().finally(()=>{cloudKeep=false;});}else cloudSoon(true);});
  window.addEventListener('online',()=>cloudSoon(true));setInterval(()=>{if(!document.hidden)cloudSoon();},180e3);cloudMarks();cloudSoon(true,2500);
}
// Verification: the online users as the screens show them (never a token), and a round now on a verify save.
(window.__LEAGUE_FIT__??={}).cloud=()=>({on:!!api,page:$('cloud-dialog').open?C.page||null:null,round:C.round||null,active:players.active,off:cloudOff,fails:cloudSync.fails,
  players:players.players.map(p=>{const L=linkOf(p.id);return {id:p.id,name:playerName(p),linked:!!L,nick:L?.name||null,mark:cloudMarkOf(p.id),out:!!L?.out,deleting:!!L?.deleting};})});
window.__LEAGUE_FIT__.cloudSync=check=>!!storagePrefix&&!!api&&(cloudCheck||=!!check,cloudSync.now().then(()=>true));
// ------------------------------------------------------------------ friend battle: two players, one screen
// Best of three. Whoever loses a round gets an extra heart in the next one, so nobody falls far behind.
const VS_MODES=[{id:'',name:'קרב',icon:'bolt',text:'מי שמפיל את השני'},{id:'ball',name:'כדור הגאות',icon:'spiral',text:'ראשון ל־'+BALL_GOALS+' גולים'},{id:'wind',name:'תופסים את הרוח',icon:'swirl',text:WIND_TARGET+' נוצות, '+WIND_HOLD+' שניות'},{id:'lava',name:'טבעת הלבה',icon:'flame',text:'שורדים בלבה'}];
const VS_ARENAS=['wind','sea','fire','mirror','castle'],VS_WINS=2;
let versus={kind:'vs',giant:'fireguard',coopLevel:'normal',players:[null,null],ids:['maimi','havzuk'],hearts:[0,0],mode:'',wins:[0,0],round:1,catchup:[0,0],hatsOn:[false,false]},touchVersus=false;
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
    $('versus-name-'+k).textContent=c.name;$('versus-name-'+k).style.color=c.dark;const pp=vsProfile(n);livePortrait('versus-portrait-'+k,id,{skin:vsSkin(n,id),hats:pp?hatsFor(id,pp):null});
    {const own=pp&&HAT_LIST().length?rules.ownedHats?.(pp)||[]:[],w=pp?rules.hatsOf?.(pp,id)||{}:{},bare=!w.head&&!w.face;$('versus-hats-'+k).hidden=!own.length;
      // On a sideways phone the hats wait behind their button, in the place of the creatures, so each side keeps one row to choose from.
      {const tg=document.querySelector(`[data-vs-hats-toggle="${n}"]`),on=!!versus.hatsOn?.[n]&&own.length>0;tg.hidden=!own.length||!PHONE.matches;tg.classList.toggle('chosen',on);tg.setAttribute('aria-pressed',String(on));tg.closest('.versus-side').classList.toggle('hats-on',on);}
      $('versus-hats-'+k).innerHTML=own.length?`<button type="button" class="hat-option none${bare?' chosen':''}" data-vs-hat="${n}:none" aria-pressed="${bare}"><b>בלי</b></button>`+own.map(h=>{const on=w.head===h.id||w.face===h.id;return `<button type="button" class="hat-option${on?' chosen':''}" data-vs-hat="${n}:${h.id}" aria-pressed="${on}" aria-label="${esc(h.name)}" title="${esc(h.name)}">${hatPic(h.id)}</button>`;}).join(''):'';}
    $('versus-hearts-'+k).innerHTML=[0,1,2].map(i=>`<button class="vs-heart${i<=h?' on':''}" data-vs-heart="${n}:${i}" aria-label="${i+1} לבבות" aria-pressed="${i===h}">♥</button>`).join('')+`<small>${h?'עוד '+h*25+'% חיים':'חיים רגילים'}</small>`;
    $('versus-fighters-'+k).innerHTML=ids.map(f=>`<button class="fighter-chip${f===id?' chosen':''}" data-vs-fighter="${n}:${f}" aria-pressed="${f===id}" style="--c:${CREATURES[f].color}"><canvas id="vs-chip-${k}-${f}" aria-hidden="true"></canvas><b>${CREATURES[f].name}</b></button>`).join('');
    for(const f of ids)livePortrait(`vs-chip-${k}-${f}`,f,{skin:vsSkin(n,f),hats:pp?hatsFor(f,pp):null});}
  const coop=versus.kind==='coop';
  $('vs-kind').innerHTML=[['vs','נגד','bolt'],['coop','ביחד','duo'],['online','שני טלפונים','phones']].map(([k,t,i])=>`<button class="vs-kind-btn${versus.kind===k?' chosen':''}" data-vs-kind="${k}" aria-pressed="${versus.kind===k}">${icon(i)}<span>${t}</span></button>`).join('');
  $('versus-title').innerHTML=coop?'ביחד <em>נגד</em> ענק':'חבר <em>נגד</em> חבר';document.querySelector('.versus-vs').textContent=coop?'+':'VS';
  $('coop-levels').hidden=!coop;$('coop-levels').innerHTML=Object.entries(COOP_LEVELS).map(([k,L])=>`<button class="vs-player${versus.coopLevel===k?' chosen':''}" data-coop-level="${k}" aria-pressed="${versus.coopLevel===k}">${L.name}</button>`).join('');
  $('versus-modes').classList.toggle('giants',coop);
  $('versus-modes').innerHTML=coop?COOP_GIANTS.map(g=>`<button class="vs-mode giant${g===versus.giant?' chosen':''}" data-coop-giant="${g}" aria-pressed="${g===versus.giant}"><canvas id="giant-${g}" aria-hidden="true"></canvas><b>${CREATURES[g].name}</b><small>${CREATURES[g].role}</small></button>`).join(''):VS_MODES.map(m=>`<button class="vs-mode${m.id===versus.mode?' chosen':''}" data-vs-mode="${m.id}" aria-pressed="${m.id===versus.mode}">${icon(m.icon)}<b>${m.name}</b><small>${m.text}</small></button>`).join('');
  document.querySelectorAll('[data-vs-player]').forEach(el=>el.onclick=()=>{const [n,pid]=el.dataset.vsPlayer.split(':');versus.players[+n]=pid;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-fighter]').forEach(el=>el.onclick=()=>{const [n,f]=el.dataset.vsFighter.split(':');versus.ids[+n]=f;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-hat]').forEach(el=>el.onclick=()=>{const [n,h]=el.dataset.vsHat.split(':'),i=+n,pp=vsProfile(i);if(!pp||!rules.wearHat?.(pp,versus.ids[i],h==='none'?null:h))return;const pid=versus.players[i];if(pid===players.active)persist();else saveProfile(playerStorage(pid),pp);hatSound(pp,versus.ids[i],h);renderVersus();});
  document.querySelectorAll('[data-vs-heart]').forEach(el=>el.onclick=()=>{const [n,i]=el.dataset.vsHeart.split(':').map(Number);versus.hearts[n]=i;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-mode]').forEach(el=>el.onclick=()=>{versus.mode=el.dataset.vsMode;sound.click();renderVersus();});
  if(coop)for(const g of COOP_GIANTS)livePortrait('giant-'+g,g);
  document.querySelectorAll('[data-vs-kind]').forEach(el=>el.onclick=()=>{sound.click();if(el.dataset.vsKind==='online'){showView('online');return;}versus.kind=el.dataset.vsKind;renderVersus();});
  document.querySelectorAll('[data-coop-giant]').forEach(el=>el.onclick=()=>{versus.giant=el.dataset.coopGiant;sound.click();renderVersus();});
  document.querySelectorAll('[data-coop-level]').forEach(el=>el.onclick=()=>{versus.coopLevel=el.dataset.coopLevel;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-hats-toggle]').forEach(el=>el.onclick=()=>{const n=+el.dataset.vsHatsToggle;versus.hatsOn=[0,1].map(i=>i===n?!versus.hatsOn?.[i]:!!versus.hatsOn?.[i]);sound.click();renderVersus();});
  $('versus-start').innerHTML='לקרב! '+icon('play');
}
const versusRoundLabel=()=>versus.wins.every(n=>n===VS_WINS-1)?'סיבוב ההכרעה':'סיבוב '+versus.round;
function startVersus(fresh=false){
  if(!art)return;if(fresh)Object.assign(versus,{wins:[0,0],round:1,catchup:[0,0],cardsUsed:[],card:null});
  mode='versus';cupFinal=false;touchVersus=matchMedia('(pointer:coarse)').matches;
  const arena=({lava:'fire',wind:'wind',ball:'sea'})[versus.mode]||VS_ARENAS[Math.floor(Math.random()*VS_ARENAS.length)];
  // The comeback card the loser of the last round flipped is used once, in this round. It took the place of the old catch-up heart.
  const card=versus.card||null,pp=[vsProfile(0),vsProfile(1)];versus.card=null;
  match=makeMatch({player:versus.ids[0],rival:versus.ids[1],level:'champion',seed:Date.now()+Math.floor(Math.random()*1e5),mode:versus.mode||null,arena,versus:true,hearts:versus.hearts.map(h=>Math.min(2,h)),ccard:card,hats:pp.map(vsHats),labs:pp.map(vsLabs),comeback:true,...(sim.wonderOptions?.(profile)||{})});
  match.roundLabel=versusRoundLabel();
  const [a,b]=match.actors,skinA=vsSkin(0,a.id);let skinB=vsSkin(1,b.id);match.names=[vsName(0),vsName(1)];
  // The same creature on both sides: player two wears night colours so the two are easy to tell apart.
  if(a.id===b.id&&skinA===skinB)skinB=skinA==='night'?'ice':'night';
  renderer.setMatch(match,[skinA,skinB],{local:0});clearInput();accumulator=0;sound.versus=true;sound.online=false;resetBattleFx();callsStart(match,{rematch:versus.round>1});startCount(match);
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');document.body.classList.add('versus-play');sound.unlock();sound.setScene('battle',{track:musicFor(match)});sound.resume();sound.setLocalSide?.(0);sound.setMusicRate?.(1);
  $('player-name').textContent=a.spec.name;document.querySelector('.player-info .fighter-lines span').textContent=vsName(0);$('rival-name').textContent=b.spec.name;$('rival-level').textContent=vsName(1);
  $('player-symbol').innerHTML=icon(a.spec.specialIcon);$('rival-symbol').innerHTML=icon(b.spec.specialIcon);
  $('match-label').textContent='חבר נגד חבר';$('round-label').textContent=match.roundLabel+' · '+versus.wins.join(' : ');
  $('special-action-icon').innerHTML=icon(a.spec.specialIcon);$('special-action-name').textContent=a.spec.special;$('special-button').style.setProperty('--c',a.spec.color);
  $('special-action-icon-2').innerHTML=icon(b.spec.specialIcon);$('special-button-2').style.setProperty('--c',b.spec.color);
  // Each child's name stands under their creature, in their colour, through the countdown only (the renderer); the keys are on the setup screen.
  $('match-toast').classList.remove('visible');toastUntil=0;$('mode-banner').hidden=false;
  tutorial=null;$('tutorial').hidden=true;tutThumb(null);document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  renderHUD();flash($('mode-banner'),'pop',900);$('arena').focus({preventScroll:true});
}
function startCoop(){
  if(!art)return;mode='coop';cupFinal=false;touchVersus=matchMedia('(pointer:coarse)').matches;
  const L=COOP_LEVELS[versus.coopLevel]||COOP_LEVELS.normal,g=versus.giant,arena=({fireguard:'fire',seaguard:'sea',windguard:'wind',tehomon:'sea'})[g]||'castle';
  const pp=[vsProfile(0),vsProfile(1)];
  match=makeMatch({player:versus.ids[0],rival:g,level:L.level,giantRival:true,arena,seed:Date.now()+Math.floor(Math.random()*1e5),coop:{partner:versus.ids[1],hpMul:L.hp,hearts:versus.hearts},hats:[vsHats(pp[0]),null,vsHats(pp[1])],labs:[vsLabs(pp[0]),null,vsLabs(pp[1])]});
  const [a,b,c]=match.actors,skinA=vsSkin(0,a.id);let skinC=vsSkin(1,c.id);if(a.id===c.id&&skinA===skinC)skinC=skinA==='night'?'ice':'night';
  // Both children are human to the sound (side 2 always is); the giant is not, so its super never chimes like a child's.
  match.names=[vsName(0),'',vsName(1)];renderer.setMatch(match,[skinA,null,skinC],{local:0});clearInput();accumulator=0;sound.versus=!!match.versus;sound.online=false;resetBattleFx();callsStart(match,{guardian:true});startCount(match);
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');document.body.classList.add('versus-play');sound.unlock();sound.setScene('battle',{track:musicFor(match)});sound.resume();sound.setLocalSide?.(0);sound.setMusicRate?.(1);
  $('player-name').textContent=a.spec.name;document.querySelector('.player-info .fighter-lines span').textContent=vsName(0);$('rival-name').textContent=b.spec.name;$('rival-level').textContent='ענק · '+L.name;
  $('player-symbol').innerHTML=icon(a.spec.specialIcon);$('rival-symbol').innerHTML=icon(b.spec.specialIcon);
  $('match-label').textContent='ביחד נגד ענק';$('round-label').textContent=vsName(0)+' ו'+vsName(1)+' נגד '+b.spec.name;
  $('special-action-icon').innerHTML=icon(a.spec.specialIcon);$('special-action-name').textContent=a.spec.special;$('special-button').style.setProperty('--c',a.spec.color);
  $('special-action-icon-2').innerHTML=icon(c.spec.specialIcon);$('special-button-2').style.setProperty('--c',c.spec.color);
  // The giant needs no push-in to be seen: the whole arena stays still.
  $('match-toast').classList.remove('visible');toastUntil=0;$('mode-banner').hidden=false;
  tutorial=null;$('tutorial').hidden=true;tutThumb(null);document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
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
  const cards=typeof rules.dealComebackCards==='function';
  if(w>=0){versus.wins[w]++;if(!cards){versus.catchup[1-w]=Math.min(2,versus.catchup[1-w]+1);versus.catchup[w]=0;}}
  versus.round++;const done=versus.wins.some(n=>n>=VS_WINS),[a,b]=match.actors;
  const title=w<0?'תיקו!':done?'ניצחון ל'+vsName(w)+'!':'הסיבוב ל'+vsName(w)+'!';
  const sub=done?'איזה קרב! עוד אחד?':w<0?'אף אחד לא לקח את הסיבוב. עוד סיבוב!':cards?'':'עוד לב ♥ ל'+vsName(1-w)+' בסיבוב הבא.';
  if(done){versus.players.forEach((pid,i)=>{if(pid==='guest'||(i===1&&versus.players[0]===pid))return;const pp=pid===players.active?profile:readProfile(playerStorage(pid));addSparks(pp,i===w?2:1);refreshDaily(pp,dayKey(),{seed:pid,friends:true,storyLeft:!!currentStep(pp)});progressDaily(pp,{friend:true});if(pid===players.active)persist();else saveProfile(playerStorage(pid),pp);});}
  $('result-content').innerHTML=`${done?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${done?'gold':''}">${icon(done?'trophy':w<0?'shield':'star')}</div><span class="result-kicker">חבר נגד חבר</span><h2 class="result-title"></h2><div class="result-score versus-score" dir="ltr"><div><strong>${versus.wins[0]}</strong><span></span></div><span>:</span><div><strong>${versus.wins[1]}</strong><span></span></div></div><p></p>`;
  document.querySelector('#result-content .result-title').textContent=title;document.querySelector('#result-content > p').textContent=sub;
  document.querySelectorAll('#result-content .versus-score div span').forEach((el,i)=>{el.textContent=vsName(i)+' · '+match.actors[i].spec.name;});
  if(done&&versus.players.some(p=>p!=='guest'))$('result-content').insertAdjacentHTML('beforeend','<p class="result-tip">כל שחקן קיבל ניצוצות לתיבת הכוכב, וגם מי שהפסיד.</p>');
  const rest=done&&campfireDue(),next={label:done?'עוד קרב!':'ל'+versusRoundLabel()+'!',battle:true,go:!done&&w>=0&&cards?()=>openComebackCards(1-w,{onDone:()=>startVersus(false)}):()=>startVersus(done)};
  plainResult({voice:done?'voice-victory':null,primary:rest?{label:'מנוחה ליד המדורה',icon:'campfire',go:()=>{match=null;showView('campfire');}}:next,
    secondary:rest?{label:'עוד קרב',battle:true,go:next.go}:{label:'החלפת יצורים',go:leaveBattle}});
}
// The loop must survive any drawing error: a frozen game is worse than one missed frame.
let frameErrors=0;
// ------------------------------------------------------------------ the show around a battle: slow motion, cue chips, the finale
// Slow motion only for moments a child makes (a super, a Power Form, the final blow): never online, never on a device that asks for calm motion.
const CALM=matchMedia('(prefers-reduced-motion: reduce)');
let slows=[],chips=newChips(),cueLast=null,finaleUntil=0,lastMoment=[],impactArm=[],segSeen=[];const flashTimers=new Map();
function slowmo(scale,real,ease=.12){if(match?.online||CALM.matches)return;slows.push({scale,until:clock+real,ease});}
// The slowest moment wins; each one eases back to full speed over its last fraction of a second.
function timeScale(){slows=slows.filter(s=>clock<s.until+s.ease);let k=1;for(const s of slows)k=Math.min(k,clock<s.until?s.scale:s.scale+(1-s.scale)*(clock-s.until)/s.ease);return k;}
// This phone's child: side 0, or side 1 on the phone that joined a two-phone room.
function localSide(){return match?.online&&online?.role==='guest'?1:0;}
function humanSide(side){if(!match)return side!==1;return sim.isHuman?sim.isHuman(match,side):side!==1||!!match.versus;}
// A chip in the HUD band, on the far side of the clock from the score (wave 3): a picture and at most one word, for 'act now' moments only,
// each with its own sound. One at a time, 4 s apart, six a battle; a chip that waited 3 s is dropped (chipAsk, chipTick). It never covers the score.
function cue(iconId,word='',seconds=1.4){word=String(word||'').trim().split(/\s+/).filter(Boolean).slice(0,1).join(' ');cueLast={icon:iconId,words:word};chipAsk(chips,{icon:iconId,words:word,seconds},clock);cueTick();}
function cueTick(){const el=$('match-cue');if(!el)return;const had=!!chips.now,c=chipTick(chips,clock);if(had&&!chips.now)el.classList.remove('on');if(!c)return;
  el.innerHTML=icon(c.icon)+'<b></b>';el.querySelector('b').textContent=c.words;el.classList.toggle('bare',!c.words);el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}
function resetCue(){chips=newChips();const el=$('match-cue');if(el){el.classList.remove('on');el.hidden=true;}}
// Where the HUD band ends over the canvas: the creatures stay below it (the renderer's view), and so do the damage number and the cut-in.
// The pause button's box, so a cut-in never covers it.
function measureHud(){if(!renderer)return;const c=$('arena').getBoundingClientRect(),t=document.querySelector('.battle-top')?.getBoundingClientRect(),p=$('pause-button')?.getBoundingClientRect();renderer.hudBottom=t?.height&&c.height?Math.max(0,Math.round(t.bottom-c.top)):0;
  renderer.numberTop=c.height?renderer.hudBottom+2:0;renderer.pauseRect=p?.width&&c.height?{x:p.left-c.left,y:p.top-c.top,w:p.width,h:p.height}:null;}
function resetBattleFx(){slows=[];lastMoment=[];impactArm=[];segSeen=[];finaleUntil=0;resetCue();const w=$('wonder-chip');if(w){w.hidden=true;w.dataset.id='';w.classList.remove('endless');}
  for(const id of ['special-button','special-button-2']){$(id).classList.remove('pop','pip-pop','deny','form-ready','in-form','can-form','has-copy');delete $(id).dataset.copy;$(id).style.removeProperty('--c2');}
  $('mode-banner')._html=null;document.querySelector('#battle .rival-info')?.classList.remove('paint-in');requestAnimationFrame(measureHud);}
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
  // Two phones: whoever lost this round may pick a comeback card for the next one.
  if(m.online&&online){online.cardFor=m.winner>=0?1-m.winner:-1;online.card=null;}
  const single=!m.versus&&!m.coop&&!m.online,rival=m.actors[1],freed=m.winner===0&&!m.versus&&(sim.isShadowed?sim.isShadowed(m):!m.coop&&(!!m.wild||!!m.story&&!m.mirror&&!m.friendly));let d=0;
  // On a phone of its own, only the child who won celebrates; a shared screen celebrates any child's win.
  if(['knockout','hill','gates'].includes(m.reason)&&m.winner>=0&&humanSide(m.winner)&&(!m.online||m.winner===localSide())){renderer.confetti?.();sound.confetti?.();}
  if(freed){const short=(sim.finaleViews?.(profile,rival.id)??0)>=3;d=renderer.liberate?.(1,clockCenter(),{short})||0;sound.liberationTicks?.({gap:short?.03:.05});sim.recordFinaleView?.(profile,rival.id);}
  else if(m.winner===0&&!m.versus)d=renderer.loserPuff?.(1)||0;
  if(single&&m.winner===1){d=renderer.sitUp?.(0)||0;sound.loseBounce?.({delay:d*.7});}
  if(single&&m.winner===0){const t=freed?rival:m.actors[0];renderer.cinematic(t.x,t.y-(freed?80:70),freed?1.35:1.5,freed?d+.4:1.9);}
  finaleUntil=clock+d;}
function finaleLeft(){return Math.max(0,Math.round((finaleUntil-clock)*1000));}
// ------------------------------------------------------------------ wave 2: the music, the announcer, comeback cards over the link
// The battle's music: the Two Tracks have their own; a spectacle guardian's second stage plays the boss loop.
function musicFor(m){return m?.spectacle?.stage===2?'boss':m?.arena==='tracks'?'tracks':'battle';}
// A little faster while a child here shines with the comeback star (1.15) or while a Wonder is on (1.08).
function musicRate(){const m=match;if(!m)return 1;const L=localSide();return m.actors.some(a=>(a.star||0)>0&&(m.online?a.side===L:humanSide(a.side)))?1.15:m.wonder?.state==='active'?1.08:1;}
// The announcer: '3-2-1' only for the first battle of a session and for a guardian (never a quick rematch), 'קדימה!' at the end of
// every countdown, 'סופר!' for the first super a child here makes, 'צורת עוצמה!' and 'פלא!'. The sound keeps two voices from overlapping.
let calls={speak:false,label:null,first:true,super:false,said:[],fx:[]};
const countdownWord=cd=>cd>.3?Math.ceil(cd-.3):0;
// The Little Shadow's intro line gives way as the battle starts, so '3-2-1' and 'קדימה!' are heard and nobody talks over the fight.
function callsStart(m,{rematch=false,guardian=false}={}){const fresh=typeof sessionFresh==='function'?sessionFresh():true;sound.endLines?.();calls={speak:!rematch&&(fresh||guardian),label:null,first:true,super:false,almost:false,said:[],fx:[]};if(calls.speak&&m?.status==='countdown')m.countdown=Math.max(m.countdown,3.3);}
function announce(word){calls.said.push(word);sound.announce?.(word);}
// Follows the number the arena shows: 3, 2, 1, then 'קדימה!' (also after a goal's short kick-off countdown; the numbers only the first time).
function callsTick(){const m=match;if(!m||m.status==='finished')return;const n=m.status==='countdown'?countdownWord(m.countdown):m.status==='playing'?0:calls.label;if(n===calls.label)return;calls.label=n;
  if(n===0){calls.first=false;announce('go');}else if(calls.speak&&calls.first&&n<=3)announce(String(n));}
// Comeback cards between two phones: the host keeps a card for its next start; the guest sends its pick to the host.
function onlineCard(card){const o=online;if(!o?.connected||!card||!(sim.COMEBACK_CARDS||[]).includes(card.id))return false;if(o.role==='host'){if(o.cardFor!==0)return false;o.card={side:0,id:card.id};return true;}onlineSend({type:'card',id:card.id});return true;}
// The host's next battle waits for the friend's card only when the friend lost the last round and has not picked yet.
function onlineCardReady(){const o=online;return !o||o.role!=='host'||o.cardFor!==1||!!o.card;}
// A Wonder's or card's picture under the clock: its own icon when this page has it, else the sparkle.
const iconOr=(name,or='sparkle')=>name&&document.getElementById('i-'+name)?name:or;
const CCARD_ICON={super:'bolt',crystal:'sparkle',decoy:'pair',speed:'arrow',heart:'heart'};
// Hats and Lab designs of a player on this device, for a friend battle (a guest player has none).
const vsHats=pp=>pp?sim.hatMap?.(pp)||pp.hats?.worn||null:null,vsLabs=pp=>pp?sim.labMap?.(pp)||pp.lab||null:null;
function frame(timestamp){
  const t0=DIAG?performance.now():0;
  try{frameBody(timestamp);}catch(error){if(frameErrors++<5)console.error('frame',error);window.__LEAGUE_LAST_ERROR__=String(error?.stack||error);}
  if(DIAG)try{diagFrame(timestamp,performance.now()-t0);}catch{}
  requestAnimationFrame(frame);
}
// Every battle event: its sound first, then what the child sees. Only an 'act now' moment gets a chip in the HUD band (a picture and at most
// one word); everything else is the sound, the announcer and the pictures on the arena itself (wave 3: no words over the arena).
function battleEvent(e){const n=sound.effect(e),L=localSide(),t=e.type,vs=!!match.versus,same=vs&&!match.online,foeOfLocal=side=>match.coop||match.allied?side===1:side!==L;
  // A child on this device: this phone's child, or either child on a shared screen (never the computer's ally).
  const mine=side=>side===L||!match.online&&humanSide(side);
  if(t==='hit'){if(humanSide(e.side))renderer.shake=Math.max(renderer.shake,e.side===L?2.2:.8);
    if(n===5&&e.by>=0&&humanSide(e.by))renderer.burst?.(e.x,e.y,'inkstar');
    // The first landed hit of a child's super prints two linocut frames (the renderer keeps them rare).
    if(e.special&&e.by>=0&&impactArm[e.by]!=null&&match.time-impactArm[e.by]<=.6){impactArm[e.by]=null;renderer.impactFrame?.();}}
  else if(t==='quake')renderer.shake=Math.max(renderer.shake,5);
  else if(t==='special'){const s=e.side,mega=!!e.mega;
    // The computer's ally in the pair race: a small moment of its own, never slow motion and never the rival's warning stroke.
    if(s===2&&match.allied){renderer.superMoment?.(2,e.kind,{full:false});sound.superMoment?.(2,{full:false});}
    // A full moment (slow motion and the cut-in) only for each child's first super of the battle and for every MEGA super of the Power Form
    // (its own slow motion came with 'form'). Every other super keeps its brush frame and its sound. Two children against a giant slow down less.
    else if(humanSide(s)){const full=mega||!lastMoment[s];if(full&&!mega)slowmo(match.coop?.5:.25,.3);if(full)lastMoment[s]=true;renderer.superMoment?.(s,e.kind,{full,mega});sound.superMoment?.(s,{full,mega});impactArm[s]=match.time;
      if(mine(s)&&!calls.super){calls.super=true;announce('super');}}
    else{renderer.rivalSuper?.(s);sound.rivalSwell?.(s);}}
  else if(t==='super-ready')flash(superButton(e.side),'pop',400);
  else if(t==='pip')flash(superButton(e.side),'pip-pop',450);
  else if(t==='form'){renderer.formMoment?.(e.side);if(humanSide(e.side)){slowmo(.15,.45,.2);sound.formBurst?.(e.side,{sting:true});if(mine(e.side))announce('form');}else sound.formBurst?.(e.side,{sting:false});}
  else if(t==='final-blow'){slowmo(.3,1,.2);sound.finalBlow?.();}
  // The Little Shadow's star lands on the child (its own sound and burst); the super button's pip pops.
  else if(t==='star-lend')flash(superButton(e.side),'pip-pop',450);
  else if(t==='wonder-start'){wonderHUD();sound.setMusicRate?.(musicRate());announce('wonder');}
  else if(t==='wonder-end'){wonderHUD();sound.setMusicRate?.(musicRate());}
  // Copy stars: the first one this child can catch gets its picture in the chip slot; a caught one shows on the super button.
  else if(t==='copy-drop'){if(mine(e.owner)&&!match.copyCued){match.copyCued=true;cue('copy','');}}
  else if(t==='copy'){if(e.side===L&&!match.copyLine&&!Object.keys(profile.mixes||{}).length){match.copyLine=true;sound.line?.('voice-shadow-copy');}}
  // The comeback star: quicker music while it shines. Never named in the result.
  else if(t==='comeback'){if(mine(e.side))sound.setMusicRate?.(musicRate());}
  else if(t==='comeback-end')sound.setMusicRate?.(musicRate());
  // The Land of Two Tracks.
  else if(t==='hill-warn')cue('shield','זזה!');
  else if(t==='bridge-super')slowmo(.3,.4);
  // A spectacle guardian at half life: the battle holds for a breath, the night falls, and the boss music comes in.
  else if(t==='phase-beat'){sound.setScene?.('battle',{track:'boss'});calls.fx.push('track:boss');sound.setMusicRate?.(musicRate());if(!CALM.matches)renderer.shake=Math.max(renderer.shake,4);}
  else if(t==='lava-warning')cue('flame','הלבה!');
  else if(t==='echo-turn')cue('ear','תורכם');
  else if(t==='tell'){if(same||foeOfLocal(e.side))cue(e.kind==='kashevet'?'muted':e.kind==='form'?'star':'bell','זוזו!');}
  // A knockout by a child here: the crowd cheers after the knockout's own sound.
  else if(t==='ko'){if(same||foeOfLocal(e.side))sound.cheer?.();}
  // A goal: the score pill flashes, and the crowd cheers this child's goal. The kick-off after it is a 1 s breath with nothing on the arena.
  else if(t==='goal'){flash($('mode-banner'),'pop',600);if(same||e.side===L)sound.cheer?.();if(match.status==='countdown')match.countdown=Math.min(match.countdown,1);}
  else if(t==='overtime')cue('trophy','זהב');
  // A trio's next creature steps in: its picture in the chip slot (no name).
  else if(t==='swap'){const c=CREATURES[e.id];renderer.swap(e.side,e.id,e.side===0?skinOf(profile,e.id):null);if(e.side===0){$('player-name').textContent=c.name;$('player-symbol').innerHTML=icon(c.specialIcon);$('special-action-icon').innerHTML=icon(c.specialIcon);$('special-action-name').textContent=c.special;$('special-button').style.setProperty('--c',c.color);delete $('special-button').dataset.copy;$('special-button').classList.remove('has-copy');cue(c.specialIcon,'');}else{$('rival-name').textContent=c.name;$('rival-symbol').innerHTML=icon(c.specialIcon);}}}
// ------------------------------------------------------------------ the sideways phone: the battle's few words, numbers and chips
// The close camera is gone: a phone shows the whole arena, still. A choice saved by the old pause menu is forgotten.
try{localStorage.removeItem('creature-league.close-camera.v2');}catch{}
// The countdown: the big 3-2-1 only when the announcer counts it (the session's first battle, a guardian, the boss); any other start is
// short (1.4 s) and shows only a 'קדימה!' burst at its end. Two phones take it from the start message, so both show the same.
function startCount(m,big=calls.speak){if(!m)return;m.bigCount=!!big;if(m.status!=='countdown')return;m.countdown=big?Math.max(m.countdown,3.3):Math.min(m.countdown,1.4);}
// Near a win (the last goal, the hill's last points, the last gate, all six feathers held, the last song): the announcer says 'almost', once.
function almostTick(){const m=match,L=localSide();if(!m||calls.almost||m.status!=='playing'||m.versus&&!m.online)return;
  const near=m.ball?m.ball.score[L]>=BALL_GOALS-1:m.hill?(m.hill.points?.[L]||0)>=(sim.HILL_TARGET??25)-3:m.race?(m.race.at|0)>=(sim.RACE_GATES??5)-1:m.wind?m.wind.holder===L:m.echo?m.echo.songs[L]>=(sim.ECHO_SONGS??3)-1:false;
  if(near){calls.almost=true;announce('almost');}}
// A creature that dodges, loses its feathers, turns dizzy or gets rooted: a soft chirp with its picture on the arena (the other moments have sounds).
const CHIRP={evade:[1320,.06,'triangle',.035,260],blown:[880,.09,'sine',.04,-300],dizzy:[660,.12,'triangle',.035,420],rooted:[392,.1,'square',.025,-90]};let chirpAt=-9;
function chirps(){if(!match)return;for(const e of match.effects){if(e.ch||!CHIRP[e.type])continue;e.ch=1;if(e.age>.15||clock-chirpAt<.2)continue;chirpAt=clock;sound.tone?.(...CHIRP[e.type]);}}
// Verification: what the battle shows in words, numbers and chips.
(window.__LEAGUE_FIT__??={}).battleText=()=>({chips:chips.count,chip:chips.now?{icon:chips.now.icon,words:chips.now.words}:null,numbers:renderer?.numCount||0,number:renderer?.num?{side:renderer.num.side,num:renderer.num.num}:null,
  countdown:[...(renderer?.cdWords||[])],bigCount:!!match?.bigCount,camera:!!renderer?.punch,band:renderer?.band||0});
function frameBody(timestamp){
  if(!frameTime)frameTime=timestamp;const dt=Math.min(.1,(timestamp-frameTime)/1000);frameTime=timestamp;clock+=dt;
  // Creature pictures move on every screen; during a battle only the ones inside an open dialog (the result, a new card).
  if(screen!=='battle'||document.querySelector('dialog[open]'))for(const [canvasId,entry] of portraits){const el=$(canvasId);if(!el){portraits.delete(canvasId);continue;}const open=el.closest('dialog[open]');if(screen==='battle'?!open:!el.offsetParent&&!open)continue;
    const o=entry.opts;entry.wait=(entry.wait||0)+dt;if(o.still&&entry.drawn&&entry.wait<.25)continue;const pdt=entry.wait;entry.wait=0;entry.drawn=true;
    const locked=!isUnlocked(profile,entry.id);drawPortrait(el,entry.puppet,entry.id,clock,pdt*(o.speed??1),{active:o.roster?entry.id===profile.selected:true,locked:o.roster&&locked,skin:o.roster?(locked?null:skinOf(profile,entry.id)):o.skin,form:!!o.form,clip:o.clip||'idle',glowColor:o.glowColor||null,hats:o.roster&&locked?null:o.hats||null,lab:o.lab||null});}
  if(screen==='battle'&&match){
    // Slow motion slows the world and its drawing; the clock, the HUD and the screen-space moments stay in real time.
    const ts=timeScale();
    if(match.online&&online?.role==='guest'){if(match.status==='finished')settleBattle(dt);else coast(match,dt);guestTick(dt);callsTick();}
    else if(match.status==='finished')settleBattle(dt*ts);
    else if(match.status!=='paused'){
      accumulator+=dt*ts;
      while(accumulator>=1/60){tutorialGuard();
        if(match.online){step(match,currentInput(),1/60,online?.remote||{});if(online)online.remote.special=false;}else if(match.versus||match.coop){const [one,two]=versusInputs();step(match,one,1/60,two);input2.special=false;}else step(match,currentInput(),1/60);input.special=false;accumulator-=1/60;
        if(match.online)hostAfterStep();
        callsTick();for(const e of match.events)battleEvent(e);
        if(match.status==='finished'){startFinale();onFinish();break;}
      }
    }
    if(match){updateTutorial(dt);chirps();renderer.render(match,dt*ts,clock,dt);if(clock-lastHUD>.05){renderHUD();lastHUD=clock;}}
  }
}
// After the finish nothing is decided any more, but the picture keeps moving: shots fly out and splats fade.
function settleBattle(dt){if(sim.settle)sim.settle(match,dt);else step(match,{},dt);}
function openHelp(){pauseBattle();if(!$('help-dialog').open)$('help-dialog').showModal();}
function handleNavigation(view){sound.click();if(screen==='battle'&&match?.status!=='finished'){pauseBattle();return;}match=null;showView(view);}
// ------------------------------------------------------------------ the sideways phone: the shell, the bar and the way around
// Each screen says how deep it is and where it hangs (data-level, data-parent on its section): Home 0, its doors 1, what opens from them 2; the battle floats above.
const navLevel=name=>name==='battle'?3:name==='lobby'?0:+($(name)?.dataset.level||1),navParent=name=>{const p=$(name)?.dataset.parent;return p&&$(p)?p:'lobby';};
// Up: a briefing (data-brief) goes back to whatever opened it (Home or the map); any other screen to the screen one level up that opened it, else to its parent.
function upOf(name=screen){const i=navStack.lastIndexOf(name),prev=i>0?navStack[i-1]:null,d=navLevel(name)-(prev?navLevel(prev):9);return prev&&$(prev)&&($(name)?.dataset.brief!=null?d>0:d===1)?prev:navParent(name);}
// showView tells the shell every screen it shows: the stack of places, the battle's origin (a briefing, data-brief, counts as the screen that opened it), the bar.
function navShown(name,from){document.body.dataset.screen=name;guard();document.documentElement?.classList.toggle('fit',!!document.querySelector?.('.view.ph-fit:not([hidden])'));
  if(name==='battle'){if(from!=='battle')battleOrigin=$(from)?.dataset.brief!=null?upOf(from):from||'lobby';if(GATE.matches)requestAnimationFrame(()=>pauseBattle({type:'gate'}));return;}
  const L=navLevel(name);navStack=L<=0?['lobby']:['lobby',...navStack.filter(n=>n!=='lobby'&&n!==name&&navLevel(n)<L),name];
  const v=$(name);barTitle(v?.dataset.phoneTitle||v?.querySelector('h1')?.textContent||'');$('bar-up').hidden=!(L>=2&&upOf(name)!=='lobby');}
// The bar's title for this screen, until the next screen.
function barTitle(text){$('bar-title').textContent=String(text||'').trim();}
const goHome=()=>handleNavigation('lobby');
function goUp(){sound.click();if(screen==='battle'){pauseBattle();return;}match=null;showView(upOf(screen));}
// The origin rule: leaving a battle, or its result's 'ממשיכים', goes back to the screen where its start was pressed.
function goOrigin(){match=null;showView(battleOrigin&&battleOrigin!=='battle'&&$(battleOrigin)?battleOrigin:'lobby');}
// A badge is every element with data-badge="<name>": hidden for nothing, a glowing dot for true, else the number or word in it.
function setBadge(name,v){for(const el of document.querySelectorAll(`[data-badge="${name}"]`)){el.hidden=!v;el.classList.toggle('dot',v===true);el.textContent=v&&v!==true?String(v):'';}}
// Verification hooks for the sideways phone; every part of the game adds its own with (window.__LEAGUE_FIT__??={}).name=…
(window.__LEAGUE_FIT__??={}).nav=()=>({screen,level:navLevel(screen),stack:[...navStack],up:upOf(screen),origin:battleOrigin,phone:PHONE.matches,short:SHORT.matches,gate:GATE.matches});
// The system back (the iPhone's edge swipe, Android's back button) walks the same map: one guard entry sits in the history while the screen is below Home.
// A back pauses a running battle, else closes the open window, else leaves a finished battle's result for its origin (as Esc and Android's back do),
// else goes up one level; on Home it lets the next back leave the game. Code never goes back itself.
function guard(){if((navLevel(screen)>=1||document.querySelectorAll('dialog[open]').length)&&!history.state?.fit)history.pushState({fit:1},'');}
function onBack(){const w=[...document.querySelectorAll('dialog[open]')].filter(d=>d.id!=='pause-dialog'&&d.id!=='result-dialog').at(-1);
  if(screen==='battle'&&match&&match.status!=='finished'&&match.status!=='paused')pauseBattle({type:'back'});
  // The comeback cards stand where the round's result stood: a back leaves the match as the result's does, never closes them into the next round.
  else if(w?.id==='ccard-dialog'){ccard=null;leaveBattle();}else if(w)w.close();
  else if(screen==='battle'&&match?.status==='finished'&&$('result-dialog').open)leaveBattle();else if(screen!=='lobby')goUp();guard();}
window.addEventListener('popstate',onBack);
// A window open on Home (the picker, help, Ron's box, the crown's ritual) is a level of its own: it gets the guard too, so the back closes it, never the game.
new MutationObserver(()=>{if(document.querySelectorAll('dialog[open]').length)guard();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
// A reload keeps the entry's old guard, which belongs to the page before it: this page starts clean and makes its own.
if(history.state?.fit)history.replaceState(null,'');
// An upright phone sees only the turn card (phone-shell.css hides every window under it), and a battle pauses at once: after the turn back it waits for play.
{const turned=()=>{if(GATE.matches)pauseBattle({type:'gate'});};if(GATE.addEventListener)GATE.addEventListener('change',turned);else GATE.addListener?.(turned);}
// The old 'לשחק ככה' escape is gone: a phone that once pressed it forgets it.
try{localStorage.removeItem('creature-league.portrait-ok');}catch{}
// Android: full screen and the sideways lock are a bonus. Every ask is the same, and when the phone drops full screen (an app switch, a share, a back swipe)
// the next tap asks again, unless the child left it with the bar's button. An iPhone has neither, so the button is not shown there (html.can-fs).
const canFS=!!document.documentElement.requestFullscreen,COARSE=matchMedia('(pointer:coarse)');let fsOff=false,fsArmed=false;document.documentElement.classList.toggle('can-fs',canFS);
// An iPhone in Safari cannot hide the address bar; added to the home screen the game opens with none. Its button shows how (html.ios-web).
const IOS_WEB=!canFS&&/iP(hone|od|ad)/.test(navigator.userAgent)&&navigator.standalone!==true&&!matchMedia('(display-mode: standalone)').matches;document.documentElement.classList.toggle('ios-web',IOS_WEB);
function fullOn(force=false){if(!canFS||document.fullscreenElement||!force&&(fsOff||!COARSE.matches))return;document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>window.screen.orientation?.lock?.('landscape')).catch(()=>{});}
function armFull(){if(!canFS||fsArmed||fsOff||!COARSE.matches)return;fsArmed=true;document.addEventListener('click',()=>{fsArmed=false;fullOn();},{once:true,capture:true});}
// Going full screen puts the page above every window already open (the top layer keeps its order): those windows are lifted back on top, quietly.
function fsChanged(){if(!document.fullscreenElement){armFull();return;}const focus=document.activeElement;
  for(const d of document.querySelectorAll('dialog[open]')){try{if(!d.matches(':modal'))continue;}catch{}d.addEventListener('close',e=>e.stopImmediatePropagation(),{capture:true,once:true});d.close();d.showModal();}focus?.focus?.({preventScroll:true});}
document.addEventListener('fullscreenchange',fsChanged);
// Verification on a verify save: show any screen (the phone-fit gate walks them all), and the shell's own state.
window.__LEAGUE_FIT__.go=v=>!!storagePrefix&&v!=='battle'&&!!$(v)?.classList.contains('view')&&(match=null,showView(v),true);
window.__LEAGUE_FIT__.shell=()=>({canFS,fs:!!document.fullscreenElement,fsOff,armed:fsArmed,guard:!!history.state?.fit,length:history.length,locks:window.__locks||null,portraitOk:(()=>{try{return localStorage.getItem('creature-league.portrait-ok');}catch{return 'blocked';}})()});
function bindControls(){
  $('quick-start').onclick=()=>startBattle('quick');$('home-play').onclick=()=>{sound.click();if(currentStep(profile))goStory();else startBattle('league');};$('bridge-play').onclick=()=>{sound.unlock?.();playBridgeTune();};$('bridge-back').onclick=()=>{bridgeTimers.forEach(clearTimeout);sound.click();showView('story');};$('bridge-next').onclick=()=>{sound.click();showView('story');};
  $('online-host').onclick=openRoom;$('online-join').onclick=()=>{sound.click();online={role:'guest',code:null,typed:[],connected:false,friend:null,wins:[0,0],remote:{},inState:{},supers:0,sendClock:0};renderOnline();};
  $('online-back').onclick=()=>{sound.click();onlineSend({type:'bye'});onlineReset();showView('versus');};$('online-go').onclick=()=>{sound.click();hostStartOnline();};
  $('room-share').onclick=async()=>{sound.click();const url=joinUrl(online?.code||[]);try{if(navigator.share){await navigator.share({title:'ליגת היצורים',text:'בוא לקרב איתי בליגת היצורים!',url});return;}await navigator.clipboard.writeText(url);const b=$('room-share');b.textContent='הועתק! שולחים לחבר';clearTimeout(b.copied);b.copied=setTimeout(()=>b.textContent='שולחים קישור לחבר',2400);}catch{}};
  $('home-goals').onclick=()=>{sound.click();showView('goals');};$('home-tower').onclick=()=>{sound.click();showView('tower');};$('tower-start').onclick=()=>{sound.click();if(!profile.tower.run){startTowerRun(profile,profile.selected);persist();}startBattle('tower');};$('tower-quit').onclick=()=>{sound.click();endTowerRun(profile);persist();renderTower();renderTowerStrip();};$('home-league').onclick=()=>{sound.click();showView('league');};$('league-start').onclick=()=>{sound.click();startBattle('league');};$('home-map').onclick=()=>{sound.click();showView('story');};$('home-change').onclick=()=>{sound.click();openPicker();};
  $('story-continue').onclick=()=>{sound.click();showView('story');};$('story-mini').onclick=()=>{sound.click();showView('story');};$('story-go').onclick=()=>{sound.click();goStory();};$('castle-egg').onclick=tapEgg;$('castle-back').onclick=()=>showView('story');$('castle-next').onclick=revealCastle;$('cup-start').onclick=()=>startBattle('cup');$('cup-teaser').onclick=()=>showView('cup');$('journey-start').onclick=continueJourney;$('challenge-start').onclick=()=>startBattle('challenge');$('upgrade-confirm').onclick=confirmUpgrade;$('workshop-back').onclick=()=>showView('cup');
  $('difficulty').onchange=()=>{profile.level=$('difficulty').value;persist();};
  $('brand-home').onclick=()=>handleNavigation('lobby');document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>handleNavigation(el.dataset.view));document.querySelectorAll('[data-home]').forEach(el=>el.onclick=()=>showView('lobby'));
  $('sound-toggle').onclick=()=>{profile.sound=!profile.sound;sound.unlock();sound.setEnabled(profile.sound);persist();};
  $('bar-up').onclick=()=>goUp();
  // A pinch or double tap during a battle would zoom the page and move what the child sees.
  for(const type of ['gesturestart','gesturechange','dblclick'])document.addEventListener(type,e=>{if(screen==='battle')e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',e=>{if(e.cancelable&&screen==='battle'&&(e.touches.length>1||!e.target.closest('dialog')))e.preventDefault();},{passive:false});
  $('reveal-dialog').addEventListener('close',()=>{if(screen==='story'&&storyEvent)renderStory();});
  // Phones show the whole arena, still: there is no close camera to choose (wave 3).
  window.addEventListener('resize',()=>{if(screen==='battle'){requestAnimationFrame(measureHud);thumbKey='';}});
  $('fullscreen').onclick=()=>{sound.click();if(IOS_WEB){$('install-dialog').showModal();return;}if(document.fullscreenElement){fsOff=true;document.exitFullscreen?.().catch(()=>{});}else{fsOff=false;fullOn(true);}};
  $('help-open').onclick=openHelp;if($('help-inline'))$('help-inline').onclick=openHelp;document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>$(el.dataset.close).close());
  $('pause-button').onclick=pauseBattle;$('resume-button').onclick=resumeBattle;$('leave-button').onclick=leaveBattle;
  $('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeBattle();});$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();leaveBattle();});
  window.addEventListener('keydown',e=>{
    if(screen!=='battle'||!match)return;
    if(e.code==='Escape'){if($('help-dialog').open)return;
      // The friend who joined a two-phone room: Esc opens the honest note, and closes it again.
      if(match.online&&online?.role==='guest'){e.preventDefault();if($('pause-dialog').open)resumeBattle();else if(match.status!=='finished')pauseBattle(e);return;}
      if(match.status==='paused'){e.preventDefault();resumeBattle();}else if(match.status!=='finished'){e.preventDefault();pauseBattle();}return;}
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
  armFull();
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
const advance=(seconds,input={},live=false)=>{if(!storagePrefix||!match)return false;for(let i=0;i<seconds*60&&match&&match.status!=='finished';i++){if(match.online&&online?.role==='guest'){coast(match,1/60);guestTick(1/60);continue;}tutorialGuard();if(match.online){step(match,live?currentInput():{fire:true,...input},1/60,online?.remote||{});if(online)online.remote.special=false;hostAfterStep();callsTick();for(const e of match.events)battleEvent(e);if(match.status==='finished'){startFinale();onFinish();}continue;}if(live&&(match.versus||match.coop)){const [one,two]=versusInputs();step(match,one,1/60,two);input2.special=false;}else step(match,live?currentInput():{fire:true,...input},1/60);callsTick();for(const e of match.events)if(e.type==='finish'){startFinale();onFinish();}}updateTutorial(seconds);if(!match)return false;renderer.render(match,1/60,clock+=seconds,1/60);renderHUD();return match.status;};
window.__LEAGUE__=Object.freeze({advance,online:()=>online?{role:online.role,code:online.code,connected:online.connected,friend:online.friend,wins:online.wins}:null,stick:()=>({x:+input.stickX.toFixed(2),y:+input.stickY.toFixed(2)}),audio:()=>({ctx:sound.ctx?.state||'none',scene:sound.scene,music:Object.fromEntries(Object.entries(sound.music||{}).map(([k,t])=>[k,{paused:t.el.paused,time:+t.el.currentTime.toFixed(1),ready:t.el.readyState,gain:+t.g.gain.value.toFixed(2)}]))}),skip:()=>{if(!match||match.status==='finished')return false;finish(match,0,'test');if(match.online&&online?.role==='host')onlineSend({type:'snap',snap:snapshot(match)});startFinale();onFinish();return true;},timeScale:()=>+timeScale().toFixed(3),cue:()=>cueLast&&{...cueLast},finale:()=>finaleLeft(),announce:()=>calls.said.at(-1)||null,announced:()=>[...calls.said],music:()=>({track:match?musicFor(match):null,rate:musicRate()}),show:()=>[...calls.fx],
  // Verification only: start a battle of a kind (the Wonder of the Day, the story step that is next…), set the next friend round's
  // comeback card, or pick this phone's card after a two-phone round; without an argument, card() tells what waits.
  start:m=>{if(!storagePrefix||typeof m!=='string')return false;startBattle(m);return !!match;},versusCard:c=>{if(!storagePrefix)return false;versus.card=c&&(sim.COMEBACK_CARDS||[]).includes(c.id)?{side:c.side===1?1:0,id:c.id}:null;return versus.card;},
  card:c=>{if(c&&storagePrefix)return onlineCard(c);return online?{card:online.card||null,cardFor:online.cardFor??-1,ready:onlineCardReady()}:null;},
  // Verification only: inject a battle event (a pip, a Wonder, a final blow…) or pre-roll the next battle.
  event:e=>{if(!storagePrefix||!match||!e||typeof e.type!=='string')return false;battleEvent({...e});renderHUD();return true;},queue:m=>storagePrefix?queueNext(m):null,camera:()=>({scale:+renderer.scale.toFixed(3),offsetX:Math.round(renderer.offsetX),offsetY:Math.round(renderer.offsetY),close:!!renderer.cam,cinematic:!!renderer.punch,size:renderer.size,lite:!!renderer.lite,ema:+(renderer.ema||0).toFixed(4),hud:renderer.hudBottom||0,cutin:(renderer.moments||[]).filter(M=>M.kind==='cutin'&&M.rect).map(M=>({side:M.side,x:Math.round(M.rect.x),y:Math.round(M.rect.y),w:Math.round(M.rect.w),h:Math.round(M.rect.h),corner:!!M.rect.corner}))}),snapshot:()=>({screen,mode,profile:JSON.parse(JSON.stringify(profile)),match:match?{status:match.status,challenge:match.challenge,time:match.time,countdown:match.countdown,level:match.level,winner:match.winner,reason:match.reason,mode:match.mode||null,wonder:match.wonder?{...match.wonder}:null,ending:match.ending?{...match.ending}:null,ball:match.ball?{x:match.ball.x,y:match.ball.y,carrier:match.ball.carrier,score:[...match.ball.score]}:null,wind:match.wind?{holder:match.wind.holder,feathers:match.wind.feathers.map(f=>({x:f.x,y:f.y}))}:null,lava:match.lava?{scale:match.lava.scale,embers:match.lava.embers.map(e=>({x:e.x,y:e.y}))}:null,trio:match.trio?[trioLeft(match,0),trioLeft(match,1)]:null,actors:match.actors.map(a=>({id:a.id,side:a.side,x:a.x,y:a.y,hp:a.hp,out:a.out||0,feathers:a.feathers||0,power:a.power||0,maxHp:a.spec.hp,superCharge:a.superCharge,form:a.form||0,pips:a.pips||0,canForm:!!a.canForm,formUsed:!!a.formUsed,sz:a.sz||1,upgrades:[...a.upgrades],boss:a.boss?{...a.boss}:null,stats:{...a.stats},copy:a.copy||null,star:a.star||0,lab:a.lab?{...a.lab}:null})),covers:match.covers.map(c=>({...c})),zones:match.zones.map(z=>({...z})),shots:match.shots.length,shotDetails:match.shots.map(s=>({x:s.x,y:s.y,vx:s.vx,vy:s.vy,owner:s.owner})),pickup:match.pickup?{...match.pickup}:null,...wave2Snapshot(match)}:null})});
// Verification: the wave-2 parts of a battle, as plain data.
function wave2Snapshot(m){const plain=v=>v==null?null:JSON.parse(JSON.stringify(v));return {copyStars:plain(m.copyStars),comeback:plain(m.comeback),decoy:plain(m.decoy),hill:plain(m.hill),race:plain(m.race),rhythm:plain(m.rhythm),drums:plain(m.drums),spectacle:plain(m.spectacle),
  wonderX:plain(m.wonderX),hats:plain(m.hats),labs:plain(m.labs),allied:!!m.allied,ccard:plain(m.ccard),copyLog:plain(m.copyLog),arena:m.arena||null,story:m.story||null};}
// The test copy (window.__CL_PREVIEW__) or ?diag shows a small box: frame rate, the slowest frame, time in the game's own work, the last error,
// the offline copy's progress and the sound's state, so a screenshot from a phone says what is slow. A tap folds it.
const DIAG=!!window.__CL_PREVIEW__||/[?&]diag\b/.test(location.search);
const diag={n:0,t:0,worst:0,work:0,long:0,err:'',sw:'-',files:'-',el:null,small:false};
if(DIAG){addEventListener('error',e=>{diag.err=String(e.message||e.error||'error').slice(0,90);});addEventListener('unhandledrejection',e=>{diag.err=('promise: '+String(e.reason?.message||e.reason)).slice(0,90);});
  const sw=async()=>{try{const r=await navigator.serviceWorker?.getRegistration?.();diag.sw=(navigator.serviceWorker?.controller?'ctl ':'free ')+(r?.installing?'installing':r?.waiting?'waiting':r?.active?'active':'none');let n=0;for(const k of await caches.keys())if(/^(creature-league-|clpreview-)/.test(k))n+=(await (await caches.open(k)).keys()).length;diag.files=String(n);}catch(e){diag.sw='?';}};
  sw();setInterval(sw,4000);}
function diagFrame(ts,work){diag.n++;diag.work+=work;const gap=diag.last?ts-diag.last:0;diag.last=ts;if(gap>diag.worst)diag.worst=gap;if(gap>100)diag.long++;
  if(ts-diag.t<1000)return;const fps=Math.round(diag.n*1000/(ts-diag.t||1)),avg=(diag.work/diag.n).toFixed(1);diag.t=ts;
  if(!diag.el){diag.el=document.createElement('div');diag.el.id='diag';diag.el.style.cssText='position:fixed;left:50%;bottom:2px;transform:translateX(-50%);z-index:2147483647;max-width:96vw;padding:2px 8px;border-radius:8px;background:#000c;color:#fff;font:600 11px/1.35 monospace;direction:ltr;text-align:left;white-space:pre-wrap;pointer-events:auto';diag.el.onclick=()=>{diag.small=!diag.small;};document.body.appendChild(diag.el);}
  const m=typeof match!=='undefined'&&match?`${match.status} ${(match.countdown??0).toFixed(1)} t${(match.time||0).toFixed(1)}`:'-',err=window.__LEAGUE_LAST_ERROR__?String(window.__LEAGUE_LAST_ERROR__).split('\n')[0].slice(0,90):diag.err;
  diag.el.textContent=diag.small?`${fps}fps`:`${fps}fps worst ${Math.round(diag.worst)}ms work ${avg}ms long ${diag.long} | ${screen} ${m}\nsw ${diag.sw} files ${diag.files} | audio ${sound?.ctx?.state||'none'} | ${innerWidth}x${innerHeight}@${devicePixelRatio}${navigator.standalone?' app':''}${err?'\nERR '+err:''}`;
  diag.n=0;diag.work=0;diag.worst=0;}
async function boot(){
  $('load-retry').hidden=true;try{art=await loadArt(p=>$('loading-bar').style.width=p*100+'%');renderer=new Renderer($('arena'),art);refreshTodayGoals();buildRoster();renderStoryPanel();bindControls();updateHeader();cloudStart();
    {const q=new URLSearchParams(location.search),code=codeFromText(q.get('join'));if(code){q.delete('join');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''));showView('online');joinRoom(code);}else showView(players.players.length>1?'players':'lobby');}$('loading').hidden=true;$('app').hidden=false;requestAnimationFrame(frame);
    if('serviceWorker' in navigator&&location.protocol!=='file:')setTimeout(()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}),navigator.serviceWorker.controller?0:12000);
  }catch(error){console.error(error);$('loading-text').textContent='חלק מהציורים לא נטענו. בדקו שהמשחק נפתח דרך קובץ ההפעלה ונסו שוב.';$('load-retry').hidden=false;}
}
$('load-retry').onclick=()=>location.reload();if(location.protocol!=='file:')boot();

