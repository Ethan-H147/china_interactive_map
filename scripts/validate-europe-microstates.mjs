import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import '../dist/countries.js';
import {load,polygons,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const area=d=>d.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0),base='dist/data/europe/',countries=globalThis.AtlasCountries.countries;
for(const [country,counts]of [['monaco',[1]],['luxembourg',[12,100]],['san-marino',[9]]]){
 const cat=load(base+country+'/catalogue.bin'),first=load(base+country+'/first.bin');assert.equal(first.regions.features.length,counts[0]);const ids=new Set(cat.records.map(r=>r.id));assert.equal(ids.size,cat.records.length);for(const [i,n]of counts.entries())assert.equal(cat.records.filter(r=>r.level===i+1).length,n);
 for(const r of cat.records){assert(r.bounds&&r.center&&r.areaKm2>0);if(r.parent)assert(ids.has(r.parent));}
 for(const chunk of Object.values(cat.chunks)){const bytes=fs.readFileSync(base+country+'/'+chunk.file);assert.equal(bytes.length,chunk.bytes);assert.equal(load(base+country+'/'+chunk.file).regions.features.length,chunk.count);}
 const dissolved=await command(first.regions,'-dissolve');assert(Math.abs(area(dissolved)-area(first.regions))<.001,'No overlapping first-level polygons');
 assert.equal(load(base+country+'/statistics.json').regions[country+':'+cat.records[0].id].area.method,country==='san-marino'?'mapped':'reported');
 const history=load('dist/data/country-history.json').entries.filter(e=>e.country===country);assert.equal(history.length,1);assert.equal(history[0].addedOn,'2026-10-19');
 const f=load(base+'flag-sources.json').flags[country],bytes=fs.readFileSync('dist/'+f.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert(f.width>0&&f.height>0&&f.license==='Public domain');
}
assert.equal(countries.monaco.parent,'france');assert(!countries.luxembourg.parent&&!countries['san-marino'].parent);
const mc=load(base+'monaco/first.bin').regions,mcInside=landIndex(mc.features.flatMap(f=>polygons(f.geometry).flat()));assert(mcInside([7.4245,43.7385]));assert(!mcInside([7.46,43.65]),'Territorial waters are excluded');assert(!mcInside([7.426,43.735]),'Port Hercule water stays water');assert(area(mc)>2&&area(mc)<2.2);
const fr=await command(load(base+'france/first.bin').regions,'-clip bbox=7.39,43.71,7.46,43.76'),overlap=await command({'mc.json':mc,'fr.json':fr},'-clip fr.json');assert(area(overlap)<.0001,'No Monaco/France fill overlap');const frontier=load(base+'monaco/international.bin');assert(frontier.features.length);const edge=lineIndex(fr.features.flatMap(f=>polygons(f.geometry).flat()));assert(linesOf(frontier).flat().every(p=>edge(p)<1),'Monaco frontier follows the French fill');
const sm=load(base+'san-marino/first.bin').regions,smContext=load(base+'san-marino/context.bin'),it=load(base+'italy/international.bin'),itEdge=lineIndex(linesOf(it));for(const ring of smContext.features.flatMap(f=>polygons(f.geometry).flat()))assert(ring.every(p=>itEdge(p)<.2),'Italian border is continuous around San Marino');assert(Math.abs(area(sm)-area(smContext))<.001,'Castelli cover the enclave without gaps');
const cat=load(base+'luxembourg/catalogue.bin');for(const canton of cat.records.filter(r=>r.level===1)){const children=load(base+'luxembourg/'+cat.chunks[canton.id].file).regions;assert(Math.abs(area(children)-canton.areaKm2)<.0001,'Communes agree with parent canton area');}assert(cat.records.every(r=>r.kind!=='District'),'Abolished Luxembourg districts are absent');
const luOutline=load(base+'luxembourg/context.bin'),neighborFeatures=[];
for(const country of ['france','germany','belgium']){const own=await command(load(base+country+'/first.bin').regions,'-clip bbox=5.65,49.4,6.6,50.25');neighborFeatures.push(...own.features);const overlap=await command({'lu.json':luOutline,'neighbor.json':own},'-clip neighbor.json');assert(area(overlap)<.001,'Luxembourg does not overlap '+country);}
const neighborOutline=await command(fc(neighborFeatures),'-dissolve2'),neighborEdge=lineIndex(neighborOutline.features.flatMap(f=>polygons(f.geometry).flat()));assert(luOutline.features.flatMap(f=>polygons(f.geometry).flat(2)).every(p=>neighborEdge(p)<1),'Luxembourg exterior meets the neighboring fills without gaps');
console.log('Microstates: sovereign Monaco France subpage, flags, log, 12 cantons/100 communes, 9 castelli, water exclusion, shared edges, valid hierarchy, chunk accounting and coverage passed.');
