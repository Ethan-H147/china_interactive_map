// A complete, resident overview. Country detail can arrive in any order without
// revealing an empty tile behind it. This is built once, not during interaction.
import fs from 'node:fs';import {gzipSync} from 'node:zlib';
import '../dist/countries.js';
import {load,polygons,linesOf} from './geo-index.mjs';import {fc} from './build-regional-dataset.mjs';
const {countries,ids,byAdapter}=globalThis.AtlasCountries;
const paths={...Object.fromEntries(ids.filter(id=>countries[id].contextFile).map(id=>[id,countries[id].contextFile])),china:'china-context.bin',korea:'korea-context.bin',mongolia:'mongolia-context.bin',japan:'japan-context.bin',russia:'russia/context.bin',philippines:'archipelago/philippines-context.bin',indonesia:'archipelago/indonesia-context.bin',malaysia:'southeast-asia/malaysia-context.bin',singapore:'southeast-asia/singapore-context.bin',...Object.fromEntries(['south-africa','botswana','namibia','eswatini','lesotho'].map(c=>[c,'southern-africa/'+c+'/context.bin'])),...Object.fromEntries(byAdapter('europe').filter(c=>!countries[c].snapshot).map(c=>[c,'europe/'+c+'/context.bin']))};
const land=load('dist/data/world-land.bin').features.filter(f=>!f.properties.country),flight=load('dist/data/flight-context.bin');
for(const country of ids.filter(c=>!countries[c].snapshot)){
 const data=paths[country]?load('dist/data/'+paths[country]):fc(flight.features.filter(f=>f.properties.country===country));
 for(const f of data.features)if(f.geometry&&polygons(f.geometry).length)land.push({...f,properties:{country,...(f.properties.claimedBy?{claimedBy:f.properties.claimedBy}:{}),...(f.properties.claimants?{claimants:f.properties.claimants}:{}),...(f.properties.region?{region:f.properties.region}:{}),...(f.properties.bounds?{bounds:typeof f.properties.bounds==='string'?f.properties.bounds:JSON.stringify(f.properties.bounds)}:{})}});
}
// Omit sub-pixel skerries from the world buffer. Keep polygon holes and every
// country/territory's largest island, including microstates and enclaves.
const ringArea=ring=>{const [x,y]=ring[0];let area=0;for(let i=1;i<ring.length;i++)area+=(ring[i-1][0]-x)*(ring[i][1]-y)-(ring[i][0]-x)*(ring[i-1][1]-y);return Math.abs(area)/2;};
function simplify(points,tolerance){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],limit=tolerance*tolerance;
 while(stack.length){const [start,end]=stack.pop(),a=points[start],b=points[end],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let maximum=limit,index=-1;for(let i=start+1;i<end;i++){const p=points[i],u=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-u*dx)**2+(p[1]-a[1]-u*dy)**2;if(d>maximum){maximum=d;index=i;}}if(index>=0){keep.add(index);stack.push([start,index],[index,end]);}}
 const result=[...keep].sort((a,b)=>a-b).map(i=>points[i]);return result.length>=4||points[0][0]!==points.at(-1)[0]||points[0][1]!==points.at(-1)[1]?result:points;
}
for(const f of land){const parts=polygons(f.geometry),largest=parts.reduce((best,p)=>ringArea(p[0])>ringArea(best[0])?p:best);const kept=parts.filter(p=>p===largest||ringArea(p[0])>=.0008).map(p=>p.map(r=>simplify(r,.006)));f.geometry={type:'MultiPolygon',coordinates:kept};}
// Shared display edges remain within a fraction of a world-view pixel. Work
// directly in degrees: retained island shapes can use longitudes beyond 180.
const overview=fc(land);
const borderFiles=['world-country-outlines.bin','atlas-frontiers.bin','shared-context-borders.bin','russia/international.bin',...['south-africa','botswana','namibia','eswatini','lesotho'].map(c=>'southern-africa/'+c+'/international.bin'),...byAdapter('europe').filter(c=>!countries[c].snapshot).map(c=>'europe/'+c+'/international.bin')],borders=[];
for(const file of borderFiles){if(!fs.existsSync('dist/data/'+file))continue;const owner=file==='atlas-frontiers.bin'?'atlas-frontiers':file.split('/').at(-2)||file;for(const f of load('dist/data/'+file).features)borders.push({...f,properties:{...f.properties,overviewOwner:owner}});}
for(const key of ['landBorders','riverBorders'])for(const f of flight[key]?.features||[])borders.push({...f,properties:{...f.properties,overviewOwner:'flight'}});
const strokes=fc(borders.flatMap(f=>linesOf(fc([f])).map(path=>({...f,geometry:{type:'LineString',coordinates:simplify(path,.005)}}))));
const write=(file,data)=>{const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync('dist/data/'+file,bytes);return bytes.length;};
overview.features=overview.features.filter(f=>f.geometry);const metadata={version:1,source:'Existing reconciled atlas land, claims and international frontiers; no external basemap.',landBytes:write('globe-overview-land.bin',overview),borderBytes:write('globe-overview-borders.bin',strokes),countries:[...new Set(overview.features.map(f=>f.properties.country).filter(Boolean))].sort(),simplificationDegrees:.006,sourceZoom:0,reparseOverscaled:false};
fs.writeFileSync('dist/data/globe-overview.json',JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata));

// Keep the four Canadian lake holes exact after overview simplification.
await (await import('./canada-lakes.mjs')).maskCanadaLakes({worldOnly:true});
