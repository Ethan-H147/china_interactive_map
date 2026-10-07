import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createPlaceSearch} from '../dist/place-search.mjs';
const base='dist/data/south-america/argentina-local/';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const index=read(base+'index.bin'),first=read('dist/data/south-america/argentina-first.bin');
assert.equal(index.records.length,527);assert.equal(Object.keys(index.groups).length,24);
assert.equal(index.records.filter(r=>r.kind==='Partido').length,135);assert.equal(index.records.filter(r=>r.kind==='Department').length,377);assert.equal(index.records.filter(r=>r.kind==='Comuna').length,15);
assert.equal(new Set(index.records.map(r=>r.id)).size,527);
const pointInRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const inside=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>pointInRing(p,poly[0])&&!poly.slice(1).some(r=>pointInRing(p,r)));
for(const parent of first.records){const payload=read(base+parent.id+'.bin'),group=index.groups[parent.id];assert.equal(payload.records.length,group.count);assert.equal(payload.regions.features.length,group.count);assert.ok(group.bytes<310000);assert.ok(payload.lines.features[0].geometry.coordinates.length,'Internal boundaries must exist');
 for(const feature of payload.regions.features){const r=feature.properties;assert.equal(r.parent,parent.id);assert.equal(r.level,2);assert.ok(inside(r.center,feature.geometry),r.en+' label outside polygon');assert.ok(r.bounds.flat().every(Number.isFinite));assert.equal(r.kind,parent.id==='AR-06'?'Partido':parent.id==='AR-02'?'Comuna':'Department');}
}
assert.ok(fs.statSync(base+'index.bin').size<35000);
const search=createPlaceSearch([...first.records,...index.records]);assert.equal(search('La Matanza')[0].kind,'Partido');assert.equal(search('CABA')[0].id,'AR-02');assert.equal(search('Buenos Aires')[0].id,'AR-06');assert.equal(search('Comuna 15')[0].id,'AR-02105');assert.equal(search('Ushuaia')[0].parent,'AR-94');assert.ok(search('Capital').filter(r=>r.en==='Capital').length>1,'Same-name departments retain distinct parents');
const provenance=JSON.parse(fs.readFileSync(base+'sources.json'));assert.equal(provenance.originalCount,529);assert.equal(provenance.omitted.length,2);assert.match(provenance.source,/Geográfico Nacional/);
console.log('527 official divisions, correct departamentos/partidos/comunas, 24 lazy province files, distinct CABA, interior label placement, parent-aware search and download budgets passed.');
