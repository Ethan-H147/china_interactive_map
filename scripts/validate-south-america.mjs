import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {createPlaceSearch} from '../dist/place-search.mjs';
const insideRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const inside=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(rings=>insideRing(p,rings[0])&&!rings.slice(1).some(r=>insideRing(p,r)));
const data={},context=JSON.parse(gunzipSync(fs.readFileSync('dist/data/flight-context.bin')));
for(const feature of context.features)assert.ok(feature.geometry?.coordinates?.length,'Every flight-context country needs renderable geometry: '+feature.properties.country);
for(const [country,count,kind,special] of [['brazil',27,'State','Federal district'],['argentina',24,'Province','Autonomous city'],['uruguay',19,'Department',null]]){
 const bytes=fs.readFileSync('dist/data/south-america/'+country+'-first.bin'),payload=JSON.parse(gunzipSync(bytes));data[country]=payload;
 assert.equal(payload.records.length,count);assert.equal(payload.regions.features.length,count);
 assert.equal(payload.records.filter(p=>p.kind===kind).length,count-(special?1:0));assert.equal(payload.records.filter(p=>p.kind===special).length,special?1:0);
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
assert.equal(createPlaceSearch(data.uruguay.records)('paysandu')[0].id,'UY-PA');
assert.equal(createPlaceSearch(data.uruguay.records)('montevideo')[0].id,'UY-MO');
assert.ok(data.uruguay.records.every(p=>/^UY-[A-Z]{2}$/.test(p.id)));
// Country context must reuse the exact detailed exterior, including all islands.
import {merge,mesh} from 'topojson-client';
for(const [country,payload]of Object.entries(data)){
 const t=topology({regions:payload.regions}),expected=merge(t,t.objects.regions.geometries),actual=context.features.find(f=>f.properties.country===country).geometry;
 const vertexKeys=g=>new Set((g.type==='Polygon'?[g.coordinates]:g.coordinates).flat(2).map(p=>p.join(',')));
 const keys=vertexKeys(expected);assert.ok(vertexKeys(actual).size>0);assert.ok([...vertexKeys(actual)].every(p=>keys.has(p)),'Context adds no displaced exterior vertices: '+country);
}
const joint=topology({regions:{type:'FeatureCollection',features:Object.values(data).flatMap(p=>p.regions.features)}});
const km=paths=>paths.reduce((s,path)=>s+path.slice(1).reduce((n,p,i)=>n+Math.hypot((p[0]-path[i][0])*Math.cos(p[1]*Math.PI/180),p[1]-path[i][1])*111.195,0),0);
for(const [pair,minimum]of [[['brazil','uruguay'],850],[['brazil','argentina'],1100]]){
 const border=mesh(joint,joint.objects.regions,(a,b)=>a!==b&&a.properties.parent!==b.properties.parent&&pair.includes(a.properties.parent)&&pair.includes(b.properties.parent));
 assert.ok(km(border.coordinates)>minimum,'Countries need a shared edge: '+pair.join('–'));
}
// Keep actual water gaps instead of assigning a lake or river to adjacent land.
assert.ok(!Object.values(data).some(p=>p.regions.features.some(f=>inside([-53.2,-32.75],f.geometry))),'Lagoa Mirim water must remain open');
assert.ok(fs.statSync('dist/data/flight-context.bin').size<1_000_000,'Shared developer-mode context must stay below 1 MB');
assert.ok(context.riverBorders.features.length===5,'Official Uruguay River international boundary segments retained');
assert.ok(km(context.riverBorders.features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates))>500,'River boundary remains complete');
console.log('27 Brazilian divisions, 24 Argentine divisions, 19 Uruguay departments, matching neighbor silhouettes, interior labels, shared international topology, preserved water, search and download budgets passed.');
