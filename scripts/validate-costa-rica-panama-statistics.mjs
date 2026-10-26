import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import '../dist/countries.js';
const root='scripts/statistics-sources/costa-rica-panama/',manifest=load(root+'manifest.json');
for(const [file,pin]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(root+file)).digest('hex'),pin.sha256,file);
const cases=[['costa-rica','CRI',5044197,2022,{1:7,2:84,3:471},91],['panama','PAN',4064780,2023,{1:13,2:84,3:690},5]];
for(const [country,iso,pop,year,counts,gdpCount]of cases){
 const d=load('dist/data/europe/'+country+'/statistics.json'),cat=load('dist/data/europe/'+country+'/catalogue.bin').records,national=d.regions[country+':'+iso],color=load('dist/data/region-colors/'+country+'.json');
 assert.equal(globalThis.AtlasCountries.countries[country].map.countryStatistics,iso);assert.equal(national.population.value,pop);assert.equal(national.population.year,year);assert.equal(national.gdp.year,2025);assert.equal(national.gdpPerCapita.year,2025);assert(Math.abs(national.gdp.value/national.gdpPerCapita.value-national.gdpPerCapita.populationValue)<.01);
 const metrics=id=>d.regions[country+':'+id];
 for(const level of [1,2,3])assert.equal(cat.filter(r=>r.level===level&&metrics(r.id).population).length,counts[level]);
 assert.equal(cat.filter(r=>metrics(r.id).gdp).length,gdpCount);
 for(const [key,r]of Object.entries(d.regions)){
  for(const field of ['population','area','gdp','gdpPerCapita'])if(r[field]){const m=r[field];assert(Number.isFinite(m.value)&&m.value>=0,key+' '+field);assert(d.sources[m.source]?.url,key+' metric source');}
  if(r.level>=(country==='costa-rica'?3:2))assert(!r.gdp&&!r.gdpPerCapita,'No national or provincial GDP copied to smaller units');
  if(r.level>0&&!r.population)assert(r.note,'Missing population explained');
 }
 assert.equal(color.records.filter(r=>r.metrics.population).length,Object.values(counts).reduce((a,b)=>a+b,0));assert.equal(color.records.filter(r=>r.metrics.gdp).length,gdpCount);assert(color.records.every(r=>r.level>0),'National figures stay out of subdivision colours');
 if(country==='costa-rica'){
  assert.equal(metrics('CR-C-612').population.value,5386);assert.equal(metrics('CR-C-613').population.value,10644);assert.equal(metrics('CR-C-601').population.value,136311);assert.equal(metrics('CR-C-607').population.value,33442);
  assert(!metrics('CR-D-60110').population,'No assumed zero for Isla del Coco');assert(!metrics('CR-D-30201').population,'Old district count not assigned after subdivision');assert(!metrics('CR-D-30206').population,'New district count not invented');
  assert.equal(metrics('CR-C-101').population.value,352381);assert.equal(metrics('CR-D-10101').population.value,2759);
  assert.equal(metrics('CR-C-101').gdp.value,8064851580000);assert.equal(metrics('CR-C-612').gdp.value,27750820000);assert.equal(metrics('CR-C-613').gdp.value,24345590000);assert(metrics('CR-C-407').gdpPerCapita.usd<200000,'Colones are converted to dollars before comparison');
  assert.equal(metrics('CR-P-1').gdp.method,'calculated');assert.equal(metrics('CR-C-101').gdpPerCapita.method,'published');
 }else{
  assert.equal(metrics('PA-D-1307').population.value,258221,'La Chorrera district total survives its same-name city subtotal');assert.equal(metrics('PA-D-0810').population.value,280777);assert.equal(metrics('PA-C-100101').population.value,12954);assert(!metrics('PA-D-0105').population);assert(!metrics('PA-D-0102').population);assert(!metrics('PA-C-010210').population);
  assert(Math.abs(metrics('PA-P-08').gdp.value-51919465567.99726)<1);assert.equal(metrics('PA-P-08').gdp.status,'estimated');assert(Math.abs(metrics('PA-P-08').gdpPerCapita.value-29956.854178323196)<.001);assert(!metrics('PA-P-03').gdp,'Colón plus Kuna Yala total is not pure Colón GDP');assert(!metrics('PA-P-10').gdp,'No comarca allocation invented');
 }
 console.log(country+': official national and subdivision population, exact GDP coverage, dates, denominators, sources, missing data and map colours passed.');
}

