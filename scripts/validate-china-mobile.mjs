import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodePack} from '../dist/china-pack.mjs';
import {decodeGeo} from '../dist/geo-pack.mjs';
import {chinaSourceBuilders} from '../dist/china-sources.mjs';
import {createCountyScope,countySources} from '../dist/china-mobile.mjs';
import {createCountryResidency} from '../dist/country-loader.mjs';

const root='dist/data/china-mobile/',manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
const unpack=file=>decodePack(gunzipSync(fs.readFileSync('dist/data/'+file)));
const read=record=>decodeGeo(gunzipSync(fs.readFileSync(root+record.file)));
for(const [file,hash] of Object.entries(manifest.inputs))assert.equal(createHash('sha256').update(fs.readFileSync('dist/data/'+file)).digest('hex'),hash,'Regenerate mobile shapes after changing '+file);
const base=chinaSourceBuilders(unpack('china-boundaries.pack.bin'));
for(const [id,record] of Object.entries(manifest.sources))assert.deepEqual(read(record),base[id](),id+' keeps every coordinate and property');
for(const [id,record] of Object.entries(manifest.selections))assert.deepEqual(read(record).features,base[id]().features.filter(f=>id.startsWith('provinces-')?f.properties.adcode===220000:id.startsWith('prefectures-')&&f.properties.adcode===222400),'Repaired exteriors retain their original rings');
const counties=chinaSourceBuilders(unpack('china-counties.pack.bin'));
for(const id of countySources){
 const expected=counties[id]().features;
 let count=0;
 for(const [scope,sources] of Object.entries(manifest.counties)){
  const data=read(sources[id]);assert.deepEqual(data.features,expected.filter(f=>String(f.properties.parentCity)===scope),id+' '+scope);count+=data.features.length;
 }
 assert.equal(count,expected.length,'All counties and outlines are retained');
}
// Slow source responses cannot overwrite the last request; disposal waits for writes.
globalThis.location={href:'http://localhost/'};
const values=new Map(),writes=[];let release;
const map={on(){},off(){},getSource:id=>({async setData(data){writes.push([id,data]);if(typeof data==='string'&&data.includes('%2F101%2F'))await new Promise(r=>release=r);values.set(id,data);}})};
const loader=createCountyScope(map);const first=loader.ensure(101);
while(!release)await new Promise(r=>setTimeout(r,0));
const second=loader.ensure(102);loader.ensure(103);release();await first;await second;
assert.equal(loader.loaded,103);assert([...values.values()].every(v=>v.includes('%2F103%2F')));
await loader.ensure(null);assert([...values.values()].every(v=>v.features.length===0));
const interrupted=loader.ensure(101);while(!release)await new Promise(r=>setTimeout(r,0));
// Wait for the second 101 request to start before clearing it.
await new Promise(r=>setTimeout(r,0));const clearing=loader.ensure(null);release();await interrupted;await clearing;
assert([...values.values()].every(v=>v.features.length===0),'Clearing during an in-flight county load also releases partial geometry');
await loader.dispose();await loader.ensure(104);assert.equal(loader.loaded,null);
let resident;const cache=createCountryResidency({limit:1,dispose:async id=>{assert.equal(id,resident);resident=null;}});
for(const id of ['china','korea','china']){await cache.ensure(id,async()=>{assert(!resident,'The previous country is released before allocating the next');resident=id;});cache.activate(id);assert.equal(cache.snapshot().countries.length,1);}
await assert.rejects(cache.ensure('bad',async()=>{resident='bad';throw Error('offline');}));
await cache.ensure('china',async()=>resident='china');cache.activate('china');assert.equal(resident,'china');
console.log('Mobile China: all exact source/329 county shards, stale-input detection, rapid scope changes, release, one-country budget and failed-load recovery passed.');
