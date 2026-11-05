import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load,polygons,landIndex} from './geo-index.mjs';
import {fc,command} from './build-regional-dataset.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {countryContext} from './country-context.mjs';

// Keep the legal border through water; replace its generalized land reaches
// with complete arcs from the same county-derived exterior used by the US fill.
export async function repairUSCanada(){
 const base='dist/data/europe/united-states/',changed=[];
 const save=(file,data)=>{const text=JSON.stringify(data);if(fs.existsSync(file)&&gunzipSync(fs.readFileSync(file)).toString()===text)return;fs.writeFileSync(file,gzipSync(text,{level:9}));changed.push(file);const compact=file.replace('dist/data/','dist/data/compact/');if(fs.existsSync(compact))fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));};
 const source=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
 const water=fc(source.features.filter(f=>['Lake of the Woods','Rainy Lake'].includes(f.properties.name)));
 if(water.features.length!==2)throw Error('Both Minnesota border lakes must be retained');
 // Erase lake water from fills at every lazy US hierarchy level. Border meshes
 // remain legal jurisdiction lines and are deliberately not rebuilt from shores.
 const cat=load(base+'catalogue.bin'),files=['first.bin',...new Set([...Object.values(cat.chunks),...Object.values(cat.thirdChunks||{})].map(c=>c.file).filter(Boolean))];
 const nearLake=g=>polygons(g).flat(2).some(p=>p[0]>-96&&p[0]<-91.5&&p[1]>48&&p[1]<49.5);
 for(const file of files){const data=load(base+file);if(!data.regions?.features.some(f=>nearLake(f.geometry))||data.usCanadaLakeMask)continue;
  const candidates=data.regions.features.filter(f=>nearLake(f.geometry)),masked=await command({'land.json':fc(candidates),'water.json':water},'-erase water.json',{precision:.0000001}),byId=new Map(masked.features.map(f=>[f.properties.id,f]));
  data.regions=fc(data.regions.features.map(f=>byId.get(f.properties.id)||f));data.usCanadaLakeMask=1;save(base+file,data);
 }
 for(const chunk of [...Object.values(cat.chunks),...Object.values(cat.thirdChunks||{})])if(changed.includes(base+chunk.file)){chunk.bytes=fs.statSync(base+chunk.file).size;chunk.decodedBytes=gunzipSync(fs.readFileSync(base+chunk.file)).length;}
 const recordMap=new Map(cat.records.map(r=>[r.id,r]));
 for(const file of files){const data=load(base+file);if(!data.usCanadaLakeMask)continue;const misplaced=data.regions.features.filter(f=>{const r=recordMap.get(f.properties.id);return r&&!landIndex(polygons(f.geometry).flat())(r.center);});if(misplaced.length){const points=await command(fc(misplaced),'-points inner',{precision:.0000001});for(const p of points.features)recordMap.get(p.properties.id).center=p.geometry.coordinates;}}
 save(base+'catalogue.bin',cat);
 const first=load(base+'first.bin');save(base+'context.bin',await countryContext('united-states',first.regions,new Map(cat.records.map(r=>[r.id,r])),command));
 const worldFile='dist/data/world-land.bin',world=load(worldFile),us=fc(world.features.filter(f=>f.properties.country==='united-states'));
 const masked=await command({'land.json':us,'water.json':water},'-erase water.json',{precision:.0000001});save(worldFile,{...world,features:[...world.features.filter(f=>f.properties.country!=='united-states'),...masked.features]});
 save('dist/data/us-canada-border-lakes.bin',water);
 await (await import('./us-canada-survey.mjs')).prepareSurveyedUSBorder();
 await (await import('./us-canada-frontier.mjs')).buildSharedUSCanada();
 return changed;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/reconcile-us-canada.mjs'))await repairUSCanada();
