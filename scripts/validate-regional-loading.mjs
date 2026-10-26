import {backgroundLandColor} from '../dist/map-palette.mjs';
import {createMapResources} from '../dist/country-loader.mjs';
import {createMapScene} from '../dist/map-scene.mjs';
import {polygonParts} from '../dist/polygon-parts.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {applySharedPlacePages,sharedPlacePage,sharedPlaceGeometry,uniquePlacePages} from '../dist/shared-place-pages.mjs';
import {expandSettlementRecords,enrichPlaces,placeLines,visibleSettlements,settlementFeatures,settlementDotLayers,settlementDotVisible,settlementStatistics} from '../dist/settlement-layer.mjs';
import {selectionLineSourceOptions} from '../dist/outline-detail.mjs';
import {regionalLineWidth} from '../dist/adaptive-lines.mjs';
const elements=new Map(),sources=new Map(),layers=new Map(),handlers=new Map(),jobs=[],revoked=[],fits=[],statistics=[];
const element=id=>{
 if(!elements.has(id))elements.set(id,{id,parentElement:{hidden:false},dataset:{},hidden:false,checked:true,value:'',textContent:'',children:[],get childNodes(){return this.children;},attributes:{},matches(){return false;},classList:{toggle(){},remove(){},add(){}},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},querySelector(){return element(id+'-scroll');},addEventListener(){},querySelectorAll(){return [];},removeAttribute(k){delete this.attributes[k];},remove(){}});
 return elements.get(id);
};
element('mode-lock').attributes['aria-pressed']='false';element('satellite-layer').checked=false;element('satellite-opacity').value='60';
const bounds=[[30,50],[31,51]],records=[...['A','B'].map(id=>({id,en:id,local:id,kind:'Region',level:1,center:[30.5,50.5],bounds})),...['A','B'].map(parent=>({id:parent+'1',en:parent+' District',parent,level:2,kind:'District',center:[30.5,50.5],bounds}))];
const catalogue={records,chunks:{A:{file:'second/A.bin',count:1},B:{file:'second/B.bin',count:1}}};
let hit;const layerOrder=[];
const states=new Map();
const map={setFeatureState({source,id},state){states.set(source+'|'+id,state);},removeFeatureState({source,id}){states.delete(source+'|'+id);},addSource(id,options){sources.set(id,{...options,loaded:true});},getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),addLayer(l,before){layers.set(l.id,l);const index=layerOrder.indexOf(before);if(index<0)layerOrder.push(l.id);else layerOrder.splice(index,0,l.id);},getLayer:id=>layers.get(id),removeLayer(id){layers.delete(id);layerOrder.splice(layerOrder.indexOf(id),1);},moveLayer(id){layerOrder.splice(layerOrder.indexOf(id),1);layerOrder.push(id);},setPaintProperty(id,key,value){(layers.get(id).paint??={})[key]=value;},setFilter(){},setLayoutProperty(id,key,value){(layers.get(id).layout??={})[key]=value;},getLayoutProperty(id,key){return layers.get(id).layout?.[key];},queryRenderedFeatures:()=>hit?[hit]:[],isSourceLoaded:id=>sources.get(id)?.loaded,on(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},off(type,fn){handlers.get(type)?.delete(fn);},getBounds:()=>({getWest:()=>-180,getEast:()=>200,getSouth:()=>-65,getNorth:()=>80}),isMoving:()=>false};
let nextURL=0,labelRecords=[];
const context=vm.createContext({applySharedPlacePages,sharedPlacePage,sharedPlaceGeometry,uniquePlacePages,createFirstLevelQuiz:()=>undefined,backgroundLandColor,createMapResources,selectionLineSourceOptions,console,setTimeout,clearTimeout,DOMException,Option:class{constructor(text,value){this.text=text;this.value=value;}},Image:class{decode(){return Promise.resolve();}},URL:{createObjectURL:()=>String(++nextURL),revokeObjectURL:url=>revoked.push(url)},
 Worker:class{constructor(){jobs.push(this);}postMessage(data){this.request=data;}terminate(){this.terminated=true;}},
 document:{createDocumentFragment:()=>element('fragment-'+Math.random()),getElementById:element,createElement:tag=>element('new-'+tag+'-'+Math.random()),querySelector:()=>({insertBefore(){}})},
 window:{AtlasCountries:{ids:['brazil','france']},AtlasSymbols:{markup:()=>'<svg/>'},AtlasLabels:{render:(_map,records)=>{labelRecords=records;return [];}}},
 createCountryPage:options=>element(options.id),setSubdivisionHeading:(node,label,count)=>node.textContent=label+' '+count,
 loadCompressed:async file=>file.endsWith('catalogue.bin')?catalogue:{type:'FeatureCollection',features:[]},createPlaceSearch,polygonParts,
 // Outlines are decoded in MapLibre's workers (geo-pack.mjs addWorkerSource); the source names its file.
 addWorkerSource:async(map,id,url,options,transform)=>{map.addSource(id,{...options,data:url,transform});return true;},
 addInternationalBorder(map,id,source){map.addLayer({id,type:'line',source,paint:{}});},setLayerVisible(map,id,visible){if(map.getLayer(id))map.setLayoutProperty(id,'visibility',visible?'visible':'none');},lineWidth:regionalLineWidth,lineSourceOptions:{type:'geojson'},internationalLineSourceOptions:{type:'geojson',tolerance:.125},adaptiveOpacity:()=>1,renderStatistics(anchor,key){statistics.push(key);},clearStatistics(){},renderPlaceOverview(anchor,record){anchor.hidden=!record?.overview;}});
