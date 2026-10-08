import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const path='dist/data/south-america/argentina-statistics.json',before=fs.readFileSync(path,'utf8');
execFileSync(process.execPath,['scripts/prepare-argentina-statistics.mjs']);assert.equal(fs.readFileSync(path,'utf8'),before);
const data=JSON.parse(before),tables=JSON.parse(fs.readFileSync('scripts/statistics-sources/argentina/tables.json','utf8'));
const divisions=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/argentina-first.bin'))).records;
assert.equal(Object.keys(data.regions).length,24);assert(before.length<65000,'Statistics remain a small independent request');
assert.equal(Object.values(data.regions).reduce((n,r)=>n+r.population.value,0),46466688);
const ascii=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
for(const d of divisions){
 const r=data.regions['argentina:'+d.id],raw=tables.regions[d.id];assert.equal(r.name,d.en);assert.equal(r.level,1);
 assert.equal(ascii(raw.realGvaSourceName),ascii(d.id==='AR-02'?'Ciudad de Buenos Aires':d.en),'Economic row must belong to the right province');
 assert.equal(r.population.year,2026);assert.equal(r.population.date,'2026-07-01');assert.equal(r.population.method,'projection');assert.equal(r.population.value,raw.population['2026']);
 assert.equal(r.area.unit,'km²');assert.equal(r.area.value,raw.area);assert.equal(r.area.method,'reported');assert.equal(r.area.year,2022);
 assert.equal(r.realGva.priceBasis,'constant');assert.equal(r.realGva.baseYear,2004);assert.equal(r.realGva.year,2024);assert.equal(r.realGva.usd,undefined);assert.equal(r.realGvaPerCapita.value,r.realGva.value/raw.population['2024']);
 for(const field of ['population','area','realGva','realGvaPerCapita','gdp','gdpPerCapita']){
  const m=r[field];if(!m)continue;assert(m.value>0&&Number.isFinite(m.value));assert(data.sources[m.source]?.url);
  if(m.priceBasis==='current'){assert.equal(m.currency,'ARS');assert.equal(m.usd,m.value/m.exchangeRate);assert(data.sources[m.exchangeSource]);}
 }
 if(r.gdpPerCapita?.method==='calculated'){assert.equal(r.gdpPerCapita.populationYear,r.gdp.year);assert.equal(r.gdpPerCapita.value,r.gdp.value/raw.population[String(r.gdp.year)]);}
 assert(!data.regions['argentina:'+d.id+'001'],'No provincial totals attached to departments or comunas');
}
assert.equal(data.coverage.gdp,8);assert(Math.abs(data.regions['argentina:AR-02'].gdp.value-96597590.46259835e6)<1,'Published XLSX total retains sub-peso precision across Python and JavaScript');
assert.equal(data.regions['argentina:AR-94'].area.value,20698.3);assert.match(data.regions['argentina:AR-94'].area.note,/Excludes Antarctic/);
assert.equal(data.regions['argentina:AR-82'].gdp.year,2025);assert.equal(data.regions['argentina:AR-82'].gdpPerCapita.value,19870307);assert.equal(data.regions['argentina:AR-82'].gdpPerCapita.method,'published');
for(const [file,source]of Object.entries(tables.files))if(fs.existsSync('scripts/statistics-sources/argentina/'+file))assert.equal(createHash('sha256').update(fs.readFileSync('scripts/statistics-sources/argentina/'+file)).digest('hex'),source.sha256,file+' source hash');
class Node{
 constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 after(node){const parent=this.parentElement;if(node.parentElement){const old=node.parentElement.children;old.splice(old.indexOf(node),1);}node.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,node);}
 setAttribute(){}
 querySelector(selector){const name=selector.split('.').at(-1);return this.children.find(n=>n.className?.split(' ').includes(name));}
 get text(){return this.textContent+' '+this.children.map(n=>n.text).join(' ');}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
const deferred=new Map(),requests=[];globalThis.fetch=url=>{requests.push(url);return new Promise(resolve=>deferred.set(url,resolve));};
const module=await import('../dist/statistics.mjs?argentina');const parent=new Node('section'),anchor=new Node('div');parent.append(anchor);
assert.equal(requests.length,0,'Importing the renderer does not fetch Argentina');
const a=module.renderStatistics(anchor,'argentina:AR-02'),b=module.renderStatistics(anchor,'argentina:AR-14');
assert.deepEqual(requests,['data/south-america/argentina-statistics.json'],'Only Argentina facts requested, once');
deferred.get(requests[0])({ok:true,json:async()=>data});await Promise.all([a,b]);
assert.match(parent.text,/3,968,336/);assert(!parent.text.includes('96.6 trillion'),'Late Buenos Aires response must not replace Córdoba');
assert.deepEqual(parent.children.slice(1).map(n=>n.className),['population archipelago-population','region-statistics']);
const panel=parent.children[2],economy=panel.children.find(n=>n.className==='statistics-economy');
assert.match(economy.text,/GDP has not yet been verified/);assert.match(economy.text,/Economic output/);assert.match(economy.text,/Output per person/);assert.match(economy.text,/2004 peso values/);assert(!economy.text.includes('Not available'),'No redundant missing GDP rows');assert(!/GVA|gross value added|PBG/.test(economy.text),'Accounting jargon stays in the expandable details');assert(!economy.text.includes('USD'),'Constant-price output must never imply current USD');
await module.renderStatistics(anchor,'argentina:AR-02');assert.equal(requests.length,1);assert.match(parent.text,/3,065,991/);assert.match(parent.text,/≈ USD/);assert.match(parent.text,/2024.*calculated/);assert.match(parent.text,/3,093,735 \(2024\)/);
const gdpEconomy=panel.children.find(n=>n.className==='statistics-economy');assert.match(gdpEconomy.text,/GDP per person/);assert(!/GVA|gross value added|PBG|2004/.test(gdpEconomy.text),'GDP provinces show only the primary economic figures');const details=panel.children.find(n=>n.className==='statistics-details');assert.match(details.text,/PBG is Argentina/);assert.match(details.text,/Gross value added/);assert(details.text.includes(module.formatMoney(data.regions['argentina:AR-02'].realGva.value,'ARS')),'Alternative output remains available in details');assert(!details.text.includes('undefined'),'Every detail has a valid unit');
module.clearStatistics(anchor);assert(parent.children[1].hidden&&panel.hidden);
const delayedModule=await import('../dist/statistics.mjs?argentina-cancel');const delayed=delayedModule.renderStatistics(anchor,'argentina:AR-06');delayedModule.clearStatistics(anchor);deferred.get(requests[0])({ok:true,json:async()=>data});await delayed;assert(parent.children[1].hidden&&panel.hidden,'Selecting a subdivision or leaving cancels late statistics');
const retryModule=await import('../dist/statistics.mjs?argentina-retry');const failed=retryModule.renderStatistics(anchor,'argentina:AR-02');deferred.get(requests[0])({ok:false});await failed;assert.match(panel.text,/Retry/);const retry=panel.children.find(n=>n.tag==='button').onclick();deferred.get(requests[0])({ok:true,json:async()=>data});await retry;assert.match(parent.text,/3,065,991/);
const portal=fs.readFileSync('dist/south-america.mjs','utf8');assert.match(portal,/active==='argentina'&&record\?\.level===1\)renderStatistics/);assert.match(portal,/leave\(\)\{clearStatistics/);
console.log('24 Argentine jurisdictions: identity, projections, reported area, real/nominal distinction, same-year USD/per capita, sources, reproducibility, demand loading, population order, cancellation and retry passed.');
