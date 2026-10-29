import {SELECTION_STATE_PREFIX,selectionFilter,selectionOpacity,selectedOpacity} from './interaction-policy.mjs';
import {createSelectionVisibility,selectionStates} from './selection-visibility.mjs';
export {selectionStates} from './selection-visibility.mjs';
import {sourceFile,outsideView,paddedView,behindGlobe} from './context-visibility.mjs';
import {regionalLineWidth,adaptiveOpacity} from './adaptive-lines.mjs';
import {selectedOutlineSource,prepareSelectionDraws} from './selection-draw.mjs';
// One scene owns drawing order and satellite paint for every country.
// Country modules supply normal paint; exceptional layers declare atlas metadata.
const scenes=new WeakMap();
export const layerBands=Object.freeze({background:0,land:10,imagery:20,context:30,fill:40,water:45,border:50,selection:60,waterLine:65,marker:70,label:80});
const defaults={background:'background',raster:'imagery',fill:'fill',line:'border',circle:'marker',symbol:'label'};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=value=>value===undefined?undefined:structuredClone(value);
const outlineOpacity=(source,value)=>typeof source==='string'&&/-(?:outlines|selection-edges)(?:-motion)?$/.test(source)&&!/(?:"visibleZoom"|"zoom")/.test(JSON.stringify(value)||'')?adaptiveOpacity(value??1):value;
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
 ['boolean',['feature-state','quizActive'],false],1-amount,
 ['boolean',['feature-state','quizCorrect'],false],.65,
 ['boolean',['feature-state','quizWrong'],false],.55,
 ['boolean',['feature-state','selected'],false],.3-.12*amount,
 ['boolean',['feature-state','hover'],false],.35-.2*amount,1-amount];
}
export const getMapScene=map=>scenes.get(map);
export function createMapScene(map,{version=globalThis.maplibregl?.getVersion?.()}={}){
 if(scenes.has(map))return scenes.get(map);
 const native=Object.fromEntries(['addLayer','moveLayer','removeLayer','setPaintProperty','setLayoutProperty','addSource','setFilter','getFilter','queryRenderedFeatures'].map(key=>[key,map[key]?.bind(map)]));
 const entries=new Map(),sourceIds=new Map(),selectionDrawSources=new Set();
 let warmPainter,warmRender,selectionDrawCulling=true;
 function attachWarmRenderer(){
  const painter=map.painter;
  if(version!=='6.11.2'||typeof painter?.renderLayer!=='function'||warmPainter===painter&&painter.renderLayer===warmRender)return;
  const renderLayer=painter.renderLayer,nativeRender=painter.render;warmPainter=painter;
  if(typeof nativeRender==='function')painter.render=function(style,...args){
   prepareSelectionDraws(style,selectionDrawSources);
   return nativeRender.call(this,style,...args);
  };
  warmRender=function(renderer,source,layer,coordinates,options){
   const entry=entries.get(layer?.id);if(entry?.warming)return;
   if(selectionDrawCulling&&entry?.selectionDraw&&entry.visibleStates)source=selectedOutlineSource(source,layer,selectionVisibility.ids(entry.source,entry.visibleStates));
   return renderLayer.call(this,renderer,source,layer,coordinates,options);
  };
  painter.renderLayer=warmRender;
 }

 attachWarmRenderer();map.on?.('webglcontextrestored',attachWarmRenderer);map.on?.('style.load',attachWarmRenderer);
 if(native.addSource)map.addSource=function(id,options){
  if(options.type==='geojson'&&/-(?:outlines|selection|selection-edges)$/.test(id))options={...options,promoteId:options.promoteId||'id',tolerance:.35};
  if(id.endsWith('-selection-edges')&&typeof options.data==='string'&&!options.data.startsWith('atlas-data://'))options={...options,data:'atlas-data://'+id+'?url='+encodeURIComponent(options.data)+'&transform=selection-outline'};
  sourceIds.set(id,options.promoteId);return native.addSource(id,options);
 };const getView=()=>{const bounds=map.getBounds?.()?.toArray?.();return bounds?paddedView(bounds.flat()):[-180,-90,180,90];};let culling=true,horizonCulling=true,selectionCulling=true,view=getView();let overview=false,borderPreparation=false;let satellite={visible:false,opacity:1},snapshot=null,snapshotContexts=[];
 if(map.removeSource){const remove=map.removeSource.bind(map);map.removeSource=id=>{const result=remove(id);sourceIds.delete(id);return result;};}
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
  const basePaint=clone(layer.paint||{});if(layer.type==='fill'){if(atlas.selection)basePaint['fill-opacity']=1;else if(!atlas.preserveSelectionOpacity&&basePaint['fill-opacity'])basePaint['fill-opacity']=selectedOpacity(basePaint['fill-opacity']);}
  if(layer.type==='line'&&role==='selection'){basePaint['line-width']=regionalLineWidth(1,true);basePaint['line-opacity']=outlineOpacity(layer.source,basePaint['line-opacity']??1);}
  const file=sourceFile(map,layer.source),context=['context','land'].includes(role)||layer.metadata?.atlasInternationalBorder;
  return {selectionDraw:!!atlas.selectionDraw,preserveSelectionOpacity:!!atlas.preserveSelectionOpacity,selection:!!atlas.selection,detailedBorder:!atlas.overview&&!!layer.metadata?.atlasInternationalBorder,replaceInOverview:!atlas.overview&&(['land','context'].includes(role)||!!layer.metadata?.atlasInternationalBorder),source:layer.source,visibleStates:atlas.visibleStates||(role==='selection'&&JSON.stringify(basePaint).includes('"feature-state"')?selectionStates:null),file:context?file:null,culled:!!(culling&&context&&offscreen(file)),type:layer.type,role,contextCountry:atlas.contextCountry,paint:basePaint,satellite:atlas.satellite??{},rendered:{},visibility:layer.layout?.visibility||'visible'};
 };
 const rank=layer=>layerBands[entries.get(layer.id)?.role||layer.metadata?.atlas?.role||defaults[layer.type]];
 function anchor(id,role,before){
  const present=layers().filter(l=>l.id!==id),band=layerBands[role];
  // A caller may reorder within its band, never cross another band's boundary.
  if(before&&present.some(l=>l.id===before&&rank(l)===band))return before;
  return present.find(l=>rank(l)>band)?.id;
 }
 function gatePaint(entry,out){if(entry.gate){const property=entry.type==='line'?'line-opacity':'fill-opacity';out[property]=numericOutputs(out[property]??1,base=>selectionOpacity(entry.gate.key,base));}return out;}
 function paint(entry){
  const out=clone(entry.paint),amount=satellite.visible?satellite.opacity:0,rule=entry.satellite;
  if(rule===false)return gatePaint(entry,out);
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
  return gatePaint(entry,out);
 }
 const emptySelection=entry=>!entry.warming&&selectionCulling&&entry.visibleStates&&!selectionVisibility.active(entry.source,entry.visibleStates);
 const visibility=(id,entry)=>{
  return entry.culled||emptySelection(entry)||overview&&entry.replaceInOverview&&!(snapshot&&id.startsWith(snapshot+'-'))&&!(borderPreparation&&entry.detailedBorder)?'none':snapshot&&!id.startsWith(snapshot+'-')&&(['line','circle','symbol'].includes(entry.type)||['water','selection'].includes(entry.role)||snapshotContexts.includes(entry.contextCountry))?'none':entry.visibility;
 };
 function render(id,entry){
  for(const [key,value] of Object.entries(paint(entry)))if(!same(entry.rendered[key],value)){native.setPaintProperty(id,key,value);entry.rendered[key]=clone(value);}
 }
 function configureGate(id,entry,filter){
  const parsed=selectionFilter(filter);if(!parsed||!map.setFeatureState||!native.setFilter||!(entry.selection||entry.role==='selection'||id.endsWith('-selection-fill'))||sourceIds.get(entry.source)!==parsed.property)return false;
  if(!entry.gate){entry.gate={key:SELECTION_STATE_PREFIX+id,id:null,property:parsed.property};entry.gateStates=entry.visibleStates;entry.visibleStates=[entry.gate.key];}
  const gate=entry.gate;entry.filter=clone(filter);
  if(gate.id!==parsed.id){if(gate.id!==null&&gate.id!=='')map.setFeatureState({source:entry.source,id:gate.id},{[gate.key]:false});gate.id=parsed.id;if(parsed.id!=='')map.setFeatureState({source:entry.source,id:parsed.id},{[gate.key]:true});}
  return true;
 }
 map.addLayer=function(definition,before){
  if(map.getLayer(definition.id))throw Error('Layer already exists: '+definition.id);
  const entry=describe(definition);configureGate(definition.id,entry,definition.filter);const rendered=paint(entry);
  const {filter,...unfiltered}=definition;
  native.addLayer({...entry.gate?unfiltered:definition,layout:{...definition.layout,visibility:visibility(definition.id,entry)},paint:rendered},anchor(definition.id,entry.role,before));
  entries.set(definition.id,entry);if(entry.selectionDraw)selectionDrawSources.add(entry.source);entry.rendered=clone(rendered);return map;
 };
 map.moveLayer=function(id,before){
  const layer=map.getLayer(id);if(!layer)return native.moveLayer(id,before);
  native.moveLayer(id,anchor(id,entries.get(id)?.role||describe(layer).role,before));return map;
 };
 map.removeLayer=function(id){const entry=entries.get(id);if(entry?.gate&&entry.gate.id!==null&&entry.gate.id!=='')map.setFeatureState({source:entry.source,id:entry.gate.id},{[entry.gate.key]:false});const result=native.removeLayer(id);entries.delete(id);if(entry?.selectionDraw&&![...entries.values()].some(e=>e.selectionDraw&&e.source===entry.source))selectionDrawSources.delete(entry.source);return result;};
 map.setPaintProperty=function(id,key,value,...options){
  const entry=entries.get(id);if(entry?.type==='fill'&&key==='fill-opacity'&&!entry.preserveSelectionOpacity)value=entry.selection?1:selectedOpacity(value);if(!entry)return native.setPaintProperty(id,key,value,...options);
  if(entry.type==='line'&&entry.role==='selection'&&key==='line-width')value=regionalLineWidth(1,true);
  if(entry.type==='line'&&entry.role==='selection'&&key==='line-opacity')value=outlineOpacity(entry.source,value??1);
  if(value==null){delete entry.paint[key];native.setPaintProperty(id,key,value,...options);delete entry.rendered[key];}
  else entry.paint[key]=clone(value);
  render(id,entry);return map;
 };
 map.setLayoutProperty=function(id,key,value,...options){const entry=entries.get(id);if(key==='visibility'&&entry){entry.visibility=value||'visible';return native.setLayoutProperty(id,key,visibility(id,entry),...options);}return native.setLayoutProperty(id,key,value,...options);};
 if(native.setFilter)map.setFilter=function(id,filter,...options){const entry=entries.get(id);if(entry){const gated=!!entry.gate;if(configureGate(id,entry,filter)){if(!gated)native.setFilter(id,null,...options);render(id,entry);native.setLayoutProperty(id,'visibility',visibility(id,entry));return map;}if(gated){const gate=entry.gate;if(gate.id!==null&&gate.id!=='')map.setFeatureState({source:entry.source,id:gate.id},{[gate.key]:false});delete entry.gate;delete entry.filter;entry.visibleStates=entry.gateStates;render(id,entry);native.setLayoutProperty(id,'visibility',visibility(id,entry));}}return native.setFilter(id,filter,...options);};
 if(native.getFilter)map.getFilter=id=>entries.get(id)?.gate?clone(entries.get(id).filter):native.getFilter(id);
 if(native.queryRenderedFeatures)map.queryRenderedFeatures=(...args)=>native.queryRenderedFeatures(...args).filter(feature=>{const entry=entries.get(feature.layer?.id);return !entry?.warming&&(!entry?.gate||String(feature.properties?.[entry.gate.property])===String(entry.gate.id));});
 const scene={
  get canWarmLayers(){return warmPainter===map.painter&&!!warmRender&&map.painter?.renderLayer===warmRender;},
  setLayerWarming(id,value){const entry=entries.get(id);if(!entry)return;entry.warming=!!value;render(id,entry);},
  setOverview(value){value=!!value;if(overview===value)return;overview=value;for(const [id,entry]of entries)if(entry.replaceInOverview)native.setLayoutProperty(id,'visibility',visibility(id,entry));},
  get overview(){return overview;},
  setBorderPreparation(value){value=!!value;if(borderPreparation===value)return;borderPreparation=value;for(const [id,entry]of entries)if(entry.detailedBorder)native.setLayoutProperty(id,'visibility',visibility(id,entry));},
  setCulling(value){culling=!!value;updateView();},
  setHorizonCulling(value){horizonCulling=!!value;updateView();},
  setSelectionDrawCulling(value){selectionDrawCulling=!!value;map.triggerRepaint();},
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
  baseLayer(layer){return {...layer,...(entries.get(layer.id)?.gate?{filter:clone(entries.get(layer.id).filter)}:{}),layout:{...layer.layout,visibility:entries.get(layer.id)?.visibility||layer.layout?.visibility||'visible'},paint:clone(entries.get(layer.id)?.paint||layer.paint)};},
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
