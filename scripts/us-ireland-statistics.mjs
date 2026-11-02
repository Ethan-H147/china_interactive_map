import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
const root='scripts/statistics-sources/us-ireland/';
let retained;
export function usIrelandSnapshot(){
 if(!retained){const manifest=JSON.parse(fs.readFileSync(root+'manifest.json')),bytes=gunzipSync(fs.readFileSync(manifest.normalized.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.normalized.sha256,'Verified US/Ireland statistics snapshot');retained=JSON.parse(bytes);}
 return retained;
}
export function applyUSLocalPopulation(stats,records){
 const snapshot=usIrelandSnapshot().us;
 stats.sources.usMunicipalPopulation={title:'US Census Bureau · Vintage 2025 municipal resident population estimates',url:'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv',license:'Public domain'};
 stats.sources.usMunicipalBoundaries={title:'US Census Bureau · 2025 place and county subdivision cartographic boundaries',url:'https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html',license:'Public domain'};
 stats.sources.usLocalCensus2020={title:'US Census Bureau · 2020 Census population, TIGERweb Census2020 whole places and county subdivisions (POP100)',url:'https://tigerweb.geo.census.gov/arcgis/rest/services/Census2020/tigerWMS_Census2020/MapServer',license:'Public domain'};
 let count=0;
 for(const r of records){const p=snapshot.population[r.id];if(r.level!==3||!p)continue;
  const key='united-states:'+r.id,record=stats.regions[key]??={name:r.en,level:3,parent:r.parent,area:{value:r.areaKm2,unit:'km²',year:2025,method:'reported',source:'usMunicipalBoundaries',label:'Land area'}};
  record.population=p.year===2025?{value:p.value,year:2025,date:'2025-07-01',method:'estimate',periodLabel:'1 July 2025 estimate',source:'usMunicipalPopulation'}:{value:p.value,year:2020,date:'2020-04-01',method:'census',source:'usLocalCensus2020',infoNotes:true,areaComparable:false,scopeNote:'2020 census count. The map uses 2025 boundaries, which may differ from the census geography.'};count++;
 }
 assert.equal(count,Object.keys(snapshot.population).length,'Every retained local population has its exact mapped ID');
 stats.localPopulationCoverage={...snapshot.counts,missing:snapshot.missingLocal.length,scope:'Whole mapped local units; overlapping governments and census areas must not be added together.'};return count;
}
export function applyUSCountyGDP(stats,records){
 const snapshot=usIrelandSnapshot().us;
 stats.sources.beaCountyGDP={title:'US Bureau of Economic Analysis · 2024 current-dollar GDP by county, CAGDP1 line 3 (February 2026 release)',url:'https://www.bea.gov/data/gdp/gdp-by-county',data:'https://apps.bea.gov/regional/zip/CAGDP1.zip',license:'Public domain'};
 stats.sources.usCountyPopulation2024={title:'US Census Bureau · 1 July 2024 county population, Vintage 2025',url:'https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/totals/co-est2025-alldata.csv',license:'Public domain'};
 let count=0;
 for(const r of records){if(r.level!==2||!r.id.startsWith('US-COUNTY-'))continue;const entry=stats.regions['united-states:'+r.id];assert(entry,'Existing county statistics '+r.id);const g=snapshot.gdp[r.id];
  if(!g){if(['US-VA','US-HI'].includes(r.parent))entry.note='BEA publishes this area’s 2024 GDP only within a combined county/city area. A separate GDP total is not assigned to this county.';continue;}
  entry.gdp={value:g.value,usd:g.value,currency:'USD',year:g.year,priceBasis:'current',source:'beaCountyGDP'};
  entry.gdpPerCapita={value:g.value/g.population,usd:g.value/g.population,currency:'USD',year:g.year,priceBasis:'current',source:'beaCountyGDP',method:'calculated',populationSource:'usCountyPopulation2024',note:'Calculated from 2024 current-dollar GDP and the Census 1 July 2024 county population (Vintage 2025).'};count++;
 }
 assert.equal(count,Object.keys(snapshot.gdp).length,'Every retained county GDP has its exact mapped ID');return count;
}
export function applyIrishDistrictPopulation(stats,records){
 const snapshot=usIrelandSnapshot().ireland;stats.sources.irishMunicipalCensus2022={title:'Central Statistics Office · FY108, Census 2022 population on statutory 2019 electoral boundaries, aggregated to whole municipal districts',url:'https://data.cso.ie/table/FY108',data:'https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/FY108/JSON-stat/2.0/en',license:'CC BY 4.0'};
 let count=0;
 for(const r of records){if(r.level!==3)continue;const p=snapshot.population[r.id],entry=stats.regions['ireland:'+r.id];assert(p&&entry,'Verified Irish district '+r.id);assert.equal(r.parent,p.parent,'Same local-authority parent '+r.id);
  entry.population={value:p.value,year:2022,date:'2022-04-03',method:'census',periodLabel:'2022 census',source:'irishMunicipalCensus2022',infoNotes:true,scopeNote:'Sum of whole statutory local electoral areas from CSO FY108. No population is apportioned by land area.',...(p.boundaryNote?{coverageNote:p.boundaryNote,areaComparable:false}:{})};count++;
 }
 assert.equal(count,100);return count;
}
export async function prepareUSIrelandStatistics(){
 const {load,write}=await import('./us-geography.mjs'),counts={};
 for(const country of ['united-states','ireland']){const base='dist/data/europe/'+country+'/',stats=load(base+'statistics.json'),records=load(base+'catalogue.bin').records;
  if(country==='united-states'){counts.usLocal=applyUSLocalPopulation(stats,records);counts.usCountyGDP=applyUSCountyGDP(stats,records);const facts=load(base+'municipalities/facts.json');facts.populationIds=Object.keys(usIrelandSnapshot().us.population).sort();write(base+'municipalities/facts.json',facts);}else counts.irishDistricts=applyIrishDistrictPopulation(stats,records);
  write(base+'statistics.json',stats);
 }
 console.log('Prepared US and Ireland statistics',counts);return counts;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){await prepareUSIrelandStatistics();(await import('./prepare-region-colors.mjs')).prepareRegionColors(['united-states','ireland']);}
