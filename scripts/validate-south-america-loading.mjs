import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSouthAmerica} from '../dist/south-america.mjs';
import {lineData,lineSourceOptions,adaptiveOpacity} from '../dist/adaptive-lines.mjs';
import {GeoJSONVT} from '@maplibre/geojson-vt';
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
let labelCandidates=[];
globalThis.window={AtlasDev:{enabled:false,allows(country){return !['south-africa','eswatini','lesotho'].includes(country)||this.enabled;}},AtlasLabels:{render:(map,candidates)=>{labelCandidates=candidates;return [];}}};globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
const flagRequests=[];let flagPending=0,maxFlagPending=0;
globalThis.Image=class{
 set src(value){flagRequests.push(value);flagPending++;maxFlagPending=Math.max(maxFlagPending,flagPending);}
 decode(){return new Promise(resolve=>setTimeout(()=>{flagPending--;resolve();},1));}
};
const requests=[];globalThis.fetch=async url=>{requests.push(url);return new Response(fs.readFileSync('dist/'+url));};
let workerLoads=0,terminated=0,failNextDDD=false,failNextMunicipality=false;const workerURLs=[];
globalThis.Worker=class{
 postMessage({url}){workerLoads++;workerURLs.push(url);this.timer=setTimeout(()=>{if(failNextDDD&&url.endsWith('-ddd.bin')){failNextDDD=false;this.onmessage({data:{error:'Test network failure'}});return;}if(failNextMunicipality&&url.includes('/brazil-local/')){failNextMunicipality=false;this.onmessage({data:{error:'Test municipal network failure'}});return;}const payload=JSON.parse(gunzipSync(fs.readFileSync('dist/'+url)));this.onmessage({data:{records:payload.records,sources:Object.fromEntries(['regions','lines'].map(key=>[key,new Blob([JSON.stringify(key==='lines'&&(url.includes('/brazil-local/')||url.includes('/uruguay-local/'))?lineData(payload[key]):payload[key])])]))}});},5);}
 terminate(){clearTimeout(this.timer);terminated++;}
};
const sources=new Map(),layers=new Map(),handlers=new Map();let tilesReady=true;const map={
 addSource:(id,s)=>sources.set(id,s),getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),
 addLayer:l=>layers.set(l.id,l),getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),moveLayer(){},
 setLayoutProperty(id,key,value){(layers.get(id).layout||={})[key]=value;},setFilter(id,filter){layers.get(id).filter=filter;},setFeatureState(){},
 on(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);},off(name,fn){handlers.get(name)?.delete(fn);},isMoving:()=>false,isSourceLoaded:()=>tilesReady,
 getBounds:()=>({getWest:()=>-180,getEast:()=>180,getSouth:()=>-90,getNorth:()=>90})
};
layers.set('world-land',{id:'world-land',layout:{visibility:'visible'}});
sources.set('world-land',{});const switches=[];let overviewCountry='argentina';map.queryRenderedFeatures=()=>[{properties:{country:overviewCountry}}];
let country='china';const atlas=createSouthAmerica(map,{country:()=>country,isBusy:()=>false,switchAtlas:(...args)=>switches.push(args),fit(){}});
assert.equal(requests.length,0);assert.equal(workerLoads,0,'Creating Asian home must not load South American geometry');
assert.equal(flagRequests.length,0,'Asian entry does not preload Argentine flags');
const overview=layers.get('south-america-portal-fill');
assert.equal(overview.source,'world-land','All three countries reuse loaded world geometry before any visit');
assert.equal(overview.paint['fill-color'],'#d7d7d3');assert.equal(overview.paint['fill-antialias'],false,'Available silhouettes have no coastline outlines');
assert.deepEqual(overview.filter,['in',['get','country'],['literal',['brazil','uruguay','argentina']]]);
assert.deepEqual(labelCandidates.map(r=>r.id),['brazil','uruguay','argentina'],'An Asian entry labels all available South American countries');
assert.equal(get('map-shell').children.length,0,'Do not create bottom-left continent flight buttons');
for(const id of ['brazil','uruguay','argentina']){overviewCountry=id;for(const handler of handlers.get('click'))handler({point:{x:0,y:0}});assert.equal(switches.at(-1)[0],id,'Every country is directly clickable before any South American visit');}
assert.equal(requests.length,0,'Clickable overview adds no new geometry requests');
country='brazil';await atlas.portals.brazil.warm();await atlas.portals.brazil.enter();
assert.equal(overview.layout.visibility,'none','Detailed context replaces the bootstrap silhouette without duplicate fills');
for(let i=0;i<100&&(flagRequests.length<28||flagPending);i++)await new Promise(r=>setTimeout(r,1));
assert.equal(flagRequests.length,28,'Brazil preloads all state and DF flags');
assert.equal(maxFlagPending,3,'Brazil flag decoding has bounded concurrency');
assert.equal(layers.get('south-land-boundaries').layout.visibility,'visible','International land borders remain visible in country views');
assert.equal(layers.get('south-land-boundaries').source,'south-land-borders','Draw only shared international lines, never country perimeters');
assert.equal(layers.get('south-river-boundaries').layout.visibility,'visible','Uruguay River international boundary remains visible');
const borderContext=JSON.parse(gunzipSync(fs.readFileSync('dist/data/flight-context.bin')));
for(const [source,layer,key] of [['south-land-borders','south-land-boundaries','landBorders'],['south-river-borders','south-river-boundaries','riverBorders']]){
 const retained=sources.get(source),style=layers.get(layer);
 for(const field of ['tolerance','buffer','maxzoom'])assert.equal(retained[field],lineSourceOptions[field],'Reuse the shared zoom-aware line settings: '+field);
 assert.deepEqual(retained.data,lineData(borderContext[key]),'Preserve the exact shared/official paths while adding visibility metadata');
 assert.deepEqual(style.paint['line-opacity'],adaptiveOpacity(),'Small paths fade continuously with zoom');
 assert.deepEqual(style.paint['line-width'],['interpolate',['linear'],['zoom'],2,.55,6,.85,10,1],'Overview lines use a lighter stroke');
 const count=tolerance=>{const tiles=new GeoJSONVT(retained.data,{maxZoom:18,extent:8192,buffer:128,tolerance:tolerance*8192/512});let points=0;for(let x=0;x<8;x++)for(let y=0;y<8;y++)points+=tiles.getTile(3,x,y)?.features.reduce((n,f)=>n+f.geometry.reduce((s,p)=>s+p.length,0),0)||0;return points;};
 assert(count(retained.tolerance)<count(0)*.15,'Zoomed-out tiles must discard detail smaller than a pixel');
}
assert.equal(workerLoads,1);assert.ok(sources.has('south-brazil-regions'));assert.equal(atlas.portals.brazil.ready,true);
assert.equal(workerURLs.filter(url=>url.includes('/brazil-local/')).length,0,'Opening Brazil loads no municipal geometry');
assert.deepEqual(layers.get('world-land').filter,['!',['in',['get','country'],['literal',['brazil','uruguay','argentina','malaysia','singapore']]]],'Developer geometry replaces its coarse background silhouettes');
window.AtlasDev.enabled=false;atlas.syncDeveloper();
assert.equal(layers.get('south-america-fill').layout.visibility,'visible');
assert.equal(layers.has('south-america-lines'),false,'Country silhouettes have no coastline outline layer');
assert.equal(layers.get('south-land-boundaries').layout.visibility,'visible','Public country views retain their border layer');
assert.equal(layers.get('south-america-fill').paint['fill-antialias'],false,'Country silhouettes cannot receive an implicit fill outline');
assert.equal(layers.get('south-brazil-selection').source,'south-brazil-lines','Selection emphasizes inland boundaries without outlining the coast');
assert.equal(layers.get('south-brazil-fill').layout.visibility,'visible');
assert.deepEqual(layers.get('world-land').filter,['!',['in',['get','country'],['literal',['brazil','uruguay','argentina','malaysia','singapore']]]],'Exiting developer mode retains the public country silhouettes');
assert.equal(layers.get('world-land').layout.visibility,'visible','Developer mode must never hide public world land');
window.AtlasDev.enabled=true;atlas.syncDeveloper();
atlas.portals.brazil.leave();assert.ok(!sources.has('south-brazil-regions'));assert.ok(!sources.has('south-brazil-lines'));assert.equal(atlas.portals.brazil.ready,false);
assert.equal(flagRequests.length,28,'Brazil preloads only its own 27 flags');
window.AtlasDev.enabled=false;country='argentina';await atlas.portals.argentina.warm();
assert.equal(flagRequests.length,28,'Preparing Argentina does not start flag downloads');
await atlas.portals.argentina.enter();
for(let i=0;i<100&&(flagRequests.length<52||flagPending);i++)await new Promise(r=>setTimeout(r,1));
assert.equal(new Set(flagRequests).size,52,'Entering Argentina warms every province and capital flag');
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
assert.equal(flagRequests.length,52,'Revisiting Argentina reuses warmed flags');
await atlas.portals.argentina.restore('AR-CITY-03','cities');
assert.equal(atlas.portals.argentina.getScope(),'AR-82');assert.ok(sources.has('arg-city-AR-82-regions'));
assert.ok(sources.has('arg-local-AR-82-regions'),'City selection retains departmental geometry');
assert.equal(layers.get('arg-local-AR-82-borders').layout.visibility,'visible');
assert.equal(layers.get('arg-city-AR-82-borders').layout.visibility,'none','Only the selected city boundary is revealed');
assert.equal(sources.get('argentina-city-points').data.features.length,80);
assert.equal(layers.get('argentina-city-dots').layout.visibility,'visible');
const cityLoads=workerLoads;await atlas.portals.argentina.restore('AR-CITY-08','cities');assert.equal(workerLoads,cityLoads,'Cities in one province reuse geometry');
const oldCity=atlas.portals.argentina.restore('AR-CITY-02','cities'),latestCity=atlas.portals.argentina.restore('AR-CITY-21','cities');await Promise.all([oldCity,latestCity]);
assert.equal(atlas.portals.argentina.getSelection(),'AR-CITY-21');assert.ok(sources.has('arg-city-AR-06-regions'));assert.ok(!sources.has('arg-city-AR-14-regions'));assert.ok(!sources.has('arg-city-AR-82-regions'));
assert.deepEqual(layers.get('arg-city-AR-06-selection').filter,['in','AR-CITY-21',['get','regionIds']],'Banfield selects its municipality’s inland boundaries');
assert.equal(layers.get('arg-city-AR-06-selection').source,'arg-city-AR-06-lines','City selection uses coast-free line data');
await atlas.portals.argentina.restore('AR-CITY-49','cities');assert.deepEqual(layers.get('arg-city-AR-06-selection').filter,['in','AR-CITY-21',['get','regionIds']],'Temperley selects the same municipal territory');
await atlas.portals.argentina.restore('AR-CITY-16','cities');assert.ok(![...sources.keys()].some(id=>id.startsWith('arg-city-')),'Pending municipal coverage does not substitute locality or department polygons');
await atlas.portals.argentina.restore('AR-CITY-03','cities');
await atlas.portals.argentina.restore('AR-CITY-01','cities');assert.equal(atlas.portals.argentina.getSelection(),'AR-02','The CABA city dot and saved city link use the same jurisdiction and statistics as provincial selection');assert.ok(![...sources.keys()].some(id=>id.startsWith('arg-city-')),'CABA reuses its existing autonomous-city boundary');
await atlas.portals.argentina.restore('AR-CITY-03','cities');
atlas.syncDeveloper();assert.equal(layers.get('argentina-city-dots').layout.visibility,'visible','Developer mode exit retains public Argentine cities');
assert.deepEqual(layers.get('south-america-fill').filter[1],['in',['get','country'],['literal',['brazil','uruguay','argentina']]],'All three South American countries are clickable publicly');
atlas.portals.argentina.leave();window.AtlasDev.enabled=true;country='uruguay';await atlas.portals.uruguay.warm();await atlas.portals.uruguay.enter();
assert.ok(![...sources.keys()].some(id=>id.startsWith('arg-city-')),'Leaving Argentina releases city geometry');
assert.ok(!sources.has('argentina-city-points'),'City dots are released on country exit');
assert.equal(workerURLs.filter(url=>url.endsWith('uruguay-first.bin')).length,1);assert.ok(sources.has('south-uruguay-regions'));assert.ok(!sources.has('south-argentina-regions'));assert.equal(atlas.portals.uruguay.ready,true);
for(const field of ['tolerance','buffer','maxzoom'])assert.equal(sources.get('south-uruguay-lines')[field],lineSourceOptions[field],'Uruguay river lines simplify with zoom');
assert.deepEqual(layers.get('south-uruguay-borders').paint['line-opacity'],adaptiveOpacity(.8));
assert.deepEqual(layers.get('south-uruguay-selection').paint['line-opacity'],adaptiveOpacity());
const countryWorker=fs.readFileSync('dist/south-america-worker.mjs','utf8');assert.match(countryWorker,/uruguay-first\.bin.*lineData\(payload\[key\]\)/,'Uruguay lines receive the small-path visibility metadata');
assert.equal(workerURLs.filter(url=>url.includes('/uruguay-local/')).length,0,'Opening Uruguay loads only the municipal name index');
assert.equal(get('mode-province').textContent,'Departments');
await atlas.portals.uruguay.restore('UY-MO');assert.equal(atlas.portals.uruguay.getSelection(),'UY-MO');
assert(sources.has('uy-local-UY-MO-regions'));
const uyLoads=workerLoads;await atlas.portals.uruguay.restore('UY-MUN-UYMOA');assert.equal(workerLoads,uyLoads,'A municipality in the same department reuses detail');
assert.equal(atlas.portals.uruguay.getSelection(),'UY-MUN-UYMOA');
assert.equal(atlas.portals.uruguay.getScope(),'UY-MO');
await atlas.portals.uruguay.restore('UY-MUN-UYMAPDE');assert(sources.has('uy-local-UY-MA-regions'));assert(!sources.has('uy-local-UY-MO-regions'),'Only one department loads municipal geometry');
assert.equal(sources.get('uy-local-UY-MA-lines').tolerance,lineSourceOptions.tolerance);
assert.deepEqual(layers.get('uy-local-UY-MA-borders').paint['line-opacity'],adaptiveOpacity(.65));
assert.equal(layers.get('uy-local-UY-MA-fill').paint['fill-antialias'],false);
atlas.portals.uruguay.setMode(1);assert(![...sources.keys()].some(id=>id.startsWith('uy-local-')),'Department mode releases municipality geometry');
await atlas.portals.uruguay.restore('UY-MUN-UYMOA');
window.AtlasDev.enabled=false;atlas.syncDeveloper();assert([...sources.keys()].some(id=>id.startsWith('uy-local-')),'Exiting developer mode retains public Uruguay detail');window.AtlasDev.enabled=true;
await atlas.portals.uruguay.restore('UY-MUN-UYMOA');

