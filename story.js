// The necklace journey from the kids' own story: four islands, four lights, then the golden castle.
// Everything here is data plus small pure functions, so the browser and the tests share it.
import {CREATURES,WILD,STAR_GUARDS,LEVELS,MODES,isUnlocked,makeMatch,clamp,trioLeft,formUnlocked} from './core.js';

export const ISLANDS = [
  {id:'wind', name:'אי הרוחות', gem:'#4f9d58', gemName:'הירוק'},
  {id:'sea', name:'אי הים', gem:'#2f7fc9', gemName:'הכחול'},
  {id:'fire', name:'אי האש', gem:'#d2452f', gemName:'האדום'},
  {id:'mirror', name:'אי המראה', gem:'#f4efe2', gemName:'הלבן'},
];

// Chapter 2, "The Masked Separator": worlds whose bridges were cut. Each world has one idea that runs
// through all of its steps (introduce, develop, twist, finish), and ends with a bridge scene that adds a
// piece to the living bridge around the mask shard. The design is in docs/2026-10-11 …פרק-2…Design.
export const WORLDS = [
  {id:'echo', name:'עמק ההדים', gem:'#4fc3c7', piece:'מחבר ההקשבה'},
  {id:'tracks', name:'ארץ שני המסלולים', gem:'#ff9a2e', piece:'מחבר הקצב'},
  {id:'patch', name:'יער הטלאים', gem:'#86d957', piece:'מחבר השינוי'},
  {id:'distance', name:'איי המרחק', gem:'#9fd8ff', piece:'מחבר המרחק'},
];

