import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
const path='scripts/additional-sources/shenzhen/osm-coast.json';
const raw=fs.readFileSync(path),data=JSON.parse(raw);
assert(data.elements.length>100&&!data.remark,'Incomplete OSM coastline response');
const box=[113.68,22.36,114.70,22.91],fc=features=>({type:'FeatureCollection',features});
const line=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
const lines=data.elements.filter(e=>e.type==='way').map(e=>line(e.geometry.map(p=>[p.lon,p.lat])));
const inside=([x,y])=>x>box[0]&&x<box[2]&&y>box[1]&&y<box[3];
const leftPoints=[];
for(const f of lines)for(let i=1;i<f.geometry.coordinates.length;i++){
  const a=f.geometry.coordinates[i-1],b=f.geometry.coordinates[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<.00002||!inside(a)||!inside(b))continue;
  leftPoints.push([(a[0]+b[0])/2-dy/length*.000001,(a[1]+b[1])/2+dx/length*.000001]);break;
}
// OSM coastline direction places land on the left. The rectangle closes the
// processing extent outside Shenzhen; its edges must never become city coast.
lines.push(line([[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]]));
const output=await mapshaper.applyCommands('-i coast.json -clip bbox='+box.join(',')+' -polygons -o polygons.json format=geojson geojson-type=FeatureCollection',{'coast.json':fc(lines)});
const polygons=JSON.parse(output['polygons.json']);
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const contains=(f,p)=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const land=fc(polygons.features.filter(f=>leftPoints.some(p=>contains(f,p))));
for(const p of [[113.93,22.49],[114.05,22.55],[114.55,22.56]])assert(land.features.some(f=>contains(f,p)),'Missing Shenzhen land '+p);
for(const p of [[113.80,22.45],[113.97,22.50],[114.55,22.38]])assert(!land.features.some(f=>contains(f,p)),'Sea classified as land '+p);
fs.writeFileSync('dist/data/shenzhen-land.json',JSON.stringify(land));
fs.writeFileSync('dist/data/shenzhen-coast-source.bin',gzipSync(raw,{level:9}));
fs.writeFileSync('dist/data/shenzhen-coast-source.json',JSON.stringify({provider:'OpenStreetMap contributors',query:'way["natural"="coastline"](22.36,113.68,22.91,114.70);out meta geom;',endpoint:'https://overpass-api.de/api/interpreter',coordinateSystem:'WGS84',timestamp:data.osm3s.timestamp_osm_base,license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',definition:'https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline',sourceDownload:'data/shenzhen-coast-source.bin',sourceCompression:'gzip JSON',sha256:createHash('sha256').update(raw).digest('hex'),ways:data.elements.length,vertices:data.elements.reduce((n,w)=>n+w.geometry.length,0),landPolygons:land.features.length},null,2));
console.log({ways:data.elements.length,landPolygons:land.features.length});
