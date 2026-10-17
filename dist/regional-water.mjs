// Optional country hydrography uses the same blue styling as China's water layer.
import {addWaterLayers} from './water.mjs';
export function createRegionalWater(map,{id,input,status,load,visible,spinner,attribution}){
 const source=id+'-water',ids=[id+'-lakes',id+'-lake-shores',id+'-rivers'];
 let ready=false,pending=null,epoch=0;
 function show(value){if(ready)for(const layer of ids)map.setLayoutProperty(layer,'visibility',value?'visible':'none');}
 function sync(){
  const enabled=visible()&&input.checked;
  if(!enabled){show(false);if(pending)status.hidden=true;return;}
  if(ready){show(true);return;}
  if(!pending)void ensure();
 }
 async function ensure(){
  const token=epoch;status.hidden=false;status.innerHTML=spinner();input.setAttribute('aria-busy','true');
  const job=Promise.resolve().then(load);pending=job;
  try{
   const data=await job;if(token!==epoch)return;
   map.addSource(source,{type:'geojson',data,attribution,tolerance:.25,maxzoom:18,buffer:128});
   addWaterLayers(map,source,ids,{adaptive:true});
   ready=true;status.hidden=true;
  }catch(error){
   if(token!==epoch)return;
   for(const layer of ids)if(map.getLayer(layer))map.removeLayer(layer);
   if(map.getSource(source))map.removeSource(source);
   ready=false;input.checked=false;status.textContent='Waterways could not load. Toggle on to retry.';status.hidden=false;
   console.warn('Water layer:',error);
  }finally{
   if(token===epoch){pending=null;input.removeAttribute('aria-busy');show(ready&&visible()&&input.checked);}
  }
 }
 input.addEventListener('change',sync);
 return {sync,dispose(){
  epoch++;pending=null;for(const layer of ids)if(map.getLayer(layer))map.removeLayer(layer);
  if(map.getSource(source))map.removeSource(source);ready=false;status.hidden=true;input.removeAttribute('aria-busy');
 }};
}
