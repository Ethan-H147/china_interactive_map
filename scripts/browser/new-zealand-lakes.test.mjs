import assert from 'node:assert/strict';
import {pixel} from './major-lake-cutouts.test.mjs';

export default [{name:'New Zealand lakes, inland bays and islands on the locality map',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#new-zealand');
 await p.evaluate('currentAtlas().restore("NZ-15").then(()=>true)');
 await p.tap('#mode-third');
 await p.waitFor('map.getLayer("new-zealand-third-fill") && map.queryRenderedFeatures({layers:["new-zealand-third-fill"]}).length');
 const probes=[
  {name:'Lake Te Anau',point:[167.776226,-45.201718],water:true},
  {name:'Brod Bay',point:[167.673915,-45.399712],water:true},
  {name:'Lake Manapouri',point:[167.553584,-45.514569],water:true},
  {name:'Pomona Island',point:[167.472648,-45.507157],water:false},
  {name:'Te Anau township',point:[167.717,-45.416],water:false}
 ];
 for(const appearance of ['light','dark']){
  await p.evaluate('AtlasComfort.set({appearance:'+JSON.stringify(appearance)+'})');
  await p.settle();
  const color=await p.evaluate('map.getPaintProperty("major-lake-water","fill-color")');
  const expected=color.slice(1).match(/../g).map(channel=>parseInt(channel,16));
  for(const {name,point,water} of probes){
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:11})');
  await p.settle();
  const {rgb}=await pixel(p,point);
  if(water)assert.deepEqual(rgb,expected,name+' matches the permanent lake palette in '+appearance);
  else assert.notDeepEqual(rgb,expected,name+' remains dry land');
 }
 }
 assert(await p.evaluate('mapScene.assertOrder()'));
}}];
