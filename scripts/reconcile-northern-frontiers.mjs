import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {load,polygons,linesOf,lineIndex,metres,landIndex} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc,removeArcSegments,segmentKey} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

const input=process.env.ATLAS_REPAIR_INPUT||process.cwd(),output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||input;
const read=file=>load(path.join(input,file)),changedFiles=[];
function save(file,value){
 const original=read(file);
 if(JSON.stringify(value)===JSON.stringify(original))return;
 const text=JSON.stringify(value,null,file.endsWith('sources.json')?2:undefined);
 const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,file.endsWith('.bin')?gzipSync(text,{level:9}):text+'\n');changedFiles.push(file);
}
const refs=read('scripts/boundary-sources/nordics/ne-borders.json.gz');
const guides=pair=>joinReferencePaths(linesOf(fc(refs.features.filter(f=>pair.every(c=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(c))))));
const reports=[];
// Only subdivide long straight frontier segments, so an inland reference end can
// land on the segment instead of snapping to a distant coastal vertex.
function densify(regions,guide){
 const near=lineIndex([guide]);
 return fc(regions.features.map(f=>({...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).map(poly=>poly.map(ring=>ring.flatMap((a,i)=>{
  if(i===ring.length-1)return[a];const b=ring[i+1],middle=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const n=Math.min(1000,Math.max(1,Math.min(near(a),near(b),near(middle))<5000?Math.ceil(metres(a,b)/3000):1));
  return Array.from({length:n},(_,k)=>[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);
 })))}})));
}
async function updateMetadata(base,cat,replacements){
 const stats=read(base+'statistics.json');
 for(const [id,feature]of replacements){
  const record=cat.records.find(r=>r.id===id);assert(record,'Known repaired unit '+id);record.bounds=geographicBounds(feature.geometry);
  if(!landIndex(polygons(feature.geometry).flat())(record.center))record.center=(await command(fc([feature]),'-points inner')).features[0].geometry.coordinates;
  const stat=stats.regions[base.includes('kazakhstan')?'kazakhstan:'+id:'canada:'+id];
  if(stat.area?.method==='mapped'){record.areaKm2=geographicAreaKm2(feature.geometry);stat.area.value=record.areaKm2;}
 }
 save(base+'catalogue.bin',cat);save(base+'statistics.json',stats);
}
// Kazakhstan already declares Russia's displayed edge as its alignment owner.
// Replace the whole arc rather than accepting only nearby fragments of it.
{
 const base='dist/data/europe/kazakhstan/',first=read(base+'first.bin'),russia=await command(read('dist/data/russia/first.bin').regions,'-dissolve2'),guide=guides(['RUS','KAZ'])[0],canonical=selectFrontierArc(russia,guide).path;
 const result=await alignArc(first.regions,canonical,{maxDistance:10000,maxSelectionMetres:30000,coastalTrimMetres:12000,maxDeviationMetres:3});
 const touched=new Set(result.runs.map(r=>r.id)),replacement=new Map(result.regions.features.filter(f=>touched.has(f.properties.id)).map(f=>[f.properties.id,f]));
 const regions=fc(first.regions.features.map(f=>replacement.get(f.properties.id)||f));
 save(base+'first.bin',{...first,regions,boundaries:sharedBorders(regions)});
 save(base+'context.bin',fc((await command(regions,'-dissolve2')).features.map(f=>({...f,properties:{country:'kazakhstan'}}))));
 await updateMetadata(base,read(base+'catalogue.bin'),replacement);
 // The fragmented Russia-owned runs belong to this single continuous edge.
 const file='dist/data/atlas-frontiers.bin',atlas=read(file),near=lineIndex([canonical]),kept=[];
 for(const f of atlas.features){let run;for(const p of linesOf(fc([f])))for(let i=1;i<p.length;i++){
  const a=p[i-1],b=p[i],isRussian=String(f.properties.countries).split(' ').includes('russia');
  if(isRussian&&[0,.5,1].every(t=>near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<3)){run=null;continue;}
  if(!run){run={...f,geometry:{type:'LineString',coordinates:[a]}};kept.push(run);}run.geometry.coordinates.push(b);
  if(i===p.length-1)run=null;
 }}
 const border={type:'Feature',properties:{countries:'russia kazakhstan',resolvedFrontier:'RUS-KAZ',referenceOwner:'russia'},geometry:{type:'LineString',coordinates:canonical}};
 save(file,lineData(fc([...kept,border])));
 reports.push({pair:'RUS-KAZ',owner:'russia',target:'kazakhstan',canonical,affected:[...touched],maxEndpointDisplacementMetres:result.maxEndpointDisplacementMetres});
}
// Canada's three levels share one municipal topology. Repair the leaves first,
// then dissolve their parents so changing selection level cannot reopen a seam.
{
 const base='dist/data/europe/canada/',cat=read(base+'catalogue.bin'),first=read(base+'first.bin'),records=new Map(cat.records.map(r=>[r.id,r])),provinces=new Set(['CA-YT','CA-BC']);
 const leafChunks=Object.entries(cat.chunks).filter(([parent,c])=>c.level===3&&provinces.has(records.get(parent).parent));
 const parts=new Map(leafChunks.map(([,c])=>[c.file,read(base+c.file)])),leaves=fc([...parts.values()].flatMap(d=>d.regions.features));
 const alaska=fc(read('dist/data/europe/united-states/first.bin').regions.features.filter(f=>f.properties.id==='US-AK'));
 // South of this reach, Portland Canal and coastal inlets are actual water.
 const guide=guides(['USA','CAN']).find(p=>p.every(q=>q[0]<-125)).filter(p=>p[1]>55.92);
 const canonical=selectFrontierArc(await command(densify(alaska,guide),'-dissolve2'),guide).path;
 const result=await alignArc(densify(leaves,canonical),canonical,{maxDistance:3000,maxSelectionMetres:10000,coastalTrimMetres:1000,maxDeviationMetres:3});
 const touched=new Set(result.runs.map(r=>r.id)),replacement=new Map(result.regions.features.filter(f=>touched.has(f.properties.id)).map(f=>[f.properties.id,f]));
 const corrected=fc(leaves.features.map(f=>replacement.get(f.properties.id)||f));
 for(const [file,part]of parts){if(!part.regions.features.some(f=>replacement.has(f.properties.id)))continue;part.regions=fc(part.regions.features.map(f=>replacement.get(f.properties.id)||f));part.boundaries=sharedBorders(part.regions);save(base+file,part);}
 const parentIds=new Set([...replacement.keys()].map(id=>records.get(id).parent));
 const parents=await command(fc(corrected.features.filter(f=>parentIds.has(records.get(f.properties.id).parent)).map(f=>({...f,properties:{id:records.get(f.properties.id).parent}}))),'-dissolve2 id');
 for(const f of parents.features)replacement.set(f.properties.id,f);
 const provinceShapes=[];
 for(const province of provinces){
  const file=cat.chunks[province].file,part=read(base+file);part.regions=fc(part.regions.features.map(f=>replacement.get(f.properties.id)||f));part.boundaries=sharedBorders(part.regions);save(base+file,part);
  const dissolved=await command(fc(part.regions.features.map(f=>({...f,properties:{id:province}}))),'-dissolve2 id');provinceShapes.push(...dissolved.features);
 }
 for(const f of provinceShapes)replacement.set(f.properties.id,f);
 const regions=fc(first.regions.features.map(f=>replacement.get(f.properties.id)||f));save(base+'first.bin',{...first,regions,boundaries:sharedBorders(regions)});
 save(base+'context.bin',fc((await command(regions,'-dissolve2')).features.map(f=>({...f,properties:{country:'canada'}}))));
 for(const chunk of Object.values(cat.chunks)){const target=path.join(output,base+chunk.file);if(!changedFiles.includes(base+chunk.file))continue;chunk.bytes=fs.statSync(target).size;chunk.decodedBytes=Buffer.byteLength(JSON.stringify(load(target)));}
 await updateMetadata(base,cat,replacement);
 // Keep the Alaska stroke on the same repaired land edge, retaining its existing
 // maritime continuation through Portland Canal without filling that water.
 const lineFile='dist/data/europe/united-states/international.bin',lines=read(lineFile),joined=joinReferencePaths(linesOf(fc(lines.features.filter(f=>f.properties.pair==='CAN-USA'))));
 let old=joined.find(p=>p.every(q=>q[0]<-125));assert(old,'Existing Alaska border');
 if(metres(old[0],canonical[0])>metres(old.at(-1),canonical[0]))old=old.slice().reverse();
 let end=0;for(let i=1;i<old.length;i++)if(metres(old[i],canonical.at(-1))<metres(old[end],canonical.at(-1)))end=i;
 const keys=new Set(old.slice(1).map((b,i)=>segmentKey(old[i],b))),others=removeArcSegments(lines,keys);
 save(lineFile,lineData(fc([...others.features,{type:'Feature',properties:{countries:['united-states'],pair:'CAN-USA',resolvedFrontier:'USA-CAN-ALASKA'},geometry:{type:'LineString',coordinates:[...canonical,...old.slice(end+1)]}}])));
 reports.push({pair:'USA-CAN-ALASKA',owner:'united-states',target:'canada',canonical,affected:[...replacement.keys()],maxEndpointDisplacementMetres:result.maxEndpointDisplacementMetres});
}
const report={method:'Complete shared display arcs replace mismatched exterior runs; Canadian municipal leaves and dissolved parents inherit the same edge. Existing coastline and water outside the explicitly inland Alaska reach stay intact.',frontiers:reports};
// The small fallback silhouettes must share the repaired edges too. Keep every
// unrelated country's geometry and the existing simplified coastlines intact.
const world=read('dist/data/world-land.bin');
for(const r of reports){
 const own=fc(world.features.filter(f=>f.properties.country===r.target));
 const result=await alignArc(densify(own,r.canonical),r.canonical,{maxDistance:r.target==='kazakhstan'?12000:4000,maxSelectionMetres:30000,coastalTrimMetres:r.target==='kazakhstan'?12000:1200,maxDeviationMetres:3});
 let position=0;world.features=world.features.flatMap(f=>f.properties.country===r.target?(position++===0?result.regions.features:[]):[f]);
 const file='dist/data/europe/'+r.target+'/sources.json',sources=read(file);
 sources.northernFrontierReconciliation={pair:r.pair,referenceOwner:r.owner,source:'data/northern-frontiers.json',method:report.method,affected:r.affected};save(file,sources);
}
save('dist/data/world-land.bin',world);
const worldSources=read('dist/data/world-land-sources.json');worldSources.northernFrontierReconciliation={source:'data/northern-frontiers.json',pairs:reports.map(r=>r.pair)};worldSources.bytes=fs.statSync(path.join(output,'dist/data/world-land.bin')).size;save('dist/data/world-land-sources.json',worldSources);
const reportPath=path.join(output,'dist/data/northern-frontiers.json');fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report)+'\n');changedFiles.push('dist/data/northern-frontiers.json');
fs.writeFileSync(path.join(output,'northern-frontiers-changed.json'),JSON.stringify(changedFiles,null,2)+'\n');
for(const r of reports)console.log(r.pair,r.canonical.length,'vertices;',r.affected.length,'units;',Math.round(r.maxEndpointDisplacementMetres)+'m maximum endpoint correction');
