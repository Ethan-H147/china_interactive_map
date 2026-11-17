import assert from 'node:assert/strict';
export default [{name:'UK estuaries omit inferred channels and retain land borders',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-kingdom');
 await p.evaluate('currentAtlas().restore("GB-C-E10000029").then(()=>true)');
 await p.evaluate('void map.jumpTo({center:[1.22,51.96],zoom:11})');
 await p.settle();
 for(const level of ['first','second','third']){
  const result=await p.evaluate(`(()=>{const features=map.querySourceFeatures('united-kingdom-${level}-edges');return {count:features.length,channels:features.filter(f=>f.properties.channel).length};})()`);
  assert.equal(result.channels,0,level+' has no inferred lines over water');
  if(level==='third')assert(result.count>0,'Suffolk district boundaries on land remain');
 }
 assert(await p.evaluate('map.queryRenderedFeatures({layers:["united-kingdom-second-selected"]}).length>0'),'Selected Suffolk outline remains');
 assert(await p.evaluate('mapScene.assertOrder()'));
 await p.screenshot('uk-water-boundaries');
}}];
