import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {collection,run} from './pearl-coast.mjs';
import {contains} from './east-coast.mjs';
const compressed=fs.readFileSync('scripts/additional-sources/east-coast/osm-coast.bin'),raw=gunzipSync(compressed),data=JSON.parse(raw);
const box=[120.6,29.3,123.6,32.2],line=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
const lines=data.elements.map(e=>line(e.geometry.map(p=>[p.lon,p.lat]))),seeds=[];
const inside=([x,y])=>x>box[0]&&x<box[2]&&y>box[1]&&y<box[3];
for(const f of lines)for(let i=1;i<f.geometry.coordinates.length;i++){
  const a=f.geometry.coordinates[i-1],b=f.geometry.coordinates[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<.00002||!inside(a)||!inside(b))continue;
  seeds.push([(a[0]+b[0])/2-dy/length*.000001,(a[1]+b[1])/2+dx/length*.000001]);break;
}
lines.push(line([[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]]));
const areas=await run('-i coast.json -clip bbox='+box.join(',')+' -polygons',{'coast.json':collection(lines)});
const land=collection(areas.features.filter(f=>seeds.some(p=>contains(f,p))));
for(const p of [[122.11,30.04],[122.30,29.98],[122.20,30.26],[121.93,30.89],[121.48,31.20]])assert(land.features.some(f=>contains(f,p)),'Missing expected land '+p);
for(const p of [[122.6,30.3],[123.0,29.6],[122.05,30.9]])assert(!land.features.some(f=>contains(f,p)),'Water classified as land '+p);
fs.writeFileSync('dist/data/east-coast-land.bin',gzipSync(JSON.stringify(land),{level:9}));
fs.writeFileSync('dist/data/east-coast-source.bin',compressed);
fs.writeFileSync('dist/data/east-coast-source.json',JSON.stringify({provider:'OpenStreetMap contributors',timestamp:data.osm3s.timestamp_osm_base,coordinateSystem:'WGS84',query:'way["natural"="coastline"](29.3,120.6,32.2,123.6);out meta geom;',endpoint:'https://overpass-api.de/api/interpreter',license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',definition:'https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline',sourceDownload:'data/east-coast-source.bin',sourceCompression:'gzip JSON',sha256:createHash('sha256').update(raw).digest('hex'),ways:data.elements.length,vertices:data.elements.reduce((n,w)=>n+w.geometry.length,0),landPolygons:land.features.length,processingBounds:box},null,2));
console.log({ways:data.elements.length,polygons:land.features.length,vertices:data.elements.reduce((n,w)=>n+w.geometry.length,0)});
