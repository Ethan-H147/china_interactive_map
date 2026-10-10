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
const map={getSource:id=>sources.get(id),getLayer:id=>layers.get(id),addSource:(id,s)=>sources.set(id,s),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),removeSource:id=>sources.delete(id),getLayoutProperty(){},setLayoutProperty(){},setFilter:(id,f)=>filters.set(id,f),setPaintProperty:(id,k,v)=>paint.set(id+':'+k,v),getZoom:()=>8,queryRenderedFeatures:()=>[{properties:{id:'city'}}]};
const waiting=[];const controller=createSettlementBoundaries(map,{country:'test',base:'/',manifest:{provinces:{a:{file:'a'},b:{file:'b'}},cities:{}},line:'#000',fill:'#fff',load:(url,{signal})=>new Promise(resolve=>waiting.push({url,signal,resolve}))});
const chunk={regions:{type:'FeatureCollection',features:[]},boundaries:{type:'FeatureCollection',features:[]}};
const a=controller.setProvince('a','old'),b=controller.setProvince('b','city');assert(waiting[0].signal.aborted);waiting[1].resolve(chunk);await b;waiting[0].resolve(chunk);await a;assert.equal(controller.province,'b');assert.equal(sources.size,2);assert.equal(layers.size,4);assert.equal(controller.pick({}), 'city');assert.deepEqual(filters.get('test-city-fill'),['==',['get','id'],'city']);
controller.appearance(true,1);assert.equal(paint.get('test-city-fill:fill-opacity'),0);controller.setEnabled(false);assert.equal(sources.size,0);assert.equal(layers.size,0);assert.equal(controller.pick({}),null);
controller.setEnabled(true);const c=controller.setProvince('a');controller.leave();assert(waiting[2].signal.aborted);waiting[2].resolve(chunk);await c;assert.equal(sources.size,0);
console.log('500 census boundaries, deduplicated lines, one-province loading, cancellation, satellite and cleanup passed.');
