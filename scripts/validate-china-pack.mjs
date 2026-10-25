import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readDataText} from './read-data.mjs';
import {decodePack,encodePack} from '../dist/china-pack.mjs';
import {describeChina,chinaSourceBuilders,OVERVIEW_SCALE} from '../dist/china-sources.mjs';
import {lineData,borderIndex,hiddenSegments,visibleSegments,liesOnBorder} from '../dist/adaptive-lines.mjs';
import {chinaShore} from './china-shore.mjs';
import {isPrefectureLevel} from '../dist/china-levels.mjs';
import {decodeGeo} from '../dist/geo-pack.mjs';
import {assertNearGeo} from './geo-compare.mjs';

const app=fs.readFileSync('dist/app.js','utf8');
const texts={
 display:readDataText('display-boundaries.json'),
 districts:gunzipSync(fs.readFileSync('dist/data/city-districts.bin')).toString('utf8'),
 fragments:gunzipSync(fs.readFileSync('dist/data/fill-fragments.bin')).toString('utf8')
};
const packed=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin')));
const canonical=Object.fromEntries(Object.entries(texts).map(([key,text])=>[key,JSON.parse(text)]));
// Same structure and values as the sources; every coordinate within the 1e-7 degree rounding.
let worst=0;
for(const [key,text] of Object.entries(texts)){
 assert.equal(packed.sources[key],createHash('sha256').update(text).digest('hex'),`china-boundaries.pack.bin is stale for ${key}; run node scripts/pack-china-boundaries.mjs`);
 worst=Math.max(worst,assertNearGeo(packed[key],canonical[key],'Packed '+key));
}
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
// The same international lines the pack hides province segments under (pack-china-boundaries.mjs):
// shared context borders, Russia's, and China's frontiers in the shared frontier layer.
const chinaFrontiers=collection=>fc(collection.features.filter(f=>(' '+f.properties.countries+' ').includes(' china ')));
const borderText=['shared-context-borders.bin','russia/international.bin'].map(f=>gunzipSync(fs.readFileSync('dist/data/'+f)).toString('utf8'));
borderText.push(JSON.stringify(chinaFrontiers(JSON.parse(gunzipSync(fs.readFileSync('dist/data/atlas-frontiers.bin'))))));
const excluded=borderIndex(fc(borderText.flatMap(t=>JSON.parse(t).features)));
// The stored hidden-segment ranges must match the current outlines and borders.
const shore=chinaShore(display),lineOmissions={...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name,hiddenSegments(geometry,name==='province'?{borders:excluded,hide:shore}:{})])),districts:hiddenSegments(districts.boundaries)};
assert.deepEqual(packed.lineOmissions,lineOmissions,'Hidden outline segments are stale; run node scripts/pack-china-boundaries.mjs');
assert.equal(packed.sources.borders,createHash('sha256').update(borderText.join('\n')).digest('hex'),'International borders changed since the pack was built');
const expected={provinces:regularFills(display.provinces.features),prefectures:regularFills(prefectures),others:fc(others),'provinces-fragments':triangleFills(display.provinces.features),'prefectures-fragments':triangleFills(prefectures),
 ...Object.fromEntries(Object.entries(display.boundaries).map(([name,geometry])=>[name+'-boundaries',lineData(visibleSegments(geometry,name==='province'?{borders:excluded,hide:shore}:{}))])),
 'provinces-selection-edges':lineData(display.provinces),'prefectures-selection-edges':lineData(fc(prefectures)),'others-selection-edges':lineData(fc(others)),
 'city-districts':districts.regions,'city-district-boundaries':lineData(visibleSegments(districts.boundaries)),'city-districts-selection-edges':lineData(districts.regions)};
assert.deepEqual(Object.keys(builders).sort(),Object.keys(expected).sort());
// Line fade-in zooms come from segment lengths, so the rounding moves them slightly. At every zoom
// the map reaches (16), the faded opacity (adaptive-lines.mjs: (zoom - visibleZoom) / 1.42) must
// stay within one 8-bit step.
const sameFade=(a,e)=>Math.max(0,Math.min(Math.abs(a-e),16-Math.min(a,e)))/1.42<1/255;
for(const [id,value] of Object.entries(expected))assertNearGeo(builders[id](),value,`Worker-built ${id}`,undefined,{visibleZoom:sameFade});
// No drawn outline segment lies on an international line, as the page draws both (the
// borders from their compact copies), or on another drawn segment.
const drawnBorders=['shared-context-borders.bin','russia/international.bin'].map(f=>decodeGeo(gunzipSync(fs.readFileSync('dist/data/compact/'+f))));
drawnBorders.push(chinaFrontiers(decodeGeo(gunzipSync(fs.readFileSync('dist/data/compact/atlas-frontiers.bin')))));
const drawnExcluded=borderIndex(fc(drawnBorders.flatMap(b=>b.features)));
const drawnProvince=builders['province-boundaries']().features.map(f=>f.geometry.coordinates);
let stacked=0;for(const p of drawnProvince)for(let i=1;i<p.length;i++)if(liesOnBorder(drawnExcluded,p[i-1],p[i]))stacked++;
assert.equal(stacked,0,'Province outlines never stack on an international line');
assert.equal(hiddenSegments({type:'MultiLineString',coordinates:drawnProvince}).length,0,'Province outlines never retrace themselves');
// Extremes, a jump across 180° and signed zeros stay within the rounding; shared points stay shared.
const edge=[[180,90],[-180,-90],[179.99999994,-0.00000004],[-179.99999996,89.99999996],[-0,0],[0,-0],[116.38912345678901,39.912345678901]];
const sample={display:{boundaries:{type:'MultiLineString',coordinates:[edge,edge.slice().reverse()]}},districts:{type:'FeatureCollection',features:[]},fragments:{},sources:{}};
const round=decodePack(encodePack(sample));assertNearGeo(round.display,sample.display,'Edge coordinates');
assert.deepEqual(round.display.boundaries.coordinates[0],round.display.boundaries.coordinates[1].slice().reverse(),'A point used twice decodes identically');
// The overview pack drawn first: the same sources, hidden segments and structure, rounded to 1e-4 degrees.
const overview=decodePack(gunzipSync(fs.readFileSync('dist/data/china-overview.pack.bin')));
assert.deepEqual(overview.sources,packed.sources,'china-overview.pack.bin is stale; run node scripts/pack-china-boundaries.mjs');
assert.deepEqual(overview.lineOmissions,packed.lineOmissions);
for(const key of Object.keys(texts))assertNearGeo(overview[key],canonical[key],'Overview '+key,0.5/OVERVIEW_SCALE*(1+1e-9));
assert(!app.includes('china-pack://')&&!app.includes('chinaPackUrl()'),'Runtime loads individual sources instead of country-wide packs');
assert(app.includes('createCountyScope(map'),'County geometry loads only for the selected area');
assert(!app.includes('display-boundaries.parts.json'),'Visitors load the packed boundaries, not the build inputs');
console.log(`Packed China boundaries match the display, district and fill-fragment JSON with every coordinate within ${(worst*111320*1000).toFixed(1)} mm; worker-built sources match the main-thread build.`);
