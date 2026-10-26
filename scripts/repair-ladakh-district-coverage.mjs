import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {alignLadakhDistrictCoverage} from './india-district-coverage.mjs';

const root='dist/data/europe/india/',file=root+'second/IN-LA.bin',first=load(root+'first.bin'),mask=first.regions.features.find(f=>f.properties.id==='IN-LA'),before=load(file);
const {regions,report}=alignLadakhDistrictCoverage(before.regions,mask);
if(report.restoredAreaKm2<.001){console.log('Ladakh district coverage already follows its mask.');process.exit(0);}
const data={...before,regions,boundaries:sharedBorders(regions)},json=JSON.stringify(data),bytes=gzipSync(json,{level:9});fs.writeFileSync(file,bytes);
const catalogue=load(root+'catalogue.bin'),statistics=load(root+'statistics.json');
for(const f of regions.features){
 const r=catalogue.records.find(r=>r.id===f.properties.id);r.bounds=geographicBounds(f.geometry);r.areaKm2=geographicAreaKm2(f.geometry);
 statistics.regions['india:'+r.id].area.value=r.areaKm2;
}
Object.assign(catalogue.chunks['IN-LA'],{bytes:bytes.length,decodedBytes:Buffer.byteLength(json)});
fs.writeFileSync(root+'catalogue.bin',gzipSync(JSON.stringify(catalogue),{level:9}));fs.writeFileSync(root+'statistics.json',JSON.stringify(statistics)+'\n');
report.parentSha256=createHash('sha256').update(fs.readFileSync(root+'first.bin')).digest('hex');
fs.writeFileSync(root+'ladakh-district-coverage.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
