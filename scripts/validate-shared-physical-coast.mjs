import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {decodeData,decodeGeoStructure} from '../dist/geo-pack.mjs';
import {landIndex,polygons} from './geo-index.mjs';
import {useModernCoastOverview} from './uk-history-coasts.mjs';
import {loadAtlasData} from '../dist/atlas-data.mjs';
const read=async file=>decodeData(fs.readFileSync(file));
const root='dist/data/europe/united-states/';
const bays=[[-86.2,30.45],[-85.71,30.16],[-85.557147,30.1063134],[-85.36,29.81],[-87.14,30.41],[-82.55,27.75]];
const dry=[[-84.28,30.44],[-85.66,30.22],[-80.3,25.8],[-81.1,32.1],[-77.4,35]];
const inside=features=>{const tests=features.map(f=>landIndex(polygons(f.geometry).flat()));return p=>tests.some(test=>test(p));};
const first=await read(root+'first.bin'),catalogue=await read(root+'catalogue.bin');
const modern=inside(first.regions.features);
for(const p of bays)assert(!modern(p),'Modern physical land excludes bay '+p);
for(const p of dry)assert(modern(p),'Modern physical land retains mainland '+p);
const context=inside((await read(root+'context.bin')).features);
for(const p of bays)assert(!context(p),'Shared gray context excludes bay '+p);
for(const file of ['second/US-FL.bin','municipalities/US-FL.bin','municipalities/US-FL-census.bin','area-codes/US-FL.bin','zip-codes/US-FL.bin']){
 const data=await read(root+file),covers=inside(data.regions.features);
 for(const p of bays)assert(!covers(p),file+' excludes bay '+p);
 assert(data.regions.features.every(f=>catalogue.records.some(r=>r.id===f.properties.id)||['area-codes','zip-codes'].some(kind=>file.startsWith(kind))),file+' retains known subdivision IDs');
}
const source=JSON.parse(fs.readFileSync('scripts/boundary-sources/united-states/physical-coast/southeast.json'));
const {gunzipSync}=await import('node:zlib');
assert.equal(createHash('sha256').update(gunzipSync(fs.readFileSync('scripts/boundary-sources/united-states/physical-coast/southeast.json.gz'))).digest('hex'),source.sha256,'Retained primary source checksum');
const compiled=decodeGeoStructure(gunzipSync(fs.readFileSync('scripts/boundary-sources/united-states/physical-coast/southeast-land.bin')),{select:()=>null});
assert.equal(compiled.meta.source,source.sha256);assert.equal(compiled.meta.tolerance,.0003,'Canonical coastline stays inside the regional detail budget');
const history=await read('dist/data/europe/united-kingdom/history/borders.bin');
const dated=history.configs[history.years[1779].config];
const active=features=>features.filter(f=>dated.face[f.properties.f]>=0);
const overview=inside(active(history.faces.features));
const detail=await read('dist/data/europe/united-kingdom/history/coasts/north-america.bin');
const precise=inside(active(detail.faces.features));
for(const p of bays){assert(!overview(p),'Historical overview excludes bay '+p);assert(!precise(p),'Historical detail excludes bay '+p);}
for(const p of [[-84.28,30.44],[-85.66,30.22]]){assert(overview(p),'Historical overview retains Florida land '+p);assert(precise(p),'Historical detail retains Florida land '+p);}
for(const region of history.coasts)for(const f of region.faces)assert.equal(history.faces.features[f].properties.sharedSource,'canonical-coast:'+region.id,'All regional overviews derive from the canonical coast: '+region.id);
// The overview builder must retain island rings and lagoon holes in every region.
const feature={type:'Feature',properties:{f:0},geometry:{type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]],[[.5,.5],[.5,1.5],[1.5,1.5],[1.5,.5],[.5,.5]]]}};
const features=[structuredClone(feature)];
await useModernCoastOverview(features,{affected:[0],faces:{type:'FeatureCollection',features:[feature]}},'fixture');
assert(inside(features)([.2,.2]));assert(!inside(features)([1,1]));
// A unit spanning multiple regional inputs takes every outline from the same
// canonical sources even when no detailed fill source has been loaded yet.
const box=(f,x)=>({type:'Feature',properties:{f},geometry:{type:'Polygon',coordinates:[[[x,.1234567],[x+1,.1234567],[x+1,1],[x,1],[x,.1234567]]]}});
const a=box(0,0),b=box(1,4),line=f=>({type:'Feature',properties:{l:f.properties.f,r:-1,coast:true},geometry:{type:'LineString',coordinates:f.geometry.coordinates[0]}});
const collection=features=>({type:'FeatureCollection',features});
const url=data=>'data:application/json,'+encodeURIComponent(JSON.stringify(data));
const coarse={faces:collection([box(0,20),box(1,24)]),arcs:collection([]),configs:[{face:[0,0]}],coasts:[{id:'a',faces:[0]},{id:'b',faces:[1]}]};
const replacements=[a,b].map((f,i)=>({region:i?'b':'a',url:url({faces:collection([f]),arcs:collection([line(f)])})}));
const result=await loadAtlasData('atlas-data://fixture?'+new URLSearchParams({url:url(coarse),transform:'historical-outline',config:0,unit:0,coasts:JSON.stringify(replacements)}));
const coordinates=result.features.flatMap(f=>f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat());
assert(coordinates.some(p=>p[0]===0&&Math.abs(p[1]-.1234567)<1e-7));assert(coordinates.some(p=>p[0]===4&&Math.abs(p[1]-.1234567)<1e-7));
assert(coordinates.every(p=>p[0]<6),'No legacy coarse outline leaks through either region');
console.log('Shared physical coastline: modern subdivisions, gray context, historical overview/detail, all '+history.coasts.length+' regions, source checksum, and lagoon-hole retention passed.');
