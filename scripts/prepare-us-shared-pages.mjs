import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

export function prepareUSSharedPages(root='dist/data/europe/united-states/'){
 const catalogue=JSON.parse(gunzipSync(fs.readFileSync(root+'catalogue.bin'))),records=catalogue.records;
 const independent=records.filter(r=>r.kind==='Independent city'||r.id==='US-COUNTY-32510');
 assert.equal(independent.length,41);assert.equal(independent.filter(r=>r.parent==='US-VA').length,38);
 const audited=JSON.parse(fs.readFileSync(new URL('./us-consolidated-page-pairs.json',import.meta.url)));
 const counties=[...independent,records.find(r=>r.id==='US-COUNTY-06075'),...audited.map(p=>records.find(r=>r.id===p.county))];
 const pages=counties.map(county=>{
  const name=county.en.replace(/ (city|County)$/,''),pair=audited.find(p=>p.county===county.id),matches=pair?records.filter(r=>r.id===pair.municipality):records.filter(r=>r.sourceType==='place'&&r.incorporated&&r.parent===county.parent&&r.en===name);
  assert.equal(matches.length,1,'One municipal identity for '+county.id);const city=matches[0];
  assert(Math.abs(county.areaKm2-city.areaKm2)<1e-6,'Exact Census land-area match: '+county.id);
  assert(county.bounds.flat().every((v,i)=>Math.abs(v-city.bounds.flat()[i])<.001),'Matching extents: '+county.id);
  const consolidated=!independent.includes(county);assert.equal(county.parent,city.parent);
  return {id:county.id,municipality:city.id,name:city.en,parent:city.parent,type:consolidated?'consolidated-city-county':'independent-city',kind:consolidated?(county.parent==='US-AK'?'City and borough':county.parent==='US-LA'?'City and parish':county.id==='US-COUNTY-25019'?'Town and county':'City and county'):'Independent city',note:consolidated?'One government covers both jurisdictions.':'This city is independent of any county and also serves as a county equivalent.',source:county.id==='US-COUNTY-06075'?'sanFrancisco':consolidated?'governmentDescriptions':'census',landAreaKm2:county.areaKm2};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const data={vintage:2025,policy:'Independent cities and explicitly audited consolidated governments share pages only where their Census land areas and extents match. Full consolidated-city records may match where city balances do not. Component municipalities retain their own pages.',sources:{governmentDescriptions:{title:'US Census Bureau · Individual State Descriptions, 2022',url:'https://www.census.gov/content/dam/Census/library/publications/2024/econ/2022ISD.pdf'},census:{title:'US Census Bureau · Independent cities and county equivalents',url:'https://www.census.gov/programs-surveys/popest/about/faq.html'},sanFrancisco:{title:'City and County of San Francisco · Official statement, 2025',url:'https://media.api.sf.gov/documents/CCSFSeries2025ABCD24fos.pdf'},boundaries:{title:'US Census Bureau · 2025 cartographic boundary files',url:'https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html'}},pages};
 fs.writeFileSync(root+'shared-place-pages.json',JSON.stringify(data,null,2)+'\n');
 console.log('Shared US place pages: '+pages.length+'; county/municipal geometry and statistics retained.');
 return data;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)prepareUSSharedPages();
