import fs from 'node:fs';import {createHash} from 'node:crypto';
import {policy,read,save,backup} from './maine-border-fill.mjs';
import {fillHistorical} from './maine-border-history-fill.mjs';
import {fc} from './build-regional-dataset.mjs';
import {useModernCoastOverview,useHistoricalCoastBorders,alignCanonicalLabels} from './uk-history-coasts.mjs';
import {writeUKCoastWater} from './build-uk-history-water.mjs';
const p=await policy();
const oldPhysical=fc((await Promise.all(['united-states','canada'].map(c=>read('artifacts/stability/maine-all-maps-backup/dist/data/europe/'+c+'/first.bin')))).flatMap(d=>d.regions.features));
const caFile='dist/data/europe/canada/history/borders.bin',ca=await read(caFile);
if(!ca.maineBorderFill){console.log('Filling Canadian historical lake geometry...');await fillHistorical(ca,ca.configs,p.countries.canada,oldPhysical,{reference:p.reference});ca.maineBorderFill=true;save(caFile,ca);}
const usFile='dist/data/europe/united-states/history/coastal-display.bin',us=await read(usFile),usOriginal=await read('dist/data/europe/united-states/history/borders.bin');
if(!us.maineBorderFill){console.log('Filling US historical lake geometry...');await fillHistorical(us,usOriginal.configs,p.countries['united-states'],oldPhysical,{reference:p.reference});us.maineBorderFill=true;us.audit.maineBorderFill='Retained St. Croix survey splits the solid display fill; adjacent dated owners and source IDs are preserved.';for(const file of Object.keys(us.inputs))if(fs.existsSync(file))us.inputs[file]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');save(usFile,us);const source='dist/data/europe/united-states/history/coastal-display-sources.json';backup(source);const meta=JSON.parse(fs.readFileSync(source));meta.inputs=us.inputs;meta.maineBorderFill=us.audit.maineBorderFill;fs.writeFileSync(source,JSON.stringify(meta,null,2)+'\n');}
const root='dist/data/europe/united-kingdom/history/',uk=await read(root+'borders.bin'),entry=uk.coasts.find(r=>r.id==='north-america'),coast=await read(root+entry.file);
if(!coast.maineBorderFill){console.log('Filling British historical lake geometry...');await fillHistorical(coast,uk.configs,p.mask,oldPhysical,{neutral:true,reference:p.reference});coast.maineBorderFill=true;save(root+entry.file,coast);
entry.sides=coast.arcs.features.flatMap(({properties:q},i)=>q.coast?[]:[[i,q.l,q.r]]);
const canonical={faces:coast.faces,arcs:coast.arcs,affected:coast.affected};await useModernCoastOverview(uk.faces.features,canonical,'north-america');useHistoricalCoastBorders(uk.arcs.features,uk.configs,canonical,'north-america');await alignCanonicalLabels(uk.faces.features,uk.configs);
const replaced=new Set(uk.coasts.flatMap(e=>e.faces));uk.arcs.features=uk.arcs.features.filter(({properties:q})=>!q.selectionOnly||q.l>=0&&!replaced.has(q.l)||q.r>=0&&!replaced.has(q.r));
backup(root+'coasts/overview-water.bin');uk.coastWater=await writeUKCoastWater(root,uk.coasts);uk.maineBorderFill=true;save(root+'borders.bin',uk);}
console.log('Historical fill updated: Canadian, US and British timelines retain their dated ownership.');
