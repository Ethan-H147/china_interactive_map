import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),osmToGeoJSON=require('osmtogeojson');
import {load,landIndex,polygons} from './geo-index.mjs';
import {validateRecords,validateGeometry} from './audit-atlas-data.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {manifest,readLocalSource,sha} from './fetch-nordic-local.mjs';
import '../dist/countries.js';
const expected={norway:[20,357,1547],sweden:[21,290,3363],finland:[19,308,115],iceland:[8,61,10]};
const omitted={norway:[],sweden:[],finland:['FI-HKI-Aluemeri'],iceland:[]};
const probes={norway:'NO-M-0301',sweden:'SE-M-0180',finland:'FI-M-091',iceland:'IS-M-0000'};
for(const name of Object.keys(manifest().files))readLocalSource(name);
const swedish=new Map(JSON.parse(readLocalSource('sweden-regso-2025.geojson')).features.map(f=>['SE-R-'+f.properties.regsokod,f.properties]));
const norwegian=new Map(JSON.parse(readLocalSource('norway-classification-2026.json')).classificationItems.filter(r=>r.level==='1').map(r=>[r.code,r.name]));
for(const [country,counts]of Object.entries(expected)){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),records=validateRecords(cat,country),stats=load(base+'statistics.json'),report=load(base+'local-areas.json'),definition=AtlasCountries.countries[country];
 assert.deepEqual(cat.counts,{1:counts[0],2:counts[1],3:counts[2]},country+' exact mapped counts');
 assert.equal(definition.map.toggleLevels,2,country+' keeps two map toggles');assert(definition.map.thirdLabel);
 assert.deepEqual(report.omitted.slice().sort(),omitted[country],country+' only documented non-municipal/sea omissions');
 const oldFacts=Object.fromEntries(Object.entries(stats.regions).filter(([,r])=>r.level<3));
 assert.equal(sha(Buffer.from(JSON.stringify(oldFacts))),report.originalFacts,country+' existing statistics unchanged');
 for(const [file,hash]of Object.entries(report.baseFiles))assert.equal(sha(fs.readFileSync(base+file)),hash,country+' existing geometry unchanged '+file);
 const seen=new Map(),locals=cat.records.filter(r=>r.level===3);
 for(const [parent,chunk]of Object.entries(cat.chunks).filter(([,c])=>c.level===3)){
  assert.equal(records.get(parent).level,2,'Municipality parent '+parent);
  const bytes=fs.readFileSync(base+chunk.file),decoded=gunzipSync(bytes),data=JSON.parse(decoded);
  assert.equal(bytes.length,chunk.bytes);assert.equal(decoded.length,chunk.decodedBytes);assert.equal(data.regions.features.length,chunk.count);
  assert(chunk.bytes<600000,'A local chunk remains below 600 KB '+parent);
  const ids=new Set(data.regions.features.map(f=>f.properties.id));
  for(const f of data.regions.features){
   const r=records.get(f.properties.id);assert.equal(r.level,3);assert((r.parents||[r.parent]).includes(parent));
   validateGeometry(f.geometry,r.id);assert(landIndex(polygons(f.geometry).flat())(r.center),'Local label on land '+r.id);
   const geometry=JSON.stringify(f.geometry);if(seen.has(r.id)){assert(r.parents?.length>1);assert.equal(geometry,seen.get(r.id),'Same complete cross-municipal parish '+r.id);}else seen.set(r.id,geometry);
   const fact=stats.regions[country+':'+r.id];assert.equal(fact.parent,r.parent);assert.equal(fact.area.method,'mapped');assert.equal(fact.area.label,'Mapped land area');assert(Math.abs(fact.area.value-area(f.geometry))<1e-7);assert(!fact.population&&!fact.gdp&&!fact.gva,'No invented local population/output '+r.id);
   if(country==='sweden'){const source=swedish.get(r.id);assert(source);assert.equal(r.en,source.regsonamn);assert.equal(r.parent,'SE-M-'+source.kommunkod);}
   if(country==='norway'){assert.equal(r.en,norwegian.get(r.code));assert.equal(r.parent,'NO-M-'+r.code.slice(0,4));}
  }
  for(const f of data.boundaries.features){assert(f.properties.owners.length>=2,'No local coastline strokes');assert(f.properties.owners.every(id=>ids.has(id)));}
 }
 assert.equal(seen.size,locals.length,country+' every searchable local area has geometry');
 const selected=load(base+cat.chunks[probes[country]].file).regions,dissolved=await command(selected,'-dissolve2');
 const sum=selected.features.reduce((n,f)=>n+area(f.geometry),0),union=dissolved.features.reduce((n,f)=>n+area(f.geometry),0);
 assert(Math.abs(sum-union)<.01,country+' local fills do not overlap');
 if(country==='finland'){assert.deepEqual(report.parents.map(p=>p.id).sort(),['FI-M-049','FI-M-091']);assert.equal(locals.filter(r=>r.parent==='FI-M-091').length,59);assert.equal(locals.filter(r=>r.parent==='FI-M-049').length,56);assert.equal(records.get('FI-HKI-02').names.sv,'Gloet');}
 if(country==='iceland')assert.deepEqual(report.parents.map(p=>p.id),['IS-M-0000']);
 if(country==='sweden'){
  for(const id of ['SE-M-0180','SE-M-0125','SE-M-2380']){const mapped=load(base+cat.chunks[id].file).regions.features.reduce((n,f)=>n+area(f.geometry),0),official=records.get(id).areaKm2;assert(Math.abs(mapped-official)/official<.05,'Mapped land stays near official municipal land area '+id);}
  const land=landIndex([...seen.values()].flatMap(value=>polygons(JSON.parse(value)).flat()));
  for(const id of [1433877,1298025,1239458,253599]){const data=osmToGeoJSON(JSON.parse(readLocalSource('swedish-lake-osm-'+id+'.json'))),lake=data.features.find(f=>f.id==='relation/'+id),point=(await command(fc([lake]),'-points inner')).features[0].geometry.coordinates;assert(!land(point),'Open lake water is not filled '+id);}
  assert(records.has('SE-R-0180R093'),'Stockholm land removed by the coarse lake mask is restored');assert(records.has('SE-R-0125R002'),'Ekerö island districts are retained');}
 console.log(country,locals.length,'local areas;',report.parents.length,'municipal chunks; source identities, topology, lazy budgets and existing geometry/facts verified');
}
