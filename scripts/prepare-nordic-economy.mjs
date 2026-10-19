import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readEconomy} from './fetch-nordic-economy.mjs';
import {decodeStat} from './denmark-statistics.mjs';
const exchangeSource='nordicExchange';
const exchange={title:'Eurostat · annual average exchange rates, 2023–2024 (national currencies and USD per euro)',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table',license:'CC BY 4.0'};
function pxRows(data){
 const dimensions=data.columns.filter(c=>c.type!=='c'),measures=data.columns.filter(c=>c.type==='c');
 return data.data.map(r=>Object.fromEntries([...dimensions.map((c,i)=>[c.code,r.key[i]]),...measures.map((c,i)=>[c.code,r.values[i]==='..'||r.values[i]==='.'?null:Number(r.values[i])])]));
}
export function applyNordicEconomy(){
 const fx=decodeStat(readEconomy('exchange'));
 const rate=(currency,year)=>currency==='EUR'?1:fx.find(r=>r.currency===currency&&r.time===String(year))?.value;
 function metric(value,currency,year,source,extra={}){
  assert(Number.isFinite(value)&&value>0,'Positive economic value');
  const exchangeRate=rate(currency,year)/rate('USD',year);assert(exchangeRate>0);
  return{value,year,currency,priceBasis:'current',source,usd:value/exchangeRate,exchangeRate,exchangeYear:year,exchangeSource,...extra};
 }
 function open(country){
  const file='dist/data/europe/'+country+'/statistics.json',data=JSON.parse(fs.readFileSync(file));data.sources[exchangeSource]=exchange;
  for(const r of Object.values(data.regions))for(const key of ['gdp','gdpPerCapita','gva','gvaPerCapita'])delete r[key];
  return{data,save(){data.economyRetrieved='2026-10-19';fs.writeFileSync(file,JSON.stringify(data)+'\n');}};
 }
 const sw=open('sweden'),swSource='scbRegionalGDP';
 sw.data.sources[swSource]={title:'Statistics Sweden · Regional accounts 2024, ESA 2010, current prices; published 24 June 2026',url:'https://www.scb.se/hitta-statistik/statistik-efter-amne/nationalrakenskaper/nationalrakenskaper/regionalrakenskaper/pong/statistiknyhet/regionalrakenskaper-2024/',license:'Statistics Sweden open data, source attribution'};
 let swCount=0;
 for(const [name,total,perCapita,level]of [['sweden-counties','NR0105AH','NR0105AJ',1],['sweden-municipalities','NR0105AW','NR0105AY',2]])for(const row of pxRows(readEconomy(name))){
  const id=level===1?'SE-'+row.Region:'SE-M-'+row.Region,r=sw.data.regions['sweden:'+id];if(!r)continue;
  assert.equal(r.level,level);r.gdp=metric(row[total]*1e6,'SEK',2024,swSource);r.gdpPerCapita=metric(row[perCapita]*1000,'SEK',2024,swSource,{note:'Published GRDP per capita; SCB reports this measure rounded to the nearest thousand SEK. It uses the source-year population, not the newer population card.'});swCount++;
 }
 assert.equal(swCount,311);sw.data.economyCoverage={gdp:311,gdpPerCapita:311,year:2024};sw.save();
 const fi=open('finland'),fiSource='statFinRegionalGDP';
 fi.data.sources[fiSource]={title:'Statistics Finland · Regional accounts, tables 12bd and 12bc; GDP at current market prices and published GDP per capita, 2023',url:'https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__altp/',license:'CC BY 4.0'};
 const fiHead=new Map(decodeStat(readEconomy('finland-gdp-per-capita')).map(r=>[r.alue_23_20250101,r.value]));let fiCount=0;
 for(const row of decodeStat(readEconomy('finland-gdp'))){assert.equal(row.timeperiod_y,'2023');assert.equal(row.taloustoimi_1_20180101,'B1GMH');assert.equal(row.contentscode,'CP');const id='FI-'+row.alue_23_20250101.slice(2),r=fi.data.regions['finland:'+id];assert(r?.level===1,id);r.gdp=metric(row.value*1e6,'EUR',2023,fiSource);r.gdpPerCapita=metric(fiHead.get(row.alue_23_20250101),'EUR',2023,fiSource,{note:'Published GDP per capita uses the national accounts population denominator for 2023, not the newer population card.'});fiCount++;}
 assert.equal(fiCount,19);fi.data.economyCoverage={gdp:19,gdpPerCapita:19,year:2023,note:'Latest published GDP cells are 2023. Preliminary 2024 regional tables report GVA, not GDP. No municipality GDP is assigned from sub-regional units.'};fi.save();
 const no=open('norway'),noSource='ssbRegionalGVA',populationSource='ssbMeanPopulation';
 no.data.sources[noSource]={title:'Statistics Norway · table 09391, regional value added at basic prices, current prices, 2023; corrected 11 March 2026',url:'https://www.ssb.no/en/statbank1/table/09391/',license:'Statistics Norway open data, source attribution'};
 no.data.sources[populationSource]={title:'Statistics Norway · table 03037, mean population, 2023',url:'https://www.ssb.no/en/statbank1/table/03037/',license:'Statistics Norway open data, source attribution'};
 const meanPopulation=new Map(decodeStat(readEconomy('norway-mean-population')).map(r=>[r.Region,r.value]));let noCount=0,noHead=0;
 const predecessors={'31':'Viken','32':'Viken','33':'Viken','39':'Vestfold og Telemark','40':'Vestfold og Telemark','55':'Troms og Finnmark','56':'Troms og Finnmark'};
 for(const row of decodeStat(readEconomy('norway-gva'))){
  const id=row.Region==='21'?'NO-SJ':'NO-'+row.Region,r=no.data.regions['norway:'+id];assert(r?.level===1,id);
  if(predecessors[row.Region]){assert.equal(row.value,null);const note='Separate economic output is not published for this current county in SSB’s latest 2023 regional accounts; that series reports the former combined '+predecessors[row.Region]+' county. Its total is not assigned to the successor counties.';if(!r.note?.includes(note))r.note=[r.note,note].filter(Boolean).join(' ');continue;}
  const value=row.value*1e6;r.gva=metric(value,'NOK',2023,noSource,{note:'Gross value added at current basic prices; this differs from GDP at market prices.'});noCount++;
  const pop=meanPopulation.get(row.Region);if(pop>0){r.gvaPerCapita=metric(value/pop,'NOK',2023,noSource,{method:'calculated',populationSource,populationValue:pop,populationYear:2023,note:'Current-price GVA divided by SSB’s published 2023 mean population. GVA is measured at basic prices and differs from GDP at market prices.'});noHead++;}
 }
 assert.equal(noCount,9);assert.equal(noHead,8);no.data.economyCoverage={gva:9,gvaPerCapita:8,year:2023,note:'Eight current counties and Svalbard have published GVA. Seven counties split in 2024 lack separate values in the latest series. Svalbard has no verified per-capita denominator here. GVA is not presented as GDP or included in GDP map comparisons.'};no.save();
 console.log('Nordic economics: Sweden 21 counties + 290 municipalities (2024 GDP); Finland 19 regions (2023 GDP); Norway 8 counties + Svalbard (2023 GVA), 8 calculated GVA-per-capita values.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)applyNordicEconomy();
