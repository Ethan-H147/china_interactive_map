import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const folder='scripts/statistics-sources/russia/';
const raw=JSON.parse(fs.readFileSync(folder+'region-tables.json'));
assert.equal(createHash('sha256').update(fs.readFileSync(folder+'VRP_s_1998.xlsx')).digest('hex'),raw.sources.grp.sha256);
assert.equal(raw.exchange.date,'2024');assert(raw.exchange.value>0);
const sources={
 population:{title:'Rosstat: preliminary resident population, 1 January 2025',url:raw.sources.population.original,reproducedAt:raw.sources.population.url},
 area:{title:'Reported federal subject areas · reference date unspecified',url:raw.sources.area.url},
 gdp:{title:'Rosstat Regional Accounts: current-price regional GDP, 2024',url:raw.sources.grp.url,mirror:raw.sources.grp.mirror},
 exchange:{title:'World Bank / IMF: Russia annual-average official exchange rate, 2024',url:'https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=RU',downloadURL:'https://api.worldbank.org/v2/country/RUS/indicator/PA.NUS.FCRF?format=json&date=2024'}
};
const regions={};
for(const v of Object.values(raw.values)){
 for(const field of ['area','population','gdp','gdpPerCapita'])assert(v[field]>0,v.id+' '+field);
 const usd=value=>({usd:value/raw.exchange.value,exchangeRate:raw.exchange.value,exchangeYear:2024,exchangeSource:'exchange'});
 const separate=v.id==='RU-ARK'?'Arkhangelsk figures exclude the separately displayed Nenets Autonomous Okrug. ':v.id==='RU-TYU'?'Tyumen figures exclude the separately displayed Khanty-Mansi and Yamalo-Nenets autonomous okrugs. ':'';
 regions['russia:'+v.id]={name:v.en,country:'RU',level:1,
  population:{value:v.population,year:2025,method:'estimate',periodLabel:'1 January 2025 · preliminary estimate',source:'population',note:'Rosstat preliminary resident population estimate, reproduced in the federal-subject reference table.'},
  area:{value:v.area,unit:'km²',method:'reported',source:'area',period:'Reference date unspecified',note:'Reported reference-table area, including inland water where included by the source; not measured from map geometry.'},
  gdp:{value:v.gdp,...usd(v.gdp),year:2024,currency:'RUB',priceBasis:'current',source:'gdp',note:'Rosstat gross regional product (regional GDP), at current basic prices. Workbook sheet 2 reports millions of rubles, converted once to rubles.'},
  gdpPerCapita:{value:v.gdpPerCapita,...usd(v.gdpPerCapita),year:2024,currency:'RUB',priceBasis:'current',source:'gdp',note:'Published Rosstat regional GDP per capita, workbook sheet 4. Uses the economic-series annual population basis, rather than the January 2025 population shown above. This measures economic output, not income or salary.'},
  note:separate+'GDP and GDP per capita use the same 2024 Rosstat series. USD estimates use the 2024 annual-average official rate, not current exchange rates or purchasing-power parity. Regional GDP uses basic prices, so national GDP and the sum of regional figures have different tax treatment. Population and area reference dates differ. Districts do not inherit regional totals.'
 };
}
assert.equal(Object.keys(regions).length,83);
fs.mkdirSync('dist/data/russia',{recursive:true});
fs.writeFileSync('dist/data/russia/statistics.json',JSON.stringify({version:1,country:'russia',retrieved:raw.retrieved,sources,regions}));
console.log('Russia: 83 regional cards, with population, area, 2024 GDP and published GDP per capita, and matching-year USD estimates.');
await import('./prepare-russia-cities.mjs');
