import {membershipFilter} from './interaction-policy.mjs';
import {packShapes,shapeAt,shapeAtLocation} from './historic-shapes.mjs';
export {packShapes,shapeAt,shapeAtLocation} from './historic-shapes.mjs';
import {createHistoricalGeometryBudget,createHistoricalTileBudget} from './historical-geometry-budget.mjs';
import {polygonParts} from './polygon-parts.mjs';
import {selectionLineSourceOptions} from './outline-detail.mjs';
import {createHistoricalAlaska} from './historical-alaska.mjs';
import {createHistoricalRegion} from './historical-region-display.mjs';
import {createHistoricalCoastDetail} from './historical-coast-detail.mjs';
import {adaptiveOpacity,lineSourceOptions,internationalBorderPaint,regionalLineWidth} from './adaptive-lines.mjs';
import {addRegionalBoundarySources,compactUrl,decodeData,fetchBytes} from './geo-pack.mjs';
import {mapPalette} from './map-palette.mjs';
import {blendColor,getMapScene} from './map-scene.mjs';
import {containsScope,paddedView,reusableHistoricalScope,historicalOverviewCovered,historicalOverviewScope} from './context-visibility.mjs';
// Dated historical borders drawn over a country's present-day first level, shared by the
// Elections view's historic borders (elections.mjs) and the historical snapshot
// (historic-view.mjs). The data (scripts/build-us-historic-borders.mjs) is one mosaic of faces
// and edges for every date, with a list of configurations: a configuration assigns each face
// to a unit and lists the edges to draw, so changing date recolours and refilters without
// loading geometry. The geometry is decoded in MapLibre's workers; the page keeps the
// configurations, each edge's two faces and compact polygons for picking.

export const TRANSPARENT='rgba(0,0,0,0)';
// Land then held by another country is drawn like that country's land today.
export const OTHER_LAND=mapPalette.country;

// Host lines a view replaces while it draws its own: the present-day first-level borders and
// international border, and the host's selection outline. A restore uses the scene's base value,
// not the rendered one, so it does not wrap it twice; a host that wraps the map passes its scene.
export function createHostLines(map,{country,scene=getMapScene(map),own=()=>false}){
 const hidden=new Map();
 return function sync({borders=false,selection=false,international=true}={}){
  const want=new Set();
  for(const layer of map.getStyle().layers){
   if(layer.type!=='line'||!layer.id.startsWith(country+'-')||own(layer.id))continue;const role=layer.metadata?.atlas?.role;
   if(borders&&(role==='border'&&layer.id.startsWith(country+'-first')||international&&layer.id===country+'-international')||selection&&role==='selection')want.add(layer.id);
  }
  for(const [id,opacity] of hidden)if(!want.has(id)){if(map.getLayer(id))map.setPaintProperty(id,'line-opacity',opacity);hidden.delete(id);}
  for(const id of want)if(!hidden.has(id)){hidden.set(id,scene?.basePaint(id,'line-opacity')??map.getPaintProperty(id,'line-opacity'));map.setPaintProperty(id,'line-opacity',0);}
 };
}

// Historical arcs and election overlays do not carry the administrative
// mesh's visibleZoom attribute. Keep its normal opacity instead of fading out.
export function administrativeBorderPaint(map,lineLayer,scene=getMapScene(map)){
 const compatible=value=>Array.isArray(value)?value[0]==='get'&&value[1]==='visibleZoom'?['coalesce',value,0]:value.map(compatible):value;
 return map.getLayer(lineLayer)?Object.fromEntries(['line-color','line-width','line-opacity'].map(p=>[p,compatible(scene?.basePaint(lineLayer,p)??map.getPaintProperty(lineLayer,p))]).filter(([,v])=>v!==undefined)):{'line-color':'#587694','line-width':1};
}