atlas.portals.uruguay.leave();assert(![...sources.keys()].some(id=>id.startsWith('uy-local-')));assert.ok(!sources.has('south-uruguay-regions'));assert.equal(atlas.portals.uruguay.ready,false);
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
await atlas.portals.brazil.restore('BR-3550308');
assert.equal(sidebar.querySelector('#south-province-flag').src,'vendor/brazil-flags/BR-35.webp','Municipal selection uses its parent state flag');
const oldBrazilFlagLoaded=sidebar.querySelector('#south-province-flag').onload;
assert.equal(atlas.portals.brazil.getSelection(),'BR-3550308');assert.equal(atlas.portals.brazil.getScope(),'states','Shared views retain the Brazil administrative view');assert(sources.has('br-local-BR-35-regions'));
assert.equal(layers.get('south-brazil-borders').layout.visibility,'visible','Other states retain their borders');
assert.equal(sources.get('br-local-BR-35-lines').tolerance,lineSourceOptions.tolerance);assert.deepEqual(layers.get('br-local-BR-35-borders').paint['line-opacity'],adaptiveOpacity(.65));assert.equal(layers.get('br-local-BR-35-fill').paint['fill-antialias'],false,'Municipal fills do not add coastal outlines');
const municipalLoads=workerLoads;await atlas.portals.brazil.restore('BR-3509502');assert.equal(workerLoads,municipalLoads,'Selecting another municipality in the same state reuses geometry');
const oldMunicipality=atlas.portals.brazil.restore('BR-3304557'),latestMunicipality=atlas.portals.brazil.restore('BR-3106200');await Promise.all([oldMunicipality,latestMunicipality]);
assert.equal(sidebar.querySelector('#south-province-flag').src,'vendor/brazil-flags/BR-31.webp');
oldBrazilFlagLoaded();assert.equal(sidebar.querySelector('#south-flag-source').hidden,false,'Decoded Brazil flags display immediately; stale callbacks do not change the current flag');
sidebar.querySelector('#south-province-flag').onload();assert.equal(sidebar.querySelector('#south-flag-source').hidden,false);
assert.equal(atlas.portals.brazil.getSelection(),'BR-3106200');assert(sources.has('br-local-BR-31-regions'));assert(!sources.has('br-local-BR-35-regions'));assert(!sources.has('br-local-BR-33-regions'));assert.equal([...sources.keys()].filter(id=>/^br-local-.*-regions$/.test(id)).length,1,'Only one state holds municipal geometry');
atlas.portals.brazil.setMode(1);assert(![...sources.keys()].some(id=>id.startsWith('br-local-')),'States mode releases municipal sources');
get('mode-lock').setAttribute('aria-pressed','true');await atlas.portals.brazil.restore('BR-3550308');assert(![...sources.keys()].some(id=>id.startsWith('br-local-')),'Automatic municipal selection respects the level lock');get('mode-lock').setAttribute('aria-pressed','false');
failNextMunicipality=true;await atlas.portals.brazil.restore('BR-3304557');assert.match(sidebar.querySelector('#south-layer-status').textContent,/Could not load municipalities/);await atlas.portals.brazil.restore('BR-3304557');assert(sources.has('br-local-BR-33-regions'),'A failed state can be retried');
window.AtlasDev.enabled=false;atlas.syncDeveloper();assert([...sources.keys()].some(id=>id.startsWith('br-local-')),'Exiting developer mode retains public Brazil municipal geometry');window.AtlasDev.enabled=true;atlas.syncDeveloper();
await atlas.portals.brazil.restore('BR-3304557');await mode('ddd').onclick();assert(![...sources.keys()].some(id=>id.startsWith('br-local-')),'DDD view releases municipal geometry');await mode('states').onclick();
tilesReady=false;const stagedMunicipal=atlas.portals.brazil.restore('BR-3550308');await until(()=>sources.has('br-local-BR-35-regions'));
const beforeCEP=workerLoads;await mode('cep').onclick();await stagedMunicipal;tilesReady=true;assert.equal(workerLoads,beforeCEP,'Pending CEP view cannot fetch fabricated polygons');assert(![...sources.keys()].some(id=>id.startsWith('br-local-')),'View changes cancel staged municipal sources');
assert.ok(!sources.has('south-brazil-regions'));assert.equal(atlas.portals.brazil.getScope(),'cep');assert.match(sidebar.querySelector('.preview-note').textContent,/No postal boundaries/);
atlas.portals.brazil.random();assert.equal(atlas.portals.brazil.getSelection(),null,'Pending postal view cannot select an invisible DDD or state');
await mode('states').onclick();atlas.portals.brazil.leave();
country='brazil';const loading=atlas.portals.brazil.warm();await Promise.resolve();await Promise.resolve();
atlas.portals.brazil.leave();country='china';await assert.rejects(loading,{name:'AbortError'});
assert.ok(![...sources.keys()].some(id=>/^south-(brazil|argentina|uruguay)-/.test(id)));assert.ok(terminated>=3);
assert.equal(requests.filter(url=>url==='data/flight-context.bin').length,1);
console.log('Public countries, zero geometry on Asian entry, per-country loading, worker cancellation and release of inactive boundaries passed.');
console.log('DDD demand loading, readiness without flashing, failure recovery, latest layer priority, cross-state restoration and truthful pending postal mode passed.');
console.log('Argentina deferred geometry, provincial border retention, shared-province reuse, rapid selection priority, saved-child restoration, level lock and staged source cancellation passed.');
console.log('Brazil deferred municipal geometry, one-state reuse/release, parent restoration, adaptive lines, rapid selection cancellation, lock, retry and DDD/CEP cancellation passed.');
