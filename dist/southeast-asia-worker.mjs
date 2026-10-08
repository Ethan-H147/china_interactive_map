import {loadCompressed} from './korea-data.mjs';
self.onmessage=async({data})=>{
 try{const geometry=await loadCompressed(data.url);self.postMessage({blob:new Blob([JSON.stringify(geometry)],{type:'application/json'})});}
 catch(error){self.postMessage({error:error.message});}
};
