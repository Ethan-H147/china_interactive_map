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
