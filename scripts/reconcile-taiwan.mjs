import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {merge,mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {reconcileTaiwan} from './taiwan-topology.mjs';
import assert from 'node:assert/strict';
import {reviewedPaths} from './reconcile-river-boundaries.mjs';

const data=readData('display-boundaries.json'),code=710000;
const rules=JSON.parse(fs.readFileSync(new URL('additional-sources/water/boundary-reaches.json',import.meta.url))),riverPaths=reviewedPaths(data.subdivisions,rules);
const repaired=reconcileTaiwan(readData('taiwan-regions.json').features);
const byCode=new Map(repaired.map(f=>[f.properties.adcode,f]));
data.subdivisions.features=data.subdivisions.features.map(f=>byCode.get(f.properties.adcode)||f);
assert.deepEqual(reviewedPaths(data.subdivisions,rules),riverPaths,'Reviewed river paths must remain exact');
const topo=topology({regions:data.subdivisions}),regions=topo.objects.regions;
data.provinces.features.find(f=>f.properties.adcode===code).geometry=merge(topo,regions.geometries.filter(g=>g.properties.provinceCode===code));
const same=(a,b)=>a.properties.provinceCode===b.properties.provinceCode;
const pref=g=>g.properties.level==='taiwan-region'||g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
data.boundaries={province:mesh(topo,regions,(a,b)=>a===b||!same(a,b)),prefecture:mesh(topo,regions,(a,b)=>a!==b&&same(a,b)&&(pref(a)||pref(b))),other:mesh(topo,regions,(a,b)=>a!==b&&same(a,b)&&!pref(a)&&!pref(b))};
const root=new URL('../dist/data/',import.meta.url),serialized=Buffer.from(JSON.stringify(data)),compressed=gzipSync(serialized,{level:9}),parts=[];
for(let offset=0,index=0;offset<compressed.length;offset+=4*1024*1024,index++){
 const name='display-boundaries.'+String(index).padStart(2,'0')+'.bin';parts.push(name);fs.writeFileSync(new URL(name,root),compressed.subarray(offset,offset+4*1024*1024));
}
fs.writeFileSync(new URL('display-boundaries.parts.json',root),JSON.stringify({compression:'gzip',parts,compressedBytes:compressed.length,uncompressedBytes:serialized.length,sha256:createHash('sha256').update(serialized).digest('hex')},null,2));
const riverReport=readData('river-boundary-report.json');
riverReport.administrativeSha256=createHash('sha256').update(JSON.stringify(data.subdivisions)).digest('hex');
fs.writeFileSync(new URL('river-boundary-report.json',root),JSON.stringify(riverReport,null,2)+'\n');
console.log('Reconciled shared Taiwan edges without closing coastal channels.');
