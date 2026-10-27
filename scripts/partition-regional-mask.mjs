import assert from 'node:assert/strict';
import {command,fc} from './build-regional-dataset.mjs';
import {polygons,landIndex,lineIndex,metres} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
// Partition the mask into shared topological faces before assigning ownership.
// Each face is used exactly once, including the strips between dated sources.
export async function partitionRegionalMask(children,parent){
 const clipped=await command({'units.json':children,'mask.json':fc([parent])},'-clip mask.json -clean gap-fill-area=0',{precision:null});
 const mosaic=await command(fc([...clipped.features,parent]),'-mosaic',{precision:null});mosaic.features=mosaic.features.filter(f=>f.geometry&&geographicAreaKm2(f.geometry)>1e-10);mosaic.features.forEach((f,i)=>f.properties={face:i});
 const points=new Map((await command(mosaic,'-points inner',{precision:null})).features.filter(f=>f.geometry).map(f=>[f.properties.face,f.geometry.coordinates]));
 const inside=landIndex(polygons(parent.geometry).flat()),units=children.features.map(f=>({f,inside:landIndex(polygons(f.geometry).flat()),near:lineIndex(polygons(f.geometry).flat())})),assigned=[];
 for(let i=0;i<mosaic.features.length;i++){
  const face=mosaic.features[i],point=points.get(i);if(!point){assert(geographicAreaKm2(face.geometry)<1e-6,'Interior point for non-degenerate overlay face '+i);continue;}if(!inside(point))continue;
  let unit=units.find(u=>u.inside(point));
  if(!unit){const lengths=units.map(()=>0);for(const ring of polygons(face.geometry).flat())for(let j=1;j<ring.length;j++){const a=ring[j-1],b=ring[j],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];units.forEach((u,k)=>{if(u.near(mid)<.2)lengths[k]+=metres(a,b);});}const maximum=Math.max(...lengths);unit=maximum?units[lengths.indexOf(maximum)]:units.map(u=>({...u,d:u.near(point)})).sort((a,b)=>a.d-b.d)[0];}
  assert(unit);assigned.push({...face,properties:{...unit.f.properties}});
 }
 const fields=children.features.some(f=>Object.hasOwn(f.properties,'parent'))?'id,parent':'id';
 return command(fc(assigned),'-dissolve2 '+fields+' -clean gap-fill-area=0',{precision:null});
}
