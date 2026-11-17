import {createRussiaHistoryRenderer} from './russia-history-renderer.mjs';
import {resolveSharedHistory} from './shared-history-geometry.mjs';
import {compactUrl,decodeData,encodeGeo,fetchBytes} from './geo-pack.mjs';
import {packShapes,shapeAt,shapeAtLocation} from './historic-shapes.mjs';
import {membershipFilter} from './interaction-policy.mjs';
import {mapPalette} from './map-palette.mjs';
import {createHistoricalTileBudget} from './historical-geometry-budget.mjs';
const OTHER_LAND=mapPalette.country;
// Input adapter for the shared history view. The host's source IDs, layer IDs,
// selection fill and outline are retained. A date never installs an overlay.
export function createHistoricSourceSwap(map,{country,base,file,scene}){
 if(country==='russia')return createRussiaHistoryRenderer(map,{country,base,scene});
 const key=country+'-first',sources=[key,key+'-edges',key+'-outlines'];
 const ids={fill:key+'-fill',lines:key+'-lines',selected:key+'-selected',selectedFill:key+'-selection-fill'};
 const layers=new Set(Object.values(ids)),empty={type:'FeatureCollection',features:[]};
 let data,loading,controller,generation=0,original,current,frame,selected='',sourceKey,outlinedConfig,outlineUrl,outlineListening=false;
 const tiles=createHistoricalTileBudget(map,key);
 const frames=new Map(),urls=new Set(),retiredOutlines=new Set();
 const registry=globalThis.AtlasCountries.countries;
 const related=Object.values(registry).filter(entry=>entry.parent===country&&entry.snapshot);
 const replaced=[...new Set([country,...related.flatMap(entry=>entry.snapshot.replaces||[]),...(registry[country].map.historyContexts||[])])];
 const blob=bytes=>{const url=URL.createObjectURL(new Blob([bytes]));urls.add(url);return url;};
 const protocol=(url,member,transform)=>'atlas-data://'+country+'-dated?'+new URLSearchParams({url,...(member?{member}:{}),...(transform?{transform}:{})});
 const releaseOutline=()=>{if(outlineUrl){URL.revokeObjectURL(outlineUrl);urls.delete(outlineUrl);outlineUrl=null;}};
 const flushOutlines=event=>{if(event.sourceId!==key+'-outlines'||!map.getSource(key+'-outlines')||!map.isSourceLoaded(key+'-outlines'))return;for(const url of retiredOutlines){URL.revokeObjectURL(url);urls.delete(url);}retiredOutlines.clear();};
 function load(){
  if(loading)return loading;
  const token=generation;controller=new AbortController();const signal=controller.signal;
  const task=(async()=>{
   const bytes=await fetchBytes(compactUrl(base+file),{signal});
   const value=await resolveSharedHistory(await decodeData(bytes,{signal}),async file=>decodeData(await fetchBytes(compactUrl('data/'+file),{signal}),{signal}));
   if(token!==generation)throw new DOMException('History closed','AbortError');
   data=value;data.sharedLand=true;
   frames.set('chronology',{url:blob(encodeGeo({faces:data.faces,arcs:data.arcs},{},{scale:1e6})),features:data.faces.features,shapes:packShapes(data.faces.features),edges:data.arcs.features});
   return data;
  })().catch(error=>{if(loading===task)loading=null;throw error;});
  loading=task;return task;
 }
 function prepare(config){if(!frames.has(config.shared))throw Error('Missing shared historical partition');}
 const unit=(config,id)=>config.units[config.face[id]];
 function save(){
  if(original)return;
  const style=map.getStyle();
  original={sources:sources.map(id=>[id,style.sources[id].data]),layers:new Map(Object.values(ids).map(id=>{const layer=style.layers.find(l=>l.id===id);return [id,structuredClone(scene?.baseLayer(layer)||layer)];}))};
  if(!outlineListening){map.on('sourcedata',flushOutlines);outlineListening=true;}
  tiles.start();
 }
 function draw(config,colorOf){
  save();frame=frames.get(config.shared);current=config;
  scene?.hoverPlace?.(null);
  if(sourceKey!==config.shared){
   map.getSource(key).setData(protocol(frame.url,'faces','parts'));
   map.getSource(key+'-edges').setData(protocol(frame.url,'arcs'));
   map.getSource(key+'-outlines').setData(empty);sourceKey=config.shared;selected='';
  }
  const colors=new Map();
  for(const f of frame.features){const u=unit(config,f.properties.id);if(!u)continue;const color=colorOf(u);if(!colors.has(color))colors.set(color,[]);colors.get(color).push(f.properties.id);}
  const paint=colors.size?['match',['get','id'],...[...colors].flatMap(([color,keys])=>[keys,color]),OTHER_LAND]:OTHER_LAND;
  map.setPaintProperty(ids.fill,'fill-color',paint);map.setPaintProperty(ids.fill,'fill-opacity',1);
  // Adjacent history cells form one territory. Antialiasing each selected
  // cell separately exposes pale internal seams through the translucent fill.
  map.setPaintProperty(ids.selectedFill,'fill-antialias',false);
  {
   const visible=frame.edges.filter(({properties:{l,r}})=>r>=0&&config.face[l]!==config.face[r]&&(config.face[l]>=0||config.face[r]>=0)).map(f=>f.properties.id);
   map.setFilter(ids.lines,membershipFilter('id',visible));
  }
  map.setPaintProperty(ids.lines,'line-opacity',.85);
  scene?.setSnapshot(country,{replaceContexts:replaced,keepWater:false});
  syncControls();
 }
 function outline(config,picked){
  if(!original||!frame)return;
  const id=picked?.id||'',wanted=frame.features.filter(f=>unit(config,f.properties.id)?.id===id).map(f=>f.properties.id);
  map.setFilter(ids.selectedFill,membershipFilter('id',wanted));map.setPaintProperty(ids.selectedFill,'fill-opacity',.45);
  if(id===selected&&outlinedConfig===config)return;
  selected=id;outlinedConfig=config;
  let lines=empty;
  if(id){
   lines={type:'FeatureCollection',features:frame.edges.filter(({properties:{l,r}})=>(unit(config,l)?.id===id)!==(r>=0&&unit(config,r)?.id===id)).map(f=>({...f,properties:{id}}))};
  }
  const previous=outlineUrl;outlineUrl=id?blob(encodeGeo(lines,{},{scale:1e6})):null;
  map.getSource(key+'-outlines').setData(outlineUrl?protocol(outlineUrl):empty);
  if(previous)retiredOutlines.add(previous);
  map.setFilter(ids.selected,id?['==',['get','id'],id]:['==',['get','id'],'']);
 }
 function syncControls({borders=true}={}){
  if(!original)return;
  for(const id of Object.values(ids))map.setLayoutProperty(id,'visibility',id===ids.lines&&!borders?'none':'visible');
  if(map.getLayer(country+'-international'))map.setLayoutProperty(country+'-international','visibility','none');
 }
 function remove(){
  if(!original)return;
  for(const [id,value]of original.sources)map.getSource(id)?.setData(value);
  releaseOutline();tiles.stop();
  for(const [id,layer]of original.layers)if(map.getLayer(id)){
   for(const property of ['fill-color','fill-opacity','fill-antialias','line-color','line-opacity'])if(property.startsWith(layer.type+'-'))map.setPaintProperty(id,property,layer.paint?.[property]??null);
   map.setFilter(id,layer.filter??null);map.setLayoutProperty(id,'visibility',layer.layout?.visibility||'visible');
  }
  original=null;current=frame=outlinedConfig=null;sourceKey=selected='';scene?.setSnapshot(null);
 }
 return {layers,load,prepare,draw,outline,remove,syncControls,
  get data(){return data;},
  coversLabel(center){return [...frames.values()].some(frame=>shapeAtLocation(frame.shapes,{lng:center[0],lat:center[1]}));},
  hoverIds(config,picked){return frame.features.filter(f=>unit(config,f.properties.id)?.id===picked.id).map(f=>f.properties.id);},
  find(config,id){const picked=config.units.find(u=>u.id===id);if(!picked)return null;const face=frames.get(config.shared).features.find(f=>unit(config,f.properties.id)?.id===id)?.properties.id;return {unit:picked,face};},
  unit,
  pick(point,config=current){if(!frame||!config)return null;return shapeAt(map,frame.shapes,point,p=>!!unit(config,p.id))?.properties.id??null;},
  pickLocation(location,config=current){const prepared=frames.get(config.shared);return prepared?shapeAtLocation(prepared.shapes,location,p=>!!unit(config,p.id))?.properties.id??null:null;},
  dispose(){remove();tiles.stop();if(outlineListening){map.off('sourcedata',flushOutlines);outlineListening=false;}generation++;controller?.abort();for(const url of urls)URL.revokeObjectURL(url);urls.clear();retiredOutlines.clear();frames.clear();data=loading=controller=null;}
 };
}
