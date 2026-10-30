import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/caucasus-frontiers/';
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json';
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (local geographic atlas)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-29',files:{}},sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}


export async function fetchFrontiers(){for(const [name,id,full]of [['georgia',28699,true],['azerbaijan',364110,true],['armenia',364066,true],['russia',60189,false]])await retain(name+'.json','https://api.openstreetmap.org/api/0.6/relation/'+id+(full?'/full':'')+'.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/'+id,relation:id});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await fetchFrontiers();
