import {coverage} from './context-coverage.mjs';

// Source extents are generated from the displayed geometry, including islands and
// overseas territories. Unknown sources remain visible. Wrap both the view and
// the data so an antimeridian crossing never becomes an empty intersection.
export function overlaps(box,view){
 if(box[3]<view[1]||box[1]>view[3])return false;
 if(box[2]-box[0]>=360||view[2]-view[0]>=360)return true;
 const shift=360*Math.round(((view[0]+view[2])-(box[0]+box[2]))/720);
 return box[0]+shift<=view[2]&&box[2]+shift>=view[0];
}
export function containsScope(scope,view){
 const shift=360*Math.round((scope[0]+scope[2]-view[0]-view[2])/720);
 return scope[0]<=view[0]+shift&&view[2]+shift<=scope[2]&&scope[1]<=view[1]&&view[3]<=scope[3];
}
// A contained view may still be much smaller after zooming. Do not retain a
// continent-sized index behind a city close-up. Minimum padding stays reusable.
export function reusableHistoricalScope(scope,view){
 return containsScope(scope,view)&&scope[2]-scope[0]<=Math.max(view[2]-view[0],.06)*3&&scope[3]-scope[1]<=Math.max(view[3]-view[1],.06)*3;
}
export function paddedView(bounds,{minimum=5}={}){
 const [west,south,east,north]=bounds;
 // MapLibre's globe bounds approximate the curved screen edges. A generous
 // guard band also prepares neighboring sources before a fast pan reaches them.
 const x=Math.max(minimum,(east-west)*.15),y=Math.max(minimum,(north-south)*.15);
 return [west-x,Math.max(-90,south-y),east+x,Math.min(90,north+y)];
}
export function sourceFile(map,id){
 const data=map.getSource?.(id)?.serialize?.().data;
 if(typeof data==='string'&&data.startsWith('atlas-data://'))return new URLSearchParams(data.slice(data.indexOf('?')+1)).get('file');
 return id==='flight-context'?'flight-context.bin':null;
}
export function outsideView(file,view){
 const entry=coverage[file];
 // A verified empty file has no visible or selectable geography at any view.
 // Unknown files stay available until their conservative bounds are generated.
 return !!entry&&!entry.boxes.some(box=>overlaps(box,view));
}

// Maximum surface-facing dot product anywhere in a lon/lat rectangle. Taking
// the analytic maximum keeps thin coastlines and islands safe at the horizon.
export function maximumFacing(box,center){
 const radians=Math.PI/180,longitude=center.lng??center[0],latitude=(center.lat??center[1])*radians;
 let cosine=1;
 if(box[2]-box[0]<360){
  const shift=360*Math.round(((box[0]+box[2])/2-longitude)/360),nearest=Math.max(box[0],Math.min(box[2],longitude+shift));
  cosine=Math.cos((nearest-longitude)*radians);
 }
 const a=Math.sin(latitude),b=Math.cos(latitude)*cosine,south=box[1]*radians,north=box[3]*radians;
 const facing=lat=>a*Math.sin(lat)+b*Math.cos(lat);
 let result=Math.max(facing(south),facing(north));
 const peak=Math.atan2(a,b);if(peak>=south&&peak<=north)result=Math.max(result,facing(peak));
 return result;
}
export function behindGlobe(file,center,minimumFacing=0){
 // Keep a guard band behind the limb so a rotating globe warms its next layers.
 return !!(coverage[file]?.boxes.length&&coverage[file].boxes.every(box=>maximumFacing(box,center)<minimumFacing-.08));
}

// Partition two buffered views into non-overlapping rectangles. Shared fill
// pixels are emitted once, including translucent selection fills.
export function disjointScopes(scopes){
 const result=[];
 for(const raw of scopes){
  const shift=result.length?360*Math.round((result[0][0]+result[0][2]-raw[0]-raw[2])/720):0;
  let pieces=[[raw[0]+shift,raw[1],raw[2]+shift,raw[3]]];
  for(const covered of result)pieces=pieces.flatMap(box=>{
   const w=Math.max(box[0],covered[0]),s=Math.max(box[1],covered[1]),e=Math.min(box[2],covered[2]),n=Math.min(box[3],covered[3]);
   if(w>=e||s>=n)return [box];
   return [[box[0],box[1],w,box[3]],[e,box[1],box[2],box[3]],[w,box[1],e,s],[w,n,e,box[3]]].filter(b=>b[0]<b[2]&&b[1]<b[3]);
  });
  result.push(...pieces);
 }
 return result;
}

export function changedScopes(before,after){
 const difference=(areas,covered)=>disjointScopes([...covered,...areas]).slice(disjointScopes(covered).length);
 return [...difference(before,after),...difference(after,before)];
}

const historicalBox=(unit,view)=>{
 const raw=unit.bounds?.flat();if(raw?.length!==4||!raw.every(Number.isFinite))return null;
 const shift=360*Math.round((view[0]+view[2]-raw[0]-raw[2])/720);
 return [raw[0]+shift,raw[1],raw[2]+shift,raw[3]];
};
// Overview colors need coverage of territories, not repeated copies of empty
// ocean. Keep a whole nearby territory ready as modern country sources do.
export function historicalOverviewCovered(scopes,view,units){
 if(!scopes.length)return false;
 const covered=disjointScopes(scopes);
 for(const unit of units){
  const box=historicalBox(unit,view);if(!box)return scopes.some(scope=>containsScope(scope,view));
  const hit=[Math.max(view[0],box[0]),Math.max(view[1],box[1]),Math.min(view[2],box[2]),Math.min(view[3],box[3])];
  if(hit[0]>=hit[2]||hit[1]>=hit[3])continue;
  if(disjointScopes([...covered,hit]).length>covered.length)return false;
 }
 return true;
}
export function historicalOverviewScope(view,units,lookahead=view){
 const scope=paddedView(view,{minimum:.03});if(view[2]-view[0]>=180)return scope;
 const candidates=units.map(unit=>historicalBox(unit,view)).filter(box=>box&&(overlaps(box,view)||overlaps(box,lookahead))&&box[2]-box[0]<=120&&box[3]-box[1]<=65);
 candidates.sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]));
 const box=candidates[0];if(!box)return scope;
 const expanded=[Math.min(scope[0],box[0]-.03),Math.min(scope[1],box[1]-.03),Math.max(scope[2],box[2]+.03),Math.max(scope[3],box[3]+.03)];
 return expanded[2]-expanded[0]<=180?expanded:scope;
}
