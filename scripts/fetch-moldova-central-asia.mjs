import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/moldova-central-asia/';
const agent={'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map)'};
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={},options={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json',m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-26',files:{}};
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{...options,headers:{...agent,...options.headers},signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}
export async function fetchCountries(){
 for(const iso of ['mda','uzb']){
  const m=JSON.parse(await retain(iso+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-'+iso));
  for(const level of iso==='mda'?[0]:[1,2]){
   const r=m.result.resources.find(r=>iso==='mda'?r.name.endsWith('.geojson.zip'):r.name.includes('adm'+level+'_2018b.zip'));if(!r)throw Error('Resource '+iso+' '+level);
   await retain(iso+(level?'-adm'+level:'')+'.zip',r.url,{credit:m.result.organization.title+' · HDX COD-AB',license:m.result.license_title,page:'https://data.humdata.org/dataset/cod-ab-'+iso});
  }
 }
 for(const [iso,ids]of [['tj',[3279615,3279374,3279616,3279614,7328360]],['tm',[7328329,223031,223032,223028,223029,223030,15654588]]])for(const id of ids)
  await retain(iso+'-relation-'+id+'.json','https://www.openstreetmap.org/api/0.6/relation/'+id+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/'+id,relation:id});
 const tmTop=[7328329,223031,223032,223028,223029,223030,15654588],children=new Map();
 for(const id of tmTop){const r=JSON.parse(source('tm-relation-'+id+'.json')).elements.find(r=>r.type==='relation'&&r.id===id);for(const m of r.members.filter(m=>m.role==='subarea'&&m.type==='relation'&&!tmTop.includes(m.ref)))children.set(m.ref,id);}
 for(const [id,parent]of children)await retain('tm-relation-'+id+'.json','https://www.openstreetmap.org/api/0.6/relation/'+id+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/'+id,relation:id,parentRelation:parent});
 for(const [name,url]of [
  ['tajikistan-population.html','https://www.stat.tj/en/population-growth-and-demographic-changes-in-the-country/'],
  ['uzbekistan-population.html','https://stat.uz/en/press-center/news-of-committee/62565-hududlar-kesimida-doimiy-aholi-soni-pp-3'],
  ['moldova-population.html','https://statistica.gov.md/en/final-results-of-the-2024-population-and-housing-census-geographical-10121_61877.html'],
  ['turkmenistan-census.html','https://stat.gov.tm/en/population-census']
 ])await retain(name,url,{credit:'National statistical authority',license:'Official statistics; attribution'});
 await retain('moldova-census.xlsx','https://statistica.gov.md/files/files/serii_de_timp/recensamant_2024/date_finale/Anexa_Caracteristici_Geografice_RPL2024_en.xlsx',{credit:'National Bureau of Statistics of Moldova',license:'Official statistics; attribution'});
 await retain('worldbank.json','https://api.worldbank.org/v2/country/MDA;UZB;TJK;TKM/indicator/NY.GDP.MKTP.CD;NY.GDP.PCAP.CD;SP.POP.TOTL?source=2&date=2023:2025&format=json&per_page=1000',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
 for(const [iso,file]of [['md','2/27/Flag_of_Moldova.svg'],['uz','8/84/Flag_of_Uzbekistan.svg'],['tj','d/d0/Flag_of_Tajikistan.svg'],['tm','1/1b/Flag_of_Turkmenistan.svg']])await retain('flag-'+iso+'.svg','https://upload.wikimedia.org/wikipedia/commons/'+file,{credit:'Wikimedia Commons · national flag artwork',license:'Public domain',page:'https://commons.wikimedia.org/wiki/File:'+file.split('/').at(-1)});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchCountries();
