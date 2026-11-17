import assert from 'node:assert/strict';
// Inspect the actual native workers: history must not construct a GeoJSON index.
export async function workerIndexes(page){
 const socket=new WebSocket(page.debuggingEndpoint),pending=new Map(),sessions=[];let id=0;
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Target.attachedToTarget')sessions.push({id:m.params.sessionId,...m.params.targetInfo});};
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 const send=(method,params={},sessionId)=>new Promise(resolve=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);resolve(null);},4000);pending.set(n,m=>{clearTimeout(timer);resolve(m.result);});socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 try{
  const targets=await send('Target.getTargets');for(const t of targets.targetInfos.filter(t=>t.type==='page')){const a=await send('Target.attachToTarget',{targetId:t.targetId,flatten:true});if(a?.sessionId)await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true},a.sessionId);}
  await new Promise(r=>setTimeout(r,150));const indexes=[];
  for(const s of sessions.filter(s=>s.type==='worker'&&s.url.includes('maplibre-gl-worker'))){
   const result=await send('Runtime.evaluate',{expression:`(()=>{const result=[];for(const types of Object.values(self.worker.workerSources))for(const [type,sources]of Object.entries(types))for(const [name,source]of Object.entries(sources)){if(name!=='united-kingdom-first'&&!name.startsWith('united-kingdom-history'))continue;result.push({name,type,geoJSONIndex:!!source._geoJSONIndex});}return result;})()`,returnByValue:true},s.id);
   indexes.push(...(result?.result?.value||[]));
  }
  assert(indexes.length,'Native historical worker sources were inspected');assert(indexes.some(i=>i.type==='vector'));assert(indexes.every(i=>!i.geoJSONIndex),'No runtime historical GeoJSON index');return indexes;
 }finally{socket.close();}
}
async function enter(p,base){await p.open(base,'#united-kingdom');await p.evaluate('document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-kingdom-first")?.type==="vector"');await p.settle();}
export default [
 {name:'UK native history keeps one source through rapid worldwide views and releases it on exit',options:{width:1280,height:900},async run(p,base){
  await enter(p,base);await p.evaluate('void(window.nativeHistory=map.getSource("united-kingdom-first"))');
  for(const [center,zoom,year]of [[[-71.8,41.3],9,1775],[[151.235,-33.865],12,1851],[[174.75,-36.85],13,1841],[[-63.5,45.5],9,1763],[[-71.8,41.3],9,1775]])await p.evaluate('document.querySelector('+JSON.stringify('#united-kingdom-history-dock [data-year="'+year+'"]')+').click();void map.jumpTo('+JSON.stringify({center,zoom})+')');
  await p.settle();assert(await p.evaluate('nativeHistory===map.getSource("united-kingdom-first")'));assert(await p.evaluate('Object.entries(map.style.tileManagers).filter(([id])=>id==="united-kingdom-first").every(([,manager])=>manager._maxTileCacheSize<=48&&manager._outOfViewCache.order.length<=48)'));
  await workerIndexes(p);await p.evaluate('document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-kingdom-first")?.type==="geojson"');await p.settle();assert(await p.evaluate('!!map.getSource("united-kingdom-first-edges")&&!!map.getSource("united-kingdom-first-outlines")'));
 }},
 {name:'Leaving with historical tiles in flight restores the modern map and supports reentry',options:{width:1280,height:900},async run(p,base){
  await enter(p,base);await p.evaluate('map.jumpTo({center:[151.235,-33.865],zoom:13});document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-kingdom-first")?.type==="geojson"');await p.settle();
  await p.evaluate('document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-kingdom-first")?.type==="vector"');await p.evaluate('document.querySelector(\'#united-kingdom-history-dock [data-year="1775"]\').click();void map.jumpTo({center:[-71.1,42.3],zoom:8})');await p.settle();assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([-71.1,42.3]))?.en'),'Thirteen Colonies');assert(await p.evaluate('mapScene.assertOrder()'));
 }}
];
