// Shared choices change each creature's existing actions, without adding controls.
export const UPGRADE_IDS = ['scatter', 'surge', 'trail'];
export const cleanUpgrades = ids => [...new Set(Array.isArray(ids) ? ids.filter(id => UPGRADE_IDS.includes(id)) : [])].slice(0, 2);
const names = {
  maimi: ['מטר טיפות', 'גל ענק', 'חמיקה רטובה'],
  havzuk: ['מניפת ברקים', 'סערת חשמל', 'שובל חשמלי'],
  slauz: ['מטח אבנים', 'רעידת ענק', 'חמיקה משוריינת'],
  lohatan: ['גשם גחלים', 'כדור אש ענק', 'שובל בוער'],
  tehomon: ['מטח בועות', 'מערבולת התהום', 'חמיקה רטובה'],
  zikuk: ['שלוש קרניים', 'קרן שמש', 'שובל אור'],
  retetoz: ['מטח רעד', 'מחילה עמוקה', 'שריון חפירה'],
  tzlilon: ['מחשבות כפולות', 'היפנוט עמוק', 'ענן חלומות'],
  shorshu: ['יער של זרעים', 'שורשי ענק', 'קליפת עץ'],
  galgalor: ['זכוכית מתפזרת', 'פיצוץ ענק', 'ניצוצות בדרך'],
  windguard: ['מטר נוצות', 'סופת ענק', 'רוח גבית'],
  seaguard: ['מטח בועות', 'גאות גדולה', 'שריון השונית'],
  fireguard: ['רעמת גחלים', 'שאגה גדולה', 'עקבות לבה'],
};
// What the stronger special does, and the number that proves it.
const power = {
  maimi: ['גל רחב שדוחף את היריב רחוק יותר.', '46 נזק · רוחב גדול ב־42%'],
  havzuk: ['פרץ חשמל גדול וחזק במקום הנחיתה.', '46 נזק · טווח גדול ב־36%'],
  slauz: ['רעידה רחבה וחזקה סביבך.', '65 נזק · טווח גדול ב־29%'],
  lohatan: ['פיצוץ אש גדול יותר ואדמה בוערת רחבה.', '42 נזק בפיצוץ · רוחב גדול ב־33%'],
  tehomon: ['מערבולת גדולה שפוגעת חזק יותר.', 'מערבולת רחבה ב־32% · 9 נזק בכל חצי שנייה'],
  zikuk: ['קרן עבה וחזקה יותר.', '52 נזק בקרן'],
  retetoz: ['צצים עם רעידה רחבה וחזקה.', '46 נזק · טווח גדול ב־30%'],
  tzlilon: ['ההיפנוט מגיע רחוק יותר ונמשך יותר זמן.', 'קפיאה של 1.6 שניות · טווח גדול ב־26%'],
  shorshu: ['השורשים תופסים אזור גדול ומחזיקים יותר זמן.', '34 נזק · תפיסה של 2.2 שניות'],
  galgalor: ['ארבעה־עשר קליעים במקום עשרה.', '14 קליעים × 13 נזק'],
  windguard: ['משב רחב וחזק שדוחף עוד יותר רחוק.', '48 נזק · דחיפה גדולה ב־30%'],
  seaguard: ['טבעת גאות רחבה וחזקה יותר.', '50 נזק · טווח גדול ב־26%'],
  fireguard: ['חמישה כדורי אש במקום שלושה.', '5 כדורי אש בשאגה'],
};
const trail = {
  water: ['החמיקה משאירה שלולית שמאטה את היריב.', 'שלולית ל־3.5 שניות'],
  electric: ['החמיקה משאירה שדה שפוגע במי שרודף אחריך.', '6 נזק בכל חצי שנייה · שדה ל־2.5 שניות'],
  fire: ['החמיקה משאירה אש על הרצפה.', '6 נזק בכל חצי שנייה · אש ל־2.5 שניות'],
  shield: ['החמיקה עוטפת אותך במגן לזמן קצר.', 'ספיגת 72% מהנזק ל־1.6 שניות'],
};
const trailOf = {windguard:'electric',seaguard:'water',fireguard:'fire',maimi:'water',tehomon:'water',tzlilon:'water',havzuk:'electric',zikuk:'electric',galgalor:'electric',lohatan:'fire',slauz:'shield',retetoz:'shield',shorshu:'shield'};
export function upgradeOptions(spec) {
  const damage = Math.round(spec.damage * .6), fan = spec.spread === 3;
  const t = trail[trailOf[spec.id] || 'shield'], n = names[spec.id] || names.maimi, p = power[spec.id] || power.maimi;
  return [
    {id:'scatter',name:n[0],icon:'target',description:fan?'חמישה זרעים במקום שלושה בכל ירייה. מתקרבים כדי לפגוע עם כמה יחד.':'שלושה קליעים מתפזרים בכל ירייה. מתקרבים כדי לפגוע עם כמה יחד.',benefit:`${fan?5:3} קליעים × ${damage} נזק`,cost:`כל קליע חלש יותר: ${damage} במקום ${spec.damage}`,kind:'משנים את הירי'},
    {id:'surge',name:n[1],icon:spec.specialIcon,description:p[0],benefit:p[1],cost:`טעינה של ${Math.round(spec.specialCooldown*1.4*10)/10} שניות במקום ${spec.specialCooldown}${spec.id==='slauz'?' · הכנה ארוכה יותר':''}`,kind:'מגדילים את הכוח'},
    {id:'trail',name:n[2],icon:'shield',description:t[0],benefit:t[1],cost:'חמיקה כל 4.5 שניות במקום 3.2',kind:'מפתיעים בחמיקה'},
  ];
}
export function buildSpec(base, ids) {
  const upgrades = cleanUpgrades(ids);
  return {...base, specialCooldown:base.specialCooldown*(upgrades.includes('surge')?1.4:1), dashCooldown:upgrades.includes('trail')?4.5:3.2};
}
