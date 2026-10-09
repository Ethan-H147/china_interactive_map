import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist'),retrieved='2026-10-09';
// Transcribed official report tables. GDP values below are rand millions.
const za={
 'ZA-EC':{population:7031109,pop2024:7176230,gdp:557247,area:168966},
 'ZA-FS':{population:3060972,pop2024:3044050,gdp:364919,area:129825},
 'ZA-GP':{population:16295325,pop2024:15931824,gdp:2442020,area:18178},
 'ZA-KZN':{population:12282836,pop2024:12312712,gdp:1184102,area:94361},
 'ZA-LP':{population:6358667,pop2024:6402594,gdp:570666,area:125754},
 'ZA-MP':{population:5161746,pop2024:5057662,gdp:567648,area:76495},
 'ZA-NC':{population:1381772,pop2024:1372943,gdp:164651,area:372889},
 'ZA-NW':{population:4227795,pop2024:4155303,gdp:459802,area:104882},
 'ZA-WC':{population:7722158,pop2024:7562588,gdp:1041394,area:129462},
};
const sz={'SZ-HH':365457,'SZ-LU':244583,'SZ-MA':408336,'SZ-SH':213779};
const ls={'LS-A':566377,'LS-B':122500,'LS-C':361595,'LS-D':269290,'LS-E':170061,'LS-F':159137,'LS-G':110645,'LS-H':77152,'LS-J':101845,'LS-K':138066};
const exchangeRate=18.3286575505;
const source=(title,url,extra={})=>({title,url,...extra});
const sources={
 zaPopulation2026:source('Statistics South Africa · Mid-year population estimates 2026 · Appendix 1','https://www.statssa.gov.za/publications/P0302/P03022026.pdf',{published:'2026-07-30',table:'Appendix 1'}),
 zaPopulation2024:source('Statistics South Africa · Mid-year population estimates 2024 · Appendix 1','https://www.statssa.gov.za/publications/P0302/P03022024.pdf',{table:'Appendix 1',mirror:'https://www.ectreasury.gov.za/upload/2025/stats/P03022024.pdf'}),
 zaGdp2024:source('Statistics South Africa · GDP by province, 2024 · Table 1','https://www.statssa.gov.za/publications/P04412/P044122024.pdf',{published:'2025-09-18',table:'Table 1: GDP by province at current prices, rand million'}),
 zaArea:source('Statistics South Africa · Census 2022 in Brief · Table 2.1','https://www.statssa.gov.za/publications/Census2022inBrief/Census2022inBriefJune2024.pdf',{table:'Table 2.1: Provincial land area'}),
 zaMunicipalPopulation:source('Statistics South Africa · Census 2022 municipal fact sheet · Demographics','https://census.statssa.gov.za/assets/documents/2022/Census_2022_Municipal_factsheet-Web.pdf',{report:'03-01-82',table:'Demographics, printed pages 2–8',note:'The downloaded official edition includes the Thaba Chweu / City of Mbombela population erratum.'}),
 zaExchange:source('World Bank / IMF IFS · Official exchange rate, annual average, 2024','https://data.worldbank.org/indicator/PA.NUS.FCRF?locations=ZA',{download:'https://api.worldbank.org/v2/country/ZAF/indicator/PA.NUS.FCRF?date=2024&format=json',indicator:'PA.NUS.FCRF',value:exchangeRate,unit:'ZAR per USD',license:'CC BY 4.0'}),
 szPopulation:source('Eswatini Central Statistical Office · Population projections 2017–2038 · Table 5.5','https://www.gov.sz/images/Final-2017_2038-POPULATION-PROJECTIONS-1-1.pdf',{table:'Table 5.5: Medium-variant midyear population by region',published:'2020-08',note:'Based on the 2017 census. These are modelled projections, not a new census.'}),
 lsPopulation:source('Lesotho Bureau of Statistics · 2021 Demographic Survey · Table 2.5','https://www.bos.gov.ls/Publications.htm',{download:'https://www.bos.gov.ls/Bos_Reports/Copy%20of%20Demography/2021_LDS_Vol_IIIA_Population_Dynamics_Analytical_Report.zip',table:'Table 2.5: Population by district, 2021 LDS',note:'District counts are estimates from the 2021 demographic survey, not a census or a current-year projection.'}),
};
assert.equal(Object.values(za).reduce((n,r)=>n+r.population,0),63522380);
// Independently rounded provincial estimates can differ slightly from the rounded national total.
assert.ok(Math.abs(Object.values(za).reduce((n,r)=>n+r.pop2024,0)-63015904)<=9);
assert.ok(Math.abs(Object.values(za).reduce((n,r)=>n+r.gdp,0)-7352449)<=1);
assert.ok(Math.abs(Object.values(sz).reduce((n,v)=>n+v,0)-1232154)<=1);
assert.ok(Math.abs(Object.values(ls).reduce((n,v)=>n+v,0)-2076669)<=1);
const census=JSON.parse(await readFile(resolve(root,'scripts/statistics-sources/southern-africa/za-municipal-census-2022.json'),'utf8'));
const normalize=name=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={'drabxuma':'engcobo','ingquzahill':'ngquzahill','khaima':'khoima'};
const counts={};
for(const country of ['south-africa','eswatini','lesotho']){
 const folder=resolve(dist,'data/southern-africa',country);
 const catalogue=JSON.parse(gunzipSync(await readFile(resolve(folder,'catalogue.bin'))));
 const byId=new Map(catalogue.records.map(r=>[r.id,r]));
 assert.equal(byId.size,catalogue.records.length,'Boundary IDs must be unique');
 const boundarySources=JSON.parse(await readFile(resolve(folder,'sources.json'),'utf8'));
 const countrySources={...sources,mappedArea:source('Boundary-derived area · '+country.replaceAll('-',' '),'data/southern-africa/'+country+'/sources.json',{note:'Spherical area calculated from displayed boundary polygons, rounded to 0.1 km². A map estimate; source boundary dates and definitions may differ from statistical reporting.'})};
 const regions={};let populationCount=0;
 for(const r of catalogue.records){
  const key=country+':'+r.id;
  const record={name:r.en,level:r.level,area:{value:r.areaKm2,unit:'km²',method:'mapped',period:'Boundary-derived estimate',source:'mappedArea',note:'Includes any inland water represented in the source polygons; not an independently surveyed land-area statistic.'}};
  assert.ok(record.area.value>0,key+' area');
  if(country==='south-africa'&&r.level===1){
   const values=za[r.id];assert.ok(values,key+' province table');
   record.population={value:values.population,year:2026,date:'2026-07-01',method:'estimate',source:'zaPopulation2026'};
   record.area={value:values.area,unit:'km²',year:2024,method:'reported',source:'zaArea',note:'Official provincial land area in Census 2022 in Brief (June 2024).'};
   const economy={year:2024,currency:'ZAR',source:'zaGdp2024',priceBasis:'current',exchangeRate,exchangeYear:2024,exchangeSource:'zaExchange'};
   record.gdp={...economy,value:values.gdp*1e6,usd:values.gdp*1e6/exchangeRate};
   record.gdpPerCapita={...economy,value:values.gdp*1e6/values.pop2024,usd:values.gdp*1e6/values.pop2024/exchangeRate,method:'calculated',populationValue:values.pop2024,populationYear:2024,populationSource:'zaPopulation2024'};
   record.note='GDP and GDP per capita use 2024 current-price GDP. Per-capita GDP uses the matching 2024 midyear population, while the population card shows the latest 2026 estimate. USD is an estimate using the 2024 annual-average exchange rate.';
  }else if(country==='south-africa'){
   const parent=byId.get(r.parent),province=parent.level===1?parent.id:parent.parent;
   const normalized=normalize(r.en),row=census[province+':'+(aliases[normalized]||normalized)];
   assert.ok(row,key+' has Census 2022 population');
   record.population={value:row.value,year:2022,method:'census',date:'2022-02-02',source:'zaMunicipalPopulation',...(row.code?{sourceCode:row.code}:{})};
   record.note='Municipal population is from Census 2022. Mapped area uses the displayed municipal boundaries; names follow the current boundary catalogue.';
  }else if(country==='eswatini'&&r.level===1){
   record.population={value:sz[r.id],year:2026,date:'2026-07-01',method:'projection',source:'szPopulation',periodLabel:'2026 midyear projection',note:'Medium-variant projection from the 2020 report, based on the 2017 census.'};
   record.note='Regional population is a medium-variant projection, not a 2026 census. Regional GDP has not been verified. Mapped area is calculated from the region’s displayed tinkhundla polygons.';
  }else if(country==='lesotho'&&r.level===1){
   record.population={value:ls[r.id],year:2021,method:'estimate',source:'lsPopulation',periodLabel:'2021 demographic survey',note:'Estimated district population from the Lesotho Demographic Survey; not a census.'};
   record.note='Population is an estimate from the 2021 national demographic survey. Mapped area covers the district, including mountain terrain; it is not the report’s much smaller arable-land area. District GDP has not been verified.';
  }
  if(record.population){assert.ok(record.population.value>0,key+' population');populationCount++;}
  for(const m of Object.values(record))if(m?.source)assert.ok(countrySources[m.source],key+' source exists');
  regions[key]=record;
 }
 assert.equal(Object.keys(regions).length,catalogue.records.length);
 if(country==='south-africa'){
  assert.equal(populationCount,266);
  for(const parent of catalogue.records.filter(r=>r.level===2)){
   const children=catalogue.records.filter(r=>r.parent===parent.id);
   if(!children.length)continue;
   const subtotal=children.reduce((n,r)=>n+regions[country+':'+r.id].population.value,0);
   assert.ok(Math.abs(subtotal-regions[country+':'+parent.id].population.value)<=children.length,`Census subtotal differs for ${parent.id}`);
  }
 }
 else assert.equal(populationCount,country==='eswatini'?4:10);
 const output={version:1,retrieved,country,sources:countrySources,regions};
 await writeFile(resolve(folder,'statistics.json'),JSON.stringify(output,null,2)+'\n');
 await writeFile(resolve(folder,'statistics-sources.json'),JSON.stringify({retrieved,sources:countrySources,coverage:{regions:catalogue.records.length,population:populationCount,gdp:country==='south-africa'?9:0},boundaryCoverage:boundarySources.coverage},null,2)+'\n');
 counts[country]={regions:catalogue.records.length,population:populationCount,gdp:country==='south-africa'?9:0};
}
console.log(JSON.stringify(counts,null,2));
