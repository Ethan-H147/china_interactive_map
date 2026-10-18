import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {swissToWGS84} from './swiss-projection.mjs';
import {load,polygons,lineIndex,metres} from './geo-index.mjs';
import {validateRecords,validateGeometry} from './audit-atlas-data.mjs';
const mapshaper=createRequire(import.meta.url)('mapshaper');
const source={type:'Feature',properties:{},geometry:{type:'Point',coordinates:[2600000,1200000]}};
const result=JSON.parse((await mapshaper.applyCommands('-i in.json '+swissToWGS84+' -o out.json format=geojson',{'in.json':JSON.stringify(source)}))['out.json']);
assert(metres(result.geometries[0].coordinates,[7.438632421,46.951082772])<.2,'LV95 origin must include the swisstopo datum transformation');
const base='dist/data/europe/switzerland/',context=load(base+'context.bin'),distance=lineIndex(context.features.flatMap(f=>polygons(f.geometry).flat()));
// Independently retained France/Italy border vertices. The old unshifted datum missed these by 100–170 m.
for(const [point,tolerance]of [[[5.955901,46.132356],3],[[5.956847,46.128757],3],[[7.044472,45.922483],60],[[7.075993,45.891633],60]])assert(distance(point)<tolerance,'Swiss fill must meet the existing frontier at '+point+'; gap '+distance(point)+' m');
const cat=load(base+'catalogue.bin'),records=validateRecords(cat,'switzerland');
for(const [file,chunk]of [['first.bin',null],...Object.values(cat.chunks).map(chunk=>[chunk.file,chunk])]){const bytes=fs.readFileSync(base+file),data=load(base+file);if(chunk){assert.equal(bytes.length,chunk.bytes);assert.equal(data.regions.features.length,chunk.count);}for(const f of data.regions.features){assert(records.has(f.properties.id));validateGeometry(f.geometry,'switzerland '+f.properties.id);}}
assert.equal(cat.counts[1],26);assert.equal(cat.records.filter(r=>r.kind==='Municipality').length,2110);
const statistics=JSON.parse(fs.readFileSync(base+'statistics.json'));assert.equal(statistics.regions['switzerland:CH-K-1'].gdp.value,164494808130,'Rebuilding alignment preserves GDP');
console.log('Swiss alignment: independent datum control, France/Italy frontier samples, 26 cantons, 2110 municipalities and every geometry chunk passed.');
