// Borders across narrow water: where a river or estuary channel separates two units (their
// polygons stop at each bank), the border runs down the middle of the channel. For each water-
// facing edge of a unit, a ray is cast outward; when the first outline it meets belongs to
// another unit, facing back, within maxWidth, the ray's midpoint lies on the channel's median.
// Runs of those midpoints become lines between the pair. Wider water (bays, straits, open sea)
// stays open, and edges facing the unit's own shore (its own bays) draw nothing.
// Returns a FeatureCollection of MultiLineStrings with properties.owners [a, b] (sorted ids).
import {polygons,metres,landIndex} from './geo-index.mjs';
import {borderIndex,hiddenSegments} from '../dist/adaptive-lines.mjs';

// The other unit whose outline lies within a distance of a point (null if none), by a grid of
// sampled segments. units: Map of id to feature.
export function outlineIndex(units,tolerance){
 const cell=Math.max(2.2*tolerance/111195,.002),grid=new Map(),segments=[],limit=tolerance/111195;
 for(const [id,f] of units)for(const polygon of polygons(f.geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],k=segments.push([a,b,id])-1,steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(cell/4)),seen=new Set();
  for(let t=0;t<=steps;t++){const x=Math.floor((a[0]+(b[0]-a[0])*t/steps)/cell),y=Math.floor((a[1]+(b[1]-a[1])*t/steps)/cell),c=x+','+y;if(seen.has(c))continue;seen.add(c);if(!grid.has(c))grid.set(c,[]);grid.get(c).push(k);}
 }
 return (p,id)=>{const x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell),c=Math.cos(p[1]*Math.PI/180);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const k of grid.get((x+i)+','+(y+j))||[]){const [a,b,owner]=segments[k];if(owner===id)continue;
   const dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),ex=(a[0]+u*(b[0]-a[0])-p[0])*c,ey=a[1]+u*(b[1]-a[1])-p[1];
   if(Math.hypot(ex,ey)<=limit)return owner;}
  return null;};
}

const key=(a,b)=>a[0]<b[0]||a[0]===b[0]&&a[1]<b[1]?a+';'+b:b+';'+a;

