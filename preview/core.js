// The simulation is independent of the browser. Positions are feet on the arena floor.
import {cleanUpgrades,buildSpec,UPGRADE_IDS} from './upgrades.js';
import {WONDERS,WONDER_IDS,WONDER_TIMES,wonderById,setupWonder,stepWonder,wonderGoal} from './wonders.js';
import {HATS,HAT_IDS,HAT_SLOTS,HAT_TIERS,HAT_SOURCES,hatById,boxHats} from './hats.js';
import {FORM_CREDIT,LAB_CREATURES,FORM_OPTIONS,formImg,LAB_NAMES,MECHS,MECH_IDS,LAB_MECHS,LAB_TUNE,cleanDesign,cleanLab} from './forms.js';
import {NO_COPY,mixKey,MIX_NAMES,MIX_FALLBACK} from './mixes.js';
import * as tracks from './tracks.js';
export {WONDERS,WONDER_IDS,WONDER_TIMES,wonderById};
export {HATS,HAT_IDS,HAT_SLOTS,HAT_TIERS,HAT_SOURCES,hatById,boxHats,FORM_CREDIT,LAB_CREATURES,FORM_OPTIONS,formImg,LAB_NAMES,MECHS,MECH_IDS,LAB_MECHS,LAB_TUNE,cleanDesign,cleanLab,NO_COPY,mixKey,MIX_NAMES,MIX_FALLBACK};
export const {HILL_TARGET,HILL_R,HILL_MOVE,HILL_WARN,HILL_SPOTS,HILL_SHARE,HILL_OUT,RACE_GATES,RACE_TOGETHER,RACE_PACE,RACE_SPOTS,RACE_FILL,GATE_R,RHYTHM_BPM,CRACK_WINDOW,SPECTACLE_COUNTDOWN,SPECTACLE_BEAT,DRUM_TILES}=tracks;
export const WORLD = { width: 1280, height: 720, cx: 640, cy: 395, rx: 536, ry: 251 };
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CREATURES = Object.freeze({
  maimi: { id:'maimi', magic:70, name:'מיימי', element:'מים', role:'שולט במרחק', color:'#49d9ef', dark:'#096c92', hp:190, speed:244, damage:13, interval:.39, shotSpeed:560, armor:0, radius:23, height:112, specialCooldown:7, special:'גל גאות', specialIcon:'wave', description:'גל רחב שדוחף את היריב ומפנה לך מקום.', tip:'שמרו מרחק. גל הגאות מרחיק את היריב גם כשאין לאן לברוח.', number:'07', rarity:'נדיר', starter:true, aiRange:290, specialRange:540 },
  havzuk: { id:'havzuk', magic:75, name:'הבזוק', element:'חשמל', role:'מהיר ומפתיע', color:'#ffe06b', dark:'#a7650d', hp:150, speed:298, damage:8, interval:.25, shotSpeed:700, armor:0, radius:20, height:108, specialCooldown:6, special:'הבזק חשמלי', specialIcon:'bolt', description:'זינוק לכיוון התנועה ופרץ חשמל במקום הנחיתה.', tip:'זוזו בזמן הירי. כוונו את ההבזק ליד היריב כדי לחשמל אותו.', number:'10', rarity:'רגיל', starter:true, restCharge:3, aiRange:225, specialRange:310 },
  slauz: { id:'slauz', magic:80, name:'סלעוז', element:'עוצמה', role:'חזק ועמיד', color:'#ffb786', dark:'#a15324', hp:230, speed:182, damage:24, interval:.72, shotSpeed:440, armor:.16, radius:30, height:85, specialCooldown:8, special:'רעידת אדמה', specialIcon:'mountain', description:'רעידה חזקה סביבך ושריון מוגבר לשתי שניות.', tip:'התקרבו דרך מחסה. הרעידה פוגעת גם מעבר לאבן.', number:'04', rarity:'נדיר', starter:true, facesLeft:true, shotRadius:10, aiRange:175, specialRange:180 },
  lohatan: { id:'lohatan', magic:85, name:'לוהטן', element:'אש', role:'כבד ולוהט', color:'#ff7a3d', dark:'#9c2b0c', hp:215, speed:205, damage:22, interval:.62, shotSpeed:470, armor:.08, radius:26, height:122, specialCooldown:7, special:'כדור אש', specialIcon:'flame', description:'כדור אש ענק שמתפוצץ ומשאיר אדמה בוערת.', tip:'כוונו את כדור האש לאן שהיריב בורח. האש על הרצפה סוגרת לו את הדרך.', number:'21', rarity:'נדיר', facesLeft:true, shotRadius:11, aiRange:240, specialRange:520 },
  tehomon: { id:'tehomon', magic:90, name:'תהומון', element:'מים', role:'ענק הים העמוק', color:'#4f86ff', dark:'#14327e', hp:265, speed:165, damage:14, interval:.46, shotSpeed:520, armor:.1, radius:30, height:112, specialCooldown:8, special:'מערבולת', specialIcon:'swirl', description:'מערבולת ענקית שמושכת את היריב פנימה, מאטה אותו ובולעת את הקליעים שלו.', tip:'הניחו את המערבולת על היריב ותקפו כשהוא תקוע בתוכה.', number:'33', rarity:'אגדי', facesLeft:true, aiRange:270, specialRange:420 },
  zikuk: { id:'zikuk', magic:80, name:'זיקוק', element:'אור', role:'צלף מדויק', color:'#ffc93d', dark:'#6b3fa8', hp:140, speed:285, damage:15, interval:.42, shotSpeed:900, armor:0, radius:21, height:100, specialCooldown:6.5, special:'קרן אור', specialIcon:'sun', description:'קרן אור ישרה שחוצה את כל הזירה ופוגעת מיד.', tip:'שמרו מרחק. הקרן פוגעת רחוק, אבל רק בקו ישר.', number:'12', rarity:'נדיר', facesLeft:true, aiRange:380, specialRange:760 },
  retetoz: { id:'retetoz', magic:70, name:'רטטוז', element:'רעד', role:'מפתיע מתחת לאדמה', color:'#e0a96d', dark:'#7a4a22', hp:195, speed:230, damage:12, interval:.36, shotSpeed:600, armor:.05, radius:24, height:88, specialCooldown:7, special:'מחילה', specialIcon:'burrow', description:'נעלם מתחת לאדמה, צץ ממש ליד היריב ומרעיד הכל.', tip:'השתמשו במחילה כשהיריב רחוק: אתם צצים ממש לידו.', number:'08', rarity:'רגיל', aiRange:200, specialRange:900, specialMin:170 },
  tzlilon: { id:'tzlilon', magic:95, name:'צלילון', element:'היפנוט', role:'קטן ואמיץ', color:'#b88cff', dark:'#5b2ea6', hp:130, speed:300, damage:9, interval:.27, shotSpeed:640, armor:0, radius:19, height:92, specialCooldown:9, special:'היפנוט', specialIcon:'spiral', description:'גל מחשבה שמהפנט את היריב: הוא קופא במקום ולא יכול לתקוף.', tip:'התקרבו, הפנטו ותקפו בכל הכוח כשהיריב מסוחרר.', number:'01', rarity:'אגדי', aiRange:230, specialRange:230 },
  shorshu: { id:'shorshu', magic:75, name:'שורשו', element:'טבע', role:'שומר היער', color:'#86d957', dark:'#2f6a1c', hp:220, speed:195, damage:7, interval:.5, shotSpeed:520, armor:.12, radius:26, height:96, specialCooldown:7.5, special:'שורשים', specialIcon:'leaf', description:'שורשים צומחים מתחת ליריב ותופסים אותו במקום.', tip:'מקרוב זה הכי חזק: שלושה זרעים יחד פוגעים בבת אחת.', number:'15', rarity:'רגיל', facesLeft:true, spread:3, shotLife:.85, aiRange:170, specialRange:460 },
  windguard: { id:'windguard', magic:90, name:'שומר הרוחות', element:'רוח', role:'ציפור הסערה', color:'#3cc7c9', dark:'#16626a', hp:205, speed:270, damage:13, interval:.34, shotSpeed:760, armor:.06, radius:26, height:124, specialCooldown:7, special:'משב סערה', specialIcon:'swirl', description:'טורנדו שהולך קדימה, סוחב את היריב איתו ובסוף זורק אותו.', tip:'שלחו את הטורנדו כשהיריב בדרך שלו: הוא נסחב ולא יכול לירות.', number:'41', rarity:'אגדי', facesLeft:true, flies:true, aiRange:300, specialRange:560, guardian:true },
  seaguard: { id:'seaguard', magic:85, name:'שומר הים', element:'מים', role:'הצב העתיק', color:'#2f8fd6', dark:'#10467a', hp:290, speed:150, damage:17, interval:.5, shotSpeed:470, armor:.2, radius:32, height:112, specialCooldown:8, special:'טבעת הגאות', specialIcon:'wave', description:'טבעת מי גאות סביב הצב: עוצרת את הקליעים של היריב ודוחפת מי שנוגע בה.', tip:'הפעילו את הטבעת כשהיריב יורה עליכם: הקליעים שלו נעצרים במים.', number:'42', rarity:'אגדי', facesLeft:true, shotRadius:11, aiRange:190, specialRange:320 },
  fireguard: { id:'fireguard', magic:90, name:'שומר האש', element:'אש', role:'אריה הלבה', color:'#ff8a2a', dark:'#8a2c0a', hp:235, speed:230, damage:19, interval:.48, shotSpeed:560, armor:.1, radius:28, height:118, specialCooldown:7.5, special:'שאגת להבה', specialIcon:'flame', description:'שאגת אש קדימה: שורפת מיד את מי שמולו ומשאירה רצפה בוערת.', tip:'השאגה קצרה: התקרבו ליריב לפני שאתם שואגים.', number:'43', rarity:'אגדי', facesLeft:true, shotRadius:10, aiRange:240, specialRange:260 },
  zoharon: { id:'zoharon', magic:95, name:'זוהרון', element:'אור', role:'דרקון הכוכבים', color:'#ffc23a', dark:'#8a5a0a', hp:215, speed:250, damage:15, interval:.38, shotSpeed:720, armor:.06, radius:27, height:120, specialCooldown:7, special:'מטר כוכבים', specialIcon:'star', description:'מטר כוכבים נופל סביב היריב, אחד אחרי השני. כל כוכב מסמן עיגול זהוב לפני שהוא נוחת.', tip:'הפעילו את המטר כשהיריב עומד במקום או ליד הקיר: קשה לברוח מכל הכוכבים.', number:'44', rarity:'אגדי', facesLeft:true, aiRange:300, specialRange:560, star:true },
  kokhavit: { id:'kokhavit', magic:95, name:'כוכבית', element:'אור', role:'אילת הבדולח', color:'#ffe27a', dark:'#7a6418', hp:200, speed:275, damage:12, interval:.32, shotSpeed:700, armor:.04, radius:25, height:126, specialCooldown:7, special:'לב של אור', specialIcon:'shield', description:'מחזירה לעצמה חיים ומקבלת מגן אור שבולע את שתי הפגיעות הבאות.', tip:'שמרו את הסופר לרגע שהחיים יורדים. המגן עוצר גם את הסופר של היריב.', number:'45', rarity:'אגדי', facesLeft:true, aiRange:280, specialRange:2000, star:true, female:true },
  // Chapter 2: the Echo Valley, and the tiger of the Land of Two Tracks (a fast tiger and birds that fly, as the kids asked).
  ozenav: { id:'ozenav', magic:80, name:'אוזנב', element:'קול', role:'שומע לפני כולם', color:'#3fc6c9', dark:'#0f5e66', hp:165, speed:282, damage:11, interval:.3, shotSpeed:680, armor:.02, radius:22, height:92, specialCooldown:7, special:'שומע לפני כולם', specialIcon:'ear', description:'האוזניים הענקיות שלו שומעות כל קליע שמתקרב. לכמה שניות הקליעים מחטיאים אותו, והוא זז מהר יותר.', tip:'הפעילו כשהיריב יורה עליכם הרבה: הקליעים יחטיאו, ובינתיים אתם תוקפים.', number:'49', rarity:'נדיר', facesLeft:true, aiRange:330, specialRange:600 },
  rishrush: { id:'rishrush', magic:85, name:'רשרוש', element:'קול', role:'פטפטן מצלצל', color:'#d78bd8', dark:'#6b2f78', hp:175, speed:262, damage:11, interval:.32, shotSpeed:640, armor:.03, radius:23, height:96, specialCooldown:7, special:'עוד פעם!', specialIcon:'bell', description:'הפעמונים שלו מצלצלים ומאירים, ואז עיגול של צלילים עף לכל הכיוונים. רגע אחר כך: עוד פעם!', tip:'כשהפעמונים מצלצלים, הצלילים עוד רגע יוצאים. התקרבו ליריב לפני כן: מקרוב יותר צלילים פוגעים.', number:'50', rarity:'נדיר', facesLeft:true, flies:true, tell:.6, aiRange:240, specialRange:330 },
  kashevet: { id:'kashevet', magic:95, name:'קשבת', element:'קול', role:'שומרת עמק ההדים', color:'#9fb8ff', dark:'#24306b', hp:275, speed:232, damage:15, interval:.42, shotSpeed:600, armor:.1, radius:28, height:128, specialCooldown:8, special:'שקט מוחלט', specialIcon:'muted', description:'האבן על החזה שלה מאירה, ואז יוצא גל של שקט: מי שהגל פוגע בו לא יכול לירות לרגע.', tip:'כשהאבן על החזה מאירה, התרחקו: הגל מגיע עוד רגע. מי שמחוץ לגל ממשיך לירות.', number:'51', rarity:'אגדי', facesLeft:true, female:true, flies:true, guardian:true, tell:.7, phase2:true, aiRange:280, specialRange:270 },
  zankor: { id:'zankor', magic:85, name:'זנקור', element:'מהירות', role:'הנמר המהיר', color:'#ff9a2e', dark:'#7a3a06', hp:170, speed:330, damage:12, interval:.3, shotSpeed:720, armor:.03, radius:24, height:100, specialCooldown:6, special:'זינוק', specialIcon:'bolt', description:'הנמר הכי מהיר בליגה. בזינוק הוא חוצה את הזירה כמו ברק ופוגע בכל מי שבדרך.', tip:'זנקו ישר דרך היריב: בזמן הזינוק שום דבר לא פוגע בכם.', number:'52', rarity:'נדיר', facesLeft:true, aiRange:300, specialRange:460, specialMin:120 },
  // The Land of Two Tracks: the armoured one who never gives up, and the copper deer whose antlers swing like pendulums.
  // The deer's shots come a little slower (.48): at .4 the child's deer won every quick fight, even at veteran with a resting thumb.
  // (As a guardian it shoots only on the beat, so its story fight does not change.)
  tzadon: { id:'tzadon', magic:80, name:'צעדון', element:'עוצמה', role:'משוריין שלא מוותר', color:'#d9824a', dark:'#6e3415', hp:250, speed:178, damage:17, interval:.55, shotSpeed:500, armor:.18, radius:29, height:92, specialCooldown:8, special:'צעדי שריון', specialIcon:'shield', description:'שלוש דריכות כבדות סביבו, כל אחת רחבה יותר. בזמן הדריכות השריון שלו חזק במיוחד.', tip:'התקרבו ליריב לפני הדריכות: כל דריכה מגיעה רחוק יותר.', number:'53', rarity:'נדיר', facesLeft:true, shotRadius:10, aiRange:190, specialRange:200 },
  rhythmdeer: { id:'rhythmdeer', magic:95, name:'אייל הקצב', element:'קול', role:'שומר ארץ שני המסלולים', color:'#e0893f', dark:'#7a3e12', hp:240, speed:250, damage:14, interval:.48, shotSpeed:640, armor:.08, radius:28, height:132, specialCooldown:7.5, special:'מטוטלת הקצב', specialIcon:'bell', description:'המטוטלות על הקרניים שלו מתנדנדות בקצב, וגל קול רחב נע מצד לצד מולו.', tip:'הקשיבו לקצב: בין פעימה לפעימה יש רגע לצאת מהמטוטלת.', number:'54', rarity:'אגדי', facesLeft:true, guardian:true, aiRange:260, specialRange:230 },
  // Box creatures: found only in a gold box, where the child chooses.
  chutal: { id:'chutal', magic:85, name:'חוטל', element:'מים', role:'לוכדת החוטים', color:'#9fd8ff', dark:'#2a5f85', hp:180, speed:272, damage:12, interval:.34, shotSpeed:640, armor:.04, radius:23, height:98, specialCooldown:7, special:'חוט חזרה', specialIcon:'spiral', description:'זורקת חוט אור שתופס את היריב ומושך אותו ממש אליה.', tip:'זרקו את החוט כשהיריב רחוק או מתחבא מאחורי אבן: הוא נמשך ישר אליכם, ואז יורים מקרוב.', number:'46', rarity:'אגדי', facesLeft:true, female:true, box:true, aiRange:260, specialRange:540 },
  hedanon: { id:'hedanon', magic:85, name:'הדנון', element:'רוח', role:'שומע הכל', color:'#b9a2ff', dark:'#4c3a8c', hp:155, speed:292, damage:10, interval:.29, shotSpeed:700, armor:0, radius:21, height:108, specialCooldown:7, special:'הד חוזר', specialIcon:'sound', description:'גל קול שפוגע איפה שהיריב עומד, וההד שלו חוזר ופוגע שוב רגע אחר כך.', tip:'הפעילו את ההד כשהיריב בפינה או תקוע: קשה לברוח משתי פגיעות.', number:'47', rarity:'אגדי', facesLeft:true, flies:true, box:true, aiRange:280, specialRange:480 },
  tlaor: { id:'tlaor', magic:90, name:'טלאור', element:'טבע', role:'תופר האור', color:'#ffaa4a', dark:'#7a3d0c', hp:205, speed:256, damage:14, interval:.4, shotSpeed:620, armor:.08, radius:24, height:104, specialCooldown:8, special:'תפר אור', specialIcon:'sparkle', description:'תופר בחוטי אור את האבנים השבורות בזירה, מתקן את עצמו ומקבל שריון לרגע.', tip:'חכו שהאבנים יישברו והחיים ירדו, ואז תפרו הכל בבת אחת.', number:'48', rarity:'אגדי', facesLeft:true, box:true, aiRange:240, specialRange:2000 },
  galgalor: { id:'galgalor', magic:65, name:'גלגל אור', element:'אנרגיה', role:'מבולגן בכוונה', color:'#7fe8ff', dark:'#1f7f9c', hp:165, speed:265, damage:11, interval:.3, shotSpeed:620, armor:0, radius:22, height:84, specialCooldown:7, special:'פיצוץ אנרגיה', specialIcon:'sparkle', description:'שחרור אנרגיה לכל הכיוונים: עשרה קליעים בבת אחת.', tip:'קפצו לאמצע הקרב ושחררו את הפיצוץ קרוב ליריב.', number:'05', rarity:'רגיל', wobble:.13, aiRange:220, specialRange:260 },
});
// dodge: how near a shot must come before the rival steps aside (0: never). lead: how far ahead it aims.
// kick: how close to the goal it kicks the pearl. wonderChase: how often it runs for a Wonder seed; copyChase: for its copy star.
// In a full-length battle (not a mission): life scales BATTLE_HP, and pace slows the rival's fire and aim, because
// a long fight rewards whoever is steadier and the computer never gets tired.
export const LEVELS = {
  beginner:{name:'מתחילים',subtitle:'צעד ראשון בליגה',reaction:.62,fireScale:2.8,aimError:.36,speedScale:.72,specialDelay:5,dodge:0,lead:0,kick:.7,wonderChase:.15,life:1.4,pace:1,copyChase:.1},
  rookie:{name:'חימום', subtitle:'לומדים את הזירה', reaction:.50, fireScale:2.2, aimError:.27, speedScale:.80, specialDelay:4,dodge:75,lead:0,kick:.8,wonderChase:.25,life:1.4,pace:1,copyChase:.2},
  challenger:{name:'אתגר', subtitle:'כבר יודעים להתחמק', reaction:.30, fireScale:1.65, aimError:.18, speedScale:.92, specialDelay:2.5,dodge:150,lead:.55,kick:1,wonderChase:.45,life:1.05,pace:1.3,copyChase:.4},
  veteran:{name:'ותיקים', subtitle:'כמעט אלופים', reaction:.25, fireScale:1.45, aimError:.14, speedScale:.96, specialDelay:1.8,dodge:150,lead:.55,kick:1,wonderChase:.65,life:.95,pace:1.35,copyChase:.55},
  champion:{name:'אלופים', subtitle:'היריב לא מוותר', reaction:.20, fireScale:1.25, aimError:.105, speedScale:1, specialDelay:1,dodge:150,lead:.55,kick:1,wonderChase:.65,life:.9,pace:1.35,copyChase:.55},
};
// ------------------------------------------------------------------ battle pacing, families, Power Form, final blow
// A battle is a little story, not a few seconds: everyone has more life, and supers hit harder to match.
// Missions keep their own pacing (they have goals), and co-op keeps its giant's own life.
// Hide-and-seek and the chase have their own clock: the rival is hidden or running, so it needs less life.
// A guardian grown huge keeps less of its extra life in a long battle. Supers fill slower there (BATTLE_SHARE).
// Two friends both fire at a person's full pace (no computer slowing down), so a friend battle gets VERSUS_HP more life:
// about half a minute, long enough for a Wonder and a Power Form on both sides.
// A rival that heals, hears every shot or shuts itself in a ring of water gets less of the battle life outside the story, where
// each step tunes its own: with three or four times the life, such a kit ground on to the clock against a slow-shooting starter.
// Kashevet's silence, the sea turtle's ring and Tehomon's whirlpool took a resting thumb to the clock at the first levels.
export const RIVAL_LIFE=Object.freeze({kokhavit:.68,ozenav:.72,tlaor:.85,seaguard:.72,tehomon:.85,kashevet:.75,tzadon:.78,rhythmdeer:.9});
// The tiger's dash ended quick fights too soon (half of them under 20 s at the top levels): its rivals get a little more life there.
export const FAST_KIDS=Object.freeze({zankor:1.3});
export const BATTLE_HP=+(globalThis.process?.env?.BATTLE_HP||3.5),SUPER_HIT=+(globalThis.process?.env?.SUPER_HIT||1.75),HIDE_HP=.45,FLEE_HP=.3,GIANT_HP=1.6,GIANT_BATTLE_HP=1.25,VERSUS_HP=+(globalThis.process?.env?.VERSUS_HP||2.2);
// A shot keeps the attack pose long enough for the strike to show; the renderer sees a new shot as attack rising.
export const ATTACK_SHOT=.3;
// Side 2 is a second child in co-op, or a computer friend in the pair race (m.allied).
export const isHuman=(m,side)=>side===1?!!m.versus:side===2?!m.allied:true;
// Story and wild losers are freed from the shadow at the end.
export const isShadowed=m=>!m.versus&&!m.coop&&(!!m.wild||!!m.story&&!m.mirror&&!m.friendly);
// Splats and sounds come in eight families of elements.
export const FAMILIES=['water','spark','stone','fire','light','nature','sound','wind'];
export const FAMILY=Object.freeze({'מים':'water','חשמל':'spark','אנרגיה':'spark','עוצמה':'stone','רעד':'stone','אש':'fire','אור':'light','כוכב':'light','טבע':'nature','קול':'sound','היפנוט':'sound','רוח':'wind','מהירות':'wind'});
export const familyOf=id=>FAMILY[CREATURES[id]?.element]||'stone';
// The Power Form: a creature that has grown with its child (level 3) earns it again in every battle with two landed supers.
export const FORM_LEVEL=3,FORM_PIPS=2,FORM_TIME=+(globalThis.process?.env?.FORM_TIME||20),FORM_SIZE=+(globalThis.process?.env?.FORM_SIZE||1.15),FORM_CHARGE=+(globalThis.process?.env?.FORM_CHARGE||1.5),FINALE_SIM=.35;
export const formUnlocked=(p,id)=>creatureLevel(p,id)>=FORM_LEVEL;
export const formWinsToGo=(p,id)=>formUnlocked(p,id)?0:Math.ceil((LEVEL_XP[FORM_LEVEL-1]-creatureXp(p,id))/XP_WIN);
// The card's form side: a little more power, a super that comes back sooner.
export const formSpec=c=>({...c,damage:c.damage*1.15,specialCooldown:c.specialCooldown/1.5});
export const CUP = [
  {title:'רבע הגמר', rival:'havzuk', level:'rookie', club:'ניצוצי החוף'},
  {title:'חצי הגמר', rival:'maimi', level:'challenger', club:'גלי הטורקיז'},
  {title:'הגמר הגדול', rival:'slauz', level:'champion', club:'שומרי האבן'},
];
export const CHALLENGE = Object.freeze({id:'crumbling',title:'הזירה המתפוררת',rival:'havzuk',level:'champion'});
export const challengeUnlocked=profile=>profile.cups>0;
export const STARTERS=Object.keys(CREATURES).filter(id=>CREATURES[id].starter);
export const WILD=Object.keys(CREATURES).filter(id=>!CREATURES[id].starter&&!CREATURES[id].star&&!CREATURES[id].box);
// The star guardians wait in the golden castle and join when the star is mended.
export const STAR_GUARDS=Object.keys(CREATURES).filter(id=>CREATURES[id].star);
export const RARITY={'רגיל':{stars:1},'נדיר':{stars:2},'אגדי':{stars:3}};
export const isUnlocked=(profile,id)=>!!CREATURES[id]&&(CREATURES[id].starter||profile.unlocked.includes(id));
export const releasedCount=profile=>WILD.filter(id=>profile.unlocked.includes(id)).length;
export function wildLevel(profile){const n=releasedCount(profile);return n<2?'rookie':n<5?'challenger':'champion';}
export function makeWildMatch(profile,rival,options={}) {
  if(!WILD.includes(rival)||isUnlocked(profile,rival))return null;
  const player=isUnlocked(profile,profile.selected)?profile.selected:'maimi';
  return makeMatch({...options,forms:options.forms??[formUnlocked(profile,player),false],player,rival,level:wildLevel(profile),wild:rival});
}
// Skins are earned by winning with a creature. Nothing is ever bought.
export const SKINS=[
  {id:'base',name:'רגיל',wins:0},
  {id:'ice',name:'קרח',wins:1,tint:'#bff6ff',alpha:.42},
  {id:'night',name:'צל לילה',wins:3,tint:'#3b1d7a',alpha:.5},
  {id:'gold',name:'זהב אלופים',wins:6,tint:'#ffcf3a',alpha:.55,sparkle:true},
  // Looks that come only from star boxes, one creature at a time.
  {id:'lava',name:'לבה',box:'common',tint:'#ff5a1f',alpha:.48},
  {id:'ocean',name:'אוקיינוס',box:'common',tint:'#1c6fe8',alpha:.45},
  {id:'forest',name:'יער',box:'common',tint:'#3aa845',alpha:.45},
  {id:'candy',name:'סוכריה',box:'common',tint:'#ff79c9',alpha:.42},
  {id:'moon',name:'אבן ירח',box:'rare',tint:'#e8f0ff',alpha:.55,sparkle:true,sparkleColor:'#ffffff'},
  {id:'rainbow',name:'קשת',box:'legendary',tint:'#ffffff',alpha:.12,rainbow:true,sparkle:true},
  {id:'galaxy',name:'גלקסיה',box:'legendary',tint:'#1b0c45',alpha:.6,sparkle:true,sparkleColor:'#9fe6ff'},
];
export const skinById=id=>SKINS.find(s=>s.id===id)||SKINS[0];
export const skinUnlocked=(profile,id,skin)=>{const s=skinById(skin);return s.box?!!profile.looks?.[id]?.includes(s.id):(profile.creatures[id]?.wins||0)>=s.wins;};
export const skinOf=(profile,id)=>{const skin=profile.skins?.[id];return skin&&skinUnlocked(profile,id,skin)?skin:'base';};
export function chooseSkin(profile,id,skin){if(!isUnlocked(profile,id)||!SKINS.some(s=>s.id===skin)||!skinUnlocked(profile,id,skin))return false;profile.skins[id]=skin;return true;}
export function flipCard(profile,id){const i=profile.newCards.indexOf(id);if(i<0)return false;profile.newCards.splice(i,1);return true;}
// Card bars compare creatures on the same 0-100 scale.
export function cardStats(c){
  const dps=c.damage*(c.spread||1)/c.interval;
  return [['חיים',c.hp,c.hp/270],['חוזק',Math.round(dps),dps/45],['מהירות',c.speed,c.speed/300],['הגנה',Math.round(c.armor*100)+'%',.15+c.armor*4.5],['קסם',c.magic||60,(c.magic||60)/100]].map(([label,value,pct])=>({label,value,pct:Math.round(clamp(pct,.06,1)*100)}));
}
export function journeyView(profile) {
  if(profile.cup)return needsUpgrade(profile)?'workshop':'cup';
  return challengeUnlocked(profile)?'challenge':'lobby';
}
export function makeChallengeMatch(profile,options={}) {
  if(!challengeUnlocked(profile))return null;
  const build=profile.lastBuild||{player:profile.selected,upgrades:[]};
  return makeMatch({...options,forms:options.forms??[formUnlocked(profile,build.player),false],player:build.player,upgrades:build.upgrades,rival:CHALLENGE.rival,level:CHALLENGE.level,challenge:CHALLENGE.id});
}
const length=(x,y)=>Math.hypot(x,y);
const norm=(x,y)=>{const d=length(x,y)||1;return {x:x/d,y:y/d};};
export function seeded(seed=1) { let s=seed>>>0; return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;}; }
// A side stream of its own (copy stars, the comeback star, the Two Tracks): the seed is mixed first, so neighbouring
// battle seeds do not start their streams with nearly the same roll.
export function stream(seed,key){let s=((seed>>>0)^key)>>>0;s^=s>>>16;s=Math.imul(s,0x45d9f3b);s^=s>>>16;s=Math.imul(s,0x45d9f3b);s^=s>>>16;return seeded(s>>>0);}
export function segmentCircle(ax,ay,bx,by,cx,cy,r) {
  const dx=bx-ax,dy=by-ay,fx=ax-cx,fy=ay-cy,a=dx*dx+dy*dy;
  if(fx*fx+fy*fy<=r*r)return 0;
  if(a<1e-9)return null;
  const b=2*(fx*dx+fy*dy),c=fx*fx+fy*fy-r*r,d=b*b-4*a*c;
  if(d<0)return null;
  const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
}
export function confine(actor) {
  const rx=WORLD.rx-actor.radius,ry=WORLD.ry-actor.radius*.7;
  const x=(actor.x-WORLD.cx)/rx,y=(actor.y-WORLD.cy)/ry,d=length(x,y);
  if(d>1){actor.x=WORLD.cx+x/d*rx;actor.y=WORLD.cy+y/d*ry;}
}
// ------------------------------------------------------------------ island missions
// Every mission keeps shooting and the superpower; only the goal changes.
export const MODES={
  lava:{name:'טבעת הלבה',goal:'הלבה סוגרת את הזירה. שברו סלעים, אספו גחלי כוח ותגדלו.',duration:100},
  wind:{name:'תופסים את הרוח',goal:'אספו 6 נוצות רוח והחזיקו אותן 10 שניות.',duration:120},
  ball:{name:'כדור הגאות',goal:'הכניסו את הפנינה לשער של היריב! מי שמגיע ראשון ל־4 גולים מנצח.',duration:90},
  trio:{name:'קרב השלישייה',goal:'שלושה יצורים מול שלושה. כשיצור נופל, הבא נכנס לזירה.',duration:150},
  echo:{name:'אבני ההד',goal:'האבנים שרות מנגינה. מקשיבים, ואז דורכים עליהן באותו סדר. מי שמשלים 3 מנגינות ראשון מנצח.',duration:130},
  // The Land of Two Tracks: stand alone in the ring; open gates only together.
  hill:{name:'גבעת השריון',goal:'עומדים לבד בתוך הטבעת וצוברים נקודות. מי שמגיע ראשון ל־25 מנצח.',duration:120},
  race:{name:'מרוץ זוגי',goal:'שער נפתח רק כששניכם בתוכו יחד. עוברים חמישה שערים לפני צעדון!',duration:120},
};
// Four goals win the tide ball, so it rarely runs past the clock.
export const WIND_TARGET=6,WIND_HOLD=10,MAX_POWER=5,BALL_GOALS=4;
// The wind mission: a child picks up a feather from a little further away than the rival, and the rival chases
// feathers and the holder less eagerly (the child-like bot won only about six in ten).
export const WIND_REACH=24,WIND_GREED=160,WIND_CHASE=1.2;
// Five singing stones in a ring. A tune lights some of them; then whoever steps on them in the same order sings it back.
// Tunes of two, then three notes: a fourth note made the third tune a long wait for a young child.
export const ECHO_SONGS=3,ECHO_NOTE=.75,ECHO_GAP=.28,ECHO_STONE_R=50,ECHO_FIRST=2,ECHO_LONGEST=3;
export const ECHO_STONES=[0,1,2,3,4].map(i=>{const ang=-Math.PI/2+i*Math.PI*2/5;return {x:Math.round(640+Math.cos(ang)*275),y:Math.round(395+Math.sin(ang)*170)};});
// How often the rival remembers the next stone right, and how long it waits before it starts.
export const ECHO_AI={beginner:{right:.6,wait:2.4},rookie:{right:.7,wait:1.9},challenger:{right:.8,wait:1.3},veteran:{right:.88,wait:1},champion:{right:.94,wait:.8}};
// Hide-and-seek: standing still for a moment lets you hear where the hidden creature is.
export const HIDE_LISTEN=.6,HIDE_SEEN=2.6;
// The goals sit at the two ends of the oval; the player defends the left one.
export const GOALS=[{x:WORLD.cx-WORLD.rx+34,y:WORLD.cy,half:60},{x:WORLD.cx+WORLD.rx-34,y:WORLD.cy,half:60}];
export const BALL_TUNE={kickRange:430,aiKick:260,drag:3,carry:.75,fumble:3,rockX:150,rockY:100};
const SPAWN=[{x:285,y:420},{x:995,y:420},{x:235,y:520}];
function setupMode(m,mode,{seed=1,ally=null,allyScript=false}={}){
  m.mode=mode;m.duration=MODES[mode].duration;
  for(const a of m.actors){a.power=0;a.feathers=0;a.out=0;}
  if(mode==='lava'){m.lava={scale:1,next:6,eruptions:[],embers:[],nextEmber:16};
    // A long fight is the point: both sides get the stamina to collect, grow and outlast the lava.
    for(const a of m.actors){a.spec={...a.spec,hp:Math.round(a.spec.hp*LAVA_STAMINA)};a.hp=a.spec.hp;}
    for(const [x,y] of [[640,300],[520,470],[760,470]])m.lava.embers.push({x,y,age:0});}
  if(mode==='wind'){m.wind={feathers:[],next:1.5,holder:-1,hold:0};m.covers=m.covers.filter((c,i)=>i<2);}
  if(mode==='ball'){m.ball={x:WORLD.cx,y:WORLD.cy,vx:0,vy:0,carrier:-1,carryTime:0,hits:0,noPick:[0,0],score:[0,0],overtime:false};m.covers=m.covers.filter((c,i)=>i>=2);
    // Reef rocks guard each goal: a straight kick from far away usually hits one.
    for(const G of GOALS)for(const dy of [-1,1])m.covers.push({x:G.x+(G.x<WORLD.cx?1:-1)*BALL_TUNE.rockX,y:G.y+dy*BALL_TUNE.rockY,r:30,hp:9999,maxHp:9999,reef:true});}
  if(mode==='trio'){m.trio={teams:[m.teamIds[0],m.teamIds[1]],idx:[0,0]};}
  if(mode==='echo'){m.covers=[];m.echo={stones:ECHO_STONES.map(s=>({...s,r:ECHO_STONE_R})),len:ECHO_FIRST,song:[],phase:'rest',t:1.2,note:-1,songs:[0,0],progress:[0,0],on:[-1,-1],misses:[0,0],aiPlan:-1,aiFor:-1,aiWait:0,buddy:null};}
  if(mode==='hill')tracks.setupHill(m,{seed},TRACKS_API);
  // The race keeps the path to the second gate open: the top stone would stand in it.
  if(mode==='race'){m.covers=m.covers.filter((c,i)=>i!==2);tracks.setupRace(m,{seed,ally:CREATURES[ally]?ally:'zankor',script:allyScript},TRACKS_API);m.actors[2].lab=labFor(m,2,m.actors[2].id);}
}
export const echoStoneAt=(E,a)=>E.stones.findIndex(s=>length(a.x-s.x,a.y-s.y)<s.r+a.radius*.3);
function newSong(m){const E=m.echo,song=[];while(song.length<E.len){const s=Math.floor(m.random()*E.stones.length);if(s!==song.at(-1))song.push(s);}
  E.song=song;E.phase='listen';E.t=0;E.note=-1;E.progress=[0,0];E.aiPlan=-1;E.aiFor=-1;event(m,'echo-song-start',{length:song.length});}
