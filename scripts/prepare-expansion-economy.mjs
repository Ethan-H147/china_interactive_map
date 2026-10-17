// Official regional GDP, kept separate from geometry and population-card builds.
// --refresh deliberately upgrades retained source extracts; ordinary rebuilds are offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
const require=createRequire(import.meta.url),{unzipSync,strFromU8}=createRequire(require.resolve('mapshaper'))('fflate');
const retained='scripts/statistics-sources/expansion-economy',cache='artifacts/economy-source',refresh=process.argv.includes('--refresh');
fs.mkdirSync(retained,{recursive:true});fs.mkdirSync(cache,{recursive:true});
const today=new Date().toISOString().slice(0,10),hash=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
const catalogue=c=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/'+c+'/catalogue.bin'))).records;
async function download(file,url,kind){
 const path=cache+'/'+file;let bytes;
 if(!refresh&&fs.existsSync(path))bytes=fs.readFileSync(path);
 else{const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(url+' HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());}
 if(kind==='zip')assert.equal(bytes.subarray(0,2).toString(),'PK',file+' must be a real archive, not an HTML redirect');
 if(kind==='json')assert(!JSON.parse(bytes).error,file+' no API error');
 fs.writeFileSync(path,bytes);return {bytes,url,sha256:hash(bytes)};
}
async function retain(file,build){
 const path=retained+'/'+file;if(!refresh&&fs.existsSync(path))return read(path);
 const data=await build();fs.writeFileSync(path,JSON.stringify(data,null,1)+'\n');return data;
}
function csv(text){
 const out=[];let cells=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(c===','&&!quoted){cells.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;cells.push(cell.trim());if(cells.some(Boolean))out.push(cells);cells=[];cell='';}else cell+=c;}
 if(cell||cells.length){cells.push(cell.trim());out.push(cells);}const header=out.shift().map(x=>x.replace(/^\uFEFF/,''));return out.map(row=>Object.fromEntries(header.map((h,i)=>[h,row[i]||''])));
}
function zipText(bytes,match){const zip=unzipSync(bytes),name=Object.keys(zip).find(match);assert(name,'Archive member');return strFromU8(zip[name]);}
const normal=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function decodeEuro(j){
 const indexes=j.id.map(id=>Object.keys(j.dimension[id].category.index).sort((a,b)=>j.dimension[id].category.index[a]-j.dimension[id].category.index[b]));
 return Object.entries(j.value||{}).map(([offset,value])=>{let rest=+offset;const at={value,status:j.status?.[offset]};for(let i=j.id.length-1;i>=0;i--){at[j.id[i]]=indexes[i][rest%j.size[i]];rest=Math.floor(rest/j.size[i]);}return at;});
}
const rates=await retain('exchange.json',async()=>{
 const url='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ert_bil_eur_a?format=JSON&statinfo=AVG&sinceTimePeriod=2020&currency=USD&currency=CAD&currency=CHF&currency=MXN';
 const source=await download('expansion-exchange.json',url,'json'),j=JSON.parse(source.bytes),values={};
 for(const r of decodeEuro(j))(values[r.currency]??={})[r.time]=r.value;
 return {retrieved:today,url,sha256:source.sha256,updated:j.updated,values};
});
const datasets={};
for(const country of ['germany','belgium','netherlands']){
 datasets[country]=await retain(country+'.json',async()=>{
  const records=catalogue(country).filter(r=>country==='netherlands'?r.level===1:r.level<=2),raw={},sources=[];
  for(let i=0;i<records.length;i+=45){
   const batch=records.slice(i,i+45),url='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp?format=JSON&unit=MIO_EUR&unit=EUR_HAB&sinceTimePeriod=2022&'+batch.map(r=>'geo='+r.id).join('&');
   const source=await download(country+'-gdp-'+i+'.json',url,'json'),j=JSON.parse(source.bytes);sources.push({url,sha256:source.sha256,updated:j.updated});
   for(const r of decodeEuro(j)){const row=raw[r.geo]??={name:j.dimension.geo.category.label[r.geo],years:{}};(row.years[r.time]??={})[r.unit]={value:r.value,status:r.status};}
  }
  const rows={};
  for(const r of records){const entry=raw[r.id],year=Object.keys(entry?.years||{}).filter(y=>entry.years[y].MIO_EUR&&entry.years[y].EUR_HAB).sort().at(-1);assert(year,r.id+' official GDP and per capita');
   const data=entry.years[year];rows[r.id]={name:entry.name,year:+year,gdp:data.MIO_EUR.value*1e6,gdpPerCapita:data.EUR_HAB.value,status:[data.MIO_EUR.status,data.EUR_HAB.status].some(s=>s?.includes('p'))?'provisional':undefined,sourceGeo:r.id};}
  return {retrieved:today,currency:'EUR',provider:'Eurostat · nama_10r_3gdp',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table',sources,rows};
 });console.log(country,Object.keys(datasets[country].rows).length,'GDP regions');
}
function excelRows(bytes){
 const zip=unzipSync(bytes),xml=k=>strFromU8(zip[k]);
 const unescape=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
 const strings=[...xml('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>x[1]).join('')));
 return [...xml('xl/worksheets/sheet1.xml').matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(m=>({row:+m[1],cells:[...m[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map(c=>{const value=/<v>(.*?)<\/v>/.exec(c[2])?.[1];return /t="s"/.test(c[1])?strings[+value]:value===undefined?'':Number.isNaN(+value)?value:+value;})}));
}
datasets.switzerland=await retain('switzerland.json',async()=>{
 const total=await download('swiss-gdp.xlsx','https://dam-api.bfs.admin.ch/hub/api/dam/assets/orderNr:je-e-04.02.06.01/master','zip');
 const capita=await download('swiss-gdp-pc-official.xlsx','https://dam-api.bfs.admin.ch/hub/api/dam/assets/orderNr:je-e-04.02.06.03/master','zip');
 const a=excelRows(total.bytes),b=excelRows(capita.bytes);assert.match(a[0].cells[0],/GDP.*per canton/);assert.match(b[0].cells[0],/GDP.*per capita/);
 const years=a.find(r=>r.row===2).cells.slice(1),pcYears=b.find(r=>r.row===2).cells.slice(1);
 const year=Math.max(...years.map(v=>parseInt(v)).filter(v=>pcYears.some(p=>parseInt(p)===v))),column=years.findIndex(y=>parseInt(y)===year)+1,pcColumn=pcYears.findIndex(y=>parseInt(y)===year)+1;
 // FSO order is the official canton number (1–26), independent of translated names.
 const totals=a.filter(r=>r.row>=5&&r.row<=30),per=b.filter(r=>r.row>=5&&r.row<=30);assert.equal(totals.length,26);assert.equal(per.length,26);
 const rows={};for(let i=0;i<26;i++){assert.equal(totals[i].cells[0],per[i].cells[0]);rows['CH-K-'+(i+1)]={name:totals[i].cells[0],year,gdp:+totals[i].cells[column]*1e6,gdpPerCapita:+per[i].cells[pcColumn],status:String(years[column-1]).includes('p')?'provisional':undefined};}
 return {retrieved:today,currency:'CHF',provider:'Swiss Federal Statistical Office · cantonal GDP and GDP per capita',url:'https://www.bfs.admin.ch/bfs/en/home/statistics/national-economy/national-accounts/gross-domestic-product-canton.html',sources:[{url:total.url,sha256:total.sha256},{url:capita.url,sha256:capita.sha256}],rows};
});console.log('switzerland',Object.keys(datasets.switzerland.rows).length,'GDP cantons');
datasets['united-states']=await retain('united-states.json',async()=>{
 const source=await download('us-gdp-all.zip','https://apps.bea.gov/regional/zip/SAGDP.zip','zip');
 const all=csv(zipText(source.bytes,n=>/SAGDP1__ALL_AREAS.*\.csv$/.test(n))).filter(r=>r.LineCode==='3');
 const populationSource=await download('us-population.csv','https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/state/totals/NST-EST2025-ALLDATA.csv');
 const population=csv(populationSource.bytes.toString()).filter(r=>r.SUMLEV==='040'),gdpByName=new Map(all.map(r=>[r.GeoName,r])),popByName=new Map(population.map(r=>[r.NAME,r]));
 const latest=Math.max(...Object.keys(all[0]).filter(k=>/^\d{4}$/.test(k)).map(Number));const rows={};
 for(const r of catalogue('united-states').filter(r=>!r.overseas)){const g=gdpByName.get(r.en),p=popByName.get(r.en);assert(g&&p,r.id+' official rows');assert.equal(g.Unit,'Millions of current dollars');const year=latest;assert(+g[year]>0&&+p['POPESTIMATE'+year]>0);const total=+g[year]*1e6,denominator=+p['POPESTIMATE'+year];rows[r.id]={name:r.en,year,gdp:total,gdpPerCapita:total/denominator,populationValue:denominator,populationYear:year,populationDate:year+'-07-01',populationSource:'usGdpPopulation',calculated:true};}
 return {retrieved:today,currency:'USD',provider:'US Bureau of Economic Analysis · SAGDP1 line 3, annual current-dollar GDP',url:'https://www.bea.gov/data/gdp/gdp-state',sources:[{url:source.url,sha256:source.sha256},{url:populationSource.url,sha256:populationSource.sha256}],populationUrl:populationSource.url,rows,national:{year:latest,gdp:+all.find(r=>r.GeoFIPS==='00000')[latest]*1e6}};
});console.log('united-states',Object.keys(datasets['united-states'].rows).length,'GDP states/DC');
datasets.canada=await retain('canada.json',async()=>{
 const source=await download('canada-gdp.zip','https://www150.statcan.gc.ca/n1/tbl/csv/36100222-eng.zip','zip');
 const data=csv(zipText(source.bytes,n=>n==='36100222.csv')).filter(r=>r.Prices==='Current prices'&&r.Estimates==='Gross domestic product at market prices');
 assert(data.length,'Canada current-price market-price GDP');
 const population=await download('canada-population.zip','https://www150.statcan.gc.ca/n1/tbl/csv/17100009-eng.zip','zip'),people=csv(zipText(population.bytes,n=>n==='17100009.csv'));
 const year=Math.max(...data.map(r=>+r.REF_DATE)),rows={};
 for(const r of catalogue('canada')){const g=data.find(x=>x.GEO===r.en&&+x.REF_DATE===year),p=people.find(x=>x.GEO===r.en&&x.REF_DATE===year+'-07-01');assert(g&&p,r.id+' GDP/population '+year);assert.equal(g.SCALAR_FACTOR,'millions');const total=+g.VALUE*1e6,denominator=+p.VALUE;rows[r.id]={name:r.en,year,gdp:total,gdpPerCapita:total/denominator,populationValue:denominator,populationYear:year,populationDate:year+'-07-01',populationSource:'canadaGdpPopulation',calculated:true};}
 return {retrieved:today,currency:'CAD',provider:'Statistics Canada · Table 36-10-0222-01, expenditure-based GDP at current market prices',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3610022201',populationUrl:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901',sources:[{url:source.url,sha256:source.sha256},{url:population.url,sha256:population.sha256}],rows,national:{year,gdp:+data.find(x=>x.GEO==='Canada'&&+x.REF_DATE===year).VALUE*1e6}};
});console.log('canada',Object.keys(datasets.canada.rows).length,'GDP provinces/territories');
datasets.mexico=await retain('mexico.json',async()=>{
 const source=await download('mexico-gdp.zip','https://www.inegi.org.mx/contenidos/programas/pibent/2018/datosabiertos/pibe_datos_abiertos_csv.zip','zip'),zip=unzipSync(source.bytes),raw={};
 const aliases={ags:'AGU',bc:'BCN',bcs:'BCS',camp:'CAM',coah:'COA',col:'COL',chis:'CHP',chih:'CHH',cdmx:'CMX',dgo:'DUR',gto:'GUA',gro:'GRO',hgo:'HID',jal:'JAL',mex:'MEX',mich:'MIC',mor:'MOR',nay:'NAY',nl:'NLE',oax:'OAX',pue:'PUE',qro:'QUE',qr:'ROO',slp:'SLP',sin:'SIN',son:'SON',tab:'TAB',tamps:'TAM',tlax:'TLA',ver:'VER',yuc:'YUC',zac:'ZAC'};
 let national,year;
 for(const file of Object.keys(zip).filter(n=>/entidad_.*\.csv$/.test(n))){const table=csv(strFromU8(zip[file])),row=table.find(r=>/^Millones de pesos\|B\.1bP---Producto interno bruto/.test(r.Descriptores));assert(row,file+' nominal GDP, not GVA or real GDP');
  const latest=Object.keys(row).filter(k=>/^\d{4}/.test(k)).sort().at(-1);year=parseInt(latest);const value=+row[latest]*1e6;
  // Match the entity's own file label, preserving Mexico City separately from the State of Mexico.
  const label=file.split('entidad_')[1].replace(/\d{4}_p\.csv$/,'').replace(/\x82/g,'e');if(label==='nac'){national={year,gdp:value};continue;}const id='MX-'+aliases[label];assert(aliases[label],'INEGI entity file '+label);raw[id]={year,gdp:value,status:latest.includes('<P>')?'provisional':undefined};
 }
 const pop=await download('conapo-data.csv','https://repodatos.atdt.gob.mx/CONAPO/proyecciones/00_Pob_Mitad_1950_2070.csv'),counts={};
 for(const row of csv(pop.bytes.toString()))if(+row.ANIO===year&&+row.CVE_GEO>=1&&+row.CVE_GEO<=32)counts[+row.CVE_GEO]=(counts[+row.CVE_GEO]||0)+ +row.POBLACION;
 const iso=['AGU','BCN','BCS','CAM','COA','COL','CHP','CHH','CMX','DUR','GUA','GRO','HID','JAL','MEX','MIC','MOR','NAY','NLE','OAX','PUE','QUE','ROO','SLP','SIN','SON','TAB','TAM','TLA','VER','YUC','ZAC'],rows={};
 for(const r of catalogue('mexico')){const g=raw[r.id],code=iso.indexOf(r.id.slice(3))+1,p=counts[code];assert(g&&p,r.id+' nominal GDP and annual CONAPO population');rows[r.id]={...g,name:r.en,gdpPerCapita:g.gdp/p,populationValue:p,populationYear:year,populationDate:year+'-07-01',populationSource:'mexicoGdpPopulation',calculated:true};}
 return {retrieved:today,currency:'MXN',provider:'INEGI · PIBE, current-price GDP at market prices including net taxes on products',url:'https://www.inegi.org.mx/programas/pibent/2018/',populationUrl:'https://www.datos.gob.mx/dataset/proyecciones-de-poblacion/resource/de522924-f4d8-4523-a6fd-6b2efe73f3af',sources:[{url:source.url,sha256:source.sha256},{url:pop.url,sha256:pop.sha256}],rows,national};
});console.log('mexico',Object.keys(datasets.mexico.rows).length,'GDP states/entities');
// Apply metrics to the current geometry/population cards without replacing their population periods.
for(const [country,data]of Object.entries(datasets)){
 const path='dist/data/europe/'+country+'/statistics.json',statistics=read(path);
 const source=country+'Gdp',populationSource=Object.values(data.rows).find(r=>r.populationSource)?.populationSource;
 statistics.sources[source]={title:data.provider,url:data.url,license:country==='germany'||country==='belgium'||country==='netherlands'?'CC BY 4.0':country==='united-states'?'Public domain':'Official statistics, attribution required'};
 statistics.sources.economyExchange={title:'Eurostat · annual average exchange rates (ert_bil_eur_a)',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table',license:'CC BY 4.0'};
 if(populationSource)statistics.sources[populationSource]={title:country==='united-states'?'US Census Bureau · same-year July 1 state population estimates':country==='canada'?'Statistics Canada · same-year July 1 population estimates, Table 17-10-0009-01':'CONAPO · same-year midyear state population projections, 2020–2070',url:data.populationUrl,license:'Official statistics, attribution required'};
 let count=0;
 for(const [key,record]of Object.entries(statistics.regions)){
  const r=data.rows[key.slice(country.length+1)];delete record.gdp;delete record.gdpPerCapita;if(!r)continue;
  const currency=data.currency,localPerUsd=currency==='USD'?1:currency==='EUR'?1/rates.values.USD[r.year]:rates.values[currency][r.year]/rates.values.USD[r.year];assert(localPerUsd>0,currency+' annual conversion '+r.year);
  const common={year:r.year,currency,priceBasis:'current',source,...(r.status?{status:r.status}:{}),...(currency!=='USD'?{exchangeRate:localPerUsd,exchangeYear:r.year,exchangeSource:'economyExchange'}:{})};
  record.gdp={...common,value:r.gdp,usd:r.gdp/localPerUsd};
  record.gdpPerCapita={...common,value:r.gdpPerCapita,usd:r.gdpPerCapita/localPerUsd,...(r.calculated?{method:'calculated',populationValue:r.populationValue,populationYear:r.populationYear,populationSource:r.populationSource,note:'Annual nominal GDP divided by '+r.populationDate+' population; the population card retains its separate stated reference date.'}:{})};
  record.note='GDP and GDP per capita describe this administrative division at current market prices ('+r.year+'). '+(r.sourceGeo?'Eurostat region '+r.sourceGeo+'. ':'')+(r.calculated?'Per capita is calculated using same-year July 1 population. ':'Per capita uses the statistical office’s published population basis. ')+(currency==='USD'?'Figures are in US dollars.':'USD equivalents use the same year’s annual average exchange rate.');count++;
 }
 statistics.economy={retrieved:data.retrieved,retainedSource:'scripts/statistics-sources/expansion-economy/'+country+'.json',coveredRegions:count,years:[...new Set(Object.values(data.rows).map(r=>r.year))].sort(),scope:country==='germany'?'States and districts / independent cities':country==='belgium'?'Regions and provinces / Brussels equivalent':country==='netherlands'?'Provinces':country==='switzerland'?'Cantons':'First-level administrative divisions'};
 fs.writeFileSync(path,JSON.stringify(statistics)+'\n');
 fs.writeFileSync('dist/data/europe/'+country+'/economy-sources.json',JSON.stringify({provider:data.provider,url:data.url,populationUrl:data.populationUrl,currency:data.currency,retrieved:data.retrieved,sources:data.sources,national:data.national,coverage:statistics.economy,exchange:{url:rates.url,updated:rates.updated,sha256:rates.sha256}},null,2)+'\n');
 console.log('Applied',country,count,'GDP pairs',statistics.economy.years);
}
