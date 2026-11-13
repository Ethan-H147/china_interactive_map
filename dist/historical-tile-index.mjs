// MapLibre 6.11 / geojson-vt retain every generated ancestor tile, independently
// of the main renderer's LRU. Historical exact fills make those copies large.
// Keep a shallow native index and a small requested-tile LRU. Deeper tiles
// can be regenerated from the native leaves instead of accumulating indefinitely.
export function boundHistoricalTileIndex(index,{maxTiles=24,maxPoints=300000}={}){
 const tree=index?.tileIndex;if(!tree?.tiles?.[0])return index;
 // Keep the native shallow index (at most z3) and its leaf source paths.
 // Rebuilding every deep tile from the world root defeats native indexing.
 const base=new Map(Object.entries(tree.tiles).map(([id,tile])=>[+id,{tile,source:tile.source}]));
 const baseCoords=tree.tileCoords.slice(),native=index.getTile,cache=new Map();let cachedPoints=0,resets=0;
 const basePoints=[...base.values()].reduce((n,e)=>n+(e.tile.numPoints||0),0);
 const reset=()=>{
  tree.tiles={};tree.tileCoords=baseCoords.slice();
  for(const [id,entry]of base){entry.tile.source=entry.source;tree.tiles[id]=entry.tile;}
  for(const [id,entry]of cache){entry.tile.source=entry.source;tree.tiles[id]=entry.tile;tree.tileCoords.push({z:entry.tile.z,x:entry.tile.x,y:entry.tile.y,id});}
  resets++;
 };
 index.getTile=function(z,x,y){
  const result=native.call(this,z,x,y);
  if(result&&+z>0){
   const scale=1<<+z,wrapped=(+x+scale)&(scale-1),id=((scale*(+y)+wrapped)*32)+(+z),points=result.numPoints||0;
   const previous=cache.get(id);if(previous){cachedPoints-=previous.points;cache.delete(id);}
   if(!base.has(id)&&points<=maxPoints){cache.set(id,{tile:result,source:result.source,points});cachedPoints+=points;}
   while(cache.size>maxTiles||cachedPoints>maxPoints){const first=cache.keys().next().value;cachedPoints-=cache.get(first).points;cache.delete(first);}
  }
  reset();return result;
 };
 index._atlasHistoricalTileBudget=()=>({tiles:cache.size,points:cachedPoints,maxTiles,maxPoints,baseTiles:base.size,basePoints,resets});
 return index;
}

export function installHistoricalTileIndexBudget(worker){
 if(!worker||typeof worker._getWorkerSource!=='function'||worker._atlasHistoricalIndexGuard)return;
 const guarded=new WeakSet();
 const wrap=(instance,type,name)=>{
  if(type!=='geojson'||!name.startsWith('united-kingdom-history')||guarded.has(instance)||typeof instance._createGeoJSONIndex!=='function')return instance;
  guarded.add(instance);const create=instance._createGeoJSONIndex;
  instance._createGeoJSONIndex=function(data,params){
   return boundHistoricalTileIndex(create.call(this,data,{...params,geojsonVtOptions:{...params.geojsonVtOptions,indexMaxZoom:3}}));
  };
  return instance;
 };
 for(const types of Object.values(worker.workerSources||{}))for(const [type,sources]of Object.entries(types))for(const [name,instance]of Object.entries(sources))wrap(instance,type,name);
 const get=worker._getWorkerSource;
 worker._getWorkerSource=function(map,type,name){return wrap(get.call(this,map,type,name),type,name);};
 worker._atlasHistoricalIndexGuard=true;
}
