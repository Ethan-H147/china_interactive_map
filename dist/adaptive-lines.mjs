import {splitLinePaths} from './korea-lines.mjs';

const mercatorY=lat=>(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
// A line's projected footprint controls when an island outline becomes useful.
// This is evaluated continuously by the GPU; no geometry swaps occur during motion.
export function lineData(input){
 const collection=input.type==='FeatureCollection'?input:input.type==='Feature'?{type:'FeatureCollection',features:[input]}:{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:input}]};
 const result=[];
 for(const f of collection.features){
  const g=f.geometry;
  const paths=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:(g.type==='Polygon'?g.coordinates:g.coordinates.flat());
  for(const path of paths){
   const x=path.map(p=>p[0]/360),y=path.map(p=>mercatorY(p[1]));
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
   for(let i=0;i<path.length;i++){minX=Math.min(minX,x[i]);maxX=Math.max(maxX,x[i]);minY=Math.min(minY,y[i]);maxY=Math.max(maxY,y[i]);}
   const span=Math.hypot(maxX-minX,maxY-minY)*512;
   // Fade between a 1.5 px and 4 px diagonal; every path is fully visible up close.
   const visibleZoom=span>0?Math.log2(1.5/span):24;
   const properties={...f.properties,visibleZoom};
   result.push(...splitLinePaths([path],properties).features);
  }
 }
 return {type:'FeatureCollection',features:result};
}
export function adaptiveOpacity(base=1){
 const expression=['interpolate',['linear'],['zoom']];
 for(let z=0;z<=18;z++)expression.push(z,['*',base,['min',1,['max',0,['/', ['-',z,['get','visibleZoom']],1.42]]]]);
 expression.push(22,base);return expression;
}
export const lineSourceOptions={type:'geojson',tolerance:.65,maxzoom:18,buffer:128};
// Thin country strokes must stay within their own width of the unsimplified fill.
// Subdivision tolerances are intentionally larger and must never override this.
export const internationalLineSourceOptions={...lineSourceOptions,tolerance:.125};
export const regionalLineWidth=(level,selected=false)=>['interpolate',['linear'],['zoom'],2,selected?.7:level===1?.45:.25,6,selected?1.1:level===1?.75:.45,10,selected?1.7:level===1?.9:.55];

export const internationalBorderPaint=()=>({'line-color':'#aaa9a2','line-width':regionalLineWidth(1),'line-opacity':adaptiveOpacity()});
const borderMaps=new WeakSet();
export function addInternationalBorder(map,id,source,layout={}){
 map.addLayer({id,type:'line',source,metadata:{atlasInternationalBorder:true},layout:{'line-join':'round','line-cap':'round',...layout},paint:internationalBorderPaint()});
 if(borderMaps.has(map))return;
 borderMaps.add(map);
 let queued=false;
 map.on('styledata',()=>{
  if(queued)return;queued=true;
  queueMicrotask(()=>{
   queued=false;
   const layers=map.getStyle().layers;
   const borders=layers.filter(l=>l.metadata?.atlasInternationalBorder);
   const lastFill=layers.findLastIndex(l=>l.type==='fill'||l.type==='raster');
   // Later country fills must never cover an already installed shared stroke.
   for(const border of borders)if(layers.findIndex(l=>l.id===border.id)<lastFill)map.moveLayer(border.id);
  });
 });
}

const segmentKey=(a,b)=>[a.map(v=>v.toFixed(6)).join(','),b.map(v=>v.toFixed(6)).join(',')].sort().join('|');
export function borderSegments(collection){
 return new Set(collection.features.flatMap(f=>{const g=f.geometry,paths=g.type==='LineString'?[g.coordinates]:g.coordinates;return paths.flatMap(p=>p.slice(1).map((b,i)=>segmentKey(p[i],b)));}));
}
export function omitBorderSegments(geometry,excluded){
 const paths=geometry.type==='LineString'?[geometry.coordinates]:geometry.coordinates,coordinates=[];
 for(const path of paths){let run=[];const flush=()=>{if(run.length>1)coordinates.push(run);run=[];};for(let i=1;i<path.length;i++){if(excluded.has(segmentKey(path[i-1],path[i])))flush();else{if(!run.length)run.push(path[i-1]);run.push(path[i]);}}flush();}
 return {type:'MultiLineString',coordinates};
}

// Hidden layers skip drawing and tile requests. Keep paint bindings unchanged.
export function setLayerVisible(map,id,visible){
 if(!map.getLayer(id))return;
 const value=visible?'visible':'none';
 if((map.getLayoutProperty(id,'visibility')||'visible')!==value)map.setLayoutProperty(id,'visibility',value);
}

// Keep feature-state bindings alive while a country is hidden. Replacing a
// data-driven opacity with a constant can invalidate cached paint bindings.
export function hiddenOpacity(value){
 if(!Array.isArray(value))return 0;
 if(value[0]==='interpolate'){const result=value.slice();for(let i=4;i<result.length;i+=2)result[i]=['*',result[i],0];return result;}
 return ['*',value,0];
}
