import {polygons,lineIndex,linesOf} from './geo-index.mjs';
// The retained Northern/Darfur rings differ by 0.000001° at their western
// junction. Recover coincident edges without moving either region's vertices.
export function repairSudanNorthernBorder(regions,boundaries){
 const north=regions.features.find(f=>f.properties.id==='SD17'),darfur=regions.features.find(f=>f.properties.id==='SD02');
 if(!north||!darfur)return boundaries;
 const neighbour=lineIndex(polygons(darfur.geometry).flat()),existing=lineIndex(linesOf(boundaries)),missing=[];
 for(const ring of polygons(north.geometry).flat())for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],mid=a.map((v,j)=>(v+b[j])/2);
  if([a,mid,b].every(p=>neighbour(p)<.5)&&existing(mid)>.5)missing.push([a,b]);
 }
 if(!missing.length)return boundaries;
 const pair=f=>f.properties.owners?.length===2&&f.properties.owners.includes('SD17')&&f.properties.owners.includes('SD02');
 if(!boundaries.features.some(pair))throw Error('Missing Sudan Northern/Darfur boundary group');
 return {...boundaries,features:boundaries.features.map(f=>pair(f)?{...f,geometry:{type:'MultiLineString',coordinates:[...(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates),...missing]}}:f)};
}
