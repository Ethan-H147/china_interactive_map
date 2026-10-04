import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.ATLAS_SHARP||'sharp');
const cache='artifacts/explore/';
const sources=JSON.parse(await fs.readFile('scripts/additional-sources/landmark-photos.json'));
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
if(only&&!sources.some(({site})=>site.id===only))throw Error('Unknown landmark: '+only);
const existing=only?JSON.parse(await fs.readFile('dist/data/landmarks.json')).landmarks:[];
const text=html=>(html||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
await fs.mkdir('dist/photos',{recursive:true});await fs.mkdir(cache+'originals',{recursive:true});
const landmarks=[];
for(const {site:s,filename,info,asset=s.id} of sources){
 if(only&&s.id!==only){const saved=existing.find(item=>item.id===s.id);if(!saved)throw Error('Missing existing landmark: '+s.id);landmarks.push(saved);continue;}
 const page={fullurl:s.articleUrl};
 if(!info||Math.max(info.width,info.height)<2560||Math.min(info.width,info.height)<1600)throw Error('Insufficient resolution: '+filename);
 const original=cache+'originals/'+encodeURIComponent(filename)+'.jpg';
 try{await fs.access(original);}catch{
  const response=await fetch(info.url,{headers:{'User-Agent':'ChinaAtlas/1.0 (https://china-boundary-atlas.hys0423.chatgpt.site/)'},signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(response.status+' '+filename);await fs.writeFile(original,new Uint8Array(await response.arrayBuffer()));
 }
 const out=await sharp(original).rotate().webp({quality:90,effort:5}).toFile('dist/photos/'+asset+'.webp');
 const ext=info.extmetadata;
 if(!/CC|Public domain/i.test(ext.LicenseShortName?.value||''))throw Error('Review license '+filename);
 const author=text(ext.Artist?.value);
 if(!author)throw Error('Missing author '+filename);
 landmarks.push({id:s.id,city:s.city,district:s.district,en:s.en,zh:s.zh,article:page?.fullurl||null,photo:{src:'photos/'+asset+'.webp',width:out.width,height:out.height,sourceWidth:info.width,sourceHeight:info.height,original:info.url,source:info.descriptionurl,file:filename,author,license:text(ext.LicenseShortName?.value),licenseUrl:ext.LicenseUrl?.value||'https://creativecommons.org/publicdomain/zero/1.0/',changes:'Converted to WebP; original pixel dimensions retained.'}});
 console.log(s.id,out.width+' × '+out.height,Math.round(out.size/1024)+' KB');
}
await fs.writeFile('dist/data/landmarks.json',JSON.stringify({checked:'2026-10-04',landmarks},null,2));
if(only)process.exit(0);
const thumbs=await Promise.all(landmarks.map(async(s,i)=>({input:await sharp('dist/'+s.photo.src).resize(260,185,{fit:'contain',background:'#eee'}).extend({bottom:28,background:'#fff'}).composite([{input:Buffer.from(`<svg width="260" height="28"><text x="8" y="20" font-size="15">${s.id}</text></svg>`),top:185,left:0}]).png().toBuffer(),left:(i%4)*260,top:Math.floor(i/4)*213})));
await sharp({create:{width:1040,height:Math.ceil(landmarks.length/4)*213,channels:3,background:'#fff'}}).composite(thumbs).png().toFile(cache+'contact-sheet.png');
