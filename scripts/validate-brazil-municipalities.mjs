import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {lineData,lineSourceOptions} from '../dist/adaptive-lines.mjs';
import {GeoJSONVT} from '@maplibre/geojson-vt';
const base='dist/data/south-america/brazil-local/',read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const index=read(base+'index.bin'),first=read('dist/data/south-america/brazil-first.bin');
assert.equal(index.records.length,5571);assert.equal(new Set(index.records.map(r=>r.id)).size,5571);assert.equal(Object.keys(index.groups).length,27);
assert.equal(index.records.filter(r=>r.kind==='Municipality').length,5569);assert.equal(index.records.filter(r=>r.kind==='State district').length,1);assert.equal(index.records.filter(r=>r.kind==='Federal district').length,1);
assert(!('regions' in index),'The national index contains no geometry');assert(fs.statSync(base+'index.bin').size<350000);
const pointInRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const inside=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>pointInRing(p,poly[0])&&!poly.slice(1).some(r=>pointInRing(p,r)));
let total=0;
for(const parent of first.records){
 const data=read(base+parent.id+'.bin'),group=index.groups[parent.id],ids=new Set(data.records.map(r=>r.id));total+=data.records.length;
 assert.equal(data.records.length,group.count);assert.equal(data.regions.features.length,group.count);assert.equal(fs.statSync(base+group.file).size,group.bytes);assert(group.bytes<3000000&&group.decodedBytes<18000000);
 for(const r of data.records){assert.equal(r.level,2);assert.equal(r.parent,parent.id);assert.equal(r.code.slice(0,2),parent.id.slice(3));assert(r.bounds.flat().every(Number.isFinite));assert(!r.population&&!r.area&&!r.gdp,'Municipal statistics are not introduced');}
 for(const f of data.regions.features){const r=data.records.find(r=>r.id===f.id);assert.deepEqual(Object.keys(f.properties),['id']);assert(inside(r.center,f.geometry),r.en+' label must lie inside its municipality');}
 for(const f of data.lines.features){assert(f.properties.regionIds.length>=2,'Never draw unshared coastline or state perimeter');assert(f.properties.regionIds.every(id=>ids.has(id)));}
 if(parent.id!=='BR-53')assert(data.lines.features.length,'State needs internal municipal borders');
}
assert.equal(total,5571);assert.equal(index.groups['BR-31'].count,853);assert.equal(index.groups['BR-35'].count,645);assert.equal(index.groups['BR-51'].count,142,'Include Boa Esperança do Norte, installed in 2025');
const search=createPlaceSearch([...first.records,...index.records]);
assert.equal(search('3550308')[0].en,'São Paulo');assert.equal(search('Boa Esperanca do Norte')[0].id,'BR-5101837');assert.equal(search('Fernando de Noronha')[0].kind,'State district');assert.equal(search('Brasilia')[0].kind,'Federal district');assert(search('Santa Helena').filter(r=>r.en==='Santa Helena').length>1,'Same-name municipalities retain distinct parents');
const lines=lineData(read(base+'BR-31.bin').lines);
const count=tolerance=>{const tiles=new GeoJSONVT(lines,{maxZoom:18,extent:8192,buffer:128,tolerance:tolerance*8192/512});let points=0;for(let x=0;x<16;x++)for(let y=0;y<16;y++)points+=tiles.getTile(4,x,y)?.features.reduce((n,f)=>n+f.geometry.reduce((s,p)=>s+p.length,0),0)||0;return points;};
const detailed=count(0),overview=count(lineSourceOptions.tolerance);assert(overview<detailed*.35,'Overview tiles must discard subpixel detail');
const sources=JSON.parse(fs.readFileSync(base+'sources.json'));assert.equal(sources.referenceYear,2025);assert.equal(sources.excluded.length,2);assert.equal(sources.displayedCount,5571);
console.log('5,569 municipalities plus Brasília and Fernando de Noronha, 27 bounded state files, no national geometry, correct parents/interior labels, coastal-edge exclusion, search and zoom simplification passed.');
console.log('Minas Gerais zoom-4 line points:',detailed,'→',overview);
