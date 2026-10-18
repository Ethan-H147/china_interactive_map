import assert from 'node:assert/strict';
import {createFrameTask,onMapHover} from '../dist/pointer-performance.mjs';
const frames=new Map();let id=0;globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
const flush=()=>{const batch=[...frames.values()];frames.clear();for(const fn of batch)fn();};
const values=[],update=createFrameTask(value=>values.push(value));
for(let i=0;i<1000;i++)update(i);assert.equal(frames.size,1);assert.deepEqual(values,[]);flush();assert.deepEqual(values,[999],'Only the latest pointer position is processed');
update('obsolete');const old=[...frames.values()][0];update.cancel();update('new');old();assert.deepEqual(values,[999],'A late canceled frame cannot update the UI');flush();assert.deepEqual(values,[999,'new']);
const events=new Map(),dom=new Map(),add=(bucket,type,fn)=>{if(!bucket.has(type))bucket.set(type,new Set());bucket.get(type).add(fn);},remove=(bucket,type,fn)=>bucket.get(type)?.delete(fn),emit=(bucket,type,event)=>{for(const fn of bucket.get(type)||[])fn(event);};
const canvas={addEventListener:(t,f)=>add(dom,t,f),removeEventListener:(t,f)=>remove(dom,t,f)},map={getCanvas:()=>canvas,on:(t,f)=>add(events,t,f),off:(t,f)=>remove(events,t,f)},a=[],b=[];
const offA=onMapHover(map,e=>a.push(e.point)),offB=onMapHover(map,e=>b.push(e.point));assert.equal(events.get('mousemove').size,1,'All consumers share one native hover listener');
for(let i=0;i<1000;i++)emit(events,'mousemove',{point:i});assert.equal(frames.size,1);flush();assert.deepEqual(a,[999]);assert.deepEqual(b,[999]);
for(const [bucket,name]of [[events,'movestart'],[dom,'mouseleave'],[dom,'pointerdown']]){emit(events,'mousemove',{point:'stale'});emit(bucket,name);flush();assert.deepEqual(a,[999],name+' cancels pending hover work');}
offA();emit(events,'mousemove',{point:'B'});flush();assert.deepEqual(a,[999]);assert.deepEqual(b,[999,'B']);offB();assert.equal(events.get('mousemove').size,0);assert.equal(frames.size,0);
const c=[],offC=onMapHover(map,e=>c.push(e.point));offA();offB();emit(events,'mousemove',{point:'C'});flush();assert.deepEqual(c,['C'],'Repeated unsubscribe cannot detach a replacement subscription');offC();
const framesA=[],framesB=[],taskA=createFrameTask(v=>framesA.push(v)),taskB=createFrameTask(v=>framesB.push(v));taskA(1);taskB(2);taskA.cancel();flush();assert.deepEqual(framesA,[]);assert.deepEqual(framesB,[2],'Canceling one hover surface does not lose another surface’s pending update');
console.log('Pointer performance: one latest sample per frame, shared map listeners, cancellation before pan/click/leave, late-frame safety, independent consumers and complete cleanup passed.');
