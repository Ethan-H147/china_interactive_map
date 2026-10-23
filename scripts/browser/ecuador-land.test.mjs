import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const point=[-80.66,-1.56];
export default [{name:'Julcuy stays land in foreign context and each Ecuador administrative tier',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#korea');
 await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:7})');await p.settle();
 assert(await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(point)+')).some(f=>f.properties.country==="ecuador"&&f.layer.type==="fill")'),'Land while another country is open');
 await p.screenshot('ecuador-julcuy-context');
 await p.evaluate('changeAtlas("ecuador",false)');await p.settle();
 for(const [name,kind,id,layer]of [['Manabí','Province','EC13','first'],['Jipijapa','Canton','EC1306','second'],['Julcuy','Parish','EC130653','third']]){
  await searchAndSelect(p,name,name,kind);
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:10})');await p.settle();
  assert(await p.evaluate('map.queryRenderedFeatures(map.project('+JSON.stringify(point)+'),{layers:["ecuador-'+layer+'-fill"]}).some(f=>f.properties.id==="'+id+'")'),'Restored land belongs to '+name);
 }
 await p.screenshot('ecuador-julcuy-selected');
 assert(await p.evaluate('mapScene.assertOrder()'));
}}];
