import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {malaysiaFlags} from '../dist/malaysia-flags.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {validate,fromHash,hashFor} from '../dist/view-state.mjs';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/southeast-asia/'+file+'.bin')));
const my=read('malaysia-catalogue'),first=read('malaysia-first'),sg=read('singapore-catalogue');
assert.equal(first.features.length,16);assert.equal(my.records.filter(r=>r.kind==='State').length,13);assert.equal(my.records.filter(r=>r.kind==='Federal territory').length,3);assert.equal(my.records.filter(r=>r.level===2).length,156);
assert.equal(new Set(my.records.map(r=>r.id)).size,my.records.length);
const index=new Map(my.records.map(r=>[r.id,r]));
function geometry(f){assert(['Polygon','MultiPolygon'].includes(f.geometry.type));const visit=c=>{if(typeof c[0]==='number'){assert(c.length===2);assert(c.every(Number.isFinite));assert(c[0]>99&&c[0]<120&&c[1]>0&&c[1]<8);}else c.forEach(visit);};visit(f.geometry.coordinates);const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const p of polygons)for(const ring of p){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}}
for(const f of first.features){geometry(f);assert(index.has(f.properties.id));assert(malaysiaFlags[f.properties.id]);}
const detailed=[];
for(const [id,chunk] of Object.entries(my.chunks)){assert(index.has(id));const bytes=fs.readFileSync('dist/data/southeast-asia/'+chunk.file);assert(bytes.length<200000,'Each state detail fits a small mobile download');const collection=JSON.parse(gunzipSync(bytes));assert.equal(collection.features.length,chunk.count);for(const f of collection.features){geometry(f);assert.equal(f.properties.parent,id);assert.equal(index.get(f.properties.id).parent,id);detailed.push(f);}}
assert.equal(detailed.length,156);for(const id of ['MY-09','MY-14','MY-15','MY-16'])assert(!my.chunks[id],'No fake district under an unpartitioned first-level unit');
const query=createPlaceSearch(my.records);assert.equal(query('Kuala Lumpur')[0].id,'MY-14');assert.equal(query('Melaka')[0].id,'MY-04');assert.equal(query('Johor Bahru')[0].parent,'MY-01');
assert.equal(Object.keys(malaysiaFlags).length,16);const flags=JSON.parse(fs.readFileSync('dist/data/malaysia-flag-sources.json')).flags;
for(const f of Object.values(flags)){const bytes=fs.readFileSync('dist/'+f.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert(f.license);assert(f.page.startsWith('https://commons.wikimedia.org/'));}
assert.equal(sg.records.length,61);assert.equal(sg.records.filter(r=>r.level===1).length,5);assert.equal(sg.records.filter(r=>r.level===2).length,55);assert.equal(sg.records[0].id,'SG');assert.equal(Object.keys(sg.chunks).length,5);read('singapore-first').regions.features.forEach(geometry);
// Official Singapore coastal outlines must not accidentally include Malaysian
// backdrop polygons, recreational areas or the inset annotation frame.
const mainland=read('singapore-context').features[0];assert(mainland.geometry.coordinates.length>10,'Offshore islands are preserved');
for(const country of ['malaysia','singapore']){const value={v:1,country,center:country==='malaysia'?[109,4]:[103.83,1.33],zoom:8,selection:country==='malaysia'?'MY-01-02':'SG',mode:2,layers:{'my-second-layer':false,'sg-label-layer':true}};assert.deepEqual(fromHash(hashFor(value)),validate(value));}
console.log('Malaysia: 13 states, 3 territories, 156 districts, flags, district ownership, geometry and bounded chunks. Singapore: separate coastal outline and saved views.');
