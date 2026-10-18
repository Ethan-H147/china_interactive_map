import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
export const directory='artifacts/us-source';
export const municipalStates={"10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY","72":"PR","01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT"};
// Town and township governments occur in these states. Statistical county
// divisions elsewhere are not municipalities.
export const townshipStates=new Set(['09','17','18','19','20','23','25','26','27','29','31','33','34','36','38','39','42','44','46','50','55']);
export const definitions={
 'zip-directory.xlsx':{url:'https://postalpro.usps.com/mnt/glusterfs/2026-10/Zip_Locale_Detail.xlsx',provider:'USPS · ZIP Locale Detail, October 2026'},
 'zip-assignments.txt':{url:'https://postalpro.usps.com/storages/2026-10/AREADIST_ZIP5_0.TXT',provider:'USPS · Area District 5-digit ZIP assignments, 13 October 2026'},
 'consolidated-cities.zip':{url:'https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_concity_500k.zip',provider:'US Census Bureau · 2025 consolidated city governments, 1:500,000'},
 'place-status.zip':{url:'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip',provider:'US Census Bureau · 2025 place Gazetteer, government status'},
 'cousub-status.zip':{url:'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_cousubs_national.zip',provider:'US Census Bureau · 2025 county subdivision Gazetteer, government status'},
 'zip-land.zip':{url:'https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_state_500k.zip',provider:'US Census Bureau · 2020 state land, ZCTA coastline reference'},
 'zctas.zip':{url:'https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip',provider:'US Census Bureau · 2020 ZCTA, 1:500,000'},
 'zcta-counties.txt':{url:'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt',provider:'US Census Bureau · 2020 ZCTA–county relationships'},
 ...Object.fromEntries([...townshipStates].map(s=>['cousubs-'+s+'.zip',{url:'https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_'+s+'_cousub_500k.zip',provider:'US Census Bureau · 2025 county subdivisions, 1:500,000'}])),
 ...Object.fromEntries(Object.keys(municipalStates).map(s=>['places-'+s+'.zip',{url:'https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_'+s+'_place_500k.zip',provider:'US Census Bureau · 2025 places, 1:500,000'}]))
};
export async function fetchUSLocal(names=Object.keys(definitions)){
 fs.mkdirSync(directory,{recursive:true});const pinFile='scripts/us-local-sources.json',pins=fs.existsSync(pinFile)?JSON.parse(fs.readFileSync(pinFile)):{retrieved:'2026-10-17',files:{}};
 let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<names.length){const file=names[next++];const source=definitions[file],target=directory+'/'+file,retained='scripts/boundary-sources/united-states/'+file+'.gz';
  if(!fs.existsSync(target)){if(fs.existsSync(retained))fs.writeFileSync(target,gunzipSync(fs.readFileSync(retained)));else{const r=await fetch(source.url,{signal:AbortSignal.timeout(300000)});if(!r.ok)throw Error(file+' '+r.status);fs.writeFileSync(target,Buffer.from(await r.arrayBuffer()));}}
  const bytes=fs.readFileSync(target),sha256=createHash('sha256').update(bytes).digest('hex');if(pins.files[file]?.sha256&&pins.files[file].sha256!==sha256)throw Error(file+' differs from pinned snapshot');
  pins.files[file]={...source,license:'Public government reference data',sha256,bytes:bytes.length};
  if(!file.endsWith('.zip')||file.endsWith('-status.zip')){fs.mkdirSync('scripts/boundary-sources/united-states',{recursive:true});fs.writeFileSync(retained,gzipSync(bytes,{level:9}));}
 }}));
 fs.writeFileSync(pinFile,JSON.stringify(pins,null,2)+'\n');return pins;
}
