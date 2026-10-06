import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const dir='scripts/statistics-sources/archipelago/';
const read=file=>JSON.parse(fs.readFileSync(dir+file,'utf8'));
const catalogue=country=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/archipelago/'+country+'-catalogue.bin'))).records.filter(p=>p.level===(country==='indonesia'?1:2)&&!p.special);
const norm=s=>s.toLowerCase().replace(/^[. ]+|\*|\d+\//g,'').replace(/\s+\d+\*?$/,'').replace(/[^a-z]/g,'');
const fx=read('exchange-rates.json')[1];
const exchange={title:'World Bank / IMF IFS: annual average official exchange rate',url:'https://data.worldbank.org/indicator/PA.NUS.FCRF',retrieved:'2026-10-06'};
function money(value,currency,year,source,note){const country=currency==='IDR'?'IDN':'PHL',rate=fx.find(r=>r.countryiso3code===country&&Number(r.date)===year)?.value;assert(rate>0,'Same-year exchange rate required');return{value,currency,year,source,note,usd:value/rate,exchangeRate:rate,exchangeSource:'worldbank-fx'};}
function write(country,regions,sources){const out={version:1,retrieved:'2026-10-06',country,sources:{...sources,'worldbank-fx':exchange},regions};fs.writeFileSync('dist/data/archipelago/'+country+'-statistics.json',JSON.stringify(out));console.log(country,Object.keys(regions).length+' divisions',Object.values(regions).filter(r=>r.gdp).length+' GDP records',fs.statSync('dist/data/archipelago/'+country+'-statistics.json').size+' bytes');}
const book='https://www.bps.go.id/id/publication/2026/02/27/a43f03f45543dc4e9942f44c/statistik-indonesia-2026.html';
const pages=read('bps-yearbook-2026.tables.json');
const gdpPages=read('bps-gdp-2026.tables.json');
const gdpBook='https://www.bps.go.id/en/publication/2026/04/30/f01b7d753185ea2e879d321f/produk-domestik-regional-bruto-provinsi-provinsi-di-indonesia-menurut-pengeluaran-2021-2025.html';
const idSources={
 'bps-population':{title:'BPS Statistical Yearbook of Indonesia 2026, Table 3.1.1',url:book,table:'3.1.1',pdfPage:197,method:'Midyear population projection based on the 2020 census; published in thousands.'},
 'bps-area':{title:'BPS / Ministry of Home Affairs, 2025 provincial areas, Table 1.1.1',url:book,table:'1.1.1',pdfPage:54,method:'Ministerial Decree 300.2.2-2430 of 23 June 2025.'},
 'bps-gdp':{title:'BPS Provincial GRDP by Expenditure 2021–2025, Appendix 1',url:gdpBook,table:'Appendix 1',pdfPage:65},
 'bps-per-capita':{title:'BPS Provincial GRDP by Expenditure 2021–2025, Appendix 121',url:gdpBook,table:'Appendix 121',pdfPage:195}
};
const indonesia={};
function row(page,name){const match=pages[page].split('\n').find(l=>l.startsWith(name+' '));assert(match,'BPS row: '+name+' page '+page);return match.slice(name.length).replace(/https:\/\/www.bps.go.id/g,'').trim();}
const idNumber=s=>Number(s.replace(/\./g,'').replace(',','.'));
function economicRow(page,name){name=name.replace(/Sumatera/g,'Sumatra');const match=gdpPages[page].split('\n').map(l=>l.replace(/^\d+\s+/, '')).find(l=>l.startsWith(name+' '));assert(match,'BPS GDP row '+name);return match.slice(name.length).replace(/https:\/\/www.bps.go.id/g,'').trim().split(/\s+/);}
for(const p of catalogue('indonesia')){
 const local=p.id==='ID34'?'DI Yogyakarta':p.id==='ID31'?'DKI Jakarta':p.local;
 const population=row('197',local).split(/\s+/),gdp=economicRow('65',local),perCapita=economicRow('195',local),area=row('54',local).match(/\b\d[\d.,]+/)[0];
 indonesia['indonesia:'+p.id]={name:p.en,country:'ID',level:1,
  population:{value:Math.round(idNumber(population[2])*1000),year:2026,date:'2026-06',method:'projection',source:'bps-population',note:'BPS midyear projection based on the 2020 census, rounded to the nearest 100 people in the published table.'},
  area:{value:idNumber(area),year:2025,unit:'km²',method:'reported',source:'bps-area',note:'Official provincial area under the 23 June 2025 Ministry of Home Affairs decree.'},
  gdp:money(idNumber(gdp[4])*1e9,'IDR',2025,'bps-gdp','Nominal GRDP at current market prices; 2025 figure is very preliminary. Published in billions of rupiah.'),
  gdpPerCapita:money(idNumber(perCapita[4])*1000,'IDR',2025,'bps-per-capita','Published nominal GRDP per capita uses the 2025 population denominator, rather than the 2026 population shown above. Published in thousands of rupiah.')};
}
write('indonesia',indonesia,idSources);
const censusBase='https://openstat.psa.gov.ph/PXWeb/pxweb/en/DB/DB__1A__PO_2024/';
const ppaBase='https://openstat.psa.gov.ph/PXWeb/pxweb/en/DB/DB__2A__PPA/';
const phSources={
 'psa-population':{title:'PSA 2024 Census: Total Population by Region, Province and HUC',url:censusBase+'0191A6DTHP8.px/',date:'2024-07-01'},
 'psa-area':{title:'PSA 2024 Census: Land Area by Region, Province / HUC',url:censusBase+'0221A6DLPD0.px/',method:'Land Management Bureau / DENR 2019 Masterlist of Land Areas, as reported by PSA in its 2024 census tables.'},
 'psa-gdp':{title:'PSA Provincial Product Accounts: GDP at Current Prices',url:ppaBase+'0012A5FPPA0.px/'},
 'psa-per-capita':{title:'PSA Provincial Product Accounts: GDP per Capita at Current Prices',url:ppaBase+'0092A5FPPA8.px/'}
};
const pop=read('0191A6DTHP8.px.json'),popMeta=read('0191A6DTHP8.px.metadata.json'),land=read('0221A6DLPD0.px.json');
const popLocations=popMeta.variables.find(v=>v.code==='Geographic Location');
const ppa=read('0012A5FPPA0.px.json'),ppaMeta=read('0012A5FPPA0.px.metadata.json'),pc=read('0092A5FPPA8.px.json');
const ppaLocations=ppaMeta.variables.find(v=>v.code==='Geolocation'),years=ppaMeta.variables.find(v=>v.code==='Year');
const censusValue=(data,code,param)=>Number(data.data.find(r=>r.key[0]===code&&r.key[1]===param)?.values[0]);
const philippines={};
const metro=JSON.parse(gunzipSync(fs.readFileSync('dist/data/archipelago/philippines-catalogue.bin'))).records.find(p=>p.id==='PH13');
assert(metro?.level===1,'Metro Manila is a region, not a province');
for(const p of [...catalogue('philippines'),metro]){
 const officialName=p.id==='PH13'?'National Capital Region (NCR)':p.en;
 const i=popLocations.valueTexts.findIndex(name=>norm(name)===norm(officialName)),j=ppaLocations.valueTexts.findIndex(name=>norm(name)===norm(officialName));
 assert(i>=0&&j>=0,'Official PSA match: '+p.en);const censusCode=popLocations.values[i],gdpCode=ppaLocations.values[j];
 const record={name:p.en,country:'PH',level:p.level,
  population:{value:censusValue(pop,censusCode,'0'),year:2024,date:'2024-07-01',method:'census',source:'psa-population',note:'Total population, including household and institutional residents. PSA provincial counts exclude separately reported highly urbanized cities.'},
  area:{value:censusValue(land,censusCode,'3'),period:'2019 land-area basis',unit:'km²',method:'reported',source:'psa-area',note:'Land area from the LMB/DENR 2019 masterlist, reported in the PSA 2024 census table; provincial totals may include contested areas, gaps and overlaps.'},
  note:'PSA statistical province figures exclude separately reported cities. Some city areas are included in the atlas province geometry; the figures follow the official statistical definition.'};
 if(p.id==='PH13'){
  record.note='Metro Manila is the National Capital Region (NCR), a first-level region without provinces. These figures cover the entire NCR, including its cities and Pateros; they are not figures for the City of Manila alone.';
  record.population.note='Total population of the entire National Capital Region, including household and institutional residents, as of 1 July 2024.';
  record.area.note='Whole-region land area from the LMB/DENR 2019 masterlist, as reported in the PSA 2024 census table.';
 }
 if(p.en==='Basilan')record.note+=' Isabela City has its own population, area and GDP records under Region IX and is excluded from these Basilan statistics, although it is geographically shown within Basilan on this map.';
 if(p.en.startsWith('Maguindanao'))record.note+=' Figures refer to this province after the 2022 split of Maguindanao.';
 for(const [field,data,scale,source]of [['gdp',ppa,1000,'psa-gdp'],['gdpPerCapita',pc,1,'psa-per-capita']]){
  const candidates=data.data.filter(r=>r.key[0]===gdpCode&&r.key[1]==='0'&&Number(r.values[0])>0).sort((a,b)=>Number(years.valueTexts[years.values.indexOf(b.key[2])])-Number(years.valueTexts[years.values.indexOf(a.key[2])]));
  if(!candidates.length)continue;const latest=candidates[0],year=Number(years.valueTexts[years.values.indexOf(latest.key[2])]);
  record[field]=money(Number(latest.values[0])*scale,'PHP',year,source,field==='gdp'?'Nominal GDP at current prices. PSA reports the source table in thousands of pesos.':'Published nominal GDP per capita; uses PSA’s population denominator for the economic reference year.');
 }
 assert(record.population.value>0&&record.area.value>0,'Population and area: '+p.en);philippines['philippines:'+p.id]=record;
}
write('philippines',philippines,phSources);
