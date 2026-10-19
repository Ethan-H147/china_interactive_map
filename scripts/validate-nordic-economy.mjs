import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readEconomy,root} from './fetch-nordic-economy.mjs';
import {decodeStat} from './denmark-statistics.mjs';
import {metricScale} from '../dist/region-colors.mjs';
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.json')))readEconomy(name.slice(0,-5));
const stats=Object.fromEntries(['norway','sweden','finland'].map(c=>[c,JSON.parse(fs.readFileSync('dist/data/europe/'+c+'/statistics.json'))]));
const colors=Object.fromEntries(Object.keys(stats).map(c=>[c,JSON.parse(fs.readFileSync('dist/data/region-colors/'+c+'.json'))]));
const count=(country,field,level)=>Object.values(stats[country].regions).filter(r=>(!level||r.level===level)&&r[field]).length;
assert.equal(count('sweden','gdp',1),21);assert.equal(count('sweden','gdp',2),290);assert.equal(count('sweden','gdpPerCapita'),311);
assert.equal(count('finland','gdp',1),19);assert.equal(count('finland','gdpPerCapita',1),19);assert.equal(count('finland','gdp',2),0);
assert.equal(count('norway','gva'),9);assert.equal(count('norway','gvaPerCapita'),8);assert.equal(count('norway','gdp'),0);assert.equal(count('norway','gva',2),0);
assert.equal(stats.sweden.regions['sweden:SE-01'].gdp.value,2128287e6);assert.equal(stats.sweden.regions['sweden:SE-M-0180'].gdp.value,1270181e6);assert.equal(stats.sweden.regions['sweden:SE-M-0180'].gdpPerCapita.value,1272000);
assert.equal(stats.finland.regions['finland:FI-21'].gdp.value,1634.6e6);assert.equal(stats.finland.regions['finland:FI-21'].gdpPerCapita.value,53681.8);assert.equal(stats.finland.regions['finland:FI-01'].gdp.value,108432.7e6);
assert.equal(stats.norway.regions['norway:NO-03'].gva.value,832563e6);assert.equal(stats.norway.regions['norway:NO-03'].gvaPerCapita.value,832563e6/713373.5);
for(const code of ['31','32','33','39','40','55','56']){const r=stats.norway.regions['norway:NO-'+code];assert(!r.gva&&!r.gdp);assert.match(r.note,/former combined/);}
assert.equal(stats.norway.regions['norway:NO-SJ'].gva.value,2310e6);assert(!stats.norway.regions['norway:NO-SJ'].gvaPerCapita);for(const id of ['NO-JM','NO-BV','NO-PI','NO-QM'])assert(!stats.norway.regions['norway:'+id].gva);
const fx=decodeStat(readEconomy('exchange')),rate=(currency,year)=>currency==='EUR'?1:fx.find(r=>r.currency===currency&&r.time===String(year)).value;
for(const [country,data]of Object.entries(stats))for(const [id,r]of Object.entries(data.regions))for(const key of ['gdp','gdpPerCapita','gva','gvaPerCapita'])if(r[key]){
 const m=r[key];assert.equal(m.year,country==='sweden'?2024:2023);assert.equal(m.exchangeYear,m.year);assert.equal(m.priceBasis,'current');assert(data.sources[m.source]?.url);assert(data.sources[m.exchangeSource]?.url);assert.equal(m.exchangeRate,rate(m.currency,m.year)/rate('USD',m.year));assert.equal(m.usd,m.value/m.exchangeRate);assert(m.value>0);
 if(m.method==='calculated'){assert.equal(m.populationYear,m.year);assert(m.populationValue>0);assert(data.sources[m.populationSource]?.url);}
 if(key.startsWith('gdp')){const compare=colors[country].records.find(c=>id===country+':'+c.id);assert.equal(compare.metrics[key].value,m.usd,'Cards and map share the same economic measure');}
}
assert.equal(metricScale(colors.sweden,'gdp',1).count,21);assert.equal(metricScale(colors.sweden,'gdp',2).count,290);assert.equal(metricScale(colors.finland,'gdp',1).count,19);assert.equal(metricScale(colors.finland,'gdp',2),null);assert.equal(metricScale(colors.norway,'gdp'),null);
console.log('Nordic economic coverage, source hashes, published values, GVA distinction, source-year denominators, currencies and map/card agreement passed.');
