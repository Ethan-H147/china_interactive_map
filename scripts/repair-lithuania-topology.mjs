import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load,polygons,landIndex,linesOf,lineIndex} from './geo-index.mjs';
import {fc,command,sharedBorders,buildContext,geographicBounds} from './build-regional-dataset.mjs';
import {completeLithuanianRiverTerritory} from './lithuania-topology.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {geometryBoxes} from './build-context-coverage.mjs';
import {coverage} from '../dist/context-coverage.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

// Keep earlier political strokes through real lakes; land fills alone cannot
// reconstruct those. New jointly cleaned edges take priority over old copies.
function boundaryMesh(regions,previous){
 const current=sharedBorders(regions),near=lineIndex(linesOf(current)),extra=[];
 for(const f of previous?.features||[])for(const path of linesOf(fc([f]))){let run;for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];if([0,.25,.5,.75,1].every(t=>near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<1)){run=null;continue;}
  if(!run){run=[a];extra.push({...f,geometry:{type:'LineString',coordinates:run}});}run.push(b);
 }}
 return lineData(fc([...current.features,...extra]));
}

export async function repairLithuanianTopology(){
 const dir='dist/data/europe/lithuania/',cat=load(dir+'catalogue.bin'),units=new Map(cat.records.map(r=>[r.id,r])),backup='artifacts/lithuania-city-coverage/before-topology/';
 const save=(file,data)=>{const original=backup+file;if(!fs.existsSync(original)){fs.mkdirSync(path.dirname(original),{recursive:true});fs.copyFileSync(file,original);}fs.writeFileSync(file,file.endsWith('.bin')?gzipSync(JSON.stringify(data),{level:9}):JSON.stringify(data,null,2)+'\n');};
 const municipalities=fc(Object.values(cat.chunks).filter(c=>c.level===2).flatMap(c=>load(dir+c.file).regions.features));
 const bottom=fc(municipalities.features.flatMap(f=>cat.chunks[f.properties.id]?load(dir+cat.chunks[f.properties.id].file).regions.features:[f]));
 const complete=await completeLithuanianRiverTerritory(bottom,units);
 const second=await command(fc(complete.features.map(f=>({...f,properties:{id:units.get(f.properties.id).level===3?units.get(f.properties.id).parent:f.properties.id}}))),'-dissolve id -clean gap-fill-area=0');
 const first=await command(fc(second.features.map(f=>({...f,properties:{id:units.get(f.properties.id).parent}}))),'-dissolve id -clean gap-fill-area=0');
 const third=fc(complete.features.filter(f=>units.get(f.properties.id).level===3));
 const byLevel={1:first,2:second,3:third};
 save(dir+'first.bin',{regions:first,boundaries:boundaryMesh(first,load(dir+'first.bin').boundaries)});
 for(const [parent,chunk]of Object.entries(cat.chunks)){
  const regions=fc(byLevel[chunk.level].features.filter(f=>units.get(f.properties.id).parent===parent)),data={regions,boundaries:boundaryMesh(regions,load(dir+chunk.file).boundaries)};
  save(dir+chunk.file,data);chunk.bytes=fs.statSync(dir+chunk.file).size;chunk.decodedBytes=Buffer.byteLength(JSON.stringify(data));
 }
 for(const r of cat.records){const f=byLevel[r.level].features.find(f=>f.properties.id===r.id);r.bounds=geographicBounds(f.geometry);if(!landIndex(polygons(f.geometry).flat())(r.center))r.center=(await command(fc([f]),'-points inner')).features[0].geometry.coordinates;}
 const previousAll=load(dir+'all.bin');save(dir+'catalogue.bin',cat);save(dir+'all.bin',{levels:[1,2].map(level=>({level,regions:byLevel[level],boundaries:boundaryMesh(byLevel[level],previousAll.levels.find(r=>r.level===level)?.boundaries)}))});
 const context=await buildContext('lithuania',{1:first},cat.records);save(dir+'context.bin',context);
 for(const file of ['world-land.bin','globe-overview-land.bin']){const data=load('dist/data/'+file),shape=file.startsWith('globe')?await command(context,'-simplify dp interval=.006 planar keep-shapes'):context;for(const f of data.features)if(f.properties.country==='lithuania')f.geometry=shape.features[0].geometry;save('dist/data/'+file,data);}
 for(const [file,key,target]of [['globe-overview.json','landBytes','globe-overview-land.bin'],['world-land-sources.json','bytes','world-land.bin']]){const data=load('dist/data/'+file);data[key]=fs.statSync('dist/data/'+target).size;save('dist/data/'+file,data);}
 for(const file of ['world-land.bin','europe/lithuania/context.bin']){const raw=JSON.stringify(load('dist/data/'+file)),target='dist/data/compact/'+file,original=backup+target;if(!fs.existsSync(original)){fs.mkdirSync(path.dirname(original),{recursive:true});fs.copyFileSync(target,original);}fs.writeFileSync(target,gzipSync(encodeGeo(JSON.parse(raw),{source:createHash('sha256').update(raw).digest('hex')}),{level:9}));coverage[file]={sha256:createHash('sha256').update(fs.readFileSync('dist/data/'+file)).digest('hex'),boxes:geometryBoxes(JSON.parse(raw))};}
 const coverageFile='dist/context-coverage.mjs';if(!fs.existsSync(backup+coverageFile)){fs.mkdirSync(path.dirname(backup+coverageFile),{recursive:true});fs.copyFileSync(coverageFile,backup+coverageFile);}fs.writeFileSync(coverageFile,'// Generated by scripts/build-context-coverage.mjs from displayed context geometry.\nexport const coverage='+JSON.stringify(coverage)+';\n');
 const sources=load(dir+'sources.json');sources.topologyRepair={method:'Enclosed rounding gaps of at most 10 square metres are cleaned jointly before parent dissolution and shared-edge extraction. One omitted Jurbarkas river section is restored from the official municipal footprint, partitioned using the existing eldership divider extended to that footprint. Existing IDs and statistics remain unchanged.'};save(dir+'sources.json',sources);
 console.log('Rebuilt Lithuanian shared topology, Jurbarkas river territory and all parent/child boundary meshes.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await repairLithuanianTopology();
