import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import '../dist/countries.js';
import {decodeGeo,encodeGeo} from '../dist/geo-pack.mjs';
import {load} from './geo-index.mjs';
import {borderPreviewFilter} from '../dist/border-previews.mjs';
import {testMap} from './test-map.mjs';
import {createMapScene} from '../dist/map-scene.mjs';

const data=decodeGeo(gunzipSync(fs.readFileSync('dist/data/country-border-previews.bin'))),expected=[];
for(const adapter of ['europe','southern-africa'])for(const country of AtlasCountries.byAdapter(adapter)){
 if(AtlasCountries.countries[country].snapshot)continue;
 for(const f of load(`dist/data/${adapter}/${country}/international.bin`).features)expected.push({...f,properties:{...f.properties,previewLayer:country+'-international'}});
}
const flight=load('dist/data/flight-context.bin');
for(const [key,layer] of [['landBorders','south-land-boundaries'],['riverBorders','south-river-boundaries']])for(const f of flight[key]?.features||[])expected.push({...f,properties:{...f.properties,previewLayer:layer}});
assert.deepEqual(data,decodeGeo(encodeGeo({type:'FeatureCollection',features:expected})),'Every precise border and its claims survive packaging');
assert(fs.statSync('dist/data/country-border-previews.bin').size<3e6,'Border-only package stays small');
const map=testMap(),scene=createMapScene(map);
map.addLayer({id:'france-international',type:'line',metadata:{atlasInternationalBorder:true},paint:{}});
const replaced=()=>borderPreviewFilter(map,'china')[1][1][2][1];
assert(replaced().includes('france-international'));
scene.setOverview(true);assert(replaced().includes('france-international'),'Overview culling does not enable duplicate fine strokes');
map.setLayoutProperty('france-international','visibility','none');assert(!replaced().includes('france-international'),'An authored-hidden border keeps its fallback');
map.removeLayer('france-international');assert(!replaced().includes('france-international'),'Removing an adapter restores its border');
console.log('Complete detailed national edges, compact precision, claims and border ownership passed.');
