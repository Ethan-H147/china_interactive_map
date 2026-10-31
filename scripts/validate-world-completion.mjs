import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import '../dist/countries.js';
import {definitions} from './world-completion-definitions.mjs';
import {source,root} from './fetch-world-completion.mjs';
import {load,polygons,lineIndex,landIndex,metres,linesOf} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {firstLevelPool} from '../dist/first-level-quiz.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const counts={'burkina-faso':[17,47,351],'central-african-republic':[17],chad:[23,70],mali:[20,160],niger:[8,67,266],'south-sudan':[10,78,511],andorra:[7],liechtenstein:[11],malta:[68],israel:[6,14],kuwait:[6],lebanon:[9,26],palestine:[2,16]};
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

 const national=stats.regions[d.country+':'+d.iso];assert(national.population.value>0&&national.gdp.value>0&&national.gdpPerCapita.value>0);assert.equal(national.gdp.year,national.gdpPerCapita.year);
 assert.equal(firstLevelPool(cat.records).length,counts[d.country][0]);
 const c=AtlasCountries.countries[d.country];assert.equal(c.continent,d.continent);assert.equal(c.map.countryProfile,false);assert.equal(c.map.fill,d.fill);assert.equal(c.map.selected,d.selected);assert.equal(c.map.line,d.line);assert(c.quiz);assert(fs.readFileSync('dist/vendor/flag-'+d.prefix+'.svg','utf8').includes('<svg'));
 const colors=load('dist/data/region-colors/'+d.country+'.json');for(const r of cat.records){const facts=stats.regions[d.country+':'+r.id],color=colors.records.find(c=>c.id===r.id);if(facts.population){assert(color?.metrics.population&&color.metrics.populationDensity);assert.equal(color.metrics.population.value,facts.population.value);}if(color)assert(!color.metrics.gdp&&!color.metrics.gdpPerCapita);}
 totals.units+=cat.records.length;totals.population+=pop;totals.missing+=cat.records.length-pop;console.log(d.country,cat.counts,pop+' population records');
}
const world=load('dist/data/world-land.bin'),meta=load('dist/data/world-land-sources.json');for(const [country,expected]of Object.entries(meta.worldCompletion.preservedInteractiveHashes))assert.equal(hash(world.features.filter(f=>f.properties.country===country)),expected,'Earlier silhouette '+country);for(const d of definitions)assert(world.features.some(f=>f.properties.country===d.country));for(const [country,expected]of Object.entries(meta.worldCompletion.neighborAdministrativeHashes))assert.equal(createHash('sha256').update(fs.readFileSync('dist/data/europe/'+country+'/first.bin')).digest('hex'),expected,'Existing administrative land '+country);
const canonical=load(root+'frontiers.bin'),mapping=load(root+'frontier-mapping.json'),indices=new Map(),audit=[];let probes=0,maxDeviation=0;
const needed=new Set(canonical.features.flatMap(f=>f.properties.pair.split('-')));for(const [iso,country]of Object.entries(mapping).filter(([iso])=>needed.has(iso))){const file='dist/data/europe/'+country+'/first.bin';if(!fs.existsSync(file))continue;const rings=load(file).regions.features.flatMap(f=>polygons(f.geometry).flat());indices.set(iso,lineIndex(rings));}
for(const f of canonical.features){let worst=0,checked=0;const path=f.geometry.coordinates,[a,b]=f.properties.pair.split('-');for(const p of path)assert(Math.max(indices.get(a)(p),indices.get(b)(p))<1,'Every frontier endpoint and bend matches both final fills '+f.properties.pair+' '+p);for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],steps=Math.max(1,Math.ceil(metres(p,q)/2000));for(let k=0;k<steps;k++){const point=p.map((v,j)=>v+(q[j]-v)*(k+.5)/steps);const distance=Math.max(indices.get(a)(point),indices.get(b)(point));worst=Math.max(worst,distance);checked++;}}audit.push({pair:f.properties.pair,checked,maxDeviationMetres:worst});probes+=checked;maxDeviation=Math.max(maxDeviation,worst);}

const ownerFiles=new Map();for(const country of new Set(canonical.features.map(f=>f.properties.owner))){for(const f of load('dist/data/europe/'+country+'/international.bin').features){const pair=f.properties.pair;if(!pair||!canonical.features.some(c=>c.properties.pair===pair))continue;if(!ownerFiles.has(pair))ownerFiles.set(pair,new Set());ownerFiles.get(pair).add(country);}}for(const f of canonical.features)assert.deepEqual([...ownerFiles.get(f.properties.pair)],[f.properties.owner],'Single country owner '+f.properties.pair);
const sovereignCodes='AFG ALB DZA AND AGO ATG ARG ARM AUS AUT AZE BHS BHR BGD BRB BLR BEL BLZ BEN BTN BOL BIH BWA BRA BRN BGR BFA BDI CPV KHM CMR CAN CAF TCD CHL CHN COL COM COG CRI CIV HRV CUB CYP CZE COD DNK DJI DMA DOM ECU EGY SLV GNQ ERI EST SWZ ETH FJI FIN FRA GAB GMB GEO DEU GHA GRC GRD GTM GIN GNB GUY HTI HND HUN ISL IND IDN IRN IRQ IRL ISR ITA JAM JPN JOR KAZ KEN KIR PRK KOR KWT KGZ LAO LVA LBN LSO LBR LBY LIE LTU LUX MDG MWI MYS MDV MLI MLT MHL MRT MUS MEX FSM MDA MCO MNG MNE MAR MOZ MMR NAM NRU NPL NLD NZL NIC NER NGA MKD NOR OMN PAK PLW PAN PNG PRY PER PHL POL PRT QAT ROU RUS RWA KNA LCA VCT WSM SMR STP SAU SEN SRB SYC SLE SGP SVK SVN SLB SOM ZAF SSD ESP LKA SDN SUR SWE CHE SYR TJK TZA THA TLS TGO TON TTO TUN TUR TKM TUV UGA UKR ARE GBR USA URY UZB VUT VEN VNM YEM ZMB ZWE VAT PSE'.split(' ');
assert.equal(new Set(sovereignCodes).size,195);const included=new Set(meta.topology.atlasCodes.map(c=>c==='SDS'?'SSD':c==='PSX'?'PSE':c));for(const iso of sovereignCodes)assert(included.has(iso),'Sovereign / observer country coverage '+iso);
assert.deepEqual(totals,{units:1810,population:697,missing:1113});
const government=load(root+'government-populations.json');assert.deepEqual(government,JSON.parse(source('government-populations.json')));for(const [country,total]of [['andorra',89058],['liechtenstein',41237]]){const d=definitions.find(d=>d.country===country),stats=load('dist/data/europe/'+country+'/statistics.json'),rows=Object.values(stats.regions).filter(r=>r.level===1);assert.equal(rows.reduce((sum,r)=>sum+r.population.value,0),total);assert.equal(stats.regions[country+':'+d.iso].population.value,total);}

const report={countries:13,sovereignCountries:195,totals,frontiers:canonical.features.length,probes,maxDeviationMetres:maxDeviation,audit};fs.writeFileSync('artifacts/world-completion-validation.json',JSON.stringify(report,null,2)+'\n');console.log({countries:report.countries,sovereignCountries:195,totals,frontiers:report.frontiers,probes,maxDeviationMetres:maxDeviation});assert(maxDeviation<3,'All shared border interiors meet within three metres; see audit');
