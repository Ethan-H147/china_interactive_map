import fs from 'node:fs';
import {load} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {save} from './central-europe-frontiers.mjs';
export async function refreshCentralWorld(){
 if(!fs.existsSync('dist/data/europe/austria/context.bin'))return;
 const file='dist/data/world-land.bin',world=load(file),countries=['austria','germany','switzerland'],foreign=fc(world.features.filter(f=>!f.properties.country));
 for(const country of countries){const context=load('dist/data/europe/'+country+'/context.bin'),preview=await command(context,'-dissolve -simplify dp interval=.018 planar keep-shapes'),clipped=await command({'preview.json':preview,'foreign.json':foreign},'-erase foreign.json -clean gap-fill-area=0');world.features=world.features.filter(f=>f.properties.country!==country);world.features.push(...clipped.features.map(f=>({...f,properties:{country}})));}
 save(file,world);const meta=load('dist/data/world-land-sources.json');meta.bytes=fs.statSync(file).size;meta.topology.delegatedOutlineCodes.LIE='Landlocked Liechtenstein is fully surrounded by the Austrian and Swiss atlas frontiers. Its gray land remains; those shared atlas edges supply the complete outline.';meta.centralEuropeWater={source:'data/central-europe-frontiers.json',method:'Current reconciled Austrian, German and Swiss country outlines supply their fallback land; only the detailed Alpine lake geometry is used for Lac Léman and Lake Constance.'};fs.writeFileSync('dist/data/world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
 console.log('Central European world fallback refreshed from current shared land.');
}
if(process.argv[1]?.endsWith('refresh-central-world.mjs'))await refreshCentralWorld();
