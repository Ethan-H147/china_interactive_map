import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {load,polygons} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {prepareKorea} from '../dist/korea-preparation.mjs';
import {prepareMongolia} from '../dist/mongolia-preparation.mjs';

const collection=features=>({type:'FeatureCollection',features});
const edge=(a,b)=>{const x=a.join(','),y=b.join(',');return x<y?x+'|'+y:y+'|'+x;};
// Assign the existing shared lines to their original owners without rebuilding,
// simplifying, clipping, or introducing coastline strokes.
function scopedLines(data,channels){
 const owners=new Map(),parents=new Map(data.second.features.map(f=>[f.properties.id,f.properties.parent]));
 for(const f of data.second.features)for(const poly of polygons(f.geometry))for(const ring of poly)for(let i=1;i<ring.length;i++){
  const key=edge(ring[i-1],ring[i]);if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(f.properties.parent);
 }
 const result=new Map([...new Set(parents.values())].map(id=>[id,[]]));
 for(const line of data.boundaries.second.coordinates){
  const runs=new Map();
  for(let i=1;i<line.length;i++){
   const ids=owners.get(edge(line[i-1],line[i]));assert(ids?.size,'A shared boundary must retain its original owners');
   for(const id of ids){const previous=runs.get(id);if(previous?.at(-1)===line[i-1])previous.push(line[i]);else {const run=[line[i-1],line[i]];result.get(id).push(run);runs.set(id,run);}}
   for(const id of runs.keys())if(!ids.has(id))runs.delete(id);
  }
 }
 for(const f of channels?.features||[])for(const parent of new Set(f.properties.owners.map(id=>parents.get(id)).filter(Boolean)))result.get(parent).push(...f.geometry.coordinates);
 return result;
}
for(const country of ['korea','mongolia']){
 const root='dist/data/scoped/'+country;fs.mkdirSync(root+'/second',{recursive:true});
 const input=country+'-boundaries.bin',data=load('dist/data/'+input),channels=load('dist/data/'+country+'-channels.bin');
 data.channels=channels;
 const prepared=(country==='korea'?prepareKorea:prepareMongolia)(data),manifest={inputSha256:createHash('sha256').update(fs.readFileSync('dist/data/'+input)).digest('hex'),sources:{},scopes:{}};
 const write=(name,value)=>{const bytes=gzipSync(encodeGeo(value),{level:9});fs.writeFileSync(root+'/'+name,bytes);return {file:name,bytes:bytes.length};};
 fs.writeFileSync(root+'/metadata.bin',gzipSync(JSON.stringify(prepared.metadata),{level:9}));
 for(const [id,blob] of Object.entries(prepared.sources))if(!id.startsWith(country+'-second'))manifest.sources[id]=write(id+'.bin',JSON.parse(await blob.text()));
 const borders=scopedLines(data,channels.second);
 for(const [parent,coordinates] of borders){
  const regions=collection(data.second.features.filter(f=>f.properties.parent===parent));
  manifest.scopes[parent]={};
  for(const [suffix,value] of [['',regions],['-edges',collection([{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates}}])],['-selection-edges',JSON.parse(await prepared.sources[country+'-second-selection-edges'].text()).features.filter(f=>f.properties.parent===parent)]]){
   const id=country+'-second'+suffix;manifest.scopes[parent][id]=write('second/'+parent+suffix+'.bin',Array.isArray(value)?collection(value):value);
  }
 }
 fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest));
 console.log(country+': '+Object.keys(manifest.sources).length+' base sources, '+Object.keys(manifest.scopes).length+' exact subdivision areas.');
}
