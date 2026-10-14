import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
// Population, area and GDP for the European countries, in the shared statistics format.
// Retained source extracts live in scripts/statistics-sources/europe; pass --refresh to
// download them again.
const require=createRequire(import.meta.url);
const mapshaper=require('mapshaper'),{unzipSync,strFromU8}=createRequire(require.resolve('mapshaper'))('fflate');
const refresh=process.argv.includes('--refresh'),retained='scripts/statistics-sources/europe',artifacts='artifacts/europe-source';
fs.mkdirSync(retained,{recursive:true});
const today=new Date().toISOString().slice(0,10);
const readCatalogue=country=>JSON.parse(gunzipSync(fs.readFileSync(`dist/data/europe/${country}/catalogue.bin`)));
async function retain(name,fetcher){const file=path.join(retained,name);if(!refresh&&fs.existsSync(file))return JSON.parse(fs.readFileSync(file));const data=await fetcher();fs.writeFileSync(file,JSON.stringify(data,null,1)+'\n');return data;}
async function download(url,file){if(!refresh&&fs.existsSync(file))return fs.readFileSync(file);const r=await fetch(url,{headers:{'User-Agent':'boundary-atlas statistics (github.com/Ethan-H147/china_interactive_map)'},signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(url+' '+r.status);const bytes=Buffer.from(await r.arrayBuffer());fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return bytes;}

// Eurostat JSON-stat: {geo:{year:value}} for one unit.
const eurostatApi='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
async function eurostat(dataset,query){
 const url=eurostatApi+dataset+'?format=JSON&'+query,r=await fetch(url,{signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(url+' '+r.status);
 const j=await r.json(),dims=j.id,sizes=j.size,index=dims.map(d=>Object.keys(j.dimension[d].category.index).sort((a,b)=>j.dimension[d].category.index[a]-j.dimension[d].category.index[b]));
 const rows={};
 for(const [k,v] of Object.entries(j.value)){let rest=+k;const at={};for(let d=dims.length-1;d>=0;d--){at[dims[d]]=index[d][rest%sizes[d]];rest=Math.floor(rest/sizes[d]);}(rows[at.geo||'all']??={})[at.time]=v;}
 return {url,updated:j.updated,labels:j.dimension.geo?.category.label||{},rows};
}
const latest=(rows,code)=>{const years=Object.keys(rows[code]||{}).filter(y=>rows[code][y]!=null).sort();const year=years.at(-1);return year?{year:+year,value:rows[code][year]}:null;};

// EUR per USD, annual average (Eurostat ert_bil_eur_a gives USD per EUR).
const exchange=await retain('eurostat-usd-per-eur.json',async()=>{const e=await eurostat('ert_bil_eur_a','currency=USD&statinfo=AVG&sinceTimePeriod=2019');return {url:e.url,updated:e.updated,usdPerEur:e.rows.all};});
const sources={
 eurostatGdpNuts2:{title:'Eurostat · Gross domestic product at current market prices by NUTS 2 region (nama_10r_2gdp)',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_2gdp/default/table',license:'CC BY 4.0'},
 eurostatGdpNuts3:{title:'Eurostat · Gross domestic product at current market prices by NUTS 3 region (nama_10r_3gdp)',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table',license:'CC BY 4.0'},
 eurostatExchange:{title:'Eurostat · Euro/ECU exchange rates, annual data (ert_bil_eur_a), US dollar, average',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table',license:'CC BY 4.0'}
};
// One GDP pair (total and per head) in euros, converted with the same year's average rate.
function gdpMetrics(total,perHead,source){
 const rate=exchange.usdPerEur[total.year];assert(rate,'Exchange rate for '+total.year);
 const base={year:total.year,currency:'EUR',source,priceBasis:'current',exchangeRate:1/rate,exchangeYear:total.year,exchangeSource:'eurostatExchange'};
 const gdp={...base,value:total.value*1e6,usd:total.value*1e6*rate};
 const gdpPerCapita=perHead?{...base,value:perHead.value,usd:perHead.value*rate,...(perHead.method?{method:perHead.method}:{})}:null;
 return {gdp,...(gdpPerCapita?{gdpPerCapita}:{})};
}
const normal=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

async function italy(){
 const catalogue=readCatalogue('italy'),records=new Map(catalogue.records.map(r=>[r.id,r]));
 // Population: ISTAT resident population by comune at 1 January 2026 (estimate); age code 999 is the total.
 const population=await retain('italy-population-2026.json',async()=>{
  const url='https://demo.istat.it/data/posas/POSAS_2026_it_Comuni.zip',zip=unzipSync(await download(url,artifacts+'/italy/POSAS_2026_it_Comuni.zip'));
  const csv=strFromU8(zip[Object.keys(zip).find(n=>n.endsWith('.csv'))]),values={},names={};
  for(const line of csv.split(/\r?\n/).slice(2)){const c=line.split(';').map(v=>v.replace(/^"|"$/g,''));if(c[2]==='999'){values[c[0]]=+c[5];names[c[0]]=c[1];}}
  return {url,title:csv.split(/\r?\n/)[0].replace(/^﻿?"|"$/g,''),retrieved:today,values,names};
 });
 // The population file still uses Sardinia's pre-reform comune codes; the 2026 boundaries
 // renumbered them under the new provinces. Names are unique within Sardinia, so match by name.
 const sardinian=Object.keys(population.values).filter(k=>['090','091','092','095','111'].includes(k.slice(0,3))),oldByName=new Map();
 for(const k of sardinian){const n=normal(population.names[k]);assert(!oldByName.has(n),'Unique Sardinian comune name '+n);oldByName.set(n,k);}
 const comuneCode={};
 for(const r of catalogue.records.filter(r=>r.level===3)){const code=r.id.slice(5);if(population.values[code]!==undefined)comuneCode[r.id]=code;else{const old=oldByName.get(normal(r.local));assert(old,'Sardinian comune by name '+r.local);comuneCode[r.id]=old;oldByName.delete(normal(r.local));}}
 assert.equal(oldByName.size,0,'Every pre-reform Sardinian code is used once');
 const people=id=>population.values[comuneCode[id]];
 // Area: ISTAT's published surface (AREA_KMQ in its geographic tables) is the planimetric
 // area of these boundaries, carried in each layer as Shape_Area.
 const area=await retain('italy-area-2026.json',async()=>{
  const zip=unzipSync(fs.readFileSync(artifacts+'/istat-limiti-2026.zip')),out={};
  for(const [dir,key] of [['Reg01012026',r=>'IT-R-'+String(r.COD_REG).padStart(2,'0')],['ProvCM01012026',r=>'IT-P-'+r.COD_UTS],['Com01012026',r=>'IT-C-'+r.PRO_COM_T]]){
   const dbf=Buffer.from(zip[Object.keys(zip).find(k=>k.startsWith(dir+'/')&&k.endsWith('.dbf'))]);
   for(const r of JSON.parse((await mapshaper.applyCommands('-i in.dbf -o out.json format=json',{'in.dbf':dbf}))['out.json']))out[key(r)]=Math.round(r.Shape_Area/1e4)/100;
  }
  return {source:'ISTAT boundaries for statistical purposes at 1 January 2026 (Shape_Area)',values:out};
 });
 const gdp=await retain('italy-gdp-eurostat.json',async()=>{
  const italianNuts2=['ITC1','ITC2','ITC3','ITC4','ITF1','ITF2','ITF3','ITF4','ITF5','ITF6','ITG1','ITG2','ITH1','ITH2','ITH3','ITH4','ITH5','ITI1','ITI2','ITI3','ITI4'];
  const nuts2={},nuts3={};
  for(const unit of ['MIO_EUR','EUR_HAB']){
   const a=await eurostat('nama_10r_2gdp',`unit=${unit}&sinceTimePeriod=2019&`+italianNuts2.map(g=>'geo='+g).join('&'));for(const [g,v] of Object.entries(a.rows))(nuts2[g]??={label:a.labels[g]})[unit]=v;
   const b=await eurostat('nama_10r_3gdp',`unit=${unit}&sinceTimePeriod=2019&geoLevel=nuts3`);for(const [g,v] of Object.entries(b.rows))if(g.startsWith('IT'))(nuts3[g]??={label:b.labels[g]})[unit]=v;
  }
  return {retrieved:today,nuts2,nuts3};
 });
 sources.itPopulation={title:'ISTAT · '+population.title,url:'https://demo.istat.it/app/?i=POS&l=it',data:population.url,license:'CC BY 4.0'};
 sources.itArea={title:'ISTAT · Boundaries of administrative units for statistical purposes, 1 January 2026 (surface area of the official boundaries)',url:'https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/',license:'CC BY 4.0'};
 // Regions ↔ NUTS 2 (Trentino-South Tyrol is the two autonomous provinces combined).
 const regionNuts={'IT-R-01':['ITC1'],'IT-R-02':['ITC2'],'IT-R-03':['ITC4'],'IT-R-04':['ITH1','ITH2'],'IT-R-05':['ITH3'],'IT-R-06':['ITH4'],'IT-R-07':['ITC3'],'IT-R-08':['ITH5'],'IT-R-09':['ITI1'],'IT-R-10':['ITI2'],'IT-R-11':['ITI3'],'IT-R-12':['ITI4'],'IT-R-13':['ITF1'],'IT-R-14':['ITF2'],'IT-R-15':['ITF3'],'IT-R-16':['ITF4'],'IT-R-17':['ITF5'],'IT-R-18':['ITF6'],'IT-R-19':['ITG1'],'IT-R-20':['ITG2']};
 // Provinces ↔ NUTS 3 by name. Sardinia's eight units of 2026 replace the five NUTS 3
 // provinces, so no provincial GDP matches their territories.
 const aliases={};
 const nuts3ByName=new Map(Object.entries(gdp.nuts3).filter(([g])=>g.length===5).map(([g,v])=>[normal(v.label),g]));
 const regions={};let unmatched=[];
 for(const r of catalogue.records){
  const key='italy:'+r.id,record={name:r.en,level:r.level};
  const count=r.level===3?people(r.id):catalogue.records.filter(c=>c.level===3&&(c.parent===r.id||records.get(c.parent)?.parent===r.id)).reduce((s,c)=>s+people(c.id),0);
  assert(count>0,key+' population');
  record.population={value:count,year:2026,date:'2026-01-01',method:'estimate',source:'itPopulation',periodLabel:'1 January 2026 estimate'};
  assert(area.values[r.id],key+' area');record.area={value:area.values[r.id],unit:'km²',year:2026,method:'reported',source:'itArea'};
  if(r.level===1){
   const parts=regionNuts[r.id].map(g=>gdp.nuts2[g]),total=parts.map(p=>latest(p.MIO_EUR? {x:p.MIO_EUR}:{}, 'x'));
   const year=Math.min(...total.map(t=>t.year)),sum=parts.reduce((s,p)=>s+p.MIO_EUR[year],0);
   const perHead=parts.length===1?{value:parts[0].EUR_HAB[year]}:{value:sum*1e6/parts.reduce((s,p)=>s+p.MIO_EUR[year]*1e6/p.EUR_HAB[year],0),method:'calculated'};
   Object.assign(record,gdpMetrics({year,value:sum},perHead,'eurostatGdpNuts2'));
   record.note=parts.length===1?`GDP and GDP per capita are Eurostat ${year} regional accounts at current prices (NUTS 2 ${regionNuts[r.id][0]}); per capita uses Eurostat's average population. USD uses the ${year} average euro exchange rate.`:`GDP is the sum of the two autonomous provinces' ${year} regional accounts (NUTS 2 ITH1 and ITH2); per capita divides it by their combined Eurostat average population. USD uses the ${year} average euro exchange rate.`;
  }else if(r.level===2){
   const code=r.parent==='IT-R-20'?null:nuts3ByName.get(aliases[normal(r.local)]||normal(r.local));
   if(code){const t=latest({x:gdp.nuts3[code].MIO_EUR},'x'),h=gdp.nuts3[code].EUR_HAB?.[t.year];Object.assign(record,gdpMetrics(t,h?{value:h}:null,'eurostatGdpNuts3'));record.note=`GDP and GDP per capita are Eurostat ${t.year} accounts at current prices for NUTS 3 ${code}; per capita uses Eurostat's average population. USD uses the ${t.year} average euro exchange rate.`;}
   else if(r.parent==='IT-R-20')record.note='Sardinia replaced its five provinces with eight units in 2025; Eurostat still reports GDP for the former provinces, so no figure matches this territory.';
   else unmatched.push(r.local);
  }
  regions[key]=record;
 }
 assert.deepEqual(unmatched,[],'Every province outside Sardinia has NUTS 3 GDP: '+unmatched.join(', '));
 return regions;
}

for(const [country,build] of [['italy',italy]]){
 const regions=await build(),dir=`dist/data/europe/${country}`,used=new Set(Object.values(regions).flatMap(r=>Object.values(r).map(m=>m?.source).filter(Boolean)).concat(Object.values(regions).flatMap(r=>[r.gdp?.exchangeSource].filter(Boolean))));
 const countrySources=Object.fromEntries(Object.entries(sources).filter(([id])=>used.has(id)));
 fs.writeFileSync(dir+'/statistics.json',JSON.stringify({version:1,retrieved:today,country,sources:countrySources,regions})+'\n');
 fs.writeFileSync(dir+'/statistics-sources.json',JSON.stringify({retrieved:today,sources:countrySources},null,1)+'\n');
 const levels={};for(const r of Object.values(regions))levels[r.level]=(levels[r.level]||0)+1;
 console.log(country,'statistics',levels,'with GDP',Object.values(regions).filter(r=>r.gdp).length);
}
