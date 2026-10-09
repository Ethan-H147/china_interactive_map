import {loadCompressed} from './korea-data.mjs';
import {lineData} from './adaptive-lines.mjs';
self.onmessage=async({data})=>{
 try{
  const payload=await loadCompressed(data.url);
  self.postMessage({blob:new Blob([JSON.stringify(payload.regions)],{type:'application/json'}),borders:new Blob([JSON.stringify(lineData(payload.boundaries))],{type:'application/json'})});
 }catch(error){self.postMessage({error:error.message});}
};
