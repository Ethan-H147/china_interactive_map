import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {source,root} from './fetch-west-asia.mjs';
import {definitions} from './west-asia-definitions.mjs';
import {load,polygons,landIndex,linesOf,lineIndex,metres} from './geo-index.mjs';
import {fc,command} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';
const manifest=load(root+'manifest.json');for(const name of Object.keys(manifest.files))source(name);
const expectedPopulation={iran:31,iraq:17,'saudi-arabia':13},totals={iran:79926270,iraq:43717069,'saudi-arabia':32175224};
const shapes={};
for(const d of definitions){
 const base='dist/data/europe/'+d.country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin').regions,config=AtlasCountries.countries[d.country],colors=load('dist/data/region-colors/'+d.country+'.json');
 shapes[d.country]=first;
 assert.deepEqual(cat.counts,d.counts);assert.equal(first.features.length,d.counts[1]);assert.equal(cat.records.length,Object.values(d.counts).reduce((a,b)=>a+b,0));assert.equal(new Set(cat.records.map(r=>r.id)).size,cat.records.length);
 const pop=Object.values(stats.regions).filter(r=>r.level===1&&r.population);assert.equal(pop.length,expectedPopulation[d.country]);assert.equal(pop.reduce((s,r)=>s+r.population.value,0),totals[d.country]);
 assert.equal(colors.records.filter(r=>r.metrics.population).length,expectedPopulation[d.country]);
 const search=createPlaceSearch(cat.records);
 for(const f of first.features){const r=cat.records.find(r=>r.id===f.properties.id),s=stats.regions[d.country+':'+r.id];
  assert(r.en&&r.local&&r.localDir==='rtl'&&r.areaKm2>0&&r.center?.length===2);assert(landIndex(polygons(f.geometry).flat())(r.center),'Interior label '+r.id);
  assert.equal(s.level,1);assert(s.area.value>0);assert(!s.gdp&&!s.gdpPerCapita,'No national GDP assigned to regions');
  assert(search(r.local).some(x=>x.id===r.id),'Native-name search '+r.id);assert(search(r.en).some(x=>x.id===r.id),'English-name search '+r.id);
  if(s.population){assert.equal(s.population.method,'census');assert(stats.sources[s.population.source]?.url);assert.equal(s.population.year,d.country==='iran'?2016:d.country==='iraq'?2024:2022);}
 }
 const nation=stats.regions[d.country+':'+d.iso];assert(nation.population.value>1e6&&nation.gdp.value>1e9&&nation.gdpPerCapita.value>100);
 assert.equal(config.map.countryProfile,false);assert.equal(config.map.countryStatistics,d.iso);assert.equal(config.continent,'Asia');assert(fs.existsSync('dist/vendor/flag-'+d.prefix+'.svg'));
 const dissolved=await command(first,'-dissolve2 -clean gap-fill-area=0'),area=data=>data.features.reduce((s,f)=>s+(f.geometry?geographicAreaKm2(f.geometry):0),0);
 assert(Math.abs(area(first)-area(dissolved))<1,'Administrative regions do not overlap: '+d.country);
 console.log(d.country+': regional roster, census joins, area, native search, density data, flags and hidden country page verified.');
}
const iraqStats=load('dist/data/europe/iraq/statistics.json');
for(const id of ['IQG06','IQ-OSM-3826029']){const s=iraqStats.regions['iraq:'+id];assert(!s.population&&s.note,'No inferred population for split '+id);}
const halabja=shapes.iraq.features.find(f=>f.properties.id==='IQ-OSM-3826029');assert(geographicAreaKm2(halabja.geometry)>800&&geographicAreaKm2(halabja.geometry)<1000,'Halabja governorate, not its larger historical district');
const overlap=await command({'iran.json':shapes.iran,'iraq.json':shapes.iraq},'-clip iraq.json');
assert(overlap.features.reduce((s,f)=>s+(f.geometry?geographicAreaKm2(f.geometry):0),0)<1,'Iran and Iraq land stays separate');
const sau=landIndex(shapes['saudi-arabia'].features.flatMap(f=>polygons(f.geometry).flat()));assert(!sau([51.35,24.65]),'Khor Al Adaid remains water');
const iran=landIndex(shapes.iran.features.flatMap(f=>polygons(f.geometry).flat()));assert(!iran([51,38]),'Caspian Sea remains water');assert(!iran([51,27]),'Gulf remains water');
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');
for(const [c,h]of Object.entries(meta.westAsiaIntegration.preservedInteractiveHashes))assert.equal(createHash('sha256').update(JSON.stringify(world.features.filter(f=>f.properties.country===c))).digest('hex'),h,'Existing country silhouette '+c);
for(const d of definitions){assert(world.features.some(f=>f.properties.country===d.country));assert(meta.topology.atlasCodes.includes(d.iso)&&!meta.topology.backgroundCodes.includes(d.iso));}
for(const pair of ['IRN-IRQ','IRQ-SAU']){
 const owner=pair==='IRN-IRQ'?'iran':'iraq',other=pair==='IRN-IRQ'?'iraq':'saudi-arabia',line=load('dist/data/europe/'+owner+'/international.bin').features.filter(f=>f.properties.pair===pair),opposite=load('dist/data/europe/'+other+'/international.bin').features.filter(f=>f.properties.pair===pair);
 assert(line.length>0);assert.equal(opposite.length,0,'One owner for '+pair);
 const near=lineIndex(shapes[other].features.flatMap(f=>polygons(f.geometry).flat())),water=load('scripts/boundary-sources/nordics/ne-lakes.json.gz'),wet=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat()));
 let checked=0;for(const path of linesOf(fc(line)))for(let i=1;i<path.length;i+=Math.max(1,Math.floor(path.length/100))){const p=path[i];if(wet(p)||Math.min(metres(p,path[0]),metres(p,path.at(-1)))<6000)continue;assert(near(p)<5,'Shared detailed border '+pair+' '+p+': '+near(p));checked++;}assert(checked>10);
}
console.log('All 63 regions, 61 matched population cards, preserved existing maps, water cutouts and single-owner new borders verified.');
