import fs from 'node:fs';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
import {municipalSourceRequest as request} from './municipal-source-request.mjs';
const records=JSON.parse(fs.readFileSync('artifacts/canada-source/top500-entities.json'));
fs.mkdirSync('artifacts/canada-municipal-research',{recursive:true});
let cache={};try{cache=JSON.parse(fs.readFileSync('artifacts/canada-municipal-research/wiki-pages.json'));}catch{}
for(let start=0;start<records.length;start+=20){
 const group=records.slice(start,start+20).filter(r=>!cache[r.wikiTitle]);if(!group.length)continue;
 const url='https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=revisions%7Cpageprops&ppprop=wikibase_item&rvprop=content&rvslots=main&rvsection=0&titles='+encodeURIComponent(group.map(r=>r.wikiTitle).join('|'));
 const response=await request(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 municipal flag identity research'},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Wikipedia '+response.status);
 const data=await response.json(),redirect=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(r=>[r.from,r.to]));
 for(const r of group){let title=r.wikiTitle;for(let i=0;i<8&&redirect.has(title);i++)title=redirect.get(title);const p=data.query.pages.find(p=>p.title===title);if(!p)throw Error('Missing page '+title);cache[r.wikiTitle]={title:p.title,qid:p.pageprops?.wikibase_item,text:p.revisions?.[0]?.slots.main.content||'',missing:!!p.missing};}
 fs.writeFileSync('artifacts/canada-municipal-research/wiki-pages.json',JSON.stringify(cache));console.log('Wikipedia identities',Math.min(start+20,records.length));await pause(2000);
}
for(const r of records){const p=cache[r.wikiTitle];r.wiki=p;const flag=p.text.match(/^\s*\|\s*(?:image_flag|flag_image)[ \t]*=[ \t]*([^\n\r]*)/mi)?.[1]?.trim().replace(/<!--.*?-->/g,'').replace(/^\[\[(?:File|Image):/i,'').replace(/\]\]$/,'').trim();r.infoboxFlag=flag&&/\.(svg|png|jpe?g|gif|webp)$/i.test(flag)?flag:null;r.flagCaption=p.text.match(/^\s*\|\s*flag_caption[ \t]*=[ \t]*([^\n\r]*)/mi)?.[1]?.trim();r.flagLink=p.text.match(/^\s*\|\s*flag_link[ \t]*=[ \t]*([^\n\r]*)/mi)?.[1]?.trim();}
fs.writeFileSync('artifacts/canada-municipal-research/municipalities.json',JSON.stringify(records,null,1));
console.log('Infobox flags',records.filter(r=>r.infoboxFlag).length,'missing pages',records.filter(r=>r.wiki.missing).map(r=>r.wikiTitle));
console.log('Captions',records.filter(r=>r.flagCaption||r.flagLink).map(r=>[r.en,r.parent,r.infoboxFlag,r.flagCaption,r.flagLink]));
