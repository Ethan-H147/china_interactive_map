import assert from 'node:assert/strict';
const points=[[116.982,40.033],[116.891,39.836],[116.938,39.794],[116.914,39.774],[116.804,39.604],[117.182,40.077]];
export default [false,true].map(mobile=>({name:'Langfang exclave shared borders and fills '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:900,mobile},async run(p,base){
 await p.open(base,'#china');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");
 await p.evaluate('void map.jumpTo({center:[116.98,39.86],zoom:9.8})');await p.settle();
 for(const point of points){
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:12})');await p.settle();
  const hits=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures(q,{layers:["province-fill"]}).length})()');
  assert(hits>0,'Previously empty border area is filled: '+point);
 }
 await p.evaluate('void map.jumpTo({center:[116.99,39.86],zoom:9.8})');await p.settle();await p.screenshot('langfang-border-'+(mobile?'phone':'desktop'));
 await p.evaluate('selectRegion(regionByCode.get(131000),130000,true)');await p.settle();
 assert.equal(await p.evaluate('document.getElementById("population-total").textContent'),'5,465,087','Existing Langfang population is retained');
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
}}));
