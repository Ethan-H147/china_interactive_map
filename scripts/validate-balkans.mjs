import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,polygons,landIndex,linesOf,lineIndex,metres} from './geo-index.mjs';
import {segmentKey} from './frontier-arcs.mjs';
import {additions} from './balkans-config.mjs';
import {source,root} from './fetch-balkans.mjs';
const expected={albania:[12,61],serbia:[25,168],'north-macedonia':[8,80],bulgaria:[28,265],kosovo:[7,38],montenegro:[25,0]};
for(const name of Object.keys(load(root+'manifest.json').files))source(name);
for(const [country,c]of Object.entries(additions)){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),records=cat.records,ids=new Set(records.map(r=>r.id)),stats=load(base+'statistics.json');assert.equal(ids.size,records.length);assert.deepEqual([1,2].map(l=>records.filter(r=>r.level===l).length),expected[country],country+' hierarchy counts');
 for(const r of records){assert(!r.parent||ids.has(r.parent),r.id+' parent');assert(r.en&&r.areaKm2>0);if(r.parent)assert.equal(records.find(p=>p.id===r.parent).level,r.level-1);const s=stats.regions[country+':'+r.id];assert(s);if(s.population)assert(s.population.value>0,'No zero population placeholders');if(r.level>1)assert(!s.gdp,'No invented municipal GDP');if(s.gdp){assert(s.gdp.value>0&&s.gdpPerCapita.value>0);assert.equal(s.gdp.year,s.gdp.exchangeYear);}}
 for(const [parent,ch]of Object.entries(cat.chunks)){const d=load(base+ch.file);assert.equal(d.regions.features.length,ch.count);assert(d.selectionOutlines);for(const f of d.regions.features)assert.equal(records.find(r=>r.id===f.properties.id).parent,parent);}
 const national=stats.regions[country+':'+(c.worldbank||c.iso)];assert(national.population.value>0&&national.gdp.value>0&&national.gdpPerCapita.value>0,'Separately dated national facts');
 if(['bulgaria','north-macedonia'].includes(country)){const total=l=>records.filter(r=>r.level===l).reduce((s,r)=>s+stats.regions[country+':'+r.id].population.value,0);assert.equal(total(1),total(2),'Population rollup');assert.equal(total(1),country==='bulgaria'?6445481:1826247);}
 if(['albania','serbia'].includes(country))assert(records.filter(r=>r.level===2).every(r=>!stats.regions[country+':'+r.id].population),'Unavailable local population is absent');
 const first=load(base+'first.bin');assert(first.selectionOutlines);for(const f of first.regions.features){const r=records.find(r=>r.id===f.properties.id);assert(landIndex(polygons(f.geometry).flat())(r.center),'Label on land '+r.id);}
 assert(fs.existsSync('dist/vendor/flag-'+c.prefix+'.svg'));console.log(country,cat.counts,'hierarchy, source and statistics checks passed');
}
const me=load('dist/data/europe/montenegro/catalogue.bin');for(const name of ['Tuzi','Zeta','Podgorica','Cetinje'])assert(me.records.some(r=>r.en===name));assert(!Object.keys(me.chunks).length,'Montenegro municipalities are not duplicated');
const own=c=>landIndex(load('dist/data/europe/'+c+'/context.bin').features.flatMap(f=>polygons(f.geometry).flat()));const rs=own('serbia'),xk=own('kosovo');assert(xk([21.16,42.66])&&!rs([21.16,42.66]),'Pristina appears only in Kosovo');assert(rs([20.46,44.81])&&!xk([20.46,44.81]),'Belgrade appears only in Serbia');
console.log('All six Balkan additions validated.');
const canonical=load(root+'resolved.bin'),turkeyPath=canonical.features.find(f=>f.properties.pair==='BGR-TUR').geometry.coordinates,keys=new Set(turkeyPath.slice(1).map((p,i)=>segmentKey(turkeyPath[i],p))),seen=new Set();for(const path of linesOf(load('dist/data/europe/turkey/international.bin')))for(let i=1;i<path.length;i++){const k=segmentKey(path[i-1],path[i]);if(keys.has(k)){assert(!seen.has(k),'One Turkey–Bulgaria stroke per segment');seen.add(k);}}
const verified=load(root+'verified-junctions.json');assert.equal(verified.junctions.length,3);for(const j of verified.junctions)for(const iso of j.sides){const country=Object.keys(additions).find(c=>additions[c].iso===iso)||({ROU:'romania'})[iso],edge=lineIndex(load('dist/data/europe/'+country+'/context.bin').features.flatMap(f=>polygons(f.geometry).flat()));assert(edge(j.point)<5,'Complete retained junction on '+country+' outline');}
console.log('Verified shared junctions meet within five metres, and the Turkish border has no duplicated segments.');
