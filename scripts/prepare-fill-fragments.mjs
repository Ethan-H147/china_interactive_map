import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import earcut,{flatten,deviation} from 'earcut';
import assert from 'node:assert/strict';
import {readData} from './read-data.mjs';

// Tiny border holes can touch the exterior after vector-tile rounding. Earcut
// then creates overlapping fill triangles. Triangulate these two features in
// Mercator space before tiling; retain the original vertices and all holes.
const data=readData('display-boundaries.json');
const features=[...data.provinces.features,...data.subdivisions.features].filter(f=>[220000,222400].includes(f.properties.adcode));
const project=([x,y])=>[x,Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI];
const output={};
for(const f of features){
 const triangles=[];
 for(const rings of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates){
  const original=rings.flat(),flat=flatten(rings.map(r=>r.map(project))),indices=earcut(flat.vertices,flat.holes,2);
  assert(deviation(flat.vertices,flat.holes,2,indices)<1e-10,'Fill triangulation must preserve the polygon area');
  for(let i=0;i<indices.length;i+=3){const a=original[indices[i]],b=original[indices[i+1]],c=original[indices[i+2]];triangles.push([[a,b,c,a]]);}
 }
 output[f.properties.adcode]={type:'MultiPolygon',coordinates:triangles};
}
fs.writeFileSync('dist/data/fill-fragments.bin',gzipSync(JSON.stringify(output),{level:9}));
console.log('Prepared exact fill triangles for Jilin and Yanbian:',Object.fromEntries(Object.entries(output).map(([id,g])=>[id,g.coordinates.length])));
