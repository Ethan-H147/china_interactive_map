import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {flagThumbnail} from './flag-thumbnail.mjs';
import {load} from './geo-index.mjs';
import {brazilFlags} from '../dist/brazil-flags.mjs';
const root='scripts/boundary-sources/major-city-flags/',review=load(root+'reviewed.json'),metadata=JSON.parse(gunzipSync(fs.readFileSync(root+'metadata.json.gz'))),out='dist/vendor/major-city-flags/';
const hash=b=>createHash('sha256').update(b).digest('hex'),plain=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
fs.mkdirSync(out,{recursive:true});
async function download(url){for(let n=0;n<4;n++){const response=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (municipal symbols reference)'},signal:AbortSignal.timeout(45000)});if(response.ok)return Buffer.from(await response.arrayBuffer());if(![429,502,503,504].includes(response.status))throw Error('Artwork HTTP '+response.status+' '+url);console.log('Artwork source cooldown',response.status);await new Promise(r=>setTimeout(r,Math.min(30000,Number(response.headers.get('retry-after')||5)*1000)));}throw Error('Artwork unavailable '+url);}
const sets={canada:{detailFlags:{}},brazil:{detailFlags:{}}},manifest={asOf:review.asOf,scope:review.scope,populationSource:review.populationSource,policy:'Official municipal flags only. Historical and proposed replacements are excluded. Source artwork is retained without redrawing; only local display thumbnails are resized.',flags:{}};
for(const r of review.records){
 if(r.id==='BR-5300108'){const f=brazilFlags['BR-53'];if(!f)throw Error('Federal District flag missing');const full='vendor/flag-originals/BR-53.svg',bytes=fs.readFileSync('dist/'+full),size=await sharp(bytes).metadata();sets.brazil.detailFlags[r.id]={...f,full,width:size.width,height:size.height,name:'Brasília (Federal District)'};manifest.flags[r.id]={...r,...sets.brazil.detailFlags[r.id],reuse:'BR-53',sha256:hash(bytes),thumbnailSha256:hash(fs.readFileSync('dist/'+f.file))};continue;}
 const m=metadata[r.id],file='vendor/major-city-flags/'+r.id+'.webp';let bytes,full,source,processing;
 if(r.cached){bytes=fs.readFileSync(root+r.cached);if(hash(bytes)!==r.sha256)throw Error('Reviewed source changed '+r.id);full='vendor/major-city-flags/'+r.id+'.'+r.cached.split('.').at(-1);source=r.source;processing=r.cached.endsWith('.svg')?'Vector excerpt of official flag diagram; dimension annotations excluded':'Unmodified retained source image';}
 else{const ext=new URL(m.thumburl||m.url).pathname.split('.').at(-1);full='vendor/major-city-flags/'+r.id+'-source.'+ext;source=m.thumburl||m.url;bytes=fs.existsSync('dist/'+full)?fs.readFileSync('dist/'+full):await download(source);processing=m.thumburl?'Unmodified Wikimedia service rendering of the sourced official flag':'Unmodified source original';}
 if(r.expectedSourceSha256&&hash(bytes)!==r.expectedSourceSha256)throw Error('Reviewed artwork changed '+r.id);
 const size=await sharp(bytes).metadata(),dimensions={width:size.width,height:size.height};
 const thumbnail=await flagThumbnail(bytes,dimensions),flag={name:r.name,file,full,...dimensions,page:r.page||m?.descriptionurl||r.source,source,credit:r.credit||plain(m.extmetadata.Artist?.value)||'See artwork source',license:r.license||plain(m.extmetadata.LicenseShortName?.value)||'Municipal symbol; source rights retained',...(m?.extmetadata.LicenseUrl?.value?{licenseUrl:m.extmetadata.LicenseUrl.value}:{})};
 fs.writeFileSync('dist/'+full,bytes);fs.writeFileSync('dist/'+file,thumbnail);sets[r.country].detailFlags[r.id]=flag;manifest.flags[r.id]={...r,...flag,processing,sha256:hash(bytes),thumbnailSha256:hash(thumbnail),...(m?{originalSource:m.url,originalSha1:m.sha1}:{})};console.log(r.country,r.name);

}
fs.writeFileSync('dist/major-city-flags.mjs','// Official municipal flags; reviewed evidence: data/major-city-flag-sources.json.\nexport const majorCityFlags='+JSON.stringify(sets)+';\n');
fs.writeFileSync('dist/data/major-city-flag-sources.json',JSON.stringify(manifest,null,2)+'\n');
const images=load('dist/data/flag-images.json');for(const f of Object.values(manifest.flags))images[f.file]={full:f.full||f.file,credit:f.credit,license:f.license,source:f.page};fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));
console.log('Prepared',Object.keys(manifest.flags).length,'city flag associations.');
