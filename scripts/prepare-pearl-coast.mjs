import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
const compressed=fs.readFileSync('scripts/additional-sources/pearl-coast/osm-coast.bin'),raw=gunzipSync(compressed),data=JSON.parse(raw);
const box=[112.95,21.65,115.60,24.10],fc=features=>({type:'FeatureCollection',features});
const line=coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}});
const lines=data.elements.map(e=>line(e.geometry.map(p=>[p.lon,p.lat]))),left=[];
const inside=([x,y])=>x>box[0]&&x<box[2]&&y>box[1]&&y<box[3];
for(const f of lines)for(let i=1;i<f.geometry.coordinates.length;i++){
  const a=f.geometry.coordinates[i-1],b=f.geometry.coordinates[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<.00002||!inside(a)||!inside(b))continue;
  left.push([(a[0]+b[0])/2-dy/length*.000001,(a[1]+b[1])/2+dx/length*.000001]);break;
}
lines.push(line([[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]]));
const output=await mapshaper.applyCommands('-i coast.json -clip bbox='+box.join(',')+' -polygons -o out.json format=geojson geojson-type=FeatureCollection',{'coast.json':fc(lines)});
const polygons=JSON.parse(output['out.json']);
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const contains=(f,p)=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const land=fc(polygons.features.filter(f=>left.some(p=>contains(f,p))));
for(const p of [[113.723,21.942],[114.270,22.044],[113.815,22.131],[114.65,22.576],[114.631,22.615],[113.603,22.637],[114.90,22.68]])assert(land.features.some(f=>contains(f,p)),'Missing named island or mainland '+p);
for(const p of [[113.78,21.85],[114.10,21.90],[115.0,22.4],[113.8,22.4]])assert(!land.features.some(f=>contains(f,p)),'Sea classified as land '+p);
fs.writeFileSync('dist/data/pearl-coast-land.bin',gzipSync(JSON.stringify(land),{level:9}));
fs.writeFileSync('dist/data/pearl-coast-source.bin',compressed);
fs.writeFileSync('dist/data/pearl-coast-source.json',JSON.stringify({provider:'OpenStreetMap contributors',query:'way["natural"="coastline"](21.65,112.95,24.10,115.60);out meta geom;',endpoint:'https://overpass-api.de/api/interpreter',coordinateSystem:'WGS84',timestamp:data.osm3s.timestamp_osm_base,license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',definition:'https://wiki.openstreetmap.org/wiki/Tag:natural%3Dcoastline',sourceDownload:'data/pearl-coast-source.bin',sourceCompression:'gzip JSON',sha256:createHash('sha256').update(raw).digest('hex'),ways:data.elements.length,vertices:data.elements.reduce((n,w)=>n+w.geometry.length,0),landPolygons:land.features.length,processingBounds:box},null,2));
console.log({ways:data.elements.length,landPolygons:land.features.length});
