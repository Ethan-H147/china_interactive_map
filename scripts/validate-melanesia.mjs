import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import '../dist/countries.js';
import {source,root} from './fetch-melanesia.mjs';
import {definitions} from './melanesia-definitions.mjs';
import {load,polygons,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {firstLevelPool} from '../dist/first-level-quiz.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex'),area=coordinates=>coordinates.reduce((n,p)=>n+geographicAreaKm2({type:'Polygon',coordinates:p}),0);
const lattice=value=>typeof value==='number'?Math.round(value*1e6):value.map(lattice),degrees=value=>typeof value==='number'?value/1e6:value.map(degrees);
for(const name of Object.keys(load(root+'manifest.json').files))source(name);
for(const d of definitions){
 const base='dist/data/europe/'+d.country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin'),ids=new Map(cat.records.map(r=>[r.id,r])),geometry=new Map(first.regions.features.map(f=>[f.properties.id,f]));
 assert.deepEqual(cat.counts,d.counts);assert.equal(cat.records.length,Object.values(d.counts).reduce((n,c)=>n+c,0));assert.equal(ids.size,cat.records.length);
 for(const [parent,chunk]of Object.entries(cat.chunks).sort((a,b)=>a[1].level-b[1].level)){
  const data=load(base+chunk.file);assert.equal(data.regions.features.length,chunk.count);assert.equal(fs.statSync(base+chunk.file).size,chunk.bytes);assert.equal(Buffer.byteLength(JSON.stringify(data)),chunk.decodedBytes);
  for(const f of data.regions.features){const r=ids.get(f.properties.id);assert.equal(r.parent,parent);assert.equal(r.level,chunk.level);geometry.set(r.id,f);}
  const mask=lattice(polygons(geometry.get(parent).geometry)),children=polygonClipping.union(...data.regions.features.map(f=>lattice(polygons(f.geometry))));assert(area(degrees(polygonClipping.difference(mask,children)))<.02,'No parent gaps '+parent);assert(area(degrees(polygonClipping.difference(children,mask)))<.02,'No parent overflow '+parent);
 }
 for(const r of cat.records){const f=geometry.get(r.id),s=stats.regions[d.country+':'+r.id];assert(f&&r.en&&r.center?.length===2&&r.areaKm2>0);assert(landIndex(polygons(f.geometry).flat())(r.center),'Label on land '+r.id);assert(s.population.value>0);assert.equal(s.population.year,d.populationYear);assert.equal(s.population.method,d.populationMethod);assert(!s.gdp&&!s.gdpPerCapita,'National GDP is not allocated to '+r.id);}
 assert.equal(firstLevelPool(cat.records).length,d.counts[1]);assert.equal(AtlasCountries.countries[d.country].continent,'Oceania');assert.equal(AtlasCountries.countries[d.country].map.countryProfile,false);assert(fs.readFileSync('dist/vendor/flag-'+d.prefix+'.svg','utf8').includes('<svg'));
 for(const f of first.boundaries.features)assert(f.properties.owners.length>=2,'No coast-only administrative lines');
 const borders=load(base+'international.bin');assert.equal(borders.features.length,d.country==='papua-new-guinea'?1:0,'Land-only international frontier');
 console.log(d.country+': '+JSON.stringify(cat.counts)+'; hierarchy, dated populations, statistics, labels and quizzes verified.');
}
const reference=load('dist/data/europe/papua-new-guinea/international.bin'),indonesia=load('dist/data/archipelago/indonesia-context.bin'),near=lineIndex(indonesia.features.flatMap(f=>polygons(f.geometry).flat()));for(const p of linesOf(reference).flat())assert(near(p)<.2,'Matched Indonesia frontier');
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const [country,h]of Object.entries(meta.melanesiaIntegration.preservedInteractiveHashes))assert.equal(hash(world.features.filter(f=>f.properties.country===country)),h,'Preserve existing country '+country);
const codes=new Set(definitions.map(d=>d.iso));for(const f of load('dist/data/world-country-outlines.bin').features)assert(!String(f.properties.countries).split(' ').some(code=>codes.has(code)),'No obsolete background coast strokes');
for(const d of definitions){assert(world.features.some(f=>f.properties.country===d.country));assert(meta.topology.atlasCodes.includes(d.iso));assert(!meta.topology.backgroundCodes.includes(d.iso));}
console.log('One aligned New Guinea land frontier; Solomon/Vanuatu coasts unlined; all existing country silhouettes preserved.');
