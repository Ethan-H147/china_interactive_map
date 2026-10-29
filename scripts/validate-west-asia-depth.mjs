import {khorPatch} from './khor-al-adaid.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import polygonClipping from 'polygon-clipping';
import {load,polygons,landIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {source,root} from './fetch-west-asia.mjs';
import {definitions} from './west-asia-definitions.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),report=load(root+'depth-report.json'),hash=b=>createHash('sha256').update(b).digest('hex');
function planarArea(data){return data.features.reduce((sum,f)=>sum+polygons(f.geometry).reduce((s,p)=>{const area=ring=>{const[x,y]=ring[0];let a=0;for(let i=1;i<ring.length;i++)a+=(ring[i-1][0]-x)*(ring[i][1]-y)-(ring[i][0]-x)*(ring[i-1][1]-y);return Math.abs(a)*.5*111.31949**2*Math.cos(y*Math.PI/180);};return s+Math.max(0,area(p[0])-p.slice(1).reduce((n,r)=>n+area(r),0));},0),0);}
const lattice=v=>typeof v==='number'?Math.round(v*1e6):v.map(lattice),degrees=v=>typeof v==='number'?v/1e6:v.map(degrees),collection=coordinates=>fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:degrees(coordinates)}}]);
function differences(parent,children){const a=lattice(parent.features.flatMap(f=>polygons(f.geometry))),b=polygonClipping.union(...children.features.map(f=>lattice(polygons(f.geometry))));return {missing:collection(polygonClipping.difference(a,b)),outside:collection(polygonClipping.difference(b,a))};}
for(const d of definitions){
 const base='dist/data/europe/'+d.country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin').regions,info=report.countries[d.country],ids=new Map(cat.records.map(r=>[r.id,r])),geometry=new Map(first.features.map(f=>[f.properties.id,f]));
 assert.deepEqual(cat.counts,d.counts);assert.deepEqual(cat.levels,d.levels);assert(AtlasCountries.countries[d.country].map.secondLabel);assert.equal(!!AtlasCountries.countries[d.country].map.thirdLabel,d.country==='iraq');
 assert(first.features.every(f=>cat.chunks[f.properties.id]?.level===2),'Every region has local boundaries');
 const chunks=Object.entries(cat.chunks).sort((a,b)=>a[1].level-b[1].level);
 for(const [parent,chunk]of chunks){
  const file=base+chunk.file,data=load(file),p=geometry.get(parent);assert(p,'Loaded parent '+parent);assert.equal(fs.statSync(file).size,chunk.bytes);assert.equal(data.regions.features.length,chunk.count);
  for(const f of data.regions.features){const r=ids.get(f.properties.id);assert(r&&r.parent===parent&&r.level===chunk.level,'Exact parent link '+f.properties.id);assert(r.en&&r.local&&r.localDir==='rtl');assert(landIndex(polygons(f.geometry).flat())(r.center),'Interior label '+r.id);geometry.set(r.id,f);const s=stats.regions[d.country+':'+r.id];assert(s.area.value>0&&s.area.year===(d.country==='saudi-arabia'?2021:2019));assert(!s.population&&!s.gdp&&!s.gdpPerCapita,'No inferred child population or GDP');}
  const {missing,outside}=differences(fc([p]),data.regions);
  assert(planarArea(missing)<.05,parent+' child coverage: '+planarArea(missing)+' km² missing');assert(planarArea(outside)<.05,parent+' children stay inside parent: '+planarArea(outside)+' km² outside');
 }
 assert.equal(geometry.size,cat.records.length,'Every catalogue record has scoped geometry');
 for(const [file,h]of Object.entries(info.preservedAssets))assert.equal(hash(fs.readFileSync(base+file)),h,'Preserved '+d.country+' '+file);
 for(const [id,h]of Object.entries(info.preservedStatistics))assert.equal(hash(JSON.stringify(stats.regions[id])),h,'Preserved national/region statistics '+id);
 for(const [id,h]of Object.entries(info.preservedPopulation||{}))assert.equal(hash(JSON.stringify(stats.regions[id].population)),h,'Preserved census '+id);
 const search=createPlaceSearch(cat.records);for(const r of cat.records.filter(r=>r.level>1)){assert(search(r.id).some(x=>x.id===r.id),'Code search '+r.id);if(r.referencePortion){assert(/\(part\)$/.test(r.en)&&/reference portion/.test(r.kind)&&stats.regions[d.country+':'+r.id].note.includes('not a newly asserted statutory unit'));}}
 if(d.country==='saudi-arabia'){
  const raw=JSON.parse(source('saudi-governorates.geojson'));assert.deepEqual([...new Set(cat.records.filter(r=>r.level===2).map(r=>r.sourceId))].sort(),raw.features.map(f=>f.properties.shapeID).sort());
  assert.equal(cat.records.find(r=>r.en==='Riyadh Al Khabra').parent,'SA05','Official Qassim membership');
  const khubar=cat.records.find(r=>r.id==='SA-GB-3984122B30508649206602');assert(khubar.bounds[1][0]-khubar.bounds[0][0]<1&&khubar.bounds[1][1]-khubar.bounds[0][1]<1,'Local governorate bounds exclude distant coastal fragments');
  const mask=JSON.parse(source('saudi-national-mask.geojson')),{missing,outside}=differences(mask,first);
  const unchanged=value=>info.coastalCorrection?collection(polygonClipping.difference(lattice(value.features.flatMap(f=>polygons(f.geometry))),lattice(khorPatch))):value;
  assert(planarArea(unchanged(missing))<.05&&planarArea(unchanged(outside))<.05,'Saudi national land mask unchanged outside the sourced inlet correction');
 }else{
  const zip=unzipSync(source(d.iso.toLowerCase()+'.zip'));
  for(const level of d.country==='iraq'?[2,3]:[2]){const raw=JSON.parse(Buffer.from(zip[d.iso.toLowerCase()+'_admin'+level+'.geojson'])),expected=raw.features.map(f=>f.properties['adm'+level+'_pcode']).sort(),actual=[...new Set(cat.records.filter(r=>r.level===level).map(r=>r.sourceId))].sort();assert.deepEqual(actual,expected,'Every original source identity retained '+d.country+' '+level);}
 }
 console.log(d.country+': all scoped levels, parent coverage, dated source identities, area cards, searches and preserved outer geometry passed.');
}
