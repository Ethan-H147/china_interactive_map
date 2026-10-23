import fs from 'node:fs';
import {load} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {save} from './central-europe-frontiers.mjs';
import {additions} from './balkans-config.mjs';
const file='dist/data/world-land.bin',world=load(file),foreign=fc(world.features.filter(f=>!f.properties.country));
for(const country of Object.keys(additions)){const context=load('dist/data/europe/'+country+'/context.bin'),preview=await command(context,'-simplify dp interval=.018 planar keep-shapes'),clipped=await command({'own.json':preview,'foreign.json':foreign},'-erase foreign.json -clean gap-fill-area=0');world.features=world.features.filter(f=>f.properties.country!==country);world.features.push(...clipped.features.map(f=>({...f,properties:{country}})));}
save(file,world);const meta=load('dist/data/world-land-sources.json');meta.bytes=fs.statSync(file).size;meta.topology.balkanFallbackRefresh='Country fallback land refreshed from the six final reconciled contexts, preserving all other atlas and foreign geometry.';fs.writeFileSync('dist/data/world-land-sources.json',JSON.stringify(meta,null,2)+'\n');console.log('Final Balkan country fallback geometry refreshed.');
