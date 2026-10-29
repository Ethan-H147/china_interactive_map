// MapLibre 6.11.2 keeps a vertex range for every feature. Selection outlines
// otherwise submit the entire source, including all its transparent features.
// Reuse the native buffers and VAOs, narrowing only the triangle draw ranges.
const managers=new WeakMap();
const ranges=new WeakMap();
export function prepareSelectedBucket(bucket){
 if(ranges.has(bucket))return;
 const positions=bucket.programConfigurations?._featureMap,indices=bucket.indexArray?.uint16,segments=bucket.segments?.get?.();
 if(!positions?.indexed||!indices?.length||!segments||indices.length<bucket.indexArray.length*3)return;
 const spans=new Map();
 for(let i=0;i<positions.ids.length;i++){
  const start=positions.positions[i*3+1],end=positions.positions[i*3+2],draws=[];
  for(const segment of segments){
   if(end<=segment.vertexOffset||start>=segment.vertexOffset+segment.vertexLength)continue;
   const limit=segment.primitiveOffset+segment.primitiveLength;
   const lowerBound=value=>{let lo=segment.primitiveOffset,hi=limit;while(lo<hi){const mid=(lo+hi)>>>1;if(indices[mid*3]+segment.vertexOffset<value)lo=mid+1;else hi=mid;}return lo;};
   const first=lowerBound(start),last=lowerBound(end);
   if(last>first)draws.push({...segment,primitiveOffset:first,primitiveLength:last-first});
  }
  spans.set(start+"/"+end,draws);
 }
 ranges.set(bucket,spans);
}
export function prepareSelectionDraws(style,sources){
 for(const source of sources)for(const tile of style.tileManagers[source]?._inViewTiles.getAllTiles()||[])for(const bucket of new Set(Object.values(tile.buckets||{})))prepareSelectedBucket(bucket);
}
export function selectedSegments(bucket,ids){
 const spans=ranges.get(bucket),positions=bucket.programConfigurations?._featureMap;
 if(!spans||!positions)return null;
 const draws=ids.flatMap(id=>positions.getPositions(id)).sort((a,b)=>a.start-b.start).flatMap(span=>spans.get(span.start+"/"+span.end)||[]);
 return {get:()=>draws};
}
export function selectedOutlineSource(manager,layer,ids){
 if(!manager?.getTile)return manager;
 const key=JSON.stringify([layer.id,...ids]);let entry=managers.get(manager);
 if(entry?.key===key)return entry.source;
 const tiles=new WeakMap(),source=Object.create(manager);
 source.getTile=coord=>{
  const tile=manager.getTile(coord);if(!tile?.getBucket)return tile;
  let view=tiles.get(tile);const bucket=tile.getBucket(layer);
  if(view&&view.bucket===bucket)return view.tile;
  const segments=bucket&&selectedSegments(bucket,ids);
  if(!segments)return tile;
  const narrowed=Object.create(bucket);narrowed.segments=segments;
  const proxy=Object.create(tile);proxy.getBucket=queried=>queried.id===layer.id?narrowed:tile.getBucket(queried);
  tiles.set(tile,{bucket,tile:proxy});return proxy;
 };
 managers.set(manager,{key,source});return source;
}
