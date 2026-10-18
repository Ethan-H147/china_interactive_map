import fs from 'node:fs';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,options){for(let i=0;i<6;i++){const response=await fetch(url,options);if(response.ok||![429,502,503,504].includes(response.status))return response;const seconds=Math.min(60,Math.max(5,Number(response.headers.get('retry-after'))||10*(i+1)));console.log('Research request backoff',response.status,seconds+'s');await pause(seconds*1000);}throw Error('Research source remained unavailable');}
const records=JSON.parse(fs.readFileSync('artifacts/us-source/top500-entities.json'));
const explicit={'US-CONCITY-1836000':'Indianapolis','US-CONCITY-2148003':'Louisville, Kentucky','US-CONCITY-4752004':'Nashville, Tennessee','US-PLACE-2146027':'Lexington, Kentucky','US-CONCITY-1304200':'Augusta, Georgia','US-PLACE-1349008':'Macon, Georgia','US-PLACE-0952000':'New Haven, Connecticut','US-CONCITY-1303436':'Athens, Georgia','US-MCD-1714359013':'Peoria City Township, Peoria County, Illinois','US-PLACE-4944320':'Lehi, Utah','US-MCD-1701912411':'Champaign City Township, Champaign County, Illinois','US-PLACE-2706616':'Bloomington, Minnesota'};
for(const r of records)r.wikiTitle=explicit[r.id]||decodeURIComponent(r.article.split('/wiki/')[1]).replaceAll('_',' ');
fs.mkdirSync('artifacts/us-municipal-research',{recursive:true});
let cache={};try{cache=JSON.parse(fs.readFileSync('artifacts/us-municipal-research/wiki-pages.json'));}catch{}
for(let start=0;start<records.length;start+=20){
 const group=records.slice(start,start+20).filter(r=>!cache[r.wikiTitle]);if(!group.length)continue;
 const url='https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=revisions%7Cpageprops&ppprop=wikibase_item&rvprop=content&rvslots=main&rvsection=0&titles='+encodeURIComponent(group.map(r=>r.wikiTitle).join('|'));
 const response=await request(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 municipal flag identity research'},signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Wikipedia '+response.status);
 const data=await response.json(),redirect=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(r=>[r.from,r.to]));
 for(const r of group){let title=r.wikiTitle;for(let i=0;i<8&&redirect.has(title);i++)title=redirect.get(title);const p=data.query.pages.find(p=>p.title===title);if(!p)throw Error('Missing page '+title);cache[r.wikiTitle]={title:p.title,qid:p.pageprops?.wikibase_item,text:p.revisions?.[0]?.slots.main.content||'',missing:!!p.missing};}
 fs.writeFileSync('artifacts/us-municipal-research/wiki-pages.json',JSON.stringify(cache));console.log('Wikipedia identities',Math.min(start+20,records.length));await pause(2000);
}
for(const r of records){const p=cache[r.wikiTitle];r.wiki=p;const flag=p.text.match(/^\s*\|\s*(?:image_flag|flag_image)[ \t]*=[ \t]*([^\n\r]*)/mi)?.[1]?.trim().replace(/<!--.*?-->/g,'').replace(/^\[\[(?:File|Image):/i,'').replace(/\]\]$/,'').trim();r.infoboxFlag=flag&&/\.(svg|png|jpe?g|gif|webp)$/i.test(flag)?flag:null;r.flagCaption=p.text.match(/^\s*\|\s*flag_caption[ \t]*=[ \t]*([^\n\r]*)/mi)?.[1]?.trim();r.flagLink=p.text.match(/^\s*\|\s*flag_link[ \t]*=[ \t]*([^\n\r]*)/mi)?.[1]?.trim();}
fs.writeFileSync('artifacts/us-municipal-research/municipalities.json',JSON.stringify(records,null,1));
console.log('Infobox flags',records.filter(r=>r.infoboxFlag).length,'missing pages',records.filter(r=>r.wiki.missing).map(r=>r.wikiTitle));
console.log('Captions',records.filter(r=>r.flagCaption||r.flagLink).map(r=>[r.en,r.parent,r.infoboxFlag,r.flagCaption,r.flagLink]));
