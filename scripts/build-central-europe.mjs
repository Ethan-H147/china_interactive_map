import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {prepareAustria,prepareHungary,prepareSlovenia} from './central-europe-units.mjs';
import {source,root} from './fetch-central-europe.mjs';
import {buildRegionalDataset,command,fc} from './build-regional-dataset.mjs';
import {polygons,load} from './geo-index.mjs';
import {resolveCentralFrontiers,reconcileCentralNeighbors,waterFreeLines,save} from './central-europe-frontiers.mjs';
const cache='artifacts/central-europe-prepared.bin';
let prepared;
if(process.argv.includes('--resume')&&fs.existsSync(cache))prepared=JSON.parse(gunzipSync(fs.readFileSync(cache))).map(d=>({...d,units:new Map(d.units)}));
else{prepared=[];for(const prepare of [prepareAustria,prepareHungary,prepareSlovenia]){const d=await prepare();prepared.push(d);console.log('Prepared',d.country,d.bottom.features.length,'local polygons');}fs.writeFileSync(cache,gzipSync(JSON.stringify(prepared.map(d=>({...d,units:[...d.units]}))),{level:9}));}
await resolveCentralFrontiers(prepared);
function eurostat(name){const d=JSON.parse(source(name)),values=[];for(const [key,value]of Object.entries(d.value)){let n=+key,at={};for(let i=d.id.length-1;i>=0;i--){const dim=d.id[i],keys=Object.keys(d.dimension[dim].category.index).sort((a,b)=>d.dimension[dim].category.index[a]-d.dimension[dim].category.index[b]);at[dim]=keys[n%d.size[i]];n=Math.floor(n/d.size[i]);}values.push({...at,value});}return values;}
const rates=eurostat('eurostat-exchange.json'),gdp=[...eurostat('nama_10r_2gdp.json'),...eurostat('nama_10r_3gdp.json')],manifest=load(root+'manifest.json');
const statSources={statisticsAustria:{title:'Statistics Austria · Resident population on 1 January 2026',url:'https://www.statistik.at/fileadmin/pages/453/RegUnitsPopulation.ods',license:'CC BY 4.0'},giscoPopulation:{title:'Eurostat GISCO · validated LAU population on 1 January 2024',url:'https://gisco-services.ec.europa.eu/distribution/v2/lau/lau-2024-files.html'},sursPopulation:{title:'SURS · Population by municipalities and settlements, 1 January 2026 (05C5003S)',url:'https://pxweb.stat.si/SiStatData/pxweb/en/Data/-/05C5003S.px',license:'CC BY 4.0'},eurostatGdp:{title:'Eurostat · Regional GDP at current market prices, official NUTS geography',url:'https://ec.europa.eu/eurostat/databrowser/view/nama_10r_3gdp/default/table',license:'CC BY 4.0'},eurostatExchange:{title:'Eurostat · Annual average USD per EUR',url:'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table',license:'CC BY 4.0'}};
for(const data of prepared){const {country,units}=data,second=await command(fc(data.bottom.features.map(f=>({...f,properties:{id:units.get(f.properties.id).parent}}))),'-dissolve id -clean gap-fill-area=0'),first=await command(fc(second.features.map(f=>({...f,properties:{id:units.get(f.properties.id).parent}}))),'-dissolve id -clean gap-fill-area=0'),statistics={};
 for(const r of units.values())if(r.level===1){const rows=gdp.filter(v=>v.geo===r.nuts&&v.unit==='MIO_EUR'&&v.value>0).sort((a,b)=>+b.time-+a.time),total=rows[0];assert(total,'Regional GDP '+r.nuts);const per=gdp.find(v=>v.geo===r.nuts&&v.unit==='EUR_HAB'&&v.time===total.time),fx=rates.find(v=>v.time===total.time)?.value;assert(per&&fx>0,'GDP per capita and matching exchange year');const common={year:+total.time,currency:'EUR',priceBasis:'current',source:'eurostatGdp',exchangeSource:'eurostatExchange',exchangeYear:+total.time,exchangeRate:1/fx,nuts:r.nuts,note:'Official '+r.nuts+' regional GDP. Not assigned to smaller administrative units.'};statistics[r.id]={gdp:{...common,value:total.value*1e6,usd:total.value*1e6*fx},gdpPerCapita:{...common,value:per.value,usd:per.value*fx}};}
 const levels=country==='slovenia'?['Statistical regions','Municipalities','Settlement areas']:country==='austria'?['Federal states','Political districts & statutory cities','Municipalities']:['Counties & Budapest','Districts & capital equivalent','Municipalities'];
 await buildRegionalDataset({country,units,byLevel:{1:first,2:second,3:data.bottom},sources:manifest.files,coverage:data.coverage,statisticsSources:statSources,statistics,year:2026,retrieved:'2026-10-22',levels});
 const base='dist/data/europe/'+country+'/';save(base+'political.bin',first);save(base+'context.bin',fc((await command(first,'-dissolve')).features.map(f=>({...f,properties:{country}}))));
 const cat=load(base+'catalogue.bin');for(const file of ['first.bin',...Object.values(cat.chunks).map(ch=>ch.file)]){const part=load(base+file);part.selectionOutlines=waterFreeLines(fc(part.regions.features.flatMap(f=>polygons(f.geometry).flat().map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates}})))));save(base+file,part);}for(const ch of Object.values(cat.chunks)){ch.bytes=fs.statSync(base+ch.file).size;ch.decodedBytes=gunzipSync(fs.readFileSync(base+ch.file)).length;}save(base+'catalogue.bin',cat);
 if(data.boroughs)await (await import('./central-europe-optional.mjs')).prepareCentralOptionalViews();
 console.log('Wrote',country,'with official population and',Object.keys(statistics).length,'regional GDP cards');
}
await reconcileCentralNeighbors();
await (await import('./prepare-central-national-flags.mjs')).prepareCentralNationalFlags();
