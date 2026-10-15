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
 eurostatGdpNuts2:{title:'Eurostat · Gross domestic product at current market prices by NUTS 2 region (nama_10r_2gdp; NUTS 1 for French regions)',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_2gdp/default/table',license:'CC BY 4.0'},
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

// GDP for a unit made of one or more Eurostat regions: summed totals, and per head from
// their combined average population when there are several.
function combinedGdp(rows,codes,year,source){
 const parts=codes.map(code=>rows[code]);assert(parts.every(p=>p?.MIO_EUR?.[year]!=null),'Eurostat '+codes.join('+')+' '+year);
 const total=parts.reduce((s,p)=>s+p.MIO_EUR[year],0);
 const perHead=parts.length===1?(parts[0].EUR_HAB?.[year]!=null?{value:parts[0].EUR_HAB[year]}:null):{value:total*1e6/parts.reduce((s,p)=>s+p.MIO_EUR[year]*1e6/p.EUR_HAB[year],0),method:'calculated'};
 return gdpMetrics({year,value:total},perHead,source);
}
const latestYear=(rows,codes)=>Math.min(...codes.map(code=>Math.max(...Object.keys(rows[code]?.MIO_EUR||{}).filter(y=>rows[code].MIO_EUR[y]!=null).map(Number))));
async function eurostatGdp(name,prefix,nuts2){
 return retain(name,async()=>{
  const out={retrieved:today,nuts2:{},nuts3:{}};
  for(const unit of ['MIO_EUR','EUR_HAB']){
   const a=await eurostat('nama_10r_2gdp',`unit=${unit}&sinceTimePeriod=2019&`+nuts2.map(g=>'geo='+g).join('&'));for(const [g,v] of Object.entries(a.rows))(out.nuts2[g]??={label:a.labels[g]})[unit]=v;
   const b=await eurostat('nama_10r_3gdp',`unit=${unit}&sinceTimePeriod=2019&geoLevel=nuts3`);for(const [g,v] of Object.entries(b.rows))if(g.startsWith(prefix)&&!g.endsWith('ZZZ'))(out.nuts3[g]??={label:b.labels[g]})[unit]=v;
  }
  return out;
 });
}
const mappedArea=country=>({title:'Boundary-derived area',url:`data/europe/${country}/sources.json`,note:'Spherical area calculated from the displayed boundary polygon, not an independently surveyed land area.'});

async function spain(){
 const catalogue=readCatalogue('spain');
 // Population: INE official municipal register figures at 1 January 2025 (table 29005).
 const population=await retain('spain-population-2025.json',async()=>{
  const url='https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/29005?nult=1&tip=AM',series=await(await fetch(url,{signal:AbortSignal.timeout(600000)})).json(),values={};
  for(const s of series){const muni=s.MetaData.find(m=>m.T3_Variable==='Municipios'),sex=s.MetaData.find(m=>m.T3_Variable==='Sexo');if(muni&&sex?.Codigo==='0'){const d=s.Data.find(x=>x.Anyo===2025);if(d)values[muni.Codigo]=d.Valor;}}
  return {url,table:'29005',title:'Cifras oficiales del padrón por municipio',date:'2025-01-01',retrieved:today,values};
 });
 const gdp=await eurostatGdp('spain-gdp-eurostat.json','ES',['ES11','ES12','ES13','ES21','ES22','ES23','ES24','ES30','ES41','ES42','ES43','ES51','ES52','ES53','ES61','ES62','ES63','ES64','ES70']);
 sources.esPopulation={title:'INE · Cifras oficiales de población de los municipios españoles: Revisión del Padrón Municipal at 1 January 2025 (table 29005)',url:'https://www.ine.es/jaxiT3/Tabla.htm?t=29005',data:population.url,license:'INE reuse terms (attribution)'};
 sources.mappedArea=mappedArea('spain');
 const communityNuts={'01':'ES61','02':'ES24','03':'ES12','04':'ES53','05':'ES70','06':'ES13','07':'ES41','08':'ES42','09':'ES51','10':'ES52','11':'ES43','12':'ES11','13':'ES30','14':'ES62','15':'ES22','16':'ES21','17':'ES23','18':'ES63','19':'ES64'};
 // Provinces ↔ NUTS 3; the Balearic and Canary provinces are the sums of their island units.
 const provinceNuts={'15':['ES111'],'27':['ES112'],'32':['ES113'],'36':['ES114'],'33':['ES120'],'39':['ES130'],'01':['ES211'],'20':['ES212'],'48':['ES213'],'31':['ES220'],'26':['ES230'],'22':['ES241'],'44':['ES242'],'50':['ES243'],'28':['ES300'],'05':['ES411'],'09':['ES412'],'24':['ES413'],'34':['ES414'],'37':['ES415'],'40':['ES416'],'42':['ES417'],'47':['ES418'],'49':['ES419'],'02':['ES421'],'13':['ES422'],'16':['ES423'],'19':['ES424'],'45':['ES425'],'06':['ES431'],'10':['ES432'],'08':['ES511'],'17':['ES512'],'25':['ES513'],'43':['ES514'],'03':['ES521'],'12':['ES522'],'46':['ES523'],'07':['ES531','ES532','ES533'],'04':['ES611'],'11':['ES612'],'14':['ES613'],'18':['ES614'],'21':['ES615'],'23':['ES616'],'29':['ES617'],'41':['ES618'],'30':['ES620'],'51':['ES630'],'52':['ES640'],'35':['ES704','ES705','ES708'],'38':['ES703','ES706','ES707','ES709']};
 const covered=new Set(Object.values(provinceNuts).flat());assert.deepEqual(Object.keys(gdp.nuts3).filter(g=>!covered.has(g)),[],'Every Spanish NUTS 3 unit is assigned');
 const people=r=>r.id.startsWith('ES-M-')&&r.parent!=='ES-P-54'?population.values[r.id.slice(5)]:undefined;
 const missing=catalogue.records.filter(r=>r.id.startsWith('ES-M-')&&r.parent!=='ES-P-54'&&people(r)===undefined);assert.deepEqual(missing.map(r=>r.id),[],'Every municipality has INE population');
 const regions={},children=new Map();for(const r of catalogue.records)if(r.parent){if(!children.has(r.parent))children.set(r.parent,[]);children.get(r.parent).push(r);}
 const total=r=>r.level===3?people(r):(children.get(r.id)||[]).reduce((s,c)=>{const v=total(c);return v===undefined?s:(s||0)+v;},undefined);
 for(const r of catalogue.records){
  const key='spain:'+r.id,record={name:r.en,level:r.level},count=total(r);
  if(count!==undefined)record.population={value:count,year:2025,date:'2025-01-01',method:'register',source:'esPopulation',periodLabel:'1 January 2025 municipal register'};
  record.area={value:r.areaKm2,unit:'km²',method:'mapped',period:'Boundary-derived estimate',source:'mappedArea'};
  const code=r.id.slice(5);
  if(r.level===1&&communityNuts[code]){const year=latestYear(gdp.nuts2,[communityNuts[code]]);Object.assign(record,combinedGdp(gdp.nuts2,[communityNuts[code]],year,'eurostatGdpNuts2'));record.note=`GDP and GDP per capita are Eurostat ${year} regional accounts at current prices (NUTS 2 ${communityNuts[code]}); per capita uses Eurostat's average population. USD uses the ${year} average euro exchange rate. Area is calculated from the displayed boundary.`;}
  else if(r.level===2&&provinceNuts[code]){const codes=provinceNuts[code],year=latestYear(gdp.nuts3,codes);Object.assign(record,combinedGdp(gdp.nuts3,codes,year,'eurostatGdpNuts3'));record.note=(codes.length>1?`GDP is the sum of Eurostat's ${year} island accounts (${codes.join(', ')}); per capita divides it by their combined average population.`:`GDP and GDP per capita are Eurostat ${year} accounts at current prices (NUTS 3 ${codes[0]}); per capita uses Eurostat's average population.`)+` USD uses the ${year} average euro exchange rate. Area is calculated from the displayed boundary.`;}
  else if(r.id.startsWith('ES-T-'))record.note='A shared territory owned jointly by several municipalities; the municipal register counts its residents in those municipalities.';
  else if(code==='20'||code==='54'||r.parent==='ES-P-54')record.note='Under central administration; these islets and rocks have no registered municipal population.';
  regions[key]=record;
 }
 return regions;
}

// An INSEE web table of populations: {code: municipal population}, where each row's label
// begins with the commune's number within its territory ("11. Anaa", "01 - Acoua").
async function inseeTable(page,prefix,label){
 const html=await (await fetch(page,{headers:{'User-Agent':'boundary-atlas statistics (github.com/Ethan-H147/china_interactive_map)'}})).text();
 const rows=[...html.match(/<table[\s\S]*?<\/table>/)[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map(r=>[...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(c=>c[1].replace(/<[^>]+>/g,'').replace(/&nbsp;|\s+/g,' ').trim()));
 const values={};for(const row of rows){const m=label(row[0]);if(m&&/^[\d ]+$/.test(row[1]))values[prefix(m)]=Number(row[1].replace(/ /g,''));}
 return {page,retrieved:today,values};
}
async function france(){
 const catalogue=readCatalogue('france'),{readXlsx}=await import('./read-xlsx.mjs');
 // Population: INSEE legal populations in force on 1 January 2026 (statistical reference
 // date 1 January 2023), municipal population. Paris, Lyon and Marseille are listed by
 // municipal arrondissement, so each city is the sum of its arrondissements. The file covers
 // the overseas departments except Mayotte, and Saint-Pierre-et-Miquelon, Saint-Barthélemy
 // and Saint-Martin.
 const population=await retain('france-population-2023.json',async()=>{
  const rows=readXlsx(artifacts+'/insee-populations-2023.xlsx').Communes,header=rows.findIndex(r=>r[5]==='Code commune'),values={};
  for(const r of rows.slice(header+1)){if(!r[5])continue;const dep=String(r[2]),code=dep.length===3?dep+String(r[5]).padStart(2,'0').slice(-2):dep+String(r[5]).padStart(3,'0');values[code]=r[7];}
  const cities={'75056':/^751(0[1-9]|1\d|20)$/,'69123':/^6938[1-9]$/,'13055':/^132(0[1-9]|1[0-6])$/};
  for(const [city,arrondissements] of Object.entries(cities)){const parts=Object.keys(values).filter(k=>arrondissements.test(k));assert(parts.length>=9,'Arrondissements of '+city);values[city]=parts.reduce((s,k)=>s+values[k],0);for(const k of parts)delete values[k];}
  return {url:'https://www.insee.fr/fr/statistiques/fichier/8680726/ensemble.xlsx',page:'https://www.insee.fr/fr/statistiques/8680726',reference:'2023-01-01',inForce:'2026-01-01',retrieved:today,values};
 });
 // The territories INSEE counts separately, municipal population by commune: Mayotte's
 // exhaustive count of November 2025 to January 2026 (its authenticating decree is due at the
 // end of 2026), and the censuses of French Polynesia (2022), New Caledonia (2025) and Wallis
 // and Futuna (2023, by district).
 const numbered=territory=>label=>{const m=/^(\d{2})(?:\.| -)\s/.exec(label);return m&&territory+m[1];};
 const overseas={
  mayotte:await retain('france-population-mayotte-2026.json',()=>inseeTable('https://www.insee.fr/fr/statistiques/9021428',c=>c,numbered('976'))),
  polynesia:await retain('france-population-polynesia-2022.json',()=>inseeTable('https://www.insee.fr/fr/statistiques/6689891',c=>c,numbered('987'))),
  caledonia:await retain('france-population-new-caledonia-2025.json',()=>inseeTable('https://www.insee.fr/fr/statistiques/8658726',c=>c,numbered('988'))),
  wallis:await retain('france-population-wallis-futuna-2023.json',()=>inseeTable('https://www.insee.fr/fr/statistiques/7756933',c=>c,label=>({Alo:'98611',Sigave:'98612',Uvea:'98613'})[label]))
 };
 assert.equal(Object.values(overseas.mayotte.values).reduce((s,v)=>s+v,0),323153,'Mayotte 2026 count');
 assert.equal(Object.values(overseas.polynesia.values).reduce((s,v)=>s+v,0),278786,'French Polynesia 2022 census');
 assert.equal(Object.values(overseas.caledonia.values).reduce((s,v)=>s+v,0),264596,'New Caledonia 2025 census');
 assert.equal(Object.values(overseas.wallis.values).reduce((s,v)=>s+v,0),11151,'Wallis and Futuna 2023 census');
 const periods={
  frPopulation:{year:2023,date:'2023-01-01',method:'census',periodLabel:'2023 legal population (in force 2026)'},
  frPopulationMayotte:{year:2026,date:'2026-01-01',method:'census',periodLabel:'Exhaustive count, Nov 2025 – Jan 2026 (decree pending)'},
  frPopulationPolynesia:{year:2022,date:'2022-08-18',method:'census',periodLabel:'2022 census legal population'},
  frPopulationCaledonia:{year:2025,date:'2025-04-22',method:'census',periodLabel:'2025 census legal population (in force 2026)'},
  frPopulationWallis:{year:2023,date:'2023-07-27',method:'census',periodLabel:'2023 census legal population'}
 };
 const commune={};
 for(const [code,v] of Object.entries(population.values))commune[code]={value:v,source:'frPopulation'};
 for(const [key,source] of [['mayotte','frPopulationMayotte'],['polynesia','frPopulationPolynesia'],['caledonia','frPopulationCaledonia'],['wallis','frPopulationWallis']])for(const [code,v] of Object.entries(overseas[key].values))commune[code]={value:v,source};
 // Area: IGN's official commune surface (hectares) as published with the outlines.
 const area=await retain('france-area.json',async()=>{const values={};for(const name of fs.readdirSync(artifacts).filter(n=>/^france-communes-\w+\.geojson$/.test(n)))for(const f of JSON.parse(fs.readFileSync(path.join(artifacts,name))).features)values[f.properties.code]=f.properties.surface;return {source:'geo.api.gouv.fr surface (hectares), IGN ADMIN EXPRESS',values};});
 const gdp=await eurostatGdp('france-gdp-eurostat.json','FR',['FR1','FRB','FRC','FRD','FRE','FRF','FRG','FRH','FRI','FRJ','FRK','FRL','FRM']);
 // The overseas regions are retained separately, so the metropolitan extract is unchanged.
 const overseasGdp=await eurostatGdp('france-overseas-gdp-eurostat.json','FRY',['FRY1','FRY2','FRY3','FRY4','FRY5']);
 for(const level of ['nuts2','nuts3'])Object.assign(gdp[level],overseasGdp[level]);
 sources.frPopulation={title:'INSEE · Populations de référence en vigueur au 1er janvier 2026 (date de référence statistique 1er janvier 2023), municipal population',url:population.page,data:population.url,license:'Etalab Open Licence 2.0'};
 sources.frPopulationMayotte={title:'INSEE · Populations des communes de Mayotte en 2026 (exhaustive count, 27 November 2025 to 10 January 2026), municipal population; to be authenticated by decree',url:overseas.mayotte.page,license:'Etalab Open Licence 2.0'};
 sources.frPopulationPolynesia={title:'INSEE and ISPF · Populations légales des communes de Polynésie française en 2022, municipal population (decree no. 2022-1592)',url:overseas.polynesia.page,license:'Etalab Open Licence 2.0'};
 sources.frPopulationCaledonia={title:'INSEE and ISEE · Populations de référence des communes de Nouvelle-Calédonie en 2025, municipal population (decree no. 2025-966)',url:overseas.caledonia.page,license:'Etalab Open Licence 2.0'};
 sources.frPopulationWallis={title:'INSEE · Populations légales des circonscriptions des îles Wallis et Futuna en 2023, municipal population (decree no. 2023-1233)',url:overseas.wallis.page,license:'Etalab Open Licence 2.0'};
 sources.frArea={title:'IGN ADMIN EXPRESS official commune surface, published by geo.api.gouv.fr',url:'https://geo.api.gouv.fr/decoupage-administratif/communes',license:'Etalab Open Licence 2.0'};
 sources.frMappedArea={title:'Boundary-derived area of the OpenStreetMap land outline (French Southern Lands and Clipperton, which have no communes)',url:'https://www.openstreetmap.org/copyright',license:'Open Data Commons Open Database License 1.0'};
 const regionNuts={'11':'FR1','24':'FRB','27':'FRC','28':'FRD','32':'FRE','44':'FRF','52':'FRG','53':'FRH','75':'FRI','76':'FRJ','84':'FRK','93':'FRL','94':'FRM','01':'FRY1','02':'FRY2','03':'FRY3','04':'FRY4','06':'FRY5'};
 const nuts3ByName=new Map(Object.entries(gdp.nuts3).filter(([g])=>g.length===5).map(([g,v])=>[normal(v.label),g]));
 const children=new Map();for(const r of catalogue.records)if(r.parent){if(!children.has(r.parent))children.set(r.parent,[]);children.get(r.parent).push(r);}
 // A unit without children is a commune (FR-C-), a collectivity that is a single former
 // commune (Saint-Barthélemy, Saint-Martin), or an uninhabited OpenStreetMap territory.
 const leafCode=r=>r.id.startsWith('FR-C-')?r.id.slice(5):{'FR-R-977':'97701','FR-R-978':'97801'}[r.id];
 const leaves=r=>children.has(r.id)?children.get(r.id).flatMap(leaves):[r];
 const uninhabited=r=>leaves(r).every(l=>!leafCode(l));
 const missing=catalogue.records.filter(r=>!children.has(r.id)&&leafCode(r)&&(!commune[leafCode(r)]||!(area.values[leafCode(r)]>0)));
 assert.deepEqual(missing.map(r=>r.id),[],'Every commune has an INSEE population and IGN surface');
 const regions={},unmatched=[];
 for(const r of catalogue.records){
  const key='france:'+r.id,record={name:r.en,level:r.level},parts=leaves(r);
  if(uninhabited(r)){
   record.area={value:r.areaKm2,unit:'km²',method:'mapped',source:'frMappedArea'};
   record.note='No permanent population: the islands host only rotating scientific, military and meteorological staff, or none at all.';
   regions[key]=record;continue;
  }
  const counted=parts.map(l=>commune[leafCode(l)]),source=counted[0].source;assert(counted.every(c=>c.source===source),key+' population from one source');
  record.population={value:counted.reduce((s,c)=>s+c.value,0),...periods[source],source};
  record.area={value:Math.round(parts.reduce((s,l)=>s+area.values[leafCode(l)]/100,0)*100)/100,unit:'km²',method:'reported',source:'frArea'};
  const code=r.id.slice(5);
  if(r.level===1&&regionNuts[code]){const g=regionNuts[code],year=latestYear(gdp.nuts2,[g]);Object.assign(record,combinedGdp(gdp.nuts2,[g],year,'eurostatGdpNuts2'));record.note=`GDP and GDP per capita are Eurostat ${year} regional accounts at current prices (NUTS ${g.length===3?1:2} ${g}); per capita uses Eurostat's average population. USD uses the ${year} average euro exchange rate.`;}
  else if(r.level===2&&r.id.startsWith('FR-D-')){const g=nuts3ByName.get(normal(r.local));if(!g){unmatched.push(r.local);}else{const year=latestYear(gdp.nuts3,[g]);Object.assign(record,combinedGdp(gdp.nuts3,[g],year,'eurostatGdpNuts3'));record.note=`GDP and GDP per capita are Eurostat ${year} accounts at current prices (NUTS 3 ${g}); per capita uses Eurostat's average population. USD uses the ${year} average euro exchange rate.`;}}
  else if(r.overseas||r.id.startsWith('FR-C-')&&catalogue.records.find(p=>p.id===r.parent)?.overseas)record.note??=r.level===1?'GDP is not shown: the overseas collectivities are outside the EU regional accounts.':undefined;
  if(record.note===undefined)delete record.note;
  regions[key]=record;
 }
 assert.deepEqual(unmatched,[],'Every département has NUTS 3 GDP');
 return regions;
}

// British Overseas Territories and Crown Dependencies: each territory's latest official count or
// estimate, from its own statistics office (none publishes for the whole set). Areas are
// boundary-derived. A territory without a permanent population, or whose residents are counted
// elsewhere, gives a note instead.
const ukTerritories={
 'GB-O-AI':{value:13572,year:2011,method:'census',periodLabel:'2011 census (2024 census results not yet published)',source:'aiPopulation'},
 'GB-O-BM':{value:63356,year:2023,date:'2023-12-31',method:'estimate',periodLabel:'Year-end 2023 estimate',source:'bmPopulation'},
 'GB-O-VG':{value:28054,year:2010,method:'census',periodLabel:'2010 census (2023 census results not yet published)',source:'vgPopulation'},
 'GB-O-KY':{value:90577,year:2025,method:'estimate',periodLabel:'Fall 2025 labour force survey estimate',source:'kyPopulation'},
 'GB-O-FK':{value:3662,year:2021,date:'2021-10-10',method:'census',periodLabel:'2021 census, usually resident',source:'fkPopulation'},
 'GB-O-MS':{value:4386,year:2023,method:'census',periodLabel:'2023 census, usual residents (preliminary key findings)',source:'msPopulation'},
 'GB-O-PN':{value:50,year:2025,method:'estimate',periodLabel:'Mid-2025 estimate',source:'pnPopulation'},
 'GB-O-SH-HL':{value:4439,year:2021,date:'2021-02-07',method:'census',periodLabel:'2021 census, resident population',source:'shPopulation'},
 'GB-O-SH-TA':{value:222,year:2026,date:'2026-09-30',method:'estimate',periodLabel:'Resident islanders, 30 September 2026',source:'taPopulation'},
 'GB-O-TC':{value:50828,year:2024,method:'estimate',periodLabel:'2024 estimate (provisional)',source:'tcPopulation'},
 'GB-O-GI':{value:37936,year:2022,date:'2022-11-14',method:'census',periodLabel:'2022 census, usually resident',source:'giPopulation'},
 'GB-X-JE':{value:104490,year:2025,date:'2025-12-31',method:'estimate',periodLabel:'End-2025 estimate (provisional)',source:'jePopulation'},
 'GB-X-IM':{value:84069,year:2021,date:'2021-04-25',method:'census',periodLabel:'2021 census',source:'imPopulation'},
 'GB-X-GG-G':{value:64991,year:2023,date:'2023-03-31',method:'estimate',periodLabel:'March 2023, rolling electronic census',source:'ggPopulation'},
 'GB-X-GG-A':{value:2167,year:2023,date:'2023-03-31',method:'estimate',periodLabel:'March 2023, rolling electronic census',source:'alderneyPopulation'},
 'GB-X-GG-S':{value:562,year:2022,date:'2022-04-27',method:'census',periodLabel:'2022 census',source:'sarkPopulation'}
};
const ukTerritoryNotes={
 'GB-O-IO':'No permanent population: the islands host only military personnel and contractors. Sovereignty is to pass to Mauritius under the treaty signed on 22 May 2025, which is not yet in force.',
 'GB-O-GS':'No permanent population: only government officers, scientists and museum staff, on rotation.',
 'GB-O-SH-AC':'No permanent population: residents are the employees of the organisations operating on the island and their families.',
 'GB-O-SBA':'No separate population is published: the Cypriot residents of the Sovereign Base Areas are counted in the Republic of Cyprus census, and service personnel are not.',
 'GB-O-SBA-A':'No separate population is published: the Cypriot residents of the Sovereign Base Areas are counted in the Republic of Cyprus census, and service personnel are not.',
 'GB-O-SBA-D':'No separate population is published: the Cypriot residents of the Sovereign Base Areas are counted in the Republic of Cyprus census, and service personnel are not.'
};
const ukTerritorySources={
 aiPopulation:{title:'Anguilla Statistics Department · Population and Housing Census 2011',url:'https://statistics.gov.ai/'},
 bmPopulation:{title:'Government of Bermuda, Department of Statistics · Bermuda Digest of Statistics 2024 (estimated year-end population)',url:'https://www.gov.bm/files/media-library/20260413/0c8cf37e-bermuda_digest_of_statistics_2024.pdf'},
 vgPopulation:{title:'Government of the Virgin Islands, Central Statistics Office · Population and Housing Census 2010',url:'https://www.bvi.gov.vg/departments/central-statistics-office-0'},
 kyPopulation:{title:'Cayman Islands Economics and Statistics Office · Labour Force Survey Report, Fall 2025',url:'https://www.eso.ky/storage/page_docums/uploadFilePdf/946/The%20Cayman%20Islands%20Labour%20Force%20Survey%20Report%20Fall%202025%20Final.pdf'},
 fkPopulation:{title:'Falkland Islands Government · Census 2021',url:'https://falklands.gov.fk/policy/2021-census/census'},
 msPopulation:{title:'Government of Montserrat, Statistics Department · Key findings of the 2023 Population and Housing Census',url:'https://www.gov.ms/2024/04/19/key-findings-of-the-2023-population-and-housing-census/'},
 pnPopulation:{title:'Pacific Community (SPC) Statistics for Development Division · Pitcairn Islands mid-2025 population estimate',url:'https://pacificdata.org/updates/blog/did-you-know/2025/07/stat-of-the-week-50-people-is-the-estimated-population-of-the'},
 shPopulation:{title:'St Helena Government · 2021 Population and Housing Census, main report',url:'https://www.sainthelena.gov.sh/documents/Census-2021-Main-Report.pdf'},
 taPopulation:{title:'Tristan da Cunha Government · Population update, 30 September 2026',url:'https://www.tristandc.com/population.php'},
 tcPopulation:{title:'Turks and Caicos Islands Statistics Authority · Population, 2000 to 2024',url:'https://www.gov.tc/stats/statistics/social/5-population'},
 giPopulation:{title:'HM Government of Gibraltar Statistics Office · Census of Gibraltar 2022, usually resident population (as tabulated by City Population)',url:'https://citypopulation.de/en/gibraltar/cities/'},
 jePopulation:{title:'Statistics Jersey · Population and migration 2025: total population',url:'https://stats.je/publication/population-and-migration-2025-total-population/'},
 imPopulation:{title:'Statistics Isle of Man · 2021 Isle of Man Census Report, Part I',url:'https://www.gov.im/media/1375604/2021-01-27-census-report-part-i-final-2.pdf'},
 ggPopulation:{title:'States of Guernsey · Population (Rolling Electronic Census), Guernsey excluding Alderney and Sark',url:'https://www.gov.gg/population'},
 alderneyPopulation:{title:'States of Alderney · Facts and figures (Rolling Electronic Census)',url:'https://alderney.gov.gg/data'},
 sarkPopulation:{title:'States of Guernsey · Sark population, census of 27 April 2022',url:'https://www.gov.gg/population'},
 ukMappedArea:{title:'Boundary-derived land area of the territory outline (OpenStreetMap coastline; Gibraltar from the Spanish IGN boundary data)',url:'https://www.openstreetmap.org/copyright',license:'Open Data Commons Open Database License 1.0'}
};
async function unitedKingdom(){
 const catalogue=readCatalogue('united-kingdom'),{readXlsx}=await import('./read-xlsx.mjs');
 // Population and area: ONS mid-2024 estimates (MYE5), every local authority, county and region.
 const mye=await retain('uk-population-area-mid2024.json',async()=>{
  const rows=readXlsx(artifacts+'/ons-mye24-tables-uk.xlsx').MYE5,header=rows.findIndex(r=>r[0]==='Code'),values={};
  assert.equal(rows[header][3],'Area (sq km)');assert.equal(rows[header][4],'Estimated Population mid-2024');
  for(const r of rows.slice(header+1))if(r[0])values[r[0]]={name:r[1],geography:r[2],areaKm2:r[3],population:r[4]};
  return {url:'https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland/mid2024/mye24tablesuk.xlsx',table:'MYE5',retrieved:today,values};
 });
 // GDP: ONS regional GDP by local authority, current market prices (Table 5) and the
 // population it is divided by (Table 6), latest year.
 const gdp=await retain('uk-gdp-local-authorities.json',async()=>{
  const book=readXlsx(artifacts+'/ons-gdp-local-authorities-1998-2024.xlsx'),table=name=>{const rows=book[name],h=rows.findIndex(r=>r[1]==='LA code'),years=rows[h].slice(3).map(Number),out={};for(const r of rows.slice(h+1))if(r[1])out[r[1]]=Object.fromEntries(years.map((y,i)=>[y,r[3+i]]).filter(([y,v])=>y&&typeof v==='number'));return out;};
  return {url:'https://www.ons.gov.uk/file?uri=/economy/grossdomesticproductgdp/datasets/regionalgrossdomesticproductlocalauthorities/1998to2024/regionalgrossdomesticproductgdplocalauthorities.xlsx',retrieved:today,gdp:table('Table 5'),population:table('Table 6')};
 });
 const itl=await retain('uk-gdp-itl1.json',async()=>{
  const book=readXlsx(artifacts+'/ons-gdp-itl-regions-1998-2024.xlsx'),table=name=>{const rows=book[name],h=rows.findIndex(r=>r[1]==='ITL code'),years=rows[h].slice(3).map(Number),out={};for(const r of rows.slice(h+1))if(r[0]==='ITL1')out[r[1]]=Object.fromEntries(years.map((y,i)=>[y,r[3+i]]).filter(([y,v])=>y&&typeof v==='number'));return out;};
  return {url:'https://www.ons.gov.uk/file?uri=/economy/grossdomesticproductgdp/datasets/regionalgrossdomesticproductallnutslevelregions/1998to2024/regionalgrossdomesticproductgdpbyallinternationalterritoriallevelitlregions.xlsx',retrieved:today,gdp:table('Table 5'),population:table('Table 6')};
 });
 sources.ukGdpItl={title:'Office for National Statistics · Regional gross domestic product: all ITL regions, 1998 to 2024 (Tables 5 and 6, ITL1)',url:'https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/regionalgrossdomesticproductallnutslevelregions',data:itl.url,license:'Open Government Licence v3.0'};
 const gbp=await retain('eurostat-gbp-per-eur.json',async()=>{const e=await eurostat('ert_bil_eur_a','currency=GBP&statinfo=AVG&sinceTimePeriod=2019');return {url:e.url,updated:e.updated,gbpPerEur:e.rows.all};});
 sources.ukPopulation={title:'Office for National Statistics · Mid-year population estimates, United Kingdom, mid-2024 (MYE5)',url:'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland',data:mye.url,license:'Open Government Licence v3.0'};
 sources.ukArea={title:'Office for National Statistics · Area (sq km) in the mid-2024 population density table (MYE5)',url:sources.ukPopulation.url,data:mye.url,license:'Open Government Licence v3.0'};
 sources.ukGdp={title:'Office for National Statistics · Regional gross domestic product: local authorities, 1998 to 2024 (Tables 5 and 6)',url:'https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/regionalgrossdomesticproductlocalauthorities',data:gdp.url,license:'Open Government Licence v3.0'};
 sources.eurostatGbpExchange={title:'Eurostat · Euro/ECU exchange rates, annual data (ert_bil_eur_a), pound sterling and US dollar averages; USD per GBP is their cross rate',url:sources.eurostatExchange.url,license:'CC BY 4.0'};
 const regionCodes={TLC:'E12000001',TLD:'E12000002',TLE:'E12000003',TLF:'E12000004',TLG:'E12000005',TLH:'E12000006',TLI:'E12000007',TLJ:'E12000008',TLK:'E12000009',TLL:'W92000004',TLM:'S92000003',TLN:'N92000002'};
 const children=new Map();for(const r of catalogue.records)if(r.parent){if(!children.has(r.parent))children.set(r.parent,[]);children.get(r.parent).push(r);}
 // Local authorities under a unit: a two-tier county's districts, or the unit itself.
 const authorities=r=>children.has(r.id)?children.get(r.id).flatMap(authorities):[r.code];
 const year=Math.max(...Object.keys(gdp.gdp.E09000001).map(Number));
 const regions={};
 Object.assign(sources,ukTerritorySources);
 const records=new Map(catalogue.records.map(r=>[r.id,r])),overseas=r=>r.overseas||records.get(r.parent)?.overseas;
 for(const r of catalogue.records.filter(overseas)){
  const key='united-kingdom:'+r.id,record={name:r.en,level:r.level,area:{value:r.areaKm2,unit:'km²',method:'mapped',source:'ukMappedArea'}};
  const parts=catalogue.records.filter(c=>c.parent===r.id),counted=parts.map(c=>ukTerritories[c.id]).filter(Boolean);
  if(ukTerritories[r.id])record.population={...ukTerritories[r.id]};
  else if(counted.length){
   record.population={value:counted.reduce((s,c)=>s+c.value,0),year:Math.max(...counted.map(c=>c.year)),method:'calculated',periodLabel:'Sum of '+parts.filter(c=>ukTerritories[c.id]).map(c=>c.en).join(', '),source:counted[0].source};
   if(parts.some(c=>!ukTerritories[c.id]))record.note=parts.filter(c=>!ukTerritories[c.id]).map(c=>c.en).join(', ')+' has no permanent population.';
  }
  else record.note=ukTerritoryNotes[r.id];
  assert(record.population||record.note,key+' population or note');
  regions[key]=record;
 }
 for(const r of catalogue.records.filter(r=>!overseas(r))){
  const key='united-kingdom:'+r.id,code=r.level===1?regionCodes[r.id.slice(5)]:r.code,m=mye.values[code];assert(m,key+' in MYE5 ('+code+')');
  const sum=authorities(r).reduce((s,c)=>s+mye.values[c].population,0);assert.equal(m.population,sum,key+' population equals its local authorities');
  const record={name:r.en,level:r.level,population:{value:m.population,year:2024,date:'2024-06-30',method:'estimate',source:'ukPopulation',periodLabel:'Mid-2024 estimate'},area:{value:Math.round(m.areaKm2*100)/100,unit:'km²',year:2024,method:'reported',source:'ukArea'}};
  // Regions use ONS's ITL1 accounts. Below them, GDP is summed over local authorities only
  // when ONS publishes every one: its September 2026 release suppresses authorities in eight
  // ITL2 subregions after a conversion error, pending a corrected release.
  const las=authorities(r),usdPerGbp=exchange.usdPerEur[year]/gbp.gbpPerEur[year];
  const accounts=r.level===1?{gdp:itl.gdp[r.id.slice(5)]?.[year],people:itl.population[r.id.slice(5)]?.[year],source:'ukGdpItl'}:las.every(c=>gdp.gdp[c]?.[year]!=null&&gdp.population[c]?.[year])?{gdp:las.reduce((s,c)=>s+gdp.gdp[c][year],0),people:las.reduce((s,c)=>s+gdp.population[c][year],0),source:'ukGdp'}:null;
  if(r.level===1)assert(accounts.gdp>0&&accounts.people>0,key+' ITL1 GDP');
  if(accounts){
   const base={year,currency:'GBP',source:accounts.source,priceBasis:'current',exchangeRate:1/usdPerGbp,exchangeYear:year,exchangeSource:'eurostatGbpExchange'};
   record.gdp={...base,value:accounts.gdp*1e6,usd:accounts.gdp*1e6*usdPerGbp};
   record.gdpPerCapita={...base,value:accounts.gdp*1e6/accounts.people,usd:accounts.gdp*1e6/accounts.people*usdPerGbp,method:'calculated',populationValue:accounts.people,populationYear:year,populationSource:accounts.source};
   record.note=`GDP is the ONS ${year} estimate at current market prices${r.level===1?' for the ITL1 region':las.length>1?`, summed over ${las.length} local authorities`:''} (the latest year is provisional); GDP per capita divides it by the ONS resident population used for those accounts. The population card shows the mid-2024 estimate. USD uses the ${year} average dollar–pound cross rate from Eurostat's euro reference rates.`;
  }else record.note='GDP is not shown: ONS suppressed local-authority estimates in this area in its September 2026 release, after an error in converting to the 2025 ITL subregions, pending a corrected release.';
  regions[key]=record;
 }
 return regions;
}

for(const [country,build] of [['italy',italy],['spain',spain],['france',france],['united-kingdom',unitedKingdom]]){
 const regions=await build(),dir=`dist/data/europe/${country}`,used=new Set(Object.values(regions).flatMap(r=>Object.values(r).map(m=>m?.source).filter(Boolean)).concat(Object.values(regions).flatMap(r=>[r.gdp?.exchangeSource].filter(Boolean))));
 const countrySources=Object.fromEntries(Object.entries(sources).filter(([id])=>used.has(id)));
 fs.writeFileSync(dir+'/statistics.json',JSON.stringify({version:1,retrieved:today,country,sources:countrySources,regions})+'\n');
 fs.writeFileSync(dir+'/statistics-sources.json',JSON.stringify({retrieved:today,sources:countrySources},null,1)+'\n');
 const levels={};for(const r of Object.values(regions))levels[r.level]=(levels[r.level]||0)+1;
 console.log(country,'statistics',levels,'with GDP',Object.values(regions).filter(r=>r.gdp).length);
}
