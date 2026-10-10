import {CREATURES,LEVELS,CUP,CHALLENGE,challengeUnlocked,journeyView,makeChallengeMatch,makeMatch,step,readProfile,saveProfile,recordResult,resultStats,clamp,startCup,needsUpgrade,chooseUpgrade,STARTERS,WILD,RARITY,SKINS,isUnlocked,releasedCount,wildLevel,makeWildMatch,skinById,skinUnlocked,skinOf,chooseSkin,flipCard,cardStats,finish} from './core.js';
import {upgradeOptions,cleanUpgrades} from './upgrades.js';
import {MODES,WIND_TARGET,WIND_HOLD,MAX_POWER,BALL_GOALS,trioLeft,GOALS} from './core.js';
import {trioTeam,missionEased,missionLevel,ISLANDS,STEPS,STORY_CARDS,STORY_CARD_IDS,currentStep,storyComplete,litIslands,starLit,islandOf,homeIsland,makeStoryMatch,recordStory,completeCastle,storyCardOwned} from './story.js';
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
let surprise=false,pendingReveal=false,wildTarget=null,cardTarget=null,storyIntro=false,storyEvent=null,castle={phase:'mend',filled:0,taps:0};
// Where each island sits on the painted map, in percent.
const MAP_SPOTS={wind:[17,30],sea:[24,66],fire:[78,70],mirror:[84,30],castle:[50,17]};
function necklaceHTML(){const lit=litIslands(profile);return ISLANDS.map(i=>`<span class="gem${lit.includes(i.id)?' lit':''}" style="--g:${i.gem}" title="האור ${i.gemName}"></span>`).join('')+`<span class="gem star${starLit(profile)?' lit':''}" title="הכוכב הזהוב"></span>`;}
function say(id,line,{who='shadow',voice=null}={}){const g=$(id);if(!g)return;if(voice)sound.line(voice);g.querySelector('.guide-line').textContent=line;g.querySelector('.guide-name').textContent=who==='ron'?'רון':'הצל הקטן';g.querySelector('.guide-face').src=who==='ron'?'./art/gen/story-ron.png':'./art/gen/story-little-shadow.png';g.classList.remove('pop');void g.offsetWidth;g.classList.add('pop');}
function stepLabel(step){if(!step)return 'המסע הושלם!';if(step.kind==='castle')return 'הטירה הזהובה · מתקנים את הכוכב';const isl=islandOf(step.island);return isl.name+' · '+(step.kind==='mission'?'משימה: '+MODES[step.mode].name:step.kind==='free'?'משחררים את '+CREATURES[step.rival].name:step.kind==='mirror'?'הבבואה שלך':step.title);}
function renderHome(){
  const step=currentStep(profile),c=CREATURES[profile.selected]||CREATURES.maimi;
  $('home-name').textContent=c.name;$('home-gems').innerHTML=necklaceHTML();
  $('home-where').textContent=!step?'המסע הושלם!':step.kind==='castle'?'הטירה הזהובה':islandOf(step.island).name+(step.kind==='castle'?'':' · שלב '+(STEPS.filter(s=>s.island===step.island).indexOf(step)+1)+' מתוך '+STEPS.filter(s=>s.island===step.island).length);
  $('home-title').textContent=!step?'קרב הפתעה: יריב ומשימה בהגרלה':step.kind==='castle'?'מתקנים את הכוכב':step.kind==='mission'?'משימה: '+MODES[step.mode].name:step.kind==='free'?'משחררים את '+CREATURES[step.rival].name:step.kind==='mirror'?'הבבואה שלך':step.title||'שומר האי';
  livePortrait('home-portrait',c.id,{skin:skinOf(profile,c.id)});
  // A new player sees one road; the cup and training open after the first island.
  $('lobby').classList.toggle('early',profile.story.done<4);
}
function renderStoryPanel(){
  renderHome();
  const step=currentStep(profile),done=profile.story.done;
  $('story-panel-title').textContent=stepLabel(step);
  $('story-panel-detail').textContent=!step?'רון בקע, והצל הקטן תיקן את הכוכב. המפריד במסכה מחכה בפרק הבא.':done===0?'הצל הקטן מחכה לך. השרשרת שלו מובילה לארבעה איים, ובכל אי יש יצורים שהצל עדיין מחזיק.':step.kind==='castle'?'ארבעת האורות דולקים. הכוכב הזהוב מוביל לטירה.':'כל ניצחון משחרר יצור מהצל. כל שומר מדליק אור בשרשרת.';
  $('home-necklace').innerHTML=necklaceHTML();
  $('story-continue').innerHTML=(done===0?'יוצאים למסע':!step?'למפת השרשרת':'ממשיכים במסע')+' '+icon('arrow');
  const spot=MAP_SPOTS[step?.island||'castle'];$('mini-ship').style.cssText=`right:${100-spot[0]}%;top:${spot[1]}%`;
}
function renderStory(){
  const step=currentStep(profile),lit=litIslands(profile);
  $('story-necklace').innerHTML=necklaceHTML();
  const order=[...ISLANDS.map(i=>i.id),'castle'];
  $('map-spots').innerHTML=order.map(id=>{const steps=STEPS.filter(s=>s.island===id),first=STEPS.indexOf(steps[0]),last=STEPS.indexOf(steps.at(-1)),done=profile.story.done>last,here=profile.story.done>=first&&!done,[x,y]=MAP_SPOTS[id],name=id==='castle'?'הטירה הזהובה':islandOf(id).name;
    const progress=id==='castle'?'':`<small>${Math.min(steps.length,Math.max(0,profile.story.done-first))} מתוך ${steps.length}</small>`;
    return `<button class="map-spot ${done?'done':here?'here':'locked'}" data-spot="${id}" style="right:${100-x}%;top:${y}%;--g:${id==='castle'?'#e8b931':islandOf(id).gem}"><span class="spot-dot">${done?icon('check'):here?icon('star'):icon('lock')}</span><b>${name}</b>${progress}</button>`;}).join('');
  document.querySelectorAll('[data-spot]').forEach(el=>el.onclick=()=>{sound.click();const id=el.dataset.spot;
    if(el.classList.contains('here'))goStory();else if(el.classList.contains('done'))say('story-guide',id==='castle'?'הכוכב מתוקן. רון שומר על החיבורים בין העולמות.':'האור '+islandOf(id).gemName+' כבר דולק בשרשרת. כל הכבוד!');else say('story-guide','עוד לא. קודם מסיימים את '+stepLabel(step)+'.');});
  const line=storyEvent?.step?.after||(!step?STEPS.at(-1).after:profile.story.done===0?'היי, אני הצל הקטן. פעם הייתי הצל הגדול, ועכשיו אני רוצה לתקן. השרשרת שלי מובילה לארבעה איים. בוא נשחרר את היצורים שעדיין בצל!':step.kind==='castle'?'ארבעת האורות דולקים, והכוכב הזהוב מוביל לטירה. אני... קצת מפחד. תבוא איתי?':'הבא בתור: '+stepLabel(step)+'.');
  const holdLine=pendingReveal||$('reveal-dialog').open;
  if(!holdLine)say('story-guide',line,{voice:storyEvent?.step?'voice-shadow-after-'+storyEvent.step.id:!step?'voice-shadow-after-castle':profile.story.done===0?'voice-shadow-hello':step?.kind==='castle'?'voice-shadow-castle-door':null});
  if(!holdLine&&storyEvent?.lit)setTimeout(()=>document.querySelector(`#story-necklace .gem:nth-child(${ISLANDS.findIndex(i=>i.id===storyEvent?.lit)+1})`)?.classList.add('just-lit'),300);
  if(!holdLine)storyEvent=null;
  $('story-go').innerHTML=(!step?'לאלבום הקלפים':step.kind==='castle'?'נכנסים לטירה':'לקרב: '+stepLabel(step))+' '+icon('arrow');
}
function goStory(){const step=currentStep(profile);if(!step){showView('cards');return;}if(step.kind==='castle'){castle={phase:'mend',filled:0,taps:0};showView('castle');return;}storyIntro=true;wildTarget=step.rival||null;showView('wild');}
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
  if(castle.phase==='mend')say('castle-guide',castle.filled===0?STEPS.at(-1).intro:['האור הירוק חוזר!','עכשיו הכחול!','האדום!','הלבן! עוד אחד...'][castle.filled-1]||'',{voice:castle.filled===0?'voice-shadow-castle':null});
  else if(castle.phase==='egg')say('castle-guide',['הכוכב שלם! מה זה בתוכו?','היא זזה!','עוד קצת!'][Math.min(2,castle.taps)]);
  else say('castle-guide','רון!',{who:'ron'});
  $('castle-next').hidden=castle.phase!=='hatched';$('castle-next').innerHTML='מקבלים את הקלפים '+icon('arrow');
}
function tapEgg(){if(castle.phase!=='egg')return;castle.taps++;sound.tone?.(300+castle.taps*90,.2,'triangle',.12);const egg=$('castle-egg');egg.classList.remove('wobble');void egg.offsetWidth;egg.classList.add('wobble');
  if(castle.taps>=3){castle.phase='hatched';completeCastle(profile);persist();sound.reveal(true);}renderCastle();}
let selectedUpgrade=null;
const buildChips=(id,ids)=>upgradeOptions(CREATURES[id]).filter(u=>cleanUpgrades(ids).includes(u.id)).map(u=>`<span class="build-chip">${icon(u.icon)}${u.name}</span>`).join('');
const bossAdvice='המגן של סלעוז חוסם ירי מלפנים. זוזו ממסלול ההסתערות ותקפו כשהוא מתאושש.';
const rivalAdvice={slauz:bossAdvice,havzuk:'הבזוק מהיר אבל יש לו פחות חיים. התרחקו מפרץ החשמל ותקפו אחרי ההבזק.',maimi:'הגל של מיימי דוחף ומאט. זנקו הצדה וחזרו לתקוף.',
  windguard:'שומר הרוחות שולח טורנדו. זוזו הצידה מהדרך שלו!',seaguard:'הצב העתיק איטי מאוד. כשהוא מפעיל את טבעת הגאות, חכו שהיא תיעלם ורק אז תירו.',fireguard:'אריה האש שואג אש קדימה. אל תעמדו מולו מקרוב, וזוזו מהרצפה הבוערת.',zoharon:'כשמופיעים עיגולים זהובים על הרצפה, צאו מהם מהר: כוכבים נופלים!',kokhavit:'כשהמגן שלה מאיר, הפגיעות הראשונות נבלעות. תירו כמה יריות קטנות כדי לשבור אותו.',
  lohatan:'לוהטן כבד ואיטי. זוזו הצידה מכדור האש ואל תעמדו על אדמה בוערת.',tehomon:'לתהומון המון חיים. כשמופיעה מערבולת, צאו ממנה מהר, והיא גם בולעת קליעים.',zikuk:'זיקוק יורה קרן ישרה ורחוקה. אל תעמדו מולו בקו ישר, והתקרבו אליו.',
  retetoz:'רטטוז צץ פתאום לידכם. כשהוא נעלם, התכוננו לחמוק.',tzlilon:'צלילון קטן וחלש, אבל ההיפנוט שלו מקפיא. שמרו ממנו מרחק.',shorshu:'כשמופיע עיגול ירוק מתחתיכם, זוזו לפני שהשורשים תופסים!',galgalor:'גלגל אור יורה לכל הכיוונים. רחוק ממנו פחות קליעים פוגעים.'};
