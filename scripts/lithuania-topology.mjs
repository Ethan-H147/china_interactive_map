import assert from 'node:assert/strict';
import {load,polygons,linesOf,lineIndex,metres} from './geo-index.mjs';
import {command,fc,sharedBorders} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {coastalCodePartitions} from './canada-area-code-topology.mjs';

// Repair only enclosed rounding seams. Preserve larger holes and lake masks.
export const cleanLithuanianSeams=data=>command(data,'-clean gap-fill-area=10m2');

export async function completeLithuanianRiverTerritory(bottom,units){
 const municipal=load('scripts/boundary-sources/baltics/lt-level3.json.gz');
 const sourceWards=load('scripts/boundary-sources/baltics/lt-level4.json.gz');
 const parent='LT-M-94',official=fc(municipal.features.filter(f=>f.properties.nationalcode==='94'));
 const wards=fc(sourceWards.features.filter(f=>f.properties.upperlevelunit_href==='#municipality_94'));
 const remainder=await command({'municipal.json':official,'wards.json':wards},'-erase wards.json -explode');
 const gap=fc(remainder.features.filter(f=>f.geometry&&geographicAreaKm2(f.geometry)>.1));
 assert.equal(gap.features.length,1,'One pinned Jurbarkas river omission');
 assert(geographicAreaKm2(gap.features[0].geometry)<1,'Bounded river correction');
 const children=await cleanLithuanianSeams(fc(bottom.features.filter(f=>units.get(f.properties.id)?.parent===parent)));
 const boundary=sharedBorders(children),gapEdge=lineIndex(gap.features.flatMap(f=>polygons(f.geometry).flat()));
 const perimeter=official.features.flatMap(f=>polygons(f.geometry).flat());
 const nearest=p=>{
  let best,distance=Infinity;const c=Math.cos(p[1]*Math.PI/180);
  for(const ring of perimeter)for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],dx=(b[0]-a[0])*c,dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],d=metres(p,q);
   if(d<distance){best=q;distance=d;}
  }
  return {point:best,distance};
 };
 const dividers=fc(linesOf(boundary).map(original=>{
  const path=original.map(p=>[...p]);
  for(const side of [0,1]){const i=side?path.length-1:0,p=path[i];if(gapEdge(p)>2)continue;const {point,distance}=nearest(p);if(distance>1&&distance<2000){if(side)path.push(point);else path.unshift(point);}}
  return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:path}};
 }));
 const partition=await coastalCodePartitions(children.features,official,dividers);
 const additions=await command({'assigned.json':fc([...partition.values()].flatMap(d=>d.features)),'gap.json':gap},'-clip gap.json');
 const merged=await command(fc([...children.features,...additions.features]),'-dissolve id -clean gap-fill-area=10m2');
 const updated=new Map(merged.features.map(f=>[f.properties.id,f]));
 return cleanLithuanianSeams(fc(bottom.features.map(f=>updated.get(f.properties.id)||f)));
}
