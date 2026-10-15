import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readDataText} from './read-data.mjs';
import {decodePack,encodePack} from '../dist/china-pack.mjs';
import {describeChina,chinaSourceBuilders} from '../dist/china-sources.mjs';
import {lineData,borderIndex,hiddenSegments,visibleSegments,liesOnBorder} from '../dist/adaptive-lines.mjs';
import {chinaShore} from './china-shore.mjs';
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
const builders=chinaSourceBuilders(packed);
const requested=[...app.matchAll(/chinaSource\('([a-z-]+)'/g)].map(m=>m[1]);
assert(requested.includes('provinces')&&requested.includes('city-districts'),'The page adds China sources through chinaSource()');
for(const id of requested)assert(builders[id],'No worker builder for '+id);
// The workers must build exactly what the page used to build on the main thread.
const {display,districts,fragments}=canonical,fc=features=>({type:'FeatureCollection',features});
const prefectures=display.subdivisions.features.filter(f=>isPrefectureLevel(f.properties)),others=display.subdivisions.features.filter(f=>!isPrefectureLevel(f.properties));
const regularFills=features=>fc(features.filter(f=>!fragments[f.properties.adcode]));
const triangleFills=features=>fc(features.filter(f=>fragments[f.properties.adcode]).flatMap(f=>fragments[f.properties.adcode].coordinates.map(coordinates=>({type:'Feature',properties:{adcode:f.properties.adcode},geometry:{type:'Polygon',coordinates}}))));
const borders=['dist/data/shared-context-borders.bin','dist/data/russia/international.bin'].map(f=>JSON.parse(gunzipSync(fs.readFileSync(f))));
const excluded=borderIndex(fc(borders.flatMap(b=>b.features)));
// The stored hidden-segment ranges must match the current outlines and borders.
const shore=chinaShore(display),lineOmissions={...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name,hiddenSegments(geometry,name==='province'?{borders:excluded,hide:shore}:{})])),districts:hiddenSegments(districts.boundaries)};
assert.deepEqual(packed.lineOmissions,lineOmissions,'Hidden outline segments are stale; run node scripts/pack-china-boundaries.mjs');
assert.equal(packed.sources.borders,createHash('sha256').update(['shared-context-borders.bin','russia/international.bin'].map(f=>gunzipSync(fs.readFileSync('dist/data/'+f)).toString('utf8')).join('\n')).digest('hex'),'International borders changed since the pack was built');
const expected={provinces:regularFills(display.provinces.features),prefectures:regularFills(prefectures),others:fc(others),'provinces-fragments':triangleFills(display.provinces.features),'prefectures-fragments':triangleFills(prefectures),
 ...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name+'-boundaries',lineData(visibleSegments(geometry,name==='province'?{borders:excluded,hide:shore}:{}))])),
 'provinces-selection-edges':lineData(display.provinces),'prefectures-selection-edges':lineData(fc(prefectures)),'others-selection-edges':lineData(fc(others)),
 'city-districts':districts.regions,'city-district-boundaries':lineData(visibleSegments(districts.boundaries)),'city-districts-selection-edges':lineData(districts.regions)};
assert.deepEqual(Object.keys(builders).sort(),Object.keys(expected).sort());
for(const [id,value] of Object.entries(expected))assert.equal(JSON.stringify(builders[id]()),JSON.stringify(value),`Worker-built ${id} differs from the main-thread build`);
// No drawn outline segment lies on an international line or on another drawn segment.
const drawnProvince=builders['province-boundaries']().features.map(f=>f.geometry.coordinates);
let stacked=0;for(const p of drawnProvince)for(let i=1;i<p.length;i++)if(liesOnBorder(excluded,p[i-1],p[i]))stacked++;
assert.equal(stacked,0,'Province outlines never stack on an international line');
assert.equal(hiddenSegments({type:'MultiLineString',coordinates:drawnProvince}).length,0,'Province outlines never retrace themselves');
// Bit patterns that decimal text can hide: signs, subnormals, extremes and large steps.
const edge=[0.1,-0.1,1e-300,-1e-300,5e-324,-5e-324,1.7976931348623157e308,-1.7976931348623157e308,116.38912345678901,-0.5,2**53+2,-(2**53)];
const line=edge.map((x,i)=>[x,edge[(i+5)%edge.length]]);
const sample={display:{boundaries:{type:'MultiLineString',coordinates:[line,line.slice().reverse()]}},districts:{type:'FeatureCollection',features:[]},fragments:{},sources:{}};
assert.deepEqual(decodePack(encodePack(sample)).display,sample.display);
assert.deepEqual(decodePack(encodePack({...sample,display:{p:{type:'LineString',coordinates:[[-0,0],[0,-0],[-0,0]]}}})).display.p.coordinates,[[-0,0],[0,-0],[-0,0]],'Signed zeros stay distinct');
assert(!app.includes('display-boundaries.parts.json'),'Visitors load the packed boundaries, not the build inputs');
console.log('Packed China boundaries reproduce the display, district and fill-fragment JSON exactly, including edge-case float bits.');
