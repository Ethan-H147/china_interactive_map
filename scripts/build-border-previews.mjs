import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import '../dist/countries.js';
import {load} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

const registry=globalThis.AtlasCountries,features=[];
for(const adapter of ['europe','southern-africa'])for(const country of registry.byAdapter(adapter)){
 if(registry.countries[country].snapshot)continue;
 const data=load(`dist/data/${adapter}/${country}/international.bin`);
 for(const feature of data.features)features.push({...feature,properties:{...feature.properties,previewLayer:country+'-international'}});
}
const flight=load('dist/data/flight-context.bin');
for(const [key,layer] of [['landBorders','south-land-boundaries'],['riverBorders','south-river-boundaries']])
 for(const feature of flight[key]?.features||[])features.push({...feature,properties:{...feature.properties,previewLayer:layer}});
const bytes=gzipSync(encodeGeo({type:'FeatureCollection',features}),{level:9});
fs.writeFileSync('dist/data/country-border-previews.bin',bytes);
console.log('Detailed border previews:',features.length,'features,',bytes.length,'bytes');
