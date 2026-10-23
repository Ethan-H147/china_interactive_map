import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {load,polygons,landIndex,lineIndex} from './geo-index.mjs';
import {source,root} from './fetch-north-andes.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
import '../dist/countries.js';
const expected={ecuador:[24,221,1042],venezuela:[25,336,1135],colombia:[33,1122]},canonical=load(root+'resolved.bin');
for(const [name]of Object.entries(load(root+'manifest.json').files))source(name);
for(const [country,counts]of Object.entries(expected)){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),units=new Map(cat.records.map(r=>[r.id,r])),shapes=[];
 for(let level=1;level<=counts.length;level++){assert.equal(cat.counts[level],counts[level-1]);assert.equal(cat.records.filter(r=>r.level===level).length,counts[level-1]);}
 assert.equal(units.size,cat.records.length);for(const r of units.values())if(r.parent)assert.equal(units.get(r.parent)?.level,r.level-1,'Valid parent '+r.id);
 for(const file of ['first.bin',...Object.values(cat.chunks).map(ch=>ch.file)]){const part=load(base+file);assert(part.regions.features.length);assert(part.selectionOutlines,'Shoreline-free selected outlines');for(const f of part.regions.features){const r=units.get(f.properties.id);assert(r);assert(landIndex(polygons(f.geometry).flat())(r.center),'Interior label '+r.id);if(r.level===counts.length)shapes.push(f);}}
 const population=Object.entries(stats.regions).filter(([id,s])=>s.level===1&&s.population);assert.equal(population.length,country==='venezuela'?24:counts[0]);assert(population.every(([id,s])=>s.population.year===(country==='ecuador'?2022:country==='venezuela'?2011:2025)));
 if(country==='ecuador'){assert.equal(population.reduce((s,[,r])=>s+r.population.value,0),16938986);assert.equal(Object.values(stats.regions).filter(s=>s.level===3&&s.population).length,1042);}
 if(country==='colombia')assert.equal(Object.values(stats.regions).filter(s=>s.gdp?.usd>0&&s.gdpPerCapita?.usd>0).length,33);
 if(country==='venezuela'){assert(Object.values(stats.regions).filter(s=>s.level===3).every(s=>!s.population),'No inferred parish populations');assert.equal(Object.values(stats.regions).filter(s=>s.level===2&&s.population).length,335);assert.equal(stats.regions['venezuela:VE2401'].population.value,352920,'Vargas/La Guaira same municipality, with recorded census source code');assert.equal(stats.regions['venezuela:VE2401'].population.sourceCode,'VE2402');}
 const outline=await command(fc(shapes),'-dissolve');for(const f of canonical.features.filter(f=>f.properties.pair.split('-').includes(globalThis.AtlasCountries.countries[country].naturalEarth))){const actual=selectFrontierArc(outline,f.geometry.coordinates,{maximumScoreMetres:25000}).path,near=lineIndex([f.geometry.coordinates]);assert(actual.every(p=>near(p)<4||Math.min(...[f.geometry.coordinates[0],f.geometry.coordinates.at(-1)].map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])*111195))<2100),'Aligned border '+country+' '+f.properties.pair);}
 console.log(country,counts.join('/'),'hierarchy, population dates, interior labels and shared borders verified');
}
const world=load('dist/data/world-land-sources.json');for(const iso of ['ECU','VEN','COL'])assert(!world.topology.backgroundCodes.includes(iso),'Interactive '+iso+' replaces background');
for(const country of Object.keys(expected))assert(load('dist/data/globe-overview.json').countries.includes(country));
for(const code of ['ec','ve','co']){const bytes=fs.readFileSync('dist/vendor/flag-'+code+'.svg');assert.equal(createHash('sha256').update(bytes).digest('hex'),load(root+'manifest.json').files['flag-'+code+'.svg'].sha256);}
