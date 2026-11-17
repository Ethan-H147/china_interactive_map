import {alignHistoricalSimplification} from './shared-historical-simplification.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const root=path.resolve(process.env.ATLAS_ROOT||'.'),folder=root+'/dist/data/russia/history/tiles';
const {readHistoricalTileIndex,createHistoricalTileStore}=await import(pathToFileURL(root+'/dist/historical-vector-tiles.mjs'));
const {decodeData}=await import(pathToFileURL(root+'/dist/geo-pack.mjs'));
const {resolveSharedHistory}=await import(pathToFileURL(root+'/dist/shared-history-geometry.mjs'));
const {packShapes,shapeAtLocation}=await import(pathToFileURL(root+'/dist/historic-shapes.mjs'));
const {GeoJSONVT}=await import(pathToFileURL(root+'/node_modules/@maplibre/geojson-vt/dist/geojson-vt.mjs'));
const {polygonParts}=await import(pathToFileURL(root+'/dist/polygon-parts.mjs'));
const {VectorTile}=await import(pathToFileURL(root+'/node_modules/@mapbox/vector-tile/index.js'));
const {PbfReader}=await import(pathToFileURL(root+'/node_modules/pbf/index.js'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const metadata=JSON.parse(gunzipSync(fs.readFileSync(folder+'/scene.bin'))),compressedIndex=fs.readFileSync(folder+'/index.bin');
assert.equal(hash(compressedIndex),metadata.tiles.indexSha256);
assert.equal(hash(fs.readFileSync(root+'/dist/data/russia/history/borders.bin')),metadata.tiles.inputSha256);
for(const source of metadata.tiles.sources)assert.equal(hash(fs.readFileSync(root+'/dist/data/'+source.file)),source.sha256,source.file);
const index=readHistoricalTileIndex(gunzipSync(compressedIndex)),chunks=metadata.tiles.chunks.map((expected,i)=>{const b=fs.readFileSync(folder+'/'+String(i).padStart(4,'0')+'.bin');assert.equal(hash(b),expected);return b;});
const raw=gunzipSync(compressedIndex);let previous=-1,terminal=0;
for(let i=0;i<index.count;i++){const at=16+i*16,key=raw.readUInt32LE(at),chunk=raw.readUInt32LE(at+4),offset=raw.readUInt32LE(at+8),value=raw.readUInt32LE(at+12),length=value&0x7fffffff;assert(key>previous);previous=key;if(length)assert(offset+length<=chunks[chunk].length);if(value>>>31)terminal++;}
const data=await resolveSharedHistory(await decodeData(fs.readFileSync(root+'/dist/data/russia/history/borders.bin')),file=>decodeData(fs.readFileSync(root+'/dist/data/'+file)));
assert.deepEqual(metadata.configs,data.configs);assert.deepEqual(metadata.years,data.years);assert.equal(metadata.faceCount,data.faces.features.length);
const shapes=packShapes(data.faces.features);
const tile=(z,x,y)=>{const entry=index.lookup(z,x,y);return new VectorTile(new PbfReader(entry.length?gunzipSync(chunks[entry.chunk].subarray(entry.offset,entry.offset+entry.length)):new Uint8Array()));};
function pointTile(z,lng,lat){const n=2**z,x=((lng+180)/360*n%n+n)%n,y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;return {x:Math.floor(x),y:Math.floor(y),px:(x-Math.floor(x))*index.extent,py:(y-Math.floor(y))*index.extent};}
function inside(rings,x,y){let odd=false;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(a.y>y!==b.y>y&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)odd=!odd;}return odd;}
function normalizeRings(geometry,closed){return geometry.map(ring=>{const points=ring.map(p=>p.map(n=>n||0));if(!closed)return points;const body=points.slice(0,-1);let first=0;for(let i=1;i<body.length;i++)if(body[i][0]<body[first][0]||body[i][0]===body[first][0]&&body[i][1]<body[first][1])first=i;const rotated=body.slice(first).concat(body.slice(0,first));return [...rotated,rotated[0]];});}
const probes=[[90,60],[110,60],[130,60],[150,65],[175,65],[185,65],[142.9,51.5],[142.73,46.96],[131.89,43.12],[24.75,59.44],[210.1,61.2],[34.1,44.95],[64.42,39.77],[60.36,41.38],[20.51,54.7],[37.6,55.75],[130,45],[140,50],[170,50]];
let ownership=0,water=0;
for(const z of [3,5,8,10,12])for(const [lng,lat]of probes){const p=pointTile(z,lng,lat),layer=tile(z,p.x,p.y).layers.faces,hits=[];for(let i=0;i<(layer?.length||0);i++){const f=layer.feature(i);if(inside(f.loadGeometry(),p.px,p.py))hits.push(+f.properties.id);}const expected=shapeAtLocation(shapes,{lng,lat})?.properties.id;
 if(expected===undefined){assert.equal(hits.length,0,'Water '+z+' '+lng+','+lat);water++;}else{assert(hits.includes(expected),'Canonical face '+z+' '+lng+','+lat+' expected '+expected+' got '+hits);ownership++;}}
// The serialized tile geometry must be exactly the compiler's native clipping,
// including holes and date-line wrapping, with no per-date geometry changes.
const small=[];for(const f of data.faces.features)for(const polygon of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates){const [w,s,e,n]=polygon[0].reduce(([w,s,e,n],[x,y])=>[Math.min(w,x),Math.min(s,y),Math.max(e,x),Math.max(n,y)],[Infinity,Infinity,-Infinity,-Infinity]);if(e-w<.0005||e-w>.03||n-s<.0005||n-s>.03)continue;const lng=(w+e)/2,lat=(s+n)/2;if([-1,0,1].every(dx=>[-1,0,1].every(dy=>shapeAtLocation(shapes,{lng:lng+dx*.0001,lat:lat+dy*.0001})?.properties.id===f.properties.id)))small.push({lng,lat,face:f.properties.id});}
assert(small.length>200,'Many actual tiny islands exercise refinement');
let smallIslands=0;for(let i=0;i<small.length;i+=Math.max(1,Math.floor(small.length/300))){const {lng,lat,face}=small[i],p=pointTile(12,lng,lat),layer=tile(12,p.x,p.y).layers.faces;let found=false;for(let j=0;j<(layer?.length||0);j++){const f=layer.feature(j);if(+f.properties.id===face&&inside(f.loadGeometry(),p.px,p.py))found=true;}assert(found,'Tiny island survives low-zoom terminal pruning '+lng+','+lat);smallIslands++;}
const native=new GeoJSONVT(polygonParts(data.faces),{maxZoom:12,indexMaxZoom:0,indexMaxPoints:100000,extent:8192,buffer:64,tolerance:4,updateable:false,promoteId:'id'});
const nativeEdges=new GeoJSONVT(data.arcs,{maxZoom:12,indexMaxZoom:0,indexMaxPoints:100000,extent:8192,buffer:64,tolerance:4,updateable:false,promoteId:'id'});
alignHistoricalSimplification(native,nativeEdges);
let roundTrips=0;for(const [z,x,y]of [[0,0,0],[2,3,0],[3,7,1],[6,57,20],[8,230,81],[12,3673,1371],[12,40,960]]){
 const expected=native.getTile(z,x,y)?.features||[],layer=tile(z,x,y).layers.faces;assert.equal(layer?.length||0,expected.length,'Face count '+[z,x,y]);
 for(let i=0;i<expected.length;i++){const f=layer.feature(i);assert.equal(+f.properties.id,expected[i].tags.id);assert.deepEqual(f.loadGeometry().map(r=>r.map(p=>[p.x,p.y])),expected[i].geometry.map(r=>r.map(p=>p.map(n=>n||0))));}roundTrips++;}
// Two real Baltic cells contain edges that disappear in low-zoom display
// simplification. Their descendants must still match native full-detail tiles.

for(const parent of [290,291])for(let dy=0;dy<8;dy++)for(let dx=0;dx<8;dx++){
 const x=parent*8+dx,y=152*8+dy,actual=tile(12,x,y);
 for(const [name,tree]of [['faces',native],['edges',nativeEdges]]){const expected=tree.getTile(12,x,y)?.features||[],layer=actual.layers[name];assert.equal(layer?.length||0,expected.length,'Small feature refinement '+name+' '+x+','+y);for(let i=0;i<expected.length;i++){const f=layer.feature(i);assert.equal(+f.properties.id,expected[i].tags.id);assert.deepEqual(normalizeRings(f.loadGeometry().map(r=>r.map(p=>[p.x,p.y])),name==='faces'),normalizeRings(expected[i].geometry,name==='faces'));}}
 roundTrips++;
}
// Exercise the shipping asynchronous protocol: hash checks, cancellation of one
// shared consumer, bounded chunk residency and returning immutable MVT bytes.
let reads=0;const fetcher=async(url,{signal}={})=>{reads++;await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,3);signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});return new Response(fs.readFileSync(folder+'/'+new URL(url).pathname.split('/').at(-1)));};
const store=createHistoricalTileStore({fetcher,maxChunks:2,maxBytes:270000});
const request=(z,x,y)=>'atlas-history://russia/'+[z,x,y].join('/')+'?scene='+encodeURIComponent('http://tiles/scene.bin');
const c=new AbortController(),a=store.tile(request(6,57,20),c.signal),b=store.tile(request(6,57,20));c.abort();await assert.rejects(a);const first=await b;assert(first.byteLength);const before=reads;assert.deepEqual(new Uint8Array(await store.tile(request(6,57,20))),new Uint8Array(first));assert.equal(reads,before,'Hot tile bytes reused');
for(const [lng,lat]of probes){const p=pointTile(12,lng,lat);await store.tile(request(12,p.x,p.y));assert(store.snapshot().chunks<=2);assert(store.snapshot().bytes<=270000);}
assert.equal(store.snapshot().pending,0);store.dispose();assert.equal(store.snapshot().bytes,0);
console.log(JSON.stringify({tiles:index.count,terminal,chunks:chunks.length,ownership,water,smallIslands,exactNativeRoundTrips:roundTrips,dates:Object.keys(metadata.years).length,cache:'bounded; shared cancellation and immutable reuse passed'}));
