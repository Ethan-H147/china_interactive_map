import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/costa-rica-panama/';
export function source(name){const data=gunzipSync(fs.readFileSync(root+name+'.gz')),manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));if(createHash('sha256').update(data).digest('hex')!==manifest.files[name].sha256)throw Error('Changed Central American source '+name);return data;}
if(process.argv[1]?.endsWith('fetch-costa-rica-panama.mjs')){const manifest=JSON.parse(fs.readFileSync(root+'manifest.json'));for(const [name,pin]of Object.entries(manifest.files)){if(!fs.existsSync(root+name+'.gz')){const response=await fetch(pin.url,{signal:AbortSignal.timeout(240000)});if(!response.ok)throw Error(name+' HTTP '+response.status);const data=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(data).digest('hex')!==pin.sha256)throw Error('Upstream changed; review the snapshot before updating '+name);fs.writeFileSync(root+name+'.gz',gzipSync(data,{level:9}));}source(name);console.log('Verified',name);}}
