import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {flagThumbnail} from './flag-thumbnail.mjs';
const reviewed=JSON.parse(await fs.readFile('scripts/us-municipal-flag-files.json','utf8')),out='dist/vendor/us-municipal-flags',manifestFile='dist/data/us-municipal-flag-sources.json',stateFile='artifacts/us-municipal-research/download-state.json',sha=b=>createHash('sha256').update(b).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms)),initial=Number(process.argv.find(s=>s.startsWith('--initial-cooldown='))?.split('=')[1]||0)*1000;
await fs.mkdir(out,{recursive:true});
const manifest={retrieved:reviewed.retrieved,policy:reviewed.policy,flags:{},audit:reviewed.audit},pending=[];
const save=async()=>{await fs.writeFile(manifestFile+'.building',JSON.stringify(manifest,null,1)+'\n');await fs.rename(manifestFile+'.building',manifestFile);};
const originalPath=flag=>'vendor/us-municipal-flags/'+flag.id+'.'+new URL(flag.source).pathname.split('.').at(-1).toLowerCase();
async function finish(flag,bytes){
 const full=originalPath(flag),file='vendor/us-municipal-flags/'+flag.id+'.webp';
 await fs.writeFile('dist/'+full,bytes);
 const thumbnail=await flagThumbnail(bytes,flag);await fs.writeFile('dist/'+file,thumbnail);
 manifest.flags[flag.id]={...flag,full,file,sha256:sha(bytes)};await save();
}
for(const flag of Object.values(reviewed.flags)){let bytes;try{const b=await fs.readFile('dist/'+originalPath(flag));if(createHash('sha1').update(b).digest('hex')===flag.commonsSha1)bytes=b;}catch{}
 if(bytes)await finish(flag,bytes);else pending.push(flag);
}
let retryAt=Date.now()+initial;try{const saved=JSON.parse(await fs.readFile(stateFile,'utf8'));retryAt=Math.max(retryAt,saved.retryAt||0);}catch{}
const state=async extra=>fs.writeFile(stateFile,JSON.stringify({completed:Object.keys(manifest.flags).length,total:Object.keys(reviewed.flags).length,retryAt,...extra}));
await state({status:'cooldown'});if(initial)console.log('Respecting image host cooldown until',new Date(retryAt).toISOString());
for(const flag of pending){
 for(let attempt=0;;attempt++){
  while(Date.now()<retryAt)await pause(Math.min(60000,retryAt-Date.now()));
  const response=await fetch(flag.source,{headers:{'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map; municipal flag source preservation)'},signal:AbortSignal.timeout(60000)});
  if(response.ok){const bytes=Buffer.from(await response.arrayBuffer());if(createHash('sha1').update(bytes).digest('hex')!==flag.commonsSha1)throw Error('Original checksum differs '+flag.id);await finish(flag,bytes);retryAt=Date.now()+1100;await state({status:'downloading',last:flag.id});console.log(Object.keys(manifest.flags).length+'/'+Object.keys(reviewed.flags).length,flag.id,flag.name);break;}
  if(![429,502,503,504].includes(response.status)||attempt>=5)throw Error('Flag source '+response.status+' '+flag.source);
  const header=response.headers.get('retry-after'),delay=header?(/^\d+$/.test(header)?Number(header)*1000:Math.max(0,Date.parse(header)-Date.now())):30000;
  retryAt=Date.now()+Math.max(5000,delay);await state({status:'cooldown',http:response.status});console.log('Host requested cooldown',Math.round(delay/1000)+'s',flag.name);
 }
}
await state({status:'complete'});console.log('Prepared municipal flag originals and lossless thumbnails:',Object.keys(manifest.flags).length);
