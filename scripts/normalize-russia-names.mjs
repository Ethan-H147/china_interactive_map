import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sourceNames} from './russia-names.mjs';
const root='dist/data/russia/',read=file=>JSON.parse(gunzipSync(fs.readFileSync(root+file))),write=(file,d)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(d),{level:9}));
const catalogue=read('catalogue.bin');
for(const r of catalogue.records){
 if(r.id==='RU-SA')r.aliases=[...new Set([...(r.aliases||[]),'Yakutia'])];
 if(r.level===2&&/[\u0400-\u04ff]/.test(r.en)){Object.assign(r,sourceNames(r.en));if(/Urban District|Okrug|City/.test(r.en))r.kind='City / urban district';}
}
const records=new Map(catalogue.records.map(r=>[r.id,r]));
for(const chunk of Object.values(catalogue.chunks)){
 const d=read(chunk.file);for(const f of d.regions.features){const r=records.get(f.properties.id);Object.assign(f.properties,{en:r.en,...(r.local?{local:r.local}:{}),kind:r.kind});}
 write(chunk.file,d);chunk.bytes=fs.statSync(root+chunk.file).size;chunk.decodedBytes=Buffer.byteLength(JSON.stringify(d));
}
write('catalogue.bin',catalogue);
console.log('Native district labels retained alongside Latin transliterations.');
