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
const szService='https://services1.arcgis.com/2e5QzzsIgOpVnKkG/arcgis/rest/services/All_New_Tinkhundla_(post_2018)/FeatureServer/0';
await download('swz-second.geojson',szService+'/query?where=1%3D1&outFields=*&outSR=4326&f=geojson',{provider:'COSPE / Khetsimphilo project, Eswatini cadastre post-2018 tinkhundla',year:2018,license:'Publicly accessible ArcGIS boundary layer; no explicit licence statement in item metadata',item:'https://www.arcgis.com/home/item.html?id=36919f6e5ad34f9f8d843025286a17bf'});
const szMeta=await(await fetch('https://www.geoboundaries.org/api/current/gbOpen/SWZ/ADM1/')).json();
await download('swz-first.topojson',szMeta.tjDownloadURL,{provider:szMeta.boundarySource,year:2017,license:szMeta.boundaryLicense,licenseURL:'https://www.openstreetmap.org/copyright'});
for(const [name,level] of [['lso-first.geojson',0],['lso-second.geojson',1]])await download(name,'https://drws.gov.ls/server/rest/services/LesothoBoundaries/MapServer/'+level+'/query?where=1%3D1&outFields=*&outSR=4326&f=geojson',{provider:'Lesotho Department of Rural Water Supply, government GIS',year:'Not stated by source',license:'Publicly accessible government boundary layer; no explicit licence statement in service metadata',source:'https://drws.gov.ls/server/rest/services/LesothoBoundaries/MapServer'});
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