// Lines are spoken by the guides. "shadow" is the Little Shadow, "ron" is Ron.
// life / rivalLife tune one battle's length and its guardian's toughness (core battle life; tuned with the Mode-Sim so the bot
// whose thumb rests now and then still wins a guardian in about a minute, and the clock is almost never reached).
export const STEPS = [
  {id:'wind-free', island:'wind', kind:'free', rival:'shorshu', level:'rookie',
    intro:'שורשו כועס כל כך, שהשורשים שלו תופסים כל מה שזז. אל תכעס בחזרה. נצח אותו, והוא ייזכר מי הוא באמת.',
    after:'ראית? הצל עזב אותו. שורשו חופשי, והוא בנבחרת שלך!'},
  {id:'wind-free2', island:'wind', kind:'free', rival:'zikuk', level:'rookie',
    intro:'זיקוק מהיר כמו קרן אור. הצל שכנע אותו שהוא חייב לנצח לבד. תראה לו שביחד חזקים יותר.',
    after:'זיקוק חופשי! הוא כבר מחכה לרוץ איתך.'},
  {id:'wind-mission', island:'wind', kind:'mission', mode:'wind', opponent:'zikuk', level:'challenger',
    intro:'הרוח מפזרת נוצות קסם מגלגל הרוחות. אסוף שש נוצות והחזק אותן עשר שניות. אבל זהירות: מי שנופל, הנוצות שלו עפות!',
    easier:'הפעם הרוח קצת יותר רגועה. אתם יכולים!',
    after:'תפסת את הרוח! גלגל הרוחות מסתובב שוב.'},
  {id:'wind-guard', island:'wind', kind:'guardian', rival:'windguard', level:'challenger', rivalLife:1, title:'שומר הרוחות',
    intro:'שומר הרוחות שומר על גלגל הרוחות. הצל לחש לו שאסור לסמוך על אף אחד. תראה לו שאתה חזק, וגם טוב.',
    after:'האור הירוק נדלק בשרשרת! ושומר הרוחות עצמו בחר להצטרף אליך. עכשיו מפליגים לאי הים!'},
  {id:'sea-free', island:'sea', kind:'free', rival:'galgalor', level:'rookie',
    intro:'גלגל אור נבהל ומתגלגל לכל הכיוונים. תישאר רגוע, תתחמק ותחכה לרגע הנכון.',
    after:'גלגל אור נרגע. מבולגן, אבל שלנו!'},
  {id:'sea-free2', island:'sea', kind:'free', rival:'tehomon', level:'challenger',
    intro:'תהומון הענק נבהל מהצל ושוקע למעמקים. אל תיבהל מהגודל שלו. הוא צריך מישהו שיהיה אמיץ בשבילו.',
    after:'תהומון עלה מהמעמקים. איזה ענק טוב!'},
  {id:'sea-mission', island:'sea', kind:'mission', mode:'ball', opponent:'galgalor', level:'rookie',
    intro:'הצל גנב את פנינת הגאות! תכניס אותה לשער שלו. כשהפנינה אצלך אי אפשר לירות, אז ירי בועט אותה. ושים לב: שלוש פגיעות והיא נופלת.',
    easier:'הפעם הים קצת יותר רגוע. אתם יכולים!',
    after:'איזה גולים! הגאות חוזרת לזרום, ושומר הים מחכה לך.'},
  {id:'sea-guard', island:'sea', kind:'guardian', rival:'seaguard', level:'rookie', life:.6, rivalLife:1.1, title:'שומר הים',
    intro:'שומר הים שולט בגאות ובזרמים. אם הוא מושך אותך למערבולת, חמיקה ומיד החוצה!',
    after:'האור הכחול נדלק! הים שקט שוב, והצב העתיק מצטרף לנבחרת. עכשיו לאי האש. שם חם!'},
  {id:'fire-free', island:'fire', kind:'free', rival:'retetoz', level:'challenger',
    intro:'רטטוז מתחבא מתחת לאדמה כי הוא מפחד. כשהוא צץ פתאום לידך, תהיה מוכן.',
    after:'רטטוז יצא מהמחבוא. הוא כבר לא לבד.'},
  {id:'fire-free2', island:'fire', kind:'free', rival:'lohatan', level:'challenger',
    intro:'לוהטן כועס, והכעס שלו מאכיל את הצל. אל תכעס בחזרה. תזוז, תחכה, ותפגע ברגע הנכון.',
    after:'לוהטן נרגע. הלהבה שלו חמה עכשיו, לא שורפת.'},
  {id:'fire-mission', island:'fire', kind:'mission', mode:'lava', opponent:'lohatan', level:'challenger',
    intro:'הלבה סוגרת את הזירה! שבור את הסלעים, אסוף גחלי כוח ותגדל. ואל תעמוד בעיגולים שמהבהבים: שם הלבה מתפרצת!',
    easier:'הפעם הלבה קצת יותר רגועה. אתם יכולים!',
    after:'שרדת את טבעת הלבה! עכשיו אתה מוכן לשומר האש.'},
  {id:'fire-guard', island:'fire', kind:'guardian', rival:'fireguard', level:'rookie', life:.9, rivalLife:1.05, title:'שומר האש',
    intro:'שומר האש שומר על לב הר הגעש. הצל משתמש בכעס שלו. כשהוא יבין את זה, הוא יפסיק להילחם.',
    after:'האור האדום נדלק! אריה האש הבין שמישהו ניצל את הכעס שלו, ועכשיו הוא איתנו. נשאר אי אחד: אי המראה.'},
  {id:'mirror-free', island:'mirror', kind:'free', rival:'tzlilon', level:'challenger', life:.75,
    intro:'באי המראה הכל קצת הפוך. צלילון קטן, אבל ההיפנוט שלו חזק. אל תיתן לו לבלבל אותך.',
    after:'צלילון הוא הקטן והאמיץ ביותר. טוב שהוא איתנו.'},
  {id:'mirror-guard', island:'mirror', kind:'mirror', level:'challenger', life:1.1, rivalLife:1.35, formRival:1.12, title:'הבבואה שלך',
    intro:'כאן לא נלחמים באויב. נלחמים בבבואה שלך, בפחדים שלך. אומץ זה לא בלי פחד. אומץ זה לפעול למרות הפחד.',
    after:'האור הלבן נדלק! ותראה... כוכב זהוב חמישי מופיע בשרשרת. הוא מוביל אותנו לשער הטירה הזהובה.'},
  {id:'castle-gate', island:'castle', kind:'mission', mode:'trio', opponent:'lohatan', rivals:['lohatan','tzlilon','zikuk'], level:'challenger',
    intro:'שלושה יצורים בצל שומרים על שער הטירה. כאן נלחמים שלושה מול שלושה. תבחר נבחרת: כשיצור נופל, הבא בתור נכנס לזירה.',
    easier:'הפעם שומרי הצל קצת עייפים. אתם יכולים!',
    after:'השער נפתח! הנבחרת שלך עבדה ביחד. עכשיו לטירה.'},
  {id:'castle', island:'castle', kind:'castle',
    intro:'זו הטירה הזהובה. פעם שמרתי עליה... ואני זה ששבר את הכוכב. אני לא בורח מזה יותר. בוא נתקן אותו ביחד.',
    after:'מישהו מנתק את הגשרים בין העולמות... המפריד במסכה. הוא השאיר שבר מהמסכה שלו. ההרפתקה הבאה מתחילה.'},
  // ---- Chapter 2. The Echo Valley: listening.
  {id:'echo-hide', chapter:2, island:'echo', kind:'free', rival:'ozenav', level:'rookie', hide:true,
    intro:'משהו ממלא לאוזנב את הראש ברעש, אז הוא מתחבא. כשזזים, לא רואים אותו. עצרו רגע בשקט, ותשמעו איפה הוא.',
    after:'הנה. עכשיו הוא שוב מצליח לשמוע אותנו. אוזנב בנבחרת!'},
  {id:'echo-free', chapter:2, island:'echo', kind:'free', rival:'rishrush', level:'rookie',
    intro:'רשרוש מדבר כל כך חזק שהוא כבר לא שומע אפילו את עצמו. כשהפעמונים שלו מצלצלים, הצלילים עוד רגע עפים. שמעתם? זוזו הצידה!',
    after:'איזה שקט… נראה לי שעכשיו יש לו משהו שהוא באמת רוצה להגיד. רשרוש בנבחרת, והוא יודע לעוף!'},
  {id:'echo-mission', chapter:2, island:'echo', kind:'mission', mode:'echo', opponent:'rishrush', buddy:'ozenav', level:'rookie',
    intro:'האבנים משמיעות מנגינה. תקשיבו טוב, ואז תדרכו עליהן באותו הסדר. שכחתם? עצרו רגע: אוזנב שומע לפני כולם, והוא יראה לכם.',
    easier:'הפעם ההדים קצת יותר שקטים. אתם יכולים!',
    after:'ההדים נעלמו. בפעם הראשונה בעמק, קול שנשלח מצד אחד הגיע באמת לצד השני.'},
  {id:'echo-guard', chapter:2, island:'echo', kind:'guardian', rival:'kashevet', level:'rookie', life:.7, rivalLife:1.05, title:'קשבת',
    intro:'קשבת לא בודקת מי הכי חזק. היא בודקת אם אנחנו יודעים לעצור ולהקשיב. כשהאבן על החזה שלה מאירה, התרחקו!',
    after:'היא שמעה אותנו. עכשיו היא מוכנה לפתוח את הדרך, והיא מצטרפת לנבחרת!'},
  {id:'echo-bridge', chapter:2, island:'echo', kind:'bridge', notes:[0,2,1],
    intro:'זה גשר הקול. משני צדי התהום מחכים לשמוע. הקשיבו לשלושת הצלילים, והקישו אותם באותו הסדר.',
    after:'כשהגשר חזר, נשמעה משני צדיו אותה מילה: "שמעתי". והמחבר הראשון נכנס לשבר המסכה!'},
  // ---- The Land of Two Tracks: together, at the same pace. Its first step is the fast tiger the kids asked for.
  {id:'tracks-chase', chapter:2, island:'tracks', kind:'free', rival:'zankor', level:'rookie', flee:true,
    intro:'זנקור הוא הנמר הכי מהיר בכל העולמות. מאז שהגשר נחתך הוא רק רץ לבד, ולא מסתכל אחורה. הוא לא יחכה לכם: תפסו אותו בקליעים!',
    after:'תפסתם אותו! זנקור עצר, ובפעם הראשונה הסתכל אחורה. הנמר המהיר בנבחרת!'},
];