const source=fs.readFileSync('dist/regional-country.mjs','utf8').replace(/^import .*;\r?\n/gm,'').replace('export async function','async function').replace("new URL('./country-boundary-worker.mjs',import.meta.url)","'worker.mjs'");
const breadcrumbSource=fs.readFileSync('dist/country-page.mjs','utf8');
vm.runInContext(breadcrumbSource.slice(breadcrumbSource.indexOf('export function setMapBreadcrumb')).replaceAll('export function','function'),context);
vm.runInContext(source,context);
map.getStyle=()=>({layers:layerOrder.map(id=>layers.get(id))});map.getPaintProperty=(id,key)=>layers.get(id)?.paint?.[key];createMapScene(map);
const host={isBusy:()=>false,fit:async b=>fits.push(b),controls(){}};
for(const [id,role] of [['world-land','land'],['china-context','context'],['south-brazil-fill','fill']])map.addLayer({id,type:'fill',metadata:{atlas:{role}}});
const atlas=await context.addRegionalCountry(map,host,{country:'test',neighbours:true,prefix:'test',base:'data/test/',name:'Test',nationalFlag:'flag.svg',flags:{},detailFlags:{B1:{file:'city.svg',page:'https://example.org/city-flag',credit:'Official flag',license:'Public domain'}},hasStatistics:r=>r.level===1||r.id==='B1',bounds,firstLabel:'Regions',secondLabel:'Districts'});
assert(layerOrder.indexOf('test-neighbours')<layerOrder.indexOf('south-brazil-fill'),'A late neighbouring-land layer cannot cover the active Brazil map');
const flush=()=>new Promise(resolve=>setImmediate(resolve)),complete=job=>job.onmessage({data:{blob:{},borders:{}}});
const entering=atlas.enter(false);await flush();assert.equal(jobs[0].request.url,'data/test/first.bin');complete(jobs[0]);await entering;
assert(atlas.ready);assert(!sources.has('test-second'),'Entry does not load district geometry');
const originalBounds=map.getBounds;map.getRenderWorldCopies=()=>true;map.getBounds=()=>({getWest:()=>-330,getEast:()=>-329,getSouth:()=>50,getNorth:()=>51});atlas.updateLabels();assert(labelRecords.some(r=>r.id==='A'&&r.center[0]===-329.5),'Regional labels follow the visible world copy');assert.equal(records[0].center[0],30.5,'Wrapped label positions never mutate the catalogue');map.getBounds=originalBounds;map.getRenderWorldCopies=()=>false;
assert.equal(atlas.hoverAt(null,'A').en,'A','The shared overview resolves full catalogue names without selecting');assert.equal(atlas.getSelection(),null);
const select=id=>{element('test-province').value=id;return element('test-province').onchange();};
const first=select('A');await flush();const obsolete=jobs.at(-1);
const second=select('B');await flush();assert(obsolete.terminated,'Selecting a new region terminates the previous worker');
complete(jobs.at(-1));await second;await first;assert.equal(atlas.getSelection(),'B');assert.equal(fits.length,1,'Cancelled selections never move the camera');
assert(sources.has('test-second'));assert.equal([...sources.keys()].filter(id=>id==='test-second').length,1);
assert(states.get('test-first|B')?.selected,'Selection sets GPU state on the existing province source');const fillStyle=JSON.stringify(layers.get('test-first-fill').paint['fill-color']);await atlas.restore('B1');assert(!states.has('test-first|B'),'Moving to a district clears the old province selection');assert(states.get('test-second|B1')?.selected);assert.equal(JSON.stringify(layers.get('test-first-fill').paint['fill-color']),fillStyle,'Selection does not recompile fill paint');assert(!element('test-detail-flag-source').hidden);assert.equal(element('test-detail-flag').src,'city.svg');assert.equal(statistics.at(-1),'test:B1','City selection renders its own card');
const third=select('A');await flush();assert(!sources.has('test-second'),'Previous district geometry is released before fetching another region');
assert(element('test-detail-flag-source').hidden,'Selecting a region removes the third city flag');
const late=jobs.at(-1);atlas.leave();assert(late.terminated);complete(late);await third;
assert(!atlas.ready);assert(!sources.has('test-first'));assert(!sources.has('test-second'),'Late worker messages cannot restore a departed country');
assert(revoked.length>=4,'First and second-level object URLs are released');
console.log('Shared regional loader: districts load on selection, superseded workers cancel, stale flights are suppressed, only one region remains installed, and leaving releases detailed sources and URLs.');

