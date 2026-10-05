import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readData} from './read-data.mjs';

const sourceRoot=new URL('./province-population-sources/',import.meta.url);
export const sourceDefinitions={
  china:{file:'china.html.bin',url:'https://www.stats.gov.cn/english/PressRelease/202105/t20210510_1817188.html',title:'National Bureau of Statistics: Seventh National Population Census, Table 3-1',published:'2021-05-11'},
  mongolia:{file:'mongolia.html.bin',url:'https://en.wikipedia.org/wiki/Provinces_of_Mongolia',title:'Wikipedia: Provinces of Mongolia',license:'CC BY-SA 4.0',underlyingSource:'2020 Population and Housing Census of Mongolia National Report, table 2.5'},
  mongoliaIso:{file:'mongolia-iso.html.bin',url:'https://en.wikipedia.org/wiki/ISO_3166-2:MN',title:'Wikipedia: ISO 3166-2:MN',license:'CC BY-SA 4.0'},
  hongkong:{file:'hongkong.html.bin',url:'https://www.census2021.gov.hk/en/media.html',title:'Hong Kong Census and Statistics Department: 2021 Population Census summary results',published:'2022-02-28'},
  macao:{file:'macao.html.bin',url:'https://www.gcs.gov.mo/news/detail/en/N22FGnXZHc',title:'Macao Statistics and Census Service: Detailed Results of 2021 Population Census',published:'2022-06-07'},
  taiwan:{file:'taiwan.xml.bin',url:'https://ws.dgbas.gov.tw/001/Upload/461/relfile/11525/230872/mp06134a109.xml',landingUrl:'https://data.gov.tw/dataset/24238',title:'Taiwan DGBAS: 2020 Census resident population and density',license:'Open Government Data License, version 1.0'}
};
const decode=text=>text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[e.toLowerCase()]));
const plain=html=>decode(html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function tableRows(html,needle){
  const table=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].find(m=>m[0].includes(needle))?.[0];
  assert(table,'Source table missing: '+needle);
  return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>plain(c[1])));
}
export const normalizeMongoliaName=name=>name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/province|aimag|provincial municipality|municipality|capital city/g,'').replace(/[^a-z0-9]/g,'');
const chinaCodes={Beijing:110000,Tianjin:120000,Hebei:130000,Shanxi:140000,'Inner Mongolia':150000,Liaoning:210000,Jilin:220000,Heilongjiang:230000,Shanghai:310000,Jiangsu:320000,Zhejiang:330000,Anhui:340000,Fujian:350000,Jiangxi:360000,Shandong:370000,Henan:410000,Hubei:420000,Hunan:430000,Guangdong:440000,Guangxi:450000,Hainan:460000,Chongqing:500000,Sichuan:510000,Guizhou:520000,Yunnan:530000,Tibet:540000,Shaanxi:610000,Gansu:620000,Qinghai:630000,Ningxia:640000,Xinjiang:650000};
export const mongoliaCodes={Arkhangai:'MN-073',Bayankhongor:'MN-069','Bayan-Ölgii':'MN-071',Bulgan:'MN-067','Darkhan-Uul':'MN-037',Dornod:'MN-061',Dornogovi:'MN-063',Dundgovi:'MN-059','Govi-Altai':'MN-065',Govisümber:'MN-064',Khentii:'MN-039',Khovd:'MN-043',Khövsgöl:'MN-041',Orkhon:'MN-035',Ömnögovi:'MN-053',Övörkhangai:'MN-055',Selenge:'MN-049',Sükhbaatar:'MN-051',Töv:'MN-047',Uvs:'MN-046',Zavkhan:'MN-057',Ulaanbaatar:'MN-1'};
const number=text=>{assert.match(text,/^[\d,\s]+$/);return Number(text.replace(/[,\s]/g,''));};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readPopulationSources(){
  const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',sourceRoot),'utf8'));
  return Object.fromEntries(Object.entries(sourceDefinitions).map(([id,definition])=>{
    const bytes=gunzipSync(fs.readFileSync(new URL(definition.file,sourceRoot)));
    assert.equal(sha(bytes),manifest[id].sha256,'Source snapshot checksum: '+id);
    return [id,{html:bytes.toString('utf8'),metadata:{...definition,...manifest[id]}}];
  }));
}
export function prepareProvincePopulation(inputs,provinceFeatures){
  const sources=Object.fromEntries(Object.entries(inputs).map(([id,s])=>[id,s.metadata]));
  for(const id of ['mongolia','mongoliaIso']){
    const revision=inputs[id].html.match(/"wgRevisionId":(\d+)/)?.[1];
    assert(revision,'Wikipedia revision missing');
    sources[id].revision=Number(revision);
    sources[id].revisionUrl='https://en.wikipedia.org/w/index.php?title='+encodeURIComponent(id==='mongolia'?'Provinces_of_Mongolia':'ISO_3166-2:MN')+'&oldid='+revision;
  }
  const china={},mongolia={},mongoliaAliases={},featureIndex=new Map(provinceFeatures.map(f=>[f.properties.adcode,f.properties]));
  const record=(name,total,date,dateLabel,measure,sourceId,extra={})=>({name,total,date,dateLabel,measure,sourceId,sourceLabel:sources[sourceId].title,sourceUrl:sources[sourceId].revisionUrl||sources[sourceId].landingUrl||sources[sourceId].url,...extra});
  const matchNames=new Map(Object.entries(chinaCodes).map(([name,code])=>[name.replace(/\s/g,''),{name,code}]));
  for(const row of tableRows(inputs.china.html,'Beijing')){
    const item=matchNames.get(row[0]?.replace(/\s/g,''));
    if(!item)continue;
    assert(!china[item.code]);
    china[item.code]=record(item.name,number(row[1]),'2020-11-01','1 November 2020 · Census','Permanent residents of the entire administrative region','china',{nameZh:featureIndex.get(item.code).name});
  }
  assert.equal(Object.keys(china).length,31,'All mainland provinces must match the official table');
  assert.match(plain(inputs.hongkong.html),/7 413 070/);
  china[810000]=record('Hong Kong',7413070,'2021-06-30','30 June 2021 · Census','Resident population, including usual and mobile residents','hongkong',{nameZh:'香港'});
  assert.match(plain(inputs.macao.html),/682,070/);
  china[820000]=record('Macao',682070,'2021-08','August 2021 · Census','Total population, including non-resident workers and non-local students living in Macao','macao',{nameZh:'澳門'});
  const twRows=[...inputs.taiwan.html.matchAll(/<常住人口數及人口密度>([\s\S]*?)<\/常住人口數及人口密度>/g)].map(m=>({name:m[1].match(/<按縣市別分_By_County_City>(.*?)<\/按縣市別分_By_County_City>/)?.[1].trim(),total:m[1].match(/<常住人口數_總計_人_Number_of_resident_population_Grand_total_person>(.*?)<\/常住人口數_總計_人_Number_of_resident_population_Grand_total_person>/)?.[1]}));
  const twTotal=twRows.find(r=>r.name==='總計');assert(twTotal);
  china[710000]=record('Taiwan',number(twTotal.total),'2020-11-08','8 November 2020 · Census','Usual residents, including non-nationals; census coverage includes Kinmen and Matsu','taiwan',{nameZh:'臺灣'});
  const isoRows=tableRows(inputs.mongoliaIso.html,'Subdivision category'),isoIndex=new Map(isoRows.filter(r=>/^MN-/.test(r[0])).map(r=>[r[0],r]));
  for(const row of tableRows(inputs.mongolia.html,'2020 Census')){
    if(row.length!==7||!/^\d[\d,]*$/.test(row[4]))continue;
    const name=row[0].replace(/\s*\(provincial municipality\)/,'').trim(),iso=mongoliaCodes[name];
    assert(iso,'Unknown Mongolian province name: '+name);assert(isoIndex.has(iso),'ISO reference missing: '+iso);assert(!mongolia[iso]);
    const traditional=row[1].match(/[\u1800-\u18af\s]+/)?.[0].trim();
    mongolia[iso]=record(name,number(row[4]),'2020','2020 Census · Wikipedia','Entire province or capital municipality; year as labelled in the source table','mongolia',{iso,nameMn:isoIndex.get(iso)[2],traditional,capital:row[6],adminType:iso==='MN-1'?'Capital municipality':'Province (aimag)'});
    for(const alias of [name,isoIndex.get(iso)[1]])mongoliaAliases[normalizeMongoliaName(alias)]=iso;
  }
  assert.equal(Object.keys(mongolia).length,22);
  Object.assign(mongoliaAliases,{bayanolgiy:'MN-071',bayanulgi:'MN-071',bayanhongor:'MN-069',darhanuul:'MN-037',darkhanuul:'MN-037',dornogobi:'MN-063',dornogov:'MN-063',dundgobi:'MN-059',dundgov:'MN-059',govialtay:'MN-065',govialtai:'MN-065',govisumber:'MN-064',gobisumber:'MN-064',hentii:'MN-039',hentiy:'MN-039',hovd:'MN-043',hovsgol:'MN-041',huvsgul:'MN-041',omnogobi:'MN-053',omnogov:'MN-053',ovorkhangai:'MN-055',orkhon:'MN-035',orhon:'MN-035',suhbaatar:'MN-051',sukhbaatar:'MN-051',dzavhan:'MN-057',zavhan:'MN-057',ulaanbaatar:'MN-1',ulanbator:'MN-1'});
  assert.deepEqual(Object.keys(china).sort(),provinceFeatures.map(f=>String(f.properties.adcode)).sort());
  return {schemaVersion:1,sources,coverage:{china:34,mongoliaProvinces:21,mongoliaMunicipalities:1},china,mongolia,mongoliaAliases};
}
async function refreshSources(){
  fs.mkdirSync(sourceRoot,{recursive:true});const manifest={};
  for(const [id,source] of Object.entries(sourceDefinitions)){
    let bytes;
    try{const response=await fetch(source.url);assert(response.ok,'Source HTTP status '+response.status);bytes=Buffer.from(await response.arrayBuffer());}
    catch(error){
      if(process.platform!=='win32'||error.cause?.code!=='UNABLE_TO_VERIFY_LEAF_SIGNATURE')throw error;
      const result=spawnSync('curl.exe',['--fail','--location',source.url],{encoding:null,maxBuffer:10e6});
      assert.equal(result.status,0,'Windows TLS download failed: '+id);bytes=result.stdout;
    }
    fs.writeFileSync(new URL(source.file,sourceRoot),gzipSync(bytes));manifest[id]={retrieved:new Date().toISOString(),sha256:sha(bytes)};
  }
  fs.writeFileSync(new URL('manifest.json',sourceRoot),JSON.stringify(manifest,null,2)+'\n');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(process.argv.includes('--refresh'))await refreshSources();
  const result=prepareProvincePopulation(readPopulationSources(),readData('display-boundaries.json').provinces.features);
  fs.writeFileSync(new URL('../dist/data/province-population.json',import.meta.url),JSON.stringify(result)+'\n');
  console.log(JSON.stringify({coverage:result.coverage,mainlandTotal:Object.values(result.china).filter(r=>r.sourceId==='china').reduce((n,r)=>n+r.total,0),mongoliaTableTotal:Object.values(result.mongolia).reduce((n,r)=>n+r.total,0)}));
}
