import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/nigeria/';
export function source(name){
 const bytes=gunzipSync(fs.readFileSync(root+name+'.gz')),manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));
 if(createHash('sha256').update(bytes).digest('hex')!==manifest.files[name].sha256)throw Error('Nigeria source checksum: '+name);
 return bytes;
}
async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});
 const file=root+name+'.gz',manifestFile=root+'manifest.json',manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{retrieved:'2026-10-22',files:{}};
 let bytes;
 if(fs.existsSync(file))bytes=gunzipSync(fs.readFileSync(file));
 else{const response=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error(name+' HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(file,gzipSync(bytes,{level:9}));}
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(manifest.files[name]?.sha256&&manifest.files[name].sha256!==sha256)throw Error('Pinned Nigeria source changed: '+name);
 manifest.files[name]={url,...meta,sha256,bytes:bytes.length};
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log(name,bytes.length);return bytes;
}
export async function fetchNigeria(){
 const metadata=JSON.parse(await retain('metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-ab-nga'));
 const resource=metadata.result.resources.find(r=>r.name==='nga_admin_boundaries.geojson.zip');
 if(!resource)throw Error('Nigeria GeoJSON boundary resource missing');
 await retain('boundaries.zip',resource.url,{credit:'Office of the Surveyor General of the Federation, eHealth Africa, UNCS; OCHA Nigeria / HDX COD-AB',license:'CC BY 3.0 IGO',page:'https://data.humdata.org/dataset/cod-ab-nga'});
 await retain('flag-ng.svg','https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg',{credit:'Wikimedia Commons · national flag artwork',license:'Public domain',page:'https://commons.wikimedia.org/wiki/File:Flag_of_Nigeria.svg'});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchNigeria();