records.push(...['A','B'].map(parent=>({id:parent+'11',en:parent+' Municipality',parent:parent+'1',level:3,kind:'Municipality',center:[30.5,50.5],bounds})));
catalogue.chunks.A1={file:'third/A1.bin',count:1};catalogue.chunks.B1={file:'third/B1.bin',count:1};
map.addLayer({id:'satellite-imagery',type:'raster'},'china-context');
const tree=await context.addRegionalCountry(map,host,{country:'tree',neighbours:true,prefix:'tree',base:'data/tree/',name:'Tree',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'Provinces',secondLabel:'Districts',thirdLabel:'Municipalities'});
assert(layerOrder.indexOf('tree-neighbours')<layerOrder.indexOf('satellite-imagery'),'Neighbour land loaded after satellite stays underneath the imagery');
let task=tree.enter(false);await flush();complete(jobs.at(-1));await task;
assert(!sources.has('tree-second')&&!sources.has('tree-third'),'Third-level country entry remains lazy');
task=tree.restore('A11');await flush();assert.equal(jobs.at(-1).request.url,'data/tree/second/A.bin');complete(jobs.at(-1));await flush();assert.equal(jobs.at(-1).request.url,'data/tree/third/A1.bin');complete(jobs.at(-1));await task;
assert.equal(tree.getSelection(),'A11');assert.equal(tree.getMode(),3);assert(sources.has('tree-second')&&sources.has('tree-third'),'Deep links resolve and load their full ancestry');
element('mode-lock').attributes['aria-pressed']='true';
for(const [id,layer]of [['A1','second'],['A','first']]){hit={layer:{id:'tree-'+layer+'-fill'},properties:{id}};assert.equal(tree.hoverAt(null),null,'Locked municipalities reject parent polygon hits');assert.equal(tree.hoverAt(null,id),null,'Parent labels cannot bypass the locked level');}
hit={layer:{id:'tree-third-fill'},properties:{id:'A11'}};assert.equal(tree.hoverAt(null).id,'A11','Locked municipalities remain selectable');
element('mode-lock').attributes['aria-pressed']='false';hit={layer:{id:'tree-second-fill'},properties:{id:'A1'}};assert.equal(tree.hoverAt(null).id,'A1','Unlock restores parent fallback');hit=undefined;
task=tree.restore('B11');await flush();assert(!sources.has('tree-second')&&!sources.has('tree-third'),'Changing province releases both detailed levels');complete(jobs.at(-1));await flush();complete(jobs.at(-1));await task;
await tree.setMode(2);assert(sources.has('tree-second')&&!sources.has('tree-third'),'Returning to districts releases municipality geometry');
task=tree.restore('A11');await flush();const superseded=jobs.at(-1);tree.leave();assert(superseded.terminated);complete(superseded);await task;
assert(!sources.has('tree-first')&&!sources.has('tree-second')&&!sources.has('tree-third'),'Leaving releases all three levels and ignores late results');
console.log('Three-level adapter: deep selection resolves ancestry, ordered parent-only chunks load, mode changes release unused municipalities, and country changes cancel every level.');

