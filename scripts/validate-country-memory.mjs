
import assert from 'node:assert/strict';
import {createCountryResidency} from '../dist/country-loader.mjs';
const allocated=new Set(),evicted=[],memory=createCountryResidency({limit:3,dispose:async id=>{allocated.delete(id);evicted.push(id);}});
async function open(id){await memory.ensure(id,async()=>{allocated.add(id);assert(allocated.size<=3);});memory.activate(id);}
await open('china');await open('korea');await open('denmark');await open('china');await open('japan');
assert.deepEqual(evicted,['korea']);assert.deepEqual(new Set(memory.snapshot().countries.map(r=>r.id)),new Set(['china','denmark','japan']));
await open('korea');assert.deepEqual(evicted,['korea','denmark']);assert.equal(memory.snapshot().active,'korea');
let finish,calls=0;const first=memory.ensure('slow',async()=>{calls++;allocated.add('slow');await new Promise(r=>finish=r);});
assert.equal(first,memory.ensure('slow',()=>{throw Error('duplicate load');}));
while(!finish)await new Promise(r=>setTimeout(r,0));
const next=memory.ensure('next',async()=>{allocated.add('next');assert(allocated.size<=3);});
await next;finish();await first;assert.equal(calls,1);assert(memory.snapshot().countries.length<=3);
await assert.rejects(memory.ensure('bad',async()=>{allocated.add('bad');throw Error('offline');}));
assert(!allocated.has('bad'));assert(!memory.snapshot().countries.some(r=>r.id==='bad'));
await open('bad');assert.equal(memory.snapshot().active,'bad');
console.log('Country memory: maximum three residents, active protection, LRU eviction, duplicate loads, concurrent reservations, failure cleanup and reload passed.');

const inflight=new Set();let endA,endB;
const crowded=createCountryResidency({limit:3,dispose:async id=>inflight.delete(id)});
await crowded.ensure('home',async()=>inflight.add('home'));crowded.activate('home');
const a=crowded.ensure('a',async()=>{inflight.add('a');await new Promise(r=>endA=r);});
const b=crowded.ensure('b',async()=>{inflight.add('b');await new Promise(r=>endB=r);});
while(!endA||!endB)await new Promise(r=>setTimeout(r,0));
let startedC=false;const c=crowded.ensure('c',async()=>{startedC=true;inflight.add('c');assert.equal(inflight.size,3);});
await new Promise(r=>setTimeout(r,0));assert(!startedC,'A fourth load waits until the victim finishes and releases its data');
endA();await a;await c;assert(!inflight.has('a')&&inflight.has('home'));endB();await b;
