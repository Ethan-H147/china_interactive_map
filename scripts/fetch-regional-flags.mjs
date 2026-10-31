import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import sharp from 'sharp';
import {load} from './geo-index.mjs';
import {flagThumbnail} from './flag-thumbnail.mjs';

const root='scripts/boundary-sources/regional-flags/',out='dist/vendor/regional-flags/',reviewed=load(root+'reviewed.json');
const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex');
const plain=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#0*39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
let lastArtwork=0;
async function download(url){if(new URL(url).hostname==='upload.wikimedia.org'){const delay=Math.max(0,6500-(Date.now()-lastArtwork));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));lastArtwork=Date.now();}for(let n=0;n<5;n++){const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (geographic reference; retained flag artwork)'},signal:AbortSignal.timeout(60000)});if(r.ok)return Buffer.from(await r.arrayBuffer());if(![429,502,503,504].includes(r.status))throw Error(url+' HTTP '+r.status);const delay=Math.max(2500*(n+1),Number(r.headers.get('retry-after')||0)*1000);console.log('Source cooldown:',Math.ceil(delay/1000),'seconds');await new Promise(resolve=>setTimeout(resolve,delay));}throw Error('Download unavailable: '+url);}
fs.mkdirSync(out,{recursive:true});
const cache=root+'reviewed-metadata.json.gz';let metadata=fs.existsSync(cache)?load(cache):{};
const files=[...new Set(reviewed.map(x=>x.file))];
for(let i=0;i<files.length;i+=12){const batch=files.slice(i,i+12).filter(f=>!metadata[f]?.thumburl);if(!batch.length)continue;const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'imageinfo',iiprop:'url|size|extmetadata|sha1',iiurlwidth:'1280',titles:batch.map(f=>'File:'+f).join('|')});const j=JSON.parse(await download(url));const redirects=new Map([...(j.query.normalized||[]),...(j.query.redirects||[])].map(x=>[x.from,x.to]));for(const file of batch){let title='File:'+file;for(let n=0;n<10&&redirects.has(title);n++)title=redirects.get(title);const info=j.query.pages.find(p=>p.title===title)?.imageinfo?.[0];if(!info)throw Error('Missing artwork: '+file);metadata[file]=info;}fs.writeFileSync(cache,gzipSync(JSON.stringify(metadata),{level:9}));}
// Raster files cannot be enlarged by Commons; request a smaller service image.
for(const file of files){if(new URL(metadata[file].thumburl).hostname!=='upload.wikimedia.org')continue;const width=Math.min(500,metadata[file].width-1),url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'imageinfo',iiprop:'url|size|extmetadata|sha1',iiurlwidth:String(width),titles:'File:'+file});const j=JSON.parse(await download(url));metadata[file]=j.query.pages[0].imageinfo[0];if(new URL(metadata[file].thumburl).hostname!=='thumb.wikimedia.org')throw Error('No service rendering available: '+file);}
fs.writeFileSync(cache,gzipSync(JSON.stringify(Object.fromEntries(files.map(file=>[file,metadata[file]]))),{level:9}));
const sets={},manifest={retrieved:'2026-10-30',policy:'Only adopted territorial/municipal flags with recorded evidence. Unverified, proposed and unofficial designs are omitted. Municipal flags are not assigned to same-named counties or provinces.',omissions:{romania:'Unverified county-gallery designs, Harghita/Covasna contested designs, and city flags without verified adoption are excluded. Constanța city flag is not a county flag. Mureș must not inherit Maramureș artwork.',bulgaria:'Municipal flags only; no invented province flags. Sofia is both a municipality and a capital province.'},flags:{}};
for(const r of reviewed){
 const unit=load('dist/data/europe/'+r.country+'/catalogue.bin').records.find(x=>x.id===r.id);if(!unit||unit.en!==r.name||unit.level!==r.level)throw Error('Reviewed identity mismatch: '+r.id);
 const info=metadata[r.file],ext=r.file.split('.').at(-1).toLowerCase(),original='vendor/regional-flags/'+r.id+(ext==='webp'?'-original':'')+'.'+ext,file='vendor/regional-flags/'+r.id+'.webp';
 // Wikimedia asks bulk clients to use its dedicated thumbnail service. Retain
 // existing originals unchanged and use its 1280px rendering for other artwork.
 const retainedOriginal=fs.existsSync('dist/'+original),renderExt=new URL(info.thumburl).pathname.split('.').at(-1),full=retainedOriginal?original:'vendor/regional-flags/'+r.id+'-render.'+renderExt;
 const bytes=fs.existsSync('dist/'+full)?fs.readFileSync('dist/'+full):await download(info.thumburl);
 if(retainedOriginal&&hash(bytes,'sha1')!==info.sha1)throw Error('Artwork changed: '+r.id);fs.writeFileSync('dist/'+full,bytes);
 const intrinsic=await sharp(bytes).metadata();let size={width:intrinsic.width,height:intrinsic.height};
 if(retainedOriginal&&ext==='svg'){const box=bytes.toString('utf8').match(/viewBox=["']([^"']+)["']/i)?.[1].split(/[ ,]+/).map(Number);if(box)size={width:box[2],height:box[3]};}
 const thumbnail=await flagThumbnail(bytes,size);fs.writeFileSync('dist/'+file,thumbnail);const m=info.extmetadata;
 const flag={file,full,name:r.name,...size,page:info.descriptionurl,source:retainedOriginal?info.url:info.thumburl,credit:plain(m.Artist?.value)||'Wikimedia Commons',license:plain(m.LicenseShortName?.value),...(m.LicenseUrl?.value?{licenseUrl:m.LicenseUrl.value}:{})};if(!flag.license)throw Error('Missing license: '+r.id);
 manifest.flags[r.id]={country:r.country,level:r.level,...flag,commonsFile:r.file,evidence:r.evidence,adoption:r.adoption,sha256:hash(bytes),thumbnailSha256:hash(thumbnail),commonsSha1:info.sha1,originalSource:info.url,processing:retainedOriginal?'Unmodified source original':'Wikimedia '+intrinsic.width+'px rendering, retained without edits'};
 const set=sets[r.country]??={firstFlags:{},detailFlags:{}};set[r.level===1?'firstFlags':'detailFlags'][r.id]=flag;console.log(r.country,r.name);
}
fs.writeFileSync('dist/regional-flags.mjs','// Adopted territorial and municipal artwork; evidence: data/regional-flag-sources.json.\nexport const regionalFlags='+JSON.stringify(sets)+';\n');
fs.writeFileSync('dist/data/regional-flag-sources.json',JSON.stringify(manifest,null,2)+'\n');
const images=load('dist/data/flag-images.json');for(const f of Object.values(manifest.flags))images[f.file]={full:f.full,credit:f.credit,license:f.license,source:f.page};fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
for(const country of Object.keys(sets)){const path='dist/data/europe/'+country+'/sources.json',s=load(path);s.sources.regionalFlags={title:'Regional and municipal flags, adoption evidence and artwork credits',url:'data/regional-flag-sources.json'};fs.writeFileSync(path,JSON.stringify(s,null,2)+'\n');}
console.log('Prepared',reviewed.length,'reviewed flag entries.');