function stepEcho(m,dt){const E=m.echo;
  stepRespawns(m,dt,a=>{E.progress[a.side]=0;if(a.side===1)E.aiPlan=-1;});
  if(E.phase==='rest'){E.t-=dt;if(E.t<=0)newSong(m);return;}
  if(E.phase==='listen'){E.t+=dt;const per=ECHO_NOTE+ECHO_GAP,i=Math.floor(E.t/per),note=i<E.song.length&&E.t-i*per<ECHO_NOTE?i:-1;
    if(note!==E.note&&note>=0)event(m,'echo-note',{stone:E.song[note],i:note});E.note=note;
    if(E.t>=E.song.length*per+.25){E.phase='play';E.note=-1;for(const a of m.actors)E.on[a.side]=a.out>0?-1:echoStoneAt(E,a);E.aiWait=(ECHO_AI[m.level]||ECHO_AI.challenger).wait;event(m,'echo-turn');}
    return;}
  E.aiWait=Math.max(0,E.aiWait-dt);
  for(const a of m.actors){if(a.out>0||a.hp<=0)continue;const s=echoStoneAt(E,a);if(s===E.on[a.side])continue;E.on[a.side]=s;if(s<0)continue;
    const stone=E.stones[s];
    if(s===E.song[E.progress[a.side]]){E.progress[a.side]++;effect(m,'echo-step',stone.x,stone.y,{color:a.spec.color,side:a.side});event(m,'echo-step',{side:a.side,stone:s,n:E.progress[a.side],of:E.song.length});
      if(E.progress[a.side]>=E.song.length){E.songs[a.side]++;effect(m,'echo-song',stone.x,stone.y,{color:a.spec.color});event(m,'echo-song',{side:a.side,songs:[...E.songs]});
        if(E.songs[a.side]>=ECHO_SONGS){finish(m,a.side,'songs');return;}
        E.len=Math.min(ECHO_LONGEST,E.len+1);E.phase='rest';E.t=1.5;E.progress=[0,0];return;}}
    else{E.progress[a.side]=0;E.misses[a.side]++;if(a.side===1)E.aiPlan=-1;effect(m,'echo-miss',stone.x,stone.y,{color:'#ff8f7a'});event(m,'echo-miss',{side:a.side,stone:s});
      // A child who missed hears the tune again; the rival keeps what it already sang.
      if(a.side===0){E.phase='listen';E.t=0;E.note=-1;event(m,'echo-again');return;}}}
  // A freed friend who hears first: when the child stops and waits, it walks to the next stone and sits on it.
  const B=E.buddy,p=m.actors[0],input=m.lastInput||{},idle=Math.abs(input.moveX||0)+Math.abs(input.moveY||0)<.15;
  // The child plays the one who hears first: when it stops and waits, the next stone hums its note.
  if(!B){if(!E.selfHint)return;E.idle=idle?(E.idle||0)+dt:0;const want=E.song[E.progress[0]],key=E.progress[0]+':'+E.songs.join();E.hint=E.idle>2&&want!=null&&!(p.out>0)?want:-1;
    if(E.hint>=0&&E.hinted!==key){E.hinted=key;event(m,'echo-note',{stone:want,i:-1,hint:true});event(m,'echo-hint',{stone:want});}return;}
  B.idle=idle?B.idle+dt:0;
  const want=E.song[E.progress[0]],hinting=B.idle>2&&want!=null&&!(p.out>0),goal=hinting?E.stones[want]:{x:p.x-48*p.facing,y:p.y+26};
  if(hinting&&B.hint!==E.progress[0]+':'+E.songs.join()){B.hint=E.progress[0]+':'+E.songs.join();event(m,'buddy-hint',{stone:want});}
  const q=length(goal.x-B.x,goal.y-B.y);if(q>4){const n=norm(goal.x-B.x,goal.y-B.y),sp=Math.min(q,(hinting?320:280)*dt);B.x+=n.x*sp;B.y+=n.y*sp;B.moving=true;B.facing=n.x>0?1:-1;}else B.moving=false;
  B.on=hinting&&q<12?want:-1;
}
// Respawning modes: a knocked-out creature leaves for a moment and comes back whole.
function stepRespawns(m,dt,onKo,outFor=null){
  for(const a of m.actors){
    if(a.out>0){a.out-=dt;if(a.out<=0){a.out=0;a.hp=a.spec.hp;a.x=SPAWN[a.side].x;a.y=SPAWN[a.side].y;a.invincible=1.5;event(m,'respawn',{side:a.side});}continue;}
    if(a.hp<=0){onKo(a);knockOut(m,a,outFor?outFor(a):2.5);}}
}
// A creature that falls in a respawning mode leaves for a moment: a puff, dizzy stars and its fading shape.
function knockOut(m,a,out){effect(m,'ko',a.x,a.y,{side:a.side,id:a.id,color:a.spec.color,facing:a.facing});a.out=out;a.hp=0;event(m,'ko',{side:a.side,x:a.x,y:a.y});}
function kickBall(m,a,big){const B=m.ball;if(B.carrier!==a.side||B.carryTime<.22)return;
  B.carrier=-1;B.noPick[a.side]=.45;const sp=big?1050:740;B.vx=Math.cos(a.aim)*sp;B.vy=Math.sin(a.aim)*sp*.85;B.x=a.x+Math.cos(a.aim)*(a.radius+18);B.y=a.y+Math.sin(a.aim)*(a.radius+18);
  a.attack=.2;event(m,'kick',{side:a.side,big});if(big)effect(m,'big-kick',a.x,a.y,{color:a.spec.color});}
function looseBall(m,a,push=260){const B=m.ball;if(B.carrier!==a.side)return;B.carrier=-1;B.hits=0;B.noPick[a.side]=.6;const ang=Math.atan2(WORLD.cy-a.y,WORLD.cx-a.x)+(m.random()-.5)*2.2;B.vx=Math.cos(ang)*push;B.vy=Math.sin(ang)*push*.8;event(m,'ball-loose',{side:a.side});}
function scoreGoal(m,side){const B=m.ball;B.score[side]++;event(m,'goal',{side,score:[...B.score]});effect(m,'goal',GOALS[1-side].x,GOALS[1-side].y,{color:'#ffe08a'});
  if(B.score[side]>=BALL_GOALS||B.overtime){finish(m,side,'goals');return;}
  Object.assign(B,{x:WORLD.cx,y:WORLD.cy,vx:0,vy:0,carrier:1-side,carryTime:0,hits:0,noPick:[0,0]});
  for(const a of m.actors){a.x=SPAWN[a.side].x;a.y=SPAWN[a.side].y;a.hp=a.spec.hp;a.out=0;a.invincible=0;}
  m.shots=[];m.waves=[];m.zones=[];m.status='countdown';m.countdown=1.6;}
