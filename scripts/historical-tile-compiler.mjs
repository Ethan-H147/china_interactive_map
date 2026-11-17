// Compile the retained shared topology once. The browser receives immutable MVT,
// not the authoring country's geometry or a runtime GeoJSON index.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {alignHistoricalSimplification} from './shared-historical-simplification.mjs';

export async function compileHistoricalTiles({root,output,data,inputSha256,sources=[],extra={}}){
const {GeoJSONVT}=await import(pathToFileURL(root+'/node_modules/@maplibre/geojson-vt/dist/geojson-vt.mjs'));
const {fromGeojsonVt}=await import(pathToFileURL(root+'/node_modules/@maplibre/vt-pbf/dist/index.es.js'));
const {packShapes,shapeAtLocation}=await import(pathToFileURL(root+'/dist/historic-shapes.mjs'));
const {polygonParts}=await import(pathToFileURL(root+'/dist/polygon-parts.mjs'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const maxzoom=12,extent=8192,buffer=64,tolerance=4;
const options={maxZoom:maxzoom,indexMaxZoom:0,indexMaxPoints:0,extent,buffer,tolerance,updateable:false,promoteId:'id'};
console.log('Compiling',data.faces.features.length,'shared faces and',data.arcs.features.length,'edges; zooms 0–'+maxzoom);
const faces=new GeoJSONVT(polygonParts(data.faces),options),edges=new GeoJSONVT(data.arcs,options);
console.log('Shared arc simplification:',alignHistoricalSimplification(faces,edges),'face vertices');
fs.mkdirSync(output,{recursive:true});
const rows=[],payloads=new Map(),chunks=[],chunkHashes=[],stats=Array.from({length:maxzoom+1},()=>({tiles:0,terminal:0,bytes:0}));
let chunk=0,offset=0,totalBytes=0,visited=0;
const flush=()=>{if(!chunks.length)return;const bytes=Buffer.concat(chunks);fs.writeFileSync(path.join(output,String(chunk).padStart(4,'0')+'.bin'),bytes);chunkHashes.push(hash(bytes));totalBytes+=bytes.length;chunk++;chunks.length=0;offset=0;};
function store(bytes){
  if(!bytes.length)return [0,0,0];
  const digest=hash(bytes),previous=payloads.get(digest);if(previous)return previous;
  if(offset&&offset+bytes.length>128*1024)flush();
  const result=[chunk,offset,bytes.length];chunks.push(bytes);offset+=bytes.length;payloads.set(digest,result);return result;
}
function solid(features){
  if(features.length!==1||features[0].type!==3||features[0].geometry.length!==1)return false;
  const ring=features[0].geometry[0],lo=-buffer,hi=extent+buffer;
  return ring.length===5&&new Set(ring.map(([x,y])=>x+','+y)).size===4&&ring.every(([x,y])=>(x===lo||x===hi)&&(y===lo||y===hi));
}
const nativeId=(z,x,y)=>((2**z*y+x)*32)+z;
function visit(z,x,y){
  const f=faces.getTile(z,x,y),e=edges.getTile(z,x,y),ff=f?.features||[],ee=e?.features||[];
  // Quantization can collapse a tiny ring to one point. vt-pbf cannot encode
  // that as a valid polygon. Omit only geometry with zero drawable area;
  // untouched native source paths still decide whether descendants refine.
  for(const tile of [f,e])if(tile)tile.features=tile.features.flatMap(feature=>{
   const geometry=feature.geometry.filter(ring=>feature.type===3?ring.length>=4&&ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0)!==0:ring.length>=2);
   return geometry.length?[{...feature,geometry}]:[];
  });
  // Only an empty tile or one solid face without a boundary can be reused at
  // every descendant coordinate. Coastal and political edge tiles always refine.
  const rawFaces=faces.tileIndex.tiles[nativeId(z,x,y)]?.source||[],rawEdges=edges.tileIndex.tiles[nativeId(z,x,y)]?.source||[];
  // Display simplification may hide a tiny island or hole. Its original edges
  // still require refinement, even when this zoom emits no visible geometry.
  const terminal=(!rawFaces.length&&!rawEdges.length)||(!rawEdges.length&&solid(ff));
  const bytes=f?.features.length||e?.features.length?gzipSync(fromGeojsonVt({faces:f||{features:[]},edges:e||{features:[]}},{version:2,extent}),{level:6}):Buffer.alloc(0);
  const [file,start,length]=store(bytes);
  rows.push([(4**z-1)/3+y*2**z+x,file,start,length+(terminal?0x80000000:0)]);
  stats[z].tiles++;stats[z].bytes+=bytes.length;if(terminal)stats[z].terminal++;
  if(++visited%20000===0)console.log(visited,'tiles;',Math.round((totalBytes+offset)/1048576)+' MiB; z'+z);
  if(!terminal&&z<maxzoom)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)visit(z+1,x*2+dx,y*2+dy);
  delete faces.tileIndex.tiles[nativeId(z,x,y)];delete edges.tileIndex.tiles[nativeId(z,x,y)];
  if(faces.tileIndex.tileCoords.length>4096)faces.tileIndex.tileCoords.length=0;
  if(edges.tileIndex.tileCoords.length>4096)edges.tileIndex.tileCoords.length=0;
}
visit(0,0,0);flush();
rows.sort((a,b)=>a[0]-b[0]);
const index=Buffer.alloc(16+rows.length*16);index.write('BAT1');index.writeUInt32LE(rows.length,4);index.writeUInt32LE(maxzoom,8);index.writeUInt32LE(extent,12);
rows.forEach((row,i)=>row.forEach((n,j)=>index.writeUInt32LE(n,16+i*16+j*4)));
const compressedIndex=gzipSync(index,{level:9});fs.writeFileSync(path.join(output,'index.bin'),compressedIndex);
const shapes=packShapes(data.faces.features.filter(f=>!f.properties.water&&!f.properties.neutral)),labels={};
for(const config of data.configs)for(const unit of config.units){
 if(!unit.label)continue;const [lng,lat]=unit.label,key=lng+','+lat;
 if(Object.hasOwn(labels,key))continue;
 const face=shapeAtLocation(shapes,{lng,lat})?.properties.id;
 if(face!==undefined)labels[key]=face;
}
const nonempty=f=>f.geometry?.type==='Polygon'?f.geometry.coordinates[0]?.length>=4:f.geometry?.coordinates.some(p=>p[0]?.length>=4);
const renderFaces=[...new Set([...data.faces.features.filter(f=>!f.properties.water&&!f.properties.neutral&&nonempty(f)).map(f=>f.properties.id),...data.arcs.features.flatMap(f=>[f.properties.l,f.properties.r])].filter(id=>id>=0))].sort((a,b)=>a-b);
const metadata={version:1,source:data.source,years:data.years,configs:data.configs.map(({lines,frontiers,borders,selectionLines,...config})=>config),events:data.events,versions:data.versions,...extra,renderFaces,
  sharedLand:true,faceCount:extra.faceCount??data.faces.features.length,labels,
  edges:data.arcs.features.filter(f=>f.properties.l>=0||f.properties.r>=0).map(f=>[f.properties.id,f.properties.l,f.properties.r,!!f.properties.coast,!!f.properties.selectionOnly]),
  tiles:{version:1,maxzoom,extent,buffer,tolerance,index:'index.bin',indexSha256:hash(compressedIndex),chunks:chunkHashes,
    inputSha256:inputSha256,contentSha256:hash(JSON.stringify([inputSha256,options,chunkHashes,hash(compressedIndex)])),sources,tiles:rows.length,bytes:totalBytes,indexBytes:compressedIndex.length,levels:stats}};
metadata.tiles.manifest='manifest.bin';
fs.writeFileSync(path.join(output,'manifest.bin'),gzipSync(JSON.stringify({version:1,tiles:metadata.tiles}),{level:9}));
const metadataBytes=gzipSync(JSON.stringify(metadata),{level:9});fs.writeFileSync(path.join(output,'scene.bin'),metadataBytes);
console.log(JSON.stringify({tiles:rows.length,chunks:chunk,bytes:totalBytes,indexBytes:compressedIndex.length,metadataBytes:metadataBytes.length,levels:stats},null,2));

return metadata;
}
