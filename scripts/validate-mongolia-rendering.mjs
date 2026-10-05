import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareMongolia} from '../dist/mongolia-preparation.mjs';
import {polygonLines,MAX_LINE_POINTS} from '../dist/korea-lines.mjs';
const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/mongolia-boundaries.bin',import.meta.url))));
const population=JSON.parse(fs.readFileSync(new URL('../dist/data/province-population.json',import.meta.url)));
const prepared=prepareMongolia(data);
for(const level of ['first','second']){
 assert.deepEqual(prepared.metadata[level].features.map(f=>f.properties),data[level].features.map(f=>f.properties));
 assert(prepared.metadata[level].features.every(f=>f.geometry===null),'Large coordinates stay in the worker');
 assert.deepEqual(JSON.parse(await prepared.sources['mongolia-'+level].text()),data[level]);
 const lines=JSON.parse(await prepared.sources['mongolia-'+level+'-selection-edges'].text());
 assert.deepEqual(lines.features.map(f=>f.geometry),polygonLines(data[level]).features.map(f=>f.geometry));
 assert(lines.features.every(f=>Number.isFinite(f.properties.visibleZoom)),'Adaptive detail thresholds accompany strokes');
 assert(lines.features.every(f=>f.geometry.coordinates.length<=MAX_LINE_POINTS),'GPU-safe stroke paths');
}
for(const f of data.first.features){const record=population.mongolia[f.properties.iso];assert(record,'Population matches official first-level identity '+f.properties.en);assert(record.traditional,'Sourced traditional name');}
assert(data.second.features.every(f=>!population.mongolia[f.properties.id]),'Districts do not inherit entire province populations');
const outline=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/mongolia-outline.bin',import.meta.url))));
assert.deepEqual(outline,data.countries,'Gray portal and active country use exactly the same geometry');
console.log('Mongolia worker preserves source polygons, GPU stroke limits, shared portal geometry and province population scope.');
