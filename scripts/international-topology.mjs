import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';

export const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const pointKey=p=>p.join(',');
const edgeKey=(a,b)=>pointKey(a)<pointKey(b)?pointKey(a)+'|'+pointKey(b):pointKey(b)+'|'+pointKey(a);
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;

// Replace only exterior country edges. Interior administrative edges, islands,
// and coastlines outside the border corridor remain in their source geometry.
export function alignCountry(features,canonical,allowed,maxDistance=2500,candidate=()=>true){
 const t=topology({regions:{type:'FeatureCollection',features}});
 const exterior=mesh(t,t.objects.regions,(a,b)=>a===b);
 const exteriorEdges=new Set(exterior.coordinates.flatMap(path=>path.slice(1).map((p,i)=>edgeKey(path[i],p))));
 const ring=polygons(canonical.geometry).sort((a,b)=>b[0].length-a[0].length)[0][0];
 const n=ring.length-1,grid=new Map(),cell=.025;
 const padding=Math.ceil(maxDistance/(111195*cell*.7));
 for(let i=0;i<n;i++){
  const a=ring[i],b=ring[i+1];
  if(!allowed(a,b))continue;
  for(let x=Math.floor(Math.min(a[0],b[0])/cell)-padding;x<=Math.floor(Math.max(a[0],b[0])/cell)+padding;x++)
   for(let y=Math.floor(Math.min(a[1],b[1])/cell)-padding;y<=Math.floor(Math.max(a[1],b[1])/cell)+padding;y++){
    const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);
   }
 }
 const cache=new Map();
 function nearest(p){
  const key=pointKey(p);if(cache.has(key))return cache.get(key);
  let best=null;
  for(const i of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){
   const a=ring[i],b=ring[i+1],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1];
   const u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
   const q=[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])],distance=metres(p,q);
   if(distance<=maxDistance&&(!best||distance<best.distance))best={position:i+u,q,distance};
  }
  cache.set(key,best);return best;
 }
 const edits=new Map(),report={changedEdges:0,maxDisplacementMetres:0,changedRegions:[]};
 for(const f of features)for(const poly of polygons(f.geometry))for(const path of poly)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];if(!exteriorEdges.has(edgeKey(a,b))||!candidate(a,b))continue;
  const from=nearest(a),to=nearest(b);if(!from||!to)continue;
  let delta=to.position-from.position;if(delta>n/2)delta-=n;if(delta<-n/2)delta+=n;
  if(Math.abs(delta)>1500)continue;
  const replacement=[from.q];
  if(delta>=0){for(let j=Math.floor(from.position)+1;j<from.position+delta;j++)replacement.push(ring[(j%n+n)%n]);}
  else{for(let j=Math.ceil(from.position)-1;j>from.position+delta;j--)replacement.push(ring[(j%n+n)%n]);}
  replacement.push(to.q);
  const length=replacement.slice(1).reduce((s,p,i)=>s+metres(replacement[i],p),0);
  if(length>metres(a,b)*4+2000)continue;
  edits.set(edgeKey(a,b),{a:pointKey(a),path:replacement});
  report.maxDisplacementMetres=Math.max(report.maxDisplacementMetres,from.distance,to.distance);
 }
 const moved=new Map();for(const edit of edits.values()){moved.set(edit.a,edit.path[0]);}
 for(const f of features)for(const poly of polygons(f.geometry))for(const path of poly)for(let i=1;i<path.length;i++){
  const edit=edits.get(edgeKey(path[i-1],path[i]));if(edit){moved.set(pointKey(path[i-1]),nearest(path[i-1]).q);moved.set(pointKey(path[i]),nearest(path[i]).q);}
 }
 const result=features.map(f=>{
  let changed=false;
  const coords=polygons(f.geometry).map(poly=>poly.map(path=>{
   const output=[];
   for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],edit=edits.get(edgeKey(a,b));
    const segment=edit?(edit.a===pointKey(a)?edit.path:[...edit.path].reverse()):[moved.get(pointKey(a))||a,moved.get(pointKey(b))||b];
    if(edit){changed=true;report.changedEdges++;}
    if(moved.has(pointKey(a))||moved.has(pointKey(b)))changed=true;
    if(!output.length)output.push(segment[0]);output.push(...segment.slice(1));
   }
   output[output.length-1]=output[0];return output;
  }));
  if(changed)report.changedRegions.push(f.properties.id||f.properties.adcode);
  return changed?{...f,geometry:{type:f.geometry.type,coordinates:f.geometry.type==='Polygon'?coords[0]:coords}}:f;
 });
 return {features:result,report};
}
