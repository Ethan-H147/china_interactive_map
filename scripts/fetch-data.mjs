import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../dist/', import.meta.url);
await mkdir(new URL('data/', root), {recursive:true});
const base='https://geo.datav.aliyun.com/areas_v3/bound/';
const sources=[];
async function get(url, file){
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`${response.status}: ${url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(file,root),bytes);
  sources.push({url,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  return bytes;
}
const provinces=JSON.parse(await get(base+'100000_full.json','data/provinces.json'));
const regions=provinces.features.filter(f=>f.properties.adcode&&f.properties.name);
let queue=[...regions];
const coverage=[];
await Promise.all(Array.from({length:5},async()=>{
  while(queue.length){
    const region=queue.shift(),p=region.properties;
    try{
      const data=JSON.parse(await get(base+p.adcode+'_full.json','data/'+p.adcode+'.json'));
      const levels={};for(const f of data.features){const l=f.properties.level||'unspecified';levels[l]=(levels[l]||0)+1;}
      coverage.push({adcode:p.adcode,name:p.name,count:data.features.length,levels});
      console.log(p.name, data.features.length,JSON.stringify(levels));
    }catch(e){
      coverage.push({adcode:p.adcode,name:p.name,count:0,unavailable:true});console.log(p.name,e.message);
    }
  }
}));
await Promise.all([
  get('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','vendor/leaflet.js'),
  get('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','vendor/leaflet.css'),
  get('https://unpkg.com/leaflet@1.9.4/LICENSE','vendor/leaflet-LICENSE.txt')
]);
await writeFile(new URL('data/manifest.json',root),JSON.stringify({provider:'Alibaba Cloud DataV GeoAtlas',sourcePage:'https://datav.aliyun.com/portal/school/atlas/area_selector',retrieved:new Date().toISOString(),boundaryDate:'Not specified by provider',coverage:coverage.sort((a,b)=>a.adcode-b.adcode),sources},null,2));
console.log('Complete:',coverage.length,'regions');
