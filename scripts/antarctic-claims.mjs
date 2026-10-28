import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,polygons} from './geo-index.mjs';
import '../dist/countries.js';
import {command} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const root='dist/data/',fc=features=>({type:'FeatureCollection',features});
const south=part=>part.flat(Infinity).every((v,i)=>i%2===0||v<=-60);
const write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
export function antarcticParts(feature){return polygons(feature.geometry).filter(south);}
export function withoutAntarctica(feature){
 const parts=polygons(feature.geometry);if(!parts.length)return [feature];
 const kept=parts.filter(p=>!south(p));return kept.length?[{...feature,geometry:{type:'MultiPolygon',coordinates:kept}}]:[];
}
// Claim sectors are the shared continent outline clipped to each claim's meridians (as Natural
// Earth draws them, to 85°S; the polar cap closes them to the pole). Peter I Island is its own outline.
const sectors={'AU-AAT':[[45,136],[142,160]],'NZ-ROS':[[160,180],[-180,-150]],'NO-QM':[[-20,45]]},islands={'NO-PI':[-91.5,-69.3,-89.8,-68.4]};
async function sectorGeometry(outline,region){
 const parts=[];
 for(const box of islands[region]?[islands[region]]:sectors[region].map(([w,e])=>[w,-85,e,-60])){
  const clipped=await command(outline,'-clip bbox='+box.join(','),{precision:null});
  for(const f of clipped.features)for(const p of polygons(f.geometry))parts.push(box[2]<=-150&&region==='NZ-ROS'?p.map(r=>r.map(([x,y])=>[x+360,y])):p);
 }
 // Joined across 180° where a sector continues past it (the Ross Dependency runs 160°E–210°).
 const joined=await command(fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:parts}}]),'-dissolve2 -clean',{precision:null});
 const coordinates=joined.features.flatMap(f=>polygons(f.geometry)),points=coordinates.flat(2);
 return {geometry:{type:'MultiPolygon',coordinates},bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]};
}
// A selected sector is outlined along its coast and meridians only: the 85°S cut is
// the flat map's limit, and the polar cap continues the fill to the pole.
function withoutPolarCut(geometry){
 const cut=p=>p[1]<=-84.9999,lines=[];
 for(const ring of polygons(geometry).flat()){
  // Start after a cut segment so that no kept run wraps past the ring's first point.
  const n=ring.length-1,isCut=i=>cut(ring[i])&&cut(ring[i+1]),start=Array.from({length:n},(_,i)=>i).find(isCut);
  if(start===undefined){lines.push(ring);continue;}
  let run=[];for(let k=1;k<=n;k++){const i=(start+k)%n;
   if(isCut(i)){if(run.length>1)lines.push(run);run=[];continue;}if(!run.length)run.push(ring[i]);run.push(ring[i+1]);}
  if(run.length>1)lines.push(run);
 }
 return {type:'MultiLineString',coordinates:lines};
}
// The claimant's own map draws its sector from the same continent outline as every
// shared background, so the selected fill and the land beneath it coincide.
async function claimantMaps(outline){
 for(const country of globalThis.AtlasCountries.byAdapter('europe')){
  const base=root+'europe/'+country+'/',file=base+'first.bin';if(!fs.existsSync(file))continue;
  const part=load(file),claims=part.regions.features.filter(f=>sectors[f.properties.id]||islands[f.properties.id]);if(!claims.length)continue;
  const catalogue=load(base+'catalogue.bin'),statistics=JSON.parse(fs.readFileSync(base+'statistics.json')),overrides=[];
  for(const f of claims){
   const id=f.properties.id,next=await sectorGeometry(outline,id),areaKm2=geographicAreaKm2(next.geometry),record=catalogue.records.find(r=>r.id===id),stats=statistics.regions[country+':'+id];
   f.geometry=next.geometry;if(sectors[id])overrides.push({type:'Feature',properties:{id},geometry:withoutPolarCut(next.geometry)});
   const note=text=>text?.replace(/Natural Earth (land )?coastline/,'SCAR Antarctic Digital Database coastline, ice shelves included');
   Object.assign(record,{bounds:[next.bounds.slice(0,2),next.bounds.slice(2)],areaKm2,note:note(record.note)});
   if(stats){stats.area.value=areaKm2;stats.note=note(stats.note);}
  }
  if(overrides.length)part.selectionOutlineOverrides={type:'FeatureCollection',features:overrides};
  fs.writeFileSync(file,gzipSync(JSON.stringify(part),{level:9}));fs.writeFileSync(base+'catalogue.bin',gzipSync(JSON.stringify(catalogue),{level:9}));fs.writeFileSync(base+'statistics.json',JSON.stringify(statistics));
 }
}
// Claims stay in the claimant's own detailed map. Only claimant-specific
// context features can draw the same sectors in a shared background layer.
export async function preserveAntarctica(){
 const outlineFile=root+'antarctica/context.bin';if(!fs.existsSync(outlineFile))return;
 const outline=load(outlineFile);
 for(const adapter of ['europe','southern-africa'])for(const country of globalThis.AtlasCountries.byAdapter(adapter)){
  for(const name of ['context','international']){
   const file=adapter+'/'+country+'/'+name+'.bin';if(!fs.existsSync(root+file))continue;
   const data=load(root+file);let changed=false;
   data.features=data.features.flatMap(f=>{
    const parts=polygons(f.geometry);
    if(parts.length){const polar=parts.filter(south);if(!polar.length)return [f];changed=true;return [...withoutAntarctica(f),{...f,properties:{...f.properties,claimants:country},geometry:{type:'MultiPolygon',coordinates:polar}}];}
    const paths=f.geometry?.type==='MultiLineString'?f.geometry.coordinates:f.geometry?.type==='LineString'?[f.geometry.coordinates]:[];
    if(!paths.some(south))return [f];changed=true;return paths.map(path=>({...f,properties:{...f.properties,...(south(path)?{claimants:country}:{})},geometry:{type:'LineString',coordinates:path}}));
   });
   for(const f of data.features)if(f.properties.claimants&&(sectors[f.properties.region]||islands[f.properties.region])&&polygons(f.geometry).length){const next=await sectorGeometry(outline,f.properties.region);f.geometry=next.geometry;f.properties={...f.properties,bounds:next.bounds};changed=true;}
   if(changed)write(file,data);
  }
 }
 await claimantMaps(outline);
 const world=load(root+'world-land.bin');world.features=[...world.features.flatMap(withoutAntarctica),...outline.features];write('world-land.bin',world);
 // Existing world assets can contain the straight edges of claim sectors.
 // Remove southern shoreline strokes; claim boundaries remain claimant-only.
 for(const file of ['world-country-outlines.bin','atlas-frontiers.bin','shared-context-borders.bin']){
  const data=load(root+file);data.features=data.features.flatMap(f=>{
   const paths=f.geometry?.type==='MultiLineString'?f.geometry.coordinates:f.geometry?.type==='LineString'?[f.geometry.coordinates]:[];
   if(!paths.some(south))return [f];
   if(file==='world-country-outlines.bin')return paths.filter(p=>!south(p)).map(p=>({...f,geometry:{type:'LineString',coordinates:p}}));
   const claimants=f.properties.claimants||String(f.properties.countries||'').split(' ').filter(id=>globalThis.AtlasCountries.countries[id]).join(' ');
   return paths.map(p=>({...f,properties:{...f.properties,...(south(p)?{claimants:claimants||'claimant-only'}:{})},geometry:{type:'LineString',coordinates:p}}));
  });
  write(file,data);
 }
 const meta=load(root+'world-land-sources.json');delete meta.norwegianAntarcticCoast;meta.antarctica={source:'data/antarctica/sources.json',policy:'One continent in shared backgrounds; territorial sectors are visible only when their claimant country is open.'};meta.bytes=fs.statSync(root+'world-land.bin').size;meta.outlineBytes=fs.statSync(root+'world-country-outlines.bin').size;fs.writeFileSync(root+'world-land-sources.json',JSON.stringify(meta,null,2)+'\n');
}
