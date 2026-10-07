import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root='scripts/statistics-sources/argentina';
const tables=JSON.parse(fs.readFileSync(root+'/tables.json','utf8'));
const exchange=Object.fromEntries(JSON.parse(fs.readFileSync(root+'/exchange-rates.json','utf8'))[1].filter(r=>r.value>0).map(r=>[r.date,r.value]));
const divisions=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/argentina-first.bin'))).records;
const sources={
 'indec-population':{title:'INDEC · census-2022-based provincial population projections, 2022–2040',url:tables.files['population.pdf'].url},
 'ign-area':{title:'IGN · Determination of Argentina’s continental, Antarctic and insular surface areas (2022), Table 12',url:tables.files['area.pdf'].url},
 'cepal-real-gva':{title:'CEPAL / ECLAC · Provincial gross value added, 2004–2024, March 2026 release',url:'https://www.cepal.org/es/notas/cepal-actualiza-estimaciones-producto-bruto-geografico-pbg-argentina-2024'},
 'world-bank-ars':{title:'World Bank / IMF IFS · Argentina annual average official exchange rate (ARS per USD)',url:'https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=AR'}
};
const titles={'caba.xlsx':'IDECBA · Buenos Aires City annual PGB, current basic prices','buenos-aires.csv':'Buenos Aires Provincial Statistics Directorate · Annual PBG, current market prices','corrientes.xlsx':'IPECD · Corrientes annual PBG, current basic prices','entre-rios.xlsx':'Entre Ríos DGEC · Annual provincial GVA, current basic prices','jujuy.xlsx':'Jujuy DiPEC · Annual PBG, current basic prices','tucuman.xlsx':'Tucumán Statistics Directorate · Annual PGBT, current market prices','santa-fe.pdf':'Santa Fe IPEC · 2025 preliminary PBG, current basic prices','tierra-del-fuego.pdf':'Tierra del Fuego IPIEC · 2024 preliminary PBG / GVA, current basic prices'};
for(const [file,title]of Object.entries(titles))sources[file]={title,url:tables.files[file].url};
const regions={};
for(const division of divisions){
 const raw=tables.regions[division.id];if(!raw||raw.name!==division.en)throw Error('Province identity mismatch: '+division.id);
 const r={name:division.en,level:1,
  population:{value:raw.population['2026'],year:2026,date:'2026-07-01',method:'projection',source:'indec-population',note:'Official 1 July projection based on the 2022 census; not a new census count.'},
  area:{value:raw.area,unit:'km²',year:2022,method:'reported',source:'ign-area'},
  realGva:{value:raw.realGva,currency:'ARS',year:2024,priceBasis:'constant',baseYear:2004,label:'Gross value added · 2004 prices',source:'cepal-real-gva',note:'CEPAL estimate at basic prices. Inflation-adjusted output valued in 2004 pesos; excludes net product taxes. It is not nominal GDP and cannot be converted using a 2024 exchange rate.'},
  realGvaPerCapita:{value:raw.realGva/raw.population['2024'],currency:'ARS',year:2024,method:'calculated',priceBasis:'constant',baseYear:2004,label:'GVA per capita · 2004 prices',source:'cepal-real-gva',populationSource:'indec-population',populationYear:2024,populationValue:raw.population['2024'],note:'Calculated from CEPAL real gross value added divided by the matching-year INDEC midyear population. Not income per person.'}
 };
 const n=raw.nominal;
 if(n){
  const rate=exchange[n.year];if(!rate)throw Error('Missing same-year exchange rate: '+n.year);
  const common={currency:'ARS',year:n.year,priceBasis:'current',valuation:n.basis,status:n.status,source:n.file,exchangeSource:'world-bank-ars',exchangeRate:rate};
  const basis=n.basis==='market'?'market prices, including product taxes':'basic prices, excluding net product taxes';
  r.gdp={...common,value:n.value,usd:n.value/rate,label:'Regional GDP (PBG)',note:'Provincial output at current '+basis+'. '+n.status[0].toUpperCase()+n.status.slice(1)+' figure. USD uses the same-year annual average official exchange rate, not a parallel-market rate or purchasing-power parity.'};
  const perCapita=n.publishedPerCapita||n.value/raw.population[String(n.year)];
  r.gdpPerCapita={...common,value:perCapita,usd:perCapita/rate,label:'PBG per capita',method:n.publishedPerCapita?'published':'calculated',...(n.publishedPerCapita?{}:{populationSource:'indec-population',populationYear:n.year,populationValue:raw.population[String(n.year)]}),note:n.publishedPerCapita?'Published by IPEC in the same report (page 20); its population denominator can differ from the newer INDEC projection shown above.':'Calculated from provincial PBG divided by the matching-year INDEC midyear population; the 2026 population shown above is not used for older PBG. Not income per person.'};
 }else r.note='A current-price provincial GDP figure has not been verified in this snapshot. The 2024 CEPAL series below provides inflation-adjusted economic output; it is not a substitute for nominal GDP or its USD value.';
 if(division.id==='AR-94'){
  r.area.note='IGN’s continental Americas sector, including Tierra del Fuego and nearby islands (20,698.3 km²). Excludes Antarctic and disputed South Atlantic claims, which are outside the map.';
  r.note=(r.note?r.note+' ':'')+'Area matches the Americas sector displayed in the atlas. Population and economic accounts follow the agencies’ provincial coverage; they are not estimates for omitted claim areas.';
 }
 regions['argentina:'+division.id]=r;
}
const data={version:1,updated:tables.retrieved,country:'argentina',coverage:{regions:24,population:24,reportedArea:24,realGva:24,gdp:Object.values(regions).filter(r=>r.gdp).length,gdpPerCapita:Object.values(regions).filter(r=>r.gdpPerCapita).length},sources,regions};
fs.writeFileSync('dist/data/south-america/argentina-statistics.json',JSON.stringify(data)+'\n');
console.log('Argentina statistics:',JSON.stringify(data.coverage));
