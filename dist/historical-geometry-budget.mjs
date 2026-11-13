import {overlaps,changedScopes} from './context-visibility.mjs';
// One disposable geometry worker per historical map. Replaced requests are
// terminated, not merely ignored after allocating their geometry. The normal
// overview remains available when detail exceeds a budget or a worker fails.
export function createHistoricalGeometryBudget({makeWorker=()=>new Worker(new URL('./country-boundary-worker.mjs',import.meta.url),{type:'module'}),timeoutMs=25000,maxBytes=24*1024*1024,maxPoints=400000}={}){
 const queued=new Map();let running=null;
 const stats={started:0,completed:0,cancelled:0,failed:0,peakActive:0,largestBytes:0};
 const aborted=()=>new DOMException('Historical geometry superseded','AbortError');
 function finish(job,error,blob){
  if(job.done)return;job.done=true;clearTimeout(job.timer);job.signal?.removeEventListener('abort',job.abort);
  if(job.worker){job.worker.onmessage=job.worker.onerror=job.worker.onmessageerror=null;job.worker.terminate();job.worker=null;}
  if(running===job)running=null;if(queued.get(job.key)===job)queued.delete(job.key);
  if(error)job.reject(error);else job.resolve(blob);queueMicrotask(next);
 }
 function cancel(key,expected){const job=running?.key===key?running:queued.get(key);if(!job||expected&&job!==expected)return;stats.cancelled++;finish(job,aborted());}
 function next(){
  if(running||!queued.size)return;
  const job=queued.values().next().value;queued.delete(job.key);running=job;
  if(job.signal?.aborted){cancel(job.key);return;}
  stats.started++;stats.peakActive=Math.max(stats.peakActive,1);
  const fail=error=>{stats.failed++;finish(job,error instanceof Error?error:Error(String(error)));};
  try{
   job.worker=makeWorker();job.timer=setTimeout(()=>fail(Error('Historical geometry exceeded its time budget')),timeoutMs);
   job.worker.onerror=event=>{event.preventDefault?.();fail(Error(event.message||'Historical geometry worker stopped'));};
   job.worker.onmessageerror=()=>fail(Error('Historical geometry could not be transferred'));
   job.worker.onmessage=({data})=>{
    if(data.error)return fail(Error(data.error));
    if(!(data.blob instanceof Blob)||data.blob.size>maxBytes)return fail(Error('Historical detail exceeded its memory budget'));
    if(data.picking)Object.defineProperty(data.blob,'picking',{value:data.picking});
    stats.completed++;stats.largestBytes=Math.max(stats.largestBytes,data.blob.size);finish(job,null,data.blob);
   };
   job.worker.postMessage({operation:'historical-geometry',url:job.url,maxBytes,maxPoints});
  }catch(error){fail(error);}
 }
 return {
  run(key,url,{signal}={}){
   cancel(key);
   if(signal?.aborted)return Promise.reject(aborted());
   return new Promise((resolve,reject)=>{const job={key,url,signal,resolve,reject};job.abort=()=>cancel(key,job);signal?.addEventListener('abort',job.abort,{once:true});queued.set(key,job);next();});
  },
  cancel,
  clear(){for(const key of [...queued.keys()])cancel(key);if(running)cancel(running.key);},
  snapshot(){return {...stats,active:running?1:0,queued:queued.size,maxBytes,maxPoints,timeoutMs};}
 };
}

// MapLibre 6.11 retains past zoom tiles per source. A historical atlas has many
// dense sources, so its viewport-based default can cache hundreds of large GPU
// and worker tiles. Bound only out-of-view tiles; visible detail is unchanged.
export function createHistoricalTileBudget(map,prefix){
 const saved=new Map();let active=false,syncing=false;
 function sync(){
  if(!active||syncing)return;syncing=true;
  try{
   const managers=map.style?.tileManagers||{};
   for(const [id,entry]of saved)if(managers[id]!==entry.manager)saved.delete(id);
   for(const [id,manager]of Object.entries(managers)){
    if(!manager._outOfViewCache?.setMaxSize)continue;
    if(!saved.has(id)){
     const entry={manager,limit:manager._maxTileCacheSize};saved.set(id,entry);
     if(id===prefix+'-faces'&&typeof manager._dataHandler==='function'){
      entry.handler=manager._dataHandler;
      entry.wrapper=manager._dataHandler=function(event){
       const content=event.sourceDataType==='content',changes=content&&entry.changes;if(content)entry.changes=null;
       const cache=this._outOfViewCache,reset=cache.reset;
       // Only scope extensions in the same snapshot preserve GPU tiles.
       // Style reloads and year/source removal keep native invalidation.
       if(changes&&typeof cache.filter==='function')cache.reset=function(){return this.filter(tile=>{
        const c=tile.tileID?.canonical;if(!c)return false;
        const n=2**c.z,pad=.25,lat=y=>180/Math.PI*Math.atan(Math.sinh(Math.PI*(1-2*y/n)));
        const bounds=[(c.x-pad)/n*360-180,lat(c.y+1+pad),(c.x+1+pad)/n*360-180,lat(c.y-pad)];
        return !changes.some(scope=>overlaps(scope,bounds));
       });};
       try{return entry.handler.call(this,event);}finally{cache.reset=reset;}
      };
     }
    }
    // Keep the overview's normal tile allowance so a whole-country return
    // can reuse its triangulation. Dense coast/detail sources stay at four.
    const before=saved.get(id).limit,limit=id===prefix+'-faces'?32:id.startsWith(prefix)?4:8;
    manager._maxTileCacheSize=Math.min(before??Infinity,limit);
    manager._outOfViewCache.setMaxSize(manager._maxTileCacheSize);
   }
  }finally{syncing=false;}
 }
 return {
  start(){if(active)return;active=true;map.on('styledata',sync);sync();},
  preserve(before,after){sync();const entry=saved.get(prefix+'-faces');if(entry)entry.changes=before?changedScopes(before,after):null;},
  stop(){if(!active)return;active=false;map.off('styledata',sync);for(const [id,{manager,limit}]of saved)if(map.style?.tileManagers?.[id]===manager){manager._maxTileCacheSize=limit;const entry=saved.get(id);if(entry?.wrapper===manager._dataHandler)manager._dataHandler=entry.handler;const transform=manager.transform||map._camera?.transform||map.transform;if(transform)manager.updateCacheSize?.(transform);}saved.clear();},
  snapshot(){return {active,sources:saved.size,maxHistoryCachedTiles:32,maxHistoryDetailCachedTiles:4,maxOtherCachedTiles:8};}
 };
}
