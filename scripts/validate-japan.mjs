import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {validate,fromHash,hashFor} from '../dist/view-state.mjs';
const read=n=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+n+'.bin')));
const data=read('japan-boundaries'),context=read('japan-context'),motion=read('japan-motion'),facts=JSON.parse(fs.readFileSync('dist/data/japan-facts.json')),statistics=JSON.parse(fs.readFileSync('dist/data/region-statistics.json'));
const ids=Array.from({length:47},(_,i)=>'JP-'+String(i+1).padStart(2,'0'));
assert.deepEqual(data.first.features.map(f=>f.properties.id).sort(),ids);
assert.deepEqual(context.features.map(f=>f.properties.id).sort(),ids);
assert.deepEqual(motion['japan-first'].features.map(f=>f.properties.id).sort(),ids);
const coords=c=>typeof c[0]==='number'?1:c.reduce((s,v)=>s+coords(v),0);
const count=fc=>fc.features.reduce((s,f)=>s+coords(f.geometry.coordinates),0);
assert(count(motion['japan-first'])<count(data.first)/3,'Camera geometry should be substantially lighter');
for(const f of data.first.features){const p=f.properties;assert(p.en&&p.ja&&p.capital&&!p.capital.includes('['));assert(p.bounds.flat().every(Number.isFinite));const fact=facts[p.id],r=statistics.regions['japan:'+p.id];assert(fact.population>100000&&fact.populationYear===2025);assert(fs.existsSync('dist/'+fact.flag.file));const svg=fs.readFileSync('dist/'+fact.flag.file,'utf8');assert(svg.includes('<svg'));assert(!/<script|onload=|javascript:/i.test(svg));assert(r.area.value>0&&r.area.unit==='km²');assert(r.gdp.currency==='JPY'&&r.gdp.usd>0&&r.gdpPerCapita.usd>0);assert([2022,2023].includes(r.gdp.year));}
assert.equal(statistics.coverage.japan.regions,47);assert.equal(statistics.coverage.japan.gdp,47);
assert.equal(Object.values(statistics.regions).filter(r=>r.country==='JP'&&r.gdp.year===2023).length,42);
const view=validate({v:1,country:'japan',center:[139.7,35.7],zoom:9,selection:'JP-13',layers:{'j-province-layer':false,'j-label-layer':true}});assert.equal(fromHash(hashFor(view)).selection,'JP-13');assert.equal(view.layers['j-province-layer'],false);
console.log('Japan: 47 prefectures, light motion geometry, safe local flags, source coverage, matching-year statistics and view persistence passed.');
