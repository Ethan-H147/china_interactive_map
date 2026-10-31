import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {fc} from './build-regional-dataset.mjs';
import {provinceOutline} from './western-province-seams.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
import {replaceOutlineArc} from './replace-outline-arc.mjs';
export async function reconcileRemainingFeatures(input){
 const backup=new URL('boundary-sources/langfang/remaining-before.bin',import.meta.url);
 if(!fs.existsSync(backup))fs.writeFileSync(backup,gzipSync(JSON.stringify({subdivisions:fc(input)}),{level:9}));
 const refs=JSON.parse(fs.readFileSync(new URL('boundary-sources/langfang/remaining-arcs.json',import.meta.url))),reports=[];
 let features=input;
 for(const r of refs){
  const own=features.filter(f=>r.group==='province'?f.properties.provinceCode===r.aligned:f.properties.adcode===r.aligned),path=selectFrontierArc(provinceOutline(own),r.path).path,result=await replaceOutlineArc(fc(own),path,r.path,2500,{precision:null});
  const changes=new Map(result.regions.features.map(f=>[f.properties.adcode,f]));features=features.map(f=>changes.get(f.properties.adcode)||f);reports.push({...r,runs:result.runs});
 }
 return {features,reports};
}
