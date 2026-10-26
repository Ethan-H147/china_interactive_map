import assert from 'node:assert/strict';
import polygonClipping from 'polygon-clipping';
import {polygons,lineIndex,metres} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';

// The district survey is clipped to the retained state mask, but clipping alone
// leaves uncovered strips wherever that survey stops short of the outer edge.
// Extend each strip's adjoining district to the mask; retain the internal divide.
export function alignLadakhDistrictCoverage(regions,mask){
 assert.equal(mask.properties.id,'IN-LA');
 // Normalize intersection roundoff below a millimetre before another overlay.
 const rounded=value=>typeof value==='number'?Math.round(value*1e9)/1e9:value.map(rounded);
 const parent=polygons(mask.geometry),features=regions.features.map(f=>({...f,
  geometry:{type:'MultiPolygon',coordinates:rounded(polygonClipping.intersection(polygons(f.geometry),parent))}}));
 const edges=features.map(f=>lineIndex(polygons(f.geometry).flat()));
 const gaps=polygonClipping.difference(parent,...features.map(f=>polygons(f.geometry)));
 const patches=features.map(()=>[]),assignments=features.map(f=>({id:f.properties.id,parts:0,areaKm2:0}));
 for(const coordinates of gaps){
  const lengths=features.map(()=>0);
  for(const ring of coordinates)for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],middle=[(a[0]+b[0])/2,(a[1]+b[1])/2];
   edges.forEach((edge,j)=>{if(edge(middle)<.25)lengths[j]+=metres(a,b);});
  }
  let owner=lengths.indexOf(Math.max(...lengths));
  // Isolated mask islands have no adjoining arc. Use their nearest district.
  if(!lengths[owner]){
   const point=coordinates[0][0],distances=features.map(f=>{
    let distance=Infinity;for(const polygon of polygons(f.geometry))for(const ring of polygon)for(const p of ring)distance=Math.min(distance,metres(point,p));return distance;
   });
   owner=distances.indexOf(Math.min(...distances));
  }
  patches[owner].push(rounded(coordinates));assignments[owner].parts++;assignments[owner].areaKm2+=geographicAreaKm2({type:'Polygon',coordinates});
 }
 for(let i=0;i<features.length;i++)if(patches[i].length)features[i].geometry.coordinates=rounded(polygonClipping.union(polygons(features[i].geometry),patches[i]));
 return {regions:{...regions,features},report:{parent:mask.properties.id,policy:'District coverage follows the existing Ladakh mask. Uncovered strips join the district sharing the longest boundary; isolated mask islands join the nearest district. State geometry and international claims remain unchanged.',gapParts:gaps.length,restoredAreaKm2:assignments.reduce((n,a)=>n+a.areaKm2,0),assignments}};
}
