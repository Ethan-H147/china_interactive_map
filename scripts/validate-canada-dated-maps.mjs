import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeData} from '../dist/geo-pack.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {landIndex,polygons} from './geo-index.mjs';
const root='dist/data/europe/canada/';
const load=f=>decodeData(fs.readFileSync(root+f));
const history=await load('history/borders.bin'),modern=await load('first.bin');
const sum=c=>c.features.reduce((a,f)=>a+area(f.geometry),0),modernArea=sum(modern.regions);
const years=Object.keys(history.years).map(Number);
assert.deepEqual(years,Array.from({length:years.at(-1)-1865},(_,i)=>1866+i));
// One dated mosaic: every year assigns the faces of present-day land to its divisions.
const faceArea=history.faces.features.map(f=>area(f.geometry)),faceTests=history.faces.features.map(f=>landIndex(polygons(f.geometry).flat()));
for(const [index,c] of history.configs.entries()){
 const delta=c.face.reduce((a,u,i)=>a+(u>=0?faceArea[i]:0),0)-modernArea;
 // Slivers where yearly versions were cut apart stay within a square kilometre of today's land.
 assert(Math.abs(delta)<1,'Configuration '+index+' land area difference: '+delta+' km²');
 assert(c.units.every(u=>u.id&&u.name&&u.label&&u.bounds),'Configuration '+index+' historical card');
}
const unit=(y,p)=>{const c=history.configs[history.years[y].config],face=faceTests.findIndex(test=>test(p));return face>=0?c.units[c.face[face]]:undefined;};
for(const [year,p,id] of [[1866,[-76.6,45.4],'PC'],[1867,[-76.6,45.4],'ON'],[1866,[-98,51.8],'ruperts-land'],[1870,[-98,51.8],'NT'],[1882,[-105,51],'assiniboia'],[1905,[-105,51],'SK'],[1998,[-68.50,63.78],'franklin'],[1999,[-68.50,63.78],'NU']])assert.equal(unit(year,p)?.id,id,year+' '+p);
assert.equal(unit(1901,[-135,62])?.key,unit(2003,[-135,62])?.key,'Yukon rename retains identity');
assert.equal(unit(1999,[-53.2,47.1])?.key,unit(2001,[-53.2,47.1])?.key,'Newfoundland rename retains identity');
const index=await load('elections/boundaries.bin'),results=await load('elections/federal.bin'),ridingFrames=new Map();
for(const c of Object.values(index.configs)){
 const f=await load(c.file);ridingFrames.set(c.file,new Set(f.units.map(u=>u.id)));
 assert(f.units.every(u=>u.label&&u.bounds),c.file+' missing a riding label');
}
assert.equal(results.elections.length,45);
for(const e of results.elections){
 const ids=ridingFrames.get(index.configs[index.elections[e.year].config].file);
 assert.deepEqual(Object.keys(e.states).filter(id=>!ids.has(id)),[],e.year+' results missing dated geometry');
 assert.equal(Object.values(e.states).flatMap(r=>r.candidates).filter(c=>c.elected).length,e.seats-(e.year===1867?1:0),e.year+' seat totals');
 assert.equal(Object.values(e.provinces).reduce((n,r)=>n+r.seats,0),e.seats-(e.year===1867?1:0),e.year+' provincial totals');
}
const latest=results.elections.at(-1);
assert.equal(latest.year,2025);assert.equal(Object.keys(latest.states).length,343);
assert.deepEqual(Object.fromEntries(latest.candidates.filter(p=>p.seats).map(p=>[p.name,p.seats])),{Liberal:169,Conservative:144,'Bloc Québécois':22,'New Democratic Party':7,'Green Party':1});
console.log(years.length+' yearly snapshots preserve the modern land area; '+results.elections.length+' federal elections have dated riding geometry and checked seat totals.');

