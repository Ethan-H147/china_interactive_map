import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {municipalSourceRequest} from './municipal-source-request.mjs';
import {flagThumbnail} from './flag-thumbnail.mjs';
const root='artifacts/canada-municipal-research/fotw',rows=JSON.parse(fs.readFileSync(root+'/research.json')),top=JSON.parse(fs.readFileSync('artifacts/canada-source/top500-entities.json')),byId=new Map(top.map(r=>[r.id,r])),pinFile='scripts/canada-municipal-fotw-flag-files.json',manifestFile='dist/data/canada-municipal-fotw-flag-sources.json',previous=fs.existsSync(pinFile)?JSON.parse(fs.readFileSync(pinFile)):null,flags={},audit=[],skip={'Lunenburg':'Reference is the separate Town of Lunenburg, not the District Municipality',"L'Assomption":'Reference is the regional county municipality, not the city',Bécancour:'Reference is the regional county municipality, not the city',Coaticook:'Reference is the regional county municipality, not the town','Greater Napanee':'Source displays only a logo, not flag artwork','Grand Falls-Windsor':'Source explicitly identifies the logo flag as unofficial',Sechelt:'Exact current design is uncertain in the source',Shelburne:'The only pictured flag is identified as probably former'};
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
async function corrected(row,url){
 const key=root+'/'+row.id+'-corrected.html';
 let html;if(fs.existsSync(key))html=fs.readFileSync(key,'utf8');else{const r=await municipalSourceRequest(url);if(!r.ok)throw Error(r.status+' '+url);html=await r.text();fs.writeFileSync(key,html);}
 return {...row,url,title:html.match(/<title>([\s\S]*?)<\/title>/i)?.[1],text:plain(html),images:[...html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].filter(m=>m[1].includes('ca-')).map(m=>({url:new URL(m[1],url).href,tag:m[0],context:plain(html.slice(Math.max(0,m.index-350),m.index+1800))}))};
}
const corrections={'CA-CSD-5915001':'https://www.crwflags.com/fotw/flags/ca-bctly.html','CA-CSD-2461025':'https://www.crwflags.com/fotw/flags/ca-qcjol.html','CA-CSD-2472010':'https://www.crwflags.com/fotw/flags/ca-qcdxm.html'};
fs.mkdirSync('dist/vendor/canada-municipal-flags',{recursive:true});
const save=()=>{const data={retrieved:'2026-10-18',flags,audit};fs.writeFileSync(pinFile,JSON.stringify(data,null,1)+'\n');fs.writeFileSync(manifestFile,JSON.stringify(data,null,1)+'\n');};
for(const originalRow of rows){
 let row=originalRow;const r=byId.get(row.id);if(!r)continue;
 if(skip[r.en]){audit.push({id:r.id,name:r.en,status:'not-added',reason:skip[r.en],source:row.url});continue;}
 if(corrections[r.id])row=await corrected(row,corrections[r.id]);
 if(/RCM|regional county municipality/i.test(row.title)){audit.push({id:r.id,name:r.en,status:'not-added',reason:'Source names a different level of government',source:row.url});continue;}
 const image=r.en==='Erin'?row.images.find(i=>i.url.endsWith('/ca-oneri.gif')):row.images[0];
 if(!image||/logo|[)]|police|fire|crest|seal/i.test(image.url.split('/').at(-1))){audit.push({id:r.id,name:r.en,status:'not-added',reason:'No verified flag artwork beyond logo/seal or unrelated images',source:row.url});continue;}
 const extension=new URL(image.url).pathname.split('.').at(-1),full='vendor/canada-municipal-flags/'+r.id+'.'+extension,file='vendor/canada-municipal-flags/'+r.id+'.webp',old=previous?.flags[r.id];
 let bytes=fs.existsSync('dist/'+full)?fs.readFileSync('dist/'+full):null;
 if(!bytes){const response=await municipalSourceRequest(image.url);if(!response.ok){audit.push({id:r.id,name:r.en,status:'not-added',reason:'Original source unavailable '+response.status,source:row.url});continue;}bytes=Buffer.from(await response.arrayBuffer());await new Promise(resolve=>setTimeout(resolve,1100));}
 const sha256=createHash('sha256').update(bytes).digest('hex');if(old?.sha256&&old.sha256!==sha256)throw Error('Reviewed original changed '+r.en);
 const info=await sharp(bytes).metadata();if(info.width<60||info.height<35||info.width/info.height>6||info.width/info.height<.4){audit.push({id:r.id,name:r.en,status:'not-added',reason:'Source image is too small or does not have usable flag proportions',source:row.url,width:info.width,height:info.height});continue;}
 const author=image.context.match(/image (?:by|located by|provided by|contributed by)\s+([\s\S]*?)(?:,\s*\d|Source:)/i)?.[1]?.trim();
 flags[r.id]={id:r.id,name:r.en,parent:r.parent,code:r.code,source:image.url,page:row.url,width:info.width,height:info.height,sha256,sourceSha1:createHash('sha1').update(bytes).digest('hex'),full,file,credit:author||'Flags of the World contributors; see artwork credit on source page',license:row.text.includes('Canadian City Flags, Raven 18')?'Copyright North American Vexillological Association; artwork as credited by Flags of the World':'Source rights as credited by Flags of the World',repository:'fotw',identity:{csduid:r.code,province:r.province,parent:r.parent,article:'https://en.wikipedia.org/wiki/'+encodeURIComponent(r.wikiTitle.replaceAll(' ','_'))},evidence:{municipality:row.url,artwork:row.url,description:image.context,match:'Reviewed municipality-specific current/official flag section; excludes other governments, logo-only artwork, former flags and explicitly unofficial designs'},retrieved:'2026-10-18'};
 fs.writeFileSync('dist/'+full,bytes);fs.writeFileSync('dist/'+file,await flagThumbnail(bytes,flags[r.id]));
 audit.push({id:r.id,name:r.en,status:'added',source:row.url,file:image.url});save();console.log(Object.keys(flags).length,r.en);
}
save();console.log('Additional Canadian municipal flags',Object.keys(flags).length);
