import assert from 'node:assert/strict';
import {addWorkerSource,fetchBytes} from '../dist/geo-pack.mjs';
const originalFetch=globalThis.fetch,originalTimer=globalThis.setTimeout,originalRevoke=URL.revokeObjectURL;
const payload=new Uint8Array([31,139,0,1,2,255]),options={type:'geojson',tolerance:0,maxzoom:16,promoteId:'id'};
let calls=0,blobs=0,arrays=0,source;
const response=()=>({ok:true,blob:async()=>{blobs++;return new Blob([payload]);},arrayBuffer:async()=>{arrays++;return payload.buffer;}});
const map={addSource(id,value){source={id,...value};}};
try{
 globalThis.fetch=async url=>{calls++;assert.equal(url,'data/compact/world-land.bin');return response();};
 await addWorkerSource(map,'land','data/world-land.bin',options,'parts');
 assert.equal(blobs,1);assert.equal(arrays,0,'Boundary handoff does not allocate a page ArrayBuffer');
 const params=new URL(source.data).searchParams,blob=params.get('url');
 assert.deepEqual(new Uint8Array(await (await originalFetch(blob)).arrayBuffer()),payload,'Workers receive identical file bytes');
 assert.equal(params.get('file'),'world-land.bin');assert.equal(params.get('transform'),'parts');
 const {id,data,...actualOptions}=source;assert.deepEqual(actualOptions,options,'Native source detail settings stay exact');URL.revokeObjectURL(blob);
 await fetchBytes('data/compact/world-land.bin');assert.equal(arrays,1,'Metadata callers retain their byte API');
 globalThis.setTimeout=fn=>originalTimer(fn,0);calls=0;
 globalThis.fetch=async()=>{calls++;if(calls<3)throw new TypeError('Interrupted transfer');return response();};
 await addWorkerSource(map,'retry','data/world-land.bin',options);assert.equal(calls,3);URL.revokeObjectURL(new URL(source.data).searchParams.get('url'));
 globalThis.fetch=async()=>({ok:false,status:404});await assert.rejects(addWorkerSource(map,'missing','data/world-land.bin',options),/404/);
 let revoked=false;URL.revokeObjectURL=url=>{revoked=true;originalRevoke(url);};globalThis.fetch=async()=>response();
 await assert.rejects(addWorkerSource({addSource(){throw Error('Map removed');}},'removed','data/world-land.bin',options),/Map removed/);assert(revoked,'Failed source registration releases its Blob');
}finally{globalThis.fetch=originalFetch;globalThis.setTimeout=originalTimer;URL.revokeObjectURL=originalRevoke;}
console.log('Source handoff: identical bytes/options, browser-managed Blob body, retries, HTTP failures and failed-registration cleanup passed.');
