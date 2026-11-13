import assert from 'node:assert/strict';
const tap=async(p,point)=>p.tap(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+'),r=map.getCanvas().getBoundingClientRect();return [r.x+q.x,r.y+q.y]})()'));
export default [
 {country:'united-kingdom',target:'france',at:[2.35,48.86],center:[2,48],zoom:5},
 {country:'united-states',target:'mexico',at:[-99.13,19.43],center:[-99,20],zoom:5},
 {country:'china',target:'japan',at:[139.7,35.7],center:[138,36],zoom:5}
].map(entry=>({name:entry.country+' snapshot ignores gray country clicks and restores present-day navigation',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#'+entry.country);
 await p.evaluate('void document.getElementById("historical-snapshot").click()');
 const active=entry.country==='china'?'historyActive()':'currentAtlas().historicalActive';
 await p.waitFor(active);await p.settle();
 if(entry.country==='united-kingdom'){
  await p.evaluate('void map.jumpTo({center:[-1,52],zoom:6.2})');await p.settle();await tap(p,[-1,52]);
  await p.waitFor('document.querySelector("#gb-name").textContent==="England"');await p.settle();
  assert.equal(await p.evaluate('map.getLayer("united-kingdom-history-host-selected-fill").source'),await p.evaluate('map.getLayer("united-kingdom-first-fill").source'),'Home-nation selection reuses the modern land source');
  assert(await p.evaluate('(()=>{const q=map.project([-1,52]);return map.queryRenderedFeatures(q,{layers:["united-kingdom-history-host-selected-fill"]}).length>0})()'),'The reused host selection is visibly filled');
 }

 await p.evaluate('void map.jumpTo('+JSON.stringify({center:entry.center,zoom:entry.zoom})+')');await p.settle();
 const hit='countryAt(map.project('+JSON.stringify(entry.at)+'))?.country';
 assert.equal(await p.evaluate(hit),entry.target,'The click targets another ready country');
 await tap(p,entry.at);await p.settle();
 assert.equal(await p.evaluate('AtlasEntry.current'),entry.country,'Gray fill keeps the current country');
 assert(await p.evaluate(active),'Historical snapshot remains active');
 await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.settle();
 assert(!await p.evaluate(active),'Present day ends the snapshot');
 await p.evaluate('void map.jumpTo('+JSON.stringify({center:entry.center,zoom:entry.zoom})+')');await p.settle();
 assert.equal(await p.evaluate(hit),entry.target,'Present-day hit testing still resolves the other country');
 await tap(p,entry.at);await p.waitFor('AtlasEntry.current==='+JSON.stringify(entry.target));await p.settle();
 assert.equal(await p.evaluate('AtlasEntry.current'),entry.target,'Present-day country clicks still switch');
}}));
