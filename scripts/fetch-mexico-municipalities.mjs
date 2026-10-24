import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {csv} from './us-geography.mjs';
export const root='scripts/boundary-sources/mexico-municipalities/';
export async function fetchMexicoMunicipalities(){
 fs.mkdirSync(root,{recursive:true});const file=root+'manifest.json',manifest=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{retrieved:'2026-10-23',provider:'INEGI · Marco Geoestadístico and Catálogo Único de Claves Geoestadísticas',license:'INEGI free use with attribution',documentation:'https://www.inegi.org.mx/servicios/catalogounico.html',files:{}};
 const jobs=Array.from({length:32},(_,i)=>String(i+1).padStart(2,'0')).flatMap(code=>['geo','catalogue'].map(type=>({code,type,name:type+'-'+code+'.json',url:'https://gaia.inegi.org.mx/wscatgeo/v2/'+(type==='geo'?'geo/':'')+'mgem/'+code})));
 let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<jobs.length){const job=jobs[cursor++],target=root+job.name+'.gz';let bytes,downloaded=false;
  if(fs.existsSync(target))bytes=gunzipSync(fs.readFileSync(target));else{
   for(let attempt=0;;attempt++){try{const r=await fetch(job.url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(r.status+' '+job.url);bytes=Buffer.from(await r.arrayBuffer());JSON.parse(bytes);break;}catch(e){if(attempt>=2)throw e;}}
   fs.writeFileSync(target,gzipSync(bytes,{level:9}));downloaded=true;
  }
  const data=JSON.parse(bytes),sha256=createHash('sha256').update(bytes).digest('hex');if(manifest.files[job.name]?.sha256&&manifest.files[job.name].sha256!==sha256)throw Error('Retained source changed: '+job.name);
  manifest.files[job.name]={url:job.url,sha256,bytes:bytes.length,...(data.metadatos?{metadata:data.metadatos}:{})};if(downloaded)console.log('Retained INEGI '+job.type+' '+job.code+' · '+bytes.length+' bytes');
 }}));
 const seatFile='census-seats.json',seatTarget=root+seatFile+'.gz',archivePin=JSON.parse(fs.readFileSync('scripts/country-expansion-sources.json')).files['mexico-population.zip'];let seats;
 if(fs.existsSync(seatTarget))seats=gunzipSync(fs.readFileSync(seatTarget));else{
  const cached='artifacts/expansion-source/mexico-population.zip',archive=fs.existsSync(cached)?fs.readFileSync(cached):Buffer.from(await(await fetch(archivePin.url,{signal:AbortSignal.timeout(180000)})).arrayBuffer());
  if(createHash('sha256').update(archive).digest('hex')!==archivePin.sha256)throw Error('Retained census archive changed');
  const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),files=unzipSync(archive),key=Object.keys(files).find(k=>k.includes('conjunto_de_datos/')&&k.endsWith('.csv')),rows=csv(Buffer.from(files[key]).toString('utf8').replace(/^\uFEFF/,''));
  const wanted=new Set(Array.from({length:32},(_,i)=>JSON.parse(gunzipSync(fs.readFileSync(root+'geo-'+String(i+1).padStart(2,'0')+'.json.gz'))).features).flat().map(f=>f.properties.cvegeo+f.properties.cve_cab));
  seats=Buffer.from(JSON.stringify(rows.filter(r=>wanted.has(r.ENTIDAD+r.MUN+r.LOC)).map(r=>({code:r.ENTIDAD+r.MUN+r.LOC,name:r.NOM_LOC}))));if(JSON.parse(seats).length<2400)throw Error('Incomplete census municipal-seat extraction');fs.writeFileSync(seatTarget,gzipSync(seats,{level:9}));
 }
 const seatSha=createHash('sha256').update(seats).digest('hex');if(manifest.files[seatFile]?.sha256&&manifest.files[seatFile].sha256!==seatSha)throw Error('Retained municipal-seat names changed');
 manifest.files[seatFile]={url:archivePin.url,sha256:seatSha,bytes:seats.length,upstreamSha256:archivePin.sha256,extraction:'Only locality codes and names matching municipal-seat codes in the retained INEGI municipal vector records; 2020 census ITER source.'};
 fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await fetchMexicoMunicipalities();
