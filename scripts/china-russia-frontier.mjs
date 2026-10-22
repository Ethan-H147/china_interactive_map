import {countyBoundaries} from './china-county-boundaries.mjs';
import fs from 'node:fs';import {load,linesOf,lineIndex} from './geo-index.mjs';import {readData} from './read-data.mjs';import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';import {selectFrontierArc,joinReferencePaths} from './frontier-arcs.mjs';import {alignArc,koreanFrontiers,save,preserveKoreanFrontiers} from './korean-frontiers.mjs';import {topology} from 'topojson-server';import {mesh} from 'topojson-client';import {khankaWater} from './khanka-water.mjs';import {saveDisplay} from './korean-river-islands.mjs';import {lineData} from '../dist/adaptive-lines.mjs';
export const chinaRussiaRoot='scripts/boundary-sources/china-russia/';
export function chinaRussiaLines(){return load(chinaRussiaRoot+'resolved.bin');}
export async function alignChinaRussiaContext(data){for(const f of chinaRussiaLines().features)data=(await alignArc(data,f.geometry.coordinates,{maxDeviationMetres:5,maxSelectionMetres:60000,maxDistance:60000})).regions;return data;}
export async function repairChinaRussiaMotion(output){if(!fs.existsSync(chinaRussiaRoot+'resolved.bin'))return;for(const key of ['provinces','prefectures'])output[key]=await alignChinaRussiaContext(output[key]);}
export function removeOldChinaRussiaFrontiers(){const file='dist/data/atlas-frontiers.bin',d=load(file);d.features=d.features.filter(f=>!['china','russia'].every(c=>(f.properties.countries||'').split(' ').includes(c)));save(file,d);}
const simplePath=path=>{const out=[],seen=new Map();for(const p of path){const key=p.join(',');if(seen.has(key)){const i=seen.get(key);for(const q of out.splice(i+1))seen.delete(q.join(','));}else{seen.set(key,out.length);out.push(p);}}return out;};
export async function reconcileChinaRussia(){
 fs.mkdirSync(chinaRussiaRoot,{recursive:true});
 const china=readData('display-boundaries.json'),political=fc(china.provinces.features.map(f=>f.properties.adcode===230000?load('scripts/boundary-sources/khanka/china-political-reference.bin').features[0]:f)),outline=await command(political,'-dissolve2 -clean gap-fill-area=0'),refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),guides=joinReferencePaths(linesOf(fc(refs.features.filter(f=>['CHN','RUS'].every(c=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(c)))))),features=[];
 for(const reference of guides){const west=reference.every(p=>p[0]<100);if(!west)reference[reference.length-1]=koreanFrontiers().junction;features.push({type:'Feature',properties:{neighbor:'china',pair:west?'CHN-RUS-WEST':'CHN-RUS-EAST',resolvedChinaRussia:true},geometry:{type:'LineString',coordinates:simplePath(selectFrontierArc(outline,reference).path)}});}
 save(chinaRussiaRoot+'resolved.bin',fc(features));
 // Drop zero-width loops from both fills, then share the same continuous exterior.
 if(!process.argv.includes('--russia-only')){
 for(const key of ['provinces','subdivisions'])china[key]=await alignChinaRussiaContext(china[key]);
 const near=lineIndex(linesOf(fc(features))),top=topology({regions:china.provinces}),inside=mesh(top,top.objects.regions,(a,b)=>a!==b),crop=(g,takeNear)=>{const paths=[];for(const p of linesOf(fc([{geometry:g}]))){let run;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if((near(m)<10000)!==takeNear){run=null;continue;}if(!run)paths.push(run=[a]);run.push(b);}}return paths;};
 china.boundaries.province={type:'MultiLineString',coordinates:[...crop(china.boundaries.province,false),...crop(inside,true)]};saveDisplay(china);
 const counties=load('dist/data/china-counties.bin');counties.regions=await alignChinaRussiaContext(counties.regions);counties.boundaries=countyBoundaries(counties.regions);save('dist/data/china-counties.bin',counties);
 }
 const base='dist/data/russia/',first=load(base+'first.bin'),cat=load(base+'catalogue.bin');for(const file of ['first.bin','catalogue.bin','context.bin','international.bin'])if(!fs.existsSync(chinaRussiaRoot+file))fs.copyFileSync(base+file,chinaRussiaRoot+file);
 for(const line of features){
  const ids=new Set(line.properties.pair.endsWith('WEST')?['RU-AL']:['RU-ZAB','RU-AMU','RU-YEV','RU-KHA','RU-PRI']);
  // Source region IDs use ISO 3166-2; Altai Republic is RU-AL.
  const selected=fc(first.regions.features.filter(f=>ids.has(f.properties.id)));if(!selected.features.length)throw Error('Missing Russian border regions');
  const changed=new Map(),fixed=await alignArc(selected,line.geometry.coordinates,{maxDeviationMetres:5,maxSelectionMetres:60000,maxDistance:60000});for(const f of fixed.regions.features)changed.set(f.properties.id,f);first.regions=fc(first.regions.features.map(f=>changed.get(f.properties.id)||f));save(base+'first.bin',first);console.log(line.properties.pair,'first level',fixed.runs.length,'runs',line.geometry.coordinates.length,'vertices');
  const entries=Object.entries(cat.chunks).filter(([parent])=>ids.has(parent));let second=fc(entries.flatMap(([,ch])=>load(base+ch.file).regions.features));
  if(ids.has('RU-PRI')){
   // Temporarily close the lake's country-level void before replacing the land
   // frontier. District shoreline endpoints remain internal and never move.
   const owner=load(base+cat.chunks['RU-PRI'].file).regions.features[0],water=await command({'water.json':khankaWater(),'china.json':load('scripts/boundary-sources/khanka/china-political-reference.bin')},'-erase china.json'),props=new Map(second.features.map(f=>[f.properties.id,f.properties]));
   second=await command(fc([...second.features,...water.features.map(f=>({...f,properties:owner.properties}))]),'-dissolve2 id -clean gap-fill-area=0');for(const f of second.features)f.properties=props.get(f.properties.id);
  }
  const result=await alignArc(second,line.geometry.coordinates,{maxDeviationMetres:5,maxSelectionMetres:60000,maxDistance:60000});
  if(ids.has('RU-PRI'))result.regions=await command({'land.json':result.regions,'water.json':khankaWater()},'-erase water.json -clean gap-fill-area=0');
  for(const f of result.regions.features)changed.set(f.properties.id,f);
  for(const [parent,ch]of entries){const file=base+ch.file,old=load(file);if(!fs.existsSync(chinaRussiaRoot+ch.file)){fs.mkdirSync((chinaRussiaRoot+ch.file).slice(0,(chinaRussiaRoot+ch.file).lastIndexOf('/')),{recursive:true});fs.copyFileSync(file,chinaRussiaRoot+ch.file);}old.regions=fc(old.regions.features.map(f=>changed.get(f.properties.id)||f));if(parent!=='RU-PRI')old.boundaries=sharedBorders(old.regions);save(file,old);ch.bytes=fs.statSync(file).size;ch.decodedBytes=Buffer.byteLength(JSON.stringify(old));}
  for(const r of cat.records){const f=changed.get(r.id);if(f)r.bounds=geographicBounds(f.geometry);}
  console.log(line.properties.pair,'districts',result.runs.length,'runs');
 }
 save(base+'catalogue.bin',cat);save(base+'context.bin',await command(first.regions,'-dissolve'));
 const international=load(base+'international.bin');international.features=international.features.filter(f=>f.properties.neighbor!=='china'&&!f.properties.resolvedChinaRussia);save(base+'international.bin',lineData(fc([...international.features,...features])));removeOldChinaRussiaFrontiers();preserveKoreanFrontiers();
 const meta={source:'Existing detailed Chinese administrative exterior; retained unmasked political boundary through Lake Khanka',guide:'Natural Earth country adjacency selects the two complete border arcs only; it supplies no displayed vertices.',method:'Russian first-level regions, border districts and country overview inherit every bend of the same Chinese exterior. The eastern arc terminates at the shared Tumen junction. River islands on the China–Korea reach are suppressed by explicit display policy. Internal Primorsky district strokes and the full permanent Lake Khanka shoreline are preserved.'};fs.writeFileSync(chinaRussiaRoot+'sources.json',JSON.stringify(meta,null,2)+'\n');fs.writeFileSync('dist/data/china-russia-frontier-sources.json',JSON.stringify(meta,null,2)+'\n');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/china-russia-frontier.mjs'))await reconcileChinaRussia();
