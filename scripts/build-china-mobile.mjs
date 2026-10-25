import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodePack} from '../dist/china-pack.mjs';
import {chinaSourceBuilders} from '../dist/china-sources.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

// Build each source once, rather than decoding the whole country for every worker.
// Coordinates, feature IDs, repaired fill triangles and omitted strokes stay exact.
export function buildChinaMobile(){
 const root='dist/data/china-mobile';fs.mkdirSync(root,{recursive:true});
 const manifest={inputs:{},sources:{},selections:{},counties:{}};
 const read=name=>{const bytes=fs.readFileSync('dist/data/'+name);manifest.inputs[name]=createHash('sha256').update(bytes).digest('hex');return decodePack(gunzipSync(bytes));};
 const write=(name,data)=>{const bytes=gzipSync(encodeGeo(data),{level:9});fs.writeFileSync(root+'/'+name,bytes);return {file:name,bytes:bytes.length,features:data.features.length};};
 const builders=chinaSourceBuilders(read('china-boundaries.pack.bin'));
 for(const [id,build] of Object.entries(builders))if(!id.startsWith('city-district'))manifest.sources[id]=write(id+'.bin',build());
 // Regular polygon sources can draw their own selection outlines. Only repaired
 // triangle fills need a separate exterior, so their internal diagonals stay hidden.
 for(const id of ['provinces-selection-edges','prefectures-selection-edges','others-selection-edges'])manifest.selections[id]=write(id+'-repaired.bin',{type:'FeatureCollection',features:builders[id]().features.filter(f=>id.startsWith('provinces-')?f.properties.adcode===220000:id.startsWith('prefectures-')&&f.properties.adcode===222400)});
 const counties=chinaSourceBuilders(read('china-counties.pack.bin'));
 for(const id of ['city-districts','city-district-boundaries','city-districts-selection-edges']){
  const grouped=new Map();
  for(const feature of counties[id]().features){const scope=feature.properties.parentCity;if(!scope)throw Error('Missing county parent');if(!grouped.has(scope))grouped.set(scope,[]);grouped.get(scope).push(feature);}
  for(const [scope,features] of grouped){const folder='counties/'+scope;fs.mkdirSync(root+'/'+folder,{recursive:true});(manifest.counties[scope]??={})[id]=write(folder+'/'+id+'.bin',{type:'FeatureCollection',features});}
 }
 for(const [scope,sources] of Object.entries(manifest.counties))for(const id of ['city-districts','city-district-boundaries','city-districts-selection-edges'])if(!sources[id])sources[id]=write('counties/'+scope+'/'+id+'.bin',{type:'FeatureCollection',features:[]});
 fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest));
 console.log('Mobile China:',Object.keys(manifest.sources).length,'independent sources;',Object.keys(manifest.counties).length,'county areas; unchanged coordinates.');
 return manifest;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/build-china-mobile.mjs'))buildChinaMobile();
