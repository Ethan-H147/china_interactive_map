// Inflate and prepare geometry away from the UI thread. Only blobs cross the
// worker boundary; the parsed coordinate arrays disappear when it terminates.
// Collections with edge runs also get their outline lines (shared edges, no coasts), and every
// collection its selected outlines as lines split below the renderer's vertex limit (a ring of
// 20,000 points stroked straight from the polygons wraps round and draws stray chords).
import {loadCompressed} from './korea-data.mjs';
import {splitCoastalDetail} from './coastal-detail.mjs';
import {edgeLines,withoutEdges} from './edge-runs.mjs';
import {lineData} from './adaptive-lines.mjs';
const blob=value=>new Blob([JSON.stringify(value)],{type:'application/json'});
self.onmessage=async({data})=>{try{const input=await loadCompressed(data.url),sources={},edges={},outlines={};for(const [name,value] of Object.entries(input)){if(value.edgeRuns)edges[name]=blob(edgeLines(value));const collection=withoutEdges(value),display=data.url.includes('/indonesia-')?splitCoastalDetail(collection):collection;sources[name]=blob(display);outlines[name]=blob(lineData(display));}self.postMessage({sources,edges,outlines});}catch(error){self.postMessage({error:error.message});}};
