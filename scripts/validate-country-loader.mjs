import assert from 'node:assert/strict';
import {createCountryLoader,createMapResources} from '../dist/country-loader.mjs';
import {createRegionalCollection} from '../dist/regional-collection.mjs';
import {testMap} from './test-map.mjs';
let fail=true,calls=0,release;
const loader=createCountryLoader(async id=>{calls++;if(id==='bad'&&fail)throw Error('offline');if(id==='slow')await new Promise(r=>release=r);return {id};});
assert.equal(loader.status('bad'),'unloaded');
const first=loader.ensure('slow');assert.equal(first,loader.ensure('slow'),'Concurrent callers share one request');
const results=await loader.ensureAll(['bad','good']);
assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled','Another country completes without waiting for a slow or failed country');
assert.equal(loader.status('bad'),'failed');fail=false;assert.equal((await loader.ensure('bad')).id,'bad');
await loader.ensure('bad');assert.equal(calls,4,'A successful country is cached and failed requests retry once');
release();await first;assert.equal(loader.status('slow'),'ready');
const map=testMap();map.addSource('existing',{});map.addLayer({id:'existing',type:'fill'});
const a=createMapResources(map),b=createMapResources(map);
assert.throws(()=>a.map.addSource('existing',{}),/already exists/);assert.throws(()=>a.map.addLayer({id:'existing',type:'fill'}),/already exists/);
a.map.addSource('a',{});a.map.addLayer({id:'a',type:'fill'});b.map.addSource('b',{});b.map.addLayer({id:'b',type:'fill'});
a.dispose();a.dispose();assert(!map.getSource('a'));assert(!map.getLayer('a'));assert(map.getSource('b')&&map.getLayer('existing'),'Failure cleanup only removes the failing country');
let failures=1;
const collection=createRegionalCollection(map,{}, {future:{country:'future'},other:{country:'other'}},{load:async(_map,_host,c)=>{if(c.country==='future'&&failures--)throw Error('failed portal');return {sync(){},...c};}});
await assert.rejects(collection.ensure('future'));assert.equal(collection.status('future'),'failed');
assert.equal((await collection.ensure('other')).country,'other');
assert.equal((await collection.ensure('future')).country,'future');assert.equal(Object.keys(collection.portals).length,2);
console.log('Country lifecycle: concurrent deduplication, isolated failures, immediate healthy-country readiness, retries, caching and owned-resource cleanup passed.');

// A country can depend on a neighbour's canonical border preview without loading
// that neighbour's subdivisions or every country's preview.
{
 let release,finished=false;const calls=[];
 const blocked=new Promise(resolve=>release=resolve);
 const configs={target:{id:'target',previewCountries:['border']},border:{id:'border'},other:{id:'other'}};
 const collection=createRegionalCollection(null,null,configs,{load:async(_map,_host,c)=>{calls.push(c.id);if(c.id==='border')await blocked;return c;}});
 const opening=collection.ensure('target').then(value=>{finished=true;return value;});
 await new Promise(resolve=>setImmediate(resolve));assert(!finished,'Opening waits for the canonical neighbouring border');
 assert.deepEqual(calls.sort(),['border','target'],'Only the requested country and declared preview are prepared');
 release();assert.equal((await opening).id,'target');await collection.ensure('target');
 assert.equal(calls.length,2,'Repeated country selection reuses the same preview');
 console.log('Country preview dependencies: canonical neighbouring borders, awaited readiness, deduplication, and no unrelated previews passed.');
}
