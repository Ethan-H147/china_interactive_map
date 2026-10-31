import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh,merge} from 'topojson-client';
import {readData} from './read-data.mjs';
import {reconcileRemainingFeatures} from './remaining-seams.mjs';
import {reconcileLangfangFeatures} from './langfang-seams.mjs';

const d=readData('display-boundaries.json'),root='scripts/boundary-sources/langfang';
fs.mkdirSync(root,{recursive:true});
if(!fs.existsSync(root+'/before.bin')){
 const before={provinces:{...d.provinces,features:d.provinces.features.filter(f=>[110000,120000,130000].includes(f.properties.adcode))},subdivisions:{...d.subdivisions,features:d.subdivisions.features.filter(f=>[110000,120000,130000].includes(f.properties.provinceCode))}};
 const bytes=gzipSync(JSON.stringify(before),{level:9});fs.writeFileSync(root+'/before.bin',bytes);
 fs.writeFileSync(root+'/manifest.json',JSON.stringify({source:'Existing atlas DataV boundaries in WGS84 before shared-arc reconciliation. No new survey or administrative-boundary change.',sha256:createHash('sha256').update(bytes).digest('hex')},null,2)+'\n');
}
const result=await reconcileLangfangFeatures(d.subdivisions.features),remaining=await reconcileRemainingFeatures(result.features);d.subdivisions.features=remaining.features;fs.writeFileSync('dist/data/remaining-seams.json',JSON.stringify(remaining.reports,null,2)+'\n');
const t=topology({regions:d.subdivisions}),r=t.objects.regions,same=(a,b)=>a.properties.provinceCode===b.properties.provinceCode,prefecture=g=>g.properties.level==='taiwan-region'||g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
d.provinces.features=d.provinces.features.map(f=>[110000,120000,230000].includes(f.properties.adcode)?{...f,geometry:merge(t,r.geometries.filter(g=>g.properties.provinceCode===f.properties.adcode))}:f);
d.boundaries={province:mesh(t,r,(a,b)=>a===b||!same(a,b)),prefecture:mesh(t,r,(a,b)=>a!==b&&same(a,b)&&(prefecture(a)||prefecture(b))),other:mesh(t,r,(a,b)=>a!==b&&same(a,b)&&!prefecture(a)&&!prefecture(b))};
const json=Buffer.from(JSON.stringify(d)),zip=gzipSync(json,{level:9}),parts=[];
for(let i=0;i<zip.length;i+=4*1024*1024){const name='display-boundaries.'+String(parts.length).padStart(2,'0')+'.bin';parts.push(name);fs.writeFileSync('dist/data/'+name,zip.subarray(i,i+4*1024*1024));}
fs.writeFileSync('dist/data/display-boundaries.parts.json',JSON.stringify({compression:'gzip',parts,compressedBytes:zip.length,uncompressedBytes:json.length,sha256:createHash('sha256').update(json).digest('hex')},null,2));
fs.writeFileSync('dist/data/langfang-seams.json',JSON.stringify({method:'Langfang outline retained, with complete shared arcs used by Beijing and Tianjin districts, province unions and border meshes. National coastlines and other provinces unchanged.',arcs:result.reports},null,2)+'\n');
console.log('Reconciled',result.reports.length,'shared arcs around Langfang and between Beijing and Tianjin.');
