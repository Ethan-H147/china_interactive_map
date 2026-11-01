import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {splitSouthAmericaContext} from '../dist/south-america-context.mjs';

// Adapt metadata and file layout only. The reviewed polygon and line coordinates
// remain unchanged, and scoped detail chunks are reused in their existing files.
const oldBase='dist/data/south-america/',context=splitSouthAmericaContext(load('dist/data/flight-context.bin'));
const frontiers=load('dist/data/atlas-frontiers.bin'),fc=features=>({type:'FeatureCollection',features});
const write=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));};
for(const country of ['brazil','argentina','uruguay']){
 const base='dist/data/europe/'+country+'/',first=load(oldBase+country+'-first.bin'),local=load(oldBase+country+'-local/index.bin');
 const records=[...first.records,...local.records],chunks=Object.fromEntries(Object.entries(local.groups).map(([id,chunk])=>[id,{...chunk,level:2,file:'../../south-america/'+country+'-local/'+chunk.file}]));
 const catalogue={records,chunks,levels:2,rendering:{fillTolerance:.25},counts:{1:first.records.length,2:local.records.length}};
 if(country==='argentina'){
  const cities=load(oldBase+'argentina-cities/index.bin');
  const alias=cities.records.find(r=>r.cityRank===1);catalogue.selectionAliases=alias?{[alias.id]:'AR-02'}:{};
  for(const record of cities.records){
   if(record.cityRank===1)continue;
   record.statusNote=record.boundaryAvailable===false?'Municipal boundary pending. No locality or department outline is substituted.':'Municipal jurisdiction: '+record.boundaryName+'. Its territory can extend beyond the built-up city.';
   records.push(record);
  }
  // Keep CABA's city marker while selecting its existing autonomous-city page.
  if(alias)records.find(r=>r.id==='AR-02').point=alias.point;
  catalogue.thirdChunks=Object.fromEntries(Object.entries(cities.groups).map(([id,chunk])=>[id,{...chunk,level:3,file:'../../south-america/argentina-cities/'+chunk.file}]));
  catalogue.levels=3;catalogue.counts[3]=cities.records.length;
 }
 write(base+'catalogue.bin',catalogue);
 // The shared renderer reads the reviewed original first-level bundle directly.
 for(const file of ['first.bin','statistics.json'])fs.rmSync(base+file,{force:true});
 write(base+'context.bin',fc(context.features.filter(f=>f.properties.country===country).map(f=>({...f,properties:{...f.properties,...f.properties.contextHiddenFor?{claimedBy:f.properties.contextHiddenFor}:{} }}))));
 // Use the existing shared frontier paths, so the same reference is drawn in
 // country view and neighbouring views. No replacement border is computed.
 write(base+'international.bin',fc(frontiers.features.filter(f=>String(f.properties.countries).split(' ').includes(country))));

 const source={renderer:'regional-country.mjs',method:'Metadata adapter; original geometry retained without simplification or coordinate edits',original:'../../south-america/'+country+'-sources.json',inputs:[country+'-first.bin',country+'-local/index.bin',...(country==='argentina'?['argentina-cities/index.bin']:[])].map(file=>({file:'../../south-america/'+file,sha256:createHash('sha256').update(fs.readFileSync(oldBase+file)).digest('hex')}))};
 fs.writeFileSync(base+'sources.json',JSON.stringify(source,null,2)+'\n');
 if(country==='brazil'){
  const ddd=load(oldBase+'brazil-ddd.bin'),stateByAbbreviation=new Map(first.records.flatMap(r=>r.aliases.map(a=>[a,r.id])));
  const entries=ddd.records.map(r=>({...r,level:2,thematic:'ddd',parents:r.states.map(state=>stateByAbbreviation.get(state)).filter(Boolean),parent:stateByAbbreviation.get(r.states[0])}));
  write(base+'ddd/catalogue.bin',{records:entries,labels:entries,chunks:Object.fromEntries(first.records.map(r=>[r.id,{file:'../../south-america/brazil-ddd.bin',level:2,count:entries.length}]))});
  fs.copyFileSync(oldBase+'brazil-ddd-sources.json',base+'ddd/sources.json');
 }
 console.log(country+': '+first.records.length+' first-level units, '+local.records.length+' subdivisions; coordinates preserved.');
}

// Publish the same compact portal/frontier format as the other regional countries.
// The original bundles remain the independently checked build inputs.
const {compactSources}=await import('./build-compact.mjs');
const {emptyGeometryFiles}=await import('../dist/compact-files.mjs');
for(const country of ['brazil','argentina','uruguay'])for(const part of ['context','international']){
 const file='europe/'+country+'/'+part+'.bin',text=JSON.stringify(load('dist/data/'+file));
 const target='dist/data/compact/'+file;fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
}
const present=compactSources.filter(file=>fs.existsSync('dist/data/'+file));
fs.writeFileSync('dist/compact-files.mjs','// Generated compact sources and verified empty geometry.\nexport const compactFiles='+JSON.stringify(present)+';\nexport const emptyGeometryFiles='+JSON.stringify(emptyGeometryFiles.filter(file=>present.includes(file)))+';\n');

// Refresh neighbour previews after the three countries change adapter ownership.
await import('./build-border-previews.mjs');
