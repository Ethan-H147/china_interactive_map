import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
// URLs and original hashes belong to the reviewed extraction, not third-party mirrors.
const root='scripts/statistics-sources/argentina';
const tables=JSON.parse(await fs.readFile(root+'/tables.json','utf8'));
const manifest={retrieved:new Date().toISOString().slice(0,10),files:{}};
await Promise.all(Object.entries(tables.files).map(async([file,source])=>{
 let bytes;try{bytes=await fs.readFile(root+'/'+file);}catch{}
 if(process.argv.includes('--refresh')||!bytes||createHash('sha256').update(bytes).digest('hex')!==source.sha256){
  const response=await fetch(source.url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(file+': '+response.status);
  bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(root+'/'+file,bytes);
 }
 manifest.files[file]={url:source.url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 console.log(file,bytes.length+' bytes');
}));
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Run extract-argentina-statistics.py to verify headers and units before rebuilding.');
