import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';

const source='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const response=await fetch(source);
if(!response.ok)throw Error('World land: '+response.status);
const world=await response.json();
// Selectable countries already have their own reconciled coastal silhouettes.
// Exclude the coarse versions so they cannot protrude behind detailed coasts.
const portals=new Set(['CHN','TWN','KOR','PRK','MNG','JPN','PHL','IDN']);
const previews={BRA:'brazil',ARG:'argentina',URY:'uruguay'};
const features=world.features.filter(f=>!portals.has(f.properties.ADM0_A3)).map(f=>({
 type:'Feature',properties:{country:previews[f.properties.ADM0_A3]||''},geometry:f.geometry
}));
const bytes=gzipSync(JSON.stringify({type:'FeatureCollection',features}),{level:9});
await fs.writeFile('dist/data/world-land.bin',bytes);
await fs.writeFile('dist/data/world-land-sources.json',JSON.stringify({
 source,description:'Natural Earth 1:110m background land silhouettes. Supported Asian countries use the atlas’s existing detailed context instead. No administrative boundaries or click targets.',
 license:'Public domain',retrieved:new Date().toISOString().slice(0,10),features:features.length,bytes:bytes.length
},null,2)+'\n');
console.log('World land:',features.length,'silhouettes;',bytes.length,'bytes compressed');
