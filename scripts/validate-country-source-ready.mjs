import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped classic-script helper without booting the app's UI.
const app=fs.readFileSync('dist/app.js','utf8'),start=app.indexOf('function waitForCountrySources('),end=app.indexOf('\n}',start)+2;
assert(start>=0&&end>start);
function fixture(){
 const handlers=new Map(),sources=new Map(),timers=new Map();let timerId=0;
 const map={
  on(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},
  off(type,fn){handlers.get(type)?.delete(fn);if(!handlers.get(type)?.size)handlers.delete(type);},
  getSource:id=>sources.has(id),isSourceLoaded:id=>sources.get(id)===true
 };
 const wait=vm.runInNewContext('('+app.slice(start,end)+')',{map,setTimeout(fn,delay){assert.equal(delay,15000);timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)});
 return {wait,handlers,sources,timers,signal:()=>new AbortController(),emit(type,event){for(const fn of [...handlers.get(type)||[]])fn(event);},clean(){assert.equal(handlers.size,0,'Every event listener is removed');assert.equal(timers.size,0,'The fallback timer is cleared');}};
}
{
 const f=fixture();f.sources.set('deferred-outline',false);const job=f.wait(['deferred-outline'],f.signal().signal);let done=false;job.then(()=>done=true);
 f.emit('sourcedata');f.sources.set('deferred-outline',true);await Promise.resolve();assert(!done,'A completed index can lack a subsequent source event');
 f.emit('render');assert.equal(await job,true,'The post-update frame releases the ready country');f.clean();
}
{
 const f=fixture();f.sources.set('indexed',true);f.sources.set('visible-tiles',false);const job=f.wait(['indexed','visible-tiles'],f.signal().signal);let done=false;job.then(()=>done=true);
 f.emit('render');await Promise.resolve();assert(!done,'Visible tiles still have to finish');f.sources.set('visible-tiles',true);f.emit('render');assert.equal(await job,true);f.clean();
}
{
 const f=fixture();f.sources.set('cached',true);assert.equal(await f.wait(['cached'],f.signal().signal),true);f.clean();
 assert.equal(await f.wait([],f.signal().signal),true);f.clean();
}
for(const early of [false,true]){
 const f=fixture(),controller=f.signal();f.sources.set('pending',false);if(early)controller.abort();const job=f.wait(['pending'],controller.signal);if(!early)controller.abort();assert.equal(await job,false);f.clean();
}
{
 const f=fixture();f.sources.set('pending',false);const job=f.wait(['pending'],f.signal().signal);f.emit('error',{sourceId:'other'});f.emit('error',{sourceId:'pending'});await assert.rejects(job,/Country boundary source failed/);f.clean();
}
{
 const f=fixture();f.sources.set('slow',false);const job=f.wait(['slow'],f.signal().signal);[...f.timers.values()][0]();assert.equal(await job,true,'The slow-device fallback still continues the switch');f.clean();
}
console.log('Country readiness: missed source-event race, real tile waiting, cached data, cancellation, errors, timeout and listener cleanup passed.');
