import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {unzipSync} from 'fflate';
export const root='scripts/boundary-sources/east-south-africa/';
export async function retain(name,url,meta={},provided){
 fs.mkdirSync(root,{recursive:true});const file=root+name+'.gz',mf=root+'manifest.json';let bytes;
 if(fs.existsSync(file))bytes=gunzipSync(fs.readFileSync(file));else{if(provided)bytes=provided;else{const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());}fs.writeFileSync(file,gzipSync(bytes,{level:9}));}
 const m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-26',files:{}},sha256=createHash('sha256').update(bytes).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Retained source changed '+name);m.files[name]={url,...meta,sha256,bytes:bytes.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,bytes.length);return bytes;
}
export function source(name){const b=gunzipSync(fs.readFileSync(root+name+'.gz')),m=JSON.parse(fs.readFileSync(root+'manifest.json'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function fetchEastSouthAfrica(){
 for(const iso of ['zwe','zmb','tza','ken']){
  const m=JSON.parse(await retain(iso+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-'+iso));
  const resources=m.result.resources.filter(r=>r.name.endsWith('geojson.zip')||iso==='tza'&&/admbnda_adm[12]_.*zip$/.test(r.name));
  if(!resources.length)throw Error('Boundary download missing '+iso);
  if(iso==='zmb'){
   if([1,2].every(level=>fs.existsSync(root+'zmb-admin'+level+'.geojson.gz'))){for(const level of [1,2])source('zmb-admin'+level+'.geojson');}
   else{
    const mf=root+'manifest.json',pin=JSON.parse(fs.readFileSync(mf)).archives?.['zmb-boundaries.zip'],url=pin?.url||resources[0].url,cache='artifacts/east-south-africa/zmb-boundaries.zip.gz';let bytes;
    if(fs.existsSync(cache))bytes=gunzipSync(fs.readFileSync(cache));else{const response=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('Zambia archive HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());fs.mkdirSync('artifacts/east-south-africa',{recursive:true});fs.writeFileSync(cache,gzipSync(bytes));}
    const sha256=createHash('sha256').update(bytes).digest('hex');if(pin&&pin.sha256!==sha256)throw Error('Pinned Zambia archive changed');const zip=unzipSync(bytes,{filter:f=>/zmb_admin[12]\.geojson$/.test(f.name)});
    for(const level of [1,2]){const member=Object.keys(zip).find(k=>k.endsWith('zmb_admin'+level+'.geojson'));await retain('zmb-admin'+level+'.geojson',url,{archive:'zmb-boundaries.zip',archiveMember:member,credit:m.result.dataset_source,license:'CC BY 3.0 IGO'},Buffer.from(zip[member]));}
    const updated=JSON.parse(fs.readFileSync(mf));updated.archives??={};updated.archives['zmb-boundaries.zip']={url,sha256,bytes:bytes.length};fs.writeFileSync(mf,JSON.stringify(updated,null,2)+'\n');
   }
  }else for(const r of resources)await retain(iso+'-'+(iso==='tza'?r.name.match(/adm([12])_/)[1]+'.zip':'boundaries.zip'),r.url,{credit:m.result.dataset_source||'National mapping/statistical authorities via OCHA HDX COD-AB',license:'CC BY 3.0 IGO',page:'https://data.humdata.org/dataset/cod-ab-'+iso});
  const pop=JSON.parse(await retain(iso+'-population-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ps-'+iso));
  for(const r of pop.result.resources.filter(r=>iso==='zwe'?/adm[012]_2023.csv$/.test(r.name):iso==='ken'?/adm[01]_2019.csv$/.test(r.name):iso==='zmb'?/adm[01]_2020_v2.csv$/.test(r.name):false))await retain(iso+'-'+r.name,r.url,{credit:pop.result.dataset_source||'OCHA HDX population statistics',license:'CC BY 3.0 IGO',page:'https://data.humdata.org/dataset/cod-ps-'+iso});
  if(iso==='zwe'){const r=pop.result.resources.find(r=>r.name==='zwe_admpop_2022.xlsx');await retain('zwe-population2022.xlsx',r.url,{credit:'ZIMSTAT 2022 census, OCHA COD-PS retained table',license:'CC BY 3.0 IGO'});}
 }
 await retain('worldbank.json','https://api.worldbank.org/v2/country/ZWE;ZMB;TZA;KEN/indicator/SP.POP.TOTL;NY.GDP.MKTP.CD;NY.GDP.PCAP.CD?source=2&date=2024:2025&format=json&per_page=200',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
 for(const [code,url]of [['zw','https://upload.wikimedia.org/wikipedia/commons/6/6a/Flag_of_Zimbabwe.svg'],['zm','https://upload.wikimedia.org/wikipedia/commons/0/06/Flag_of_Zambia.svg'],['tz','https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Tanzania.svg'],['ke','https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg']])await retain('flag-'+code+'.svg',url,{credit:'Wikimedia Commons national flag artwork',license:'Public domain',page:'https://commons.wikimedia.org/wiki/File:Flag_of_'+({zw:'Zimbabwe',zm:'Zambia',tz:'Tanzania',ke:'Kenya'}[code])+'.svg'});
 const all=JSON.parse(fs.readFileSync(root+'manifest.json'));for(const name of Object.keys(all.files))source(name);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await fetchEastSouthAfrica();
