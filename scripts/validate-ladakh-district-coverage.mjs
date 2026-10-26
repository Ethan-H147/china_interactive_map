import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import {load,polygons,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';

const root='dist/data/europe/india/',first=load(root+'first.bin'),mask=first.regions.features.find(f=>f.properties.id==='IN-LA'),data=load(root+'second/IN-LA.bin'),catalogue=load(root+'catalogue.bin'),statistics=load(root+'statistics.json'),report=load(root+'ladakh-district-coverage.json');
assert.equal(createHash('sha256').update(fs.readFileSync(root+'first.bin')).digest('hex'),report.parentSha256,'The state and its international claim geometry remain unchanged');
const area=coordinates=>geographicAreaKm2({type:'MultiPolygon',coordinates}),parent=polygons(mask.geometry),districts=data.regions.features.map(f=>polygons(f.geometry));
assert(area(polygonClipping.difference(parent,...districts))<.001,'Districts cover the complete retained Ladakh mask');
for(const district of districts)assert(area(polygonClipping.difference(district,parent))<.001,'No district fill extends outside Ladakh');
assert(area(polygonClipping.intersection(...districts))<.001,'Districts do not overlap');
const inside=landIndex(parent.flat()),children=districts.map(d=>landIndex(d.flat()));let samples=0;
for(const polygon of parent)for(const ring of polygon)for(let i=1;i<ring.length;i++){
 const a=ring[i-1],b=ring[i],middle=[(a[0]+b[0])/2,(a[1]+b[1])/2],c=Math.cos(middle[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
 for(const side of [-1,1]){const offset=side*3/111195,point=[middle[0]-dy/length*offset/c,middle[1]+dx/length*offset];assert.equal(children.some(f=>f(point)),inside(point),'Coverage follows both sides of every outer-edge segment');samples++;}
}
const edges=districts.map(d=>lineIndex(d.flat()));assert(data.boundaries.features.length,'Retain the Kargil/Leh internal divide');
for(const line of linesOf(data.boundaries))for(let i=1;i<line.length;i++){const point=[(line[i-1][0]+line[i][0])/2,(line[i-1][1]+line[i][1])/2];assert(edges.every(edge=>edge(point)<.25),'Internal boundary belongs to both districts');}
for(const f of data.regions.features){const record=catalogue.records.find(r=>r.id===f.properties.id),mapped=geographicAreaKm2(f.geometry);assert(Math.abs(record.areaKm2-mapped)<1e-6);assert.equal(statistics.regions['india:'+record.id].area.value,record.areaKm2);}
assert.equal(catalogue.chunks['IN-LA'].bytes,fs.statSync(root+'second/IN-LA.bin').size);
assert(report.restoredAreaKm2>900&&report.restoredAreaKm2<1100);
console.log('Ladakh: complete district coverage, no outside fill or district overlaps, '+samples+' border-side probes, shared internal divide and mapped-area metadata passed.');
