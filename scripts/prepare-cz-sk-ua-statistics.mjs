import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {readXlsx} from './read-xlsx.mjs';
export const statisticsRoot='scripts/statistics-sources/cz-sk-ua/';
export function statisticsSource(name){const bytes=fs.readFileSync(statisticsRoot+name),meta=load(statisticsRoot+'manifest.json').files[name];assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.sha256,'Pinned statistics source '+name);return bytes;}
const json=name=>JSON.parse(statisticsSource(name));
const workbook=name=>{statisticsSource(name);return Object.values(readXlsx(statisticsRoot+name))[0];};
const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const populationName=s=>norm(String(s).split('(')[0].replace('mestská časť',''));
function euroRows(d){return Object.entries(d.value).map(([key,value])=>{let index=+key;const at={};for(let i=d.id.length-1;i>=0;i--){const name=d.id[i],keys=Object.keys(d.dimension[name].category.index).sort((a,b)=>d.dimension[name].category.index[a]-d.dimension[name].category.index[b]);at[name]=keys[index%d.size[i]];index=Math.floor(index/d.size[i]);}return{...at,value,...(d.status?.[key]?{status:d.status[key]}:{})};});}
const population=(value,year,date,source,method='official population count')=>({value,year,date,source,method,periodLabel:year+' resident population'});
const sources={
 czPopulation:{title:'Czech Statistical Office · Population of municipalities, regions and districts, 1 January 2025; corrected 6 June 2025',url:'https://csu.gov.cz/produkty/population-of-municipalities-t4l3n8d2iw',license:'CC BY 4.0'},
 skPopulation:{title:'Eurostat GISCO · validated Slovak LAU resident population, 1 January 2024',url:'https://gisco-services.ec.europa.eu/distribution/v2/lau/',license:'Eurostat GISCO / EuroGeographics terms'},
 eurostatGdp:{title:'Eurostat · nama_10r_3gdp, regional GDP and GDP per capita at current market prices',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table',license:'CC BY 4.0'},
 eurostatExchange:{title:'Eurostat · annual average USD per EUR, ert_bil_eur_a',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table',license:'CC BY 4.0'},
 ukrstatRegionalGdp:{title:'State Statistics Service of Ukraine · Gross regional product 2004–2021, revised regional accounts',url:'https://stat.gov.ua/en/datasets/regional-accounts'},
 ukraineExchange:{title:'World Bank / IMF IFS · 2021 annual average UAH per US dollar',url:'https://api.worldbank.org/v2/country/UKR/indicator/PA.NUS.FCRF?date=2021&format=json'}
};

export function prepareCzSkUaStatistics(countries=['czechia','slovakia','ukraine']){
 const gdp=json('eurostat-gdp.json'),economicRows=euroRows(gdp),rates=euroRows(json('eurostat-exchange.json'));
 for(const country of countries){
  const base='dist/data/europe/'+country+'/',stats=load(base+'statistics.json'),cat=load(base+'catalogue.bin'),records=cat.records;
  const put=(r,values)=>{const key=country+':'+r.id;stats.regions[key]={...(stats.regions[key]||{name:r.en,level:r.level,parent:r.parent}),...(r.thematic?{thematic:r.thematic}:{}),...values};};
  if(country==='czechia'||country==='slovakia'){
   const cz=country==='czechia',year=cz?2025:2024,date=year+'-01-01',source=cz?'czPopulation':'skPopulation';
   const counts=cz?new Map(workbook('cz-population-local-2025.xlsx').filter(r=>Number.isInteger(r[1])&&r[1]>100000&&Number.isInteger(r[3])).map(r=>[r[1],{value:r[3],name:r[2]}])):new Map(json('sk-population-2024.json').records.map(r=>[+r.GISCO_ID.slice(3),{value:r.POP_2024,name:r.LAU_NAME}]));
   for(const r of records.filter(r=>r.level===3)){const p=counts.get(+r.code);assert(p&&Number.isInteger(p.value)&&p.value>=0,'Official local population '+r.id);assert.equal(populationName(p.name),populationName(r.local),'Population code/name '+r.id);put(r,{population:population(p.value,year,date,source)});}
   for(const level of [2,1])for(const r of records.filter(r=>r.level===level)){const children=records.filter(c=>c.parent===r.id),total=children.reduce((s,c)=>s+stats.regions[country+':'+c.id].population.value,0);assert(children.length,'Population constituents '+r.id);put(r,{population:{...population(total,year,date,source,'sum of official constituent population counts'),note:'Sum of the official constituent local-area counts, using the displayed administrative hierarchy.'}});}
   assert.equal(records.filter(r=>r.level===1).reduce((s,r)=>s+stats.regions[country+':'+r.id].population.value,0),cz?10909500:5424687,'Published national population check');
   if(cz){
    const table=workbook('cz-population-regions-2025.xlsx'),official=new Map(table.filter(r=>/^CZ\d{3}$/.test(r[0])).map(r=>[norm(r[1]),r[2]])),districts=new Map(table.filter(r=>/^CZ[0-9A-Z]{4}$/.test(r[0])).map(r=>[norm(r[1]),r[2]]));
    for(const r of records.filter(r=>r.level<=2)){const expected=r.level===1?official.get(norm(r.local)):r.id==='CZ-D-PRAGUE'?1397880:districts.get(norm(r.local));assert.equal(stats.regions[country+':'+r.id].population.value,expected,'Independent ČSÚ regional/district total '+r.id);}
    const orps=load(base+'administrative-areas/catalogue.bin').records.filter(r=>r.id.startsWith('CZ-ORP-')),published=workbook('cz-population-orp-2025.xlsx').filter(r=>Number.isInteger(r[0])&&Number.isInteger(r[2]));
    for(const r of orps){const row=published.find(p=>norm(p[1])===norm(r.local));assert(row,'Official ORP population '+r.id);put(r,{population:population(row[2],year,date,source),area:{value:r.areaKm2,unit:'km²',year:2026,source:'boundaryArea',method:'mapped',label:'Mapped administrative area'}});}
    assert.equal(orps.length,205);
   }else{
    const cities=load(base+'city-municipalities/catalogue.bin').records;
    for(const r of cities){const districtCodes=r.id==='SK-CITY-bratislava'?[101,102,103,104,105]:[802,803,804,805],children=records.filter(c=>c.level===2&&districtCodes.includes(+c.code)),value=children.reduce((s,c)=>s+stats.regions[country+':'+c.id].population.value,0),area=children.reduce((s,c)=>s+stats.regions[country+':'+c.id].area.value,0);assert.equal(children.length,districtCodes.length);put(r,{population:{...population(value,year,date,source,'sum of official borough population counts'),note:'Whole-city total; its boroughs are counted once.'},area:{value:area,unit:'km²',year:2026,source:'boundaryArea',method:'mapped',label:'Mapped administrative area'}});}
   }
   for(const r of records.filter(r=>r.level===1)){
    const geo=Object.keys(gdp.dimension.geo.category.index).find(code=>norm(gdp.dimension.geo.category.label[code])===norm(r.local));assert(geo,'Exact NUTS region '+r.id);
    const rows=economicRows.filter(row=>row.geo===geo),year=[...new Set(rows.map(row=>row.time))].sort().reverse().find(y=>['MIO_EUR','EUR_HAB'].every(unit=>rows.some(row=>row.time===y&&row.unit===unit&&row.value>0)));assert(year,'Published GDP pair '+geo);
    const fx=rates.find(row=>row.currency==='USD'&&row.time===year&&row.statinfo==='AVG')?.value;assert(fx>0,'Matching annual exchange rate');
    const common={year:+year,currency:'EUR',priceBasis:'current',source:'eurostatGdp',sourceGeo:geo,exchangeYear:+year,exchangeRate:1/fx,exchangeSource:'eurostatExchange',note:'Published regional GDP; not allocated to districts or municipalities.'},money=(unit,multiplier)=>{const row=rows.find(row=>row.time===year&&row.unit===unit);return{...common,value:row.value*multiplier,usd:row.value*multiplier*fx,...(row.status?{status:row.status}:{})};};
    put(r,{gdp:money('MIO_EUR',1e6),gdpPerCapita:money('EUR_HAB',1)});
   }
   Object.assign(stats.sources,{[source]:sources[source],eurostatGdp:sources.eurostatGdp,eurostatExchange:sources.eurostatExchange});
  }else if(country==='ukraine'){
   const rows=Object.values(json('ua-gdp-rows.json'))[0],fx=json('ukraine-exchange-2021.json')[1][0].value;assert(fx>20&&fx<40);assert.equal(+rows[4][18],2021);assert.equal(+rows[4][54],2021);assert(rows[3][1].includes('mln.UAH')&&rows[3][37].includes('Per capita'));
   let count=0,sum=0;for(const r of records.filter(r=>r.level===1)){
    const row=rows.find(row=>norm(row[0])===norm(r.id==='UA-80'?'м.Київ':r.local.replace(/ область$/,'')));
    if(['UA-01','UA-85'].includes(r.id)){assert(!row||typeof row[18]!=='number','No current Crimea/Sevastopol GDP inferred');continue;}
    assert(row&&row[18]>0&&row[54]>0,'Published regional GDP '+r.id);
    const note='2021 historical regional accounts, before the full-scale invasion. Source excludes Crimea, Sevastopol and the occupied parts of Donetsk and Luhansk; not a current wartime estimate.';
    const common={year:2021,currency:'UAH',priceBasis:'current',source:'ukrstatRegionalGdp',exchangeYear:2021,exchangeRate:fx,exchangeSource:'ukraineExchange',period:'2021 · historical',periodLabel:'2021 · historical regional accounts',...(['UA-14','UA-44'].includes(r.id)?{scopeNote:'Excludes occupied parts of the oblast'}:{}),coverageNote:note,note};
    const value=row[18]*1e6,per=row[54];put(r,{gdp:{...common,value,usd:value/fx},gdpPerCapita:{...common,value:per,usd:per/fx}});count++;sum+=row[18];
   }
   assert.equal(count,25);assert.equal(sum,rows[5][18],'Regional GDP sums to published 2021 national accounts total');
   Object.assign(stats.sources,{ukrstatRegionalGdp:sources.ukrstatRegionalGdp,ukraineExchange:sources.ukraineExchange});
  }else throw Error('Unsupported statistics country '+country);
  stats.retrieved='2026-10-23';fs.writeFileSync(base+'statistics.json',JSON.stringify(stats)+'\n');
  console.log(country,'population cards',Object.values(stats.regions).filter(r=>r.population).length,'regional GDP cards',Object.values(stats.regions).filter(r=>r.level===1&&r.gdp).length);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)prepareCzSkUaStatistics(process.argv.slice(2).length?process.argv.slice(2):undefined);
