import {createHistoricalAlaska} from './historical-alaska.mjs';
import {createHistoricalRegion} from './historical-region-display.mjs';
import {internationalBorderPaint,regionalLineWidth} from './adaptive-lines.mjs';
import {compactUrl,decodeData,fetchBytes} from './geo-pack.mjs';
import {mapPalette} from './map-palette.mjs';
import {getMapScene} from './map-scene.mjs';
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
 const {lng,lat}=map.unproject(point),x=((lng+540)%360+360)%360-180;
 return shapes.find(shape=>x>=shape.box[0]&&x<=shape.box[2]&&lat>=shape.box[1]&&lat<=shape.box[3]&&inside(shape,x,lat));
}

// Host lines a view replaces while it draws its own: the present-day first-level borders and
// international border, and the host's selection outline. A restore uses the scene's base value,
// not the rendered one, so it does not wrap it twice; a host that wraps the map passes its scene.
export function createHostLines(map,{country,scene=getMapScene(map),own=()=>false}){
 const hidden=new Map();
 return function sync({borders=false,selection=false}={}){
  const want=new Set();
  for(const layer of map.getStyle().layers){
   if(layer.type!=='line'||!layer.id.startsWith(country+'-')||own(layer.id))continue;const role=layer.metadata?.atlas?.role;
   if(borders&&(role==='border'&&layer.id.startsWith(country+'-first')||layer.id===country+'-international')||selection&&role==='selection')want.add(layer.id);
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

export function createHistoricBorders(map,{country,base,file,lineLayer=country+'-first-lines'}){
 const layers={fill:country+'-history-fill',lines:country+'-history-lines',frontiers:country+'-history-frontiers',outer:country+'-history-outer',selected:country+'-history-selected',selectedFill:country+'-history-selected-fill',water:country+'-history-water'};
 const sources={faces:country+'-history-faces',edges:country+'-history-edges',outer:country+'-history-borders',water:country+'-history-water'};
 const ownLayers=new Set(Object.values(layers));
 const region=createHistoricalRegion(map,{country,base,packShapes,shapeAt,ownLayers});
 const alaska=createHistoricalAlaska(map,{country,base,packShapes,shapeAt,ownLayers});
 const exclude=(field,filter)=>alaska.exclude(field,region.exclude(field,filter));
 let data=null,loading=null;
 function load(){
  loading??=(async()=>{
   const bytes=await fetchBytes(compactUrl(base+file)),loaded=await decodeData(bytes);
   const displayBytes=country==='united-states'?await fetchBytes(compactUrl(base+'history/coastal-display.bin')):null,display=displayBytes?await decodeData(displayBytes):loaded;
   if(displayBytes&&display.historySource!==loaded.source.sha256)throw Error('Coastal display does not match the retained history');
   const sides=display.arcs.features.map(f=>f.properties),originalUrl=URL.createObjectURL(new Blob([bytes]));
   data={source:loaded.source,faceCount:loaded.faces.features.length,versions:loaded.versions,configs:loaded.configs,elections:loaded.elections,years:loaded.years,originalUrl,url:displayBytes?URL.createObjectURL(new Blob([displayBytes])):originalUrl,display:!!displayBytes,shapes:packShapes(display.faces.features),arcL:Int32Array.from(sides,a=>a.l),arcR:Int32Array.from(sides,a=>a.r),arcId:Int32Array.from(sides,a=>a.a)};
   await Promise.all([region.load(data),alaska.load(data)]);
   return data;
  })().catch(error=>{loading=null;throw error;});
  return loading;
 }
 // Capture the ordinary state-line paint before the host lines are hidden.
 let normalPaint;
 const linePaint=()=>normalPaint??=administrativeBorderPaint(map,lineLayer);
 // Country frontiers match the gray shared country-border layer.
 const frontierPaint=internationalBorderPaint;
 // A selected dated unit uses a single visible stroke, including its coast.
 const selectionPaint=()=>({...linePaint(),'line-width':regionalLineWidth(1,true),'line-opacity':1});
 function remove(){alaska.remove();region.remove();normalPaint=undefined;for(const id of Object.values(layers))if(map.getLayer(id))map.removeLayer(id);for(const id of Object.values(sources))if(map.getSource(id))map.removeSource(id);}
 const none=['==',['get','a'],-1],round={'line-join':'round','line-cap':'round'};
 return {
  layers:ownLayers,load,remove,get data(){return data;},
  unit(config,face){const i=face>=0?config.face[face]:-1;return i>=0?config.units[i]:null;},
  pick(point){const ak=alaska.pick(point);if(ak!==undefined)return ak;const local=region.pick(point);if(local!==undefined)return local;const hit=shapeAt(map,data.shapes,point);return hit?hit.properties.f:null;},
  // Draws a configuration directly above the host's first-level fill, colouring each unit.
  draw(config,colorOf,fillLayer){
   if(!map.getSource(sources.faces)){
    const url=member=>'atlas-data://'+country+'-history?url='+encodeURIComponent(data.url)+'&member='+member;
    const original=member=>'atlas-data://'+country+'-original-history?url='+encodeURIComponent(data.originalUrl)+'&member='+member;
    map.addSource(sources.faces,{type:'geojson',data:url('faces'),tolerance:.25});map.addSource(sources.edges,{type:'geojson',data:url('arcs'),tolerance:.25});map.addSource(sources.outer,{type:'geojson',data:original('borders'),tolerance:.25});
    const all=map.getStyle().layers,before=all[all.findIndex(l=>l.id===fillLayer)+1]?.id;
    map.addLayer({id:layers.fill,type:'fill',source:sources.faces,paint:{'fill-color':TRANSPARENT}},before);
    map.addLayer({id:layers.lines,type:'line',source:sources.edges,filter:none,layout:round,paint:linePaint()},before);
    map.addLayer({id:layers.frontiers,type:'line',source:sources.edges,filter:none,layout:round,paint:frontierPaint()},before);
    map.addLayer({id:layers.outer,type:'line',source:sources.outer,filter:['==',['get','b'],-1],layout:round,paint:frontierPaint()},before);
    map.addLayer({id:layers.selected,type:'line',source:sources.edges,metadata:{atlas:{role:'selection'}},filter:none,layout:round,paint:selectionPaint()},before);
   }
   const color=config.units.map(colorOf),faces=new Map();
   config.face.forEach((unit,f)=>{if(unit<0)return;const key=color[unit];if(!faces.has(key))faces.set(key,[]);faces.get(key).push(f);});
   const colors=faces.size?['match',['get','f'],...[...faces].flatMap(([key,list])=>[list,key]),TRANSPARENT]:TRANSPARENT;
   map.setPaintProperty(layers.fill,'fill-color',colors);
   map.setFilter(layers.fill,data.display?alaska.exclude('f',['literal',true]):exclude('f',['literal',true]));
   const lines=[],frontiers=[];
   if(data.display)for(let i=0;i<data.arcId.length;i++){const l=config.face[data.arcL[i]],r=data.arcR[i]>=0?config.face[data.arcR[i]]:-1;if(l>=0&&r>=0&&l!==r)(config.units[l].sovereign===config.units[r].sovereign?lines:frontiers).push(data.arcId[i]);}
   map.setFilter(layers.lines,['in',['get','a'],['literal',data.display?lines:config.lines]]);
   map.setFilter(layers.frontiers,['in',['get','a'],['literal',data.display?frontiers:config.frontiers]]);
   map.setFilter(layers.outer,exclude('b',['in',['get','b'],['literal',config.borders]]));
   region.draw(config,colors,linePaint());alaska.draw(config,colorOf);if(data.display)map.moveLayer(layers.fill);
   if(data.display){
    if(!map.getSource(sources.water))map.addSource(sources.water,{type:'geojson',data:'atlas-data://'+country+'-history-water?url='+encodeURIComponent(data.url)+'&member=water',tolerance:.125});
    if(!map.getLayer(layers.water))map.addLayer({id:layers.water,type:'fill',source:sources.water,metadata:{atlas:{role:'water',sea:true,satellite:{fill:'fade'}}},paint:{'fill-color':map.getPaintProperty('background','background-color'),'fill-antialias':false}});
   }
   if(!map.getLayer(layers.selectedFill))map.addLayer({id:layers.selectedFill,metadata:{atlas:{satellite:{fill:'none'}}},type:'fill',source:sources.faces,filter:['==',['get','f'],-1],paint:{'fill-color':map.getPaintProperty(country+'-first-selection-fill','fill-color')||'#b7cce3','fill-opacity':.45,'fill-antialias':false}});
   map.moveLayer(layers.selectedFill);
  },
  // Outlines one unit: the edges with that unit on exactly one side.
  outline(config,unit,{highlight=false}={}){
   if(!map.getLayer(layers.selected))return;
   const index=unit?config.units.indexOf(unit):-1,arcs=[];
   if(index>=0)for(let i=0;i<data.arcL.length;i++){const l=config.face[data.arcL[i]]===index,r=data.arcR[i]>=0&&config.face[data.arcR[i]]===index;if(l!==r)arcs.push(data.arcId[i]);}
   map.setFilter(layers.selected,['in',['get','a'],['literal',arcs]]);
   const faces=highlight&&index>=0?config.face.flatMap((u,f)=>u===index?[f]:[]):[];
   if(map.getLayer(layers.selectedFill))map.setFilter(layers.selectedFill,['in',['get','f'],['literal',faces]]);
  },
  dispose(){remove();region.dispose();alaska.dispose();if(data){URL.revokeObjectURL(data.url);if(data.originalUrl!==data.url)URL.revokeObjectURL(data.originalUrl);}data=null;loading=null;}
 };
}
