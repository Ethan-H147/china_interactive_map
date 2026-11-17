import path from 'node:path';import {pathToFileURL} from 'node:url';const {polygons,metres,lineIndex,landIndex}=await import(pathToFileURL(path.resolve(process.env.ATLAS_SOURCE_ROOT||'.')+'/scripts/geo-index.mjs'));

// Reviewed land localities whose source polygons span estuaries or lagoons.
// Limit this correction to reviewed identities: narrow waterfront property and
// genuine offshore islands must not be removed by a nationwide size filter.
export const coastalLandLocalities=new Set([
 'AU-SUB-loc4937408869d0', // Brooklyn
 'AU-SUB-loc9859826116fc', // Box Head
 'AU-SUB-loc7b6140b2c5db', // Patonga
 'AU-SUB-locf4997159996a', // Narrabeen
 'AU-SUB-loc5f37c3fa6d5a', // Dee Why
 'AU-SUB-locb7ce5803f324', // Berowra Waters
 'AU-SUB-loc3bf37853c2f7', // Mooney Mooney
 'AU-SUB-locdc9b7884057c', // Woy Woy
 'AU-SUB-locf64d72426c61', // Berowra
 'AU-SUB-loc31d5465ac065', // Fullerton Cove
 'AU-SUB-locb06ba86d1da3'  // Kooragang
]);

export async function cleanCoastalLandFringes(regions,original,records,{command,fc,area}){
 const source=new Map(original.features.map(f=>[f.properties.id,f])),removed=[],features=[];
 for(const f of regions.features){
  if(!coastalLandLocalities.has(f.properties.id)){features.push(f);continue;}
  const raw=source.get(f.properties.id),r=records.get(f.properties.id);
  if(!raw||!r)throw Error('Missing coastal locality source: '+f.properties.id);
  const parts=polygons(f.geometry),originalParts=polygons(raw.geometry),inside=originalParts.map(p=>landIndex(p)),distance=lineIndex(originalParts.flat());
  const points=(await command(fc(parts.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates}}))),'-points inner',{precision:null})).features;
  const samples=parts.map((p,i)=>{
   const point=points[i].geometry.coordinates,areaKm2=area({type:'Polygon',coordinates:p});let perimeter=0;
   for(const ring of p)for(let j=1;j<ring.length;j++)perimeter+=metres(ring[j-1],ring[j]);
   return {index:i,point,areaKm2,widthMetres:areaKm2*1e6/perimeter,sourceEdgeMetres:distance(point),sourcePart:inside.findIndex(test=>test(point))};
  });
  // Preserve the largest surviving piece of EVERY source component, including
  // tiny islands. Only additional narrow pieces created by clipping qualify.
  const anchors=new Map();for(const s of samples)if(!anchors.has(s.sourcePart)||s.areaKm2>anchors.get(s.sourcePart).areaKm2)anchors.set(s.sourcePart,s);
  const rejected=new Set();for(const s of samples){
   if(s.sourcePart<0||anchors.get(s.sourcePart)===s||s.widthMetres>=20||s.sourceEdgeMetres>=40)continue;
   rejected.add(s.index);removed.push({id:r.id,name:r.en,areaKm2:s.areaKm2,point:s.point,widthMetres:s.widthMetres,sourceEdgeMetres:s.sourceEdgeMetres,reason:'Detached coastline intersection beside the source edge'});
  }
  features.push(rejected.size?{...f,geometry:{type:'MultiPolygon',coordinates:parts.filter((_,i)=>!rejected.has(i))}}:f);
 }
 return {regions:fc(features),removed};
}
// Reviewed maritime gazetted localities. Their islands remain legitimate land;
// only narrow intersections beside the original water boundary are rejected.
const maritime=/\b(?:Sea|Strait|Gulf|Harbour)\b|^(?:Pittwater|Lake Macquarie|Botany Bay|Port Stephens|Jervis Bay|Moreton Bay|Shark Bay)$/i;
export async function cleanMaritimeFringes(regions,original,records,{command,fc,area}){
 const source=new Map(original.features.map(f=>[f.properties.id,f])),removed=[],excluded=[],features=[];
 for(const f of regions.features){const r=records.get(f.properties.id),raw=source.get(r.id),fraction=area(f.geometry)/area(raw.geometry);if(!maritime.test(r.en)||fraction>=.2){features.push(f);continue;}
  const parts=polygons(f.geometry),points=(await command(fc(parts.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates}}))),'-points inner',{precision:null})).features,sourceRings=polygons(raw.geometry).flat(),kept=[];
  for(let i=0;i<parts.length;i++){const p=parts[i],geometry={type:'Polygon',coordinates:p},a=area(geometry);let perimeter=0;for(const ring of p)for(let j=1;j<ring.length;j++)perimeter+=metres(ring[j-1],ring[j]);const q=points[i].geometry.coordinates,c=Math.cos(q[1]*Math.PI/180);let distance=Infinity;
   for(const ring of sourceRings)for(let j=1;j<ring.length;j++){const u=ring[j-1],v=ring[j],dx=(v[0]-u[0])*c,dy=v[1]-u[1],t=Math.max(0,Math.min(1,((q[0]-u[0])*c*dx+(q[1]-u[1])*dy)/(dx*dx+dy*dy||1)));distance=Math.min(distance,metres(q,[u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])]));}
   if(a*1e6/perimeter<50&&distance<100)removed.push({id:r.id,name:r.en,areaKm2:a,point:q,widthMetres:a*1e6/perimeter,sourceEdgeMetres:distance});else kept.push(p);
  }
  if(kept.length)features.push({...f,geometry:{type:'MultiPolygon',coordinates:kept}});else excluded.push({id:r.id,name:r.en,reason:'Water locality leaves only coastal intersection slivers on the existing land mask.'});
 }
 return {regions:fc(features),removed,excluded};
}

// Preserve the identity and its actual water footprint, rather than deleting a
// gazetted locality because its intersection with land is unsuitable for display.
export async function restoreWaterPlaces(regions,original,records,waterOnly,land,{command,fc,geographicBounds}){
 for(const item of waterOnly){const r=records.get(item.id),raw=original.features.find(f=>f.properties.id===item.id),bounds=geographicBounds(raw.geometry),nearby=land.features.filter(f=>{const b=geographicBounds(f.geometry);return b[0][0]<=bounds[1][0]&&b[1][0]>=bounds[0][0]&&b[0][1]<=bounds[1][1]&&b[1][1]>=bounds[0][1];});
  const water=await command({'water.json':fc([{...raw,properties:{id:r.id,waterLocality:true}}]),'land.json':fc(nearby)},'-erase land.json',{precision:null});
  if(!water.features.length)throw Error('Water locality has no water geometry: '+r.id);
  regions.features.push(...water.features);r.waterLocality=true;r.kind='Water locality';r.searchContext='Water locality: '+r.parentName;
 }
 return regions;
}
