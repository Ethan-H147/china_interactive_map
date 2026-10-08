import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {brazilFlags} from '../dist/brazil-flags.mjs';
import {stateStatisticsKey} from '../dist/south-america.mjs';
const dir='scripts/statistics-sources/brazil/',file='dist/data/south-america/brazil-statistics.json',before=fs.readFileSync(file,'utf8');
execFileSync(process.execPath,['scripts/prepare-brazil-statistics.mjs']);assert.equal(fs.readFileSync(file,'utf8'),before);
const bundle=JSON.parse(before),raw=JSON.parse(fs.readFileSync(dir+'state-tables.json'));
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/brazil-first.bin'))).records;
const population=JSON.parse(fs.readFileSync(dir+'population-2026.json')).slice(1),gdp=JSON.parse(fs.readFileSync(dir+'gdp-2023.json')).slice(1);
assert.equal(Object.keys(bundle.regions).length,27);assert.equal(Object.keys(brazilFlags).length,27);
for(const f of JSON.parse(fs.readFileSync(dir+'manifest.json')).files)assert.equal(createHash('sha256').update(fs.readFileSync(dir+f.name)).digest('hex'),f.sha256);
const flagSources=JSON.parse(fs.readFileSync('dist/data/brazil-flag-sources.json'));
let bytes=0;
for(const r of records){
 const v=bundle.regions['brazil:'+r.id],code=r.id.slice(3),p=population.find(x=>x.D1C===code),g=gdp.find(x=>x.D1C===code);
 assert.equal(v.name,r.en);assert.equal(v.level,1);assert.equal(v.population.value,Number(p.V));assert.equal(p.D3C,'2026');assert.equal(p.MN,'Pessoas');assert.equal(v.population.date,'2026-07-01');
 assert.equal(v.area.value,raw.values[code].area);assert.equal(v.area.year,2025);assert.equal(v.area.method,'reported');assert.equal(v.area.unit,'km²');
 assert.equal(v.gdp.value,Number(g.V)*1000);assert.equal(g.MN,'Mil Reais');assert.equal(g.D3C,'2023');
 assert.equal(v.gdpPerCapita.value,raw.values[code].gdpPerCapita);assert.equal(v.gdpPerCapita.source,'ibge-per-capita');assert(!v.gdpPerCapita.method,'Published per capita is not computed using the newer 2026 population');
 for(const m of [v.gdp,v.gdpPerCapita]){assert.equal(m.year,2023);assert.equal(m.currency,'BRL');assert.equal(m.priceBasis,'current');assert.equal(m.exchangeYear,2023);assert.equal(m.exchangeRate,4.99437976287199);assert.equal(m.usd,m.value/m.exchangeRate);}
 for(const m of [v.population,v.area,v.gdp,v.gdpPerCapita])assert(bundle.sources[m.source].url.startsWith('https://'));
 const f=flagSources.flags[r.id];assert.equal(f.name,r.en);assert.equal(brazilFlags[r.id].file,f.file);assert.equal(brazilFlags[r.id].page,f.page);assert(f.license);assert(f.page.startsWith('https://commons.wikimedia.org/wiki/File:'));
 const original=fs.readFileSync(f.originalFile),image=fs.readFileSync('dist/'+f.file);assert.equal(createHash('sha256').update(original).digest('hex'),f.originalSha256);assert.equal(createHash('sha256').update(image).digest('hex'),f.sha256);
 const src=await sharp(original).metadata(),out=await sharp(image).metadata();assert.equal(out.width,320);assert(Math.abs(out.height/out.width-src.height/src.width)<.005);bytes+=image.length;
}
const all=Object.values(bundle.regions);assert.equal(all.reduce((n,r)=>n+r.population.value,0),214211951);assert(Math.abs(all.reduce((n,r)=>n+r.area.value,0)-8509360.85)<.005);assert(Math.abs(all.reduce((n,r)=>n+r.gdp.value,0)-raw.nationalGdp)<14000);
assert.equal(bundle.regions['brazil:BR-53'].gdpPerCapita.value,129790);assert.equal(bundle.regions['brazil:BR-35'].gdp.value,3444814033000);
assert.equal(flagSources.flags['BR-13'].designYear,2026);assert.equal((fs.readFileSync(flagSources.flags['BR-13'].originalFile,'utf8').match(/<path/g)||[]).length,65,'Amazonas: 3 fields and 62 stars, current July 2026 design');assert(bytes<160000);
assert(!Object.keys(bundle.regions).some(k=>k.length>12),'No municipality statistics or inherited totals');
assert.equal(stateStatisticsKey('brazil',{id:'BR-53',level:1}),'brazil:BR-53');
assert.equal(stateStatisticsKey('brazil',{id:'BR-5300108',level:2}),'');
assert.equal(stateStatisticsKey('brazil',{id:'BR-DDD-61',level:1},'ddd'),'');
assert.equal(stateStatisticsKey('brazil',{id:'BR-53',level:1},'cep'),'');
assert.equal(stateStatisticsKey('uruguay',{id:'UY-MO',level:1}),'');
assert.equal(stateStatisticsKey('brazil',null),'');
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
const parent=new Node('section'),anchor=new Node('p');parent.append(anchor);
let resolve,requests=0;globalThis.fetch=url=>{assert.equal(url,'data/south-america/brazil-statistics.json');requests++;return new Promise(done=>resolve=done);};
const {renderStatistics,clearStatistics}=await import('../dist/statistics.mjs');
const first=renderStatistics(anchor,'brazil:BR-35'),second=renderStatistics(anchor,'brazil:BR-53');resolve({ok:true,json:async()=>bundle});await Promise.all([first,second]);
assert.equal(requests,1);assert.match(parent.text,/2026 midyear estimate/);assert.match(parent.text,/GDP per capita/);assert.match(parent.text,/BRL 129,790/);assert.match(parent.text,/≈ USD 25,987/);assert.match(parent.text,/USD uses 2023 average conversion/);assert(!parent.text.includes('per person'));assert(!parent.text.includes('ARS'));
clearStatistics(anchor);assert(parent.children[1].hidden&&parent.children[2].hidden);
const fresh=await import('../dist/statistics.mjs?brazil-cancel'),late=fresh.renderStatistics(anchor,'brazil:BR-35');fresh.clearStatistics(anchor);resolve({ok:true,json:async()=>bundle});await late;assert(parent.children[1].hidden&&parent.children[2].hidden,'Country and municipality switches cancel late statistics');
console.log('Brazil: all 27 official state totals, years and units, source hashes, published GDP per capita, matching-year USD, authentic flags including current Amazonas, lazy caching and stale-selection cancellation passed.');
