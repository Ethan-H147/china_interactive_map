import fs from 'node:fs';
import {launch,startServer} from './harness.mjs';
const server=await startServer(),page=await launch({width:1366,height:1024,mobile:true}),rows=[];
try{
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify({quality:'performance',diagnostics:true}));localStorage.setItem('boundary-atlas-globe-v1','true');"});
 await page.open(server.url,'#china');if(await page.evaluate('map.getProjection().type')!=='globe')await page.tap('#globe-view');await page.settle();await page.send('Performance.enable');
 console.log(JSON.stringify(await page.evaluate('import("./context-visibility.mjs").then(c=>({debug:true,center:map.getCenter().toArray(),pitch:map.getPitch(),zoom:map.getZoom(),peruFile:c.sourceFile(map,"peru-portal"),peruBehind:c.behindGlobe("europe/peru/context.bin",map.getCenter()),peruVisibility:map.getLayoutProperty("peru-portal-fill","visibility"),culling:mapScene.cullingStats()}))')));
 await page.evaluate(`(()=>{
  window.layerProfile={};window.profileFrames=0;let active;
  const painter=map.painter,renderLayer=painter.renderLayer,gl=painter.context.gl;
  painter.renderLayer=function(...args){const previous=active,id=args[2].id;active=layerProfile[id]??={calls:0,indices:0,cpu:0};const start=performance.now();try{return renderLayer.apply(this,args);}finally{active.cpu+=performance.now()-start;active=previous;}};
  for(const [method,count]of [['drawElements',1],['drawArrays',2],['drawElementsInstanced',1],['drawArraysInstanced',2]])if(gl[method]){const original=gl[method].bind(gl);gl[method]=(...args)=>{if(active){active.calls++;active.indices+=args[count]*(method.endsWith('Instanced')?args.at(-1):1);}return original(...args);};}
  map.on('render',()=>profileFrames++);
 })()`);
 const baseline=await page.evaluate('map.getStyle().layers.map(l=>({id:l.id,visibility:mapScene.baseLayer(l).layout.visibility,role:mapScene.role(l.id),type:l.type,international:!!l.metadata?.atlasInternationalBorder}))');
 for(const group of ['baseline','horizon','both','baseline','both']){
  await page.evaluate(`(()=>{mapScene.setHorizonCulling(${group!=='baseline'});mapScene.setSelectionCulling(${group==='both'});for(const l of ${JSON.stringify(baseline)})map.setLayoutProperty(l.id,'visibility',l.visibility);map.jumpTo({center:[105,36],zoom:3.3});})()`);await page.settle();
  await page.evaluate('layerProfile={};profileFrames=0');const before=(await page.send('Performance.getMetrics')).metrics;
  await page.drag('#map',{dx:160,dy:20},{steps:80,duration:1600});await page.settle();
  const after=(await page.send('Performance.getMetrics')).metrics,taskMs=Math.round(1000*(after.find(x=>x.name==='TaskDuration').value-before.find(x=>x.name==='TaskDuration').value));
  const row={group,taskMs,...await page.evaluate('({frames:profileFrames,layers:layerProfile,gesture:AtlasPerformanceController.snapshot().lastGesture,culling:mapScene.cullingStats(),projection:map.getProjection().type,center:map.getCenter().toArray(),zoom:map.getZoom()})')};row.indicesPerFrame=Math.round(Object.values(row.layers).reduce((sum,l)=>sum+l.indices,0)/row.frames);row.callsPerFrame=Math.round(Object.values(row.layers).reduce((sum,l)=>sum+l.calls,0)/row.frames);rows.push(row);
  console.log(JSON.stringify({...row,layers:Object.entries(row.layers).sort((a,b)=>b[1].cpu-a[1].cpu).slice(0,12).map(([id,v])=>({id,callsPerFrame:+(v.calls/row.frames).toFixed(1),indicesPerFrame:Math.round(v.indices/row.frames),cpuPerFrame:+(v.cpu/row.frames).toFixed(2)}))}));
 }
 fs.mkdirSync('artifacts/tablet-performance',{recursive:true});fs.writeFileSync('artifacts/tablet-performance/render-work.json',JSON.stringify({environment:'Desktop Chrome; CPU submission and GL indices, not GPU timing or iPad FPS',rows},null,2));
 if(page.problems.length||page.failures.length)throw Error([...page.problems,...page.failures].join('\n'));
}finally{await page.close();await server.close();}
