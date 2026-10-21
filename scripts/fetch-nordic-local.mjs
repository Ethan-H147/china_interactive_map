import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';

export const root='scripts/boundary-sources/nordic-local';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function normalizeSource(bytes,entry){if(entry.format==='geojson'){const data=JSON.parse(bytes.toString('utf8'));return Buffer.from(JSON.stringify({type:'FeatureCollection',features:data.features}));}if(entry.format==='gml')return Buffer.from(bytes.toString('utf8').replace(/ timeStamp="[^"]*"/,''));return bytes;}
export const manifest=()=>JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
export function readLocalSource(name){
 const entry=manifest().files[name];if(!entry)throw Error('Unknown Nordic local source '+name);
 const bytes=entry.archive?fs.readFileSync(root+'/'+name):gunzipSync(fs.readFileSync(root+'/'+name+'.gz'));
 if(sha(bytes)!==entry.sha256)throw Error('Retained source hash mismatch '+name);
 return bytes;
}
export async function fetchNordicLocal(countries=[]){
 for(const [name,entry]of Object.entries(manifest().files)){
  if(countries.length&&!countries.includes(entry.country))continue;
  const file=root+'/'+name+(entry.archive?'':'.gz');
  if(fs.existsSync(file)){readLocalSource(name);continue;}
  const response=await fetch(entry.url,{signal:AbortSignal.timeout(600000)});
  if(!response.ok)throw Error(name+' HTTP '+response.status);
  const bytes=normalizeSource(Buffer.from(await response.arrayBuffer()),entry);
  if(sha(bytes)!==entry.sha256)throw Error('Upstream source changed; review before updating '+name);
  fs.mkdirSync(root,{recursive:true});fs.writeFileSync(file,entry.archive?bytes:gzipSync(bytes,{level:9}));
  console.log('Restored',name,bytes.length,'bytes');
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await fetchNordicLocal(process.argv.slice(2));
