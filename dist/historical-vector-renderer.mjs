import {decodeData,fetchBytes} from './geo-pack.mjs';
import {membershipFilter} from './interaction-policy.mjs';
import {mapPalette} from './map-palette.mjs';
import {russiaHistoricalSelectionColors} from './russia-history.mjs';
import {setHistoricalCoastCoverage} from './historical-coast-detail.mjs';

// The immutable historical scene replaces the existing first-level source
// and four layers in place. Dates change paint only; the tile source stays put.
export function createHistoricalVectorRenderer(map,{country,base,scene,selectionColors=country==='russia'?russiaHistoricalSelectionColors:{}}){
 const key=country+'-first',sources=[key,key+'-edges',key+'-outlines'];
 const ids={fill:key+'-fill',lines:key+'-lines',selected:key+'-selected',selectedFill:key+'-selection-fill'};
 const layers=new Set(Object.values(ids)),registry=globalThis.AtlasCountries.countries;
 const related=Object.values(registry).filter(entry=>entry.parent===country&&entry.snapshot);
 // Western modern Poland lies outside every Russian historical footprint.
 // Its neutral land must remain beneath the snapshot's opaque eastern cells.
 const replaced=[...new Set([country,...related.flatMap(entry=>entry.snapshot.replaces||[]),...(registry[country].map.historyContexts||[])])].filter(id=>country!=='russia'||id!=='poland');
 const url=new URL(base+'history/tiles/scene.bin',document.baseURI).href;
 let data,loading,controller,generation=0,original,current,selected='',committed=false,labelFrame=0;
 const labels=new Map(),picks=new Map(),frames=new Map();
 let outlinedConfig;
 const locationKey=({lng,lat})=>(((lng+180)%360+360)%360-180).toFixed(7)+','+lat.toFixed(7);
 const identity=u=>u&&(u.selectionGroup||u.id||u.key||u.version||u.state);
 const shade=color=>{const rgb=/^#[a-f\d]{6}$/i.test(color)&&[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));return rgb?'#'+rgb.map(v=>Math.round(v*.72+255*.28).toString(16).padStart(2,'0')).join(''):color;};
 const unit=(config,id)=>id==null?null:config.units[config.face[id]];
 const subset=(values,field='id')=>membershipFilter(field,values);
 // Only physical cells participate in paint and hover. Retained authoring
 // tables also contain cells dissolved into their canonical neighbors.
 function frame(config){
  let value=frames.get(config);if(value){frames.delete(config);frames.set(config,value);return value;}
  const units=new Map(),groups=new Map(),ids=data.renderFaces||Array.from({length:config.face.length},(_,id)=>id);
  for(const id of ids){const index=config.face[id],u=config.units[index];if(!u)continue;
   if(!units.has(index))units.set(index,[]);units.get(index).push(id);
   const key=identity(u);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);
  }
  const owner=field=>units.size?['match',['get',field],...[...units].flatMap(([index,faces])=>[faces,index]),-1]:-1;
  value={units,groups,...(data.renderFaces?{left:owner('l'),right:owner('r')}:{})};frames.set(config,value);if(frames.size>4)frames.delete(frames.keys().next().value);return value;
 }

 function load(){
  if(loading)return loading;const token=generation;controller=new AbortController();const signal=controller.signal;
  const task=(async()=>{const value=await decodeData(await fetchBytes(url,{signal}),{signal});if(token!==generation)throw new DOMException('History closed','AbortError');
   if(value.version!==1||value.tiles.version!==1)throw Error('Unsupported Historical scene');
   data=value;data.hostFaces=new Map();for(const [location,face]of Object.entries(data.labels)){const [lng,lat]=location.split(',').map(Number);labels.set(locationKey({lng,lat}),face);}return data;
  })().catch(error=>{if(loading===task)loading=null;throw error;});loading=task;return loading;
 }
 function save(){
  if(original)return;
  scene?.hoverPlace?.(null);const style=map.getStyle();
  original={sources:new Map(sources.map(id=>[id,structuredClone(style.sources[id])])),layers:style.layers.filter(layer=>layers.has(layer.id)).map(layer=>structuredClone(scene?.baseLayer(layer)||layer)),international:scene?.baseVisibility(country+'-international')??map.getLayoutProperty(country+'-international','visibility')??'visible'};
  if(original.layers.length!==4)throw Error('Historical scene requires its four existing layers');
  for(const layer of original.layers)map.removeLayer(layer.id);
  for(const id of sources)map.removeSource(id);
  const sceneURL=new URL(data.tiles.manifest||url,url);sceneURL.searchParams.set('v',data.tiles.contentSha256);
  const tiles='atlas-history://'+country+'/{z}/{x}/{y}?'+new URLSearchParams({scene:sceneURL.href});
  map.addSource(key,{type:'vector',tiles:[tiles],minzoom:0,maxzoom:data.tiles.maxzoom,promoteId:'id',attribution:original.sources.get(key).attribution});
  for(const layer of original.layers){
   const face=layer.type==='fill',selection=layer.id===ids.selected||layer.id===ids.selectedFill;
   const atlas={...(layer.metadata?.atlas||{}),...(selection?{role:'selection',preserveSelectionOpacity:true,stableSelectionFill:false,selection:false,selectionDraw:false,visibleStates:null}:{}),historicalSnapshot:true};
   const paint={...layer.paint};
   if(face){paint['fill-antialias']=false;paint['fill-opacity']=layer.id===ids.fill?1:0;}
   else paint['line-opacity']=0;
   const {filter,...definition}=layer;
   map.addLayer({...definition,source:key,'source-layer':face?'faces':'edges',metadata:{...layer.metadata,atlas},layout:{...layer.layout,visibility:'visible'},paint});
   scene?.setLayerWarming(layer.id,true);
  }
  map.on('sourcedata',reveal);map.on('render',reveal);reveal();
  if(country!=='russia')map.on('sourcedata',refreshLabels);
  if(data.coasts?.length)setHistoricalCoastCoverage(map,data.coasts);
 }
 function reveal(){
  if(!original||committed||!map.getSource(key)||!map.isSourceLoaded(key))return;
  committed=true;
  for(const id of layers)scene?.setLayerWarming(id,false);
  scene?.setSnapshot(country,{replaceContexts:[...new Set([...replaced,...(data.replaceContexts||[])])],keepWater:country!=='russia',preserveContextFeatures:country!=='russia'});
  map.off('sourcedata',reveal);map.off('render',reveal);map.fire('atlashistoryready',{country});map.triggerRepaint();
 }
 // Rendered picking becomes available after visible tiles load. A failed
 // lookup before that point must not leave a modern label cached forever.
 function refreshLabels(event){
  if(event.sourceId!==key||!original||!committed||labelFrame||!map.isSourceLoaded(key))return;
  labelFrame=requestAnimationFrame(()=>{labelFrame=0;if(original&&current)map.fire('atlashistoryready',{country});});
 }
 function draw(config,colorOf){
  current=config;save();
  const colors=new Map();
  const background=map.getPaintProperty('background','background-color');
  const rgb=/^#[a-f\d]{6}$/i.test(background)?'rgb('+[1,3,5].map(i=>parseInt(background.slice(i,i+2),16)).join(',')+')':background;
  const water=paint=>['case',['==',['get','water'],true],rgb,paint];
  for(const [index,faces]of frame(config).units){const color=colorOf(config.units[index]);if(!colors.has(color))colors.set(color,[]);colors.get(color).push(...faces);}
  map.setPaintProperty(ids.fill,'fill-color',water(colors.size?['match',['get','id'],...[...colors].flatMap(([color,faces])=>[faces,color]),mapPalette.country]:mapPalette.country));
  map.setPaintProperty(ids.selectedFill,'fill-color',water(colors.size?['match',['get','id'],...[...colors].flatMap(([color,faces])=>[faces,selectionColors[color]||shade(color)]),mapPalette.country]:mapPalette.country));
  const state=frame(config),visible=data.renderFaces?['all',['>=',['number',['get','r'],-1],0],['!',['boolean',['get','coast'],false]],['!',['boolean',['get','selectionOnly'],false]],['!=',state.left,state.right]]:subset(data.edges.filter(([,l,r,coast,selectionOnly])=>!coast&&!selectionOnly&&r>=0&&config.face[l]!==config.face[r]&&(config.face[l]>=0||config.face[r]>=0)).map(([id])=>id));
  map.setPaintProperty(ids.lines,'line-opacity',['case',visible,.85,0]);
  syncControls();
 }
 function outline(config,picked){
  if(!original)return;const next=identity(picked)||'';if(outlinedConfig===config&&selected===next)return;selected=next;outlinedConfig=config;
  const wanted=selected?frame(config).groups.get(selected)||[]:[];
  // Shared edges already carry both adjacent face IDs. Test their ownership
  // directly rather than sending hundreds of thousands of edge IDs to paint.
  const boundary=!selected?['literal',false]:data.renderFaces?['!=',subset(wanted,'l'),subset(wanted,'r')]:subset(data.edges.filter(([,l,r])=>(identity(unit(config,l))===selected)!==(r>=0&&identity(unit(config,r))===selected)).map(([id])=>id));
  map.setPaintProperty(ids.selectedFill,'fill-opacity',['case',['==',['get','water'],true],1,subset(wanted),1,0]);
  map.setPaintProperty(ids.selected,'line-opacity',['case',boundary,1,0]);
 }
 function syncControls({borders=true}={}){
  if(!original)return;
  for(const id of layers)map.setLayoutProperty(id,'visibility',id===ids.lines&&!borders?'none':'visible');
  if(map.getLayer(country+'-international'))map.setLayoutProperty(country+'-international','visibility','none');
 }
 function at(location,config,accept=true){
  const cacheKey=locationKey(location),cached=labels.get(cacheKey)??picks.get(cacheKey);if(cached!==undefined)return !accept||unit(config,cached)?cached:null;
  if(!original)return null;
  const transform=map.transform||map._camera?.transform;if(transform?.isLocationOccluded?.(location))return null;
  const point=map.project(location),canvas=map.getCanvas();if(point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)return null;
  const hit=map.queryRenderedFeatures(point,{layers:[ids.fill]}).find(f=>f.properties.water||!accept||unit(config,+f.properties.id));
  const face=hit&&!hit.properties.water?+hit.properties.id:null;if(face!==null){picks.set(cacheKey,face);if(picks.size>512)picks.delete(picks.keys().next().value);}return face;
 }
 function remove(){
  if(!original)return;
  map.off('sourcedata',reveal);map.off('render',reveal);scene?.hoverPlace?.(null);
  map.off('sourcedata',refreshLabels);cancelAnimationFrame(labelFrame);labelFrame=0;
  const saved=original;original=null;committed=false;
  for(const id of layers)if(map.getLayer(id))map.removeLayer(id);
  if(map.getSource(key))map.removeSource(key);
  for(const [id,source]of saved.sources)map.addSource(id,source);
  for(const layer of saved.layers)map.addLayer(layer);
  if(map.getLayer(country+'-international'))map.setLayoutProperty(country+'-international','visibility',saved.international);
  if(data.coasts?.length)setHistoricalCoastCoverage(map,null);
  current=outlinedConfig=null;selected='';frames.clear();scene?.setSnapshot(null);
 }
 return {layers,load,prepare(){if(!data)throw Error('Historical scene is unavailable');},draw,outline,remove,syncControls,
  get data(){return data;},unit,
  // The US partition already contains every modern state boundary. Its final
  // ownership table identifies the province beneath a foreign or territorial
  // historical cell, without loading a second geometry source for picking.
  hostPlace(face){const final=data.configs[data.years[Math.max(...Object.keys(data.years).map(Number))].config];return unit(final,face)?.state||null;},
  coversLabel(center){return at({lng:center[0],lat:center[1]},current,false)!==null;},
  hoverIds(config,picked){return frame(config).groups.get(identity(picked))||[];},
  find(config,id){const picked=config.units.find(u=>u.id===id);if(!picked)return null;const face=labels.get(locationKey({lng:picked.label[0],lat:picked.label[1]}))??config.face.findIndex((_,i)=>unit(config,i)?.id===id);return {unit:picked,face};},
  pick(point,config=current){return at(map.unproject(point),config);},pickLocation(location,config=current){return at(location,config);},
  dispose(){remove();generation++;controller?.abort();controller=loading=data=null;picks.clear();labels.clear();frames.clear();}
 };
}
