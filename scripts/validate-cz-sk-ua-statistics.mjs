import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from './geo-index.mjs';
import {statisticsSource,statisticsRoot} from './prepare-cz-sk-ua-statistics.mjs';
import {metricScale,comparisonRecords} from '../dist/region-colors.mjs';
import '../dist/countries.js';
for(const name of Object.keys(load(statisticsRoot+'manifest.json').files))statisticsSource(name);
for(const [country,counts,national,year]of [['czechia',[14,77,6258],10909500,2025],['slovakia',[8,79,2927],5424687,2024]]){
 const stats=load('dist/data/europe/'+country+'/statistics.json'),cat=load('dist/data/europe/'+country+'/catalogue.bin'),colors=load('dist/data/region-colors/'+country+'.json');
 assert(globalThis.AtlasCountries.countries[country].colors.economy);
 for(const [i,count]of counts.entries()){
  const records=cat.records.filter(r=>r.level===i+1);assert.equal(records.length,count);
  assert.equal(comparisonRecords(colors,i+1).length,count,'Overlapping optional areas stay outside the ordinary hierarchy scale');
  let total=0;for(const r of records){const s=stats.regions[country+':'+r.id];assert(Number.isInteger(s.population.value)&&s.population.value>=0);assert.equal(s.population.year,year);assert(stats.sources[s.population.source].url);total+=s.population.value;if(i){assert(!s.gdp&&!s.gdpPerCapita,'Regional GDP is not assigned to smaller units');}else{assert(s.gdp.value>0&&s.gdpPerCapita.value>0);assert.equal(s.gdp.year,2024);assert.equal(s.gdp.year,s.gdp.exchangeYear);assert.equal(s.gdp.sourceGeo,s.gdpPerCapita.sourceGeo);assert.equal(s.gdp.currency,'EUR');assert.equal(s.gdp.priceBasis,'current');assert(Math.abs(s.gdp.value/s.gdp.exchangeRate-s.gdp.usd)<.01);}}
  assert.equal(total,national,'Complete population coverage at level '+(i+1));
 }
 assert.equal(metricScale(colors,'gdp',1).count,counts[0]);assert.equal(metricScale(colors,'gdpPerCapita',1).count,counts[0]);
 for(const r of cat.records){const m=colors.records.find(c=>c.id===r.id).metrics,s=stats.regions[country+':'+r.id];assert.equal(m.population.value,s.population.value);assert(Math.abs(m.populationDensity.value-s.population.value/s.area.value)<1e-8);}
 console.log(country,'population at all three levels, regional economy, density and comparison coverage verified');
}
const ua=load('dist/data/europe/ukraine/statistics.json'),colors=load('dist/data/region-colors/ukraine.json');
const economic=Object.values(ua.regions).filter(r=>r.level===1&&r.gdp);assert.equal(economic.length,25);assert.equal(economic.reduce((sum,r)=>sum+r.gdp.value,0),5450849e6);
assert.equal(ua.regions['ukraine:UA-80'].gdp.value,1276376e6,'2021 revised Kyiv city GDP, not the archive’s older 2019 workbook');
assert.equal(ua.regions['ukraine:UA-80'].gdpPerCapita.value,431616,'Published per-capita column, not GDP per worker');
assert.equal(ua.regions['ukraine:UA-32'].gdp.value,291519e6,'Kyiv oblast remains distinct from Kyiv city');
for(const r of economic){assert.equal(r.gdp.year,2021);assert.equal(r.gdp.currency,'UAH');assert.equal(r.gdp.priceBasis,'current');assert(r.gdp.coverageNote.includes('historical'));assert.equal(r.gdp.exchangeYear,2021);assert(Math.abs(r.gdp.usd*r.gdp.exchangeRate-r.gdp.value)<.001);}
for(const id of ['UA-01','UA-85']){assert(!ua.regions['ukraine:'+id].gdp);assert(!colors.records.find(r=>r.id===id).metrics.gdp,'Missing observations are not zero');}
assert(Object.values(ua.regions).filter(r=>r.level===2).every(r=>!r.gdp&&!r.gdpPerCapita));assert.equal(metricScale(colors,'gdp',1).count,25);assert(globalThis.AtlasCountries.countries.ukraine.colors.economy);
console.log('Ukraine: 25 historical regional GDP pairs, correct workbook/columns, currency conversion and unavailable territories verified');
