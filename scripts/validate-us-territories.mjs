import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,polygons,landIndex} from './geo-index.mjs';
import {usTerritorySpec} from './us-territories.mjs';
import {northAmericaFlags} from '../dist/north-america-flags.mjs';
import {fromHash,hashFor} from '../dist/view-state.mjs';
const root='dist/data/europe/united-states/',catalogue=load(root+'catalogue.bin'),first=load(root+'first.bin'),context=load(root+'context.bin'),stats=load(root+'statistics.json'),sources=load(root+'sources.json');
assert.equal(catalogue.records.filter(r=>r.level===1).length,65);assert.equal(first.regions.features.length,65);
assert.equal(catalogue.records.filter(r=>r.kind==='State').length,50);
assert.equal(catalogue.records.filter(r=>r.level===1&&r.kind==='Federal district').length,1);
assert.equal(catalogue.records.filter(r=>r.overseas).length,14);
assert(context.features.every(f=>f.type==='Feature'&&['Polygon','MultiPolygon'].includes(f.geometry?.type)),'Every US context entry is a valid polygon Feature');
const mainlandIndex=landIndex(context.features.filter(f=>!f.properties.region).flatMap(f=>polygons(f.geometry).flat()));
for(const r of catalogue.records.filter(r=>r.kind==='State'&&!r.focusOnEntry))assert(mainlandIndex(r.center),r.en+' remains in the mainland context');
assert.equal(context.features.length,17,'One mainland outline, two detached states and fourteen territory portals');
assert.equal(context.features.filter(f=>!f.properties.region).length,1,'The home outline does not span the territories');
const ids=new Set([...usTerritorySpec.territories.map(r=>r.id),'US-AK','US-HI']);
assert.deepEqual(context.features.filter(f=>f.properties.region).map(f=>f.properties.region).sort(),[...ids].sort());
for(const id of ['US-AK','US-HI']){
 const r=catalogue.records.find(r=>r.id===id),f=first.regions.features.find(f=>f.properties.id===id),p=context.features.find(f=>f.properties.region===id);
 assert(r.focusOnEntry&&r.kind==='State'&&!r.overseas,'Detached states retain state status');
 assert.deepEqual(p.geometry,f.geometry,id+' entry and state fill match');
 assert.deepEqual(p.properties.bounds,r.bounds.flat(),id+' has its own entry bounds');
 const mainland=landIndex(context.features.filter(f=>!f.properties.region).flatMap(f=>polygons(f.geometry).flat()));
 assert(!mainland(r.center),id+' is excluded from the mainland entry outline');
}
for(const t of usTerritorySpec.territories){
 const r=catalogue.records.find(r=>r.id===t.id),f=first.regions.features.find(f=>f.properties.id===t.id),p=context.features.find(f=>f.properties.region===t.id),s=stats.regions['united-states:'+t.id];
 assert(r.overseas&&r.kind==='Territory'&&r.level===1&&r.parent===null,t.name+' is in the shared first level');
 assert.deepEqual(p.geometry,f.geometry,t.name+' portal and selectable fill have identical coasts');
 assert.deepEqual(p.properties.bounds,r.bounds.flat(),t.name+' supplies its own focused bounds');
 assert(landIndex(polygons(f.geometry).flat())(r.center),t.name+' label/click point is on land');
 assert(r.bounds[1][0]-r.bounds[0][0]<6&&r.bounds[1][1]-r.bounds[0][1]<9,t.name+' does not span the world');
 if(t.population){assert.equal(s.population.value,t.population);assert.equal(s.population.date,'2020-04-01');assert(northAmericaFlags['united-states'].firstFlags[t.id],t.name+' has its official flag');}
 else {assert(!s.population&&!s.gdp&&!s.gdpPerCapita,t.name+' has no invented statistics');assert(s.note.includes('No permanent population'));}
 assert(s.area.value>0);assert(!s.gdp&&!s.gdpPerCapita,'State GDP is never copied to a territory');
}
assert.equal(Object.values(stats.regions).filter(r=>r.gdp).length,51,'Existing state/DC GDP coverage remains complete');
assert(catalogue.records.find(r=>r.id==='US-GU').center[0]>140,'Guam is not moved to Alaska’s unwrapped longitude branch');
const reef=catalogue.records.find(r=>r.id==='US-UM-89');assert(reef.areaKm2<.1,'Kingman uses emergent land, not a filled reef or marine jurisdiction');
for(const id of ['US-UM-95','US-UM-79','US-UM-67'])assert(polygons(first.regions.features.find(f=>f.properties.id===id).geometry).length>1,id+' retains separate land islands around its lagoon');
assert(!catalogue.records.some(r=>/Guantánamo|Guantanamo|Diego Garcia|Micronesia|Marshall Islands|Palau/.test(r.en)),'Foreign bases and independent associated states are excluded');
const snapshot=gunzipSync(fs.readFileSync('scripts/boundary-sources/us-territories/coastline.json.gz'));
const pin=load('scripts/country-expansion-sources.json').files['us-minor-islands-coastline.json'];
assert.equal(createHash('sha256').update(snapshot).digest('hex'),pin.sha256,'Retained coastline snapshot matches its pin');
assert(sources.sources.some(s=>s.file==='us-minor-islands-coastline.json'&&s.license.includes('ODbL')));
const view={v:1,country:'united-states',center:[-215.28,13.4],zoom:10,selection:'US-GU'};
const hash=hashFor(view);assert(hash,'A Guam view in the western world copy can be shared');
assert.equal(fromHash(hash).selection,'US-GU');assert(Math.abs(fromHash(hash).center[0]-144.72)<1e-8,'Saved views normalize the repeated world to the same territory');
console.log('All 14 US territories: precise portal destinations, one first level, coasts/lagoons, official flags, source pins, honest statistics and wrapped-world links passed.');
