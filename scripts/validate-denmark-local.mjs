import fs from 'node:fs';
import assert from 'node:assert/strict';
import {load,polygons,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {command,fc,sharedBorders} from './build-regional-dataset.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {sha} from './fetch-nordic-local.mjs';
const base='dist/data/europe/denmark/',cat=load(base+'catalogue.bin'),report=load(base+'local-areas.json'),all=load(base+'all.bin'),records=new Map(cat.records.map(r=>[r.id,r]));
const municipal=fc(all.levels.find(l=>l.level===2).regions.features.filter(f=>/^DK_/.test(f.properties.id))),first=fc(all.levels.find(l=>l.level===1).regions.features.filter(f=>/^DK0/.test(f.properties.id))),mask=load('scripts/boundary-sources/denmark/atlas-land-mask.geojson.gz');
const sum=data=>data.features.reduce((s,f)=>s+area(f.geometry),0),locals=new Map();
assert.equal(municipal.features.length,98);assert.equal(report.alignment.crossMunicipalParishes.length,27);
assert.equal(records.get('DK-S-9212').parent,'DK_756');assert(!records.get('DK-S-9212').parents,'Christianshede cannot leak into Silkeborg');
const municipalUnion=await command(municipal,'-dissolve2'),unionArea=sum(municipalUnion),municipalArea=sum(municipal);
assert(Math.abs(municipalArea-unionArea)<.001,'All 98 municipal fills have no overlapping land');
const missing=await command({'land.json':mask,'municipal.json':municipalUnion},'-erase municipal.json');assert(sum(missing)<.001,'No national land lost');
const outside=await command({'municipal.json':municipalUnion,'land.json':mask},'-erase land.json');assert(sum(outside)<.001,'Municipal fills stay inside the pinned national silhouette');
const firstUnion=await command(first,'-dissolve2');assert(Math.abs(sum(first)-unionArea)<.001,'Regions cover exactly their municipalities');assert(Math.abs(sum(firstUnion)-unionArea)<.001,'No regional overlap');
let lineSamples=0,ownedSegments=0;
for(const parent of municipal.features){
 const id=parent.properties.id,chunk=load(base+cat.chunks[id].file),inside=landIndex(polygons(parent.geometry).flat()),edge=lineIndex(polygons(parent.geometry).flat());
 const ordinary=chunk.boundaries.features;const ids=new Set(chunk.regions.features.map(f=>f.properties.id));
 for(const f of ordinary){assert([1,2,3].includes(f.properties.upperLevel));assert(f.properties.owners.every(owner=>ids.has(owner)));for(const path of linesOf(fc([f])))for(let i=1;i<path.length;i++){for(const p of [path[i-1],[(path[i-1][0]+path[i][0])/2,(path[i-1][1]+path[i][1])/2]]){assert(inside(p)||edge(p)<.3,'Parish border outside '+id+' at '+p);lineSamples++;}if(f.properties.upperLevel<3)ownedSegments++;}}
 const full=fc(chunk.regions.features),overlap=await command(full,'-dissolve2');assert(Math.abs(sum(full)-sum(overlap))<.001,'Parish fills overlap in '+id);
 for(const f of full.features){assert((records.get(f.properties.id).parents||[records.get(f.properties.id).parent]).includes(id));if(locals.has(f.properties.id))assert.deepEqual(f.geometry,locals.get(f.properties.id).geometry,'One full official parish identity');else locals.set(f.properties.id,f);}
}
assert.equal(locals.size,2096);assert(ownedSegments>0,'Coincident strokes carry explicit administrative ownership');
const allLocals=fc([...locals.values()]),localUnion=await command(allLocals,'-dissolve2');assert(Math.abs(sum(allLocals)-sum(localUnion))<.001,'No parish overlap across the entire country');
// Every ordinary municipal edge uses the same geometry as the corresponding
// region where it is a region border; the renderer draws its highest owner once.
const regionalEdge=lineIndex(linesOf(all.levels.find(l=>l.level===1).boundaries));
for(const f of all.levels.find(l=>l.level===2).boundaries.features)if(f.properties.upperLevel===1)for(const p of linesOf(fc([f])).flat())assert(regionalEdge(p)<.6,'Regional/municipal border alignment');
const facts=load(base+'statistics.json');assert.equal(sha(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(facts.regions).filter(([,r])=>r.level<3))))),report.originalFacts,'Published population and economy unchanged');
console.log('Denmark countrywide audit: 98 municipalities, 5 regions, 2,096 parishes; no same-level overlaps, exact national coverage, '+lineSamples+' contained parish-line samples, '+ownedSegments+' shared stroke segments and 27 real cross-municipal identities verified.');
