import {metres,lineIndex,polygons} from './geo-index.mjs';
export const pointKey=p=>p.map(v=>v.toFixed(6)).join(',');
export const segmentKey=(a,b)=>[pointKey(a),pointKey(b)].sort().join('|');

// Stitch a reference's topological pieces before selecting an outline arc. Selecting
// individual segments by distance/probing loses long river meanders and creates gaps.
export function joinReferencePaths(lines){
 const remaining=lines.map(p=>p.slice()),joined=[];
 while(remaining.length){
  const path=remaining.pop();let changed=true;
  while(changed){changed=false;for(let i=0;i<remaining.length;i++){
   const next=remaining[i],same=(a,b)=>pointKey(a)===pointKey(b);
   if(same(path.at(-1),next[0]))path.push(...next.slice(1));
   else if(same(path.at(-1),next.at(-1)))path.push(...next.slice(0,-1).reverse());
   else if(same(path[0],next.at(-1)))path.unshift(...next.slice(0,-1));
   else if(same(path[0],next[0]))path.unshift(...next.slice(1).reverse());
   else continue;
   remaining.splice(i,1);changed=true;break;
  }}
  joined.push(path);
 }
 return joined;
}
export function selectFrontierArc(outline,reference,{maximumScoreMetres=15000}={}){
 let best;
 for(const feature of outline.features)for(const polygon of polygons(feature.geometry)){
  const ring=polygon[0].slice(0,-1);if(ring.length<3)continue;
  let first=0,last=0;
  for(let i=1;i<ring.length;i++){
   if(metres(ring[i],reference[0])<metres(ring[first],reference[0]))first=i;
   if(metres(ring[i],reference.at(-1))<metres(ring[last],reference.at(-1)))last=i;
  }
  const error=metres(ring[first],reference[0])+metres(ring[last],reference.at(-1));
  if(!best||error<best.error)best={ring,first,last,error};
 }
 if(!best||best.error>20000)throw Error('Reference endpoints do not meet the country outline');
 const {ring,first,last}=best;
 const walk=direction=>{const result=[];for(let i=first;;i=(i+direction+ring.length)%ring.length){result.push(ring[i]);if(i===last)break;}return result;};
 const distance=lineIndex([reference]);
 const score=path=>{const sampled=path.filter((_,i)=>i%Math.max(1,Math.floor(path.length/200))===0);return sampled.reduce((s,p)=>s+Math.min(100000,distance(p)),0)/sampled.length;};
 const a=walk(1),b=walk(-1),path=score(a)<score(b)?a:b;
 if(score(path)>maximumScoreMetres)throw Error('Selected outline arc leaves the reference frontier: '+JSON.stringify({score:score(path),error:best.error,ends:[path[0],path.at(-1)],vertices:path.length}));
 return {path,error:best.error,reference};
}
export function removeArcSegments(collection,keys,skip=()=>false){
 return {...collection,features:collection.features.flatMap(feature=>{
  if(skip(feature))return [feature];
  const paths=feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates,kept=[];
  for(const path of paths){let run;for(let i=1;i<path.length;i++){
   if(keys.has(segmentKey(path[i-1],path[i]))){run=null;continue;}
   if(!run)kept.push(run=[path[i-1]]);run.push(path[i]);
  }}
  return kept.length?[{...feature,geometry:{type:'MultiLineString',coordinates:kept}}]:[];
 })};
}
