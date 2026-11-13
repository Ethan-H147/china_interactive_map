import assert from 'node:assert/strict';
import {fixtureImagery} from './atlas-audit-helpers.mjs';
const west=[[121.170082795,31.815771047],[121.178483952,31.823496938]],north=[121.290093745,31.876722246],genuine=[121.454171285,31.781734371];
export default [{name:'reviewed Chongming strips have correct land coverage and ownership in flat and globe views',options:{width:1300,height:900},async run(p,base){
 await fixtureImagery(p);await p.open(base,'#china');await p.waitFor('atlasesReady&&chinaCounties');
 const pick=point=>p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return pickedRegion(q)?.feature.properties.adcode||null})()');
 for(const projection of ['mercator','globe']){
  await p.evaluate('map.setProjection({type:'+JSON.stringify(projection)+'});setMode("prefecture",true);void map.jumpTo({center:[121.25,31.84],zoom:11})');await p.settle();
  for(const point of west){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:16})');await p.settle();assert.equal(await pick(point),310151,'Western fragment belongs to Shanghai');}
  await p.evaluate('void map.jumpTo({center:[121.25,31.84],zoom:11})');await p.settle();
  assert.equal(await pick(north),null,'Northern river strip has no administrative land hit');
  const fill=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(north)+');return map.queryRenderedFeatures(q,{layers:["province-fill"]}).map(f=>f.properties.adcode)})()');assert.deepEqual(fill,[],'Province land also excludes river water');
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(genuine)+',zoom:11})');await p.settle();assert.equal(await pick(genuine),320600,'Genuine Haiyong/Qilong land stays Nantong');
 }
 await p.evaluate('map.setProjection({type:"mercator"});void map.jumpTo({center:[121.25,31.84],zoom:11})');await p.settle();assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('chongming-shore-artifacts-fixed');
 await p.tap('#satellite-layer');await p.waitFor('satelliteDisplay.state.hasTile');assert.equal(await pick(north),null,'Satellite mode retains river water without a phantom land hit');
 }}];