function stepBall(m,dt){const B=m.ball;
  stepRespawns(m,dt,a=>looseBall(m,a,200));
  for(let i=0;i<2;i++)B.noPick[i]=Math.max(0,B.noPick[i]-dt);
  if(B.carrier>=0){const a=m.actors[B.carrier];B.carryTime+=dt;B.x=a.x+a.facing*(a.radius+12);B.y=a.y+6;}
  else{B.carryTime=0;const drag=Math.max(0,1-dt*BALL_TUNE.drag);B.vx*=drag;B.vy*=drag;B.x+=B.vx*dt;B.y+=B.vy*dt;
    for(const c of m.covers)if(c.hp>0){const dx=B.x-c.x,dy=B.y-c.y,d=length(dx,dy),r=c.r+16;if(d<r){const n=norm(dx||.01,dy);B.x=c.x+n.x*r;B.y=c.y+n.y*r;const dot=B.vx*n.x+B.vy*n.y;if(dot<0){B.vx-=1.7*dot*n.x;B.vy-=1.7*dot*n.y;}}}
    for(const a of m.actors)if(!(a.out>0)&&a.hp>0&&B.noPick[a.side]<=0&&length(a.x-B.x,a.y-B.y)<a.radius+20){B.carrier=a.side;B.carryTime=0;B.hits=0;event(m,'ball-pick',{side:a.side});break;}}
  // A goal: the ball crosses either end inside the goal mouth.
  for(let g=0;g<2;g++){const G=GOALS[g];if(Math.abs(B.y-G.y)<G.half&&(g===0?B.x<G.x:B.x>G.x)){scoreGoal(m,1-g);return;}}
  const od=length((B.x-WORLD.cx)/(WORLD.rx-14),(B.y-WORLD.cy)/(WORLD.ry-10));
  if(od>1){const nx=(B.x-WORLD.cx)/(WORLD.rx*WORLD.rx),ny=(B.y-WORLD.cy)/(WORLD.ry*WORLD.ry),n=norm(nx,ny);B.x=WORLD.cx+(B.x-WORLD.cx)/od;B.y=WORLD.cy+(B.y-WORLD.cy)/od;const dot=B.vx*n.x+B.vy*n.y;if(dot>0){B.vx-=1.6*dot*n.x;B.vy-=1.6*dot*n.y;}}
}
function stepTrio(m,dt){const T=m.trio,last=[0,1].map(side=>m.actors[side].hp<=0&&T.idx[side]>=2);
  if(last[0]||last[1]){finish(m,last[0]&&last[1]?-1:last[0]?1:0,'trio');return;}
  for(let side=0;side<2;side++){const a=m.actors[side];if(a.hp>0)continue;
    T.idx[side]++;const next=actor(T.teams[side][T.idx[side]],side);next.x=SPAWN[side].x;next.y=SPAWN[side].y;next.invincible=1.5;next.power=0;next.out=0;next.canForm=canFormNow(m,side,next.id);next.lab=labFor(m,side,next.id);
    if(side===0&&m.boost){const k=m.boost;next.spec={...next.spec,hp:Math.round(next.spec.hp*(1+k)),damage:Math.round(next.spec.damage*(1+k))};next.hp=next.spec.hp;}
    m.actors[side]=next;m.shots=m.shots.filter(s=>s.owner!==1-side);effect(m,'swap',next.x,next.y,{color:next.spec.color});event(m,'swap',{side,id:next.id,left:2-T.idx[side]});}
}
export const trioLeft=(m,side)=>m.trio?2-m.trio.idx[side]+(m.actors[side].hp>0?1:0):0;
// How much of the arena is still safe: 1 is the full oval, it closes to .45.
export const LAVA_STAMINA=5.5;
export const lavaScale=t=>1-.45*clamp((t-3)/40,0,1);
const ovalDistance=(x,y)=>length((x-WORLD.cx)/WORLD.rx,(y-WORLD.cy)/WORLD.ry);
function stepMode(m,dt){
  if(m.hill){tracks.stepHill(m,dt,TRACKS_API);return;}
  if(m.race){tracks.stepRace(m,dt,TRACKS_API);return;}
  if(m.ball){stepBall(m,dt);return;}
  if(m.trio){stepTrio(m,dt);return;}
  if(m.echo){stepEcho(m,dt);return;}
  if(m.lava){const L=m.lava;L.scale=lavaScale(m.time);
    if(m.time>1&&m.time<4&&!L.warned){L.warned=true;event(m,'lava-warning');}
    for(const a of m.actors){if(a.hp<=0)continue;
      if(ovalDistance(a.x,a.y)>L.scale){a.burn=(a.burn||0)-dt;if(a.burn<=0){a.burn=.33;damage(m,a,3,null,{special:true,fam:'fire'});effect(m,'burn',a.x,a.y,{color:'#ff7a2c'});}}}
    for(const c of m.covers)if(c.hp<=0&&!c.dropped){c.dropped=true;L.embers.push({x:c.x,y:c.y,age:0});event(m,'ember-drop');}
    if(m.time>=L.nextEmber){L.nextEmber=m.time+20;const ang=m.random()*Math.PI*2,r=m.random()*L.scale*.6;L.embers.push({x:WORLD.cx+Math.cos(ang)*WORLD.rx*r,y:WORLD.cy+Math.sin(ang)*WORLD.ry*r,age:0});event(m,'ember-drop');}
    for(const e of L.embers){e.age+=dt;if(ovalDistance(e.x,e.y)>L.scale){const k=L.scale*.9/ovalDistance(e.x,e.y);e.x=WORLD.cx+(e.x-WORLD.cx)*k;e.y=WORLD.cy+(e.y-WORLD.cy)*k;}
      for(const a of m.actors)if(!e.taken&&a.hp>0&&a.power<MAX_POWER&&length(a.x-e.x,a.y-e.y)<a.radius+20){e.taken=true;a.power++;a.spec={...a.spec,hp:a.spec.hp+20};a.hp+=20;effect(m,'ember',a.x,a.y,{color:'#ffb43a'});event(m,'ember',{side:a.side,power:a.power});}}
    L.embers=L.embers.filter(e=>!e.taken);
    if(m.time>=L.next){L.next=m.time+(m.time>30?3.5:4.5);const target=m.actors[m.random()<.5?0:1],spot=m.random()<.6?{x:target.x,y:target.y}:{x:WORLD.cx+(m.random()-.5)*WORLD.rx*L.scale,y:WORLD.cy+(m.random()-.5)*WORLD.ry*L.scale};L.eruptions.push({...spot,r:72,delay:1.2,age:0});}
    for(const e of L.eruptions){e.age+=dt;if(!e.done&&e.age>=e.delay){e.done=true;m.waves.push({kind:'blast',visual:true,owner:-1,x:e.x,y:e.y,age:0,r:e.r,life:.5,hit:[]});event(m,'blast',{side:-1});
      for(const a of m.actors)if(a.hp>0&&a.invincible<=0&&length(a.x-e.x,a.y-e.y)<e.r+a.radius)damage(m,a,18,null,{special:true,fam:'fire',pushX:Math.sign(a.x-e.x||1)*30});}}
    L.eruptions=L.eruptions.filter(e=>e.age<e.delay+.6);
  }
  if(m.wind){const W=m.wind;
    for(const a of m.actors){
      if(a.out>0){a.out-=dt;if(a.out<=0){a.out=0;a.hp=a.spec.hp;a.x=a.side?995:285;a.y=420;a.invincible=1.5;event(m,'respawn',{side:a.side});}continue;}
      if(a.hp<=0){dropFeathers(m,a,a.feathers);effect(m,'blown',a.x,a.y,{color:'#cfffff'});knockOut(m,a,2.5);}}
    if(m.time>=W.next&&W.feathers.length<8){W.next=m.time+3;const ang=m.random()*Math.PI*2;W.feathers.push({x:WORLD.cx,y:WORLD.cy,vx:Math.cos(ang)*90,vy:Math.sin(ang)*70,age:0});event(m,'feather-spawn');}
    for(const f of W.feathers){f.age+=dt;const drag=Math.max(0,1-dt*1.6);f.vx*=drag;f.vy*=drag;f.x+=f.vx*dt;f.y+=f.vy*dt;
      if(ovalDistance(f.x,f.y)>.92){const k=.92/ovalDistance(f.x,f.y);f.x=WORLD.cx+(f.x-WORLD.cx)*k;f.y=WORLD.cy+(f.y-WORLD.cy)*k;f.vx*=-.4;f.vy*=-.4;}
      if(f.age<.5)continue;
      for(const a of m.actors)if(!f.taken&&a.out<=0&&a.hp>0&&length(a.x-f.x,a.y-f.y)<a.radius+(isHuman(m,a.side)?WIND_REACH:18)){f.taken=true;a.feathers++;event(m,'feather',{side:a.side,count:a.feathers});}}
    W.feathers=W.feathers.filter(f=>!f.taken);
    const [p,e]=m.actors,holder=p.feathers>=WIND_TARGET&&p.feathers>e.feathers?0:e.feathers>=WIND_TARGET&&e.feathers>p.feathers?1:-1;
    if(holder!==W.holder){W.holder=holder;W.hold=WIND_HOLD;if(holder>=0)event(m,'hold-start',{side:holder});}
    if(holder>=0){W.hold-=dt;if(W.hold<=0)finish(m,holder,'feathers');}
  }
}
function dropFeathers(m,a,count){
  for(let i=0;i<count&&a.feathers>0;i++){a.feathers--;const ang=m.random()*Math.PI*2,sp=140+m.random()*120;m.wind.feathers.push({x:a.x,y:a.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp*.8,age:0});}
  if(count)event(m,'feathers-drop',{side:a.side});
}
// What the opponent wants in a mission, blended with how it fights.
function modeGoal(m,a,p,d){
  if(m.hill)return tracks.hillGoal(m,a);
  if(m.race)return tracks.raceGoal(m,a);
  if(m.lava){const L=m.lava,od=ovalDistance(a.x,a.y);
    if(od>L.scale-.08){const q=norm(WORLD.cx-a.x,WORLD.cy-a.y);return {x:q.x*2.2,y:q.y*2.2,keep:.4};}
    for(const e of L.eruptions)if(!e.done&&length(a.x-e.x,a.y-e.y)<e.r+a.radius+30){const q=norm(a.x-e.x||.01,a.y-e.y);return {x:q.x*2.5,y:q.y*2.5,keep:.3};}
    let best=null;for(const e of L.embers){const dist=length(e.x-a.x,e.y-a.y);if(a.power<MAX_POWER&&(dist<d*.9||dist<420)&&(!best||dist<best.dist))best={e,dist};}
    if(best){const q=norm(best.e.x-a.x,best.e.y-a.y);return {x:q.x*2,y:q.y*2,keep:.35};}
    return null;}
  if(m.ball){const B=m.ball;
    if(B.carrier===1){const G=GOALS[0],q=norm(G.x-a.x,G.y-a.y);return {x:q.x*2.4,y:q.y*2.4,keep:.25};}
    if(B.carrier===0&&!(p.out>0)){const G=GOALS[1],near=length(p.x-a.x,p.y-a.y)<170,tx=near?p.x:p.x+(G.x-p.x)*.35,ty=near?p.y:p.y+(G.y-p.y)*.35,q=norm(tx-a.x,ty-a.y);return {x:q.x*2.2,y:q.y*2.2,keep:.3};}
    if(B.carrier<0){const q=norm(B.x-a.x,B.y-a.y);return {x:q.x*2.2,y:q.y*2.2,keep:.3};}
    return null;}
  if(m.echo){const E=m.echo;
    if(E.phase!=='play'||a.out>0||E.aiWait>0)return null;
    const right=E.song[E.progress[1]];if(right==null)return null;
    if(E.aiPlan<0||E.aiFor!==E.progress[1]){const others=E.stones.map((s,i)=>i).filter(i=>i!==right&&i!==E.on[1]);E.aiPlan=m.random()<(ECHO_AI[m.level]||ECHO_AI.challenger).right||!others.length?right:others[Math.floor(m.random()*others.length)];E.aiFor=E.progress[1];}
    const s=E.stones[E.aiPlan],q=norm(s.x-a.x,s.y-a.y);
    // Already standing on it from before: step off first, then back on.
    if(E.on[1]===E.aiPlan)return {x:-q.x*2,y:-q.y*2,keep:.1};
    return {x:q.x*2.2,y:q.y*2.2,keep:.12};}
  if(m.wind){const W=m.wind;
    if(W.holder===1){const q=norm(a.x-p.x||.01,a.y-p.y);return {x:q.x*1.4,y:q.y*1.4,keep:.6};}
    if(W.holder===0&&p.out<=0){const q=norm(p.x-a.x,p.y-a.y);return {x:q.x*WIND_CHASE,y:q.y*WIND_CHASE,keep:.5};}
    let best=null;for(const f of W.feathers){const dist=length(f.x-a.x,f.y-a.y);if(!best||dist<best.dist)best={f,dist};}
    if(best&&(best.dist<WIND_GREED||p.out>0)){const q=norm(best.f.x-a.x,best.f.y-a.y);return {x:q.x*1.7,y:q.y*1.7,keep:.45};}
    return null;}
  return null;
}
function actor(id,side,ids=[]) {
  if(!CREATURES[id])throw new Error('Unknown creature');
  const upgrades=cleanUpgrades(ids),spec=buildSpec(CREATURES[id],upgrades);
  return {id,side,spec,upgrades,x:side===0?285:995,y:420,hp:spec.hp,radius:spec.radius,fireCd:0,superCharge:0,invincible:0,guard:0,stun:0,slow:0,root:0,windup:0,hit:0,attack:0,moveX:0,moveY:0,facing:side===0?1:-1,aim:side===0?0:Math.PI,
    canForm:false,pips:0,form:0,formUsed:false,superSeq:0,landedSeq:0,megaPending:false,windupSurge:false,formTell:false,sz:1,baseSpec:null,nearAt:-9,
    copy:null,copySeq:-1,star:0,lab:null,cardSpeed:0,rush:0,labShots:0,labHits:0,trailGap:0,
    stats:{shots:0,hits:0,damage:0,blocked:0,specials:0,dodges:0,healed:0,weakHits:0,copies:0}};
}
// A friend battle: two people share one screen, so both sides play by the same rules and nothing is saved.
export const HEART_BONUS=.25;
export function makeMatch({player='maimi',rival='slauz',level='rookie',seed=Date.now(),upgrades=[],boss=false,challenge=null,wild=null,story=null,giant=false,mirror=false,arena=null,mode=null,team=null,rivalTeam=null,versus=false,hearts=[0,0],boost=0,giantRival=false,run=null,coop=null,hide=false,flee=false,buddy=null,echoHint=false,forms=[false,false,false],wonder=false,wonderPrefer=[],wonderAvoid=null,life=1,rivalLife=1,
  hats=null,labs=null,formIds=null,copy=false,comeback=false,ccard=null,wonderDay=null,spectacle=false,rhythm=false,ally=null,allyScript=false}={}) {
  if(!LEVELS[level])throw new Error('Unknown difficulty');
  if(versus){boss=false;challenge=null;wild=null;story=null;giant=false;mirror=false;upgrades=[];boost=0;spectacle=false;rhythm=false;if(mode==='trio'||mode==='race')mode=null;}
  if(giantRival)giant=true;
  // A trio match starts with the first creature of each team.
  const teamIds=mode==='trio'?[(team||[player,'havzuk','slauz']).filter(id=>CREATURES[id]).slice(0,3),(rivalTeam||[rival,'lohatan','zikuk']).filter(id=>CREATURES[id]).slice(0,3)]:null;
  if(teamIds){if(teamIds[0].length<3||teamIds[1].length<3)throw new Error('A trio needs three creatures');player=teamIds[0][0];rival=teamIds[1][0];upgrades=[];}
  const enemy=actor(rival,1);
  // An island guardian is the same creature, grown huge by the shadow.
  if(giant){enemy.spec={...enemy.spec,hp:Math.round(enemy.spec.hp*(MODES[mode]||coop&&!versus?GIANT_HP:GIANT_BATTLE_HP)),height:enemy.spec.height*1.3,radius:Math.round(enemy.spec.radius*1.25),damage:Math.round(enemy.spec.damage*1.1)};enemy.hp=enemy.spec.hp;enemy.radius=enemy.spec.radius;enemy.giant=true;}
  if(boss&&rival==='slauz')enemy.boss={phase:'guard',timer:3.8,angle:Math.PI,hit:false};
  const scale=MODES[mode]||(coop&&!versus)?1:+(BATTLE_HP*(versus?VERSUS_HP:(LEVELS[level].life||1)*clamp(+life||1,.3,3))*(hide&&!versus?HIDE_HP:1)*(flee&&!versus?FLEE_HP:1)).toFixed(3),me=actor(player,0,upgrades);
  // The battle's own life: more of it, so a fight has a beginning, a middle and an end.
  // rivalLife: a story step can give its rival a little more or less of it, to tune one guardian.
  for(const a of [me,enemy]){const k=scale*(a===enemy&&scale!==1&&!versus?clamp(+rivalLife||1,.5,3)*(story?1:(RIVAL_LIFE[a.id]||1)*(FAST_KIDS[me.id]||1)):1);if(k!==1){a.spec={...a.spec,hp:Math.round(a.spec.hp*k)};a.hp=a.spec.hp;}}
  const match={id:seed+'-'+player+'-'+rival,random:seeded(seed),level,challenge:challenge===CHALLENGE.id?challenge:null,wild:WILD.includes(wild)&&wild===rival?wild:null,story:typeof story==='string'?story:null,arena:typeof arena==='string'?arena:null,mirror:!!mirror,actors:[me,enemy],time:0,hpScale:scale,superHit:scale>1?SUPER_HIT:1,superShare:scale>1?BATTLE_SHARE:SUPER_SHARE,pace:scale>1&&!versus?LEVELS[level].pace||1:1,ending:null,lent:false,wonder:null,duration:90,countdown:2.3,status:'countdown',winner:null,
    shots:[],waves:[],zones:[],effects:[],events:[],nextId:0,pickup:null,pickupAt:12,ai:{timer:0,angle:0,strafe:1,strafeTime:0,moveX:0,moveY:0,aimX:0,aimY:0,fire:false,special:false},
    covers:[{x:449,y:350,r:35,hp:80,maxHp:80},{x:831,y:440,r:35,hp:80,maxHp:80},{x:650,y:237,r:28,hp:65,maxHp:65},{x:630,y:555,r:28,hp:65,maxHp:65}].map((c,i)=>({...c,...(challenge===CHALLENGE.id?{collapseAt:5+i*4}:{})}))};
  match.teamIds=teamIds;
  // Hats are only for looks; a Lab design gives its mechanic while the form lasts. Both come per side, by creature.
  match.hats=hatSides(hats);match.labs=labSides(labs);match.actors.forEach(a=>{a.lab=labFor(match,a.side,a.id);});
  // Who may grow into a Power Form: friends always, both of them; otherwise as the caller decides. A list of creatures
  // decides it for each member of the child's side (a trio: only the ones that reached their form).
  match.forms=[0,1,2].map(i=>versus||!!coop&&i!==1||!!forms?.[i]);match.formIds=Array.isArray(formIds)&&!versus?formIds.filter(id=>CREATURES[id]):null;
  // A computer rival grows its form only against a child who can grow one too: a form the child cannot answer was the
  // largest swing at the top levels (the Power Form gate).
  if(!versus&&!coop&&!canFormNow(match,0,player))match.forms[1]=false;
  match.actors.forEach(a=>{a.canForm=canFormNow(match,a.side,a.id);});
  if(run&&!versus)applyRun(match,run);
  if(coop&&!versus)setupCoop(match,coop);
  {const k=clamp(+boost||0,0,.5);if(k){const a=match.actors[0];a.spec={...a.spec,hp:Math.round(a.spec.hp*(1+k)),damage:Math.round(a.spec.damage*(1+k))};a.hp=a.spec.hp;match.boost=k;}}
  // A comeback card for this round of a friend series (the loser of the last round picked it).
  const card=versus&&ccard&&[0,1].includes(ccard.side)&&COMEBACK_CARDS.includes(ccard.id)?{side:ccard.side,id:ccard.id}:null;match.ccard=card;
  if(versus){match.versus=true;
    // Each extra heart is a quarter more life: the way a younger friend gets a fair chance. The heart card adds one more.
    match.actors.forEach((a,i)=>{const extra=clamp(Math.floor(hearts?.[i]||0),0,2)+(card?.id==='heart'&&card.side===i?1:0);if(extra){a.spec={...a.spec,hp:Math.round(a.spec.hp*(1+HEART_BONUS*Math.min(3,extra)))};a.hp=a.spec.hp;}});}
  if(MODES[mode])setupMode(match,mode,{seed,ally:ally||(player==='zankor'?'havzuk':'zankor'),allyScript});
  if(hide&&!versus)match.hide={seen:0,still:0,x:match.actors[1].x,y:match.actors[1].y};
  if(flee&&!versus)match.flee=true;
  if(buddy&&match.echo&&CREATURES[buddy])match.echo.buddy={id:buddy,x:200,y:470,idle:0,on:-1,facing:1,moving:false};
  if(echoHint&&match.echo&&!match.echo.buddy){match.echo.selfHint=true;match.echo.hint=-1;}
  // Copy stars and the comeback star belong to plain fights: never a mission, co-op, hide-and-seek or the chase.
  const plain=!match.mode&&!match.coop&&!match.hide&&!match.flee;
  match.copyOn=!!copy&&plain;match.copyStars=[];match.copyLog=[];match.comebackOn=!!comeback&&plain;match.comeback=null;match.decoy=null;
  if(match.copyOn||match.comebackOn)match.extraRandom=stream(seed,0xc0b1e);
  // The spectacle guardian (an ink entrance and a staged beat at half life) and the Rhythm Deer's beat: story only.
  if(spectacle&&!versus&&!match.coop)tracks.setupSpectacle(match,{side:1});
  if(rhythm&&!versus&&!match.coop)tracks.setupRhythm(match,{seed,side:1},TRACKS_API);
  // A Wonder seed sprouts in an ordinary battle only: never in a mission, a boss fight, hide-and-seek, the chase or co-op.
  // The Wonder of the Day is there from the third second to the end, for nobody in particular.
  const wonderOk=!match.mode&&!match.coop&&!hide&&!flee&&!match.challenge&&!teamIds&&!enemy.boss;
  if(wonderOk&&WONDER_IDS.includes(wonderDay))setupWonder(match,{seed,day:wonderDay});
  else if(wonder&&wonderOk)setupWonder(match,{seed,prefer:wonderPrefer,avoid:wonderAvoid});
  return match;
}
// Hats per side, by creature: only known hats in their own slot. Nothing about them changes the battle.
function hatSides(hats){if(!Array.isArray(hats))return null;return [0,1,2].map(i=>{const map=hats[i];if(!map||typeof map!=='object')return null;const out={};
  for(const [id,w] of Object.entries(map))if(ownId(CREATURES,id)&&w&&typeof w==='object'){const head=hatById(w.head)?.slot==='head'?w.head:null,face=hatById(w.face)?.slot==='face'?w.face:null;if(head||face)out[id]={head,face};}
  return Object.keys(out).length?out:null;});}
function labSides(labs){if(!Array.isArray(labs))return null;return [0,1,2].map(i=>{const map=labs[i];if(!map||typeof map!=='object')return null;const out={};
  for(const id of LAB_CREATURES){const d=cleanDesign(id,{name:'',...map[id]});if(d)out[id]={option:d.option,mech:d.mech};}
  return Object.keys(out).length?out:null;});}
const labFor=(m,side,id)=>m.labs?.[side]?.[id]?{...m.labs[side][id]}:null;
// The child's side follows its list of creatures when there is one; everyone else keeps the match's choice.
const canFormNow=(m,side,id)=>side===0&&m.formIds?m.formIds.includes(id):!!m.forms[side];
function event(m,type,data={}) {m.events.push({type,...data});}
function effect(m,type,x,y,data={}) {m.effects.push({type,x,y,age:0,...data});}
// fam: the splat family of a hit with no creature behind it (lava 'fire', meteor 'light'), or of a copied super.
// minor: a small extra blow (a comeback bump, a fire trail, the bridge of light) that lights no pip and drops no copy star.
function damage(m,a,raw,source,{pushX=0,pushY=0,special=false,hitAngle=null,fam=null,minor=false,ghost=false}={}) {
  if(a.hp<=0)return;
  // After the final blow nothing lands any more: no dodge to count and no 'evade' word over the slow ending.
  if(m.ending)return;
  if(a.invincible>0){a.stats.dodges++; effect(m,'evade',a.x,a.y,{color:'#ffffff'});return;}
  // The comeback star: for a few seconds nothing hurts.
  if(a.star>0){effect(m,'evade',a.x,a.y,{color:'#fff3b0'});return;}
  // The light shield stops shots from creatures; a super goes through it, and burning ground and falling rocks do not use it up.
  if(a.lightShield>0&&source&&!special){a.lightShield--;a.stats.blocked+=raw;effect(m,'light-block',a.x,a.y,{color:'#fff3b0'});event(m,'light-block',{side:a.side,left:a.lightShield});return;}
  // The Rhythm Deer between two beats: a gold crack opens on its chest, and a hit there is a weak hit.
  const crack=!!m.rhythm?.crack&&a.side===m.rhythm.side,exposed=a.boss?.phase==='recover'||crack,front=a.boss&&['guard','windup'].includes(a.boss.phase)&&hitAngle!=null&&Math.cos(hitAngle-a.boss.angle)>Math.cos(1.05);
  if(source?.power)raw*=1+.12*source.power;
  if(special&&source)raw*=m.superHit||1;
  if(m.wind&&special&&a.feathers>0&&a.invincible<=0)dropFeathers(m,a,1);
  if(m.ball&&m.ball.carrier===a.side&&a.invincible<=0){m.ball.hits++;if(special||m.ball.hits>=BALL_TUNE.fumble)looseBall(m,a,320);else event(m,'ball-hit',{side:a.side,hits:m.ball.hits});}
  const reduction=exposed?0:front?.8:a.guard>0?.72:a.spec.armor,amount=raw*(exposed?1.5:1)*(1-reduction),actual=Math.min(a.hp,amount);
  a.stats.blocked+=Math.max(0,raw-amount);a.hp=Math.max(0,a.hp-amount);a.hit=.17;a.calm=0;if(source)source.calm=0;
  if(source&&source.side!=null&&!special&&amount>0)chargeSuper(m,source,amount/((CREATURES[a.id]?.hp||a.spec.hp)*(m.superShare||SUPER_SHARE)));
  if(front)effect(m,'guard-block',a.x,a.y,{color:'#ffe5a7'});
  if(exposed&&source){source.stats.weakHits++;effect(m,'weak-hit',a.x,a.y,{color:'#95ffe0'});}
  if(source){source.stats.damage+=actual;if(!special&&!ghost)source.stats.hits++;}
  // In the lava ring a hit never pushes a creature toward the lava.
  if(m.lava&&ovalDistance(a.x+pushX,a.y+pushY)>ovalDistance(a.x,a.y)){pushX=0;pushY=0;}
  a.x+=pushX;a.y+=pushY;confine(a);resolveCover(m,a);
  // A super that lands on a rival lights one pip toward the Power Form (one per super, however many it hits), may drop
  // a copy star of the creature it hit, and in the pair race holds the rival team back.
  if(special&&source&&amount>0&&source.side!==a.side&&!minor){landPip(m,source);dropCopy(m,a,source);if(m.race)tracks.raceHit(m,a,source);}
  // A Lab form whose every third hit makes the rival dizzy for a moment.
  if(!special&&source&&amount>0&&source.form>0&&source.lab?.mech==='stunthird'&&source.side!==a.side&&++source.labHits%LAB_TUNE.stunEvery===0&&!a.boss){a.stun=Math.max(a.stun,LAB_TUNE.stun);effect(m,'dizzy',a.x,a.y,{color:'#d7b8ff'});}
  const by=source?.side??-1,f=fam||(source?familyOf(source.id):'stone');
  effect(m,'hit',a.x,a.y,{color:a.spec.color,amount:Math.round(actual),by,fam:f,special:!!special,form:source?.form>0,side:a.side});event(m,'hit',{side:a.side,by,fam:f,amount:actual,special:!!special,x:a.x,y:a.y});
}
// One pip per super toward the Power Form. A child's super that helps instead of hitting (a heal, a shield, quick ears) earns its pip
// when it is used (helpPip); a computer rival with such a super never grows a form, so rival forms stay as rare as they were.
const helpPip=(m,a)=>{if(isHuman(m,a.side))landPip(m,a);};
function landPip(m,a){if(!a.canForm||a.formUsed||a.form>0||a.landedSeq===a.superSeq)return;
  a.landedSeq=a.superSeq;a.pips=Math.min(FORM_PIPS,a.pips+1);event(m,'pip',{side:a.side,pips:a.pips});
  if(a.pips>=FORM_PIPS){a.superCharge=1;event(m,'form-ready',{side:a.side});}}
