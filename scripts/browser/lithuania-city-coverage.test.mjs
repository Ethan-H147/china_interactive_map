import assert from 'node:assert/strict';
export default [{name:'Lithuanian city holes have selectable cards and Baltic city dots are absent',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#lithuania');
 for(const [id,name,parent,point]of [['LT-CITY-29','Šiauliai (outside elderships)','LT-M-29',[23.316,55.934]],['LT-CITY-57','Kupiškis','LT-M-57',[24.979,55.842]],['LT-CITY-62','Molėtai','LT-M-62',[25.416,55.226]],['LT-CITY-12','Birštonas','LT-M-12',[24.031,54.603]],['LT-CITY-15','Druskininkai','LT-M-15',[23.987,54.018]]]){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(parent)+')');
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:12})');await p.settle();
  await p.waitFor('map.getLayer("lithuania-third-fill")&&map.queryRenderedFeatures(map.project('+JSON.stringify(point)+'),{layers:["lithuania-third-fill"]}).some(f=>f.properties.id==='+JSON.stringify(id)+')');
  const hit=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return currentAtlas().hoverAt(q)})()');assert.equal(hit.id,id);assert.notEqual(hit.kind,'Eldership');
  const xy=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+'),b=map.getCanvas().getBoundingClientRect();return [q.x+b.left,q.y+b.top]})()');
  await p.tap(xy);await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(id));await p.settle();
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);
  assert.equal(await p.evaluate('document.getElementById("lt-name").textContent'),name);
  assert(await p.evaluate('document.getElementById("lt-status").hidden'));
  if(id!=="LT-CITY-29")assert((await p.evaluate('document.querySelector("#lithuania-sidebar .population-total")?.textContent')),'City population card is visible');
 }
 await p.screenshot('lithuania-city-card');
 for(const country of ['lithuania','estonia']){
  await p.open(base,'#'+country);
  assert.equal(await p.evaluate('!!map.getLayer('+JSON.stringify(country+'-capitals')+')'),false);
  assert.equal(await p.evaluate('!!document.getElementById('+JSON.stringify((country==='estonia'?'ee':'lt')+'-capital-layer')+')'),false);
 }
}}];
