import {polygons,lineIndex,linesOf,metres} from './geo-index.mjs';
import {visibleSegments} from '../dist/adaptive-lines.mjs';
// Independently simplified INEGI edges differ by a few metres on this inland border.
export function repairHidalgoTlaxcala(regions,boundaries){
 const hidalgo=regions.features.find(f=>f.properties.id==='MX-HID'),tlaxcala=regions.features.find(f=>f.properties.id==='MX-TLA');
 if(!hidalgo||!tlaxcala)return boundaries;
 const neighbour=lineIndex(polygons(tlaxcala.geometry).flat()),existing=lineIndex(linesOf(boundaries)),paths=[];
 for(const ring of polygons(hidalgo.geometry).flat())for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],mid=a.map((v,j)=>(v+b[j])/2);
  if(metres(a,b)>0&&[a,mid,b].every(p=>neighbour(p)<10)&&existing(mid)>3)paths.push([a,b]);
 }
 const added=visibleSegments({type:'FeatureCollection',features:paths.map(coordinates=>({type:'Feature',properties:{owners:['MX-HID','MX-TLA'],repair:'inegi-simplification-gap'},geometry:{type:'LineString',coordinates}}))});
 return {...boundaries,features:[...boundaries.features,...added.features]};
}
