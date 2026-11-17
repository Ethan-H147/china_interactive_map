// Historical ownership references the atlas's existing paths. Resolve those
// paths once; the ordinary regional sources render the resulting partition.
export function geometryPaths(data,member='regions'){
 const collection=member?data[member]:data;
 return collection.features.flatMap(f=>f.geometry?.type==='Polygon'?f.geometry.coordinates:
  f.geometry?.type==='MultiPolygon'?f.geometry.coordinates.flat():
  f.geometry?.type==='LineString'?[f.geometry.coordinates]:
  f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[]);
}
export async function resolveSharedHistory(data,load){
 const shared=data.sharedGeometry;if(!shared)return data;
 const needed=new Set(shared.arcs.flatMap(a=>a.runs.flatMap(r=>r.ref?[r.ref[0]]:[])));
 const paths=new Map(await Promise.all([...needed].map(async i=>{
  const source=shared.sources[i];return [i,geometryPaths(await load(source.file),source.member)];
 })));
 const arcs=shared.arcs.map(({runs})=>{
  const coordinates=[];
  for(const run of runs){
   if(run.ref){const [source,path,start,length,step=1,shift=0]=run.ref,points=paths.get(source)[path];
    if(!points)throw Error('Missing shared historical path '+source+':'+path);
    for(let j=0;j<length;j++){const p=points[start+j*step];if(!p)throw Error('Invalid shared historical vertex');coordinates.push(shift?[p[0]+shift,p[1]]:p);}
   }else for(const point of run.geometry.coordinates)coordinates.push(point);
  }
  return coordinates;
 });
 const ring=ids=>{
  const coordinates=[];
  for(const id of ids){const path=arcs[id<0?~id:id],start=coordinates.length?1:0;for(let i=start;i<path.length;i++)coordinates.push(path[id<0?path.length-1-i:i]);}
  return coordinates;
 };
 data.faces={type:'FeatureCollection',features:shared.faces.map(({type,arcs},id)=>({type:'Feature',properties:{id},geometry:{type,coordinates:type==='Polygon'?arcs.map(ring):arcs.map(p=>p.map(ring))}}))};
 data.arcs={type:'FeatureCollection',features:shared.arcs.map(({l,r},id)=>({type:'Feature',properties:{id,l,r},geometry:{type:'LineString',coordinates:arcs[id]}}))};
 return data;
}
