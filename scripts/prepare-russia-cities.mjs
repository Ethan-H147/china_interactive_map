import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const raw=JSON.parse(fs.readFileSync('scripts/statistics-sources/russia/cities.json'));
const evidence=gunzipSync(fs.readFileSync('scripts/statistics-sources/russia/city-population.html.gz'));
assert.equal(createHash('sha256').update(evidence).digest('hex'),raw.sourceSha256);
const base='dist/data/russia/',catalogue=JSON.parse(gunzipSync(fs.readFileSync(base+'catalogue.bin')));
const records=new Map(catalogue.records.map(r=>[r.id,r]));
const stats=JSON.parse(fs.readFileSync(base+'statistics.json'));
// Regeneration replaces city cards while retaining the independent regional series.
for(const [key,record] of Object.entries(stats.regions))if(record.level===2)delete stats.regions[key];
stats.sources.cityPopulation={title:'2021 census city populations · Wikipedia reference table',url:raw.source,retrieved:raw.retrieved};
const flags={},ids=[];
for(const city of raw.cities){
 const record=records.get(city.id);assert(record?.level===2&&record.parent===city.parent);
 assert(!record.local.includes('район'),'City cards cannot match the surrounding raion');
 assert(Number.isInteger(city.population)&&city.population>0);
 assert(!ids.includes(city.id),'One city per boundary record');ids.push(city.id);
 stats.regions['russia:'+city.id]={name:city.en,country:'RU',level:2,
  population:{value:city.population,year:raw.year,method:'census',source:'cityPopulation',scopeNote:'City proper',note:'Population within the city limits, as reported in the 2021 census reference table. The mapped urban okrug can also include other settlements; this is not its total population.'}};
 if(city.flag){const bytes=fs.readFileSync('dist/'+city.flag.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),city.flag.sha256);flags[city.id]=city.flag;}
}
fs.writeFileSync(base+'statistics.json',JSON.stringify(stats));
fs.writeFileSync('dist/russia-cities.mjs','export const russiaCityIds=new Set('+JSON.stringify(ids)+');\nexport const russiaCityFlags='+JSON.stringify(flags)+';\n');
const sources=JSON.parse(fs.readFileSync(base+'sources.json'));
sources.cityPopulation={source:raw.source,retrieved:raw.retrieved,year:raw.year,scope:raw.scope,count:ids.length,evidenceSha256:raw.sourceSha256};
sources.cityFlags=flags;
fs.writeFileSync(base+'sources.json',JSON.stringify(sources,null,2));
console.log(`Russia: ${ids.length} city population cards and ${Object.keys(flags).length} sourced city flags.`);
