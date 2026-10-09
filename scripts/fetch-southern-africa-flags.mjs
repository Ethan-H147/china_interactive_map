import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const manifestPath=resolve(dist,'data/southern-africa/flag-sources.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
// Original artwork is also the enlarged image; no thumbnail crop is substituted.
for(const [id,flag] of Object.entries(manifest.flags)){
 const path=resolve(dist,flag.file);let bytes;
 try{bytes=await readFile(path);}catch{}
 if(!bytes||process.argv.includes('--refresh')){
  const response=await fetch(flag.original,{headers:{'User-Agent':'Atlas/1.0 (flag source preservation)'}});
  if(!response.ok)throw Error(`${id}: HTTP ${response.status}`);
  bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.toString('utf8').includes('<svg'))throw Error(`${id}: original is not SVG`);
  await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);
 }
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(flag.sha256&&hash!==flag.sha256&&!process.argv.includes('--refresh'))throw Error(`${id}: original checksum differs`);
 flag.sha256=hash;
}
const flags=manifest.flags;
flags['ZA-MP'].license='CC BY-SA 3.0';
flags['ZA-MP'].credit='Froztbyte (© www.mysona.dk)';
flags['ZA-MP'].licenseUrl='https://creativecommons.org/licenses/by-sa/3.0/';
flags.lesotho.credit='National flag artwork via Wikimedia Commons';
const clean=(flag,name)=>({...flag,name});
const countries=['south-africa','eswatini','lesotho'];
const southernAfricaFlags=Object.fromEntries(countries.map(c=>[c,{firstFlags:{},detailFlags:{}}]));
southernAfricaFlags['south-africa'].firstFlags['ZA-MP']=clean(flags['ZA-MP'],'Mpumalanga');
southernAfricaFlags['south-africa'].detailFlags['ZA-D-city-of-johannesburg']=clean(flags['ZA-JHB'],'City of Johannesburg');
for(const country of countries){
 const catalogue=JSON.parse(gunzipSync(await readFile(resolve(dist,`data/southern-africa/${country}/catalogue.bin`))));
 const ids=new Set(catalogue.records.map(r=>r.id));
 for(const id of [...Object.keys(southernAfricaFlags[country].firstFlags),...Object.keys(southernAfricaFlags[country].detailFlags)])if(!ids.has(id))throw Error(`Flag without boundary: ${id}`);
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeFile(resolve(dist,'southern-africa-flags.mjs'),'// Current adopted flags; original SVG artwork and attribution in data/southern-africa/flag-sources.json.\nexport const southernAfricaFlags='+JSON.stringify(southernAfricaFlags)+';\nexport const nationalFlags='+JSON.stringify(Object.fromEntries(countries.map(c=>[c,flags[c]])))+';\n');
console.log(`Verified ${Object.keys(flags).length} original flags and generated country-indexed flag modules.`);
