import {loadCompressed} from './korea-data.mjs';
import {lineData} from './adaptive-lines.mjs';
try{
 const data=await loadCompressed(new URL('data/japan-boundaries.bin',import.meta.url));
 const blob=value=>new Blob([JSON.stringify(value)],{type:'application/json'});
 postMessage({result:{metadata:data.first.features.map(f=>({type:'Feature',properties:f.properties,geometry:null})),sources:{'japan-first':blob(data.first),'japan-first-edges':blob(data.boundaries),'japan-first-selection-edges':blob(lineData(data.first))}}});
}catch(error){postMessage({error:error.message});}
