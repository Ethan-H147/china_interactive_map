import {loadCompressed} from './korea-data.mjs';
self.onmessage=async({data})=>{
 try{
  const payload=await loadCompressed(data.url),sources={};
  for(const key of ['regions','lines'])sources[key]=new Blob([JSON.stringify(payload[key])],{type:'application/json'});
  self.postMessage({records:payload.records,sources});
 }catch(error){self.postMessage({error:error.message});}
};
