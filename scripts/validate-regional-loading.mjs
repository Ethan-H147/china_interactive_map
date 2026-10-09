import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPlaceSearch} from '../dist/place-search.mjs';
const elements=new Map(),sources=new Map(),layers=new Map(),handlers=new Map(),jobs=[],revoked=[],fits=[],statistics=[];
const element=id=>{
 if(!elements.has(id))elements.set(id,{id,dataset:{},hidden:false,checked:true,value:'',textContent:'',children:[],attributes:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},querySelector(){return element(id+'-scroll');},addEventListener(){}});
 return elements.get(id);
};
element('mode-lock').attributes['aria-pressed']='false';element('satellite-layer').checked=false;element('satellite-opacity').value='60';
const bounds=[[30,50],[31,51]],records=[...['A','B'].map(id=>({id,en:id,local:id,kind:'Region',level:1,center:[30.5,50.5],bounds})),...['A','B'].map(parent=>({id:parent+'1',en:parent+' District',parent,level:2,kind:'District',center:[30.5,50.5],bounds}))];
const catalogue={records,chunks:{A:{file:'second/A.bin',count:1},B:{file:'second/B.bin',count:1}}};
let hit;const layerOrder=[];
const map={addSource(id,options){sources.set(id,{...options,loaded:true});},getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),addLayer(l){layers.set(l.id,l);layerOrder.push(l.id);},getLayer:id=>layers.get(id),removeLayer(id){layers.delete(id);layerOrder.splice(layerOrder.indexOf(id),1);},moveLayer(id){layerOrder.splice(layerOrder.indexOf(id),1);layerOrder.push(id);},setPaintProperty(){},setFilter(){},setLayoutProperty(id,key,value){(layers.get(id).layout??={})[key]=value;},getLayoutProperty(id,key){return layers.get(id).layout?.[key];},queryRenderedFeatures:()=>hit?[hit]:[],isSourceLoaded:id=>sources.get(id)?.loaded,on(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},off(type,fn){handlers.get(type)?.delete(fn);},getBounds:()=>({getWest:()=>-180,getEast:()=>200,getSouth:()=>-65,getNorth:()=>80}),isMoving:()=>false};
let nextURL=0;
const context=vm.createContext({console,setTimeout,clearTimeout,DOMException,Option:class{constructor(text,value){this.text=text;this.value=value;}},Image:class{decode(){return Promise.resolve();}},URL:{createObjectURL:()=>String(++nextURL),revokeObjectURL:url=>revoked.push(url)},
 Worker:class{constructor(){jobs.push(this);}postMessage(data){this.request=data;}terminate(){this.terminated=true;}},
 document:{getElementById:element,createElement:tag=>element('new-'+tag+'-'+Math.random()),querySelector:()=>({insertBefore(){}})},
 window:{AtlasSymbols:{markup:()=>'<svg/>'},AtlasLabels:{render:()=>[]}},
 createCountryPage:options=>element(options.id),setSubdivisionHeading:(node,label,count)=>node.textContent=label+' '+count,
 loadCompressed:async file=>file.endsWith('catalogue.bin')?catalogue:{type:'FeatureCollection',features:[]},createPlaceSearch,
 setLayerVisible(map,id,visible){if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');},lineSourceOptions:{type:'geojson'},adaptiveOpacity:()=>1,renderStatistics(anchor,key){statistics.push(key);},clearStatistics(){}});
const source=fs.readFileSync('dist/regional-country.mjs','utf8').replace(/^import .*;\r?\n/gm,'').replace('export async function','async function').replace("new URL('./country-boundary-worker.mjs',import.meta.url)","'worker.mjs'");
vm.runInContext(source,context);
const host={isBusy:()=>false,fit:async b=>fits.push(b),controls(){}};
const atlas=await context.addRegionalCountry(map,host,{country:'test',prefix:'test',base:'data/test/',name:'Test',nationalFlag:'flag.svg',flags:{},detailFlags:{B1:{file:'city.svg',page:'https://example.org/city-flag',credit:'Official flag',license:'Public domain'}},hasStatistics:r=>r.level===1||r.id==='B1',bounds,firstLabel:'Regions',secondLabel:'Districts'});
const flush=()=>new Promise(resolve=>setImmediate(resolve)),complete=job=>job.onmessage({data:{blob:{},borders:{}}});
const entering=atlas.enter(false);await flush();assert.equal(jobs[0].request.url,'data/test/first.bin');complete(jobs[0]);await entering;
assert(atlas.ready);assert(!sources.has('test-second'),'Entry does not load district geometry');
const select=id=>{element('test-province').value=id;return element('test-province').onchange();};
const first=select('A');await flush();const obsolete=jobs.at(-1);
const second=select('B');await flush();assert(obsolete.terminated,'Selecting a new region terminates the previous worker');
complete(jobs.at(-1));await second;await first;assert.equal(atlas.getSelection(),'B');assert.equal(fits.length,1,'Cancelled selections never move the camera');
assert(sources.has('test-second'));assert.equal([...sources.keys()].filter(id=>id==='test-second').length,1);
await atlas.restore('B1');assert(!element('test-detail-flag-source').hidden);assert.equal(element('test-detail-flag').src,'city.svg');assert.equal(statistics.at(-1),'test:B1','City selection renders its own card');
const third=select('A');await flush();assert(!sources.has('test-second'),'Previous district geometry is released before fetching another region');
assert(element('test-detail-flag-source').hidden,'Selecting a region removes the third city flag');
const late=jobs.at(-1);atlas.leave();assert(late.terminated);complete(late);await third;
assert(!atlas.ready);assert(!sources.has('test-first'));assert(!sources.has('test-second'),'Late worker messages cannot restore a departed country');
assert(revoked.length>=4,'First and second-level object URLs are released');
console.log('Shared regional loader: districts load on selection, superseded workers cancel, stale flights are suppressed, only one region remains installed, and leaving releases detailed sources and URLs.');

records.push(...['A','B'].map(parent=>({id:parent+'11',en:parent+' Municipality',parent:parent+'1',level:3,kind:'Municipality',center:[30.5,50.5],bounds})));
catalogue.chunks.A1={file:'third/A1.bin',count:1};catalogue.chunks.B1={file:'third/B1.bin',count:1};
const tree=await context.addRegionalCountry(map,host,{country:'tree',prefix:'tree',base:'data/tree/',name:'Tree',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'Provinces',secondLabel:'Districts',thirdLabel:'Municipalities'});
let task=tree.enter(false);await flush();complete(jobs.at(-1));await task;
assert(!sources.has('tree-second')&&!sources.has('tree-third'),'Third-level country entry remains lazy');
task=tree.restore('A11');await flush();assert.equal(jobs.at(-1).request.url,'data/tree/second/A.bin');complete(jobs.at(-1));await flush();assert.equal(jobs.at(-1).request.url,'data/tree/third/A1.bin');complete(jobs.at(-1));await task;
assert.equal(tree.getSelection(),'A11');assert.equal(tree.getMode(),3);assert(sources.has('tree-second')&&sources.has('tree-third'),'Deep links resolve and load their full ancestry');
task=tree.restore('B11');await flush();assert(!sources.has('tree-second')&&!sources.has('tree-third'),'Changing province releases both detailed levels');complete(jobs.at(-1));await flush();complete(jobs.at(-1));await task;
await tree.setMode(2);assert(sources.has('tree-second')&&!sources.has('tree-third'),'Returning to districts releases municipality geometry');
task=tree.restore('A11');await flush();const superseded=jobs.at(-1);tree.leave();assert(superseded.terminated);complete(superseded);await task;
assert(!sources.has('tree-first')&&!sources.has('tree-second')&&!sources.has('tree-third'),'Leaving releases all three levels and ignores late results');
console.log('Three-level adapter: deep selection resolves ancestry, ordered parent-only chunks load, mode changes release unused municipalities, and country changes cancel every level.');

const whole=await context.addRegionalCountry(map,host,{country:'whole',prefix:'whole',base:'data/whole/',name:'Whole',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'Provinces',secondLabel:'Districts',thirdLabel:'Municipalities',loadAllSubdivisions:true,lineTolerance:1.5});
const allPayload={levels:[1,2,3].map(level=>({level,blob:{},borders:{}}))};
task=whole.enter(false);await flush();assert.equal(jobs.at(-1).request.url,'data/whole/all.bin');assert(!whole.ready,'Country stays pending until every level is prepared');jobs.at(-1).onmessage({data:allPayload});await task;
assert([1,2,3].every((_,i)=>sources.has('whole-'+['first','second','third'][i])),'Country entry installs all three levels');
const requests=jobs.length;
await whole.setMode(3);assert.equal(layers.get('whole-third-fill').layout.visibility,'visible','Municipalities are accessible before a parent is selected');
const lastFill=Math.max(...['first','second','third'].map(l=>layerOrder.indexOf('whole-'+l+'-fill')));
for(const level of ['first','second','third']){
 for(const suffix of ['lines','selected']){const id='whole-'+level+'-'+suffix;assert(layerOrder.indexOf(id)>lastFill,'No municipality fill can obscure any parent border');const width=layers.get(id).paint['line-width'];assert.equal(width[0],'interpolate');assert(width[4]<width[8],'Zoomed-out boundaries use thinner strokes');}
 assert.equal(sources.get('whole-'+level+'-edges').tolerance,1.5);assert.equal(sources.get('whole-'+level).tolerance,0,'Simplification only affects strokes, not region fills');
}
assert(layerOrder.indexOf('whole-first-lines')>layerOrder.indexOf('whole-second-lines'),'Province outlines remain above district strokes');
hit={layer:{id:'whole-third-fill'},properties:{id:'B11'}};for(const fn of handlers.get('click'))fn({point:[0,0]});await flush();assert.equal(whole.getSelection(),'B11','Map selection works in a municipality outside the current province');
await whole.restore('A11');await whole.setMode(1);await whole.home();await whole.setMode(2);
assert.equal(jobs.length,requests,'Selection, mode switches, and home never fetch parent chunks');
assert(sources.has('whole-third'),'Hidden municipality geometry remains ready');assert.equal(layers.get('whole-third-fill').layout.visibility,'none');assert.equal(layers.get('whole-second-fill').layout.visibility,'visible');
whole.leave();assert(!sources.has('whole-first')&&!sources.has('whole-second')&&!sources.has('whole-third'),'Leaving releases the complete country');
task=whole.enter(false);await flush();const cancelled=jobs.at(-1);const rejected=assert.rejects(task,{name:'AbortError'});whole.leave();assert(cancelled.terminated);cancelled.onmessage({data:allPayload});await rejected;
assert(!whole.ready&&!sources.has('whole-third'),'Cancelled country-wide preparation cannot install late geometry');
task=whole.enter(false);await flush();const failed=assert.rejects(task,/Unavailable/);jobs.at(-1).onmessage({data:{error:'Unavailable'}});await failed;assert(!whole.ready&&!sources.has('whole-first'));
task=whole.enter(false);await flush();jobs.at(-1).onmessage({data:allPayload});await task;assert(whole.ready,'Whole-country loading can retry after failure');whole.leave();
console.log('Whole-country adapter: one entry bundle, all levels available globally, no selection requests, retained hidden geometry, cancellation, retry and complete release passed.');
