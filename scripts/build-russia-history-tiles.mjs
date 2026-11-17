// Compile the retained shared topology once. The browser receives immutable MVT,
// not the authoring country's geometry or a runtime GeoJSON index.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {alignHistoricalSimplification} from './shared-historical-simplification.mjs';

const root=path.resolve(process.env.ATLAS_ROOT||'.');
const output=path.resolve(process.env.RUSSIA_TILES_OUTPUT||'dist/data/russia/history/tiles');
const {GeoJSONVT}=await import(pathToFileURL(root+'/node_modules/@maplibre/geojson-vt/dist/geojson-vt.mjs'));
const {fromGeojsonVt}=await import(pathToFileURL(root+'/node_modules/@maplibre/vt-pbf/dist/index.es.js'));
const {decodeData}=await import(pathToFileURL(root+'/dist/geo-pack.mjs'));
const {resolveSharedHistory}=await import(pathToFileURL(root+'/dist/shared-history-geometry.mjs'));
const {packShapes,shapeAtLocation}=await import(pathToFileURL(root+'/dist/historic-shapes.mjs'));
const {polygonParts}=await import(pathToFileURL(root+'/dist/polygon-parts.mjs'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const input=fs.readFileSync(root+'/dist/data/russia/history/borders.bin');
const retained=await decodeData(input),dataSources=retained.sharedGeometry.sources;
const data=await resolveSharedHistory(retained,async file=>{
  const bytes=fs.readFileSync(root+'/dist/data/'+file);
  const source=dataSources.find(s=>s.file===file);
  assert.equal(hash(bytes),source.sha256,'Pinned historical geometry: '+file);
  return decodeData(bytes);
});
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
  // Only an empty tile or one solid face without a boundary can be reused at
  // every descendant coordinate. Coastal and political edge tiles always refine.
  const rawFaces=faces.tileIndex.tiles[nativeId(z,x,y)]?.source||[],rawEdges=edges.tileIndex.tiles[nativeId(z,x,y)]?.source||[];
  // Display simplification may hide a tiny island or hole. Its original edges
  // still require refinement, even when this zoom emits no visible geometry.
  const terminal=(!rawFaces.length&&!rawEdges.length)||(!rawEdges.length&&solid(ff));
  const bytes=ff.length||ee.length?gzipSync(fromGeojsonVt({faces:f||{features:[]},edges:e||{features:[]}},{version:2,extent}),{level:6}):Buffer.alloc(0);
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
const shapes=packShapes(data.faces.features),labels={};
for(const config of data.configs)for(const unit of config.units){
  const [lng,lat]=unit.label,key=lng+','+lat;
  const face=shapeAtLocation(shapes,{lng,lat})?.properties.id;
  assert(face!==undefined&&config.units[config.face[face]]?.id===unit.id,'Interior label face: '+unit.name);
  labels[key]=face;
}
const metadata={version:1,source:data.source,years:data.years,configs:data.configs,events:data.events,
  sharedLand:true,faceCount:data.faces.features.length,labels,
  edges:data.arcs.features.map(f=>[f.properties.id,f.properties.l,f.properties.r]),
  tiles:{version:1,maxzoom,extent,buffer,tolerance,index:'index.bin',indexSha256:hash(compressedIndex),chunks:chunkHashes,
    inputSha256:hash(input),contentSha256:hash(JSON.stringify([hash(input),options,chunkHashes,hash(compressedIndex)])),sources:dataSources,tiles:rows.length,bytes:totalBytes,indexBytes:compressedIndex.length,levels:stats}};
const metadataBytes=gzipSync(JSON.stringify(metadata),{level:9});fs.writeFileSync(path.join(output,'scene.bin'),metadataBytes);
console.log(JSON.stringify({tiles:rows.length,chunks:chunk,bytes:totalBytes,indexBytes:compressedIndex.length,metadataBytes:metadataBytes.length,levels:stats},null,2));
