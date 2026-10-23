import fs from 'node:fs';
import {load,linesOf,lineIndex} from './geo-index.mjs';
import {fc} from './build-regional-dataset.mjs';
import {save} from './central-europe-frontiers.mjs';
// The generalized world source leaves narrow residual shoreline loops beside
// the new detailed borders. The dedicated land frontier already draws there.
const canonical=load('scripts/boundary-sources/balkans/resolved.bin'),near=lineIndex(linesOf(fc(canonical.features.filter(f=>!f.properties.existingOwner)))),file='dist/data/world-country-outlines.bin',world=load(file);
const features=world.features.flatMap(f=>{if(f.properties.kind!=='coast')return[f];const kept=[];for(const path of linesOf(fc([f]))){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if([a,mid,b].every(p=>near(p)<200)){run=null;continue;}if(!run){run=[a];kept.push({...f,geometry:{type:'LineString',coordinates:run}});}run.push(b);}}return kept;});
save(file,fc(features));const meta=load('dist/data/world-land-sources.json');meta.outlineBytes=fs.statSync(file).size;meta.topology.outlineGroups=features.length;meta.topology.balkans='Detailed Balkan land frontiers supersede residual generalized shoreline segments within 200 metres. Existing atlas borders are retained; Croatia–Montenegro stops at the verified shared-way coastal endpoint.';fs.writeFileSync('dist/data/world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
console.log('Removed overlapping generalized shoreline segments beside the new borders.');
