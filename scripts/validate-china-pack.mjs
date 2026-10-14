import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readDataText} from './read-data.mjs';
import {decodePack,encodePack} from '../dist/china-pack.mjs';
import {describeChina,chinaSourceBuilders} from '../dist/china-sources.mjs';
import {lineData,borderSegments,omitBorderSegments} from '../dist/adaptive-lines.mjs';
import {isPrefectureLevel} from '../dist/china-levels.mjs';

const app=fs.readFileSync('dist/app.js','utf8');
const texts={
 display:readDataText('display-boundaries.json'),
 districts:gunzipSync(fs.readFileSync('dist/data/city-districts.bin')).toString('utf8'),
 fragments:gunzipSync(fs.readFileSync('dist/data/fill-fragments.bin')).toString('utf8')
};
const packed=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin')));
for(const [key,text] of Object.entries(texts)){
 assert.equal(packed.sources[key],createHash('sha256').update(text).digest('hex'),`china-boundaries.pack.bin is stale for ${key}; run node scripts/pack-china-boundaries.mjs`);
 assert.equal(JSON.stringify(packed[key]),text,`Packed ${key} must reproduce every original coordinate`);
}
const canonical=Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,JSON.parse(text)]));
assert.deepEqual(JSON.parse(fs.readFileSync('dist/data/china-regions.json','utf8')),JSON.parse(JSON.stringify(describeChina(canonical))),'china-regions.json is stale; run node scripts/pack-china-boundaries.mjs');
// Every source the page adds is built in MapLibre's workers from the same data.
const builders=chinaSourceBuilders(canonical);
const requested=[...app.matchAll(/chinaSource\('([a-z-]+)'/g)].map(m=>m[1]);
assert(requested.includes('provinces')&&requested.includes('city-districts'),'The page adds China sources through chinaSource()');
for(const id of requested)assert(builders[id],'No worker builder for '+id);
// The workers must build exactly what the page used to build on the main thread.
const {display,districts,fragments}=canonical,fc=features=>({type:'FeatureCollection',features});
const prefectures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties)),others=display.subdivisions.features.filter(f=>!isPrefectureLevel(f.properties));
const regularFills=features=>fc(features.filter(f=>!fragments[f.properties.adcode]));
const triangleFills=features=>fc(features.filter(f=>fragments[f.properties.adcode]).flatMap(f=>fragments[f.properties.adcode].coordinates.map(coordinates=>({type:'Feature',properties:{adcode:f.properties.adcode},geometry:{type:'Polygon',coordinates}}))));
const borders=['dist/data/shared-context-borders.bin','dist/data/russia/international.bin'].map(f=>JSON.parse(gunzipSync(fs.readFileSync(f))));
const excluded=borderSegments(fc(borders.flatMap(b=>b.features)));
const expected={provinces:regularFills(display.provinces.features),prefectures:regularFills(prefectures),others:fc(others),'provinces-fragments':triangleFills(display.provinces.features),'prefectures-fragments':triangleFills(prefectures),
 ...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name+'-boundaries',lineData(name==='province'?omitBorderSegments(geometry,excluded):geometry)])),
 'provinces-selection-edges':lineData(display.provinces),'prefectures-selection-edges':lineData(fc(prefectures)),'others-selection-edges':lineData(fc(others)),
 'city-districts':districts.regions,'city-district-boundaries':lineData(districts.boundaries),'city-districts-selection-edges':lineData(districts.regions)};
assert.deepEqual(Object.keys(builders).sort(),Object.keys(expected).sort());
for(const [id,value] of Object.entries(expected))assert.equal(JSON.stringify(builders[id]({excluded})),JSON.stringify(value),`Worker-built ${id} differs from the main-thread build`);
assert.throws(()=>builders['province-boundaries'](),/international border/,'Province outlines refuse to build without the border segments');
assert(app.includes("name==='province'?'&borders='"),'The page passes the international border files for province outlines');
// Bit patterns that decimal text can hide: signs, subnormals, extremes and large steps.
const edge=[0.1,-0.1,1e-300,-1e-300,5e-324,-5e-324,1.7976931348623157e308,-1.7976931348623157e308,116.38912345678901,-0.5,2**53+2,-(2**53)];
const line=edge.map((x,i)=>[x,edge[(i+5)%edge.length]]);
const sample={display:{boundaries:{type:'MultiLineString',coordinates:[line,line.slice().reverse()]}},districts:{type:'FeatureCollection',features:[]},fragments:{},sources:{}};
assert.deepEqual(decodePack(encodePack(sample)).display,sample.display);
assert.deepEqual(decodePack(encodePack({...sample,display:{p:{type:'LineString',coordinates:[[-0,0],[0,-0],[-0,0]]}}})).display.p.coordinates,[[-0,0],[0,-0],[-0,0]],'Signed zeros stay distinct');
assert(!app.includes('display-boundaries.parts.json'),'Visitors load the packed boundaries, not the build inputs');
console.log('Packed China boundaries reproduce the display, district and fill-fragment JSON exactly, including edge-case float bits.');
