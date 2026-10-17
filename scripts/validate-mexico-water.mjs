import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load,landIndex,polygons} from './geo-index.mjs';
import {createRegionalWater} from '../dist/regional-water.mjs';
import '../dist/countries.js';
const base='dist/data/europe/mexico/',land=load(base+'first.bin').regions,water=load(base+'water.bin'),context=load(base+'context.bin');
const waterPolygons=water.features.filter(f=>f.properties.kind==='lake'),rivers=water.features.filter(f=>f.properties.kind==='river');
assert.equal(land.features.length,32);assert.equal(waterPolygons.length,9377);assert.equal(rivers.length,51);
const areas=land.features.map(f=>({id:f.properties.id,contains:landIndex(polygons(f.geometry).flat())}));
const wet=waterPolygons.map(f=>({feature:f,contains:landIndex(polygons(f.geometry).flat())}));
const coastal=landIndex(context.features.flatMap(f=>polygons(f.geometry).flat()));
for(const [name,point,id] of [
 ['Terminos Lagoon',[-91.7,18.6],'MX-CAM'],
 ['Mecoacan Lagoon',[-93.116,18.416],'MX-TAB'],
 ['Machona Lagoon',[-93.619336,18.345438],'MX-TAB'],
 ['Alvarado Lagoon',[-95.78,18.75],'MX-VER'],
 ['Malpaso Reservoir',[-93.734931,17.183045],'MX-CHP']
]){
 assert.deepEqual(areas.filter(a=>a.contains(point)).map(a=>a.id),[id],name+' remains in exactly one solid selectable state');
 assert(coastal(point),name+' has solid context before and after country switching');
 assert(wet.some(w=>w.contains(point)),name+' has an independent blue water polygon');
}
for(const p of [[-92,20],[-94,14],[-90,22]]){assert(!coastal(p),'Open sea remains outside the land mask');assert(!wet.some(w=>w.contains(p)),'Water overlay cannot flood the sea');}
assert(waterPolygons.some(f=>polygons(f.geometry).some(p=>p.length>1)),'Water islands are retained');
for(const f of water.features){assert(f.properties.sourceId&&Number.isFinite(f.properties.visibleZoom));assert(['Polygon','MultiPolygon','LineString','MultiLineString'].includes(f.geometry.type));}
for(const n of ['Grijalva-Usumacinta','Papaloapan','Coatzacoalcos','Bravo'])assert(rivers.some(f=>f.properties.name===n),n+' river retained');
const pins=load('scripts/mexico-water-sources.json'),metadata=load(base+'water-sources.json');
assert.deepEqual(metadata.sourcePins,pins,'Shipped metadata records the build source pins');
assert.equal(createHash('sha256').update(fs.readFileSync(base+'water.bin')).digest('hex'),metadata.sha256,'Shipped hydrography matches the audited build');
for(const [file,p]of Object.entries(pins.files)){const cached='artifacts/mexico-water-source/'+file;if(fs.existsSync(cached))assert.equal(createHash('sha256').update(fs.readFileSync(cached)).digest('hex'),p.sha256,'Pinned '+file);}
assert(AtlasCountries.countries.mexico.controls.includes('mx-water-layer'),'Toggle participates in saved views');
const flush=()=>new Promise(r=>setImmediate(r));
function setup(load){
 const layers=new Map(),sources=new Map();let active=true;
 const input={checked:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(_,fn){this.change=fn;}},status={hidden:true};
 const map={addSource(id,s){assert(!sources.has(id));sources.set(id,s);},getSource:id=>sources.get(id),removeSource:id=>sources.delete(id),addLayer(l){assert(!layers.has(l.id));layers.set(l.id,l);},getLayer:id=>layers.get(id),removeLayer:id=>layers.delete(id),setLayoutProperty(id,k,v){layers.get(id).layout[k]=v;}};
 const controller=createRegionalWater(map,{id:'test',input,status,load,visible:()=>active,spinner:()=>'<svg></svg>'});
 return {controller,input,status,layers,sources,setActive(v){active=v;},toggle(v){input.checked=v;input.change();}};
}
let resolve,loads=0;const test=setup(()=>{loads++;return new Promise(r=>resolve=r);});
test.controller.sync();assert.equal(loads,0,'Default off does not download water');
test.toggle(true);await flush();test.toggle(false);test.toggle(true);assert.equal(loads,1,'Rapid toggles share a download');
resolve(water);await flush();assert.equal(test.layers.size,3);assert([...test.layers.values()].every(l=>l.layout.visibility==='visible'));
test.toggle(false);assert([...test.layers.values()].every(l=>l.layout.visibility==='none'));test.toggle(true);assert.equal(loads,1);
test.setActive(false);test.controller.dispose();assert.equal(test.layers.size,0);assert.equal(test.sources.size,0);
test.setActive(true);test.controller.sync();await flush();test.setActive(false);test.controller.dispose();resolve(water);await flush();assert.equal(test.sources.size,0,'Late water cannot restore a departed country');
let attempts=0;const retry=setup(async()=>{if(++attempts===1)throw Error('Expected request failure');return water;});
retry.toggle(true);await flush();assert(!retry.input.checked&&!retry.status.hidden);retry.toggle(true);await flush();assert.equal(retry.layers.size,3);assert(retry.status.hidden);
console.log('Mexico water: solid state/coast masks at five lagoons/reservoirs, open-sea exclusion, islands, principal rivers, pinned sources, saved-control registration, lazy toggles, retry and departed-country cleanup passed.');
