import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {load} from './geo-index.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
// The former South America adapter owned these exact shared land/river paths.
// Give each path one regional owner; border previews cover it before that owner loads.
export function retainedSouthAmericanFrontiers(country){
 const flight=load('dist/data/flight-context.bin'),iso={argentina:'ARG',brazil:'BRA',uruguay:'URY'};
 return lineData({type:'FeatureCollection',features:['landBorders','riverBorders'].flatMap(key=>flight[key].features.flatMap(f=>{
  const countries=[...f.properties.countries].sort(),owner=countries.includes('brazil')?'brazil':'argentina';if(owner!==country)return[];
  return[{...f,properties:{countries:countries.join(' '),resolvedFrontier:countries.map(c=>iso[c]).join('-'),referenceOwner:owner,retainedSouthAmericaFrontier:true,...(key==='riverBorders'?{water:true}:{})}}];
 }))}).features;
}
export function restoreSouthAmericanFrontiers(){
 for(const country of ['brazil','argentina','uruguay']){
  const file='europe/'+country+'/international.bin',data=load('dist/data/'+file);
  data.features=data.features.filter(f=>!f.properties.retainedSouthAmericaFrontier).concat(retainedSouthAmericanFrontiers(country));
  const json=JSON.stringify(data);fs.writeFileSync('dist/data/'+file,gzipSync(json,{level:9}));
  fs.writeFileSync('dist/data/compact/'+file,gzipSync(encodeGeo(data,{source:createHash('sha256').update(json).digest('hex')}),{level:9}));
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){restoreSouthAmericanFrontiers();await import('./build-border-previews.mjs');}
