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
 for(const [id,center,water] of [
  ['GB-C-E10000029',[1.5427,52.1581],null],
  ['GB-C-E10000017',[-3.0002,53.9029],null],
  ['GB-R-TLI',[-.1217,51.5009],null],
  ['GB-R-TLH',[1.729127,52.586987],[1.703,52.61]],
  ['GB-C-E06000066',[-3.030278,51.1662935],null],
  ['GB-C-S12000017',[-4.4605255,57.4799625],null]
 ]){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:9.5})');
  await p.settle();
  const filled=point=>p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(point)+')).some(f=>f.layer.id==="united-kingdom-first-fill")');
  assert(await filled(center),id+' tidal river reach is land');
  if(water)assert(!await filled(water),'Breydon Water remains open');
 }
 await p.evaluate('currentAtlas().restore("GB-R-TLH").then(()=>true)');
 for(const zoom of [8,10,12]){
  await p.evaluate('void map.jumpTo({center:[-.082825,52.583018],zoom:'+zoom+'})');
  await p.settle();
  const fullyVisible=await p.evaluate(`(()=>{
   const point=map.project([-.082825,52.583018]);
   const area=[[point.x-2,point.y-2],[point.x+2,point.y+2]];
   return map.queryRenderedFeatures(area,{layers:['united-kingdom-second-lines']}).some(f=>
    String(f.properties.owners).includes('GB-C-E06000031') && String(f.properties.owners).includes('GB-C-E10000003') && f.properties.visibleZoom+1.42<=map.getZoom());
  })()`);
  assert(fullyVisible,'Peterborough–Cambridgeshire boundary stays fully visible at zoom '+zoom);
 }
}}];
