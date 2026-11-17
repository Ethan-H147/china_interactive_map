import './countries.js';
// Immutable historical MVT stored in small static chunks. No GeoJSON parsing,
// clipping, index construction or renderer-private cache hooks run on this path.
export function historicalTileKey(z,x,y){return (4**z-1)/3+y*2**z+x;}
export function readHistoricalTileIndex(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<16||String.fromCharCode(...bytes.subarray(0,4))!=='BAT1')throw Error('Invalid historical tile index');
 const count=view.getUint32(4,true),maxzoom=view.getUint32(8,true),extent=view.getUint32(12,true);
 if(bytes.length!==16+count*16||maxzoom>14||extent!==8192)throw Error('Invalid historical tile index size');
 const find=key=>{let lo=0,hi=count-1;while(lo<=hi){const mid=(lo+hi)>>>1,at=16+mid*16,id=view.getUint32(at,true);if(id<key)lo=mid+1;else if(id>key)hi=mid-1;else{const value=view.getUint32(at+12,true);return {chunk:view.getUint32(at+4,true),offset:view.getUint32(at+8,true),length:value&0x7fffffff,terminal:!!(value>>>31)};}}return null;};
 return {count,maxzoom,extent,lookup(z,x,y){
  if(!Number.isInteger(z)||z<0||z>24||!Number.isInteger(x)||!Number.isInteger(y))throw Error('Invalid historical tile coordinate');
  if(y<0||y>=2**z)return {length:0,terminal:true};
  x=((x%2**z)+2**z)%2**z;
  if(z>maxzoom){const shift=2**(z-maxzoom);x=Math.floor(x/shift);y=Math.floor(y/shift);z=maxzoom;}
  const exact=find(historicalTileKey(z,x,y));if(exact)return exact;
  for(let level=z-1;level>=0;level--){const shift=2**(z-level),parent=find(historicalTileKey(level,Math.floor(x/shift),Math.floor(y/shift)));if(parent?.terminal)return parent;}
  throw Error('Missing historical tile '+z+'/'+x+'/'+y);
 }};
}
async function inflate(bytes){
 if(bytes[0]!==31||bytes[1]!==139)return bytes;
 return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}
async function verify(bytes,expected){
 const digest=await crypto.subtle.digest('SHA-256',bytes),actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 if(actual!==expected)throw Error('Historical tile content does not match its build');
}
export function createHistoricalTileStore({fetcher=fetch,maxChunks=16,maxBytes=2*1024*1024,retentionMs=60000}={}){
 let dataset,expiry;const cache=new Map(),pending=new Map();let cachedBytes=0;
 const stats={requests:0,chunkLoads:0,hits:0,cancelled:0};
 const abort=()=>new DOMException('Historical tile request cancelled','AbortError');
 const get=async(url,signal)=>{const response=await fetcher(url,{signal});if(!response.ok)throw Error('Historical tile HTTP '+response.status);return new Uint8Array(await response.arrayBuffer());};
 function touch(){clearTimeout(expiry);expiry=setTimeout(()=>{if(!pending.size){cache.clear();cachedBytes=0;dataset=null;}else touch();},retentionMs);expiry.unref?.();}
 function metadata(url){
  if(dataset?.url!==url){cache.clear();cachedBytes=0;dataset={url,promise:(async()=>{const scene=JSON.parse(new TextDecoder().decode(await inflate(await get(url))));if(scene.version!==1||scene.tiles.version!==1)throw Error('Unsupported historical scene');const version=new URL(url).searchParams.get('v');if(version&&version!==scene.tiles.contentSha256)throw Error('Historical scene version changed');const indexURL=new URL(scene.tiles.index,url);indexURL.searchParams.set('v',scene.tiles.indexSha256);const bytes=await get(indexURL.href);await verify(bytes,scene.tiles.indexSha256);return {scene,index:readHistoricalTileIndex(await inflate(bytes))};})()};
   const entry=dataset;entry.promise.catch(()=>{if(dataset===entry)dataset=null;});}
  return dataset.promise;
 }
 function chunk(url,expected,signal){
  signal?.throwIfAborted();
  const key=url+'#'+expected;
  const cached=cache.get(key);if(cached){stats.hits++;cache.delete(key);cache.set(key,cached);return Promise.resolve(cached);}
  let entry=pending.get(key);
  if(!entry){
   const controller=new AbortController();entry={controller,users:0,done:false};stats.chunkLoads++;
   const current=entry;
   entry.promise=(async()=>{const requestURL=new URL(url);requestURL.searchParams.set('v',expected);const bytes=await get(requestURL.href,controller.signal);await verify(bytes,expected);if(bytes.length<=maxBytes){cache.set(key,bytes);cachedBytes+=bytes.length;while(cache.size>maxChunks||cachedBytes>maxBytes){const first=cache.keys().next().value;cachedBytes-=cache.get(first).length;cache.delete(first);}}return bytes;})().finally(()=>{current.done=true;if(pending.get(key)===current)pending.delete(key);});
   pending.set(key,entry);
  }
  entry.users++;
  return new Promise((resolve,reject)=>{
   let finished=false;
   const end=(error,bytes)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',cancel);entry.users--;if(!entry.users&&!entry.done){entry.controller.abort();if(pending.get(key)===entry)pending.delete(key);}error?reject(error):resolve(bytes);};
   const cancel=()=>{stats.cancelled++;end(abort());};signal?.addEventListener('abort',cancel,{once:true});
   entry.promise.then(bytes=>end(null,bytes),error=>end(error));if(signal?.aborted)cancel();
  });
 }
 return {async tile(url,signal){
  stats.requests++;touch();signal?.throwIfAborted();
  const request=new URL(url),coordinates=request.pathname.split('/').filter(Boolean).map(Number),sceneURL=request.searchParams.get('scene');
  if(!globalThis.AtlasCountries.historicalTileHosts.includes(request.hostname)||coordinates.length!==3||!sceneURL)throw Error('Invalid historical tile URL');
  const {scene,index}=await metadata(sceneURL);signal?.throwIfAborted();const entry=index.lookup(...coordinates);
  if(!entry.length)return new ArrayBuffer(0);
  const expected=scene.tiles.chunks[entry.chunk];if(!expected)throw Error('Invalid historical tile chunk');
  const bytes=await chunk(new URL(String(entry.chunk).padStart(4,'0')+'.bin',sceneURL).href,expected,signal);
  if(entry.offset+entry.length>bytes.length)throw Error('Truncated historical tile chunk');
  const tile=await inflate(bytes.subarray(entry.offset,entry.offset+entry.length));signal?.throwIfAborted();return tile.buffer.slice(tile.byteOffset,tile.byteOffset+tile.byteLength);
 },snapshot:()=>({...stats,chunks:cache.size,bytes:cachedBytes,pending:pending.size,maxChunks,maxBytes}),dispose(){clearTimeout(expiry);for(const entry of pending.values())entry.controller.abort();pending.clear();cache.clear();cachedBytes=0;dataset=null;}};
}
const store=createHistoricalTileStore();
export const loadHistoricalVectorTile=async(request,controller)=>({data:await store.tile(request.url,controller.signal)});
