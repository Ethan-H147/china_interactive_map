// NLSC repeats some shared vertices with floating-point differences. Node those
// copies together before merging counties into an outline. Do not bridge water.
export function reconcileTaiwan(features){
 const vertices=new Map();
 function canonical(c){
  if(typeof c[0]!=='number')return c.map(canonical);
  const key=c.map(n=>n.toFixed(10)).join(',');
  if(!vertices.has(key))vertices.set(key,c);
  return vertices.get(key);
 }
 return features.map(f=>({...f,geometry:{...f.geometry,coordinates:canonical(f.geometry.coordinates)}}));
}
