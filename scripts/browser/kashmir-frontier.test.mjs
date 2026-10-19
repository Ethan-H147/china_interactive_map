import assert from 'node:assert/strict';import {load,linesOf,metres} from '../geo-index.mjs';
const mercatorY=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)),latitude=y=>(2*Math.atan(Math.exp(y))-Math.PI/2)*180/Math.PI;
const path=linesOf(load('dist/data/europe/pakistan/northern-frontier.bin'))[0],middles=path.slice(1).map((b,i)=>[(path[i][0]+b[0])/2,latitude((mercatorY(path[i][1])+mercatorY(b[1]))/2)]),targets=[['jammu',[74.4,32.8]],['kashmir',[74.1,34.3]],['siachen',[77.6,35.4]]].map(([name,target])=>({name,point:middles.reduce((a,b)=>metres(a,target)<metres(b,target)?a:b)}));
export default [1280,390].map(width=>({name:'Northern disputed border fills and continuous outlines '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#pakistan');for(const {name,point}of targets){
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:10})');await p.settle();
  const hits=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures(q).filter(f=>f.layer.type==="line").map(f=>({layer:f.layer.id,resolved:f.properties.resolvedFrontier}))})()');
  assert(hits.some(f=>f.resolved==='IND-PAK-KASHMIR'),'Continuous northern stroke renders at '+name);assert(!hits.some(f=>f.layer==='india-international'),'No duplicate Indian claim stroke renders at '+name);
  await p.screenshot('northern-border-'+name+'-'+width);
 }
 await p.evaluate('void map.jumpTo({center:[75.65,34.4],zoom:6.7})');await p.settle();await p.screenshot('northern-border-overview-'+width);
}}));
