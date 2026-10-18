import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {load,landIndex,polygons} from './geo-index.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {csv} from './us-geography.mjs';
import {readUSSource} from './fetch-us-details.mjs';
const root='dist/data/europe/united-states/',catalogue=load(root+'catalogue.bin'),index=new Map(catalogue.records.map(r=>[r.id,r])),stats=load(root+'statistics.json'),pins=load('scripts/us-detail-sources.json'),area=load(root+'area-codes/catalogue.bin');
assert.equal(catalogue.counts[1],65);assert.equal(catalogue.counts[2],3235);assert.equal(Object.keys(catalogue.chunks).length,56);assert(!fs.existsSync(root+'all.bin'),'Counties are never downloaded as one nationwide geometry');
for(const [state,count]of [['US-TX',254],['US-CA',58],['US-AK',30],['US-LA',64],['US-CT',9],['US-VA',133],['US-PR',78]])assert.equal(catalogue.chunks[state].count,count,state);
for(const [id,kind]of [['US-COUNTY-22071','Parish'],['US-COUNTY-51760','Independent city'],['US-COUNTY-09110','Planning region'],['US-COUNTY-02063','Census area']])assert.equal(index.get(id)?.kind,kind,id);
for(const [query,id]of [['Los Angeles CA','US-COUNTY-06037'],['06037','US-COUNTY-06037'],['Cook Illinois','US-COUNTY-17031']])assert(createPlaceSearch(catalogue.records)(query).some(r=>r.id===id),query);
const active=csv(readUSSource('nanpa.csv').toString('utf8').split('\n').slice(1).join('\n')).filter(r=>r.COUNTRY==='US'&&r.USE==='G'&&r.IN_SERVICE==='Y');
assert.deepEqual(area.records.filter(r=>!r.nonGeographic).map(r=>r.code).sort(),active.map(r=>r.NPA_ID).sort());
assert.equal(area.records.length,407);assert.equal(new Set(area.records.map(r=>r.id)).size,407);
const byCode=new Map(area.records.map(r=>[r.code,r]));
for(const [a,b]of [['213','323'],['213','738'],['480','623'],['202','771']])assert.deepEqual(byCode.get(a).bounds,byCode.get(b).bounds,a+' overlay');
assert.notDeepEqual(byCode.get('212').bounds,byCode.get('917').bounds,'Partial NYC overlays never expand Manhattan to all five boroughs');
assert.notDeepEqual(byCode.get('321').bounds,byCode.get('689').bounds,'Brevard and Orlando are separate');
for(const code of ['340','670','671','684','787','939'])assert(byCode.get(code)?.bounds,code+' inhabited territory coverage');
for(const code of ['800','833','710','900'])assert(byCode.get(code)?.nonGeographic&&!byCode.get(code).bounds,code+' has a service rather than a fake geographic area');
for(const code of ['600','622','633'])assert(!byCode.has(code),'Canadian-only non-geographic codes excluded');
for(const r of area.records)assert(createPlaceSearch(area.records)(r.code).some(x=>x.id===r.id),r.code+' searchable');
for(const [parent,chunk]of Object.entries(area.chunks)){
 const file=root+chunk.file,bytes=fs.readFileSync(file),data=load(file),ids=new Set(data.regions.features.map(f=>f.properties.id));
 assert.equal(bytes.length,chunk.bytes);assert.equal(ids.size,chunk.count);assert(data.regions.features.every(f=>byCode.get(f.properties.id.slice(7))?.parent===parent));
 for(const f of data.regions.features){const r=byCode.get(f.properties.id.slice(7));assert(landIndex(polygons(f.geometry).flat())(r.center),r.code+' label is on its area');}
}
for(const file of ['counties.zip','population.csv','nanpa.csv','area-codes.geojson']){const bytes=readUSSource(file);assert(/^[0-9a-f]{64}$/.test(pins.files[file].sha256));if(bytes)assert.equal(createHash('sha256').update(bytes).digest('hex'),pins.files[file].sha256,file+' source pin');}
assert.equal(Object.values(stats.regions).filter(r=>r.level===2&&r.population).length,3144,'All 50-state/DC county estimates included');
assert.equal(Object.values(stats.regions).filter(r=>r.gdp).length,51,'County cards never inherit state GDP');
console.log('3,235 county equivalents, 378 geographic codes, 29 non-geographic services; sources, hierarchy, aliases, overlay footprints, territory coverage and lazy chunks verified.');
