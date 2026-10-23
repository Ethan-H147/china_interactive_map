import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load,polygons,landIndex,lineIndex,linesOf,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {source,root} from './fetch-central-europe.mjs';
import {isoCountries,waterFreeLines} from './central-europe-frontiers.mjs';
import '../dist/countries.js';
const definitions={austria:[9,94,2092],hungary:[20,175,3155],slovenia:[12,212,6035]},outlines=new Map();
const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
for(const[country,counts]of Object.entries(definitions)){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin'),index=new Map(cat.records.map(r=>[r.id,r]));
 assert.equal(index.size,counts.reduce((a,b)=>a+b,0));assert.deepEqual(cat.counts,Object.fromEntries(counts.map((count,i)=>[i+1,count])));
 for(const r of cat.records){assert(r.local&&r.en,r.id+' bilingual names');assert(!r.parent||index.has(r.parent),r.id+' parent');assert(r.areaKm2>0);assert(r.center.every(Number.isFinite));const s=stats.regions[country+':'+r.id];assert(s.population?.value>=0,r.id+' official population');assert([2024,2026].includes(s.population.year));assert(stats.sources[s.population.source]?.url);assert(s.area.value>0);if(r.level===1){assert(s.gdp.value>0&&s.gdpPerCapita.value>0);assert(s.gdp.year===s.gdpPerCapita.year);assert.equal(s.gdp.exchangeYear,s.gdp.year);assert(s.gdp.usd>0);}}
 const total=cat.records.filter(r=>r.level===1).reduce((sum,r)=>sum+stats.regions[country+':'+r.id].population.value,0);
 const gdpLabels=JSON.parse(source(country==='austria'?'nama_10r_2gdp.json':'nama_10r_3gdp.json')).dimension.geo.category.label;
 for(const r of cat.records.filter(r=>r.level===1)){assert.equal(norm(gdpLabels[r.nuts]),norm(r.local),r.local+' joins GDP by official region name, not positional code order');assert.equal(stats.regions[country+':'+r.id].gdp.nuts,r.nuts);}
 if(country==='slovenia'){assert.equal(cat.records.filter(r=>r.kind==='Urban municipality').length,12);const bled=cat.records.find(r=>r.en==='Bled'&&r.kind==='Municipality'),ljubljana=cat.records.find(r=>r.en==='Ljubljana'&&r.level===2);assert.equal(index.get(bled.parent).en,'Upper Carniola');assert.equal(index.get(ljubljana.parent).en,'Central Slovenia');}
 if(country==='slovenia'){const p=JSON.parse(source('slovenia-population.json'));assert.equal(total,p.value[p.dimension['OBČINA/NASELJE'].category.index['0']]);}
 if(country==='hungary')assert.equal(total,JSON.parse(source('hungary-population-2024.json')).records.reduce((sum,r)=>sum+r.POP_2024,0));
 for(const[parent,ch]of Object.entries(cat.chunks)){
  const d=load(base+ch.file),r=index.get(parent);assert.equal(d.regions.features.length,ch.count);assert(d.regions.features.every(f=>index.get(f.properties.id).parent===parent));assert.equal(fs.statSync(base+ch.file).size,ch.bytes);
  const sum=d.regions.features.reduce((s,f)=>s+geographicAreaKm2(f.geometry),0);assert(Math.abs(sum-r.areaKm2)<.02,parent+' parent is exactly its constituent local polygons');
  for(const f of d.regions.features){const r=index.get(f.properties.id);assert(landIndex(polygons(f.geometry).flat())(r.center),r.id+' inner label point');}
 }
 outlines.set(country,await command(first.regions,'-dissolve'));
 const search=createPlaceSearch(cat.records),queries=country==='austria'?['Vienna','Kärnten','Innsbruck']:country==='hungary'?['Budapest','Csongrád-Csanád','Hévíz']:['Ljubljana','Koroška','Bled'];for(const q of queries)assert(search(q).length,q+' search');
 assert.equal(globalThis.AtlasCountries.countries[country].continent,'Europe');assert.equal(globalThis.AtlasCountries.countries[country].quiz.level,1);assert(load('dist/data/country-history.json').entries.some(r=>r.country===country));
 console.log(country,counts.join('/'),'units, official population total',total,'regional GDP, names, areas, hierarchy and chunk accounting passed');
}
const vienna=load('dist/data/europe/austria/city-boroughs/catalogue.bin'),austrianStats=load('dist/data/europe/austria/statistics.json');assert.equal(vienna.records.length,23);assert(vienna.records.every(r=>r.parent==='AT-B-9'&&r.thematic==='city-boroughs'&&r.hasStatistics));assert.equal(vienna.records.reduce((sum,r)=>sum+austrianStats.regions['austria:'+r.id].population.value,0),austrianStats.regions['austria:AT-B-9'].population.value,'Vienna borough populations equal the city total');
const canonical=waterFreeLines(load(root+'resolved.bin')),pairs=new Set(canonical.features.map(f=>f.properties.pair));assert(pairs.size>=15);
let samples=0;
for(const country of new Set(canonical.features.flatMap(f=>f.properties.pair.split('-').map(iso=>isoCountries[iso])).filter(Boolean))){
 const iso=Object.keys(isoCountries).find(i=>isoCountries[i]===country),base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin');
 const paths=canonical.features.filter(f=>f.properties.pair.split('-').includes(iso));
 for(const level of [1,2,3]){const chunks=Object.values(cat.chunks).filter(ch=>ch.level===level);if(level>1&&!chunks.length)continue;const regions=level===1?load(base+'first.bin').regions:fc(chunks.flatMap(ch=>load(base+ch.file).regions.features)),outline=await command(regions,'-dissolve'),distance=lineIndex(outline.features.flatMap(f=>polygons(f.geometry).flat()));
  for(const f of paths)for(const path of linesOf(fc([f])))for(let i=1;i<path.length;i+=Math.max(1,Math.floor(path.length/250))){const a=path[i-1],b=path[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],d=distance(mid);assert(d<3,country+' level '+level+' meets '+f.properties.pair+' within 3 m at '+JSON.stringify(mid)+'; got '+d);samples++;}
 }
}
const keys=new Set(),allStrokes=[];for(const country of Object.values(isoCountries))allStrokes.push(...load('dist/data/europe/'+country+'/international.bin').features.filter(f=>pairs.has(f.properties.pair)));
for(const f of allStrokes)for(const path of linesOf(fc([f])))for(let i=1;i<path.length;i++){const k=[path[i-1],path[i]].map(p=>p.map(n=>n.toFixed(6)).join(',')).sort().join('|');assert(!keys.has(k),'International edge drawn once: '+f.properties.pair+' '+k);keys.add(k);}
for(const[name]of Object.entries(load(root+'manifest.json').files))source(name);
const flags=load('dist/data/central-europe-flag-sources.json');assert.equal(Object.keys(flags.flags).length,39);for(const f of Object.values(flags.flags)){assert.equal(createHash('sha256').update(fs.readFileSync('dist/'+f.full)).digest('hex'),f.sha256);assert(fs.existsSync('dist/'+f.file));}
const world=load('dist/data/world-land-sources.json');for(const iso of ['AUT','HUN','SVN']){assert(world.topology.atlasCodes.includes(iso));assert(!world.topology.backgroundCodes.includes(iso));}for(const country of Object.keys(definitions))assert(load('dist/data/globe-overview.json').countries.includes(country));
console.log('Central Europe:',pairs.size,'frontier pairs,',samples,'all-level shared-border samples, one stroke per edge, 39 retained flag originals, source hashes and globe integration passed.');
