// Shared choices change each creature's existing actions, without adding controls.
export const UPGRADE_IDS = ['scatter', 'surge', 'quick'];
// Older saves may still hold the removed dash upgrade; it becomes the fast superpower.
export const cleanUpgrades = ids => [...new Set(Array.isArray(ids) ? ids.map(id => id === 'trail' ? 'quick' : id).filter(id => UPGRADE_IDS.includes(id)) : [])].slice(0, 2);
const names = {
  maimi: ['מטר טיפות', 'גל ענק', 'גאות מהירה'],
  havzuk: ['מניפת ברקים', 'סערת חשמל', 'טעינת ברק'],
  slauz: ['מטח אבנים', 'רעידת ענק', 'לב של סלע'],
  lohatan: ['גשם גחלים', 'כדור אש ענק', 'גחלים לוחשות'],
  tehomon: ['מטח בועות', 'מערבולת התהום', 'זרם עמוק'],
  zikuk: ['שלוש קרניים', 'קרן שמש', 'אור מהיר'],
  retetoz: ['מטח רעד', 'מחילה עמוקה', 'רעד מהיר'],
  tzlilon: ['מחשבות כפולות', 'היפנוט עמוק', 'חלום מהיר'],
  shorshu: ['יער של זרעים', 'שורשי ענק', 'צמיחה מהירה'],
  galgalor: ['זכוכית מתפזרת', 'פיצוץ ענק', 'ניצוץ מהיר'],
  windguard: ['מטר נוצות', 'סופת ענק', 'רוח גבית'],
  seaguard: ['מטח בועות', 'גאות גדולה', 'גאות עולה'],
  fireguard: ['רעמת גחלים', 'שאגה גדולה', 'להבה ערה'],
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
  windguard: ['טורנדו גדול שסוחב חזק יותר וזורק רחוק.', '30 נזק בזריקה · טורנדו רחב ב־27%'],
  seaguard: ['טבעת גאות רחבה שמחזיקה יותר זמן.', 'טבעת ל־3.6 שניות · רחבה ב־27%'],
  fireguard: ['שאגה רחבה וארוכה יותר.', '52 נזק · טווח גדול ב־15%'],
};
export function upgradeOptions(spec) {
  const damage = Math.round(spec.damage * .6), fan = spec.spread === 3;
  const n = names[spec.id] || names.maimi, p = power[spec.id] || power.maimi;
  return [
    {id:'scatter',name:n[0],icon:'target',description:fan?'חמישה זרעים במקום שלושה בכל ירייה. מתקרבים כדי לפגוע עם כמה יחד.':'שלושה קליעים מתפזרים בכל ירייה. מתקרבים כדי לפגוע עם כמה יחד.',benefit:`${fan?5:3} קליעים × ${damage} נזק`,cost:`כל קליע חלש יותר: ${damage} במקום ${spec.damage}`,kind:'משנים את הירי'},
    {id:'surge',name:n[1],icon:spec.specialIcon,description:p[0],benefit:p[1],cost:'כוח־העל נטען לאט יותר',kind:'מגדילים את הכוח'},
    {id:'quick',name:n[2],icon:'sparkle',description:'כוח־העל נטען מהר יותר: מהפגיעות ומהזמן.',benefit:'טעינה מהירה ב־35%',cost:'הירייה הרגילה חלשה ב־10%',kind:'כוח־על לעיתים קרובות'},
  ];
}
export function buildSpec(base, ids) {
  const upgrades = cleanUpgrades(ids);
  return {...base, specialCooldown:base.specialCooldown*(upgrades.includes('surge')?1.4:1), damage:base.damage*(upgrades.includes('quick')?.9:1)};
}
