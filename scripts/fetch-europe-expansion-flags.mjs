// German states and independent cities, Dutch provinces, Belgian regional and provincial flags.
// Originals and Commons attribution are retained; the manifest pins subsequent rebuilds.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const manifestFile='dist/data/europe-expansion-flag-sources.json',outDir='dist/vendor/europe-expansion-flags';
const agent={'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map; flag source preservation)'};
const refresh=process.argv.includes('--refresh'),sha=b=>createHash('sha256').update(b).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function download(url){
 for(let i=0;i<5;i++){
  const r=await fetch(url,{headers:agent,signal:AbortSignal.timeout(60000)});
  if(r.ok)return Buffer.from(await r.arrayBuffer());
  if(![429,502,503,504].includes(r.status))throw Error('HTTP '+r.status+': '+url);
  console.log('Retrying HTTP '+r.status);await pause(Math.min(30000,5000*(i+1)));
 }
 throw Error('Source unavailable: '+url);
}
let previous;try{previous=JSON.parse(await fs.readFile(manifestFile,'utf8'));}catch{previous={flags:{}};}
const reviewed=JSON.parse(await fs.readFile('scripts/europe-expansion-flag-files.json','utf8')).flags;
const records={};for(const c of [...new Set(Object.values(reviewed).map(r=>r.country))])records[c]=JSON.parse(gunzipSync(await fs.readFile('dist/data/europe/'+c+'/catalogue.bin'))).records;
// Explicit subdivision-ID mapping: display names alone can resolve to another country.
const flagFiles=Object.fromEntries(Object.entries(reviewed).map(([id,r])=>[id,r.file]));
const fileFor=r=>{if(!flagFiles[r.id])throw Error('No reviewed flag source for '+r.id);return flagFiles[r.id];};
const selected=Object.entries(records).flatMap(([country,list])=>list.filter(r=>flagFiles[r.id]).map(r=>({country,r,file:fileFor(r)})));
await fs.mkdir('artifacts/europe-flag-research',{recursive:true});
const metaFile='artifacts/europe-flag-research/commons-metadata.json';
let cached={};try{cached=JSON.parse(await fs.readFile(metaFile,'utf8'));}catch{}
const info=new Map(Object.entries(refresh?{}:cached.files||{}));
const changed=selected.filter(({r,file})=>refresh||!previous.flags[r.id]||previous.flags[r.id].commonsFile!==file);
if(changed.length){
 for(let start=0;start<changed.length;start+=20){
  const batch=changed.slice(start,start+20).filter(x=>!reviewed[x.r.id].localOriginal&&!info.has(x.file));if(!batch.length)continue;const url='https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata%7Csha1&titles='+encodeURIComponent(batch.map(x=>'File:'+x.file).join('|'))+'&origin=*';
  const json=JSON.parse((await download(url)).toString());
  const redirects=new Map([...(json.query.normalized||[]),...(json.query.redirects||[])].map(x=>[x.from,x.to]));
  for(const item of batch){
   let title='File:'+item.file;for(let i=0;i<5&&redirects.has(title);i++)title=redirects.get(title);
   const page=json.query.pages.find(p=>p.title===title),meta=page?.imageinfo?.[0];
   if(!meta)throw Error('Missing Commons flag: '+item.file+' ('+title+')');
   info.set(item.file,meta);
  }
  await fs.writeFile(metaFile,JSON.stringify({files:Object.fromEntries(info)}));await pause(1500);
 }
}
const plain=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#0*39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
await fs.mkdir(outDir,{recursive:true});
const manifest={retrieved:info.size?new Date().toISOString().slice(0,10):previous.retrieved,sources:{reviewed:'scripts/europe-expansion-flag-files.json',states:'https://en.wikipedia.org/wiki/Flags_of_German_states',cities:'https://www.wikidata.org/wiki/Property:P605',belgium:'https://www.belgium.be/en/about_belgium/country/belgium_in_nutshell/symbols/flags',netherlands:'https://en.wikipedia.org/wiki/Flags_of_provinces_of_the_Netherlands'},flags:{}},module={};
for(const {country,r,file} of selected){
 const local=reviewed[r.id].localOriginal?await fs.readFile(reviewed[r.id].localOriginal):null;
 const localMeta=local?{url:reviewed[r.id].reference,sha1:createHash('sha1').update(local).digest('hex'),width:reviewed[r.id].width,height:reviewed[r.id].height,descriptionurl:reviewed[r.id].reference,extmetadata:{Artist:{value:reviewed[r.id].credit},LicenseShortName:{value:reviewed[r.id].license}}}:null;
 const known=previous.flags[r.id],fresh=localMeta||(changed.some(x=>x.r.id===r.id)?info.get(file):null),meta=localMeta||fresh||(known&&{url:known.source,sha1:known.commonsSha1,width:known.width,height:known.height});
 let bytes;if(known&&!refresh&&!fresh){try{bytes=await fs.readFile('dist/'+known.full);}catch{}if(bytes&&sha(bytes)!==known.sha256)throw Error('Original checksum differs: '+r.id);}
 let flag=known;
 if(!bytes||refresh){
  if(!meta)throw Error('Missing source metadata for '+r.id+'; rerun with --refresh');
  bytes=local||await download(meta.url);
  if(known&&!refresh&&!fresh&&sha(bytes)!==known.sha256)throw Error('Pinned source changed: '+r.id);
  if(createHash('sha1').update(bytes).digest('hex')!==meta.sha1)throw Error('Commons checksum differs: '+r.id);
  const extension=file.toLowerCase().endsWith('.svg')?'svg':'png';
  if(extension==='svg'&&!bytes.toString('utf8',0,4000).includes('<svg'))throw Error('Not SVG: '+r.id);
  const full='vendor/europe-expansion-flags/'+r.id+'.'+extension,shown='vendor/europe-expansion-flags/'+r.id+'.webp',m=meta.extmetadata||{};
  await fs.writeFile('dist/'+full,bytes);
  // Lossless thumbnails keep fine flag artwork crisp, without coloured compression fringes.
  await sharp(bytes,{density:Math.max(1,Math.min(300,72*1200/meta.width))}).resize({height:180}).webp({lossless:true}).toFile('dist/'+shown);
  flag=!fresh&&known?known:{country,level:r.level,name:r.en.replace(/, (Kreisfreie Stadt|Stadtkreis)$/, ''),file:shown,full,width:meta.width,height:meta.height,
   page:meta.descriptionurl,source:meta.url,commonsFile:file,credit:plain(m.Artist?.value)||'Wikimedia Commons',
   license:plain(m.LicenseShortName?.value)||'See Commons source page',
   ...(m.LicenseUrl?.value?{licenseUrl:m.LicenseUrl.value}:{}),sha256:sha(bytes),commonsSha1:meta.sha1};
  await pause(1100);
 }
 // Regenerate a missing thumbnail from the pinned local original without refreshing sources.
 try{await fs.access('dist/'+flag.file);}catch{await sharp(bytes,{density:Math.max(1,Math.min(300,72*1200/flag.width))}).resize({height:180}).webp({lossless:true}).toFile('dist/'+flag.file);}
 const {status:oldStatus,scope:oldScope,...artwork}=flag;
 flag={...artwork,...(reviewed[r.id].status?{status:reviewed[r.id].status}:{}),...(reviewed[r.id].scope?{scope:reviewed[r.id].scope}:{}),reference:reviewed[r.id].reference,sourceKind:local?'municipal-rendering':'commons'};
 manifest.flags[r.id]=flag;
 await fs.writeFile(manifestFile,JSON.stringify({...manifest,flags:{...previous.flags,...manifest.flags}},null,1)+'\n');
 module[country]??={firstFlags:{},detailFlags:{}};
 const {sha256,commonsSha1,commonsFile,country:unused,level,...display}=flag;
 (r.level===1?module[country].firstFlags:module[country].detailFlags)[r.id]=display;
 console.log(r.id,r.en,flag.license);
}
for(const r of records.germany.filter(r=>r.level===3))if(module.germany.detailFlags[r.parent])module.germany.detailFlags[r.id]=module.germany.detailFlags[r.parent];
await fs.writeFile(manifestFile,JSON.stringify(manifest,null,1)+'\n');
await fs.writeFile('dist/europe-expansion-flags.mjs','// Generated by scripts/fetch-europe-expansion-flags.mjs; original artwork and licenses retained in the source manifest.\nexport const europeExpansionFlags='+JSON.stringify(module)+';\n');
console.log('Prepared '+selected.length+' subdivision flags.');
