import {polygonParts} from './polygon-parts.mjs';
import {selectionLineSourceOptions} from './outline-detail.mjs';
import {createHistoricalAlaska} from './historical-alaska.mjs';
import {createHistoricalRegion} from './historical-region-display.mjs';
import {adaptiveOpacity,lineSourceOptions,internationalBorderPaint,regionalLineWidth} from './adaptive-lines.mjs';
import {addRegionalBoundarySources,compactUrl,decodeData,fetchBytes} from './geo-pack.mjs';
import {mapPalette} from './map-palette.mjs';
import {blendColor,getMapScene} from './map-scene.mjs';
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

// Each shape keeps its rings as one flat coordinate array; a point is inside when it crosses an
// odd number of ring edges, which covers holes and multipolygons alike. Picking tests these
// polygons because rendered-feature queries skip layers the map's motion handling has not
// registered, which these layers are not.
export function packShapes(features){
 return features.filter(f=>f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type)&&!f.properties.outline).map(f=>{
  const rings=(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat(),starts=new Int32Array(rings.length+1),xy=new Float64Array(2*rings.reduce((n,r)=>n+r.length,0));
  let k=0,w=180,s=90,e=-180,n=-90;rings.forEach((ring,i)=>{starts[i]=k/2;for(const [x,y] of ring){xy[k++]=x;xy[k++]=y;if(x<w)w=x;if(x>e)e=x;if(y<s)s=y;if(y>n)n=y;}});starts[rings.length]=k/2;
  return {properties:f.properties,xy,starts,box:[w,s,e,n]};
 });
}
function inside({xy,starts},x,y){
 let odd=false;
 for(let r=0;r+1<starts.length;r++)for(let i=starts[r],j=starts[r+1]-1;i<starts[r+1];j=i++){const xi=xy[2*i],yi=xy[2*i+1],xj=xy[2*j],yj=xy[2*j+1];if(yi>y!==yj>y&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)odd=!odd;}
 return odd;
}
export function shapeAt(map,shapes,point){
 return shapeAtLocation(shapes,map.unproject(point));
}
export function shapeAtLocation(shapes,{lng,lat}){
 const x=((lng+540)%360+360)%360-180;
 return shapes.find(shape=>x>=shape.box[0]&&x<=shape.box[2]&&lat>=shape.box[1]&&lat<=shape.box[3]&&inside(shape,x,lat));
}

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
// fillTolerance: the fills' tile simplification; China's long, narrow face outlines crossed
// themselves at the default and drew stray triangles, so it passes 0.
export function createHistoricBorders(map,{country,base,file,tag='history',sourceUnit,frontierLines=false,lineLayer=country+'-first-lines',selection={},fillTolerance=.25,scene=getMapScene(map)}){
 const prefix=country+'-'+tag;
 const layers={fill:prefix+'-fill',lines:prefix+'-lines',frontiers:prefix+'-frontiers',outer:prefix+'-outer',selected:prefix+'-selected',selectedFill:prefix+'-selected-fill',water:prefix+'-water'};
 const sources={faces:prefix+'-faces',edges:prefix+'-edges',outer:prefix+'-borders',water:prefix+'-water',outlines:prefix+'-outlines',selection:prefix+'-selection',highlight:prefix+'-highlight'};
 const ownLayers=new Set(Object.values(layers));
 const region=createHistoricalRegion(map,{country,base,packShapes,shapeAt,ownLayers});
 const alaska=createHistoricalAlaska(map,{country,base,packShapes,shapeAt,ownLayers});
 const exclude=(field,filter)=>alaska.exclude(field,region.exclude(field,filter));
 const empty={type:'FeatureCollection',features:[]};
 const frames=new Map();
 let data=null,loading=null,frame=null,outlined=null,highlighted='',reveal=null,pendingColors;
 // A dated file's regions are coloured by feature state, so a new year repaints them instead of
 // laying out every tile again: about 0.7 s per election year for Canada's ridings.
 const selectedFaces=new Set();
 const regionFill=['to-color',['coalesce',['feature-state','fill'],TRANSPARENT]],painted=new Map();
 function paintRegions(){for(const [id,color] of pendingColors)if(painted.get(id)!==color){painted.set(id,color);map.setFeatureState({source:sources.faces,id},{fill:color});}}
 const frameUrl=(id,member,options)=>'atlas-data://'+id+'?'+new URLSearchParams({url:frame.url,member,...options});
 const frameFor=file=>frame?.file===file?frame:frames.get(file)?.value;
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
  loading??=(async()=>{
   const bytes=await fetchBytes(compactUrl(base+file)),loaded=await decodeData(bytes);
   if(!loaded.faces){data=loaded;return data;}
   const displayBytes=country==='united-states'?await fetchBytes(compactUrl(base+'history/coastal-display.bin')):null,display=displayBytes?await decodeData(displayBytes):loaded;
   if(displayBytes&&display.historySource!==loaded.source.sha256)throw Error('Coastal display does not match the retained history');
   const sides=display.arcs.features.map(f=>f.properties),originalUrl=URL.createObjectURL(new Blob([bytes]));
   data={source:loaded.source,faceCount:loaded.faces.features.length,versions:loaded.versions,configs:loaded.configs,elections:loaded.elections,years:loaded.years,events:loaded.events,originalUrl,url:displayBytes?URL.createObjectURL(new Blob([displayBytes])):originalUrl,display:!!displayBytes,shapes:packShapes(display.faces.features),arcL:Int32Array.from(sides,a=>a.l),arcR:Int32Array.from(sides,a=>a.r),arcId:Int32Array.from(sides,a=>a.a)};
   await Promise.all([region.load(data),alaska.load(data)]);
   return data;
  })().catch(error=>{loading=null;throw error;});
  return loading;
 }
 // Capture the ordinary state-line paint before the host lines are hidden.
 let normalPaint;
 const linePaint=()=>normalPaint??=administrativeBorderPaint(map,lineLayer,scene);
 // Country frontiers match the gray shared country-border layer.
 const frontierPaint=internationalBorderPaint;
 // A selected dated unit uses a single visible stroke, including its coast.
 const selectionPaint=()=>({...linePaint(),'line-width':regionalLineWidth(1,true),'line-opacity':1});
 function remove({keepPaint=false}={}){if(reveal)map.off('render',reveal);reveal=null;frame=null;painted.clear();selectedFaces.clear();outlined=null;highlighted='';alaska.remove();region.remove();if(!keepPaint)normalPaint=undefined;for(const id of Object.values(layers))if(map.getLayer(id))map.removeLayer(id);for(const id of Object.values(sources))if(map.getSource(id))map.removeSource(id);}
 const none=['==',['get','a'],-1],round={'line-join':'round','line-cap':'round'};
 // The selected unit's fill, kept on top. A dated file adds its shape source only when a
 // highlight is first asked for: an extra source, even empty, slowed each election year change
 // by about half a second.
 function selectedFill(){
  // A dated file's shape source has the fill's settings, so the two coincide.
  if(!map.getSource(sources.highlight))map.addSource(sources.highlight,{type:'geojson',data:empty,tolerance:0,buffer:128,maxzoom:16});
  if(!map.getLayer(layers.selectedFill))map.addLayer({id:layers.selectedFill,metadata:{atlas:{satellite:{fill:'none'}}},type:'fill',source:sources.highlight,paint:{'fill-color':selection.fill||(map.getLayer(country+'-first-selection-fill')?map.getPaintProperty(country+'-first-selection-fill','fill-color'):undefined)||'#b7cce3','fill-opacity':selection.fillOpacity??.45,'fill-antialias':false}});
  map.moveLayer(layers.selectedFill);
 }
 return {
  layers:ownLayers,load,remove,get prepare(){return data&&!data.shapes?prepare:undefined;},get data(){return data;},
  pickLocation(location){return frame?shapeAtLocation(frame.shapes,location)?.properties.id:data?.shapes?shapeAtLocation(data.shapes,location)?.properties.f??null:null;},
  // A dated unit by its key, and a face it covers, for selecting it without a click.
  find(config,key){const index=config.units.findIndex(u=>u.key===key);return index<0?null:{unit:config.units[index],face:config.face.indexOf(index)};},
  unit(config,face){if(config.file){const dated=frameFor(config.file);return dated?.byId.get(face);}const i=face>=0?config.face[face]:-1;return i>=0?config.units[i]:null;},
  pick(point){if(frame){const hit=map.queryRenderedFeatures(point,{layers:[layers.fill]})[0];return hit?.properties.id??null;}if(!data?.shapes)return null;const ak=alaska.pick(point);if(ak!=null)return ak;const local=region.pick(point);if(local!==undefined)return local;const face=shapeAt(map,data.shapes,point)?.properties.f??null;return ak===null&&alaska.replaces(face)?null:face;},
  // Draws a configuration directly above the host's first-level fill, colouring each unit.
  draw(config,colorOf,fillLayer,{visible}={}){
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
    }else{
     const faceSource=selection.paintFaces?{data:url('faces')+'&transform=parts',promoteId:'f',buffer:128,maxzoom:16}:{data:url('faces')};
     map.addSource(sources.faces,{type:'geojson',...faceSource,tolerance:fillTolerance});map.addSource(sources.edges,{type:'geojson',data:url('arcs'),tolerance:.25});
     // As on the present-day map, the selected outline fades small islands' rings in by size.
     // The selected unit's outline and shape, requested by unit when it is picked.
     // Asking for no unit when they are added builds the workers' compact copies up front.
     const warm=transform=>'atlas-data://'+prefix+'-unit?'+new URLSearchParams({url:data.url,configs:data.originalUrl,transform,config:'0',unit:'-1'});
     map.addSource(sources.selection,{...selectionLineSourceOptions,data:warm('unit-outline')});
     if(!selection.paintFaces)map.addSource(sources.highlight,{type:'geojson',data:warm('unit-shape'),tolerance:fillTolerance});outlined='';highlighted='';map.addSource(sources.outer,{type:'geojson',data:original('borders'),tolerance:.25});
    }
    const all=map.getStyle().layers,before=all[all.findIndex(l=>l.id===fillLayer)+1]?.id;
    map.addLayer({id:layers.fill,type:'fill',source:sources.faces,paint:{'fill-color':frame?regionFill:TRANSPARENT,'fill-antialias':false}},before);
    map.addLayer({id:layers.lines,type:'line',source:sources.edges,filter:none,layout:round,paint:sourceUnit||frontierLines?frontierPaint():linePaint()},before);
    if(!frame){
     map.addLayer({id:layers.frontiers,type:'line',source:sources.edges,filter:none,layout:round,paint:frontierPaint()},before);
     map.addLayer({id:layers.outer,type:'line',source:sources.outer,filter:['==',['get','b'],-1],layout:round,paint:frontierPaint()},before);
    }
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
    map.setFilter(layers.lines,['in',['get','edge'],['literal',lines]]);
   }else{
    const faces=new Map();
    config.face.forEach((index,f)=>{
     const unit=config.units[index];if(!unit||visible&&!visible(unit))return;
     const color=colorOf(unit);if(!faces.has(color))faces.set(color,[]);faces.get(color).push(f);
    });
    const missing=config.modernLand?.length?['match',['get','f'],config.modernLand,OTHER_LAND,TRANSPARENT]:config.fullLand?OTHER_LAND:TRANSPARENT;
    const match=(tint=false)=>faces.size?['match',['get','f'],...[...faces].flatMap(([color,list])=>[list,tint?blendColor(color,selection.fill,selection.fillOpacity):color]),missing]:missing;
    const colors=match();
    map.setPaintProperty(layers.fill,'fill-color',selection.paintFaces?['case',['boolean',['feature-state','selected'],false],match(true),colors]:colors);
    map.setFilter(layers.fill,data.display?alaska.exclude('f',['literal',true]):exclude('f',['literal',true]));
    const lines=[],frontiers=[];
    if(data.display)for(let i=0;i<data.arcId.length;i++){const l=config.face[data.arcL[i]],r=data.arcR[i]>=0?config.face[data.arcR[i]]:-1;if(l>=0&&r>=0&&l!==r)(config.units[l].sovereign===config.units[r].sovereign?lines:frontiers).push(data.arcId[i]);}
    // Only the edges of shown units when the caller draws a subset (a neighbour's single area).
    const shown=visible?(()=>{const keep=new Set();for(let i=0;i<data.arcId.length;i++){const l=config.face[data.arcL[i]],r=data.arcR[i]>=0?config.face[data.arcR[i]]:-1;if(l>=0&&visible(config.units[l])||r>=0&&visible(config.units[r]))keep.add(data.arcId[i]);}return config.lines.filter(a=>keep.has(a));})():config.lines;
    map.setFilter(layers.lines,['in',['get','a'],['literal',data.display?lines:shown]]);
    map.setFilter(layers.frontiers,['in',['get','a'],['literal',data.display?frontiers:config.frontiers]]);
    map.setFilter(layers.outer,exclude('b',['in',['get','b'],['literal',config.borders]]));
    region.draw(config,colors,linePaint());alaska.draw(config,colorOf);if(data.display)map.moveLayer(layers.fill);
    if(data.display){
     if(!map.getSource(sources.water))map.addSource(sources.water,{type:'geojson',data:'atlas-data://'+prefix+'-water?url='+encodeURIComponent(data.url)+'&member=water',tolerance:.125});
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
   }else{
    const key=index>=0?data.configs.indexOf(config)+':'+index:'',shape=highlight?key:'';
    const unitUrl=transform=>'atlas-data://'+prefix+'-unit?'+new URLSearchParams({url:data.url,configs:data.originalUrl,transform,config:key.split(':')[0],unit:key.split(':')[1]});
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
  dispose(){remove();region.dispose();alaska.dispose();frames.clear();if(data?.url){URL.revokeObjectURL(data.url);if(data.originalUrl!==data.url)URL.revokeObjectURL(data.originalUrl);}data=null;loading=null;}
 };
}
