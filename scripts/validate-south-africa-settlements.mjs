import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {enrichPlaces,placeLines,settlementZoom,visibleSettlements,settlementFeatures} from '../dist/settlement-layer.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {validate,hashFor,fromHash} from '../dist/view-state.mjs';
const base='dist/data/southern-africa/south-africa/';
const data=JSON.parse(fs.readFileSync(base+'settlements.json'));
const extra=JSON.parse(fs.readFileSync(base+'place-names-flags.json'));
const catalogue=JSON.parse(zlib.gunzipSync(fs.readFileSync(base+'catalogue.bin')));
const index=new Map(catalogue.records.map(r=>[r.id,r]));
assert.equal(data.records.length,500);assert.equal(new Set(data.records.map(r=>r.id)).size,500);
assert.equal(new Set(data.records.map(r=>r.provinceId)).size,9);
for(const r of data.records){assert(index.has(r.parentId));assert(index.has(r.provinceId));assert.equal(r.population.year,2011);assert(r.population.value>0);assert(r.population.scopeNote.includes('main place'));assert(r.population.source.startsWith('https://'));assert(r.area.value>0);assert.equal(r.area.year,2011);let root=index.get(r.parentId);while(root.parent)root=index.get(root.parent);assert.equal(root.id,r.provinceId);}
enrichPlaces(data.records,extra);const search=createPlaceSearch(data.records.map(r=>({...r,level:4})));
for(const name of ['Pretoria','Durban','Cape Town','Gqeberha','Johannesburg'])assert(search(name).some(r=>r.en===name),name);
assert(search('ePitoli').some(r=>r.en==='Pretoria'));assert(search('eGoli').some(r=>r.en==='Johannesburg'));assert(search('Port Elizabeth').some(r=>r.en==='Gqeberha'));
const pretoria=search('Pretoria')[0];assert.equal(pretoria.population.value,741651);assert.equal(placeLines(pretoria,'ss')[0],'ePitoli');assert.equal(placeLines(pretoria,'en')[0],'Pretoria');assert.equal(placeLines({en:'Untranslated'},'zu')[0],'Untranslated');
assert.equal(pretoria.flag.status,'historical');assert.equal(pretoria.flag.scope,'Historical city');
const flags=new Set();let names=0,flagged=0;
for(const r of data.records){if(r.names)names++;if(r.flag){flagged++;flags.add(r.flag.file);assert(fs.existsSync('dist/'+r.flag.file));assert(r.flag.scope);assert(r.flag.status);assert(r.flag.page.startsWith('https://'));}for(const v of Object.values(r.names||{})){assert(v.source.startsWith('https://'));assert(v.type);}}
const bounds={getWest:()=>-180,getEast:()=>180,getSouth:()=>-90,getNorth:()=>90};
assert(visibleSettlements(data.records,5,bounds).length<40);assert(visibleSettlements(data.records,10,bounds).length===500);assert(visibleSettlements([pretoria],1,bounds,pretoria.id).length===1);assert(settlementZoom(pretoria)<settlementZoom({population:{value:1000}}));assert.equal(settlementFeatures(data.records).features.length,500);
const view=validate({v:1,country:'south-africa',center:pretoria.center,zoom:10,selection:pretoria.id,mode:3,language:'ss',layers:{'za-settlement-layer':false}});assert.equal(fromHash(hashFor(view)).language,'ss');assert.equal(view.layers['za-settlement-layer'],false);
console.log(`500 settlements: census scope, ancestry, multilingual/historical search, ${names} named records, ${flagged} scoped flags, progressive zoom and shared views passed.`);
