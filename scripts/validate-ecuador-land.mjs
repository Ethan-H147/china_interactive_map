import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeGeoStructure} from '../dist/geo-pack.mjs';
import {load,polygons,landIndex} from './geo-index.mjs';
import {restoreJulcuyLand,julcuyGapPoint} from './ecuador-land-coverage.mjs';
import {source} from './fetch-north-andes.mjs';
import {fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const base='dist/data/europe/ecuador/',inside=(f,p)=>landIndex(polygons(f.geometry).flat())(p);
const samples=[julcuyGapPoint,[-80.66,-1.5],[-80.66,-1.62]];
for(const [file,id]of [['first.bin','EC13'],['second/EC13.bin','EC1306'],['third/EC1306.bin','EC130653']]){
 const data=load(base+file),shape=data.regions.features.find(f=>f.properties.id===id);
 for(const p of samples)assert(inside(shape,p),id+' includes restored land '+p);
 const area=load(base+'statistics.json').regions['ecuador:'+id].area.value;
 assert(Math.abs(area-geographicAreaKm2(shape.geometry))<.001,'Updated mapped area '+id);
 const metric=load('dist/data/region-colors/ecuador.json').records.find(r=>r.id===id).metrics;
 assert(Math.abs(metric.populationDensity.value-metric.population.value/area)<1e-8,'Updated population density '+id);
}
for(const file of [base+'context.bin',base+'political.bin','dist/data/world-land.bin','dist/data/globe-overview-land.bin','dist/data/compact/europe/ecuador/context.bin','dist/data/compact/world-land.bin']){
 const data=file.includes('/compact/')?decodeGeoStructure(gunzipSync(fs.readFileSync(file))).value:load(file);for(const p of samples)assert(data.features.some(f=>(!f.properties.country||f.properties.country==='ecuador')&&inside(f,p)),'Resident and detailed land coverage '+file);
}
// Exercise the repair against the retained source, including a repeated build.
const raw=fc(JSON.parse(source('ecu-adm3.json')).features.map(f=>({...f,properties:{id:f.properties.ADM3_PCODE}})));
assert(!raw.features.some(f=>inside(f,julcuyGapPoint)),'Original omission remains documented');
const repaired=await restoreJulcuyLand(raw),again=await restoreJulcuyLand(repaired);
assert.deepEqual(again,repaired,'Repair is idempotent');
assert.equal(repaired.features.length,raw.features.length,'No invented administrative unit');
for(let i=0;i<raw.features.length;i++)if(raw.features[i].properties.id!=='EC130653')assert.equal(repaired.features[i],raw.features[i],'Other source units remain unchanged');
console.log('Julcuy land restored at all tiers, compact copies, country context and globe; area, source scope and repeat builds verified.');
