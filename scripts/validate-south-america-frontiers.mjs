import fs from 'node:fs';import assert from 'node:assert/strict';import{gunzipSync}from'node:zlib';
import{load}from'./geo-index.mjs';import{decodeGeo}from'../dist/geo-pack.mjs';import{retainedSouthAmericanFrontiers}from'./south-america-frontiers.mjs';
const preview=decodeGeo(gunzipSync(fs.readFileSync('dist/data/country-border-previews.bin'))),pairs=new Set();
for(const country of ['brazil','argentina','uruguay']){
 const file='europe/'+country+'/international.bin',data=load('dist/data/'+file),expected=retainedSouthAmericanFrontiers(country),actual=data.features.filter(f=>f.properties.retainedSouthAmericaFrontier);
 assert.deepEqual(actual,expected,'Exact retained border coordinates and one canonical owner '+country);
 const compact=decodeGeo(gunzipSync(fs.readFileSync('dist/data/compact/'+file)));assert.deepEqual(compact,data,'Compact runtime geometry stays synchronized');
 for(const f of actual){pairs.add(f.properties.resolvedFrontier);assert(preview.features.some(p=>p.properties.previewLayer===country+'-international'&&JSON.stringify(p.geometry)===JSON.stringify(f.geometry)),'Precise preview available before country entry');}
}
assert.deepEqual([...pairs].sort(),['ARG-BRA','ARG-URY','BRA-URY']);
console.log('South American borders: exact retained land/river paths, single ownership, compact copies and unselected-country previews passed.');
