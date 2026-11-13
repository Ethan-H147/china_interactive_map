import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {fc,geographicBounds} from './build-regional-dataset.mjs';
import {policy,read,save,backup,fillRegions,near,clearWater} from './maine-border-fill.mjs';
const p=await policy(),changed=[];
for(const country of ['united-states','canada']){
 const base='dist/data/europe/'+country+'/',cat=await read(base+'catalogue.bin'),records=new Map(cat.records.map(r=>[r.id,r]));
 const files=new Set(['first.bin']);
 const catalogs=[{file:'catalogue.bin',data:cat}];
 for(const name of ['area-codes','zip-codes'])if(fs.existsSync(base+name+'/catalogue.bin'))catalogs.push({file:name+'/catalogue.bin',data:await read(base+name+'/catalogue.bin')});
 for(const {file,data}of catalogs)for(const [id,chunk]of Object.entries({...data.chunks,...data.thirdChunks})){const r=records.get(id),b=r?.bounds;if(b&&(b[0][0]>-67.08||b[1][0]<-68.12||b[0][1]>46.02||b[1][1]<45.23))continue;for(const field of ['file','censusFile'])if(chunk[field])files.add(chunk[field]);}
 for(const file of files){if(!fs.existsSync(base+file))continue;const data=await read(base+file);if(data.maineBorderFill)continue;if(!data.regions?.features?.some(f=>f.geometry&&near(f.geometry)))continue;
 const result=await fillRegions(data.regions,data.boundaries,p.countries[country],{overlap:file.startsWith('area-codes/')});
 if(!result.changed.length)continue;data.regions=result.regions;data.maineBorderFill=true;save(base+file,data);changed.push(base+file);console.log(country,file,result.changed.length,'regions filled');
 for(const f of data.regions.features)if(result.changed.includes(f.properties.id)){const b=geographicBounds(f.geometry);if(records.has(f.properties.id))records.get(f.properties.id).bounds=b;for(const c of catalogs)for(const r of c.data.labels||[])if((r.primary||r.id)===f.properties.id&&r.bounds)r.bounds=b;}
 }
 for(const {file,data}of catalogs){for(const chunk of [...Object.values(data.chunks||{}),...Object.values(data.thirdChunks||{})])for(const key of ['file','censusFile']){if(!chunk[key])continue;const target=base+chunk[key];if(changed.includes(target)){const b=fs.readFileSync(target);if(key==='file'){chunk.bytes=b.length;chunk.decodedBytes=gunzipSync(b).length;}else{chunk.censusBytes=b.length;chunk.censusDecodedBytes=gunzipSync(b).length;}}}save(base+file,data);}
 for(const file of ['context.bin']){const data=await read(base+file);data.features=data.features.filter(f=>!f.properties.maineBorderFill);data.features.push(...p.countries[country].features.map(f=>({...f,properties:{country,maineBorderFill:true}})));save(base+file,data);}
}
for(const file of ['world-land.bin','globe-overview-land.bin']){const data=await read('dist/data/'+file);data.features=data.features.filter(f=>!f.properties.borderLakeBackground&&!f.properties.maineBorderFill);for(const[country,mask]of Object.entries(p.countries))data.features.push(...mask.features.map(f=>({...f,properties:{country,maineBorderFill:true}})));save('dist/data/'+file,data);}
for(const file of ['canada-lakes.bin','major-lake-cutouts.bin','americas-inland-water.bin']){const d=await read('dist/data/'+file);if(d.features.some(f=>f.geometry&&near(f.geometry)))save('dist/data/'+file,await clearWater(d,p.mask));}
console.log('Modern selected fills updated:',changed.length,'geometry files; IDs and reported statistics retained.');

await import('./build-maine-border-ridings.mjs');
await import('./build-maine-border-historical.mjs');
await import('./finalize-maine-border-fill.mjs');
