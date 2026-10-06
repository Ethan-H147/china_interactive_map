import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const names=['indonesia','philippines'],files=names.map(n=>'dist/data/archipelago/'+n+'-statistics.json');
const before=files.map(f=>fs.readFileSync(f,'utf8'));
execFileSync(process.execPath,['scripts/prepare-archipelago-statistics.mjs']);
files.forEach((f,i)=>assert.equal(fs.readFileSync(f,'utf8'),before[i],'Official snapshots reproduce province statistics'));
const bundles=Object.fromEntries(names.map((n,i)=>[n,JSON.parse(before[i])]));
for(const [country,count,level,currency] of [['indonesia',38,1,'IDR'],['philippines',82,2,'PHP']]){
 const data=bundles[country],records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/archipelago/'+country+'-catalogue.bin'))).records.filter(r=>r.level===level&&!r.special);
 assert.equal(Object.keys(data.regions).length,count);assert(before[names.indexOf(country)].length<160000,'Country facts remain small and load independently');
 for(const division of records){const r=data.regions[country+':'+division.id];assert.equal(r.name,division.en);assert(r.population.value>0&&r.area.value>0);assert.equal(r.area.unit,'km²');assert.equal(r.population.method,country==='indonesia'?'projection':'census');
  for(const field of ['population','area','gdp','gdpPerCapita']){const m=r[field];assert(m&&Number.isFinite(m.value)&&m.value>0);assert(data.sources[m.source]?.url);}
  for(const field of ['gdp','gdpPerCapita']){const m=r[field];assert.equal(m.year,2025);assert.equal(m.currency,currency);assert(Math.abs(m.value/m.exchangeRate-m.usd)<1e-5);assert(data.sources[m.exchangeSource]);}
  assert(r.gdp.value>r.gdpPerCapita.value*10000,'GDP table units cannot be mistaken for pesos or rupiah');
 }
}
const aceh=bundles.indonesia.regions['indonesia:ID11'];assert.equal(aceh.gdp.value,257502.43e9);assert.equal(aceh.gdpPerCapita.value,45770.40e3);assert.equal(aceh.population.year,2026);
const basilan=bundles.philippines.regions['philippines:PH19007'];assert.match(basilan.note,/Isabela City.*excluded/);assert.equal(basilan.population.year,2024);assert.equal(basilan.area.year,undefined);assert.match(basilan.area.period,/2019/);
assert.equal(Object.values(bundles.philippines.regions).filter(r=>r.name.startsWith('Maguindanao')).length,2);
const manifest=JSON.parse(fs.readFileSync('scripts/statistics-sources/archipelago/manifest.json','utf8'));
for(const file of manifest.files)assert.equal(createHash('sha256').update(fs.readFileSync('scripts/statistics-sources/archipelago/'+file.name)).digest('hex'),file.sha256,file.name+' source snapshot');
// Real renderer: separate requests, caching, population order and cancellation.
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
const parent=new Node('section'),anchor=new Node('p');parent.append(anchor);
const deferred=new Map(),requests=[];globalThis.fetch=url=>{requests.push(url);return new Promise(resolve=>deferred.set(url,resolve));};
const {renderStatistics,clearStatistics}=await import('../dist/statistics.mjs');
const a=renderStatistics(anchor,'indonesia:ID11'),b=renderStatistics(anchor,'philippines:PH19007');
assert.deepEqual(requests,names.map(n=>'data/archipelago/'+n+'-statistics.json'),'No other countries or geometry load with province facts');
for(const country of names)deferred.get('data/archipelago/'+country+'-statistics.json')({ok:true,json:async()=>bundles[country]});
await Promise.all([a,b]);assert.match(parent.text,/PHP/);assert(!parent.text.includes('IDR'),'Older country request must not replace newer selection');
assert.deepEqual(parent.children.slice(1).map(n=>n.className),['population archipelago-population','region-statistics']);assert.match(parent.children[1].text,/2024 census/);
await renderStatistics(anchor,'indonesia:ID11');assert.equal(requests.length,2,'Each country is cached');assert.match(parent.children[1].text,/2026 midyear projection/);
clearStatistics(anchor);assert(parent.children[1].hidden&&parent.children[2].hidden);
const another=await import('../dist/statistics.mjs?cancel');const delayed=another.renderStatistics(anchor,'philippines:PH19007');another.clearStatistics(anchor);deferred.get('data/archipelago/philippines-statistics.json')({ok:true,json:async()=>bundles.philippines});await delayed;assert(parent.children[1].hidden&&parent.children[2].hidden,'Leaving or selecting an unsupported division cancels late statistics');
console.log('38 Indonesian / 82 Philippine provinces: official coverage, exact units, same-year USD, source hashes, reproducibility, lazy loading, population order and stale-selection cancellation passed.');
