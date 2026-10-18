import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {flagThumbnail} from './flag-thumbnail.mjs';
const reviewed=JSON.parse(fs.readFileSync('scripts/us-municipal-fotw-flag-files.json'));
for(const flag of Object.values(reviewed.flags)){
 const path='dist/'+flag.full;
 let bytes=fs.existsSync(path)?fs.readFileSync(path):null;
 if(!bytes){
  const response=await fetch(flag.source,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(flag.name+': '+response.status);
  bytes=Buffer.from(await response.arrayBuffer());
  await new Promise(resolve=>setTimeout(resolve,1100));
 }
 if(createHash('sha256').update(bytes).digest('hex')!==flag.sha256)throw Error('Reviewed original changed: '+flag.name);
 fs.mkdirSync('dist/vendor/us-municipal-flags',{recursive:true});
 fs.writeFileSync(path,bytes);
 fs.writeFileSync('dist/'+flag.file,await flagThumbnail(bytes,flag));
}
fs.writeFileSync('dist/data/us-municipal-fotw-flag-sources.json',JSON.stringify(reviewed,null,1)+'\n');
console.log('Retained and verified '+Object.keys(reviewed.flags).length+' additional municipal flags.');
