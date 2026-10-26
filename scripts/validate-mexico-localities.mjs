import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {load,landIndex,polygons} from './geo-index.mjs';
import {decimalDegrees} from './prepare-mexico-localities.mjs';
import {expandSettlementRecords,settlementFeatures,settlementStatistics,visibleSettlements} from '../dist/settlement-layer.mjs';
import {createPlaceSearch} from '../dist/place-search.mjs';
import '../dist/countries.js';

const root='dist/data/europe/mexico/',source='scripts/boundary-sources/mexico-localities/',manifest=load(source+'manifest.json'),rows=load(source+'localities-2020.json.gz'),data=load(root+'settlements.bin'),records=expandSettlementRecords(data),catalogue=load(root+'catalogue.bin'),units=new Map(catalogue.records.map(r=>[r.id,r])),audit=load(source+'coverage-audit.json'),outside=new Set(audit.outsideMappedLand.map(r=>r.code)),byId=new Map(records.map(r=>[r.id,r])),sourceRows=new Map(rows.map(r=>[r.ENTIDAD+r.MUN+r.LOC,r]));
assert.equal(createHash('sha256').update(fs.readFileSync(source+'localities-2020.json.gz')).digest('hex'),manifest.retainedSha256);
assert.equal(manifest.archiveSha256,load('scripts/country-expansion-sources.json').files['mexico-population.zip'].sha256);
assert.equal(rows.length,189432);assert.equal(records.length,189432);assert.equal(byId.size,records.length);assert.equal(sourceRows.size,records.length);assert.equal(records.reduce((n,r)=>n+r.population.value,0),126014024);assert.equal(audit.excluded.length,0);
const masks=new Map();for(const chunk of Object.values(catalogue.chunks))for(const f of load(root+chunk.file).regions.features)masks.set(f.properties.id,landIndex(polygons(f.geometry).flat()));
for(const r of records){
 const code=r.id.slice(7),row=sourceRows.get(code);assert(row,'Exact census locality identity '+r.id);assert.equal(r.en,row.NOM_LOC);assert.deepEqual(r.center,[decimalDegrees(row.LONGITUD),decimalDegrees(row.LATITUD)]);assert.equal(r.population.value,+row.POBTOT);assert.equal(r.population.year,2020);assert.equal(r.population.scope,'Census locality');assert(!r.gdp&&!r.gdpPerCapita&&!r.area,'No municipal figures attached to cities');
 assert.equal(units.get(r.parentId)?.parent,r.provinceId);assert(r.minzoom>=4&&r.minzoom<=15);assert(Number.isFinite(r.dotzoom)&&r.dotzoom>=r.minzoom);
 if(!outside.has(code))assert(masks.get(r.parentId)(r.center),'Current municipality contains locality '+r.id);
}
assert.equal(outside.size,4);for(const row of audit.outsideMappedLand)assert(row.distanceMetres<=250&&byId.get('MX-LOC-'+row.code).parentId==='MX-MUN-'+row.code.slice(0,5),'Retain official link at the four source/mask edge discrepancies');
assert.equal(audit.changedMunicipality.length,851);for(const row of audit.changedMunicipality)assert.equal(byId.get('MX-LOC-'+row.code).parentId,row.mappedMunicipality);
const fixtures=[['230050001','Cancún',888797,'23005'],['030080054','Cabo San Lucas',202694,'03008'],['230040001','Chetumal',169028,'23004'],['140390001','Guadalajara',1385621,'14039']];
for(const [code,name,population,parent]of fixtures){const r=byId.get('MX-LOC-'+code);assert.equal(r.en,name);assert.equal(r.population.value,population);assert.equal(r.parentId,'MX-MUN-'+parent);const stats=settlementStatistics(r,'city').regions.city;assert.equal(stats.population.value,population);assert(!stats.gdp&&!stats.area);}
const search=createPlaceSearch([...catalogue.records,...records.map(r=>({...r,level:4,settlement:true,parent:r.parentId}))],{rankGroup:r=>r.settlement?(r.population.value>=2500?-1:1):0,compare:(a,b)=>(b.population?.value||0)-(a.population?.value||0)});
assert.equal(search('Cancun')[0].id,'MX-LOC-230050001','City precedes municipal-seat alias');assert(search('Cancun').some(r=>r.id==='MX-MUN-23005'),'The municipality alias remains available');assert(search('Guadalajara').some(r=>r.id==='MX-MUN-14039'));
assert.equal(search('Guadalajara')[1].id,'MX-MUN-14039','Municipality stays ahead of tiny same-name settlements');
const small=records.find(r=>r.population.value===1);assert(search(small.id.slice(7)).some(r=>r.id===small.id),'A one-person locality is searchable');
const sampled=records.filter((r,i)=>i%500===0),features=settlementFeatures(sampled);for(let i=0;i<sampled.length;i++)assert.equal(features.features[i].properties.dotzoom,sampled[i].dotzoom,'Precomputed admission zoom survives loading');
const world={getWest:()=>-180,getEast:()=>180,getSouth:()=>-90,getNorth:()=>90};assert(visibleSettlements(records,5,world).length<100);assert(!visibleSettlements([small],10,world).length);assert.equal(visibleSettlements([small],3,world,small.id).length,1,'A selected tiny place stays visible');
const config=AtlasCountries.countries.mexico.map;assert(config.settlements&&config.settlementSearchPriority);assert.equal(config.settlementMode,2);assert.equal(config.countryProfile,false);
console.log('Mexico: all 189,432 census localities, 126,014,024 residents, exact names/coordinates, current municipal links, four audited edge cases, independent city statistics, complete search and precomputed dot density passed.');
