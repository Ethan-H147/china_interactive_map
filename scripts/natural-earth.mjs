// Natural Earth 1:10m countries, lakes and land boundary lines (with the geometry helpers of
// geo-index.mjs re-exported). Sources are downloaded once into artifacts/frontier-source.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const source='artifacts/frontier-source';fs.mkdirSync(source,{recursive:true});
const naturalEarth={'ne-10m-countries.geojson':'ne_10m_admin_0_countries.geojson','ne-10m-lakes.geojson':'ne_10m_lakes.geojson','ne-10m-land-boundaries.geojson':'ne_10m_admin_0_boundary_lines_land.geojson'};
export const sources={};
for(const [name,file] of Object.entries(naturalEarth)){
 const target=path.join(source,name),url='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/'+file;
 if(!fs.existsSync(target)){const r=await fetch(url);assert(r.ok,url+' '+r.status);fs.writeFileSync(target,Buffer.from(await r.arrayBuffer()));}
 sources[name]={url,provider:'Natural Earth v5.1.2',license:'Public domain',sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex')};
}
import {load,polygons,metres,landIndex,lineIndex,linesOf} from './geo-index.mjs';
export {load,polygons,metres,landIndex,lineIndex,linesOf};

// The Natural Earth country at a point (null at sea or on a lake).
const lake=landIndex(load(path.join(source,'ne-10m-lakes.geojson')).features.flatMap(f=>polygons(f.geometry).flat()));
const world=load(path.join(source,'ne-10m-countries.geojson')).features.map(f=>{const rings=polygons(f.geometry).flat(),b=[Infinity,Infinity,-Infinity,-Infinity];for(const r of rings)for(const p of r){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return {iso:f.properties.ADM0_A3,box:b,rings,index:null};});
export function countryAt(p){if(lake(p))return null;for(const c of world){if(p[0]<c.box[0]||p[0]>c.box[2]||p[1]<c.box[1]||p[1]>c.box[3])continue;c.index??=landIndex(c.rings);if(c.index(p))return c.iso;}return null;}
export const land=p=>!!countryAt(p);

export const boundaryLines=load(path.join(source,'ne-10m-land-boundaries.geojson')).features.map(f=>({sides:[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R],lines:f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates}));
