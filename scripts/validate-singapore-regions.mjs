import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {singaporeLabel} from '../dist/singapore-languages.mjs';
const base='dist/data/southeast-asia/',read=file=>JSON.parse(gunzipSync(fs.readFileSync(base+file)));
const catalogue=read('singapore-catalogue.bin'),first=read('singapore-first.bin'),statistics=JSON.parse(fs.readFileSync(base+'singapore-statistics.json'));
const index=new Map(catalogue.records.map(r=>[r.id,r]));assert.equal(index.size,61);assert.equal(Object.keys(statistics.regions).length,60);
const published=JSON.parse(fs.readFileSync('scripts/additional-sources/singapore/population-totals-2026.json')).values;
const areas=[];
for(const [id,chunk] of Object.entries(catalogue.chunks)){
 assert.equal(index.get(id).level,1);const bytes=fs.readFileSync(base+chunk.file);assert.equal(bytes.length,chunk.bytes);assert(bytes.length<300000,'Bounded region download');
 const data=read(chunk.file);assert.equal(data.regions.features.length,chunk.count);
 for(const f of data.regions.features){assert.equal(f.properties.parent,id);assert.equal(index.get(f.properties.id).parent,id);areas.push(f);}
 for(const line of data.boundaries.features){assert.equal(line.properties.owners.length,2);assert(line.properties.owners.some(owner=>index.get(owner).parent===id));assert(line.geometry.coordinates.length>0);}
}
assert.equal(areas.length,55);assert.equal(new Set(areas.map(f=>f.properties.id)).size,55);
const raw=JSON.parse(fs.readFileSync('scripts/additional-sources/singapore/planning-areas-2025.geojson'));
for(const f of areas)assert.deepEqual(f.geometry,raw.features.find(r=>'SG-'+r.properties.PLN_AREA_C===f.properties.id).geometry,'Preserve all official boundary vertices');
const top=topology({regions:{type:'FeatureCollection',features:areas}}),expected=mesh(top,top.objects.regions,(a,b)=>a!==b);
const segments=geometry=>geometry.coordinates.flatMap(path=>path.slice(1).map((b,i)=>[JSON.stringify(path[i]),JSON.stringify(b)].sort().join('|')));
const expectedSegments=new Set(segments(expected));
for(const chunk of Object.values(catalogue.chunks))for(const line of read(chunk.file).boundaries.features)for(const s of segments(line.geometry))assert(expectedSegments.has(s),'No exterior coastlines in planning-area borders');
for(const record of catalogue.records.filter(r=>r.level>0)){
 for(const lang of ['en','zh','ms','ta']){assert(record.names[lang]);assert.equal(singaporeLabel(record,lang),record.names[lang]);assert(createPlaceSearch(catalogue.records)(record.names[lang]).some(r=>r.id===record.id),'Search '+record.id+' '+lang);}
 assert(/[\u4e00-\u9fff]/.test(record.names.zh));assert(/[\u0b80-\u0bff]/.test(record.names.ta));
 const stat=statistics.regions['singapore:'+record.id];assert(stat.area.value>0);assert.equal(stat.area.year,2025);assert.equal(stat.population.year,2026);assert.equal(stat.population.date,'2026-06');assert(!stat.gdp&&!stat.realGdp);
 if(record.level===2){const expected=published[record.en.toUpperCase()];assert.equal(stat.population.value,expected==='-'?0:expected,'Official planning-area population '+record.en);}
 assert.match(stat.population.coverageNote,/Non-residents are excluded/);
}
assert.equal(statistics.regions['singapore:SG-TM'].population.value,296060);assert.equal(statistics.regions['singapore:SG-CR'].population.value,991270);assert.equal(statistics.regions['singapore:SG-CC'].population.displayValue,'Nil or negligible');
const mainland=first.regions.features;assert.equal(mainland.length,5);assert.equal(mainland.find(f=>f.properties.id==='SG-CR').properties.parent,'SG');
console.log('Singapore: all 5 regions and 55 planning areas, four-language labels/search, exact URA geometry, internal borders only, bounded downloads and matched 2026 population / 2025 boundaries passed.');
const review=JSON.parse(fs.readFileSync(base+'singapore-population-review.json'));assert.equal(review.planningAreasChecked,55);assert.equal(review.independentTables.length,2);assert.equal(review.focus['Boon Lay Place subzone within Jurong West'],29360);
class Node{
 constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 after(node){const parent=this.parentElement;if(node.parentElement){const old=node.parentElement.children;old.splice(old.indexOf(node),1);}node.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,node);}
 setAttribute(){}
 querySelector(selector){const name=selector.split('.').at(-1);return this.children.find(n=>n.className?.split(' ').includes(name));}
 get text(){return this.textContent+' '+this.children.map(n=>n.text).join(' ');}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
const {renderStatistics}=await import('../dist/statistics.mjs');
for(const [id,value] of [['SG-PN','50'],['SG-BL','30']]){
 const parent=new Node('section'),anchor=new Node('p');parent.append(anchor);let chosen;
 await renderStatistics(anchor,'singapore:'+id,statistics,{onRelatedPlace:id=>chosen=id});
 const population=parent.children.find(n=>n.className?.includes('archipelago-population'));
 assert.equal(population.children.find(n=>n.className==='population-total').text.trim(),value);assert.match(population.text,/industrial/);assert.match(population.text,/Jurong West/);assert.match(population.text,/Non-residents are excluded/);assert.equal(index.get(id).kind,'Industrial planning area');
 population.children.find(n=>n.tag==='button').onclick();assert.equal(chosen,'SG-JW');assert.equal(index.get(chosen).en,'Jurong West');assert(!parent.text.includes('Economy'));
}
console.log('Singapore population: industrial-area explanations are visible beside the resident count and lead to residential Jurong West.');
