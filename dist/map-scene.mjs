import {createSelectionVisibility} from './selection-visibility.mjs';
export {selectionStates} from './selection-visibility.mjs';
import {sourceFile,outsideView,paddedView,behindGlobe} from './context-visibility.mjs';
import {regionalLineWidth} from './adaptive-lines.mjs';
// One scene owns drawing order and satellite paint for every country.
// Country modules supply normal paint; exceptional layers declare atlas metadata.
const scenes=new WeakMap();
export const layerBands=Object.freeze({background:0,land:10,imagery:20,context:30,fill:40,water:45,border:50,selection:60,waterLine:65,marker:70,label:80});
const defaults={background:'background',raster:'imagery',fill:'fill',line:'border',circle:'marker',symbol:'label'};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=value=>value===undefined?undefined:structuredClone(value);
function numericOutputs(value,transform){
 if(Array.isArray(value)&&['interpolate','interpolate-hcl','interpolate-lab'].includes(value[0])&&value[2]?.[0]==='zoom')
  return value.map((v,i)=>i>=4&&i%2===0?transform(v):v);
 if(Array.isArray(value)&&value[0]==='step'&&value[1]?.[0]==='zoom')
  return value.map((v,i)=>i>=2&&i%2===0?transform(v):v);
 return transform(value);
}
function fade(base,amount,highlight){
 if(!amount||base===0)return base;
 return numericOutputs(base,value=>!highlight&&typeof value==='number'?value*(1-amount):highlight?['+',['*',value,1-amount],['*',amount,['case',['boolean',['feature-state','selected'],false],.18,['boolean',['feature-state','hover'],false],.15,0]]]:['*',value,1-amount]);
}
export function blendColor(from,to,amount){
 if(!amount)return from;if(amount===1)return to;
 const rgb=color=>typeof color==='string'&&/^#[\da-f]{3}([\da-f]{3})?$/i.test(color)?(color.length===4?color.slice(1).split('').map(v=>v+v).join(''):color.slice(1)).match(/../g).map(v=>parseInt(v,16)):null;
 const a=rgb(from),b=rgb(to);
 if(a&&b)return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*amount).toString(16).padStart(2,'0')).join('');
 return numericOutputs(from,value=>['interpolate',['linear'],amount,0,value,1,to]);
}
export function provinceOpacity(visible,opacity=1){
 const amount=visible?opacity:0;return ['case',
 ['boolean',['feature-state','inactive'],false],1-amount,
 ['boolean',['feature-state','quizActive'],false],1,
 ['boolean',['feature-state','quizCorrect'],false],.65,
 ['boolean',['feature-state','quizWrong'],false],.55,
 ['boolean',['feature-state','selected'],false],.3-.12*amount,
 ['boolean',['feature-state','hover'],false],.35-.2*amount,1-amount];
}
export const getMapScene=map=>scenes.get(map);
export function createMapScene(map){
 if(scenes.has(map))return scenes.get(map);
 const native=Object.fromEntries(['addLayer','moveLayer','removeLayer','setPaintProperty','setLayoutProperty'].map(key=>[key,map[key].bind(map)]));
 const entries=new Map();const getView=()=>{const bounds=map.getBounds?.()?.toArray?.();return bounds?paddedView(bounds.flat()):[-180,-90,180,90];};let culling=true,horizonCulling=true,selectionCulling=true,view=getView();let overview=false,borderPreparation=false;let satellite={visible:false,opacity:1},snapshot=null,snapshotContexts=[];
 // The pinned renderer exposes altitude on its transform. Missing or invalid
 // altitude falls back to the conservative back hemisphere, never tighter culling.
 const globeView=()=>{if(!map.style)return null;if(map.getProjection?.()?.type!=='globe'||!(map.getZoom?.()<5)||map.getPitch?.()>0)return null;const transform=map.transform||map._camera?.transform,altitude=transform?.getCameraAltitude?.();return {center:map.getCenter(),minimumFacing:Number.isFinite(altitude)&&altitude>6371008.8*.05?6371008.8/(6371008.8+altitude):0};};
 let globe=globeView();
 const offscreen=file=>outsideView(file,view)||(horizonCulling&&globe&&behindGlobe(file,globe.center,globe.minimumFacing));
 const selectionVisibility=createSelectionVisibility(map,source=>{for(const [id,entry]of entries)if(entry.source===source&&entry.visibleStates)native.setLayoutProperty(id,'visibility',visibility(id,entry));});
 const layers=()=>map.getStyle()?.layers||[];
 const describe=layer=>{
  const atlas=layer.metadata?.atlas||{},role=atlas.role||defaults[layer.type];
  if(!(role in layerBands))throw Error('Declare an atlas layer role for '+layer.id);
  // One selected-outline profile applies to every adapter, administrative
  // level and motion copy, including older fixed-width country definitions.
  const basePaint=clone(layer.paint||{});
  if(layer.type==='line'&&role==='selection')basePaint['line-width']=regionalLineWidth(1,true);
  const file=sourceFile(map,layer.source),context=['context','land'].includes(role)||layer.metadata?.atlasInternationalBorder;
  return {detailedBorder:!atlas.overview&&!!layer.metadata?.atlasInternationalBorder,replaceInOverview:!atlas.overview&&(['land','context'].includes(role)||!!layer.metadata?.atlasInternationalBorder),source:layer.source,visibleStates:atlas.visibleStates||null,file:context?file:null,culled:!!(culling&&context&&offscreen(file)),type:layer.type,role,contextCountry:atlas.contextCountry,paint:basePaint,satellite:atlas.satellite??{},rendered:{},visibility:layer.layout?.visibility||'visible'};
 };
 const rank=layer=>layerBands[entries.get(layer.id)?.role||layer.metadata?.atlas?.role||defaults[layer.type]];
 function anchor(id,role,before){
  const present=layers().filter(l=>l.id!==id),band=layerBands[role];
  // A caller may reorder within its band, never cross another band's boundary.
  if(before&&present.some(l=>l.id===before&&rank(l)===band))return before;
  return present.find(l=>rank(l)>band)?.id;
 }
 function paint(entry){
  const out=clone(entry.paint),amount=satellite.visible?satellite.opacity:0,rule=entry.satellite;
  if(rule===false)return out;
  if(entry.type==='fill'){
   const base=entry.paint['fill-opacity']??1,mode=rule.fill||(entry.role==='context'?'fade':entry.role==='fill'?'highlight':'none');
   out['fill-opacity']=base;
   if(mode==='province')out['fill-opacity']=provinceOpacity(satellite.visible,satellite.opacity);
   else if(mode!=='none')out['fill-opacity']=fade(base,amount,mode==='highlight');
  }
  if(entry.type==='line'){
   if(rule.lineOpacity==='fade')out['line-opacity']=fade(entry.paint['line-opacity']??1,amount,false);
   else if(entry.role==='border'||entry.role==='selection')out['line-color']=blendColor(entry.paint['line-color']??'#000000',rule.lineColor||'#fff0bb',amount);
  }
  return out;
 }
 const emptySelection=entry=>selectionCulling&&entry.visibleStates&&!selectionVisibility.active(entry.source,entry.visibleStates);
 const visibility=(id,entry)=>{
  return entry.culled||emptySelection(entry)||overview&&entry.replaceInOverview&&!(snapshot&&id.startsWith(snapshot+'-'))&&!(borderPreparation&&entry.detailedBorder)?'none':snapshot&&!id.startsWith(snapshot+'-')&&(['line','circle','symbol'].includes(entry.type)||['water','selection'].includes(entry.role)||snapshotContexts.includes(entry.contextCountry))?'none':entry.visibility;
 };
 function render(id,entry){
  for(const [key,value] of Object.entries(paint(entry)))if(!same(entry.rendered[key],value)){native.setPaintProperty(id,key,value);entry.rendered[key]=clone(value);}
 }
 map.addLayer=function(definition,before){
  if(map.getLayer(definition.id))throw Error('Layer already exists: '+definition.id);
  const entry=describe(definition),rendered=paint(entry);
  native.addLayer({...definition,layout:{...definition.layout,visibility:visibility(definition.id,entry)},paint:rendered},anchor(definition.id,entry.role,before));
  entries.set(definition.id,entry);entry.rendered=clone(rendered);return map;
 };
 map.moveLayer=function(id,before){
  const layer=map.getLayer(id);if(!layer)return native.moveLayer(id,before);
  native.moveLayer(id,anchor(id,entries.get(id)?.role||describe(layer).role,before));return map;
 };
 map.removeLayer=function(id){const result=native.removeLayer(id);entries.delete(id);return result;};
 map.setPaintProperty=function(id,key,value,...options){
  const entry=entries.get(id);if(!entry)return native.setPaintProperty(id,key,value,...options);
  if(entry.type==='line'&&entry.role==='selection'&&key==='line-width')value=regionalLineWidth(1,true);
  if(value==null){delete entry.paint[key];native.setPaintProperty(id,key,value,...options);delete entry.rendered[key];}
  else entry.paint[key]=clone(value);
  render(id,entry);return map;
 };
 map.setLayoutProperty=function(id,key,value,...options){const entry=entries.get(id);if(key==='visibility'&&entry){entry.visibility=value||'visible';return native.setLayoutProperty(id,key,visibility(id,entry),...options);}return native.setLayoutProperty(id,key,value,...options);};
 const scene={
  setOverview(value){value=!!value;if(overview===value)return;overview=value;for(const [id,entry]of entries)if(entry.replaceInOverview)native.setLayoutProperty(id,'visibility',visibility(id,entry));},
  get overview(){return overview;},
  setBorderPreparation(value){value=!!value;if(borderPreparation===value)return;borderPreparation=value;for(const [id,entry]of entries)if(entry.detailedBorder)native.setLayoutProperty(id,'visibility',visibility(id,entry));},
  setCulling(value){culling=!!value;updateView();},
  setHorizonCulling(value){horizonCulling=!!value;updateView();},
  setSelectionCulling(value){selectionCulling=!!value;for(const [id,entry]of entries)if(entry.visibleStates)native.setLayoutProperty(id,'visibility',visibility(id,entry));},
  cullingStats(){let culledLayers=0,contextLayers=0,emptySelectionLayers=0;for(const entry of entries.values()){if(entry.culled)culledLayers++;if(entry.file)contextLayers++;if(emptySelection(entry))emptySelectionLayers++;}return {enabled:culling,horizonCulling,selectionCulling,culledLayers,contextLayers,emptySelectionLayers};},
  setSnapshot(id,{replaceContexts=[]}={}){if(snapshot===id&&same(snapshotContexts,replaceContexts))return;snapshot=id;snapshotContexts=[...replaceContexts];for(const [key,entry]of entries)native.setLayoutProperty(key,'visibility',visibility(key,entry));},
  setSatellite(visible,opacity=1){
   const next={visible:!!visible,opacity:Math.max(0,Math.min(1,opacity))};
   if(same(next,satellite))return;satellite=next;
   for(const [id,entry] of entries)render(id,entry);
  },
  get satellite(){return {...satellite};},
  baseVisibility(id){return entries.get(id)?.visibility||map.getLayoutProperty(id,'visibility')||'visible';},
  basePaint(id,key){const entry=entries.get(id);return clone(entry?(entry.paint[key]??(key==='fill-opacity'?1:key==='line-color'?'#000000':undefined)):map.getPaintProperty(id,key));},
  baseLayer(layer){return {...layer,layout:{...layer.layout,visibility:entries.get(layer.id)?.visibility||layer.layout?.visibility||'visible'},paint:clone(entries.get(layer.id)?.paint||layer.paint)};},
  role(id){return entries.get(id)?.role;},
  assertOrder(){let previous=-Infinity;for(const layer of layers()){const current=rank(layer);if(current<previous)throw Error('Layer outside its band: '+layer.id);previous=current;}return true;}
 };
 function updateView(){
  // Context restoration resizes before its asynchronously restored style loads.
  if(map.style===null||map.style?._loaded===false)return;
  view=getView();globe=globeView();
  for(const [id,entry]of entries){const hidden=culling&&offscreen(entry.file);if(entry.culled===hidden)continue;entry.culled=hidden;native.setLayoutProperty(id,'visibility',visibility(id,entry));}
 }
 map.on?.('move',updateView);map.on?.('resize',updateView);map.on?.('projectiontransition',updateView);map.on?.('style.load',updateView);
 scenes.set(map,scene);return scene;
}
