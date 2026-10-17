import fs from 'node:fs';
import assert from 'node:assert/strict';
import {load,polygons,landIndex,metres,linesOf} from './geo-index.mjs';
import '../dist/countries.js';
const expected={germany:{1:16,2:400,3:10978},belgium:{1:3,2:11,3:581},netherlands:{1:12,2:342},switzerland:{1:26,2:273,3:1985},'united-states':{1:65},canada:{1:13},mexico:{1:32}};
const pins=JSON.parse(fs.readFileSync('scripts/country-expansion-sources.json'));
for(const [country,counts]of Object.entries(expected)){
 const c=AtlasCountries.countries[country],root='dist/'+c.base,data=load(root+'catalogue.bin'),first=load(root+'first.bin'),context=load(root+'context.bin'),international=load(root+'international.bin'),stats=load(root+'statistics.json'),sources=load(root+'sources.json'),index=new Map(data.records.map(r=>[r.id,r]));
 assert.equal(c.release,undefined,country+' is public');assert.deepEqual(data.counts,counts,country+' administrative counts');assert.equal(index.size,data.records.length,country+' unique IDs');
 assert(context.features.length>0&&context.features.every(f=>f.geometry&&f.properties.country===country),country+' portal has real polygons');
 for(const r of data.records){
  assert(r.en&&r.kind&&r.center?.every(Number.isFinite)&&r.areaKm2>0,r.id+' metadata');
  assert(r.level===1?r.parent===null:index.get(r.parent)?.level===r.level-1,r.id+' parent level');
  const s=stats.regions[country+':'+r.id];assert(s?.area.value>0,r.id+' area');
  if(r.populationStatus)assert(!s.population&&s.note.includes('No permanent population'),r.id+' has no invented resident count');
  else {assert(s.population?.value>=0,r.id+' population');assert(stats.sources[s.population.source]?.url,r.id+' recorded population source');}
 }
 for(const [parent,chunk]of Object.entries(data.chunks)){
  const bytes=fs.readFileSync(root+chunk.file),payload=load(root+chunk.file);
  assert.equal(bytes.length,chunk.bytes,parent+' chunk size');assert.equal(payload.regions.features.length,chunk.count,parent+' children count');
  assert(payload.regions.features.every(f=>index.get(f.properties.id)?.parent===parent),parent+' correct children');
  for(const f of payload.boundaries.features)assert(f.properties.owners.every(id=>index.has(id)),parent+' shared edge owners');
 }
 if(c.map.secondLabel){
  const bundle=load(root+'all.bin');assert.deepEqual(bundle.levels.map(p=>p.level),[1,2],country+' two initial levels');
  for(const level of bundle.levels)assert.equal(level.regions.features.length,counts[level.level],country+' bundle count');
 }else{
  assert.equal(data.levels.length,1,country+' only first-level units');assert.equal(Object.keys(data.chunks).length,0,country+' no lower-level chunks');
  assert(!c.controls.some(id=>/second|third/.test(id)),country+' no lower-level controls');
 }
 assert(sources.sources.every(s=>s.sha256===pins.files[s.file]?.sha256),country+' pinned sources');
 // A selected unit must actually cover its label point at every level.
 const parts=[first,...Object.values(data.chunks).map(chunk=>load(root+chunk.file))];
 for(const f of parts.flatMap(p=>p.regions.features)){
  assert(polygons(f.geometry).flat(2).every(p=>p.length===2&&p.every(Number.isFinite)),country+' finite 2D geometry');
  assert(landIndex(polygons(f.geometry).flat())(index.get(f.properties.id).center),f.properties.id+' inner label point');
 }
 assert(international.features.every(f=>Number.isFinite(f.properties.visibleZoom)),country+' line metadata');
 assert(sources.frontiers.every(f=>f.endpointErrorMetres<20000&&f.vertices>=2),country+' complete reference arcs');
 console.log(country,counts,'public; hierarchy, sources, statistics, chunk geometry and border arcs verified.');
}
const mexico=load('dist/data/europe/mexico/catalogue.bin');assert(mexico.records.some(r=>r.id==='MX-CMX'&&r.en==='Mexico City'));assert(mexico.records.some(r=>r.id==='MX-MEX'&&r.en==='México'),'Mexico state and Mexico City remain separate');
const us=load('dist/data/europe/united-states/catalogue.bin');assert(us.records.find(r=>r.id==='US-AK').bounds[1][0]-us.records.find(r=>r.id==='US-AK').bounds[0][0]<65,'Alaska crosses the antimeridian without spanning the world');
const swiss=load('dist/data/europe/switzerland/catalogue.bin');assert.equal(swiss.records.filter(r=>r.kind==='Municipality').length,2110);assert(swiss.records.some(r=>r.kind==='Municipality'&&r.level===2),'Cantons without districts do not acquire invented districts');

const {createPlaceSearch}=await import('../dist/place-search.mjs');
for(const [country,query,id]of [['germany','Munich','DE_09162000'],['germany','Cologne','DE_05315000'],['germany','Nuremberg','DE_09564000'],['belgium','Brussels','BE_21004'],['belgium','Ghent','BE_44021'],['netherlands','The Hague','NL_GM0518'],['netherlands','Den Haag','NL_GM0518']]){
 const catalogue=load('dist/data/europe/'+country+'/catalogue.bin');
 assert(createPlaceSearch(catalogue.records)(query).some(r=>r.id===id),query+' finds the municipality in English or the local language');
}
const world=load('dist/data/world-land.bin');
for(const country of Object.keys(expected))assert(world.features.some(f=>f.properties.country===country),country+' has the correct first-frame background classification');
