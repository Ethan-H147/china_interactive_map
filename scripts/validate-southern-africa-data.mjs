import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const root='dist/data/southern-africa',read=(c,n)=>JSON.parse(gunzipSync(fs.readFileSync(root+'/'+c+'/'+n))),countries=['south-africa','eswatini','lesotho'];
const expected={'south-africa':[9,52,205],eswatini:[4,59,0],lesotho:[10,76,0]};
function coordinateCheck(g){const walk=c=>{if(typeof c[0]==='number'){assert(c.every(Number.isFinite));assert(c[0]>16&&c[0]<34&&c[1]>-35&&c[1]<-21);}else c.forEach(walk);};walk(g.coordinates);}
function ringContains(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function contains(p,g){return(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>ringContains(p,poly[0])&&!poly.slice(1).some(r=>ringContains(p,r)));}
for(const country of countries){
 const cat=read(country,'catalogue.bin'),first=read(country,'first.bin'),context=read(country,'context.bin'),ids=new Map(cat.records.map(r=>[r.id,r]));
 assert.equal(ids.size,cat.records.length,'Unique hierarchical IDs');
 for(let l=1;l<=3;l++)assert.equal(cat.records.filter(r=>r.level===l).length,expected[country][l-1]);
 assert.equal(first.regions.features.length,expected[country][0]);
 for(const r of cat.records){assert(r.en&&r.local&&r.kind);assert(r.areaKm2>0);assert(r.center.length===2&&r.bounds.length===2);if(r.level>1){assert(ids.has(r.parent));assert.equal(ids.get(r.parent).level,r.level-1);}}
 const inspect=payload=>{for(const f of payload.regions.features){assert(ids.has(f.properties.id));coordinateCheck(f.geometry);}for(const f of payload.boundaries.features){assert(f.properties.owners.length>=2,'Only shared edges; no coastline outlines');assert(f.properties.owners.every(id=>ids.has(id)));coordinateCheck(f.geometry);}};
 inspect(first);for(const [parent,c] of Object.entries(cat.chunks)){assert(ids.has(parent));const payload=read(country,c.file);assert.equal(payload.regions.features.length,c.count);assert.deepEqual(payload.regions.features.map(f=>f.properties.id).sort(),cat.records.filter(r=>r.parent===parent).map(r=>r.id).sort());inspect(payload);}
 for(const f of context.features)coordinateCheck(f.geometry);
 if(country!=='south-africa')for(const f of context.features){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;assert(polygons.every(poly=>poly.length===1),'Landlocked country silhouettes must not preserve digitization gaps as holes');}
 if(country==='south-africa'){assert(context.features.every(f=>!contains([28,-29.6],f.geometry)),'Lesotho enclave remains a hole');assert(context.features.every(f=>!contains([31.5,-26.5],f.geometry)),'Eswatini is excluded');assert(context.features.some(f=>contains([28.2,-26.2],f.geometry)),'Johannesburg remains South African land');const metros=cat.records.filter(r=>r.kind==='Metropolitan municipality');assert.equal(metros.length,8);assert(metros.every(r=>!cat.chunks[r.id]),'Metros are terminal and not duplicated as locals');}
 console.log(country,cat.counts,Object.keys(cat.chunks).length,'parent geometry chunks');
}
assert.equal(read('eswatini','international.bin').features.length,0);assert.equal(read('lesotho','international.bin').features.length,0);
const lines=read('south-africa','international.bin');assert(lines.features.length>0);for(const f of lines.features)coordinateCheck(f.geometry);
const edges=new Set();for(const f of lines.features){const paths=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;for(const p of paths)for(let i=1;i<p.length;i++){const a=p[i-1].join(','),b=p[i].join(',');if(a===b)continue;const key=[a,b].sort().join('|');assert(!edges.has(key),'International borders are drawn once');edges.add(key);assert(p[i][1]>-31,'Southern coast remains unoutlined');}}
console.log('Southern Africa geography, hierarchy, enclave, coastline and lazy chunk checks passed.');
