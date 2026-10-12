// The line between two phones. PeerJS's free public service only introduces them; then they talk directly.
// Only names, creatures and the battle travel on it. With ?link=local two tabs of one browser talk through a
// BroadcastChannel instead, which is how it is tested without a second phone.
import {peerId} from './net.js';
const local=new URLSearchParams(location.search).get('link')==='local';
let peerLoading=null;
function loadPeer(){
  if(window.Peer)return Promise.resolve();
  return peerLoading??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/peerjs.min.js';s.onload=()=>resolve();s.onerror=()=>{peerLoading=null;reject(new Error('peerjs'));};document.head.appendChild(s);});
}
// A link: send(message), close(). Handlers: onOpen(), onMessage(data), onClose(), onError(kind).
function localLink(role,code,h){
  const ch=new BroadcastChannel('creature-league-'+peerId(code)),me=role+'-'+Math.random().toString(36).slice(2);let other=null,closed=false;
  const post=(type,data)=>ch.postMessage({from:me,role,type,data});
  ch.onmessage=e=>{const m=e.data;if(m.from===me||m.role===role)return;
    if(m.type==='knock'&&role==='host'&&!other){other=m.from;post('welcome');h.onOpen();return;}
    if(m.type==='welcome'&&role==='guest'&&!other){other=m.from;h.onOpen();return;}
    if(m.from!==other)return;if(m.type==='data')h.onMessage(m.data);if(m.type==='bye'){closed=true;h.onClose();}};
  if(role==='guest'){post('knock');const again=setInterval(()=>{if(other||closed)clearInterval(again);else post('knock');},700);setTimeout(()=>{if(!other&&!closed){clearInterval(again);h.onError('no-room');}},8000);}
  return {send:data=>{if(other&&!closed)post('data',data);},close:()=>{if(!closed){closed=true;post('bye');ch.close();}}};
}
export async function openHost(code,h){
  if(local)return localLink('host',code,h);
  await loadPeer();
  return new Promise((resolve,reject)=>{
    const peer=new window.Peer(peerId(code),{debug:0});let conn=null,done=false,opened=false;
    const link={send:data=>{if(conn?.open)conn.send(data);},close:()=>{done=true;try{conn?.close();}catch{}peer.destroy();}};
    peer.on('open',()=>{opened=true;resolve(link);});
    peer.on('error',e=>{if(!opened){peer.destroy();reject(new Error(e.type==='unavailable-id'?'taken':'network'));return;}if(!done)h.onError(e.type==='network'||e.type==='server-error'||e.type==='socket-error'?'network':'other');});
    // Only the first friend comes in; a second phone with the same code is turned away.
    peer.on('connection',c=>{if(conn){c.close();return;}conn=c;c.on('open',()=>h.onOpen());c.on('data',d=>h.onMessage(d));c.on('close',()=>{if(!done)h.onClose();});});
  });
}
export async function openGuest(code,h){
  if(local)return localLink('guest',code,h);
  await loadPeer();
  return new Promise(resolve=>{
    const peer=new window.Peer({debug:0});let conn=null,done=false;
    const link={send:data=>{if(conn?.open)conn.send(data);},close:()=>{done=true;try{conn?.close();}catch{}peer.destroy();}};
    // The link comes back at once; whether the room answers arrives through the handlers.
    resolve(link);
    // Some networks let the phones find each other but not talk; then the friend hears why instead of waiting.
    setTimeout(()=>{if(!done&&!conn?.open){done=true;h.onError('no-line');}},15000);
    peer.on('open',()=>{conn=peer.connect(peerId(code),{reliable:true,serialization:'json'});conn.on('open',()=>h.onOpen());conn.on('data',d=>h.onMessage(d));conn.on('close',()=>{if(!done)h.onClose();});});
    peer.on('error',e=>{if(done)return;h.onError(e.type==='peer-unavailable'?'no-room':e.type==='network'||e.type==='server-error'||e.type==='socket-error'?'network':'other');});
  });
}
