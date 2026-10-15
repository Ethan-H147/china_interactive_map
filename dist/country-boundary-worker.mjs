import {loadCompressed} from './korea-data.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {lineData} from './adaptive-lines.mjs';
self.onmessage=async({data})=>{
 try{
  const payload=await loadCompressed(data.url);
  const prepare=part=>({blob:new Blob([JSON.stringify(polygonParts(part.regions))],{type:'application/json'}),borders:new Blob([JSON.stringify(lineData(part.boundaries))],{type:'application/json'}),
   // The selected outline as lines split below the renderer's vertex limit: a ring stroked straight
   // from the polygons (Krasnoyarsk Krai has 66,516 points) wraps round and draws stray chords.
   outlines:new Blob([JSON.stringify(lineData(part.regions))],{type:'application/json'})});
  self.postMessage(payload.levels?{levels:payload.levels.map(part=>({level:part.level,...prepare(part)}))}:prepare(payload));
 }catch(error){self.postMessage({error:error.message});}
};
