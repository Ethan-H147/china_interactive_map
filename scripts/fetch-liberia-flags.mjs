import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {flagThumbnail} from './flag-thumbnail.mjs';
import {load} from './geo-index.mjs';

const root='scripts/boundary-sources/liberia-flags/',out='dist/vendor/liberia-flags/',manifestFile='dist/data/liberia-flag-sources.json',refresh=process.argv.includes('--refresh');
const api='https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:SVG_flags_of_counties_of_Liberia&gcmnamespace=6&gcmlimit=max&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata%7Csha1&format=json&formatversion=2';
const reviewed={LR01:'Bomi',LR02:'Bong',LR03:'Gbarpolu',LR04:'Grand Bassa',LR05:'Grand Cape Mount',LR06:'Grand Gedeh',LR07:'Grand Kru',LR08:'Lofa',LR09:'Margibi',LR10:'Maryland',LR11:'Montserrado',LR12:'Nimba',LR13:'River Gee',LR14:'Rivercess',LR15:'Sinoe'};
const sha=b=>createHash('sha256').update(b).digest('hex'),sha1=b=>createHash('sha1').update(b).digest('hex');
async function download(url){for(let n=0;n<4;n++){const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map; flag source preservation)'},signal:AbortSignal.timeout(60000)});if(r.ok)return Buffer.from(await r.arrayBuffer());if(![429,502,503,504].includes(r.status))throw Error('Flag source HTTP '+r.status+': '+url);await new Promise(resolve=>setTimeout(resolve,1500*(n+1)));}throw Error('Flag source unavailable: '+url);}
const plain=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#0*39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(out,{recursive:true});
const cache=root+'commons-metadata.json.gz';if(refresh||!fs.existsSync(cache))fs.writeFileSync(cache,gzipSync(await download(api),{level:9}));
const raw=gunzipSync(fs.readFileSync(cache)),pages=JSON.parse(raw).query.pages,records=load('dist/data/europe/liberia/catalogue.bin').records.filter(r=>r.level===1),previous=fs.existsSync(manifestFile)?load(manifestFile):null;
if(records.length!==15||Object.keys(reviewed).some(id=>!records.some(r=>r.id===id&&r.en===reviewed[id])))throw Error('County identities differ from reviewed flag mapping');
const manifest={country:'liberia',retrieved:refresh||!previous?new Date().toISOString().slice(0,10):previous.retrieved,reference:'https://commons.wikimedia.org/wiki/Flags_of_counties_of_Liberia',metadata:{file:cache,url:api,sha256:sha(raw)},processing:'Original SVG files retained unchanged. Lossless WebP thumbnails preserve each flag’s aspect ratio. County flags use the shared regional details and flag viewer.',flags:{}},firstFlags={};
for(const r of records){
 const title='File:Flag of '+reviewed[r.id]+' County.svg',info=pages.find(p=>p.title===title)?.imageinfo?.[0];if(!info)throw Error('Missing reviewed artwork: '+title);
 const full='vendor/liberia-flags/'+r.id+'.svg',file='vendor/liberia-flags/'+r.id+'.webp';
 let bytes=fs.existsSync('dist/'+full)&&!refresh?fs.readFileSync('dist/'+full):await download(info.url);
 if(sha1(bytes)!==info.sha1)throw Error('Original differs from pinned Commons artwork: '+r.id);
 if(!bytes.toString('utf8').includes('<svg'))throw Error('Not SVG: '+r.id);
 const old=previous?.flags[r.id];if(old&&!refresh&&sha(bytes)!==old.sha256)throw Error('Retained flag changed: '+r.id);
 const tag=bytes.toString('utf8').match(/<svg\b[^>]*>/)[0],attr=name=>tag.match(new RegExp('\\s'+name+'=[\"\']([^\"\']+)[\"\']'))?.[1],box=attr('viewBox')?.split(/[ ,]+/).map(Number),size={width:parseFloat(attr('width'))||box?.[2]||info.width,height:parseFloat(attr('height'))||box?.[3]||info.height};
 fs.writeFileSync('dist/'+full,bytes);const thumbnail=await flagThumbnail(bytes,size);fs.writeFileSync('dist/'+file,thumbnail);
 const m=info.extmetadata,flag={country:'liberia',level:1,name:r.en,file,full,width:size.width,height:size.height,page:info.descriptionurl,source:info.url,commonsFile:title.slice(5),credit:plain(m.Artist?.value)||'Wikimedia Commons',license:plain(m.LicenseShortName?.value),...(m.LicenseUrl?.value?{licenseUrl:m.LicenseUrl.value}:{}),sha256:sha(bytes),thumbnailSha256:sha(thumbnail),commonsSha1:info.sha1};
 if(!flag.license)throw Error('Missing source license: '+r.id);manifest.flags[r.id]=flag;
 const {country,level,sha256,thumbnailSha256,commonsSha1,...display}=flag;firstFlags[r.id]=display;console.log(r.en,flag.license);
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync('dist/liberia-flags.mjs','// County artwork and credits: data/liberia-flag-sources.json.\nexport const liberiaFlags='+JSON.stringify({liberia:{firstFlags,detailFlags:{}}})+';\n');
const images=load('dist/data/flag-images.json');for(const flag of Object.values(manifest.flags))images[flag.file]={full:flag.full,credit:flag.credit,license:flag.license,source:flag.page};fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
const sources=load('dist/data/europe/liberia/sources.json');sources.sources.countyFlags={title:'County flags and original artwork credits',url:'data/liberia-flag-sources.json',reference:manifest.reference};fs.writeFileSync('dist/data/europe/liberia/sources.json',JSON.stringify(sources,null,2)+'\n');
console.log('Prepared all 15 Liberian county flags.');
