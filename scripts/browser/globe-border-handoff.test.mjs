import assert from 'node:assert/strict';
import sharp from 'sharp';
const capture=async p=>{const url=await p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');return sharp(Buffer.from(url.split(',')[1],'base64')).ensureAlpha().raw().toBuffer();};
export default [1280,390].map(width=>({name:'Overview and detailed country borders never draw together '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-globe-v1','true');"});await p.open(base,'#finland');await p.waitFor('AtlasGlobeOverviewController.snapshot().ready');
 // The China/Mongolia border makes root-tile quantization clearly visible.
 await p.evaluate('void map.jumpTo({center:[114,44.5],zoom:6.25})');await p.settle();
 assert.equal(await p.evaluate('mapScene.overview'),false);
 const normal=await capture(p);
 await p.evaluate('map.setPaintProperty("globe-overview-borders","line-opacity",0);void 0');await p.settle();
 const hidden=await capture(p);let changed=0;
 for(let i=0;i<normal.length;i+=4)if([0,1,2].some(c=>Math.abs(normal[i+c]-hidden[i+c])>3))changed++;
 assert(changed<=8,'Detailed view must contain no second overview stroke; hiding it changed '+changed+' pixels');
 await p.evaluate('map.setPaintProperty("globe-overview-borders","line-opacity",1);void 0');
 for(const [zoom,overview] of [[4.3,true],[4.8,true],[5.2,true],[5.3,false],[6.4,false],[7.1,false],[6,false],[5.2,false],[4.8,false],[4.7,true],[5.2,true],[5.3,false]]){
  await p.evaluate('void map.jumpTo({center:[114,44.5],zoom:'+zoom+'})');await p.settle();
  const state=await p.evaluate('({overview:mapScene.overview,handoff:AtlasGlobeOverviewController.snapshot().borders,transition:map.getPaintProperty("globe-overview-borders","line-opacity-transition"),tiles:map.style.tileManagers["globe-overview-borders"].getRenderableIds().length})');
  assert.equal(state.overview,overview,'Earlier detail threshold retains hysteresis at zoom '+zoom);
  assert.equal(state.handoff.coarse,state.overview,'Only the active border representation draws after loading at zoom '+zoom);
  if(!state.overview){assert(state.handoff.detailedSources>0,'Detailed international borders return');assert.equal(state.handoff.pending.length,0,'All replacement border sources are ready');}
  assert.equal(state.transition.duration,0,'No crossfade can briefly draw both representations');assert(state.tiles>0,'Invisible border paint keeps the world tile prepared');
 }
 await p.evaluate('void map.jumpTo({center:[114,44.5],zoom:6.25})');await p.settle();await p.screenshot('single-country-borders-'+width);
}}));
