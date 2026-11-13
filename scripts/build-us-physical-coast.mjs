import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {decodeData} from '../dist/geo-pack.mjs';
import {fc} from './us-geography.mjs';
import {countryContext} from './country-context.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {exact,southeastBounds,southeastSource,southeastWater,boundsOf,intersects} from './shared-physical-coast.mjs';
const root='dist/data/europe/united-states/';
const read=async file=>decodeData(fs.readFileSync(file));
function save(file,data){
 const backup=process.env.ATLAS_COAST_BACKUP;
 if(backup&&fs.existsSync(file)){const target=path.join(backup,file);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target))fs.copyFileSync(file,target);}
 const text=JSON.stringify(data),bytes=file.endsWith('.bin')?gzipSync(text,{level:9}):Buffer.from(text+'\n');fs.writeFileSync(file,bytes);return{bytes:bytes.length,decodedBytes:Buffer.byteLength(text)};
}
export async function buildUSPhysicalCoast(){
 const water=await southeastWater(),catalogue=await read(root+'catalogue.bin'),records=new Map(catalogue.records.map(r=>[r.id,r]));
 async function clipRegions(regions){
  const local=regions.features.filter(f=>intersects(boundsOf(f.geometry),southeastBounds));if(!local.length)return{regions,changed:[]};const localSet=new Set(local);
  const clipped=await exact({'regions.json':fc(local),'water.json':water},'-erase water.json');
  const byId=new Map(clipped.features.map(f=>[f.properties.id,f])),changed=[];
  const features=regions.features.map(original=>{
   if(!localSet.has(original))return original;
   const next=byId.get(original.properties.id)||{...original,geometry:{type:'MultiPolygon',coordinates:[]}};
   const originalArea=area(original.geometry),removed=originalArea-area(next.geometry);
   // Summing millions of spherical segments introduces tiny cancellation
   // errors. Do not rewrite an already-clipped state on those differences.
   if(removed<Math.max(.0000001,originalArea*1e-8))return original;
   changed.push(original.properties.id);return next;
  });return{regions:{...regions,features},changed};
 }
 async function patchFile(file,unitRecords=records){
  if(!fs.existsSync(file)||fs.statSync(file).size<10)return null;
  const data=await read(file);if(!data.regions?.features)return null;
  const result=await clipRegions(data.regions);if(!result.changed.length)return null;
  data.regions=result.regions;
  // Clip the existing administrative strokes as lines. Rebuilding them from
  // overlapping telephone areas would invent coastline/internal strokes.
  if(data.boundaries?.features.length){const previous=data.boundaries;data.boundaries={...previous,...await exact({'boundaries.json':previous,'water.json':water},'-erase water.json')};if('openSegments'in previous)data.boundaries.openSegments=data.boundaries.features.filter(f=>f.properties.owners.length===1).reduce((n,f)=>n+(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates).reduce((m,p)=>m+p.length-1,0),0);}
  const sizes=save(file,data);
  const changed=new Set(result.changed),land=fc(result.regions.features.filter(f=>changed.has(f.properties.id)&&f.geometry.coordinates.length));
  if(land.features.length){const centers=await exact(land,'-points inner');for(const f of centers.features){const r=unitRecords.get(f.properties.id);if(r)r.center=f.geometry.coordinates;}
   for(const f of land.features){const r=unitRecords.get(f.properties.id);if(r){const[w,s,e,n]=boundsOf(f.geometry);r.bounds=[[w,s],[e,n]];}}}
  console.log('Shared physical shore:',file,result.changed.length,'units');return{...sizes,changed:result.changed};
 }
 const overlays=new Map();for(const folder of ['area-codes','zip-codes']){const catalogue=await read(root+folder+'/catalogue.bin');overlays.set(folder,{catalogue,records:new Map(catalogue.records.map(r=>[r.id,r]))});}
 const first=await patchFile(root+'first.bin');
 const coastal=new Set(first?.changed||catalogue.records.filter(r=>r.level===1&&intersects(r.bounds.flat(),southeastBounds)).map(r=>r.id));
 for(const state of coastal){
  if(catalogue.chunks[state]){const result=await patchFile(root+catalogue.chunks[state].file);if(result)Object.assign(catalogue.chunks[state],{bytes:result.bytes,decodedBytes:result.decodedBytes});}
  const third=catalogue.thirdChunks?.[state];
  if(third){const normal=await patchFile(root+third.file),census=third.censusFile&&await patchFile(root+third.censusFile);if(normal)Object.assign(third,{bytes:normal.bytes,decodedBytes:normal.decodedBytes});if(census)Object.assign(third,{censusBytes:census.bytes,censusDecodedBytes:census.decodedBytes});}
  for(const [folder,overlay]of overlays){const result=await patchFile(root+folder+'/'+state+'.bin',overlay.records);if(result)Object.assign(overlay.catalogue.chunks[state],{bytes:result.bytes,decodedBytes:result.decodedBytes});}
 }
 for(const [folder,{catalogue,records}]of overlays){for(const label of catalogue.labels||[]){const r=records.get(label.primary||label.id);if(r){label.center=r.center;if(label.bounds)label.bounds=r.bounds;}}save(root+folder+'/catalogue.bin',catalogue);}
 if(first){const current=await read(root+'first.bin');save(root+'context.bin',await countryContext('united-states',current.regions,records,exact));}
 // The gray fallback is a display LOD of the same context, not another land mask.
 const context=await read(root+'context.bin'),worldFile='dist/data/world-land.bin',world=await read(worldFile);
 const preview=await exact(context,'-simplify dp interval=.018 planar keep-shapes');
 world.features=world.features.filter(f=>f.properties.country!=='united-states');
 world.features.push(...preview.features.map(f=>({...f,properties:{country:'united-states'}})));
 save(worldFile,world);
 const source=JSON.parse(fs.readFileSync(southeastSource+'southeast.json'));
 const worldSources=await read('dist/data/world-land-sources.json');worldSources.bytes=fs.statSync(worldFile).size;worldSources.physicalCoast={country:'united-states',source:southeastSource+'southeast.json',sha256:source.sha256};save('dist/data/world-land-sources.json',worldSources);
 catalogue.physicalCoast={source:southeastSource+'southeast.json',bounds:southeastBounds,sha256:source.sha256};save(root+'catalogue.bin',catalogue);
 const sources=await read(root+'sources.json');sources.physicalCoast={...source,processing:'One current physical coastline clips every modern administrative level. Historical ownership is partitioned within the same land. Coastline simplification tolerance is approximately 33 m, matching the existing regional atlas detail budget.'};
 sources.sources=sources.sources.filter(s=>s.file!=='physical-coast/southeast.json');
 sources.sources.push({file:'physical-coast/southeast.json',url:source.endpoint,provider:'OpenStreetMap contributors, shared southeastern US physical coastline',license:'ODbL 1.0 · © OpenStreetMap contributors',licenseUrl:source.licenseUrl,sha256:source.sha256});save(root+'sources.json',sources);
 console.log('Canonical US physical coast applied; subdivision IDs and reported statistics retained.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await buildUSPhysicalCoast();
