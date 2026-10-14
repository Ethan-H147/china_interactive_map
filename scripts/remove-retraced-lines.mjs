import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {visibleSegments} from '../dist/adaptive-lines.mjs';

// Applies the builders' single-stroke rule (visibleSegments) to boundary line sets
// in already-built files, without rebuilding them from their downloaded sources.
// Only `boundaries` line sets change; everything else is verified unchanged.
const files=['dist/data/japan-boundaries.bin','dist/data/mongolia-boundaries.bin','dist/data/russia/international.bin'];
const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.bin'))files.push(p);}};
walk('dist/data/southern-africa');
const isLines=v=>v&&(v.type==='FeatureCollection'?v.features.length>0&&v.features.every(f=>/LineString/.test(f.geometry?.type)):/LineString/.test(v.type||''));
let changed=0;
for(const file of files){
 const bytes=fs.readFileSync(file);if(bytes[0]!==31||bytes[1]!==139)continue;
 const payload=JSON.parse(gunzipSync(bytes));let edits=0;
 // Line sets under a boundaries key, or a file that is itself one line set.
 const visit=(value,inBoundaries=false)=>{
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
   if((key==='boundaries'||inBoundaries)&&isLines(item)){const next=visibleSegments(item);if(next!==item&&JSON.stringify(next)!==JSON.stringify(item)){value[key]=next;edits++;}}
   else visit(item,inBoundaries||key==='boundaries');
  }
 };
 const before=JSON.parse(JSON.stringify(payload));let whole=null;
 if(isLines(payload)){const next=visibleSegments(payload);if(JSON.stringify(next)!==JSON.stringify(payload)){whole=next;edits++;}}else visit(payload);
 if(!edits)continue;
 // Kept strokes are exact pieces of the originals; nothing outside boundaries moved.
 const strip=v=>JSON.stringify(v,(k,x)=>(k==='boundaries'||k==='first'||k==='second'||k==='countries')&&isLines(x)?undefined:x);
 if(!whole)assert.equal(strip(payload),strip(before),file+': only boundary lines may change');
 fs.writeFileSync(file,gzipSync(JSON.stringify(whole||payload),{level:9}));changed++;
 console.log('single-stroke lines:',path.relative('dist/data',file));
}
// The settlement manifest records each file's size and edge count.
const base='dist/data/southern-africa/south-africa/settlement-boundaries/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json'));
let bytes=0,edges=0;
for(const entry of Object.values(manifest.provinces)){const raw=fs.readFileSync(base+entry.file);entry.bytes=raw.length;entry.edgeCount=JSON.parse(gunzipSync(raw)).boundaries.features.length;bytes+=entry.bytes;edges+=entry.edgeCount;}
manifest.validation.totalGzipBytes=bytes;manifest.validation.edges=edges;
fs.writeFileSync(base+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Checked ${files.length} files; updated ${changed}.`);
