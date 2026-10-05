import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {polygons} from './international-topology.mjs';
const key=p=>p.join(','),edge=(a,b)=>[key(a),key(b)].sort().join('|');
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;

// Dense source vertices may alternate across the nearest corner of a coarser
// country outline. Replace each complete exterior run once so it cannot fold
// backward. Shared subdivision junctions inherit the same projected endpoint.
export function alignMongolia(features,canonical,maxDistance=2500){
 const t=topology({r:{type:'FeatureCollection',features}}),exterior=mesh(t,t.objects.r,(a,b)=>a===b);
 const exteriorEdges=new Set(exterior.coordinates.flatMap(r=>r.slice(1).map((p,i)=>edge(r[i],p))));
 const ring=polygons(canonical.geometry).sort((a,b)=>b[0].length-a[0].length)[0][0],n=ring.length-1,grid=new Map(),cell=.025,padding=2;
 for(let i=0;i<n;i++){
  const a=ring[i],b=ring[i+1];
  for(let x=Math.floor(Math.min(a[0],b[0])/cell)-padding;x<=Math.floor(Math.max(a[0],b[0])/cell)+padding;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-padding;y<=Math.floor(Math.max(a[1],b[1])/cell)+padding;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}
 }
 const cache=new Map();
 function nearest(p){
  if(cache.has(key(p)))return cache.get(key(p));let best=null;
  for(const i of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){
   const a=ring[i],b=ring[i+1],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
   const q=[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])],distance=metres(p,q);
   if(distance<=maxDistance&&(!best||distance<best.distance))best={position:i+u,q,distance};
  }
  cache.set(key(p),best);return best;
 }
 const runs=new Map(),moved=new Map(),report={changedEdges:0,changedRuns:0,maxDisplacementMetres:0,changedRegions:[]};
 for(const f of features)for(const poly of polygons(f.geometry))for(const path of poly){
  const l=path.length-1,matched=Array.from({length:l},(_,i)=>exteriorEdges.has(edge(path[i],path[i+1]))&&nearest(path[i])&&nearest(path[i+1]));
  const start=matched.findIndex(m=>!m);if(start===-1)continue;
  for(let step=1;step<=l;step++){
   const i=(start+step)%l;if(!matched[i])continue;
   let count=1;while(step+count<=l&&matched[(i+count)%l])count++;
   const a=path[i],b=path[(i+count)%l],from=nearest(a),to=nearest(b);
   let delta=to.position-from.position;if(delta>n/2)delta-=n;if(delta<-n/2)delta+=n;
   const replacement=[from.q];
   if(delta>=0){for(let j=Math.floor(from.position)+1;j<from.position+delta;j++)replacement.push(ring[(j%n+n)%n]);}
   else{for(let j=Math.ceil(from.position)-1;j>from.position+delta;j--)replacement.push(ring[(j%n+n)%n]);}
   replacement.push(to.q);
   for(let j=0;j<count;j++)report.maxDisplacementMetres=Math.max(report.maxDisplacementMetres,nearest(path[(i+j)%l]).distance);
   moved.set(key(a),from.q);moved.set(key(b),to.q);
   runs.set(path,{...(runs.get(path)||{}),[i]:{count,replacement}});
   report.changedEdges+=count;report.changedRuns++;step+=count-1;
  }
 }
 const result=features.map(f=>{
  let changed=false;
  const coordinates=polygons(f.geometry).map(poly=>poly.map(path=>{
   const local=runs.get(path),l=path.length-1;
   const skip=new Set();for(const [i,r] of Object.entries(local||{}))for(let j=1;j<r.count;j++)skip.add((+i+j)%l);
   const first=Array.from({length:l},(_,i)=>i).find(i=>!skip.has(i)),out=[];
   for(let step=0;step<l;step++){
    const i=(first+step)%l;if(skip.has(i))continue;
    const r=local?.[i],segment=r?r.replacement:[moved.get(key(path[i]))||path[i],moved.get(key(path[(i+1)%l]))||path[(i+1)%l]];
    if(r||moved.has(key(path[i]))||moved.has(key(path[(i+1)%l])))changed=true;
    if(!out.length)out.push(segment[0]);out.push(...segment.slice(1));
   }
   out[out.length-1]=out[0];return out.filter((p,i)=>!i||key(p)!==key(out[i-1]));
  }));
  if(changed)report.changedRegions.push(f.properties.id);
  return changed?{...f,geometry:{type:f.geometry.type,coordinates:f.geometry.type==='Polygon'?coordinates[0]:coordinates}}:f;
 });
 return {features:result,report};
}
