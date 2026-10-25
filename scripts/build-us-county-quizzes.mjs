import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
const root=new URL('../dist/',import.meta.url),base='data/europe/united-states/',read=file=>JSON.parse(gunzipSync(fs.readFileSync(new URL(file,root)))),catalogue=read(base+'catalogue.bin');
const states=catalogue.records.filter(r=>r.level===1&&r.kind==='State').sort((a,b)=>a.en.localeCompare(b.en));if(states.length!==50)throw Error('Expected all 50 states');
const dir='data/quiz/us-counties/';fs.mkdirSync(new URL(dir,root),{recursive:true});const scopes=[];
for(const state of states){
 const records=catalogue.records.filter(r=>r.level===2&&r.parent===state.id&&!r.nonGeographic),chunk=catalogue.chunks[state.id];if(!records.length||!chunk)throw Error('Missing counties for '+state.id);
 const data=read(base+chunk.file),ids=new Set(records.map(r=>r.id));if(data.regions.features.length!==ids.size||data.regions.features.some(f=>!ids.has(f.properties.id)))throw Error('County geometry mismatch: '+state.id);
 const payload={records,regions:data.regions,boundaries:data.boundaries},bytes=gzipSync(JSON.stringify(payload),{level:9}),file=dir+state.id+'.bin';fs.writeFileSync(new URL(file,root),bytes);
 scopes.push({id:state.id,label:state.en,count:records.length,bounds:state.bounds,file,bytes:bytes.length,source:base+chunk.file});
}
fs.writeFileSync(new URL(dir+'index.json',root),JSON.stringify({level:2,plural:'Counties & equivalents',scopes})+'\n');
const libraryPath=new URL('data/quiz/library.json',root),library=JSON.parse(fs.readFileSync(libraryPath));library.usCountyScopes=scopes.map(({id,label,count})=>({id,label,count}));fs.writeFileSync(libraryPath,JSON.stringify(library)+'\n');
console.log(JSON.stringify({states:scopes.length,counties:scopes.reduce((n,s)=>n+s.count,0),bytes:scopes.reduce((n,s)=>n+s.bytes,0),source:'Retained Census 2025 county geography; original coordinates and shared boundaries preserved.'}));
