import {municipalSourceRequest} from './municipal-source-request.mjs';
import fs from 'node:fs';
const dir='artifacts/canada-municipal-research',rows=JSON.parse(fs.readFileSync(dir+'/candidates.json')),commons=JSON.parse(fs.readFileSync(dir+'/commons-metadata.json')),pause=ms=>new Promise(r=>setTimeout(r,ms));
const files=[];
for(const r of rows){
 const candidates=[];
 if(r.candidateFile)candidates.push(r.candidateFile.replace(/^File:/i,''));
 if(!r.candidateFile||commons[r.candidateFile]?.missing){
  const canonical=r.wiki.title.replaceAll('_',' '),name=r.en.replace('San Buenaventura (Ventura)','Ventura'),state=r.parentName;
  const stems=r.sourceType==='cousub'?[canonical.includes('Township')?'Flag of '+canonical:'Flag of '+name+', '+state,'Flag of '+name+' Township, '+state]:['Flag of '+canonical,'Flag of '+name+', '+state,'Flag of '+name];
  for(const stem of new Set(stems))for(const ext of ['svg','png','gif'])candidates.push(stem+'.'+ext);
 }
 r.additionalFiles=[...new Set(candidates)];files.push(...r.additionalFiles.filter(f=>!commons[f]||commons[f].missing));
}
fs.writeFileSync(dir+'/candidates.json',JSON.stringify(rows,null,1));
let cache={};try{cache=JSON.parse(fs.readFileSync(dir+'/enwiki-metadata.json'));}catch{}
async function request(url){const r=await municipalSourceRequest(url);if(!r.ok)throw Error('Artwork source '+r.status);return r.json();}
const needed=[...new Set(files)].filter(f=>!cache[f]);
for(let start=0;start<needed.length;start+=40){
 const group=needed.slice(start,start+40),data=await request('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=imageinfo&iiprop=url%7Csize%7Cextmetadata%7Csha1&titles='+encodeURIComponent(group.map(f=>'File:'+f.replaceAll('_',' ')).join('|')));
 const redirects=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(r=>[r.from,r.to]));
 for(const file of group){let title='File:'+file.replaceAll('_',' ');for(let i=0;i<8&&redirects.has(title);i++)title=redirects.get(title);const p=data.query.pages.find(p=>p.title===title);cache[file]={title,repository:p?.imagerepository,...p?.imageinfo?.[0],missing:!p?.imageinfo?.[0]};}
 fs.writeFileSync(dir+'/enwiki-metadata.json',JSON.stringify(cache));console.log('Additional flag sources',Math.min(start+40,needed.length),'/',needed.length);await pause(2500);
}
console.log('Additional originals found',Object.values(cache).filter(m=>!m.missing).length);
