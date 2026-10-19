import assert from 'node:assert/strict';import {load,linesOf,polygons,landIndex,metres} from '../geo-index.mjs';
const baseData='dist/data/europe/pakistan/',water=load(baseData+'water.bin'),mangla=water.features.find(f=>f.properties.ne_id===1159117449),inside=landIndex(polygons(mangla.geometry).flat()),border=linesOf(load(baseData+'first.bin').boundaries).flatMap(path=>path.slice(1).map((b,j)=>[(path[j][0]+b[0])/2,(path[j][1]+b[1])/2])).find(p=>inside(p));assert(border);
const frontier=linesOf(load(baseData+'resolved-india-frontier.bin')).flatMap(path=>path.slice(1).map((b,j)=>[(path[j][0]+b[0])/2,(path[j][1]+b[1])/2])).sort((a,b)=>metres(a,[74.58,31.6])-metres(b,[74.58,31.6]))[0];
export default [1280,390].map(width=>({name:'Pakistan–India border and Mangla water '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const country of ['pakistan','india']){
  await p.open(base,'#'+country);await p.evaluate('void map.jumpTo({center:[73.677887,33.203773],zoom:11})');await p.settle();
  const fills=await p.evaluate('(()=>{const q=map.project([73.677887,33.203773]);return map.queryRenderedFeatures(q).filter(f=>f.layer.type==="fill").map(f=>f.layer.id)})()');assert.deepEqual(fills,[],country+' renders reservoir water without a background land fill');
  if(country==='pakistan'){const hits=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(border)+');return map.queryRenderedFeatures(q,{layers:["pakistan-first-lines"]}).length})()');assert(hits>0,'The provincial border continues across Mangla');const ghosts=await p.evaluate('(()=>{const q=map.project([73.677887,33.203773]);return map.queryRenderedFeatures([[q.x-200,q.y-200],[q.x+200,q.y+200]],{layers:["india-international"]}).length})()');assert.equal(ghosts,0,'No stray Indian claim outline remains over Mangla in Pakistan view');await p.screenshot('mangla-fixed-'+width);}
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(frontier)+',zoom:11})');await p.settle();
  const owners=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(frontier)+');return map.queryRenderedFeatures(q).filter(f=>f.layer.type==="line"&&f.properties.resolvedFrontier==="IND-PAK").map(f=>f.layer.id)})()');assert.deepEqual(owners,[country+'-international'],'Only one resolved border renders in each country view');await p.screenshot('pakistan-india-border-'+country+'-'+width);
 }
}}));
