import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {stateStatisticsKey} from '../dist/south-america.mjs';
const base='dist/data/south-america/uruguay-local/',read=file=>JSON.parse(gunzipSync(fs.readFileSync(file))),index=read(base+'index.bin'),first=read('dist/data/south-america/uruguay-first.bin'),metadata=JSON.parse(fs.readFileSync(base+'sources.json'));
const pointInRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const inside=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>pointInRing(p,poly[0])&&!poly.slice(1).some(r=>pointInRing(p,r)));
assert.equal(index.records.length,136);assert.equal(new Set(index.records.map(r=>r.id)).size,136);assert.equal(Object.keys(index.groups).length,19);assert.equal(metadata.count,136);assert.equal(metadata.referenceYear,2025);assert(fs.statSync(base+'index.bin').size<20000);
const counts=[3,32,16,13,2,1,3,6,8,8,9,3,3,4,6,4,5,4,6];let total=0,bytes=0;
for(const [i,parent] of first.records.entries()){
 const group=index.groups[parent.id],local=read(base+group.file);assert.equal(group.count,counts[i]);assert.equal(local.records.length,group.count);assert.equal(local.regions.features.length,group.count);total+=group.count;bytes+=group.bytes;assert(group.bytes<1500000&&group.decodedBytes<10000000);
 assert.equal(fs.statSync(base+group.file).size,group.bytes);
 for(const r of local.records){assert.equal(r.parent,parent.id);assert.equal(r.parentName,parent.en);assert.equal(r.level,2);assert.equal(r.kind,'Municipality');assert(r.code);assert.deepEqual(index.records.find(x=>x.id===r.id),r);assert(!r.population&&!r.gdp,'Municipalities never inherit department statistics');const feature=local.regions.features.find(f=>f.properties.id===r.id);assert(feature?.geometry);assert(inside(r.center,feature.geometry),r.en+' interior label');assert(local.lines.features.some(f=>f.properties.regionIds.includes(r.id)),r.en+' has an inland municipal perimeter');}
 for(const f of local.lines.features){assert.equal(f.properties.regionIds.length,2,'A line is shared with another municipality or nonmunicipal land, never a coast');assert(f.properties.regionIds.some(id=>local.records.some(r=>r.id===id)));assert(f.geometry.coordinates.length);}
}
assert.equal(total,136);assert(bytes<1000000);
const search=createPlaceSearch([...first.records,...index.records]);assert.equal(search('Punta del Este')[0].id,'UY-MUN-UYMAPDE');assert.equal(search('piriapolis')[0].id,'UY-MUN-UYMAPIR');assert.equal(search('Municipio A')[0].id,'UY-MUN-UYMOA');assert.equal(search('La Paz').filter(r=>r.level===2).length,2,'Same-named municipalities retain distinct departments');
const file='dist/data/south-america/uruguay-statistics.json',before=fs.readFileSync(file,'utf8');execFileSync(process.execPath,['scripts/prepare-uruguay-statistics.mjs']);assert.equal(fs.readFileSync(file,'utf8'),before);
const bundle=JSON.parse(before),raw=JSON.parse(fs.readFileSync('scripts/statistics-sources/uruguay/department-tables.json'));assert.equal(Object.keys(bundle.regions).length,19);assert.equal(createHash('sha256').update(fs.readFileSync('scripts/statistics-sources/uruguay/export-table.png')).digest('hex'),raw.tableSHA256);
for(const r of first.records){const v=bundle.regions['uruguay:'+r.id];assert.equal(v.name,r.en);assert.equal(v.population.value,raw.values[r.id].population);assert.equal(v.population.year,2024);assert.equal(v.area.value,raw.values[r.id].area);assert.equal(v.area.method,'reported');assert.equal(v.exports.value,raw.values[r.id].exports*1e6);assert.equal(v.exports.year,2025);assert.equal(v.exports.currency,'USD');assert.equal(v.exports.label,'Goods exports');assert(!v.gdp&&!v.gdpPerCapita,'Exports cannot be labeled as GDP');assert.equal(stateStatisticsKey('uruguay',r),'uruguay:'+r.id);for(const metric of [v.population,v.area,v.exports])assert(bundle.sources[metric.source].url.startsWith('https://'));}
assert.equal(Object.values(bundle.regions).reduce((s,r)=>s+r.population.value,0),3491765,'Preserve published departmental counts; their sum is 1 above the printed total');assert.equal(Object.values(bundle.regions).reduce((s,r)=>s+r.area.value,0),175016);assert.equal(bundle.regions['uruguay:UY-MO'].population.value,1288788);assert.equal(bundle.regions['uruguay:UY-MO'].exports.value,1937e6);assert.equal(stateStatisticsKey('uruguay',index.records[0]),'');
class Node{
 constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 after(node){const parent=this.parentElement;if(node.parentElement){const old=node.parentElement.children;old.splice(old.indexOf(node),1);}node.parentElement=parent;parent.children.splice(parent.children.indexOf(this)+1,0,node);}
 setAttribute(){}querySelector(selector){const name=selector.split('.').at(-1);return this.children.find(n=>n.className?.split(' ').includes(name));}
 get text(){return this.textContent+' '+this.children.map(n=>n.text).join(' ');}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text)};
const parent=new Node('section'),anchor=new Node('p');parent.append(anchor);let resolve,requests=0;
globalThis.fetch=url=>{assert.equal(url,'data/south-america/uruguay-statistics.json');requests++;return new Promise(done=>resolve=done);};
const {renderStatistics,clearStatistics}=await import('../dist/statistics.mjs');
const old=renderStatistics(anchor,'uruguay:UY-MA'),latest=renderStatistics(anchor,'uruguay:UY-MO');resolve({ok:true,json:async()=>bundle});await Promise.all([old,latest]);assert.equal(requests,1);assert.match(parent.text,/1,288,788/);assert.match(parent.text,/2024 estimate · 2025 revision/);assert.match(parent.text,/530 km²/);assert.match(parent.text,/Goods exports/);assert.match(parent.text,/USD 1.94 billion/);assert(!parent.text.includes('USD conversion unavailable'));
clearStatistics(anchor);assert(parent.children[1].hidden&&parent.children[2].hidden,'Municipal selection hides department statistics');
console.log('Uruguay: 136 official 2025 municipalities, 19 department chunks, coast-free inland perimeters including nonmunicipal land, interior labels, name collisions and budgets passed.');
console.log('Uruguay: all 19 sourced population and land areas, distinct 2025 goods exports in USD, retained source rounding and statistics scope passed.');
