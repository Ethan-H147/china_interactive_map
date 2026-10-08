import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const path='dist/data/southeast-asia/malaysia-statistics.json',before=fs.readFileSync(path,'utf8');
execFileSync(process.execPath,['scripts/prepare-malaysia-statistics.mjs']);assert.equal(fs.readFileSync(path,'utf8'),before);
const bundle=JSON.parse(before),records=Object.values(bundle.regions),catalogue=JSON.parse(gunzipSync(fs.readFileSync('dist/data/southeast-asia/malaysia-catalogue.bin')));
assert.equal(records.length,16);assert.equal(records.reduce((sum,r)=>sum+r.area.value,0),330803);
for(const r of catalogue.records.filter(r=>r.level===1)){
 const stat=bundle.regions['malaysia:'+r.id];assert.equal(stat.name,r.en);
 assert(stat.population.value>100000&&stat.population.value<8e6);assert.equal(stat.population.year,2026);assert.equal(stat.population.method,'estimate');
 assert.equal(stat.area.year,2024);assert.equal(stat.area.unit,'km²');assert.equal(stat.realGdp.year,2025);assert.equal(stat.realGdp.currency,'MYR');assert.equal(stat.realGdp.priceBasis,'constant');assert.equal(stat.realGdp.baseYear,2015);assert(!stat.realGdp.usd);assert(!stat.gdp);
 for(const metric of [stat.population,stat.area,stat.realGdp])assert(bundle.sources[metric.source].url.startsWith('https://'));
}
assert.equal(bundle.regions['malaysia:MY-01'].realGdp.value,170947488000);
assert.equal(bundle.regions['malaysia:MY-16'].realGdp.value,14365914000,'Use the separate Putrajaya series in the July 2026 release');
assert.equal(bundle.regions['malaysia:MY-01'].population.value,4224300,'Population in thousands must be converted once');
for(const file of JSON.parse(fs.readFileSync('scripts/statistics-sources/malaysia/manifest.json')).files)assert.equal(createHash('sha256').update(fs.readFileSync('scripts/statistics-sources/malaysia/'+file.name)).digest('hex'),file.sha256);
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
let resolve,requests=0;globalThis.fetch=url=>{assert.equal(url,'data/southeast-asia/malaysia-statistics.json');requests++;return new Promise(done=>resolve=done);};
const {renderStatistics,clearStatistics}=await import('../dist/statistics.mjs');
const first=renderStatistics(anchor,'malaysia:MY-01'),second=renderStatistics(anchor,'malaysia:MY-16');resolve({ok:true,json:async()=>bundle});await Promise.all([first,second]);
assert.equal(requests,1);assert.match(parent.text,/121,400/);assert.match(parent.text,/2026 midyear estimate/);assert.match(parent.text,/Real GDP/);assert.match(parent.text,/MYR 14.37 billion/);assert.match(parent.text,/constant 2015 MYR/);assert(!parent.text.includes('ARS'));
clearStatistics(anchor);assert(parent.children[1].hidden&&parent.children[2].hidden);
const fresh=await import('../dist/statistics.mjs?malaysia-cancel'),late=fresh.renderStatistics(anchor,'malaysia:MY-01');fresh.clearStatistics(anchor);resolve({ok:true,json:async()=>bundle});await late;assert(parent.children[1].hidden&&parent.children[2].hidden,'Clearing a state cancels late data');
console.log('Malaysia: all 16 divisions, exact official units, dates and sources, separate Putrajaya, reproducibility, lazy cache and stale-selection checks passed.');
