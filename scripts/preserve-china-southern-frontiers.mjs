// Restore retained canonical strokes without rebuilding any national polygons.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,linesOf,lineIndex,metres} from './geo-index.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
export function preserveChinaSouthernFrontiers(){
 const canonical=load('dist/data/europe/pakistan/resolved-china-frontiers.bin'),tags=new Set(canonical.features.map(f=>f.properties.resolvedFrontier)),near=lineIndex(linesOf(canonical)),features=[];
 for(const f of load('dist/data/atlas-frontiers.bin').features){
  if(tags.has(f.properties.resolvedFrontier))continue;
  for(const path of linesOf({features:[f]})){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if([0,.25,.5,.75,1].every(t=>near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<2)){run=null;continue;}if(!run){run={type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates:[a]}};features.push(run);}run.geometry.coordinates.push(b);}}
 }
 const result=lineData({type:'FeatureCollection',features:[...features,...canonical.features]});fs.writeFileSync('dist/data/atlas-frontiers.bin',gzipSync(JSON.stringify(result),{level:9}));
 const file='dist/data/atlas-frontiers-sources.json',info=load(file);info.pieces=result.features.length;info.frontierKm=Math.round(linesOf(result).reduce((n,p)=>n+p.slice(1).reduce((s,b,i)=>s+metres(p[i],b),0),0)/1000);fs.writeFileSync(file,JSON.stringify(info,null,2)+'\n');
}
