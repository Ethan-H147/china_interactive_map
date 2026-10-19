import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
export const root='scripts/boundary-sources/brunei';
const revision='ca3b69985e3d0a9eaf85ad38843d5ba3086be7ac',repo='https://raw.githubusercontent.com/bruneiverse/bruneimap/'+revision+'/';
export async function fetchBrunei(){
 fs.mkdirSync(root,{recursive:true});const previous=fs.existsSync(root+'/manifest.json')?JSON.parse(fs.readFileSync(root+'/manifest.json')):{files:{}},files={
  'districts.geojson':{url:repo+'data-raw/maps/map_data/geojson/districts_latlon.txt.geojson',license:'CC BY 4.0',credit:'Nadi.BN GIS data distributed by bruneiverse/bruneimap',revision},
  'mukims.geojson':{url:repo+'data-raw/maps/map_data/geojson/mukims_latlon.txt.geojson',license:'CC BY 4.0',credit:'Nadi.BN GIS data distributed by bruneiverse/bruneimap',revision},
  'kampongs.geojson':{url:repo+'data-raw/maps/map_data/geojson/kampongs_latlon.txt.geojson',license:'CC BY 4.0',credit:'Nadi.BN GIS data distributed by bruneiverse/bruneimap',revision},
  'mukimdata.csv':{url:repo+'data-raw/maps/map_data/mukimdata.csv',license:'CC BY 4.0',credit:'Nadi.BN GIS data distributed by bruneiverse/bruneimap',revision},
  'malaysia-reference.bin':{url:'https://raw.githubusercontent.com/Ethan-H147/china_interactive_map/7f0271932ccc3459b62382a0cc9d57b50c0d905c/dist/data/southeast-asia/malaysia-first.bin',license:'Existing atlas geometry from DOSM Malaysia data-open; retained only to locate border mouths',credit:'Department of Statistics Malaysia / existing Boundary Atlas Sarawak geometry'},
  'frontiers.geojson':{url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_boundary_lines_land.geojson',license:'Public domain',credit:'Natural Earth v5.1.2 (frontier identification only)'},
  'processing.R':{url:repo+'data-raw/maps/surveydept.R',license:'GPL-3.0 source processing reference; no software copied into runtime',credit:'bruneiverse/bruneimap',revision},
  'README.md':{url:repo+'README.md',license:'Retained source license statement',credit:'bruneiverse/bruneimap',revision},
  'population2025.pdf':{url:'https://deps.mofe.gov.bn/wp-content/uploads/2026/04/POP_2025_RPT.pdf',license:'Official published statistics; attribution to Department of Economic Planning and Statistics, Brunei',credit:'DEPS, Population Estimates 2025',date:'2025'},
  'flag.svg':{url:'https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Brunei.svg',license:'Public domain',credit:'Flag of Brunei; Wikimedia Commons'}
 };
 for(const[name,meta]of Object.entries(files)){const file=root+'/'+name+'.gz';let bytes;if(fs.existsSync(file))bytes=gunzipSync(fs.readFileSync(file));else{const r=await fetch(meta.url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(name+' '+r.status);bytes=Buffer.from(await r.arrayBuffer());fs.writeFileSync(file,gzipSync(bytes,{level:9}));}const sha256=createHash('sha256').update(bytes).digest('hex');if(previous.files[name]&&previous.files[name].sha256!==sha256)throw Error('Retained source changed '+name);files[name]={...meta,sha256,bytes:bytes.length};console.log(name,bytes.length);}
 fs.writeFileSync(root+'/manifest.json',JSON.stringify({retrieved:'2026-10-18',files},null,2)+'\n');
}
export function readBrunei(name){const bytes=gunzipSync(fs.readFileSync(root+'/'+name+'.gz')),m=JSON.parse(fs.readFileSync(root+'/manifest.json'));if(createHash('sha256').update(bytes).digest('hex')!==m.files[name].sha256)throw Error('Changed Brunei cache '+name);return bytes;}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchBrunei();