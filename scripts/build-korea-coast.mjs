import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';
const root=new URL('./korea-sources/',import.meta.url);
const data=JSON.parse(await fs.readFile(new URL('north-coast.json',root),'utf8'));
assert(data.elements.length>1000&&!data.remark,'Incomplete coastline response');
const fc=features=>({type:'FeatureCollection',features});
const feature=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
const box=[124,37.4,131.2,43.3];
const lines=data.elements.filter(e=>e.type==='way').map(e=>feature(e.geometry.map(p=>[p.lon,p.lat])));
const inside=([x,y])=>x>box[0]&&x<box[2]&&y>box[1]&&y<box[3];
const leftPoints=[];
for(const f of lines){const c=f.geometry.coordinates;for(let i=1;i<c.length;i++){const a=c[i-1],b=c[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.00002||!inside(a)||!inside(b))continue;leftPoints.push([(a[0]+b[0])/2-dy/len*.000001,(a[1]+b[1])/2+dx/len*.000001]);break;}}
// OSM coastlines are directed with land on the left. The bounding rectangle
// only closes the processing extent, well outside North Korea's land boundary.
lines.push(feature([[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]]));
const output=await mapshaper.applyCommands('-i coast.json -clip bbox=124,37.4,131.2,43.3 -polygons -o polygons.json format=geojson geojson-type=FeatureCollection',{'coast.json':fc(lines)});
const polygons=JSON.parse(output['polygons.json']);
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const contains=(f,p)=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const land=fc(polygons.features.filter(f=>leftPoints.some(p=>contains(f,p))));
assert(land.features.some(f=>contains(f,[125.75,39.04])),'Pyongyang must be on land');
assert(!land.features.some(f=>contains(f,[129.5,40])),'East sea must be excluded');
assert(land.features.length>100,'Island coastline coverage too small');
await fs.writeFile(new URL('north-land.geojson',root),JSON.stringify(land));
console.log({coastWays:lines.length-1,landPolygons:land.features.length});
