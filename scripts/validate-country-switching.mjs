import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
const read=name=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+name+'.bin')));
const context=read('china-context'),motion=read('china-motion');
const ids=features=>[...new Set(features.map(f=>f.properties.adcode))].sort();
assert.deepEqual(ids(context.features),ids([...motion.provinces.features,...motion['provinces-fragments'].features]));
assert.equal(ids(context.features).length,34);assert(context.features.some(f=>f.properties.adcode===220000));
assert(context.features.filter(f=>f.properties.adcode===220000).every(f=>f.geometry.coordinates[0].length===4),'Context must use the same watertight Jilin triangles as motion fills');
const sources=new Map(),handlers=new Map(),moved=[];
const emit=(type,event={})=>{for(const fn of [...(handlers.get(type)||[])])fn(event);};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const source=fs.readFileSync('dist/app.js','utf8'),elements=new Map(),remembered=[];
const element=id=>{if(!elements.has(id))elements.set(id,{style:{},dataset:{},setAttribute(){},querySelector(){return element(id+'-symbol');}});return elements.get(id);};
let releaseKorea,releaseMongolia;
const koreaWait=new Promise(r=>releaseKorea=r),mongoliaWait=new Promise(r=>releaseMongolia=r);
const atlas=wait=>({warm:()=>wait,leave(){},context(){},enter:async()=>{},ready:true});
const env=vm.createContext({AbortController,setTimeout,clearTimeout,allReady:true,quiz:{active:false},koreaAtlas:atlas(koreaWait),mongoliaAtlas:atlas(mongoliaWait),japanAtlas:atlas(Promise.resolve()),provinceFeatures:[],window:{AtlasTheme:{applyAtlasTheme(){}},AtlasEntry:{countries:{china:{en:'China'},korea:{en:'Korea'},mongolia:{en:'Mongolia'},japan:{en:'Japan'}},remember:country=>remembered.push(country)}},AtlasSymbols:{markup:c=>c},document:{getElementById:element,documentElement:{dataset:{}}},$:element,map:{getLayer:()=>true,setPaintProperty(){},getStyle:()=>({sources:Object.fromEntries(sources)}),getSource:id=>sources.has(id)?{}:undefined,isSourceLoaded:id=>sources.get(id),on(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},off(type,fn){handlers.get(type)?.delete(fn);}},homeBounds:[[73,17],[135,54]],navigateBounds:async()=>{moved.push(remembered.at(-1));return true;},motionRenderer:{end:async()=>{},loadCountry:()=>new Promise(()=>{})},loadChina:async()=>{},saveView(){},controls(){},cancelNavigation(){},clearHover(){},clearSelection(){},clearSearch(){},syncCountryFills(){},syncLayers(){},updateLabels(){},setMode(){},showPanel(){},refreshStatus(){},saveViewSoon(){},unlockCamera(){},fitHome:async()=>{},console});
vm.runInContext("let atlasMode='china',countrySwitching=false,countryEpoch=0,requestedCountry,countryPreparation,countryLoadFailed=false,activeCode,philippinesAtlas,indonesiaAtlas,southAmerica,labels=[];"+source.slice(source.indexOf('function waitForCountrySources('),source.indexOf('function regionZoom(')),env);
const korea=env.changeAtlas('korea'),mongolia=env.changeAtlas('mongolia');
await flush();assert.equal(moved.length,0,'Country preparation must complete before the camera starts');
releaseMongolia();assert.equal(await mongolia,true);assert.deepEqual(moved,['mongolia']);assert.equal(remembered.at(-1),'mongolia');releaseKorea();assert.equal(await korea,false);assert.equal(remembered.at(-1),'mongolia','Slower earlier requests cannot replace the latest country');
assert.equal(await env.changeAtlas('china'),true,'Optional motion downloads cannot block switching');
assert.equal(remembered.at(-1),'china');
assert.deepEqual(moved,['mongolia','china'],'Cancelled earlier loading never starts a stale flight');
console.log('All 34 context provinces, watertight Jilin context, latest country intent and non-blocking optional motion downloads passed.');

