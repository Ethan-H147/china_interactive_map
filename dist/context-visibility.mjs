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
export function paddedView(bounds){
 const [west,south,east,north]=bounds;
 // MapLibre's globe bounds approximate the curved screen edges. A generous
 // guard band also prepares neighboring sources before a fast pan reaches them.
 const x=Math.max(5,(east-west)*.15),y=Math.max(5,(north-south)*.15);
 return [west-x,Math.max(-90,south-y),east+x,Math.min(90,north+y)];
}
export function sourceFile(map,id){
 const data=map.getSource?.(id)?.serialize?.().data;
 if(typeof data==='string'&&data.startsWith('atlas-data://'))return new URLSearchParams(data.slice(data.indexOf('?')+1)).get('file');
 return id==='flight-context'?'flight-context.bin':null;
}
export function outsideView(file,view){return !!(coverage[file]?.boxes.length&&!coverage[file].boxes.some(box=>overlaps(box,view)));}
