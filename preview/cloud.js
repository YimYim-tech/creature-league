// Online users (15 Oct 2026): a child's progress kept online, so it comes back on any phone, in Safari or in the home-screen app.
// Only when cloud-config.js names a project; with CLOUD null nothing here is ever called and no request leaves the device.
// Google Firebase over plain REST, no SDK: Authentication with a made-up address from the nickname and a password from four pictures,
// and one Firestore document per user ({name, face, save, updatedAt, schema, consent}). Plain functions with fetch passed in,
// so the tests run them against a fake server. What is kept and why: league/privacy.html; the owner's setup: docs/…Setup….
export const EMAIL_DOMAIN='players.creature-league.invalid',PASS_PREFIX='cl-pics1:',PICS=4,SCHEMA=1,CONSENT_VERSION='2026-10-15';
export const BACKUP_DAYS=7,SAVE_MAX=900000,NAME_MIN=2,NAME_MAX=12;
// Inside each local player's own save area (the suffix of app.js's playerStorage): the link to the online user, and the copy that lost.
export const LINK_KEY='creature-league.cloud',BACKUP_KEY='creature-league.cloud-backup';
const GOOGLE={auth:'https://identitytoolkit.googleapis.com/v1',token:'https://securetoken.googleapis.com/v1',store:'https://firestore.googleapis.com/v1'};
// The picture password: twelve pictures of the game's own icons, each its own colour; four taps in order (12^4 = 20,736).
// Only their places in this list make the password, and the pictures themselves are never stored anywhere.
export const PICTURES=[{icon:'heart',name:'לב',color:'#e0313a'},{icon:'flame',name:'אש',color:'#f57c00'},{icon:'star',name:'כוכב',color:'#f2c200'},
  {icon:'leaf',name:'עלה',color:'#2e9e44'},{icon:'wave',name:'גל',color:'#1e7fe0'},{icon:'bubble',name:'בועה',color:'#00acc8'},
  {icon:'bolt',name:'ברק',color:'#8e2fb0'},{icon:'mushroom',name:'פטרייה',color:'#e8508a'},{icon:'drum',name:'תוף',color:'#8a5a3c'},
  {icon:'trophy',name:'גביע',color:'#7d8b96'},{icon:'hat',name:'כובע',color:'#26313a'},{icon:'mountain',name:'הר',color:'#00897b'}];

// ------------------------------------------------------------------ the nickname
// One spelling for one name: NFC, trimmed, one space between words, lower case. The same name always finds the same user.
export const normName=n=>String(n??'').normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();
// A shown name keeps its letters' case: only the spaces are tidied.
export const showName=n=>String(n??'').normalize('NFC').trim().replace(/\s+/g,' ');
// 2–12 Hebrew or English letters, digits and spaces, and nothing that looks like a way to reach the child: no @, no web address, no phone.
export function nameProblem(raw){const n=normName(raw);if(n.length<NAME_MIN)return 'short';if(n.length>NAME_MAX)return 'long';
  if(/[@.]|www|http/.test(n)||/\d{6}/.test(n.replace(/ /g,'')))return 'contact';if(!/^[א-תa-z0-9 ]+$/.test(n))return 'letters';return null;}
export const NAME_WORDS={short:'לפחות 2 אותיות',long:'עד 12 אותיות',contact:'בלי מייל, בלי אתר ובלי מספר טלפון',letters:'רק אותיות, ספרות ורווח'};
// The sign-in address made from the name: plain ASCII, unique per name (Firebase keeps addresses unique), in a domain that can never receive mail.
const hex=s=>[...new TextEncoder().encode(s)].map(b=>b.toString(16).padStart(2,'0')).join('');
export const nameEmail=n=>'u'+hex(normName(n))+'@'+EMAIL_DOMAIN;
// The password: a fixed prefix, the four places in order and the name (always longer than Firebase's six letters).
export const validPicks=p=>Array.isArray(p)&&p.length===PICS&&p.every(i=>Number.isInteger(i)&&i>=0&&i<PICTURES.length);
export function picturePassword(picks,name){if(!validPicks(picks))throw new Error('four pictures');return PASS_PREFIX+picks.join('-')+':'+normName(name);}

