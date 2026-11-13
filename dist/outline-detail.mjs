import {lineData,lineSourceOptions} from './adaptive-lines.mjs';

// Use one screen-space policy for every regional country's selected coastline
// and lake rings. No geographic vertices or selection IDs are removed.
export const selectionLineSourceOptions={...lineSourceOptions,tolerance:.35};
export function selectionLineData(input){
 // Fade small rings from a 12 px footprint to 32 px. Large coastlines remain
 // visible; MapLibre drops subpixel bends per tile and restores them on zoom.
 return lineData(input,{minimumPixels:12,areaSensitive:true});
}
// Dated mosaics (historic-borders.mjs): a selected unit's outline and shape, built in the worker
// from a compact copy of the file, so the page sends only the unit, as for present-day regions.
// An outline edge fades as the selected outline above fades the ring it belongs to: the unit's
// faces that touch are joined into land masses first, so a small island fades in by size while
// a coast cut into many small faces stays whole.
const pack=(path,exact=false)=>{
 if(ArrayBuffer.isView(path))return exact?path:Float32Array.from(path);
 const a=exact?new Float64Array(path.length*2):new Float32Array(path.length*2);
 path.forEach(([x,y],i)=>{a[2*i]=x;a[2*i+1]=y;});return a;
};
const unpack=a=>{const path=[];for(let i=0;i<a.length;i+=2)path.push([a[i],a[i+1]]);return path;};
export function compactMosaic(decoded,configs){
 const faces=decoded.faces.features.map(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(polygon=>polygon.map(ring=>pack(ring,!!(f.properties.hostId||f.properties.sharedSource)))));
 return {faces,arcs:decoded.arcs.features.filter(f=>!f.properties.drawOnly).map(f=>({l:f.properties.l,r:f.properties.r,coast:f.properties.coast===true,path:pack(f.geometry.coordinates,!!f.properties.exact)})),configs:configs.map(c=>Int32Array.from(c.face)),boundaries:configs.map(c=>c.selectionLines?c.units.map(u=>c.selectionLines[u.id]):null)};
}
const mercatorY=lat=>(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
// Each face's projected extent and outer-ring area, as lineData measures a ring.
function faceSize(mosaic,f){
 mosaic.size??=new Array(mosaic.faces.length);
 if(!mosaic.size[f]){
  let w=Infinity,e=-Infinity,n=Infinity,south=-Infinity,area=0;
  for(const polygon of mosaic.faces[f]){const r=polygon[0],x0=r[0]/360,y0=mercatorY(r[1]);let ring=0,px=0,py=0;for(let i=0;i<r.length;i+=2){const x=r[i]/360-x0,y=mercatorY(r[i+1])-y0;if(x+x0<w)w=x+x0;if(x+x0>e)e=x+x0;if(y+y0<n)n=y+y0;if(y+y0>south)south=y+y0;if(i)ring+=px*y-x*py;px=x;py=y;}area+=Math.abs(ring)/2;}
  mosaic.size[f]={w,e,n,s:south,area};
 }
 return mosaic.size[f];
}
// Legacy meshes can contain coincident edges without shared face IDs. A
// selected territory has no outline inside its own land. Index only this
// selection's rings so checking those edges stays local to one worker request.
function selectedInterior(mosaic,face,unit){
 const rows=new Map(),step=.002;let polygonId=0,w=Infinity,e=-Infinity;
 face.forEach((u,f)=>{if(u!==unit)return;
  for(const polygon of mosaic.faces[f]){
   const id=polygonId++;
   for(const [ringId,ring] of polygon.entries())for(let i=0,j=ring.length-2;i<ring.length;j=i,i+=2){
    const x=ring[i],y=ring[i+1],py=ring[j+1];w=Math.min(w,x);e=Math.max(e,x);
    if(y===py&&ringId===0)continue;
    const edge={ring,i,j,id,hole:ringId>0};
    for(let row=Math.floor(Math.min(y,py)/step),end=Math.floor(Math.max(y,py)/step);row<=end;row++){
     let bucket=rows.get(row);if(!bucket)rows.set(row,bucket=[]);bucket.push(edge);
    }
   }
  }
 });
 const stamps=new Uint32Array(polygonId),parity=new Uint8Array(polygonId);let serial=0;
 const contains=(x,y)=>{
  if(x<w||x>e)return false;
  const bucket=rows.get(Math.floor(y/step));if(!bucket)return false;
  serial++;let count=0;
  for(const {ring,i,j,id}of bucket){
   const ay=ring[i+1],by=ring[j+1];
   if((ay>y)===(by>y)||x>=(ring[j]-ring[i])*(y-ay)/(by-ay)+ring[i])continue;
   if(stamps[id]!==serial){stamps[id]=serial;parity[id]=0;}
   count+=parity[id]?-1:1;parity[id]^=1;
  }
  return count>0;
 };
 // Retain real water-hole rings even when a wider interior probe would
 // jump across a very narrow channel. These coordinates are never edited.
 contains.hole=(x,y)=>{
  const row=Math.floor(y/step),cos=Math.cos(y*Math.PI/180),limit=2/111195;
  for(let r=row-1;r<=row+1;r++)for(const {ring,i,j,hole} of rows.get(r)||[]){
   if(!hole)continue;
   const ax=(ring[i]-x)*cos,ay=ring[i+1]-y,dx=(ring[j]-ring[i])*cos,dy=ring[j+1]-ring[i+1];
   const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy)));
   if(Math.hypot(ax+t*dx,ay+t*dy)<=limit)return true;
  }
  return false;
 };
 return contains;
}
function outlineRuns(path,inside){
 const coordinates=unpack(path),runs=[];let start=0;
 for(let i=1;i<coordinates.length;i++){
  const a=coordinates[i-1],b=coordinates[i],middle=a.map((v,k)=>(v+b[k])/2);
  const cos=Math.cos(middle[1]*Math.PI/180),dx=(b[0]-a[0])*cos,dy=b[1]-a[1],length=Math.hypot(dx,dy);
  let internal=false;
  // Tiny edges and pole/date-line paths keep their existing geometry.
  if(length*111195>4&&cos>.01&&Math.abs(b[0]-a[0])<180){
   const step=2/111195,x=-dy/length*step/cos,y=dx/length*step;
   internal=inside(middle[0]+x,middle[1]+y)&&inside(middle[0]-x,middle[1]-y)&&!inside.hole(middle[0],middle[1]);
  }
  if(internal){if(start>=0&&i-start>1)runs.push(coordinates.slice(start,i));start=-1;}
  else if(start<0)start=i-1;
 }
 if(start>=0&&coordinates.length-start>1)runs.push(start?coordinates.slice(start):coordinates);
 return runs;
}
export function unitOutline(mosaic,config,unit){
 const face=mosaic.configs[config],features=[];if(unit<0)return {type:'FeatureCollection',features};
 const exact=mosaic.boundaries[config];
 if(exact?.[unit])return exact[unit];
 // Join the unit's faces across the edges inside it.
 const parent=new Map(),find=f=>{let r=f;while(parent.get(r)!==r)r=parent.get(r);while(parent.get(f)!==r){const next=parent.get(f);parent.set(f,r);f=next;}return r;};
 face.forEach((u,f)=>{if(u===unit)parent.set(f,f);});
 for(const a of mosaic.arcs)if(a.r>=0&&face[a.l]===unit&&face[a.r]===unit){const l=find(a.l),r=find(a.r);if(l!==r)parent.set(l,r);}
 const masses=new Map();
 for(const f of parent.keys()){const root=find(f),size=faceSize(mosaic,f),m=masses.get(root);if(!m)masses.set(root,{...size});else{m.w=Math.min(m.w,size.w);m.e=Math.max(m.e,size.e);m.n=Math.min(m.n,size.n);m.s=Math.max(m.s,size.s);m.area+=size.area;}}
 // The selection footprint of selectionLineData: a ring fades in from 12 px.
 const zoom=new Map();for(const [root,m] of masses){const span=Math.min(Math.hypot(m.e-m.w,m.s-m.n),2*Math.sqrt(m.area))*512;zoom.set(root,span>0?Math.log2(12/span):24);}
 // Verified physical coasts already describe the land/water edge. Keep them
 // verbatim and build the interior index only for legacy survey paths.
 let inside;
 for(const a of mosaic.arcs){const l=face[a.l]===unit,r=a.r>=0&&face[a.r]===unit;if(l===r)continue;for(const coordinates of a.coast?[unpack(a.path)]:outlineRuns(a.path,inside??=selectedInterior(mosaic,face,unit)))features.push({type:'Feature',properties:{visibleZoom:zoom.get(find(l?a.l:a.r))},geometry:{type:'LineString',coordinates}});}
 return {type:'FeatureCollection',features};
}
// Dated region files (one representation order's ridings, historic-borders.mjs): a compact copy
// of the regions keyed by ID, kept in the worker, so a selection rebuilds one region's features
// instead of decoding the whole file again. Coordinates stay double precision, so a selected
// outline matches the decoded file exactly.
const pack64=ring=>{const a=new Float64Array(ring.length*2);ring.forEach(([x,y],i)=>{a[2*i]=x;a[2*i+1]=y;});return a;};
export function compactRegions(collection){
 const regions=new Map();
 for(const {properties,geometry:g} of collection.features){
  if(g?.type!=='Polygon'&&g?.type!=='MultiPolygon')continue;
  if(!regions.has(properties.id))regions.set(properties.id,[]);
  regions.get(properties.id).push({properties,type:g.type,rings:g.type==='Polygon'?g.coordinates.map(pack64):g.coordinates.map(polygon=>polygon.map(pack64))});
 }
 return regions;
}
export function regionFeatures(regions,id){
 return (regions.get(id)||[]).map(({properties,type,rings})=>({type:'Feature',properties,geometry:{type,coordinates:type==='Polygon'?rings.map(unpack):rings.map(polygon=>polygon.map(unpack))}}));
}
export function unitShape(mosaic,config,unit){
 const face=mosaic.configs[config],coordinates=[];if(unit<0)return {type:'FeatureCollection',features:[]};
 face.forEach((u,f)=>{if(u===unit)for(const polygon of mosaic.faces[f])coordinates.push(polygon.map(unpack));});
 return {type:'FeatureCollection',features:coordinates.length?[{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates}}]:[]};
}
