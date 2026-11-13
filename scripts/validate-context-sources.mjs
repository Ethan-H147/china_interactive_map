import assert from 'node:assert/strict';
import {createContextSources} from '../dist/context-sources.mjs';
function fixture(){
 const sources=new Map(),layers=new Map(),events=new Map(),timers=new Map();let clock=0,nextTimer=0,moving=false,visible=false,retained=false,loads=0,restores=0,hold;
 const map={on(event,fn){if(!events.has(event))events.set(event,new Set());events.get(event).add(fn);},off(event,fn){events.get(event)?.delete(fn);},getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),addLayer:layer=>layers.set(layer.id,layer),isMoving:()=>moving};
 const definition={id:'context',url:'data/test/context.bin',options:{type:'geojson',tolerance:.25},transform:'parts',retain:()=>retained,layers:()=>[{id:'fill',source:'context',type:'fill'}]};
 const scene={contextLayerVisible:()=>visible};
 const loadSource=async(map,id,url,options,transform)=>{loads++;assert.equal(transform,'parts');if(hold)await hold;const blob=URL.createObjectURL(new Blob(['unchanged geometry']));sources.set(id,{serialize:()=>({data:'atlas-data://context?url='+encodeURIComponent(blob)})});};
 const facade=new Proxy(map,{get(target,key){if(key==='style')return {map:target};if(key==='addLayer')return ()=>{throw Error('Shared resources must not belong to the first adapter');};return target[key];}});
 const context=createContextSources(facade,scene,{definitions:[definition],loadSource,onRestore:()=>restores++,now:()=>clock,setTimer:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:clock+ms});return id;},clearTimer:id=>timers.delete(id)});
 const hub=globalThis.AtlasContextSourcesController;
 return {map,context,hub,sources,layers,events,timers,advance(ms){clock+=ms;for(const [id,timer]of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}},set retained(value){retained=value;},set moving(value){moving=value;},set visible(value){visible=value;},set hold(value){hold=value;},get loads(){return loads;},get restores(){return restores;}};
}
const f=fixture();await f.context.ensure();assert.equal(f.loads,0,'Offscreen contexts do not fetch or register sources');
f.visible=true;await Promise.all([f.context.ensure(),f.context.ensure()]);assert.equal(f.loads,1,'Concurrent callers share preparation');assert(f.layers.has('fill'));assert.equal(f.restores,1);
f.moving=true;f.visible=false;await f.hub.whenReady();assert(f.sources.size,'Outgoing geometry survives a gesture');f.moving=false;await f.hub.whenReady();assert(f.sources.size,'A short wheel gesture does not evict recently prepared geometry');
for(let i=0;i<12;i++){f.advance(100);f.visible=!f.visible;await f.hub.whenReady();}assert.equal(f.loads,1,'Repeated zoom reversals reuse the same source');
f.visible=false;f.advance(4000);await f.hub.whenReady();assert.equal(f.sources.size,0);assert.equal(f.layers.size,0,'Idle expiry eventually releases unused geometry');
f.visible=true;await f.context.ensure();assert.equal(f.loads,2);assert.equal(f.restores,2,'Returning reinstalls original definitions and appearance');
f.hub.setEnabled(false);f.visible=false;await f.hub.whenReady();assert(f.sources.size,'Diagnostic native comparison retains every source');f.advance(4000);f.hub.setEnabled(true);await f.hub.whenReady();assert.equal(f.sources.size,0);
f.retained=true;await f.hub.whenReady();assert(f.sources.size,'The active country reference stays prepared for view changes');f.retained=false;f.advance(4000);await f.hub.whenReady();assert.equal(f.sources.size,0);
const interrupted=fixture();let complete;interrupted.hold=new Promise(r=>complete=r);interrupted.visible=true;const pending=interrupted.context.ensure();interrupted.visible=false;interrupted.advance(4000);complete();await pending;assert.equal(interrupted.sources.size,0,'Expired superseded loads leave no source or layer');assert.equal(interrupted.layers.size,0);
for(const fn of interrupted.events.get('remove'))fn();for(const [event,handlers]of interrupted.events)if(event!=='remove')assert.equal(handlers.size,0,'Shared listeners detach with the map');
assert.equal(interrupted.timers.size,0,'Map cleanup cancels eviction timers');
const failedAdapter=fixture();let finish;failedAdapter.hold=new Promise(r=>finish=r);failedAdapter.visible=true;const late=failedAdapter.context.ensure();failedAdapter.context.dispose();finish();await late;assert.equal(failedAdapter.sources.size,0,'A failed adapter cannot leave a late source behind');assert.equal(failedAdapter.hub.snapshot().registered,0,'Failed registration is removed before a retry');
console.log('Context residency: lazy fetch, concurrent loads, gesture retention, exact re-entry, native comparison, superseded loads and map cleanup passed.');
