import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {createPlaceSearch} from '../dist/place-search.mjs';
const insideRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const inside=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(rings=>insideRing(p,rings[0])&&!rings.slice(1).some(r=>insideRing(p,r)));
const data={},context=JSON.parse(gunzipSync(fs.readFileSync('dist/data/flight-context.bin')));
for(const feature of context.features)assert.ok(feature.geometry?.coordinates?.length,'Every flight-context country needs renderable geometry: '+feature.properties.country);
for(const [country,count,kind,special] of [['brazil',27,'State','Federal district'],['argentina',24,'Province','Autonomous city']]){
 const bytes=fs.readFileSync('dist/data/south-america/'+country+'-first.bin'),payload=JSON.parse(gunzipSync(bytes));data[country]=payload;
 assert.equal(payload.records.length,count);assert.equal(payload.regions.features.length,count);
 assert.equal(payload.records.filter(p=>p.kind===kind).length,count-1);assert.equal(payload.records.filter(p=>p.kind===special).length,1);
 assert.equal(new Set(payload.records.map(p=>p.id)).size,count);assert.ok(bytes.length<2_000_000);assert.ok(gunzipSync(bytes).length<6_000_000);
 const silhouette=context.features.find(f=>f.properties.country===country);assert.ok(silhouette,'Missing country silhouette: '+country);
 for(const p of payload.records){assert.equal(p.parent,country);assert.ok(p.bounds.flat().every(Number.isFinite));assert.ok(p.center.every(Number.isFinite));assert.ok(inside(p.center,payload.regions.features.find(f=>f.properties.id===p.id).geometry),'Label lies inside '+p.en);assert.ok(inside(p.center,silhouette.geometry),'Neighbor-country silhouette must cover '+p.en);}
 // A shared mesh requires common arcs, not independently simplified edges.
 const topo=topology({regions:payload.regions}),used=new Map();for(const f of topo.objects.regions.geometries){const arcs=new Set(f.arcs.flat(Infinity).map(a=>a<0?~a:a));for(const arc of arcs)used.set(arc,(used.get(arc)||0)+1);}
 const shared=[...used.values()].filter(n=>n>1);assert.ok(shared.length>=count-4,country+' must retain shared boundaries');
 const source=JSON.parse(fs.readFileSync('dist/data/south-america/'+country+'-sources.json'));assert.equal(source.count,count);assert.equal(source.bytes,bytes.length);
}
assert.equal(createPlaceSearch(data.brazil.records)('sao paulo')[0].id,'BR-35');assert.equal(createPlaceSearch(data.argentina.records)('CABA')[0].id,'AR-02');
assert.equal(createPlaceSearch(data.argentina.records)('Buenos Aires')[0].id,'AR-06');
const caba=data.argentina.records.find(p=>p.id==='AR-02');assert.equal(inside(caba.center,data.argentina.regions.features.find(f=>f.properties.id==='AR-06').geometry),false,'CABA must not overlap Buenos Aires province');
assert.ok(data.argentina.records.find(p=>p.id==='AR-94').bounds[0][1]>-60);
console.log('27 Brazilian divisions, 24 Argentine divisions, complete neighbor silhouettes, interior labels, shared topology, capital separation, search and download budgets passed.');
