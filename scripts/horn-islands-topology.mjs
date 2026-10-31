import assert from 'node:assert/strict';import pc from'polygon-clipping';import{polygons,lineIndex,metres}from'./geo-index.mjs';import{fc,command}from'./build-regional-dataset.mjs';
const lattice=value=>typeof value==='number'?Math.round(value*1e6):value.map(lattice),degrees=value=>typeof value==='number'?value/1e6:value.map(degrees);
// Perform Boolean operations on an integer mic degree lattice to avoid open
// rings caused by floating-point differences between coincident source edges.
function unionPartition(parts){while(parts.length>1){const next=[];for(let i=0;i<parts.length;i+=32)next.push(pc.union(...parts.slice(i,i+32)));parts=next;}return parts[0]||[];}
export async function conform(children,parent){
 const mask=lattice(polygons(parent.geometry)),clipped=fc(children.features.flatMap(f=>{const coordinates=degrees(pc.intersection(lattice(polygons(f.geometry)),mask));return coordinates.length?[{...f,geometry:{type:'MultiPolygon',coordinates}}]:[];})),union=unionPartition(clipped.features.map(f=>lattice(polygons(f.geometry)))),gaps=degrees(pc.difference(mask,union)),edges=clipped.features.map(f=>lineIndex(polygons(f.geometry).flat())),patches=clipped.features.map(()=>[]);
 for(const gap of gaps){const lengths=clipped.features.map(()=>0);for(const ring of gap)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];edges.forEach((edge,j)=>{if(edge(mid)<.5)lengths[j]+=metres(a,b);});}let owner=lengths.indexOf(Math.max(...lengths));if(!lengths[owner]){const distances=edges.map(edge=>edge(gap[0][0]));owner=distances.indexOf(Math.min(...distances));}assert(owner>=0);patches[owner].push(gap);}
 const pieces=[...clipped.features];for(let i=0;i<clipped.features.length;i++)for(const coordinates of patches[i])pieces.push({type:'Feature',properties:{...clipped.features[i].properties},geometry:{type:'Polygon',coordinates}});
 const merged=await command(fc(pieces),'-dissolve2 id'+(children.features.some(f=>f.properties.parent)?',parent':'')+' -clean gap-fill-area=0');return merged;
}
import{selectFrontierArc,pointKey,segmentKey}from'./frontier-arcs.mjs';
// Use the neighboring polygon itself, projecting the incoming corner onto its
// complete ring. A coarse reference tripoint must not create a thin extension.
export function canonicalArc(mask,target,guide,anchors=[],{maximumScoreMetres=50000}={}){
 const own=selectFrontierArc(mask,guide,{maximumScoreMetres}).path,near=lineIndex([guide]);let chosen;
 for(const f of target.features)for(const polygon of polygons(f.geometry)){
  const ring=polygon[0].slice(0,-1),project=point=>{let best;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],c=Math.cos(point[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*c*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],distance=metres(q,point);if(!best||distance<best.distance)best={q:q.map(v=>+v.toFixed(6)),position:i+t,distance};}return best;};
  const endpoints=[own[0],own.at(-1)].map(p=>{const fixed=anchors.map(a=>({a,d:metres(a,p),projection:project(a)})).filter(v=>v.d<15000&&v.projection.distance<.5).sort((a,b)=>a.d-b.d)[0];return {...project(fixed?.a||p),fixed:!!fixed};});
  const walk=(a,b)=>{const end=b.position<=a.position?b.position+ring.length:b.position,result=[a.q];for(let i=Math.floor(a.position)+1;i<end;i++)result.push(ring[i%ring.length]);result.push(b.q);return result;},paths=[walk(endpoints[0],endpoints[1]),walk(endpoints[1],endpoints[0]).reverse()];
  for(const path of paths){const samples=path.filter((_,i)=>i%Math.max(1,Math.floor(path.length/200))===0),score=samples.reduce((s,p)=>s+Math.min(100000,near(p)),0)/samples.length+endpoints.reduce((s,p)=>s+p.distance,0);if(!chosen||score<chosen.score)chosen={path,score,fixed:endpoints.map(p=>p.fixed)};}
 }assert(chosen&&chosen.score<maximumScoreMetres,'Canonical neighboring outline arc');const path=chosen.path,selected=new Set(own.slice(1).map((b,i)=>segmentKey(own[i],b))),crossings=[];
 for(const f of mask.features)for(const poly of polygons(f.geometry))for(const ring of poly.slice(0,1))for(let j=1;j<ring.length;j++){const c=ring[j-1],d=ring[j];if(selected.has(segmentKey(c,d)))continue;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],rx=b[0]-a[0],ry=b[1]-a[1],sx=d[0]-c[0],sy=d[1]-c[1],den=rx*sy-ry*sx;if(Math.abs(den)<1e-15)continue;const dx=c[0]-a[0],dy=c[1]-a[1],u=(dx*ry-dy*rx)/den,v=(dx*sy-dy*sx)/den;if(u<0||u>1||v<0||v>1)continue;const p=[a[0]+v*rx,a[1]+v*ry];crossings.push({p:p.map(x=>+x.toFixed(6)),position:i-1+v});}}
 const start=chosen.fixed[0]?null:crossings.filter(v=>metres(v.p,path[0])<10000).sort((a,b)=>b.position-a.position)[0],end=chosen.fixed[1]?null:crossings.filter(v=>metres(v.p,path.at(-1))<10000).sort((a,b)=>a.position-b.position)[0],from=start?.position??0,to=end?.position??path.length-1;assert(to>from,'Positive clipped frontier');return [start?.p||path[0],...path.filter((p,i)=>i>from&&i<to),end?.p||path.at(-1)];
}
export function replaceMaskArc(mask,guide,canonical,{maximumEndpointMetres=20000,maximumScoreMetres=50000}={}){
 const own=selectFrontierArc(mask,canonical,{maximumScoreMetres,maximumEndpointMetres}).path,first=pointKey(own[0]),last=pointKey(own.at(-1));let replaced=false;
 const out=fc(mask.features.map(f=>({...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).map(poly=>{const ring=poly[0].slice(0,-1),a=ring.findIndex(p=>pointKey(p)===first),b=ring.findIndex(p=>pointKey(p)===last);if(a<0||b<0)return poly;assert(!replaced);replaced=true;const forward=pointKey(ring[(a+1)%ring.length])===pointKey(own[1]),direction=forward?1:-1,rest=[];for(let i=(b+direction+ring.length)%ring.length;i!==a;i=(i+direction+ring.length)%ring.length)rest.push(ring[i]);return[[...canonical,...rest,canonical[0]],...poly.slice(1)];})}})));assert(replaced,'One national exterior replaced');return out;
}
import{geographicBounds}from'./build-regional-dataset.mjs';
export function eraseWater(regions,water){
 const waters=water.features.map(f=>({shape:lattice(polygons(f.geometry)),bounds:geographicBounds(f.geometry)})),overlap=(a,b)=>a[0][0]<=b[1][0]&&a[1][0]>=b[0][0]&&a[0][1]<=b[1][1]&&a[1][1]>=b[0][1];
 return fc(regions.features.flatMap(f=>{const bounds=geographicBounds(f.geometry),candidates=waters.filter(w=>overlap(bounds,w.bounds));if(!candidates.length)return[f];const coordinates=degrees(pc.difference(lattice(polygons(f.geometry)),...candidates.map(w=>w.shape)));return coordinates.length?[{...f,geometry:{type:'MultiPolygon',coordinates}}]:[];}));
}
import{joinReferencePaths}from'./frontier-arcs.mjs';
export function sharedArcPaths(a,b,{guide=null,tolerance=.5}={}){
 const edge=lineIndex(b.features.flatMap(f=>polygons(f.geometry).flat())),near=guide?lineIndex(guide):()=>0,runs=[];
 for(const f of a.features)for(const poly of polygons(f.geometry))for(const ring of poly){let run=null;for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if([a,m,b].every(p=>edge(p)<tolerance)&&near(m)<15000){if(!run){run=[a];runs.push(run);}run.push(b);}else run=null;}}
 return joinReferencePaths(runs).filter(p=>p.length>1);
}
export function eraseNeighbors(mask,neighbors){const coordinates=degrees(pc.difference(lattice(mask.features.flatMap(f=>polygons(f.geometry))),...neighbors.map(n=>lattice(n.features.flatMap(f=>polygons(f.geometry))))));return fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates}}]);}
// Remove numerical out-and-back returns, whose two banks differ by less than
// half a metre. Without this, a precision sliver becomes a kilometre-long stroke.
export function cleanNumericalReturns(regions){
 let removed=0;const distance=(p,a,b)=>{const c=Math.cos(p[1]*Math.PI/180),v=[(b[0]-a[0])*c,b[1]-a[1]],w=[(p[0]-a[0])*c,p[1]-a[1]],u=Math.max(0,Math.min(1,(v[0]*w[0]+v[1]*w[1])/(v[0]*v[0]+v[1]*v[1]||1)));return Math.hypot(w[0]-u*v[0],w[1]-u*v[1])*111195;};
 const ringClean=ring=>{const p=ring.slice(0,-1),prev=p.map((_,i)=>(i+p.length-1)%p.length),next=p.map((_,i)=>(i+1)%p.length),live=p.map(()=>true),queue=p.map((_,i)=>i);let left=p.length;for(let k=0;k<queue.length&&left>3;k++){const i=queue[k];if(!live[i])continue;const j=prev[i],l=next[i],a=p[j],b=p[i],c=p[l],dot=(a[0]-b[0])*(c[0]-b[0])+(a[1]-b[1])*(c[1]-b[1]),duplicate=metres(a,b)<.01||metres(b,c)<.01;if(!duplicate&&!(dot>0&&Math.min(distance(a,b,c),distance(c,a,b))<.5))continue;live[i]=false;next[j]=l;prev[l]=j;left--;removed++;queue.push(j,l);}const result=p.filter((_,i)=>live[i]);result.push(result[0]);return result;};
 const narrow=ring=>{const origin=ring[0],scale=Math.cos(origin[1]*Math.PI/180),p=ring.map(q=>[(q[0]-origin[0])*scale*111195,(q[1]-origin[1])*111195]);let twiceArea=0,length=0;for(let i=1;i<p.length;i++){twiceArea+=p[i-1][0]*p[i][1]-p[i][0]*p[i-1][1];length+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);}return{area:Math.abs(twiceArea)/2,thin:length>10&&Math.abs(twiceArea)/length<.5};};
 return{regions:fc(regions.features.map(f=>{const parts=polygons(f.geometry).map(poly=>poly.map(ringClean)),sizes=parts.map(poly=>narrow(poly[0])),largest=sizes.reduce((a,b,i)=>b.area>sizes[a].area?i:a,0),coordinates=parts.flatMap((poly,i)=>{if(i!==largest&&sizes[i].thin){removed++;return[];}return[[poly[0],...poly.slice(1).filter(r=>{if(narrow(r).thin){removed++;return false;}return true;})]];});return{...f,geometry:{type:'MultiPolygon',coordinates}};})),removed};
}
export function unionLand(regions,properties={}){return fc([{type:'Feature',properties,geometry:{type:'MultiPolygon',coordinates:degrees(unionPartition(regions.features.map(f=>lattice(polygons(f.geometry)))) )}}]);}
export function islandAtolls(islands){const parents=[...new Set(islands.features.map(f=>f.properties.parent))];return fc(parents.flatMap(id=>unionLand(fc(islands.features.filter(f=>f.properties.parent===id)),{id}).features));}
