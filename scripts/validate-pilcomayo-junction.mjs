import assert from 'node:assert/strict';
import mapshaper from 'mapshaper';
import {argentinaBorderTopology} from './argentina-border-topology.mjs';
import {load,polygons,linesOf,metres} from './geo-index.mjs';
const junction=[-62.3425,-22.4565],old=[-62.342017,-23.624314];
const feature=(id,ring)=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates:[ring]}});
const salta=feature('AR-66',[[-63,-24.3925],[-62.3417,-24.3925],junction,[-62.35,-22.45],[-63,-22],[-63,-24.3925]]);
const formosa=feature('AR-34',[[-62.3419,-24.1079],[-62.3423,-22.4607],[-62.3409,-22.4623],[-61,-24],[-62.3419,-24.1079]]);
const source=[salta,formosa],before=JSON.stringify(source);
async function dissolve(features){const result=await mapshaper.applyCommands('-i input.json -clean -dissolve -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify({type:'FeatureCollection',features})});const d=JSON.parse(result['output.json']);return d.geometry||d.features?.[0].geometry||d.geometries[0];}
const fixed=argentinaBorderTopology(source);
assert.equal(JSON.stringify(source),before,'Source reconciliation does not mutate the retained IGN input');
assert.deepEqual(argentinaBorderTopology(fixed),fixed,'The topology repair is idempotent');
const exterior=polygons(await dissolve(fixed)).flat(2);
assert(!exterior.some(p=>p[0]>-62.345&&p[0]<-62.339&&p[1]<-22.47&&p[1]>-24),'Dissolving repaired provinces cannot create the inland notch');
const broken=polygons(await dissolve(source)).flat(2);
assert(broken.some(p=>p[0]>-62.345&&p[0]<-62.339&&p[1]<-23),'The fixture reproduces the near-parallel source gap');
const files=['south-america/argentina-first.bin','flight-context.bin','atlas-frontiers.bin','europe/paraguay/context.bin','europe/paraguay/first.bin','europe/paraguay/all.bin','europe/paraguay/second/PY-D-16.bin'];
for(const file of files){
 const text=JSON.stringify(load('dist/data/'+file));
 assert(!text.includes(JSON.stringify(old)),file+' has no stale inland junction');
 assert(text.includes(JSON.stringify(junction)),file+' uses the shared river junction');
}
const paths=linesOf({features:load('dist/data/atlas-frontiers.bin').features.filter(f=>f.properties.resolvedFrontier==='ARG-PRY')});
assert(paths.length,'Argentina/Paraguay has its canonical frontier');
for(const p of paths)for(let i=1;i<p.length;i++)if([p[i-1],p[i]].some(q=>q[0]>-62.6&&q[0]<-62.2))assert(metres(p[i-1],p[i])<10000,'The river frontier near Salta/Formosa has no artificial long jump');
assert(Math.min(...paths.flat().map(p=>metres(p,old)))>50000,'No frontier remains at the old inland spike');
console.log('Pilcomayo junction: source-gap reproduction, shared province edge, idempotence, seven retained datasets and continuous river frontier passed.');
