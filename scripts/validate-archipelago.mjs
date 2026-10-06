import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {BoundaryBudget,chooseChunks} from '../dist/boundary-budget.mjs';
import {hashFor,fromHash} from '../dist/view-state.mjs';
const read=name=>JSON.parse(gunzipSync(fs.readFileSync('dist/data/archipelago/'+name+'.bin')));
for(const [country,firstCount,secondCount] of [['philippines',18,82],['indonesia',38,514]]){
 const data=read(country+'-catalogue'),overview=read(country+'-overview');
 assert.equal(data.records.filter(p=>p.level===1).length,firstCount);assert.equal(data.records.filter(p=>p.level===2).length,secondCount);
 assert(data.records.filter(p=>p.level===0).length>2500);assert.equal(new Set(data.records.map(p=>p.id)).size,data.records.length);
 assert.equal(overview.first.features.length,firstCount);assert.equal(overview.second.features.length,secondCount);
 assert(fs.statSync('dist/data/archipelago/'+country+'-context.bin').size<250000);
 const first=new Set(data.records.filter(p=>p.level===1).map(p=>p.id));
 for(const p of data.records.filter(p=>p.level===2))assert(first.has(p.parent));
 let vertices=0;function walk(c){if(typeof c[0]==='number'){assert(c.every(Number.isFinite));vertices++;}else c.forEach(walk);}
 for(const [parent,entry] of Object.entries(data.chunks)){assert(entry.decodedBytes<3*1024*1024);const chunk=read(entry.file.replace('.bin',''));assert.equal(chunk.first.features.length,1);assert.equal(chunk.first.features[0].properties.id,parent);for(const f of chunk.second.features){assert.equal(f.properties.parent,parent);walk(f.geometry.coordinates);}}
 assert(vertices>150000,'High resolution local geometry must retain detailed coastlines');
 if(country==='philippines'){
  assert.equal(data.records.find(p=>p.en==='Sulu'&&p.level===2).parent,'PH09');
  assert.deepEqual(data.records.filter(p=>p.parent==='PH18'&&p.level===2).map(p=>p.en).sort(),['Negros Occidental','Negros Oriental','Siquijor']);
  assert(!data.records.some(p=>p.level===2&&p.parent==='PH13'),'NCR districts must not be called provinces');
  for(const name of ['Luzon','Mindanao','Palawan Island','Negros Island'])assert(data.records.some(p=>p.level===0&&p.en===name));
 }else{
  assert.equal(data.records.filter(p=>p.level===2&&p.kind==='City').length,93);assert.equal(data.records.filter(p=>p.kind==='Administrative city').length,5);
  for(const name of ['Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'])assert(data.records.some(p=>p.level===1&&p.local===name));
  for(const name of ['Java','Sumatra','Borneo','New Guinea','Sulawesi'])assert(data.records.some(p=>p.level===0&&p.en===name&&p.bounds));
 }
 const shared={v:1,country,center:country==='indonesia'?[115,-8]:[122,12],zoom:7,selection:data.records.find(p=>p.level===0).id};assert.equal(fromHash(hashFor(shared)).selection,shared.selection);
}
const removed=[],budget=new BoundaryBudget({maxBytes:100,maxCount:2,remove:(id,value)=>removed.push([id,value])});
assert(budget.reserve('a',45));budget.add('a',45,'source-a');assert(budget.reserve('b',45));budget.add('b',45,'source-b');budget.touch('a');assert(budget.reserve('c',45));budget.add('c',45,'source-c');assert.deepEqual(removed,[['b','source-b']]);assert.equal(budget.bytes,90);assert.equal(budget.reserve('oversized',101),false);budget.clear();assert.equal(budget.bytes,0);assert.equal(removed.length,3);
assert.deepEqual(chooseChunks([{id:'near',level:1,bounds:[[0,0],[1,1]],center:[.5,.5]},{id:'pin',level:1,bounds:[[0,0],[3,3]],center:[2,2]},{id:'outside',level:1,bounds:[[4,4],[5,5]],center:[4.5,4.5]}],[[0,0],[3,3]],[0,0],{limit:1,pinned:'pin'}),['pin']);
// Exercise the real portal against a small DOM/MapLibre adapter, including
// deferred workers, cold searches, cancellation and source disposal.
const elements=new Map();
class Element{constructor(){this.children=[];this.hidden=false;this.checked=true;this.value='';this.dataset={};this.attributes={};this.scrollTop=0;}append(...values){this.children.push(...values);}replaceChildren(...values){this.children=values;}setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k];}querySelector(){return this;}insertBefore(){}focus(){}addEventListener(){}}
const element=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
globalThis.document={createElement:()=>new Element(),getElementById:element,querySelector:element};globalThis.Option=class extends Element{constructor(text,value){super();this.textContent=text;this.value=value;}};
globalThis.window={AtlasLabels:{render:()=>[]}};Object.defineProperty(globalThis,'navigator',{value:{connection:{}},configurable:true});
element('satellite-layer').checked=false;element('satellite-opacity').value='100';
const fetched=[];globalThis.fetch=async url=>{fetched.push(url);return new Response(fs.readFileSync('dist/'+url));};
const requests=[],deferred=[];let hold=false;
globalThis.Worker=class{postMessage({url}){requests.push(url);const finish=()=>{if(this.ended)return;const input=read(url.replace('data/archipelago/','').replace('.bin','')),sources=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,new Blob([JSON.stringify(v)])]));this.onmessage({data:{sources}});};if(hold)deferred.push(finish);else queueMicrotask(finish);}terminate(){this.ended=true;}};
const sources=new Map(),layers=new Map(),events=new Map();let bounds=[[116,4],[128,22]],zoom=3,mapWidth=390,allowPaint=true;
const map={getContainer:()=>({clientWidth:mapWidth}),addSource:(id,data)=>{assert(!sources.has(id));sources.set(id,data);},addLayer:layer=>layers.set(layer.id,layer),getLayer:id=>layers.get(id),getSource:id=>sources.get(id),removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),setFeatureState(){},setPaintProperty(){},setLayoutProperty(){},getLayoutProperty:()=>undefined,setFilter:(id,filter)=>layers.get(id).filter=filter,moveLayer(){},on:(event,handler)=>{const list=events.get(event)||[];list.push(handler);events.set(event,list);},off:(event,handler)=>events.set(event,(events.get(event)||[]).filter(f=>f!==handler)),isSourceLoaded:()=>true,triggerRepaint:()=>queueMicrotask(()=>events.get('render')?.forEach(f=>f())),getZoom:()=>zoom,getBounds:()=>({getWest:()=>bounds[0][0],getSouth:()=>bounds[0][1],getEast:()=>bounds[1][0],getNorth:()=>bounds[1][1]}),getCenter:()=>({lng:(bounds[0][0]+bounds[1][0])/2,lat:(bounds[0][1]+bounds[1][1])/2}),isMoving:()=>false,getCanvas:()=>({style:{}}),queryRenderedFeatures:()=>[]};
const host={isBusy:()=>false,isMoving:()=>false,fit:async b=>{bounds=b;zoom=6;},syncAppearance(){}};
map.isSourceLoaded=()=>allowPaint;map.triggerRepaint=()=>{if(allowPaint)queueMicrotask(()=>events.get('render')?.forEach(f=>f()));};
const {addArchipelagoPortal}=await import('../dist/archipelago.mjs');
const ph=await addArchipelagoPortal(map,host,'philippines'),id=await addArchipelagoPortal(map,host,'indonesia');assert.deepEqual(fetched,['data/archipelago/philippines-context.bin','data/archipelago/indonesia-context.bin']);
await ph.enter(false);assert.deepEqual(requests,['data/archipelago/philippines-overview.bin']);assert(!fetched.some(x=>x.includes('indonesia-catalogue')));
element('ph-search').value='Luzon';element('ph-search').oninput();assert.equal(element('ph-search-results').children[0].children[0].textContent,'Luzon');await element('ph-search-results').children[0].onclick();assert.equal(element('ph-selection-kind').textContent,'ISLAND');assert(element('ph-parent').hidden,'A whole island is not a child of the province containing its catalogue point');
await new Promise(r=>setTimeout(r,350));assert(requests.some(x=>/philippines-PH/.test(x)));assert([...sources.keys()].filter(k=>/^philippines-PH/.test(k)).length<=4,'Phone installs at most two local parent chunks');
mapWidth=800;events.get('resize').forEach(f=>f());await new Promise(r=>setTimeout(r,350));assert([...sources.keys()].filter(k=>/^philippines-PH/.test(k)).length<=6);const count=requests.length;await new Promise(r=>setTimeout(r,250));assert.equal(requests.length,count,'Increasing the viewport cannot cause an eviction/reload loop');
ph.leave();assert(![...sources.keys()].some(k=>k.startsWith('philippines-')&&k!=='philippines-portal'));
hold=true;const stale=id.warm();await new Promise(r=>setTimeout(r,20));id.leave();await assert.rejects(stale,{name:'AbortError'});hold=false;await id.enter(false);for(const finish of deferred)finish();assert(id.active&&id.ready);assert(sources.has('indonesia-first'));
allowPaint=false;element('id-search').value='Bali';element('id-search').oninput();assert.equal(element('id-search-results').children[0].children[1].textContent,'Province');await element('id-search-results').children[0].onclick();assert.equal(element('id-selection-kind').textContent,'PROVINCE');await new Promise(r=>setTimeout(r,350));assert(sources.has('indonesia-ID51-first'));assert(!layers.get('indonesia-first-fill').filter[1][2][1].includes('ID51'),'Overview must remain until the replacement can paint');allowPaint=true;map.triggerRepaint();await new Promise(r=>setTimeout(r,100));assert(layers.get('indonesia-first-fill').filter[1][2][1].includes('ID51'));id.leave();ph.leave();assert.equal(sources.size,2,'Country context is the only geometry left after leaving both countries');
console.log('Philippines 18/82, Indonesia 38/514, named islands, detailed geometry, bounded eviction, country-only loading, cold island search, shared views and stale-worker disposal passed.');
