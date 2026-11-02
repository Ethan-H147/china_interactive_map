import {borderPreviewDefinitions} from '../dist/border-previews.mjs';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import '../dist/countries.js';
import {load} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

// Shared frontiers already draw independently of country entry; do not duplicate them.
const shared=new Set(load('dist/data/atlas-frontiers.bin').features.map(f=>JSON.stringify(f.geometry)));
const features=[];
for(const {country,base}of borderPreviewDefinitions()){
 const data=load(`dist/data/${base}/international.bin`);
 for(const feature of data.features.filter(f=>!shared.has(JSON.stringify(f.geometry))))features.push({...feature,properties:{...feature.properties,previewLayer:country+'-international'}});
}
const bytes=gzipSync(encodeGeo({type:'FeatureCollection',features}),{level:9});
fs.writeFileSync('dist/data/country-border-previews.bin',bytes);
console.log('Detailed border previews:',features.length,'features,',bytes.length,'bytes');
