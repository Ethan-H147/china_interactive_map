import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sourceNames} from './russia-names.mjs';
const root='dist/data/russia/',read=file=>JSON.parse(gunzipSync(fs.readFileSync(root+file))),write=(file,d)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(d),{level:9}));
const catalogue=read('catalogue.bin');
const nativeSource=JSON.parse(fs.readFileSync('scripts/name-sources/russia-district-names.json','utf8'));
const nativeNames=nativeSource.names;
for(const r of catalogue.records){
 if(r.id==='RU-SA')r.aliases=[...new Set([...(r.aliases||[]),'Yakutia'])];
 if(r.level===2&&/[\u0400-\u04ff]/.test(r.en)){Object.assign(r,sourceNames(r.en));if(/Urban District|Okrug|City/.test(r.en))r.kind='City / urban district';}
 if(r.level===2&&nativeNames[r.id]){
  const name=nativeNames[r.id];
  if(name.en&&name.en!==r.en){r.aliases=[...new Set([...(r.aliases||[]),r.en])];r.en=name.en;if(/Urban|Okrug|City/.test(r.en))r.kind='City / urban district';}
  r.local=name.local;
  r.aliases=[...new Set([...(r.aliases||[]),...(name.aliases||[])])];
 }
 if(r.level===2&&!/[А-Яа-яЁё]/.test(r.local||''))throw Error('Missing verified Russian name: '+r.id+' '+r.en);
}
const records=new Map(catalogue.records.map(r=>[r.id,r]));
for(const chunk of Object.values(catalogue.chunks)){
 const d=read(chunk.file);for(const f of d.regions.features){const r=records.get(f.properties.id);Object.assign(f.properties,{en:r.en,...(r.local?{local:r.local}:{}),kind:r.kind});}
 write(chunk.file,d);chunk.bytes=fs.statSync(root+chunk.file).size;chunk.decodedBytes=Buffer.byteLength(JSON.stringify(d));
}
write('catalogue.bin',catalogue);
const sources=JSON.parse(fs.readFileSync(root+'sources.json','utf8'));
const {provider,license,licenseURL,retrieved,sourceArchive,sourceArchiveSha256,method}=nativeSource.provenance;
sources.nativeNames={provider,license,licenseURL,retrieved,sourceArchive,sourceArchiveSha256,records:Object.keys(nativeNames).length,method};
const processing='Russian district labels are restored from the original OpenStreetMap relation IDs, with historical names used for the boundary snapshot. Complete Cyrillic names replace empty or truncated source labels.';
if(!sources.processing.includes(processing))sources.processing+=' '+processing;
fs.writeFileSync(root+'sources.json',JSON.stringify(sources,null,2)+'\n');
console.log('Every district has a sourced Russian label alongside its Latin name.');
