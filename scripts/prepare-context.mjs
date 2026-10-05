import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
const manifest=JSON.parse(fs.readFileSync('dist/data/motion-boundaries.parts.json'));
const data=JSON.parse(gunzipSync(Buffer.concat(manifest.parts.map(name=>fs.readFileSync('dist/data/'+name)))));
for(const [country,key] of [['china','provinces'],['korea','korea-portal'],['mongolia','mongolia-portal']])fs.writeFileSync('dist/data/'+country+'-context.bin',gzipSync(JSON.stringify(data[key])));

for(const country of ['china','korea','mongolia']){
 const subset=Object.fromEntries(Object.entries(data).filter(([id])=>country==='china'?!id.startsWith('korea-')&&!id.startsWith('mongolia-'):id.startsWith(country+'-')));
 fs.writeFileSync('dist/data/'+country+'-motion.bin',gzipSync(JSON.stringify(subset)));
}
