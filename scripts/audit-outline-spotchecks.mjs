import fs from 'node:fs';
import {load,polygons,lineIndex,linesOf,metres} from './geo-index.mjs';
const countries=['germany','france','united-kingdom','austria','romania','egypt','india','australia'],results=[];
for(const country of countries){
 const data=load('dist/data/europe/'+country+'/first.bin'),near=lineIndex(linesOf(data.boundaries)),edges=new Map(),key=p=>p.map(v=>v.toFixed(6)).join(',');
 for(const [id,f] of data.regions.features.entries())for(const p of polygons(f.geometry))for(const r of p)for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i],k=[key(a),key(b)].sort().join('|');if(!edges.has(k))edges.set(k,{a,b,owners:new Set()});edges.get(k).owners.add(id);}
 let checked=0;const missing=[];
 for(const {a,b,owners} of edges.values())if(owners.size>1&&metres(a,b)>50){checked++;const p=a.map((v,j)=>(v+b[j])/2);if(near(p)>1)missing.push(p);}
 results.push({country,sharedSegmentsChecked:checked,missing});
}
fs.writeFileSync('docs/outline-spotchecks.json',JSON.stringify({scope:'First-level exact shared edges in eight country datasets; a quick screen, not an exhaustive world audit.',results},null,2)+'\n');console.log(JSON.stringify(results.map(r=>({country:r.country,checked:r.sharedSegmentsChecked,missing:r.missing.length}))));
