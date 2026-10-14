import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
// National outlines for the United Kingdom, Spain, France and Italy, plus Natural
// Earth land boundary lines used only to tell land frontiers from coastline.
const root=path.resolve(process.argv[2]||'artifacts/europe-source');
fs.mkdirSync(root,{recursive:true});
const manifest={retrieved:new Date().toISOString().slice(0,10),files:{}};
const pinned=new Map();
for(const country of ['united-kingdom','spain','france','italy']){const file='dist/data/europe/'+country+'/sources.json';if(fs.existsSync(file))for(const s of JSON.parse(fs.readFileSync(file)).sources)pinned.set(s.file,s);}
// Some servers cut long transfers; fetch those in 4 MB ranges with retries.
async function ranged(url){
 const size=+(await fetch(url,{method:'HEAD'})).headers.get('content-length'),parts=[];
 for(let start=0;start<size;start+=4<<20){const end=Math.min(size,start+(4<<20))-1;for(let attempt=1;;attempt++){try{const r=await fetch(url,{headers:{Range:`bytes=${start}-${end}`}});if(r.status!==206)throw Error('status '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length!==end-start+1)throw Error('short range');parts.push(b);break;}catch(e){if(attempt>6)throw e;await new Promise(r=>setTimeout(r,1500*attempt));}}}
 return Buffer.concat(parts);
}
// Retained snapshots are reused; pass --refresh to download and review new versions.
const refresh=process.argv.includes('--refresh');
async function download(name,url,metadata={}){
 if(pinned.has(name)){url=pinned.get(name).url;metadata=pinned.get(name);}
 const target=path.join(root,name);
 if(!refresh&&fs.existsSync(target)){
  const bytes=fs.readFileSync(target),sha256=createHash('sha256').update(bytes).digest('hex');
  if(pinned.has(name)&&pinned.get(name).sha256!==sha256)throw Error('Retained source differs from its pin: '+name);
  manifest.files[name]={...metadata,url,sha256,bytes:bytes.length};console.log(name,bytes.length,'(retained)');return;
 }
 let bytes;
 try{const response=await fetch(url,{signal:AbortSignal.timeout(300000),headers:{'User-Agent':'boundary-atlas (github.com/Ethan-H147/china_interactive_map)',Accept:'application/json'}});if(!response.ok)throw Object.assign(Error(url+' '+response.status),{http:true});bytes=Buffer.from(await response.arrayBuffer());}
 catch(error){if(error.http)throw error;bytes=await ranged(url);}
 if(bytes.toString('utf8',0,100).startsWith('version https://git-lfs')){const r=await fetch(url.replace('github.com/wmgeolab/geoBoundaries/raw/','media.githubusercontent.com/media/wmgeolab/geoBoundaries/'));if(!r.ok)throw Error('LFS '+r.status);bytes=Buffer.from(await r.arrayBuffer());}
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(pinned.has(name)&&pinned.get(name).sha256!==sha256)throw Error('Pinned boundary source changed: '+name+'; review the updated source before replacing its snapshot.');
 fs.writeFileSync(path.join(root,name),bytes);
 manifest.files[name]={url,...metadata,sha256,bytes:bytes.length};
 console.log(name,bytes.length);
}
async function geoBoundaries(name,iso,level,licenseURL){
 const meta=await(await fetch('https://www.geoboundaries.org/api/current/gbOpen/'+iso+'/'+level+'/')).json();
 await download(name,meta.gjDownloadURL,{provider:meta.boundarySource,year:meta.boundaryYearRepresented,license:meta.boundaryLicense,licenseURL,count:Number(meta.admUnitCount),via:'geoBoundaries gbOpen '+iso+' '+level});
}
const ons='https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Countries_December_2024_Boundaries_UK_BGC/FeatureServer/0/query?where=1%3D1&outFields=CTRY24CD,CTRY24NM&outSR=4326&f=geojson';
await download('gbr-countries-2024-bgc.geojson',ons,{provider:'Office for National Statistics, Countries (December 2024) Boundaries UK BGC',year:2024,license:'Open Government Licence v3.0',licenseURL:'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',attribution:'Source: Office for National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and database right 2024'});
await geoBoundaries('esp-adm0.geojson','ESP','ADM0','https://creativecommons.org/licenses/by/4.0/');
await geoBoundaries('fra-adm1.geojson','FRA','ADM1','https://www.etalab.gouv.fr/licence-ouverte-open-licence/');
await geoBoundaries('ita-adm0.geojson','ITA','ADM0','https://creativecommons.org/licenses/by/3.0/');
// Neighbouring countries: used only to tell land frontier from coastline (an outline
// edge with foreign land just beyond it is a frontier). None of their geometry is shipped.
// The most detailed land-only level is used where ADM0 is coarse (Belgium, Ireland, Slovenia).
for(const [iso,level] of [['PRT','ADM0'],['AND','ADM0'],['GIB','ADM0'],['MAR','ADM0'],['BEL','ADM2'],['LUX','ADM0'],['DEU','ADM0'],['CHE','ADM0'],['MCO','ADM0'],['AUT','ADM0'],['SVN','ADM2'],['SMR','ADM0'],['VAT','ADM0'],['IRL','ADM1']]){
 const meta=await(await fetch('https://www.geoboundaries.org/api/current/gbOpen/'+iso+'/'+level+'/')).json();
 await download('neighbour-'+iso.toLowerCase()+'-'+level.toLowerCase()+'.geojson',meta.gjDownloadURL,{provider:meta.boundarySource,year:meta.boundaryYearRepresented,license:meta.boundaryLicense,via:'geoBoundaries gbOpen '+iso+' '+level,use:'Classifies land frontier; no geometry is copied.'});
}
// OpenStreetMap separates land border ways from maritime ones. Where a neighbour's outline
// includes territorial waters, these land ways say exactly where the land frontier ends.
for(const [id,name] of [[1124039,'Monaco'],[1154756,'Ceuta'],[1154757,'Melilla'],[218657,'Slovenia']])await download('osm-relation-'+id+'.json','https://api.openstreetmap.org/api/0.6/relation/'+id+'/full.json',{provider:'OpenStreetMap contributors, boundary relation '+id+' ('+name+')',license:'Open Data Commons Open Database License 1.0',licenseURL:'https://www.openstreetmap.org/copyright',use:'Land border ways (admin_level 2, not maritime) bound the frontier with neighbours whose outlines include territorial waters; no geometry is copied.'});
// Italy: ISTAT administrative boundaries for statistical purposes, 1 January 2026, full detail.
await download('istat-limiti-2026.zip','https://www.istat.it/storage/cartografia/confini_amministrativi/non_generalizzati/2026/Limiti01012026.zip',{provider:'ISTAT, Confini delle unità amministrative a fini statistici al 1° gennaio 2026 (non generalizzati)',year:2026,license:'Creative Commons Attribution 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/',dataset:'https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/'});
// Spain: IGN jurisdictional boundaries (BDLJE), INSPIRE GML. The server cuts long transfers, so download() falls back to ranges.
await download('ign-lineas-limite-gml.zip','https://centrodedescargas.cnig.es/CentroDescargas/documentos/atom/au/lineas_limite_gml.zip',{provider:'Instituto Geográfico Nacional, Base de Datos de Límites Jurisdiccionales de España (BDLJE), INSPIRE administrative units',license:'Creative Commons Attribution 4.0',licenseURL:'https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf',dataset:'https://www.ign.es/atom/dataset_feeds/lin_lim_mun.es.xml'});
// France: communes of the 96 metropolitan départements with IGN outlines (ADMIN EXPRESS),
// from the government geography API (Etalab Open Licence 2.0); region and département names.
const geoApi='https://geo.api.gouv.fr';
const geoMeta={provider:'Etalab geo.api.gouv.fr, IGN ADMIN EXPRESS commune outlines and official surfaces',license:'Etalab Open Licence 2.0',licenseURL:'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',dataset:'https://geo.api.gouv.fr/decoupage-administratif'};
await download('france-regions.json',geoApi+'/regions?fields=nom,code',geoMeta);
await download('france-departements.json',geoApi+'/departements?fields=nom,code,codeRegion',geoMeta);
for(const d of JSON.parse(fs.readFileSync(path.join(root,'france-departements.json'))).filter(d=>d.code.length===2))
 await download('france-communes-'+d.code+'.geojson',`${geoApi}/departements/${d.code}/communes?format=geojson&geometry=contour&fields=nom,code,codeDepartement,codeRegion,surface`,geoMeta);
await download('insee-populations-2023.xlsx','https://www.insee.fr/fr/statistiques/fichier/8680726/ensemble.xlsx',{provider:'INSEE, populations de référence en vigueur au 1er janvier 2026 (date de référence statistique 1er janvier 2023)',year:2023,license:'Etalab Open Licence 2.0',licenseURL:'https://www.insee.fr/fr/information/2381863',dataset:'https://www.insee.fr/fr/statistiques/8680726'});
await download('ne-10m-land-boundaries.geojson','https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_boundary_lines_land.geojson',{provider:'Natural Earth 1:10m admin 0 land boundary lines v5.1.2',license:'Public domain',licenseURL:'https://www.naturalearthdata.com/about/terms-of-use/',use:'Classifies outline edges as land frontier or coastline; no geometry is copied.'});
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
