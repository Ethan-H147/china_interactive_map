import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {metricScale} from '../dist/region-colors.mjs';
import '../dist/countries.js';
const counts={germany:[16,416],belgium:[3,14],netherlands:[12,12],switzerland:[26,26],'united-states':[51,51],canada:[13,13],mexico:[32,32]};
const rates=JSON.parse(fs.readFileSync('scripts/statistics-sources/expansion-economy/exchange.json'));
let total=0;
for(const [country,[firstCount,allCount]]of Object.entries(counts)){
 const root='dist/data/europe/'+country+'/',read=f=>JSON.parse(fs.readFileSync(f));
 const stats=read(root+'statistics.json'),source=read('scripts/statistics-sources/expansion-economy/'+country+'.json'),colors=read('dist/data/region-colors/'+country+'.json'),catalogue=JSON.parse(gunzipSync(fs.readFileSync(root+'catalogue.bin'))).records;
 assert.equal(AtlasCountries.countries[country].colors.economy,true);
 assert.equal(Object.keys(source.rows).length,allCount);
 assert.equal(Object.values(stats.regions).filter(r=>r.gdp&&r.gdp.source===country+'Gdp').length,allCount);
 for(const record of catalogue){
  if(country==='netherlands'&&record.overseas)continue;
  const r=stats.regions[country+':'+record.id],s=source.rows[record.id];
  if(country==='united-states'&&record.level===3){assert(!r?.gdp&&!r?.gdpPerCapita&&!s,'Municipalities never inherit state GDP');continue;}
  assert(r.area&&(r.population||country==='canada'&&r.note?.includes('source does not publish')||country==='mexico'&&record.level===2&&r.note?.includes('does not publish a 2020 census population')||record.populationStatus==='no-permanent-population'||country==='united-states'&&record.level===2&&+record.code.slice(0,2)>=60&&r.note),'Area and available resident population remain available');
  if(!s){assert(!r.gdp&&!r.gdpPerCapita,record.id+' does not inherit a larger region’s GDP');continue;}
  for(const field of ['gdp','gdpPerCapita']){
   const m=r[field];assert.equal(m.value,s[field]);assert.equal(m.year,s.year);assert.equal(m.currency,source.currency);assert.equal(m.priceBasis,'current');assert(stats.sources[m.source]?.url);
   assert(Number.isFinite(m.usd)&&m.usd>0);assert(m.value>0&&m.value<1e14);
   const rate=m.currency==='USD'?1:m.currency==='EUR'?1/rates.values.USD[m.year]:rates.values[m.currency][m.year]/rates.values.USD[m.year];
   assert(Math.abs(m.value/rate-m.usd)<Math.max(.001,m.usd*1e-12),'Same-year annual currency conversion');
   if(m.currency!=='USD'){assert.equal(m.exchangeYear,m.year);assert(stats.sources[m.exchangeSource]?.url);}
  }
  if(s.calculated){
   const m=r.gdpPerCapita;assert.equal(m.populationYear,m.year,record.id+' same-year population denominator');assert.equal(m.populationValue,s.populationValue);assert(stats.sources[m.populationSource]?.url);
   assert(Math.abs(r.gdp.value/m.populationValue-m.value)<1e-6);assert.equal(m.method,'calculated');
  }
  assert(r.gdpPerCapita.value<2e6&&r.gdpPerCapita.value>1000,'Plausible per-person value; no million/billion scale error');
 }
 for(const key of ['gdp','gdpPerCapita']){const scale=metricScale(colors,key,1);assert.equal(scale.count,firstCount+(country==='netherlands'?catalogue.filter(r=>r.overseas&&stats.regions[country+':'+r.id][key]).length:0),country+' complete first-level '+key+' shading');assert.equal(scale.unit,'USD');}
 const sum=Object.values(source.rows).reduce((n,r)=>n+r.gdp,0);
 if(country==='mexico')assert(Math.abs(sum-source.national.gdp)<1,'Mexican state GDP sums to its published national total');
 if(country==='united-states')assert(sum>3e13&&sum<3.2e13,'Annual US state GDP scale and complete coverage');
 if(country==='canada')assert(Math.abs(sum-source.national.gdp)/source.national.gdp<.001,'Canadian territorial coverage, allowing outside-Canada GDP');
 total+=allCount;console.log(country,allCount+' GDP pairs',stats.economy.years.join('/'),source.currency);
}
const us=JSON.parse(fs.readFileSync('dist/data/europe/united-states/statistics.json'));
assert.equal(us.regions['united-states:US-CA'].gdp.value,4297449800000,'BEA California 2025 annual current-dollar GDP, not quarterly or real GDP');
const mx=JSON.parse(fs.readFileSync('dist/data/europe/mexico/statistics.json'));
assert.notEqual(mx.regions['mexico:MX-CMX'].gdp.value,mx.regions['mexico:MX-MEX'].gdp.value,'Mexico City and Mexico state are distinct economies');
assert.equal(mx.regions['mexico:MX-CMX'].gdp.year,2023,'The official retained INEGI export is labeled with its real year');
const ch=JSON.parse(fs.readFileSync('dist/data/europe/switzerland/statistics.json'));
assert.equal(ch.regions['switzerland:CH-K-1'].gdp.year,2022,'The FSO source year is explicit');
assert.equal(ch.regions['switzerland:CH-K-1'].gdp.value,164494808130,'Zurich GDP uses the total-GDP table, not GVA by industry');
console.log(total+' official regional GDP/GDP-per-capita pairs; units, years, per-capita denominators, currency conversions, coverage and unsupported municipality behavior passed.');
