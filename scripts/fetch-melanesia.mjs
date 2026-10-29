import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/melanesia/';
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json';
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (local geographic atlas)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-29',files:{}},sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}

export async function fetchCountries(){
 for(const [iso,code]of [['png','pg'],['slb','sb'],['vut','vu']]){
  for(const type of ['ab','ps']){
   const m=JSON.parse(await retain(iso+'-'+type+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-'+type+'-'+iso));if(!m.success)throw Error('Missing HDX '+iso+' '+type);
   const credit={credit:m.result.organization.title+' · HDX COD-'+type.toUpperCase(),license:m.result.license_title,page:'https://data.humdata.org/dataset/cod-'+type+'-'+iso};
   if(type==='ab'){
    const geo=m.result.resources.find(r=>r.name.endsWith('.geojson.zip'));
    if(geo)await retain(iso+'.zip',geo.url,credit);
    else for(const level of [1,2,3]){const r=m.result.resources.find(r=>new RegExp('adm'+level+'\\.zip$').test(r.name));if(!r)throw Error('No boundary '+iso+' '+level);await retain(iso+'-adm'+level+'.zip',r.url,credit);}
   }else for(const r of m.result.resources.filter(r=>r.name.endsWith('.csv')&&/adm[0123]_/.test(r.name)))await retain(r.name,r.url,credit);
  }
  await retain('flag-'+code+'.svg','https://flagcdn.com/'+code+'.svg',{credit:'National flag artwork via FlagCDN / flag-icons',license:'Flag artwork; source distribution MIT',page:'https://flagcdn.com/'});
 }
 await retain('worldbank.json','https://api.worldbank.org/v2/country/PNG;SLB;VUT/indicator/SP.POP.TOTL;NY.GDP.MKTP.CD;NY.GDP.PCAP.CD?source=2&date=2020:2025&format=json&per_page=1000',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await fetchCountries();
