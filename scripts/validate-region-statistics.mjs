import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {readData} from './read-data.mjs';
import {formatMoney,renderStatistics} from '../dist/statistics.mjs';
const path=new URL('../dist/data/region-statistics.json',import.meta.url),before=fs.readFileSync(path,'utf8');
execFileSync(process.execPath,['scripts/prepare-region-statistics.mjs']);
assert.equal(fs.readFileSync(path,'utf8'),before,'Retained source snapshots reproduce the dataset');
const d=JSON.parse(before),regions=d.regions;
const cn=readData('display-boundaries.json');for(const f of [...cn.provinces.features,...cn.subdivisions.features])assert(regions['china:'+f.properties.adcode],'Every China division has a record');
for(const country of ['korea','mongolia']){const b=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/'+country+'-boundaries.bin',import.meta.url))));for(const f of [...b.first.features,...b.second.features])assert(regions[country+':'+f.properties.id],'Every first/second-level division has a record');}
for(const [key,r] of Object.entries(regions)){
 assert(r.name&&r.area.value>0&&r.area.value<2e6,key+' valid area');assert.equal(r.area.unit,'km²');assert(['mapped','reported'].includes(r.area.method));
 for(const metric of ['area','gdp','gdpPerCapita']){const m=r[metric];if(!m)continue;assert(d.sources[m.source]?.url,key+' source');if(metric==='area')continue;assert(Number.isInteger(m.year)&&m.year>=2000&&m.year<=2025);assert(m.value>0&&m.usd>0);assert(d.sources[m.exchangeSource]);assert(Math.abs(m.value/m.exchangeRate-m.usd)<Math.max(1,m.usd*1e-10));if(metric==='gdpPerCapita')assert(m.value<1e8);}
 if(r.country==='KP')assert(!r.gdp&&!r.gdpPerCapita,'North Korean regional GDP must remain unestimated');
 if(r.country==='MN'&&r.level===2)assert(!r.gdp,'No allocation of aimag GDP to soums');
}
assert.equal(regions['china:310000'].gdp.value,5670871e6);
assert.equal(regions['korea:KR-30'].gdp.value,56.3e12,'Daejeon trillion/billion error excluded');
assert.equal(regions['korea:KR-12'].gdp.value,158.8e12);assert(!regions['korea:KR-12'].gdpPerCapita,'Do not average predecessor per-capita GDP');
assert.equal(regions['mongolia:MN-11'].gdp.value,62846257.1e6);assert.equal(regions['mongolia:MN-11'].gdpPerCapita.value,37461000);
assert.equal(regions['china:810000'].gdp.currency,'HKD');assert.equal(regions['china:820000'].gdp.currency,'MOP');assert.equal(regions['china:710000'].gdp.currency,'TWD');
assert.notEqual(regions['china:341300'].gdp.value,regions['china:320500'].gdp.value,'Suzhou names must stay within their own provinces');
assert(regions['china:540300'].gdp,'Chamdo/Qamdo matched');
assert.match(formatMoney(62846257.1e6,'MNT'),/^MNT 62\.85 trillion$/);assert.equal(formatMoney(37461000,'MNT',true),'MNT 37,461,000');
// Exercise delayed selection and network failure without the map renderer.
class Node{constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};}append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}setAttribute(){}after(panel){this.parentElement.panel=panel;panel.parentElement=this.parentElement;}querySelector(){return this.panel;}get text(){return this.textContent+this.children.map(c=>c.text||'').join(' ');}}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
const parent=new Node('div'),anchor=new Node('div');anchor.parentElement=parent;
let finish,requests=0;globalThis.fetch=()=>{requests++;return new Promise(resolve=>{finish=resolve;});};
const first=renderStatistics(anchor,'china:310000'),second=renderStatistics(anchor,'mongolia:MN-11');assert.equal(requests,1,'Concurrent selections share one request');
finish({ok:true,json:async()=>d});await Promise.all([first,second]);assert.equal(parent.panel.dataset.region,'mongolia:MN-11');assert.match(parent.panel.text,/MNT 62\.85 trillion/);assert(!parent.panel.text.includes('CNY'),'A stale selection must not overwrite the panel');
await renderStatistics(anchor,'korea:KR-12');assert.match(parent.panel.text,/Not available/);assert.match(parent.panel.text,/predecessor/);
const retryModule=await import('../dist/statistics.mjs?retry-test');let attempts=0;globalThis.fetch=async()=>{attempts++;if(attempts===1)throw Error('offline');return{ok:true,json:async()=>d};};await retryModule.renderStatistics(anchor,'china:310000');assert.match(parent.panel.text,/could not load/);await retryModule.renderStatistics(anchor,'china:310000');assert.match(parent.panel.text,/CNY 5\.67 trillion/);assert.equal(attempts,2);
console.log('Statistics: complete region coverage, reproducibility, source/units, conversions, name disambiguation, stale selection and retry checks passed.');
