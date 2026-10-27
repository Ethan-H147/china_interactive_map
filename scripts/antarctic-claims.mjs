import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,polygons} from './geo-index.mjs';
import '../dist/countries.js';
const root='dist/data/',fc=features=>({type:'FeatureCollection',features});
const south=part=>part.flat(Infinity).every((v,i)=>i%2===0||v<=-60);
const write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9}));
export function antarcticParts(feature){return polygons(feature.geometry).filter(south);}
export function withoutAntarctica(feature){
 const parts=polygons(feature.geometry);if(!parts.length)return [feature];
 const kept=parts.filter(p=>!south(p));return kept.length?[{...feature,geometry:{type:'MultiPolygon',coordinates:kept}}]:[];
}
// Claims stay in the claimant's own detailed map. Only claimant-specific
// context features can draw the same sectors in a shared background layer.
export function preserveAntarctica(){
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
   });if(changed)write(file,data);
  }
 }
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
