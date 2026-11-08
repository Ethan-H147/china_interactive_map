import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeData,encodeGeo,geoEncoder,decodeGeoStructure} from '../dist/geo-pack.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
import {loadAtlasData} from '../dist/atlas-data.mjs';
const bytes=fs.readFileSync(new URL('../dist/data/china/history/borders.bin',import.meta.url));
let full=await decodeData(bytes);const expected=Object.fromEntries(['faces','arcs','borders'].map(k=>[k,hash(full[k])]));const outlines=full.configs.flatMap((c,config)=>{const unit=c.units.findIndex(u=>c.selectionLines?.[u.id]);return unit<0?[]:[{config,unit,hash:hash(c.selectionLines[c.units[unit].id])}];});full=null;global.gc?.();
for(const member of Object.keys(expected)){let part=await decodeData(bytes,{select:d=>d[member]});assert.equal(hash(part),expected[member],member+' coordinates and properties are unchanged');part=null;global.gc?.();}
const value={a:{type:'LineString',coordinates:[[1,2],[3,4]]},b:{large:'unused'}};
assert.deepEqual(await decodeData(encodeGeo(value),{select:d=>d.a}),value.a);
assert.deepEqual(await decodeData(new TextEncoder().encode(JSON.stringify(value)),{select:d=>d.a}),value.a);
const e=geoEncoder(),structure={custom:e.encode(value.a)};assert.deepEqual(decodeGeoStructure(e.finish(structure)),{custom:value.a});
console.log('Selective decoding preserves every face, arc and border exactly; compact, JSON and custom-structure compatibility passed.');


const blob=URL.createObjectURL(new Blob([bytes]));
try{for(const {config,unit,hash:expectedHash} of outlines){assert.equal(hash(await loadAtlasData('atlas-data://test?'+new URLSearchParams({url:blob,transform:'unit-outline',config,unit,exact:'1'}))),expectedHash);global.gc?.();}}finally{URL.revokeObjectURL(blob);}
console.log('Direct selected-unit outlines match each period exactly.');
