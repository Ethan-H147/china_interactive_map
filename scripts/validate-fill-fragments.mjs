import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {GeoJSONVT} from '@maplibre/geojson-vt';
import earcut,{flatten,deviation} from 'earcut';
import {readData} from './read-data.mjs';
import {load} from './geo-index.mjs';

const data=readData('display-boundaries.json');
const fragments=JSON.parse(gunzipSync(fs.readFileSync('dist/data/fill-fragments.bin')));
const originals=[...data.provinces.features,...data.subdivisions.features].filter(f=>fragments[f.properties.adcode]);
const renderer=fs.readFileSync('dist/app.js','utf8');
const tolerance=Number(renderer.match(/const fillSourceOptions=\{tolerance:([.\d]+)/)[1]);
assert.equal(tolerance,0,'Fill triangles must not be simplified independently');
// China's sources are built in MapLibre's workers (china-sources.mjs); app.js chooses their options.
const builders=fs.readFileSync('dist/china-sources.mjs','utf8');
for(const id of ['provinces','prefectures']){
 assert(renderer.includes(`chinaSource('${id}');`)&&builders.includes(`${id}:()=>regularFills(`),'Ordinary fill sources keep subpixel simplification');
 assert(renderer.includes(`chinaSource('${id}-fragments',fillSourceOptions);`)&&builders.includes(`'${id}-fragments':()=>triangleFills(`),'Only repaired triangles use zero tolerance');
}
const options={extent:8192,buffer:2048,maxZoom:18,tolerance:tolerance*16};
function tileDeviation(tile){
 let worst=0,absolute=0;
 for(const f of tile?.features||[]){
  const polygons=[];let polygon,outerSign;
  for(const ring of f.geometry){
   let area=0;for(let i=1;i<ring.length;i++)area+=(ring[i-1][0]-ring[i][0])*(ring[i][1]+ring[i-1][1]);
   if(!area)continue;
   outerSign??=area>0;
   if((area>0)===outerSign){polygon=[ring];polygons.push(polygon);}else polygon.push(ring);
  }
  for(const rings of polygons){const flat=flatten(rings),error=deviation(flat.vertices,flat.holes,2,earcut(flat.vertices,flat.holes,2));worst=Math.max(worst,error);let area=0;for(const ring of rings)for(let i=1;i<ring.length;i++)area+=(ring[i-1][0]-ring[i][0])*(ring[i][1]+ring[i-1][1]);absolute=Math.max(absolute,Math.abs(area/2)*error);}
 }
 return {relative:worst,absolute};
}
// Reproduce the visible overdraw at the original problematic tile.
// Keep the original failing geometry pinned: current border cleanup can remove
// the zero-width loops that made the ordinary polygon triangulator fail.
const yanbian=load('scripts/boundary-sources/korean-frontiers/atlas-reference/china.bin').subdivisions.features.find(f=>f.properties.adcode===222400);
assert(tileDeviation(new GeoJSONVT(yanbian,{...options,tolerance:0}).getTile(5,27,11)).relative>.01,'The regression fixture must reproduce the original triangle');
let tiles=0,maxError=0;
for(const f of originals){
 const geometry=fragments[f.properties.adcode],points=new Set(f.geometry.coordinates.flat(f.geometry.type==='Polygon'?1:2).map(p=>JSON.stringify(p)));
 for(const polygon of geometry.coordinates){assert.equal(polygon[0].length,4);for(const p of polygon[0])assert(points.has(JSON.stringify(p)),'Every fill vertex must come from the original border');}
 const vt=new GeoJSONVT({type:'FeatureCollection',features:geometry.coordinates.map(coordinates=>({type:'Feature',properties:{adcode:f.properties.adcode},geometry:{type:'Polygon',coordinates}}))},options);
 for(let z=4;z<=9;z++){
  const n=2**z,tx=x=>Math.floor((x+180)/360*n),ty=y=>Math.floor((1-Math.asinh(Math.tan(y*Math.PI/180))/Math.PI)/2*n);
  for(let x=tx(127.4);x<=tx(131.4);x++)for(let y=ty(44.6);y<=ty(41.9);y++){
   const error=tileDeviation(vt.getTile(z,x,y)).absolute;maxError=Math.max(maxError,error);assert(error<256,`Fill error below one pixel squared: ${f.properties.adcode} ${z}/${x}/${y}, ${error}`);tiles++;
  }
 }
}
console.log(`Fill regression passed: ${tiles} tiles, original vertices preserved, maximum area error ${maxError/256} pixels squared.`);
