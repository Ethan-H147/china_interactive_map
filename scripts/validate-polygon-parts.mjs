import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {GeoJSONVT} from '@maplibre/geojson-vt';
import {classifyRings} from '@maplibre/maplibre-gl-style-spec';
import earcut from 'earcut';
import {polygonParts} from '../dist/polygon-parts.mjs';

const read=(country,name)=>JSON.parse(gunzipSync(fs.readFileSync(`dist/data/europe/${country}/${name}.bin`)));
const collection=features=>({type:'FeatureCollection',features});
const polygons=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
// Preserve every vertex, hole, property and identity, without changing source data.
for(const country of ['spain','france','italy','united-kingdom']){
 const bundle=read(country,'all');
 for(const original of [read(country,'context'),...bundle.levels.map(l=>l.regions)]){
  const before=JSON.stringify(original),parts=polygonParts(original);
  assert.equal(JSON.stringify(original),before);
  for(const feature of original.features){
   const copies=parts.features.filter(p=>p.properties===feature.properties);
   assert.deepEqual(copies.map(p=>p.geometry.coordinates),polygons(feature));
   assert(copies.every(p=>p.id===feature.id&&p.geometry.type==='Polygon'));
  }
 }
}
const galicia=read('spain','all').levels[0].regions.features.find(f=>f.properties.id==='ES-A-12');
const options={extent:8192,buffer:2048,tolerance:0,maxZoom:16};
const oldTiles=new GeoJSONVT(galicia,options),fixedTiles=new GeoJSONVT(polygonParts(collection([galicia])),options);
const project=([lng,lat],z)=>[(lng+180)/360*2**z,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z];
function filled(index,point,z){
 const [tx,ty]=project(point,z),x=Math.floor(tx),y=Math.floor(ty),p=[(tx-x)*8192,(ty-y)*8192];
 for(const feature of index.getTile(z,x,y)?.features||[]){
  for(const polygon of classifyRings(feature.geometry.map(r=>r.map(([x,y])=>({x,y}))),500)){
   const vertices=[],holes=[];for(const [i,ring] of polygon.entries()){if(i)holes.push(vertices.length/2);for(const q of ring)vertices.push(q.x,q.y);}
   const triangles=earcut(vertices,holes,2);
   const at=i=>vertices.slice(triangles[i]*2,triangles[i]*2+2);
   const side=(a,b)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
   for(let i=0;i<triangles.length;i+=3){const a=at(i),b=at(i+1),c=at(i+2),s=[side(a,b),side(b,c),side(c,a)];if(s.every(v=>v>=0)||s.every(v=>v<=0))return true;}
  }
 }
 return false;
}
assert.equal(filled(oldTiles,[-8,43],4),false,'Fixture reproduces mainland Galicia disappearing at zoom 4');
let checks=0;
for(let z=3;z<=10;z++)for(const point of [[-8,43],[-7.8,42.7],[-7.5,42.3]]){assert(filled(fixedTiles,point,z),`Galicia stays filled at ${point}, zoom ${z}`);checks++;}
// Holes must still exclude water/enclaves; splitting must never turn a hole into an island.
const ring=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d],[a,b]];
const holed={type:'Feature',id:7,properties:{id:'test'},geometry:{type:'MultiPolygon',coordinates:[[ring(0,0,10,10),ring(3,3,7,7).reverse()],[ring(20,0,25,5)]]}};
const holeTiles=new GeoJSONVT(polygonParts(collection([holed])),options);
assert(filled(holeTiles,[1,1],5));assert(!filled(holeTiles,[5,5],5));assert(filled(holeTiles,[22,2],5));
console.log(`Polygon rendering passed: ${checks} Galicia samples across zooms 3–10; all European bundled vertices, holes and IDs preserved.`);
