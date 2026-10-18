import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {csv,load,write} from './us-geography.mjs';
const url='https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv';
export function rankMunicipalities(records,rows){
 const byId=new Map(records.map(r=>[r.id,r])),ranked=[],seen=new Set();
 for(const row of rows){
  const key={'162':'US-PLACE-'+row.STATE+row.PLACE,'061':'US-MCD-'+row.STATE+row.COUNTY+row.COUSUB,'170':'US-CONCITY-'+row.STATE+row.CONCIT}[row.SUMLEV],record=byId.get(key);
  if(!record?.incorporated||!['A','B','C'].includes(record.governmentStatus))continue;
  if(seen.has(key))throw Error('Duplicate whole-government population: '+key);
  const value=Number(row.POPESTIMATE2025);if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid municipal population '+key);
  seen.add(key);ranked.push({record,value,summaryLevel:row.SUMLEV,sourceName:row.NAME});
 }
 const eligible=records.filter(r=>r.level===3&&r.incorporated&&['A','B','C'].includes(r.governmentStatus));
 if(eligible.some(r=>!seen.has(r.id)))throw Error('Population coverage incomplete');
 return ranked.sort((a,b)=>b.value-a.value||a.record.id.localeCompare(b.record.id));
}
export async function prepareUSMunicipalFacts(root='dist/data/europe/united-states/'){
 const retained='scripts/statistics-sources/united-states/municipal-population-2025.csv.gz',cached='artifacts/us-source/municipal-population.csv',pinFile='scripts/us-municipal-fact-sources.json';
 let bytes=fs.existsSync(retained)?gunzipSync(fs.readFileSync(retained)):fs.existsSync(cached)?fs.readFileSync(cached):null;
 if(!bytes){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Population source '+r.status);bytes=Buffer.from(await r.arrayBuffer());}
 const sha256=createHash('sha256').update(bytes).digest('hex'),previous=fs.existsSync(pinFile)?load(pinFile):null;if(previous?.population.sha256&&previous.population.sha256!==sha256)throw Error('Municipal population source differs from pinned vintage');
 fs.mkdirSync(path.dirname(retained),{recursive:true});fs.writeFileSync(retained,gzipSync(bytes,{level:9}));
 const catalogue=load(root+'catalogue.bin'),ranked=rankMunicipalities(catalogue.records,csv(bytes.toString('utf8'))),top=ranked.slice(0,500),stats=load(root+'statistics.json'),flagFile='dist/data/us-municipal-flag-sources.json',flags={...(fs.existsSync(flagFile)?load(flagFile).flags:{}),...(fs.existsSync('dist/data/us-municipal-fotw-flag-sources.json')?load('dist/data/us-municipal-fotw-flag-sources.json').flags:{})},facts={asOf:'2025-07-01',vintage:2025,limit:500,eligibleGovernments:ranked.length,cutoffPopulation:top.at(-1).value,source:url,records:{}};
 stats.sources.usMunicipalPopulation={title:'US Census Bureau · Vintage 2025 municipal resident population estimates',url,license:'Public domain'};
 stats.sources.usMunicipalBoundaries={title:'US Census Bureau · 2025 place and county subdivision cartographic boundaries',url:'https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html',license:'Public domain'};
 for(const[key,value]of Object.entries(stats.regions))if(value.population?.source==='usMunicipalPopulation')delete stats.regions[key];
 for(const[itemIndex,{record:r,value,summaryLevel,sourceName}]of top.entries()){
  const rank=itemIndex+1;
  stats.regions['united-states:'+r.id]={name:r.en,level:3,parent:r.parent,area:{value:r.areaKm2,unit:'km²',year:2025,method:'reported',source:'usMunicipalBoundaries',label:'Land area'},population:{value,year:2025,date:'2025-07-01',method:'estimate',periodLabel:'1 July 2025 estimate',source:'usMunicipalPopulation'}};
  const f=flags[r.id];facts.records[r.id]={rank,population:value,summaryLevel,sourceName,...(f?{flag:Object.fromEntries(Object.entries(f).filter(([key])=>!['sha256','commonsSha1','sourceSha1','commonsFile','id','rank','evidence'].includes(key)))}:{})};
 }
 const population={url,provider:'US Census Bureau · Vintage 2025 subcounty estimates, released May 2026',date:'2025-07-01',retrieved:'2026-10-17',sha256,bytes:bytes.length,retained};
 const ranking='Largest 500 functioning whole municipal governments represented in the atlas: active general-purpose places, towns/townships and full consolidated cities (functional status A/B/C). Whole-government summary levels 162/061/170 only; never county/place parts, CDPs, statistical balances, metropolitan populations or subordinate special-purpose townships. Distinct overlapping governments remain distinct; populations must not be summed as disjoint areas.';
 write(pinFile,{population,ranking,layout:'https://www2.census.gov/programs-surveys/popest/technical-documentation/file-layouts/2020-2025/SUB-EST2025.pdf'});write(root+'statistics.json',stats);write(root+'municipalities/facts.json',facts);write(root+'municipalities/top500.json',{asOf:facts.asOf,definition:ranking,source:population,records:top.map(({record:r,value,summaryLevel,sourceName},i)=>({rank:i+1,id:r.id,name:r.en,parent:r.parent,kind:r.kind,population:value,summaryLevel,sourceName,flag:!!flags[r.id]}))});
 console.log('Top 500 municipal populations prepared; cutoff',facts.cutoffPopulation,'residents;',Object.keys(flags).filter(id=>facts.records[id]).length,'documented flag assets.');
 return facts;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await prepareUSMunicipalFacts();
