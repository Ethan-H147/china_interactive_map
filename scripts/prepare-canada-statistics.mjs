import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {municipalSourceRequest} from './municipal-source-request.mjs';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
export async function prepareCanadaStatisticsSources(){
 const root='scripts/statistics-sources/canada',pinFile='scripts/canada-statistics-sources.json',pins=fs.existsSync(pinFile)?JSON.parse(fs.readFileSync(pinFile)):{retrieved:'2026-10-18',files:{}};
 fs.mkdirSync(root,{recursive:true});fs.mkdirSync('artifacts/canada-source',{recursive:true});
 for(const[table,name,cached]of [['17100155','population-2025.csv','population-2025'],['98100004','census-area.csv','census-area']]){
  const retained=root+'/'+name+'.gz',url='https://www150.statcan.gc.ca/n1/tbl/csv/'+table+'-eng.zip';
  let bytes=fs.existsSync(retained)?gunzipSync(fs.readFileSync(retained)):fs.existsSync('artifacts/canada-source/'+name)?fs.readFileSync('artifacts/canada-source/'+name):null;
  if(!bytes){const r=await municipalSourceRequest(url);if(!r.ok)throw Error('Statistics Canada '+r.status);const zip=unzipSync(Buffer.from(await r.arrayBuffer()));bytes=Buffer.from(zip[table+'.csv']);bytes=Buffer.from(bytes.toString('utf8').replace(/^\uFEFF/,''));}
  const sha256=createHash('sha256').update(bytes).digest('hex');if(pins.files[name]&&pins.files[name].sha256!==sha256)throw Error('Retained Canadian statistics changed');
  fs.writeFileSync(retained,gzipSync(bytes,{level:9}));fs.writeFileSync('artifacts/canada-source/'+name,bytes);
  pins.files[name]={table,url,sha256,bytes:bytes.length,retained,license:'Statistics Canada Open Licence'};
 }
 fs.writeFileSync(pinFile,JSON.stringify(pins,null,1)+'\n');return pins;
}
if(process.argv[1]?.endsWith('prepare-canada-statistics.mjs'))await prepareCanadaStatisticsSources();
