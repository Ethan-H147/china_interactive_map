import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import '../dist/countries.js';
import {decodeGeo,encodeGeo} from '../dist/geo-pack.mjs';
import {load} from './geo-index.mjs';
import {borderPreviewFilter,borderPreviewDefinitions} from '../dist/border-previews.mjs';
import {testMap} from './test-map.mjs';
import {createMapScene} from '../dist/map-scene.mjs';

const shared=new Set(load('dist/data/atlas-frontiers.bin').features.map(f=>JSON.stringify(f.geometry)));
const data=decodeGeo(gunzipSync(fs.readFileSync('dist/data/country-border-previews.bin'))),expected=[];
for(const {country,base}of borderPreviewDefinitions()){
 for(const f of load(`dist/data/${base}/international.bin`).features.filter(f=>!shared.has(JSON.stringify(f.geometry))))expected.push({...f,properties:{...f.properties,previewLayer:country+'-international'}});
}
assert.deepEqual(data,decodeGeo(encodeGeo({type:'FeatureCollection',features:expected})),'Every precise border and its claims survive packaging');
assert(fs.statSync('dist/data/country-border-previews.bin').size<3e6,'Border-only package stays small');
const map=testMap(),scene=createMapScene(map);
map.addLayer({id:'france-international',type:'line',metadata:{atlasInternationalBorder:true},paint:{}});
const originalFilter=borderPreviewFilter(map,'china');
const unchanged=()=>assert.deepEqual(borderPreviewFilter(map,'china'),originalFilter,'Country layer loading does not change the precise global source filter');
unchanged();
scene.setOverview(true);unchanged();
map.setLayoutProperty('france-international','visibility','none');unchanged();
map.removeLayer('france-international');unchanged();
console.log('Complete detailed national edges, compact precision, claims and border ownership passed.');
