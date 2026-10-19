import assert from 'node:assert/strict';import {load,linesOf,lineIndex,metres,polygons} from './geo-index.mjs';import {command,fc} from './build-regional-dataset.mjs';import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
const refs=load('artifacts/frontier-source/ne-10m-land-boundaries.geojson');
export async function canonicalFrontier(iso,neighbour,geometry){const reference=joinReferencePaths(linesOf(fc(refs.features.filter(f=>[iso,neighbour].every(c=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(c))))));assert.equal(reference.length,1,iso+' '+neighbour+' continuous reference');const outline=await command(geometry,'-dissolve'),path=selectFrontierArc(outline,reference[0]).path;
 if(iso==='KGZ'&&neighbour==='CHN'){
  // The coarse reference ends 356m before the existing Kazakhstan–China junction,
  // which lies inside a Chinese boundary segment rather than at one of its vertices.
  const kz=await canonicalFrontier('KGZ','KAZ',load('dist/data/europe/kazakhstan/first.bin').regions),candidates=[kz[0],kz.at(-1)].flatMap(point=>[{point,end:0,distance:metres(point,path[0])},{point,end:path.length-1,distance:metres(point,path.at(-1))}]).sort((a,b)=>a.distance-b.distance),junction=candidates[0],distance=lineIndex(outline.features.flatMap(f=>polygons(f.geometry).map(p=>p[0])));assert(junction.distance<1000&&distance(junction.point)<1,'Existing three-country junction lies on China');const end=path[junction.end],mid=[(end[0]+junction.point[0])/2,(end[1]+junction.point[1])/2];assert(distance(mid)<1,'Junction extension follows the existing Chinese segment');if(junction.end===0)path.unshift(junction.point);else path.push(junction.point);
 }
 return path;
}
