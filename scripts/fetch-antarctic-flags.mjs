import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const definitions=JSON.parse(await fs.readFile('scripts/antarctic-flag-definitions.json','utf8')),manifestFile='dist/data/antarctica/flag-sources.json';
const headers={'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map; flag source preservation)'};
const sha=b=>createHash('sha256').update(b).digest('hex'),clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#0*39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
async function download(url){for(let attempt=0;attempt<4;attempt++){const r=await fetch(url,{headers,signal:AbortSignal.timeout(45000)});if(r.ok)return Buffer.from(await r.arrayBuffer());if(![429,502,503,504].includes(r.status))throw Error('HTTP '+r.status+' '+url);await new Promise(r=>setTimeout(r,3000*(attempt+1)));}throw Error('Source unavailable: '+url);}
let previous={flags:{}};try{previous=JSON.parse(await fs.readFile(manifestFile,'utf8'));}catch{}
const needed=Object.entries(definitions.stations).filter(([id,d])=>process.argv.includes('--refresh')||previous.flags[id]?.commonsFile!==d.commonsFile),metadata=new Map();
if(needed.length){const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'imageinfo',iiprop:'url|size|extmetadata|sha1',titles:needed.map(([,d])=>'File:'+d.commonsFile).join('|')});const data=JSON.parse(await download(url)),redirects=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(r=>[r.from,r.to]));for(const [id,d]of needed){let title='File:'+d.commonsFile;for(let i=0;i<8&&redirects.has(title);i++)title=redirects.get(title);const info=data.query.pages.find(p=>p.title===title)?.imageinfo?.[0];if(!info)throw Error('Missing artwork: '+d.commonsFile);metadata.set(id,info);}}
const flags={};await fs.mkdir('dist/vendor/antarctic-flags',{recursive:true});
for(const [id,d]of Object.entries(definitions.stations)){
 const info=metadata.get(id);if(!info){const known=previous.flags[id],bytes=await fs.readFile('dist/'+known.full);if(sha(bytes)!==known.sha256)throw Error('Retained artwork changed: '+id);flags[id]=known;continue;}
 const url=new URL(info.url);url.search='';if(url.hostname!=='upload.wikimedia.org'||!url.pathname.endsWith('.svg'))throw Error('Unexpected artwork host/type');
 const bytes=await download(url.href),svg=bytes.toString();if(createHash('sha1').update(bytes).digest('hex')!==info.sha1)throw Error('Source checksum differs: '+id);
 if(!/<svg[\s>]/.test(svg)||/<script|<foreignObject|\son\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i.test(svg)||bytes.length>1_000_000)throw Error('Unsafe SVG: '+id);
 const m=info.extmetadata||{},license=clean(m.LicenseShortName?.value);if(!/public domain|cc0|cc by|cc-by|creative commons/i.test(license))throw Error('Unverified artwork license: '+id);
 const full='vendor/antarctic-flags/'+id+'.svg',file='vendor/antarctic-flags/'+id+'.webp';await fs.writeFile('dist/'+full,bytes);await sharp(bytes).resize({height:180}).webp({lossless:true}).toFile('dist/'+file);
 flags[id]={...d,file,full,width:info.width,height:info.height,page:info.descriptionurl,source:url.href,credit:clean(m.Artist?.value)||'Wikimedia Commons',license,licenseUrl:m.LicenseUrl?.value||'',sha256:sha(bytes),commonsSha1:info.sha1};console.log(d.name+': '+info.width+' × '+info.height+' · '+license);
}
await fs.writeFile(manifestFile,JSON.stringify({retrieved:new Date().toISOString().slice(0,10),policy:definitions.notes,flags},null,2)+'\n');
await (await import('./build-antarctic-flags.mjs')).buildAntarcticFlags();