function resolveCover(m,a) {
  // Birds fly over the stones.
  if(a.spec.flies){confine(a);return;}
  for(let pass=0;pass<2;pass++)for(const c of m.covers){if(c.hp<=0)continue;const dx=a.x-c.x,dy=a.y-c.y,d=length(dx,dy),r=a.radius+c.r;
    if(d<r){const n=norm(dx||.01,dy);a.x=c.x+n.x*r;a.y=c.y+n.y*r;}}
  confine(a);
}
// Faster feet: the comeback star, the bridge's rush, and a lit drum (anyone's in the dance Wonder; the Rhythm Deer's are for its rivals).
const footBoost=(m,a)=>(a.star>0?1.25:1)*(a.rush>0?1.3:1)*(m.drums&&(m.drums.src==='dance'||a.side!==m.rhythm?.side)&&tracks.onLitDrum(m,a)?1.3:1);
function move(m,a,x,y,dt,scale=1) {
  const n=length(x,y)>1?norm(x,y):{x,y};const speed=a.spec.speed*scale*(a.hear>0?1.2:1)*(a.slow>0?.55:1)*(a.windup>0?.2:1)*(a.root>0?0:1)*(m.ball?.carrier===a.side?BALL_TUNE.carry:1)*footBoost(m,a);
  a.moveX=n.x;a.moveY=n.y;const ice=m.wonderFx?.ice,ox=a.x,oy=a.y;
  // On ice the feet slide: speed builds up and dies down slowly. The Wonder's owner keeps its grip for a moment.
  if(ice&&!(ice.grip?.side===a.side&&m.time<ice.grip.until)&&!(a.root>0)){const k=Math.min(1,dt*2.5);a.vx=(a.vx||0)+(n.x*speed*1.1-(a.vx||0))*k;a.vy=(a.vy||0)+(n.y*speed*1.1-(a.vy||0))*k;a.x+=a.vx*dt;a.y+=a.vy*dt*.8;}
  else{a.x+=n.x*speed*dt;a.y+=n.y*speed*dt*.8;}
  confine(a);resolveCover(m,a);if(dt>0){a.vx=(a.x-ox)/dt;a.vy=(a.y-oy)/(dt*.8);}
  // A Lab fire trail: running leaves short flames on the floor behind.
  if(a.form>0&&a.lab?.mech==='firetrail'){a.trailGap+=length(a.x-ox,a.y-oy);if(a.trailGap>=LAB_TUNE.trailEvery){a.trailGap=0;m.zones.push({owner:a.side,kind:'fire',trail:true,x:Math.round(ox),y:Math.round(oy),r:LAB_TUNE.trailR,age:0,life:LAB_TUNE.trailLife,pulse:0});}}
}
export function shoot(m,a,angle,scale=1) {a.calm=0;
  if(a.fireCd>0||a.windup>0||a.hp<=0||a.silence>0||a.dash)return false;
  const s=a.spec;a.fireCd=s.interval*scale;a.attack=Math.max(a.attack,ATTACK_SHOT);a.aim=angle;if(Math.abs(Math.cos(angle))>.12)a.facing=Math.cos(angle)>0?1:-1;
  const scatter=a.upgrades.includes('scatter'),fan=s.spread===3;
  const offsets=fan?(scatter?[-.4,-.2,0,.2,.4]:[-.22,0,.22]):scatter?[-.19,0,.19]:[0],wobble=s.wobble?(m.random()-.5)*2*s.wobble:0;
  // The comeback star makes shots bigger and stronger, the speed card quicker, and the bubbles Wonder slow round bubbles.
  // A Lab form adds its mechanic to every shot while it lasts.
  const lab=a.form>0?a.lab?.mech:null,bub=m.wonderFx?.bubbles,bubbles=!!bub,slow=bubbles?(typeof bub==='number'?bub:.55):1,speed=s.shotSpeed*(a.cardSpeed>0?1.15:1)*slow*(lab==='overcover'?LAB_TUNE.overSpeed:1),size=(a.form>0?FORM_SIZE:1)*(a.star>0?1.4:1)*(bubbles?2:1);
  const life=(s.shotLife||1.65)*(m.wonderFx?.ice?1.35:1)*(bubbles?.88/slow:1)*(lab==='overcover'?LAB_TUNE.overLife:1),ghost=lab==='afterimage'&&++a.labShots%LAB_TUNE.ghostEvery===0;
  for(const offset of offsets){const aim=angle+offset+wobble;
    const shot={id:++m.nextId,owner:a.side,x:a.x+Math.cos(aim)*(a.radius+9),y:a.y+Math.sin(aim)*(a.radius+9),vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,r:(s.shotRadius||7)*size,damage:(scatter?Math.round(s.damage*.6):s.damage)*(a.star>0?1.3:1)*(lab==='breaker'?LAB_TUNE.breakDamage:1)*(a.charged>0?CHARGED_HIT:1),life,color:s.color,kind:a.id};
    if(a.charged>0)shot.r*=1.3;
    if(bubbles)shot.bubble=true;if(lab==='puddles')shot.puddle=true;if(lab==='firetrail')shot.ember=true;if(lab==='overcover')shot.over=true;if(lab==='breaker')shot.breaker=true;
    m.shots.push(shot);a.stats.shots++;
    // The afterimage: a shadow shot a moment behind, on the same line, half as strong.
    if(ghost){const k=LAB_TUNE.ghostDelay;m.shots.push({...shot,id:++m.nextId,x:shot.x-shot.vx*k,y:shot.y-shot.vy*k,damage:shot.damage*LAB_TUNE.ghostDamage,life:life+k,ghost:true});}
  }
  if(a.charged>0)a.charged--;
  // Against a decoy, every second shot of the auto-aim goes to the copy.
  if(m.decoy&&m.decoy.side!==a.side)a.decoyAim=!a.decoyAim;
  event(m,'shoot',{kind:a.id,side:a.side,fam:familyOf(a.id)});return true;
}
// sid: the super that comes out. A creature holding a copy star fires that creature's super instead of its own, once.
export function useSpecial(m,a,input={}) {
  if(a.windup>0||a.hp<=0||a.silence>0||a.tellT>0||a.dash)return false;
  const sid=a.copy&&CREATURES[a.copy]?a.copy:a.id,tell=sid===a.id?a.spec.tell:CREATURES[sid].tell;
  // Some supers warn first: bells ring, a stone glows. Then the power comes out.
  if(tell&&!a.releasing){a.tellT=tell;a.attack=.3;effect(m,'tell',a.x,a.y,{kind:sid,color:CREATURES[sid].color,life:tell});event(m,'tell',{kind:sid,side:a.side});return true;}
  // The power really comes out now. A super right after the Power Form is its MEGA version (the 'surge' one).
  a.stats.specials++;a.attack=.4;a.superSeq++;const mega=!!a.megaPending,surge=a.upgrades.includes('surge')||mega;a.megaPending=false;
  const marks=[m.shots.length,m.waves.length,m.zones.length];
  if(sid==='maimi') {
    m.waves.push({kind:'wave',owner:a.side,x:a.x,y:a.y,angle:a.aim,age:0,speed:470,r:surge?105:74,damage:surge?46:34,push:surge?110:65,life:1.15,hit:[]});
  } else if(sid==='havzuk') {
    let n=norm(input.moveX||0,input.moveY||0),steps=18;if(!input.moveX&&!input.moveY)n={x:Math.cos(a.aim),y:Math.sin(a.aim)};
    // The computer blinks toward its rival and lands just beside it, so the burst can reach.
    if(!isHuman(m,a.side)){const t=foeOf(m,a),d=length(t.x-a.x,t.y-a.y);n=norm(t.x-a.x,(t.y-a.y)/.8);steps=clamp(Math.round((d-a.radius-t.radius-60)/10),0,18);}
    const start={x:a.x,y:a.y};a.invincible=.38;
    // Sweep the blink in small steps so solid cover cannot be crossed.
    for(let i=0;i<steps;i++){a.x+=n.x*10;a.y+=n.y*8;confine(a);resolveCover(m,a);}
    effect(m,'blink',a.x,a.y,{from:start,color:CREATURES[sid].color});
    m.waves.push({kind:'electric',owner:a.side,x:a.x,y:a.y,age:0,r:surge?170:125,damage:surge?46:32,life:.55,hit:[]});
  } else if(sid==='slauz'){a.windup=surge?.85:.6;a.windupSurge=surge;a.windupKind=sid===a.id?null:sid;a.guard=a.windup+2;effect(m,'charge',a.x,a.y,{owner:a.side,color:CREATURES[sid].color});}
  else wildSpecial(m,a,surge,input,sid);
  if(sid!==a.id)tagCopy(m,a,sid,marks);
  event(m,'special',{kind:a.id,side:a.side,fam:familyOf(sid),mega,copy:sid!==a.id?sid:null});
  if(sid!==a.id){m.copyLog?.push({side:a.side,id:a.id,kind:sid});event(m,'copy-used',{side:a.side,kind:sid,by:a.id});a.copy=null;}
  if(m.race)tracks.raceSuper(m,a,TRACKS_API);
  return true;
}
// A copied super is drawn in two colours: the copied creature's, ringed with the holder's.
function tagCopy(m,a,sid,[s,w,z]){const tag={src:sid,tint2:a.spec.color};
  for(const x of m.shots.slice(s))Object.assign(x,tag,{color:CREATURES[sid].color});for(const x of m.waves.slice(w))Object.assign(x,tag);for(const x of m.zones.slice(z))Object.assign(x,tag);if(a.dash)a.dash.src=sid;}
// Nothing stops a super right now: not a windup, silence, a warning already ringing or a dash.
const superFree=a=>!(a.windup>0||a.hp<=0||a.silence>0||a.tellT>0||a.dash);
// The Power Form: a painted cocoon, a short moment nothing can hurt, then the MEGA super. A Lab design with the light shield
// starts the form behind a shield that swallows three hits.
function transform(m,a,input){
  a.formUsed=true;a.formTell=false;a.pips=0;a.form=FORM_TIME;a.invincible=Math.max(a.invincible,1);a.megaPending=true;
  if(a.lab?.mech==='shield3'){a.lightShield=Math.max(a.lightShield||0,LAB_TUNE.shield);a.lightShieldTime=FORM_TIME;}
  effect(m,'cocoon',a.x,a.y,{side:a.side,kind:a.id,color:a.spec.color,option:a.lab?.option||null});event(m,'form',{side:a.side,kind:a.id,x:a.x,y:a.y,option:a.lab?.option||null});
  if(useSpecial(m,a,input)){a.superCharge=0;event(m,'super',{side:a.side});}
}
// A healing super gives back a little less of a long battle than a damaging super takes from it, so a healer cannot hold out to the clock.
const healShare=m=>m.hpScale>1?clamp((m.superHit||1)/m.hpScale/1.4,.18,1):1;
// Where a placed power lands: on the opponent, but never further than its reach.
function landing(m,a,reach){const t=foeOf(m,a),d=Math.min(reach,length(t.x-a.x,t.y-a.y));return {x:a.x+Math.cos(a.aim)*d,y:a.y+Math.sin(a.aim)*d*.8};}
function wildSpecial(m,a,surge,input={},sid=a.id) {
  const t=foeOf(m,a),dir={x:Math.cos(a.aim),y:Math.sin(a.aim)},col=CREATURES[sid]?.color||a.spec.color,fam=sid!==a.id?familyOf(sid):null;
  if(sid==='lohatan'){
    m.shots.push({id:++m.nextId,owner:a.side,x:a.x+dir.x*(a.radius+12),y:a.y+dir.y*(a.radius+12),vx:dir.x*430,vy:dir.y*430,r:17,damage:20,life:1.3,color:col,kind:'fireball',special:true,explode:{r:surge?140:105,damage:surge?42:30}});
  } else if(sid==='tehomon'){
    const p=landing(m,a,420);m.zones.push({owner:a.side,kind:'vortex',x:p.x,y:p.y,r:surge?125:95,age:0,life:3,pulse:.2,damage:surge?9:7});
  } else if(sid==='zikuk'){
    const ex=a.x+dir.x*1100,ey=a.y+dir.y*1100;
    if(segmentCircle(a.x,a.y,ex,ey,t.x,t.y,t.radius+16)!=null)damage(m,t,surge?52:38,a,{special:true,fam,pushX:dir.x*30,pushY:dir.y*24});
    for(const c of m.covers)if(c.hp>0&&segmentCircle(a.x,a.y,ex,ey,c.x,c.y,c.r)!=null){c.hp=Math.max(0,c.hp-30);effect(m,'stone',c.x,c.y,{color:'#fff1b0'});}
    m.waves.push({kind:'beam',visual:true,owner:a.side,x:a.x,y:a.y,angle:a.aim,age:0,life:.45,r:surge?20:13,hit:[]});
  } else if(sid==='retetoz'){
    const start={x:a.x,y:a.y},away=norm(a.x-t.x||.01,a.y-t.y),gap=a.radius+t.radius+12;
    a.x=t.x+away.x*gap;a.y=t.y+away.y*gap;confine(a);resolveCover(m,a);a.invincible=.45;
    effect(m,'burrow',a.x,a.y,{from:start,color:col});
    m.waves.push({kind:'quake',owner:a.side,x:a.x,y:a.y,age:0,r:surge?195:150,damage:surge?46:34,life:.7,hit:[]});event(m,'quake',{side:a.side});
  } else if(sid==='tzlilon'){
    m.waves.push({kind:'mind',owner:a.side,x:a.x,y:a.y,age:0,r:surge?290:230,damage:12,stun:surge?1.6:1.2,push:0,life:.6,hit:[]});
  } else if(sid==='shorshu'){
    const p=landing(m,a,460);m.zones.push({owner:a.side,kind:'roots',x:p.x,y:p.y,r:surge?95:75,age:0,life:2.2,delay:.45,done:false,root:surge?2.2:1.6,damage:surge?34:26});
  } else if(sid==='windguard'){
    // A walking tornado: it drags the rival along its path and throws it out at the end.
    m.zones.push({owner:a.side,kind:'tornado',x:a.x+dir.x*(a.radius+40),y:a.y+dir.y*(a.radius+30),vx:dir.x*340,vy:dir.y*260,r:surge?95:75,age:0,life:1.6,pulse:0,damage:surge?7:5,finale:surge?30:22,caught:false,thrown:false});
  } else if(sid==='seaguard'){
    // A ring of tide water around the turtle: it stops the rival's shots and pushes back whoever touches it.
    m.zones.push({owner:a.side,kind:'tidering',x:a.x,y:a.y,r:a.radius+(surge?95:75),age:0,life:surge?3.6:3,pulse:0,damage:surge?10:7});
  } else if(sid==='fireguard'){
    // A roar of fire: a cone in front that burns at once and leaves burning ground behind.
    const reach=surge?300:260,half=surge?.62:.5,dist=length(t.x-a.x,t.y-a.y),ang=Math.atan2(t.y-a.y,t.x-a.x),diff=Math.abs(Math.atan2(Math.sin(ang-a.aim),Math.cos(ang-a.aim)));
    if(!(t.out>0)&&dist<reach+t.radius&&diff<half+.15)damage(m,t,surge?52:40,a,{special:true,fam,pushX:dir.x*90,pushY:dir.y*70});
    for(const k of [.35,.65,.95])m.zones.push({owner:a.side,kind:'fire',x:a.x+dir.x*reach*k,y:a.y+dir.y*reach*k*.8,r:44+k*20,age:0,life:2.2,pulse:.3});
    effect(m,'roar',a.x,a.y,{angle:a.aim,reach,half,color:col});
  } else if(sid==='zoharon'){
    // A rain of stars around the rival: each one marks its spot, then lands, one after another.
    const p=landing(m,a,560),n=surge?7:5;
    for(let i=0;i<n;i++){const ang=i*2.4+m.random()*.6,rr=i?50+(i*29)%45:0,delay=.7+i*.2;m.zones.push({owner:a.side,kind:'star',x:p.x+Math.cos(ang)*rr,y:p.y+Math.sin(ang)*rr*.8,r:surge?62:54,age:0,life:delay+.35,delay,done:false,damage:surge?16:14});}
  } else if(sid==='kokhavit'){
    // A heart of light: life comes back, and a shield swallows the next hits.
    const amount=Math.min(a.spec.hp-a.hp,a.spec.hp*(surge?.4:.3)*healShare(m));a.hp+=amount;a.stats.healed+=amount;
    a.lightShield=Math.max(a.lightShield||0,surge?3:2);a.lightShieldTime=Math.max(a.lightShieldTime||0,8);effect(m,'heal',a.x,a.y,{amount,color:'#fff3b0'});event(m,'heal',{side:a.side,amount});helpPip(m,a);
  } else if(sid==='chutal'){
    // A thread of light: it catches the rival and pulls it close.
    m.shots.push({id:++m.nextId,owner:a.side,x:a.x+dir.x*(a.radius+10),y:a.y+dir.y*(a.radius+10),vx:dir.x*920,vy:dir.y*920,r:13,damage:surge?20:14,life:.62,color:col,kind:'thread',special:true,pull:true});
  } else if(sid==='hedanon'){
    // A sound wave where the rival stands, and its echo a moment later, a little wider.
    const p=landing(m,a,480);for(const [delay,k] of [[.2,1],[.8,1.3]])m.zones.push({owner:a.side,kind:'echo',x:p.x,y:p.y,r:(surge?100:84)*k,age:0,life:delay+.35,delay,done:false,damage:surge?24:18});
  } else if(sid==='tlaor'){
    // Stitches of light: broken stones are sewn back, the fox mends itself and its patches hold for a moment.
    for(const c of m.covers)if(c.hp<c.maxHp&&!c.reef&&c.collapseAt==null){c.hp=c.maxHp;effect(m,'stitch',c.x,c.y,{color:'#ffd27a'});}
    const amount=Math.min(a.spec.hp-a.hp,a.spec.hp*(surge?.32:.24)*healShare(m));a.hp+=amount;a.stats.healed+=amount;a.guard=Math.max(a.guard,surge?2.4:1.8);
    effect(m,'stitch',a.x,a.y,{color:'#ffd27a'});effect(m,'heal',a.x,a.y,{amount,color:'#ffd27a'});event(m,'heal',{side:a.side,amount});helpPip(m,a);
  } else if(sid==='ozenav'){
    // Huge ears: for a moment every shot that comes is heard in time and misses, and the feet are quick.
    a.hear=surge?4:3;effect(m,'hear',a.x,a.y,{color:col});helpPip(m,a);
  } else if(sid==='rishrush'){
    // A ring of bell notes, and its echo a moment later, between the first ones.
    const n=surge?10:8;for(const [delay,off] of [[0,0],[.55,Math.PI/n]])m.zones.push({owner:a.side,kind:'bells',x:a.x,y:a.y,age:0,life:delay+.05,delay,done:false,n,off,damage:surge?12:10});
  } else if(sid==='kashevet'){
    // A wave of silence from the moonstone: whoever it reaches cannot shoot for a moment.
    m.waves.push({kind:'silence',owner:a.side,x:a.x,y:a.y,age:0,r:surge?285:240,damage:surge?16:12,silence:surge?3:2.4,push:30,life:.7,hit:[]});
  } else if(sid==='zankor'){
    // The tiger's dash: across the arena like lightning, hitting whoever is in the way.
    // Running away in the chase, the tiger dashes the way it is fleeing, never into the child.
    let d=dir;if(m.flee&&!isHuman(m,a.side)){const away=norm(a.x-t.x||.01,a.y-t.y);d=input.moveX||input.moveY?norm(input.moveX||0,input.moveY||0):away;}
    const dur=surge?.42:.34;a.dash={t:dur,vx:d.x*1150,vy:d.y*920,hit:[],damage:surge?40:30};a.invincible=Math.max(a.invincible,dur+.06);effect(m,'pounce',a.x,a.y,{color:col});
  } else if(sid==='galgalor'){
    const n=surge?14:10;for(let i=0;i<n;i++){const ang=a.aim+i*Math.PI*2/n;
      m.shots.push({id:++m.nextId,owner:a.side,x:a.x+Math.cos(ang)*(a.radius+8),y:a.y+Math.sin(ang)*(a.radius+8),vx:Math.cos(ang)*560,vy:Math.sin(ang)*560,r:8,damage:surge?13:12,life:1.1,color:col,kind:'galgalor',special:true});}
  } else if(sid==='tzadon'){
    // Armoured steps: three heavy stomps around him, each one wider than the last, and his armour holds while he stomps.
    a.guard=Math.max(a.guard,surge?1.5:1.2);
    for(const [delay,k] of [[.15,1],[.5,1.3],[.85,1.6]])m.zones.push({owner:a.side,kind:'stomp',x:a.x,y:a.y,r:Math.round((surge?112:96)*k),age:0,life:delay+.3,delay,done:false,damage:surge?17:13});
  } else if(sid==='rhythmdeer'){
    // The pendulum of the beat: its ring glows first, then the copper weight sweeps across the front from one side to the other.
    const r=surge?205:175,half=surge?1.2:1.05,delay=.45,k=m.rhythm?.side===a.side?deerScale(foeOf(m,a)):1;
    m.zones.push({owner:a.side,kind:'pendulum',x:a.x,y:a.y,r,a0:+(a.aim-half).toFixed(3),a1:+(a.aim+half).toFixed(3),age:0,life:delay+.55,delay,done:false,damage:+((surge?44:32)*k).toFixed(1),hit:[]});
  }
}
function stepBoss(m,a,dt) {
  const b=a.boss,p=m.actors[0];b.timer-=dt;a.moveX=0;a.moveY=0;
  if(b.timer<=0){
    if(b.phase==='guard'){b.phase='windup';b.timer=1.05;b.hit=false;event(m,'boss-windup');}
    else if(b.phase==='windup'){b.phase='charge';b.timer=.55;event(m,'boss-charge');}
    else if(b.phase==='charge'){b.phase='recover';b.timer=2.8;event(m,'boss-open');}
    else{b.phase='guard';b.timer=3.8;event(m,'boss-guard');}
  }
  if(b.phase==='guard'){
    const angle=Math.atan2(p.y-a.y,p.x-a.x),delta=Math.atan2(Math.sin(angle-b.angle),Math.cos(angle-b.angle));b.angle+=clamp(delta,-dt*1.05,dt*1.05);a.aim=b.angle;
    const d=length(p.x-a.x,p.y-a.y);if(d>265)move(m,a,Math.cos(b.angle),Math.sin(b.angle),dt,.65);
    if(Math.abs(delta)<.25&&d<700)shoot(m,a,b.angle,LEVELS[m.level].fireScale*1.3);
  }else if(b.phase==='charge'){
    const old={x:a.x,y:a.y};a.moveX=Math.cos(b.angle);a.moveY=Math.sin(b.angle);a.x+=a.moveX*760*dt;a.y+=a.moveY*760*dt*.8;confine(a);
    for(const c of m.covers)if(c.hp>0&&segmentCircle(old.x,old.y,a.x,a.y,c.x,c.y,c.r+a.radius)!=null){c.hp=0;effect(m,'stone',c.x,c.y,{color:'#e9c790'});event(m,'cover',{broken:true,x:c.x,y:c.y});}
    if(!b.hit&&segmentCircle(old.x,old.y,a.x,a.y,p.x,p.y,p.radius+a.radius)!=null){b.hit=true;damage(m,p,32,a,{special:true,pushX:Math.cos(b.angle)*65,pushY:Math.sin(b.angle)*50});}
  }
  a.aim=b.angle;a.facing=Math.cos(b.angle)>0?1:-1;
}
function aiInput(m,dt) {
  const ai=m.ai,a=m.actors[1],p=foeOf(m,a),level=LEVELS[m.level];ai.timer-=dt;ai.strafeTime-=dt;
  if(ai.timer>0)return m.calm?{...ai,fire:false,special:false}:ai;
  ai.timer=level.reaction;
  if(ai.strafeTime<=0){ai.strafe= m.random()>.5?1:-1;ai.strafeTime=1.5+m.random()*2;}
  const dx=p.x-a.x,dy=p.y-a.y,d=length(dx,dy),n=norm(dx,dy),wanted=a.spec.aiRange||225;
  let toward=d>wanted+45?1:d<wanted-40?-.9:.05;
  // The tiger chase: it keeps far away and only sometimes turns to shoot.
  if(m.flee)toward=d<430?-1.15:d>620?.35:0;
  // A child shining with the comeback star: the computer runs from it.
  if(p.star>0)toward=-1.1;
  let mx=n.x*toward-n.y*.65*ai.strafe,my=n.y*toward+n.x*.65*ai.strafe;
  // Running away near the wall, the tiger slides along it instead of pressing into it.
  if(m.flee&&toward<0){const ox=(a.x-WORLD.cx)/WORLD.rx,oy=(a.y-WORLD.cy)/WORLD.ry,od=length(ox,oy);
    if(od>.7){const k=(od-.7)/.3*2.2,t=norm(-oy*WORLD.rx,ox*WORLD.ry),sd=Math.sign(t.x*(a.x-p.x)+t.y*(a.y-p.y))||ai.strafe;mx+=t.x*sd*k-ox/od*k*.9;my+=t.y*sd*k-oy/od*k*.9;}}
  if(m.pickup&&a.hp<a.spec.hp*.7){const q=norm(m.pickup.x-a.x,m.pickup.y-a.y);mx=q.x;my=q.y;}
  // React to approaching projectiles; the easier opponent only responds late.
  for(const s of m.shots)if(s.owner!==1&&length(s.x-a.x,s.y-a.y)<level.dodge){
    const cross=s.vx*(a.y-s.y)-s.vy*(a.x-s.x),avoid=norm(-s.vy,s.vx);mx+=avoid.x*Math.sign(cross||1)*1.4;my+=avoid.y*Math.sign(cross||1)*1.4;
  }
  if(!a.spec.flies)for(const c of m.covers)if(c.hp>0){const ax=a.x-c.x,ay=a.y-c.y,dist=length(ax,ay),r=c.r+a.radius+45;
    if(dist<r){const push=(r-dist)/45;mx+=ax/(dist||1)*push*2;my+=ay/(dist||1)*push*2;}}
  const goal=modeGoal(m,a,p,d);if(goal){mx=mx*goal.keep+goal.x;my=my*goal.keep+goal.y;}
  // A rival that decided to race for the Wonder seed runs for it, still dodging a little.
  if(m.wonder?.chase&&m.wonder.state==='ready'){const q=norm(m.wonder.x-a.x,m.wonder.y-a.y);mx=mx*.3+q.x;my=my*.3+q.y;}
  // Its own copy star: some rivals take a detour for it, as often as their level says.
  {const star=m.copyStars?.find(s=>s.owner===1&&s.age>=.3);if(star){if(star.chase==null)star.chase=m.extraRandom()<(level.copyChase||0);if(star.chase){const q=norm(star.x-a.x,star.y-a.y);mx=mx*.35+q.x*1.2;my=my*.35+q.y*1.2;}}}
  // The Wonders' gifts: a mushroom when hurt, a firefly or a lit drum nearby.
  {const gift=m.wonder?.state==='active'?wonderGoal(m,a):null;if(gift){const q=norm(gift.x-a.x,gift.y-a.y);mx=mx*.5+q.x;my=my*.5+q.y;}}
  const move=norm(mx,my);ai.moveX=move.x;ai.moveY=move.y;
  const lead=d/a.spec.shotSpeed*level.lead;
  const angle=Math.atan2(dy+p.moveY*p.spec.speed*lead*.8,dx+p.moveX*p.spec.speed*lead)+(m.random()-.5)*level.aimError*(m.pace||1)*2;
  ai.aimX=a.x+Math.cos(angle)*500;ai.aimY=a.y+Math.sin(angle)*500;ai.fire=d<760&&!(p.out>0)&&(!m.flee||m.random()<.4);
  // Holding a copy star, it decides with the copied creature's reach.
  const sid=a.copy&&CREATURES[a.copy]?a.copy:a.id,sc=CREATURES[sid];
  ai.special=m.time>level.specialDelay&&d<(sc.specialRange||300)&&d>(sc.specialMin||0)&&p.stun<=0&&(!['kokhavit','tlaor'].includes(sid)||a.hp<a.spec.hp*.75);
  // Carrying the pearl: a normal kick close to the goal, the big kick only from a little further out.
  if(m.ball?.carrier===1){const G=GOALS[0],gd=length(G.x-a.x,G.y-a.y);ai.aimX=G.x;ai.aimY=G.y+(m.random()-.5)*G.half;ai.fire=gd<BALL_TUNE.aiKick*level.kick;ai.special=gd<BALL_TUNE.aiKick*1.5&&gd>BALL_TUNE.aiKick&&a.superCharge>=1;}
  // The Rhythm Deer attacks only on the beat (tracks.stepRhythm).
  if(m.rhythm&&m.rhythm.side===1){ai.fire=false;ai.special=false;}
  if(m.calm){ai.fire=false;ai.special=false;}return ai;
}
// Like Brawl Stars: after a few calm seconds without hitting or being hit, health refills.
// In a long battle a child's slow shot (slower than SLOW_SHOT) gets a little more aim help, up to 1.4 times more: there a quick
// rival kept stepping out of its way until the clock ran out. Missions keep the plain help.
export const REGEN_DELAY=3,REGEN_RATE=.13,AIM_HELP=1.35,SLOW_SHOT=560;
const aimHelp=(m,s)=>AIM_HELP*(m.hpScale>1?clamp(SLOW_SHOT/(Math.hypot(s.vx,s.vy)||SLOW_SHOT),1,1.4):1);
// SUPER_SHARE: how much of a rival's card life a creature must hit for one super (missions); BATTLE_SHARE in long battles.
export const SUPER_SHARE=+(globalThis.process?.env?.SUPER_SHARE||.33),BATTLE_SHARE=+(globalThis.process?.env?.BATTLE_SHARE||1.2),SUPER_PASSIVE=+(globalThis.process?.env?.SUPER_PASSIVE||30);
// Each creature's own super time counts: a quick super (6 on the card) fills sooner than a strong one (9).
export const SUPER_REF=7,STORM_CHARGE=2,REST_AFTER=1;
// Havzuk's static also charges his next shots: after a rest, CHARGED_SHOTS bigger bolts hit CHARGED_HIT times as hard. With a
// resting thumb a child now beats Kashevet about three fights in five instead of one in five; a rival Havzuk is unchanged.
export const CHARGED_SHOTS=+(globalThis.process?.env?.CHARGED_SHOTS||6),CHARGED_HIT=+(globalThis.process?.env?.CHARGED_HIT||1.6);
function chargeSuper(m,a,amount){if(!a||a.hp<=0)return;if(a.upgrades?.includes('quick'))amount*=1.35;amount*=SUPER_REF/(a.spec.specialCooldown||SUPER_REF);
  // The storm doubles everyone's super (three times tilted the battle toward the computer's stronger supers). A Lab form with
  // the double charge fills twice as fast instead of half again, and a lit drum in the dance Wonder doubles it too.
  if(a.form>0)amount*=a.lab?.mech==='doublecharge'?LAB_TUNE.charge:FORM_CHARGE;if(m.wonderFx?.storm)amount*=STORM_CHARGE;
  if(m.drums?.src==='dance'&&tracks.onLitDrum(m,a))amount*=2;fillSuper(m,a,amount);}
