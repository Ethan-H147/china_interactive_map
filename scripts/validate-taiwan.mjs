import assert from 'node:assert/strict';
import {readData} from './read-data.mjs';

const source=readData('taiwan-regions.json'),data=readData('display-boundaries.json');
const key=p=>p.map(n=>n.toFixed(10)).join(',');
const segment=(a,b)=>[key(a),key(b)].sort().join('|');
const rings=f=>f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();
const owners=new Map();
for(const f of source.features)for(const r of rings(f))for(let i=1;i<r.length;i++){
 const s=segment(r[i-1],r[i]);if(!owners.has(s))owners.set(s,new Set());owners.get(s).add(f.properties.adcode);
}
const outer=new Set(data.boundaries.province.coordinates.flatMap(r=>r.slice(1).map((p,i)=>segment(r[i],p))));
const internal=new Set(data.boundaries.prefecture.coordinates.flatMap(r=>r.slice(1).map((p,i)=>segment(r[i],p))));
let shared=0,hsinchu=0;
for(const [edge,regions] of owners)if(regions.size>1){
 assert(!outer.has(edge),'An inland Taiwan county edge is styled as an outer border');
 assert(internal.has(edge),'A shared Taiwan county edge is missing');
 shared++;if(regions.has('TW-10018')||regions.has('TW-10004'))hsinchu++;
}
assert(hsinchu>3000,'Exercise the full Hsinchu border');
for(const original of source.features){
 const actual=data.subdivisions.features.find(f=>f.properties.adcode===original.properties.adcode);
 assert.deepEqual(actual.properties,original.properties);
 assert.deepEqual(rings(actual).map(r=>r.map(key)),rings(original).map(r=>r.map(key)),'Retain county vertices, islands and ring structure within numerical precision');
}
console.log(`Taiwan borders passed: ${shared} shared edges, including ${hsinchu} Hsinchu edges; all county shapes retained.`);
