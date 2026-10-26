import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {load} from './geo-index.mjs';
import {LocalitySearchIndex,localityRecord} from '../dist/locality-search-index.mjs';
import {mergeLocalityResults} from '../dist/streamed-settlements.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';

const root='dist/data/europe/mexico/',base=root+'localities/',data=load(root+'settlements.bin'),manifest=load(base+'manifest.bin'),catalogue=load(root+'catalogue.bin'),original=new Map(data.records.map(r=>[+r.id.slice(7),r])),seen=new Map(),counts=new Map();
assert.equal(manifest.count,189432);assert.equal(manifest.cacheTiles,12);assert(manifest.tiles.length>100);assert(manifest.search.decodedBytes<20*1024*1024,'Search uses compact numeric/string storage');
for(const tile of manifest.tiles){assert(tile.count>0&&tile.count<=256);const rows=load(base+'tiles/'+tile.id+'.bin');assert.equal(rows.length,tile.count);assert.equal(fs.statSync(base+'tiles/'+tile.id+'.bin').size,tile.bytes);
 for(const tuple of rows){const [code,name,lng,lat,parent,population,zoom]=tuple,r=original.get(code);assert(r&&!seen.has(code),'Every locality has exactly one spatial chunk');seen.set(code,+tile.id);assert.equal(name,r.en);assert.deepEqual([lng,lat],r.center);assert.equal(parent,+r.parentId.slice(7));assert.equal(population,r.population.value);assert.equal(zoom,r.dotzoom);assert(lng>=tile.bounds[0]&&lng<=tile.bounds[2]&&lat>=tile.bounds[1]&&lat<=tile.bounds[3]);assert(tile.minzoom<=zoom);counts.set(r.parentId,(counts.get(r.parentId)||0)+1);const expanded=localityRecord(tuple,manifest);assert.equal(expanded.population.year,2020);assert.equal(expanded.population.value,population);assert(!expanded.partial);}
}
assert.equal(seen.size,original.size);for(const [id,count]of Object.entries(manifest.parentCounts))assert.equal(count,counts.get(id)||0);
let located=0;for(const [state,descriptor]of Object.entries(manifest.locators)){const rows=load(base+descriptor.file);let last=-1;for(const [code,tile]of rows){assert(code>last);last=code;assert.equal(String(code).padStart(9,'0').slice(0,2),state);assert.equal(seen.get(code),tile);located++;}}assert.equal(located,original.size);
const bytes=gunzipSync(fs.readFileSync(base+manifest.search.file)),index=new LocalitySearchIndex(new Uint8Array(bytes),manifest);assert.equal(index.count,original.size);assert(!index.columns.lng&&!index.columns.population,'The name index does not retain coordinates or statistics');
for(let i=0;i<index.count;i++){const record=index.record(i),r=data.records[i];assert.equal(record.id,r.id);assert.equal(record.en,r.en);assert.equal(record.parentId,r.parentId);assert(record.partial&&!record.center&&!record.population);}
const find=query=>mergeLocalityResults(createPlaceSearch(catalogue.records)(query),index.search(query),query);
for(const query of ['Cancun','Cancún','Cancun Quintana Roo'])assert.equal(find(query)[0].id,'MX-LOC-230050001','City/alias ranking '+query);
assert.equal(find('Guadalajara')[1].id,'MX-MUN-14039');assert.equal(find('230050001')[0].id,'MX-LOC-230050001');
const small=data.records.find(r=>r.population.value===1);assert(index.search(small.id.slice(7)).some(r=>r.record.id===small.id));assert(index.search('La Rinconada La Escondida').some(r=>r.record.en==='La Rinconada (La Escondida)'),'Word-prefix lookup tolerates punctuation');
let decoded=0;const read=index.record.bind(index);index.record=id=>{decoded++;return read(id);};for(const query of ['c','a','s','san jose','cancun']){decoded=0;assert(index.search(query).length<=20);assert(decoded<=20,'Broad searches decode only returned records');}
const children=index.children('MX-MUN-23005','',0,100);assert.equal(children.total,manifest.parentCounts['MX-MUN-23005']);assert(children.records.length<=100);assert(children.records.some(r=>r.id==='MX-LOC-230050001'));
assert.equal(AtlasCountries.countries.mexico.map.settlementManifest,'localities/manifest.bin');assert(!AtlasCountries.countries.mexico.map.settlementFile);
console.log('Streamed Mexico: all 189,432 points in bounded chunks, complete saved-link locators, compact worker index, aliases/accent/punctuation search, bounded result decoding and paged municipal lists passed.');