function fillSuper(m,a,amount){if(!a||a.hp<=0)return;const before=a.superCharge||0;a.superCharge=Math.min(1,before+amount);if(before<1&&a.superCharge>=1)event(m,'super-ready',{side:a.side});}
function regenerate(a,dt){a.calm=(a.calm||0)+dt;a.regen=0;if(a.hp>0&&!(a.out>0)&&a.hp<a.spec.hp&&a.calm>=REGEN_DELAY){a.hp=Math.min(a.spec.hp,a.hp+a.spec.hp*REGEN_RATE*dt);a.regen=1;}}
function stepActor(m,a,input,dt,scale=1) {
  // Havzuk's static: a child's thumb that rests a moment (or a silence) charges the spark: the super fills faster while it does not shoot.
  a.restT=input.fire&&!(a.silence>0)?0:(a.restT||0)+dt;
  if(a.spec.restCharge&&a.restT>=REST_AFTER&&isHuman(m,a.side))a.charged=CHARGED_SHOTS;
  regenerate(a,dt);if(!(a.out>0)&&m.status==='playing')chargeSuper(m,a,dt/SUPER_PASSIVE*(a.phase2?2:1)*(a.spec.restCharge&&a.restT>=REST_AFTER&&isHuman(m,a.side)?a.spec.restCharge:1));
  for(const key of ['fireCd','invincible','guard','stun','slow','root','hit','attack'])a[key]=Math.max(0,a[key]-dt);
  for(const key of ['hear','silence','cardSpeed','rush'])if(a[key]>0)a[key]=Math.max(0,a[key]-dt);
  if(a.star>0){a.star=Math.max(0,a.star-dt);if(a.star<=0)event(m,'comeback-end',{side:a.side});}
  if(a.form>0){a.form=Math.max(0,a.form-dt);if(a.form<=0)event(m,'form-end',{side:a.side});}
  if(a.lightShieldTime>0){a.lightShieldTime-=dt;if(a.lightShieldTime<=0)a.lightShield=0;}
  // The Lab's light shield grows a hit back every few seconds while the form lasts.
  if(a.form>0&&a.lab?.mech==='shield3'&&(a.lightShield||0)<LAB_TUNE.shield){a.shieldGrow=(a.shieldGrow||0)+dt;if(a.shieldGrow>=LAB_TUNE.shieldEvery){a.shieldGrow=0;a.lightShield=(a.lightShield||0)+1;a.lightShieldTime=Math.max(a.lightShieldTime||0,a.form);}}
  // The last blow has landed: everyone holds still while it sinks in.
  if(m.ending){if(a.tellT>0)a.tellT=Math.max(0,a.tellT-dt);a.moveX=0;a.moveY=0;return;}
  if(a.tellT>0){a.tellT-=dt;if(a.tellT<=0){a.tellT=0;if(a.hp>0&&!(a.out>0))releaseTell(m,a,input);}}
  if(a.out>0){a.moveX=0;a.moveY=0;return;}
  // A creature that fell and does not come back stays down.
  if(a.hp<=0||a.stun>0){a.moveX=0;a.moveY=0;return;}
  if(a.boss){stepBoss(m,a,dt);return;}
  if(a.windup>0){a.windup-=dt;if(a.windup<=0){const surge=a.windupSurge;m.waves.push({kind:'quake',owner:a.side,x:a.x,y:a.y,age:0,r:surge?235:182,damage:surge?65:46,life:.7,hit:[],...(a.windupKind?{src:a.windupKind,tint2:a.spec.color}:{})});a.windupKind=null;event(m,'quake',{side:a.side});}}
  if(a.dash){const d=a.dash,old={x:a.x,y:a.y};d.t-=dt;a.x+=d.vx*dt;a.y+=d.vy*dt;confine(a);resolveCover(m,a);const n=norm(d.vx,d.vy);a.moveX=n.x;a.moveY=n.y;
    for(const t of foesOf(m,a))if(!(t.out>0)&&t.hp>0&&!d.hit.includes(t.side)&&segmentCircle(old.x,old.y,a.x,a.y,t.x,t.y,t.radius+a.radius)!=null){d.hit.push(t.side);damage(m,t,d.damage,a,{special:true,fam:d.src?familyOf(d.src):null,pushX:n.x*70,pushY:n.y*55});}
    if(d.t<=0)a.dash=null;return;}
  move(m,a,input.moveX||0,input.moveY||0,dt,scale);
  if(input.aimX!=null)a.aim=Math.atan2(input.aimY-a.y,input.aimX-a.x);
  else if(m.hide&&a.side===0&&m.hide.seen<=0)a.aim=Math.atan2(m.hide.y-a.y,m.hide.x-a.x);
  // A decoy from a comeback card: every second auto-aimed shot goes to the copy.
  else if(m.decoy&&m.decoy.side!==a.side&&a.decoyAim)a.aim=Math.atan2(m.decoy.y-a.y,m.decoy.x-a.x);
  else {const target=foeOf(m,a),distance=length(target.x-a.x,target.y-a.y),lead=distance/a.spec.shotSpeed*(isHuman(m,a.side)?.45:.72),speed=target.spec.speed*(target.side&&!m.versus?LEVELS[m.level].speedScale:1);a.aim=Math.atan2(target.y+target.moveY*speed*lead*.8-a.y,target.x+target.moveX*speed*lead-a.x);}
  if(Math.abs(Math.cos(a.aim))>.15)a.facing=Math.cos(a.aim)>0?1:-1;
  if(m.ball&&m.ball.carrier===a.side){
    if(input.aimX==null){const G=GOALS[1-a.side];a.aim=Math.atan2(G.y-a.y,G.x-a.x);a.facing=Math.cos(a.aim)>0?1:-1;}
    if(input.special&&a.superCharge>=1&&m.ball.carryTime>=.22){a.superCharge=0;kickBall(m,a,true);}
    else if(input.fire){const G=GOALS[1-a.side];if(length(G.x-a.x,G.y-a.y)<BALL_TUNE.kickRange)kickBall(m,a,false);else if(!a.farHint){a.farHint=true;event(m,'kick-far',{side:a.side});}}
    return;}
  if(input.special&&a.superCharge>=1&&superFree(a)){
    // Two landed supers fill the star crown: the next press grows the Power Form. A computer rival warns first.
    if(a.canForm&&!a.formUsed&&a.pips>=FORM_PIPS){if(isHuman(m,a.side))transform(m,a,input);else formTell(m,a);}
    // A child's super that lights the second pip at once (a beam, a heal) leaves the charge full: the crown is ready to press.
    else{const pips=a.pips;if(useSpecial(m,a,input)){if(!(a.pips>pips&&a.pips>=FORM_PIPS&&isHuman(m,a.side)))a.superCharge=0;event(m,'super',{side:a.side});}}}
  if(input.fire)shoot(m,a,a.aim,isHuman(m,a.side)?1:LEVELS[m.level].fireScale*(m.pace||1));
}
// Gold eyes and a bell for a second (a creature that already warns keeps its own warning time), then the rival's Power Form.
function formTell(m,a){a.formTell=true;a.tellT=Math.min(1,a.spec.tell||1);a.attack=.3;effect(m,'tell',a.x,a.y,{kind:'form',color:'#ffd23a',life:a.tellT});event(m,'tell',{kind:'form',side:a.side});}
// The warning is over: the power comes out. Silenced or hypnotized meanwhile, the super is not lost: it waits, full.
function releaseTell(m,a,input){
  if(a.formTell){a.formTell=false;if(!(a.stun>0))transform(m,a,input);return;}
  if(a.silence>0||a.stun>0){fillSuper(m,a,1);return;}
  a.releasing=true;useSpecial(m,a,input);a.releasing=false;
}
// The child always plays side 0; in a friend battle side 1 is a person too and gets the same help (isHuman).
// In a co-op battle a second child plays side 2, on the same team as side 0; in the pair race side 2 is a computer friend.
export const foesOf=(m,a)=>m.coop||m.allied?(a.side===1?m.actors.filter(x=>x.side!==1):[m.actors[1]]):[m.actors[1-a.side]];
// The rival to aim at: the only one, or the nearest one still in the fight.
export function foeOf(m,a){const list=foesOf(m,a);if(list.length===1)return list[0];let best=null,bd=Infinity;for(const f of list){if(f.out>0||f.hp<=0)continue;const d=length(f.x-a.x,f.y-a.y);if(d<bd){bd=d;best=f;}}return best||list[0];}
const angleGap=(x,y)=>Math.abs(Math.atan2(Math.sin(x-y),Math.cos(x-y)));
// Where a Lab shot lands: a puddle that only slows for a moment, or a small flame of the fire trail.
function puddle(m,s){if(ovalDistance(s.x,s.y)<.97)m.zones.push(s.ember?{owner:s.owner,kind:'fire',trail:true,x:Math.round(s.x),y:Math.round(s.y),r:LAB_TUNE.puddleR,age:0,life:LAB_TUNE.emberLife,pulse:0}:{owner:s.owner,kind:'puddle',x:Math.round(s.x),y:Math.round(s.y),r:LAB_TUNE.puddleR,age:0,life:LAB_TUNE.puddleLife,pulse:0});s.puddle=false;s.ember=false;}
function updateProjectiles(m,dt) {
  for(const s of m.shots){
    if(m.zones.length&&!s.over){const sw=m.zones.find(z=>z.owner!==s.owner&&(z.kind==='vortex'||z.kind==='tidering')&&length(s.x-z.x,s.y-z.y)<z.r);if(sw){s.life=0;effect(m,'stone',s.x,s.y,{color:sw.kind==='vortex'?'#9fc4ff':'#d6f1ff'});continue;}}
    const x=s.x+s.vx*dt,y=s.y+s.vy*dt;s.life-=dt;
    let hit=null,t=2;
    const helped=isHuman(m,s.owner);
    for(const target of foesOf(m,m.actors[s.owner])){if(target.out>0||target.hp<=0)continue;
      // How close a rival's shot comes to a child: a narrow miss is a dodge (see nearMiss).
      if(isHuman(m,target.side)){const near=s.near??={};near[target.side]=Math.min(near[target.side]??Infinity,segmentDistance(s.x,s.y,x,y,target.x,target.y));}
      if(target.hear>0){if(!s.missed&&!m.ending&&segmentCircle(s.x,s.y,x,y,target.x,target.y,s.r+target.radius)!=null){s.missed=true;target.stats.dodges++;effect(m,'evade',target.x,target.y,{color:'#c9fbff'});}continue;}
      const tt=segmentCircle(s.x,s.y,x,y,target.x,target.y,(s.r+target.radius)*(helped?aimHelp(m,s):1));if(tt!=null&&tt<t){hit=target;t=tt;}}
    if(m.ball&&m.ball.carrier<0){const bt=segmentCircle(s.x,s.y,x,y,m.ball.x,m.ball.y,s.r+16);if(bt!=null&&bt<t){s.life=0;m.ball.vx+=s.vx*.4;m.ball.vy+=s.vy*.4;effect(m,'stone',m.ball.x,m.ball.y,{color:'#d6f1ff'});continue;}}
    // The children's shots fly on through a stone and chip it; the computer's shots stop there. A Lab shot that flies over
    // stones never touches them; one that breaks stones breaks every stone it meets and flies on.
    if(!s.over)for(let i=0;i<m.covers.length;i++){const c=m.covers[i];if(c.hp<=0)continue;const ct=segmentCircle(s.x,s.y,x,y,c.x,c.y,c.r+s.r);if(ct!=null&&ct<t){
      if(s.breaker&&!c.reef){c.hp=0;chip(m,c,i,s.x+(x-s.x)*ct,s.y+(y-s.y)*ct);effect(m,'stone',c.x,c.y,{color:'#ead2a9'});continue;}
      if(helped){s.chipped??=[];if(!s.chipped.includes(i)){s.chipped.push(i);c.hp=Math.max(0,c.hp-s.damage*.5);chip(m,c,i,s.x+(x-s.x)*ct,s.y+(y-s.y)*ct);}continue;}hit=c;t=ct;}}
    if(hit){s.x+=(x-s.x)*t;s.y+=(y-s.y)*t;s.life=0;if(s.explode)burst(m,s);if(s.puddle||s.ember)puddle(m,s);
      // The thread pulls whoever it catches to just in front of its owner.
      if(s.pull&&hit.side!=null&&hit.invincible<=0&&!hit.boss&&!(hit.star>0)){const o=m.actors[s.owner],n=norm(hit.x-o.x||.01,hit.y-o.y),gap=o.radius+hit.radius+34,from={x:hit.x,y:hit.y};hit.x=o.x+n.x*gap;hit.y=o.y+n.y*gap*.8;confine(hit);resolveCover(m,hit);hit.slow=Math.max(hit.slow,.9);effect(m,'thread',hit.x,hit.y,{from,to:{x:o.x,y:o.y},color:o.spec.color});event(m,'pull',{side:hit.side});}
      if(hit.side!=null){s.hitSide=hit.side;damage(m,hit,s.damage,m.actors[s.owner],{special:!!s.special,ghost:!!s.ghost,fam:s.src?familyOf(s.src):null,hitAngle:Math.atan2(-s.vy,-s.vx),pushX:s.kind==='maimi'?s.vx*.018:0,pushY:s.kind==='maimi'?s.vy*.018:0});}
      else{hit.hp=Math.max(0,hit.hp-s.damage);chip(m,hit,m.covers.indexOf(hit),s.x,s.y);}
    }else{s.x=x;s.y=y;
      // Bouncy shots (and the bubbles Wonder's bubbles): a shot leaving the oval bounces back off its edge, once.
      if((m.wonderFx?.bouncy||s.bubble)&&!s.bounced&&ovalDistance(s.x,s.y)>.98){const od=ovalDistance(s.x,s.y),n=norm((s.x-WORLD.cx)/(WORLD.rx*WORLD.rx),(s.y-WORLD.cy)/(WORLD.ry*WORLD.ry)),dot=s.vx*n.x+s.vy*n.y;
        if(dot>0){s.vx-=2*dot*n.x;s.vy-=2*dot*n.y;s.bounced=true;s.life=Math.max(s.life,.8);s.x=WORLD.cx+(s.x-WORLD.cx)*.98/od;s.y=WORLD.cy+(s.y-WORLD.cy)*.98/od;}}}
  }
  for(const s of m.shots)if(s.explode&&!s.burst&&(s.life<=0||s.x<=40||s.x>=1240||s.y<=85||s.y>=710))burst(m,s);
  const alive=s=>s.life>0&&s.x>40&&s.x<1240&&s.y>85&&s.y<710;
  for(const s of m.shots)if(!alive(s)){if(s.near)nearMiss(m,s);if(s.puddle||s.ember)puddle(m,s);}
  m.shots=m.shots.filter(alive);
  for(const w of m.waves){w.age+=dt;if(w.visual)continue;if(w.kind==='wave'){w.x+=Math.cos(w.angle)*w.speed*dt;w.y+=Math.sin(w.angle)*w.speed*dt;}
    const a=m.actors[w.owner],r=w.kind==='wave'?w.r:w.r*Math.min(1,w.age/.22),fam=w.src?familyOf(w.src):null;
    for(const target of foesOf(m,a))if(!(target.out>0)&&!w.hit.includes(target.side)&&length(target.x-w.x,target.y-w.y)<r+target.radius){
      w.hit.push(target.side);const n=norm(target.x-w.x,target.y-w.y),push=w.push??(w.kind==='wave'?65:32);
      if(w.slow&&target.invincible<=0)target.slow=Math.max(target.slow,w.slow);
      if(w.stun&&target.invincible<=0&&!(target.star>0)){target.stun=Math.max(target.stun,w.stun);effect(m,'dizzy',target.x,target.y,{color:'#d7b8ff'});}
      if(w.silence&&target.invincible<=0&&!(target.star>0)){target.silence=Math.max(target.silence||0,w.silence);effect(m,'silenced',target.x,target.y,{color:'#cfe0ff'});event(m,'silenced',{side:target.side});}
      damage(m,target,w.damage??(w.kind==='wave'?34:w.kind==='electric'?32:46),a,{fam,pushX:n.x*push,pushY:n.y*push,special:true});if(w.kind==='wave')target.slow=1;
    }
    for(let i=0;i<m.covers.length;i++){const c=m.covers[i];if(c.hp>0&&!w.hit.includes('c'+i)&&length(c.x-w.x,c.y-w.y)<r+c.r){w.hit.push('c'+i);c.hp=Math.max(0,c.hp-42);effect(m,'stone',c.x,c.y,{color:'#ead2a9'});}}
  }
  m.waves=m.waves.filter(w=>w.age<w.life);
  for(const z of m.zones){z.age+=dt;z.pulse-=dt;
    // A Wonder meteor belongs to nobody (or to the Wonder's owner, whom it spares): it marks its spot, then lands.
    if(z.kind==='meteor'){if(!z.done&&z.age>=z.delay){z.done=true;effect(m,'meteorfall',z.x,z.y,{r:z.r,color:'#ffb43a'});event(m,'meteor',{x:z.x,y:z.y});
      for(const t of m.actors)if(t.side!==z.owner&&t.hp>0&&!(t.out>0)&&t.invincible<=0&&length(t.x-z.x,t.y-z.y)<z.r+t.radius){const n=norm(t.x-z.x||.01,t.y-z.y);damage(m,t,z.damage,null,{special:true,fam:'light',pushX:n.x*30,pushY:n.y*24});}}continue;}
    const a=m.actors[z.owner];if(!a)continue;const targets=foesOf(m,a),isIn=t=>length(t.x-z.x,t.y-z.y)<z.r+t.radius;let pulsed=false;const fam=z.src?familyOf(z.src):null;
    // A Lab puddle only slows; it never hurts.
    if(z.kind==='puddle'){for(const target of targets)if(isIn(target)&&!(target.star>0))target.slow=Math.max(target.slow,LAB_TUNE.puddleSlow);continue;}
    if(z.kind==='echo'){if(!z.done&&z.age>=z.delay){z.done=true;effect(m,'echo',z.x,z.y,{color:a.spec.color,r:z.r});for(const target of targets)if(isIn(target)&&target.invincible<=0&&!(target.out>0))damage(m,target,z.damage,a,{special:true,fam});}continue;}
    if(z.kind==='bells'){if(!z.done&&z.age>=z.delay){z.done=true;const o=m.actors[z.owner];if(o.hp>0&&!(o.out>0)){for(let i=0;i<z.n;i++){const ang=z.off+i*Math.PI*2/z.n;m.shots.push({id:++m.nextId,owner:z.owner,x:o.x+Math.cos(ang)*(o.radius+8),y:o.y+Math.sin(ang)*(o.radius+8)*.8,vx:Math.cos(ang)*520,vy:Math.sin(ang)*420,r:9,damage:z.damage,life:1.05,color:o.spec.color,kind:'bell',special:true,...(z.src?{src:z.src,tint2:z.tint2}:{})});}effect(m,'bells',o.x,o.y,{color:o.spec.color});event(m,'bells',{side:z.owner});}}continue;}
    if(z.kind==='star'||z.kind==='feather'){if(!z.done&&z.age>=z.delay){z.done=true;effect(m,z.kind==='feather'?'featherfall':'starfall',z.x,z.y,{color:z.kind==='feather'?'#cfe0ff':'#ffe27a',r:z.r});for(const target of targets)if(isIn(target)&&target.invincible<=0&&!(target.out>0)){const n=norm(target.x-z.x||.01,target.y-z.y);damage(m,target,z.damage,a,{special:true,fam,pushX:n.x*30,pushY:n.y*24});}}continue;}
    if(z.kind==='roots'){if(!z.done&&z.age>=z.delay){z.done=true;for(const target of targets)if(isIn(target)&&target.invincible<=0&&!(target.star>0)){target.root=Math.max(target.root,z.root);damage(m,target,z.damage,a,{special:true,fam});effect(m,'rooted',target.x,target.y,{color:'#9be06a'});}}continue;}
    // Tzadon's stomps follow him until each one lands, every one a little wider, pushing outward.
    if(z.kind==='stomp'){if(!z.done){if(a.hp>0&&!(a.out>0)){z.x=a.x;z.y=a.y;}if(z.age>=z.delay){z.done=true;effect(m,'stomp',z.x,z.y,{r:z.r,color:a.spec.color});event(m,'stomp',{side:z.owner,x:z.x,y:z.y});
      for(const target of targets)if(isIn(target)&&target.invincible<=0&&!(target.out>0)){const n=norm(target.x-z.x||.01,target.y-z.y);damage(m,target,z.damage,a,{special:true,fam,pushX:n.x*40,pushY:n.y*32});}}}continue;}
    // The pendulum: after its ring glows, the arm sweeps from a0 to a1, and whoever it passes is hit once and pushed along.
    if(z.kind==='pendulum'){if(z.age<z.delay)continue;const k=clamp((z.age-z.delay)/(z.life-z.delay),0,1),ang=z.a0+(z.a1-z.a0)*k,way=Math.sign(z.a1-z.a0)||1;
      for(const target of targets){if(z.hit.includes(target.side)||target.invincible>0||target.out>0||target.hp<=0)continue;const dx=target.x-z.x,dy=(target.y-z.y)/.8,d=length(dx,dy);
        if(d>z.r+target.radius||angleGap(Math.atan2(dy,dx),ang)>Math.atan2(target.radius+16,Math.max(d,1)))continue;
        z.hit.push(target.side);const side={x:-Math.sin(ang)*way,y:Math.cos(ang)*way};damage(m,target,z.damage,a,{special:true,fam,pushX:side.x*60,pushY:side.y*48});}continue;}
    if(z.kind==='tornado'){z.x+=z.vx*dt;z.y+=z.vy*dt;if(length((z.x-WORLD.cx)/WORLD.rx,(z.y-WORLD.cy)/WORLD.ry)>.93){z.vx*=-.6;z.vy*=-.6;}
      for(const target of targets)if(isIn(target)&&target.invincible<=0&&!target.boss&&!(target.out>0)&&!(target.star>0)){z.caught=true;(z.caughtSides??=[]).includes(target.side)||z.caughtSides.push(target.side);target.x+=(z.x-target.x)*Math.min(1,dt*7);target.y+=(z.y-target.y)*Math.min(1,dt*7);confine(target);if(z.pulse<=0){damage(m,target,z.damage,a,{special:true,fam});pulsed=true;}}
      if(pulsed)z.pulse=.3;
      if(z.age+dt>=z.life&&z.caught&&!z.thrown){z.thrown=true;const n=norm(z.vx||1,z.vy);for(const target of targets)if(z.caughtSides.includes(target.side)){damage(m,target,z.finale,a,{special:true,fam,pushX:n.x*140,pushY:n.y*110});target.stun=Math.max(target.stun,.35);}}continue;}
    if(z.kind==='tidering'){z.x=a.x;z.y=a.y;if(a.hp<=0||a.out>0)z.age=z.life;
      for(const target of targets)if(isIn(target)&&target.invincible<=0&&!(target.out>0)){const n=norm(target.x-z.x||.01,target.y-z.y);target.x=z.x+n.x*(z.r+target.radius+2);target.y=z.y+n.y*(z.r+target.radius+2);confine(target);resolveCover(m,target);if(z.pulse<=0){damage(m,target,z.damage,a,{special:true,fam});pulsed=true;}}
      if(pulsed)z.pulse=.5;continue;}
    if(z.kind==='vortex'){for(const target of targets)if(isIn(target)){target.slow=Math.max(target.slow,.25);const n=norm(z.x-target.x,z.y-target.y);if(target.invincible<=0&&!target.boss&&!(target.star>0)){target.x+=n.x*110*dt;target.y+=n.y*90*dt;confine(target);resolveCover(m,target);}if(z.pulse<=0){damage(m,target,z.damage,a,{special:true,fam});pulsed=true;}}
      if(pulsed)z.pulse=.5;continue;}
    // A Lab fire trail burns gently: one small blow every half second, however many flames a creature stands in.
    if(z.trail){for(const target of targets)if(isIn(target)&&(target.trailAt??-9)<=m.time){target.trailAt=m.time+.5;damage(m,target,LAB_TUNE.trailDps*.5/(m.superHit||1),a,{special:true,minor:true});}continue;}
    for(const target of targets)if(isIn(target)){if(z.kind==='water')target.slow=Math.max(target.slow,.2);else if(z.pulse<=0){damage(m,target,6,a,{special:true,fam});pulsed=true;}}
    if(pulsed)z.pulse=.5;
  }m.zones=m.zones.filter(z=>z.age<z.life);
}
// A shot that hits a stone knocks chips off it (the stone wobbles from hitAt).
function chip(m,c,i,x,y){c.hitAt=m.time;effect(m,'chip',x,y,{color:'#ead2a9',cover:i});event(m,'cover',{broken:c.hp===0,x:c.x,y:c.y});}
const segmentDistance=(ax,ay,bx,by,px,py)=>{const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0;return length(ax+dx*t-px,ay+dy*t-py);};
// A rival's shot that just missed a child: an ink afterimage, a little super, and a dodge on the result. At most one per 2 s.
export const NEAR_MISS=28,NEAR_EVERY=2;
function nearMiss(m,s){if(m.ending||s.missed)return;
  for(const side of Object.keys(s.near)){const t=m.actors[side];if(!t||t.side!==+side||t.side===s.hitSide||t.hp<=0||t.out>0||s.near[side]>=t.radius+NEAR_MISS||m.time-t.nearAt<NEAR_EVERY)continue;
    t.nearAt=m.time;t.stats.dodges++;event(m,'near-miss',{side:t.side,x:t.x,y:t.y});effect(m,'afterimage',t.x,t.y,{side:t.side,id:t.id,facing:t.facing});chargeSuper(m,t,.05);}}
