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
