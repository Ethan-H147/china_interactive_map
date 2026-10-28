import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/west-asia/';
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json';
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (local geographic atlas)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-27',files:{}},sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}
export async function fetchCountries(){
 for(const iso of ['irn','irq','sau']){
  const m=JSON.parse(await retain(iso+'-hdx-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-'+iso));
  if(!m.success){console.log('No HDX package',iso);continue;}
  const r=m.result.resources.find(r=>r.name.endsWith('.geojson.zip'));if(!r)throw Error('GeoJSON boundaries '+iso);
  await retain(iso+'.zip',r.url,{credit:m.result.organization.title+' · HDX COD-AB',license:m.result.license_title,page:'https://data.humdata.org/dataset/cod-ab-'+iso});
 }
 await retain('iran-population.pdf','https://iran.unfpa.org/sites/default/files/pub-pdf/poster-12-03-2018_-v.08_1.pdf',{credit:'Statistical Centre of Iran / Statistical Research and Training Center, hosted by UNFPA',license:'Official statistics; attribution'});
 await retain('halabja-relation.json','https://www.openstreetmap.org/api/0.6/relation/3826029/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/3826029',relation:3826029});
 const censusUrl='https://nogp.gov.iq/DatasetDetails.aspx?id=17';
 if(!fs.existsSync(root+'iraq-population.xlsx.gz')){
  const page=await fetch(censusUrl,{signal:AbortSignal.timeout(120000)});if(!page.ok)throw Error('Iraq census catalogue HTTP '+page.status);
  const html=await page.text(),form=new URLSearchParams();
  for(const name of ['__VIEWSTATE','__VIEWSTATEGENERATOR','__EVENTVALIDATION']){const value=html.match(new RegExp('name="'+name+'"[^>]*value="([^"]*)"'))?.[1];if(value!==undefined)form.set(name,value.replaceAll('&amp;','&').replaceAll('&quot;','"'));}
  form.set('__EVENTTARGET','ctl00$ContentPlaceHolder1$rptFiles$ctl01$lnkDownload');form.set('__EVENTARGUMENT','');
  const cookie=page.headers.getSetCookie().map(s=>s.split(';')[0]).join('; '),response=await fetch(censusUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:cookie,Referer:censusUrl},body:form,signal:AbortSignal.timeout(120000)});
  const bytes=Buffer.from(await response.arrayBuffer());if(!response.ok||bytes[0]!==80||bytes[1]!==75)throw Error('Iraq census workbook download failed');
  fs.writeFileSync(root+'iraq-population.xlsx.gz',gzipSync(bytes,{level:9}));
 }
 await retain('iraq-population.xlsx',censusUrl,{credit:'Iraqi Ministry of Planning / Commission of Statistics and GIS, National Open Government Portal',license:'Official statistics; attribution',attachment:'تعداد 2024.xlsx',retrievalMethod:'Anonymous ASP.NET form POST; event target ctl00$ContentPlaceHolder1$rptFiles$ctl01$lnkDownload with fresh hidden fields and session cookies.',populationYear:2024});
 await retain('saudi-population.pdf','https://www.moh.gov.sa/Ministry/Statistics/book/Documents/Statistical-Yearbook-2022.pdf',{credit:'Saudi Ministry of Health · GASTAT 2022 census, administrative regions, Table 1-12',license:'Official statistics; attribution'});
 await retain('saudi-adm2-metadata.json','https://www.geoboundaries.org/api/current/gbOpen/SAU/ADM2/',{credit:'geoBoundaries'});
 await retain('saudi-governorates.geojson','https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/SAU/ADM2/geoBoundaries-SAU-ADM2.geojson',{credit:'geoBoundaries / OpenStreetMap',license:'Creative Commons Attribution-ShareAlike 2.0 as stated by geoBoundaries; original OSM attribution retained',year:2021,boundaryID:'SAU-ADM2-3984122',count:147});
 await retain('saudi-name-reference.geojson','https://gis.taadeen.sa/server/rest/services/Common/BaseMaps/MapServer/2/query?where=1%3D1&outFields=*&outSR=4326&f=geojson',{credit:'Saudi Ministry of Industry and Mineral Resources / Taadeen public GIS',license:'No explicit license returned; retained as factual bilingual-name reference, not app geometry',count:149});
 await retain('worldbank.json','https://api.worldbank.org/v2/country/IRN;IRQ;SAU/indicator/NY.GDP.MKTP.CD;NY.GDP.PCAP.CD;SP.POP.TOTL?source=2&date=2023:2025&format=json&per_page=1000',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
 for(const [iso,file]of [['ir','c/ca/Flag_of_Iran.svg'],['iq','f/f6/Flag_of_Iraq.svg'],['sa','0/0d/Flag_of_Saudi_Arabia.svg']])await retain('flag-'+iso+'.svg','https://upload.wikimedia.org/wikipedia/commons/'+file,{credit:'Wikimedia Commons · national flag artwork',license:'Public domain',page:'https://commons.wikimedia.org/wiki/File:'+file.split('/').at(-1)});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchCountries();