// Partly bundled: provinces and districts arrive together; municipalities load per district.
const part=await context.addRegionalCountry(map,host,{country:'part',prefix:'part',base:'data/part/',name:'Part',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'Provinces',secondLabel:'Districts',thirdLabel:'Municipalities',bundledLevels:2});
task=part.enter(false);await flush();assert.equal(jobs.at(-1).request.url,'data/part/all.bin','Entry loads the two bundled levels in one request');jobs.at(-1).onmessage({data:{levels:[1,2].map(level=>({level,blob:{},borders:{}}))}});await task;
assert(sources.has('part-first')&&sources.has('part-second')&&!sources.has('part-third'),'Bundled levels install; municipalities stay lazy');
await part.setMode(2);assert.equal(layers.get('part-second-fill').layout.visibility,'visible','Districts show before any province is selected');
let before=jobs.length;task=part.restore('A11');await flush();assert.equal(jobs.length,before+1,'Only the municipality chunk is requested');assert.equal(jobs.at(-1).request.url,'data/part/third/A1.bin');complete(jobs.at(-1));await task;
assert.equal(part.getSelection(),'A11');assert.equal(part.getMode(),3);assert(sources.has('part-second')&&sources.has('part-third'));
task=part.restore('B11');await flush();assert(sources.has('part-second'),'Changing district keeps the bundled districts');assert.equal(jobs.at(-1).request.url,'data/part/third/B1.bin');complete(jobs.at(-1));await task;
await part.setMode(2);assert(sources.has('part-second')&&!sources.has('part-third'),'Returning to districts releases municipality geometry only');
task=part.restore('A1');await flush();assert.equal(jobs.at(-1).request.url,'data/part/third/A1.bin','Selecting a district opens its municipalities');complete(jobs.at(-1));await task;assert.equal(part.getMode(),3);
part.leave();assert(!sources.has('part-first')&&!sources.has('part-second')&&!sources.has('part-third'),'Leaving releases every level');
console.log('Partly bundled adapter: one entry request for bundled levels, districts visible without selection, municipalities load and release per district, and leaving releases all.');

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
assert.equal(sources.get('whole-international').tolerance,.125,'A country’s coarse subdivision tolerance never overrides thin international frontiers');
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
Object.assign(context,{expandSettlementRecords,enrichPlaces,placeLines,visibleSettlements,settlementFeatures,settlementDotLayers,settlementDotVisible,settlementStatistics});
const cityLoads=[],citySelections=[];let cleared=0;
context.createSettlementBoundaries=()=>({async setProvince(province,id){cityLoads.push({province,id});},select:id=>citySelections.push(id),clear:()=>cleared++,enter(){},leave(){},appearance(){},pick:()=>null});
context.createCountryPage=options=>{assert(!options.settings.includes('City outlines'),'No redundant city-outline checkbox');return element(options.id);};
const city={id:'C1',en:'City',parentId:'A11',provinceId:'A',center:[30.5,50.5],kind:'Settlement',population:{value:100000,year:2011,source:'https://census.test/city',scopeNote:'Census main place'},area:{value:20,year:2011,source:'https://census.test/city'}};
context.fetch=async url=>({ok:true,json:async()=>url.endsWith('manifest.json')?{cities:{C1:{bounds}},provinces:{A:{file:'a.bin'}}}:url.endsWith('settlements.json')?{records:[city]}:{places:{city:{names:{zu:{name:'Local City',source:'https://names.test',type:'attested language name'}},flag:{file:'city.svg',page:'https://flag.test',scope:'Historical city',status:'historical',year:'to 2000'}}}}});
map.getZoom=()=>8;
const cards=[];context.renderStatistics=(anchor,key,data)=>cards.push({key,data});
const settlements=await context.addRegionalCountry(map,host,{country:'places',prefix:'places',base:'data/places/',name:'Places',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'Provinces',secondLabel:'Districts',thirdLabel:'Municipalities',loadAllSubdivisions:true,settlements:true,settlementBoundaries:true,labelLanguages:[['both','Bilingual'],['en','English'],['zu','Zulu']]});
task=settlements.enter(false);await flush();jobs.at(-1).onmessage({data:allPayload});await task;
settlements.updateLabels();assert.equal(cityLoads.length,0,'Zooming into the country does not load city polygons');await settlements.restore('A');assert.equal(cityLoads.length,0,'Selecting a province does not load all its city outlines');
await settlements.home(false);const beforeHover=jobs.length;assert.equal(settlements.hoverAt(null,'C1').kind,'Settlement');assert.equal(settlements.hoverAt(null,'C1').overviewNames.join(' · '),'City · Local City');assert.equal(settlements.getSelection(),null);assert.equal(jobs.length,beforeHover,'Hover never loads geometry or selects a city');
assert(sources.has('places-settlements'));await settlements.restore('C1');assert.equal(settlements.getMode(),3);assert.equal(cards.at(-1).key,'places:C1');assert.equal(cards.at(-1).data.regions['places:C1'].population.value,100000);assert(!cards.at(-1).data.regions['places:C1'].gdp,'Cities cannot inherit municipal GDP');assert(cards.at(-1).data.sources[city.population.source].url);
assert.equal(cityLoads.at(-1).province,'A');assert.equal(cityLoads.at(-1).id,'C1');assert.equal(citySelections.at(-1),'C1');
assert(/historical/i.test(element('places-flag-caption').textContent));settlements.setLanguage('zu');assert.equal(settlements.getLanguage(),'zu');
element('places-search').value='Local City';element('places-search').oninput();assert(element('places-search-results').children.some(r=>r.children?.[0]?.textContent==='City'));
const clearedBefore=cleared;await settlements.restore('A11');assert(cleared>clearedBefore,'Selecting an administrative region removes the selected city outline');
hit={layer:{id:'places-settlements'},properties:{id:'C1'}};for(const fn of handlers.get('click'))fn({point:[0,0]});await flush();assert.equal(settlements.getSelection(),'C1');assert.equal(cityLoads.at(-1).id,'C1','Clicking a city dot requests exactly that city outline');
settlements.leave();assert(!sources.has('places-settlements')&&!layers.has('places-settlements'));
console.log('Settlement adapter: independent city cards and source links, multilingual search, scoped flags, point selection, shared language and complete release passed.');

