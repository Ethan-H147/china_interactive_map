// Shared frontiers, coast-free edge runs and channel borders (build-atlas-frontiers.mjs,
// build-unit-edges.mjs, build-channel-borders.mjs) stay consistent with the data they index.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {load} from './geo-index.mjs';
import {edgeLines} from '../dist/edge-runs.mjs';
import '../dist/countries.js';

const data='dist/data/',registry=globalThis.AtlasCountries;
const frontiers=load(data+'atlas-frontiers.bin');
assert(frontiers.features.length>100,'Shared frontiers are built');
for(const f of frontiers.features){const ids=f.properties.countries.split(' ');assert(ids.every(id=>registry.countries[id]),'Frontier countries are atlas countries: '+f.properties.countries);assert(Number.isFinite(f.properties.visibleZoom));}
assert(JSON.parse(fs.readFileSync(data+'atlas-frontiers-sources.json')).sources,'Frontier sources are recorded');

let runs=0,channels=0;
function checkRuns(collection,label){
 for(const [fi,pi,ri,start,end] of collection.edgeRuns||[]){const g=collection.features[fi]?.geometry;assert(g,label+': run feature');const ring=(g.type==='Polygon'?g.coordinates:g.coordinates[pi])?.[ri];assert(ring&&start>=0&&end<ring.length&&start<end,label+': run range');runs++;}
 const ids=new Set(collection.features.map(f=>f.properties.id));
 for(const f of collection.channels?.features||[]){assert(f.properties.owners.some(id=>ids.has(id)),label+': channel owner');channels++;}
 if(collection.edgeRuns){const lines=edgeLines(collection);assert(lines.features.every(f=>ids.has(f.properties.id)),label+': lines keep unit ids');}
}
for(const country of ['philippines','indonesia']){
 const catalogue=load(data+'archipelago/'+country+'-catalogue.bin'),overview=load(data+'archipelago/'+country+'-overview.bin');
 for(const level of ['first','second'])checkRuns(overview[level],country+' overview');
 for(const [id,e] of Object.entries(catalogue.chunks)){const bytes=fs.readFileSync(data+'archipelago/'+e.file);assert.equal(bytes.length,e.bytes,country+' '+id+' size');for(const level of ['first','second'])checkRuns(load(data+'archipelago/'+e.file)[level],country+' '+id);}
}
{
 const catalogue=load(data+'japan-local/catalogue.bin');
 for(const [id,e] of Object.entries(catalogue.chunks)){assert.equal(fs.statSync(data+'japan-local/'+e.file).size,e.bytes,'Japan '+id+' size');for(const c of Object.values(load(data+'japan-local/'+e.file)))checkRuns(c,'Japan '+id);}
 assert(load(data+'japan-boundaries.bin').boundaries.features.length,'Japan prefecture edges');
}
{
 const catalogue=load(data+'southeast-asia/malaysia-catalogue.bin');checkRuns(load(data+'southeast-asia/malaysia-first.bin'),'Malaysia');
 for(const [id,e] of Object.entries(catalogue.chunks))checkRuns(load(data+'southeast-asia/'+e.file),'Malaysia '+id);
}
for(const base of ['europe/united-kingdom','europe/spain','europe/france','europe/italy','russia',...['south-africa','botswana','namibia','eswatini','lesotho'].map(c=>'southern-africa/'+c)]){
 const catalogue=load(data+base+'/catalogue.bin');
 for(const p of [load(data+base+'/first.bin'),...Object.values(catalogue.chunks).map(e=>load(data+base+'/'+e.file))]){const ids=new Set(p.regions.features.map(f=>f.properties.id));for(const f of p.boundaries.features)if(f.properties.channel){assert(f.properties.owners.some(id=>ids.has(id)),base+': channel owner');channels++;}}
}
for(const name of ['korea','mongolia']){const d=load(data+name+'-boundaries.bin'),c=load(data+name+'-channels.bin');for(const level of ['first','second']){assert.equal(d.boundaries[level].type,'MultiLineString',name+' boundaries stay geometries');for(const f of c[level].features){assert(f.properties.owners.length===2);channels++;}}}
for(const country of ['brazil','argentina','uruguay']){
 const source=JSON.parse(fs.readFileSync(data+'south-america/'+country+'-sources.json'));assert.equal(fs.statSync(data+'south-america/'+country+'-first.bin').size,source.bytes,country+' size');
 const index=load(data+'south-america/'+country+'-local/index.bin');
 for(const p of [load(data+'south-america/'+country+'-first.bin'),...Object.values(index.groups).map(g=>{assert.equal(fs.statSync(data+'south-america/'+country+'-local/'+g.file).size,g.bytes,country+' '+g.file+' size');return load(data+'south-america/'+country+'-local/'+g.file);})]){
  const ids=new Set(p.regions.features.map(f=>f.properties.id));for(const f of p.lines.features){assert.equal(f.properties.regionIds.length,2);if(f.properties.channel){assert(f.properties.regionIds.some(id=>ids.has(id)),country+': channel owner');channels++;}}
 }
}
assert(runs>1000&&channels>100,'Edge runs and channels are present');
console.log(`Borders: ${frontiers.features.length} shared frontier pieces, ${runs} edge runs, ${channels} channel lines checked.`);
