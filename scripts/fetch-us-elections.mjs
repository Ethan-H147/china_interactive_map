// Retains the rendered Wikipedia article for every US presidential election.
// Each file is pinned to its revision and SHA-256 in scripts/us-election-sources.json;
// a pinned revision is refetched by oldid, so rebuilding never picks up later edits.
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';

const root=new URL('../',import.meta.url),dir=new URL('scripts/boundary-sources/united-states/elections/',root),manifestUrl=new URL('scripts/us-election-sources.json',root);
export const electionYears=[1789,...Array.from({length:59},(_,i)=>1792+i*4)];
export const articleTitle=year=>year===1789?'1788–89 United States presidential election':year+' United States presidential election';
export const sourceFile=year=>new URL(year+'.html.gz',dir);
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');

// The builder and validator import the helpers above without fetching.
if(import.meta.url===pathToFileURL(process.argv[1]).href)await fetchAll(process.argv.includes('--refresh'));

async function fetchAll(refresh){
 const manifest=existsSync(manifestUrl)&&!refresh?JSON.parse(readFileSync(manifestUrl,'utf8')):{retrieved:new Date().toISOString().slice(0,10),provider:'Wikipedia, rendered article HTML (MediaWiki parse API)',license:'CC BY-SA 4.0',files:{}};
 mkdirSync(dir,{recursive:true});
 for(const year of electionYears){
  const pin=manifest.files[year],file=sourceFile(year);
  if(pin&&existsSync(file)){const html=gunzipSync(readFileSync(file));if(sha(html)!==pin.sha256)throw Error(year+': retained source does not match its pin');continue;}
  const query=pin?'oldid='+pin.revision:'page='+encodeURIComponent(articleTitle(year));
  let response;
  for(let attempt=0;;attempt++){
   response=await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=text|revid&format=json&formatversion=2&'+query,{headers:{'User-Agent':'boundary-atlas-build/1.0 (election results)'}});
   if(response.status!==429||attempt===5)break;
   await new Promise(resolve=>setTimeout(resolve,5000*2**attempt));
  }
  if(!response.ok)throw Error(year+': HTTP '+response.status);
  const json=await response.json();if(json.error)throw Error(year+': '+json.error.info);
  const html=Buffer.from(json.parse.text,'utf8');
  if(pin&&sha(html)!==pin.sha256)throw Error(year+': revision '+pin.revision+' no longer matches its pin');
  writeFileSync(file,gzipSync(html,{level:9}));
  manifest.files[year]={title:json.parse.title,revision:json.parse.revid,url:'https://en.wikipedia.org/w/index.php?oldid='+json.parse.revid,sha256:sha(html),bytes:html.length};
  writeFileSync(manifestUrl,JSON.stringify(manifest,null,1)+'\n');
  console.log(year,json.parse.title,json.parse.revid);
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
 console.log('US elections: '+electionYears.length+' pinned articles retained.');
}
