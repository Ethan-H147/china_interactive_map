// Compact geometry container shared by the page, its workers and the build scripts.
// Every path coordinate is rounded to a step of 1/scale degrees: 1e-7 by default (at most
// 5.6 mm; one screen pixel at the closest zoom is about 2 m), each distinct point is stored once, and every ring
// and line refers to its points by index. Point coordinates (bare [x, y]) and all other
// values are kept exactly.
//
// Layout before gzip: "BAQ1", u32 structure bytes, u32 point count, u32 scale, structure JSON
// (path coordinates replaced by {"$":[first,delta,count,...]} index runs), then the
// points in first-use order: the x column then the y column, each as zigzag differences
// between consecutive int32 values (wrapping, so a jump across 180° stays exact), split
// into four byte planes for compression.
import {compactFiles} from './compact-files.mjs';

export const SCALE=1e7;
const magic=[66,65,81,49];
const isPath=value=>Array.isArray(value)&&value.length>0&&Array.isArray(value[0])&&typeof value[0][0]==='number';

export const isGeoPack=bytes=>magic.every((b,i)=>bytes[i]===b);

// One shared point table; encode() may be called on several values before finish().
export function geoEncoder({scale=SCALE}={}){
 const index=new Map(),points=[];
 function encodePath(path){
  const ids=path.map(([x,y])=>{const qx=Math.round(x*scale),qy=Math.round(y*scale),key=qx+','+qy;let id=index.get(key);if(id===undefined){id=points.length/2;index.set(key,id);points.push(qx,qy);}return id;});
  const runs=[ids[0]];
  for(let i=1;i<ids.length;){const step=ids[i]-ids[i-1];let count=1;while(i+count<ids.length&&ids[i+count]-ids[i+count-1]===step)count++;runs.push(step,count);i+=count;}
  return {$:runs};
 }
 const coordinates=value=>isPath(value)?encodePath(value):typeof value[0]==='number'?value:value.map(coordinates);
 function encode(value){
  if(Array.isArray(value))return value.map(encode);
  if(!value||typeof value!=='object')return value;
  if(value.type&&'coordinates' in value)return {...value,coordinates:coordinates(value.coordinates)};
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='properties'?item:encode(item)]));
 }
 function finish(structure){
  const text=new TextEncoder().encode(JSON.stringify(structure)),count=points.length/2,planes=new Uint8Array(count*8);
  for(let axis=0;axis<2;axis++){
   let previous=0;
   for(let i=0;i<count;i++){
    const value=points[2*i+axis],delta=(value-previous)|0,z=((delta<<1)^(delta>>31))>>>0,at=axis*count*4+i;previous=value;
    planes[at]=z&255;planes[at+count]=z>>>8&255;planes[at+2*count]=z>>>16&255;planes[at+3*count]=z>>>24;
   }
  }
  const out=new Uint8Array(16+text.length+planes.length),view=new DataView(out.buffer);
  out.set(magic,0);view.setUint32(4,text.length,true);view.setUint32(8,count,true);view.setUint32(12,scale,true);out.set(text,16);out.set(planes,16+text.length);
  return out;
 }
 return {encode,finish};
}

export function encodeGeo(value,meta={},options){const encoder=geoEncoder(options),encoded=encoder.encode(value);return encoder.finish({meta,value:encoded});}

// Decodes the whole structure; encodeGeo's files hold {meta, value}.
export function decodeGeoStructure(bytes){
 bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(!isGeoPack(bytes))throw Error('Not a compact geometry file');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const textLength=view.getUint32(4,true),count=view.getUint32(8,true),scale=view.getUint32(12,true);
 const structure=JSON.parse(new TextDecoder().decode(bytes.subarray(16,16+textLength)));
 const planes=bytes.subarray(16+textLength),points=new Float64Array(count*2);
 if(planes.length!==count*8)throw Error('Compact geometry file is truncated');
 for(let axis=0;axis<2;axis++){
  let value=0;
  for(let i=0;i<count;i++){
   const at=axis*count*4+i,z=(planes[at]|planes[at+count]<<8|planes[at+2*count]<<16|planes[at+3*count]<<24)>>>0;
   value=(value+((z>>>1)^-(z&1)))|0;points[2*i+axis]=value/scale;
  }
 }
 function decodePath(runs){
  let id=runs[0];const path=[[points[2*id],points[2*id+1]]];
  for(let k=1;k<runs.length;k+=2)for(let n=0;n<runs[k+1];n++){id+=runs[k];path.push([points[2*id],points[2*id+1]]);}
  return path;
 }
 const coordinates=value=>value&&value.$?decodePath(value.$):typeof value[0]==='number'?value:value.map(coordinates);
 function decode(value){
  if(Array.isArray(value))return value.map(decode);
  if(!value||typeof value!=='object')return value;
  if(value.type&&'coordinates' in value)return {...value,coordinates:coordinates(value.coordinates)};
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='properties'?item:decode(item)]));
 }
 return decode(structure);
}
export const decodeGeo=bytes=>decodeGeoStructure(bytes).value;

// Published compact copies sit under data/compact/ beside their gzip JSON build files
// (scripts/build-compact.mjs). Requests for a listed file go to its compact copy.
const compact=new Set(compactFiles);
export function compactUrl(url){
 const text=String(url),match=/(^|\/)data\//.exec(text);if(!match)return url;
 const at=match.index+match[1].length;
 if(!compact.has(text.slice(at+5).split(/[?#]/)[0]))return url;
 const replaced=text.slice(0,at)+'data/compact/'+text.slice(at+5);
 return url instanceof URL?new URL(replaced):replaced;
}
// A data file's bytes, downloaded again (twice at most) when the network drops the request or
// its body (a CDN mid-deploy does). HTTP errors and cancellations are not retried.
export async function fetchBytes(url,init){
 for(let attempt=0;;attempt++){
  let response;
  try{response=await fetch(url,init);if(response.ok)return await response.arrayBuffer();}
  catch(error){if(error?.name!=='TypeError'||init?.signal?.aborted||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));continue;}
  throw Error(`${url}: ${response.status}`);
 }
}
// Body bytes of a fetched data file: gunzipped, then a compact copy decoded or JSON parsed.
export async function decodeData(bytes){
 let view=new Uint8Array(bytes);
 if(view[0]===31&&view[1]===139)view=new Uint8Array(await new Response(new Blob([view]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 return isGeoPack(view)?decodeGeo(view):JSON.parse(new TextDecoder().decode(view));
}
// A GeoJSON source whose data file the page fetches (so its preload applies) and MapLibre's
// workers decode (maplibre-worker-protocols.mjs, atlas-data://), so the page never copies the
// geometry to them. transform: 'parts' (polygon-parts.mjs) or 'coastal' (coastal-detail.mjs).
// The blob URL stays valid: MapLibre fetches a source's data again whenever it reloads it.
export async function addWorkerSource(map,id,url,options,transform){
 const blob=URL.createObjectURL(new Blob([await fetchBytes(compactUrl(url))]));
 map.addSource(id,{...options,data:'atlas-data://'+id+'?url='+encodeURIComponent(blob)+(transform?'&transform='+transform:'')});
}
