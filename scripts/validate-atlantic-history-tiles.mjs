import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash}from'node:crypto';import {gunzipSync}from'node:zlib';import {pathToFileURL}from'node:url';
const root=path.resolve(process.env.ATLAS_ROOT||'.');
const {decodeData}=await import(pathToFileURL(root+'/dist/geo-pack.mjs'));
const {packShapes,shapeAtLocation}=await import(pathToFileURL(root+'/dist/historic-shapes.mjs'));
const {readHistoricalTileIndex,createHistoricalTileStore}=await import(pathToFileURL(root+'/dist/historical-vector-tiles.mjs'));
const {VectorTile}=await import(pathToFileURL(root+'/node_modules/@mapbox/vector-tile/index.js'));
const {PbfReader}=await import(pathToFileURL(root+'/node_modules/pbf/index.js'));
const hash=b=>createHash('sha256').update(b).digest('hex');
function coordinate(z,lng,lat){const n=2**z,x=((lng+180)/360*n%n+n)%n,y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n;return{x:Math.floor(x),y:Math.floor(y),px:(x-Math.floor(x))*8192,py:(y-Math.floor(y))*8192};}
function inside(rings,x,y){let odd=false;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(a.y>y!==b.y>y&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)odd=!odd;}return odd;}
function nearBoundary(shapes,lng,lat,z){
 const scale=8192*2**z/360,cos=Math.cos(lat*Math.PI/180),limit=z===12?1.5:4.5,margin=limit/scale;
 for(const {xy,starts,box:[w,s,e,n]}of shapes){if(lng<w-margin||lng>e+margin||lat<s-margin||lat>n+margin)continue;
  for(let r=0;r+1<starts.length;r++)for(let i=starts[r],j=starts[r+1]-1;i<starts[r+1];j=i++){
   const ax=(xy[j*2]-lng)*scale,ay=(xy[j*2+1]-lat)*scale/cos,bx=(xy[i*2]-lng)*scale,by=(xy[i*2+1]-lat)*scale/cos;
   const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
   if(Math.hypot(ax+t*dx,ay+t*dy)<=limit)return true;
  }
 }return false;
}
const reports=[];
for(const country of process.argv.slice(2).length?process.argv.slice(2):['united-states','united-kingdom']){
 const base=root+'/dist/data/europe/'+country+'/history/',folder=base+'tiles/',metadata=JSON.parse(gunzipSync(fs.readFileSync(folder+'scene.bin'))),compressedIndex=fs.readFileSync(folder+'index.bin');
 const manifest=JSON.parse(gunzipSync(fs.readFileSync(folder+metadata.tiles.manifest)));assert.deepEqual(manifest,{version:1,tiles:metadata.tiles});
 for(const source of metadata.tiles.sources)assert.equal(hash(fs.readFileSync(root+'/'+source.file)),source.sha256,'Pinned geometry '+source.file);
 assert.equal(hash(compressedIndex),metadata.tiles.indexSha256);
 const index=readHistoricalTileIndex(gunzipSync(compressedIndex)),sizes=[];
 for(const [i,expected]of metadata.tiles.chunks.entries()){const bytes=fs.readFileSync(folder+String(i).padStart(4,'0')+'.bin');assert.equal(hash(bytes),expected);sizes.push(bytes.length);}
 const raw=gunzipSync(compressedIndex);let previous=-1;
 for(let i=0;i<index.count;i++){const at=16+16*i,key=raw.readUInt32LE(at),chunk=raw.readUInt32LE(at+4),offset=raw.readUInt32LE(at+8),length=raw.readUInt32LE(at+12)&0x7fffffff;assert(key>previous);previous=key;if(length)assert(offset+length<=sizes[chunk]);}
 if(metadata.renderFaces){
  const ids=new Set(metadata.renderFaces);assert.equal(ids.size,metadata.renderFaces.length,'Unique geometry-backed face IDs');
  assert(metadata.renderFaces.every(id=>Number.isSafeInteger(id)&&id>=0),'Valid geometry-backed face IDs');
  for(const [,l,r]of metadata.edges)for(const id of [l,r])if(id>=0)assert(ids.has(id),'Every shared edge retains both ownership references');
  for(const id of Object.values(metadata.labels))assert(ids.has(id),'Every compiled label retains its physical face');
 }
 const retained=await decodeData(fs.readFileSync(base+'borders.bin'));
 assert.equal(Object.keys(metadata.years).length,country==='united-states'?218:319);
 for(const [year,dated]of Object.entries(retained.years)){
  const old=retained.configs[dated.config],now=metadata.configs[metadata.years[year].config];
  assert.deepEqual(now.units.slice(0,old.units.length),old.units,'Unit records at '+year);
  assert.deepEqual(now.face.slice(0,old.face.length),old.face,'Ownership at '+year);
 }
 const groups=country==='united-states'?[{file:'coastal-display.bin',points:[[-119.5,37.2],[-152,64],[-85.7,46.3],[-76.1,38],[-70.2,41.7],[-90,37],[-157.85,21.3],[-83,25],[-80,26]]}]:[
  {file:'coasts/north-america.bin',points:[[-82,28],[-70.2,41.7],[-63.62,44.65],[-56,49],[-84,26],[-71,40]]},
  {file:'coasts/australia.bin',points:[[151.231,-33.8724],[151.243,-33.857],[133.88,-23.7],[130,-13]]},
  {file:'coasts/new-zealand.bin',points:[[174.77,-41.29],[174.9,-41.5],[172.6,-43.5]]},
  {file:'coasts/south-asia.bin',points:[[79,22],[77.22,28.61],[84,12],[90.4,23.8]]},
  {file:'coasts/malaya.bin',points:[[103.85,1.29],[103.64,1.23],[103.77,1.1]]},
  {file:'coasts/crown-dependencies.bin',points:[[-4.5,54.2],[-2.11,49.19],[-3,49.5]]}
 ];
 const chunkCache=new Map();
 const tile=(z,p)=>{const entry=index.lookup(z,p.x,p.y);if(!entry.length)return null;let bytes=chunkCache.get(entry.chunk);if(!bytes){bytes=fs.readFileSync(folder+String(entry.chunk).padStart(4,'0')+'.bin');chunkCache.set(entry.chunk,bytes);}return new VectorTile(new PbfReader(gunzipSync(bytes.subarray(entry.offset,entry.offset+entry.length))));};
 let points=0,shoreGeneralizations=0;
 for(const group of groups){const data=await decodeData(fs.readFileSync(base+group.file)),shapes=packShapes(data.faces.features.filter(f=>f.properties.f>=0)),water=packShapes(data.water?.features||[]);
  for(const [lng,lat]of group.points)for(const z of [5,8,12]){
   const expected=shapeAtLocation(water,{lng,lat})?undefined:shapeAtLocation(shapes,{lng,lat})?.properties.f;
   const p=coordinate(z,lng,lat),layer=tile(z,p)?.layers.faces,hits=[];
   for(let i=0;i<(layer?.length||0);i++){const f=layer.feature(i);let geometry;try{geometry=f.loadGeometry();}catch(error){throw Error(JSON.stringify({country,z,lng,lat,feature:i,properties:f.properties})+' '+error.message);}if(inside(geometry,p.px,p.py))hits.push(f.properties);}
   const actual=hits.some(f=>f.water)?undefined:hits.find(f=>!f.neutral)?.id;
   if(actual!==expected){assert(nearBoundary([...shapes,...water],lng,lat,z),'Canonical dry land/water '+country+' z'+z+' '+[lng,lat]+' expected '+expected+' got '+actual);shoreGeneralizations++;}points++;
  }
 }
 // Exercise each country hostname and the bounded shipping worker cache.
 const store=createHistoricalTileStore({fetcher:async url=>new Response(fs.readFileSync(folder+new URL(url).pathname.split('/').at(-1))),maxChunks:2,maxBytes:270000});
 for(const [lng,lat]of groups.flatMap(g=>g.points)){const p=coordinate(12,lng,lat);await store.tile('atlas-history://'+country+'/12/'+p.x+'/'+p.y+'?scene='+encodeURIComponent('http://tiles/manifest.bin'));assert(store.snapshot().chunks<=2);assert(store.snapshot().bytes<=270000);}
 store.dispose();assert.equal(store.snapshot().bytes,0);
 reports.push({country,years:Object.keys(metadata.years).length,tiles:index.count,chunks:sizes.length,canonicalLandWater:points,shoreGeneralizations,sourceHashes:'passed',allTileBounds:'passed',cache:'bounded'});
}
console.log(JSON.stringify(reports,null,2));
