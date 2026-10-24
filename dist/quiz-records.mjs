import {mergeQuizSnapshot,quizChallengeKey,createQuizTimer} from './quiz-records-core.mjs';
const cacheKey=id=>'boundary-atlas-quiz-records-v1:'+id,pendingPrefix=id=>'boundary-atlas-quiz-pending-v1:'+(id||'guest')+':';
const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const write=(key,value)=>{try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const memoryPending=new Map();
function pending(id){const records=new Map(),prefix=pendingPrefix(id);try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(prefix)){const a=read(key);if(a?.id&&a.country&&Number.isInteger(a.total)&&a.total>0&&Number.isFinite(Date.parse(a.finishedAt)))records.set(a.id,a);}}}catch{}for(const [key,a]of memoryPending)if(key.startsWith(prefix))records.set(a.id,a);return [...records.values()];}
let owner=null,record={id:null,snapshot:null,working:false,status:'guest'},initialized=false,retryTimer;
const listeners=new Set();
function notify(){for(const listener of listeners)listener();}
const transport=async(id,method='GET',body,cursor)=>{const account=await import('./account.mjs');return account.requestAccountQuizRecords(id,method,body,cursor);};
async function sync(r=record){
 if(!r.id||r!==record||r.working)return;r.working=true;r.status='saving';notify();const accepted=[];
 try{const queued=pending(r.id);for(let i=0;i<queued.length;i+=10){if(r!==record)return;const result=await transport(r.id,'POST',{attempts:queued.slice(i,i+10)});accepted.push(...result.accepted);}
  const snapshot=await transport(r.id);for(const id of accepted){const key=pendingPrefix(r.id)+id;write(key,null);memoryPending.delete(key);}write(cacheKey(r.id),snapshot);if(r!==record)return;r.snapshot=snapshot;r.status='synced';
 }catch(error){if(r===record)r.status=error?.status===401?'signin':'offline';}
 finally{r.working=false;if(r===record){notify();if(r.status==='synced'&&pending(r.id).length){clearTimeout(retryTimer);retryTimer=setTimeout(()=>void sync(r),400);}}}
}
function connect(id){if(initialized&&id===owner)return;initialized=true;owner=id||null;record={id:owner,snapshot:owner?read(cacheKey(owner)):null,working:false,status:owner?'saving':'guest'};notify();void sync();}
function saveAttempt(attempt,intendedOwner){const key=pendingPrefix(intendedOwner)+attempt.id,stored=write(key,attempt);if(!stored){memoryPending.set(key,attempt);if(intendedOwner===owner)record.status='storage';}if(intendedOwner===owner){notify();void sync();}return stored;}
function uuid(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();const a=crypto.getRandomValues(new Uint8Array(16));a[6]=a[6]&15|64;a[8]=a[8]&63|128;const h=[...a].map(n=>n.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
export const quizRecords={connect,get accountId(){return owner;},get status(){return record.status;},get data(){return mergeQuizSnapshot(record.snapshot,pending(owner));},subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},retry:()=>sync(),
 best(context){return this.data.bests.find(a=>quizChallengeKey(a)===quizChallengeKey(context));},
 async more(){const r=record,cursor=r.snapshot?.nextCursor;if(!r.id||!cursor||r.working)return;r.working=true;try{const page=await transport(r.id,'GET',null,cursor);if(r!==record)return;const all=new Map([...r.snapshot.recent,...page.recent].map(a=>[a.id,a]));r.snapshot={...r.snapshot,recent:[...all.values()],nextCursor:page.nextCursor};write(cacheKey(r.id),r.snapshot);r.status='synced';}catch{if(r===record)r.status='offline';}finally{r.working=false;if(r===record)notify();}},
 begin(context,initialElapsed=0){const intendedOwner=owner,id=uuid(),timer=createQuizTimer(undefined,initialElapsed);let finished=false;return{owner:intendedOwner,timer,finish(score){if(finished)return;finished=true;timer.stop();const attempt={...context,...score,id,elapsedMs:Number.isSafeInteger(score.elapsedMs)?score.elapsedMs:timer.elapsed,finishedAt:new Date().toISOString()};saveAttempt(attempt,intendedOwner);return attempt;}};}
};
globalThis.addEventListener?.('atlas-account-change',e=>connect(e.detail.userId));
globalThis.addEventListener?.('online',()=>void sync());globalThis.addEventListener?.('focus',()=>void sync());
globalThis.addEventListener?.('storage',e=>{if(e.key===cacheKey(owner)||e.key?.startsWith(pendingPrefix(owner))){if(owner)record.snapshot=read(cacheKey(owner));notify();clearTimeout(retryTimer);retryTimer=setTimeout(()=>void sync(),400);}});