// Story cards: not fighters, but part of the album.
export const STORY_CARDS = {
  ron: {id:'ron', name:'רון', number:'★1', role:'שומר החיבורים', element:'כוכב', color:'#f2c14e', dark:'#8a6a1c', rarity:'אגדי', art:'./art/gen/story-ron.png',
    special:'קרן הכוכב', description:'דרקון קטן שבקע מהכוכב המתוקן. הוא מחבר מחדש מקומות ושערים שנפרדו. והוא תמיד עונה: "רון!"',
    bars:[['חיים',110,41],['חוזק',65,65],['מהירות',90,90],['הגנה',60,60],['קסם',95,95]]},
  littleShadow: {id:'littleShadow', name:'הצל הקטן', number:'★2', role:'השומר שחזר', element:'צל', color:'#8f7bd6', dark:'#2b2147', rarity:'אגדי', art:'./art/gen/story-little-shadow.png',
    special:'שרשרת חמשת האורות', description:'פעם הוא היה הצל הגדול. עכשיו הוא יודע שאפשר לתקן גם את מה ששברת.',
    bars:[['חיים',100,37],['חוזק',70,70],['מהירות',80,80],['הגנה',60,60],['קסם',70,70]]},
  maskShard: {id:'maskShard', name:'שבר המסכה', number:'★3', role:'סימן מסתורי', element:'תעלומה', color:'#c9d3dc', dark:'#3a4752', rarity:'נדיר', art:'./art/gen/story-mask-shard.png',
    special:'סמל שדרקון האור מזהה', description:'המפריד במסכה ניסה לנתק את העולמות. הוא השאיר אחריו את השבר הזה. מה פירוש הסמל?',
    bars:[]},
};
export const STORY_CARD_IDS = Object.keys(STORY_CARDS);

