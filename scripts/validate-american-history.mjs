import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {decodeData} from '../dist/geo-pack.mjs';import {packShapes,shapeAtLocation} from '../dist/historic-borders.mjs';import {brazilPeriods,mexicoPeriods} from '../dist/american-history.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
const root='dist/data/europe/',cache=new Map();
async function dated(country,year){const key=country+year;if(!cache.has(key)){const data=await decodeData(fs.readFileSync(root+country+'/history/'+year+'.bin'));cache.set(key,{...data,shapes:packShapes(data.regions.features)});}return cache.get(key);}
async function at(country,year,[lng,lat]){const d=await dated(country,year),id=shapeAtLocation(d.shapes,{lng,lat})?.properties.id;return d.units.find(u=>u.id===id);}
for(const [country,periods]of [['brazil',brazilPeriods],['mexico',mexicoPeriods]]){
 const meta=await decodeData(fs.readFileSync(root+country+'/history/borders.bin'));assert.deepEqual(Object.keys(meta.years).map(Number),periods.map(p=>p[0]));
 for(const [year]of periods){const d=await dated(country,year),ids=new Set(d.units.map(u=>u.id));assert.equal(ids.size,d.units.length);assert(d.regions.features.length>0);assert.equal(meta.configs[meta.years[year].config].units.length,d.units.length);for(const u of d.units){assert(u.name&&u.type&&u.note);assert(u.label.every(Number.isFinite));assert(u.bounds.flat().every(Number.isFinite));assert.equal(shapeAtLocation(d.shapes,{lng:u.label[0],lat:u.label[1]})?.properties.id,u.id,'Interior label '+country+' '+year+' '+u.name);}for(const edge of d.edges.features){assert(ids.has(edge.properties.a));if(edge.properties.b)assert(ids.has(edge.properties.b));}}
}
for(const y of [1820,1822,1824,1843,1847]){assert.match((await at('mexico',y,[-118.24,34.05])).name,/California/);assert.equal((await at('mexico',y,[-105.94,35.69])).name,'Nuevo México');assert.match((await at('mexico',y,[-97.74,30.27])).name,/Texas/);assert.match((await at('mexico',y,[-110.97,32.22])).name,/Sonora|Occidente/);}
assert.equal((await at('mexico',1843,[-97.74,30.27])).type,'Disputed claim');
assert.equal((await at('mexico',1822,[-90.51,14.63])).name,'Guatemala');assert.equal(await at('mexico',1824,[-90.51,14.63]),undefined);
assert(await at('mexico',1853,[-110.97,32.22]),'Tucson remains Mexican before the Gadsden transfer');assert.equal(await at('mexico',1857,[-110.97,32.22]),undefined);assert.equal(await at('mexico',1853,[-118.24,34.05]),undefined);
assert.equal((await dated('mexico',1865)).units.length,50);assert.equal((await at('mexico',1865,[-99.13,19.43])).name,'Valle de México');assert.equal((await at('mexico',1857,[-100.31,25.69])).name,'Nuevo León y Coahuila');assert.equal((await at('mexico',1870,[-100.31,25.69])).name,'Nuevo León');
// Near the old sketch's edge, these points used to belong to the department on the wrong end of a strip.
for(const [point,department] of [[[-99.4,26.988],"Nuevo León"],[[-104.478,29.622],"Huejuquilla"],[[-109.84,31.332],"Sonora"],[[-107.404,24.49],"Mazatlán"],[[-104.3,19.072],"Colima"]])assert.equal((await at('mexico',1865,point))?.name,department,'1865 frontier ownership at '+point);
// The 1865 decree puts Campeche and Villa del Carmen in separate Gulf-facing departments.
for (const [point, department] of [
 [[-90.532,19.846], 'Campeche'],   // Port of Campeche
 [[-90.720,19.350], 'Campeche'],   // Champotón
 [[-91.816,18.651], 'La Laguna'],  // Villa del Carmen
 [[-92.648,18.533], 'Tabasco'],    // Frontera
 [[-89.624,20.967], 'Yucatán'],    // Mérida
 [[-86.920,20.410], 'Yucatán']     // Cozumel
]) assert.equal((await at('mexico',1865,point))?.name, department, '1865 Gulf coast at '+point);
const modern=(await decodeData(fs.readFileSync(root+'mexico/first.bin'))).regions;const area=regions=>regions.features.reduce((s,p)=>s+geographicAreaKm2(p.geometry),0);assert(Math.abs(area((await dated('mexico',1865)).regions)/area(modern)-1)<.002,'1865 retains the modern land outline without major gaps or overlaps');
assert.equal((await at('brazil',1808,[-60.02,-3.1])).name,'Pará');assert.equal((await at('brazil',1872,[-60.02,-3.1])).name,'Amazonas');assert.equal((await at('brazil',1822,[-49.27,-25.43])).name,'São Paulo');assert.equal((await at('brazil',1872,[-49.27,-25.43])).name,'Paraná');
assert.equal((await at('brazil',1822,[-56.16,-34.9])).name,'Cisplatina');assert.equal(await at('brazil',1835,[-56.16,-34.9]),undefined);assert.equal(await at('brazil',1900,[-67.81,-9.97]),undefined);assert.match((await at('brazil',1933,[-67.81,-9.97])).name,/Acre/);
assert.equal((await at('brazil',1872,[-48.33,-10.18])).name,'Goyaz');assert.equal((await at('brazil',1991,[-48.33,-10.18])).name,'Tocantins');assert.equal((await at('brazil',1960,[-43.2,-22.9])).name,'Guanabara');assert.equal((await at('brazil',1991,[-43.2,-22.9])).name,'Rio de Janeiro');
const br=await decodeData(fs.readFileSync(root+'brazil/history/borders.bin'));for(const [year]of brazilPeriods){const c=br.configs[br.years[year].config];if([1872,1900,1933,1940,1960,1980,1991].includes(year)){assert(c.detail);const data=await decodeData(fs.readFileSync(root+'brazil/'+c.detail));assert(data.boundaries.features.length>0);}else assert(!c.detail,'No anachronistic municipal network in reconstructed frames');}
for(const item of JSON.parse(fs.readFileSync('scripts/boundary-sources/american-history/manifest.json'))){const bytes=fs.readFileSync('scripts/boundary-sources/american-history/'+item.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,'Retained source '+item.file);}
console.log('Brazil and Mexico: 25 dated frames, regime boundary probes, 50 imperial departments, land coverage, municipal detail dates and retained-source hashes passed.');
