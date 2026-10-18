import {municipalSourceRequest} from './municipal-source-request.mjs';
import fs from 'node:fs';
const pause=ms=>new Promise(r=>setTimeout(r,ms)),dir='artifacts/canada-municipal-research';
const rows=JSON.parse(fs.readFileSync(dir+'/municipalities.json'));
const explicit={};
const files=[];
for(const r of rows){
 let file=explicit[r.id]||r.infoboxFlag;
 if(!file){const raw=r.wiki.text.match(/\|[ \t]*image_flag[ \t]*=([\s\S]{0,3000})/i)?.[1]||'';file=raw.match(/(?:File:|image\d+[ \t]*=)[ \t]*([^\n\r|}\]]+?\.(?:svg|png|gif|jpe?g|webp))/i)?.[1]?.trim();}
 if(!file){const list=[...new Set(r.entities.filter(e=>e.flag).map(e=>decodeURIComponent(e.flag.value.split('/Special:FilePath/')[1])))];file=list.find(f=>!/(reverse|former|historical|unofficial|proposed|two official)/i.test(f));}
 r.candidateFile=file;
 if(file&&!/\b(?:seal|logo)\b/i.test(file))files.push(file);
 else r.candidateReason=file?'Infobox contains a seal/logo, not verified flag artwork':'No flag documented in matched entity or municipal infobox';
}
fs.writeFileSync(dir+'/candidates.json',JSON.stringify(rows,null,1));
let cache={};try{cache=JSON.parse(fs.readFileSync(dir+'/commons-metadata.json'));}catch{}
async function request(url){const r=await municipalSourceRequest(url);if(!r.ok)throw Error('Artwork source '+r.status);return r.json();}
const needed=[...new Set(files)].filter(f=>!cache[f]);
for(let i=0;i<needed.length;i+=20){
 const group=needed.slice(i,i+20),data=await request('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata%7Csha1&titles='+encodeURIComponent(group.map(f=>'File:'+f.replaceAll('_',' ')).join('|')));
 const redirects=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(r=>[r.from,r.to]));
 for(const file of group){let title='File:'+file.replaceAll('_',' ');for(let j=0;j<8&&redirects.has(title);j++)title=redirects.get(title);const page=data.query.pages.find(p=>p.title===title);cache[file]={title,...page?.imageinfo?.[0],missing:!page?.imageinfo?.[0]};}
 fs.writeFileSync(dir+'/commons-metadata.json',JSON.stringify(cache));console.log('Flag artwork metadata',Math.min(i+20,needed.length),'/',needed.length);await pause(2500);
}
console.log('Municipal flag candidates',files.length,'distinct originals',new Set(files).size);
