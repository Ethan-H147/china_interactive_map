// Keep fill-only water cuts out of selected jurisdiction outlines. Segment keys
// use the compact transport's coordinate precision, so both formats agree.
export const outlineSegmentKey=(a,b)=>{const key=p=>p.map(v=>Math.round(v*1e7)).join(',');const x=key(a),y=key(b);return x<y?x+'|'+y:y+'|'+x;};
const paths=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='LineString'?[g.coordinates]:g.coordinates;
export function applyOutlineEdits(regions,edits){
 if(!edits)return regions;
 const removed=new Set(edits.remove),ids=new Set(edits.ids),features=[];
 for(const f of regions.features){
  if(!ids.has(f.properties.id)){features.push(f);continue;}
  for(const path of paths(f.geometry)){
   let run=[];const flush=()=>{if(run.length>1)features.push({...f,geometry:{type:'LineString',coordinates:run}});run=[];};
   for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(removed.has(outlineSegmentKey(a,b))){flush();continue;}if(!run.length)run.push(a);run.push(b);}flush();
  }
 }
 return {...regions,features:[...features,...edits.add.features]};
}
