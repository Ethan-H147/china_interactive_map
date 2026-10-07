import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSouthAmerica} from '../dist/south-america.mjs';
class Element{
 constructor(){this.children=[];this.dataset={};this.checked=true;this.hidden=false;this.nodes=new Map();}
 setAttribute(key,value){this[key]=value;}getAttribute(key){return this[key];}
 removeAttribute(key){delete this[key];}
 append(...items){this.children.push(...items);}insertBefore(item){this.append(item);}
 replaceChildren(...items){this.children=items;}querySelector(key){if(!this.nodes.has(key)){const el=new Element();el.previousElementSibling=new Element();this.nodes.set(key,el);}return this.nodes.get(key);}
 set innerHTML(value){this.html=value;this.firstElementChild=new Element();}
}
const elements=new Map();globalThis.document={createElement:()=>new Element(),querySelector:key=>get(key),getElementById:key=>get(key),dispatchEvent(){}};
function get(key){if(!elements.has(key))elements.set(key,new Element());return elements.get(key);}
globalThis.window={AtlasDev:{enabled:false},AtlasLabels:{render:()=>[]}};globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
const flagRequests=[];let flagPending=0,maxFlagPending=0;
globalThis.Image=class{
 set src(value){flagRequests.push(value);flagPending++;maxFlagPending=Math.max(maxFlagPending,flagPending);}
 decode(){return new Promise(resolve=>setTimeout(()=>{flagPending--;resolve();},1));}
};
const requests=[];globalThis.fetch=async url=>{requests.push(url);return new Response(fs.readFileSync('dist/'+url));};
let workerLoads=0,terminated=0,failNextDDD=false;const workerURLs=[];
globalThis.Worker=class{
 postMessage({url}){workerLoads++;workerURLs.push(url);this.timer=setTimeout(()=>{if(failNextDDD&&url.endsWith('-ddd.bin')){failNextDDD=false;this.onmessage({data:{error:'Test network failure'}});return;}const payload=JSON.parse(gunzipSync(fs.readFileSync('dist/'+url)));this.onmessage({data:{records:payload.records,sources:Object.fromEntries(['regions','lines'].map(key=>[key,new Blob([JSON.stringify(payload[key])])]))}});},5);}
 terminate(){clearTimeout(this.timer);terminated++;}
};
const sources=new Map(),layers=new Map(),handlers=new Map();let tilesReady=true;const map={
 addSource:(id,s)=>sources.set(id,s),getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),
 addLayer:l=>layers.set(l.id,l),getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),
 setLayoutProperty(id,key,value){(layers.get(id).layout||={})[key]=value;},setFilter(id,filter){layers.get(id).filter=filter;},setFeatureState(){},
 on(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);},off(name,fn){handlers.get(name)?.delete(fn);},isMoving:()=>false,isSourceLoaded:()=>tilesReady,
 getBounds:()=>({getWest:()=>-180,getEast:()=>180,getSouth:()=>-90,getNorth:()=>90})
};
layers.set('world-land',{id:'world-land',layout:{visibility:'visible'}});
let country='china';const atlas=createSouthAmerica(map,{country:()=>country,isBusy:()=>false,switchAtlas(){},fit(){}});
assert.equal(requests.length,0);assert.equal(workerLoads,0,'Creating Asian home must not load South American geometry');
assert.equal(flagRequests.length,0,'Asian entry does not preload Argentine flags');
await assert.rejects(atlas.portals.brazil.warm(),/Developer mode/);assert.equal(requests.length,0);
window.AtlasDev.enabled=true;country='brazil';await atlas.portals.brazil.warm();await atlas.portals.brazil.enter();
assert.equal(workerLoads,1);assert.ok(sources.has('south-brazil-regions'));assert.equal(atlas.portals.brazil.ready,true);
assert.deepEqual(layers.get('world-land').filter,['==',['get','country'],''],'Developer geometry replaces its coarse background silhouettes');
window.AtlasDev.enabled=false;atlas.syncDeveloper();
assert.equal(layers.get('south-america-fill').layout.visibility,'none');
assert.equal(layers.get('south-america-lines').layout.visibility,'none');
assert.equal(layers.get('south-brazil-fill').layout.visibility,'none');
assert.equal(layers.get('world-land').filter,null,'Exiting developer mode restores all three light-gray land silhouettes');
assert.equal(layers.get('world-land').layout.visibility,'visible','Developer mode must never hide public world land');
window.AtlasDev.enabled=true;atlas.syncDeveloper();
atlas.portals.brazil.leave();assert.ok(!sources.has('south-brazil-regions'));assert.ok(!sources.has('south-brazil-lines'));assert.equal(atlas.portals.brazil.ready,false);
assert.equal(flagRequests.length,0,'Brazil does not preload Argentine flags');
country='argentina';await atlas.portals.argentina.warm();
assert.equal(flagRequests.length,0,'Preparing Argentina does not start flag downloads');
await atlas.portals.argentina.enter();
for(let i=0;i<100&&(flagRequests.length<24||flagPending);i++)await new Promise(r=>setTimeout(r,1));
assert.equal(new Set(flagRequests).size,24,'Entering Argentina warms every province and capital flag');
assert.equal(maxFlagPending,3,'Flag loading has bounded concurrency');
assert.ok(sources.has('south-argentina-regions'));assert.ok(!sources.has('south-brazil-regions'));assert.equal(workerLoads,2);
assert.equal(workerURLs.filter(url=>url.includes('argentina-local/')).length,0,'No departmental geometry before selecting a province');
await atlas.portals.argentina.restore('AR-06427');
const argSidebar=get('.workspace').children.find(e=>e.className==='sidebar south-america-sidebar');
assert.equal(argSidebar.querySelector('#south-flag-source').hidden,false,'Decoded flags display without waiting for another image load event');
assert.equal(atlas.portals.argentina.getSelection(),'AR-06427');assert.equal(atlas.portals.argentina.getScope(),'AR-06');assert.ok(sources.has('arg-local-AR-06-regions'));
assert.equal(layers.get('south-argentina-borders').layout.visibility,'visible','Other provinces retain their borders in subdivision view');
const localLoads=workerLoads;await atlas.portals.argentina.restore('AR-06455');assert.equal(workerLoads,localLoads,'Selecting another partido reuses the same provincial geometry');
const oldSelection=atlas.portals.argentina.restore('AR-82084'),latestSelection=atlas.portals.argentina.restore('AR-02007');await Promise.all([oldSelection,latestSelection]);
assert.equal(atlas.portals.argentina.getSelection(),'AR-02007');assert.ok(sources.has('arg-local-AR-02-regions'));assert.ok(!sources.has('arg-local-AR-82-regions'));assert.ok(!sources.has('arg-local-AR-06-regions'),'Only one province retains detailed geometry');
atlas.portals.argentina.setMode(1);assert.ok(!sources.has('arg-local-AR-02-regions'),'Province mode releases subdivisions');
get('mode-lock').setAttribute('aria-pressed','true');await atlas.portals.argentina.restore('AR-82084');assert.ok(!sources.has('arg-local-AR-82-regions'),'Automatic subdivision selection respects the level lock');get('mode-lock').setAttribute('aria-pressed','false');
tilesReady=false;atlas.portals.argentina.setMode(2);
for(let i=0;i<100&&!sources.has('arg-local-AR-82-regions');i++)await new Promise(r=>setTimeout(r,1));assert.ok(sources.has('arg-local-AR-82-regions'));
atlas.portals.argentina.leave();await new Promise(r=>setTimeout(r,0));assert.ok(![...sources.keys()].some(id=>id.startsWith('arg-local-')),'Leaving during staged source loading releases detail geometry');tilesReady=true;
country='argentina';await atlas.portals.argentina.warm();await atlas.portals.argentina.enter();
assert.equal(flagRequests.length,24,'Revisiting Argentina reuses warmed flags');
atlas.portals.argentina.leave();country='uruguay';await atlas.portals.uruguay.warm();await atlas.portals.uruguay.enter();
assert.equal(workerURLs.filter(url=>url.endsWith('uruguay-first.bin')).length,1);assert.ok(sources.has('south-uruguay-regions'));assert.ok(!sources.has('south-argentina-regions'));assert.equal(atlas.portals.uruguay.ready,true);
await atlas.portals.uruguay.restore('UY-MO');assert.equal(atlas.portals.uruguay.getSelection(),'UY-MO');
atlas.portals.uruguay.leave();assert.ok(!sources.has('south-uruguay-regions'));assert.equal(atlas.portals.uruguay.ready,false);
country='brazil';await atlas.portals.brazil.warm();await atlas.portals.brazil.enter();
assert.equal(workerURLs.filter(url=>url.endsWith('-ddd.bin')).length,0,'DDD is not fetched with the ordinary Brazil view');
const sidebar=get('.workspace').children.find(e=>e.className==='sidebar south-america-sidebar');
const mode=key=>sidebar.querySelector('[data-layer="'+key+'"]');
tilesReady=false;const ddd=mode('ddd').onclick();
const until=async predicate=>{for(let i=0;i<300&&!predicate();i++)await new Promise(r=>setTimeout(r,1));assert.ok(predicate(),'Expected map loading stage');};
await until(()=>sources.has('south-brazil-ddd-regions'));
assert.ok(sources.has('south-brazil-regions'),'Previous view remains until the new sources are ready');
assert.equal(layers.get('south-brazil-fill').layout.visibility,'visible');assert.equal(layers.get('south-brazil-ddd-fill').layout.visibility,'none');
tilesReady=true;for(const fn of handlers.get('sourcedata')||[])fn({});await ddd;
assert.ok(!sources.has('south-brazil-regions'));assert.equal(atlas.portals.brazil.getScope(),'ddd');
await atlas.portals.brazil.restore('BR-DDD-61','ddd');assert.equal(atlas.portals.brazil.getSelection(),'BR-DDD-61');
await mode('states').onclick();assert.equal(atlas.portals.brazil.getScope(),'states');
failNextDDD=true;await mode('ddd').onclick();assert.ok(sources.has('south-brazil-regions'));assert.equal(atlas.portals.brazil.getScope(),'states','Failure retains the previous view');
assert.match(sidebar.querySelector('#south-layer-status').textContent,/retry/);
const pendingDDD=mode('ddd').onclick();await Promise.resolve();await Promise.resolve();const retainStates=mode('states').onclick();await Promise.all([pendingDDD,retainStates]);
assert.equal(atlas.portals.brazil.getScope(),'states','Latest layer intent wins');assert.ok(!sources.has('south-brazil-ddd-regions'));
tilesReady=false;const stagedDDD=mode('ddd').onclick();await until(()=>sources.has('south-brazil-ddd-regions'));await mode('states').onclick();await stagedDDD;tilesReady=true;
assert.ok(sources.has('south-brazil-regions'));assert.ok(!sources.has('south-brazil-ddd-regions'),'Cancelled staged sources and blob URLs are removed');
const beforeCEP=workerLoads;await mode('cep').onclick();assert.equal(workerLoads,beforeCEP,'Pending CEP view cannot fetch fabricated polygons');
assert.ok(!sources.has('south-brazil-regions'));assert.equal(atlas.portals.brazil.getScope(),'cep');assert.match(sidebar.querySelector('.preview-note').textContent,/No postal boundaries/);
atlas.portals.brazil.random();assert.equal(atlas.portals.brazil.getSelection(),null,'Pending postal view cannot select an invisible DDD or state');
await mode('states').onclick();atlas.portals.brazil.leave();
country='brazil';const loading=atlas.portals.brazil.warm();await Promise.resolve();await Promise.resolve();
atlas.portals.brazil.leave();country='china';await assert.rejects(loading,{name:'AbortError'});
assert.ok(![...sources.keys()].some(id=>/^south-(brazil|argentina|uruguay)-/.test(id)));assert.ok(terminated>=3);
assert.equal(requests.filter(url=>url==='data/flight-context.bin').length,1);
console.log('Developer gating, zero geometry on Asian entry, per-country loading, worker cancellation and release of inactive boundaries passed.');
console.log('DDD demand loading, readiness without flashing, failure recovery, latest layer priority, cross-state restoration and truthful pending postal mode passed.');
console.log('Argentina deferred geometry, provincial border retention, shared-province reuse, rapid selection priority, saved-child restoration, level lock and staged source cancellation passed.');
