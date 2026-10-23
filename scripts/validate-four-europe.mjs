import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,polygons,landIndex,lineIndex} from './geo-index.mjs';
import {additions} from './four-europe-config.mjs';
import {source,root} from './fetch-four-europe.mjs';
const expected={'bosnia-herzegovina':[3,72,79],croatia:[21,556,0],romania:[42,3181,0],belarus:[7,118,0]};
for(const name of Object.keys(load(root+'manifest.json').files))source(name);
for(const [country,c]of Object.entries(additions)){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),records=cat.records,ids=new Set(records.map(r=>r.id)),stats=load(base+'statistics.json');
 assert.equal(ids.size,records.length,'Unique '+country+' IDs');
 assert.deepEqual([1,2,3].map(l=>records.filter(r=>r.level===l).length),expected[country],country+' counts');
 for(const r of records){assert(!r.parent||ids.has(r.parent),r.id+' parent');assert(r.en&&r.areaKm2>0);if(r.parent)assert.equal(records.find(p=>p.id===r.parent).level,r.level-1);assert(stats.regions[country+':'+r.id]);}
 for(const [parent,ch]of Object.entries(cat.chunks)){const d=load(base+ch.file);assert.equal(d.regions.features.length,ch.count);for(const f of d.regions.features)assert.equal(records.find(r=>r.id===f.properties.id).parent,parent);}
 const countryStats=stats.regions[country+':'+c.iso];assert(countryStats.population.value>0&&countryStats.gdp.value>0&&countryStats.gdpPerCapita.value>0,'National facts '+country);
 if(c.economy){for(const r of records){const s=stats.regions[country+':'+r.id];assert(Number.isFinite(s.population?.value)&&s.population.value>=0,r.id+' resident population');if(r.level===1){assert(s.gdp.value>0&&s.gdpPerCapita.value>0,r.id+' regional accounts');assert.equal(s.gdp.year,s.gdp.exchangeYear);}else assert(!s.gdp,'No invented municipal GDP');}const total=l=>records.filter(r=>r.level===l).reduce((s,r)=>s+stats.regions[country+':'+r.id].population.value,0);assert.equal(total(1),total(2),'Population rollup');}
 const first=load(base+'first.bin').regions;for(const f of first.features){const r=records.find(r=>r.id===f.properties.id);assert(landIndex(polygons(f.geometry).flat())(r.center),'Label on land '+r.id);}
 assert(fs.existsSync('dist/vendor/flag-'+c.prefix+'.svg'));console.log(country,cat.counts,'hierarchy, sources and statistics valid');
}
const cat=load('dist/data/europe/bosnia-herzegovina/catalogue.bin');assert.equal(cat.records.filter(r=>r.kind==='Canton').length,10);assert(!cat.chunks['BA-BRC'],'Brčko not duplicated');assert(cat.records.filter(r=>r.parent==='BA-SRP').every(r=>r.kind==='Municipality'),'No invented Republika Srpska canton');
console.log('Four European additions validated.');
