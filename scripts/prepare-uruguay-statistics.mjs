import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const raw=JSON.parse(fs.readFileSync('scripts/statistics-sources/uruguay/department-tables.json'));
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/uruguay-first.bin'))).records;
const sources={
 'ine-population-area':{title:'INE Statistical Yearbook 2025, table 1.1.4 · 2024 population, revision 2025 · SGM land area',url:raw.populationAreaURL},
 'uruguayxxi-exports':{title:'Uruguay XXI · Goods exports by department, 2025 · PDF page 7 (printed page 5)',url:raw.exportsURL,downloadURL:raw.exportsDownloadURL}
};
const regions={};
for(const r of records){const v=raw.values[r.id];assert(v);assert.equal(v.name,r.en);regions['uruguay:'+r.id]={name:r.en,country:'UY',level:1,
 population:{value:v.population,year:2024,periodLabel:'2024 estimate · 2025 revision',method:'estimate',source:'ine-population-area',note:'INE population estimates and projections, 2025 revision, as reproduced in Statistical Yearbook 2025, table 1.1.4. Published department figures sum one person above the printed national total; retained as published.'},
 area:{value:v.area,year:2025,period:'2025 yearbook',unit:'km²',label:'Land area',method:'reported',source:'ine-population-area',note:'Terrestrial area from Servicio Geográfico Militar, published in INE Statistical Yearbook 2025; excludes water and is not calculated from the displayed geometry. The displayed date identifies the yearbook, not a dated boundary survey.'},
 exports:{value:v.exports*1e6,year:2025,currency:'USD',label:'Goods exports',status:'estimate',method:'estimated',source:'uruguayxxi-exports',note:'Uruguay XXI territorial estimate of goods exports, rounded to millions of current US dollars. Uses Customs data and sector-specific allocation by production and final transformation. Includes relevant free-zone production; excludes services. Exports are not GDP. Published departmental values sum to USD 13,484 million, compared with the printed national total of USD 13,494 million; individual values are retained as published.'},
 note:'Population: 2024 estimate (2025 revision). Land area: INE/SGM 2025 yearbook. Economy: goods exports in 2025, already reported in USD. A recent comparable departmental GDP series has not been verified; export figures are a separate economic measure. Municipality selections do not inherit department totals.'
 };}
assert.equal(Object.keys(regions).length,19);
fs.writeFileSync('dist/data/south-america/uruguay-statistics.json',JSON.stringify({version:1,retrieved:'2026-10-08',country:'uruguay',sources,regions}));
console.log('Uruguay: population, land area and explicitly labeled goods exports for all 19 departments.');