const levelName=level=>LEVELS[level].name;
const stars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
const ELEMENT_ART={'רוח':'storm','מים':'water','חשמל':'storm','עוצמה':'canyon','אש':'volcano','אור':'light','רעד':'quake','היפנוט':'nebula','טבע':'forest','אנרגיה':'crystal'};
// A trading card. The art window is a live canvas so skins and idle motion show on the card.
function cardHTML(id,{canvasId,skin='base',big=false}={}){
  const c=CREATURES[id],r=RARITY[c.rarity]||RARITY['רגיל'],look=skinById(skin);
  return `<article class="tcard rarity-${r.stars} skin-${look.id}${big?' big':''}" style="--c:${c.color};--d:${c.dark}" data-el="${ELEMENT_ART[c.element]||'water'}">
    <header><span class="tcard-num">#${c.number}</span><span class="tcard-el">${icon(c.specialIcon)}${c.element}</span></header>
    <div class="tcard-art"><canvas id="${canvasId}" aria-hidden="true"></canvas>${look.id!=='base'?`<span class="tcard-skin">${look.name}</span>`:''}</div>
    <div class="tcard-title"><h3>${c.name}</h3><small>${c.role}</small></div>
    <div class="tcard-special">${icon(c.specialIcon)}<b>${c.special}</b></div>
    <ul class="tcard-bars">${cardStats(c).map(s=>`<li><span>${s.label}</span><i><em style="width:${s.pct}%"></em></i><b>${s.value}</b></li>`).join('')}</ul>
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
function updateHeader(){{const p=activePlayer();$('player-chip-name').textContent=playerName(p);livePortrait('player-chip-face',faceOf(p),{skin:skinOf(profile,faceOf(p))});}$('header-wins').textContent=profile.wins;$('cards-badge').hidden=!profile.newCards.length;$('cards-badge').textContent=profile.newCards.length;$('sound-toggle').innerHTML=icon(profile.sound?'sound':'muted');$('sound-toggle').setAttribute('aria-label',profile.sound?'השתקת צליל':'הפעלת צליל');$('sound-toggle').setAttribute('aria-pressed',String(!profile.sound));}
function showView(name){
  if(screen!==name)window.scrollTo(0,0);
  screen=name;for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;
  document.body.classList.toggle('battle-active',name==='battle');if(name!=='battle')chosenTrio=null;
  {const v=$(name);if(v&&name!=='battle'){v.classList.remove('view-enter');void v.offsetWidth;v.classList.add('view-enter');}}
  // On a touch screen a battle goes full screen and asks for landscape.
  if(name==='battle'&&matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>window.screen.orientation?.lock?.('landscape')).catch(()=>{});
  if(name==='battle')window.scrollTo(0,0);
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===name||el.dataset.view==='lobby'&&['cup','workshop','challenge','wild','story','castle','versus'].includes(name)));
  if(name!=='battle'){clearInput();sound.setScene('lobby');sound.resume();document.body.classList.remove('versus-play');}
  if(name!=='wild')storyIntro=storyIntro&&name==='battle';
  if(name==='lobby'){buildRoster();refreshSelection();renderStoryPanel();}if(name==='wild')renderWild();if(name==='story')renderStory();if(name==='castle')renderCastle();if(name==='cards')renderAlbum();if(name==='cup')renderCup();if(name==='workshop')renderWorkshop();if(name==='records')renderRecords();if(name==='challenge')renderChallenge();if(name==='versus')renderVersus();if(name==='players'){$('player-form').hidden=true;renderPlayers();}
  window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
}
function buildRoster(){
  $('roster').innerHTML=Object.values(CREATURES).map(c=>!isUnlocked(profile,c.id)&&c.star?`<button class="creature-card locked star-wait" data-star="${c.id}" aria-label="${c.name}: ${c.female?'שומרת':'שומר'} הכוכב, מחכה בטירה הזהובה" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('star')}${c.female?'שומרת':'שומר'} הכוכב</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('star')} מחכה בטירה הזהובה</div></div></button>`:!isUnlocked(profile,c.id)?`<button class="creature-card locked" data-wild="${c.id}" aria-label="יצור פרא: ${c.name}. נצחו אותו כדי לשחרר" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('lock')}יצור פרא</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('lock')} מחכה ב${islandOf(homeIsland(c.id))?.name||'מסע השרשרת'}</div></div></button>`:`<button class="creature-card" data-creature="${c.id}" aria-label="בחירת ${c.name}, ${c.role}" aria-pressed="false" style="--accent:${c.color};--accent-glow:${c.color}1a"><span class="selected-mark">${icon('check')}</span><div class="card-top"><span class="element-label">${icon(c.specialIcon)}${c.element}</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.role}</span></div><div class="stat-grid"><div><strong>${c.hp}</strong><small>חיים</small><span class="stat-bar"><i style="width:${c.hp/230*100}%"></i></span></div><div><strong>${c.speed}</strong><small>מהירות</small><span class="stat-bar"><i style="width:${c.speed/298*100}%"></i></span></div><div><strong>${c.damage}</strong><small>נזק לפגיעה</small><span class="stat-bar"><i style="width:${c.damage/24*100}%"></i></span></div></div><div class="card-bottom"><span>ירי כל ${c.interval.toFixed(2)} שנ׳</span><b>${c.armor?'שריון סופג '+Math.round(c.armor*100)+'%':'כוח מיוחד כל '+c.specialCooldown+' שנ׳'}</b></div></div></button>`).join('');
  for(const c of Object.values(CREATURES))livePortrait('portrait-'+c.id,c.id,{roster:true});
  document.querySelectorAll('[data-creature]').forEach(el=>el.addEventListener('click',()=>{profile.selected=el.dataset.creature;persist();refreshSelection();sound.click();}));
  document.querySelectorAll('[data-star]').forEach(el=>el.addEventListener('click',()=>{sound.click();notify('שומרי הכוכב מחכים בטירה הזהובה. כשתתקנו את הכוכב, הם יצטרפו אליכם.');}));
  document.querySelectorAll('[data-wild]').forEach(el=>el.addEventListener('click',()=>{sound.click();notify(CREATURES[el.dataset.wild].name+' עדיין בצל. הוא מחכה ב'+(islandOf(homeIsland(el.dataset.wild))?.name||'מסע השרשרת')+'.');showView('story');}));
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
  const step=storyIntro?currentStep(profile):null;
  if(storyIntro&&(!step||step.kind==='castle')){storyIntro=false;showView('story');return;}
  if(step)wildTarget=step.kind==='mission'?step.opponent:step.kind==='mirror'?(isUnlocked(profile,profile.selected)?profile.selected:'maimi'):step.rival;
  if(!step&&(!wildTarget||isUnlocked(profile,wildTarget))){wildTarget=WILD.find(id=>!isUnlocked(profile,id));if(!wildTarget){showView('cards');return;}}
  const c=CREATURES[wildTarget],level=step?step.level:wildLevel(profile);
  $('wild-stage').style.setProperty('--c',c.color);$('wild-stage').dataset.el=ELEMENT_ART[c.element]||'water';
  $('wild-progress').textContent=step?(islandOf(step.island).name+' · שלב '+(STEPS.filter(s=>s.island===step.island).indexOf(step)+1)+' מתוך '+STEPS.filter(s=>s.island===step.island).length):releasedCount(profile)+' מתוך '+WILD.length+' יצורי פרא כבר בנבחרת שלך';
  $('wild-guide').hidden=!step;if(step)say('wild-guide',missionEased(profile,step)?(step.easier||'הפעם היריב קצת עייף. אתה יכול!')+' '+step.intro:step.intro,{voice:'voice-shadow-'+step.id});
  document.querySelector('#wild .wild-tag').textContent=step?.kind==='mission'?'משימת האי':step?.kind==='guardian'?'שומר האי':step?.kind==='mirror'?'הבבואה':'אחוז בצל';
  $('wild-name').textContent=step?.kind==='mission'?MODES[step.mode].name:step?.kind==='mirror'?'הבבואה של '+c.name:step?.title||c.name;$('wild-name').style.color=c.color;$('wild-role').textContent=c.role+' · כוח '+c.element+' · '+c.rarity;
  $('wild-power-icon').innerHTML=icon(step?.kind==='mission'?MISSION_ICON[step.mode]:c.specialIcon);$('wild-power-icon').style.color=c.color;$('wild-power-title').textContent=step?.kind==='mission'?'איך מנצחים':c.special;$('wild-power-description').textContent=step?.kind==='mission'?MODES[step.mode].goal:c.description;
  if(step?.kind==='mission')$('wild-role').textContent=(step.rivals?'היריבים: '+step.rivals.map(id=>CREATURES[id].name).join(', ')+' בצל · ':'היריב: '+c.name+' בצל · ')+(profile.missionStars[step.id]?'השיא שלך: '+stars(profile.missionStars[step.id]):'עד שלושה כוכבים');
  $('wild-level').textContent='רמת היריב: '+levelName(step?.kind==='mission'?missionLevel(profile,step):level)+'. '+(step?.kind==='mission'?MISSION_HINT[step.mode]:'')+(step?.kind==='mirror'?'הבבואה יודעת כל מה שאתה יודע. תפתיע אותה.':rivalAdvice[c.id]||'');
  document.querySelector('#wild .wild-prize strong').textContent=step?(step.kind==='mission'?'הפרס: עד שלושה כוכבים, והדרך לשומר':step.kind==='free'?'הפרס: '+c.name+' והקלף שלו':step.kind==='guardian'?'הפרס: האור '+islandOf(step.island).gemName+', '+c.name+' והקלף שלו':'הפרס: האור הלבן והכוכב הזהוב'):'הפרס: היצור והקלף שלו';
  if(!isUnlocked(profile,profile.selected))profile.selected='maimi';
  $('wild-fighters').innerHTML=Object.values(CREATURES).filter(f=>isUnlocked(profile,f.id)).map(f=>`<button class="fighter-chip${f.id===profile.selected?' chosen':''}" data-fighter="${f.id}" aria-pressed="${f.id===profile.selected}" style="--c:${f.color}"><canvas id="chip-${f.id}" aria-hidden="true"></canvas><b>${f.name}</b></button>`).join('');
  for(const f of Object.values(CREATURES))if(isUnlocked(profile,f.id))livePortrait('chip-'+f.id,f.id,{skin:skinOf(profile,f.id)});
  livePortrait('wild-portrait',c.id,{big:true,skin:step?.kind==='mirror'?'night':null});
  document.querySelectorAll('[data-fighter]').forEach(el=>el.onclick=()=>{profile.selected=el.dataset.fighter;persist();sound.click();renderWild();});
  $('wild-start').onclick=()=>startBattle(step?'story':'wild');
  $('wild').classList.toggle('is-mission',step?.kind==='mission');
  $('wild-start').innerHTML=(step?.kind==='mission'?'למשימה!':step?.kind==='guardian'?'לקרב מול השומר!':step?.kind==='mirror'?'מול הבבואה!':step?'לשחרר מהצל!':'לקרב הפרא!')+' '+icon('arrow');
}
const albumTotal=()=>Object.keys(CREATURES).length+STORY_CARD_IDS.length,albumOwned=()=>Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)).length+profile.storyCards.length;
function renderAlbum(){
  const owned=[...Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),...profile.storyCards],total=albumTotal();
  $('album-progress').textContent=owned.length+' מתוך '+total+' קלפים'+(profile.newCards.length?' · '+profile.newCards.length+' מחכים שתהפכו אותם!':'');
  $('album-meter').style.width=owned.length/total*100+'%';
  $('album').innerHTML=Object.values(CREATURES).map(c=>{
    if(!isUnlocked(profile,c.id)){const where=c.star?'בטירה הזהובה':'ב'+(islandOf(homeIsland(c.id))?.name||'מסע השרשרת');return `<button class="album-slot locked" data-album-wild="${c.id}" aria-label="קלף נעול: ${c.name}. מחכה ${where}">${cardBack(c.id,{label:c.star?'שומר הכוכב':'יצור בצל'})}<span class="album-hint">${icon('lock')} מחכה ${where}</span></button>`;}
    if(profile.newCards.includes(c.id))return `<button class="album-slot fresh" data-album-new="${c.id}" aria-label="קלף חדש של ${c.name}. הקישו כדי להפוך">${cardBack(c.id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`;
    return `<button class="album-slot" data-album-card="${c.id}" aria-label="הקלף של ${c.name}">${cardHTML(c.id,{canvasId:'album-'+c.id,skin:skinOf(profile,c.id)})}</button>`;
  }).join('');
  for(const c of Object.values(CREATURES))if(isUnlocked(profile,c.id)&&!profile.newCards.includes(c.id))livePortrait('album-'+c.id,c.id,{skin:skinOf(profile,c.id),card:true});
  $('album-story').innerHTML=STORY_CARD_IDS.map(id=>!storyCardOwned(profile,id)?`<div class="album-slot locked">${cardBack(id,{label:'קלף סיפור'})}<span class="album-hint">${icon('lock')} בטירה הזהובה</span></div>`:profile.newCards.includes(id)?`<button class="album-slot fresh" data-album-new="${id}">${cardBack(id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`:`<div class="album-slot">${storyCardHTML(id)}</div>`).join('');
  document.querySelectorAll('#album-story [data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  document.querySelectorAll('[data-album-wild]').forEach(el=>el.onclick=()=>{sound.click();const c=CREATURES[el.dataset.albumWild];notify(c.star?'שומרי הכוכב מחכים בטירה הזהובה. כשתתקנו את הכוכב, הם יצטרפו אליכם.':c.name+' עדיין בצל. הוא מחכה ב'+(islandOf(homeIsland(c.id))?.name||'מסע השרשרת')+'.');showView('story');});
  document.querySelectorAll('[data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  document.querySelectorAll('[data-album-card]').forEach(el=>el.onclick=()=>{sound.click();openCard(el.dataset.albumCard);});
}
// The castle hands over the story cards, then the star guardians join, one card after another.
function revealCastle(){const [next,...rest]=profile.newCards.filter(id=>STORY_CARD_IDS.includes(id)||CREATURES[id]?.star);if(!next){showView('cards');return;}revealCard(next,{back:'story',joined:!!CREATURES[next],chain:rest.length?revealCastle:null});}
function revealCard(id,{joined=false,back=null,chain=null}={}){
  const c=CREATURES[id]||STORY_CARDS[id];flipCard(profile,id);persist();
  $('reveal-back').innerHTML=cardBack(id);$('reveal-front').innerHTML=STORY_CARDS[id]?storyCardHTML(id,{big:true}):cardHTML(id,{canvasId:'reveal-art',skin:skinOf(profile,id),big:true});if(CREATURES[id])livePortrait('reveal-art',id,{skin:skinOf(profile,id),card:true});
  const d=$('reveal-dialog');d.style.setProperty('--c',c.color);$('reveal-flip').classList.remove('flipped');d.classList.remove('burst');
  $('reveal-kicker').textContent=joined?'יצור חדש בנבחרת!':'קלף חדש!';$('reveal-title').textContent='';$('reveal-text').textContent='';
  if(chain){$('reveal-primary').textContent='לקלף הבא';$('reveal-primary').onclick=()=>{d.close();chain();};}
  else if(back){$('reveal-primary').textContent='חזרה למפת השרשרת';$('reveal-primary').onclick=()=>{d.close();showView(back);};}
  else if(!CREATURES[id]){$('reveal-primary').textContent='לאלבום הקלפים';$('reveal-primary').onclick=()=>{d.close();showView('cards');};}
  else{$('reveal-primary').textContent='לקרב עם '+c.name;$('reveal-primary').onclick=()=>{d.close();profile.selected=id;persist();showView('lobby');};}
  $('reveal-secondary').onclick=()=>{d.close();showView('cards');};
  if(!d.open)d.showModal();sound.unlock();
  setTimeout(()=>{$('reveal-flip').classList.add('flipped');d.classList.add('burst');sound.reveal(joined);$('reveal-title').textContent=c.name+(joined?(c.female?' הצטרפה אליך!':' הצטרף אליך!'):'');$('reveal-text').textContent=c.special+': '+c.description;},650);
  if(screen==='story')renderStory();
  if(screen==='cards')renderAlbum();
}
function openCard(id){
  cardTarget=id;const c=CREATURES[id],skin=skinOf(profile,id),wins=profile.creatures[id]?.wins||0;
  $('card-dialog-card').innerHTML=cardHTML(id,{canvasId:'dialog-art',skin,big:true});livePortrait('dialog-art',id,{skin,card:true});
  $('card-dialog-title').textContent=c.name;$('card-dialog-title').style.color=c.color;
  $('skin-picker').innerHTML=SKINS.map(k=>{const open=skinUnlocked(profile,id,k.id),need=k.wins-wins;return `<button class="skin-option skin-${k.id}${k.id===skin?' chosen':''}" data-skin="${k.id}" ${open?'':'disabled'} aria-pressed="${k.id===skin}" style="--c:${c.color}"><span class="skin-swatch"></span><b>${k.name}</b><small>${open?(k.id===skin?'נבחר':'פתוח'):'עוד '+need+' '+(need===1?'ניצחון':'ניצחונות')}</small></button>`;}).join('');
  document.querySelectorAll('[data-skin]').forEach(el=>el.onclick=()=>{if(chooseSkin(profile,id,el.dataset.skin)){persist();sound.click();openCard(id);if(screen==='cards')renderAlbum();}});
  $('card-dialog-play').textContent=profile.selected===id?c.name+' כבר בחר לקרב':'בוחרים את '+c.name+' לקרב';
  $('card-dialog-play').onclick=()=>{profile.selected=id;persist();sound.click();$('card-dialog').close();showView('lobby');};
  if(!$('card-dialog').open)$('card-dialog').showModal();
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
  $('challenge-build').innerHTML=`<div><span class="micro-label">השילוב שזכה בגביע ממשיך איתך</span><h2 style="color:${hero.color}">${hero.name} מול הבזוק</h2></div><div class="build-chips">${buildChips(hero.id,build.upgrades)||'<span class="muted">הכוחות הבסיסיים שלך</span>'}</div><small>הכוחות והשילוב נשמרים גם אחרי יציאה או הפסד.</small>`;
  $('challenge-start').innerHTML=`${done?'משחקים שוב באתגר':'לאתגר החדש'} ${icon('arrow')}`;
}
function renderCup(){
  const stage=profile.cup?.stage??0;
  $('cup-track').innerHTML=CUP.map((r,i)=>`<article class="cup-round ${i===stage?'current':i<stage?'done':'locked'}"><div class="round-num">${i<stage?icon('check'):i+1}</div><h3>${r.title}</h3><div class="round-rival" style="color:${CREATURES[r.rival].color}">${CREATURES[r.rival].name}</div><p>${r.club}</p><div class="round-state">${i<stage?'ניצחתם!':i===stage?'הקרב הבא שלכם':'בהמשך הדרך'}</div></article>`).join('');
  const hero=CREATURES[profile.cup?.player||profile.selected],rival=CREATURES[CUP[stage].rival];$('cup-matchup').innerHTML=`<strong>${hero.name} <span class="muted">מול</span> ${rival.name}</strong><p>${rivalAdvice[rival.id]}</p>`;
  $('cup-build').innerHTML=`<div><span class="micro-label">${profile.cup?'היצור שבונה את הדרך לגביע':'היצור שלך לגביע'}</span><h2 style="color:${hero.color}">${hero.name}</h2></div><div class="build-chips">${buildChips(hero.id,profile.cup?.upgrades)||'<span class="muted">ניצחון פותח בחירה בכוח חדש.</span>'}</div><small>היצור והכוחות שבחרת יישארו איתך עד סוף הגביע.</small>`;
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
  const totals=[[profile.wins,'ניצחונות'],[profile.cups,'גביעים'],[profile.played?Math.round(profile.wins/profile.played*100)+'%':'—','אחוז ניצחונות'],[profile.bestStreak,'שיא רצף ניצחונות']];
  $('record-totals').innerHTML=totals.map(([n,label])=>`<div class="total-card"><strong>${n}</strong><span>${label}</span></div>`).join('');
  const achievements=[['star','הניצוץ הראשון','לנצח בקרב הראשון',profile.wins>0],['bolt','על הגל','שלושה ניצחונות ברצף',profile.bestStreak>=3],['shield','נבחרת מנצחת','ניצחון עם כל שלושת היצורים הראשונים',STARTERS.every(id=>profile.creatures[id]?.wins>0)],['bolt','שובר פראים','לשחרר יצור פרא ראשון',releasedCount(profile)>0],['star','האלבום המלא','לאסוף את כל '+albumTotal()+' הקלפים',albumOwned()>=albumTotal()],['trophy','אלוף החופים','לזכות בגביע',profile.cups>0],['mountain','אלוף הזירה הפתוחה','לנצח בזירה המתפוררת',profile.challengeWins>0]];
  $('achievements').innerHTML=achievements.map(([i,title,desc,done])=>`<div class="achievement ${done?'unlocked':''}" aria-label="${title}: ${done?'הושג':'טרם הושג'}">${icon(i)}<div><strong>${title}</strong><small>${desc}</small></div></div>`).join('');
  $('winning-build').hidden=!profile.lastBuild;if(profile.lastBuild)$('winning-build').innerHTML=`<span class="micro-label">השילוב האחרון שזכה בגביע</span><h2>${CREATURES[profile.lastBuild.player].name}</h2><div class="build-chips">${buildChips(profile.lastBuild.player,profile.lastBuild.upgrades)||'ניצחון בכוחות הבסיסיים'}</div>`;
  $('creature-records').innerHTML=Object.values(CREATURES).map(c=>{const record=profile.creatures[c.id]||{wins:0,played:0,damage:0};return `<tr><td style="color:${c.color};font-weight:bold">${c.name}</td><td>${record.played}</td><td>${record.wins}</td><td>${Math.round(record.damage).toLocaleString('he-IL')}</td></tr>`;}).join('');
  $('history').innerHTML=profile.history.length?profile.history.map(h=>`<div class="history-row"><div><strong>${CREATURES[h.player].name} מול ${CREATURES[h.rival].name}</strong><small>${h.mode==='cup'?'גביע החופים':h.mode==='challenge'?CHALLENGE.title:h.mode==='wild'?'קרב פרא':h.mode==='story'?'מסע השרשרת':'אימון'} · ${Math.round(h.damage)} נזק · ${Math.round(h.accuracy)}% דיוק</small></div><span class="history-outcome ${h.won?'won':''}">${h.draw?'תיקו':h.won?'ניצחון':'הפסד'}</span></div>`).join(''):'<p class="empty-history">הקרב הראשון שלכם עוד לפניכם. כל היצורים כבר מחכים בזירה.</p>';
}
function clearInput(){keys.clear();input.pointerFire=false;input.buttonFire=false;input.toggleFire=false;input.aim=null;input.stickX=0;input.stickY=0;input.special=false;input2.stickX=0;input2.stickY=0;input2.special=false;$('joystick-knob-2').style.transform='';document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));$('joystick-knob').style.transform='';}
function currentInput(){
  const moveX=input.stickX+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),moveY=input.stickY+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  return {moveX,moveY,fire:input.pointerFire||input.buttonFire||input.toggleFire||keys.has('Space')||keys.has('KeyJ'),special:input.special,...(input.pointerFire&&input.aim?{aimX:input.aim.x,aimY:input.aim.y}:{})};
}
let chosenTrio=null;
const MISSION_ICON={lava:'flame',wind:'swirl',ball:'spiral',trio:'star'};
const MISSION_HINT={lava:'זוזו מהעיגולים המהבהבים והישארו בתוך הטבעת.',wind:'מי שנופל מפיל את כל הנוצות. שמרו עליהן!',ball:'עם הפנינה אי אפשר לירות: ירי בועט אותה לשער. שלוש פגיעות והיא נופלת.',trio:'כשיצור נופל, הבא בתור נכנס. כל יצור שנשאר חשוב.'};
const MISSION_TIP={lava:'אספו גחלים כדי לגדול, וזוזו מהעיגולים המהבהבים.',wind:'מי שנופל מפיל את הנוצות. החזיקו מרחק כשאתם מובילים.',ball:'כשליריב יש את הפנינה, פגעו בו שלוש פעמים, או הפעילו עליו את כוח־העל, והפנינה נופלת.',trio:'שמרו על החיים של כל יצור, וחכו עם הכוח המיוחד לרגע הנכון.'};
const wantsTrio=m=>m==='quick'?$('training-mode').value==='trio':m==='story'?(s=>s?.kind==='mission'&&s.mode==='trio')(currentStep(profile)):false;
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
// After the story, Play is a surprise: a random rival, often with a random mission.
function startSurprise(){
  const mine=isUnlocked(profile,profile.selected)?profile.selected:'maimi',rivals=Object.keys(CREATURES).filter(id=>id!==mine),modes=['','','lava','wind','ball'];
  $('rival').value=rivals[Math.floor(Math.random()*rivals.length)];$('training-mode').value=modes[Math.floor(Math.random()*modes.length)];surprise=true;startBattle('quick');
}
function startBattle(nextMode=mode){
  if(!art)return;if(nextMode!=='quick')surprise=false;if(wantsTrio(nextMode)&&!chosenTrio){openTeamPicker(nextMode);return;}if(nextMode==='challenge'&&!challengeUnlocked(profile)){showView('lobby');return;}mode=nextMode;cupFinal=false;
  if(nextMode==='wild'&&(!wildTarget||isUnlocked(profile,wildTarget))){showView('lobby');return;}
  if(nextMode==='story'&&!makeStoryMatch(profile)){showView('story');return;}
  let rival=$('rival').value,level=profile.level,player=isUnlocked(profile,profile.selected)?profile.selected:'maimi',upgrades=[];
  if(mode==='cup'){startCup(profile);if(needsUpgrade(profile)){showView('workshop');return;}const r=CUP[profile.cup.stage];rival=r.rival;level=r.level;cupFinal=profile.cup.stage===2;player=profile.cup.player;upgrades=profile.cup.upgrades;persist();}
  const seed=Date.now()+Math.floor(Math.random()*1e5);
  match=mode==='challenge'?makeChallengeMatch(profile,{seed}):mode==='story'?makeStoryMatch(profile,{seed,team:chosenTrio}):mode==='wild'?makeWildMatch(profile,wildTarget,{seed}):makeMatch({player,rival,level,upgrades,boss:rival==='slauz'&&!(mode==='quick'&&$('training-mode').value),seed,mode:mode==='quick'?$('training-mode').value||null:null,arena:mode==='quick'?({lava:'fire',wind:'wind',ball:'sea',trio:'castle'})[$('training-mode').value]||null:null,
    ...(mode==='quick'&&$('training-mode').value==='trio'?{team:trioTeam(profile,chosenTrio),rivalTeam:Object.keys(CREATURES).filter(id=>CREATURES[id].rarity!=='אגדי').sort(()=>Math.random()-.5).slice(0,3)}:{})});
  if(!match){showView('lobby');return;}
  player=match.actors[0].id;rival=match.actors[1].id;level=match.level;upgrades=match.actors[0].upgrades;sound.versus=false;document.querySelector('.player-info .fighter-lines span').textContent='אתם';renderer.setMatch(match,[skinOf(profile,match.actors[0].id),match.mirror?'night':null]);clearInput();accumulator=0;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');sound.unlock();sound.setScene('battle');sound.resume();if(mode==='wild')sound.play('voice-wild-battle',{delay:.2});
  const p=match.actors[0].spec,r=match.actors[1].spec;
  const storyStep=match.story?STEPS.find(s=>s.id===match.story):null;
  $('player-name').textContent=p.name;$('rival-name').textContent=storyStep?.kind==='mirror'?'הבבואה שלך':storyStep?.title||r.name;$('player-symbol').innerHTML=icon(p.specialIcon);$('rival-symbol').innerHTML=icon(r.specialIcon);$('rival-level').textContent=LEVELS[level].name;
  $('match-label').textContent=mode==='cup'?CUP[profile.cup.stage].title:mode==='challenge'?CHALLENGE.title:match.mode?MODES[match.mode].name:mode==='story'?islandOf(storyStep.island).name:mode==='wild'?'קרב פרא':surprise?'קרב הפתעה':'אימון';$('round-label').textContent=match.mode?({wind:'אספו '+WIND_TARGET+' נוצות והחזיקו '+WIND_HOLD+' שניות',lava:'גחלי כוח מגדילים אתכם · הלבה סוגרת',ball:'ראשון ל־'+BALL_GOALS+' גולים מנצח',trio:'שלושה מול שלושה'})[match.mode]:mode==='cup'?`שלב ${profile.cup.stage+1} מתוך 4`:mode==='challenge'?'שלב 4 מתוך 4':mode==='story'?(storyStep.kind==='free'?'ניצחון משחרר את '+r.name+' מהצל':storyStep.kind==='mirror'?'אומץ זה לפעול למרות הפחד':'ניצחון מדליק את האור '+islandOf(storyStep.island).gemName):mode==='wild'?'ניצחון משחרר את '+r.name:surprise?'יריב בהגרלה · כל ניצחון מקרב מראה חדש':'קרב בודד · אינו מקדם את המסע';
  $('special-action-icon').innerHTML=icon(p.specialIcon);$('special-action-name').textContent=p.special;$('special-button').style.setProperty('--c',p.color);
  $('arena-tip').textContent=rival==='slauz'&&match.actors[1].boss?bossAdvice:(mode==='wild'||mode==='story')&&rivalAdvice[rival]&&!match.mirror?rivalAdvice[rival]:'רווח או כפתור ירי מכוונים ליריב. זוזו כדי להתחמק.';$('arena-tip').style.opacity='1';$('match-toast').classList.remove('visible');toastUntil=0;
  $('battle-build').innerHTML=buildChips(player,upgrades);$('battle-build').hidden=!upgrades.length;$('boss-banner').hidden=!match.actors[1].boss;
  $('challenge-banner').hidden=mode!=='challenge';$('mode-banner').hidden=!match.mode;$('hold-count').hidden=true;
  if(match.mode)$('arena-tip').textContent=MODES[match.mode].goal;
  startTutorial();
  {const r=match.actors[1];if(r.boss||storyStep&&['guardian','mirror'].includes(storyStep.kind))renderer.cinematic(r.x,r.y-80,1.55,2.6);}
  $('goal-card').hidden=!match.mode;if(match.mode){$('goal-icon').innerHTML=icon(MISSION_ICON[match.mode]);$('goal-name').textContent=MODES[match.mode].name;$('goal-text').textContent=MODES[match.mode].goal;goalUntil=clock+3;}
  $('leave-button').textContent=mode==='story'?'הפסקה · חזרה למפה':mode==='quick'||mode==='wild'?'חזרה לבחירת יצור':'הפסקה · חזרה למסע';
  renderHUD();$('arena').focus({preventScroll:true});
}
let goalUntil=0;
const TUT_KEY='creature-league.tutorial';
let tutorial=null;
const TUT_TEXT={touch:['שימו אגודל בצד שמאל וגררו כדי לזוז','לחצו כדי לירות על היריב','כוח־העל שלך מלא! לחצו עליו','מעולה! עכשיו נצחו אותו!'],keys:['זוזו עם החצים או W A S D','רווח כדי לירות על היריב','כוח־העל מלא! לחצו E','מעולה! עכשיו נצחו אותו!']};
const TUT_TARGET=['joystick','fire-button','special-button',null];
function startTutorial(){
  let seen=false;try{seen=storage.getItem(TUT_KEY)==='1';}catch{}
  tutorial=null;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));
  if(seen||match.mode||match.boss||match.actors[1].boss)return;
  const me=match.actors[0];tutorial={step:0,hold:0,shots:me.stats.shots,specials:me.stats.specials,age:0,touch:matchMedia('(pointer:coarse)').matches};match.calm=true;showTutorial();
}
function showTutorial(){if(!tutorial)return;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));const t=TUT_TARGET[tutorial.step];if(t&&tutorial.touch)$(t).classList.add('tut-glow');
  const el=$('tutorial');el.hidden=false;el.dataset.step=tutorial.step;el.classList.toggle('touch',tutorial.touch);$('tut-text').textContent=TUT_TEXT[tutorial.touch?'touch':'keys'][tutorial.step];}
function endTutorial(){if(!tutorial)return;tutorial=null;if(match)match.calm=false;$('tutorial').hidden=true;document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));try{storage.setItem(TUT_KEY,'1');}catch{}}
// Each step moves on only after the child has done it.
function updateTutorial(dt){
  if(!tutorial||!match)return;if(match.status==='finished'){endTutorial();return;}if(match.status!=='playing')return;
  const me=match.actors[0];tutorial.age+=dt;
  if(tutorial.step===0){if(Math.hypot(me.moveX||0,me.moveY||0)>.3)tutorial.hold+=dt;if(tutorial.hold>.7){tutorial.step=1;showTutorial();}}
  else if(tutorial.step===1){if(me.stats.shots>=tutorial.shots+3){tutorial.step=2;match.calm=false;me.superCharge=1;tutorial.specials=me.stats.specials;showTutorial();}}
  else if(tutorial.step===2){if(me.stats.specials>tutorial.specials){tutorial.step=3;tutorial.doneAt=tutorial.age;showTutorial();}}
  else if(tutorial.age-tutorial.doneAt>2.2)endTutorial();
  if(tutorial&&tutorial.age>40)endTutorial();
}
function renderHUD(){if(!match)return;const [a,b]=match.actors;
  {const fade=renderer.wide&&match.actors.some(x=>!(x.out>0)&&renderer.offsetY+(x.y-x.spec.height*(renderer.size||1))*renderer.scale<70);document.querySelector('.battle-top').classList.toggle('hud-fade',fade);$('mode-banner').classList.toggle('hud-fade',fade);}if(!$('goal-card').hidden&&(clock>goalUntil||match.status==='playing'&&match.time>.6&&Math.hypot(a.moveX||0,a.moveY||0)>.3))$('goal-card').hidden=true;
  $('fire-button').setAttribute('aria-pressed',String(input.toggleFire));$('fire-button').classList.toggle('latched',input.toggleFire);
  $('player-health').style.width=100*a.hp/a.spec.hp+'%';$('rival-health').style.width=100*b.hp/b.spec.hp+'%';$('player-hp').textContent=Math.ceil(a.hp)+' / '+a.spec.hp;$('rival-hp').textContent=Math.ceil(b.hp)+' / '+b.spec.hp;
  const seconds=Math.max(0,Math.ceil(match.duration-match.time));$('timer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');document.querySelector('.match-clock').classList.toggle('urgent',seconds<=15);
  {const ch=a.superCharge||0,full=ch>=1;$('special-button').classList.toggle('cooling',!full);$('special-button').classList.toggle('super-ready',full);$('special-button').style.setProperty('--cooldown',(1-ch)*100+'%');$('special-button').style.setProperty('--charge',ch);$('special-cooldown').textContent=full?'מוכן!':Math.floor(ch*100)+'%';$('special-button').setAttribute('aria-label',a.spec.special+(full?', מוכן':', נטען '+Math.floor(ch*100)+' אחוז'));}
  if(match.time>8)$('arena-tip').style.opacity='0';
  if(b.boss){const phase=b.boss.phase;$('boss-banner').dataset.phase=phase;$('boss-banner').textContent={guard:'מגן קדמי · נסו מהצד',windup:'הסתערות בדרך · זוזו הצדה!',charge:'הסתערות!',recover:'עכשיו! פגיעות חזקות ב־50%'}[phase];}
  if(match.versus){const ch=b.superCharge||0,full=ch>=1;$('special-button-2').classList.toggle('cooling',!full);$('special-button-2').classList.toggle('super-ready',full);$('special-button-2').style.setProperty('--charge',ch);
    if(!match.mode)$('mode-banner').innerHTML=`<span class="mb-you">${esc(vsName(0))} <b class="mb-score">${versus.wins[0]}</b></span><span class="mb-goal">${match.roundLabel}</span><span class="mb-foe"><b class="mb-score">${versus.wins[1]}</b> ${esc(vsName(1))}</span>`;}
  const [youLabel,foeLabel]=match.versus?[esc(vsName(0)),esc(vsName(1))]:['אתם','היריב'];
  if(match.mode){const [me,foe]=match.actors;
    if(match.wind){$('mode-banner').innerHTML=`<span class="mb-you">${icon('swirl')} ${youLabel} ${me.feathers}</span><span class="mb-goal">מתוך ${WIND_TARGET}</span><span class="mb-foe">${foeLabel} ${foe.feathers}</span>`;const h=match.wind.holder;$('hold-count').hidden=h<0;if(h>=0){$('hold-count').textContent=Math.ceil(match.wind.hold);$('hold-count').classList.toggle('foe',h===1);}}
    else if(match.ball){const [s0,s1]=match.ball.score;$('mode-banner').innerHTML=`<span class="mb-you">${youLabel} <b class="mb-score">${s0}</b></span><span class="mb-goal">${match.ball.overtime?'גול זהב!':'ראשון ל־'+BALL_GOALS}</span><span class="mb-foe"><b class="mb-score">${s1}</b> ${foeLabel}</span>`;}
    else if(match.trio){const dots=(n,cls)=>`<span class="trio-dots ${cls}">${[0,1,2].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;$('mode-banner').innerHTML=`<span class="mb-you">אתם ${dots(trioLeft(match,0),'you')}</span><span class="mb-goal">שלושה מול שלושה</span><span class="mb-foe">${dots(trioLeft(match,1),'foe')} היריב</span>`;}
    else{$('mode-banner').innerHTML=`<span class="mb-you">${icon('flame')} ${match.versus?youLabel:'גחלי כוח'} ${me.power}/${MAX_POWER}</span><span class="mb-goal">${match.lava.scale<.99?'הלבה סוגרת!':'הלבה מתעוררת...'}</span><span class="mb-foe">${foeLabel} ${foe.power}/${MAX_POWER}</span>`;}}
  if(match.challenge){const next=match.covers.filter(c=>c.hp>0).sort((a,b)=>a.collapseAt-b.collapseAt)[0];$('challenge-banner').textContent=next?`מחסה מתפורר בעוד ${Math.max(0,Math.ceil(next.collapseAt-match.time))} שנ׳ · המשיכו לזוז`:'הזירה פתוחה · אין יותר מחסות!';}
  if(clock>toastUntil)$('match-toast').classList.remove('visible');
}
function toast(text,seconds=2){$('match-toast').textContent=text;$('match-toast').classList.add('visible');toastUntil=clock+seconds;}
function pauseBattle(){if(!match||screen!=='battle'||match.status==='finished'||match.status==='paused')return;previousStatus=match.status;match.status='paused';clearInput();sound.pause();if(!$('pause-dialog').open)$('pause-dialog').showModal();}
function resumeBattle(){if(!match||match.status!=='paused')return;$('pause-dialog').close();match.status=previousStatus;clearInput();accumulator=0;sound.resume();$('arena').focus({preventScroll:true});}
function leaveBattle(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());match=null;showView(mode==='versus'?'versus':mode==='story'?'story':mode==='quick'?'lobby':mode==='wild'?(wildTarget&&!isUnlocked(profile,wildTarget)?'wild':'lobby'):journeyView(profile));}
function onFinish(){
  if(match.versus){finishVersusRound();return;}
  const finalWin=mode==='cup'&&cupFinal&&match.winner===0;
  const storyResult=mode==='story'?recordStory(profile,match):null;if(storyResult)storyEvent=storyResult;
  const hero=match.actors[0].id,winsBefore=profile.creatures[hero]?.wins||0,wildId=storyResult?.released||match.wild,wasLocked=!!storyResult?.released||(wildId&&!isUnlocked(profile,wildId));
  recordResult(profile,match,mode);persist();clearInput();sound.setScene('lobby');if(match.winner===0)sound.play('voice-victory',{delay:.7});
  const winsAfter=profile.creatures[hero]?.wins||0,newSkin=SKINS.find(k=>k.wins>winsBefore&&k.wins<=winsAfter),released=wasLocked&&isUnlocked(profile,wildId);
  const p=match.actors[0],r=match.actors[1],stats=resultStats(match),win=match.winner===0,draw=match.winner===-1;
  const challengeWin=mode==='challenge'&&win;
  const missionStep=match.story&&STEPS.find(s=>s.id===match.story&&s.kind==='mission');
  const title=match.mode&&win?(missionStep?'המשימה הושלמה!':'ניצחון במשימה!'):match.mode&&!win&&missionStep?'כמעט!':storyResult?.step.kind==='mirror'?'ניצחת את הפחד!':storyResult?.lit&&!released?'האור נדלק!':released?CREATURES[wildId].name+(mode==='story'?' השתחרר מהצל!':' שוחרר!'):finalWin?'אלוף החופים!':challengeWin?'אלוף הזירה הפתוחה!':win?'ניצחון!':draw?'צמוד עד הסוף!':'הקרב הבא שלך.';
  const sub=match.mode&&win?(storyResult?.stars?(storyResult.stars===3?'מושלם! שלושה כוכבים.':'רוצים שלושה כוכבים? נסו שוב מהאימון.'):({wind:'החזקתם את הרוח עד הסוף!',lava:'שרדתם את טבעת הלבה!',ball:'איזה משחק! '+match.ball?.score.join(' : '),trio:'השלישייה שלכם ניצחה ביחד!'})[match.mode]):match.mode&&missionStep?(missionEased(profile,missionStep)?'בניסיון הבא יהיה קצת יותר קל. אתם יכולים!':MISSION_TIP[match.mode]):storyResult?.step.kind==='mirror'?'האור הלבן נדלק בשרשרת, והכוכב הזהוב מוביל לטירה.':mode==='story'&&!win?(draw?'כמעט! עוד ניסיון אחד.':'הצל הקטן מאמין בך. מנסים שוב, אולי בדרך אחרת?'):released&&storyResult?.lit?CREATURES[wildId].name+' השתחרר, והאור '+islandOf(storyResult.lit).gemName+' נדלק בשרשרת!':released?CREATURES[wildId].name+' מצטרף לנבחרת שלך, והקלף שלו מחכה שתהפוך אותו!':mode==='wild'?(draw?'כמעט! '+r.spec.name+' עדיין פראי. עוד ניסיון?':r.spec.name+' עדיין פראי. כל ניסיון מלמד משהו חדש.'):finalWin?'זכית בגביע! נפתחה הזירה המתפוררת, והשילוב שלך ממשיך איתך.':challengeWin?'השלמת את כל ארבעת האתגרים! תג האלוף נוסף להישגים שלך.':win?(mode==='cup'?`השלמת ${profile.cup.stage} מתוך 4 אתגרים. עכשיו בוחרים כוח, ואז ${CUP[profile.cup.stage].title} מול ${CREATURES[CUP[profile.cup.stage].rival].name}.`:surprise?'עוד קרב הפתעה מחכה לך!':'ניצחון באימון! כדי לפתוח כוחות ואתגרים, ממשיכים במסע.'):draw?'אותו אחוז חיים נשאר לשני היצורים. השלב והכוחות נשמרו לניסיון הבא.':mode==='quick'?'לכל יריב יש נקודת חולשה. מנסים דרך אחרת?':'השלב והכוחות שלך נשמרו. מנסים שוב עם דרך אחרת?';
  let tip=r.boss?(stats.weakHits>0?`ניצלת את רגע ההתאוששות של סלעוז ${stats.weakHits} פעמים!`:bossAdvice):win?p.spec.tip:r.id==='havzuk'?'הבזוק מהיר אבל יש לו פחות חיים. חכו לרגע שאחרי ההבזק.':'הגל של מיימי רחב. זוזו הצדה ושובו לירות.';
  if(match.reason==='time')tip=match.ball?'הזמן נגמר: מי שהבקיע יותר גולים ניצח.':match.trio?'הזמן נגמר: מי שנשארו לו יותר יצורים ניצח.':'הזמן נגמר: הניצחון נקבע לפי אחוז החיים שנותר לכל יצור.';
  const starCount=win?(storyResult?.stars||(p.hp/p.spec.hp>=.5?3:p.hp/p.spec.hp>=.25?2:1)):0;
  $('result-content').innerHTML=`${newSkin?`<div class="skin-unlock" style="--c:${p.spec.color}"><span class="skin-swatch skin-${newSkin.id}"></span><div><small>מראה חדש נפתח!</small><b>${p.spec.name} ${newSkin.name}</b></div></div>`:''}${finalWin||released?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${finalWin?'gold':win?'':'loss'}">${icon(finalWin?'trophy':win?'star':draw?'shield':'bolt')}</div><span class="result-kicker">${mode==='cup'?'גביע החופים':'קרב מהיר'} · ${LEVELS[match.level].name}</span><h2 class="result-title">${title}</h2><p>${sub}</p>${starCount?`<div class="result-stars" aria-label="${starCount} כוכבים">${[1,2,3].map(i=>`<span class="${i<=starCount?'on':''}" style="--d:${i*.18}s">${icon('star')}</span>`).join('')}</div>`:''}${match.ball||match.trio?`<div class="result-score"><div><strong></strong>${p.spec.name}</div><span>:</span><div><strong></strong>${r.spec.name}</div></div>`:''}${win?'':`<p class="result-tip">${tip}</p>`}`;
  if(match.ball){const s=document.querySelectorAll('.result-score strong');if(s.length>=2){s[0].textContent=match.ball.score[0];s[1].textContent=match.ball.score[1];}}
  if(match.trio){const s=document.querySelectorAll('.result-score strong');if(s.length>=2){s[0].textContent=trioLeft(match,0)+'/3';s[1].textContent=trioLeft(match,1)+'/3';}}
  document.querySelector('.result-kicker').textContent=`${mode==='cup'?'גביע החופים':mode==='challenge'?CHALLENGE.title:mode==='wild'?'קרב פרא':mode==='story'?'מסע השרשרת':surprise?'קרב הפתעה':'אימון · קרב בודד'} · ${LEVELS[match.level].name}`;
  $('result-primary').textContent=released?'הופכים את הקלף!':storyResult?'חזרה למפת השרשרת':finalWin?'לאתגר החדש שנפתח':challengeWin?'לצפייה בתג שלי':mode==='cup'&&win?'בוחרים כוח וממשיכים':mode==='quick'&&win?(surprise?'עוד קרב הפתעה!':'ממשיכים במסע'):draw?'קרב הכרעה':'מנסים שוב';
  $('result-primary').onclick=()=>{$('result-dialog').close();if(released){match=null;pendingReveal=!!storyResult;showView(storyResult?'story':'cards');revealCard(wildId,{joined:true,back:storyResult?'story':null});pendingReveal=false;}else if(storyResult){match=null;showView('story');}else if(challengeWin){match=null;showView('records');}else if(surprise&&win){startSurprise();}else if(finalWin||mode==='quick'&&win){continueJourney();}else if(mode==='cup'&&win){match=null;showView('workshop');}else startBattle(mode);};
  $('result-secondary').textContent=mode==='story'?'הפסקה · חזרה למפה':mode==='quick'||mode==='wild'?'חזרה לבחירת יצור':'הפסקה · ההתקדמות נשמרת';$('result-secondary').onclick=leaveBattle;
  const shown=match;setTimeout(()=>{if(match===shown&&!$('result-dialog').open)$('result-dialog').showModal();},1500);
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
  match=null;wildTarget=null;storyEvent=null;surprise=false;versus.players=[id,null];updateHeader();showView('lobby');
}
function renderPlayers(){
  const form=!$('player-form').hidden;$('players-grid').hidden=form;
  $('players-grid').innerHTML=players.players.map(p=>{const pp=profileOf(p.id),done=pp.story.done>=STEPS.length;
    return `<div class="player-card${p.id===players.active?' active':''}"><button class="player-pick" data-player="${p.id}"><canvas id="player-face-${p.id}" aria-hidden="true"></canvas><b></b><small>${done?'המסע הושלם!':pp.story.done?'במסע: '+(stepLabel(STEPS[pp.story.done])||''):'עוד לא התחיל'}</small></button><button class="player-edit" data-player-edit="${p.id}" aria-label="עריכה">✎</button></div>`;}).join('')+
    (players.players.length<MAX_PLAYERS?`<button class="player-card player-new" id="player-new"><span class="player-plus">+</span><b>שחקן חדש</b><small>מתחילים מסע משלך</small></button>`:'');
  players.players.forEach(p=>{const card=document.querySelector(`[data-player="${p.id}"]`);card.querySelector('b').textContent=playerName(p);card.setAttribute('aria-label','משחקים בתור '+playerName(p));livePortrait('player-face-'+p.id,faceOf(p),{skin:skinOf(profileOf(p.id),faceOf(p))});});
  document.querySelectorAll('[data-player]').forEach(el=>el.onclick=()=>{sound.click();switchPlayer(el.dataset.player);});
  document.querySelectorAll('[data-player-edit]').forEach(el=>el.onclick=()=>{sound.click();openPlayerForm(el.dataset.playerEdit);});
  if($('player-new'))$('player-new').onclick=()=>{sound.click();openPlayerForm();};
}
let editingPlayer=null,formFace='maimi';
function openPlayerForm(id=null){
  editingPlayer=id;const p=id?findPlayer(id):null;formFace=p?faceOf(p):STARTERS[Math.floor(Math.random()*STARTERS.length)];
  $('player-form').hidden=false;$('players-grid').hidden=true;$('player-form-title').textContent=p?'עריכת שחקן':'שחקן חדש';$('player-name').value=p?.name||'';$('player-save').textContent=p?'שומרים':'יוצאים לדרך!';
  drawFaces();setTimeout(()=>$('player-name').focus({preventScroll:true}),60);
}
function drawFaces(){
  $('player-faces').innerHTML=FACES.map(id=>`<button type="button" class="fighter-chip${id===formFace?' chosen':''}" data-face="${id}" aria-pressed="${id===formFace}" style="--c:${CREATURES[id].color}"><canvas id="face-${id}" aria-hidden="true"></canvas><b>${CREATURES[id].name}</b></button>`).join('');
  for(const id of FACES)livePortrait('face-'+id,id);
  document.querySelectorAll('[data-face]').forEach(el=>el.onclick=()=>{formFace=el.dataset.face;sound.click();drawFaces();});
}
function closePlayerForm(){$('player-form').hidden=true;editingPlayer=null;renderPlayers();}
function savePlayerForm(e){
  e.preventDefault();const name=$('player-name').value.replace(/[<>]/g,'').trim().slice(0,12);if(!name){$('player-name').focus();notify('כתבו שם, ואפשר גם כינוי.');return;}
  if(editingPlayer){const p=findPlayer(editingPlayer);p.name=name;p.face=formFace;savePlayers();updateHeader();closePlayerForm();return;}
  const id='p'+(Math.max(...players.players.map(p=>+p.id.slice(1)))+1);players.players.push({id,name,face:formFace});savePlayers();$('player-form').hidden=true;
  switchPlayer(id);if(STARTERS.includes(formFace)){profile.selected=formFace;persist();renderHome();}
}
// ------------------------------------------------------------------ friend battle: two players, one screen
// Best of three. Whoever loses a round gets an extra heart in the next one, so nobody falls far behind.
const VS_MODES=[{id:'',name:'קרב',icon:'bolt',text:'מי שמפיל את השני'},{id:'ball',name:'כדור הגאות',icon:'spiral',text:'ראשון ל־'+BALL_GOALS+' גולים'},{id:'wind',name:'תפוס את הרוח',icon:'swirl',text:WIND_TARGET+' נוצות, '+WIND_HOLD+' שניות'},{id:'lava',name:'טבעת הלבה',icon:'flame',text:'שורדים בלבה'}];
const VS_ARENAS=['wind','sea','fire','mirror','castle'],VS_WINS=2;
let versus={players:[null,null],ids:['maimi','havzuk'],hearts:[0,0],mode:'',wins:[0,0],round:1,catchup:[0,0]},touchVersus=false;
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
  $('versus-modes').innerHTML=VS_MODES.map(m=>`<button class="vs-mode${m.id===versus.mode?' chosen':''}" data-vs-mode="${m.id}" aria-pressed="${m.id===versus.mode}">${icon(m.icon)}<b>${m.name}</b><small>${m.text}</small></button>`).join('');
  document.querySelectorAll('[data-vs-player]').forEach(el=>el.onclick=()=>{const [n,pid]=el.dataset.vsPlayer.split(':');versus.players[+n]=pid;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-fighter]').forEach(el=>el.onclick=()=>{const [n,f]=el.dataset.vsFighter.split(':');versus.ids[+n]=f;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-heart]').forEach(el=>el.onclick=()=>{const [n,i]=el.dataset.vsHeart.split(':').map(Number);versus.hearts[n]=i;sound.click();renderVersus();});
  document.querySelectorAll('[data-vs-mode]').forEach(el=>el.onclick=()=>{versus.mode=el.dataset.vsMode;sound.click();renderVersus();});
}
const versusRoundLabel=()=>versus.wins.every(n=>n===VS_WINS-1)?'סיבוב ההכרעה':'סיבוב '+versus.round;
function startVersus(fresh=false){
  if(!art)return;if(fresh)Object.assign(versus,{wins:[0,0],round:1,catchup:[0,0]});
  mode='versus';cupFinal=false;touchVersus=matchMedia('(pointer:coarse)').matches;
  const arena=({lava:'fire',wind:'wind',ball:'sea'})[versus.mode]||VS_ARENAS[Math.floor(Math.random()*VS_ARENAS.length)];
  match=makeMatch({player:versus.ids[0],rival:versus.ids[1],level:'champion',seed:Date.now()+Math.floor(Math.random()*1e5),mode:versus.mode||null,arena,versus:true,hearts:versus.hearts.map((h,i)=>Math.min(2,h+versus.catchup[i]))});
  match.roundLabel=versusRoundLabel();
  const [a,b]=match.actors,skinA=vsSkin(0,a.id);let skinB=vsSkin(1,b.id);match.names=[vsName(0),vsName(1)];
  // The same creature on both sides: player two wears night colours so the two are easy to tell apart.
  if(a.id===b.id&&skinA===skinB)skinB=skinA==='night'?'ice':'night';
  renderer.setMatch(match,[skinA,skinB]);clearInput();accumulator=0;sound.versus=true;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');document.body.classList.add('versus-play');sound.unlock();sound.setScene('battle');sound.resume();
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
// Player one: W A S D, Space, E. Player two: arrows, Enter, right Shift. On a touch screen each player has half the screen and fires on their own.
function versusInputs(){
  const k=code=>keys.has(code)?1:0;
  return [{moveX:input.stickX+k('KeyD')-k('KeyA'),moveY:input.stickY+k('KeyS')-k('KeyW'),fire:touchVersus||!!(k('Space')||k('KeyF')),special:input.special},
    {moveX:input2.stickX+k('ArrowRight')-k('ArrowLeft'),moveY:input2.stickY+k('ArrowDown')-k('ArrowUp'),fire:touchVersus||!!(k('Enter')||k('NumpadEnter')||k('Numpad0')||k('Slash')),special:input2.special}];
}
function finishVersusRound(){
  const w=match.winner;clearInput();sound.setScene('lobby');
  if(w>=0){versus.wins[w]++;versus.catchup[1-w]=Math.min(2,versus.catchup[1-w]+1);versus.catchup[w]=0;}
  versus.round++;const done=versus.wins.some(n=>n>=VS_WINS),[a,b]=match.actors;
  const title=w<0?'תיקו!':done?'ניצחון ל'+vsName(w)+'!':'הסיבוב ל'+vsName(w)+'!';
  const sub=done?'איזה קרב! עוד אחד?':w<0?'אף אחד לא לקח את הסיבוב. עוד סיבוב!':'עוד לב ♥ ל'+vsName(1-w)+' בסיבוב הבא.';
  if(done)sound.play('voice-victory',{delay:.7});
  $('result-content').innerHTML=`${done?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${done?'gold':''}">${icon(done?'trophy':w<0?'shield':'star')}</div><span class="result-kicker">חבר נגד חבר</span><h2 class="result-title"></h2><div class="result-score versus-score"><div><strong>${versus.wins[0]}</strong><span></span></div><span>:</span><div><strong>${versus.wins[1]}</strong><span></span></div></div><p></p>`;
  document.querySelector('#result-content .result-title').textContent=title;document.querySelector('#result-content > p').textContent=sub;
  document.querySelectorAll('#result-content .versus-score div span').forEach((el,i)=>{el.textContent=vsName(i)+' · '+match.actors[i].spec.name;});
  $('result-primary').textContent=done?'עוד קרב!':'ל'+versusRoundLabel()+'!';$('result-primary').onclick=()=>{$('result-dialog').close();startVersus(done);};
  $('result-secondary').textContent='החלפת יצורים';$('result-secondary').onclick=leaveBattle;
  const shown=match;setTimeout(()=>{if(match===shown&&!$('result-dialog').open)$('result-dialog').showModal();},1500);
}
// The loop must survive any drawing error: a frozen game is worse than one missed frame.
let frameErrors=0,hitStop=0;
function frame(timestamp){
  try{frameBody(timestamp);}catch(error){if(frameErrors++<5)console.error('frame',error);window.__LEAGUE_LAST_ERROR__=String(error?.stack||error);}
  requestAnimationFrame(frame);
}
function frameBody(timestamp){
  if(!frameTime)frameTime=timestamp;const dt=Math.min(.1,(timestamp-frameTime)/1000);frameTime=timestamp;clock+=dt;
  if(screen!=='battle')for(const [canvasId,entry] of portraits){const el=$(canvasId);if(!el){portraits.delete(canvasId);continue;}if(!el.offsetParent&&!el.closest('dialog[open]'))continue;
    const locked=!isUnlocked(profile,entry.id);drawPortrait(el,entry.puppet,entry.id,clock,dt,{active:entry.opts.roster?entry.id===profile.selected:true,locked:entry.opts.roster&&locked,skin:entry.opts.roster?(locked?null:skinOf(profile,entry.id)):entry.opts.skin});}
  if(screen==='battle'&&match){
    if(match.status!=='paused'&&match.status!=='finished'){
      if(hitStop>0){hitStop-=dt;}else accumulator+=dt;
      while(accumulator>=1/60){
        if(match.versus){const [one,two]=versusInputs();step(match,one,1/60,two);input2.special=false;}else step(match,currentInput(),1/60);input.special=false;accumulator-=1/60;
        for(const e of match.events){sound.effect(e);if(e.type==='hit')renderer.shake=Math.max(renderer.shake,e.side===0?2.2:.8);if(e.type==='ko')hitStop=Math.max(hitStop,.12);if(e.type==='quake')renderer.shake=5;if(e.type==='go')toast('קדימה!',.8);
          if(e.type==='lava-warning')toast('הלבה מתעוררת!',1.4);
          const vs=match.versus;
          if(e.type==='hold-start')toast(vs?'הרוח אצל '+vsName(e.side)+'!':e.side===0?'החזיקו מעמד!':'תפילו אותו!',1.4);
          if(e.type==='ko')toast(vs?vsName(e.side)+' בחוץ לרגע!':e.side===1?'הפלתם אותו!':'חוזרים בעוד רגע',1.4);
          if(e.type==='goal'){const G=GOALS[1-e.side];renderer.cinematic(G.x,G.y-50,1.45,1.5);}
          if(e.type==='goal')toast(vs?'גול של '+vsName(e.side)+'!':e.side===0?'גול!!!':'היריב הבקיע',1.6);
          if(e.type==='ball-loose'&&match.status==='playing'&&(e.side===0||vs))toast('הפנינה נפלה!',1.1);if(e.type==='kick-far'&&(e.side===0||vs))toast('התקרבו לשער ואז בעטו',1.6);
          if(e.type==='overtime')toast('גול זהב!',1.6);
          if(e.type==='swap'){const c=CREATURES[e.id];renderer.swap(e.side,e.id,e.side===0?skinOf(profile,e.id):null);if(e.side===0){$('player-name').textContent=c.name;$('player-symbol').innerHTML=icon(c.specialIcon);$('special-action-icon').innerHTML=icon(c.specialIcon);$('special-action-name').textContent=c.special;$('special-button').style.setProperty('--c',c.color);}else{$('rival-name').textContent=c.name;$('rival-symbol').innerHTML=icon(c.specialIcon);}toast(c.name+' נכנס!',1.4);}}
        if(match.status==='finished'){const w=match.actors[match.winner>=0?match.winner:0];renderer.cinematic(w.x,w.y-70,1.5,1.9);onFinish();break;}
      }
    }
    updateTutorial(dt);renderer.render(match,dt,clock);if(clock-lastHUD>.05){renderHUD();lastHUD=clock;}
  }

}
function openHelp(){pauseBattle();if(!$('help-dialog').open)$('help-dialog').showModal();}
function handleNavigation(view){sound.click();if(screen==='battle'&&match?.status!=='finished'){pauseBattle();return;}match=null;showView(view);}
function bindControls(){
  $('quick-start').onclick=()=>{surprise=false;startBattle('quick');};$('home-play').onclick=()=>{sound.click();if(currentStep(profile))goStory();else startSurprise();};$('home-map').onclick=()=>{sound.click();showView('story');};$('home-change').onclick=()=>{sound.click();$('roster').scrollIntoView({behavior:'smooth',block:'start'});};
  $('story-continue').onclick=()=>{sound.click();showView('story');};$('story-mini').onclick=()=>{sound.click();showView('story');};$('story-go').onclick=()=>{sound.click();goStory();};$('castle-egg').onclick=tapEgg;$('castle-back').onclick=()=>showView('story');$('castle-next').onclick=revealCastle;$('cup-start').onclick=()=>startBattle('cup');$('cup-teaser').onclick=()=>showView('cup');$('journey-start').onclick=continueJourney;$('challenge-start').onclick=()=>startBattle('challenge');$('upgrade-confirm').onclick=confirmUpgrade;$('workshop-back').onclick=()=>showView('cup');
  $('difficulty').onchange=()=>{profile.level=$('difficulty').value;persist();};
  $('brand-home').onclick=()=>handleNavigation('lobby');document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>handleNavigation(el.dataset.view));document.querySelectorAll('[data-home]').forEach(el=>el.onclick=()=>showView('lobby'));
  $('sound-toggle').onclick=()=>{profile.sound=!profile.sound;sound.unlock();sound.setEnabled(profile.sound);persist();};
  // A pinch or double tap during a battle would zoom the page and move what the child sees.
  for(const type of ['gesturestart','gesturechange','dblclick'])document.addEventListener(type,e=>{if(screen==='battle')e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',e=>{if(screen==='battle'&&(e.touches.length>1||!e.target.closest('dialog')))e.preventDefault();},{passive:false});
  // A phone with rotation locked can still play upright.
  $('rotate-anyway').onclick=()=>{document.body.classList.add('portrait-ok');try{localStorage.setItem('creature-league.portrait-ok','1');}catch{}};
  try{if(localStorage.getItem('creature-league.portrait-ok')==='1')document.body.classList.add('portrait-ok');}catch{}
  $('reveal-dialog').addEventListener('close',()=>{if(screen==='story'&&storyEvent)renderStory();});
  const readCam=()=>{try{const v=localStorage.getItem('creature-league.close-camera');return v==null?true:v==='1';}catch{return true;}};renderer.closeCam=readCam();
  const camLabel=()=>{$('camera-toggle').textContent=renderer.closeCam?'מצלמה: קרובה · לחצו לכל הזירה':'מצלמה: כל הזירה · לחצו למצלמה קרובה';};camLabel();
  $('camera-toggle').onclick=()=>{sound.click();renderer.closeCam=!renderer.closeCam;renderer.cam=null;try{localStorage.setItem('creature-league.close-camera',renderer.closeCam?'1':'0');}catch{}camLabel();};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('אפשר לשחק גם בתצוגה הזאת.');}};
  $('help-open').onclick=openHelp;$('help-inline').onclick=openHelp;document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>$(el.dataset.close).close());
  $('pause-button').onclick=pauseBattle;$('resume-button').onclick=resumeBattle;$('leave-button').onclick=leaveBattle;
  $('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeBattle();});$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();leaveBattle();});
  window.addEventListener('keydown',e=>{
    if(screen!=='battle'||!match)return;
    if(e.code==='Escape'){if($('help-dialog').open)return;if(match.status==='paused'){e.preventDefault();resumeBattle();}else if(match.status!=='finished'){e.preventDefault();pauseBattle();}return;}
    if(document.querySelector('dialog[open]')||match.status==='paused'||match.status==='finished')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyJ'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='KeyE')input.special=true;
    }
    // Player two's keys sit on the right of the keyboard.
    else if(match.versus&&['Enter','NumpadEnter','Numpad0','Slash','KeyF','KeyQ','ShiftRight','Period'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='KeyQ')input.special=true;if(!e.repeat&&['ShiftRight','Period'].includes(e.code))input2.special=true;
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pauseBattle);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseBattle();});
  const canvas=$('arena');canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(match?.status!=='playing')return;sound.unlock();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);input.aim=renderer.point(e.clientX,e.clientY);if(e.button===2)input.special=true;else input.pointerFire=true;e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(input.pointerFire)input.aim=renderer.point(e.clientX,e.clientY);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{input.pointerFire=false;input.aim=null;});
  for(const [id,kind] of [['fire-button','fire'],['special-button','special']]){
    const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();if(match?.status!=='playing'&&!(kind==='fire'&&match?.status==='countdown'))return;sound.unlock();el.setPointerCapture(e.pointerId);el.classList.add('held');if(kind==='fire')input.buttonFire=true;else input[kind]=true;});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>{el.classList.remove('held');if(kind==='fire')input.buttonFire=false;});
    el.addEventListener('keydown',e=>{if(e.code==='Enter'&&(match?.status==='playing'||kind==='fire'&&match?.status==='countdown')){e.preventDefault();if(!e.repeat){if(kind==='fire')input.toggleFire=!input.toggleFire;else input[kind]=true;}}});el.addEventListener('blur',()=>{if(kind==='fire')input.buttonFire=false;});
  }
  // The joystick appears wherever the thumb lands on its side of the screen. In a friend battle the right side is player two's.
  bindStick($('stick-zone'),$('joystick'),$('joystick-knob'),input);bindStick($('stick-zone-2'),$('joystick-2'),$('joystick-knob-2'),input2);
  $('special-button-2').addEventListener('pointerdown',e=>{e.preventDefault();if(match?.status!=='playing')return;sound.unlock();try{$('special-button-2').setPointerCapture(e.pointerId);}catch{}$('special-button-2').classList.add('held');input2.special=true;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('special-button-2').addEventListener(event,()=>$('special-button-2').classList.remove('held'));
  $('home-versus').onclick=()=>{sound.click();showView('versus');};
  $('player-chip').onclick=()=>handleNavigation('players');$('player-form').addEventListener('submit',savePlayerForm);$('player-cancel').onclick=()=>{sound.click();closePlayerForm();};$('versus-start').onclick=()=>{sound.click();startVersus(true);};
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
const advance=(seconds,input={},live=false)=>{if(!storagePrefix||!match)return false;for(let i=0;i<seconds*60&&match.status!=='finished';i++){if(live&&match.versus){const [one,two]=versusInputs();step(match,one,1/60,two);input2.special=false;}else step(match,live?currentInput():{fire:true,...input},1/60);for(const e of match.events)if(e.type==='finish')onFinish();}updateTutorial(seconds);renderer.render(match,1/60,clock+=seconds);renderHUD();return match.status;};
window.__LEAGUE__=Object.freeze({advance,stick:()=>({x:+input.stickX.toFixed(2),y:+input.stickY.toFixed(2)}),audio:()=>({ctx:sound.ctx?.state||'none',scene:sound.scene,music:Object.fromEntries(Object.entries(sound.music||{}).map(([k,t])=>[k,{paused:t.el.paused,time:+t.el.currentTime.toFixed(1),ready:t.el.readyState,gain:+t.g.gain.value.toFixed(2)}]))}),skip:()=>{if(!match||match.status==='finished')return false;finish(match,0,'test');onFinish();return true;},camera:()=>({scale:+renderer.scale.toFixed(3),offsetX:Math.round(renderer.offsetX),offsetY:Math.round(renderer.offsetY),close:!!renderer.cam,cinematic:!!renderer.punch,size:renderer.size}),snapshot:()=>({screen,mode,profile:JSON.parse(JSON.stringify(profile)),match:match?{status:match.status,challenge:match.challenge,time:match.time,countdown:match.countdown,level:match.level,winner:match.winner,reason:match.reason,mode:match.mode||null,ball:match.ball?{x:match.ball.x,y:match.ball.y,carrier:match.ball.carrier,score:[...match.ball.score]}:null,wind:match.wind?{holder:match.wind.holder,feathers:match.wind.feathers.map(f=>({x:f.x,y:f.y}))}:null,lava:match.lava?{scale:match.lava.scale,embers:match.lava.embers.map(e=>({x:e.x,y:e.y}))}:null,trio:match.trio?[trioLeft(match,0),trioLeft(match,1)]:null,actors:match.actors.map(a=>({id:a.id,side:a.side,x:a.x,y:a.y,hp:a.hp,out:a.out||0,feathers:a.feathers||0,power:a.power||0,maxHp:a.spec.hp,specialCd:a.specialCd,superCharge:a.superCharge,upgrades:[...a.upgrades],boss:a.boss?{...a.boss}:null,stats:{...a.stats}})),covers:match.covers.map(c=>({...c})),zones:match.zones.map(z=>({...z})),shots:match.shots.length,shotDetails:match.shots.map(s=>({x:s.x,y:s.y,vx:s.vx,vy:s.vy,owner:s.owner})),pickup:match.pickup?{...match.pickup}:null}:null})});
async function boot(){
  $('load-retry').hidden=true;try{art=await loadArt(p=>$('loading-bar').style.width=p*100+'%');renderer=new Renderer($('arena'),art);buildRoster();renderStoryPanel();bindControls();updateHeader();showView(players.players.length>1?'players':'lobby');$('loading').hidden=true;$('app').hidden=false;requestAnimationFrame(frame);
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(error){console.error(error);$('loading-text').textContent='חלק מהציורים לא נטענו. בדקו שהמשחק נפתח דרך קובץ ההפעלה ונסו שוב.';$('load-retry').hidden=false;}
}
$('load-retry').onclick=()=>location.reload();if(location.protocol!=='file:')boot();

