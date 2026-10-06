import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const cache='scripts/japan-sources/municipalities',out='dist/vendor/japan-local';
const catalogue=JSON.parse(gunzipSync(await fs.readFile('dist/data/japan-local/catalogue.bin'))).records;
await fs.mkdir(out,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,binary=false){for(let attempt=0;attempt<5;attempt++){const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'BoundaryAtlas/1.0 (educational administrative atlas)','Accept':binary?'*/*':'application/json'}});if(r.ok)return binary?Buffer.from(await r.arrayBuffer()):r.json();if(r.status===429||r.status>=500){await pause(Math.min(30000,Number(r.headers.get('retry-after')||attempt*2+2)*1000));continue;}throw Error(`${r.status}: ${url}`);}throw Error('Source temporarily unavailable');}
const api=(host,args)=>'https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',...args});
let bindings;
try{bindings=JSON.parse(await fs.readFile(cache+'/wikidata-flags.json','utf8'));}catch{bindings=await request('https://query.wikidata.org/sparql?'+new URLSearchParams({format:'json',query:'SELECT ?item ?code ?flag WHERE { ?item wdt:P429 ?code. OPTIONAL { ?item wdt:P41 ?flag. } }'}));await fs.writeFile(cache+'/wikidata-flags.json',JSON.stringify(bindings));}
const wd=bindings.results.bindings;
const candidates=new Map();
for(const r of wd){const code=r.code.value.replace(/\D/g,'').slice(0,5),id='JP-'+code;if(!catalogue.some(p=>p.id===id))continue;const list=candidates.get(id)||[];list.push({item:r.item.value.split('/').pop(),file:r.flag?decodeURIComponent(r.flag.value.split('/').pop()):null});candidates.set(id,list);}
let entities={};try{entities=JSON.parse(await fs.readFile(cache+'/missing-flag-entities.json','utf8'));}catch{}
const currentFile=file=>file&&!/\(\d{4}[–−-]\d{4}\)/.test(file);
const missing=catalogue.filter(p=>!candidates.get(p.id)?.some(v=>currentFile(v.file)));
const need=missing.flatMap(p=>candidates.get(p.id)||[]).map(r=>r.item).filter(q=>!entities[q]);
for(let i=0;i<need.length;i+=50){const response=await request(api('www.wikidata.org',{action:'wbgetentities',props:'sitelinks',ids:need.slice(i,i+50).join('|')}));Object.assign(entities,response.entities);}
await fs.writeFile(cache+'/missing-flag-entities.json',JSON.stringify(entities));
let pages={};try{pages=JSON.parse(await fs.readFile(cache+'/flag-infoboxes.json','utf8'));}catch{}
const titles=missing.map(p=>entities[candidates.get(p.id)?.[0].item]?.sitelinks?.jawiki?.title).filter(t=>t&&!pages[t]);
for(let i=0;i<titles.length;i+=40){const response=await request(api('ja.wikipedia.org',{action:'query',prop:'revisions',rvprop:'content|ids',rvslots:'main',titles:titles.slice(i,i+40).join('|')}));for(const p of Object.values(response.query.pages))pages[p.title]={revision:p.revisions?.[0]?.revid,text:p.revisions?.[0]?.slots?.main?.['*']||''};await fs.writeFile(cache+'/flag-infoboxes.json',JSON.stringify(pages));}
const references={};
for(const p of catalogue){const list=candidates.get(p.id)||[],flags=list.filter(r=>r.file&&!/\(\d{4}[–−-]\d{4}\)/.test(r.file)).sort((a,b)=>Number(!a.file.endsWith('.svg'))-Number(!b.file.endsWith('.svg')));if(flags.length){references[p.id]={...flags[0],identifierSource:'https://www.wikidata.org/wiki/'+flags[0].item};continue;}
 const title=entities[list[0]?.item]?.sitelinks?.jawiki?.title,page=pages[title];if(!page)continue;
 // Use only an explicit flag field. Municipal emblems are not flags.
 const field=page.text.match(/^\s*\|\s*(?:旗|市旗|町旗|村旗|区旗)\s*=\s*(.+)$/m)?.[1];
 const file=field?.match(/\[\[(?:ファイル|画像|File|Image):([^|\]]+)/i)?.[1]?.trim();
 const code=page.text.match(/^\s*\|\s*(?:自治体コード|市町村コード|全国地方公共団体コード)\s*=\s*([\d-]+)/m)?.[1]?.replace(/\D/g,'').slice(0,5);
 if(currentFile(file)&&(!code||code===p.id.slice(3)))references[p.id]={item:list[0].item,file,identifierSource:'https://ja.wikipedia.org/w/index.php?oldid='+page.revision};
}
console.log('Flag references',Object.keys(references).length,'of',catalogue.length);
let metadata={};try{metadata=JSON.parse(await fs.readFile(cache+'/flag-metadata.json','utf8'));}catch{}
const files=[...new Set(Object.values(references).map(r=>'File:'+r.file))].filter(t=>!metadata[t]?.size);
for(let i=0;i<files.length;i+=50){const response=await request(api('commons.wikimedia.org',{action:'query',prop:'imageinfo',iiprop:'url|extmetadata|size',titles:files.slice(i,i+50).join('|')}));for(const page of Object.values(response.query.pages)){metadata[page.title]=page.imageinfo?.[0]||null;}for(const redirect of [...(response.query.normalized||[]),...(response.query.redirects||[])])if(metadata[redirect.to])metadata[redirect.from]=metadata[redirect.to];await fs.writeFile(cache+'/flag-metadata.json',JSON.stringify(metadata));console.log('Metadata',Math.min(i+50,files.length),'/',files.length);}
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&(?:amp|quot|lt|gt);/g,c=>({'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>'}[c])).trim();
const result={},failures=[];let done=0;
const queue=Object.entries(references);
async function worker(){while(queue.length){const [id,ref]=queue.shift();try{const m=metadata['File:'+ref.file]||metadata['File:'+ref.file.replaceAll('_',' ')];if(!m)throw Error('No file metadata');const url=new URL(m.url);url.search='';if(url.hostname!=='upload.wikimedia.org')throw Error('Unexpected asset host');const ext=url.pathname.split('.').pop().toLowerCase();if(!['svg','png','jpg','jpeg','gif'].includes(ext))throw Error('Unsupported file type');const path=out+'/'+id+'.'+ext;let data;try{data=await fs.readFile(path);}catch{if(process.argv.includes('--cache-images'))data=await request(url.href,true);}
 if(data&&ext==='svg'){const text=data.toString();if(!/<svg[\s>]/.test(text)||/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(text))throw Error('Unsafe SVG');}else if(data&&data.length<30)throw Error('Empty image');
 if((data?.length||m.size)>1024*1024)throw Error('Flag exceeds asset budget');
 const license=clean(m.extmetadata?.LicenseShortName?.value);if(!license||!/public domain|cc0|cc by|cc-by|creative commons|gfdl/i.test(license))throw Error('Unverified reusable license: '+license);
 if(data)await fs.writeFile(path,data);result[id]={file:data?path.slice(5):url.href,page:m.descriptionurl,original:url.href,license,licenseUrl:m.extmetadata?.LicenseUrl?.value||m.descriptionurl,author:clean(m.extmetadata?.Artist?.value),identifierSource:ref.identifierSource,sha256:data?createHash('sha256').update(data).digest('hex'):undefined,bytes:data?.length||m.size};
 }catch(error){failures.push({id,file:ref.file,reason:error.message});}done++;if(done%100===0)console.log('Flags',done,'/',Object.keys(references).length);}}
await Promise.all(Array.from({length:4},worker));
const report={retrieved:'2026-10-06',method:'Official local-government codes in Wikidata P429 joined to P41 flags; missing flags checked in explicit Japanese Wikipedia infobox flag fields. Original Commons images with source and license retained. Images load only for the selected place; locally cached originals are used when available. Emblems are not substituted.',flags:result,unverified:catalogue.filter(p=>!result[p.id]).map(p=>({id:p.id,name:p.en,kind:p.kind})),failures};
await fs.writeFile('dist/data/japan-local-flags.json',JSON.stringify(report));
console.log('Saved flags',Object.keys(result).length,'missing',report.unverified.length,'failures',JSON.stringify(failures));
