import assert from 'node:assert/strict';
const prefix='united-kingdom-history';
export async function workerIndexes(page){
 const socket=new WebSocket(page.debuggingEndpoint),pending=new Map(),sessions=[];let id=0;
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){pending.get(message.id)?.(message);pending.delete(message.id);}if(message.method==='Target.attachedToTarget')sessions.push({id:message.params.sessionId,type:message.params.targetInfo.type,url:message.params.targetInfo.url});};
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const send=(method,params={},sessionId)=>new Promise(resolve=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);resolve(null);},4000);pending.set(n,message=>{clearTimeout(timer);resolve(message.result);});socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 try{
  const targets=await send('Target.getTargets');for(const target of targets.targetInfos.filter(t=>t.type==='page')){const attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});if(attached?.sessionId)await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},attached.sessionId);}
  await new Promise(resolve=>setTimeout(resolve,150));const indexes=[];
  for(const session of sessions.filter(s=>s.type==='worker'&&s.url.includes('maplibre-gl-worker'))){
   const heap=await send('Runtime.getHeapUsage',{},session.id);if(heap)console.log('Map worker heap (MB):',Math.round(heap.usedSize/1048576),'backing:',Math.round((heap.backingStorageSize||0)/1048576));
   const result=await send('Runtime.evaluate',{expression:'(()=>{const indexes=[];for(const types of Object.values(self.worker.workerSources))for(const [name,source]of Object.entries(types.geojson||{})){if(!name.startsWith("united-kingdom-history"))continue;const index=source._geoJSONIndex;if(index?.tileIndex?.tiles?.[0]?.numPoints)indexes.push({name,tiles:Object.keys(index.tileIndex.tiles).length,budget:index._atlasHistoricalTileBudget?.()});}return indexes;})()',returnByValue:true},session.id);
   indexes.push(...(result?.result?.value||[]));
  }
  assert(indexes.length,'Actual MapLibre worker indexes were inspected');for(const index of indexes){assert(index.budget,index.name+' has the worker-side cache guard');assert(index.budget.baseTiles<=85);assert(index.tiles<=index.budget.baseTiles+24);assert(index.budget.points<=index.budget.maxPoints);}
  return indexes;
 }finally{socket.close();}
}

async function enter(p,base){await p.open(base,'#united-kingdom');await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.waitFor('!!map.getLayer("'+prefix+'-fill")');await p.settle();}
const detail='map.getLayer("'+prefix+'-coast-detail")&&map.getPaintProperty("'+prefix+'-coast-detail","fill-opacity")===1';
export default [{name:'UK history bounds rapid detail jobs and releases them on exit',options:{width:1280,height:900},async run(p,base){
 await enter(p,base);
 for(const [center,zoom,year]of [[[-71.8,41.3],9,1775],[[151.235,-33.865],12,1851],[[174.75,-36.85],13,1841],[[-63.5,45.5],9,1763],[[-71.8,41.3],9,1775]]){
  await p.evaluate('void document.querySelector('+JSON.stringify('#'+prefix+'-dock [data-year="'+year+'"]')+').click();void map.jumpTo('+JSON.stringify({center,zoom})+')');await new Promise(r=>setTimeout(r,120));
 }
 await p.waitFor(detail,{timeout:60000});await p.settle();
 const memory=await p.evaluate('currentAtlas().historicalMemory');assert.equal(memory.peakActive,1);assert.equal(memory.tiles.active,true);
 assert(await p.evaluate('Object.entries(map.style.tileManagers).filter(([id])=>id.startsWith("'+prefix+'")).every(([id,manager])=>{const cap=id==="'+prefix+'-faces"?32:4;return manager._maxTileCacheSize<=cap&&manager._outOfViewCache.order.length<=cap;})'),'Historical offscreen tile caches stay within their cap');assert(memory.cancelled>0);assert(memory.largestBytes<=memory.maxBytes);assert(memory.active+memory.queued<=2);
 const indexes=await workerIndexes(p);console.log('Bounded worker indexes:',indexes.map(index=>index.name+': '+index.tiles+' tiles').join(', '));
 await p.evaluate('void map.jumpTo({center:[151.235,-33.865],zoom:12})');await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.settle();
 assert.equal(await p.evaluate('Object.keys(map.getStyle().sources).filter(id=>id.startsWith("'+prefix+'")).length'),0);assert.equal(await p.evaluate('currentAtlas().historicalMemory.active+currentAtlas().historicalMemory.queued'),0);
 await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.waitFor('!!map.getLayer("'+prefix+'-fill")');await p.evaluate('void map.jumpTo({center:[-71.8,41.3],zoom:9})');await p.waitFor(detail,{timeout:60000});await p.settle();assert(await p.evaluate('mapScene.assertOrder()'));
}}, {name:'A failed historical worker leaves the overview usable and retries on a new view',options:{width:1280,height:900},async run(p,base){
 await enter(p,base);
 await p.evaluate('(()=>{const Original=Worker;window.Worker=class extends Original{postMessage(data,...rest){if(data.operation==="historical-geometry"&&!window.__historyFailureInjected){window.__historyFailureInjected=true;queueMicrotask(()=>this.dispatchEvent(new ErrorEvent("error",{message:"Injected historical worker failure",cancelable:true})));return;}return super.postMessage(data,...rest);}};})()');
 await p.evaluate('void map.jumpTo({center:[-71.8,41.3],zoom:8})');await p.waitFor('currentAtlas().historicalMemory.failed>0');await p.settle();
 assert(await p.evaluate('!!map.getLayer("'+prefix+'-fill")'));assert(!await p.evaluate('!!map.getSource("'+prefix+'-coast-detail")'));assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([-71.1,42.3]))?.en'),'British American colonies');
 await p.evaluate('void map.jumpTo({center:[-71.8,41.3],zoom:9})');await p.waitFor(detail,{timeout:60000});await p.settle();assert.equal(await p.evaluate('currentAtlas().historicalMemory.peakActive'),1);await p.screenshot('uk-history-memory-worker-recovered');
}}];
