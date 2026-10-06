import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const source='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const response=await fetch(source);if(!response.ok)throw Error(response.status);
const world=await response.json();
const codes={BRA:'brazil',URY:'uruguay',ARG:'argentina'};
const features=world.features.map(f=>({type:'Feature',properties:{name:f.properties.NAME_EN,country:codes[f.properties.ADM0_A3]||''},geometry:f.geometry}));
await fs.writeFile('dist/data/flight-context.bin',gzipSync(JSON.stringify({type:'FeatureCollection',features})));
await fs.writeFile('dist/data/flight-context-sources.json',JSON.stringify({source,description:'Natural Earth 1:110m country silhouettes for the flight preview. No administrative subdivisions.',license:'Public domain',retrieved:'2026-10-06'},null,2));
for(const code of ['br','uy','ar']){const r=await fetch('https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/'+code+'.svg');if(!r.ok)throw Error(r.status);await fs.writeFile('dist/vendor/flag-'+code+'.svg',await r.text());}
console.log('Flight context:',features.length,'countries;',gzipSync(JSON.stringify({type:'FeatureCollection',features})).length,'bytes compressed');
