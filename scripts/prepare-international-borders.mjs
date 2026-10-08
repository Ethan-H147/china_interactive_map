import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {internationalBorders} from './south-america-borders.mjs';
const path='dist/data/flight-context.bin',context=JSON.parse(gunzipSync(fs.readFileSync(path)));
const regions={type:'FeatureCollection',features:['brazil','argentina','uruguay'].flatMap(country=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/'+country+'-first.bin'))).regions.features)};
context.landBorders=internationalBorders(regions);
fs.writeFileSync(path,gzipSync(JSON.stringify(context),{level:9}));
console.log('International land borders:',context.landBorders.features.map(f=>f.properties.countries.join('–')).join(', '));
