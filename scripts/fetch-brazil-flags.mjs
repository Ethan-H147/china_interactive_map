import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const records=JSON.parse(gunzipSync(await fs.readFile('dist/data/south-america/brazil-first.bin'))).records;
const api=(host,args)=>'https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',...args});
async function request(url,binary=false){
 for(let attempt=0;attempt<5;attempt++){
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'BoundaryAtlas/1.0 (educational administrative atlas)'}});
  if(response.ok)return binary?Buffer.from(await response.arrayBuffer()):response.json();
  if(response.status!==429&&response.status<500)throw Error('Flag source returned '+response.status);
  await new Promise(resolve=>setTimeout(resolve,(attempt+1)*2000));
 }
 throw Error('Flag source temporarily unavailable');
}
const table=await request(api('commons.wikimedia.org',{action:'parse',page:'Flags of states of Brazil',prop:'wikitext|revid'}));
const section=table.parse.wikitext['*'].split('==')[0];
const references={};
for(const record of records){
 const matches=[...section.matchAll(/\{\{Flag entry[\s\S]*?\|Image=([^|]+)\|Caption=([^}]+)\}\}/g)].filter(m=>m[2].includes('|'+record.en+']]'));
 if(matches.length!==1)throw Error('Expected one current state flag for '+record.en);
 references[record.id]={name:record.en,file:matches[0][1].trim()};
}
if(Object.keys(references).length!==27)throw Error('Expected 26 states and Distrito Federal');
const metadata=await request(api('commons.wikimedia.org',{action:'query',prop:'imageinfo',iiprop:'url|size|extmetadata',redirects:'1',titles:Object.values(references).map(r=>'File:'+r.file).join('|')}));
const images={};
for(const page of Object.values(metadata.query.pages))images[page.title]=page.imageinfo?.[0];
for(const redirect of metadata.query.redirects||[])images[redirect.from]=images[redirect.to];
const clean=text=>(text||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
const flags={},assets='dist/vendor/brazil-flags',originals='scripts/brazil-sources/flags';
await fs.mkdir(assets,{recursive:true});
await fs.mkdir(originals,{recursive:true});
for(const [id,reference] of Object.entries(references)){
 const info=images['File:'+reference.file];
 if(!info||new URL(info.url).hostname!=='upload.wikimedia.org'||!new URL(info.url).pathname.endsWith('.svg'))throw Error('Missing SVG: '+reference.name);
 const original=new URL(info.url);original.search='';
 const license=clean(info.extmetadata?.LicenseShortName?.value);
 if(!/public domain|cc0|cc by|cc-by|creative commons|gfdl/i.test(license))throw Error('Unverified reusable license: '+reference.name);
 let data;
 try{data=await fs.readFile(originals+'/'+id+'.svg');}catch{try{data=await fs.readFile(assets+'/'+id+'.svg');}catch{data=await request(original.href,true);}}
 const svg=data.toString();
 if(data.length>1024*1024||!/<svg[\s>]/.test(svg)||/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(svg))throw Error('Unsafe or oversized flag: '+reference.name);
 const file='vendor/brazil-flags/'+id+'.webp',image=await sharp(data).resize({width:320}).webp({lossless:true}).toBuffer();
 await fs.writeFile(originals+'/'+id+'.svg',data);
 await fs.writeFile('dist/'+file,image);
 await fs.rm(assets+'/'+id+'.svg',{force:true});
 flags[id]={...(id==='BR-13'?{designSource:'https://sapl.al.am.leg.br/norma/15085',designYear:2026}:{}),name:reference.name,file,page:info.descriptionurl,original:original.href,originalFile:originals+'/'+id+'.svg',originalSha256:createHash('sha256').update(data).digest('hex'),license,licenseUrl:info.extmetadata?.LicenseUrl?.value||info.descriptionurl,author:clean(info.extmetadata?.Artist?.value),attribution:clean(info.extmetadata?.Attribution?.value),sha256:createHash('sha256').update(image).digest('hex'),bytes:image.length};
 console.log(reference.name,image.length);
}
await fs.writeFile('dist/data/brazil-flag-sources.json',JSON.stringify({retrieved:new Date().toISOString().slice(0,10),processing:'Original SVG artwork rendered at 320 pixels wide as lossless WebP; design, colors and proportions preserved.',reference:'https://commons.wikimedia.org/wiki/Flags_of_states_of_Brazil',referenceRevision:table.parse.revid,flags},null,2)+'\n');
const displayFlags=Object.fromEntries(Object.entries(flags).map(([id,f])=>[id,{name:f.name,file:f.file,page:f.page,credit:(f.attribution||f.author).length<180?(f.attribution||f.author):'State flag artwork via Wikimedia Commons',license:f.license}]));
await fs.writeFile('dist/brazil-flags.mjs','// Original Commons artwork; full attribution in data/brazil-flag-sources.json.\nexport const brazilFlags='+JSON.stringify(displayFlags)+';\n');
console.log('Saved all 26 state flags and Distrito Federal.');

