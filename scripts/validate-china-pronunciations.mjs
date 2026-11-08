import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {chinaPronunciations,pronunciationMetadata} from '../dist/china-pronunciations.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../dist/data/china-regions.json',import.meta.url)));
assert.equal(Object.keys(chinaPronunciations).length,34);
assert.equal(pronunciationMetadata.language,'zh-CN');assert.equal(pronunciationMetadata.synthetic,true);assert.equal(pronunciationMetadata.reviewed,false);
const hashes=new Set();let total=0;
for(const p of source.provinces.map(p=>p.properties)){
 const entry=chinaPronunciations[p.adcode];assert(entry,'Missing '+p.adcode);assert.equal(entry.text,p.name);
 const data=fs.readFileSync(new URL('../dist/'+entry.src,import.meta.url));
 assert.equal(data.length,entry.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
 hashes.add(entry.sha256);total+=data.length;
}
assert.equal(hashes.size,34,'Each name has its own generated recording');assert(total<5*1024*1024);
console.log('34 Mandarin recordings verified;',total,'bytes; native-speaker review pending.');
