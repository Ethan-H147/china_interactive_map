import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {load} from './geo-index.mjs';

const root='scripts/statistics-sources/costa-rica-panama/';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function prepareCostaRicaPanamaStatistics(){
 const manifest=load(root+'manifest.json');
 for(const [name,pin]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(root+name)).digest('hex'),pin.sha256,name+' retained source');
 const source=(file,title)=>({title,url:manifest.files[file].url});
 const wb=load(root+'worldbank.json')[1];
 const indicator=(iso,id,year)=>{const row=wb.find(r=>r.countryiso3code===iso&&r.indicator.id===id&&+r.date===year);assert(row?.value>0,iso+' '+id);return row.value;};
 const money=(value,currency,year,key,extra={})=>({value,usd:value,currency,year,priceBasis:'current',source:key,...extra});
 const output={},audit={retrieved:manifest.retrieved,countries:{}};
 for(const [country,iso,nationalPopulation,populationYear]of [['costa-rica','CRI',5044197,2022],['panama','PAN',4064780,2023]]){
  const base='dist/data/europe/'+country+'/',data=load(base+'statistics.json'),cat=load(base+'catalogue.bin').records;
  for(const r of Object.values(data.regions))for(const field of ['population','gdp','gdpPerCapita','note','facts'])delete r[field];
  data.retrieved=manifest.retrieved;
  data.sources.worldbank=source('worldbank.json','World Bank WDI: national GDP, GDP per capita, annual population and exchange rates, 2020–2025');
  const gdp=indicator(iso,'NY.GDP.MKTP.CD',2025),perCapita=indicator(iso,'NY.GDP.PCAP.CD',2025),denominator=indicator(iso,'SP.POP.TOTL',2025);
  assert(Math.abs(gdp/perCapita-denominator)<.01,'Same-year national GDP denominator');
  data.regions[country+':'+iso]={name:country==='panama'?'Panama':'Costa Rica',level:0,parent:null,area:{value:cat.filter(r=>r.level===1).reduce((s,r)=>s+r.areaKm2,0),unit:'km²',year:2024,source:'boundaryArea',method:'mapped',label:'Mapped land area'},gdp:money(gdp,'USD',2025,'worldbank'),gdpPerCapita:money(perCapita,'USD',2025,'worldbank',{method:'published',populationYear:2025,populationValue:denominator,scopeNote:'Published using the 2025 annual population series; the population card uses the separately dated national statistical-office count.'})};
  const get=id=>{const r=data.regions[country+':'+id];assert(r,id);return r;};
  const missing=[];
  let sourceNational;
  if(country==='costa-rica'){
   data.sources.population=source('cr-population.xlsx','INEC Costa Rica: 2022 population and housing estimates, table 11, November 2023 workbook');
   const rows=load(root+'cr-population-normalized.json');sourceNational=rows.find(r=>r.level===0).population;
   const aliases={'vasquez de coronado':'vazquez de coronado','leon cortes':'leon cortes castro','tapezco':'tapesco','gutierrez brown':'gutierrez braun','valverde vega':'sarchi'};
   const name=s=>aliases[norm(s)]||norm(s),matches=new Map();
   let province,canton;
   for(const row of rows){
    if(row.level===0)continue;
    if(row.level===1){province=cat.find(r=>r.level===1&&name(r.en)===name(row.name));assert(province,row.name);}
    if(row.level===2){canton=cat.find(r=>r.level===2&&r.parent===province.id&&name(r.en)===name(row.name));assert(canton,row.name);}
    const transfer=row.level===3&&((canton.id==='CR-C-601'&&name(row.name)==='monteverde')?'CR-D-61201':(canton.id==='CR-C-607'&&name(row.name)==='puerto jimenez')?'CR-D-61301':null);
    const r=row.level===1?province:row.level===2?canton:transfer?cat.find(r=>r.id===transfer):cat.find(r=>r.level===3&&r.parent===canton.id&&name(r.en)===name(row.name));
    assert(r,'Unreviewed Costa Rica source identity: '+row.name);assert(!matches.has(r.id),'Duplicate source identity '+r.id);matches.set(r.id,row);
   }
   assert.equal(matches.size,576);
   // The estimate table predates the two canton separations; move whole published districts.
   for(const [old,newId,district]of [['CR-C-601','CR-C-612','CR-D-61201'],['CR-C-607','CR-C-613','CR-D-61301']]){
    const part=matches.get(district);assert(part);matches.set(newId,{...part,level:2,reassigned:true});matches.set(old,{...matches.get(old),population:matches.get(old).population-part.population,reassigned:true});
   }
   // Four cantons gained districts after the estimate geography. Their canton totals remain valid.
   const changedCantons=new Set(['CR-C-302','CR-C-304','CR-C-402','CR-C-611']);
   for(const r of cat){
    const row=matches.get(r.id),reason=r.level===3&&changedCantons.has(r.parent)?'The 2022 estimate table uses an older district division in this canton. Population is shown at canton level until a matching district series is verified.':!row?'No matching population row in the 2022 estimate table.':null;
    if(reason){get(r.id).note=reason;missing.push({id:r.id,reason});continue;}
    get(r.id).population={value:row.population,year:2022,method:'estimate',periodLabel:'2022 population estimate',source:'population',...(row.reassigned?{coverageNote:'Reassembled from the published 2022 district estimate to follow the later canton separation.'}:{})};
   }
   for(const p of cat.filter(r=>r.level===1))assert.equal(cat.filter(r=>r.parent===p.id&&r.level===2).reduce((s,r)=>s+get(r.id).population.value,0),get(p.id).population.value,p.en+' canton sum');
   const exports=load(root+'cr-gdp-public-exports.json'),yearFilter=exports.find(r=>r.page==='Clasificación_cantón'&&r.state?.filters?.some(f=>f.target.column==='Año'));
   assert.deepEqual(yearFilter.state.filters.find(f=>f.target.column==='Año').values,[2022]);
   const gdpRows=fs.readFileSync(root+'cr-cantonal-gdp.csv','utf8').trim().split(/\r?\n/).slice(1).map(r=>r.split(','));assert.equal(gdpRows.length,84);
   const pcRows=exports.find(r=>r.page==='Per cápita'&&r.data).data.trim().split(/\r?\n/).slice(1).map(r=>r.split(','));assert.equal(pcRows.length,84);
   data.sources.cantonalGDP=source('cr-cantonal-gdp.csv','Banco Central de Costa Rica: PIB Cantonal, 2022 current-price canton GDP and published GDP per capita; millions of colones');
   const rate=indicator('CRI','PA.NUS.FCRF',2022);assert(rate>500&&rate<800);
   const crc=(value,extra={})=>({value,usd:value/rate,currency:'CRC',year:2022,priceBasis:'current',source:'cantonalGDP',exchangeSource:'worldbank',exchangeYear:2022,exchangeRate:rate,...extra});
   const economicMatches=new Set();
   for(const row of gdpRows){
    const r=cat.find(r=>r.level===2&&name(r.en)===name(row[0])),pc=pcRows.find(p=>name(p[0])===name(row[0]));assert(r&&pc,'Canton economic identity '+row[0]);assert(!economicMatches.has(r.id));economicMatches.add(r.id);
    assert(+row[1]>0&&+pc[1]>0);get(r.id).gdp=crc(+row[1]*1e6);get(r.id).gdpPerCapita=crc(+pc[1]*1e6,{method:'published',populationYear:2022,scopeNote:'Published by BCCR in millions of colones per person; converted to colones here. Economic output, not personal income.'});
   }
   assert.equal(economicMatches.size,84);
   for(const p of cat.filter(r=>r.level===1)){
    const total=cat.filter(r=>r.parent===p.id&&r.level===2).reduce((s,r)=>s+get(r.id).gdp.value,0),population=get(p.id).population;
    get(p.id).gdp=crc(total,{label:'GDP (sum of cantons)',method:'calculated',scopeNote:'Sum of published 2022 canton GDP within this province.'});
    get(p.id).gdpPerCapita=crc(total/population.value,{method:'calculated',populationYear:2022,populationValue:population.value,populationSource:'population',scopeNote:'Calculated from the province’s summed 2022 canton GDP and its 2022 INEC population estimate.'});
   }
   data.regions[country+':'+iso].note='Provincial GDP sums the 2022 canton accounts; national figures use the separately dated World Bank series. GDP measures output, not personal income. Population is an INEC estimate, not an unadjusted census enumeration.';
  }else{
   data.sources.population=source('pa-population.xls','INEC Panama: 2023 Census, Cuadro 10, population by province, district and corregimiento');
   data.sources.provincialGDP={...source('pa-gdp.xlsx','INEC Panama: provincial GDP at current prices and published GDP per capita, 2024 estimates, Cuadro 19'),license:'CC BY 4.0'};
   const rows=Object.values(load(root+'pa-population-rows.json'))[0];sourceNational=rows[6][6];
   const aliases={'PA-C-040401':'bajo boquete','PA-C-060302':'capuri','PA-C-060405':'penas chatas','PA-C-060607':'sabanagrande','PA-C-070310':'sabanagrande','PA-C-090302':'cerro de plata','PA-C-120310':'roka','PA-C-120403':'jadaberi','PA-C-120511':'el piro no 2','PA-C-120604':'guoroni','PA-C-120803':'guariviara','PA-C-120805':'tuwai','PA-C-010406':'valle del risco'};
   const changed=new Set(['PA-D-0102','PA-C-010210','PA-C-010407','PA-C-050317','PA-C-091002']);
   const matches=new Map(),unmatched=[];let province,district;
   for(let i=6;i<rows.length;i++){
    const row=rows[i];if(!Number.isInteger(row[6])||row[6]<0)continue;
    if(i===760){assert.equal(row[1],'La Chorrera');assert.equal(row[6],65438);continue;}
    if(row[1]&&/^(ciudad de |resto del distrito)/.test(norm(row[1])))continue;
    let r;
    if(row[0]){if(norm(row[0])==='total')continue;province=cat.find(r=>r.level===1&&(norm(r.en)===norm(row[0])||(norm(row[0])==='comarca embera'&&r.id==='PA-P-11')));assert(province,row[0]);district=null;r=province;}
    else if(row[1]){district=cat.find(r=>r.level===2&&r.parent===province.id&&norm(r.en)===norm(row[1]));if(province.id==='PA-P-10'){assert.equal(row[6],32016);continue;}assert(district,row[1]);r=district;}
    else if(row[2])r=cat.find(r=>r.parent===(district?.id||province.id)&&(norm(r.en)===norm(row[2])||aliases[r.id]===norm(row[2])));
    else continue;
    if(!r){unmatched.push({row:i,name:row[2],population:row[6]});continue;}
    assert(!matches.has(r.id),'Duplicate Panama source identity '+r.id);matches.set(r.id,{population:row[6],row:i});
   }
   assert.deepEqual(unmatched.map(r=>norm(r.name)),['el teribe']);
   for(const r of cat){const row=matches.get(r.id),reason=!row?'The 2023 census table does not separately enumerate this later mapped comarca. Its count is not inferred from the older El Teribe corregimiento.':changed.has(r.id)?'The census geography and retained boundary snapshot differ here. Population is withheld until matching territorial coverage is verified.':null;
    if(reason){get(r.id).note=reason;missing.push({id:r.id,reason});continue;}
    get(r.id).population={value:row.population,year:2023,method:'census',periodLabel:'2023 census',source:'population'};
   }
   const table=load(root+'pa-gdp-rows.json')['Cuadro 19-PIB-Corriente 2018-24'];assert.equal(table[5][7],'2024 (E)');assert(/corrientes/i.test(table[1][0]));assert(/corrientes/i.test(table[48][0]));assert(/balboas/i.test(table[3][0]));assert(table.some(row=>/proyecciones.*2010/i.test(row.filter(v=>typeof v==='string').join(' '))));
   assert.equal(indicator('PAN','PA.NUS.FCRF',2024),1,'Balboa/USD parity in the retained annual exchange-rate series');
   const exact=new Set(['PA-P-02','PA-P-06','PA-P-07','PA-P-08','PA-P-13']);
   for(const r of cat.filter(r=>r.level===1)){
    if(!exact.has(r.id)){
     const labels={'PA-P-01':'Bocas del Toro + assigned Ngäbe Buglé area','PA-P-03':'Colón + Kuna Yala','PA-P-04':'Chiriquí + assigned Ngäbe Buglé area','PA-P-05':'Darién + Emberá','PA-P-09':'Veraguas + assigned Ngäbe Buglé area'},label=labels[r.id],row=table.slice(6,16).find(row=>norm(row[0])===norm(r.en));
     if(label&&row)get(r.id).facts=[{label:'GDP: '+label,value:row[7]/1000,unit:' billion PAB',year:2024,source:'provincialGDP',note:'INEC estimate for the combined statistical region. It includes comarca territory and does not describe the province boundary shown on the map.'}];
     get(r.id).note=[get(r.id).note,'The published provincial GDP regions include comarca territory and do not match this map unit; their combined totals are labeled separately and excluded from province GDP colours.'].filter(Boolean).join(' ');continue;
    }
    const total=table.slice(6,16).find(row=>norm(row[0])===norm(r.en)),pc=table.slice(51,61).find(row=>norm(row[0])===norm(r.en));assert(total&&pc,r.en);
    get(r.id).gdp=money(total[7]*1e6,'PAB',2024,'provincialGDP',{status:'estimated',exchangeRate:1,exchangeYear:2024,exchangeSource:'worldbank',scopeNote:'Balboa and US dollar at parity.'});
    get(r.id).gdpPerCapita=money(pc[7],'PAB',2024,'provincialGDP',{status:'estimated',method:'published',populationYear:2024,exchangeRate:1,exchangeYear:2024,exchangeSource:'worldbank',scopeNote:'Uses INEC’s midyear 2024 population projections based on the 2010 census; not the 2023 census count.'});
   }
   data.regions[country+':'+iso].note='Provincial GDP uses the separately dated 2024 INEC estimates. District and corregimiento GDP is not inferred from provincial totals.';
  }
  assert.equal(sourceNational,nationalPopulation);
  assert.equal(cat.filter(r=>r.level===1).reduce((s,r)=>s+get(r.id).population.value,0),nationalPopulation,'Province population sum');
  data.regions[country+':'+iso].population={value:nationalPopulation,year:populationYear,method:country==='panama'?'census':'estimate',periodLabel:country==='panama'?'2023 census':'2022 population estimate',source:'population'};
  audit.countries[country]={population:Object.fromEntries([1,2,3].map(level=>[level,cat.filter(r=>r.level===level&&get(r.id).population).length])),gdp:cat.filter(r=>get(r.id).gdp).map(r=>r.id),missingPopulation:missing};
  output[country]=data;
 }
 for(const [country,data]of Object.entries(output))fs.writeFileSync('dist/data/europe/'+country+'/statistics.json',JSON.stringify(data)+'\n');
 fs.writeFileSync(root+'coverage.json',JSON.stringify(audit,null,2)+'\n');
 console.log('Verified Costa Rica and Panama statistics:',JSON.stringify(Object.fromEntries(Object.entries(audit.countries).map(([k,v])=>[k,{population:v.population,gdp:v.gdp.length,missing:v.missingPopulation.length}]))));
 return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepareCostaRicaPanamaStatistics();
