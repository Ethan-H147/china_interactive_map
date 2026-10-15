import {loadCompressed} from './korea-data.mjs';
import {lineData} from './adaptive-lines.mjs';
import {edgeLines,withoutEdges} from './edge-runs.mjs';
self.onmessage=async({data})=>{
 try{const geometry=await loadCompressed(data.url),boundaries=geometry.boundaries||(geometry.edgeRuns&&edgeLines(geometry));const regions=withoutEdges(geometry.regions||geometry);
  // Selected outlines as lines split below the renderer's vertex limit (see country-boundary-worker.mjs).
  self.postMessage({blob:new Blob([JSON.stringify(regions)],{type:'application/json'}),outlines:new Blob([JSON.stringify(lineData(regions))],{type:'application/json'}),...(boundaries?{borders:new Blob([JSON.stringify(lineData(boundaries))],{type:'application/json'})}:{})});}
 catch(error){self.postMessage({error:error.message});}
};