function burst(m,s){s.burst=true;const p={x:s.x,y:s.y},tag=s.src?{src:s.src,tint2:s.tint2}:{};
  m.waves.push({kind:'blast',owner:s.owner,x:p.x,y:p.y,age:0,r:s.explode.r,damage:s.explode.damage,push:40,life:.5,hit:[],...tag});
  m.zones.push({owner:s.owner,kind:'fire',x:p.x,y:p.y,r:s.explode.r*.62,age:0,life:2.5,pulse:.3,...tag});event(m,'blast',{side:s.owner});}
export function finish(m,winner,reason='knockout') {
  if(m.status==='finished')return;
  m.winner=winner;m.reason=reason;m.status='finished';event(m,'finish',{winner,reason});
}
// After the finish nothing is decided any more, but the picture keeps moving: shots fly out, splats fade.
// A dash or a windup still running when the battle ended is let go, so nobody stays frozen mid-leap.
export function settle(m,dt) {
  dt=clamp(dt,0,1/30);m.events=[];
  for(const e of m.effects)e.age+=dt;m.effects=m.effects.filter(e=>e.age<1);
  for(const s of m.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;}m.shots=m.shots.filter(s=>s.life>0&&s.x>40&&s.x<1240&&s.y>85&&s.y<710);
  for(const w of m.waves){w.age+=dt;if(w.kind==='wave'&&w.speed){w.x+=Math.cos(w.angle)*w.speed*dt;w.y+=Math.sin(w.angle)*w.speed*dt;}}m.waves=m.waves.filter(w=>w.age<w.life);
  for(const z of m.zones)z.age+=dt;m.zones=m.zones.filter(z=>z.age<z.life);
  for(const a of m.actors){for(const k of ['hit','attack','invincible','tellT'])if(a[k]>0)a[k]=Math.max(0,a[k]-dt);if(a.dash)a.dash=null;if(a.windup>0)a.windup=0;}
}
// ------------------------------------------------------------------ copy stars, the comeback star, comeback cards
export const COPY_TIME=6,COPY_REACH=30,COMEBACK_FALL=.8,STAR_TIME=6,COMEBACK_GAP=.35;
export const COMEBACK_CARDS=['super','crystal','decoy','speed','heart'],CCARD_WORDS=Object.freeze({super:'כוח־על',crystal:'קריסטל',decoy:'כפיל',speed:'ירי מהיר',heart:'עוד לב'});
export const COPYABLE=Object.keys(CREATURES).filter(id=>!NO_COPY.includes(id));
// A super that hits another creature can leave its copy star: it hops toward the middle, and only the one who hit may take it.
// A story guardian never takes the child's power: in Kashevet's valley she grabbed the child's super again and again.
function dropCopy(m,a,source){
  if(!m.copyOn||m.calm||m.ending||!source.superSeq||source.copySeq===source.superSeq||a.id===source.id||!COPYABLE.includes(a.id)||source.side==null||m.story&&source.giant)return;
  source.copySeq=source.superSeq;const r=m.extraRandom,ang=Math.atan2(WORLD.cy-a.y,WORLD.cx-a.x)+(r()-.5)*.9,d=120+r()*40;
  let tx=a.x+Math.cos(ang)*d,ty=a.y+Math.sin(ang)*d*.8;const od=ovalDistance(tx,ty);if(od>.85){tx=WORLD.cx+(tx-WORLD.cx)*.85/od;ty=WORLD.cy+(ty-WORLD.cy)*.85/od;}
  const star={x:Math.round(a.x),y:Math.round(a.y),kind:a.id,owner:source.side,t:COPY_TIME,age:0,sx:a.x,sy:a.y,tx:Math.round(tx),ty:Math.round(ty)};
  m.copyStars.push(star);event(m,'copy-drop',{x:star.tx,y:star.ty,kind:a.id,owner:source.side});}
function stepCopy(m,dt){
  for(const s of m.copyStars){s.age+=dt;s.t=Math.max(0,s.t-dt);const k=Math.min(1,s.age/.5),e=1-(1-k)*(1-k);s.x=Math.round(s.sx+(s.tx-s.sx)*e);s.y=Math.round(s.sy+(s.ty-s.sy)*e);
    const o=m.actors[s.owner];
    if(s.age>=.5&&o&&o.hp>0&&!(o.out>0)&&!m.ending&&length(o.x-s.x,o.y-s.y)<o.radius+COPY_REACH){s.taken=true;o.copy=s.kind;o.stats.copies++;fillSuper(m,o,.5);
      effect(m,'spark-pop',s.x,s.y,{color:CREATURES[s.kind].color,big:true});event(m,'copy',{side:o.side,kind:s.kind,x:s.x,y:s.y});continue;}
    if(s.t<=0){s.taken=true;event(m,'copy-gone',{x:s.x,y:s.y,kind:s.kind,owner:s.owner});}}
  m.copyStars=m.copyStars.filter(s=>!s.taken);
}
// The comeback star: once, between the 20th second and 10 before the end, a child far behind (35 points of life or more) sees a
// star fall near it. Against the computer only the child; in a friend battle whichever friend is behind; never in co-op or a mission.
function stepComeback(m,dt){const C=m.comeback;
  if(C){C.age+=dt;if(C.age<COMEBACK_FALL)return;C.t=Math.max(0,C.t-dt);const a=m.actors[C.side];
    if(a&&a.hp>0&&!(a.out>0)&&!m.ending&&length(a.x-C.x,a.y-C.y)<a.radius+COPY_REACH){a.star=STAR_TIME;effect(m,'spark-pop',C.x,C.y,{color:'#fff3b0',big:true});event(m,'comeback',{side:C.side,x:C.x,y:C.y});m.comeback=null;return;}
    if(C.t<=0){event(m,'comeback-gone',{side:C.side});m.comeback=null;}return;}
  if(m.comebackDone||m.calm||m.ending||m.time<20||m.time>m.duration-10)return;
  for(const side of m.versus?[0,1]:[0]){const a=m.actors[side],b=m.actors[1-side];if(a.hp<=0||a.out>0)continue;
    if(b.hp/b.spec.hp-a.hp/a.spec.hp<COMEBACK_GAP)continue;
    const spot=comebackSpot(m,a);m.comebackDone=true;m.comeback={x:spot.x,y:spot.y,t:STAR_TIME,side,age:0};event(m,'comeback-fall',{side,x:spot.x,y:spot.y});return;}
}
function comebackSpot(m,a){const r=m.extraRandom;let best=null;
  for(let i=0;i<16;i++){const ang=r()*Math.PI*2,d=180+r()*40,x=Math.round(a.x+Math.cos(ang)*d),y=Math.round(a.y+Math.sin(ang)*d*.8);
    if(ovalDistance(x,y)>.86||m.covers.some(c=>c.hp>0&&length(c.x-x,c.y-y)<c.r+30))continue;best={x,y};break;}
  if(best)return best;const q=norm(WORLD.cx-a.x,WORLD.cy-a.y);return {x:Math.round(a.x+q.x*200),y:Math.round(a.y+q.y*160)};}
// A child shining with the star bumps the rival aside on touch, now and then.
function bumps(m){for(const a of m.actors){if(!(a.star>0)||a.hp<=0||a.out>0)continue;a.bumpAt??={};
  for(const t of foesOf(m,a)){if(t.hp<=0||t.out>0||(a.bumpAt[t.side]??-9)>m.time||length(t.x-a.x,t.y-a.y)>a.radius+t.radius+6)continue;
    a.bumpAt[t.side]=m.time+.8;const n=norm(t.x-a.x||.01,t.y-a.y);damage(m,t,10,a,{special:true,minor:true,pushX:n.x*90,pushY:n.y*70});effect(m,'bump',t.x,t.y,{color:a.spec.color});event(m,'comeback-bump',{side:a.side,target:t.side,x:t.x,y:t.y});}}}
// The comeback card the loser of the last friend round picked works from 'go'.
function applyCard(m){const C=m.ccard,a=m.actors[C.side];if(!a)return;
  if(C.id==='super')a.superCharge=Math.max(a.superCharge,.6);
  if(C.id==='crystal'){m.pickupAt=Math.min(m.pickupAt,6);m.pickupSpot={x:C.side?850:430,y:395};}
  // A copy beside the child that runs the mirror of its path; the rival's auto-aim goes to it every second shot.
  if(C.id==='decoy'){const y=a.y+(a.y>WORLD.cy?-90:90);m.decoy={side:C.side,x:Math.round(a.x),y:Math.round(y),facing:a.facing,t:5,px:a.x,py:a.y};}
  if(C.id==='speed')a.cardSpeed=20;
  event(m,'card',{side:C.side,id:C.id});}
function stepDecoy(m,dt){const D=m.decoy,a=m.actors[D.side];D.t=Math.max(0,D.t-dt);
  if(a&&a.hp>0){D.x+=a.x-D.px;D.y-=a.y-D.py;D.px=a.x;D.py=a.y;D.facing=a.facing;const od=ovalDistance(D.x,D.y);if(od>.92){D.x=WORLD.cx+(D.x-WORLD.cx)*.92/od;D.y=WORLD.cy+(D.y-WORLD.cy)*.92/od;}}
  if(D.t<=0||!a||a.hp<=0){effect(m,'wonder-puff',D.x,D.y,{id:'decoy'});event(m,'decoy-end',{side:D.side});m.decoy=null;}}
// A story guardian at half life: the Little Shadow lends his star, and the child's Power Form is one super away.
function lendStar(m){const b=m.actors[1];if(!m.story||m.lent||!b.giant||b.hp<=0||b.hp>=b.spec.hp*.5)return;m.lent=true;const p=m.actors[0];
  if(!p.formUsed&&p.hp>0){p.canForm=true;p.pips=Math.max(p.pips,FORM_PIPS-1);effect(m,'star-lend',p.x,p.y,{color:'#ffe27a'});event(m,'star-lend',{side:0});}}
// The Rhythm Deer on a strong beat: a fan of antler shots at the nearest rival, or on the third beat its pendulum when it is charged.
// .7: a resting thumb wins nine fights in ten, like the fire and sea guardians, and a real-touch child ends with a third to a half
// of its life (at .55 the deer never threatened the child; at .75 real-touch wins ended at a tenth, too close for a world's climax).
export const DEER_SHOT=+(globalThis.process?.env?.DEER_SHOT||.7);
// The deer's beat hurts every child the same share of its life: a sturdy armoured creature no longer shrugs it off and a light
// quick one no longer falls in a few beats (the guardian was a cliff: one starter won every time, another lost most fights).
export const DEER_REF_HP=190,deerScale=t=>t?clamp((CREATURES[t.id]?.hp||DEER_REF_HP)/DEER_REF_HP,.8,1.25):1;
function deerBeat(m,a,third){const t=foeOf(m,a);if(!t||t.hp<=0||t.out>0||a.windup>0||a.dash)return;const r=m.drumRandom||m.random;
  a.aim=Math.atan2(t.y-a.y,t.x-a.x);a.facing=Math.cos(a.aim)>0?1:-1;
  if(third&&a.superCharge>=1&&superFree(a)){if(useSpecial(m,a,{})){a.superCharge=0;event(m,'super',{side:a.side});}return;}
  const n=m.rhythm?.stage===2?4:3,base=a.aim+(r()-.5)*(LEVELS[m.level]?.aimError||.2)*2,s=a.spec;
  for(let i=0;i<n;i++){const ang=base+(i-(n-1)/2)*.24;m.shots.push({id:++m.nextId,owner:a.side,x:a.x+Math.cos(ang)*(a.radius+10),y:a.y+Math.sin(ang)*(a.radius+10),vx:Math.cos(ang)*540,vy:Math.sin(ang)*540,r:10,damage:+(s.damage*DEER_SHOT*deerScale(t)).toFixed(1),life:1.5,color:s.color,kind:'antler'});a.stats.shots++;}
  a.attack=Math.max(a.attack,ATTACK_SHOT);event(m,'shoot',{kind:'antler',side:a.side,fam:familyOf(a.id)});}
