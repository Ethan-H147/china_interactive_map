import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
// Local detail loads on its own after the camera stops. Finish it before measuring hover.
async function settleDetails(p,country){
 if(!['indonesia','philippines'].includes(country))return;
 const expected=await p.evaluate(`(async()=>{const {chooseChunks}=await import('./boundary-budget.mjs'),{loadCompressed}=await import('./korea-data.mjs'),catalogue=await loadCompressed('data/archipelago/${country}-catalogue.bin'),b=map.getBounds(),c=map.getCenter();return chooseChunks(catalogue.records,[[b.getWest(),b.getSouth()],[b.getEast(),b.getNorth()]],[c.lng,c.lat],{limit:3});})()`);
 const prefix=country==='indonesia'?'id':'ph';
 await p.waitFor(
  JSON.stringify(expected.map(id=>country+'-'+id).flatMap(key=>[key+'-first',key+'-second']))+
  '.every(id=>map.getSource(id)&&map.isSourceLoaded(id))&&document.getElementById('+JSON.stringify(prefix+'-detail-status')+').hidden&&document.getElementById('+JSON.stringify(prefix+'-retry')+').hidden',
  {timeout:30000,label:country+' camera-triggered local detail complete'});
 await p.settle();
}
async function burst(p){return p.evaluate(`(async()=>{const query=map.queryRenderedFeatures.bind(map),style=map.getStyle.bind(map);let queries=0,styles=0;map.queryRenderedFeatures=(...args)=>{queries++;return query(...args)};map.getStyle=(...args)=>{styles++;return style(...args)};const canvas=map.getCanvas(),b=canvas.getBoundingClientRect();for(let i=0;i<120;i++){const opts={bubbles:true,clientX:b.left+40+(i%12)*(b.width-80)/12,clientY:b.top+110+Math.floor(i/12)*(b.height-170)/10};canvas.dispatchEvent(new PointerEvent('pointermove',{...opts,pointerType:'mouse'}));canvas.dispatchEvent(new MouseEvent('mousemove',opts));}const before=queries;await new Promise(requestAnimationFrame);map.queryRenderedFeatures=query;map.getStyle=style;return {before,queries,styles}})()`);}
export default [
 {name:'all renderer families sample pointer bursts without changing map detail or selection',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#canada');
  for(const [country,center]of [['canada',[-80,74]],['indonesia',[129.36,-3.32]],['philippines',[118.46,9.53]],['malaysia',[113.5,2.37]],['brazil',[-60,-4]],['argentina',[-58.4,-34.6]],['japan',[142.8,43.4]],['korea',[129.06,35.2]],['mongolia',[99.91,50.23]],['china',[104.07,30.67]]]){
   await p.evaluate('location.hash='+JSON.stringify('#'+country));await p.waitFor('AtlasEntry.current==='+JSON.stringify(country),{label:country+' route active'});await p.settle();await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:6})');await p.settle();await settleDetails(p,country);
   const sources=await p.evaluate('JSON.stringify(Object.keys(map.getStyle().sources).sort())'),selected=await p.evaluate('currentAtlas()?.getSelection?.()||null'),result=await burst(p);
   assert.equal(result.before,0,country+' hover never queries geometry on every raw event');assert(result.queries<=8,country+' queries are bounded by hover consumers, not pointer event count: '+JSON.stringify(result));
   assert.equal(await p.evaluate('JSON.stringify(Object.keys(map.getStyle().sources).sort())'),sources,'Hover never replaces or creates a geometry source');assert.equal(await p.evaluate('currentAtlas()?.getSelection?.()||null'),selected);
   assert((await p.evaluate('AtlasCountryMemory.snapshot().countries.length'))<=3);
  }
 }},
 {name:'shaded municipal hover avoids style copies and stale tooltips after leaving or panning',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#united-states');await searchAndSelect(p,'Cincinnati Ohio','Cincinnati','City');await p.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"');await p.settle();await p.evaluate('AtlasRegionColorController.setMetric("population");0');await p.settle();
  const selected=await p.evaluate('currentAtlas().getSelection()'),result=await burst(p);assert.equal(result.before,0);assert(result.queries<=4);assert.equal(result.styles,0,'Statistical hover uses cached layer profiles rather than serializing full styles');
  const hidden=await p.evaluate(`(async()=>{const canvas=map.getCanvas(),box=canvas.getBoundingClientRect();canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:box.left+box.width/2,clientY:box.top+box.height/2}));map.getContainer().dispatchEvent(new PointerEvent('pointerleave'));await new Promise(requestAnimationFrame);return document.getElementById('atlas-hover-overview').hidden})()`);assert(hidden,'A queued hover cannot resurrect a tooltip after leaving');
  await p.drag('#map',{dx:100,dy:40});await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),selected);await p.evaluate('AtlasRegionColorController.setMetric("none");0');await p.settle();await p.screenshot('map-performance-shaded-municipal-hover');
 }}
];