// ------------------------------------------------------------------ the parent's check
// A two-digit times one-digit sum an adult does at a glance and a young child rarely does: 13–19 × 6–9.
export function adultQuestion(random=Math.random){const a=13+Math.floor(random()*7),b=6+Math.floor(random()*4);return {a,b,answer:a*b};}
// What the parent agreed to, kept in the user's own document. The version is the privacy notice's.
export const consentRecord=(now=Date.now())=>({at:Math.floor(now),version:CONSENT_VERSION});

// ------------------------------------------------------------------ the project's config
// Three plain strings from the Firebase console. In tests only, other base addresses: https, or this computer.
const safeBase=u=>{try{const x=new URL(u);return x.protocol==='https:'||x.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(x.hostname)?String(u).replace(/\/+$/,''):null;}catch{return null;}};
export function cloudConfig(c){
  if(!c||typeof c!=='object'||typeof c.apiKey!=='string'||!/^[\w-]{8,64}$/.test(c.apiKey)||typeof c.projectId!=='string'||!/^[a-z0-9-]{4,40}$/.test(c.projectId))return null;
  const e={...GOOGLE,...(c.endpoints||{})},out={apiKey:c.apiKey,projectId:c.projectId};for(const k of ['auth','token','store']){out[k]=safeBase(e[k]);if(!out[k])return null;}return out;
}
// The project a page may use. The real one only from a page on https away from this computer (the browser key is limited to the published
// site, so from here it could only be refused); a test copy pointing at a fake on this computer only from a page on this computer.
// Anything else: none, and the game stays local without asking the network.
const localHost=h=>['127.0.0.1','localhost','[::1]'].includes(h);
export function cloudFor(config,page){
  const c=cloudConfig(config);let u;try{u=new URL(page);}catch{return null;}if(!c)return null;
  const fake=[c.auth,c.token,c.store].some(b=>localHost(new URL(b).hostname)),here=localHost(u.hostname);
  return fake?(here?config:null):(u.protocol==='https:'&&!here?config:null);
}

// ------------------------------------------------------------------ what went wrong, in the child's words
// offline (no internet, or the service is busy), taken (the name has a user), wrong (name or pictures), tries (too many: wait),
// out (this phone must sign in again), old (the pictures again before a change or a delete), denied, missing, changed (moved on another phone),
// away (the service refuses this page: the key's site limit, a key or an API turned off): calm, like offline, and tried again later.
// With email enumeration protection a wrong name and wrong pictures are one answer (INVALID_LOGIN_CREDENTIALS); 'taken' comes only from signUp.
const KINDS={EMAIL_EXISTS:'taken',INVALID_LOGIN_CREDENTIALS:'wrong',INVALID_PASSWORD:'wrong',EMAIL_NOT_FOUND:'wrong',INVALID_EMAIL:'wrong',
  TOO_MANY_ATTEMPTS_TRY_LATER:'tries',TOKEN_EXPIRED:'out',INVALID_REFRESH_TOKEN:'out',USER_NOT_FOUND:'out',USER_DISABLED:'out',INVALID_ID_TOKEN:'out',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN:'old',PERMISSION_DENIED:'denied',UNAUTHENTICATED:'out',NOT_FOUND:'missing',FAILED_PRECONDITION:'changed',ALREADY_EXISTS:'changed'};
export class CloudError extends Error{constructor(kind,code=''){super(kind+(code?' '+code:''));this.kind=kind;this.code=code;}}
export const kindOf=e=>e instanceof CloudError?e.kind:'other';
const AWAY=/^(API_KEY_|SERVICE_DISABLED|CONSUMER_INVALID|API_KEY)|referer|API key|has not been used|is disabled/i;
export const CLOUD_WORDS={offline:'אין אינטרנט — ננסה שוב אחר כך',away:'אין גישה לשמירה באינטרנט כרגע — ננסה שוב אחר כך',taken:'הכינוי הזה כבר תפוס. בוחרים כינוי אחר.',wrong:'הכינוי או התמונות לא נכונים. מנסים שוב.',
  tries:'יותר מדי ניסיונות. מחכים כמה דקות ומנסים שוב.',out:'צריך להיכנס שוב עם הכינוי והתמונות.',old:'בוחרים שוב את התמונות של המשתמש.',
  unfinished:'המשתמש הזה לא הושלם. יוצרים אותו שוב בטלפון שבו התחילו.',full:'יש כבר 6 שחקנים בטלפון הזה.',other:'משהו השתבש. מנסים שוב אחר כך.'};

