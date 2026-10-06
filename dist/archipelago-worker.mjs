// Inflate and prepare geometry away from the UI thread. Only blobs cross the
// worker boundary; the parsed coordinate arrays disappear when it terminates.
import {loadCompressed} from './korea-data.mjs';
self.onmessage=async({data})=>{try{const input=await loadCompressed(data.url),sources={};for(const [name,value] of Object.entries(input))sources[name]=new Blob([JSON.stringify(value)],{type:'application/json'});self.postMessage({sources});}catch(error){self.postMessage({error:error.message});}};
