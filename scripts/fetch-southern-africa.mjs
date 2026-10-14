import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(process.argv[2]||'artifacts/southern-africa-source');
fs.mkdirSync(root,{recursive:true});
const manifest={retrieved:new Date().toISOString().slice(0,10),files:{}};
const pinned=new Map();
for(const country of ['south-africa','eswatini','lesotho']){const file='dist/data/southern-africa/'+country+'/sources.json';if(fs.existsSync(file))for(const s of JSON.parse(fs.readFileSync(file)).sources)pinned.set(s.file,s);}
async function download(name,url,metadata={}){
 if(pinned.has(name)){url=pinned.get(name).url;metadata=pinned.get(name);}
 const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(url+' '+response.status);
 let bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.toString('utf8',0,100).startsWith('version https://git-lfs')){const r=await fetch(url.replace('github.com/wmgeolab/geoBoundaries/raw/','media.githubusercontent.com/media/wmgeolab/geoBoundaries/'));if(!r.ok)throw Error('LFS '+r.status);bytes=Buffer.from(await r.arrayBuffer());}
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(pinned.has(name)&&pinned.get(name).sha256!==sha256)throw Error('Pinned boundary source changed: '+name+'; review the updated source before replacing its snapshot.');
 fs.writeFileSync(path.join(root,name),bytes);
 manifest.files[name]={url,...metadata,sha256,bytes:bytes.length};
 console.log(name,bytes.length);
}
for(const level of [1,2,3]){
 const meta=await(await fetch('https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM'+level+'/')).json();
 await download('zaf-adm'+level+'.topojson',meta.tjDownloadURL,{provider:meta.boundarySource,year:meta.boundaryYearRepresented,license:meta.boundaryLicense,licenseURL:'https://creativecommons.org/licenses/by/3.0/igo/',count:Number(meta.admUnitCount)});
}
// Eswatini and Lesotho: OCHA Common Operational Datasets on HDX (CC BY-IGO), retained as published archives.
const hdx=(dataset,resource,file)=>'https://data.humdata.org/dataset/'+dataset+'/resource/'+resource+'/download/'+file;
const cod={license:'Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO)',licenseURL:'https://creativecommons.org/licenses/by/3.0/igo/legalcode'};
await download('swz-cod-ab.geojson.zip',hdx('e145e4c6-0a78-42c7-833c-5850ac3a1731','8d79a417-4f3f-45c5-89d6-4fa77fd896b4','swz_admin_boundaries.geojson.zip'),{provider:'Central Statistics Office of Eswatini via OCHA ROSEA, Common Operational Dataset COD-AB v01',year:2020,validOn:'2021-01-27',reviewed:'2025-10-30',...cod,dataset:'https://data.humdata.org/dataset/cod-ab-swz'});
await download('lso-cod-ab.shp.zip',hdx('55b1367e-667a-447b-952d-5bb139835628','f922a67a-9840-4174-bd1e-e4b10cc88591','lso_adm_fao_mlgca_2019.zip'),{provider:'FAO and the Lesotho Ministry of Local Government (2016), cleaned by OCHA, Common Operational Dataset COD-AB',year:2019,...cod,dataset:'https://data.humdata.org/dataset/cod-ab-lso'});
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