// ------------------------------------------------------------------ the document
const FIELDS=['name','face','save','updatedAt','schema'];
export function toFields(d){const f={};for(const [k,v] of Object.entries(d)){if(v==null)continue;
  if(k==='consent')f.consent={mapValue:{fields:{at:{integerValue:String(Math.floor(v.at))},version:{stringValue:String(v.version)}}}};
  else if(k==='updatedAt'||k==='schema')f[k]={integerValue:String(Math.floor(v))};else f[k]={stringValue:String(v)};}return f;}
export function fromDoc(doc){if(!doc||typeof doc!=='object')return null;const f=doc.fields||{},s=k=>typeof f[k]?.stringValue==='string'?f[k].stringValue:null,i=k=>Number(f[k]?.integerValue)||0,c=f.consent?.mapValue?.fields;
  return {name:s('name')||'',face:s('face')||'',save:s('save'),updatedAt:i('updatedAt'),schema:i('schema'),consent:c?{at:Number(c.at?.integerValue)||0,version:c.version?.stringValue||''}:null,updateTime:doc.updateTime||'',createTime:doc.createTime||''};}

// ------------------------------------------------------------------ the REST calls
// null when there is no project: the game never asks anything of the network then.
export function cloudApi(config,fetchFn=globalThis.fetch?.bind(globalThis)){
  const c=cloudConfig(config);if(!c||typeof fetchFn!=='function')return null;
  // keyed: a call that carries the key (sign-in and passes). A 403 there is never about the child: it is the key or its site limit.
  const call=async(url,init,keyed=false)=>{let r;try{r=await fetchFn(url,init);}catch{throw new CloudError('offline');}let body=null;try{body=await r.json();}catch{}
    if(r.ok)return body||{};const e=body?.error||{},code=String(e.message||'').split(/[\s:]/)[0]||String(e.status||''),reason=(Array.isArray(e.details)?e.details:[]).map(d=>d?.reason).find(Boolean)||'';
    if(AWAY.test(reason)||AWAY.test(String(e.message||''))||keyed&&r.status===403)throw new CloudError('away',reason||code);
    throw new CloudError(r.status>=500||r.status===429&&!KINDS[code]?'offline':KINDS[code]||KINDS[e.status]||(r.status===404?'missing':r.status===403?'denied':'other'),code);};
  const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const auth=(path,body)=>call(`${c.auth}/accounts:${path}?key=${encodeURIComponent(c.apiKey)}`,json(body),true);
  const docUrl=uid=>`${c.store}/projects/${encodeURIComponent(c.projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
  const bearer=t=>({Authorization:'Bearer '+t});
  // A session from the name and the pictures remembers when it signed in: Firebase wants a recent sign-in before an account goes.
  const session=b=>({uid:b.localId,idToken:b.idToken,refreshToken:b.refreshToken,expires:Date.now()+(Number(b.expiresIn)||3600)*1000,signedIn:Date.now()});
  const login=(name,picks)=>({email:nameEmail(name),password:picturePassword(picks,name),returnSecureToken:true});
  return {
    signUp:(name,picks)=>auth('signUp',login(name,picks)).then(session),
    signIn:(name,picks)=>auth('signInWithPassword',login(name,picks)).then(session),
    // A fresh pass from the refresh token; Firebase may hand back a new refresh token, which replaces the old one.
    refresh:token=>call(`${c.token}/token?key=${encodeURIComponent(c.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(token)},true)
      .then(b=>({uid:b.user_id,idToken:b.id_token,refreshToken:b.refresh_token||token,expires:Date.now()+(Number(b.expires_in)||3600)*1000})),
    setPictures:(idToken,name,picks)=>auth('update',{idToken,password:picturePassword(picks,name),returnSecureToken:true}).then(session),
    account:idToken=>auth('lookup',{idToken}).then(b=>{const u=b.users?.[0]||{};const t=v=>v?new Date(Number(v)).toISOString():null;return {id:u.localId||null,loginAddress:u.email||null,created:t(u.createdAt),lastSignIn:t(u.lastLoginAt),picturesChanged:t(u.passwordUpdatedAt)};}),
    removeUser:idToken=>auth('delete',{idToken}),
    read:(uid,idToken)=>call(docUrl(uid),{headers:bearer(idToken)}).then(fromDoc).catch(e=>{if(kindOf(e)==='missing')return null;throw e;}),
    // Only the five fields that change (the consent is written once, at creation). A precondition keeps a copy sent from another phone
    // from being overwritten unseen: the write fails as 'changed' when the document moved since this phone last saw it.
    write:(uid,idToken,data,{seen=null,create=false}={})=>{const keys=create?[...FIELDS,'consent']:FIELDS,pick=Object.fromEntries(keys.map(k=>[k,data[k]]));
      const q=[...keys.map(k=>'updateMask.fieldPaths='+k),create?'currentDocument.exists=false':seen?'currentDocument.updateTime='+encodeURIComponent(seen):''].filter(Boolean).join('&');
      return call(docUrl(uid)+'?'+q,{method:'PATCH',headers:{...bearer(idToken),'Content-Type':'application/json'},body:JSON.stringify({fields:toFields(pick)})}).then(fromDoc);},
    removeDoc:(uid,idToken)=>call(docUrl(uid),{method:'DELETE',headers:bearer(idToken)}).catch(e=>{if(kindOf(e)!=='missing')throw e;return {};}),
  };
}