// tolerance: how far apart (m) two units' shared edges may sit after simplification; such edges
// are borders already, not shores (they still block rays).
// land(point): true where the parent level covers the point; a gap there is land between units
// that do not tile (Botswana's localities, Russia's inter-settlement territories), not water.
export function channelLines(features,{maxWidth=1500,minLength=150,step=60,tolerance=0,land=null}={}){
 const byId=new Map();for(const f of features)if(f.geometry&&f.properties.id!=null&&!byId.has(f.properties.id))byId.set(f.properties.id,f);
 const units=[...byId.values()],count=new Map(),near=tolerance>0?outlineIndex(byId,tolerance):()=>null;
 for(const f of units)for(const polygon of polygons(f.geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){const k=key(ring[i-1],ring[i]);count.set(k,(count.get(k)||0)+1);}
 // Edges no other unit shares; water-facing unless another unit's outline lies within tolerance.
 const edges=[];
 for(const f of units){const id=f.properties.id,inside=landIndex(polygons(f.geometry).flat());for(const polygon of polygons(f.geometry))for(const ring of polygon)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if(count.get(key(a,b))===1)edges.push({id,a,b,inside,ring,i,water:near([(a[0]+b[0])/2,(a[1]+b[1])/2],id)===null});}}
 if(!edges.length)return {type:'FeatureCollection',features:[]};
 // Local metric frame (metres) around the dataset's mean latitude is accurate enough for channel widths.
 const lat=edges.reduce((s,e)=>s+e.a[1],0)/edges.length,kx=111195*Math.cos(lat*Math.PI/180),ky=111195;
 const xy=p=>[p[0]*kx,p[1]*ky],lonlat=q=>[q[0]/kx,q[1]/ky];
 const cell=maxWidth,grid=new Map();
 edges.forEach((e,k)=>{const A=xy(e.a),B=xy(e.b);e.A=A;e.B=B;for(let x=Math.floor(Math.min(A[0],B[0])/cell);x<=Math.floor(Math.max(A[0],B[0])/cell);x++)for(let y=Math.floor(Math.min(A[1],B[1])/cell);y<=Math.floor(Math.max(A[1],B[1])/cell);y++){const c=x+','+y;if(!grid.has(c))grid.set(c,[]);grid.get(c).push(k);}});
 // First edge hit by the ray from p along d (unit vector), within maxWidth.
 function cast(p,d,self){
  let best=null,bestT=maxWidth;const seen=new Set();
  for(let t=0;t<=maxWidth+cell;t+=cell/2){const c=Math.floor((p[0]+d[0]*Math.min(t,maxWidth))/cell)+','+Math.floor((p[1]+d[1]*Math.min(t,maxWidth))/cell);
   for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){const [cx,cy]=c.split(',').map(Number),list=grid.get((cx+x)+','+(cy+y));if(!list)continue;
    for(const k of list){if(k===self||seen.has(k))continue;seen.add(k);const e=edges[k],ex=e.B[0]-e.A[0],ey=e.B[1]-e.A[1],den=d[0]*ey-d[1]*ex;if(Math.abs(den)<1e-12)continue;
     const wx=e.A[0]-p[0],wy=e.A[1]-p[1],tt=(wx*ey-wy*ex)/den,u=(wx*d[1]-wy*d[0])/den;if(tt>1e-6&&tt<bestT&&u>=0&&u<=1){bestT=tt;best={k,t:tt};}}}
   if(best&&t>best.t+cell)break;}
  return best;
 }
 // Midpoints along each water-facing edge, sampled every `step` metres.
 const runs=new Map();
 edges.forEach((e,k)=>{
  if(!e.water)return;
  const dx=e.B[0]-e.A[0],dy=e.B[1]-e.A[1],len=Math.hypot(dx,dy);if(!len)return;
  let n=[-dy/len,dx/len];const mid=lonlat([(e.A[0]+e.B[0])/2+n[0]*5,(e.A[1]+e.B[1])/2+n[1]*5]);if(e.inside(mid))n=[-n[0],-n[1]];
  const samples=Math.max(1,Math.round(len/step));
  for(let s=0;s<samples;s++){const f=(s+.5)/samples,p=[e.A[0]+dx*f,e.A[1]+dy*f],hit=cast(p,n,k);if(!hit)continue;const o=edges[hit.k];if(o.id===e.id||!o.water)continue;
   // The far shore must face back across the channel.
   const ox=o.B[0]-o.A[0],oy=o.B[1]-o.A[1],ol=Math.hypot(ox,oy);if(!ol||Math.abs((n[0]*-oy+n[1]*ox)/ol)<.3)continue;
   const pair=[e.id,o.id].sort().join('\u0000'),side=e.id===pair.split('\u0000')[0]?0:1;
   const c=[p[0]+n[0]*hit.t/2,p[1]+n[1]*hit.t/2];if(land?.(lonlat(c)))continue;
   if(!runs.has(pair))runs.set(pair,[[],[]]);runs.get(pair)[side].push({ring:e.ring,c,w:hit.t});}
 });
 const features_=[];
 for(const [pair,[first,second]] of runs){
  // Both banks cast rays (meanders, islands and ragged banks leave gaps on either side); the
  // second bank's midpoints only fill stretches the first bank's leave empty.
  const cover=new Map(),r=4*step,at=c=>[Math.floor(c[0]/r),Math.floor(c[1]/r)];
  for(const q of first){const k=at(q.c).join();if(!cover.has(k))cover.set(k,[]);cover.get(k).push(q);}
  const covered=q=>{const [x,y]=at(q.c);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const o of cover.get((x+i)+','+(y+j))||[])if(Math.hypot(o.c[0]-q.c[0],o.c[1]-q.c[1])<=Math.max(2*step,(o.w+q.w)/4))return true;return false;};
  // Chain consecutive samples along the same ring; a gap longer than a few samples splits the line.
  const lines=[];
  for(const points of [first,second.filter(q=>!covered(q))]){let line=null,last=null;
   for(const q of points){if(line&&last.ring===q.ring&&Math.hypot(q.c[0]-last.c[0],q.c[1]-last.c[1])<=Math.max(4*step,(q.w+last.w)/2))line.push(q.c);else lines.push(line=[q.c]);last=q;}}
  const kept=lines.map(l=>l.length>2?l.map((p,i)=>i===0||i===l.length-1?p:[(l[i-1][0]+p[0]+l[i+1][0])/3,(l[i-1][1]+p[1]+l[i+1][1])/3]):l)
   .filter(l=>l.length>1&&l.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-l[i][0],p[1]-l[i][1]),0)>=minLength).map(l=>l.map(p=>lonlat(p).map(v=>Math.round(v*1e6)/1e6)));
  if(kept.length)features_.push({type:'Feature',properties:{owners:pair.split('\u0000')},geometry:{type:'MultiLineString',coordinates:kept}});
 }
 return {type:'FeatureCollection',features:features_};
}
export const channelLength=collection=>collection.features.reduce((s,f)=>s+f.geometry.coordinates.reduce((t,l)=>t+l.slice(1).reduce((u,p,i)=>u+metres(l[i],p),0),0),0);

// Line features with every segment already drawn removed: by an existing line set (within 2 m)
// or by an earlier feature or path (within 0.5 m), the single-stroke rule of adaptive-lines.mjs.
export function withoutRetraced(features,existing=[]){
 const paths=[],owner=[];features.forEach((f,i)=>{const g=f.geometry;for(const p of g.type==='LineString'?[g.coordinates]:g.coordinates){paths.push(p);owner.push(i);}});
 if(!paths.length)return features;
 const ranges=hiddenSegments({type:'MultiLineString',coordinates:paths},existing.length?{borders:borderIndex({type:'FeatureCollection',features:existing})}:{});
 const drop=paths.map(()=>new Set());for(const [p,start,count] of ranges)for(let k=0;k<count;k++)drop[p].add(start+k);
 const kept=features.map(()=>[]);
 paths.forEach((path,p)=>{let run=null;for(let i=0;i+1<path.length;i++){if(drop[p].has(i)){run=null;continue;}if(run)run.push(path[i+1]);else kept[owner[p]].push(run=[path[i],path[i+1]]);}});
 return features.map((f,i)=>({...f,geometry:{type:'MultiLineString',coordinates:kept[i]}})).filter(f=>f.geometry.coordinates.length);
}
