import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
export const service='https://services.arcgis.com/lGOekm0RsNxYnT3j/ArcGIS/rest/services/Statistics_Canada_2021_census_boundaries/FeatureServer';
export const directory='scripts/boundary-sources/canada';
export const provinces={'10':'NL','11':'PE','12':'NS','13':'NB','24':'QC','35':'ON','46':'MB','47':'SK','48':'AB','59':'BC','60':'YT','61':'NT','62':'NU'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url){for(let attempt=0;attempt<6;attempt++){const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(r.ok){const data=await r.json();if(data.error)throw Error(JSON.stringify(data.error));return data;}if(![429,502,503,504].includes(r.status))throw Error(r.status+' '+url);const retry=r.headers.get('retry-after'),ms=retry?(/^\d+$/.test(retry)?Number(retry)*1000:Date.parse(retry)-Date.now()):30000;await pause(Math.max(ms,5000));}throw Error('Source unavailable');}
export async function fetchCanadaLocal(){
 fs.mkdirSync(directory,{recursive:true});fs.mkdirSync('artifacts/canada-source',{recursive:true});
 const pinFile='scripts/canada-local-sources.json',pins=fs.existsSync(pinFile)?JSON.parse(fs.readFileSync(pinFile)):{retrieved:'2026-10-18',provider:'Statistics Canada 2021 cartographic boundaries, distributed by Agriculture and Agri-Food Canada (original, not the separate 1 km generalized service)',license:'Statistics Canada Open Licence',original:'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21',service,files:{}};
 const save=(name,data,url)=>{const bytes=Buffer.from(JSON.stringify(data));fs.writeFileSync(directory+'/'+name,gzipSync(bytes,{level:9}));pins.files[name]={url,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,count:data.features?.length};fs.writeFileSync(pinFile,JSON.stringify(pins,null,1)+'\n');return data;};
 const cached=name=>{if(!fs.existsSync(directory+'/'+name))return null;const bytes=gunzipSync(fs.readFileSync(directory+'/'+name));if(createHash('sha256').update(bytes).digest('hex')!==pins.files[name]?.sha256)throw Error('Pinned source changed '+name);return JSON.parse(bytes);};
 const query=(layer,params)=>service+'/'+layer+'/query?'+new URLSearchParams({f:'geojson',where:'1=1',outFields:'*',returnGeometry:'false',...params});
 for(const layer of [2,4]){
  const name=layer===2?'division-roster.json.gz':'municipal-roster.json.gz';if(cached(name))continue;
  const count=(await json(service+'/'+layer+'/query?f=json&where=1%3D1&returnCountOnly=true')).count,features=[];
  for(let offset=0;offset<count;offset+=1000){const data=await json(query(layer,{resultOffset:offset,resultRecordCount:1000,orderByFields:'OBJECTID'}));features.push(...data.features);}
  if(features.length!==count)throw Error('Incomplete national roster');save(name,{type:'FeatureCollection',features},query(layer,{}));console.log(name,features.length);
 }
 if(process.argv.includes('--roster-only'))return pins;
 const roster=cached('municipal-roster.json.gz');
 for(const[pr,abbr]of Object.entries(provinces)){
  const name='municipal-'+pr+'.geojson.gz';if(cached(name)){console.log(abbr,'cached');continue;}
  const ids=roster.features.filter(f=>String(f.properties.PRUID)===pr).map(f=>f.properties.OBJECTID),features=[];
  for(let start=0;start<ids.length;start+=100){
   const group=ids.slice(start,start+100),file='artifacts/canada-source/'+pr+'-'+start+'.json',url=query(4,{objectIds:group.join(','),returnGeometry:'true',outSR:4326,geometryPrecision:6});
   const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):await json(url);
   if(data.features.length!==group.length||data.features.some(f=>!f.geometry))throw Error('Incomplete geometry batch '+pr+' '+start);
   fs.writeFileSync(file,JSON.stringify(data));features.push(...data.features);console.log(abbr,Math.min(start+100,ids.length)+'/'+ids.length);
  }
  save(name,{type:'FeatureCollection',features},query(4,{where:'PRUID='+pr,returnGeometry:'true',outSR:4326,geometryPrecision:6}));
 }
 return pins;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/fetch-canada-local.mjs')||process.argv[1]==='scripts/fetch-canada-local.mjs')await fetchCanadaLocal();
