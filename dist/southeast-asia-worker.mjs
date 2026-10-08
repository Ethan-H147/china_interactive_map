import {loadCompressed} from './korea-data.mjs';
import {lineData} from './adaptive-lines.mjs';
self.onmessage=async({data})=>{
 try{const geometry=await loadCompressed(data.url);self.postMessage({blob:new Blob([JSON.stringify(geometry.regions||geometry)],{type:'application/json'}),...(geometry.boundaries?{borders:new Blob([JSON.stringify(lineData(geometry.boundaries))],{type:'application/json'})}:{})});}
 catch(error){self.postMessage({error:error.message});}
};
