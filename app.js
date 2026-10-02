import {CREATURES,LEVELS,CUP,CHALLENGE,challengeUnlocked,journeyView,makeChallengeMatch,makeMatch,step,readProfile,saveProfile,recordResult,resultStats,clamp,startCup,needsUpgrade,chooseUpgrade,STARTERS,WILD,RARITY,SKINS,isUnlocked,releasedCount,wildLevel,makeWildMatch,skinById,skinUnlocked,skinOf,chooseSkin,flipCard,cardStats} from './core.js';
import {upgradeOptions,cleanUpgrades} from './upgrades.js';
import {MODES,WIND_TARGET,WIND_HOLD,MAX_POWER,BALL_GOALS,trioLeft} from './core.js';
import {trioTeam,missionEased,missionLevel,ISLANDS,STEPS,STORY_CARDS,STORY_CARD_IDS,currentStep,storyComplete,litIslands,starLit,islandOf,homeIsland,makeStoryMatch,recordStory,completeCastle,storyCardOwned} from './story.js';
import {loadArt,createPuppet,drawPortrait,Renderer} from './art.js';
import {Sound} from './audio.js';
const $=id=>document.getElementById(id);
if('scrollRestoration' in history)history.scrollRestoration='manual';
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const storagePrefix=new URLSearchParams(location.search).has('verify')?'creature-league-check.':'';
const storage={getItem:key=>localStorage.getItem(storagePrefix+key),setItem:(key,value)=>localStorage.setItem(storagePrefix+key,value)};
let profile=readProfile(storage),art,renderer,screen='lobby',match=null,mode='quick',cupFinal=false,previousStatus='playing';
let frameTime=0,clock=0,accumulator=0,lastHUD=0,toastUntil=0,noticeTimer,saveNoticeShown=false;
const sound=new Sound();sound.enabled=profile.sound;
const keys=new Set(),input={pointerFire:false,buttonFire:false,toggleFire:false,aim:null,stickX:0,stickY:0,special:false,dash:false};
// Every animated creature picture on screen, keyed by its canvas id.
const portraits=new Map();
function livePortrait(canvasId,id,opts={}){const old=portraits.get(canvasId);portraits.set(canvasId,{id,puppet:old?.id===id?old.puppet:createPuppet(id),opts});}
let wildTarget=null,cardTarget=null,storyIntro=false,storyEvent=null,castle={phase:'mend',filled:0,taps:0};
// Where each island sits on the painted map, in percent.
const MAP_SPOTS={wind:[17,30],sea:[24,66],fire:[78,70],mirror:[84,30],castle:[50,17]};
function necklaceHTML(){const lit=litIslands(profile);return ISLANDS.map(i=>`<span class="gem${lit.includes(i.id)?' lit':''}" style="--g:${i.gem}" title="האור ${i.gemName}"></span>`).join('')+`<span class="gem star${starLit(profile)?' lit':''}" title="הכוכב הזהוב"></span>`;}
function say(id,line,{who='shadow',voice=null}={}){const g=$(id);if(!g)return;if(voice)sound.line(voice);g.querySelector('.guide-line').textContent=line;g.querySelector('.guide-name').textContent=who==='ron'?'רון':'הצל הקטן';g.querySelector('.guide-face').src=who==='ron'?'./art/gen/story-ron.png':'./art/gen/story-little-shadow.png';g.classList.remove('pop');void g.offsetWidth;g.classList.add('pop');}
function stepLabel(step){if(!step)return 'המסע הושלם!';if(step.kind==='castle')return 'הטירה הזהובה · מתקנים את הכוכב';const isl=islandOf(step.island);return isl.name+' · '+(step.kind==='mission'?'משימה: '+MODES[step.mode].name:step.kind==='free'?'משחררים את '+CREATURES[step.rival].name:step.kind==='mirror'?'הבבואה שלך':step.title);}
function renderStoryPanel(){
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
  say('story-guide',line,{voice:storyEvent?.step?'voice-shadow-after-'+storyEvent.step.id:!step?'voice-shadow-after-castle':profile.story.done===0?'voice-shadow-hello':step?.kind==='castle'?'voice-shadow-castle-door':null});
  if(storyEvent?.lit)setTimeout(()=>document.querySelector(`#story-necklace .gem:nth-child(${ISLANDS.findIndex(i=>i.id===storyEvent?.lit)+1})`)?.classList.add('just-lit'),300);
  storyEvent=null;
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
  $('castle-hint').textContent=castle.phase==='mend'?'הקישו על האורות שבשרשרת, אחד אחרי השני, כדי להחזיר את האור לכוכב.':castle.phase==='egg'?'הכוכב שלם! ובתוכו... ביצה. הקישו עליה.':'רון בקע!';
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
  windguard:'שומר הרוחות דוחף רחוק עם משב הסערה. אל תעמדו ליד הקיר!',seaguard:'הצב העתיק איטי מאוד. שמרו מרחק, וכשהוא מתקרב, חמיקה מהטבעת שלו.',fireguard:'אריה האש שואג שלושה כדורי אש. זוזו הצידה ולא אחורה.',
  lohatan:'לוהטן כבד ואיטי. זוזו הצידה מכדור האש ואל תעמדו על אדמה בוערת.',tehomon:'לתהומון המון חיים. כשמופיעה מערבולת, צאו ממנה מהר עם חמיקה.',zikuk:'זיקוק יורה קרן ישרה ורחוקה. אל תעמדו מולו בקו ישר, והתקרבו אליו.',
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
function updateHeader(){$('header-wins').textContent=profile.wins;$('cards-badge').hidden=!profile.newCards.length;$('cards-badge').textContent=profile.newCards.length;$('sound-toggle').innerHTML=icon(profile.sound?'sound':'muted');$('sound-toggle').setAttribute('aria-label',profile.sound?'השתקת צליל':'הפעלת צליל');$('sound-toggle').setAttribute('aria-pressed',String(!profile.sound));}
function showView(name){
  screen=name;for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;
  document.body.classList.toggle('battle-active',name==='battle');if(name!=='battle')chosenTrio=null;
  // On a touch screen a battle goes full screen and asks for landscape.
  if(name==='battle'&&matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>window.screen.orientation?.lock?.('landscape')).catch(()=>{});
  if(name==='battle')window.scrollTo(0,0);
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===name||el.dataset.view==='lobby'&&['cup','workshop','challenge','wild','story','castle'].includes(name)));
  if(name!=='battle'){clearInput();sound.setScene('lobby');sound.resume();}
  if(name!=='wild')storyIntro=storyIntro&&name==='battle';
  if(name==='lobby'){buildRoster();refreshSelection();renderStoryPanel();}if(name==='wild')renderWild();if(name==='story')renderStory();if(name==='castle')renderCastle();if(name==='cards')renderAlbum();if(name==='cup')renderCup();if(name==='workshop')renderWorkshop();if(name==='records')renderRecords();if(name==='challenge')renderChallenge();
  window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
}
function buildRoster(){
  $('roster').innerHTML=Object.values(CREATURES).map(c=>!isUnlocked(profile,c.id)?`<button class="creature-card locked" data-wild="${c.id}" aria-label="יצור פרא: ${c.name}. נצחו אותו כדי לשחרר" style="--accent:${c.color};--accent-glow:${c.color}1a"><div class="card-top"><span class="element-label">${icon('lock')}יצור פרא</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.element} · ${c.rarity}</span></div><div class="wild-call">${icon('lock')} מחכה ב${islandOf(homeIsland(c.id))?.name||'מסע השרשרת'}</div></div></button>`:`<button class="creature-card" data-creature="${c.id}" aria-label="בחירת ${c.name}, ${c.role}" aria-pressed="false" style="--accent:${c.color};--accent-glow:${c.color}1a"><span class="selected-mark">${icon('check')}</span><div class="card-top"><span class="element-label">${icon(c.specialIcon)}${c.element}</span></div><span class="shirt-number">${c.number}</span><canvas class="portrait" id="portrait-${c.id}" aria-hidden="true"></canvas><div class="card-copy"><div class="card-name"><h2>${c.name}</h2><span>${c.role}</span></div><div class="stat-grid"><div><strong>${c.hp}</strong><small>חיים</small><span class="stat-bar"><i style="width:${c.hp/230*100}%"></i></span></div><div><strong>${c.speed}</strong><small>מהירות</small><span class="stat-bar"><i style="width:${c.speed/298*100}%"></i></span></div><div><strong>${c.damage}</strong><small>נזק לפגיעה</small><span class="stat-bar"><i style="width:${c.damage/24*100}%"></i></span></div></div><div class="card-bottom"><span>ירי כל ${c.interval.toFixed(2)} שנ׳</span><b>${c.armor?'שריון סופג '+Math.round(c.armor*100)+'%':'כוח מיוחד כל '+c.specialCooldown+' שנ׳'}</b></div></div></button>`).join('');
  for(const c of Object.values(CREATURES))livePortrait('portrait-'+c.id,c.id,{roster:true});
  document.querySelectorAll('[data-creature]').forEach(el=>el.addEventListener('click',()=>{profile.selected=el.dataset.creature;persist();refreshSelection();sound.click();}));
  document.querySelectorAll('[data-wild]').forEach(el=>el.addEventListener('click',()=>{sound.click();notify(CREATURES[el.dataset.wild].name+' עדיין בצל. הוא מחכה ב'+(islandOf(homeIsland(el.dataset.wild))?.name||'מסע השרשרת')+'.');showView('story');}));
  $('team-count').textContent=(STARTERS.length+releasedCount(profile))+' מתוך '+Object.keys(CREATURES).length;
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
  $('wild-guide').hidden=!step;if(step)say('wild-guide',missionEased(profile,step)?step.easier+' '+step.intro:step.intro,{voice:'voice-shadow-'+step.id});
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
  $('wild-start').innerHTML=(step?.kind==='mission'?'למשימה!':step?.kind==='guardian'?'לקרב מול השומר!':step?.kind==='mirror'?'מול הבבואה!':step?'לשחרר מהצל!':'לקרב הפרא!')+' '+icon('arrow');
}
function renderAlbum(){
  const owned=[...Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),...profile.storyCards],total=Object.keys(CREATURES).length+STORY_CARD_IDS.length;
  $('album-progress').textContent=owned.length+' מתוך '+total+' קלפים'+(profile.newCards.length?' · '+profile.newCards.length+' מחכים שתהפכו אותם!':'');
  $('album-meter').style.width=owned.length/total*100+'%';
  $('album').innerHTML=Object.values(CREATURES).map(c=>{
    if(!isUnlocked(profile,c.id))return `<button class="album-slot locked" data-album-wild="${c.id}" aria-label="קלף נעול: ${c.name}. נצחו אותו בקרב פרא">${cardBack(c.id,{label:'יצור פרא'})}<span class="album-hint">${icon('lock')} נצחו את ${c.name}</span></button>`;
    if(profile.newCards.includes(c.id))return `<button class="album-slot fresh" data-album-new="${c.id}" aria-label="קלף חדש של ${c.name}. הקישו כדי להפוך">${cardBack(c.id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`;
    return `<button class="album-slot" data-album-card="${c.id}" aria-label="הקלף של ${c.name}">${cardHTML(c.id,{canvasId:'album-'+c.id,skin:skinOf(profile,c.id)})}</button>`;
  }).join('');
  for(const c of Object.values(CREATURES))if(isUnlocked(profile,c.id)&&!profile.newCards.includes(c.id))livePortrait('album-'+c.id,c.id,{skin:skinOf(profile,c.id),card:true});
  $('album-story').innerHTML=STORY_CARD_IDS.map(id=>!storyCardOwned(profile,id)?`<div class="album-slot locked">${cardBack(id,{label:'קלף סיפור'})}<span class="album-hint">${icon('lock')} בטירה הזהובה</span></div>`:profile.newCards.includes(id)?`<button class="album-slot fresh" data-album-new="${id}">${cardBack(id)}<span class="album-hint">חדש! הקישו להפוך</span></button>`:`<div class="album-slot">${storyCardHTML(id)}</div>`).join('');
  document.querySelectorAll('#album-story [data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  document.querySelectorAll('[data-album-wild]').forEach(el=>el.onclick=()=>{sound.click();openWild(el.dataset.albumWild);});
  document.querySelectorAll('[data-album-new]').forEach(el=>el.onclick=()=>revealCard(el.dataset.albumNew));
  document.querySelectorAll('[data-album-card]').forEach(el=>el.onclick=()=>{sound.click();openCard(el.dataset.albumCard);});
}
function revealCard(id,{joined=false,back=null}={}){
  const c=CREATURES[id]||STORY_CARDS[id];flipCard(profile,id);persist();
  $('reveal-back').innerHTML=cardBack(id);$('reveal-front').innerHTML=STORY_CARDS[id]?storyCardHTML(id,{big:true}):cardHTML(id,{canvasId:'reveal-art',skin:skinOf(profile,id),big:true});if(CREATURES[id])livePortrait('reveal-art',id,{skin:skinOf(profile,id),card:true});
  const d=$('reveal-dialog');d.style.setProperty('--c',c.color);$('reveal-flip').classList.remove('flipped');d.classList.remove('burst');
  $('reveal-kicker').textContent=joined?'יצור חדש בנבחרת!':'קלף חדש!';$('reveal-title').textContent='';$('reveal-text').textContent='';
  if(back){$('reveal-primary').textContent='חזרה למפת השרשרת';$('reveal-primary').onclick=()=>{d.close();showView(back);};}
  else if(!CREATURES[id]){$('reveal-primary').textContent='לאלבום הקלפים';$('reveal-primary').onclick=()=>{d.close();showView('cards');};}
  else{$('reveal-primary').textContent='לקרב עם '+c.name;$('reveal-primary').onclick=()=>{d.close();profile.selected=id;persist();showView('lobby');};}
  $('reveal-secondary').onclick=()=>{d.close();showView('cards');};
  if(!d.open)d.showModal();sound.unlock();
  setTimeout(()=>{$('reveal-flip').classList.add('flipped');d.classList.add('burst');sound.reveal(joined);$('reveal-title').textContent=c.name+(joined?' הצטרף אליך!':'');$('reveal-text').textContent=c.special+': '+c.description;},650);
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
  const achievements=[['star','הניצוץ הראשון','לנצח בקרב הראשון',profile.wins>0],['bolt','על הגל','שלושה ניצחונות ברצף',profile.bestStreak>=3],['shield','נבחרת מנצחת','ניצחון עם כל שלושת היצורים הראשונים',STARTERS.every(id=>profile.creatures[id]?.wins>0)],['bolt','שובר פראים','לשחרר יצור פרא ראשון',releasedCount(profile)>0],['star','האלבום המלא','לאסוף את כל עשרת הקלפים',releasedCount(profile)===WILD.length],['trophy','אלוף החופים','לזכות בגביע',profile.cups>0],['mountain','אלוף הזירה הפתוחה','לנצח בזירה המתפוררת',profile.challengeWins>0]];
  $('achievements').innerHTML=achievements.map(([i,title,desc,done])=>`<div class="achievement ${done?'unlocked':''}" aria-label="${title}: ${done?'הושג':'טרם הושג'}">${icon(i)}<div><strong>${title}</strong><small>${desc}</small></div></div>`).join('');
  $('winning-build').hidden=!profile.lastBuild;if(profile.lastBuild)$('winning-build').innerHTML=`<span class="micro-label">השילוב האחרון שזכה בגביע</span><h2>${CREATURES[profile.lastBuild.player].name}</h2><div class="build-chips">${buildChips(profile.lastBuild.player,profile.lastBuild.upgrades)||'ניצחון בכוחות הבסיסיים'}</div>`;
  $('creature-records').innerHTML=Object.values(CREATURES).map(c=>{const record=profile.creatures[c.id]||{wins:0,played:0,damage:0};return `<tr><td style="color:${c.color};font-weight:bold">${c.name}</td><td>${record.played}</td><td>${record.wins}</td><td>${Math.round(record.damage).toLocaleString('he-IL')}</td></tr>`;}).join('');
  $('history').innerHTML=profile.history.length?profile.history.map(h=>`<div class="history-row"><div><strong>${CREATURES[h.player].name} מול ${CREATURES[h.rival].name}</strong><small>${h.mode==='cup'?'גביע החופים':h.mode==='challenge'?CHALLENGE.title:h.mode==='wild'?'קרב פרא':'אימון'} · ${Math.round(h.damage)} נזק · ${Math.round(h.accuracy)}% דיוק</small></div><span class="history-outcome ${h.won?'won':''}">${h.draw?'תיקו':h.won?'ניצחון':'הפסד'}</span></div>`).join(''):'<p class="empty-history">הקרב הראשון שלכם עוד לפניכם. כל היצורים כבר מחכים בזירה.</p>';
}
function clearInput(){keys.clear();input.pointerFire=false;input.buttonFire=false;input.toggleFire=false;input.aim=null;input.stickX=0;input.stickY=0;input.special=false;input.dash=false;document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));$('joystick-knob').style.transform='';}
function currentInput(){
  const moveX=input.stickX+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),moveY=input.stickY+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  return {moveX,moveY,fire:input.pointerFire||input.buttonFire||input.toggleFire||keys.has('Space')||keys.has('KeyJ'),special:input.special,dash:input.dash,...(input.pointerFire&&input.aim?{aimX:input.aim.x,aimY:input.aim.y}:{})};
}
let chosenTrio=null;
const MISSION_ICON={lava:'flame',wind:'swirl',ball:'spiral',trio:'star'};
const MISSION_HINT={lava:'זוזו מהעיגולים המהבהבים והישארו בתוך הטבעת.',wind:'מי שנופל מפיל את כל הנוצות. שמרו עליהן!',ball:'עם הפנינה אי אפשר לירות: ירי בועט אותה לשער. שלוש פגיעות והיא נופלת.',trio:'כשיצור נופל, הבא בתור נכנס. כל יצור שנשאר חשוב.'};
const MISSION_TIP={lava:'אספו גחלים כדי לגדול, וזוזו מהעיגולים המהבהבים.',wind:'מי שנופל מפיל את הנוצות. החזיקו מרחק כשאתם מובילים.',ball:'כשליריב יש את הפנינה, פגעו בו שלוש פעמים או זנקו עליו בחמיקה כדי לחטוף אותה.',trio:'שמרו על החיים של כל יצור, וחכו עם הכוח המיוחד לרגע הנכון.'};
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
function startBattle(nextMode=mode){
  if(!art)return;if(wantsTrio(nextMode)&&!chosenTrio){openTeamPicker(nextMode);return;}if(nextMode==='challenge'&&!challengeUnlocked(profile)){showView('lobby');return;}mode=nextMode;cupFinal=false;
  if(nextMode==='wild'&&(!wildTarget||isUnlocked(profile,wildTarget))){showView('lobby');return;}
  if(nextMode==='story'&&!makeStoryMatch(profile)){showView('story');return;}
  let rival=$('rival').value,level=profile.level,player=isUnlocked(profile,profile.selected)?profile.selected:'maimi',upgrades=[];
  if(mode==='cup'){startCup(profile);if(needsUpgrade(profile)){showView('workshop');return;}const r=CUP[profile.cup.stage];rival=r.rival;level=r.level;cupFinal=profile.cup.stage===2;player=profile.cup.player;upgrades=profile.cup.upgrades;persist();}
  const seed=Date.now()+Math.floor(Math.random()*1e5);
  match=mode==='challenge'?makeChallengeMatch(profile,{seed}):mode==='story'?makeStoryMatch(profile,{seed,team:chosenTrio}):mode==='wild'?makeWildMatch(profile,wildTarget,{seed}):makeMatch({player,rival,level,upgrades,boss:rival==='slauz'&&!(mode==='quick'&&$('training-mode').value),seed,mode:mode==='quick'?$('training-mode').value||null:null,arena:mode==='quick'?({lava:'fire',wind:'wind',ball:'sea',trio:'castle'})[$('training-mode').value]||null:null,
    ...(mode==='quick'&&$('training-mode').value==='trio'?{team:trioTeam(profile,chosenTrio),rivalTeam:Object.keys(CREATURES).filter(id=>CREATURES[id].rarity!=='אגדי').sort(()=>Math.random()-.5).slice(0,3)}:{})});
  player=match.actors[0].id;rival=match.actors[1].id;level=match.level;upgrades=match.actors[0].upgrades;renderer.setMatch(match,[skinOf(profile,match.actors[0].id),match.mirror?'night':null]);clearInput();accumulator=0;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());showView('battle');sound.unlock();sound.setScene('battle');sound.resume();if(mode==='wild')sound.play('voice-wild-battle',{delay:.2});
  const p=match.actors[0].spec,r=match.actors[1].spec;
  const storyStep=match.story?STEPS.find(s=>s.id===match.story):null;
  $('player-name').textContent=p.name;$('rival-name').textContent=storyStep?.kind==='mirror'?'הבבואה שלך':storyStep?.title||r.name;$('player-symbol').innerHTML=icon(p.specialIcon);$('rival-symbol').innerHTML=icon(r.specialIcon);$('rival-level').textContent=LEVELS[level].name;
  $('match-label').textContent=mode==='cup'?CUP[profile.cup.stage].title:mode==='challenge'?CHALLENGE.title:match.mode?MODES[match.mode].name:mode==='story'?islandOf(storyStep.island).name:mode==='wild'?'קרב פרא':'אימון';$('round-label').textContent=match.mode?({wind:'אספו '+WIND_TARGET+' נוצות והחזיקו '+WIND_HOLD+' שניות',lava:'גחלי כוח מגדילים אתכם · הלבה סוגרת',ball:'ראשון ל־'+BALL_GOALS+' גולים מנצח',trio:'שלושה מול שלושה'})[match.mode]:mode==='cup'?`שלב ${profile.cup.stage+1} מתוך 4`:mode==='challenge'?'שלב 4 מתוך 4':mode==='story'?(storyStep.kind==='free'?'ניצחון משחרר את '+r.name+' מהצל':storyStep.kind==='mirror'?'אומץ זה לפעול למרות הפחד':'ניצחון מדליק את האור '+islandOf(storyStep.island).gemName):mode==='wild'?'ניצחון משחרר את '+r.name:'קרב בודד · אינו מקדם את המסע';
  $('special-action-icon').innerHTML=icon(p.specialIcon);$('special-action-name').textContent=p.special;
  $('arena-tip').textContent=rival==='slauz'&&match.actors[1].boss?bossAdvice:(mode==='wild'||mode==='story')&&rivalAdvice[rival]&&!match.mirror?rivalAdvice[rival]:'רווח או כפתור ירי מכוונים ליריב. זוזו כדי להתחמק.';$('arena-tip').style.opacity='1';$('match-toast').classList.remove('visible');toastUntil=0;
  $('battle-build').innerHTML=buildChips(player,upgrades);$('battle-build').hidden=!upgrades.length;$('boss-banner').hidden=!match.actors[1].boss;
  $('challenge-banner').hidden=mode!=='challenge';$('mode-banner').hidden=!match.mode;$('hold-count').hidden=true;
  if(match.mode)$('arena-tip').textContent=MODES[match.mode].goal;
  $('leave-button').textContent=mode==='story'?'הפסקה · חזרה למפה':mode==='quick'||mode==='wild'?'חזרה לבחירת יצור':'הפסקה · חזרה למסע';
  renderHUD();$('arena').focus({preventScroll:true});
}
function renderHUD(){if(!match)return;const [a,b]=match.actors;
  $('fire-button').setAttribute('aria-pressed',String(input.toggleFire));$('fire-button').classList.toggle('latched',input.toggleFire);
  $('player-health').style.width=100*a.hp/a.spec.hp+'%';$('rival-health').style.width=100*b.hp/b.spec.hp+'%';$('player-hp').textContent=Math.ceil(a.hp)+' / '+a.spec.hp;$('rival-hp').textContent=Math.ceil(b.hp)+' / '+b.spec.hp;
  const seconds=Math.max(0,Math.ceil(match.duration-match.time));$('timer').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');document.querySelector('.match-clock').classList.toggle('urgent',seconds<=15);
  for(const [button,label,cd,max,ready] of [['special-button','special-cooldown',a.specialCd,a.spec.specialCooldown,'מוכן!'],['dash-button','dash-cooldown',a.dashCd,a.spec.dashCooldown,'מוכנה']]){
    $(button).classList.toggle('cooling',cd>0);$(button).style.setProperty('--cooldown',cd/max*100+'%');$(label).textContent=cd>0?Math.ceil(cd)+' שנ׳':ready;$(button).setAttribute('aria-label',(button==='special-button'?a.spec.special:'חמיקה')+(cd>0?', מוכנה בעוד '+Math.ceil(cd)+' שניות':', מוכנה'));
  }
  if(match.time>8)$('arena-tip').style.opacity='0';
  if(b.boss){const phase=b.boss.phase;$('boss-banner').dataset.phase=phase;$('boss-banner').textContent={guard:'מגן קדמי · נסו מהצד',windup:'הסתערות בדרך · זוזו הצדה!',charge:'הסתערות!',recover:'עכשיו! פגיעות חזקות ב־50%'}[phase];}
  if(match.mode){const [me,foe]=match.actors;
    if(match.wind){$('mode-banner').innerHTML=`<span class="mb-you">${icon('swirl')} אתם ${me.feathers}</span><span class="mb-goal">מתוך ${WIND_TARGET}</span><span class="mb-foe">היריב ${foe.feathers}</span>`;const h=match.wind.holder;$('hold-count').hidden=h<0;if(h>=0){$('hold-count').textContent=Math.ceil(match.wind.hold);$('hold-count').classList.toggle('foe',h===1);}}
    else if(match.ball){const [s0,s1]=match.ball.score;$('mode-banner').innerHTML=`<span class="mb-you">אתם <b class="mb-score">${s0}</b></span><span class="mb-goal">${match.ball.overtime?'גול זהב!':'ראשון ל־'+BALL_GOALS}</span><span class="mb-foe"><b class="mb-score">${s1}</b> היריב</span>`;}
    else if(match.trio){const dots=(n,cls)=>`<span class="trio-dots ${cls}">${[0,1,2].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;$('mode-banner').innerHTML=`<span class="mb-you">אתם ${dots(trioLeft(match,0),'you')}</span><span class="mb-goal">שלושה מול שלושה</span><span class="mb-foe">${dots(trioLeft(match,1),'foe')} היריב</span>`;}
    else{$('mode-banner').innerHTML=`<span class="mb-you">${icon('flame')} גחלי כוח ${me.power}/${MAX_POWER}</span><span class="mb-goal">${match.lava.scale<.99?'הלבה סוגרת!':'הלבה מתעוררת...'}</span><span class="mb-foe">היריב ${foe.power}/${MAX_POWER}</span>`;}}
  if(match.challenge){const next=match.covers.filter(c=>c.hp>0).sort((a,b)=>a.collapseAt-b.collapseAt)[0];$('challenge-banner').textContent=next?`מחסה מתפורר בעוד ${Math.max(0,Math.ceil(next.collapseAt-match.time))} שנ׳ · המשיכו לזוז`:'הזירה פתוחה · אין יותר מחסות!';}
  if(clock>toastUntil)$('match-toast').classList.remove('visible');
}
function toast(text,seconds=2){$('match-toast').textContent=text;$('match-toast').classList.add('visible');toastUntil=clock+seconds;}
function pauseBattle(){if(!match||screen!=='battle'||match.status==='finished'||match.status==='paused')return;previousStatus=match.status;match.status='paused';clearInput();sound.pause();if(!$('pause-dialog').open)$('pause-dialog').showModal();}
function resumeBattle(){if(!match||match.status!=='paused')return;$('pause-dialog').close();match.status=previousStatus;clearInput();accumulator=0;sound.resume();$('arena').focus({preventScroll:true});}
function leaveBattle(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());match=null;showView(mode==='story'?'story':mode==='quick'?'lobby':mode==='wild'?(wildTarget&&!isUnlocked(profile,wildTarget)?'wild':'lobby'):journeyView(profile));}
function onFinish(){
  const finalWin=mode==='cup'&&cupFinal&&match.winner===0;
  const storyResult=mode==='story'?recordStory(profile,match):null;if(storyResult)storyEvent=storyResult;
  const hero=match.actors[0].id,winsBefore=profile.creatures[hero]?.wins||0,wildId=storyResult?.released||match.wild,wasLocked=!!storyResult?.released||(wildId&&!isUnlocked(profile,wildId));
  recordResult(profile,match,mode);persist();clearInput();sound.setScene('lobby');if(match.winner===0)sound.play('voice-victory',{delay:.7});
  const winsAfter=profile.creatures[hero]?.wins||0,newSkin=SKINS.find(k=>k.wins>winsBefore&&k.wins<=winsAfter),released=wasLocked&&isUnlocked(profile,wildId);
  const p=match.actors[0],r=match.actors[1],stats=resultStats(match),win=match.winner===0,draw=match.winner===-1;
  const challengeWin=mode==='challenge'&&win;
  const missionStep=match.story&&STEPS.find(s=>s.id===match.story&&s.kind==='mission');
  const title=match.mode&&win?(missionStep?'המשימה הושלמה!':'ניצחון במשימה!'):match.mode&&!win&&missionStep?'כמעט!':storyResult?.step.kind==='mirror'?'ניצחת את הפחד!':storyResult?.lit&&!released?'האור נדלק!':released?CREATURES[wildId].name+(mode==='story'?' השתחרר מהצל!':' שוחרר!'):finalWin?'אלוף החופים!':challengeWin?'אלוף הזירה הפתוחה!':win?'ניצחון!':draw?'צמוד עד הסוף!':'הקרב הבא שלך.';
  const sub=match.mode&&win?(storyResult?.stars?stars(storyResult.stars)+'  '+(storyResult.stars===3?'מושלם!':'נסו שוב מהאימון כדי להשיג שלושה כוכבים.'):({wind:'החזקתם את הרוח עד הסוף!',lava:'שרדתם את טבעת הלבה!',ball:'איזה משחק! '+match.ball?.score.join(' : '),trio:'השלישייה שלכם ניצחה ביחד!'})[match.mode]):match.mode&&missionStep?(missionEased(profile,missionStep)?'בניסיון הבא יהיה קצת יותר קל. אתם יכולים!':MISSION_TIP[match.mode]):storyResult?.step.kind==='mirror'?'האור הלבן נדלק בשרשרת, והכוכב הזהוב מוביל לטירה.':mode==='story'&&!win?(draw?'כמעט! עוד ניסיון אחד.':'הצל הקטן מאמין בך. מנסים שוב, אולי בדרך אחרת?'):released&&storyResult?.lit?CREATURES[wildId].name+' השתחרר, והאור '+islandOf(storyResult.lit).gemName+' נדלק בשרשרת!':released?CREATURES[wildId].name+' מצטרף לנבחרת שלך, והקלף שלו מחכה שתהפוך אותו!':mode==='wild'?(draw?'כמעט! '+r.spec.name+' עדיין פראי. עוד ניסיון?':r.spec.name+' עדיין פראי. כל ניסיון מלמד משהו חדש.'):finalWin?'זכית בגביע! נפתחה הזירה המתפוררת, והשילוב שלך ממשיך איתך.':challengeWin?'השלמת את כל ארבעת האתגרים! תג האלוף נוסף להישגים שלך.':win?(mode==='cup'?`השלמת ${profile.cup.stage} מתוך 4 אתגרים. עכשיו בוחרים כוח, ואז ${CUP[profile.cup.stage].title} מול ${CREATURES[CUP[profile.cup.stage].rival].name}.`:'ניצחון באימון! כדי לפתוח כוחות ואתגרים, ממשיכים במסע.'):draw?'אותו אחוז חיים נשאר לשני היצורים. השלב והכוחות נשמרו לניסיון הבא.':mode==='quick'?'לכל יריב יש נקודת חולשה. מנסים דרך אחרת?':'השלב והכוחות שלך נשמרו. מנסים שוב עם דרך אחרת?';
  let tip=r.boss?(stats.weakHits>0?`ניצלת את רגע ההתאוששות של סלעוז ${stats.weakHits} פעמים!`:bossAdvice):win?p.spec.tip:r.id==='havzuk'?'הבזוק מהיר אבל יש לו פחות חיים. חכו לרגע שאחרי ההבזק.':'הגל של מיימי רחב. זנקו הצדה עם חמיקה ושובו לירות.';
  if(match.reason==='time')tip=match.ball?'הזמן נגמר: מי שהבקיע יותר גולים ניצח.':match.trio?'הזמן נגמר: מי שנשארו לו יותר יצורים ניצח.':'הזמן נגמר: הניצחון נקבע לפי אחוז החיים שנותר לכל יצור.';
  $('result-content').innerHTML=`${newSkin?`<div class="skin-unlock" style="--c:${p.spec.color}"><span class="skin-swatch skin-${newSkin.id}"></span><div><small>מראה חדש נפתח!</small><b>${p.spec.name} ${newSkin.name}</b></div></div>`:''}${finalWin||released?'<div class="confetti">'+Array.from({length:24},(_,i)=>`<i style="left:${i*4.2}%;animation-delay:${i*.13}s;animation-duration:${2+i%3}s"></i>`).join('')+'</div>':''}<div class="result-icon ${finalWin?'gold':win?'':'loss'}">${icon(finalWin?'trophy':win?'star':draw?'shield':'bolt')}</div><span class="result-kicker">${mode==='cup'?'גביע החופים':'קרב מהיר'} · ${LEVELS[match.level].name}</span><h2 class="result-title">${title}</h2><p>${sub}</p><div class="result-score"><div><strong>${Math.round(p.hp/p.spec.hp*100)}%</strong>${p.spec.name}</div><span>:</span><div><strong>${Math.round(r.hp/r.spec.hp*100)}%</strong>${r.spec.name}</div></div><div class="result-stats"><div><strong>${stats.damage}</strong><small>נזק ליריב</small></div><div><strong>${stats.accuracy}%</strong><small>דיוק בירי</small></div><div><strong>${stats.blocked}</strong><small>נזק שנחסם בשריון</small></div></div><p class="result-tip">${tip}</p>`;
  if(match.ball){const s=document.querySelectorAll('.result-score strong');if(s.length>=2){s[0].textContent=match.ball.score[0];s[1].textContent=match.ball.score[1];}}
  if(match.trio){const s=document.querySelectorAll('.result-score strong');if(s.length>=2){s[0].textContent=trioLeft(match,0)+'/3';s[1].textContent=trioLeft(match,1)+'/3';}}
  document.querySelector('.result-kicker').textContent=`${mode==='cup'?'גביע החופים':mode==='challenge'?CHALLENGE.title:mode==='wild'?'קרב פרא':mode==='story'?'מסע השרשרת':'אימון · קרב בודד'} · ${LEVELS[match.level].name}`;
  $('result-primary').textContent=released?'הופכים את הקלף!':storyResult?'חזרה למפת השרשרת':finalWin?'לאתגר החדש שנפתח':challengeWin?'לצפייה בתג שלי':mode==='cup'&&win?'בוחרים כוח וממשיכים':mode==='quick'&&win?'ממשיכים במסע':draw?'קרב הכרעה':'מנסים שוב';
  $('result-primary').onclick=()=>{$('result-dialog').close();if(released){match=null;showView(storyResult?'story':'cards');revealCard(wildId,{joined:true,back:storyResult?'story':null});}else if(storyResult){match=null;showView('story');}else if(challengeWin){match=null;showView('records');}else if(finalWin||mode==='quick'&&win){continueJourney();}else if(mode==='cup'&&win){match=null;showView('workshop');}else startBattle(mode);};
  $('result-secondary').textContent=mode==='story'?'הפסקה · חזרה למפה':mode==='quick'||mode==='wild'?'חזרה לבחירת יצור':'הפסקה · ההתקדמות נשמרת';$('result-secondary').onclick=leaveBattle;
  $('result-dialog').showModal();
}
// The loop must survive any drawing error: a frozen game is worse than one missed frame.
let frameErrors=0;
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
      accumulator+=dt;
      while(accumulator>=1/60){
        step(match,currentInput(),1/60);input.special=false;input.dash=false;accumulator-=1/60;
        for(const e of match.events){sound.effect(e);if(e.type==='hit'&&e.side===0)renderer.shake=3;if(e.type==='quake')renderer.shake=5;if(e.type==='collapse')toast('מחסה התפורר · מחפשים מקום חדש',1.5);if(e.type==='pickup-ready')toast('גביש חיים הופיע במרכז');if(e.type==='heal'&&e.side===0)toast('+'+Math.round(e.amount)+' חיים!');if(e.type==='go')toast('קדימה!',1);
          if(e.type==='lava-warning')toast('הלבה מתעוררת! הישארו בתוך הטבעת',2);if(e.type==='ember'&&e.side===0)toast('גחלת כוח! גדלת! ('+e.power+'/'+MAX_POWER+')',1.4);
          if(e.type==='hold-start')toast(e.side===0?'החזיקו מעמד! עוד '+WIND_HOLD+' שניות!':'היריב מחזיק את הרוח! תפילו אותו!',2);
          if(e.type==='ko')toast(match.wind?(e.side===1?'הפלתם אותו! הנוצות שלו עפו!':'נפלתם! הנוצות עפו... חוזרים בעוד רגע'):(e.side===1?'הפלתם אותו! הוא חוזר בעוד רגע':'נפלתם! חוזרים בעוד רגע'),2);
          if(e.type==='goal')toast(e.side===0?'גול!!! '+e.score[0]+' : '+e.score[1]:'היריב הבקיע. '+e.score[0]+' : '+e.score[1]+' · הפנינה אצלכם',2.2);
          if(e.type==='steal')toast(e.side===0?'חטפתם את הפנינה!':'היריב חטף את הפנינה!',1.4);if(e.type==='ball-loose'&&match.status==='playing')toast(e.side===1?'הפנינה נפלה לו! תפסו אותה!':'הפנינה נפלה! תפסו אותה מהר',1.4);
          if(e.type==='overtime')toast('תיקו! הגול הבא מנצח!',2.5);
          if(e.type==='swap'){const c=CREATURES[e.id];renderer.swap(e.side,e.id,e.side===0?skinOf(profile,e.id):null);if(e.side===0){$('player-name').textContent=c.name;$('player-symbol').innerHTML=icon(c.specialIcon);$('special-action-icon').innerHTML=icon(c.specialIcon);$('special-action-name').textContent=c.special;}else{$('rival-name').textContent=c.name;$('rival-symbol').innerHTML=icon(c.specialIcon);}toast(e.side===0?c.name+' נכנס לזירה!':'היריב שולח את '+c.name+'!',1.8);}}
        if(match.status==='finished'){onFinish();break;}
      }
    }
    renderer.render(match,dt,clock);if(clock-lastHUD>.05){renderHUD();lastHUD=clock;}
  }

}
function openHelp(){pauseBattle();if(!$('help-dialog').open)$('help-dialog').showModal();}
function handleNavigation(view){sound.click();if(screen==='battle'&&match?.status!=='finished'){pauseBattle();return;}match=null;showView(view);}
function bindControls(){
  $('quick-start').onclick=()=>startBattle('quick');$('story-continue').onclick=()=>{sound.click();showView('story');};$('story-mini').onclick=()=>{sound.click();showView('story');};$('story-go').onclick=()=>{sound.click();goStory();};$('castle-egg').onclick=tapEgg;$('castle-back').onclick=()=>showView('story');$('castle-next').onclick=()=>{const next=profile.newCards.find(id=>STORY_CARD_IDS.includes(id));if(next)revealCard(next,{back:'story'});else showView('cards');};$('cup-start').onclick=()=>startBattle('cup');$('cup-teaser').onclick=()=>showView('cup');$('journey-start').onclick=continueJourney;$('challenge-start').onclick=()=>startBattle('challenge');$('upgrade-confirm').onclick=confirmUpgrade;$('workshop-back').onclick=()=>showView('cup');
  $('difficulty').onchange=()=>{profile.level=$('difficulty').value;persist();};
  $('brand-home').onclick=()=>handleNavigation('lobby');document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>handleNavigation(el.dataset.view));document.querySelectorAll('[data-home]').forEach(el=>el.onclick=()=>showView('lobby'));
  $('sound-toggle').onclick=()=>{profile.sound=!profile.sound;sound.unlock();sound.setEnabled(profile.sound);persist();};
  // A pinch or double tap during a battle would zoom the page and move what the child sees.
  for(const type of ['gesturestart','gesturechange','dblclick'])document.addEventListener(type,e=>{if(screen==='battle')e.preventDefault();},{passive:false});
  document.addEventListener('touchmove',e=>{if(screen==='battle'&&(e.touches.length>1||!e.target.closest('dialog')))e.preventDefault();},{passive:false});
  $('rotate-skip').onclick=()=>{document.body.classList.add('portrait-ok');renderer.cam=null;};
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('אפשר לשחק גם בתצוגה הזאת.');}};
  $('help-open').onclick=openHelp;$('help-inline').onclick=openHelp;document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>$(el.dataset.close).close());
  $('pause-button').onclick=pauseBattle;$('resume-button').onclick=resumeBattle;$('leave-button').onclick=leaveBattle;
  $('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeBattle();});$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();leaveBattle();});
  window.addEventListener('keydown',e=>{
    if(screen!=='battle'||!match)return;
    if(e.code==='Escape'){if($('help-dialog').open)return;if(match.status==='paused'){e.preventDefault();resumeBattle();}else if(match.status!=='finished'){e.preventDefault();pauseBattle();}return;}
    if(document.querySelector('dialog[open]')||match.status==='paused'||match.status==='finished')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE','ShiftLeft','ShiftRight','KeyJ'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='KeyE')input.special=true;if(!e.repeat&&e.code.startsWith('Shift'))input.dash=true;
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pauseBattle);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseBattle();});
  const canvas=$('arena');canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(match?.status!=='playing')return;sound.unlock();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);input.aim=renderer.point(e.clientX,e.clientY);if(e.button===2)input.special=true;else input.pointerFire=true;e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(input.pointerFire)input.aim=renderer.point(e.clientX,e.clientY);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{input.pointerFire=false;input.aim=null;});
  for(const [id,kind] of [['fire-button','fire'],['special-button','special'],['dash-button','dash']]){
    const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();if(match?.status!=='playing'&&!(kind==='fire'&&match?.status==='countdown'))return;sound.unlock();el.setPointerCapture(e.pointerId);el.classList.add('held');if(kind==='fire')input.buttonFire=true;else input[kind]=true;});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>{el.classList.remove('held');if(kind==='fire')input.buttonFire=false;});
    el.addEventListener('keydown',e=>{if(e.code==='Enter'&&(match?.status==='playing'||kind==='fire'&&match?.status==='countdown')){e.preventDefault();if(!e.repeat){if(kind==='fire')input.toggleFire=!input.toggleFire;else input[kind]=true;}}});el.addEventListener('blur',()=>{if(kind==='fire')input.buttonFire=false;});
  }
  const joystick=$('joystick');let stickPointer=null;
  function setStick(e){const rect=document.querySelector('.joystick-ring').getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,r=rect.width*.42;let x=(e.clientX-cx)/r,y=(e.clientY-cy)/r;const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}input.stickX=x;input.stickY=y;$('joystick-knob').style.transform=`translate(${x*r}px,${y*r}px)`;}
  joystick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);setStick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)setStick(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stickPointer){stickPointer=null;input.stickX=0;input.stickY=0;$('joystick-knob').style.transform='';}});
  for(const type of ['pointerdown','touchend','click','keydown'])document.addEventListener(type,()=>{if(sound.ctx?.state!=='running')sound.unlock();},{passive:true});
}
// Read-only diagnostics. Browser journeys still operate the real controls.
// Verification only: advance a battle by simulated time and draw one frame, even in a hidden tab.
const advance=(seconds,input={})=>{if(!storagePrefix||!match)return false;for(let i=0;i<seconds*60&&match.status!=='finished';i++){step(match,{fire:true,...input},1/60);for(const e of match.events)if(e.type==='finish')onFinish();}renderer.render(match,1/60,clock+=seconds);renderHUD();return match.status;};
window.__LEAGUE__=Object.freeze({advance,snapshot:()=>({screen,mode,profile:JSON.parse(JSON.stringify(profile)),match:match?{status:match.status,challenge:match.challenge,time:match.time,countdown:match.countdown,level:match.level,winner:match.winner,reason:match.reason,actors:match.actors.map(a=>({id:a.id,side:a.side,x:a.x,y:a.y,hp:a.hp,maxHp:a.spec.hp,specialCd:a.specialCd,dashCd:a.dashCd,upgrades:[...a.upgrades],boss:a.boss?{...a.boss}:null,stats:{...a.stats}})),covers:match.covers.map(c=>({...c})),zones:match.zones.map(z=>({...z})),shots:match.shots.length,shotDetails:match.shots.map(s=>({x:s.x,y:s.y,vx:s.vx,vy:s.vy,owner:s.owner})),pickup:match.pickup?{...match.pickup}:null}:null})});
async function boot(){
  $('load-retry').hidden=true;try{art=await loadArt(p=>$('loading-bar').style.width=p*100+'%');renderer=new Renderer($('arena'),art);buildRoster();renderStoryPanel();bindControls();updateHeader();showView(journeyView(profile));$('loading').hidden=true;$('app').hidden=false;requestAnimationFrame(frame);
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(error){console.error(error);$('loading-text').textContent='חלק מהציורים לא נטענו. בדקו שהמשחק נפתח דרך קובץ ההפעלה ונסו שוב.';$('load-retry').hidden=false;}
}
$('load-retry').onclick=()=>location.reload();if(location.protocol!=='file:')boot();

