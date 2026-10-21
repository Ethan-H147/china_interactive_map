import assert from 'node:assert/strict';
import {measureCadence,summarizeCadence} from '../dist/frame-timing.mjs';
assert.deepEqual(summarizeCadence([8,8,8,40,NaN,0,-1]),{callbackFps:62.5,medianMs:8,p95Ms:40,p99Ms:40,longestMs:40,samples:4,durationMs:64});
assert.equal(summarizeCadence([]).callbackFps,0);
function scheduler(){let serial=0;const pending=new Map();return{requestFrame:callback=>{pending.set(++serial,callback);return serial;},cancelFrame:id=>pending.delete(id),tick(now){const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(now));},get size(){return pending.size;}};}
for(const fps of [30,60,120]){
 const frames=scheduler(),result=measureCadence({...frames,duration:1000,warmup:100});
 for(let i=0;i<fps*2;i++)frames.tick(i*1000/fps);
 const stats=await result;assert(Math.abs(stats.callbackFps-fps)<.01);assert(stats.durationMs>=1000);assert.equal(frames.size,0);
}
{
 const frames=scheduler(),controller=new AbortController(),result=measureCadence({...frames,signal:controller.signal});
 frames.tick(0);frames.tick(500);controller.abort();await assert.rejects(result,{name:'AbortError'});assert.equal(frames.size,0);
 const stopped=measureCadence({...frames,signal:controller.signal});await assert.rejects(stopped,{name:'AbortError'});assert.equal(frames.size,0);
}
console.log('Display cadence: 30/60/120 Hz, delayed callbacks, invalid intervals, warmup and cancellation passed.');
