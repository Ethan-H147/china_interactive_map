import {loadCompressed} from './korea-data.mjs';
import {lineData} from './adaptive-lines.mjs';
self.onmessage=async({data})=>{
 try{
  const payload=await loadCompressed(data.url);
  const prepare=part=>({blob:new Blob([JSON.stringify(part.regions)],{type:'application/json'}),borders:new Blob([JSON.stringify(lineData(part.boundaries))],{type:'application/json'})});
  self.postMessage(payload.levels?{levels:payload.levels.map(part=>({level:part.level,...prepare(part)}))}:prepare(payload));
 }catch(error){self.postMessage({error:error.message});}
};
