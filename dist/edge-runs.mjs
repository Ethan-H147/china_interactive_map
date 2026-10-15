// Outline lines without coastlines, from a FeatureCollection's edgeRuns (built by
// scripts/build-unit-edges.mjs). Each run is [feature, polygon, ring, first vertex, last vertex]
// of the collection's own geometry, so the edges cost a few numbers instead of coordinates.
// `channels` (scripts/build-channel-borders.mjs) adds the borders down narrow river and estuary
// channels, joined to each owner unit present. Each unit's lines keep its id and parent, which the
// adapters' filters read.
export function edgeLines(collection){
 const lines=new Map(),add=(fi,line)=>{if(!lines.has(fi))lines.set(fi,[]);lines.get(fi).push(line);};
 for(const [fi,pi,ri,start,end] of collection.edgeRuns||[]){
  const g=collection.features[fi].geometry;add(fi,(g.type==='Polygon'?g.coordinates:g.coordinates[pi])[ri].slice(start,end+1));
 }
 if(collection.channels){
  const index=new Map(collection.features.map((f,fi)=>[f.properties.id,fi]));
  for(const f of collection.channels.features)for(const owner of f.properties.owners){const fi=index.get(owner);if(fi!==undefined)for(const line of f.geometry.coordinates)add(fi,line);}
 }
 return {type:'FeatureCollection',features:[...lines].map(([fi,coordinates])=>{const {id,parent}=collection.features[fi].properties;return {type:'Feature',properties:parent===undefined?{id}:{id,parent},geometry:{type:'MultiLineString',coordinates}};})};
}
export const withoutEdges=({edgeRuns,channels,...collection})=>collection;
// Boundary lines plus a level's channel borders (Korea, Mongolia: <country>-channels.bin).
export const withChannels=(geometry,channels)=>channels?.features.length?{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry},...channels.features]}:geometry;
