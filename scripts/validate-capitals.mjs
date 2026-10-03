import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {visibleCapitals,capitalIcon} from '../dist/capitals.mjs';
import {readDataText} from './read-data.mjs';
const root=new URL('../dist/',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('data/capitals.json',root)));
const korea=JSON.parse(gunzipSync(fs.readFileSync(new URL('data/korea-boundaries.bin',root))));
const china=JSON.parse(readDataText('display-boundaries.json'));
const regions=new Map([...china.provinces.features.map(f=>[f.properties.adcode,f]),...korea.first.features.map(f=>[f.properties.id,f])]);
const inRing=([x,y],ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const contains=(f,p)=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(rings=>inRing(p,rings[0])&&!rings.slice(1).some(r=>inRing(p,r)));
assert.equal(data.coordinateSystem,'WGS84');
assert.equal(data.places.length,63);
assert.equal(new Set(data.places.map(p=>p.atlas+':'+p.geonamesId)).size,data.places.length,'No duplicate city stars');
for(const place of data.places){
 assert(place.en&&place.local&&place.role&&place.source,'Complete name and attribution');
 assert(place.coordinates.length===2&&place.coordinates.every(Number.isFinite),'Finite longitude and latitude');
 assert(regions.has(place.region),'Mapped parent '+place.en);
 assert(contains(regions.get(place.region),place.coordinates),'City location inside its parent '+place.en);
}
assert.equal(new Set(data.places.filter(p=>p.atlas==='china').map(p=>p.region)).size,32,'All mainland provincial seats plus Taipei');
assert.equal(new Set(data.places.filter(p=>p.atlas==='korea').map(p=>p.region)).size,korea.first.features.length,'Every Korean first-level seat');
assert.deepEqual(data.places.filter(p=>p.kind==='national').map(p=>p.en).sort(),['Beijing','Pyongyang','Seoul','Taipei']);
for(const mode of ['china','korea']){
 assert.equal(visibleCapitals(data.places,{enabled:false,mode,quiz:false}).length,0);
 assert.equal(visibleCapitals(data.places,{enabled:true,mode,quiz:true}).length,0,'No quiz clues');
 assert(visibleCapitals(data.places,{enabled:true,mode,quiz:false}).every(p=>p.atlas===mode),'Only active map mode');
}
assert(capitalIcon(true).includes('<circle'),'Distinct national star');
assert(!capitalIcon().includes('<circle'),'Provincial star');
console.log('Capital display: 63 attributed city locations, parent containment, coverage, distinct stars and quiz visibility passed.');
