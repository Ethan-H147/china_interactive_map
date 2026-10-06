// Inflate and prepare geometry away from the UI thread. Only blobs cross the
// worker boundary; the parsed coordinate arrays disappear when it terminates.
import {loadCompressed} from './korea-data.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';
self.onmessage=async({data})=>{try{const input=await loadCompressed(data.url),sources={};for(const [name,value] of Object.entries(input)){const display=data.url.includes('/indonesia-')?splitCoastalDetail(value):value;sources[name]=new Blob([JSON.stringify(display)],{type:'application/json'});}self.postMessage({sources});}catch(error){self.postMessage({error:error.message});}};
