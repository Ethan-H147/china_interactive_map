// Loaded into MapLibre's workers with importScriptInWorkers.
import {decodePack} from './china-pack.mjs';
import {chinaSourceBuilders} from './china-sources.mjs';
import {borderSegments} from './adaptive-lines.mjs';

// MapLibre otherwise sends blob: requests to the page, which parses the JSON on
// the main thread and copies it back. Fetching here keeps parsing in the worker.
async function load(request,controller){
 const response=await fetch(request.url,{signal:controller.signal});
 if(!response.ok)throw Error(`${request.url}: ${response.status}`);
 return {data:request.type==='json'?await response.json():request.type==='string'?await response.text():await response.arrayBuffer()};
}
for(const scheme of ['blob:http','blob:https'])self.addProtocol(scheme,load);

async function inflate(url){
 const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
 const bytes=new Uint8Array(await response.arrayBuffer());
 return bytes[0]===31&&bytes[1]===139?new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()):bytes;
}

// china-pack://<source>?pack=<blob URL>[&borders=<blob URL>,<blob URL>]. Each worker
// unpacks once and builds only the sources assigned to it, with no JSON round trip.
const packs=new Map();
function unpack(url){
 let entry=packs.get(url);
 if(!entry){entry={builders:inflate(url).then(bytes=>chinaSourceBuilders(decodePack(bytes)))};packs.set(url,entry);}
 // Release the unpacked copy once this worker's sources have all been requested.
 clearTimeout(entry.timer);entry.timer=setTimeout(()=>packs.delete(url),10000);
 return entry.builders;
}
async function excludedSegments(urls){
 const collections=await Promise.all(urls.map(async url=>JSON.parse(new TextDecoder().decode(await inflate(url)))));
 return borderSegments({type:'FeatureCollection',features:collections.flatMap(c=>c.features)});
}
self.addProtocol('china-pack',async request=>{
 const query=request.url.indexOf('?'),id=request.url.slice('china-pack://'.length,query),params=new URLSearchParams(request.url.slice(query+1));
 const build=(await unpack(params.get('pack')))[id];if(!build)throw Error('Unknown China source '+id);
 const borders=params.get('borders');
 return {data:build(borders?{excluded:await excludedSegments(borders.split(','))}:{})};
});
