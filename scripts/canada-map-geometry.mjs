import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {decodeData,encodeGeo} from '../dist/geo-pack.mjs';
import {command,fc,geographicBounds} from './build-regional-dataset.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server'),{feature}=require('topojson-client');
export const root='dist/data/europe/canada/', input='artifacts/canada-history/';
export const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
export const write=(file,data,geo=false)=>{fs.mkdirSync(root+file.slice(0,file.lastIndexOf('/')+1),{recursive:true});fs.writeFileSync(root+file,gzipSync(geo?encodeGeo(data,{source:'Canada dated boundaries'},{scale:1e6}):JSON.stringify(data),{level:9}));};
export const featureOf=(id,geometry)=>({type:'Feature',properties:{id},geometry});
export const modern=(await decodeData(fs.readFileSync(root+'first.bin'))).regions;
export const clean=layer=>fc(layer.features.filter(f=>f.geometry?.coordinates.length));
export async function frame(regions){
 regions=clean(regions);
 const points=await command(regions,'-points inner',{precision:null}),labels=new Map(points.features.map(f=>[f.properties.id,f.geometry?.coordinates]));
 const units=regions.features.map(f=>({id:f.properties.id,bounds:geographicBounds(f.geometry),label:labels.get(f.properties.id)}));
 const t=topology({regions}),owners=new Map();
 for(const g of t.objects.regions.geometries)for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){
  if(!owners.has(a))owners.set(a,[]);owners.get(a).push(g.properties.id);
 }
 const byPair=new Map();for(const [a,ids] of owners){const key=ids.sort().join('|');if(!byPair.has(key))byPair.set(key,{ids,arcs:[]});byPair.get(key).arcs.push([a]);}
 const edges=fc([...byPair.values()].map(({ids,arcs})=>({type:'Feature',properties:{a:ids[0],b:ids[1]||''},geometry:feature(t,{type:'MultiLineString',arcs}).geometry})));
 return {regions,edges,units};
}
