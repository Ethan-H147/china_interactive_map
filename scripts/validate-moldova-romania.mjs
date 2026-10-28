import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {load,polygons,linesOf,lineIndex,landIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {decodeData,decodeGeoStructure} from '../dist/geo-pack.mjs';
import {assertNearGeo} from './geo-compare.mjs';

const root='dist/data/',canonical=load('scripts/boundary-sources/four-europe/resolved.bin').features.find(f=>f.properties.pair==='MDA-ROU').geometry.coordinates;
const first=load(root+'europe/moldova/first.bin'),context=load(root+'europe/moldova/context.bin');
assert.equal(first.regions.features.length,37);
for(const [label,data]of [['districts',first.regions],['context',context]]){
 const edge=lineIndex(data.features.flatMap(f=>polygons(f.geometry).flat()));
 for(let i=1;i<canonical.length;i++)for(const t of [0,.25,.5,.75,1]){
  const a=canonical[i-1],b=canonical[i],p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  assert(edge(p)<1,'Moldova '+label+' joins every Prut segment: '+p+' ('+edge(p)+' m)');
 }
}
const repaired=[[28.211997,46.685054],[27.965467,47.043713],[28.242226,46.640577],[27.022285,48.137632]];
const world=load(root+'world-land.bin'),overview=load(root+'globe-overview-land.bin');
for(const [label,data]of [['districts',first.regions],['context',context],['world fallback',fc(world.features.filter(f=>f.properties.country==='moldova'))]]){
 const inside=landIndex(data.features.flatMap(f=>polygons(f.geometry).flat()));
 for(const point of repaired)assert(inside(point),label+' fills former border slit '+point);
}
assert(world.features.some(f=>f.properties.country==='moldova')&&overview.features.some(f=>f.properties.country==='moldova'));
const romanian=load(root+'europe/romania/international.bin').features.filter(f=>f.properties.pair==='MDA-ROU');
assert.equal(romanian.length,1,'One continuous Romania-owned stroke');
assert.deepEqual(romanian[0].geometry.coordinates,canonical);
assert(!load(root+'europe/moldova/international.bin').features.some(f=>f.properties.pair==='MDA-ROU'),'No duplicate Moldova-owned stroke');
const preview=await decodeData(fs.readFileSync(root+'country-border-previews.bin'));
assert.equal(preview.features.filter(f=>f.properties.pair==='MDA-ROU').length,1);
assert.equal(load(root+'globe-overview-borders.bin').features.filter(f=>f.properties.pair==='MDA-ROU').length,1);
const romania=load(root+'europe/romania/first.bin').regions;
const overlap=await command({'moldova.json':first.regions,'romania.json':romania},'-clip romania.json');
assert(overlap.features.reduce((sum,f)=>sum+(f.geometry?geographicAreaKm2(f.geometry):0),0)<.001,'No land overlap with Romania');
const water=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
const wet=await command({'moldova.json':first.regions,'lakes.json':water},'-clip lakes.json');
assert(wet.features.reduce((sum,f)=>sum+(f.geometry?geographicAreaKm2(f.geometry):0),0)<.001,'Lake surfaces remain water');
for(const file of ['world-land.bin','europe/moldova/context.bin','europe/moldova/international.bin']){
 const decoded=decodeGeoStructure(gunzipSync(fs.readFileSync(root+'compact/'+file))),text=gunzipSync(fs.readFileSync(root+file)).toString();
 assert.equal(decoded.meta.source,createHash('sha256').update(text).digest('hex'),'Fresh compact geometry '+file);
 assertNearGeo(decoded.value,JSON.parse(text),file);
}
const meta=load(root+'world-land-sources.json');
assert.equal(meta.moldovaRomaniaReconciliation.canonicalSha256,createHash('sha256').update(fs.readFileSync('scripts/boundary-sources/four-europe/resolved.bin')).digest('hex'));
console.log('Moldova–Romania: every Prut segment joined, former slits filled, one border stroke, no land overlap, lake cutouts and compact assets verified.');
