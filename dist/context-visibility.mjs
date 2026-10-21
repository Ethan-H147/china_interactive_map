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
