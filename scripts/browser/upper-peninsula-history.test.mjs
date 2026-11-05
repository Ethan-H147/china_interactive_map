import assert from 'node:assert/strict';
const prefix='united-states-history-region-',button='document.getElementById("historical-snapshot")';
export default [{name:'Upper Peninsula historical land uses one shoreline and one gray channel border, then restores modern filters',options:{width:1440,height:900},async run(p,base){
 await p.open(base,'#united-states');await p.settle();
 const original=await p.evaluate('JSON.stringify([map.getFilter("country-border-previews"),map.getFilter("globe-overview-borders")])');
 await p.evaluate('void '+button+'.click()');await p.waitFor('!!map.getLayer("'+prefix+'fill")',{timeout:30000});await p.settle();
 await p.evaluate('void document.querySelector(\'#united-states-history-dock [data-year="1833"]\').click();void map.jumpTo({center:[-84.13,46.27],zoom:9})');await p.settle();
 assert.equal(await p.evaluate('map.getLayoutProperty("'+prefix+'outer","visibility")'),'visible');
 assert.equal(await p.evaluate('map.getPaintProperty("'+prefix+'outer","line-color")'),'#aaa9a2');
 assert(await p.evaluate('JSON.stringify(map.getFilter("country-border-previews")).includes("USA-CAN-SHARED-LAND")'),'Precise false-coast fragments excluded');
 const before=await p.evaluate('map.getSource("'+prefix+'displayFaces").serialize().data');
 await p.screenshot('upper-peninsula-1833');
 for(const projection of ['mercator','globe']){await p.evaluate('void map.setProjection({type:"'+projection+'"})');await p.settle();assert.equal(await p.evaluate('map.getPaintProperty("'+prefix+'outer","line-color")'),'#aaa9a2');}
 await p.evaluate('void document.querySelector(\'#united-states-history-dock [data-year="1840"]\').click()');await p.settle();assert.equal(await p.evaluate('map.getSource("'+prefix+'displayFaces").serialize().data'),before,'Date change reuses geometry');
 await p.evaluate('void map.jumpTo({center:[-96,44],zoom:3})');await p.settle();assert.equal(await p.evaluate('map.getLayoutProperty("'+prefix+'coarse","visibility")'),'visible');
 await p.evaluate('void '+button+'.click()');await p.settle();assert.equal(await p.evaluate('JSON.stringify([map.getFilter("country-border-previews"),map.getFilter("globe-overview-borders")])'),original,'Normal border filters restored');
 assert(await p.evaluate('!map.getStyle().layers.some(l=>l.id.startsWith("'+prefix+'"))&&!Object.keys(map.getStyle().sources).some(id=>id.startsWith("'+prefix+'"))'),'Every regional layer and source leaves');
}}];
