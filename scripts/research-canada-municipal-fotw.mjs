import fs from 'node:fs';
import {provinces} from './fetch-canada-local.mjs';
import {municipalSourceRequest} from './municipal-source-request.mjs';
const review=JSON.parse(fs.readFileSync('scripts/canada-municipal-flag-files.json')),top=JSON.parse(fs.readFileSync('artifacts/canada-municipal-research/candidates.json')),missing=top.filter(r=>!review.flags[r.id]),stateOf=r=>provinces[r.province].toLowerCase(),states=[...new Set(missing.map(stateOf))],dir='artifacts/canada-municipal-research/fotw';
fs.mkdirSync(dir,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const entities={eacute:'é',Eacute:'É',egrave:'è',agrave:'à',acirc:'â',ecirc:'ê',icirc:'î',ocirc:'ô',ucirc:'û',ccedil:'ç',iuml:'ï',uuml:'ü',ouml:'ö',auml:'ä',amp:'&',nbsp:' ',quot:'"',apos:"'"};
const plain=s=>s.replace(/<[^>]+>/g,' ').replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(_,n)=>n.startsWith('#')?String.fromCodePoint(parseInt(n.slice(n[1]==='x'?2:1),n[1]==='x'?16:10)):entities[n]||' ').replace(/\s+/g,' ').trim();
const norm=s=>plain(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^saint/,'st');
async function get(url,file){if(fs.existsSync(file))return fs.readFileSync(file,'utf8');const r=await municipalSourceRequest(url);if(!r.ok){console.log(r.status,url);return '';}const bytes=Buffer.from(await r.arrayBuffer()),head=bytes.subarray(0,2500).toString(),text=new TextDecoder(/utf-8/i.test(head)?'utf-8':'windows-1252').decode(bytes);fs.writeFileSync(file,text);await pause(1000);return text;}
for(const state of states){
 const url='https://www.crwflags.com/fotw/flags/ca-'+state+'.html',html=await get(url,dir+'/'+state+'.html');
 const municipal=[...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].filter(m=>/municipal.*flag|municipalit.*(index|flag)|flags.*municipal/i.test(plain(m[2])));
 for(let i=0;i<municipal.length;i++)await get(new URL(municipal[i][1],url).href,dir+'/'+state+'-municipal-'+i+'.html');
 console.log(state,'specialist references');
}
const matches=[];
for(const r of missing){
 const state=stateOf(r),html=fs.readdirSync(dir).filter(f=>f.startsWith(state)&&f.endsWith('.html')).map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('\n'),anchors=[...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({href:m[1],label:plain(m[2])}));
 const names=[r.en,...r.en.split(' / '),r.wiki.title.replace(/,.*$/,'')],found=anchors.filter(a=>names.some(n=>norm(a.label.replace(/\s*\(.*\)$/,''))===norm(n)));
 matches.push({id:r.id,name:r.en,parent:r.parent,province:r.province,matches:found});
}
fs.writeFileSync(dir+'/matches.json',JSON.stringify(matches,null,1));
const result=[];
for(const r of matches.filter(r=>r.matches.length)){
 const url=new URL(r.matches[0].href,'https://www.crwflags.com/fotw/flags/').href,html=await get(url,dir+'/'+r.id+'.html');
 const images=[...html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m=>({url:new URL(m[1],url).href,tag:m[0],context:plain(html.slice(Math.max(0,m.index-350),m.index+1700))})).filter(m=>/\/images\/c\/ca-/.test(m.url)&&!/fotw|dot\.|banner|search|home|copyright|fiav|vex/i.test(m.url.split('/').at(-1)));
 result.push({...r,url,title:html.match(/<title>([\s\S]*?)<\/title>/i)?.[1],text:plain(html),images});
 console.log('Municipal reference',r.name);
}
fs.writeFileSync(dir+'/research.json',JSON.stringify(result,null,1));console.log('Canadian specialist flag pages',result.length);
