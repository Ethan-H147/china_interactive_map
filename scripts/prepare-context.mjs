import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
const manifest=JSON.parse(fs.readFileSync('dist/data/motion-boundaries.parts.json'));
const data=JSON.parse(gunzipSync(Buffer.concat(manifest.parts.map(name=>fs.readFileSync('dist/data/'+name)))));
// A logical fill includes every fragment source, not only ordinary polygons.
const china={type:'FeatureCollection',features:[...data.provinces.features,...data['provinces-fragments'].features]};
const codes=new Set(china.features.map(f=>f.properties.adcode));
if(codes.size!==34||!codes.has(220000))throw Error('Incomplete China context');
for(const [country,key] of [['china','provinces'],['korea','korea-portal'],['mongolia','mongolia-portal']])fs.writeFileSync('dist/data/'+country+'-context.bin',gzipSync(JSON.stringify(country==='china'?china:data[key])));

for(const country of ['china','korea','mongolia']){
 const subset=Object.fromEntries(Object.entries(data).filter(([id])=>country==='china'?!id.startsWith('korea-')&&!id.startsWith('mongolia-'):id.startsWith(country+'-')));
 fs.writeFileSync('dist/data/'+country+'-motion.bin',gzipSync(JSON.stringify(subset)));
}
