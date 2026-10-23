import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load,polygons,landIndex,linesOf,lineIndex} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {source,root} from './fetch-nigeria.mjs';
import '../dist/countries.js';
const base='dist/data/europe/nigeria/',cat=load(base+'catalogue.bin'),first=load(base+'first.bin'),context=load(base+'context.bin'),stats=load(base+'statistics.json');
const records=cat.records,states=records.filter(r=>r.level===1),locals=records.filter(r=>r.level===2),ids=new Set(records.map(r=>r.id));
assert.deepEqual(cat.counts,{'1':37,'2':774});assert.equal(ids.size,811);assert.equal(states.filter(r=>r.kind==='State').length,36);assert.equal(states.filter(r=>r.kind==='Federal capital territory').length,1);assert.equal(locals.filter(r=>r.kind==='Area council').length,6);assert.equal(locals.filter(r=>r.kind==='Local government area').length,768);assert.equal(Object.keys(cat.chunks).length,37);assert(!records.some(r=>r.level===3),'Partial wards are not exposed');
for(const [name,count]of [['Lagos',20],['Kano',44],['Bayelsa',8],['Federal Capital Territory',6]])assert.equal(cat.chunks[states.find(r=>r.en===name).id].count,count,name+' local count');
const all=[];
for(const state of states){
 const chunk=cat.chunks[state.id],d=load(base+chunk.file),parent=first.regions.features.find(f=>f.properties.id===state.id);
 assert.equal(d.regions.features.length,chunk.count);assert(d.regions.features.every(f=>records.find(r=>r.id===f.properties.id)?.parent===state.id));
 const sum=d.regions.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0);assert(Math.abs(sum-geographicAreaKm2(parent.geometry))<.01,state.en+' exactly matches its local-area union');
 const inside=landIndex(polygons(parent.geometry).flat());
 for(const f of d.regions.features){const r=records.find(r=>r.id===f.properties.id);assert(inside(r.center),r.en+' center inside its state');assert(r.areaKm2>0);assert(stats.regions['nigeria:'+r.id].area.value>0);}
 all.push(...d.regions.features);
}
const area=first.regions.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0);assert(area>890000&&area<930000,'Nigeria mapped extent');
assert(Math.abs(area-context.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0))<area*.001,'Simplified country portal retains the mapped national extent');
const search=createPlaceSearch(records);for(const [q,id]of [['Lagos','NG025'],['FCT','NG015'],['Abuja','NG015'],['Ikeja','NG025011'],['Abuja Municipal','NG015002']])assert(search(q).some(r=>r.id===id),q+' search');
const borders=load(base+'international.bin'),edge=lineIndex(first.regions.features.flatMap(f=>polygons(f.geometry).flat()));assert.deepEqual(new Set(borders.features.map(f=>f.properties.neighbor)),new Set(['BEN','NER','TCD','CMR']));
let samples=0;for(const path of linesOf(borders))for(let i=1;i<path.length;i+=3){const a=path[i-1],b=path[i];assert(edge([(a[0]+b[0])/2,(a[1]+b[1])/2])<1,'International stroke on actual mapped outline');samples++;}assert(samples>100);
const registry=globalThis.AtlasCountries.countries.nigeria;assert.equal(registry.continent,'Africa');assert.equal(registry.quiz.level,1);assert.equal(registry.naturalEarth,'NGA');
for(const name of Object.keys(load(root+'manifest.json').files))source(name);
assert.equal(createHash('sha256').update(fs.readFileSync('dist/vendor/flag-ng.svg')).digest('hex'),load(root+'manifest.json').files['flag-ng.svg'].sha256);
assert(load('dist/data/country-history.json').entries.some(r=>r.country==='nigeria'&&r.addedOn==='2026-10-22'));
const world=load('dist/data/world-land-sources.json');assert(world.topology.atlasCodes.includes('NGA'));assert(!world.topology.backgroundCodes.includes('NGA'));
assert(!load('dist/data/world-country-outlines.bin').features.some(f=>f.properties.countries.split(' ').includes('NGA')),'Old Nigeria outline removed');
assert(load('dist/data/globe-overview.json').countries.includes('nigeria'));
console.log('Nigeria: 36 states + FCT, 768 LGAs + six area councils, hierarchy, exact parent unions, mapped areas, search aliases, '+samples+' frontier samples, retained sources and globe integration passed.');