assert.equal(await env.changeAtlas('japan'),true);assert.equal(remembered.at(-1),'japan');
env.window.AtlasEntry.countries.philippines={en:'Philippines'};env.window.AtlasEntry.countries.indonesia={en:'Indonesia'};
let releasePH,releaseID;env.phWait=new Promise(r=>releasePH=r);env.idWait=new Promise(r=>releaseID=r);env.makeAtlas=atlas;
vm.runInContext('philippinesAtlas=makeAtlas(phWait);indonesiaAtlas=makeAtlas(idWait);',env);
const phRequest=env.changeAtlas('philippines'),idRequest=env.changeAtlas('indonesia');releaseID();assert.equal(await idRequest,true);releasePH();assert.equal(await phRequest,false);assert.equal(remembered.at(-1),'indonesia');
for(const country of ['brazil','uruguay','argentina'])env.window.AtlasEntry.countries[country]={en:country};
env.makePreviews=()=>Object.fromEntries(['brazil','uruguay','argentina'].map(country=>[country,{...atlas(Promise.resolve()),bounds:[[-74,-56],[-34,6]]}]));
vm.runInContext('southAmerica={portals:makePreviews(),syncArrow(){},fly:async()=>true};',env);
env.reducedMotion={matches:false};env.zoomLock={locked:false};
env.window.AtlasDev={allows:country=>!['brazil','uruguay'].includes(country)};
assert.equal(await env.changeAtlas('brazil',true,true),false,'Preview switching is blocked without developer mode');
assert.equal(remembered.at(-1),'indonesia');
assert.equal(await env.changeAtlas('argentina'),true,'Argentina switching works without developer mode');
env.window.AtlasDev.allows=()=>true;
assert.equal(await env.changeAtlas('brazil',true,true),true,'Flight enters the new country through the existing switching lifecycle');
for(const country of ['uruguay','argentina']){assert.equal(await env.changeAtlas(country),true);assert.equal(remembered.at(-1),country);}

// First visits wait for both boundary preparation and source indexing, not a fixed delay.
let releaseCold;
const cold=new Promise(resolve=>releaseCold=resolve);
env.japanAtlas={...atlas(cold),warm:async()=>{await cold;sources.set('japan-first',false);}};
const beforeCold=moved.length,coldSwitch=env.changeAtlas('japan');
await flush();assert.equal(moved.length,beforeCold);
releaseCold();await flush();assert.equal(moved.length,beforeCold,'Registering a source is insufficient until the renderer has indexed it');
sources.set('japan-first',true);emit('sourcedata',{sourceId:'japan-first'});
assert.equal(await coldSwitch,true);assert.equal(moved.at(-1),'japan');
assert.equal(handlers.get('sourcedata').size,0,'Readiness listeners are cleaned after success');

// A new destination interrupts source warm-up without waiting for its timeout.
env.koreaAtlas={...atlas(Promise.resolve()),warm:async()=>sources.set('korea-new',false)};
const beforeCancelled=moved.length,cancelledSwitch=env.changeAtlas('korea');await flush();
assert.equal(moved.length,beforeCancelled);const replacement=env.changeAtlas('mongolia');
assert.equal(await cancelledSwitch,false);assert.equal(await replacement,true);
assert.equal(moved.at(-1),'mongolia');assert.equal(moved.length,beforeCancelled+1);
assert.equal(handlers.get('sourcedata').size,0,'Superseding a destination immediately removes its source listeners');

// Source failures leave the camera still and allow the country to be retried.
env.japanAtlas={...atlas(Promise.resolve()),warm:async()=>sources.set('japan-failed',false)};
const beforeFailed=moved.length,failedSwitch=env.changeAtlas('japan');await flush();
emit('error',{sourceId:'japan-failed'});assert.equal(await failedSwitch,false);
assert.equal(moved.length,beforeFailed);assert.match(element('status').textContent,/retry/);
env.japanAtlas.warm=async()=>{};
const retrySwitch=env.changeAtlas('japan');await flush();assert.equal(moved.length,beforeFailed,'Retry waits for the existing failed source instead of treating it as a ready country');
sources.set('japan-failed',true);emit('sourcedata',{sourceId:'japan-failed'});assert.equal(await retrySwitch,true);assert.equal(moved.at(-1),'japan');
assert.equal(handlers.get('sourcedata').size,0);assert.equal(handlers.get('error').size,0);

// Optional preview sources never hold up a destination, and cached switches add no delay.
sources.set('korea-new',true);
env.koreaAtlas={...atlas(Promise.resolve()),warm:async()=>{sources.set('korea-preview-motion',false);sources.set('japan-unrelated',false);}};
assert.equal(await env.changeAtlas('korea'),true);assert.equal(moved.at(-1),'korea');
const cachedCount=moved.length;assert.equal(await env.changeAtlas('korea'),true);assert.equal(moved.length,cachedCount);
console.log('First-visit source preparation precedes movement; stale warm-ups cancel immediately; failed sources preserve the camera; cached countries and optional previews remain fast.');

// China also waits for its detailed district source, whose name is plural.
const chinaSources=['provinces','prefectures','others','city-districts','city-district-boundaries'];
env.loadChina=async()=>{for(const id of chinaSources)sources.set(id,false);};
const beforeChina=moved.length,chinaSwitch=env.changeAtlas('china');await flush();
assert.equal(moved.length,beforeChina);
for(const id of chinaSources.filter(id=>id!=='city-districts'))sources.set(id,true);
emit('sourcedata');await flush();assert.equal(moved.length,beforeChina,'China district indexing must finish too');
sources.set('city-districts',true);emit('sourcedata');assert.equal(await chinaSwitch,true);assert.equal(moved.at(-1),'china');
