import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {configurations} from '../dist/southern-africa.mjs';

// Small countries can prepare every level in one worker request on entry.
for(const c of Object.values(configurations).filter(c=>c.loadAllSubdivisions)){
 const base='dist/'+c.base,read=file=>JSON.parse(gunzipSync(fs.readFileSync(base+file)));
 const catalogue=read('catalogue.bin'),levels=[{level:1,...read('first.bin')}];
 for(let level=2;level<=catalogue.levels.length;level++){
  const parts=Object.entries(catalogue.chunks).filter(([parent])=>catalogue.records.find(r=>r.id===parent)?.level===level-1).map(([,chunk])=>read(chunk.file));
  levels.push({level,regions:{type:'FeatureCollection',features:parts.flatMap(p=>p.regions.features)},boundaries:{type:'FeatureCollection',features:parts.flatMap(p=>p.boundaries.features)}});
 }
 const bytes=gzipSync(JSON.stringify({levels}),{level:9});fs.writeFileSync(base+'all.bin',bytes);
 const sourceFile=base+'sources.json',sources=JSON.parse(fs.readFileSync(sourceFile));
 sources.processing=sources.processing.replace('Local geometry loads per parent.','All subdivision geometry loads together when South Africa is selected.');
 fs.writeFileSync(sourceFile,JSON.stringify(sources,null,2)+'\n');
 console.log(c.name,levels.map(p=>p.regions.features.length).join(' / '),'regions;',bytes.length,'bytes in one country bundle');
}
