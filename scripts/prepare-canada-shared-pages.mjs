import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {load,write,csv} from './us-geography.mjs';
const expected=['2425','2436','2443','2465','2474','2481','2486','3506','3513','3516','3520','3525'];
export function prepareCanadaSharedPages(root='dist/data/europe/canada/'){
 const sourceRoot='scripts/boundary-sources/canada-shared-pages/',pin=load(sourceRoot+'source.json'),bytes=gunzipSync(fs.readFileSync(sourceRoot+'sgc-2021.csv.gz'));
 if(createHash('sha256').update(bytes).digest('hex')!==pin.sha256)throw Error('Canadian classification source changed');
 const sgc=csv(bytes.toString()),cat=load(root+'catalogue.bin'),stats=load(root+'statistics.json'),pages=[];
 for(const division of cat.records.filter(r=>r.level===2)){
  const units=cat.records.filter(r=>r.parent===division.id),official=sgc.filter(r=>r.Level==='4'&&r.Code.startsWith(division.code));
  if(units.length!==1||!units[0].municipality)continue;const city=units[0];
  if(official.length!==1||official[0].Code!==city.code||city.province!==division.parent||city.areaKm2!==division.areaKm2||city.bounds.flat().some((v,i)=>v!==division.bounds.flat()[i]))throw Error('Non-identical Canadian city/division '+division.id);
  const a=stats.regions['canada:'+division.id],b=stats.regions['canada:'+city.id];if(a.population.value!==b.population.value)throw Error('Different population scopes '+division.id);
  pages.push({id:division.id,municipality:city.id,name:city.en,local:city.local,parent:division.parent,type:'city-census-division',kind:'City and census division',note:'This city and census division cover the same area and share one page.',source:'classification',landAreaKm2:city.areaKm2});
 }
 if(JSON.stringify(pages.map(r=>r.id.slice(6)).sort())!==JSON.stringify(expected))throw Error('Canadian shared-page review changed');
 const exclusions=[{division:'CA-CD-2466',municipality:'CA-CSD-2466023',reason:'Montréal census division contains 16 municipalities; it is not the City of Montréal.'},{division:'CA-CD-3553',municipality:'CA-CSD-3553005',separateUnit:'CA-CSD-3553040',reason:'Greater Sudbury census division includes the city and Wahnapitei 11. They have different population and geographic coverage.'},{division:'CA-CD-3536',municipality:'CA-CSD-3536020',separateUnit:'CA-CSD-3536029',reason:'Chatham-Kent census division includes the municipality and Moravian 47.'}];
 for(const [id,note]of [['CA-CSD-3553005','2021 city boundary; excludes Wahnapitei 11'],['CA-CD-3553','2021 census division boundary; includes Wahnapitei 11']])stats.regions['canada:'+id].population.coverageNote=note;
 write(root+'statistics.json',stats);
 const result={vintage:2021,populationDate:'2025-07-01',policy:'Share a page only when the official classification contains exactly one municipal census subdivision and the retained land areas, extents and population totals match. Statistical divisions containing reserves or other municipalities remain separate. Geometry identifiers and published statistics are retained.',sources:{classification:{title:'Statistics Canada, Standard Geographical Classification 2021',url:'https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/index',structure:pin.url,retained:sourceRoot+'sgc-2021.csv.gz',sha256:pin.sha256}},pages,exclusions};
 fs.writeFileSync(root+'shared-place-pages.json',JSON.stringify(result,null,2)+'\n');console.log('Shared Canadian pages:',pages.length,'—',pages.map(p=>p.name).join(', '));return result;
}
if(process.argv[1]?.endsWith('prepare-canada-shared-pages.mjs'))prepareCanadaSharedPages();
