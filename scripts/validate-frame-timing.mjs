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

{
 const {createGestureHistory}=await import('../dist/frame-timing.mjs');const history=createGestureHistory();
 history.record({samples:10,durationMs:1000,drawFps:8,maxFrameGapMs:220,maxRenderGapMs:240,country:'russia'});
 for(let i=0;i<1000;i++)history.record({samples:10,durationMs:1000,drawFps:60,maxFrameGapMs:17,maxRenderGapMs:17,country:'norway'});
 let state=history.snapshot();assert.equal(state.total,1001);assert.equal(state.recent.length,12);assert.equal(state.slow.length,1);assert.equal(state.slow[0].country,'russia','Smooth gestures and country switches preserve the slow episode');
 history.record({samples:10,durationMs:1000,drawFps:1,maxFrameGapMs:1000,interrupted:true});history.record({samples:0});assert.equal(history.snapshot().total,1001,'Hidden/interrupted and empty measurements are excluded');
 state.slow[0].country='changed';assert.equal(history.snapshot().slow[0].country,'russia','Reports cannot mutate the recording');
 for(let i=0;i<20;i++)history.record({samples:5,durationMs:1000,drawFps:10,maxFrameGapMs:150});assert.equal(history.snapshot().slow.length,4,'Slow-episode history stays bounded');
}
console.log('Intermittent gesture history: recovery, country changes, suspension, immutable reports and bounded retention passed.');

{
 const {createMotionTrace}=await import('../dist/frame-timing.mjs');const trace=createMotionTrace({limit:12});
 for(let i=0;i<120;i++){
  trace.input('pointermove',i*8,2);trace.camera(i*8,[i,0,3,0]);trace.cpu(1+i%4);
  if(i%4===0)trace.render(i*8,[i,0,3,0]);
 }
 const state=trace.snapshot();assert.equal(state.inputs.pointermove.events,120);assert.equal(state.inputs.pointermove.coalescedEvents,240);
 assert.equal(state.cameraChanges,120);assert.equal(state.renderSubmissions,30);assert.equal(state.renderedCameraPositions,30);
 assert.equal(state.inputs.pointermove.gaps.p95Ms,8);assert.equal(state.renderGaps.p95Ms,32,'Fast input and slow map draws are measured separately');
 assert.equal(state.renderGaps.samples,12);assert.equal(state.cameraGaps.samples,12,'Trace storage stays bounded');
 assert.equal(state.rendererCpuMs.samples,12);assert.equal(state.rendererCpuMs.p95,4);assert.equal(state.rendererCpuMs.max,4,'Renderer CPU duration is measured separately from input gaps');
 trace.reset();trace.camera(0,[0,0,3,0]);trace.camera(1,[0,0,3,0]);trace.render(2,[0,0,3,0]);trace.render(3,[0,0,3,0]);assert.equal(trace.snapshot().cameraChanges,1);assert.equal(trace.snapshot().renderedCameraPositions,1,'Identical positions are not extra camera updates');
 trace.reset();assert.equal(trace.snapshot().renderSubmissions,0);assert.deepEqual(trace.snapshot().inputs,{});
 trace.input('pointermove',110,3,[90,95,100]);trace.input('pointermove',210,3,[105,110,115]);
 const input=trace.snapshot().inputs.pointermove;
 assert.equal(input.gaps.p95Ms,100);assert.equal(input.sampleGaps.p95Ms,5,'Event sample timestamps distinguish delivery pauses from gaps in the input stream');assert.equal(input.deliveryDelayMs.max,105);
 for(let i=0;i<100;i++)trace.input('pointerrawupdate',300+i,1,[299+i]);
 assert.equal(trace.snapshot().inputs.pointerrawupdate.sampleGaps.samples,12,'Event sample timing is bounded too');
}
console.log('Input/camera tracing: independent delivery and draw gaps, coalesced input, unchanged positions, bounded storage and gesture resets passed.');
