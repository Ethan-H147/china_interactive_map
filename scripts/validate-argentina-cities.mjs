import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {cities} from './argentina-city-list.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
const base='dist/data/south-america/argentina-cities/';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const index=read(base+'index.bin'),shapes=new Map();
assert.equal(index.records.length,80);assert.equal(new Set(index.records.map(r=>r.id)).size,80);
assert.deepEqual(index.records.map(r=>r.en),cities.map(c=>c.name));
assert.equal(index.records.filter(r=>r.boundaryAvailable).length,78);
assert.deepEqual(index.records.filter(r=>!r.boundaryAvailable).map(r=>r.en),['Santiago del Estero','La Banda']);
const pointInRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const inside=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>pointInRing(p,poly[0])&&!poly.slice(1).some(r=>pointInRing(p,r)));
let bytes=0;
for(const [parent,group] of Object.entries(index.groups)){
 const payload=read(base+group.file);bytes+=group.bytes;
 assert.equal(payload.regions.features.length,group.count);assert.ok(group.bytes<150000);
 for(const f of payload.regions.features){assert.equal(f.properties.parent,parent);assert.equal(f.properties.source,'IGN');assert.ok(['Municipality','Autonomous city'].includes(f.properties.kind));assert.ok(inside(f.properties.center,f.geometry),f.properties.en+' center outside municipal territory');assert.ok(!shapes.has(f.id));shapes.set(f.id,f);}
}
assert.equal(shapes.size,new Set(index.records.filter(r=>r.boundaryAvailable).map(r=>r.boundaryId)).size);
for(const r of index.records){assert.ok(r.bounds.flat().every(Number.isFinite));assert.ok(r.center.every(Number.isFinite));if(r.boundaryAvailable){assert.ok(shapes.has(r.boundaryId));assert.ok(inside(r.center,shapes.get(r.boundaryId).geometry));}else assert.equal(r.boundaryId,undefined);}
const named=name=>index.records.find(r=>r.en===name);
for(const r of index.records)assert.ok(r.point?.length===2&&r.point.every(Number.isFinite),'City point missing: '+r.en);
assert.notDeepEqual(named('Banfield').point,named('Temperley').point,'Shared municipality must not stack city dots at the municipal centroid');
assert.equal(named('Banfield').boundaryId,named('Temperley').boundaryId);
assert.equal(named('Banfield').boundaryId,named('Lomas de Zamora').boundaryId);
assert.equal(named('Banfield').boundaryName,'Lomas de Zamora');
assert.equal(named('Bernal').boundaryId,named('Quilmes').boundaryId);
assert.equal(named('Gregorio de Laferrère').boundaryName,'La Matanza');
assert.equal(named('Mar del Plata').boundaryName,'General Pueyrredón');
assert.equal(createPlaceSearch(index.records)('Banfield')[0].id,named('Banfield').id);
assert.ok(fs.statSync(base+'index.bin').size<10000);assert.ok(bytes<300000);
assert.ok(!fs.existsSync(base+'AR-86.bin'),'Pending province must not contain substituted city outlines');
const provenance=JSON.parse(fs.readFileSync(base+'sources.json'));assert.equal(provenance.count,80);assert.match(provenance.method,/Only IGN municipal/);assert.ok(!provenance.localitySource);
console.log('80 searchable cities, 78 matched entries, '+shapes.size+' unique IGN municipal jurisdictions, shared boundaries, two explicit pending cities, interior labels and '+bytes+' bytes of province-deferred geometry passed.');
