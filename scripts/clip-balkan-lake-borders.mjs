import {load} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {centralWater,waterFreeLines,save} from './central-europe-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {additions} from './balkans-config.mjs';
import {removeArcSegments,segmentKey} from './frontier-arcs.mjs';
export async function clipBalkanLakeBorders(){
 const canonical=load('scripts/boundary-sources/balkans/resolved.bin'),clipped=await command({'lines.json':waterFreeLines(canonical),'water.json':centralWater()},'-erase water.json');save('scripts/boundary-sources/balkans/land-frontiers.bin',clipped);
 const owners=new Set(canonical.features.map(f=>f.properties.countries)),pairs=new Set(canonical.features.map(f=>f.properties.pair));
 for(const owner of owners){const file='dist/data/europe/'+owner+'/international.bin',data=load(file),own=clipped.features.filter(f=>f.properties.countries===owner);if(additions[owner])save(file,lineData(fc(own)));else{const keys=new Set(canonical.features.filter(f=>f.properties.countries===owner).flatMap(f=>f.geometry.coordinates.slice(1).map((p,i)=>segmentKey(f.geometry.coordinates[i],p)))),retained=removeArcSegments(fc(data.features.filter(f=>!pairs.has(f.properties.pair))),keys).features;save(file,lineData(fc([...retained,...own])));}}
 console.log('Balkan border strokes stop at lake shore intersections.');
}
if(process.argv[1]?.endsWith('clip-balkan-lake-borders.mjs'))await clipBalkanLakeBorders();
