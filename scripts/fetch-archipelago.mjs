import fs from 'node:fs/promises';
import path from 'node:path';
import {inflateRawSync} from 'node:zlib';
const root=new URL('./additional-sources/archipelago/',import.meta.url);
await fs.mkdir(root,{recursive:true});
const archives={philippines:'https://data.humdata.org/dataset/caf116df-f984-4deb-85ca-41b349d3f313/resource/0120c30e-ba8b-487d-83f5-a664eddd3a8e/download/phl_admin_boundaries.geojson.zip',indonesia:'https://data.humdata.org/dataset/84a1d98a-790b-4d66-9d14-bbfa48500802/resource/e1421da4-8f48-47d2-ac49-79ff5bfa4d24/download/idn_admin_boundaries.geojson.zip'};
async function range(url,spec){const r=await fetch(url,{headers:{Range:'bytes='+spec}});if(r.status!==206)throw Error('Archive must support selective reads: '+r.status);return Buffer.from(await r.arrayBuffer());}
for(const [country,url] of Object.entries(archives)){
 const tail=await range(url,'-65536'),end=tail.lastIndexOf(Buffer.from('504b0506','hex')),offset=tail.readUInt32LE(end+16),size=tail.readUInt32LE(end+12),directory=await range(url,`${offset}-${offset+size-1}`);
 const files=[];for(let p=0;p<directory.length;){if(directory.readUInt32LE(p)!==0x02014b50)throw Error('ZIP directory');const len=directory.readUInt16LE(p+28),extra=directory.readUInt16LE(p+30),comment=directory.readUInt16LE(p+32),name=directory.subarray(p+46,p+46+len).toString();files.push({name,method:directory.readUInt16LE(p+10),compressed:directory.readUInt32LE(p+20),size:directory.readUInt32LE(p+24),offset:directory.readUInt32LE(p+42)});p+=46+len+extra+comment;}
 console.log(country,files);
 if(process.argv.includes('--list'))continue;
 for(const f of files.filter(f=>/admin2.*geojson$/i.test(f.name))){const destination=new URL(country+'-'+path.basename(f.name),root);try{await fs.access(destination);continue;}catch{}const header=await range(url,`${f.offset}-${f.offset+1023}`),start=f.offset+30+header.readUInt16LE(26)+header.readUInt16LE(28),data=await range(url,`${start}-${start+f.compressed-1}`),raw=f.method===8?inflateRawSync(data):data;if(raw.length!==f.size)throw Error('Truncated '+f.name);await fs.writeFile(destination,raw);const fc=JSON.parse(raw);console.log(country,f.name,fc.features.length,fc.features[0].properties);}
}
if(!process.argv.includes('--list'))for(const code of ['PH','ID']){const destination=new URL(code+'.zip',root);try{await fs.access(destination);}catch{const r=await fetch('https://download.geonames.org/export/dump/'+code+'.zip');if(!r.ok)throw Error('GeoNames '+r.status);await fs.writeFile(destination,Buffer.from(await r.arrayBuffer()));}}
