import assert from 'node:assert/strict';import fs from 'node:fs';
import {policy,read} from './maine-border-fill.mjs';import {polygons,landIndex} from './geo-index.mjs';
const p=await policy(),backup='artifacts/stability/maine-all-maps-backup/';
const cover=features=>landIndex(features.flatMap(f=>polygons(f.geometry).flat()));
let probes=0,files=0;
for(const country of ['united-states','canada']){
 const base='dist/data/europe/'+country+'/',current=await read(base+'first.bin'),old=fs.existsSync(backup+base+'first.bin')?await read(backup+base+'first.bin'):null,allowed=country==='canada'?'CA-NB':'US-ME';
 if(old){assert.deepEqual(current.regions.features.map(f=>f.properties.id),old.regions.features.map(f=>f.properties.id));
 for(const f of current.regions.features)if(f.properties.id!==allowed)assert.deepEqual(f.geometry,old.regions.features.find(g=>g.properties.id===f.properties.id).geometry,'Unrelated first-level shape '+f.properties.id);
 }
 const inside=cover(current.regions.features),mask=cover(p.countries[country].features);
 for(let x=-68.05;x< -67.15;x+=.003)for(let y=45.27;y<45.97;y+=.003)if(mask([x,y])){assert(inside([x,y]),country+' fills retained lake coordinate '+[x,y]);probes++;}
 const cat=await read(base+'catalogue.bin'),previous=fs.existsSync(backup+base+'catalogue.bin')?await read(backup+base+'catalogue.bin'):null;
 if(previous){
 assert.deepEqual(cat.records.map(({bounds,...r})=>r),previous.records.map(({bounds,...r})=>r),'Reported areas, populations, identities and centers stay unchanged');assert.deepEqual(cat.counts,previous.counts);}
}
for(const entry of (fs.existsSync(backup+'dist/data/europe')?fs.readdirSync(backup+'dist/data/europe',{recursive:true,withFileTypes:true}):[]).filter(e=>e.isFile()&&e.name.endsWith('.bin'))){const file=(entry.parentPath+'/'+entry.name).replaceAll('\\','/'),relative=file.slice(backup.length),before=await read(file),after=await read(relative);
 if(before.regions&&after.regions){assert.deepEqual(after.regions.features.map(f=>f.properties.id),before.regions.features.map(f=>f.properties.id),'Preserve all IDs in '+relative);if(before.units)assert.deepEqual(after.units.map(({bounds,...u})=>u),before.units.map(({bounds,...u})=>u),'Riding result IDs and metadata are intact');files++;}
 if(before.configs){assert.deepEqual(after.years,before.years,'Historical dates preserved');assert.deepEqual(after.events,before.events,'Historical events preserved');assert.equal(after.configs.length,before.configs.length);for(let i=0;i<after.configs.length;i++){assert.deepEqual(after.configs[i].face,before.configs[i].face,'Dated face ownership preserved');assert.deepEqual(after.configs[i].units.map(({label,bounds,...u})=>u),before.configs[i].units.map(({label,bounds,...u})=>u),'Historical units preserved');}}
}
assert(probes>100,'Substantial retained lake coverage');
console.log('Maine fill:',probes,'lake probes,',files,'region/riding ID sets, unchanged statistics and dated ownership passed.');
