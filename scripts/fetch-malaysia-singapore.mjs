import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const folder='scripts/additional-sources/malaysia-singapore';
await fs.mkdir(folder,{recursive:true});
async function request(url,binary=false){
 for(let attempt=0;attempt<6;attempt++){
  const r=await fetch(url,{signal:AbortSignal.timeout(60000),headers:{'User-Agent':'BoundaryAtlas/1.0 (educational atlas)'}});
  if(r.ok)return binary?Buffer.from(await r.arrayBuffer()):r.json();
  if(r.status!==429&&r.status<500)throw Error('Source returned '+r.status);
  await new Promise(resolve=>setTimeout(resolve,Math.min(15000,(attempt+1)*3000)));
 }
 throw Error('Source temporarily unavailable');
}
const sources={};
for(const file of ['administrative_1_state.geojson','administrative_2_district.geojson']){
 const url='https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/'+file;
 const data=await request(url);await fs.writeFile(folder+'/'+file,JSON.stringify(data));sources[file]={url,features:data.features.length};
}
const singaporeDataset='d_29f066d67df3eae91df8a42f443863c8';
const download=await request('https://api-open.data.gov.sg/v1/public/api/datasets/'+singaporeDataset+'/poll-download');
if(download.code!==0||!download.data?.url)throw Error('Singapore download not ready');
const singapore=await request(download.data.url);await fs.writeFile(folder+'/singapore.geojson',JSON.stringify(singapore));
sources.singapore={url:'https://data.gov.sg/datasets/'+singaporeDataset+'/view',features:singapore.features.length,dataDate:'2025-06',license:'Singapore Open Data Licence'};
const files={1:'Flag of Johor.svg',2:'Flag of Kedah.svg',3:'Flag of Kelantan.svg',4:'Flag of Malacca.svg',5:'Flag of Negeri Sembilan.svg',6:'Flag of Pahang.svg',7:'Flag of Penang.svg',8:'Flag of Perak.svg',9:'Flag of Perlis.svg',10:'Flag of Selangor.svg',11:'Flag of Terengganu.svg',12:'Flag of Sabah.svg',13:'Flag of Sarawak.svg',14:'Flag of Kuala Lumpur, Malaysia.svg',15:'Flag of Labuan.svg',16:'Flag of Putrajaya.svg',my:'Flag of Malaysia.svg',sg:'Flag of Singapore.svg'};
const api='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({format:'json',action:'query',prop:'imageinfo',iiprop:'url|size|extmetadata',redirects:'1',titles:Object.values(files).map(f=>'File:'+f).join('|')});
const response=await request(api),images={};
for(const page of Object.values(response.query.pages))images[page.title]=page.imageinfo?.[0];
for(const r of response.query.redirects||[])images[r.from]=images[r.to];
const clean=text=>(text||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim(),flags={};
await fs.mkdir('dist/vendor/malaysia-flags',{recursive:true});
for(const [code,title] of Object.entries(files)){
 const info=images['File:'+title];if(!info||new URL(info.url).hostname!=='upload.wikimedia.org')throw Error('Missing flag '+title);
 const license=clean(info.extmetadata?.LicenseShortName?.value);if(!/public domain|cc0|cc by|cc-by|creative commons|gfdl/i.test(license))throw Error('Flag license: '+title+' '+license);
 const national=['my','sg'].includes(code),file=national?'vendor/flag-'+code+'.webp':'vendor/malaysia-flags/MY-'+code.padStart(2,'0')+'.webp';
 let image;try{image=await fs.readFile('dist/'+file);}catch{
  const data=await request(info.url,true),svg=data.toString();
  if(data.length>1024*1024||!/<svg[\s>]/.test(svg)||/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(svg))throw Error('Unsafe flag '+title);
  image=await sharp(data).resize({width:320}).webp({lossless:true}).toBuffer();await fs.writeFile('dist/'+file,image);
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 flags[national?code:'MY-'+code.padStart(2,'0')]={file,page:info.descriptionurl,original:info.url,license,author:clean(info.extmetadata?.Artist?.value),licenseUrl:info.extmetadata?.LicenseUrl?.value||info.descriptionurl,sha256:createHash('sha256').update(image).digest('hex'),bytes:image.length};
 console.log(title,image.length);
}
await fs.writeFile(folder+'/sources.json',JSON.stringify({retrieved:new Date().toISOString().slice(0,10),sources,flags},null,2)+'\n');
