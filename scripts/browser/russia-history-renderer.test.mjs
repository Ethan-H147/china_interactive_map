import assert from 'node:assert/strict';
import {siberianPixelProbes,beginPixels,endPixels} from './russia-render-helpers.mjs';

async function open(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify({quality:'full'}));"});
 await p.open(base,'#russia/history=1914');await p.waitFor('currentAtlas().historicalYear===1914&&map.getSource("russia-first")?.type==="vector"&&mapScene.snapshot.id==="russia"');await p.settle();
 await p.evaluate('AtlasComfort.set({appearance:"light"});window.historicalRenderErrors=[];map.on("error",e=>historicalRenderErrors.push(e.error?.message||String(e.error)));void currentAtlas().restore("","history")');await p.settle();
}
const invariant=p=>p.evaluate('({layers:map.getStyle().layers.map(l=>l.id).sort(),source:map.getSource("russia-first").serialize().tiles,projection:map.getProjection().type})');
export default [
 ...[{width:1440,height:950},{width:390,height:844,mobile:true}].map(options=>({
  name:'actual globe pixels remain filled across Siberia, rotations, horizon and zoom reversals '+options.width,options,
  async run(p,base){
   await open(p,base);const before=await invariant(p),probes=await siberianPixelProbes();assert(probes.length>80);
   for(const center of [[95,60],[145,61],[179,65],[-174,65]]){
    await p.evaluate(`map.setProjection({type:'globe'});void map.jumpTo({center:${JSON.stringify(center)},zoom:2.4,bearing:35,padding:{top:0,bottom:0,left:0,right:0}})`);await p.settle();
    await beginPixels(p,probes);await p.evaluate('map.triggerRepaint()');await p.settle();const pixels=await endPixels(p);assert(pixels.points>(options.mobile?4:10),JSON.stringify(pixels));assert.equal(pixels.bad,0,'Globe fill '+center+' '+JSON.stringify(pixels));
   }
   await p.screenshot('russia-vector-globe-dateline-'+options.width);
   await p.evaluate('void map.jumpTo({center:[110,60],zoom:2.7,bearing:0,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
   await beginPixels(p,probes.filter((_,i)=>i%2===0));
   for(const camera of [{center:[145,64],zoom:3.1,bearing:75},{center:[175,65],zoom:3.8,bearing:140},{center:[-173,63],zoom:4.1,bearing:210},{center:[145,61],zoom:3.7,bearing:280},{center:[105,60],zoom:5.3,bearing:355},{center:[100,61],zoom:4.7,bearing:15},{center:[110,60],zoom:2.6,bearing:0}]){
    await p.evaluate(`void map.easeTo({...${JSON.stringify(camera)},duration:800,essential:true})`);await p.waitFor('!map.isMoving()');
   }
   await p.settle();const moving=await endPixels(p);assert(moving.frames>30);assert(moving.points>300);assert.equal(moving.bad,0,'Pixels during movement '+JSON.stringify(moving));
   const after=await invariant(p);assert.deepEqual(after.layers,before.layers,'No added map layers');assert.deepEqual(after.source,before.source,'One immutable tile source at every zoom');assert.deepEqual(await p.evaluate('historicalRenderErrors'),[]);
   await p.screenshot('russia-vector-globe-siberia-'+options.width);
  }
 })),
 {name:'selected empire has complete pixels and borders at the same globe camera',options:{width:1440,height:950},async run(p,base){
  await open(p,base);await p.evaluate('currentAtlas().restore("main","history");void map.jumpTo({center:[110,59],zoom:2.7,bearing:25,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
  const probes=(await siberianPixelProbes()).map(p=>({...p,color:[143,175,224]}));await beginPixels(p,probes);await p.evaluate('map.triggerRepaint()');await p.settle();const pixels=await endPixels(p);assert(pixels.points>60);assert.equal(pixels.bad,0,JSON.stringify(pixels));
  assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([100,60])).en'),'Russian Empire');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'main');assert.deepEqual(await p.evaluate('historicalRenderErrors'),[]);await p.screenshot('russia-vector-selected-empire');
 }},
 {name:'neutral western Poland remains land outside the historical footprint at every zoom',options:{width:1280,height:900},async run(p,base){
  await open(p,base);const layers=await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()');
  for(const zoom of [3,6.5,9]){
   await p.evaluate(`void map.jumpTo({center:[16.5,52.4],zoom:${zoom},bearing:0,padding:{top:0,bottom:0,left:0,right:0}})`);await p.settle();
   await beginPixels(p,[{lng:16.5,lat:52.4,color:[215,215,211]}]);await p.evaluate('map.triggerRepaint()');await p.settle();const pixels=await endPixels(p);assert(pixels.points>0);assert.equal(pixels.bad,0,JSON.stringify(pixels));
  }
  assert.deepEqual(await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()'),layers);assert(!await p.evaluate('mapScene.snapshot.replaceContexts.includes("poland")'));
 }},
 {name:'cancelled entry, rapid dates, graphics restoration and repeated modern re-entry',options:{width:1280,height:900},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});await p.open(base,'#russia');
  const before=await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()');
  await p.send('Network.emulateNetworkConditions',{offline:false,latency:200,downloadThroughput:131072,uploadThroughput:131072});
  await p.evaluate('document.getElementById("historical-snapshot").click();setTimeout(()=>document.getElementById("historical-snapshot").click(),30);void 0');
  await p.waitFor('!currentAtlas().historicalActive&&map.getSource("russia-first")?.type==="geojson"');
  await p.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await p.settle();
  for(let cycle=0;cycle<3;cycle++){
   await p.tap('#historical-snapshot');await p.waitFor('map.getSource("russia-first")?.type==="vector"&&mapScene.snapshot.id==="russia"');await p.settle();
   await p.evaluate('void(window.reusedHistoryVector=map.getSource("russia-first"))');
   await p.evaluate('Promise.all([882,1860,1988,1905,1991,1914].map(y=>currentAtlas().setHistoryYear(y))).then(()=>true)');await p.waitFor('currentAtlas().historicalYear===1914');await p.settle();assert(await p.evaluate('map.getSource("russia-first")===reusedHistoryVector'));
   if(cycle===1){await p.evaluate('new Promise(resolve=>{const extension=map.painter.context.gl.getExtension("WEBGL_lose_context");map.once("webglcontextrestored",()=>resolve(true));map.once("webglcontextlost",()=>setTimeout(()=>extension.restoreContext(),100));extension.loseContext();})');await p.settle();}
   await p.evaluate('AtlasComfort.set({appearance:"light"});void currentAtlas().restore("","history");void map.jumpTo({center:[110,60],zoom:2.7,bearing:35,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
   await beginPixels(p,await siberianPixelProbes());await p.evaluate('map.triggerRepaint()');await p.settle();const pixels=await endPixels(p);assert(pixels.points>40);assert.equal(pixels.bad,0,JSON.stringify(pixels));
   await p.tap('#historical-snapshot');await p.settle();assert.equal(await p.evaluate('map.getSource("russia-first").type'),'geojson');assert(await p.evaluate('!!map.getSource("russia-first-edges")&&!!map.getSource("russia-first-outlines")'));assert.deepEqual(await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("russia-")).map(l=>l.id).sort()'),before);assert(await p.evaluate('mapScene.assertOrder()'));
  }
 }}
];
