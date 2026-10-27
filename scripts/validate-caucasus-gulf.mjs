import fs from 'node:fs';
import assert from 'node:assert/strict';
import polygonClipping from 'polygon-clipping';
import {createHash} from 'node:crypto';
import {source,root} from './fetch-caucasus-gulf.mjs';
import {definitions} from './caucasus-gulf-definitions.mjs';
import {load,polygons,landIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {placeLines} from '../dist/settlement-layer.mjs';
import '../dist/countries.js';
const manifest=load(root+'manifest.json');for(const name of Object.keys(manifest.files))source(name);
const firsts=new Map(),popCounts={armenia:11,georgia:11,azerbaijan:71,qatar:8,bahrain:4,'united-arab-emirates':3};
const area=d=>d.features.reduce((sum,f)=>sum+geographicAreaKm2(f.geometry),0);
for(const d of definitions){const base='dist/data/europe/'+d.country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin').regions,ids=new Map(cat.records.map(r=>[r.id,r]));firsts.set(d.country,first);
 assert.deepEqual(cat.counts,d.counts);assert.equal(ids.size,Object.values(d.counts).reduce((a,b)=>a+b));assert.equal(first.features.length,d.counts[1]);assert.equal(Object.values(stats.regions).filter(r=>r.level===1&&r.population).length,popCounts[d.country]);
 for(const r of cat.records){assert(r.en&&r.local&&r.areaKm2>0&&r.center?.length===2);if(r.parent)assert.equal(ids.get(r.parent)?.level,r.level-1);const stat=stats.regions[d.country+':'+r.id];assert(stat.area.value>0);assert(!stat.gdp&&!stat.gdpPerCapita);if(stat.population)assert(stat.population.value>0&&stats.sources[stat.population.source]?.url);}
 for(const f of first.features)assert(landIndex(polygons(f.geometry).flat())(ids.get(f.properties.id).center),'Interior label '+f.properties.id);
 for(const[parent,chunk]of Object.entries(cat.chunks)){const part=load(base+chunk.file);assert.equal(fs.statSync(base+chunk.file).size,chunk.bytes);assert.equal(part.regions.features.length,chunk.count);assert(part.regions.features.every(f=>ids.get(f.properties.id).parent===parent));let mask;if(ids.get(parent).level===1)mask=first.features.find(f=>f.properties.id===parent);else{const p=ids.get(parent),upper=load(base+cat.chunks[p.parent].file);mask=upper.regions.features.find(f=>f.properties.id===parent);}assert(mask);const missing=await command({'mask.json':fc([mask]),'part.json':part.regions},'-erase part.json',{precision:null}),outside=fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:polygonClipping.difference(part.regions.features.flatMap(f=>polygons(f.geometry)),polygons(mask.geometry))}}]);assert(area(missing)<.2,parent+' coverage gap '+area(missing));assert(area(outside)<.2,parent+' outside-parent fill '+area(outside));for(const f of part.regions.features)assert(landIndex(polygons(f.geometry).flat())(ids.get(f.properties.id).center));}
 const search=createPlaceSearch(cat.records);for(const r of cat.records.filter(r=>r.level===1)){assert(search(r.local).some(x=>x.id===r.id),'Native search '+r.id);assert.deepEqual(placeLines(r,'both'),[...new Set([r.en,r.local])]);}
 const n=stats.regions[d.country+':'+d.iso];assert(n.population.value>1e5&&n.gdp.value>1e9&&n.gdpPerCapita.value>100);assert.equal(n.gdp.year,n.gdpPerCapita.year);assert(!globalThis.AtlasCountries.countries[d.country].map.countryProfile);
 const colors=load('dist/data/region-colors/'+d.country+'.json');assert.equal(colors.records.filter(r=>r.level===1&&r.metrics.population).length,popCounts[d.country]);assert(colors.records.every(r=>!r.metrics.gdp));
 if(d.country==='armenia')assert.equal(stats.regions['armenia:AM-ER'].population.value,1141100);
 if(d.country==='georgia'){assert(ids.has('GE-AB')&&ids.has('GE-SO'));assert(!stats.regions['georgia:GE-AB'].population&&!stats.regions['georgia:GE-SO'].population);assert(Math.abs(Object.values(stats.regions).filter(r=>r.level===1).reduce((sum,r)=>sum+(r.population?.value||0),0)-3941100)<=200);}
 if(d.country==='azerbaijan'){assert(ids.has('AZ-NX'));assert.equal(cat.chunks['AZ-BA'].count,12);assert.equal(cat.chunks['AZ-NX'].count,8);assert(search('Aghdara').length);assert(Math.abs(area(first)-86000)<5000,'Country covers the full mainland and autonomous republic');assert(ids.get('AZ-BA').areaKm2>1800&&ids.get('AZ-BA').areaKm2<3000,'Baku contains its land jurisdiction and excludes territorial sea');}
 if(d.country==='qatar'){assert.equal(stats.regions['qatar:QAT006'].population.value,1186023);assert.equal(ids.get('QAT008').en,'Al Shahaniya');}
 if(d.country==='bahrain'){assert(area(first)>740&&area(first)<810,'Governorates contain land and exclude territorial sea');assert.equal(Object.values(stats.regions).filter(r=>r.level===1).reduce((sum,r)=>sum+r.population.value,0),1501635);}
 if(d.country==='united-arab-emirates'){assert.equal(stats.regions[d.country+':AE02'].population.value,4580000);assert(search('دبي').some(r=>r.id==='AE02'));}
 console.log(d.country+': source hashes, hierarchy, parent coverage, native search, population, flags and hidden country pages passed.');
}
for(const[a,b]of [['armenia','georgia'],['armenia','azerbaijan'],['georgia','azerbaijan']]){const overlap=fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:polygonClipping.intersection(firsts.get(a).features.flatMap(f=>polygons(f.geometry)),firsts.get(b).features.flatMap(f=>polygons(f.geometry)))}}]);assert(area(overlap)<1,a+'/'+b+' overlap '+area(overlap));}
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const[c,h]of Object.entries(meta.caucasusGulfIntegration.preservedInteractiveHashes))assert.equal(createHash('sha256').update(JSON.stringify(world.features.filter(f=>f.properties.country===c))).digest('hex'),h,'Existing silhouette '+c);for(const d of definitions)assert(world.features.some(f=>f.properties.country===d.country)&&meta.topology.atlasCodes.includes(d.iso)&&!meta.topology.backgroundCodes.includes(d.iso));
console.log('Existing interactive silhouettes preserved; six country maps integrated without Caucasus fill overlap.');