// ------------------------------------------------------------------ the flows
// A short fingerprint of a save: has it changed since it was last sent?
export function saveHash(s){let h=0x811c9dc5;s=String(s??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0')+':'+s.length;}
export const linkOk=l=>!!l&&typeof l==='object'&&typeof l.uid==='string'&&/^[\w-]{1,128}$/.test(l.uid)&&typeof l.refreshToken==='string'&&l.refreshToken.length>0;
export function readLink(storage){try{const l=JSON.parse(storage.getItem(LINK_KEY));return linkOk(l)?l:null;}catch{return null;}}
export function writeLink(storage,link){try{if(link)storage.setItem(LINK_KEY,JSON.stringify(link));else storage.removeItem?.(LINK_KEY);return true;}catch{return false;}}
// The copy that lost a conflict stays on this device for 7 days, then goes.
export function keepBackup(storage,uid,save,now=Date.now()){try{storage.setItem(BACKUP_KEY,JSON.stringify({at:now,uid,save}));}catch{}}
export function pruneBackup(storage,now=Date.now()){try{const b=JSON.parse(storage.getItem(BACKUP_KEY));if(b&&!(now-b.at<BACKUP_DAYS*864e5))storage.removeItem?.(BACKUP_KEY);return !!b&&now-b.at<BACKUP_DAYS*864e5;}catch{return false;}}

// Creating a user, after the parent's consent: the account, then its document with the consent and this player's save.
// If the document cannot be written the new account is taken back, so a name is never left taken by a user with nothing in it;
// if even that fails, the link remembers the consent and the next sync writes the document.
export async function createUser(api,{name,picks,face,save,consent,now=Date.now()}){
  if(!api)return null;if(!consent?.at||!consent.version)throw new Error('consent first');if(nameProblem(name))throw new CloudError('wrong','NAME');
  const s=await api.signUp(name,picks),data={name:showName(name),face:String(face||''),save,updatedAt:now,schema:SCHEMA,consent};
  try{const doc=await api.write(s.uid,s.idToken,data,{create:true});return {session:s,link:{uid:s.uid,refreshToken:s.refreshToken,name:showName(name),seen:doc?.updateTime||'',sent:saveHash(save),changedAt:now}};}
  catch(e){try{await api.removeUser(s.idToken);}catch{return {session:s,link:{uid:s.uid,refreshToken:s.refreshToken,name:showName(name),seen:'',sent:'',changedAt:now,pending:consent}};}throw e;}
}
// Signed in with the pictures in the last 4 minutes, in this visit: a delete can go ahead without asking for them again.
export const RECENT_MS=240e3,signedInLately=(cache,uid,now=Date.now())=>now-(cache?.get?.(uid)?.signedIn||0)<RECENT_MS;
// Where an online user's copy goes on a phone that signs in: the player already linked to it; else the one playing when it was never
// played and has no user; else a new player (null when the phone is full). Another child's save on the phone is never overwritten.
export function chooseSlot({players,active,linked={},fresh=false,uid,max=6}){
  const mine=players.find(p=>linked[p.id]===uid);if(mine)return {id:mine.id,mine:true};if(!linked[active]&&fresh)return {id:active,reuse:true};
  if(players.length>=max)return null;return {id:'p'+(Math.max(0,...players.map(p=>+String(p.id).slice(1)||0))+1),add:true};
}
// Signing in on a phone: the account and its document. A user without a document never finished its creation.
export async function signInUser(api,{name,picks}){
  if(!api)return null;const s=await api.signIn(name,picks),doc=await api.read(s.uid,s.idToken);
  if(!doc||doc.save==null)throw new CloudError('unfinished');return {session:s,doc};
}
// Which copy wins. 'up' sends this phone's copy, 'down' takes the online one, 'same' leaves both.
// The online copy that has not moved since this phone last saw it is simply replaced by any change here. When both moved, the newer one
// wins (updatedAt against this copy's last change) and the other is kept in the backup for 7 days. A fresh copy here never wins.
export function decide({save,changedAt=0,fresh=false},cloudDoc,link={}){
  if(!cloudDoc||cloudDoc.save==null)return 'up';if(cloudDoc.save===save)return 'same';
  const changed=saveHash(save)!==link.sent,moved=!link.seen||cloudDoc.updateTime!==link.seen;
  if(!moved)return changed?'up':'same';if(!changed||fresh)return 'down';
  return cloudDoc.updatedAt>changedAt?'down':'up';
}
// The pass for a link: the one in memory while it is fresh, else a new one from the refresh token (which may be replaced).
export async function pass(api,link,cache,now=Date.now()){
  const p=cache?.get(link.uid);if(p&&p.expires-now>60e3)return p.idToken;
  const s=await api.refresh(link.refreshToken);if(s.uid&&s.uid!==link.uid)throw new CloudError('out','UID');cache?.set(link.uid,s);
  if(s.refreshToken&&s.refreshToken!==link.refreshToken)link.refreshToken=s.refreshToken;return s.idToken;
}
// One round for one linked player. io: {link, save (this phone's copy, a string), changedAt, fresh, check (look online even without a
// change here), store(link), take(save) → false when it cannot be taken now, backup(save)}. Returns what happened:
// 'skip', 'same', 'up', 'down', 'later'; a failure throws a CloudError (offline, out…) and the link is left as it was, except 'out'.
// A pass kept in memory that the service no longer takes (the pictures changed on another phone) is dropped and the round runs once more
// with a new one, which tells whether this phone must sign in again.
export async function syncOne(api,io,cache,now=Date.now(),again=true){
  const L=io.link;if(!api||!linkOk(L)||L.out||L.deleting)return 'skip';
  const save=String(io.save??''),h=saveHash(save);if(save.length>=SAVE_MAX)return 'skip';
  if(!io.check&&!L.pending&&h===L.sent)return 'same';
  const kept=!!cache?.has?.(L.uid);
  try{return await syncWith(api,io,cache,now,save,h);}
  catch(e){if(again&&kept&&['denied','out'].includes(kindOf(e))&&!L.out){cache.delete(L.uid);return syncOne(api,io,cache,now,false);}throw e;}
}
async function syncWith(api,io,cache,now,save,h){
  const L=io.link;let token;try{token=await pass(api,L,cache,now);}catch(e){if(kindOf(e)==='out'){L.out=true;io.store(L);}throw e;}
  const face=String(io.face||''),data={name:L.name,face,save,updatedAt:io.changedAt||now,schema:SCHEMA};
  if(L.pending){const doc=await api.write(L.uid,token,{...data,consent:L.pending},{create:true});delete L.pending;Object.assign(L,{seen:doc.updateTime,sent:h});io.store(L);return 'up';}
  const send=async seen=>{const doc=await api.write(L.uid,token,data,{seen});Object.assign(L,{seen:doc.updateTime,sent:h});io.store(L);return 'up';};
  if(!io.check){try{return await send(L.seen);}catch(e){if(kindOf(e)!=='changed')throw e;}}
  const doc=await api.read(L.uid,token);if(!doc){L.out=true;io.store(L);throw new CloudError('out','GONE');}
  const what=decide({save,changedAt:io.changedAt||0,fresh:io.fresh},doc,L);
  if(what==='same'){Object.assign(L,{seen:doc.updateTime,sent:h});io.store(L);return 'same';}
  if(what==='up'){if(doc.save!=null&&saveHash(doc.save)!==L.sent)io.backup(doc.save);return send(doc.updateTime);}
  if(io.take(doc.save)===false)return 'later';if(h!==L.sent&&!io.fresh)io.backup(save);
  Object.assign(L,{seen:doc.updateTime,sent:saveHash(doc.save),changedAt:doc.updatedAt});io.store(L);return 'down';
}
// Changing the pictures: the old pictures first (a fresh sign-in), then the new ones. Every other phone signs in again after it.
export async function changePictures(api,{name,oldPicks,newPicks}){if(!api)return null;const s=await api.signIn(name,oldPicks);return api.setPictures(s.idToken,name,newPicks);}
// Deleting the user: the document first (only its owner can), then the account. Firebase asks for a recent sign-in before an account
// goes: with the pictures given it signs in first; without them a stale pass ends as 'old', and the pictures are asked for.
// gone() is told when the document is gone, so a phone that loses the line between the two steps never writes it again.
export async function deleteUser(api,{link,cache,picks=null,gone=()=>{}}){
  if(!api||!linkOk(link))return null;const s=picks?await api.signIn(link.name,picks):null;if(s&&s.uid!==link.uid)throw new CloudError('wrong','UID');
  const token=s?s.idToken:await pass(api,link,cache);await api.removeDoc(link.uid,token);gone();await api.removeUser(token);cache?.delete?.(link.uid);return true;
}
// What is kept online about this user, for the parent to read or download: the account's technical part and the document.
export async function userData(api,{link,cache}){
  if(!api||!linkOk(link))return null;const token=await pass(api,link,cache),[account,doc]=await Promise.all([api.account(token),api.read(link.uid,token)]);
  let progress=null;try{progress=JSON.parse(doc?.save??'null');}catch{progress=doc?.save??null;}
  return {about:'ליגת היצורים — המידע שנשמר במשתמש המקוון',account,document:doc?{name:doc.name,face:doc.face,consent:doc.consent?{at:new Date(doc.consent.at).toISOString(),version:doc.consent.version}:null,
    updatedAt:doc.updatedAt?new Date(doc.updatedAt).toISOString():null,serverUpdateTime:doc.updateTime||null,schema:doc.schema,progress}:null};
}
// One upload at a time: a call while one runs asks for another round after it. A failure waits 5 s, 10 s, 20 s… up to 5 minutes,
// quietly; a 'soon' during that wait does not cut it short, a 'now' (the app going to the background) tries at once.
export function syncer(run,{setTimeout:st=globalThis.setTimeout,clearTimeout:ct=globalThis.clearTimeout,delay=1500}={}){
  let busy=false,again=false,timer=null,fails=0;
  const schedule=ms=>{if(timer)ct(timer);timer=st(go,ms);};
  async function go(){timer=null;if(busy){again=true;return;}busy=true;again=false;let ok;try{ok=await run()!==false;}catch{ok=false;}busy=false;
    if(!ok){fails++;schedule(Math.min(300e3,5e3*2**(fails-1)));}else{fails=0;if(again)schedule(delay);}}
  return {soon(ms=delay){if(busy){again=true;return;}if(fails&&timer)return;schedule(ms);},now(){if(timer)ct(timer);timer=null;return go();},get busy(){return busy;},get fails(){return fails;}};
}
