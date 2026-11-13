import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {lineData,lineSourceOptions} from '../dist/adaptive-lines.mjs';
import {selectionLineData,selectionLineSourceOptions} from '../dist/outline-detail.mjs';
const require=createRequire(import.meta.url),{GeoJSONVT}=await import(pathToFileURL(path.join(path.dirname(require.resolve('@maplibre/geojson-vt')),'geojson-vt.mjs')));
const fc=features=>({type:'FeatureCollection',features});
const read=file=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/canada/'+file)));
const tileAt=([x,y],z)=>[Math.floor((x+180)/360*2**z),Math.floor((1-Math.log(Math.tan(Math.PI/4+y*Math.PI/360))/Math.PI)/2*2**z)];
const options=tolerance=>({maxZoom:18,extent:8192,buffer:2048,tolerance:tolerance*16});
const count=tile=>tile?.features.reduce((n,f)=>n+f.geometry.reduce((sum,p)=>sum+p.length,0),0)||0;
for(const [file,id,point]of [['first.bin','CA-ON',[-81.4,45.5]],['second/CA-NU.bin','CA-CD-6204',[-96,76]]]){
 const raw=read(file),regions=raw.regions||raw,input=fc(regions.features.filter(f=>f.properties.id===id)),before=JSON.stringify(input);
 const legacy=lineData(input),detail=selectionLineData(input);
 assert.equal(JSON.stringify(input),before,'Source geography is unchanged');assert.equal(detail.features.length,legacy.features.length,'Every original island and lake ring is retained');
 for(let i=0;i<detail.features.length;i++){
  const a=legacy.features[i],b=detail.features[i];assert.deepEqual(b.geometry,a.geometry,'Full coordinate precision is retained');assert.equal(b.properties.id,a.properties.id);assert(Number.isFinite(b.properties.visibleZoom));assert(b.properties.visibleZoom>=a.properties.visibleZoom,'No detail appears earlier than before');
 }
 const visible=(features,z)=>features.filter(f=>f.properties.visibleZoom+1.42<=z).length;
 assert(visible(detail.features,6)<visible(legacy.features,6)*.2,'At least 80% fewer full-strength tiny ring strokes at regional scale');
 assert(visible(detail.features,12)>visible(detail.features,6)*10,'Close zoom progressively restores detailed rings');
 const smooth=new GeoJSONVT(detail,options(selectionLineSourceOptions.tolerance)),exact=new GeoJSONVT(detail,options(0));
 let prior=0,current=0;const [tx,ty]=tileAt(point,5);
 for(let x=tx-1;x<=tx+1;x++)for(let y=ty-1;y<=ty+1;y++){prior+=count(exact.getTile(5,x,y));current+=count(smooth.getTile(5,x,y));}
 assert(current<prior*.85,'Overview tiles discard at least 15% of subpixel zigzags');
 let nearest,dist=Infinity;for(const f of detail.features)for(const p of f.geometry.coordinates){const d=(p[0]-point[0])**2+(p[1]-point[1])**2;if(d<dist){dist=d;nearest=p;}}
 const [x,y]=tileAt(nearest,18),hi=smooth.getTile(18,x,y),original=exact.getTile(18,x,y);assert(hi&&original);assert.deepEqual(hi.features.map(f=>f.geometry),original.features.map(f=>f.geometry),'Maximum tile zoom restores full original stroke geometry');
 console.log(id+': full-strength rings at zoom 6 '+visible(legacy.features,6)+' → '+visible(detail.features,6)+'; overview vertices '+prior+' → '+current+'; exact close detail retained.');
}
const square=(x,y,w,h=w)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
const specimen=fc([{type:'Feature',properties:{id:'test',parent:'parent'},geometry:{type:'Polygon',coordinates:[square(0,45,1),square(.1,45.1,.05)]}}]);
const [outer,hole]=selectionLineData(specimen).features;assert(hole.properties.visibleZoom>outer.properties.visibleZoom,'Small lake holes appear later than their mainland');
const thin=selectionLineData(fc([{...specimen.features[0],geometry:{type:'Polygon',coordinates:[square(0,45,1,.00001)]}}])).features[0];assert(thin.properties.visibleZoom>outer.properties.visibleZoom+5,'A long narrow footprint cannot show a cluttered outline at overview scale');
assert.equal(selectionLineSourceOptions.maxzoom,18);assert(selectionLineSourceOptions.tolerance>0);assert.deepEqual(lineSourceOptions,{type:'geojson',tolerance:.65,maxzoom:18,buffer:128},'Shared administrative-border rendering is unchanged');
console.log('Selection detail: lake holes, narrow islands, immutable source geometry, retained ownership and shared-border profile passed.');

