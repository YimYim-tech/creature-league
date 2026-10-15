// The Lab: each child designs a creature's Power Form (a headpiece, a name, one of two mechanics).
// Plain data and two small cleaners. There are no chosen designs here: a design lives in the save (profile.lab),
// and a creature without one keeps the star crown. core.js imports this file and re-exports it.
export const FORM_CREDIT='עוצב בידי המנהל הקריאטיבי';
export const LAB_CREATURES=['maimi','havzuk','slauz','lohatan','zankor','zoharon'];
export const FORM_OPTIONS=Object.freeze({maimi:['coral','shell','wave'],havzuk:['bolts','mane','visor'],slauz:['geode','moss','peaks'],
  lohatan:['obsidian','phoenix','volcano'],zankor:['flame','goggles','sunrays'],zoharon:['comet','moon','stars']});
export const formImg=(id,option)=>'form-'+id+'-'+option;
// Three suggested names per creature, one for each option in FORM_OPTIONS order. The Lab can also type one (16 letters at most).
export const LAB_NAMES=Object.freeze({maimi:['אלמוגית','צדפונת','גל־על'],havzuk:['ברק כפול','רעמת ברקים','עין הסערה'],slauz:['לב בדולח','הסלע הירוק','פסגת ענק'],
  lohatan:['שריון לבה','כנפי אש','הר בוער'],zankor:['נמר הלהבה','נמר המרוץ','נמר השמש'],zoharon:['שביט','דרקון הירח','כתר כוכבים']});
// The mechanic pool. icon: an existing sprite; words: the two words on the mechanic card. Each works only while the form lasts.
export const MECHS=Object.freeze({
  puddles:{icon:'wave',words:'שלוליות מאטות'},      // a shot leaves a slowing puddle where it lands
  overcover:{icon:'arch',words:'מעל אבנים'},        // shots fly over stones and water rings, a little quicker and further
  breaker:{icon:'mountain',words:'שובר אבנים'},     // heavy shots: each breaks the stone it meets and hits a little harder
  firetrail:{icon:'flame',words:'שביל אש'},         // running leaves a short trail of fire, and a shot leaves a flame where it lands
  afterimage:{icon:'pair',words:'ירייה כפולה'},     // every third shot brings a shadow shot behind it
  stunthird:{icon:'spiral',words:'מכה מסחררת'},     // every third hit makes the rival dizzy for a moment
  doublecharge:{icon:'bolt',words:'טעינה כפולה'},   // the super fills twice as fast as outside the form
  shield3:{icon:'shield',words:'מגן אור'},          // a light shield that swallows three hits, and grows a hit back now and then
});
export const MECH_IDS=Object.keys(MECHS);
// Two mechanics per creature, different in kind, so the choice is a real one.
export const LAB_MECHS=Object.freeze({maimi:['puddles','overcover'],havzuk:['overcover','stunthird'],slauz:['breaker','shield3'],
  lohatan:['firetrail','doublecharge'],zankor:['afterimage','firetrail'],zoharon:['doublecharge','shield3']});
// The numbers behind the mechanics (each worth about a sixth more while the form lasts; tuned with the Mode-Sim).
// 'Over the stones' flies a little shorter (it was just over the +6 gate); the dizzy hit, the double charge and the fire trail are a
// little stronger; the light shield grows back slower (Zoharon's shield left his other card no real choice).
export const LAB_TUNE=Object.freeze({puddleR:34,puddleLife:1,puddleSlow:.3,overLife:1.15,overSpeed:1.1,breakDamage:1.15,trailEvery:40,trailLife:2.5,trailR:36,trailDps:10,emberLife:1.5,
  ghostEvery:3,ghostDelay:.09,ghostDamage:.5,stunEvery:3,stun:.35,charge:2.5,shield:3,shieldEvery:6});
const own=(t,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(t,k);
// One saved design {option,name,mech}: a clean copy, or null when it is not a design for this creature.
export function cleanDesign(id,d){
  if(!own(FORM_OPTIONS,id)||!d||typeof d!=='object')return null;const i=FORM_OPTIONS[id].indexOf(d.option);
  if(i<0||typeof d.option!=='string'||!LAB_MECHS[id].includes(d.mech))return null;
  const name=(typeof d.name==='string'?d.name:'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,16).trim()||LAB_NAMES[id][i];
  return {option:d.option,name,mech:d.mech};
}
// A whole Lab {id:design}: only the valid designs stay.
export function cleanLab(data){const out={};if(!data||typeof data!=='object'||Array.isArray(data))return out;
  for(const id of LAB_CREATURES){const d=cleanDesign(id,data[id]);if(d)out[id]=d;}return out;}
