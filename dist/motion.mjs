import {setLayerVisible} from './adaptive-lines.mjs';

const suffix='-motion';
export function queryRegions(map,point,{layers,...options}){
 const ids=layers.flatMap(id=>map.getLayer(id+suffix)?[id,id+suffix]:[id]);
 return map.queryRenderedFeatures(point,{...options,layers:ids}).map(feature=>feature.layer.id.endsWith(suffix)?{...feature,layer:{...feature.layer,id:feature.layer.id.slice(0,-suffix.length)}}:feature);
}
export function setFeatureState(map,target,state){
 map.setFeatureState(target,state);
 if(map.getSource(target.source+suffix))map.setFeatureState({...target,source:target.source+suffix},state);
 const fragment=target.source==='provinces'&&target.id===220000?'provinces-fragments':target.source==='prefectures'&&target.id===222400?'prefectures-fragments':null;
 if(fragment&&map.getSource(fragment))setFeatureState(map,{...target,source:fragment},state);
}

export function createMotionRenderer(map){
 let sources,active=false,restoring=false,restoreListener;
 const urls=new Map(),layers=new Map(),dynamicKeys=new Map();
 function sourceUrl(source,data){const url=URL.createObjectURL(data),previous=urls.get(source);urls.set(source,url);return{url,previous};}
 const ready=new Promise(resolve=>{
  const worker=new Worker(new URL('./motion-worker.mjs',import.meta.url),{type:'module'});
  worker.onmessage=event=>{worker.terminate();sources=event.data.sources;resolve(!!sources);};
  worker.onerror=()=>{worker.terminate();resolve(false);};
 });
 function install(){
  const style=map.getStyle();
  const updatedSources=new Set();let added=false;
  for(const layer of style.layers){
   if(!sources[layer.source]||layer.id.endsWith(suffix))continue;
   const id=layer.id+suffix,source=layer.source+suffix;
   const prepared=sources[layer.source];
   let data=prepared.data;
   if(prepared.features&&!updatedSources.has(source)){
    updatedSources.add(source);
    const ids=prepared.ids.filter(id=>{const state=map.getFeatureState({source:layer.source,id});return state.selected||state.quizCorrect||state.quizWrong;});
    const key=JSON.stringify(ids);
    if(dynamicKeys.get(source)!==key){
     dynamicKeys.set(source,key);
     const parts=['{"type":"FeatureCollection","features":['];
     ids.forEach((id,i)=>{if(i)parts.push(',');parts.push(prepared.features[id]);});parts.push(']}');
     data=new Blob(parts,{type:'application/json'});
     if(map.getSource(source)){const {url,previous}=sourceUrl(source,data);map.getSource(source).setData(url).catch(()=>{}).finally(()=>{if(previous)URL.revokeObjectURL(previous);});}
    }
   }
   if(!map.getSource(source)){
    const {url}=sourceUrl(source,data);
    // Zero tolerance keeps neighboring Jilin triangles watertight. All of
    // these sources were already simplified together before being shipped.
    map.addSource(source,{type:'geojson',data:url,tolerance:0,maxzoom:18,buffer:128,promoteId:style.sources[layer.source].promoteId});
    for(const featureId of sources[layer.source].ids){const state=map.getFeatureState({source:layer.source,id:featureId});if(Object.keys(state).length)map.setFeatureState({source,id:featureId},state);}
   }
   if(!layers.has(layer.id)){
    map.addLayer({...layer,id,source,layout:{...layer.layout,visibility:'none'}});
    layers.set(layer.id,{id,visibility:'none'});
    added=true;
   }
   // Preserve the current atlas theme, satellite appearance and quiz filters.
   for(const [key,value] of Object.entries(layer.paint||{}))if(JSON.stringify(map.getPaintProperty(id,key))!==JSON.stringify(value))map.setPaintProperty(id,key,value);
   if(JSON.stringify(map.getFilter(id)||null)!==JSON.stringify(layer.filter||null))map.setFilter(id,layer.filter||null);
  }
  // Motion layers form a complete overlay in the original drawing order.
  if(added)for(const layer of style.layers)if(layers.has(layer.id))map.moveLayer(layer.id+suffix);
 }
 function clearOverlay(){
  if(restoreListener)map.off('idle',restoreListener);restoreListener=undefined;
  for(const {id} of layers.values())setLayerVisible(map,id,false);
  restoring=false;
 }
 async function begin(){
  if(!sources)return false;
  if(restoring)clearOverlay();
  install();active=true;
  for(const [original,entry] of layers){
   entry.visibility=map.getLayoutProperty(original,'visibility')||'visible';
   setLayerVisible(map,entry.id,entry.visibility==='visible');setLayerVisible(map,original,false);
  }
  // Wait for the small overlay, rather than unrelated satellite tile requests.
  // A failed source must never leave navigation locked or hide the real map.
  const visible=[...new Set([...layers.values()].filter(entry=>entry.visibility==='visible').map(entry=>map.getLayer(entry.id).source))];
  const loaded=await new Promise(resolve=>{
   let timer;
   const finish=value=>{map.off('render',check);clearTimeout(timer);resolve(value);};
   const check=()=>{if(visible.every(id=>map.isSourceLoaded(id)))finish(true);};
   map.on('render',check);timer=setTimeout(()=>finish(false),400);map.triggerRepaint();
  });
  if(!loaded){end();clearOverlay();return false;}
  return true;
 }
 function end(){
  if(!active)return;active=false;restoring=true;
  for(const [original,{visibility}] of layers)setLayerVisible(map,original,visibility==='visible');
  // Keep the overlay until detailed destination tiles are ready, avoiding a
  // blank flash on slower devices. No camera animation runs during this work.
  restoreListener=clearOverlay;map.once('idle',restoreListener);
  if(map.loaded())clearOverlay();
 }
 window.addEventListener('pagehide',event=>{if(!event.persisted)urls.forEach(url=>URL.revokeObjectURL(url));});
 async function prepare(){if(sources&&!active&&!restoring&&map.getStyle())install();}
 ready.then(prepare).catch(()=>{});
 return{ready,prepare,begin,end};
}
