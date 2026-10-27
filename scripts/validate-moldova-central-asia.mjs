import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import {load,polygons,landIndex} from './geo-index.mjs';
import {source,root} from './fetch-moldova-central-asia.mjs';
import {definitions} from './moldova-central-asia-definitions.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {placeLines} from '../dist/settlement-layer.mjs';
import '../dist/countries.js';
const manifest=load(root+'manifest.json');for(const name of Object.keys(manifest.files))source(name);
// Quantize overlay comparisons to a centimetre lattice; shared collinear nodes
// can otherwise trigger floating-point sweep failures or spherical sliver area.
const lattice=v=>typeof v==='number'?Math.round(v*1e7):v.map(lattice),degrees=v=>typeof v==='number'?v/1e7:v.map(degrees);
const overlay=(op,a,b)=>fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:degrees(polygonClipping[op](lattice(a),lattice(b)))}}]);
const planarArea=g=>polygons(g).reduce((sum,p)=>{const ring=r=>{const[x,y]=r[0];let n=0;for(let i=1;i<r.length;i++)n+=(r[i-1][0]-x)*(r[i][1]-y)-(r[i][0]-x)*(r[i-1][1]-y);return Math.abs(n)*.5*111.31949**2*Math.cos(r.reduce((s,p)=>s+p[1],0)/r.length*Math.PI/180);};return sum+Math.max(0,ring(p[0])-p.slice(1).reduce((s,r)=>s+ring(r),0));},0);
const expectedPopulation={moldova:33,uzbekistan:14,tajikistan:5,turkmenistan:5};
for(const d of definitions){
 const base='dist/data/europe/'+d.country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin').regions,ids=new Map(cat.records.map(r=>[r.id,r]));
 assert.deepEqual(cat.counts,d.counts);assert.equal(ids.size,Object.values(d.counts).reduce((a,b)=>a+b));assert.equal(first.features.length,d.counts[1]);
 assert.equal(Object.values(stats.regions).filter(r=>r.level===1&&r.population).length,expectedPopulation[d.country]);
 for(const r of cat.records){assert(r.en&&r.local&&r.areaKm2>0&&r.center?.length===2);if(r.parent)assert.equal(ids.get(r.parent)?.level,r.level-1);const stat=stats.regions[d.country+':'+r.id];assert(stat.area.value>0);assert(!stat.gdp&&!stat.gdpPerCapita,'National GDP does not flow into subdivisions');if(stat.population)assert(stat.population.value>0&&stats.sources[stat.population.source]?.url);}
 for(const f of first.features){const r=ids.get(f.properties.id);assert(landIndex(polygons(f.geometry).flat())(r.center),r.id+' label lies inside its polygon');}
 for(const [parent,chunk]of Object.entries(cat.chunks)){
  assert.equal(fs.statSync(base+chunk.file).size,chunk.bytes);const part=load(base+chunk.file);assert.equal(part.regions.features.length,chunk.count);assert(part.regions.features.every(f=>ids.get(f.properties.id).parent===parent));
  const p=first.features.find(f=>f.properties.id===parent);
  const missing=overlay('difference',polygons(p.geometry),part.regions.features.flatMap(f=>polygons(f.geometry))),outside=overlay('difference',part.regions.features.flatMap(f=>polygons(f.geometry)),polygons(p.geometry)),area=data=>data.features.reduce((s,f)=>s+planarArea(f.geometry),0);
  assert(area(missing)<.2,parent+' local partition covers its displayed parent: '+area(missing)+' km²');assert(area(outside)<.2,parent+' local fill stays inside its parent');
  for(const f of part.regions.features){const r=ids.get(f.properties.id);assert(landIndex(polygons(f.geometry).flat())(r.center));}
 }
 const national=stats.regions[d.country+':'+d.iso];assert(national.population.value>1e6&&national.gdp.value>1e9&&national.gdpPerCapita.value>100);assert.equal(national.gdp.year,national.gdpPerCapita.year);
 const registry=globalThis.AtlasCountries.countries[d.country];assert(!registry.map.countryProfile);assert.equal(registry.map.countryStatistics,d.iso);assert(registry.continent===(d.country==='moldova'?'Europe':'Asia'));assert(fs.existsSync('dist/vendor/flag-'+d.prefix+'.svg'));
 const colors=load('dist/data/region-colors/'+d.country+'.json');assert.equal(colors.records.filter(r=>r.metrics.population).length,expectedPopulation[d.country]);
 const search=createPlaceSearch(cat.records);for(const r of cat.records.filter(r=>r.level===1)){assert(search(r.local).some(x=>x.id===r.id),'Local-name search '+r.id);assert.deepEqual(placeLines(r,'both'),[...new Set([r.en,r.local])],'English/native labels '+r.id);if(r.names.ru)assert.deepEqual(placeLines(r,'ru'),[r.names.ru]);}
 if(d.country==='moldova'){assert.equal(stats.regions['moldova:MD010'].population.value,720128);for(const id of ['MD004','MD009','MD015','MD035'])assert(!stats.regions['moldova:'+id].population);}
 if(d.country==='tajikistan')assert.equal(Object.values(stats.regions).filter(r=>r.level===1).reduce((s,r)=>s+r.population.value,0),10817700);
 if(d.country==='turkmenistan'){const city=first.features.find(f=>f.properties.id==='TM-ARK'),ahal=first.features.find(f=>f.properties.id==='TM-A');assert(geographicAreaKm2(city.geometry)>1);assert(geographicAreaKm2({type:'MultiPolygon',coordinates:polygonClipping.intersection(polygons(city.geometry),polygons(ahal.geometry))})<.001,'Arkadag is separate from Ahal');assert(!stats.regions['turkmenistan:TM-ARK'].population&&!stats.regions['turkmenistan:TM-A'].population);}
 console.log(d.country+': source checksums, hierarchy, parent coverage, search, statistics, colour data and hidden country pages passed.');
}
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const [c,h]of Object.entries(meta.moldovaCentralAsiaIntegration.preservedInteractiveHashes))assert.equal(createHash('sha256').update(JSON.stringify(world.features.filter(f=>f.properties.country===c))).digest('hex'),h,'Preserved '+c);
for(const d of definitions){assert(world.features.some(f=>f.properties.country===d.country));assert(meta.topology.atlasCodes.includes(d.iso)&&!meta.topology.backgroundCodes.includes(d.iso));}
console.log('All existing interactive silhouettes preserved; all four new countries integrated into the world map.');
