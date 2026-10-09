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
const map={addSource(id,options){sources.set(id,{...options,loaded:true});},getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),addLayer(l){layers.set(l.id,l);},getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),moveLayer(){},setPaintProperty(){},setFilter(){},setLayoutProperty(){},getLayoutProperty(){},isSourceLoaded:id=>sources.get(id)?.loaded,on(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},off(type,fn){handlers.get(type)?.delete(fn);},getBounds:()=>({getWest:()=>-180,getEast:()=>200,getSouth:()=>-65,getNorth:()=>80}),isMoving:()=>false};
let nextURL=0;
const context=vm.createContext({console,setTimeout,clearTimeout,DOMException,Option:class{constructor(text,value){this.text=text;this.value=value;}},Image:class{decode(){return Promise.resolve();}},URL:{createObjectURL:()=>String(++nextURL),revokeObjectURL:url=>revoked.push(url)},
 Worker:class{constructor(){jobs.push(this);}postMessage(data){this.request=data;}terminate(){this.terminated=true;}},
 document:{getElementById:element,createElement:tag=>element('new-'+tag+'-'+Math.random()),querySelector:()=>({insertBefore(){}})},
 window:{AtlasSymbols:{markup:()=>'<svg/>'},AtlasLabels:{render:()=>[]}},
 createCountryPage:options=>element(options.id),setSubdivisionHeading:(node,label,count)=>node.textContent=label+' '+count,
 loadCompressed:async file=>file.endsWith('catalogue.bin')?catalogue:{type:'FeatureCollection',features:[]},createPlaceSearch,
 setLayerVisible(){},lineSourceOptions:{type:'geojson'},adaptiveOpacity:()=>1,renderStatistics(anchor,key){statistics.push(key);},clearStatistics(){}});
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
