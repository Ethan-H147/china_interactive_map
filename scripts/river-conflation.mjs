// Cartographic reconciliation of selected river reaches with shared boundaries.
// This changes the optional water overlay; administrative polygons are immutable.
export const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const interpolate=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const key=p=>p.join(',');
export function measuredPath(points){
 const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+metres(points[i-1],points[i]));
 return{points,distances,length:distances.at(-1)};
}
export function pointAt(path,d){
 d=Math.max(0,Math.min(path.length,d));let lo=0,hi=path.distances.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(path.distances[mid]<=d)lo=mid;else hi=mid;}
 return interpolate(path.points[lo],path.points[hi],(d-path.distances[lo])/(path.distances[hi]-path.distances[lo]||1));
}
export function pathSlice(path,a,b){
 if(b<a)return pathSlice(path,b,a).reverse();
 const result=[pointAt(path,a)];for(let i=0;i<path.points.length;i++)if(path.distances[i]>a&&path.distances[i]<b)result.push(path.points[i]);result.push(pointAt(path,b));return result;
}
function vector(path,d,radius=1200){const a=pointAt(path,d-radius),b=pointAt(path,d+radius);return[(b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1]];}
function parallel(a,b){return Math.abs(a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)||1);}

export function segmentIndex(paths,maxDistance){
 const cell=.04,grid=new Map();
 for(const [pathId,path] of paths.entries())for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],padding=maxDistance/(111195*Math.cos(Math.max(Math.abs(a[1]),Math.abs(b[1]))*Math.PI/180));
  for(let x=Math.floor((Math.min(a[0],b[0])-padding)/cell);x<=Math.floor((Math.max(a[0],b[0])+padding)/cell);x++)for(let y=Math.floor((Math.min(a[1],b[1])-padding)/cell);y<=Math.floor((Math.max(a[1],b[1])+padding)/cell);y++){
   const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push({pathId,index:i-1,a,b});
  }
 }
 return p=>{
  let best=null;const c=Math.cos(p[1]*Math.PI/180);
  for(const s of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){
   const dx=(s.b[0]-s.a[0])*c,dy=s.b[1]-s.a[1],t=Math.max(0,Math.min(1,((p[0]-s.a[0])*c*dx+(p[1]-s.a[1])*dy)/(dx*dx+dy*dy||1))),q=interpolate(s.a,s.b,t),distance=metres(p,q);
   if(distance<=maxDistance&&(!best||distance<best.distance)){const path=paths[s.pathId];best={pathId:s.pathId,position:path.distances[s.index]+t*(path.distances[s.index+1]-path.distances[s.index]),distance,q};}
  }
  return best;
 };
}