// Independent detail chunks can be fetched and installed as one cancellable batch.
const batched=await context.addRegionalCountry(map,host,{country:'batch',prefix:'batch',base:'data/batch/',name:'Batch',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'States',secondLabel:'Counties',thirdLabel:'Municipalities',parallelDetails:true,deferOutlines:true});
task=batched.enter(false);await flush();complete(jobs.at(-1));await task;
const batchPayload={chunks:[{blob:{},borders:{}},{blob:{},borders:{}}]};
task=batched.restore('A11');await flush();
assert.deepEqual(Array.from(jobs.at(-1).request.urls),['data/batch/second/A.bin','data/batch/third/A1.bin']);
assert.equal(jobs.at(-1).request.deferOutlines,true);
jobs.at(-1).onmessage({data:batchPayload});await task;
assert.equal(batched.getSelection(),'A11');assert(sources.has('batch-second')&&sources.has('batch-third'));
const oldSelection=batched.restore('B11');await flush();const oldBatch=jobs.at(-1);
task=batched.restore('A11');await flush();assert(oldBatch.terminated,'New selection cancels every request in the old batch');
oldBatch.onmessage({data:batchPayload});jobs.at(-1).onmessage({data:batchPayload});await task;await oldSelection;
assert.equal(batched.getSelection(),'A11','Late batches cannot overwrite the latest selection');
batched.leave();assert(!sources.has('batch-first')&&!sources.has('batch-second')&&!sources.has('batch-third'));
console.log('Parallel regional details: independent requests, atomic installation, selected-outline readiness, superseded batches and complete release passed.');
// Data may be indexed while off-screen tiles are deliberately not ready.
const originalAdd=map.addSource,originalLoaded=map.isSourceLoaded;
map.addSource=(id,options)=>{originalAdd(id,options);if(id.startsWith('offscreen-'))sources.get(id).loaded=()=>true;};
map.isSourceLoaded=id=>id.startsWith('offscreen-')?false:originalLoaded(id);
const offscreen=await context.addRegionalCountry(map,host,{country:'offscreen',prefix:'offscreen',base:'data/offscreen/',name:'Islands',nationalFlag:'flag.svg',flags:{},bounds,firstLabel:'Regions',secondLabel:'Islands',parallelDetails:true});
task=offscreen.enter(false);await flush();complete(jobs.at(-1));await task;
task=offscreen.restore('A1');await flush();jobs.at(-1).onmessage({data:{blob:{},borders:{},outlines:{},hasBorders:false}});await task;
assert(sources.has('offscreen-second'),'Off-screen data is retained rather than timing out waiting for visible tiles');assert.equal(element('offscreen-error').textContent,'');assert.equal(offscreen.getSelection(),'A1');offscreen.leave();map.addSource=originalAdd;map.isSourceLoaded=originalLoaded;
console.log('Off-screen islands: worker-indexed geometry and empty border layers become ready without waiting for visible map tiles.');
