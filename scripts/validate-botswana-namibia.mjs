import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {configurations} from '../dist/southern-africa.mjs';
import {hashFor,fromHash} from '../dist/view-state.mjs';
import {borderSegments} from '../dist/adaptive-lines.mjs';
import {settlementStatistics} from '../dist/settlement-layer.mjs';
const base='dist/data/southern-africa/',read=(c,n)=>JSON.parse(gunzipSync(fs.readFileSync(base+c+'/'+n)));
const inRing=(p,r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const contains=(p,g)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(poly=>inRing(p,poly[0])&&!poly.slice(1).some(r=>inRing(p,r)));
const expected={botswana:{counts:[10,28,519],population:2359609,cities:66},namibia:{counts:[14,121,0],population:3022401,cities:57}};
for(const [country,wanted]of Object.entries(expected)){
 const catalogue=read(country,'catalogue.bin'),bundle=read(country,'all.bin'),ids=new Map(catalogue.records.map(r=>[r.id,r]));
 assert.equal(ids.size,catalogue.records.length);assert.deepEqual([1,2,3].map(l=>catalogue.records.filter(r=>r.level===l).length),wanted.counts);
 assert(configurations[country].loadAllSubdivisions&&configurations[country].settlements,'Shared country bundle and independent settlements');
 for(const r of catalogue.records){assert(r.areaKm2>0&&r.center.every(Number.isFinite)&&r.en&&r.local);if(r.parent){assert.equal(ids.get(r.parent)?.level,r.level-1);}}
 for(const part of bundle.levels){assert.equal(part.regions.features.length,wanted.counts[part.level-1]);for(const f of part.regions.features){assert(ids.has(f.properties.id));assert(contains(ids.get(f.properties.id).center,f.geometry),'Interior label anchors');}for(const f of part.boundaries.features){assert(f.properties.owners.length>=2,'No exterior/coastline strokes');assert(f.properties.owners.every(id=>ids.has(id)));}}
 const stats=JSON.parse(fs.readFileSync(base+country+'/statistics.json'));assert.equal(Object.keys(stats.regions).length,catalogue.records.length);
 const top=catalogue.records.filter(r=>r.level===1);assert.equal(top.reduce((n,r)=>n+stats.regions[country+':'+r.id].population.value,0),wanted.population);
 for(const parent of top){const children=catalogue.records.filter(r=>r.parent===parent.id);assert.equal(children.reduce((n,r)=>n+stats.regions[country+':'+r.id].population.value,0),stats.regions[country+':'+parent.id].population.value);}
 for(const r of catalogue.records){const stat=stats.regions[country+':'+r.id];assert(stat.area?.value>0);assert(!stat.gdp,'No national GDP allocated to regions');if(r.level===3)assert(!stat.population,'A locality never inherits a same-named subdistrict population');else assert(stat.population?.value>0);}
 const settlements=JSON.parse(fs.readFileSync(base+country+'/settlements.json')),first=read(country,'first.bin').regions.features;
 assert.equal(settlements.records.length,wanted.cities);for(const city of settlements.records){assert(!ids.has(city.id),'Independent cities never overwrite same-named census subdivisions');assert(Number.isInteger(city.population.value)&&city.population.value>0);assert.equal(city.population.year,country==='botswana'?2022:2023);assert(contains(city.center,first.find(f=>f.properties.id===city.parentId).geometry),'City dot belongs to its actual region');const card=settlementStatistics(city,city.id);assert.equal(card.regions[city.id].population,city.population);assert.equal(card.regions[city.id].area,undefined,'Population-only city cards need no invented area');assert(card.sources[city.population.source].title.includes(country==='botswana'?'Botswana':'Namibia'),'City sources describe their actual country');}
 const view={v:1,country,center:configurations[country].center,zoom:5,mode:country==='botswana'?3:2,language:'both',layers:{[configurations[country].prefix+'-settlement-layer']:true}};assert.equal(fromHash(hashFor(view)).mode,view.mode,'Deep subdivision views survive share/restore');
 assert(fs.existsSync('dist/'+configurations[country].nationalFlag));assert(fs.statSync(base+country+'/all.bin').size<1_000_000,'Complete detailed country bundle stays below 1 MB');
 console.log(country,wanted.counts,wanted.cities,'city dots; exact census subtotals, sourced area, coast-free lines and shared view restoration passed.');
}
const contexts=['botswana','namibia'].flatMap(c=>read(c,'context.bin').features),t=topology({countries:{type:'FeatureCollection',features:contexts}}),seam=mesh(t,t.objects.countries,(a,b)=>a!==b);
assert(seam.coordinates.length>0);const stored=read('namibia','international.bin'),expectedSegments=borderSegments({features:[{geometry:seam}]});assert.deepEqual(borderSegments(stored),expectedSegments,'The Namibia–Botswana seam is drawn from the exact country topology');
const old=borderSegments(read('south-africa','international.bin'));assert([...borderSegments(stored)].every(s=>!old.has(s)),'New countries never draw South Africa’s international stroke twice');
assert.equal(read('botswana','international.bin').features.length,0,'One owner for the new shared international frontier');
const images=JSON.parse(fs.readFileSync('dist/data/flag-images.json')),flags=JSON.parse(fs.readFileSync('dist/data/botswana-namibia-flag-sources.json'));
for(const flag of [...Object.values(flags.nationalFlags),...Object.values(flags.flags)]){assert(fs.existsSync('dist/'+flag.file));assert(images[flag.file]?.full,'The shared viewer has the uncropped original');}
console.log('Botswana–Namibia exact shared topology, single border ownership, bundle budgets and original flag viewer passed.');
