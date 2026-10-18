import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readUSSource} from './fetch-us-details.mjs';
import {load,polygons,landIndex,linesOf} from './geo-index.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';
import {gazetteer} from './build-us-municipalities.mjs';
import {municipalStates,townshipStates} from './fetch-us-local.mjs';
import {zipEdges} from './us-zip-edges.mjs';
const root='dist/data/europe/united-states/',cat=load(root+'catalogue.bin'),places=cat.records.filter(r=>r.level===3),index=new Map(places.map(r=>[r.id,r])),z=load(root+'zip-codes/catalogue.bin'),zip=new Map(z.records.map(r=>[r.id,r])),pins=load('scripts/us-local-sources.json');
assert.equal(places.length,50130);assert.equal(index.size,50130);assert.equal(places.filter(r=>r.incorporated).length,37290);
assert.equal(Object.keys(cat.thirdChunks).length,52,'Every state plus DC and Puerto Rico has a lazy place chunk');
const coverage=load(root+'municipalities/sources.json');
for(const[state,chunk]of Object.entries(cat.thirdChunks)){
 const rows=places.filter(r=>r.parent===state),expected=coverage.counts[state];
 assert.equal(rows.filter(r=>r.incorporated).length,expected.incorporated);
 assert.equal(rows.filter(r=>!r.incorporated).length,expected.cdps);
 assert.equal(chunk.totalCount,rows.length);
 for(const[file,count,bytes,optional]of [[chunk.file,expected.incorporated,chunk.bytes,false],[chunk.censusFile,rows.length,chunk.censusBytes,true]]){
  const data=load(root+file);assert.equal(data.regions.features.length,count);assert.equal(fs.statSync(root+file).size,bytes);
  for(const f of data.regions.features){const r=index.get(f.properties.id);assert.equal(r.parent,state);assert(landIndex(polygons(f.geometry).flat())(r.center),r.id+' inner label');assert.equal(f.properties.incorporated,r.incorporated);assert(optional||r.incorporated,'Default geometry excludes optional communities');}
  const segments=new Set();for(const f of data.boundaries.features){assert(f.properties.owners.every(id=>index.has(id)));assert.equal(f.properties.incorporated,f.properties.owners.some(id=>index.get(id).incorporated));for(const path of linesOf({type:'FeatureCollection',features:[f]}))for(let i=1;i<path.length;i++){const key=[path[i-1].join(','),path[i].join(',')].sort().join('|');assert(!segments.has(key),'Municipal shared edge drawn once: '+state);segments.add(key);}}
 }
}
for(const[state,inc,cdp]of [['US-CA',483,1136],['US-IL',2719,167],['US-OH',2238,340],['US-MA',351,190],['US-NJ',564,377],['US-RI',39,28],['US-HI',0,163],['US-PR',0,292]]){assert.equal(coverage.counts[state].incorporated,inc);assert.equal(coverage.counts[state].cdps,cdp);}
const placeSource=gazetteer('place'),subSource=gazetteer('cousub'),included=new Set(places.map(r=>r.code)),omitted=new Set(Object.values(coverage.omittedSubdivisions).flat().map(r=>r.geoid));
for(const row of placeSource.values())if(municipalStates[row.GEOID.slice(0,2)])assert(included.has(row.GEOID),'Every official place: '+row.GEOID);
for(const row of subSource.values())if(townshipStates.has(row.GEOID.slice(0,2))&&['A','B','C','G'].includes(row.FUNCSTAT))assert(included.has(row.GEOID)||omitted.has(row.GEOID),'Every town/township included or explicitly classified: '+row.GEOID);
for(const[query,id]of [['Oak Park IL','US-PLACE-1754885'],['Aurora IL','US-PLACE-1703012'],['Columbus OH','US-PLACE-3918000'],['Altadena CA','US-PLACE-0601290'],['Greenwich Connecticut','US-MCD-0919033620'],['Hempstead town New York','US-MCD-3605934000'],['Princeton NJ','US-PLACE-3460900']])assert(createPlaceSearch(places)(query).some(r=>r.id===id),query);
assert.equal(places.filter(r=>r.sourceType==='concity').length,8);assert.equal(places.filter(r=>r.governmentStatus==='F').length,8);assert(places.filter(r=>r.governmentStatus==='F').every(r=>!r.incorporated));
assert.equal(cat.counts[3],50130);assert.equal(AtlasCountries.countries['united-states'].map.thirdScope,'state','Municipalities are state-scoped, never cut to fit counties');
const assignments=new Set(readUSSource('zip-assignments.txt').toString('utf8').trim().split(/\r?\n/).map(s=>s.trim().slice(-5)));
assert.equal(assignments.size,41514);assert.deepEqual(new Set(z.records.filter(r=>r.current).map(r=>r.code)),assignments);assert.equal(z.records.filter(r=>r.hasBoundary).length,33791);assert.equal(zip.size,z.records.length);
for(const r of z.records){assert(/^\d{5}$/.test(r.code));assert.equal(r.id,'US-ZIP-'+r.code);assert.equal(!!r.bounds,r.hasBoundary);assert.equal(!!r.center,r.hasBoundary);assert(r.parents.every(p=>cat.records.some(s=>s.id===p&&s.level===1)));}
const seen=new Set();for(const[parent,chunk]of Object.entries(z.chunks)){const data=load(root+chunk.file),ids=new Set(data.regions.features.map(f=>f.properties.id));assert.equal(ids.size,chunk.count);assert.equal(fs.statSync(root+chunk.file).size,chunk.bytes);for(const f of data.regions.features){const r=zip.get(f.properties.id);assert(r.hasBoundary&&r.parents.includes(parent));assert(landIndex(polygons(f.geometry).flat())(r.center));seen.add(r.id);}}
assert.equal(seen.size,33791,'Every ZCTA is in a lazy state chunk');assert.deepEqual(new Set(zip.get('US-ZIP-42223').parents),new Set(['US-KY','US-TN']));
for(const state of ['US-KY','US-TN'])assert(load(root+z.chunks[state].file).regions.features.some(f=>f.properties.id==='US-ZIP-42223'));
for(const code of ['00501','09002'])assert(zip.get('US-ZIP-'+code).current&&!zip.get('US-ZIP-'+code).bounds);
const search=createPlaceSearch(z.records);for(const code of ['00601','00501','09002','60601','90210','96941'])assert(search(code).some(r=>r.code===code),code);
for(const[file,pin]of Object.entries(pins.files)){const bytes=readUSSource(file);assert(/^[0-9a-f]{64}$/.test(pin.sha256)&&pin.bytes>0);if(bytes)assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,file+' pinned');}