export const CHAPTER2_START = STEPS.findIndex(s => s.chapter === 2);
export const chapterOf = step => step?.chapter || 1;
export const inChapter2 = profile => profile.story.done >= CHAPTER2_START;
// The worlds of chapter 2 whose bridge scene is behind the player: each one adds a piece to the living bridge.
export function bridgePieces(profile) {
  return WORLDS.filter(w => {const i = STEPS.findIndex(s => s.island === w.id && s.kind === 'bridge'); return i >= 0 && profile.story.done > i;}).map(w => w.id);
}
// A world that has steps but no bridge yet is still being built: the journey waits there.
export const worldReady = id => STEPS.some(s => s.island === id && s.kind === 'bridge');
export const freshStory = () => ({done:0});
export function cleanStory(data) {return {done:Number.isInteger(data?.done)?clamp(data.done,0,STEPS.length):0};}
export const storyComplete = profile => profile.story.done >= STEPS.length;
export const currentStep = profile => storyComplete(profile) ? null : STEPS[profile.story.done];
export const stepIndex = id => STEPS.findIndex(s => s.id === id);
// An island's light is on once its last step is behind the player.
export function litIslands(profile) {
  return ISLANDS.filter(island => {const last = STEPS.map(s => s.island).lastIndexOf(island.id); return profile.story.done > last;}).map(i => i.id);
}
export const starLit = profile => litIslands(profile).length === ISLANDS.length;
const CASTLE = {id:'castle', name:'הטירה הזהובה', gem:'#e8b931', gemName:'הזהוב'};
export const islandOf = id => ISLANDS.find(i => i.id === id) ?? WORLDS.find(w => w.id === id) ?? (id === 'castle' ? CASTLE : undefined);
// Which island a still-shadowed creature waits on.
export const homeIsland = creature => CREATURES[creature]?.star ? 'castle' : STEPS.find(s => s.rival === creature)?.island ?? null;