// Dated riding files (historic-borders.mjs): a selection is built from the worker's compact copy
// of the file, decoded once, and matches the original whole-file decode exactly.
{
 const {decodeData}=await import('../dist/geo-pack.mjs'),{polygonParts}=await import('../dist/polygon-parts.mjs');
 const {compactRegions,regionFeatures}=await import('../dist/outline-detail.mjs'),{loadAtlasData}=await import('../dist/atlas-data.mjs');
 const files={a:'dist/data/europe/canada/elections/ridings-2025.bin',b:'dist/data/europe/canada/elections/ridings-2013.bin',c:'dist/data/europe/canada/elections/ridings-1867.bin'};
 const fetches=[],realFetch=globalThis.fetch;
 globalThis.fetch=async url=>{fetches.push(url);const bytes=fs.readFileSync(files[new URL(url).pathname.slice(1)]);return new Response(bytes);};
 try{
  const decoded=await decodeData(fs.readFileSync(files.a)),regions=compactRegions(decoded.regions);
  const ids=['62001','61001','35111'];// Nunavut, Northwest Territories, Toronto—St. Paul's
  for(const id of ids){
   const original=fc(decoded.regions.features.filter(f=>f.properties.id===id));
   assert.deepEqual(fc(regionFeatures(regions,id)),original,id+' compact copy keeps every coordinate');
   const outline=await loadAtlasData('atlas-data://test-outlines?url=http://files/a&member=regions&transform=selection-outline&unit='+id);
   assert.deepEqual(outline,selectionLineData(original),id+' worker outline matches the whole-file decode');
   const shape=await loadAtlasData('atlas-data://test-highlight?url=http://files/a&member=regions&transform=parts&unit='+id);
   assert.deepEqual(shape,polygonParts(original),id+' worker shape matches the whole-file decode');
  }
  assert.deepEqual(await loadAtlasData('atlas-data://test-outlines?url=http://files/a&member=regions&transform=selection-outline&unit='),fc([]),'An empty unit only builds the copy');
  assert.equal(fetches.length,1,'One riding file is fetched and decoded once for every selection');
  // The two most recently used files stay; a third evicts the least recent.
  const outline=unit=>loadAtlasData('atlas-data://test-outlines?url=http://files/'+unit+'&member=regions&transform=selection-outline&unit=x');
  await outline('b');await outline('a');await outline('c');await outline('a');assert.equal(fetches.length,3,'Recently used riding files are reused');
  await outline('b');assert.equal(fetches.length,4,'The least recently used file was released');
  console.log('Dated ridings: worker outline and shape match the whole-file decode for '+ids.join(', ')+'; each file decodes once.');
 }finally{globalThis.fetch=realFetch;}
}

// A selected territory can consist of pieces from different surveys whose
// touching edges were not recorded as one shared arc. They are interior land.
{
 const {compactMosaic,unitOutline}=await import('../dist/outline-detail.mjs');
 const region=(x,w=1)=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[square(x,45,w)]}});
 const edge=(coordinates,l,r=-1)=>({type:'Feature',properties:{l,r},geometry:{type:'LineString',coordinates}});
 const rings=fc([region(0),region(1)]);
 const arcData=fc([
  edge([[0,45],[0,46]],0),edge([[2,45],[2,46]],1),
  edge([[1,45],[1,46]],0),edge([[1,46],[1,45]],1),
  edge([[0,45],[1,45],[2,45]],0),edge([[0,46],[1,46],[2,46]],0)
 ]);
 const original=JSON.stringify({faces:rings,arcs:arcData});
 const mosaic=compactMosaic({faces:rings,arcs:arcData},[{face:[0,0]},{face:[0,1]}]);
 const internal=f=>f.geometry.coordinates.every(p=>p[0]===1);
 assert(!unitOutline(mosaic,0,0).features.some(internal),'Coincident unshared edges do not bisect a selected territory');
 for(const unit of [0,1])assert(unitOutline(mosaic,1,unit).features.some(internal),'A real border between different territories remains');
 assert.equal(unitOutline(mosaic,0,0).features.length,4,'All exterior paths stay intact');
 assert.equal(JSON.stringify({faces:rings,arcs:arcData}),original,'Outline repair never edits source geography');
 const overlap=compactMosaic({faces:fc([region(0),region(.5)]),arcs:fc([edge([[.75,45.2],[.75,45.8]],0)])},[{face:[0,0]}]);
 assert.equal(unitOutline(overlap,0,0).features.length,0,'Overlapping selected pieces are a union, not a parity hole');
 const lake=region(0);lake.geometry.coordinates.push(square(.2,45.2,.1));
 const water=compactMosaic({faces:fc([lake]),arcs:fc([edge(lake.geometry.coordinates[1],0)])},[{face:[0]}]);
 assert.equal(unitOutline(water,0,0).features.length,1,'Real lake-hole outlines remain');
 const narrow=region(0);narrow.properties.hostId='exact';narrow.geometry.coordinates.push(square(.2,45.2,.1,.00001));
 const narrowArc=edge(narrow.geometry.coordinates[1],0);narrowArc.properties.exact=true;
 const tinyWater=compactMosaic({faces:fc([narrow]),arcs:fc([narrowArc])},[{face:[0]}]);
 assert.deepEqual(unitOutline(tinyWater,0,0).features[0]?.geometry.coordinates,narrow.geometry.coordinates[1],'Sub-two-meter water holes retain every outline coordinate');
 console.log('Historical outlines: internal survey seams removed; genuine borders, lake holes and source coordinates retained.');
}

