import {load,polygons} from './geo-index.mjs';
import {command,fc,sharedBorders} from './build-regional-dataset.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
import {replaceOutlineArc} from './replace-outline-arc.mjs';

// The frontier and both adjacent land surfaces must use the same survey.
// Updating the line alone leaves the older German shoreline visible beneath it.
export async function alignSwissGermanLand({save,cleanLines}){
 const base='dist/data/europe/germany/',cat=load(base+'catalogue.bin'),swiss=await command(load('scripts/boundary-sources/alpine-lakes/atlas-reference/swiss-first.bin').regions,'-dissolve');
 const old=load('scripts/boundary-sources/alpine-lakes/atlas-reference/german-international.bin').features.find(f=>f.properties.pair==='CHE-DEU');
 const canonical=selectFrontierArc(swiss,old.geometry.coordinates).path;
 const landArcs=cleanLines(fc([{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:canonical}}])).features.map(f=>f.geometry.coordinates);
 const enclave=swiss.features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.slice(1))).find(r=>r.every(([x,y])=>x>8.5&&x<8.9&&y>47.6&&y<47.8));
 if(!enclave)throw Error('Retained Büsingen survey ring missing');
 const changed=new Map();
 for(const level of [1,2,3]){
  const data=level===1?load(base+'first.bin').regions:level===2?load(base+'all.bin').levels.find(p=>p.level===2).regions:fc(Object.values(cat.chunks).filter(c=>c.level===3).flatMap(c=>load(base+c.file).regions.features));
  const ids=new Set(cat.records.filter(r=>r.id==='DE1'||r.level===2&&r.parent==='DE1'||r.level===3&&r.parent.startsWith('DE1')).map(r=>r.id));
  let selected=fc(data.features.filter(f=>ids.has(f.properties.id))),runs=0;
  for(const arc of landArcs){const outline=await command(selected,'-dissolve'),own=selectFrontierArc(outline,arc).path,aligned=await replaceOutlineArc(selected,own,arc,1500,{precision:.0000001,coastalTrimMetres:250,maxDeviationMetres:level===3?15:3});selected=aligned.regions;runs+=aligned.runs.length;}
  for(const f of selected.features){
   const parts=polygons(f.geometry).map(poly=>poly[0].every(([x,y])=>x>8.65&&x<8.73&&y>47.68&&y<47.72)?[enclave]:poly);
   const geometry={type:f.geometry.type,coordinates:f.geometry.type==='Polygon'?parts[0]:parts};
   const before=data.features.find(g=>g.properties.id===f.properties.id);
   if(JSON.stringify(before.geometry)!==JSON.stringify(geometry))changed.set(f.properties.id,{...before,geometry});
  }
  console.log('Swiss–German land alignment:',level,runs,'survey runs');
 }
 const replace=part=>{
  if(!part.regions.features.some(f=>changed.has(f.properties.id)))return part;
  const regions={...part.regions,features:part.regions.features.map(f=>changed.get(f.properties.id)||f)};
  return {...part,regions,boundaries:cleanLines(sharedBorders(regions)),selectionOutlines:cleanLines(fc(regions.features.flatMap(f=>polygons(f.geometry).flat().map(coordinates=>({type:'Feature',properties:f.properties,geometry:{type:'LineString',coordinates}})))))};
 };
 for(const file of ['first.bin','all.bin',...new Set(Object.values(cat.chunks).map(c=>c.file))]){const data=load(base+file),next=data.levels?{...data,levels:data.levels.map(replace)}:replace(data);if(next!==data)save(base+file,next);}
 // Context is visible beside the active country at close zooms too. Retain
 // the surveyed edge here instead of independently simplifying each bank.
 for(const country of ['switzerland','germany']){
  const root='dist/data/europe/'+country+'/',outline=await command(load(root+'first.bin').regions,'-dissolve',{precision:.0000001});
  save(root+'context.bin',fc(outline.features.map(f=>({...f,properties:{country}}))));
 }
 return {policy:'German administrative land and both country portals share the retained Swiss survey frontier, including Büsingen; lake water remains a separate exclusion.'};
}
