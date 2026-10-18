import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
export const revision='a3e0849d111ae4c7387327d5befbcca67443dc98';
export const root='scripts/boundary-sources/morocco';
const base='https://raw.githubusercontent.com/zkousama/morocco-communes/'+revision+'/data/v1/';
export const digest=b=>createHash('sha256').update(b).digest('hex');
export function readMorocco(file){const bytes=gunzipSync(fs.readFileSync(root+'/'+file.replaceAll('/','_')+'.gz'));const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));if(digest(bytes)!==manifest.files[file].sha256)throw Error('Changed retained Morocco source: '+file);return JSON.parse(bytes);}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/fetch-morocco.mjs')){
 fs.mkdirSync(root,{recursive:true});const manifest=fs.existsSync(root+'/manifest.json')?JSON.parse(fs.readFileSync(root+'/manifest.json')):{revision,retrieved:'2026-10-18',files:{}};
 if(manifest.revision!==revision)throw Error('Morocco revision mismatch');
 const files=['attributes/regions.json','attributes/provinces.json','attributes/communes.json','sources.json','geometry/README.md','geometry/LICENSE','reference/frontiers.json',...Array.from({length:12},(_,i)=>'geometry/'+String(i+1).padStart(2,'0')+'.topojson')];
 for(const file of files){const dest=root+'/'+file.replaceAll('/','_')+'.gz';if(fs.existsSync(dest)&&manifest.files[file]){if(digest(gunzipSync(fs.readFileSync(dest)))!==manifest.files[file].sha256)throw Error('Changed Morocco cache '+file);continue;}const url=file==='reference/frontiers.json'?'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_boundary_lines_land.geojson':base+file;const r=await fetch(url);if(!r.ok)throw Error(file+': '+r.status);const bytes=Buffer.from(await r.arrayBuffer());manifest.files[file]={url,sha256:digest(bytes),bytes:bytes.length,license:file.startsWith('reference/')?'Public domain':file.startsWith('geometry/')?'ODbL 1.0':file.startsWith('attributes/')?'CC BY 4.0':'See source manifest'};fs.writeFileSync(dest,gzipSync(bytes,{level:9}));fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Retained',file);}
}
