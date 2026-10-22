// Public and developer county-level divisions of mainland China (prepare-china-counties.mjs).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {isPrefectureLevel} from '../dist/china-levels.mjs';
import {decodePack} from '../dist/china-pack.mjs';

const counties=JSON.parse(gunzipSync(fs.readFileSync('dist/data/china-counties.bin')));
const regions=counties.regions.features,names=JSON.parse(fs.readFileSync('dist/data/china-county-names.json'));
const display=readData('display-boundaries.json');
const prefectures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties)&&f.properties.provinceCode<710000);
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
// Sinusoidal projection, so large prefectures spanning several degrees of latitude compare fairly.
const ringArea=r=>{const x=p=>p[0]*Math.cos(p[1]*Math.PI/180);return Math.abs(r.slice(1).reduce((u,p,i)=>u+x(r[i])*p[1]-x(p)*r[i][1],0))/2*111.195**2;};
const area=g=>polygons(g).reduce((s,p)=>s+ringArea(p[0])-p.slice(1).reduce((t,h)=>t+ringArea(h),0),0);

// 2,727 county-level divisions of the prefectures and Suzhou Industrial Park (a functional area);
// with the municipalities' 86 districts and the 32 directly administered units, 2,845 in all.
assert.equal(regions.length,2728,'County-level divisions of the prefectures');
assert.equal(new Set(regions.map(f=>f.properties.adcode)).size,regions.length,'Unique codes');
const cities=new Set(regions.map(f=>f.properties.parentCity));
assert.equal(counties.boundaries.type,'FeatureCollection','County lines retain their selectable parent');
assert.deepEqual(new Set(counties.boundaries.features.map(f=>f.properties.parentCity)),cities,'Every county parent has its boundary feature');
assert(counties.boundaries.features.every(f=>f.geometry.type==='MultiLineString'&&(f.geometry.coordinates.length||f.properties.parentCity===460300)),'Every adjacent county parent has drawable borders; Sansha island districts have no shared edge');
assert.equal(cities.size,329,'Every prefecture-level area except Dongguan, Zhongshan, Jiayuguan and Danzhou');
for(const code of [441900,442000,620200,460400])assert(!cities.has(code),code+' has no county-level divisions');
assert(!regions.some(f=>f.properties.adcode===350527),'Kinmen is Taiwan\'s');
for(const f of regions){
 const p=f.properties;assert(p.name&&p.adminType&&p.centroid?.every(Number.isFinite),p.adcode+' record');
 assert(prefectures.some(c=>c.properties.adcode===p.parentCity),p.adcode+' under a displayed prefecture');
 assert(names.regions[p.adcode]?.en,p.adcode+' has an English name');
}
// Counties tile their prefecture: same area, no overlap.
let worst=0;
for(const parent of prefectures.filter(p=>cities.has(p.properties.adcode))){
 const own=regions.filter(f=>f.properties.parentCity===parent.properties.adcode),sum=own.reduce((s,f)=>s+area(f.geometry),0),total=area(parent.geometry);
 worst=Math.max(worst,Math.abs(sum-total)/total);
}
assert(worst<.006,'Counties cover their prefecture: worst difference '+(worst*100).toFixed(2)+'%');
// Within a prefecture counties never overlap; across prefectures they overlap only where the
// displayed prefecture outlines themselves do (about 6 km² in all, the largest under 1.1 km²).
const parentOf=new Map(regions.map(f=>[String(f.properties.adcode),f.properties.parentCity]));
const overlaps=JSON.parse((await mapshaper.applyCommands('-i input.json -mosaic calc="n=count(),codes=collect(adcode)" -filter "n>1" -o output.json format=geojson',{'input.json':JSON.stringify(counties.regions)}))['output.json']).features.filter(f=>f.geometry);
const within=overlaps.filter(f=>new Set(String(f.properties.codes).split(',').map(c=>parentOf.get(c))).size===1).reduce((s,f)=>s+area(f.geometry),0);
const overlap=overlaps.reduce((s,f)=>s+area(f.geometry),0);
assert(within<.05,'Counties of one prefecture do not overlap: '+within.toFixed(3)+' km²');
assert(overlap<10,'Overlap across prefectures stays as the displayed outlines have it: '+overlap.toFixed(2)+' km²');
for(const [code,en] of [[320505,'Huqiu District'],[510104,'Jinjiang District'],[654201,'Tacheng']])assert(names.regions[code].en.startsWith(en),code+' '+en);
// The county pack loads after the initial China view for everyone. The small initial
// pack retains its overview overlay until the complete county source is ready.
const dev=decodePack(gunzipSync(fs.readFileSync('dist/data/china-counties.pack.bin'))),pub=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin')));
assert.equal(dev.districts.regions.features.length,2728);assert.equal(pub.districts.regions.features.length,JSON.parse(gunzipSync(fs.readFileSync('dist/data/city-districts.bin'))).regions.features.length,'The public pack keeps its overlay');
assert.equal(dev.display.provinces.features.length+dev.display.subdivisions.features.length,0,'The county pack carries no provinces or prefectures');assert.equal(JSON.parse(fs.readFileSync('dist/data/china-counties-regions.json')).districts.length,2728,'The county index describes every county');
console.log(`China counties: ${regions.length} in ${cities.size} prefectures, tiling each within ${(worst*100).toFixed(2)}%, ${overlap.toFixed(2)} km² overlap; available in public and developer views.`);
