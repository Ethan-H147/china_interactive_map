import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const raw=JSON.parse(fs.readFileSync('scripts/statistics-sources/brazil/state-tables.json'));
const exchange=JSON.parse(fs.readFileSync('scripts/statistics-sources/brazil/exchange-rate-2023.json'))[1].find(r=>r.country.id==='BR'&&r.date==='2023'&&r.indicator.id==='PA.NUS.FCRF');
assert(exchange?.value>0);
const sources={
 'ibge-population':{title:'IBGE population estimates, 1 July 2026',url:raw.sources['populationTable.xlsx'].url,downloadURL:raw.sources['population.txt'].url},
 'ibge-area':{title:'IBGE territorial areas, 2025 · state table AR_BR_UF_2025',url:raw.sources['areaTable.xls'].url},
 'ibge-gdp':{title:'IBGE Regional Accounts, 2023 · current-price GDP',url:raw.sources['gdpTables.zip'].url,downloadURL:raw.sources['gdp.json'].url},
 'ibge-per-capita':{title:'IBGE Regional Accounts, 2023 · reproduced in Amazonas SEDECTI report, PDF page 82',url:raw.sources['stateReport.pdf'].url+'#page=82'},
 'worldbank-exchange':{title:'World Bank / IMF: Brazil annual-average exchange rate, 2023',url:'https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=BR',downloadURL:raw.sources['exchange.txt'].url,license:'CC BY 4.0'}
};
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/brazil-first.bin'))).records;
const regions={};
for(const r of records){
 const v=raw.values[r.id.slice(3)];assert.equal(v?.name,r.local);assert.equal(r.level,1);
 const usd=value=>({usd:value/exchange.value,exchangeYear:2023,exchangeRate:exchange.value,exchangeSource:'worldbank-exchange'});
 regions['brazil:'+r.id]={name:r.en,country:'BR',level:1,
  population:{value:v.population,year:2026,date:'2026-07-01',method:'estimate',source:'ibge-population',note:'Total resident population estimated by IBGE for 1 July 2026.'},
  area:{value:v.area,year:2025,unit:'km²',method:'reported',source:'ibge-area',note:'Official territorial area, including inland water, from IBGE’s 2025 state table; not calculated from the displayed map.'},
  gdp:{value:v.gdp,...usd(v.gdp),year:2023,currency:'BRL',priceBasis:'current',source:'ibge-gdp',note:'Nominal GDP at current 2023 prices. IBGE’s SIDRA figures are in thousands of reais, converted once to reais and cross-checked against the Regional Accounts workbook.'},
  gdpPerCapita:{value:v.gdpPerCapita,...usd(v.gdpPerCapita),year:2023,currency:'BRL',priceBasis:'current',source:'ibge-per-capita',note:'Published IBGE GDP per capita, reproduced to the nearest real in the official SEDECTI statistical report. Uses IBGE’s economic-series population basis, not the 2026 population shown above. GDP per capita measures economic output, not salary or household income.'},
  note:'Population: 2026. Territorial area: 2025. GDP and GDP per capita: 2023. Dollar estimates use the 2023 average exchange rate and are not purchasing-power-parity values. These figures cover the entire state or Federal District; municipalities do not inherit state totals.'
 };
}
assert.equal(Object.keys(regions).length,27);
fs.writeFileSync('dist/data/south-america/brazil-statistics.json',JSON.stringify({version:1,retrieved:raw.retrieved,country:'brazil',sources,regions}));
console.log('Brazil: statistics for all 26 states and Distrito Federal, with matching-year USD estimates.');
