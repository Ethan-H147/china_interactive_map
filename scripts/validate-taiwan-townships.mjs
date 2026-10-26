import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {decodeGeo} from '../dist/geo-pack.mjs';
import {readData} from './read-data.mjs';
const root='dist/data/taiwan-townships/',index=JSON.parse(fs.readFileSync(root+'index.json'));
const parents=readData('display-boundaries.json').subdivisions.features.filter(f=>f.properties.level==='taiwan-region');
assert.equal(index.districts.length,368);assert.equal(new Set(index.districts.map(f=>f.properties.adcode)).size,368);
const area=g=>{if(!g)return 0;const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polygons.reduce((a,p)=>a+p.reduce((b,r,i)=>b+(i?-1:1)*Math.abs(r.reduce((s,q,j)=>{const n=r[(j+1)%r.length];return s+q[0]*n[1]-n[0]*q[1];},0))/2,0),0);};
let totalBytes=0,worst=0;
for(const parent of parents){
 const scope=parent.properties.adcode,load=id=>{const bytes=fs.readFileSync(root+scope+'/'+id+'.bin');totalBytes+=bytes.length;return decodeGeo(gunzipSync(bytes));};
 const fills=load('city-districts');assert(fills.features.length>0);
 assert.equal(new Set(fills.features.map(f=>f.properties.adcode)).size,index.districts.filter(f=>f.properties.parentCity===scope).length);
 for(const f of fills.features){assert.equal(f.properties.parentCity,scope);assert.equal(f.properties.provinceCode,710000);assert(index.names[f.properties.adcode]?.en);assert(f.properties.centroid.every(Number.isFinite));assert.equal(f.geometry.type,'Polygon');assert.equal(f.geometry.coordinates.length,1);assert.equal(f.geometry.coordinates[0].length,4);assert(area(f.geometry)>=0);}
 for(const id of ['city-district-boundaries','city-districts-selection-edges'])assert(load(id).features.every(f=>f.properties.parentCity===scope));
 for(const [a,b] of [[fills,{type:'FeatureCollection',features:[parent]}],[{type:'FeatureCollection',features:[parent]},fills]]){
  const result=await mapshaper.applyCommands('-i a.json -erase b.json -o output.json format=geojson geojson-type=FeatureCollection',{'a.json':JSON.stringify(a),'b.json':JSON.stringify(b)});
  const delta=JSON.parse(result['output.json']).features.reduce((s,f)=>s+area(f.geometry),0);worst=Math.max(worst,delta);assert(delta<0.00001,scope+' outside/missing area '+delta);
 }
}
assert.equal(parents.length,22);assert(totalBytes<6*1024*1024);
console.log(JSON.stringify({divisions:368,parents:22,totalBytes,worstBoundaryDifferenceSquareDegrees:worst}));