// selection: a host whose selection is not its first level's ({fill, fillOpacity, line}) names its colours.
// Historical faces share boundaries across many periods. Simplifying them
// separately opens seams and inverts narrow pieces, so fills use exact paths.
export function createHistoricBorders(map,{country,base,file,tag='history',sourceUnit,frontierLines=false,frameOuter=false,lineLayer=country+'-first-lines',selection={},fillTolerance=0,scene=getMapScene(map)}){
 const batch=task=>scene?.batchFeatureState?scene.batchFeatureState(task):task();
 const prefix=country+'-'+tag;
 const layers={fill:prefix+'-fill',lines:prefix+'-lines',frontiers:prefix+'-frontiers',outer:prefix+'-outer',selected:prefix+'-selected',selectedFill:prefix+'-selected-fill',hostSelectedFill:prefix+'-host-selected-fill',water:prefix+'-water'};
 const sources={faces:prefix+'-faces',edges:prefix+'-edges',outer:prefix+'-borders',water:prefix+'-water',outlines:prefix+'-outlines',selection:prefix+'-selection',highlight:prefix+'-highlight'};
 const ownLayers=new Set(Object.values(layers));
 const geometry=country==='united-kingdom'?createHistoricalGeometryBudget():null;
 const tileBudget=geometry?createHistoricalTileBudget(map,prefix):null;
 const region=createHistoricalRegion(map,{country,base,packShapes,shapeAt,ownLayers});
 const alaska=createHistoricalAlaska(map,{country,base,packShapes,shapeAt,ownLayers});
 const exclude=(field,filter)=>alaska.exclude(field,region.exclude(field,filter));
 let coastOutline,coastBorders;
 const coast=createHistoricalCoastDetail(map,{base,prefix,ownLayers,scene,geometry,onSwap:()=>{
  syncMosaicFill();
  coastBorders?.();
  coastOutline?.();
 }});
 const empty={type:'FeatureCollection',features:[]};
 const frames=new Map();
 let waterScope;
 const waterUrl=scope=>{
  const url='atlas-data://'+prefix+'-water?'+new URLSearchParams({url:new URL(compactUrl(base+'history/'+data.coastWater),document.baseURI).href,transform:'historical-water',...(geometry?{}:{scope:scope.join(',')})});
  return geometry?withScope(url):url;
 };
 function syncWater(){
  if(!data?.coastWater||!map.getSource(sources.water))return;
  const view=map.getBounds().toArray().flat();
  if(!geometry&&waterScope&&containsScope(waterScope,view))return;
  const next=geometry?mosaicScopes.map(scope=>scope.join(',')).join(';'):null;
  if(geometry&&waterScope===next)return;
  waterScope=geometry?next:paddedView(view);map.getSource(sources.water).setData(waterUrl(waterScope));
 }
 let loadGeneration=0,loadController;
 let data=null,loading=null,frame=null,outlined=null,highlighted='',reveal=null,pendingColors;
 let mosaicFaces=['literal',true],mosaicVersion='',mosaicScope,currentConfig,currentReuseHost,edgesData,outerData;
 // The same source keeps the current and previous view. A return pan can
 // reuse its rendered tiles without decoding or resetting the dated fill.
 const mosaicScopes=[];let viewportTimer,motionSample,lookaheadView;
 const withScope=url=>url+(geometry?mosaicScopes.map(scope=>'&scope='+scope.join(',')).join(''):mosaicScope?'&scope='+mosaicScope.join(','):'');
 function syncViewport(prediction){
  if(!geometry||!currentConfig||!map.getSource(sources.faces))return;
  const view=map.getBounds().toArray().flat(),overview=map.getZoom()<7,lookahead=Array.isArray(prediction)?prediction:view;
  if(overview&&historicalOverviewCovered(mosaicScopes,view,currentConfig.units)&&historicalOverviewCovered(mosaicScopes,lookahead,currentConfig.units))return;
  const retained=mosaicScopes.find(scope=>reusableHistoricalScope(scope,view));if(!overview&&retained){mosaicScope=retained;return;}
  const previous=mosaicScope,before=mosaicScopes.slice();mosaicScope=overview?historicalOverviewScope(view,currentConfig.units,lookahead):paddedView(view,{minimum:.03});
  // Release a broad previous window when zooming into a close-up.
  const keep=previous&&previous[2]-previous[0]<=(mosaicScope[2]-mosaicScope[0])*3&&previous[3]-previous[1]<=(mosaicScope[3]-mosaicScope[1])*3;
  mosaicScopes.splice(0,mosaicScopes.length,mosaicScope,...(keep?[previous]:[]));
  tileBudget.preserve(map.isSourceLoaded(sources.faces)?before:null,mosaicScopes);
  mosaicVersion=activeFacesUrl(currentConfig,currentReuseHost);map.getSource(sources.faces).setData(mosaicVersion);
  if(edgesData)map.getSource(sources.edges)?.setData(withScope(edgesData));
  if(outerData)map.getSource(sources.outer)?.setData(withScope(outerData));
  syncWater();
 };
 function warmViewport(){
  if(map.getZoom()>=7)return;
  const now=performance.now(),center=map.getCenter(),view=map.getBounds().toArray().flat();
  if(motionSample&&now>motionSample.at){
   const dt=now-motionSample.at,dx=((center.lng-motionSample.lng+540)%360)-180;
   const x=Math.max(-60,Math.min(60,dx/dt*500)),y=Math.max(-20,Math.min(20,(center.lat-motionSample.lat)/dt*500));
   lookaheadView=[view[0]+x,Math.max(-90,view[1]+y),view[2]+x,Math.min(90,view[3]+y)];
  }
  motionSample={at:now,lng:center.lng,lat:center.lat};if(viewportTimer)return;
  viewportTimer=setTimeout(()=>{viewportTimer=null;if(map.getZoom()<7&&map.getSource(sources.faces)?.loaded())syncViewport(lookaheadView);},80);
 }
 function finishViewport(){clearTimeout(viewportTimer);viewportTimer=null;motionSample=lookaheadView=null;syncViewport();}

 let outlineScope,outlineGeneration=0,outlineBlob;
 const outlineBlobs=new Set();
 function clearPreparedOutline(){
  outlineGeneration++;geometry?.cancel('outline');outlineScope=null;outlineBlob=null;
  for(const url of outlineBlobs)URL.revokeObjectURL(url);outlineBlobs.clear();
 }
 function outlineLoaded(event){
  if(event.sourceId!==sources.selection||!map.getSource(sources.selection)||!map.isSourceLoaded(sources.selection))return;
  for(const url of outlineBlobs)if(url!==outlineBlob){URL.revokeObjectURL(url);outlineBlobs.delete(url);}
 }
 function refreshOutline(){if(geometry&&coastOutline)coastOutline();}
 async function prepareOutline(url){
  const generation=++outlineGeneration;
  try{
   let blob,preparedUrl=url;
   try{blob=await geometry.run('outline',url);}catch(error){
    if(error.name==='AbortError'||generation!==outlineGeneration)throw error;
    // Keep a visible outline from the retained mosaic if the finer coast is
    // over budget. A smaller zoom window retries the original detailed paths.
    const fallback=new URLSearchParams(url.slice(url.indexOf('?')+1));
    if(!fallback.has('coast')&&!fallback.has('coasts'))throw error;
    for(const key of ['coast','coasts','coastRegion'])fallback.delete(key);
    preparedUrl='atlas-data://'+prefix+'-unit?'+fallback;
    blob=await geometry.run('outline',preparedUrl);
   }
   if(generation!==outlineGeneration||!map.getSource(sources.selection))return;
   outlineBlob=URL.createObjectURL(blob);outlineBlobs.add(outlineBlob);
   const params=new URLSearchParams(preparedUrl.slice(preparedUrl.indexOf('?')+1));params.set('url',outlineBlob);params.set('prepared','1');
   map.getSource(sources.selection).setData('atlas-data://'+prefix+'-unit?'+params);
   // MapLibre keeps at most a current source load and its latest update.
   while(outlineBlobs.size>2){const first=outlineBlobs.values().next().value;URL.revokeObjectURL(first);outlineBlobs.delete(first);}
  }catch(error){if(error.name!=='AbortError')console.warn('Historical outline:',error.message);}
 }

 const activeFacesUrl=(config,reuseHost)=>withScope('atlas-data://'+country+'-history?'+new URLSearchParams({url:data.url,member:'faces',transform:'parts',faceConfig:data.configs.indexOf(config),...(reuseHost?{skipHosts:'1'}:{})}));
 const sharedSelection=()=>!frame&&!!data?.coasts?.length;
 function syncMosaicFill(){
  const filter=coast.filter(exclude('f',mosaicFaces));
  if(map.getLayer(layers.fill))map.setFilter(layers.fill,filter);
  if(sharedSelection()&&map.getLayer(layers.selectedFill))map.setFilter(layers.selectedFill,geometry?['all',filter,membershipFilter('f',selectedFaces)]:filter);
 }
 // A dated file's regions are coloured by feature state, so a new year repaints them instead of
 // laying out every tile again: about 0.7 s per election year for Canada's ridings.
 const selectedFaces=new Set(),stateSelectedFaces=new Set();
 let outlinedFaces=new Set();
 const regionFill=['to-color',['coalesce',['feature-state','fill'],TRANSPARENT]],painted=new Map();
 function paintRegions(){for(const [id,color] of pendingColors)if(painted.get(id)!==color){painted.set(id,color);map.setFeatureState({source:sources.faces,id},{fill:color});}}
 const frameUrl=(id,member,options)=>'atlas-data://'+id+'?'+new URLSearchParams({url:frame.url,member,...options});
 const frameFor=file=>frame?.file===file?frame:frames.get(file)?.value;
 // A UK year can replace thousands of chronology cells. Release the old
 // worker indexes, feature states and GPU tiles before admitting the new set.
 // Briefly yield so renderer/worker removal messages finish without overlapping
 // two full snapshots. Unchanged years never enter this path.
 let snapshotRelease;
 function prepareSnapshot(){
  if(snapshotRelease)return snapshotRelease;
  if(!geometry||!map.getSource(sources.faces))return;
  remove({keepPaint:true});
  return snapshotRelease=new Promise(resolve=>setTimeout(resolve,80)).finally(()=>{snapshotRelease=null;});
 }
 async function prepare(config){
  const {file}=config;
  if(!file||frame?.file===file)return;
  let entry=frames.get(file);
  if(!entry){
   entry={};
   entry.pending=decodeFrame(file).then(value=>{entry.value=value;});
   frames.set(file,entry);
   if(frames.size>2)frames.delete(frames.keys().next().value);
  }
  try{await entry.pending;}catch(error){if(frames.get(file)===entry)frames.delete(file);throw error;}
 }
 // Convert a dated file's unit IDs and shared edges into the face indices used by the renderer.
 async function decodeFrame(file){
   const url=new URL(compactUrl(base+file),document.baseURI).href;
   const loaded=await decodeData(await fetchBytes(url));
   const byId=new Map(loaded.units.map(unit=>[unit.id,unit]));
   const sides=loaded.edges.features.filter(f=>f.properties.b).map(f=>f.properties);
   return {file,url,units:loaded.units,byId,sides,shapes:packShapes(polygonParts(sourceUnit?{...loaded.regions,features:loaded.regions.features.filter(f=>f.properties.id===sourceUnit)}:loaded.regions).features)};
 }
 function load(){
  if(loading)return loading;
  const task=(async()=>{
   const generation=loadGeneration,controller=loadController=new AbortController();
   const bytes=await fetchBytes(compactUrl(base+file),{signal:controller.signal}),loaded=await decodeData(bytes,{signal:controller.signal,flatPaths:country==='united-kingdom',select:d=>({...d,borders:undefined,arcs:d.arcs&&{features:d.arcs.features.map(f=>({properties:f.properties}))},configs:Array.isArray(d.configs)?d.configs.map(({selectionLines,...config})=>({...config,exactOutline:!!selectionLines})):d.configs})});
   if(generation!==loadGeneration)throw new DOMException('History closed','AbortError');
   if(!loaded.faces){data=loaded;return data;}
   const displayBytes=country==='united-states'?await fetchBytes(compactUrl(base+'history/coastal-display.bin')):null,display=displayBytes?await decodeData(displayBytes):loaded;
   if(displayBytes&&display.historySource!==loaded.source.sha256)throw Error('Coastal display does not match the retained history');
   const sides=display.arcs.features.map(f=>f.properties),originalUrl=URL.createObjectURL(new Blob([bytes]));
   const sharedLand=display.faces.features.some(f=>f.properties.sharedSource);
   data={source:loaded.source,faceCount:loaded.faces.features.length,versions:loaded.versions,configs:loaded.configs,coasts:loaded.coasts,coastWater:loaded.coastWater,elections:loaded.elections,years:loaded.years,events:loaded.events,originalUrl,url:displayBytes?URL.createObjectURL(new Blob([displayBytes])):originalUrl,display:!!displayBytes,shapes:packShapes(sharedLand?polygonParts(display.faces).features:display.faces.features),sharedLand,hostFaces:new Map(display.faces.features.flatMap(({properties:p})=>p.hostId?[[p.f,p.hostId]]:[])),arcL:Int32Array.from(sides,a=>a.l),arcR:Int32Array.from(sides,a=>a.r),arcId:Int32Array.from(sides,a=>a.a)};
   await Promise.all([region.load(data),alaska.load(data)]);
   return data;
  })().catch(error=>{if(loading===task)loading=null;throw error;});
  loading=task;return task;
 }
 // Capture the ordinary state-line paint before the host lines are hidden.
 let normalPaint;
 const linePaint=()=>normalPaint??=administrativeBorderPaint(map,lineLayer,scene);
 // Country frontiers match the gray shared country-border layer.
 const frontierPaint=internationalBorderPaint;
 // A selected dated unit uses a single visible stroke, including its coast.
 const selectionPaint=()=>({...linePaint(),'line-width':regionalLineWidth(1,true),'line-opacity':1});
 function remove({keepPaint=false}={}){clearTimeout(viewportTimer);viewportTimer=motionSample=lookaheadView=null;map.off('move',warmViewport);map.off('moveend',finishViewport);mosaicScope=currentConfig=edgesData=outerData=null;mosaicScopes.length=0;tileBudget?.stop();map.off('moveend',refreshOutline);map.off('sourcedata',outlineLoaded);clearPreparedOutline();geometry?.clear();map.off('moveend',syncWater);waterScope=null;mosaicVersion='';if(reveal)map.off('render',reveal);reveal=null;frame=null;painted.clear();selectedFaces.clear();stateSelectedFaces.clear();outlinedFaces.clear();outlined=null;highlighted='';pendingColors=null;coastOutline=null;coast.remove();alaska.remove();region.remove();if(!keepPaint)normalPaint=undefined;for(const id of Object.values(layers))if(map.getLayer(id))map.removeLayer(id);for(const id of Object.values(sources))if(map.getSource(id))map.removeSource(id);}
 const none=['==',['get','a'],-1],round={'line-join':'round','line-cap':'round'};
 // The selected unit's fill, kept on top. A dated file adds its shape source only when a
 // highlight is first asked for: an extra source, even empty, slowed each election year change
 // by about half a second.
 function selectionFillPaint(shared){
  const opacity=selection.fillOpacity??.45;
  return {'fill-color':selection.fill||(map.getLayer(country+'-first-selection-fill')?map.getPaintProperty(country+'-first-selection-fill','fill-color'):undefined)||'#b7cce3',
   'fill-opacity':shared?['case',['boolean',['feature-state','selected'],false],opacity,0]:opacity,'fill-antialias':false};
 }
 function selectedFill(){
  const shared=sharedSelection();
  if(!shared&&!map.getSource(sources.highlight))map.addSource(sources.highlight,{type:'geojson',data:empty,tolerance:0,buffer:128,maxzoom:16});
  if(!map.getLayer(layers.selectedFill))map.addLayer({
   id:layers.selectedFill,type:'fill',source:shared?sources.faces:sources.highlight,
   metadata:{atlas:{preserveSelectionOpacity:shared,stableSelectionFill:shared,satellite:{fill:'none'}}},
   ...(shared?{filter:coast.filter(exclude('f',mosaicFaces))}:{}),paint:selectionFillPaint(geometry?false:shared)
  });
  map.moveLayer(layers.selectedFill);
 }
 return {
  layers:ownLayers,load,remove,get memory(){return geometry?{...geometry.snapshot(),tiles:tileBudget.snapshot()}:undefined;},get prepare(){return geometry&&data?prepareSnapshot:data&&!data.shapes?prepare:undefined;},get data(){return data;},
  pickLocation(location,config){
   if(frame)return shapeAtLocation(frame.shapes,location)?.properties.id;
   const detailed=coast.url?coast.pick(map.project(location),config):undefined;
   if(detailed!==undefined)return detailed;
   return data?.shapes?shapeAtLocation(data.shapes,location,config?({f})=>!coast.has(f)&&config.face[f]>=0:undefined)?.properties.f??null:null;
  },
  // A dated unit by its key, and a face it covers, for selecting it without a click.
  find(config,key){const index=config.units.findIndex(u=>u.key===key);return index<0?null:{unit:config.units[index],face:config.file?config.units[index].id:config.face.indexOf(index)};},
  unit(config,face){if(config.file){const dated=frameFor(config.file);return dated?.byId.get(face);}const i=face>=0?config.face[face]:-1;return i>=0?config.units[i]:null;},
  pick(point,config){if(frame){const hit=map.queryRenderedFeatures(point,{layers:[layers.fill]})[0];return hit?.properties.id??null;}if(!data?.shapes)return null;const detailed=coast.pick(point,config);if(detailed!==undefined)return detailed;const ak=alaska.pick(point);if(ak!=null)return ak;const local=region.pick(point);if(local!==undefined)return local;const face=shapeAt(map,data.shapes,point,config?({f})=>!coast.has(f)&&config.face[f]>=0:undefined)?.properties.f??null;return ak===null&&alaska.replaces(face)?null:face;},
  // Draws a configuration directly above the host's first-level fill, colouring each unit.
  draw(config,colorOf,fillLayer,{visible,reuseHost=false}={}){
   tileBudget?.start();
   if(geometry){currentConfig=config;currentReuseHost=reuseHost;mosaicScope??=map.getZoom()<7?historicalOverviewScope(map.getBounds().toArray().flat(),config.units):paddedView(map.getBounds().toArray().flat(),{minimum:.03});if(!mosaicScopes.length)mosaicScopes.push(mosaicScope);}
   if(config.file){
    const prepared=frameFor(config.file);
    if(!prepared)return;
    if(frame!==prepared){remove({keepPaint:true});frame=prepared;}
    config.units=frame.units;
    config.partOf={};
   }
   if(!map.getSource(sources.faces)){
    const url=member=>'atlas-data://'+country+'-history?url='+encodeURIComponent(data.url)+'&member='+member;
    const original=member=>'atlas-data://'+country+'-original-history?url='+encodeURIComponent(data.originalUrl)+'&member='+member;
    if(frame){
     addRegionalBoundarySources(map,{fill:sources.faces,edges:sources.edges,outlines:sources.outlines},{
      regions:frameUrl(sources.faces,'regions',{transform:'parts',...(sourceUnit?{unit:sourceUnit}:{})}),
      borders:frameUrl(sources.edges,'edges',{transform:'outline',interior:'1',...(sourceUnit?{unit:sourceUnit}:{})}),
      selection:empty,edgeOptions:lineSourceOptions,outlineOptions:selectionLineSourceOptions
     });
     outlined='';highlighted='';
     if(frameOuter)map.addSource(sources.outer,{type:'geojson',data:frameUrl(sources.outer,'edges'),tolerance:.25});
    }else{
     const faceSource=selection.paintFaces||sharedSelection()?{data:url('faces')+'&transform=parts',promoteId:'f',buffer:128,maxzoom:16}:data.sharedLand?{data:url('faces')+'&transform=parts',buffer:128,maxzoom:16}:{data:url('faces')};
     if(sharedSelection())faceSource.data=mosaicVersion=activeFacesUrl(config,reuseHost);
     map.addSource(sources.faces,{type:'geojson',...faceSource,tolerance:fillTolerance});map.addSource(sources.edges,{type:'geojson',data:withScope(edgesData=url('arcs')+(sharedSelection()?'&adjacent=1':'')),tolerance:.25});
     // As on the present-day map, the selected outline fades small islands' rings in by size.
     // The selected unit's outline and shape, requested by unit when it is picked.
     // Defer the compact selection copy until a unit is actually selected.
     map.addSource(sources.selection,{...selectionLineSourceOptions,data:empty});
     if(geometry){map.on('moveend',refreshOutline);map.on('sourcedata',outlineLoaded);}
     if(!selection.paintFaces&&!sharedSelection())map.addSource(sources.highlight,{type:'geojson',data:empty,tolerance:fillTolerance});outlined='';highlighted='';map.addSource(sources.outer,{type:'geojson',data:withScope(outerData=original('borders')),tolerance:.25});
     if(geometry){map.on('move',warmViewport);map.on('moveend',finishViewport);}
    }
    const all=map.getStyle().layers,before=all[all.findIndex(l=>l.id===fillLayer)+1]?.id;
    map.addLayer({id:layers.fill,type:'fill',source:sources.faces,paint:{'fill-color':frame?regionFill:TRANSPARENT,'fill-antialias':false}},before);
    map.addLayer({id:layers.lines,type:'line',source:sources.edges,filter:none,layout:round,paint:sourceUnit||frontierLines?frontierPaint():linePaint()},before);
    if(!frame){
     map.addLayer({id:layers.frontiers,type:'line',source:sources.edges,filter:none,layout:round,paint:frontierPaint()},before);
     map.addLayer({id:layers.outer,type:'line',source:sources.outer,filter:['==',['get','b'],-1],layout:round,paint:frontierPaint()},before);
    }
    if(frame&&frameOuter)map.addLayer({id:layers.outer,type:'line',source:sources.outer,filter:['==',['get','b'],''],layout:round,paint:frontierPaint()},before);
    const selectedPaint=frame?{...selectionPaint(),'line-color':(map.getLayer(country+'-first-selected')?scene?.basePaint(country+'-first-selected','line-color'):undefined)??linePaint()['line-color'],'line-opacity':adaptiveOpacity(1)}:{...selectionPaint(),...(selection.line?{'line-color':selection.line}:{}),'line-opacity':adaptiveOpacity(1)};
    map.addLayer({id:layers.selected,type:'line',source:frame?sources.outlines:sources.selection,metadata:{atlas:{role:'selection'}},layout:round,paint:selectedPaint},before);
   }
   if(frame){
    pendingColors=new Map(config.units.map(unit=>[unit.id,visible&&!visible(unit)?TRANSPARENT:colorOf(unit)]));
    if(!map.getSource(sources.faces)._atlasDatedRevealed){
     if(!reveal){
      reveal=()=>{
       if(!map.isSourceLoaded(sources.faces)||!map.isSourceLoaded(sources.edges))return;
       map.off('render',reveal);reveal=null;
       map.getSource(sources.faces)._atlasDatedRevealed=true;
       // Build the outline worker's compact copy now, so the first selection does not decode the file.
       if(!outlined)map.getSource(sources.outlines).setData(frameUrl(sources.outlines,'regions',{transform:'selection-outline',unit:''}));
       paintRegions();
       for(const id of [layers.fill,layers.lines,layers.selectedFill,layers.selected])scene?.setLayerWarming(id,false);
       map.triggerRepaint();
      };
      for(const id of [layers.fill,layers.lines,layers.selected])scene?.setLayerWarming(id,true);
      map.on('render',reveal);
     }
    }else paintRegions();
    const lines=frame.sides.flatMap(({a,b},i)=>!visible||visible(frame.byId.get(a))||visible(frame.byId.get(b))?[i]:[]);
    map.setFilter(layers.lines,membershipFilter('edge',lines));
   }else{
    if(sharedSelection()){
     const version=activeFacesUrl(config,reuseHost);
     if(version!==mosaicVersion){mosaicVersion=version;map.getSource(sources.faces).setData(version);}
    }
    const faces=new Map();
    config.face.forEach((index,f)=>{
     const unit=config.units[index];if(!unit||visible&&!visible(unit)||reuseHost&&data.hostFaces.has(f))return;
     const color=colorOf(unit);if(!faces.has(color))faces.set(color,[]);faces.get(color).push(f);
    });
    // Transparent chronology cells need no GPU geometry. Keep the gray fallback
    // cells too, and retain the source so changing years never reloads its data.
    mosaicFaces=config.fullLand?['literal',true]:membershipFilter('f',[...faces.values()].flat().concat(config.modernLand||[]));
    const missing=config.modernLand?.length?['match',['get','f'],config.modernLand,OTHER_LAND,TRANSPARENT]:config.fullLand?OTHER_LAND:TRANSPARENT;
    const match=(tint=false)=>faces.size?['match',['get','f'],...[...faces].flatMap(([color,list])=>[list,tint?blendColor(color,selection.fill,selection.fillOpacity):color]),missing]:missing;
    const colors=match();
    map.setPaintProperty(layers.fill,'fill-color',selection.paintFaces?['case',['boolean',['feature-state','selected'],false],match(true),colors]:colors);
    if(data.display)map.setFilter(layers.fill,alaska.exclude('f',['literal',true]));
    else syncMosaicFill();
    
    coast.draw(data.coasts,colors,layers.fill,{config,linePaint:linePaint(),frontierPaint:frontierPaint(),visible});
    
    coastBorders=()=>{
    const lines=[],frontiers=[];
    if(data.display)for(let i=0;i<data.arcId.length;i++){const l=config.face[data.arcL[i]],r=data.arcR[i]>=0?config.face[data.arcR[i]]:-1;if(l>=0&&r>=0&&l!==r)(config.units[l].sovereign===config.units[r].sovereign?lines:frontiers).push(data.arcId[i]);}
    // Only the edges of shown units when the caller draws a subset (a neighbour's single area).
    const shown=visible?(()=>{const keep=new Set();for(let i=0;i<data.arcId.length;i++){const l=config.face[data.arcL[i]],r=data.arcR[i]>=0?config.face[data.arcR[i]]:-1;if(l>=0&&visible(config.units[l])||r>=0&&visible(config.units[r]))keep.add(data.arcId[i]);}return config.lines.filter(a=>keep.has(a));})():config.lines;
    map.setFilter(layers.lines,coast.filterArcs(membershipFilter('a',data.display?lines:shown)));
    map.setFilter(layers.frontiers,coast.filterArcs(membershipFilter('a',data.display?frontiers:config.frontiers)));
    map.setFilter(layers.outer,exclude('b',membershipFilter('b',config.borders)));
    };
    
    coastBorders();
    
    region.draw(config,colors,linePaint());alaska.draw(config,colorOf);if(data.display)map.moveLayer(layers.fill);
    if(data.display||data.coastWater){
     if(!map.getSource(sources.water)){
      if(data.coastWater)waterScope=geometry?mosaicScopes.map(scope=>scope.join(',')).join(';'):paddedView(map.getBounds().toArray().flat());
      map.addSource(sources.water,{type:'geojson',data:data.coastWater?waterUrl(waterScope):'atlas-data://'+prefix+'-water?url='+encodeURIComponent(data.url)+'&member=water',tolerance:0,maxzoom:12,buffer:128});
      if(data.coastWater)map.on('moveend',syncWater);
     }
     if(!map.getLayer(layers.water))map.addLayer({id:layers.water,type:'fill',source:sources.water,metadata:{atlas:{role:'water',sea:true,satellite:{fill:'fade'}}},paint:{'fill-color':map.getPaintProperty('background','background-color'),'fill-antialias':false}});
    }
   }
   if(!frame&&!selection.paintFaces||map.getLayer(layers.selectedFill))selectedFill();
   if(frame&&reveal)scene?.setLayerWarming(layers.selectedFill,true);
  },
  // Outlines one unit: the edges with that unit on exactly one side.
  outline(config,unit,{highlight=false}={}){
   if(!map.getLayer(layers.selected))return;
   const index=unit?config.units.indexOf(unit):-1;
   if(frame){
    const region=unit?.id??'',shape=highlight?region:'';
    if(region!==outlined){outlined=region;map.getSource(sources.outlines).setData(region?frameUrl(sources.outlines,'regions',{transform:'selection-outline',unit:region}):empty);}
    if(shape!==highlighted){highlighted=shape;if(shape)selectedFill();map.getSource(sources.highlight)?.setData(shape?frameUrl(sources.highlight,'regions',{transform:'parts',unit:shape}):empty);}
   }else if(sharedSelection()){
    coastOutline=()=>this.outline(config,unit,{highlight});
    const next=new Set();
    if(index>=0)config.face.forEach((u,f)=>{if(u===index)next.add(f);});
    const changed=next.size!==outlinedFaces.size||[...next].some(f=>!outlinedFaces.has(f));
    const replacements=data.coasts.filter(entry=>entry.faces.some(f=>next.has(f))).map(entry=>({
     region:entry.id,url:new URL(compactUrl(base+'history/'+entry.file),document.baseURI).href
    }));
    const view=geometry?map.getBounds().toArray().flat():null;
    const scope=geometry?(outlineScope&&reusableHistoricalScope(outlineScope,view)?outlineScope:paddedView(view,{minimum:.03})):null;
    const replacement=JSON.stringify(replacements),outlineKey=replacement+(scope?scope.join(','):'');
    if(changed||outlined!==outlineKey){
     outlined=outlineKey;
     const url='atlas-data://'+prefix+'-unit?'+new URLSearchParams({url:data.url,transform:'historical-outline',
      config:data.configs.indexOf(config),unit:index,...(scope?{scope:scope.join(',')} : {}),...(replacements.length===1?{coast:replacements[0].url,coastRegion:replacements[0].region}:replacements.length?{coasts:replacement}:{})});
     if(geometry){
      geometry.cancel('outline');outlineScope=scope;
      map.getSource(sources.selection)?.setData(empty);
      if(next.size)void prepareOutline(url);else clearPreparedOutline();
     }else map.getSource(sources.selection)?.setData(next.size?url:empty);
    }
    outlinedFaces=next;
    // The host already draws this land. Highlight its existing source instead
    // of decoding and tiling another copy in the historical mosaic.
    const hosts=highlight?[...next].flatMap(f=>data.hostFaces.has(f)?[data.hostFaces.get(f)]:[]):[];
    const source=map.getLayer(country+'-first-fill')?.source;
    if(hosts.length&&source&&!map.getLayer(layers.hostSelectedFill))map.addLayer({
     id:layers.hostSelectedFill,type:'fill',source,
     metadata:{atlas:{preserveSelectionOpacity:true,stableSelectionFill:true,satellite:{fill:'none'}}},
     paint:selectionFillPaint(false)
    });
    if(map.getLayer(layers.hostSelectedFill))map.setFilter(layers.hostSelectedFill,membershipFilter('id',hosts));
    const fill=highlight?next:new Set();
    // A large empire is one selection, not thousands of independent state
    // mutations. Its shared fill uses one ID filter. Keep ordinary feature
    // state for small selections without allowing an unbounded update burst.
    const nativeFill=geometry?(fill.size<=256?fill:new Set()):fill,previous=geometry?stateSelectedFaces:selectedFaces;
    batch(()=>{
     for(const id of previous)if(!nativeFill.has(id))map.removeFeatureState({source:sources.faces,id},'selected');
     for(const id of nativeFill)if(!previous.has(id))map.setFeatureState({source:sources.faces,id},{selected:true});
    });
    if(geometry){stateSelectedFaces.clear();for(const id of nativeFill)stateSelectedFaces.add(id);}
    coast.selection(fill,selectionFillPaint(!geometry));
    selectedFaces.clear();for(const id of fill)selectedFaces.add(id);
    if(geometry)syncMosaicFill();
   }else{
    const key=index>=0?data.configs.indexOf(config)+':'+index:'',shape=highlight?key:'';
    const unitUrl=transform=>'atlas-data://'+prefix+'-unit?'+new URLSearchParams({url:data.url,configs:data.originalUrl,transform,config:key.split(':')[0],unit:key.split(':')[1],...(config.exactOutline?{exact:'1'}:{})});
    if(key!==outlined){outlined=key;map.getSource(sources.selection)?.setData(key?unitUrl('unit-outline'):empty);}
    if(selection.paintFaces){
     const next=new Set();
     if(shape)config.face.forEach((value,id)=>{if(value===index||config.units[value]?.selectionGroup===unit.id)next.add(id);});
     for(const id of selectedFaces)if(!next.has(id))map.removeFeatureState({source:sources.faces,id},'selected');
     for(const id of next)if(!selectedFaces.has(id))map.setFeatureState({source:sources.faces,id},{selected:true});
     selectedFaces.clear();for(const id of next)selectedFaces.add(id);
    }else if(shape!==highlighted){highlighted=shape;map.getSource(sources.highlight)?.setData(shape?unitUrl('unit-shape'):empty);}
   }
  },
  dispose(){loadGeneration++;loadController?.abort();loadController=null;remove();region.dispose();alaska.dispose();frames.clear();if(data?.url){URL.revokeObjectURL(data.url);if(data.originalUrl!==data.url)URL.revokeObjectURL(data.originalUrl);}data=null;loading=null;}
 };
}
