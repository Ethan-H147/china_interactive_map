import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const root='scripts/boundary-sources/indian-ocean/';
export function source(name){const m=JSON.parse(fs.readFileSync(root+'manifest.json')),b=gunzipSync(fs.readFileSync(root+name+'.gz'));if(createHash('sha256').update(b).digest('hex')!==m.files[name].sha256)throw Error('Source checksum '+name);return b;}
export async function retain(name,url,meta={}){
 fs.mkdirSync(root,{recursive:true});const mf=root+'manifest.json';
 let b;if(fs.existsSync(root+name+'.gz'))b=gunzipSync(fs.readFileSync(root+name+'.gz'));else{const r=await fetch(url,{headers:{'User-Agent':'BoundaryAtlas/1.0 (local geographic atlas)'},signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(name+' HTTP '+r.status);b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));}
 const m=fs.existsSync(mf)?JSON.parse(fs.readFileSync(mf)):{retrieved:'2026-10-29',files:{}},sha256=createHash('sha256').update(b).digest('hex');if(m.files[name]?.sha256&&m.files[name].sha256!==sha256)throw Error('Pinned source changed '+name);
 m.files[name]={url,...meta,sha256,bytes:b.length};fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');console.log(name,b.length);return b;
}


export async function fetchCountries(){
 for(const [iso,code,popYear]of [['lka','lk',2023],['mwi','mw',2023],['mdg','mg',2018],['moz','mz',2025]]){
  for(const type of ['ab','ps']){
   const m=JSON.parse(await retain(iso+'-'+type+'-metadata.json','https://data.humdata.org/api/3/action/package_show?id=cod-'+type+'-'+iso));if(!m.success)throw Error('Missing HDX '+iso);
   const credit={credit:m.result.organization.title+' · HDX COD-'+type.toUpperCase(),license:m.result.license_title,page:'https://data.humdata.org/dataset/cod-'+type+'-'+iso};
   if(type==='ab'){const r=m.result.resources.find(r=>r.name.endsWith('.geojson.zip'));if(!r)throw Error('Missing GeoJSON '+iso);if([1,2,3].every(l=>fs.existsSync(root+iso+'-adm'+l+'.geojson.gz'))){for(const l of [1,2,3])source(iso+'-adm'+l+'.geojson');}else{const bytes=await retain(iso+'.zip',r.url,credit),z=unzipSync(bytes,{filter:f=>/admin[123]\.geojson$/.test(f.name)}),mf=root+'manifest.json',manifest=JSON.parse(fs.readFileSync(mf));for(const [member,data]of Object.entries(z)){const level=member.match(/admin([123])/)[1],name=iso+'-adm'+level+'.geojson',b=Buffer.from(data);fs.writeFileSync(root+name+'.gz',gzipSync(b,{level:9}));manifest.files[name]={url:r.url,...credit,member,archiveSha256:manifest.files[iso+'.zip'].sha256,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,retained:true};}manifest.files[iso+'.zip'].retained=false;fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');}}
   else for(const r of m.result.resources.filter(r=>new RegExp('adm[0123]_'+popYear+'\\.csv$').test(r.name)))await retain(r.name,r.url,credit);
  }
  await retain('flag-'+code+'.svg','https://flagcdn.com/'+code+'.svg',{credit:'National flag artwork via FlagCDN / flag-icons',license:'Flag artwork; source distribution MIT'});
 }
 for(const [name,id]of Object.entries({chiuta:2259615,malombe:2631185,chilwa:4656098,amaramba:19351588}))await retain(name+'-osm.json','https://api.openstreetmap.org/api/0.6/relation/'+id+'/full.json',{credit:'© OpenStreetMap contributors',license:'ODbL 1.0',page:'https://www.openstreetmap.org/relation/'+id});
 await retain('worldbank.json','https://api.worldbank.org/v2/country/LKA;MWI;MDG;MOZ/indicator/SP.POP.TOTL;NY.GDP.MKTP.CD;NY.GDP.PCAP.CD?source=2&date=2020:2025&format=json&per_page=1000',{credit:'World Bank WDI',license:'CC BY 4.0'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await fetchCountries();
