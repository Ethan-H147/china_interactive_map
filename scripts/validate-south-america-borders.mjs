import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {divisionBorders,municipalBorders} from './south-america-borders.mjs';

const fc=features=>({type:'FeatureCollection',features});
const polygon=(id,ring)=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates:[ring]}});
const paths=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():g.type==='LineString'?[g.coordinates]:g.coordinates;
const key=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
const segments=g=>paths(g).flatMap(path=>path.slice(1).map((b,i)=>key(path[i],b)));
const read=file=>JSON.parse(gunzipSync(fs.readFileSync(file)));
const base='dist/data/south-america/';
let checked=0;
function verify(payload){
 const owners=new Map(),drawn=new Set();
 for(const region of payload.regions.features)for(const segment of new Set(segments(region.geometry))){if(!owners.has(segment))owners.set(segment,new Set());owners.get(segment).add(region.properties.id);}
 for(const line of payload.lines.features)for(const segment of segments(line.geometry)){
  const adjacent=owners.get(segment);
  assert.ok(adjacent?.size>1,'Never stroke an exterior coast, lake shore or isolated island');
  assert.deepEqual(line.properties.regionIds,[...adjacent].sort(),'Selected borders carry the actual neighboring division IDs');
  assert.ok(!drawn.has(segment),'Draw each shared boundary once');drawn.add(segment);
 }
 assert.equal(drawn.size,[...owners.values()].filter(ids=>ids.size>1).length,'Retain every shared internal division boundary');checked++;
}
const left=polygon('left',[[0,0],[1,0],[1,1],[0,1],[0,0]]),right=polygon('right',[[1,0],[2,0],[2,1],[1,1],[1,0]]),island=polygon('island',[[3,0],[4,0],[4,1],[3,1],[3,0]]);
const sample=fc([left,right,island]),lines=divisionBorders(sample);
verify({regions:sample,lines});assert.equal(lines.features.length,1);assert.deepEqual(new Set(segments(lines.features[0].geometry)),new Set([key([1,0],[1,1])]));
for(const file of ['brazil-first.bin','argentina-first.bin','uruguay-first.bin','brazil-ddd.bin'])verify(read(base+file));
const local=read(base+'argentina-local/index.bin');for(const group of Object.values(local.groups))verify(read(base+'argentina-local/'+group.file));

// A coastal municipality starts and ends partway along the parent shoreline.
// An inland line close to that shore must remain visible.
const parent=polygon('parent',[[0,0],[10,0],[10,10],[0,10],[0,0]]);
const town=polygon('town',[[2,0],[8,0],[8,2],[2,2],[2,0]]);
const inland=polygon('inland',[[2,.00001],[8,.00001],[8,2],[2,2],[2,.00001]]);
const townLines=municipalBorders(fc([town]),parent);
assert.equal(segments(townLines.features[0].geometry).length,3,'Remove the municipal shoreline, retaining all three inland sides');
assert.ok(!segments(townLines.features[0].geometry).includes(key([2,0],[8,0])));
assert.equal(segments(municipalBorders(fc([inland]),parent).features[0].geometry).length,4,'Do not erase real inland boundaries near a coast');
assert.equal(municipalBorders(fc([parent]),parent).features.length,0,'A city covering the full parent cannot recreate its coastline outline');
const first=read(base+'argentina-first.bin'),cities=read(base+'argentina-cities/index.bin');
for(const [province,group] of Object.entries(cities.groups)){
 const exterior=new Set(segments(first.regions.features.find(f=>f.properties.id===province).geometry));
 for(const line of read(base+'argentina-cities/'+group.file).lines.features)for(const segment of segments(line.geometry))assert.ok(!exterior.has(segment),'Municipal selections must not stroke the parent exterior');
}
console.log(checked+' complete division datasets retain their internal borders with no exterior strokes; coastal and inland municipal selection regressions passed.');
