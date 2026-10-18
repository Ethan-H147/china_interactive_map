import {createRequire} from 'node:module';
import {landIndex,polygons} from './geo-index.mjs';
import {visibleSegments} from '../dist/adaptive-lines.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server');
const fc=features=>({type:'FeatureCollection',features});
// ZCTAs do not tile all land. A one-owner arc can be a real inland boundary,
// rather than a coastline. Classify each segment against the matching-vintage
// land mask, retaining open inland edges without outlining unselected coasts.
export function zipEdges(regions,land){
 const t=topology({regions,land}),outer=new Set(t.objects.land.geometries.flatMap(g=>g.arcs.flat(Infinity)).map(a=>a<0?~a:a)),inside=landIndex(land.features.flatMap(f=>polygons(f.geometry).flat())),owners=new Map(),features=[];
 for(const g of t.objects.regions.geometries)for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(a))owners.set(a,new Set());owners.get(a).add(g.properties.id);}
 let openSegments=0;
 for(const[a,ids]of owners){
  if(outer.has(a))continue;const path=t.arcs[a],paths=[];let run=[];
  for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy),offset=Math.min(.00001,length/4),x=(p[0]+q[0])/2,y=(p[1]+q[1])/2;
   const keep=ids.size>1||length>0&&inside([x-dy/length*offset,y+dx/length*offset])&&inside([x+dy/length*offset,y-dx/length*offset]);
   if(keep){if(!run.length)run.push(p);run.push(q);if(ids.size===1)openSegments++;}else if(run.length){paths.push(run);run=[];}
  }
  if(run.length)paths.push(run);
  if(paths.length)features.push({type:'Feature',properties:{owners:[...ids].sort()},geometry:{type:'MultiLineString',coordinates:paths}});
 }
 return {...visibleSegments(fc(features),{retraced:false}),openSegments};
}
