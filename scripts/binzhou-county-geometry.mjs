import assert from 'node:assert/strict';
import earcut,{flatten,deviation} from 'earcut';

// A sub-metre-wide retraced wedge at Wudi/Zhanhua's coastal junction is a
// clipping artifact, not a district boundary. Leave every other vertex intact.
export function repairBinzhouCountyOutlines(features){
 const feature=features.find(f=>f.properties.adcode===371603);
 if(!feature)return false;
 const ring=feature.geometry.coordinates[0][0];
 const near=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-7);
 const i=ring.findIndex(p=>near(p,[118.069884,38.211405]));
 if(i<0)return false;
 assert(near(ring[i-1],[118.105863,38.209335])&&near(ring[i+1],[118.105845,38.20933]),'Unexpected Zhanhua coastal junction');
 ring.splice(i,1);return true;
}

// Use the same exact Mercator triangulation as prepare-fill-fragments.mjs.
// Wudi's thin rings/spurs collapse when rounded inside a vector tile, causing
// overlapping triangles. Pre-triangulation retains all original vertices/holes.
export function binzhouCountyFragments(features){
 const feature=features.find(f=>f.properties.adcode===371623);
 if(!feature)return {};
 const coordinates=[];
 for(const rings of feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates){
  const original=rings.flat(),flat=flatten(rings.map(r=>r.map(([x,y])=>[x,Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI])));
  const indices=earcut(flat.vertices,flat.holes,2);
  assert(deviation(flat.vertices,flat.holes,2,indices)<1e-10,'Wudi fill must retain its exact polygon area');
  for(let i=0;i<indices.length;i+=3){const a=original[indices[i]],b=original[indices[i+1]],c=original[indices[i+2]];coordinates.push([[a,b,c,a]]);}
 }
 return {371623:{type:'MultiPolygon',coordinates}};
}
