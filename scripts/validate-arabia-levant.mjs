import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import '../dist/countries.js';
import {source,root} from './fetch-arabia-levant.mjs';
import {definitions} from './arabia-levant-definitions.mjs';
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
 for(const r of cat.records){const f=geometry.get(r.id),s=stats.regions[d.country+':'+r.id];assert(f&&r.en&&r.center?.length===2&&r.areaKm2>0);assert(landIndex(polygons(f.geometry).flat())(r.center),'Label on land '+r.id);if(r.level===1){assert(s.population.value>0);assert.equal(s.population.year,d.country==='syria'?2004:2025);}else assert(!s.population,'No population inferred for unmatched historical detail '+r.id);assert(!s.gdp&&!s.gdpPerCapita,'National GDP is not allocated to '+r.id);}
 assert.equal(firstLevelPool(cat.records).length,d.counts[1]);assert.equal(AtlasCountries.countries[d.country].continent,'Asia');assert.equal(AtlasCountries.countries[d.country].map.countryProfile,false);assert(fs.readFileSync('dist/vendor/flag-'+d.prefix+'.svg','utf8').includes('<svg'));
 for(const f of first.boundaries.features)assert(f.properties.owners.length>=2,'No coast-only administrative lines');
 const borders=load(base+'international.bin');for(const f of borders.features)assert.equal(f.properties.boundaryType,'land frontier');
 console.log(d.country+': '+JSON.stringify(cat.counts)+'; hierarchy, dated populations, statistics, labels and quizzes verified.');
}

const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const [country,h]of Object.entries(meta.arabiaLevantIntegration.preservedInteractiveHashes))assert.equal(hash(world.features.filter(f=>f.properties.country===country)),h,'Preserved earlier country '+country);
const countries=new Map(definitions.map(d=>[d.country,load('dist/data/europe/'+d.country+'/first.bin').regions]));
for(const other of ['saudi-arabia','united-arab-emirates','iraq','turkey'])countries.set(other,load('dist/data/europe/'+other+'/first.bin').regions);
for(const [a,b]of [['oman','yemen'],['oman','saudi-arabia'],['oman','united-arab-emirates'],['yemen','saudi-arabia'],['syria','jordan'],['syria','iraq'],['syria','turkey'],['jordan','saudi-arabia'],['jordan','iraq']]){
 const overlap=polygonClipping.intersection(countries.get(a).features.flatMap(f=>polygons(f.geometry)),countries.get(b).features.flatMap(f=>polygons(f.geometry)));assert(area(overlap)<.02,'No country overlap '+a+' '+b);
}
const omanInside=landIndex(countries.get('oman').features.flatMap(f=>polygons(f.geometry).flat())),uaeInside=landIndex(countries.get('united-arab-emirates').features.flatMap(f=>polygons(f.geometry).flat()));assert(omanInside([56.326,25.284]),'Madha remains in Oman');assert(uaeInside([56.283,25.268])&&!omanInside([56.283,25.268]),'Nahwa remains outside Oman');
const lakeRings=load('scripts/boundary-sources/nordics/ne-lakes.json.gz').features.flatMap(f=>polygons(f.geometry).flat()),wet=landIndex(lakeRings),shore=lineIndex(lakeRings);
for(const d of definitions)for(const f of load('dist/data/europe/'+d.country+'/international.bin').features){
 assert(/^[A-Z]{3}-[A-Z]{3}$/.test(f.properties.pair),'Two distinct country codes on each frontier');
 for(const line of linesOf({features:[f]}))for(let i=0;i<line.length;i++)for(const p of [line[i],...(i?[[ (line[i-1][0]+line[i][0])/2,(line[i-1][1]+line[i][1])/2]]:[])])assert(!wet(p)||shore(p)<.2,'No lake-water frontier strokes beyond six-decimal shoreline rounding');
}
for(const d of definitions){assert.equal(AtlasCountries.countries[d.country].continent,'Asia');assert(world.features.some(f=>f.properties.country===d.country));}
console.log('New land frontiers, enclave ownership, water exclusion and preserved earlier maps verified.');
