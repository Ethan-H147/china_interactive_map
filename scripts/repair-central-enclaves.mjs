import fs from 'node:fs';
import {load,polygons} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {save,waterFreeLines} from './central-europe-frontiers.mjs';

// A coarse state outline can shortcut Jungholz's point contact even after its
// survey arc is aligned. Derive the state from its reconciled districts so the
// enclave has the same edge at every level of the hierarchy.
export async function repairCentralEnclaves(){
 const base='dist/data/europe/germany/',cat=load(base+'catalogue.bin'),first=load(base+'first.bin'),districts=load(base+cat.chunks.DE2.file).regions;
 const state=(await command(districts,'-dissolve')).features[0],old=first.regions.features.find(f=>f.properties.id==='DE2');
 state.properties=old.properties;
 if(JSON.stringify(state.geometry)===JSON.stringify(old.geometry)&&first.selectionOutlines)return;
 const update=part=>{if(!part.regions)return;part.regions=fc(part.regions.features.map(f=>f.properties.id==='DE2'?state:f));part.boundaries=sharedBorders(part.regions);part.selectionOutlines=waterFreeLines(fc(part.regions.features.flatMap(f=>polygons(f.geometry).flat().map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates}})))));};
 update(first);save(base+'first.bin',first);
 for(const name of ['all.bin','political.bin'])if(fs.existsSync(base+name)){const data=load(base+name);if(data.levels){for(const part of data.levels)if(part.regions?.features.some(f=>f.properties.id==='DE2'))update(part);}else if(data.features)data.features=data.features.map(f=>f.properties.id==='DE2'?state:f);save(base+name,data);}
 const r=cat.records.find(r=>r.id==='DE2');r.bounds=geographicBounds(state.geometry);save(base+'catalogue.bin',cat);
 const context=load(base+'context.bin'),home=await command(first.regions,'-dissolve');save(base+'context.bin',fc([...home.features.map(f=>({...f,properties:{country:'germany'}})),...context.features.filter(f=>f.properties.region)]));
 console.log('Bavaria retains the complete district survey edge around Jungholz.');
}
if(process.argv[1]?.endsWith('repair-central-enclaves.mjs'))await repairCentralEnclaves();
