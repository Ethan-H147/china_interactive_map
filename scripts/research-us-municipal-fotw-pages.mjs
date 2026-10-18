import fs from 'node:fs';
const dir='artifacts/us-municipal-research/fotw',rows=JSON.parse(fs.readFileSync(dir+'/matches.json')).filter(r=>r.matches.length),pause=ms=>new Promise(r=>setTimeout(r,ms));
let next=0;
await Promise.all(Array.from({length:2},async()=>{while(next<rows.length){const r=rows[next++],url=new URL(r.matches[0].href,'https://www.crwflags.com/fotw/flags/').href,file=dir+'/'+r.id+'.html';if(!fs.existsSync(file)){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(response.ok)fs.writeFileSync(file,await response.text());console.log(r.name,response.status);await pause(1000);}}}));
const plain=t=>t.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const result=[];
for(const r of rows){const file=dir+'/'+r.id+'.html';if(!fs.existsSync(file))continue;const html=fs.readFileSync(file,'utf8'),url=new URL(r.matches[0].href,'https://www.crwflags.com/fotw/flags/').href,images=[...html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].filter(m=>/\/images\/|\.\.|us-/i.test(m[1])).map(m=>({url:new URL(m[1],url).href,tag:m[0],context:plain(html.slice(Math.max(0,m.index-300),m.index+1200))})).filter(m=>!/fotw|dot\.|banner|search|home|copyright|fiav|vex/i.test(m.url.split('/').at(-1)));result.push({...r,url,title:html.match(/<title>([\s\S]*?)<\/title>/i)?.[1],text:plain(html),images});}
fs.writeFileSync(dir+'/research.json',JSON.stringify(result,null,1));
console.log('Specialist pages researched',result.length);