// After the spectacle's staged beat: the Little Shadow's star if it is due, then the deer's second stage.
function afterBeat(m){lendStar(m);if(m.rhythm)tracks.rhythmStage2(m);}
// What a Wonder may touch: wonders.js imports nothing and gets its tools from here. The same for the Two Tracks (tracks.js).
const WONDER_API={effect,event,damage,fillSuper,chargeSuper,confine,isHuman,WORLD,LEVELS,DRUM_TILES:tracks.DRUM_TILES,lightDrums:tracks.lightDrums,seeded};
const TRACKS_API={effect,event,damage,fillSuper,chargeSuper,confine,resolveCover,foesOf,isHuman,WORLD,LEVELS,seeded,stream,finish,stepRespawns,actor,SPAWN,onBeat:deerBeat,afterBeat};
export function step(m,input={},dt=1/60,rivalInput=null) {
  dt=clamp(dt,0,1/30);m.events=[];
  for(const e of m.effects)e.age+=dt;m.effects=m.effects.filter(e=>e.age<1);
  if(m.status==='finished'||m.status==='paused')return;
  // The comeback card works once, at the round's first 'go' (a goal's kick-off countdown ends with 'go' again).
  if(m.status==='countdown'){m.countdown-=dt;if(m.countdown<=0){m.status='playing';event(m,'go');if(m.ccard&&!m.cardDone){m.cardDone=true;applyCard(m);}}return;}
  // The spectacle guardian's staged beat: for one second the whole battle holds still, the clock too.
  if(m.spectacle&&tracks.stepSpectacle(m,dt,TRACKS_API))return;
  m.time+=dt;
  for(const c of m.covers)if(c.hp>0&&c.collapseAt!=null&&m.time>=c.collapseAt){
    c.hp=0;effect(m,'stone',c.x,c.y,{color:'#ffd586'});event(m,'collapse');
  }
  m.lastInput=input;
  if(m.hide){const H=m.hide,r=m.actors[1],moving=Math.abs(input.moveX||0)+Math.abs(input.moveY||0)>.15;H.still=moving?0:H.still+dt;
    if(H.still>=HIDE_LISTEN&&H.seen<=0){H.seen=HIDE_SEEN;effect(m,'reveal',r.x,r.y,{color:r.spec.color});event(m,'reveal');}
    H.seen=Math.max(0,H.seen-dt);if(H.seen>0){H.x=r.x;H.y=r.y;}}
  const ai=m.versus?rivalInput||{}:aiInput(m,dt);stepActor(m,m.actors[0],input,dt);stepActor(m,m.actors[1],ai,dt,m.versus?1:LEVELS[m.level].speedScale);
  if(m.coop)stepActor(m,m.actors[2],rivalInput||{},dt);
  else if(m.allied)stepActor(m,m.actors[2],tracks.allyInput(m,dt,TRACKS_API),dt);
  // Fighters cannot occupy the same physical space.
  const [a,b]=m.actors;
  for(let i=0;i<m.actors.length;i++)for(let j=i+1;j<m.actors.length;j++){const p=m.actors[i],q=m.actors[j];if(p.out>0||q.out>0)continue;const d=length(p.x-q.x,p.y-q.y),r=p.radius+q.radius;
    if(d<r){const n=norm(p.x-q.x||.01,p.y-q.y),shift=(r-d)/2;p.x+=n.x*shift;p.y+=n.y*shift;q.x-=n.x*shift;q.y-=n.y*shift;resolveCover(m,p);resolveCover(m,q);}}
  if(m.comebackOn)bumps(m);
  if(m.decoy)stepDecoy(m,dt);
  // A guardian with a second stage rises at half life: feathers start falling around the child.
  for(const x of m.actors){if(x.giant&&x.spec.phase2&&!x.phase2&&x.hp>0&&x.hp<x.spec.hp*.5){x.phase2=true;x.invincible=Math.max(x.invincible,1.2);x.featherAt=m.time+1.6;effect(m,'rise',x.x,x.y,{color:x.spec.color});event(m,'phase2',{side:x.side,kind:x.id});}
    if(x.phase2&&x.hp>0&&!(x.out>0)&&m.time>=x.featherAt){x.featherAt=m.time+3.4;const t=foeOf(m,x);for(let i=0;i<3;i++){const ang=m.random()*Math.PI*2,rr=i?70+m.random()*60:0,delay=1.05+i*.25;m.zones.push({owner:x.side,kind:'feather',x:t.x+Math.cos(ang)*rr,y:t.y+Math.sin(ang)*rr*.8,r:52,age:0,life:delay+.35,delay,done:false,damage:12});}event(m,'feathers-fall',{side:x.side});}}
  // A spectacle guardian lends the star after its staged beat instead (tracks.stepSpectacle).
  if(!m.spectacle)lendStar(m);
  updateProjectiles(m,dt);
  if(m.rhythm)tracks.stepRhythm(m,dt,TRACKS_API);
  if(m.wonder)stepWonder(m,dt,WONDER_API);
  if(m.copyOn)stepCopy(m,dt);
  if(m.comebackOn)stepComeback(m,dt);
  if(m.mode)stepMode(m,dt);
  if(m.status==='finished')return;
  if(!m.pickup&&m.time>=m.pickupAt&&(!m.mode||m.pickupSpot)){m.pickup={x:m.pickupSpot?.x??640,y:m.pickupSpot?.y??395,life:12};m.pickupSpot=null;m.pickupAt=m.time+20;event(m,'pickup-ready');}
  if(m.pickup){m.pickup.life-=dt;for(const actor of m.actors)if(m.pickup&&actor.hp>0&&actor.hp<actor.spec.hp&&length(actor.x-m.pickup.x,actor.y-m.pickup.y)<actor.radius+22){
    const amount=Math.min(30*(m.superHit||1),actor.spec.hp-actor.hp);actor.hp+=amount;actor.stats.healed+=amount;effect(m,'heal',actor.x,actor.y,{amount,color:'#91f5be'});event(m,'heal',{side:actor.side,amount});m.pickup=null;
  }if(m.pickup?.life<=0)m.pickup=null;}
  if(m.coop){stepCoop(m,dt);return;}
  if(m.hill){if(m.time>=m.duration)finish(m,tracks.hillLeader(m),'time');return;}
  if(m.race){if(m.time>=m.duration)finish(m,tracks.raceLeader(m),'time');return;}
  if(m.ball){if(m.time>=m.duration){const B=m.ball;if(B.score[0]!==B.score[1])finish(m,B.score[0]>B.score[1]?0:1,'time');else if(!B.overtime){B.overtime=true;m.duration+=40;event(m,'overtime');}else{const difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,Math.abs(difference)<.002?-1:difference>0?0:1,'time');}}return;}
  if(m.trio){if(m.time>=m.duration){const l0=trioLeft(m,0),l1=trioLeft(m,1),x=m.actors[0],y=m.actors[1],difference=x.hp/x.spec.hp-y.hp/y.spec.hp;finish(m,l0!==l1?(l0>l1?0:1):Math.abs(difference)<.002?-1:difference>0?0:1,'time');}return;}
  if(m.echo){if(m.time>=m.duration){const E=m.echo,lead=E.songs[0]-E.songs[1]||E.progress[0]-E.progress[1],difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,lead?(lead>0?0:1):Math.abs(difference)<.002?-1:difference>0?0:1,'time');}return;}
  if(m.wind){if(m.time>=m.duration){const lead=a.feathers-b.feathers,difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,lead?(lead>0?0:1):Math.abs(difference)<.002?-1:difference>0?0:1,'time');}return;}
  // The final blow: the first fighter down freezes, the winner cannot be hurt, and the finish comes a moment later.
  if(m.ending){if(m.time>=m.ending.at+FINALE_SIM-1e-6)finish(m,m.ending.winner);return;}
  if(a.hp<=0||b.hp<=0){const winner=a.hp<=0&&b.hp<=0?-1:a.hp<=0?1:0;if(m.mode){finish(m,winner);return;}
    const loser=winner<0?-1:1-winner,at=loser>=0?m.actors[loser]:{x:(a.x+b.x)/2,y:(a.y+b.y)/2};m.ending={at:m.time,winner,loser};
    // A dash or a windup still running is let go: nobody stays frozen mid-leap through the slow ending.
    for(const x of m.actors){x.dash=null;x.windup=0;}
    if(winner>=0)m.actors[winner].invincible=Math.max(m.actors[winner].invincible,FINALE_SIM+1);event(m,'final-blow',{winner,loser,x:at.x,y:at.y});}
  else if(m.time>=m.duration){const difference=a.hp/a.spec.hp-b.hp/b.spec.hp;finish(m,Math.abs(difference)<.002?-1:difference>0?0:1,'time');}
}
export function resultStats(m) {const a=m.actors[0];return {damage:Math.round(a.stats.damage),blocked:Math.round(a.stats.blocked),accuracy:a.stats.shots?Math.round(a.stats.hits/a.stats.shots*100):0,specials:a.stats.specials,healed:Math.round(a.stats.healed),weakHits:a.stats.weakHits,seconds:Math.round(m.time)};}
export const STORAGE_KEY='creature-league.v1';
export function freshProfile() {return {version:1,selected:'maimi',level:'rookie',sound:true,wins:0,played:0,cups:0,challengeWins:0,bestStreak:0,streak:0,history:[],creatures:{},cup:null,unlocked:[],newCards:[...STARTERS],skins:{},story:{done:0,v:3},storyCards:[],missionStars:{},missionLosses:{},box:{sparks:1,earned:0,opened:0,pending:null},looks:{},frames:[],frame:null,league:freshLeague(),tower:{best:0,runs:0,run:null},daily:{day:'',goals:[],bonusDay:''},forms:{ritual:[],seen:[]},wonders:{seen:{},last:null},finaleViews:{},hats:{owned:[],worn:{},welcome:false,offer:null},lab:{},mixes:{},wonderDay:{day:'',id:null,played:0},tracks:{taught:false}};}
export function readProfile(storage) {
  const fresh=freshProfile();try{const data=JSON.parse(storage.getItem(STORAGE_KEY));if(!data||data.version!==1)return fresh;
    for(const key of ['wins','played','cups','challengeWins','bestStreak','streak'])fresh[key]=Number.isFinite(data[key])?clamp(Math.floor(data[key]),0,1e8):0;
    if(!fresh.cups)fresh.challengeWins=0;
    if(CREATURES[data.selected])fresh.selected=data.selected;if(LEVELS[data.level])fresh.level=data.level;fresh.sound=data.sound!==false;
    fresh.history=Array.isArray(data.history)?data.history.filter(h=>h&&CREATURES[h.player]&&CREATURES[h.rival]&&typeof h.id==='string'&&Number.isFinite(h.damage)&&Number.isFinite(h.accuracy)).slice(0,12):[];
    for(const id of Object.keys(CREATURES)){const c=data.creatures?.[id];if(c&&Number.isFinite(c.wins)&&Number.isFinite(c.played)){const wins=clamp(c.wins,0,1e8),played=clamp(c.played,0,1e8);fresh.creatures[id]={wins,played,damage:Number.isFinite(c.damage)?clamp(c.damage,0,1e10):0,xp:Number.isFinite(c.xp)?clamp(Math.floor(c.xp),0,1e8):wins*XP_WIN+Math.max(0,played-wins)*XP_PLAY};}}
    if(data.cup&&Number.isInteger(data.cup.stage)&&data.cup.stage>=0&&data.cup.stage<3)fresh.cup={stage:data.cup.stage,player:CREATURES[data.cup.player]?data.cup.player:fresh.selected,upgrades:cleanUpgrades(data.cup.upgrades).slice(0,data.cup.stage)};
    fresh.unlocked=Array.isArray(data.unlocked)?[...new Set(data.unlocked.filter(id=>WILD.includes(id)||STAR_GUARDS.includes(id)||CREATURES[id]?.box))]:[];
    {let done=Number.isInteger(data.story?.done)?clamp(data.story.done,0,100):0;
    // Version 3 added the tide ball before the sea guardian (step 6) and the trio gate before the castle (step 13).
    if((data.story?.v||2)<3)done+=(done>6?1:0)+(done>13?1:0);
    fresh.story={done,v:3};}
    for(const key of ['missionStars','missionLosses'])if(data[key]&&typeof data[key]==='object')for(const [id,n] of Object.entries(data[key]))if(/^[a-z0-9-]{1,32}$/.test(id)&&Number.isFinite(n))fresh[key][id]=clamp(Math.floor(n),0,key==='missionStars'?3:99);
    fresh.storyCards=Array.isArray(data.storyCards)?[...new Set(data.storyCards.filter(id=>typeof id==='string'&&/^[a-zA-Z]{1,24}$/.test(id)))]:[];
    if(fresh.storyCards.includes('ron'))for(const id of STAR_GUARDS)if(!fresh.unlocked.includes(id)){fresh.unlocked.push(id);if(Array.isArray(data.newCards))data.newCards.push(id);}
    if(Array.isArray(data.newCards))fresh.newCards=[...new Set(data.newCards.filter(id=>isUnlocked(fresh,id)||fresh.storyCards.includes(id)))];
    for(const id of Object.keys(CREATURES)){const skin=data.skins?.[id];if(typeof skin==='string'&&SKINS.some(s=>s.id===skin))fresh.skins[id]=skin;}
    if(!isUnlocked(fresh,fresh.selected))fresh.selected='maimi';
    readBoxes(data,fresh);readLeague(data,fresh);readTower(data,fresh);readDaily(data,fresh);readStar(data,fresh);readWardrobe(data,fresh);
    if(data.lastBuild&&CREATURES[data.lastBuild.player])fresh.lastBuild={player:data.lastBuild.player,upgrades:cleanUpgrades(data.lastBuild.upgrades)};return fresh;
  }catch{return fresh;}
}
// Power Forms, Wonders and finales in the save: only known creatures and Wonders, no repeats, counts kept sane.
const ownId=(table,id)=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(table,id);
const idList=list=>Array.isArray(list)?[...new Set(list.filter(id=>ownId(CREATURES,id)))].slice(0,64):[];
const count=n=>Number.isFinite(n)?clamp(Math.floor(n),0,9999):null;
function readStar(data,fresh){
  fresh.forms={ritual:idList(data.forms?.ritual),seen:idList(data.forms?.seen)};
  const seen=data.wonders?.seen;if(seen&&typeof seen==='object')for(const id of WONDER_IDS){const n=count(seen[id]);if(n!=null)fresh.wonders.seen[id]=n;}
  fresh.wonders.last=WONDER_IDS.includes(data.wonders?.last)?data.wonders.last:null;
  const views=data.finaleViews;if(views&&typeof views==='object')for(const id of Object.keys(CREATURES)){const n=count(views[id]);if(n!=null)fresh.finaleViews[id]=n;}
}
// Wave 2 in the save: hats (only known ones, worn only when owned and in their own slot), Lab designs, mixes, the Wonder of the
// Day's bookkeeping and what the Two Tracks taught. A save from before them gets the fresh values, so Ron's hat box comes once.
function readWardrobe(data,fresh){
  const h=data.hats;if(h&&typeof h==='object'){const owned=[...new Set((Array.isArray(h.owned)?h.owned:[]).filter(id=>HAT_IDS.includes(id)))].slice(0,64);fresh.hats.owned=owned;
    if(h.worn&&typeof h.worn==='object')for(const id of Object.keys(CREATURES)){const w=h.worn[id];if(!w||typeof w!=='object')continue;
      const head=owned.includes(w.head)&&hatById(w.head).slot==='head'?w.head:null,face=owned.includes(w.face)&&hatById(w.face).slot==='face'?w.face:null;if(head||face)fresh.hats.worn[id]={head,face};}
    fresh.hats.welcome=h.welcome===true;
    if(Array.isArray(h.offer)&&h.offer.length===3&&new Set(h.offer).size===3&&h.offer.every(id=>HAT_IDS.includes(id)))fresh.hats.offer=[...h.offer];}
  fresh.lab=cleanLab(data.lab);
  if(data.mixes&&typeof data.mixes==='object')for(const id of Object.keys(CREATURES)){const list=data.mixes[id];if(!Array.isArray(list))continue;
    const kinds=[...new Set(list.filter(k=>COPYABLE.includes(k)&&k!==id))].slice(0,64);if(kinds.length)fresh.mixes[id]=kinds;}
  const w=data.wonderDay;if(w&&typeof w==='object'){fresh.wonderDay={day:/^\d{4}-\d{2}-\d{2}$/.test(w.day)?w.day:'',id:WONDER_IDS.includes(w.id)?w.id:null,played:Number.isFinite(w.played)?clamp(Math.floor(w.played),0,99):0};}
  fresh.tracks={taught:data.tracks?.taught===true};
}
export function saveProfile(storage,profile) {try{storage.setItem(STORAGE_KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function startCup(profile) {
  if(!profile.cup)profile.cup={stage:0,player:profile.selected,upgrades:[]};
  if(!profile.cup.player)profile.cup.player=profile.selected;
  profile.cup.upgrades=cleanUpgrades(profile.cup.upgrades);return profile.cup;
}
export function needsUpgrade(profile) {return !!profile.cup&&profile.cup.stage>(profile.cup.upgrades?.length??0);}
export function chooseUpgrade(profile,id) {
  if(!needsUpgrade(profile)||!UPGRADE_IDS.includes(id)||profile.cup.upgrades?.includes(id))return false;
  startCup(profile);profile.cup.upgrades.push(id);return true;
}
export function recordResult(profile,m,mode) {
  if(m.status!=='finished'||profile.history.some(h=>h.id===m.id))return false;
  const won=m.winner===0;profile.played++;if(won){profile.wins++;profile.streak++;profile.bestStreak=Math.max(profile.bestStreak,profile.streak);}else profile.streak=0;
  const id=m.actors[0].id,c=profile.creatures[id]??{wins:0,played:0,damage:0,xp:0};c.played++;if(won)c.wins++;c.xp=(c.xp||0)+(won?XP_WIN:XP_PLAY);c.damage+=Math.round(m.actors[0].stats.damage);profile.creatures[id]=c;
  profile.history.unshift({id:m.id,player:id,rival:m.actors[1].id,won,draw:m.winner===-1,mode,upgrades:[...m.actors[0].upgrades],...resultStats(m)});profile.history=profile.history.slice(0,12);
  if(mode==='cup'&&won&&profile.cup){profile.cup.stage++;if(profile.cup.stage>=3){profile.cups++;profile.lastBuild={player:id,upgrades:[...m.actors[0].upgrades]};profile.cup=null;}}
  if(mode==='challenge'&&m.challenge===CHALLENGE.id&&challengeUnlocked(profile)&&won)profile.challengeWins=(profile.challengeWins||0)+1;
  if(mode==='wild'&&won&&m.wild&&!isUnlocked(profile,m.wild)){profile.unlocked.push(m.wild);profile.newCards.push(m.wild);}
  addSparks(profile,won?2:1);
  return true;
}

// ------------------------------------------------------------------ star boxes
// Earned by playing, never bought. Every battle gives sparks (a win gives two); three sparks make a box.
// The road of coming boxes is fixed and shown, so a gold box is never a lottery: there the child chooses.
// Inside a box only things the child does not have yet, so nothing ever repeats.
export const SPARKS_PER_BOX=3,BOX_ROAD=['silver','wood','gold','wood','silver','wood','wood','gold'];
export const BOX_TIERS={wood:{name:'תיבת עץ'},silver:{name:'תיבת כסף'},gold:{name:'תיבת זהב'}};
export const FRAMES=[{id:'ember',name:'גחלת',tier:'common'},{id:'wave',name:'גלים',tier:'common'},{id:'jade',name:'ירקן',tier:'common'},{id:'royal',name:'מלכותי',tier:'rare'},{id:'night',name:'שמי לילה',tier:'rare'},{id:'rainbow',name:'קשת',tier:'legendary'}];
export const boxTier=n=>BOX_ROAD[n%BOX_ROAD.length];
export const boxesWaiting=profile=>profile.box.earned-profile.box.opened;
export const roadAhead=(profile,count=6)=>Array.from({length:count},(_,i)=>({n:profile.box.opened+i,tier:boxTier(profile.box.opened+i),ready:profile.box.opened+i<profile.box.earned}));
export function addSparks(profile,n){const b=profile.box;b.sparks+=n;let boxes=0;while(b.sparks>=SPARKS_PER_BOX){b.sparks-=SPARKS_PER_BOX;b.earned++;boxes++;}return boxes;}
function validPrize(p){
  if(p?.type==='look'&&CREATURES[p.creature]&&SKINS.some(s=>s.box&&s.id===p.skin))return {type:'look',creature:p.creature,skin:p.skin};
  if(p?.type==='frame'&&FRAMES.some(f=>f.id===p.frame))return {type:'frame',frame:p.frame};
  if(p?.type==='creature'&&CREATURES[p.id]?.box)return {type:'creature',id:p.id};
  if(p?.type==='hat'&&HAT_IDS.includes(p.hat))return {type:'hat',hat:p.hat};
  return null;
}
function readBoxes(data,fresh){
  const b=data.box,int=v=>Number.isInteger(v)&&v>=0?Math.min(v,1e6):null;
  if(b&&typeof b==='object'){const earned=int(b.earned)??0;fresh.box={sparks:Math.min(int(b.sparks)??0,SPARKS_PER_BOX-1),earned,opened:Math.min(int(b.opened)??0,earned),pending:null};
    if(b.pending&&BOX_TIERS[b.pending.tier]&&Array.isArray(b.pending.choice)){const choice=b.pending.choice.map(validPrize).filter(Boolean);if(choice.length)fresh.box.pending={tier:b.pending.tier,choice};}}
  // A child who played before boxes existed finds a welcome box waiting.
  else if(fresh.played>0)fresh.box={sparks:0,earned:1,opened:0,pending:null};
  if(data.looks&&typeof data.looks==='object')for(const [id,list] of Object.entries(data.looks))if(CREATURES[id]&&Array.isArray(list))fresh.looks[id]=[...new Set(list.filter(k=>SKINS.some(s=>s.box&&s.id===k)))];
  fresh.frames=Array.isArray(data.frames)?[...new Set(data.frames.filter(id=>FRAMES.some(f=>f.id===id)))]:[];
  fresh.frame=fresh.frames.includes(data.frame)?data.frame:null;
  for(const [id,skin] of Object.entries(data.skins||{}))if(CREATURES[id]&&fresh.looks[id]?.includes(skin))fresh.skins[id]=skin;
}
const looksOfTier=tier=>SKINS.filter(s=>s.box===tier).map(s=>s.id);
const samePrize=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Everything of one tier the child does not own yet. Looks are for creatures already on the team.
function prizePool(profile,tier){
  const team=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id));
  return {looks:looksOfTier(tier).flatMap(skin=>team.filter(id=>!profile.looks[id]?.includes(skin)).map(id=>({type:'look',creature:id,skin}))),
    frames:FRAMES.filter(f=>f.tier===tier&&!profile.frames.includes(f.id)).map(f=>({type:'frame',frame:f.id})),
    creatures:tier==='legendary'?Object.keys(CREATURES).filter(id=>CREATURES[id].box&&!isUnlocked(profile,id)).map(id=>({type:'creature',id})):[],
    hats:boxHats(tier).filter(id=>!profile.hats?.owned?.includes(id)).map(hat=>({type:'hat',hat}))};
}
// How often a box prize is a hat while unowned hats of that tier are left.
export const HAT_CHANCE=.35;
// One prize of a tier, or of another tier once this one is used up. The favourite creature gets its looks more often,
// and two prizes in one box go to two different creatures when possible.
function drawPrize(profile,tier,random,taken=[]){
  const order=tier==='legendary'?['legendary','rare','common']:tier==='rare'?['rare','common','legendary']:['common','rare','legendary'];
  const pick=list=>list[Math.floor(random()*list.length)];
  for(const t of order){
    const pool=prizePool(profile,t),free=list=>list.filter(p=>!taken.some(q=>samePrize(p,q)));
    const creatures=free(pool.creatures),frames=free(pool.frames),looks=free(pool.looks),hats=free(pool.hats);
    const spread=looks.filter(p=>!taken.some(q=>q.creature===p.creature)),varied=spread.filter(p=>!taken.some(q=>q.skin===p.skin));
    const base=varied.length?varied:spread.length?spread:looks,fav=base.filter(p=>p.creature===profile.selected);
    if(creatures.length)return pick(creatures);
    if(hats.length&&(!looks.length&&!frames.length||random()<HAT_CHANCE))return pick(hats);
    if(frames.length&&(!looks.length||random()<.25))return pick(frames);
    if(looks.length)return fav.length&&random()<.4?pick(fav):pick(base);
  }
  return null;
}
export function applyPrize(profile,p){
  if(p.type==='look'){profile.looks[p.creature]??=[];if(!profile.looks[p.creature].includes(p.skin))profile.looks[p.creature].push(p.skin);}
  else if(p.type==='frame'){if(!profile.frames.includes(p.frame))profile.frames.push(p.frame);}
  else if(p.type==='creature'&&!isUnlocked(profile,p.id)){profile.unlocked.push(p.id);profile.newCards.push(p.id);}
  else if(p.type==='hat'){profile.hats??={owned:[],worn:{},welcome:false,offer:null};if(!profile.hats.owned.includes(p.hat))profile.hats.owned.push(p.hat);}
}
// Opening the next waiting box: its prizes are the child's at once. A gold box also holds a choice of two big prizes.
export function openBox(profile,random=Math.random){
  if(profile.box.pending||boxesWaiting(profile)<=0)return null;
  const tier=boxTier(profile.box.opened),prizes=[],add=t=>{const p=drawPrize(profile,t,random,prizes);if(p)prizes.push(p);};
  add('common');if(tier==='silver')add('rare');
  for(const p of prizes)applyPrize(profile,p);
  let choice=null;
  if(tier==='gold'){choice=[];for(let i=0;i<2;i++){const p=drawPrize(profile,'legendary',random,[...prizes,...choice]);if(p)choice.push(p);}
    if(choice.length<2){for(const p of choice){applyPrize(profile,p);prizes.push(p);}choice=null;}}
  profile.box.opened++;if(choice)profile.box.pending={tier,choice};
  return {tier,prizes,choice};
}
export function chooseBoxPrize(profile,index){const p=profile.box.pending?.choice?.[index];if(!p)return null;applyPrize(profile,p);profile.box.pending=null;return p;}

// ------------------------------------------------------------------ creature levels
// Every battle teaches the creature something: a win gives more, a loss still counts. Level 10 is mastery.
export const XP_WIN=10,XP_PLAY=4,LEVEL_XP=[0,20,50,90,140,200,270,350,440,540],MAX_LEVEL=LEVEL_XP.length,LEVEL_BONUS=.02;
export const creatureXp=(profile,id)=>profile.creatures[id]?.xp||0;
export function creatureLevel(profile,id){const xp=creatureXp(profile,id);let lv=1;while(lv<MAX_LEVEL&&xp>=LEVEL_XP[lv])lv++;return lv;}
export function levelProgress(profile,id){const level=creatureLevel(profile,id),xp=creatureXp(profile,id);if(level>=MAX_LEVEL)return {level,pct:1,toNext:0};const a=LEVEL_XP[level-1],b=LEVEL_XP[level];return {level,pct:(xp-a)/(b-a),toNext:b-xp};}
export const levelBoost=(profile,id)=>LEVEL_BONUS*(creatureLevel(profile,id)-1);
// The first-unlock ritual was shown for this creature (or it was unlocked before rituals existed).
export function markRitual(profile,id){if(!ownId(CREATURES,id))return false;profile.forms??={ritual:[],seen:[]};if(profile.forms.ritual.includes(id))return false;profile.forms.ritual.push(id);return true;}
// The child's creature grew into its Power Form in this battle: true the first time for that creature.
export function recordFormUse(profile,m){const a=m?.actors?.[0];if(!a?.formUsed||!ownId(CREATURES,a.id))return false;profile.forms??={ritual:[],seen:[]};if(profile.forms.seen.includes(a.id))return false;profile.forms.seen.push(a.id);return true;}
export const finaleViews=(profile,id)=>profile.finaleViews?.[id]||0;
export function recordFinaleView(profile,id){if(!ownId(CREATURES,id))return 0;profile.finaleViews??={};return profile.finaleViews[id]=clamp(finaleViews(profile,id)+1,0,9999);}

// ------------------------------------------------------------------ the line between two phones
// The guest checks the host's start before building the battle: a creature, look, mission or Wonder this phone
// does not know means another version of the game (null), never a half-built battle.
const ARENA=/^[a-z]{2,12}$/,plain=v=>String(v??'').replace(/[<>&"']/g,'').slice(0,12);
export function cleanStart(cfg){
  if(!cfg||typeof cfg!=='object'||!Number.isFinite(+cfg.seed))return null;
  const ids=Array.isArray(cfg.ids)?cfg.ids.slice(0,2):[];if(ids.length!==2||!ids.every(id=>ownId(CREATURES,id)))return null;
  const mode=cfg.mode==null?null:ownId(MODES,cfg.mode)?cfg.mode:undefined;if(mode===undefined)return null;
  const skins=[0,1].map(i=>SKINS.some(s=>s.id===cfg.skins?.[i])?cfg.skins[i]:'base');
  const names=[0,1].map(i=>plain(cfg.names?.[i])||'חבר'),wins=[0,1].map(i=>Number.isFinite(+cfg.wins?.[i])?Math.max(0,Math.min(999,Math.floor(+cfg.wins[i]))):0);
  const w=cfg.wonderOpts&&typeof cfg.wonderOpts==='object'?cfg.wonderOpts:{};
  if(w.wonder&&(Array.isArray(w.wonderPrefer)&&w.wonderPrefer.some(id=>!WONDER_IDS.includes(id))||w.wonderAvoid!=null&&!WONDER_IDS.includes(w.wonderAvoid)))return null;
  const wonderOpts={wonder:!!w.wonder,wonderPrefer:Array.isArray(w.wonderPrefer)?w.wonderPrefer.filter(id=>WONDER_IDS.includes(id)):[],wonderAvoid:WONDER_IDS.includes(w.wonderAvoid)?w.wonderAvoid:null};
  // Hats and Lab designs per side (by that side's creature), the comeback card and the round. Anything unknown: another version.
  const sideMap=(list,check)=>{if(list==null)return [null,null];if(!Array.isArray(list))return undefined;const out=[];
    for(let i=0;i<2;i++){const map=list[i];if(map==null){out.push(null);continue;}if(typeof map!=='object')return undefined;const v=map[ids[i]];if(v==null){out.push(null);continue;}const c=check(ids[i],v);if(c===undefined)return undefined;out.push(c?{[ids[i]]:c}:null);}
    return out;};
  const hats=sideMap(cfg.hats,(id,w)=>{if(typeof w!=='object')return undefined;const ok=(h,slot)=>h==null||hatById(h)?.slot===slot;if(!ok(w.head,'head')||!ok(w.face,'face'))return undefined;return w.head||w.face?{head:w.head||null,face:w.face||null}:null;});
  const labs=sideMap(cfg.labs,(id,d)=>{if(typeof d!=='object'||!FORM_OPTIONS[id]?.includes(d.option)||!LAB_MECHS[id]?.includes(d.mech))return undefined;return {option:d.option,mech:d.mech};});
  if(hats===undefined||labs===undefined)return null;
  const ccard=cfg.ccard==null?null:[0,1].includes(cfg.ccard.side)&&COMEBACK_CARDS.includes(cfg.ccard.id)?{side:cfg.ccard.side,id:cfg.ccard.id}:undefined;if(ccard===undefined)return null;
  const round=Number.isInteger(cfg.round)?clamp(cfg.round,0,99):0;
  return {...cfg,seed:Math.floor(+cfg.seed),mode,arena:typeof cfg.arena==='string'&&ARENA.test(cfg.arena)?cfg.arena:null,ids,names,skins,wins,wonderOpts,hats,labs,ccard,round};
}

// ------------------------------------------------------------------ Wonder seeds in the Star Book
// What makeMatch needs from the save: a new save first plays three battles without Wonders; unseen ones come first.
export const wonderOptions=profile=>({wonder:(profile?.played||0)>=3,wonderPrefer:WONDER_IDS.filter(id=>!(profile?.wonders?.seen?.[id]>0)),wonderAvoid:WONDER_IDS.includes(profile?.wonders?.last)?profile.wonders.last:null});
// Where a seed may sprout, for screens that want to say so. makeMatch enforces the rest (missions, bosses, co-op, hide, chase).
export const wonderAllowed=(profile,mode,{replay=false,guard=false}={})=>(profile?.played||0)>=3&&(['quick','league','wild','versus','online'].includes(mode)||mode==='tower'&&!guard||mode==='story'&&!!replay);
// A Wonder that really started counts in the book. The first sighting of each one gives a spark, once.
export function recordWonder(profile,m){const W=m?.wonder;if(!W||!WONDER_IDS.includes(W.id)||!(W.started||W.state==='active'||W.state==='done'))return null;
  profile.wonders??={seen:{},last:null};const seen=profile.wonders.seen,first=!(seen[W.id]>0),n=clamp((seen[W.id]||0)+1,0,9999);seen[W.id]=n;profile.wonders.last=W.id;
  return {id:W.id,count:n,first,boxes:first?addSparks(profile,1):0};}

// ------------------------------------------------------------------ my creature, my style: hats, Lab designs, mixes
// What a single-player battle needs from the save: copy stars and the comeback star on, the child's hats and Lab designs,
// and which of the child's creatures may grow its Power Form (each trio member on its own).
export const hatMap=profile=>{const out={};for(const [id,w] of Object.entries(profile?.hats?.worn||{}))if(ownId(CREATURES,id)&&(w?.head||w?.face))out[id]={head:w.head||null,face:w.face||null};return out;};
export const labMap=profile=>{const out={};for(const [id,d] of Object.entries(cleanLab(profile?.lab)))out[id]={option:d.option,mech:d.mech};return out;};
export const playOptions=profile=>({copy:true,comeback:true,hats:[hatMap(profile),null,null],labs:[labMap(profile),null,null],formIds:Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)&&formUnlocked(profile,id))});
export const ownedHats=profile=>HATS.filter(h=>profile?.hats?.owned?.includes(h.id));
export function hatsOf(profile,id){const w=profile?.hats?.worn?.[id],own=h=>profile.hats.owned.includes(h);return {head:w?.head&&own(w.head)&&hatById(w.head)?.slot==='head'?w.head:null,face:w?.face&&own(w.face)&&hatById(w.face)?.slot==='face'?w.face:null};}
// Put on a hat (into its own slot), take it off with the same hat again, or take everything off with null.
export function wearHat(profile,id,hat){if(!ownId(CREATURES,id)||!profile.hats)return false;const H=profile.hats;
  if(hat===null){delete H.worn[id];return true;}
  const h=hatById(hat);if(!h||!H.owned.includes(hat))return false;const w={...hatsOf(profile,id)};w[h.slot]=w[h.slot]===hat?null:hat;
  if(w.head||w.face)H.worn[id]=w;else delete H.worn[id];return true;}
// Ron's welcome box: once ever, after the first battle. Three hats to choose from (two common, one rare), the same after a reload.
export const welcomeDue=profile=>!!profile?.hats&&!profile.hats.welcome&&(profile.played||0)>=1;
export function welcomeOffer(profile,random=Math.random){const H=profile.hats;if(H.offer?.length===3)return [...H.offer];
  const offer=[],pick=(tier,n)=>{const pool=boxHats(tier).filter(id=>!H.owned.includes(id)&&!offer.includes(id));while(n-->0&&pool.length)offer.push(pool.splice(Math.floor(random()*pool.length),1)[0]);};
  // Two commons and a rare; when star boxes already gave most commons, more rares and then a legendary hat fill the box.
  pick('common',2);pick('rare',1);for(const tier of HAT_TIERS)pick(tier,3-offer.length);H.offer=offer;return [...offer];}
export function chooseWelcomeHat(profile,hat){const H=profile.hats;if(!H||H.welcome||!H.offer?.includes(hat))return false;
  if(!H.owned.includes(hat))H.owned.push(hat);H.welcome=true;H.offer=null;const id=isUnlocked(profile,profile.selected)?profile.selected:'maimi',slot=hatById(hat).slot;
  H.worn[id]={...hatsOf(profile,id),[slot]:hat};return true;}
// A Lab design: saved on this phone at once, and the first battle with it plays the form ritual again.
export const labOf=(profile,id)=>cleanDesign(id,profile?.lab?.[id]);
export function saveLab(profile,id,design){const d=cleanDesign(id,design);if(!d)return false;profile.lab??={};profile.lab[id]=d;
  if(profile.forms?.ritual)profile.forms.ritual=profile.forms.ritual.filter(x=>x!==id);return true;}
export const labExport=profile=>cleanLab(profile?.lab);
// Mixes: every copied super fired with a creature fills one slot on that creature's page, and a new one gives a spark.
export const mixName=(holderId,kind)=>MIX_NAMES[mixKey(CREATURES[holderId]?.element,CREATURES[kind]?.element)]||MIX_FALLBACK;
export const mixesOf=(profile,id)=>[...(profile?.mixes?.[id]||[])];
export function recordMixes(profile,m,side=0){const out=[];profile.mixes??={};
  for(const e of m?.copyLog||[]){if(e.side!==side||!ownId(CREATURES,e.id)||!COPYABLE.includes(e.kind)||e.kind===e.id)continue;
    const list=profile.mixes[e.id]??=[];if(list.includes(e.kind))continue;list.push(e.kind);addSparks(profile,1);out.push({id:e.id,kind:e.kind,name:mixName(e.id,e.kind)});}
  return out;}
// Three comeback cards face down: the ones not used yet in this series first, then (only if needed) used ones again.
export function dealComebackCards(random=Math.random,used=[]){const fresh=COMEBACK_CARDS.filter(id=>!used.includes(id)),old=COMEBACK_CARDS.filter(id=>used.includes(id)),out=[];
  for(const pool of [fresh,old])while(out.length<3&&pool.length)out.push(pool.splice(Math.floor(random()*pool.length),1)[0]);return out;}
// The Wonder of the Day: from the Wonders already seen plus the first unseen one, the same all day for the same player.
// No timer and nothing lost by skipping a day: tomorrow simply brings another one.
export function wonderOfDay(profile,key='',today=dayKey()){profile.wonderDay??={day:'',id:null,played:0};const D=profile.wonderDay,seen=WONDER_IDS.filter(id=>profile.wonders?.seen?.[id]>0);
  if(D.day===today&&WONDER_IDS.includes(D.id))return {id:D.id,fresh:!seen.includes(D.id),changed:false};
  const unseen=WONDER_IDS.find(id=>!seen.includes(id)),pool=unseen?[...seen,unseen]:seen,id=pool[hashText(today+key)%pool.length];
  Object.assign(D,{day:today,id,played:0});return {id,fresh:!seen.includes(id),changed:true};}
export const wonderDayOptions=(profile,key='')=>({wonderDay:wonderOfDay(profile,key).id});
export function recordWonderDay(profile,today=dayKey()){profile.wonderDay??={day:'',id:null,played:0};const D=profile.wonderDay;if(D.day!==today){D.day=today;D.played=0;}D.played=clamp(D.played+1,0,99);return D.played;}
// The pair race taught the bridge of light once it was built: later races need no scripted friend.
export function recordTracks(profile,m){if(!m?.race||!(m.race.bridged>0))return null;profile.tracks??={taught:false};profile.tracks.taught=true;return {taught:true};}

// ------------------------------------------------------------------ the league
// An endless trophy road. The rival's level follows the child, so about six battles in ten are won.
export const RANKS=[{id:'bronze',name:'ארד',at:0,color:'#c98a4b'},{id:'silver',name:'כסף',at:100,color:'#c8d3de'},{id:'gold',name:'זהב',at:250,color:'#f2c14e'},{id:'diamond',name:'יהלום',at:450,color:'#7fe3ff'},{id:'champion',name:'אלופים',at:700,color:'#ff8a5c'},{id:'legend',name:'אגדה',at:1000,color:'#c69cff'}];
export const LEAGUE_LEVELS=['beginner','rookie','challenger','veteran','champion'],PRIZE_EVERY=30,LEAGUE_WIN=8,LEAGUE_LOSS=3,LEAGUE_SAFE=60,LEAGUE_LIFE=1.2;
// A training fight (no mission) against a beginner or rookie rival gets the league's extra life, so the Wonder's twelve seconds fit in it.
// Not from the challenger level up: a slower child already meets the clock there.
export const quickLife=level=>LEAGUE_LEVELS.indexOf(level)>=0&&LEAGUE_LEVELS.indexOf(level)<2?LEAGUE_LIFE:1;
export function freshLeague(){return {trophies:0,best:0,skill:1,played:0,wins:0};}
function readLeague(data,fresh){const l=data.league,num=v=>Number.isFinite(v)?v:null;if(!l||typeof l!=='object')return;
  const trophies=clamp(Math.floor(num(l.trophies)??0),0,1e6);fresh.league={trophies,best:Math.max(trophies,clamp(Math.floor(num(l.best)??0),0,1e6)),skill:clamp(num(l.skill)??1,0,LEAGUE_LEVELS.length-.01),played:clamp(Math.floor(num(l.played)??0),0,1e8),wins:clamp(Math.floor(num(l.wins)??0),0,1e8)};}
export const rankOf=t=>RANKS.filter(r=>t>=r.at).at(-1);
export const nextRank=t=>RANKS.find(r=>r.at>t)||null;
export const leagueLevel=profile=>LEAGUE_LEVELS[clamp(Math.floor(profile.league.skill),0,LEAGUE_LEVELS.length-1)];
export const nextPrizeAt=profile=>(Math.floor(profile.league.best/PRIZE_EVERY)+1)*PRIZE_EVERY;
// The prizes on the road between two best scores: a box every 30 trophies, and one more for every new rank.
export function prizesBetween(from,to){const boxes=Math.max(0,Math.floor(to/PRIZE_EVERY)-Math.floor(from/PRIZE_EVERY)),ranks=RANKS.filter(r=>r.at>from&&r.at<=to);return {boxes:boxes+ranks.length,ranks};}
export function makeLeagueMatch(profile,options={},random=Math.random){
  const player=isUnlocked(profile,profile.selected)?profile.selected:'maimi',rivals=Object.keys(CREATURES).filter(id=>id!==player);
  const rival=rivals[Math.floor(random()*rivals.length)],roll=random(),mode=roll<.12?'lava':roll<.22?'wind':roll<.32?'ball':null;
  const arenas=['wind','sea','fire','mirror','castle'],arena=mode?({lava:'fire',wind:'wind',ball:'sea'})[mode]:arenas[Math.floor(random()*arenas.length)];
  // Now and then a giant: bigger and slower to fall, so it fights one level lower.
  let level=leagueLevel(profile);const giant=!mode&&random()<.1;if(giant)level=LEAGUE_LEVELS[Math.max(0,LEAGUE_LEVELS.indexOf(level)-1)];
  const forms=options.forms??[formUnlocked(profile,player),LEAGUE_LEVELS.indexOf(level)>=2];
  // A plain league fight up to the challenger level gets a little more life, so it lasts like the other free fights. Missions and
  // giants keep theirs, and so do the top levels, where a longer fight only gives the computer's Power Form more time to come.
  const m=makeMatch({...options,forms,player,rival,level,mode,arena,giantRival:giant,life:options.life??(mode||giant||LEAGUE_LEVELS.indexOf(level)>2?1:LEAGUE_LIFE),boost:options.boost??levelBoost(profile,player)});m.league=true;return m;
}
export function recordLeague(profile,m){
  if(m.status!=='finished'||!m.league)return null;
  const L=profile.league,won=m.winner===0,draw=m.winner===-1,a=m.actors[0],before=L.trophies,best=L.best,rankBefore=rankOf(before);
  const delta=won?LEAGUE_WIN+(a.hp/a.spec.hp>=.5?2:0):draw?0:L.trophies<LEAGUE_SAFE?0:-Math.min(LEAGUE_LOSS,L.trophies-rankBefore.at);
  L.trophies=Math.max(0,L.trophies+delta);L.best=Math.max(L.best,L.trophies);L.played++;if(won)L.wins++;
  L.skill=clamp(L.skill+(won?.35:draw?0:-.5),0,LEAGUE_LEVELS.length-.01);
  const prizes=prizesBetween(best,L.best);if(prizes.boxes)profile.box.earned+=prizes.boxes;
  return {delta,trophies:L.trophies,rank:rankOf(L.trophies),rankUp:prizes.ranks.at(-1)||null,boxes:prizes.boxes};
}

// ------------------------------------------------------------------ the mask tower
// An endless climb. Every floor is a new battle; every fifth floor a giant guardian. Every second floor the child
// picks one of three powers for this climb. One rescue star lets a lost floor be tried again. A climb is saved between floors.
export const TOWER_GUARD_EVERY=5,TOWER_PICK_EVERY=2,TOWER_LIVES=1;
export const BLESSINGS=[
  {id:'heart',name:'לב חזק',text:'עוד 20% חיים',icon:'shield',max:3},
  {id:'claw',name:'מכה חזקה',text:'עוד 15% נזק',icon:'bolt',max:3},
  {id:'swift',name:'רגליים קלות',text:'מהירות גבוהה ב־10%',icon:'swirl',max:2},
  {id:'spark',name:'ניצוץ ראשון',text:'כוח־העל מתחיל כל קומה חצי מלא',icon:'sparkle',max:1},
];
const TOWER_UPGRADES=UPGRADE_IDS;
const towerLevel=floor=>floor<=2?'beginner':floor<=4?'rookie':floor<=7?'challenger':floor<=10?'veteran':'champion';
function readTower(data,fresh){
  const t=data.tower;if(!t||typeof t!=='object')return;const int=v=>Number.isInteger(v)&&v>=0?Math.min(v,1e6):0;
  fresh.tower={best:int(t.best),runs:int(t.runs),run:null};const r=t.run;
  if(r&&Number.isInteger(r.seed)&&Number.isInteger(r.floor)&&r.floor>=1&&CREATURES[r.creature]){
    const picks=Array.isArray(r.picks)?r.picks.filter(id=>BLESSINGS.some(b=>b.id===id)||TOWER_UPGRADES.includes(id)).slice(0,40):[];
    const pending=Array.isArray(r.pending)?r.pending.filter(id=>BLESSINGS.some(b=>b.id===id)||TOWER_UPGRADES.includes(id)).slice(0,3):null;
    fresh.tower.run={seed:r.seed,floor:Math.min(r.floor,9999),creature:r.creature,picks,lives:clamp(int(r.lives),0,TOWER_LIVES),pending:pending?.length?pending:null};}
}
// What one floor holds. It depends only on the climb's seed and the floor, so a floor tried again is the same floor.
export function towerFloor(seed,floor,player='maimi'){
  const r=seeded((seed>>>0)*31+floor*7919),pick=list=>list[Math.floor(r()*list.length)];
  const guard=floor%TOWER_GUARD_EVERY===0,giants=['windguard','seaguard','fireguard','tehomon','lohatan','slauz'].filter(id=>id!==player);
  const rival=guard?pick(giants):pick(Object.keys(CREATURES).filter(id=>id!==player));
  const roll=r(),mode=!guard&&floor>2&&roll<.3?pick(['lava','wind','ball']):null;
  const arenas=['wind','sea','fire','mirror','castle'],arena=mode?({lava:'fire',wind:'wind',ball:'sea'})[mode]:pick(arenas);
  const twist=!mode&&!guard&&floor>3&&r()<.35?pick(['crumble','open']):null;
  // Above floor 10 the rivals keep growing a little, so the climb never ends on its own.
  // A guardian is a giant, so it fights one level lower, like the league's giants.
  const level=guard?LEAGUE_LEVELS[Math.max(0,LEAGUE_LEVELS.indexOf(towerLevel(floor))-1)]:towerLevel(floor);
  return {floor,rival,level,mode,arena,giant:guard,twist,rivalHp:1+.06*Math.max(0,floor-10)};
}
export const towerPicked=(run,id)=>run.picks.filter(p=>p===id).length;
export function towerStats(run){const n=id=>towerPicked(run,id);return {hp:1+.2*n('heart'),damage:1+.15*n('claw'),speed:1+.1*n('swift'),charge:n('spark')?.5:0,upgrades:run.picks.filter(p=>TOWER_UPGRADES.includes(p)).slice(0,2)};}
// Three different powers the child can still take: blessings up to their limit, and at most two cup powers.
export function towerOptions(run){
  const r=seeded((run.seed>>>0)*17+run.floor*104729),ups=run.picks.filter(p=>TOWER_UPGRADES.includes(p));
  const pool=[...BLESSINGS.filter(b=>towerPicked(run,b.id)<b.max).map(b=>b.id),...(ups.length<2?TOWER_UPGRADES.filter(u=>!ups.includes(u)):[])];
  const out=[];while(out.length<3&&pool.length)out.push(pool.splice(Math.floor(r()*pool.length),1)[0]);return out;
}
function applyRun(m,run){
  const st=towerStats(run),a=m.actors[0],b=m.actors[1];
  a.spec={...a.spec,hp:Math.round(a.spec.hp*st.hp),damage:Math.round(a.spec.damage*st.damage),speed:Math.round(a.spec.speed*st.speed)};a.hp=a.spec.hp;a.superCharge=st.charge;
  if(run.rivalHp>1){b.spec={...b.spec,hp:Math.round(b.spec.hp*run.rivalHp)};b.hp=b.spec.hp;}
  if(run.twist==='open')m.covers=[];
  if(run.twist==='crumble')m.covers.forEach((c,i)=>{c.collapseAt=6+i*4;});
  m.twist=run.twist||null;
}
export function startTowerRun(profile,creature,seed=Date.now()){
  if(!isUnlocked(profile,creature))creature='maimi';
  profile.tower.run={seed:(seed>>>0)||1,floor:1,creature,picks:[],lives:TOWER_LIVES,pending:null};return profile.tower.run;
}
export function makeTowerMatch(profile,options={}){
  const run=profile.tower.run;if(!run||run.pending)return null;
  const f=towerFloor(run.seed,run.floor,run.creature),st=towerStats(run);
  // A guardian floor is its own show: no Wonder there. From floor 5 up the rivals can grow a Power Form too.
  const m=makeMatch({...options,forms:options.forms??[formUnlocked(profile,run.creature),run.floor>=5],wonder:!!options.wonder&&!f.giant,player:run.creature,rival:f.rival,level:f.level,mode:f.mode,arena:f.arena,giantRival:f.giant,upgrades:st.upgrades,boost:options.boost??levelBoost(profile,run.creature),run:{picks:run.picks,rivalHp:f.rivalHp,twist:f.twist,seed:run.seed,floor:run.floor}});
  m.tower={floor:run.floor,guard:f.giant};return m;
}
// After a tower battle: climb on, use the rescue star, or end the climb. A spark for every floor; a box for every
// five floors of a new record.
export function recordTower(profile,m){
  const T=profile.tower,run=T.run;if(!run||!m.tower||m.tower.floor!==run.floor||m.status!=='finished')return null;
  if(m.winner===0){
    const cleared=run.floor,bestBefore=T.best;run.floor++;T.best=Math.max(T.best,cleared);addSparks(profile,1);
    const boxes=Math.floor(T.best/TOWER_GUARD_EVERY)-Math.floor(bestBefore/TOWER_GUARD_EVERY);if(boxes>0)profile.box.earned+=boxes;
    if(cleared%TOWER_PICK_EVERY===0){const opts=towerOptions(run);if(opts.length)run.pending=opts;}
    return {won:true,cleared,record:cleared>bestBefore,boxes,pick:!!run.pending};
  }
  if(run.lives>0){run.lives--;return {won:false,retry:true,floor:run.floor};}
  T.run=null;T.runs++;return {won:false,ended:true,floor:run.floor,best:T.best};
}
export function chooseTowerPick(profile,id){const run=profile.tower.run;if(!run?.pending?.includes(id))return false;run.picks.push(id);run.pending=null;return true;}
export function endTowerRun(profile){if(!profile.tower.run)return false;profile.tower.run=null;profile.tower.runs++;return true;}

// ------------------------------------------------------------------ goals of the day
// Three small goals a day, each with a picture. A goal not finished today simply stays: there is no streak to lose.
// Each finished goal gives two sparks; all three on one day give a gift box.
export const GOAL_SPARKS=2,GOAL_COUNT=3;
export const GOAL_TYPES={
  winElement:{need:1,icon:'element',family:'who'},winWith:{need:1,icon:'creature',family:'who'},wins:{need:3,icon:'star'},
  league:{need:2,icon:'trophy'},tower:{need:3,icon:'tower'},supers:{need:5,icon:'bolt'},
  story:{need:1,icon:'arrow'},replayStars:{need:1,icon:'star'},friend:{need:1,icon:'duo'},
  // Signposts to what is new: at most one a day, and only when it is already open to the child.
  form:{need:1,icon:'crown',family:'sign'},newWonder:{need:1,icon:'seed',family:'sign'},copy:{need:1,icon:'sparkle',family:'sign'},wonderDay:{need:1,icon:'seed',family:'sign'},
};
export const dayKey=(date=new Date())=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
const hashText=t=>{let h=2166136261;for(const ch of String(t)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function readDaily(data,fresh){
  const d=data.daily;if(!d||typeof d!=='object')return;const day=/^\d{4}-\d{2}-\d{2}$/;
  const goals=Array.isArray(d.goals)?d.goals.filter(g=>g&&GOAL_TYPES[g.type]).slice(0,GOAL_COUNT).map(g=>({type:g.type,param:typeof g.param==='string'&&g.param.length<24?g.param:null,need:clamp(Math.floor(+g.need||GOAL_TYPES[g.type].need),1,99),have:clamp(Math.floor(+g.have||0),0,99),done:!!g.done})):[];
  fresh.daily={day:day.test(d.day)?d.day:'',goals,bonusDay:day.test(d.bonusDay)?d.bonusDay:''};
}
// The goals a child can do right now, from what is already open to them.
function eligibleGoals(profile,{friends=false,storyLeft=true}={}){
  const team=Object.keys(CREATURES).filter(id=>isUnlocked(profile,id)),elements=[...new Set(team.map(id=>CREATURES[id].element))];
  const out=[{type:'wins'},{type:'supers'}];
  for(const el of elements)out.push({type:'winElement',param:el});
  for(const id of team)if(id!==profile.selected)out.push({type:'winWith',param:id});
  const open=(profile.story?.done||0)>=4;
  if(storyLeft)out.push({type:'story'});
  if(open){out.push({type:'league'},{type:'tower'});}
  if((profile.story?.done||0)>0)out.push({type:'replayStars'});
  if(friends)out.push({type:'friend'});
  if(team.some(id=>formUnlocked(profile,id)))out.push({type:'form'});
  if((profile.played||0)>=3){if(WONDER_IDS.some(id=>!(profile.wonders?.seen?.[id]>0)))out.push({type:'newWonder'});out.push({type:'wonderDay'});}
  if((profile.story?.done||0)>=1)out.push({type:'copy'});
  return out;
}
// A new day keeps unfinished goals and fills the free places with new ones of other kinds.
export function refreshDaily(profile,today=dayKey(),{seed='',friends=false,storyLeft=true}={}){
  const D=profile.daily;if(D.day===today&&D.goals.length)return false;
  const keep=D.goals.filter(g=>!g.done),r=seeded(hashText(today+'|'+seed)),pool=eligibleGoals(profile,{friends,storyLeft}).filter(g=>!keep.some(k=>k.type===g.type));
  const goals=[...keep];
  while(goals.length<GOAL_COUNT&&pool.length){const g=pool.splice(Math.floor(r()*pool.length),1)[0],fam=GOAL_TYPES[g.type].family;if(goals.some(x=>x.type===g.type||fam&&GOAL_TYPES[x.type].family===fam))continue;goals.push({type:g.type,param:g.param??null,need:GOAL_TYPES[g.type].need,have:0,done:false});}
  D.day=today;D.goals=goals;return true;
}
// After a battle: what moved forward. A finished goal pays at once; the third one of the day brings the gift box.
export function progressDaily(profile,ev,today=dayKey()){
  const D=profile.daily,moved=[];let boxes=0;
  for(const g of D.goals){if(g.done)continue;const c=CREATURES[ev.creature];
    const add=g.type==='wins'?(ev.win?1:0):g.type==='supers'?(ev.supers||0):g.type==='winElement'?(ev.win&&c?.element===g.param?1:0):g.type==='winWith'?(ev.win&&ev.creature===g.param?1:0)
      :g.type==='league'?(ev.mode==='league'?1:0):g.type==='tower'?(ev.towerCleared?1:0):g.type==='story'?(ev.storyStep?1:0):g.type==='replayStars'?(ev.replayStars>=3?1:0):g.type==='friend'?(ev.friend?1:0)
      :g.type==='form'?(ev.formUsed?1:0):g.type==='newWonder'?(ev.newWonder?1:0):g.type==='copy'?(ev.copied||0):g.type==='wonderDay'?(ev.wonderDay?1:0):0;
    if(!add)continue;g.have=Math.min(g.need,g.have+add);if(g.have>=g.need){g.done=true;boxes+=addSparks(profile,GOAL_SPARKS);}moved.push(g);}
  let bonus=false;if(D.goals.length&&D.goals.every(g=>g.done)&&D.bonusDay!==today){D.bonusDay=today;profile.box.earned++;bonus=true;}
  return {moved,boxes,bonus};
}

// ------------------------------------------------------------------ co-op: two children against a giant
// Nobody loses to a friend here. A child who falls comes back after a few seconds; the giant has to be beaten
// before the clock runs out. Each extra heart gives that child a quarter more life, as in a friend battle.
export const COOP_RESPAWN=4,COOP_DURATION=150;
export const COOP_GIANTS=['fireguard','seaguard','windguard','tehomon'];
// How tough each giant is, so that each takes about as long to beat at the same level (tuned with the Mode-Sim's co-op table).
export const COOP_GIANT_HP={fireguard:2.2,windguard:2.2,tehomon:1.65,seaguard:1};
export const COOP_LEVELS={easy:{level:'rookie',hp:2.2,name:'קל'},normal:{level:'challenger',hp:2.8,name:'רגיל'},hard:{level:'veteran',hp:3,name:'קשה'}};
const COOP_SPAWN=[{x:250,y:330},null,{x:250,y:500}];
function setupCoop(m,{partner='havzuk',hpMul=2.8,hearts=[0,0]}={}){
  if(!CREATURES[partner])partner='havzuk';
  m.coop=true;m.duration=COOP_DURATION;const p1=m.actors[0],boss=m.actors[1],p2=actor(partner,2);
  Object.assign(p1,COOP_SPAWN[0]);Object.assign(p2,COOP_SPAWN[2]);p2.facing=1;p2.aim=0;p2.canForm=!!m.forms?.[2];p2.lab=labFor(m,2,partner);m.actors.push(p2);
  boss.spec={...boss.spec,hp:Math.round(boss.spec.hp*hpMul*(COOP_GIANT_HP[boss.id]||1))};boss.hp=boss.spec.hp;boss.x=1000;boss.y=410;
  [p1,p2].forEach((a,i)=>{const extra=clamp(Math.floor(hearts?.[i]||0),0,2);if(extra){a.spec={...a.spec,hp:Math.round(a.spec.hp*(1+HEART_BONUS*extra))};a.hp=a.spec.hp;}});
}
function stepCoop(m,dt){
  for(const p of m.actors){if(p.side===1)continue;
    if(p.out>0){p.out-=dt;if(p.out<=0){p.out=0;p.hp=p.spec.hp;Object.assign(p,COOP_SPAWN[p.side]);p.invincible=1.5;event(m,'respawn',{side:p.side});}continue;}
    if(p.hp<=0)knockOut(m,p,COOP_RESPAWN);}
  if(m.actors[1].hp<=0)finish(m,0,'giant');else if(m.time>=m.duration)finish(m,1,'time');
}
