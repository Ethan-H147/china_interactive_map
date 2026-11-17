import assert from 'node:assert/strict';
export default [{name:'Upper Peninsula history keeps one tiled shoreline across dates and projections and restores modern sources',options:{width:1440,height:900},async run(p,base){
 await p.open(base,'#united-states');await p.evaluate('AtlasComfort.set({appearance:"light"})');await p.settle();
 const sources=await p.evaluate('Object.fromEntries(["united-states-first","united-states-first-edges","united-states-first-outlines"].map(id=>[id,map.getSource(id).serialize()]))');
 await p.evaluate('document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-states-first")?.type==="vector"');
 await p.evaluate('void(window.upHistorySource=map.getSource("united-states-first"))');
 for(const year of [1833,1840])for(const projection of ['mercator','globe'])for(const zoom of [3,7.9,9]){
  await p.evaluate('document.querySelector('+JSON.stringify('#united-states-history-dock [data-year="'+year+'"]')+').click();map.setProjection('+JSON.stringify({type:projection})+');void map.jumpTo('+JSON.stringify({center:[-85.5,46.25],zoom})+')');await p.settle();
  assert(await p.evaluate('map.getSource("united-states-first")===upHistorySource'));assert(await p.evaluate('!!currentAtlas().hoverAt(map.project([-85.5,46.25]))'));assert(!(await p.evaluate('map.getStyle().layers.some(l=>l.id.startsWith("united-states-history-region-"))')));assert(await p.evaluate('mapScene.assertOrder()'));
 }
 await p.screenshot('upper-peninsula-native-history');await p.evaluate('document.getElementById("historical-snapshot").click()');await p.settle();assert.deepEqual(await p.evaluate('Object.fromEntries(["united-states-first","united-states-first-edges","united-states-first-outlines"].map(id=>[id,map.getSource(id).serialize()]))'),sources);
}}];
