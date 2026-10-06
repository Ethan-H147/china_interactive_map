import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lineData} from '../dist/adaptive-lines.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {fromHash,hashFor} from '../dist/view-state.mjs';
import {searchOptions} from '../dist/japan.mjs';
const read=file=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+file+'.bin')));
const catalogue=read('japan-local/catalogue'),overview=read('japan-boundaries'),records=catalogue.records,index=new Map(records.map(p=>[p.id,p]));
assert.equal(catalogue.municipalities-catalogue.claimed,1741);
assert.equal(catalogue.claimed,6);assert.equal(catalogue.wards,171);
assert.equal(index.size,1918);assert.equal(Object.keys(catalogue.chunks).length,47);
const prefIds=new Set(overview.first.features.map(f=>f.properties.id));
for(const p of records){assert(p.en&&!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(p.en));assert(p.ja&&p.bounds.flat().every(Number.isFinite));assert(p.level===2?prefIds.has(p.parent):index.get(p.parent)?.kind==='Designated city');}
const geometryIds=new Set();let vertices=0;
function walk(c){if(typeof c[0]==='number'){assert(c.every(Number.isFinite));vertices++;}else c.forEach(walk);}
for(const [id,entry]of Object.entries(catalogue.chunks)){
 assert(entry.bytes<2*1024*1024);assert(entry.decodedBytes<12*1024*1024);
 const chunk=read('japan-local/'+entry.file.replace('.bin',''));assert.equal(chunk.first.features.length,1);assert.equal(chunk.first.features[0].properties.id,id);
 for(const f of [...chunk.second.features,...chunk.wards.features]){assert(index.has(f.properties.id));assert(!geometryIds.has(f.properties.id));geometryIds.add(f.properties.id);assert(f.geometry?.coordinates?.length);walk(f.geometry.coordinates);}
 assert.equal(chunk.second.features.length,records.filter(p=>p.level===2&&p.parent===id).length);
}
assert.equal(geometryIds.size,index.size);assert(vertices>700000,'Retain detailed municipal coastlines and borders');
assert.equal(records.filter(p=>p.parent==='JP-13'&&p.kind==='Special ward').length,23);
assert.equal(records.filter(p=>p.parent==='JP-14'&&p.level===2).length,33);
assert.equal(records.filter(p=>p.parent==='JP-14100').length,18);
for(const [pref,count]of [['JP-04',35],['JP-10',35],['JP-15',30],['JP-13',62]])assert.equal(records.filter(p=>p.parent===pref).length,count,'Retain every municipality in '+pref);
for(const name of ['Chuo','Natori','Tomiya','Tsumagoi','Kusatsu','Sekikawa','Miyake','Hachijo','Sue'])assert(records.some(p=>p.en===name));
const search=createPlaceSearch(records,searchOptions);assert.equal(search('Yokohama')[0].id,'JP-14100');assert.equal(search('新宿区')[0].id,'JP-13104');assert.equal(search('Yokohama Naka')[0].id,'JP-14104');assert.equal(search('Yokohama Town')[0].id,'JP-02406');
const shared={v:1,country:'japan',center:[139.7,35.7],zoom:11,selection:'JP-14104',mode:2,layers:{'j-second-layer':false}};assert.equal(fromHash(hashFor(shared)).selection,shared.selection);assert.equal(fromHash(hashFor(shared)).layers['j-second-layer'],false);

