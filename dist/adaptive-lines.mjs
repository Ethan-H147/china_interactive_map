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

export const internationalBorderPaint=()=>({'line-color':'#aaa9a2','line-width':regionalLineWidth(1),'line-opacity':1});
export function addInternationalBorder(map,id,source,layout={}){
 map.addLayer({id,type:'line',source,metadata:{atlasInternationalBorder:true,atlas:{role:'border'}},layout:{'line-join':'round','line-cap':'round',...layout},paint:internationalBorderPaint()});
}

const segmentKey=(a,b)=>[a.map(v=>v.toFixed(6)).join(','),b.map(v=>v.toFixed(6)).join(',')].sort().join('|');
export function borderSegments(collection){
 return new Set(collection.features.flatMap(f=>{const g=f.geometry,paths=g.type==='LineString'?[g.coordinates]:g.coordinates;return paths.flatMap(p=>p.slice(1).map((b,i)=>segmentKey(p[i],b)));}));
}
// Subdivision outlines and international lines come from different surveys, so
// their vertices rarely coincide even where the edges do. Matching vertices left
// every mismatched segment drawn twice, as alternating thick and thin pieces.
// A segment is therefore omitted when it lies on an international line: five
// points along it are each within `tolerance` metres of that line.
const cell=.02,pad=.0002;
export function borderIndex(collection,tolerance=2){
 const grid=new Map();
 for(const f of collection.features){
  const g=f.geometry;
  for(const p of g.type==='LineString'?[g.coordinates]:g.coordinates)for(let i=1;i<p.length;i++){
   const a=p[i-1],b=p[i];
   for(let x=Math.floor((Math.min(a[0],b[0])-pad)/cell);x<=Math.floor((Math.max(a[0],b[0])+pad)/cell);x++)
    for(let y=Math.floor((Math.min(a[1],b[1])-pad)/cell);y<=Math.floor((Math.max(a[1],b[1])+pad)/cell);y++){
     const key=x+','+y;let list=grid.get(key);if(!list)grid.set(key,list=[]);list.push(a,b);
    }
  }
 }
 return {grid,tolerance};
}
function onBorder({grid,tolerance},x,y){
 const list=grid.get(Math.floor(x/cell)+','+Math.floor(y/cell));if(!list)return false;
 const kx=111320*Math.cos(y*Math.PI/180),ky=110540;
 for(let i=0;i<list.length;i+=2){
  const a=list[i],b=list[i+1],ax=(a[0]-x)*kx,ay=(a[1]-y)*ky,dx=(b[0]-a[0])*kx,dy=(b[1]-a[1])*ky;
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  if(Math.hypot(ax+t*dx,ay+t*dy)<=tolerance)return true;
 }
 return false;
}
const samples=[0,.25,.5,.75,1];
const metres=(a,b)=>Math.hypot((b[0]-a[0])*111320*Math.cos((a[1]+b[1])*Math.PI/360),(b[1]-a[1])*110540);
export const liesOnBorder=(index,a,b)=>samples.every(t=>onBorder(index,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t));
// A stroke is never drawn twice. A segment is hidden when it lies on an
// international line that has its own layer, or when a segment already drawn in
// the same layer covers it (within tolerance metres): a translucent stroke drawn
// twice turns darker, and partial retracing reads as alternating thick and thin
// pieces. Returns the hidden segments as [path, first segment, count] ranges; paths
// of a FeatureCollection are numbered across its features in order.
const linePaths=input=>input.type==='FeatureCollection'?input.features.flatMap(f=>linePaths(f.geometry)):input.type==='LineString'?[input.coordinates]:input.coordinates;
// hide(path): indices of further segments not to stroke (China's coasts, scripts/china-shore.mjs).
export function hiddenSegments(geometry,{borders,hide,retraced=true,tolerance=.5}={}){
 const paths=linePaths(geometry),hidden=paths.map(()=>new Set());
 const index=()=>{
  const grid=new Map();
  return {grid,tolerance,insert(a,b){
   for(let x=Math.floor((Math.min(a[0],b[0])-pad)/cell);x<=Math.floor((Math.max(a[0],b[0])+pad)/cell);x++)
    for(let y=Math.floor((Math.min(a[1],b[1])-pad)/cell);y<=Math.floor((Math.max(a[1],b[1])+pad)/cell);y++){
     const key=x+','+y;let list=grid.get(key);if(!list)grid.set(key,list=[]);list.push(a,b);
    }
  }};
 };
 // Segments shorter than twice the tolerance are trivially near their neighbours,
 // so the retrace rule never hides them.
 const covered=(drawn,a,b)=>retraced&&metres(a,b)>=2*tolerance&&liesOnBorder(drawn,a,b);
 if(borders)paths.forEach((path,p)=>{for(let i=0;i<path.length-1;i++)if(liesOnBorder(borders,path[i],path[i+1]))hidden[p].add(i);});
 if(hide)paths.forEach((path,p)=>{for(const i of hide(path))hidden[p].add(i);});
 if(retraced){
  // Forward: hide what earlier strokes already draw. Backward: hide what a later,
  // longer stroke draws, so the result does not depend on drawing order.
  let drawn=index();
  paths.forEach((path,p)=>{for(let i=0;i<path.length-1;i++){if(hidden[p].has(i))continue;if(covered(drawn,path[i],path[i+1]))hidden[p].add(i);else drawn.insert(path[i],path[i+1]);}});
  drawn=index();
  for(let p=paths.length-1;p>=0;p--)for(let i=paths[p].length-2;i>=0;i--){if(hidden[p].has(i))continue;const a=paths[p][i],b=paths[p][i+1];if(covered(drawn,a,b))hidden[p].add(i);else drawn.insert(a,b);}
 }
 const ranges=[];
 hidden.forEach((set,p)=>{for(const i of [...set].sort((x,y)=>x-y)){const last=ranges[ranges.length-1];if(last&&last[0]===p&&last[1]+last[2]===i)last[2]++;else ranges.push([p,i,1]);}});
 return ranges;
}
export function withoutSegments(geometry,ranges){
 if(geometry.type==='FeatureCollection'){
  if(!ranges.length)return geometry;
  let offset=0;
  // A LineString split by hidden segments becomes one LineString feature per kept
  // run, with the same properties; a fully hidden feature is dropped.
  return {...geometry,features:geometry.features.flatMap(f=>{
   const count=linePaths(f.geometry).length,own=ranges.filter(([p])=>p>=offset&&p<offset+count).map(([p,i,n])=>[p-offset,i,n]);
   offset+=count;if(!own.length)return [f];
   const kept=withoutSegments(f.geometry,own);
   if(f.geometry.type==='LineString')return kept.coordinates.map(coordinates=>({...f,geometry:{type:'LineString',coordinates}}));
   return kept.coordinates.length?[{...f,geometry:kept}]:[];
  })};
 }
 const paths=linePaths(geometry),hidden=new Map(),coordinates=[];
 for(const [p,i,n] of ranges){if(!hidden.has(p))hidden.set(p,new Set());for(let k=0;k<n;k++)hidden.get(p).add(i+k);}
 paths.forEach((path,p)=>{
  const skip=hidden.get(p);if(!skip){if(path.length>1)coordinates.push(path);return;}
  let run=[];const flush=()=>{if(run.length>1)coordinates.push(run);run=[];};
  for(let i=0;i<path.length-1;i++){if(skip.has(i)){flush();continue;}if(!run.length)run.push(path[i]);run.push(path[i+1]);}
  flush();
 });
 return {type:'MultiLineString',coordinates};
}
export const visibleSegments=(geometry,options)=>withoutSegments(geometry,hiddenSegments(geometry,options));
export const dropRetracedSegments=geometry=>visibleSegments(geometry);
export const omitBorderSegments=(geometry,borders)=>visibleSegments(geometry,{borders,retraced:false});

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