// Filter the chronology before expanding feature paths and tile indexes, while
// preserving active land, gray fallback geometry, IDs and original coordinates.
{
 const {encodeGeo}=await import('../dist/geo-pack.mjs'),{loadAtlasData}=await import('../dist/atlas-data.mjs');
 const features=[0,1,2,3].map(f=>({type:'Feature',properties:{f,...(f===3?{hostId:'shared-host'}:{})},geometry:{type:'Polygon',coordinates:[square(f*2,45,1)]}}));
 const fixture={faces:fc(features),configs:[{face:[0,-1,-1,0],modernLand:[2]},{face:[0,-1,-1,0],fullLand:true}]};
 const realFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(encodeGeo(fixture));
 try{
  for(const [query,ids] of [['&faceConfig=0',[0,2,3]],['&faceConfig=0&skipHosts=1',[0,2]],['&faceConfig=1&skipHosts=1',[0,1,2]],['',[0,1,2,3]]]){
   const result=await loadAtlasData('atlas-data://history?url=http://fixture/period&member=faces&transform=parts'+query);
   assert.deepEqual(result,fc(ids.map(id=>features[id])),'Only inactive or reused host faces are omitted; geometry and IDs stay exact');
  }
 }finally{globalThis.fetch=realFetch;}
 console.log('Historical source residency: active periods, reused hosts, gray fallback and exact coordinates passed.');
}

// The historical display uses the same buffered-view clipper as the modern
// background. It keeps all original visible vertices, holes and border IDs.
{
 const {encodeGeo,decodeData}=await import('../dist/geo-pack.mjs'),{loadAtlasData}=await import('../dist/atlas-data.mjs');
 const circle=(x,y,r,n)=>Array.from({length:n+1},(_,i)=>[x+r*Math.cos(i/n*2*Math.PI),y+r*Math.sin(i/n*2*Math.PI)]);
 const fixture={faces:fc([{type:'Feature',properties:{f:7,owner:'dated'},geometry:{type:'Polygon',coordinates:[circle(0,0,1,20000),circle(.65,0,.1,200)]}},{type:'Feature',properties:{f:8},geometry:{type:'Polygon',coordinates:[square(10,10,1)]}}]),water:fc([]),arcs:fc([
  {type:'Feature',properties:{coast:false,l:7,r:8},geometry:{type:'LineString',coordinates:[[10,10],[11,11]]}},
  {type:'Feature',properties:{coast:false,l:7,r:8},geometry:{type:'LineString',coordinates:[[.4,.2],[.8,.25]]}}
 ])};
 const packed=encodeGeo(fixture),original=await decodeData(packed),realFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(packed);
 try{
  const result=await loadAtlasData('atlas-data://coast?url=http://fixture/coast&transform=coast-display&borders=1&scope=-0.5,-0.5,1.5,0.5');
  const land=result.features.filter(f=>f.geometry.type==='Polygon'),line=result.features.filter(f=>f.geometry.type==='LineString');
  assert.equal(land.length,1,'Out-of-view land never enters the tile index');assert.deepEqual(land[0].properties,{f:7,owner:'dated'});
  assert.deepEqual(land[0].geometry.coordinates[1],original.faces.features[0].geometry.coordinates[1],'A real water hole retains every coordinate');
  const points=new Set(land[0].geometry.coordinates[0].map(p=>p.join(',')));
  for(const point of original.faces.features[0].geometry.coordinates[0])if(point[0]>=-.5&&point[0]<=1.5&&point[1]>=-.5&&point[1]<=.5)assert(points.has(point.join(',')),'Every original vertex inside the buffered view stays exact');
  assert.equal(line.length,1);assert.equal(line[0].properties.edge,1,'Clipping never renumbers dated border IDs');assert.deepEqual(line[0].geometry,original.arcs.features[1].geometry);
 }finally{globalThis.fetch=realFetch;}
 console.log('Historical view clipping: exact visible vertices, lake holes, ownership and original border IDs passed.');
}