// Run the actual country controller with deferred workers and a small map/DOM
// adapter. This exercises races and budgets without relying on GPU timing.
const elements=new Map();
class Element{constructor(){this.children=[];this.hidden=false;this.checked=true;this.value='';this.dataset={};this.attributes={};this.scrollTop=0;}append(...v){this.children.push(...v);}replaceChildren(...v){this.children=v;}setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}querySelector(selector){return selector.includes('region-statistics')?null:this;}insertBefore(){}addEventListener(){}remove(){} removeAttribute(k){delete this[k];} }
const el=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
globalThis.document={createElement:()=>new Element(),getElementById:el,querySelector:el};globalThis.Option=class extends Element{constructor(text,value){super();this.textContent=text;this.value=value;}};
let labels=[];globalThis.window={AtlasLabels:{render:(_map,items)=>{labels=items;return [];}},AtlasStatistics:{renderStatistics(){}},AtlasMotion:{setFeatureState(){},queryRegions:()=>[]}};
el('satellite-layer').checked=false;el('satellite-opacity').value='100';
const fetched=[];globalThis.fetch=async url=>{fetched.push(String(url));return new Response(fs.readFileSync('dist/'+url));};
const requests=[],deferred=[];let hold=false;
globalThis.Worker=class{
 constructor(url){this.url=String(url);if(this.url.endsWith('japan-worker.mjs'))queueMicrotask(()=>this.queue(()=>{const data=read('japan-boundaries'),blob=v=>new Blob([JSON.stringify(v)]);this.onmessage({data:{result:{metadata:data.first.features.map(f=>({properties:f.properties})),sources:{'japan-first':blob(data.first),'japan-first-edges':blob(data.boundaries),'japan-first-selection-edges':blob(lineData(data.first))}}}});}));}
 queue(fn){const finish=()=>{if(!this.ended)fn();};hold?deferred.push(finish):queueMicrotask(finish);}
 postMessage({url}){requests.push(url);this.queue(()=>{const data=read(url.replace('data/','').replace('.bin',''));this.onmessage({data:{sources:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,new Blob([JSON.stringify(v)])]))}});});}
 terminate(){this.ended=true;}
};
const sources=new Map(),layers=new Map(),events=new Map();let bounds=[[122,24],[146,46]],allowPaint=true,moving=false;
const map={addSource:(id,data)=>{assert(!sources.has(id));sources.set(id,data);},addLayer:layer=>layers.set(layer.id,layer),getLayer:id=>layers.get(id),getSource:id=>sources.get(id),removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),setFeatureState(){},setPaintProperty(){},setLayoutProperty:(id,key,value)=>{(layers.get(id).layout??={})[key]=value;},getLayoutProperty:(id,key)=>layers.get(id)?.layout?.[key],setFilter:(id,filter)=>layers.get(id).filter=filter,moveLayer(){},on:(event,fn)=>{const a=events.get(event)||[];a.push(fn);events.set(event,a);},off:(event,fn)=>events.set(event,(events.get(event)||[]).filter(f=>f!==fn)),isSourceLoaded:()=>allowPaint,triggerRepaint:()=>queueMicrotask(()=>events.get('render')?.slice().forEach(f=>f())),getBounds:()=>({getWest:()=>bounds[0][0],getSouth:()=>bounds[0][1],getEast:()=>bounds[1][0],getNorth:()=>bounds[1][1]}),isMoving:()=>false,getCanvas:()=>({style:{}}),queryRenderedFeatures:()=>[]};
const host={isBusy:()=>false,isMoving:()=>moving,fit:async b=>{bounds=b;}};
const delay=()=>new Promise(r=>setTimeout(r,300));
const {addJapanPortal}=await import('../dist/japan.mjs');const atlas=await addJapanPortal(map,host);assert.deepEqual(fetched,['data/japan-context.bin']);await atlas.enter(false);assert.equal(requests.length,0,'National view must not request municipal geometry');assert(labels.length<=47);
el('mode-lock').setAttribute('aria-pressed','true');el('j-province').value='JP-13';await el('j-province').onchange();await delay();assert.equal(requests.length,0,'Locked prefecture mode must not load local boundaries');assert.equal(el('mode-lock').hidden,false);
el('mode-lock').setAttribute('aria-pressed','false');atlas.setMode(2);allowPaint=false;await delay();assert.deepEqual(requests,['data/japan-local/JP-13.bin']);assert.equal(layers.get('japan-first-fill').filter,null,'Keep overview until local sources can paint');assert.equal(layers.get('japan-local-second-fill').layout.visibility,'visible');allowPaint=true;map.triggerRepaint();await delay();assert.deepEqual(layers.get('japan-first-fill').filter,['!=',['get','id'],'JP-13']);assert(labels.length<=60);assert.equal(el('j-subdivisions').open,false);assert.equal(el('j-children').children.length,25);
el('j-children-more').onclick();assert.equal(el('j-children').children.length,50);el('j-child-filter').value='Shinjuku';el('j-child-filter').oninput();assert.equal(el('j-children').children.length,1);await el('j-children').children[0].onclick();assert.equal(atlas.getSelection(),'JP-13104');assert.equal(el('j-population').hidden,false);assert.equal(el('j-population-total').textContent,'361,357','Use the municipality census count, never its prefecture population');assert(el('j-population-period').textContent.includes('Final census'));assert(el('j-local-flag').src.includes('Shinjuku')||el('j-local-flag').src.endsWith('JP-13104.svg'));assert.equal(el('j-local-flag-source').hidden,true,'Keep the new flag hidden until it loads');el('j-local-flag').currentSrc='http://localhost/'+el('j-local-flag').src;el('j-local-flag').onload();assert.equal(el('j-local-flag-source').hidden,false);el('j-local-flag').onerror();assert.equal(el('j-local-flag-source').hidden,true);
hold=true;el('j-province').value='JP-01';await el('j-province').onchange();await delay();assert(!sources.has('japan-local-second'),'Release previous prefecture before loading another');el('j-province').value='JP-14';await el('j-province').onchange();await delay();hold=false;for(const finish of deferred.splice(0))finish();await delay();assert.equal(atlas.getSelection(),'JP-14');assert.equal(sources.get('japan-local-second').data.startsWith('blob:'),true);assert.equal(sources.size,7,'Only context, overview and one prefecture remain resident');
el('j-search').value='Yokohama';el('j-search').oninput();await el('j-search-results').children[0].onclick();assert.equal(atlas.getSelection(),'JP-14100');assert.equal(el('j-subdivision-summary').textContent,'City wards (18)');assert.deepEqual(layers.get('japan-local-wards-fill').filter,['==',['get','parent'],'JP-14100']);
await atlas.restore('JP-14104');assert.equal(atlas.getSelection(),'JP-14104');assert(el('j-selection-meta').textContent.includes('Yokohama'));await atlas.home(false);assert.equal(sources.size,4);assert.equal(layers.get('japan-first-fill').filter,null);await delay();assert.equal(requests.length,3,'Reset must not reload a chunk');atlas.leave();assert.deepEqual([...sources.keys()],['japan-portal']);
hold=true;const stale=atlas.warm();await new Promise(r=>setTimeout(r,10));atlas.leave();await assert.rejects(stale,{name:'AbortError'});hold=false;await atlas.enter(false);for(const finish of deferred.splice(0))finish();assert(atlas.ready&&atlas.active);await atlas.restore('JP-14104');await delay();assert.equal(atlas.getSelection(),'JP-14104');assert.equal(el('j-selection-kind').textContent,'CITY WARD');
await atlas.home(false);hold=true;await atlas.restore('JP-13');await delay();moving=true;hold=false;for(const finish of deferred.splice(0))finish();await delay();assert(!sources.has('japan-local-second'),'Geometry uploads must wait until camera movement ends');moving=false;await delay();assert(sources.has('japan-local-second'));atlas.setMode(1);assert.equal(sources.size,4,'Prefecture mode releases local geometry');
hold=true;atlas.setMode(2);await delay();atlas.setMode(1);hold=false;for(const finish of deferred.splice(0))finish();await delay();assert.equal(sources.size,4,'A cancelled mode change must not reinstall hidden local sources');atlas.leave();assert.equal(sources.size,1);
console.log('Japan local: 1,741 municipalities, 171 city wards, all source entries retained, prefecture-only downloads, locks, bounded labels/lists, paint readiness, cold searches, saved selections and stale-worker disposal passed.');
