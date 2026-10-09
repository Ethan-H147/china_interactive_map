import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const references={prc:"Flag of the People's Republic of China.svg",roc:'Flag of the Republic of China.svg',hk:'Flag of Hong Kong.svg',mo:'Flag of Macau.svg',jp:'Flag of Japan.svg',kr:'Flag of South Korea.svg',kp:'Flag of North Korea.svg',mn:'Flag of Mongolia.svg',id:'Flag of Indonesia.svg',ph:'Flag of the Philippines.svg',my:'Flag of Malaysia.svg',sg:'Flag of Singapore.svg',ru:'Flag of Russia.svg',br:'Flag of Brazil.svg',ar:'Flag of Argentina.svg',uy:'Flag of Uruguay.svg'};
const headers={'User-Agent':'BoundaryAtlas/1.0 (educational atlas; flag source preservation)'};
async function request(url,binary=false){
 for(let attempt=0;attempt<5;attempt++){
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
  if(response.ok)return binary?Buffer.from(await response.arrayBuffer()):response.json();
  if(response.status!==429&&response.status<500)throw Error('Flag source returned '+response.status+' for '+url);
  await new Promise(resolve=>setTimeout(resolve,(attempt+1)*3000));
 }
 throw Error('Flag source temporarily unavailable: '+url);
}
const metadata=await request('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'url|size|extmetadata',redirects:'1',titles:Object.values(references).map(name=>'File:'+name).join('|')}));
const images={};
for(const page of Object.values(metadata.query.pages))images[page.title]=page.imageinfo?.[0];
for(const redirect of metadata.query.redirects||[])images[redirect.from]=images[redirect.to];
const clean=text=>(text||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim(),flags={};
await fs.mkdir('dist/vendor/flag-originals',{recursive:true});
for(const [id,name] of Object.entries(references)){
 const info=images['File:'+name];
 if(!info||new URL(info.url).hostname!=='upload.wikimedia.org'||!new URL(info.url).pathname.endsWith('.svg'))throw Error('Missing original SVG: '+name);
 const original=new URL(info.url);original.search='';
 const license=clean(info.extmetadata?.LicenseShortName?.value);
 if(!/public domain|cc0|cc by|cc-by|creative commons|gfdl/i.test(license))throw Error('Unverified reusable license: '+name);
 const file='vendor/flag-'+id+(['my','sg'].includes(id)?'.webp':'.svg'),full='vendor/flag-originals/national-'+id+'.svg';
 let data;try{data=await fs.readFile('dist/'+full);}catch{data=await request(original.href,true);}
 const svg=data.toString();
 if(data.length>1024*1024||!/<svg[\s>]/.test(svg)||/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(svg))throw Error('Unsafe or oversized SVG: '+name);
 const root=svg.match(/<svg\b[^>]*>/)[0],viewBox=root.match(/\bviewBox=["']([^"']+)/)?.[1].trim().split(/[\s,]+/).map(Number);
 const width=Number(root.match(/\bwidth=["']([\d.]+)(?:px)?["']/)?.[1])||viewBox?.[2],height=Number(root.match(/\bheight=["']([\d.]+)(?:px)?["']/)?.[1])||viewBox?.[3];
 if(!(width>0&&height>0))throw Error('Missing intrinsic SVG proportions: '+name);
 await fs.writeFile('dist/'+full,data);
 flags[id]={file,full,width,height,original:original.href,source:info.descriptionurl,credit:clean(info.extmetadata?.Artist?.value)||'Wikimedia Commons',license,sha256:createHash('sha256').update(data).digest('hex')};
 console.log(id,width+' × '+height,license);
}
await fs.writeFile('dist/data/national-flag-sources.json',JSON.stringify({retrieved:new Date().toISOString().slice(0,10),processing:'Unmodified original SVG files; thumbnail assets remain separate.',flags},null,2)+'\n');
