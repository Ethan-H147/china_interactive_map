import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodeGeo} from '../dist/geo-pack.mjs';
import {prepareKorea} from '../dist/korea-preparation.mjs';
import {prepareMongolia} from '../dist/mongolia-preparation.mjs';
import {load} from './geo-index.mjs';
import {assertNearGeo} from './geo-compare.mjs';
import {createSubdivisionScope} from '../dist/scoped-country.mjs';
import '../dist/countries.js';
const read=file=>decodeGeo(gunzipSync(fs.readFileSync(file)));
const segment=(a,b)=>{const x=a.map(v=>Math.round(v*1e7)).join(','),y=b.map(v=>Math.round(v*1e7)).join(',');return x<y?x+'|'+y:y+'|'+x;};
const segments=features=>new Set(features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates).flatMap(line=>line.slice(1).map((p,i)=>segment(line[i],p))));
for(const country of ['korea','mongolia']){
 const base='dist/data/scoped/'+country+'/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json'));
 const input=fs.readFileSync('dist/data/'+country+'-boundaries.bin');assert.equal(createHash('sha256').update(input).digest('hex'),manifest.inputSha256);
 const data=JSON.parse(gunzipSync(input));data.channels=load('dist/data/'+country+'-channels.bin');
 const prepared=(country==='korea'?prepareKorea:prepareMongolia)(data),metadata=load(base+'metadata.bin');
 assert.deepEqual(metadata,prepared.metadata,'Search, names, hierarchy and quiz records remain complete');
 for(const [id,entry] of Object.entries(manifest.sources))assertNearGeo(read(base+entry.file),JSON.parse(await prepared.sources[id].text()),'Base source '+id);
 const expectedBorders=segments(JSON.parse(await prepared.sources[country+'-second-edges'].text()).features),actualBorders=new Set();
 const expectedSelection=JSON.parse(await prepared.sources[country+'-second-selection-edges'].text()).features;
 for(const [parent,files] of Object.entries(manifest.scopes)){
  const collection=read(base+files[country+'-second'].file);
  assertNearGeo(collection.features,data.second.features.filter(f=>f.properties.parent===parent),'Subdivision polygons '+parent);
  assertNearGeo(read(base+files[country+'-second-selection-edges'].file).features,expectedSelection.filter(f=>f.properties.parent===parent),'Selected outlines '+parent);
  for(const line of segments(read(base+files[country+'-second-edges'].file).features)){assert(expectedBorders.has(line),'No added water or coastline strokes');actualBorders.add(line);}
 }
 assert.equal(actualBorders.size,expectedBorders.size,'Every original border and river-channel segment survives');
 assert.equal(AtlasCountries.countries[country].motionLayers,false,'No duplicate whole-country motion geometry');
 console.log(country+': exact polygons, complete search metadata, selected outlines, and every shared/channel border preserved across '+Object.keys(manifest.scopes).length+' areas.');
}
for(const country of AtlasCountries.ids){const c=AtlasCountries.countries[country];if(!['europe','southern-africa','russia'].includes(c.adapter))continue;assert(!c.map.loadAllSubdivisions&&(c.map.bundledLevels||1)===1,country+' loads deeper boundaries by parent');}

// A pending old selection cannot replace a new one or refill an evicted country.
const pending=[],sources=new Map(['','-edges','-selection-edges'].map(s=>['test-second'+s,{setData(value){if(typeof value==='string')return new Promise(resolve=>pending.push({value,resolve}));return Promise.resolve();}}]));
const scope=createSubdivisionScope({getSource:id=>sources.get(id)},'test');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const first=scope.ensure('A');await tick();scope.ensure('B');
while(scope.loaded!=='B'){const request=pending.shift();if(request)request.resolve();await tick();}
await first;assert.equal(scope.loaded,'B');assert(!pending.some(p=>p.value.includes('A-edges')),'Superseded work stops after its current source');
const old=scope.ensure('C');await tick();scope.clear();for(const request of pending.splice(0))request.resolve();await old;assert.equal(scope.loaded,null);
await scope.ensure(null);assert.equal(scope.loaded,null);
console.log('Scoped lifecycle: bounded serial loads, rapid changes, eviction, and empty reset passed.');
