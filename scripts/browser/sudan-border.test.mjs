import assert from 'node:assert/strict';
export default [{name:'Northern and North Darfur border reaches the western state junction',options:{width:1300,height:900},async run(p,base){
 await p.open(base,'#sudan');await p.evaluate('void map.jumpTo({center:[28.5,19],zoom:6.2})');await p.settle();
 const hits=await p.evaluate('(()=>{const q=map.project([26.249574,20.014434]);return map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:["sudan-first-lines"]}).map(f=>f.properties.owners)})()');
 assert(hits.some(value=>{const owners=typeof value==='string'?JSON.parse(value):value;return owners.includes("SD17")&&owners.includes("SD02");}),'The formerly missing horizontal state border renders');
 await p.evaluate('currentAtlas().restore("SD13")');await p.settle();await p.evaluate('void map.jumpTo({center:[28.5,19],zoom:6.2})');await p.settle();
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),'SD13');assert(await p.evaluate('mapScene.assertOrder()'));
 await p.screenshot('sudan-northern-border-fixed');
 }}];
