import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('./korea-sources/',import.meta.url);await fs.mkdir(root,{recursive:true});
const files={
 'south.geojson':'https://raw.githubusercontent.com/vuski/admdongkor/master/ver20260701/HangJeongDong_ver20260701.geojson',
 'south-names.geojson':'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json',
 'SOUTH-LICENSE.txt':'https://raw.githubusercontent.com/vuski/admdongkor/master/LICENSE-DATA',
 'north-country.json':'https://api.openstreetmap.org/api/0.6/relation/192734.json',
 'north-coast.json':'https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent('[out:json][timeout:90];way["natural"="coastline"](37.4,124.0,43.3,131.2);out geom;')
};
for(const [name,url] of Object.entries(files)){try{await fs.access(new URL(name,root));continue;}catch{}const r=await fetch(url,{headers:{'User-Agent':'ChinaKoreaAtlas/1.0'},signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(name+' '+r.status);await fs.writeFile(new URL(name,root),new Uint8Array(await r.arrayBuffer()));console.log(name);}
execFileSync(process.execPath,[fileURLToPath(new URL('./fetch-korea-osm.mjs',import.meta.url))],{stdio:'inherit'});
