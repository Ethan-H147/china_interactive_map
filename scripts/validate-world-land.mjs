import {mapPalette,backgroundLandColor} from '../dist/map-palette.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {addWorldLand} from '../dist/world-land.mjs';
import {loadAtlasData} from '../dist/atlas-data.mjs';
import {assertNearGeo} from './geo-compare.mjs';

const bytes=fs.readFileSync('dist/data/world-land.bin');
const data=JSON.parse(gunzipSync(bytes));
assert.ok(bytes.length<5_000_000,'Retained world reference and aligned previews stay under 5 MB compressed');
assert.ok(gunzipSync(bytes).length<15_000_000,'Retained world reference stays under 15 MB decoded');
// The browser downloads and workers decode the compact structure, not the retained JSON.
const compactWorld=fs.readFileSync('dist/data/compact/world-land.bin');
assert(compactWorld.length<2_200_000,'Actual world download stays under 2.2 MB');
assert(gunzipSync(compactWorld).length<4_500_000,'Actual world structure stays under 4.5 MB decoded');
const inRing=(p,r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const contains=p=>data.features.some(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h))));
for(const p of [[-100,40],[-60,-10],[20,0],[20,50],[68,48],[135,-25],[0,-80],[25,64],[-150,65]])assert.ok(contains(p),'Missing continental or neighboring land '+p);
for(const p of [[110,35],[127,38],[105,47],[138,36],[121,16],[114,-1]])assert.ok(!contains(p),'Coarse background must not overlap supported-country coastlines '+p);
for(const p of [[80,60],[37.6,55.75],[134,45],[170,65],[-175,66],[20.5,54.7],[143,50]])assert.ok(!contains(p),'Russia must use only its detailed silhouette, including islands and both sides of the date line '+p);
for(const country of ['brazil','argentina','uruguay'])assert.equal(data.features.filter(f=>f.properties.country===country).length,1,'Unreleased countries retain background land only');
assert.ok(data.features.every(f=>Object.keys(f.properties).join(',')==='country'),'No subdivision data in the world background');
const sources=new Map(),layers=[];
// China's non-atlas neighbours load separately, after the world map, at China's precision.
const neighbourBytes=fs.readFileSync('dist/data/china-neighbours.bin');
assert.ok(neighbourBytes.length<400_000,'China neighbour band stays small (it loads after the world map)');
// The page requests the compact copies and MapLibre's workers decode them (geo-pack.mjs, atlas-data.mjs).
const page=globalThis.fetch;globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return page(url);assert.ok(['data/compact/world-land.bin','data/compact/world-country-outlines.bin','data/compact/china-neighbours.bin'].includes(url),url);return new Response(fs.readFileSync('dist/'+url));};
await addWorldLand({addSource:(id,s)=>sources.set(id,s),addLayer:l=>layers.push(l),getStyle:()=>({layers}),on(){},off(){}});
await new Promise(r=>setTimeout(r,50));
for(const [id,source] of sources)sources.set(id,{...source,data:await loadAtlasData(source.data)});
assertNearGeo(sources.get('world-land').data,data,'World land as drawn');
assert.equal(layers.length,3);assert.equal(layers[1].id,'world-country-outlines');assert.equal(layers[1].type,'line');assert.equal(layers[1].paint['line-opacity'],1);assert.equal(layers[2].id,'china-neighbour-land');assert.deepEqual(layers[2].paint['fill-color'],layers[0].paint['fill-color'],'Neighbour band shares the background grey; China, its portal grey');
assert.ok(sources.get('china-neighbour-land').data.features.every(f=>f.geometry.type==='Polygon'),'One polygon per feature');assert.equal(layers[0].type,'fill');assert.equal(layers[0].maxzoom,undefined,'Land must remain visible beyond national overview zoom');
assert.equal(layers[0].paint['fill-opacity'],undefined,'No world-layer fade during zoom');
assert.ok(sources.get('world-land').maxzoom<=8,'Background land indexing remains bounded independently of detailed maps');
const brightness=hex=>[1,3,5].reduce((s,i)=>s+parseInt(hex.slice(i,i+2),16),0);
assert.ok(brightness(mapPalette.foreign)>brightness(mapPalette.country),'Background must be lighter than clickable countries');
assert.deepEqual(layers[0].paint['fill-color'],backgroundLandColor(),'Fallbacks share the country-preview palette');
const visible=layers[0].paint['fill-color'][1][2][1];assert(visible.includes('chile'),'Chile is dark before its detailed outline loads');assert(visible.includes('peru')&&visible.includes('paraguay'),'Peru and Paraguay are public from the first frame');for(const id of ['iceland','india','turkey'])assert(visible.includes(id),'Released countries share the public preview gray: '+id);
const all=backgroundLandColor(()=>true)[1][2][1];assert(all.includes('peru'),'Developer mode uses the same palette contract');
const app=fs.readFileSync('dist/app.js','utf8');
assert.ok(app.indexOf("import('./world-land.mjs')")<app.indexOf("workerSource('china-context'"),'World background must sit below country fills and satellite imagery');
const routing=app.slice(app.indexOf('function countryAt('),app.indexOf("map.on('click'",app.indexOf('function countryAt(')));
assert.ok(!routing.includes('world-land'),'Generic world land cannot become a country-switch click target');
console.log('All continents, unreleased country silhouettes, supported-coast exclusion, continuous land visibility, lighter gray, nonclickable background and download/indexing budgets passed.');
