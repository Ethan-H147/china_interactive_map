import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {divisionBorders,municipalBorders} from './south-america-borders.mjs';
import {uruguayBorderTopology,uruguayOutlineMethod} from './uruguay-border-topology.mjs';

const base='dist/data/south-america/';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const write=(file,payload)=>{const bytes=gzipSync(JSON.stringify(payload),{level:9});fs.writeFileSync(file,bytes);return bytes.length;};
const method='Draw shared internal division boundaries; selection uses the same lines. Municipal jurisdiction lines exclude the parent exterior. Land polygons and record metadata remain unchanged.';
async function update(file,parent){
 const payload=read(file),original=JSON.stringify({records:payload.records,regions:payload.regions});
 payload.lines=parent?municipalBorders(payload.regions,parent):divisionBorders(file.endsWith('uruguay-first.bin')?await uruguayBorderTopology(payload.regions):payload.regions);
 const bytes=write(file,payload),saved=read(file);
 assert.equal(JSON.stringify({records:saved.records,regions:saved.regions}),original,'Outline updates must preserve land geometry and records');
 return{bytes,decodedBytes:Buffer.byteLength(JSON.stringify(payload))};
}
for(const country of ['brazil','argentina','uruguay']){
 const sizes=await update(base+country+'-first.bin');
 const file=base+country+'-sources.json',source=JSON.parse(fs.readFileSync(file));
 fs.writeFileSync(file,JSON.stringify({...source,...sizes,outlineMethod:country==='uruguay'?uruguayOutlineMethod:method},null,2)+'\n');
}
const ddd=await update(base+'brazil-ddd.bin'),dddFile=base+'brazil-ddd-sources.json';
fs.writeFileSync(dddFile,JSON.stringify({...JSON.parse(fs.readFileSync(dddFile)),...ddd,outlineMethod:method},null,2)+'\n');
const provinces=read(base+'argentina-first.bin').regions.features;
for(const folder of ['argentina-local/','argentina-cities/']){
 const index=read(base+folder+'index.bin');
 for(const [province,group] of Object.entries(index.groups))group.bytes=(await update(base+folder+group.file,folder==='argentina-cities/'?provinces.find(p=>p.properties.id===province):null)).bytes;
 write(base+folder+'index.bin',index);
 const file=base+folder+'sources.json',source=JSON.parse(fs.readFileSync(file));
 fs.writeFileSync(file,JSON.stringify({...source,groups:index.groups,outlineMethod:method},null,2)+'\n');
}
console.log('Updated South American boundary lines; verified unchanged land geometry and records in every country and detail file.');