// Two losses on the same step bring the opponent down one level: no child stays stuck, on missions or guardians.
const LEVEL_ORDER = ['beginner', 'rookie', 'challenger', 'veteran', 'champion'];
export const missionEased = (profile, step) => !!step?.level && (profile.missionLosses[step.id] || 0) >= 2;
export function missionLevel(profile, step) {
  if (!missionEased(profile, step)) return step.level;
  return LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(step.level) - 1)];
}
// Stars reward doing it well, so there is a reason to play a mission again.
export function missionStars(step, m) {
  if (m.winner !== 0) return 0;
  if (step.mode === 'lava') {const a = m.actors[0], left = a.hp / a.spec.hp; return left >= .5 ? 3 : left >= .25 ? 2 : 1;}
  if (step.mode === 'ball') {const lead = m.ball.score[0] - m.ball.score[1]; return lead >= 4 ? 3 : lead >= 2 ? 2 : 1;}
  if (step.mode === 'trio') return trioLeft(m, 0);
  if (step.mode === 'echo') {const r = m.echo.songs[1]; return r === 0 ? 3 : r === 1 ? 2 : 1;}
  return m.time < 35 ? 3 : m.time < 60 ? 2 : 1;
}
// Every battle step earns one to three stars: missions by how well the goal went, fights by the life left.
export function stepStars(step, m) {
  if (m.winner !== 0) return 0;
  if (step.kind === 'mission') return missionStars(step, m);
  const a = m.actors[0], left = a.hp / a.spec.hp; return left >= .5 ? 3 : left >= .25 ? 2 : 1;
}
export const BATTLE_STEPS = STEPS.filter(s => s.kind !== 'castle' && s.kind !== 'bridge');
export const chapterSteps = ch => BATTLE_STEPS.filter(s => chapterOf(s) === ch);
export const chapterStars = (profile, ch) => chapterSteps(ch).reduce((n, s) => n + starsOf(profile, s.id), 0);
export const starsOf = (profile, id) => profile.missionStars[id] || 0;
export const totalStars = profile => BATTLE_STEPS.reduce((n, s) => n + starsOf(profile, s.id), 0);
export function islandStars(profile, island) {const steps = BATTLE_STEPS.filter(s => s.island === island); return {got:steps.reduce((n, s) => n + starsOf(profile, s.id), 0), max:steps.length * 3};}
// A step already behind the player can be played again for more stars; it never changes the journey.
export const canReplay = (profile, id) => {const i = stepIndex(id); return i >= 0 && i < profile.story.done && STEPS[i].kind !== 'castle' && STEPS[i].kind !== 'bridge';};
// A mission against a creature the child already freed is a friendly race, not a fight with the shadow.
export const friendlyStep = (profile, step) => step?.kind === 'mission' && step.mode !== 'trio' && isUnlocked(profile, step.opponent);
// A trio team: three different released creatures, the chosen one first.
export function trioTeam(profile, wanted = null) {
  const ok = (wanted || []).filter((id, i, all) => isUnlocked(profile, id) && all.indexOf(id) === i);
  if (ok.length === 3) return ok;
  const first = isUnlocked(profile, profile.selected) ? profile.selected : 'maimi';
  return [first, ...Object.keys(CREATURES).filter(id => id !== first && isUnlocked(profile, id))].slice(0, 3);
}
export function makeStoryMatch(profile, options = {}) {
  const replay = options.replay && canReplay(profile, options.replay), step = replay ? STEPS[stepIndex(options.replay)] : currentStep(profile);
  if (!step || step.kind === 'castle' || step.kind === 'bridge') return null;
  const m = buildStoryMatch(profile, step, options, replay);
  if (replay) m.replay = true;
  if (replay || friendlyStep(profile, step)) m.friendly = true;
  return m;
}
function buildStoryMatch(profile, step, options, replay) {
  const player = isUnlocked(profile, profile.selected) ? profile.selected : 'maimi';
  // A first attempt plays as tuned: a Wonder seed sprouts only in a replay, and story rivals never grow a Power Form.
  // The reflection is as strong as the child: with the child's form unlocked it gets formRival more life.
  const forms = options.forms ?? [formUnlocked(profile, player), false];
  options = {...options, wonder:!!replay && !!options.wonder, forms, life:step.life || 1, rivalLife:(step.rivalLife || 1) * (forms[0] ? step.formRival || 1 : 1)};
  if (step.kind === 'mission') return makeMatch({...options, player, rival:step.opponent, level:missionLevel(profile, step), story:step.id, arena:step.island, mode:step.mode,
    team:step.mode === 'trio' ? trioTeam(profile, options.team) : null, rivalTeam:step.rivals || null,
    // The freed friend who helps only comes when it really is in the team, and never as the creature playing.
    buddy:step.buddy && isUnlocked(profile, step.buddy) && step.buddy !== player ? step.buddy : null,
    // Playing the friend who hears first: then the stones themselves hum the next note when the child waits.
    echoHint:!!step.buddy});
  const rival = step.kind === 'mirror' ? player : step.rival;
  return makeMatch({...options, player, rival, level:missionLevel(profile, step), story:step.id, arena:step.island, giant:step.kind === 'guardian', mirror:step.kind === 'mirror', hide:!!step.hide, flee:!!step.flee});
}
// Called after a finished story match. Returns what changed, for the screens to celebrate.
export function recordStory(profile, m) {
  const step = currentStep(profile);
  if (m.replay) return recordReplay(profile, m);
  if (!step || m.status !== 'finished' || m.story !== step.id) return null;
  if (m.winner !== 0) {profile.missionLosses[step.id] = (profile.missionLosses[step.id] || 0) + 1; return null;}
  profile.story.done++;
  const stars = stepStars(step, m);
  if (stars) profile.missionStars[step.id] = Math.max(profile.missionStars[step.id] || 0, stars);
  let released = null;
  if (step.kind !== 'mission' && WILD.includes(step.rival) && !isUnlocked(profile, step.rival)) {profile.unlocked.push(step.rival); profile.newCards.push(step.rival); released = step.rival;}
  const lit = (step.kind === 'guardian' || step.kind === 'mirror') && ISLANDS.some(i => i.id === step.island) ? step.island : null;
  return {step, released, lit, stars};
}
function recordReplay(profile, m) {
  const step = STEPS.find(s => s.id === m.story);
  if (!step || m.status !== 'finished' || m.winner !== 0) return null;
  const stars = stepStars(step, m), before = starsOf(profile, step.id);
  if (stars > before) profile.missionStars[step.id] = stars;
  return {step, replay:true, stars, best:Math.max(stars, before), improved:stars > before, released:null, lit:null};
}
export function completeCastle(profile) {
  const step = currentStep(profile);
  if (step?.kind !== 'castle') return false;
  profile.story.done++;
  for (const id of STORY_CARD_IDS) if (!profile.storyCards.includes(id)) {profile.storyCards.push(id); profile.newCards.push(id);}
  // The star guardians wake up and join.
  for (const id of STAR_GUARDS) if (!profile.unlocked.includes(id)) {profile.unlocked.push(id); profile.newCards.push(id);}
  return true;
}
// The bridge scene at the end of a world: when the notes are played back, the world's piece joins the living bridge.
export function completeBridge(profile) {
  const step = currentStep(profile);
  if (step?.kind !== 'bridge') return null;
  profile.story.done++;
  return step.island;
}
export const storyCardOwned = (profile, id) => profile.storyCards.includes(id);
export const creatureName = id => CREATURES[id]?.name ?? STORY_CARDS[id]?.name ?? '';
