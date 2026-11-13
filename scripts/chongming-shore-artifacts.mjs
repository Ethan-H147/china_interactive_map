import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';
import {geographicAreaKm2} from './geographic-area.mjs';
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const within=(p,[w,s,e,n])=>p[0].every(([x,y])=>x>=w&&x<=e&&y>=s&&y<=n);
export const chongmingArtifactWindows={west:[121.15,31.80,121.19,31.84],north:[121.26,31.86,121.35,31.89]};
export const chongmingArtifactAt=p=>Object.entries(chongmingArtifactWindows).find(([,b])=>p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3])?.[0];
// Only these detached survey fragments are reviewed. The large Haiyong/Qilong
// component and the mainland retain their existing coordinates and ownership.
export async function refineChongmingArtifacts(features){
 const nantong=features.find(f=>f.properties.adcode===320600),shanghai=features.find(f=>f.properties.adcode===310151);
 assert(nantong&&shanghai);
 const west=[],north=[],keep=[];
 for(const p of polygons(nantong.geometry)){
  const target=within(p,chongmingArtifactWindows.west)?west:within(p,chongmingArtifactWindows.north)?north:keep;target.push(p);
 }
 assert(west.length<=2&&north.length<=1,'Unexpected Chongming artifact components');
 const km2=parts=>geographicAreaKm2({type:'MultiPolygon',coordinates:parts});
 assert(km2(west)<.11&&km2(north)<3.2,'Unexpected Chongming artifact extent');
 if(!west.length&&!north.length)return {features,west,north};
 let geometry=shanghai.geometry;
 if(west.length){const input={type:'FeatureCollection',features:[shanghai,{type:'Feature',properties:shanghai.properties,geometry:{type:'MultiPolygon',coordinates:west}}]};const output=await mapshaper.applyCommands('-i input.json -dissolve2 -o out.json format=geojson geojson-type=FeatureCollection',{'input.json':input});const result=JSON.parse(output['out.json']);assert.equal(result.features.length,1);geometry=result.features[0].geometry;}
 return {features:features.map(f=>f===nantong?{...f,geometry:{type:'MultiPolygon',coordinates:keep}}:f===shanghai?{...f,geometry}:f),west,north};
}
