// Migrate the already-built datasets to the junction used by argentinaBorderTopology.
// Back up this exact file list, preserve all other geometry and update compact copies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
const root='dist/data/',backup='artifacts/pilcomayo-junction-backup/';
const files=['south-america/argentina-first.bin','flight-context.bin','atlas-frontiers.bin',
 'europe/paraguay/context.bin','europe/paraguay/first.bin','europe/paraguay/all.bin','europe/paraguay/second/PY-D-16.bin'];
const old=[-62.342017,-23.624314],tip=[-62.3423,-22.4607],junction=[-62.3425,-22.4565];
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
function repair(value,count){
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value)){
  if(value.length===2&&typeof value[0]==='number'){
   if(same(value,old)){count.spikes++;return [...junction];}
   if(same(value,tip))return [...junction];
   return value;
  }
  const next=value.map(v=>repair(v,count));
  if(next.every(p=>Array.isArray(p)&&typeof p[0]==='number'))return next.filter((p,i)=>!i||!same(p,next[i-1]));
  return next;
 }
 for(const k of Object.keys(value))value[k]=repair(value[k],count);return value;
}
for(const file of files){
 const data=load(root+file),count={spikes:0},fixed=repair(data,count);
 assert(count.spikes>0||!JSON.stringify(data).includes(String(old[0])),file+' must be a recognized dataset');
 if(!count.spikes){console.log('Already repaired',file);continue;}
 const save=(name,bytes)=>{const original=backup+name;if(!fs.existsSync(original)){fs.mkdirSync(path.dirname(original),{recursive:true});fs.copyFileSync(root+name,original);}fs.writeFileSync(root+name,bytes);};
 const text=JSON.stringify(fixed);save(file,gzipSync(text,{level:9}));
 if(fs.existsSync(root+'compact/'+file))save('compact/'+file,gzipSync(encodeGeo(fixed,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
 console.log('Repaired',file,count.spikes+' junction occurrences');
}
const source=root+'south-america/argentina-sources.json',info=load(source),bytes=fs.readFileSync(root+files[0]);
info.bytes=bytes.length;info.decodedBytes=Buffer.byteLength(JSON.stringify(load(root+files[0])));
info.topologyNote='Salta/Formosa share one northern Pilcomayo junction; their near-parallel source edges are aligned before dissolving.';
fs.writeFileSync(source,JSON.stringify(info,null,2)+'\n');
const catalogueFile=root+'europe/paraguay/catalogue.bin',catalogue=load(catalogueFile),chunk=catalogue.chunks['PY-D-16'];
chunk.bytes=fs.statSync(root+'europe/paraguay/'+chunk.file).size;
chunk.decodedBytes=Buffer.byteLength(JSON.stringify(load(root+'europe/paraguay/'+chunk.file)));
fs.writeFileSync(catalogueFile,gzipSync(JSON.stringify(catalogue),{level:9}));
