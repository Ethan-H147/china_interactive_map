import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,polygons,landIndex} from './geo-index.mjs';
import {source,root} from './fetch-east-south-africa.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';
const cases=[['zimbabwe','ZWE',10,91,15178957,2022,'Harare'],['zambia','ZMB',10,116,19610769,2022,'Lusaka'],['tanzania','TZA',31,170,61741120,2022,'Dar es Salaam'],['kenya','KEN',47,290,47564296,2019,'Nairobi']];
const manifest=load(root+'manifest.json');for(const name of Object.keys(manifest.files))source(name);
for(const [country,iso,first,second,national,year,query]of cases){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),ids=new Map(cat.records.map(r=>[r.id,r])),shapes=[];
 assert.deepEqual(cat.counts,{1:first,2:second});assert.equal(ids.size,first+second);assert.equal(globalThis.AtlasCountries.countries[country].map.countryStatistics,iso);assert(createPlaceSearch(cat.records)(query).length,'Search '+query);
 const initial=load(base+'first.bin');shapes.push(...initial.regions.features);
 for(const [parent,chunk]of Object.entries(cat.chunks)){const b=fs.readFileSync(base+chunk.file),part=load(base+chunk.file);assert.equal(chunk.count,part.regions.features.length);assert.equal(b.length,chunk.bytes);assert.equal(gunzipSync(b).length,chunk.decodedBytes);assert(part.regions.features.every(f=>ids.get(f.properties.id).parent===parent));for(const f of part.boundaries.features)assert(f.properties.owners.every(id=>ids.get(id)?.parent===parent));shapes.push(...part.regions.features);}
 assert.equal(shapes.length,first+second);for(const f of shapes){const r=ids.get(f.properties.id);assert(landIndex(polygons(f.geometry).flat())(r.center),r.id+' inside its area');assert(stats.regions[country+':'+r.id].area.value>0);}
 const regions=Object.values(stats.regions).filter(r=>r.level===1);assert.equal(regions.reduce((s,r)=>s+r.population.value,0),national);assert(regions.every(r=>r.population.year===year));assert(cat.records.filter(r=>r.level===2).every(r=>!stats.regions[country+':'+r.id].population),'No mismatched census lower-level counts');
 const n=stats.regions[country+':'+iso];assert.equal(n.population.value,national);assert(n.gdp.value>1e9&&n.gdpPerCapita.value>100);assert(n.gdp.year===2025);assert(Object.values(stats.regions).filter(r=>r.gdp).every(r=>r.level===0),'No national GDP allocation');
 for(const r of Object.values(stats.regions))for(const field of ['area','population','gdp','gdpPerCapita'])if(r[field])assert(stats.sources[r[field].source]?.url,'Source '+field);
 const colors=load('dist/data/region-colors/'+country+'.json');assert.equal(colors.records.filter(r=>r.metrics.population).length,first);assert(colors.records.every(r=>!r.metrics.gdp),'National GDP stays out of region colours');
 if(country==='tanzania'){for(const code of ['TZ51','TZ52','TZ53','TZ54','TZ55','TZ26'])assert(ids.has(code));assert.equal(stats.regions['tanzania:TZ53'].population.value,893169);}
 if(country==='kenya')assert.equal(stats.regions['kenya:KE047'].population.value,4397073,'County total includes all sex categories');
 console.log(country+': complete source roster, hierarchy, scoped geometry, census totals, national economy, source links, search and colours passed.');
}
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const [country,h]of Object.entries(meta.eastSouthAfricaIntegration.preservedInteractiveHashes))assert.equal(createHash('sha256').update(JSON.stringify(world.features.filter(f=>f.properties.country===country))).digest('hex'),h,'Preserved fallback '+country);
for(const [country,iso]of cases){assert(world.features.some(f=>f.properties.country===country));assert(meta.topology.atlasCodes.includes(iso));assert(!meta.topology.backgroundCodes.includes(iso));}
console.log('All existing interactive silhouettes preserved; four former background countries now route to their own maps.');