export function alignRiver(line,canonical,options={}){
 const settings={maxDistance:2500,step:250,minLength:8000,taper:1000,maxMeanDistance:1200,minParallel:.8,maxStretch:1.8,...options};
 const source=measuredPath(line),paths=canonical.map(measuredPath),nearest=segmentIndex(paths,settings.maxDistance),runs=[];
 let run=[];
 const flush=()=>{if(run.length)runs.push(run);run=[];};
 // A match must persist along a continuous shared edge and follow its direction.
 // A transverse crossing produces a short or nonparallel run and is rejected.
 for(let d=0;d<=source.length;d+=settings.step){
  const p=pointAt(source,d),hit=nearest(p);
  if(!hit||parallel(vector(source,d),vector(paths[hit.pathId],hit.position))<settings.minParallel){flush();continue;}
  const previous=run.at(-1);
  if(previous&&(hit.pathId!==previous.pathId||Math.abs(hit.position-previous.position)>settings.step*3+300)){flush();}
  run.push({...hit,d});
 }
 flush();
 const accepted=[];
 for(const samples of runs){
  const first=samples[0],last=samples.at(-1),length=last.d-first.d,boundary=paths[first.pathId],direction=Math.sign(last.position-first.position);
  if(length<settings.minLength||!direction)continue;
  if(samples.reduce((s,h)=>s+h.distance,0)/samples.length>settings.maxMeanDistance)continue;
  // Reject jumps, reversed traversal and large detours around a nearby polygon.
  let monotonic=true;for(let i=1;i<samples.length;i++)if((samples[i].position-samples[i-1].position)*direction< -settings.step*.35)monotonic=false;
  const span=Math.abs(last.position-first.position);
  if(!monotonic||span>length*settings.maxStretch||span<length*.65)continue;
  const nearSource=segmentIndex([source],settings.maxDistance);
  let supported=true;for(let s=Math.min(first.position,last.position);s<=Math.max(first.position,last.position);s+=settings.step){const p=pointAt(boundary,s),h=nearSource(p);if(!h||h.position<first.d-500||h.position>last.d+500){supported=false;break;}}
  if(!supported)continue;
  const start=samples.find(h=>h.d>=first.d+settings.taper),end=samples.findLast(h=>h.d<=last.d-settings.taper);
  if(!start||!end||end.d-start.d<4000)continue;
  // Keep junctions and line endpoints fixed. Taper only inside the accepted reach.
  // The central path copies every intervening administrative vertex exactly.
  const output=[];
  for(const h of samples.filter(h=>h.d<start.d)){const t=(h.d-first.d)/(start.d-first.d);output.push(interpolate(pointAt(source,h.d),pointAt(boundary,first.position+t*(start.position-first.position)),t*t*(3-2*t)));}
  output.push(...pathSlice(boundary,start.position,end.position));
  for(const h of samples.filter(h=>h.d>end.d)){const t=(last.d-h.d)/(last.d-end.d);output.push(interpolate(pointAt(source,h.d),pointAt(boundary,last.position+t*(end.position-last.position)),t*t*(3-2*t)));}
  const vertexDistances=output.map(p=>nearSource(p)?.distance);
  if(vertexDistances.some(d=>d===undefined))continue;
  accepted.push({from:first.d,to:last.d,path:output,canonical:pathSlice(boundary,start.position,end.position),length:Math.abs(end.position-start.position),maxDisplacement:Math.max(...samples.map(s=>s.distance),...vertexDistances),meanDisplacement:samples.reduce((s,h)=>s+h.distance,0)/samples.length,pathId:first.pathId});
 }
 if(!accepted.length)return{line,changes:[]};
 let cursor=0;const result=[];
 const append=points=>{for(const p of points)if(!result.length||key(p)!==key(result.at(-1)))result.push(p);};
 for(const reach of accepted){append(pathSlice(source,cursor,reach.from));append(reach.path);cursor=reach.to;}
 append(pathSlice(source,cursor,source.length));
 // Preserve exact source endpoint coordinates, including confluences.
 result[0]=line[0];result[result.length-1]=line.at(-1);
 return{line:result,changes:accepted};
}

export function reconcileWater(features,canonicalByRiver,options={}){
 // Shared source nodes are immutable barriers. This prevents moving a confluence
 // on one river while leaving an adjoining tributary disconnected.
 const occurrences=new Map();
 const lines=f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const f of features.filter(f=>f.properties.kind==='river'))for(const line of lines(f))for(const p of line)occurrences.set(key(p),(occurrences.get(key(p))||0)+1);
 const report=[];
 const result=features.map((f,featureIndex)=>{
  const canonical=canonicalByRiver.get(f.properties.name);
  if(f.properties.kind!=='river'||!canonical?.length)return f;
  let changed=false;
  const coordinates=lines(f).map((line,lineIndex)=>{
   const cuts=[0];for(let i=1;i<line.length-1;i++)if(occurrences.get(key(line[i]))>1)cuts.push(i);cuts.push(line.length-1);
   const output=[];
   for(let i=1;i<cuts.length;i++){
    const piece=line.slice(cuts[i-1],cuts[i]+1),aligned=alignRiver(piece,canonical,options);
    if(aligned.changes.length)changed=true;
    output.push(...(output.length?aligned.line.slice(1):aligned.line));
    for(const reach of aligned.changes)report.push({river:f.properties.name,featureIndex,lineIndex,sourceId:f.properties.sourceId,start:reach.canonical[0],end:reach.canonical.at(-1),alignedMetres:Math.round(reach.length),maxDisplacementMetres:Math.round(reach.maxDisplacement),meanDisplacementMetres:Math.round(reach.meanDisplacement),canonicalVertices:reach.canonical.length,pathId:reach.pathId});
   }
   return output;
  });
  return changed?{...f,properties:{...f.properties,boundaryAligned:true},geometry:{...f.geometry,coordinates:f.geometry.type==='LineString'?coordinates[0]:coordinates}}:f;
 });
 return{features:result,report};
}