// Inland boundaries beside unassigned ZCTA land remain; unselected coasts do not.
const rectangle=(id,x0,y0,x1,y1)=>({type:'Feature',properties:{id},geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
const collection=features=>({type:'FeatureCollection',features});
const test=zipEdges(collection([rectangle('west',0,0,3,3),rectangle('east',5,0,8,3)]),collection([rectangle('land',0,0,8,3)]));
assert.deepEqual(linesOf(test),[[[3,0],[3,3]],[[5,3],[5,0]]],'Gap-facing edges survive while coast-only edges are omitted');
const adjacent=zipEdges(collection([rectangle('west',0,0,3,3),rectangle('east',3,0,8,3)]),collection([rectangle('land',0,0,8,3)]));
assert.equal(adjacent.features.length,1);assert.deepEqual(adjacent.features[0].properties.owners,['east','west'],'Shared edge is represented once');
const california=load(root+'zip-codes/US-CA.bin');
assert(california.boundaries.openSegments>0,'California retains inland single-owner edges');
for(const id of ['US-ZIP-92040','US-ZIP-93546','US-ZIP-92309'])assert(california.boundaries.features.some(f=>f.properties.owners.length===1&&f.properties.owners.includes(id)),id+' formerly missing open perimeter');
console.log('US local: all 50 states, DC and Puerto Rico; 37,290 municipalities/towns/townships and 12,840 optional Census communities/statistical areas; source completeness, exact shared edges, default/optional chunks, ZIP gap edges and coast suppression verified.');
