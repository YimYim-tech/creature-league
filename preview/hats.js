// The hat wardrobe: any hat on any creature. Hats never carry stats and are never bought.
// Plain data: core.js imports it and re-exports the public part, so nobody else imports this file.
export const HAT_SLOTS=['head','face'],HAT_TIERS=['common','rare','legendary'],HAT_SOURCES=['box','welcome','boss','secret'];
// Boss and secret hats are ready in the data (src:'boss',boss:'<guardian id>'), but none ship before their art.
export const HATS=Object.freeze([
  {id:'beanie',name:'כובע צמר',slot:'head',tier:'common',src:'box'},
  {id:'party',name:'כובע מסיבה',slot:'head',tier:'common',src:'box'},
  {id:'sailor',name:'כובע מלחים',slot:'head',tier:'common',src:'box'},
  {id:'chef',name:'כובע שף',slot:'head',tier:'common',src:'box'},
  {id:'flowers',name:'זר פרחים',slot:'head',tier:'common',src:'box'},
  {id:'leaves',name:'כתר עלים',slot:'head',tier:'common',src:'box'},
  {id:'cowboy',name:'כובע בוקרים',slot:'head',tier:'rare',src:'box'},
  {id:'pirate',name:'כובע פיראטים',slot:'head',tier:'rare',src:'box'},
  {id:'propeller',name:'כובע מדחף',slot:'head',tier:'rare',src:'box'},
  {id:'tophat',name:'מגבעת',slot:'head',tier:'rare',src:'box'},
  {id:'viking',name:'קסדת ויקינגים',slot:'head',tier:'rare',src:'box'},
  {id:'goggles',name:'משקפי מגן',slot:'face',tier:'rare',src:'box'},
  {id:'sunglasses',name:'משקפי שמש',slot:'face',tier:'rare',src:'box'},
  {id:'astronaut',name:'קסדת חלל',slot:'head',tier:'legendary',src:'box'},
  {id:'knight',name:'קסדת אביר',slot:'head',tier:'legendary',src:'box'},
  {id:'wizard',name:'כובע קוסמים',slot:'head',tier:'legendary',src:'box'},
].map(h=>Object.freeze({...h,img:'hat-'+h.id})));
export const HAT_IDS=HATS.map(h=>h.id);
export const hatById=id=>HATS.find(h=>h.id===id)||null;
// What a star box of one tier can still hold: hats from boxes, of that tier.
export const boxHats=tier=>HATS.filter(h=>h.src==='box'&&h.tier===tier).map(h=>h.id);
