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
 return features.filter(f=>!f.properties.outline).map(f=>{
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

export function createHistoricBorders(map,{country,base,file,lineLayer=country+'-first-lines'}){
 const layers={fill:country+'-history-fill',lines:country+'-history-lines',frontiers:country+'-history-frontiers',outer:country+'-history-outer',selected:country+'-history-selected'};
 const sources={faces:country+'-history-faces',edges:country+'-history-edges',outer:country+'-history-borders'};
 const ownLayers=new Set(Object.values(layers));
 let data=null,loading=null;
 function load(){
  loading??=(async()=>{
   const bytes=await fetchBytes(compactUrl(base+file)),loaded=await decodeData(bytes),sides=loaded.arcs.features.map(f=>f.properties);
   data={source:loaded.source,versions:loaded.versions,configs:loaded.configs,elections:loaded.elections,years:loaded.years,url:URL.createObjectURL(new Blob([bytes])),shapes:packShapes(loaded.faces.features),arcL:Int32Array.from(sides,a=>a.l),arcR:Int32Array.from(sides,a=>a.r),arcId:Int32Array.from(sides,a=>a.a)};
   return data;
  })().catch(error=>{loading=null;throw error;});
  return loading;
 }
 const linePaint=()=>map.getLayer(lineLayer)?Object.fromEntries(['line-color','line-width','line-opacity'].map(p=>[p,map.getPaintProperty(lineLayer,p)]).filter(([,v])=>v!==undefined)):{'line-color':'#587694','line-width':1};
 // Frontiers between countries are drawn heavier than borders within one.
 const frontierPaint=()=>{const color=map.getLayer(lineLayer)&&map.getPaintProperty(lineLayer,'line-color');return {'line-color':typeof color==='string'?color:'#587694','line-width':['interpolate',['linear'],['zoom'],3,1.1,8,2]};};
 function selectionPaint(){
  const host=map.getStyle().layers.find(l=>l.type==='line'&&l.id.startsWith(country+'-')&&l.metadata?.atlas?.role==='selection'&&!ownLayers.has(l.id));
  const color=host&&map.getPaintProperty(host.id,'line-color'),width=host&&map.getPaintProperty(host.id,'line-width');
  return {'line-color':typeof color==='string'?color:'#b73945','line-width':width??1.8};
 }
 function remove(){for(const id of Object.values(layers))if(map.getLayer(id))map.removeLayer(id);for(const id of Object.values(sources))if(map.getSource(id))map.removeSource(id);}
 const none=['==',['get','a'],-1],round={'line-join':'round','line-cap':'round'};
 return {
  layers:ownLayers,load,remove,get data(){return data;},
  unit(config,face){const i=face>=0?config.face[face]:-1;return i>=0?config.units[i]:null;},
  pick(point){const hit=shapeAt(map,data.shapes,point);return hit?hit.properties.f:null;},
  // Draws a configuration directly above the host's first-level fill, colouring each unit.
  draw(config,colorOf,fillLayer){
   if(!map.getSource(sources.faces)){
    const url=member=>'atlas-data://'+country+'-history?url='+encodeURIComponent(data.url)+'&member='+member;
    map.addSource(sources.faces,{type:'geojson',data:url('faces'),tolerance:.25});map.addSource(sources.edges,{type:'geojson',data:url('arcs'),tolerance:.25});map.addSource(sources.outer,{type:'geojson',data:url('borders'),tolerance:.25});
    const all=map.getStyle().layers,before=all[all.findIndex(l=>l.id===fillLayer)+1]?.id;
    map.addLayer({id:layers.fill,type:'fill',source:sources.faces,paint:{'fill-color':TRANSPARENT}},before);
    map.addLayer({id:layers.lines,type:'line',source:sources.edges,filter:none,layout:round,paint:linePaint()},before);
    map.addLayer({id:layers.frontiers,type:'line',source:sources.edges,filter:none,layout:round,paint:frontierPaint()},before);
    map.addLayer({id:layers.outer,type:'line',source:sources.outer,filter:['==',['get','b'],-1],layout:round,paint:frontierPaint()},before);
    map.addLayer({id:layers.selected,type:'line',source:sources.edges,filter:none,layout:round,paint:selectionPaint()},before);
   }
   const color=config.units.map(colorOf),faces=new Map();
   config.face.forEach((unit,f)=>{if(unit<0)return;const key=color[unit];if(!faces.has(key))faces.set(key,[]);faces.get(key).push(f);});
   map.setPaintProperty(layers.fill,'fill-color',faces.size?['match',['get','f'],...[...faces].flatMap(([key,list])=>[list,key]),TRANSPARENT]:TRANSPARENT);
   map.setFilter(layers.lines,['in',['get','a'],['literal',config.lines]]);
   map.setFilter(layers.frontiers,['in',['get','a'],['literal',config.frontiers]]);
   map.setFilter(layers.outer,['in',['get','b'],['literal',config.borders]]);
  },
  // Outlines one unit: the edges with that unit on exactly one side.
  outline(config,unit){
   if(!map.getLayer(layers.selected))return;
   const index=unit?config.units.indexOf(unit):-1,arcs=[];
   if(index>=0)for(let i=0;i<data.arcL.length;i++){const l=config.face[data.arcL[i]]===index,r=data.arcR[i]>=0&&config.face[data.arcR[i]]===index;if(l!==r)arcs.push(data.arcId[i]);}
   map.setFilter(layers.selected,['in',['get','a'],['literal',arcs]]);
  },
  dispose(){remove();if(data)URL.revokeObjectURL(data.url);data=null;loading=null;}
 };
}
