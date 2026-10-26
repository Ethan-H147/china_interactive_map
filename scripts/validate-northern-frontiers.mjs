import assert from 'node:assert/strict';
import {load,polygons,linesOf,lineIndex,landIndex,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
const report=load('dist/data/northern-frontiers.json'),world=load('dist/data/world-land.bin');
for(const r of report.frontiers){
 const base='dist/data/europe/'+r.target+'/',first=load(base+'first.bin').regions,context=load(base+'context.bin'),fallback=fc(world.features.filter(f=>f.properties.country===r.target));
 const paths=r.canonical,ends=[paths[0],paths.at(-1)],trim=r.target==='canada'?1500:12000;
 for(const [name,data]of [['administrative map',first],['country preview',context],['world fallback',fallback]]){
  const distance=lineIndex((await command(data,'-dissolve2')).features.flatMap(f=>polygons(f.geometry).flat()));
  const missing=paths.filter(p=>distance(p)>3&&ends.every(e=>metres(p,e)>trim));assert.equal(missing.length,0,r.pair+' has no missing edge in '+name+': '+JSON.stringify(missing.slice(0,3)));
 }
 const owner=load(r.owner==='russia'?'dist/data/russia/first.bin':'dist/data/europe/united-states/first.bin').regions,ownLand=landIndex(owner.features.flatMap(f=>polygons(f.geometry).flat())),targetLand=landIndex(first.features.flatMap(f=>polygons(f.geometry).flat()));
 let checked=0;
 for(let i=1;i<paths.length;i++){
  const a=paths[i-1],b=paths[i],m=[(a[0]+b[0])/2,(a[1]+b[1])/2],c=Math.cos(m[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length||ends.some(e=>metres(m,e)<trim))continue;
  for(const side of [-1,1]){const p=[m[0]-side*dy/length*10/111195/c,m[1]+side*dx/length*10/111195];assert(ownLand(p)||targetLand(p),r.pair+' has no background slit beside '+JSON.stringify(m));}
  checked++;
 }
 assert(checked>100);console.log(r.pair+': '+checked+' shared-edge segments; detailed land, preview and fallback stay closed.');
 if(r.target==='canada'){
  const cat=load(base+'catalogue.bin'),records=new Map(cat.records.map(r=>[r.id,r]));
  for(const province of ['CA-YT','CA-BC']){
   const divisions=load(base+cat.chunks[province].file).regions,leaves=fc(divisions.features.flatMap(f=>load(base+cat.chunks[f.properties.id].file).regions.features));
   const distance=lineIndex((await command(leaves,'-dissolve2')).features.flatMap(f=>polygons(f.geometry).flat()));
   const inProvince=landIndex(polygons(first.features.find(f=>f.properties.id===province).geometry).flat());
   for(const p of paths)if(inProvince([p[0]+.0001,p[1]])&&ends.every(e=>metres(p,e)>trim))assert(distance(p)<3,'Canadian leaves retain the repaired exterior');
   assert(divisions.features.every(f=>records.get(f.properties.id).parent===province));
  }
 }
}
console.log('Northern frontier geometry, inland gap closure, preview consistency and Canadian hierarchy passed.');
