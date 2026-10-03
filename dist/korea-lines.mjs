// MapLibre allocates up to ten vertices per line point in a 16-bit buffer.
// Keep paths below that limit without removing any geographic segments.
export const MAX_LINE_POINTS=4096;
export function splitLinePaths(paths,properties={}){
 const features=[];
 for(const path of paths)for(let start=0;start<path.length-1;start+=MAX_LINE_POINTS-1){
  features.push({type:'Feature',properties,geometry:{type:'LineString',coordinates:path.slice(start,start+MAX_LINE_POINTS)}});
 }
 return {type:'FeatureCollection',features};
}
export function polygonLines(collection){
 return {type:'FeatureCollection',features:collection.features.flatMap(f=>{
  const paths=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();
  return splitLinePaths(paths,f.properties).features;
 })};
}
