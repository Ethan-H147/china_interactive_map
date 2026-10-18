// US states + DC and Canadian provinces/territories, using the shared regional flag viewer.
// Originals and Commons attribution are retained; the manifest pins subsequent rebuilds.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const manifestFile='dist/data/north-america-flag-sources.json',outDir='dist/vendor/north-america-flags';
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
const records={};for(const c of ['united-states','canada'])records[c]=JSON.parse(gunzipSync(await fs.readFile('dist/data/europe/'+c+'/catalogue.bin'))).records;
// Explicit subdivision-ID mapping: display names alone can resolve to another country.
const flagFiles=JSON.parse(await fs.readFile('scripts/north-america-flag-files.json','utf8'));
const fileFor=r=>{if(!flagFiles[r.id])throw Error('No reviewed flag source for '+r.id);return flagFiles[r.id];};
const selected=Object.entries(records).flatMap(([country,list])=>list.filter(r=>r.level===1&&!r.populationStatus).map(r=>({country,r,file:fileFor(r)})));
const info=new Map();
const changed=selected.filter(({r,file})=>refresh||!previous.flags[r.id]||previous.flags[r.id].commonsFile!==file);
if(changed.length){
 for(let start=0;start<changed.length;start+=20){
  const batch=changed.slice(start,start+20),url='https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata%7Csha1&titles='+encodeURIComponent(batch.map(x=>'File:'+x.file).join('|'))+'&origin=*';
  const json=JSON.parse((await download(url)).toString());
  const redirects=new Map([...(json.query.normalized||[]),...(json.query.redirects||[])].map(x=>[x.from,x.to]));
  for(const item of batch){
   let title='File:'+item.file;for(let i=0;i<5&&redirects.has(title);i++)title=redirects.get(title);
   const page=json.query.pages.find(p=>p.title===title),meta=page?.imageinfo?.[0];
   if(!meta)throw Error('Missing Commons flag: '+item.file+' ('+title+')');
   info.set(item.r.id,meta);
  }
  await pause(1500);
 }
}
const plain=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#0*39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
await fs.mkdir(outDir,{recursive:true});
const manifest={retrieved:info.size?new Date().toISOString().slice(0,10):previous.retrieved,sources:{
 'united-states':'https://en.wikipedia.org/wiki/Flags_of_the_U.S._states_and_territories',
 canada:'https://www.canada.ca/en/canadian-heritage/services/provincial-territorial-symbols-canada.html',
 minnesota:'https://www.sos.mn.gov/about-minnesota/state-symbols/state-flag',
 utah:'https://onlinelibrary.utah.gov/state-symbol/flag/'
},flags:{}},module={};
for(const {country,r,file} of selected){
 const known=previous.flags[r.id],fresh=info.get(r.id),meta=fresh||(known&&{url:known.source,sha1:known.commonsSha1,width:known.width,height:known.height});
 let bytes;if(known&&!refresh&&!fresh){try{bytes=await fs.readFile('dist/'+known.full);}catch{}if(bytes&&sha(bytes)!==known.sha256)throw Error('Original checksum differs: '+r.id);}
 let flag=known;
 if(!bytes||refresh){
  if(!meta)throw Error('Missing source metadata for '+r.id+'; rerun with --refresh');
  bytes=await download(meta.url);
  if(known&&!refresh&&!fresh&&sha(bytes)!==known.sha256)throw Error('Pinned source changed: '+r.id);
  if(createHash('sha1').update(bytes).digest('hex')!==meta.sha1)throw Error('Commons checksum differs: '+r.id);
  if(!bytes.toString('utf8',0,4000).includes('<svg'))throw Error('Not SVG: '+r.id);
  const full='vendor/north-america-flags/'+r.id+'.svg',shown='vendor/north-america-flags/'+r.id+'.webp',m=meta.extmetadata||{};
  await fs.writeFile('dist/'+full,bytes);
  // Lossless thumbnails keep fine flag artwork crisp, without coloured compression fringes.
  await sharp(bytes,{density:Math.max(1,Math.min(300,72*1200/meta.width))}).resize({height:180}).webp({lossless:true}).toFile('dist/'+shown);
  flag=!fresh&&known?known:{country,level:1,name:r.en,file:shown,full,width:meta.width,height:meta.height,
   page:meta.descriptionurl,source:meta.url,commonsFile:file,credit:plain(m.Artist?.value)||'Wikimedia Commons',
   license:plain(m.LicenseShortName?.value)||'See Commons source page',
   ...(m.LicenseUrl?.value?{licenseUrl:m.LicenseUrl.value}:{}),sha256:sha(bytes),commonsSha1:meta.sha1};
  await pause(1100);
 }
 // Regenerate a missing thumbnail from the pinned local original without refreshing sources.
 try{await fs.access('dist/'+flag.file);}catch{await sharp(bytes,{density:Math.max(1,Math.min(300,72*1200/flag.width))}).resize({height:180}).webp({lossless:true}).toFile('dist/'+flag.file);}
 manifest.flags[r.id]=flag;
 module[country]??={firstFlags:{},detailFlags:{}};
 const {sha256,commonsSha1,commonsFile,country:unused,level,...display}=flag;
 module[country].firstFlags[r.id]=display;
 console.log(r.id,r.en,flag.license);
}
await fs.writeFile(manifestFile,JSON.stringify(manifest,null,1)+'\n');
await fs.writeFile('dist/north-america-flags.mjs','// Generated by scripts/fetch-north-america-flags.mjs; original artwork and licenses retained in the source manifest.\nexport const northAmericaFlags='+JSON.stringify(module)+';\n');
console.log('Prepared '+selected.length+' subdivision flags.');
