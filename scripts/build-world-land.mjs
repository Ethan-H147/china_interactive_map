import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import '../dist/countries.js';

const source='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson';
const response=await fetch(source);
if(!response.ok)throw Error('World land: '+response.status);
const world=await response.json();
// Selectable countries already have their own reconciled coastal silhouettes.
// Exclude the coarse versions so they cannot protrude behind detailed coasts.
const portals=new Set(['CHN','TWN','KOR','PRK','MNG','JPN','PHL','IDN','RUS']);
// Countries drawn from these silhouettes declare their Natural Earth codes in countries.js
// (France and the United Kingdom include their overseas territories); a country's silhouettes
// are hidden while its own map is available.
const {ids,countries}=globalThis.AtlasCountries;
const previews=Object.fromEntries(ids.flatMap(id=>[countries[id].naturalEarth||[]].flat().map(code=>[code,id])));
const features=world.features.filter(f=>!portals.has(f.properties.ADM0_A3)).map(f=>({type:'Feature',properties:{country:previews[f.properties.ADM0_A3]||''},geometry:f.geometry}));
const bytes=gzipSync(JSON.stringify({type:'FeatureCollection',features}),{level:9});
await fs.writeFile('dist/data/world-land.bin',bytes);
await fs.writeFile('dist/data/world-land-sources.json',JSON.stringify({
 source,description:'Natural Earth 1:110m background land silhouettes. Supported Asian countries and Russia use the atlas’s existing detailed context instead. China’s other land neighbours are drawn above them at the precision of China’s outline, in a band along it (china-neighbours.bin, world-land.mjs). No administrative boundaries or click targets.',
 license:'Public domain',retrieved:new Date().toISOString().slice(0,10),features:features.length,bytes:bytes.length
},null,2)+'\n');
console.log('World land:',features.length,'silhouettes;',bytes.length,'bytes compressed');

await (await import('./titicaca-water.mjs')).writeTiticacaWater();await (await import('./mask-titicaca.mjs')).maskTiticacaWorld();
