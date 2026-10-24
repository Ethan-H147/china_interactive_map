import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,polygons,landIndex} from './geo-index.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';
const root='dist/data/europe/mexico/',source='scripts/boundary-sources/mexico-municipalities/',catalogue=load(root+'catalogue.bin'),first=load(root+'first.bin'),stats=load(root+'statistics.json'),pins=load(source+'manifest.json'),index=new Map(catalogue.records.map(r=>[r.id,r])),shapes=new Map();
assert.deepEqual(catalogue.counts,{1:32,2:2478});assert.equal(index.size,2510);assert.equal(Object.keys(catalogue.chunks).length,32);assert.equal(catalogue.records.filter(r=>r.kind==='Municipality').length,2462);assert.equal(catalogue.records.filter(r=>r.kind==='Borough').length,16);
for(const [file,pin]of Object.entries(pins.files))assert.equal(createHash('sha256').update(gunzipSync(fs.readFileSync(source+file+'.gz'))).digest('hex'),pin.sha256,file+' retained bytes');
const pointKey=p=>p.map(n=>n.toFixed(6)).join(','),segmentKey=(a,b)=>{const x=pointKey(a),y=pointKey(b);return x<y?x+'|'+y:y+'|'+x;};
const segments=features=>{const counts=new Map();for(const f of features)for(const ring of polygons(f.geometry).flat())for(let i=1;i<ring.length;i++){const key=segmentKey(ring[i-1],ring[i]);counts.set(key,(counts.get(key)||0)+1);}return counts;};
let missingPopulation=0,withPopulation=0;
for(const [parent,chunk]of Object.entries(catalogue.chunks)){
 const bytes=fs.readFileSync(root+chunk.file),data=load(root+chunk.file);assert.equal(bytes.length,chunk.bytes);assert.equal(gunzipSync(bytes).length,chunk.decodedBytes);assert.equal(data.regions.features.length,chunk.count);
 const code=data.regions.features[0].properties.id.slice(7,9),raw=load(source+'geo-'+code+'.json.gz'),roster=load(source+'catalogue-'+code+'.json.gz').datos;
 assert.equal(chunk.count,roster.length,parent+' every official municipal key');assert.deepEqual(data.regions.features.map(f=>f.properties.id.slice(7)).sort(),roster.map(r=>r.cvegeo).sort());
 const outer=segments([first.regions.features.find(f=>f.properties.id===parent)]),edges=segments(data.regions.features),exterior=new Set([...edges].filter(([,count])=>count===1).map(([key])=>key));
 assert.deepEqual(exterior,new Set(outer.keys()),parent+' municipal perimeter matches its state exactly');for(const count of edges.values())assert(count===1||count===2,parent+' no overlapping boundary segments');
 for(const f of data.regions.features){const r=index.get(f.properties.id),s=stats.regions['mexico:'+r.id],p=raw.features.find(f=>f.properties.cvegeo===r.code).properties;shapes.set(r.id,f);
  assert.equal(r.parent,parent);assert.equal(r.en,p.nomgeo);assert.equal(r.kind,parent==='MX-CMX'?'Borough':'Municipality');assert.equal(r.level,2);assert(r.areaKm2>0&&s.area.value===r.areaKm2);assert.equal(s.area.year,2025);assert(!s.gdp&&!s.gdpPerCapita,'No inherited state economy for '+r.id);
  assert(landIndex(polygons(f.geometry).flat())(r.center),r.id+' label lies inside its polygon');
  if(/^\d+$/.test(p.pob_total)){withPopulation++;assert.equal(s.population.value,+p.pob_total);assert.equal(s.population.year,2020);}else{missingPopulation++;assert(!s.population&&s.note.includes('does not publish'),'Unavailable census remains blank '+r.id);}
 }
 for(const f of data.boundaries.features){assert(f.properties.owners.length>=2);assert(f.properties.owners.every(id=>index.get(id)?.parent===parent));}
}
assert.equal(withPopulation,2469);assert.equal(missingPopulation,9);assert.equal(catalogue.chunks['MX-OAX'].count,570);assert.equal(catalogue.chunks['MX-CMX'].count,16);assert.equal(catalogue.chunks['MX-BCN'].count,7);
for(const [id,p]of [['14039',[-103.35,20.68]],['09015',[-99.1332,19.4326]],['23005',[-86.8515,21.1619]],['02004',[-117.0382,32.5149]],['20409',[-96.636,17.046]]])assert(landIndex(polygons(shapes.get('MX-MUN-'+id).geometry).flat())(p),'Known municipal location '+id);
const search=createPlaceSearch(catalogue.records);for(const [query,id]of [['Guadalajara','14039'],['Cancun','23005'],['Cuauhtemoc Mexico City','09015'],['Santa Maria del Tule','20409'],['Villa de Pozos','24059'],['Dzitbalche','04013'],['Nuu Savi','12083']])assert(search(query).some(r=>r.id==='MX-MUN-'+id),'Search '+query);
assert(AtlasCountries.countries.mexico.map.secondLabel);assert(AtlasCountries.countries.mexico.controls.includes('mx-second-layer'));assert(!fs.existsSync(root+'all.bin'),'Municipalities load per state');
console.log('Mexico: all 2,478 official municipal keys, 32 exact parent/child perimeters, 2,469 census counts, 9 explicit gaps, search aliases, source hashes and lazy chunks passed.');
