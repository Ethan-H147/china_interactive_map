import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import '../dist/countries.js';

const source='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const response=await fetch(source);
if(!response.ok)throw Error('World land: '+response.status);
const world=await response.json();
// Selectable countries already have their own reconciled coastal silhouettes.
// Exclude the coarse versions so they cannot protrude behind detailed coasts.
const portals=new Set(['CHN','TWN','KOR','PRK','MNG','JPN','PHL','IDN','RUS']);
// Countries drawn from these silhouettes declare their Natural Earth code in countries.js.
const {ids,countries}=globalThis.AtlasCountries;
const previews=Object.fromEntries(ids.filter(id=>countries[id].naturalEarth).map(id=>[countries[id].naturalEarth,id]));
// France's detailed outline is metropolitan only; French Guiana keeps its silhouette.
const overseas=(iso,polygon)=>iso==='FRA'&&polygon[0][0][0]<-30;
const features=world.features.filter(f=>!portals.has(f.properties.ADM0_A3)).flatMap(f=>{
 const iso=f.properties.ADM0_A3,parts=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
 const home=parts.filter(p=>!overseas(iso,p)),away=parts.filter(p=>overseas(iso,p));
 return [{type:'Feature',properties:{country:previews[iso]||''},geometry:home.length===1?{type:'Polygon',coordinates:home[0]}:{type:'MultiPolygon',coordinates:home}},...(away.length?[{type:'Feature',properties:{country:''},geometry:{type:'MultiPolygon',coordinates:away}}]:[])];
});
const bytes=gzipSync(JSON.stringify({type:'FeatureCollection',features}),{level:9});
await fs.writeFile('dist/data/world-land.bin',bytes);
await fs.writeFile('dist/data/world-land-sources.json',JSON.stringify({
 source,description:'Natural Earth 1:110m background land silhouettes. Supported Asian countries and Russia use the atlas’s existing detailed context instead. No administrative boundaries or click targets.',
 license:'Public domain',retrieved:new Date().toISOString().slice(0,10),features:features.length,bytes:bytes.length
},null,2)+'\n');
console.log('World land:',features.length,'silhouettes;',bytes.length,'bytes compressed');
