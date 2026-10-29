import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/arabia-levant/';
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json';
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (local geographic atlas)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-29',files:{}},sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}


export async function fetchCountries(){
 for(const [iso,code]of [['omn','om'],['yem','ye'],['syr','sy']]){
  const m=JSON.parse(await retain(iso+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-'+iso));const r=m.result.resources.find(r=>r.name.endsWith('.geojson.zip'));await retain(iso+'.zip',r.url,{credit:m.result.organization.title+' · HDX COD-AB',license:m.result.license_title,page:'https://data.humdata.org/dataset/cod-ab-'+iso});
 }
 for(const [iso,levels]of [['OMN',[2]],['JOR',[1,2]]])for(const level of levels){const m=JSON.parse(await retain(iso.toLowerCase()+'-adm'+level+'-metadata.json','https://www.geoboundaries.org/api/current/gbOpen/'+iso+'/ADM'+level+'/'));await retain(iso.toLowerCase()+'-adm'+level+'.geojson',m.gjDownloadURL,{credit:m.boundarySource,license:m.boundaryLicense,year:m.boundaryYearRepresented,page:m.boundarySourceURL||'https://www.geoboundaries.org/'});}
 for(const code of ['om','ye','sy','jo'])await retain('flag-'+code+'.svg','https://flagcdn.com/'+code+'.svg',{credit:'National flag artwork via FlagCDN / flag-icons',license:'Flag artwork; source distribution MIT',page:'https://flagcdn.com/'});
 for(const name of ['yemen-population-estimates','syrian-arab-republic-baseline-population','syrian-arab-republic-other-0-0-0-0-0-0-0']){
  const m=JSON.parse(await retain(name+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id='+name));if(!m.success)continue;
  const resources=m.result.resources;
  if(name==='syrian-arab-republic-other-0-0-0-0-0-0-0'){const r=resources.find(r=>r.name==='syr_pop_2004_sycensus_0.xls');if(!r)throw Error('Retained Syrian census resource');await retain('syria-census-2004.xls',r.url,{credit:'OCHA Syria · Syrian Central Bureau of Statistics 2004 Census',license:m.result.license_title,page:'https://data.humdata.org/dataset/'+name});}
  if(name==='yemen-population-estimates'){const r=resources.find(r=>r.name.includes('2025')&&r.url.includes('.csv'));if(r)await retain('yemen-population-2025.csv',r.url,{credit:m.result.organization.title,license:m.result.license_title,page:'https://data.humdata.org/dataset/'+name});}
 }
 await retain('jordan-population-2025.pdf','https://dosweb.dos.gov.jo/databank/Population/Population_Estimares/PopulationEstimates.pdf',{credit:'Jordan Department of Statistics · Statistical Yearbook 2025',license:'Official factual population table',page:'https://dosweb.dos.gov.jo/ar/population/population-2/'});
 if(!fs.existsSync(root+'oman-yearbook-2026.pdf.gz')){
  const url='https://api.ncsi.gov.om/uploads/pdfs/statistical_year_book_2026___issue_54_1777550341.pdf',probe=await fetch(url,{headers:{Range:'bytes=0-0'},signal:AbortSignal.timeout(30000)}),size=Number(probe.headers.get('content-range')?.split('/')[1]);await probe.arrayBuffer();if(!size)throw Error('Oman report range size');
  const chunks=[],step=1024*1024;for(let first=0;first<size;first+=step*4){const batch=await Promise.all(Array.from({length:Math.min(4,Math.ceil((size-first)/step))},async(_,j)=>{const start=first+j*step,end=Math.min(size-1,start+step-1),r=await fetch(url,{headers:{Range:'bytes='+start+'-'+end},signal:AbortSignal.timeout(45000)});if(r.status!==206)throw Error('Report range '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length!==end-start+1)throw Error('Truncated report range');return b;}));chunks.push(...batch);console.log('Oman report bytes',Math.min(size,first+step*4),size);}
  fs.writeFileSync(root+'oman-yearbook-2026.pdf.gz',gzipSync(Buffer.concat(chunks),{level:9}));
 }
 await retain('oman-yearbook-2026.pdf','https://api.ncsi.gov.om/uploads/pdfs/statistical_year_book_2026___issue_54_1777550341.pdf',{credit:'Oman National Centre for Statistics and Information · Statistical Yearbook 2026',license:'Official factual statistical tables'});
 await retain('worldbank.json','https://api.worldbank.org/v2/country/OMN;YEM;SYR;JOR/indicator/SP.POP.TOTL;NY.GDP.MKTP.CD;NY.GDP.PCAP.CD?source=2&date=2010:2025&format=json&per_page=1000',{credit:'World Bank World Development Indicators',license:'CC BY 4.0'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await fetchCountries();
