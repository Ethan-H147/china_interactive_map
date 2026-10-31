import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import '../dist/countries.js';
import {definitions} from './americas-completion-definitions.mjs';
import {source,root} from './fetch-americas-completion.mjs';
import {load,polygons,lineIndex,landIndex,metres,linesOf} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {firstLevelPool} from '../dist/first-level-quiz.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const counts={belize:[6],guatemala:[22,340],'el-salvador':[14,44,262],honduras:[18,298],nicaragua:[17,153],'antigua-and-barbuda':[8],barbados:[11],dominica:[10],grenada:[7],'saint-kitts-and-nevis':[14],'saint-lucia':[10],'saint-vincent-and-the-grenadines':[6],'trinidad-and-tobago':[15],guyana:[10],suriname:[10,62]};
const sovereign='canada united-states mexico belize guatemala el-salvador honduras nicaragua costa-rica panama cuba bahamas jamaica haiti dominican-republic antigua-and-barbuda barbados dominica grenada saint-kitts-and-nevis saint-lucia saint-vincent-and-the-grenadines trinidad-and-tobago colombia venezuela guyana suriname brazil ecuador peru bolivia chile argentina paraguay uruguay'.split(' ');
assert.equal(new Set(sovereign).size,35);for(const c of sovereign)assert(AtlasCountries.ids.includes(c),'Interactive Americas country '+c);
for(const key of Object.keys(load(root+'manifest.json').files))source(key);
const area=parts=>parts.reduce((sum,coordinates)=>sum+geographicAreaKm2({type:'Polygon',coordinates}),0),totals={units:0,population:0,missing:0};
for(const d of definitions){
 const base='dist/data/europe/'+d.country+'/',cat=load(base+'catalogue.bin'),stats=load(base+'statistics.json'),first=load(base+'first.bin'),ids=new Map(cat.records.map(r=>[r.id,r])),geometry=new Map(first.regions.features.map(f=>[f.properties.id,f]));
 assert.deepEqual(Object.values(cat.counts),counts[d.country]);assert.equal(ids.size,counts[d.country].reduce((a,b)=>a+b,0));
 for(const [parent,chunk]of Object.entries(cat.chunks).sort((a,b)=>a[1].level-b[1].level)){
  const data=load(base+chunk.file);assert.equal(data.regions.features.length,chunk.count);assert.equal(fs.statSync(base+chunk.file).size,chunk.bytes);assert.equal(Buffer.byteLength(JSON.stringify(data)),chunk.decodedBytes);
  for(const f of data.regions.features){const r=ids.get(f.properties.id);assert(r);assert.equal(r.parent,parent);assert.equal(r.level,chunk.level);geometry.set(r.id,f);}
  const union=polygonClipping.union(...data.regions.features.map(f=>polygons(f.geometry))),mask=polygons(geometry.get(parent).geometry);
  assert(area(polygonClipping.difference(mask,union))<.02,'Parent coverage gap '+parent);assert(area(polygonClipping.difference(union,mask))<.02,'Child outside parent '+parent);
  for(const f of data.boundaries.features)assert(f.properties.owners.length>=2,'No child coastline strokes');
 }
 let pop=0;for(const r of cat.records){const f=geometry.get(r.id),s=stats.regions[d.country+':'+r.id];assert(f&&s&&r.en&&r.areaKm2>0);assert(landIndex(polygons(f.geometry).flat())(r.center),'Label inside its region '+r.id);if(r.level>1)assert(ids.has(r.parent));if(s.population){assert(s.population.value>0&&s.population.year&&s.population.source);pop++;}assert(!s.gdp&&!s.gdpPerCapita,'No apportioned national GDP');assert(!/^(Lago|Embalse) /i.test(r.en),'Water is not an administrative unit');}
 const missing=d.country==='nicaragua'?153:d.country==='saint-vincent-and-the-grenadines'?6:d.country==='antigua-and-barbuda'?1:0;assert.equal(cat.records.length-pop,missing,d.country+' explicit unmatched statistics');
 const national=stats.regions[d.country+':'+d.iso];assert(national.population.value>0&&national.gdp.value>0&&national.gdpPerCapita.value>0);assert.equal(national.gdp.year,2025);assert.equal(national.gdpPerCapita.year,2025);
 assert.equal(firstLevelPool(cat.records).length,counts[d.country][0]);for(const f of first.boundaries.features)assert(f.properties.owners.length>=2);
 const country=AtlasCountries.countries[d.country];assert.equal(country.continent,d.continent);assert.equal(country.map.countryProfile,false);assert.equal(country.map.fill,d.fill);assert.equal(country.map.line,d.line);assert(country.quiz);assert(fs.readFileSync('dist/vendor/flag-'+d.prefix+'.svg','utf8').includes('<svg'));assert(fs.existsSync('dist/data/region-colors/'+d.country+'.json'));const colors=load('dist/data/region-colors/'+d.country+'.json');for(const r of cat.records){const facts=stats.regions[d.country+':'+r.id],color=colors.records.find(c=>c.id===r.id);if(facts.population){assert(color&&color.metrics.population&&color.metrics.populationDensity,'Population and density colors '+r.id);assert.equal(color.metrics.population.value,facts.population.value);}if(color)assert(!color.metrics.gdp&&!color.metrics.gdpPerCapita,'No unavailable regional economic shading');}
 totals.units+=cat.records.length;totals.population+=pop;totals.missing+=missing;console.log(d.country,cat.counts,pop+' population records');
}
assert.deepEqual(totals,{units:1337,population:1177,missing:160});
const government=load(root+'government-populations.json');assert.deepEqual(government,JSON.parse(source('government-populations.json')));for(const [country,g]of Object.entries(government)){const stats=load('dist/data/europe/'+country+'/statistics.json');assert.equal(stats.regions[country+':'+definitions.find(d=>d.country===country).iso].population.year,g.year);}
const b=load('dist/data/europe/barbados/statistics.json');assert.equal(b.regions['barbados:BRB'].population.value,269090);assert.equal(b.regions['barbados:BRB'].population.method,'estimate');
const k=load('dist/data/europe/saint-kitts-and-nevis/statistics.json');assert.equal(k.regions['saint-kitts-and-nevis:KNA'].population.value,51320);assert.match(k.regions['saint-kitts-and-nevis:KNA'].population.coverageNote,/excludes institutional residents/i);
const grenada=load('dist/data/europe/grenada/catalogue.bin'),g=grenada.records.find(r=>r.en==='Carriacou and Petite Martinique');assert(g);assert.equal(load('dist/data/europe/grenada/statistics.json').regions['grenada:'+g.id].population.value,4747);
assert.equal(load('dist/data/europe/grenada/statistics.json').regions['grenada:GRD'].population.value,109021);
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const [country,expected]of Object.entries(meta.americasCompletion.preservedInteractiveHashes))assert.equal(hash(world.features.filter(f=>f.properties.country===country)),expected,'Earlier country silhouette '+country);for(const d of definitions)assert(world.features.some(f=>f.properties.country===d.country));
for(const [country,expected]of Object.entries(meta.americasCompletion.neighborAdministrativeHashes||{}))assert.equal(createHash('sha256').update(fs.readFileSync('dist/data/europe/'+country+'/first.bin')).digest('hex'),expected,'Existing neighbor administrative geometry '+country);
const canonical=load(root+'frontiers.bin'),mapping={MEX:'mexico',CRI:'costa-rica',BRA:'brazil',VEN:'venezuela',FRA:'france',GTM:'guatemala',BLZ:'belize',HND:'honduras',SLV:'el-salvador',NIC:'nicaragua',GUY:'guyana',SUR:'suriname'},indices=new Map(),wet=landIndex(load('dist/data/americas-inland-water.bin').features.flatMap(f=>polygons(f.geometry).flat()));
function index(iso){if(indices.has(iso))return indices.get(iso);const country=mapping[iso],data=iso==='BRA'?{features:load('dist/data/flight-context.bin').features.filter(f=>f.properties.country==='brazil'&&!f.properties.claimedBy)}:load('dist/data/europe/'+country+'/first.bin').regions,rings=data.features.flatMap(f=>polygons(f.geometry).flat()),value={near:lineIndex(rings),inside:landIndex(rings)};indices.set(iso,value);return value;}
assert.equal(canonical.features.length,14);assert.equal(new Set(canonical.features.map(f=>f.properties.pair)).size,13);
const contextEdges=new Map(Object.entries(mapping).map(([iso,country])=>[iso,lineIndex(world.features.filter(f=>f.properties.country===country&&!f.properties.claimedBy).flatMap(f=>polygons(f.geometry).flat()))]));
const strokes=[...load('dist/data/atlas-frontiers.bin').features,...Object.values(mapping).filter(c=>c!=='brazil').flatMap(c=>load('dist/data/europe/'+c+'/international.bin').features)];
let probes=0,maxDeviation=0;const audit=[];
for(const f of canonical.features){
 const [a,b]=f.properties.pair.split('-'),A=index(a),B=index(b),path=f.geometry.coordinates;let checked=0,ambiguous=0;
 for(const p of path){assert(Math.max(A.near(p),B.near(p))<10,'Every frontier endpoint and bend meets both countries '+f.properties.pair+' '+p);assert(Math.max(contextEdges.get(a)(p),contextEdges.get(b)(p))<10,'Every background endpoint and bend matches '+f.properties.pair+' '+p);}
 const owners=strokes.filter(s=>(s.properties.pair||s.properties.resolvedFrontier)===f.properties.pair);const arcNear=lineIndex(linesOf({features:owners}));assert(owners.length,'One visible frontier owner '+f.properties.pair);
 for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],length=metres(p,q),steps=Math.max(1,Math.ceil(length/1500));for(let k=0;k<steps;k++){
  const m=p.map((v,j)=>v+(q[j]-v)*(k+.5)/steps);if(Math.min(metres(m,path[0]),metres(m,path.at(-1)))<6000)continue;
  const distance=Math.max(A.near(m),B.near(m));assert(Math.max(contextEdges.get(a)(m),contextEdges.get(b)(m))<3,'Background neighbors share their detailed edge '+f.properties.pair);assert(distance<3,'Countries share the same fill edge '+f.properties.pair+' '+distance);assert(arcNear(m)<.5,'Visible shared border '+f.properties.pair);maxDeviation=Math.max(maxDeviation,distance);probes++;checked++;
  if(wet(m)||length<1)continue;const dx=(q[0]-p[0])*Math.cos(m[1]*Math.PI/180),dy=q[1]-p[1],span=Math.hypot(dx,dy),off=[-dy/span*.000045/Math.cos(m[1]*Math.PI/180),dx/span*.000045],x=m.map((v,j)=>v+off[j]),y=m.map((v,j)=>v-off[j]);if(A.inside(x)===B.inside(x)||A.inside(y)===B.inside(y))ambiguous++;
 }}
 assert.equal(ambiguous,0,'No land gap or overlap on either side of '+f.properties.pair);audit.push({pair:f.properties.pair,probes:checked});
}
const oldOutlines=load('dist/data/world-country-outlines.bin');assert(!oldOutlines.features.some(f=>String(f.properties.countries).split(' ').some(c=>definitions.some(d=>d.iso===c))),'No obsolete duplicate background border');
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/americas-completion-validation.json',JSON.stringify({totals,countries:15,sovereignAmericas:35,preservedCountries:Object.keys(meta.americasCompletion.preservedInteractiveHashes).length,frontiers:14,probes,maxDeviationMetres:maxDeviation,audit},null,2)+'\n');
console.log('Americas complete:',totals,'shared-border probes',probes,'max deviation',maxDeviation,'metres');
