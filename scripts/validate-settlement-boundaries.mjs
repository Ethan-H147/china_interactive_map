import {createMapScene} from '../dist/map-scene.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSettlementBoundaries} from '../dist/settlement-boundaries.mjs';
const base=new URL('../dist/data/southern-africa/south-africa/settlement-boundaries/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',base)));
const ids=new Set();let bytes=0;
for(const [province,entry] of Object.entries(manifest.provinces)){
 const raw=readFileSync(new URL(entry.file,base));bytes+=raw.length;
 const data=JSON.parse(gunzipSync(raw));assert.equal(data.regions.features.length,entry.count);
 for(const feature of data.regions.features){const id=feature.properties.id;assert(!ids.has(id));ids.add(id);assert.equal(manifest.cities[id].provinceId,province);assert(['Polygon','MultiPolygon'].includes(feature.geometry.type));}
 const lines=new Set();for(const feature of data.boundaries.features){const coords=feature.geometry.coordinates;assert(coords.length>=2);assert(feature.properties.owners.length);for(const id of feature.properties.owners)assert(data.regions.features.some(f=>f.properties.id===id));const key=JSON.stringify(coords),reverse=JSON.stringify([...coords].reverse());assert(!lines.has(key)&&!lines.has(reverse));lines.add(key);}
}
assert.equal(ids.size,500);assert.equal(bytes,manifest.validation.totalGzipBytes);
const sources=new Map(),layers=new Map(),filters=new Map(),paint=new Map();
let hits=[{properties:{id:'city'}}];
const map={getSource:id=>sources.get(id),getLayer:id=>layers.get(id),addSource:(id,s)=>sources.set(id,s),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),getLayoutProperty:id=>layers.get(id).layout?.visibility,setLayoutProperty(id,k,v){layers.get(id).layout||={};layers.get(id).layout[k]=v;},setFilter:(id,f)=>filters.set(id,f),setPaintProperty:(id,k,v)=>paint.set(id+':'+k,v),getZoom:()=>8,queryRenderedFeatures:()=>hits};
map.getStyle=()=>({layers:[...layers.values()]});map.moveLayer=()=>{};map.getPaintProperty=(id,key)=>paint.get(id+':'+key);const scene=createMapScene(map);
const waiting=[];const controller=createSettlementBoundaries(map,{country:'test',base:'/',manifest:{provinces:{a:{file:'a'},b:{file:'b'}},cities:{}},line:'#000',fill:'#fff',load:(url,{signal})=>new Promise(resolve=>waiting.push({url,signal,resolve}))});
const chunk={regions:{type:'FeatureCollection',features:[]},boundaries:{type:'FeatureCollection',features:[]}};
await controller.setProvince('a');assert.equal(waiting.length,0,'No selection means no boundary download');assert.equal(layers.size,0,'No city outlines by default');
const a=controller.setProvince('a','old'),b=controller.setProvince('b','city');assert(waiting[0].signal.aborted);waiting[1].resolve(chunk);await b;waiting[0].resolve(chunk);await a;assert.equal(controller.province,'b');assert.equal(sources.size,3);assert.equal(layers.size,3);assert(!layers.has('test-city-lines'),'No all-cities outline layer');assert.equal(controller.pick({}), 'city');assert.deepEqual(filters.get('test-city-fill'),['==',['get','id'],'city']);assert.deepEqual(filters.get('test-city-hit'),['==',['get','id'],'city']);assert.deepEqual(filters.get('test-city-selected'),['==',['get','id'],'city']);
hits=[{properties:{id:'unselected'}}];assert.equal(controller.pick({}),null,'Hidden city polygons cannot capture clicks');controller.select('');assert([...layers.values()].every(l=>l.layout.visibility==='none'),'Deselecting hides every city overlay');assert.equal(controller.pick({}),null);controller.select('city');assert([...layers.values()].every(l=>l.layout.visibility==='visible'));
await controller.setProvince('b','other');assert.equal(waiting.length,2,'Another city in the same province reuses the chunk');assert.deepEqual(filters.get('test-city-selected'),['==',['get','id'],'other']);
scene.setSatellite(true,1);assert.equal(paint.get('test-city-fill:fill-opacity'),0);controller.setEnabled(false);assert.equal(sources.size,0);assert.equal(layers.size,0);assert.equal(controller.pick({}),null);
controller.setEnabled(true);const c=controller.setProvince('a','city');controller.leave();assert(waiting[2].signal.aborted);waiting[2].resolve(chunk);await c;assert.equal(sources.size,0);
console.log('500 census boundaries, selected-city-only outlines and hit areas, lazy one-province loading, cache reuse, cancellation, satellite and cleanup passed.');
