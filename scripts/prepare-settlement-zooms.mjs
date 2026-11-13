import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {expandSettlementRecords,settlementDotZooms} from '../dist/settlement-layer.mjs';
import '../dist/countries.js';

export function prepareSettlementZooms(file,{check=false}={}){
 const bytes=fs.readFileSync(file),compressed=bytes[0]===31&&bytes[1]===139;
 const data=JSON.parse(compressed?gunzipSync(bytes):bytes),records=expandSettlementRecords(data);
 const zooms=settlementDotZooms(records);
 const stale=Object.keys(data.dotzooms||{}).length!==zooms.size||records.some(record=>data.dotzooms?.[record.id]!==zooms.get(record.id));
 if(check&&stale)throw Error('Stale settlement admission zooms: '+file+'; run npm run build:settlement-zooms');
 if(!check&&stale){
  data.dotzooms=Object.fromEntries(zooms);
  const text=JSON.stringify(data)+'\n';fs.writeFileSync(file,compressed?gzipSync(text,{level:9}):text);
 }
 return {file,count:records.length,changed:stale};
}

export function prepareAllSettlementZooms({check=false}={}){
 const results=[],seen=new Set();
 for(const country of Object.values(globalThis.AtlasCountries.countries)){
  const config=country.map;
  if(!config?.settlements||config.settlementManifest)continue;
  const target=path.join('dist',country.base,config.settlementFile||'settlements.json');
  const plain=target.endsWith('.bin')?target.slice(0,-4)+'.json':target;
  // Preserve each existing asset independently. Reviewed JSON can contain newer
  // names than a retained download; this build changes only admission metadata.
  for(const file of new Set([plain,target])){
   if(!fs.existsSync(file)||seen.has(file))continue;seen.add(file);
   results.push(prepareSettlementZooms(file,{check}));
  }
 }
 return results;
}
if(import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const check=process.argv.includes('--check'),rows=prepareAllSettlementZooms({check});
 for(const row of rows)console.log(row.file+': '+row.count+' settlements'+(check?' verified':row.changed?' precomputed':' current'));
}
