import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {hashFor,fromHash} from '../dist/view-state.mjs';
import {nationalFlagImages} from '../dist/national-flags.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),counts={'south-africa':266,eswatini:63,lesotho:86};
for(const [country,count] of Object.entries(counts)){
 const base='dist/data/southern-africa/'+country+'/',catalogue=JSON.parse(gunzipSync(fs.readFileSync(base+'catalogue.bin'))),data=read(base+'statistics.json');
 assert.equal(Object.keys(data.regions).length,count);
 for(const r of catalogue.records){const entry=data.regions[country+':'+r.id];assert(entry,'Every selectable division has an area card');assert.equal(entry.name,r.en);assert.equal(entry.level,r.level);assert(entry.area.value>0);if(entry.area.method==='mapped')assert.equal(entry.area.value,r.areaKm2,'Mapped areas follow the final geometry');for(const metric of Object.values(entry))if(metric?.source)assert(data.sources[metric.source]?.url,'Every metric has a source');
  if(country==='south-africa'){assert(entry.population.value>0);assert.equal(entry.population.year,r.level===1?2026:2022);if(r.level===1){assert.equal(entry.gdp.year,2024);assert.equal(entry.gdp.currency,'ZAR');assert.equal(entry.gdp.usd,entry.gdp.value/entry.gdp.exchangeRate);assert.equal(entry.gdpPerCapita.value,entry.gdp.value/entry.gdpPerCapita.populationValue);assert.equal(entry.gdpPerCapita.populationYear,2024,'GDP per capita retains its matching-year denominator');}}
  else{assert(!entry.gdp&&!entry.gdpPerCapita,'Do not replace regional GDP with national GDP');assert.equal(Boolean(entry.population),r.level===1,'Undated small-area counts are omitted');}
 }
}
const flags=read('dist/data/southern-africa/flag-sources.json');
for(const [id,f] of Object.entries(flags.flags)){const bytes=fs.readFileSync('dist/'+f.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,'Artwork retains its exact original SVG');assert(f.width>0&&f.height>0&&f.page&&f.credit&&f.license);if(counts[id])assert.equal(nationalFlagImages[f.file].full,f.file,'Enlarged national flags use the full original');}
assert.equal(Object.keys(flags.flags).length,5,'Three national flags and the two verified adopted subnational flags');
const deep={v:1,country:'south-africa',center:[30.9,-25.5],zoom:8,selection:'ZA-M-city-of-mbombela',mode:3,language:'en',colorBy:'populationDensity',layers:{'za-third-layer':true}};
assert.equal(fromHash(hashFor(deep)).mode,3,'Third-level map views retain their selection level');
console.log('Southern Africa statistics: every area, dated population, matching-year per-capita and USD calculations, missing regional GDP, full-original flags and deep shared views passed.');
