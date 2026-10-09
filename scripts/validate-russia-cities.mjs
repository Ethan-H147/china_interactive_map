import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {russiaCityFlags,russiaCityIds} from '../dist/russia-cities.mjs';
import {renderStatistics} from '../dist/statistics.mjs';
const raw=JSON.parse(fs.readFileSync('scripts/statistics-sources/russia/cities.json'));
const stats=JSON.parse(fs.readFileSync('dist/data/russia/statistics.json'));
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/russia/catalogue.bin'))).records;
const evidence=gunzipSync(fs.readFileSync('scripts/statistics-sources/russia/city-population.html.gz'));
assert.equal(createHash('sha256').update(evidence).digest('hex'),raw.sourceSha256);
assert.equal(russiaCityIds.size,raw.cities.length);assert(russiaCityIds.size>220);
assert(Object.keys(russiaCityFlags).length>200,'Available major-city flags are bundled locally');
assert.equal(Object.values(stats.regions).filter(r=>r.level===1).length,83);
for(const c of raw.cities){
 const record=records.find(r=>r.id===c.id),card=stats.regions['russia:'+c.id];
 assert.equal(record.parent,c.parent);assert.equal(record.level,2);assert(!/район/i.test(record.local));
 assert.equal(card.population.value,c.population);assert.equal(card.population.year,2021);assert.equal(card.population.scopeNote,'City proper');
 assert(!card.area&&!card.gdp&&!card.gdpPerCapita,'A city cannot inherit oblast statistics');
 if(c.flag){assert.deepEqual(russiaCityFlags[c.id],c.flag);const bytes=fs.readFileSync('dist/'+c.flag.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),c.flag.sha256);}
}
const tyumen='russia:RU-D-55944525718876';
assert.equal(stats.regions[tyumen].population.value,847488);assert(russiaCityFlags[tyumen.slice(7)]);
assert.equal(stats.regions['russia:RU-D-18253095483754'].population.value,1633595);
assert(!stats.regions['russia:RU-D-91773725927909'],'Tyumensky District does not receive Tyumen city population');
// Population-only records use the existing card without empty economy or area sections.
class Node{constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}setAttribute(){}after(node){node.parentElement=this.parentElement;this.parentElement.children.push(node);}querySelector(selector){return this.children.find(n=>(n.className||'').split(' ').some(c=>c&&selector.includes('.'+c)));}get text(){return this.textContent+this.children.map(n=>n.text||'').join(' ');}}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('text',text)};
const parent=new Node('div'),anchor=new Node('div');anchor.parentElement=parent;parent.children.push(anchor);
await renderStatistics(anchor,tyumen,stats);
const pop=parent.querySelector('.archipelago-population'),other=parent.querySelector('.region-statistics');
assert(!pop.hidden);assert.match(pop.text,/847,488/);assert.match(pop.text,/2021 census/);assert.match(pop.text,/City proper/);
assert(other.hidden);assert(!parent.text.includes('Not available'));
await renderStatistics(anchor,'russia:RU-TYU',stats);assert(!other.hidden);assert.match(other.text,/GDP/);
console.log(`Russia city cards: ${russiaCityIds.size} exact city matches, ${Object.keys(russiaCityFlags).length} pinned local flags, census scope, distinct raions, and population-only rendering passed.`);
