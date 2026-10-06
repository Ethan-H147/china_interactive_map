import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {chooseProfile,decodeDisplay} from '../dist/china-boundary-profile.mjs';
const root='dist/data/china-detail/',meta=JSON.parse(fs.readFileSync(root+'display.parts.json')),bytes=gunzipSync(Buffer.concat(meta.parts.map(p=>fs.readFileSync(root+p)))),digest=b=>createHash('sha256').update(b).digest('hex');
assert.equal(bytes.length,meta.uncompressedBytes);assert.equal(digest(bytes),meta.sha256);
const next=await decodeDisplay(JSON.parse(bytes),meta.format),old=readData('display-boundaries.json'),report=JSON.parse(fs.readFileSync(root+'source.json')),changed=new Set(report.changedRegions);
assert.equal(changed.size,301);assert.equal(next.subdivisions.features.length,old.subdivisions.features.length);assert.equal(next.provinces.features.length,34);
const oldByCode=new Map(old.subdivisions.features.map(f=>[f.properties.adcode,f]));
const edges=g=>{const list=[];const walk=c=>{if(typeof c[0]?.[0]==='number'){for(let i=1;i<c.length;i++){const a=c[i-1].join(','),b=c[i].join(',');if(a!==b)list.push(a<b?a+'|'+b:b+'|'+a);}}else c.forEach(walk);};walk(g.coordinates);return digest(list.sort().join('\n'));};
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
for(const f of next.subdivisions.features){const before=oldByCode.get(f.properties.adcode);assert(before);assert.equal(f.properties.name,before.properties.name);assert.equal(f.properties.provinceCode,before.properties.provinceCode);if(!changed.has(f.properties.adcode)){assert.deepEqual(f.properties,before.properties);assert.equal(edges(f.geometry),edges(before.geometry),'Protected boundary changed '+f.properties.adcode);}for(const p of polygons(f.geometry))for(const r of p){assert(r.length>=4);assert.deepEqual(r[0],r.at(-1));assert(r.every(c=>c.length===2&&c.every(Number.isFinite)));}}
for(const f of next.provinces.features)assert.equal(edges(f.geometry),edges(old.provinces.features.find(p=>p.properties.adcode===f.properties.adcode).geometry),'Province and national extents remain exact');
for(const [name,sha]of Object.entries(report.archiveFiles))assert.equal(digest(fs.readFileSync('dist/data/'+name)),sha,'Original dataset was modified '+name);
const fc=features=>({type:'FeatureCollection',features});
for(const {province:code}of report.regions){
 const base=fc(old.subdivisions.features.filter(f=>f.properties.provinceCode===code)),candidate=fc(next.subdivisions.features.filter(f=>f.properties.provinceCode===code));
 const result=await mapshaper.applyCommands('-i base.json -erase candidate.json -o out.json format=geojson geojson-type=FeatureCollection',{'base.json':JSON.stringify(base),'candidate.json':JSON.stringify(candidate)});
 const missing=JSON.parse(result['out.json']).features;const area=g=>polygons(g).reduce((s,p)=>s+p.reduce((a,r,i)=>a+(i?-1:1)*Math.abs(r.slice(1).reduce((n,b,j)=>n+(r[j][0]-r[0][0])*(b[1]-r[0][1])-(b[0]-r[0][0])*(r[j][1]-r[0][1]),0)/2),0),0);
 const missingArea=missing.reduce((s,f)=>s+area(f.geometry),0);if(missingArea>=1e-8){fs.writeFileSync('artifacts/china-gap-'+code+'.json',JSON.stringify(fc(missing)));console.log('Coverage gap',code,missingArea,missing.map(f=>[f.properties.adcode,area(f.geometry)]).slice(0,10));}assert(missingArea<1e-8,'New gaps in province '+code);
}
assert(meta.compressedBytes<report.originalCompressedBytes,'Finer topology must download less than the old polygon format');
assert(report.regions.every(r=>r.displayVertices>r.originalVertices));
assert.equal(chooseProfile('?china-boundaries=original',{getItem:()=> 'detail'}),'original');assert.equal(chooseProfile('',{getItem:()=> 'original'}),'original');assert.equal(chooseProfile('?china-boundaries=untrusted',{getItem(){throw Error();}}),'detail');
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage blocked');}});assert.equal((await import('../dist/china-boundary-profile.mjs?blocked-storage')).profile,'detail');delete globalThis.localStorage;
const motion=JSON.parse(gunzipSync(fs.readFileSync(root+'china-motion.bin')));assert(motion.prefectures.features.some(f=>f.properties.adcode===510100));assert(motion['prefectures-fragments'].features.length>0);assert(motion['prefecture-boundaries'].features.length>0);
console.log('301 finer prefectures; protected coastlines, province/national borders, codes and original file hashes retained; coverage, matching motion, reversible profiles and smaller downloads passed.');
