import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist'),retrieved='2026-10-13';
const raw=resolve(root,'scripts/statistics-sources/botswana-namibia');
const bw=JSON.parse(await readFile(resolve(raw,'botswana-census-2022.json'),'utf8'));
const na=JSON.parse(await readFile(resolve(raw,'namibia-census-2023.json'),'utf8'));
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/city|region|district|constituency|census/g,'').replace(/[^a-z0-9]/g,'');
const alias={kharas:'karas',eengodi:'eengondi',omuthiya:'omuthiyagwiipundi',aminuis:'aminius',okarukambe:'okorukambe',orangemund:'oranjemund',selibephikwe:'selebiphikwe',southern:'ngwaketse',centralkalaharigamereserve:'centralkgalagadigamereserve',centralserowepalapye:'serowepalapye',centralmahalapye:'mahalapye',centralbobonong:'bobonong',centralboteti:'boteti',centraltutume:'tutume'};
const norm=s=>alias[normalize(s)]||normalize(s);
const source=(title,url,extra={})=>({title,url,...extra});
const counts={};
for(const country of ['botswana','namibia']){
 const folder=resolve(dist,'data/southern-africa',country);
 const catalogue=JSON.parse(gunzipSync(await readFile(resolve(folder,'catalogue.bin'))));
 const byId=new Map(catalogue.records.map(r=>[r.id,r]));
 const sources={mappedArea:source('Boundary-derived area','data/southern-africa/'+country+'/sources.json',{note:'Spherical area calculated from the displayed boundary polygon, not an independently surveyed land area.'})};
 const rows=new Map();
 if(country==='botswana'){
  sources.census=source('Statistics Botswana · Population & Housing Census 2022 · Population of Cities, Towns, Villages & Associated Localities',bw.url,{published:'2022-12',note:'Final revised population counts; supersedes the preliminary June and August 2022 tables. De facto population enumerated during the census.'});
  for(const r of bw.censusDistricts)rows.set(norm(r.name),r);
  for(const [name,codes] of Object.entries(bw.districts))rows.set('parent:'+norm(name),{name,population:bw.censusDistricts.filter(r=>codes.includes(r.code)).reduce((n,r)=>n+r.population,0),codes});
 }else{
  for(const [name,region] of Object.entries(na.regions)){
   const key=norm(name);
   sources[key]=source('Namibia Statistics Agency · 2023 Census · '+name.replaceAll('-',' ')+' region',region.url,{year:2023,table:'Population density by constituency',...(region.correctionSource?{correctionSource:region.correctionSource,note:'Oniipa population and Onayena area use final regional report Table 2.2, correcting typographical errors in the interactive table.'}:{})});
   rows.set('parent:'+key,{...region,source:key});
   for(const r of region.constituencies)rows.set(key+':'+norm(r.name),{...r,source:key});
  }
 }
 const regions={};let populationCount=0,reportedAreaCount=0;
 for(const r of catalogue.records){
  const key=country+':'+r.id;
  const record={name:r.en,level:r.level,area:{value:r.areaKm2,unit:'km²',method:'mapped',period:'Boundary-derived estimate',source:'mappedArea'}};
  assert.ok(record.area.value>0,key+' area');
  const parent=byId.get(r.parent);
  // A locality can share a name with its enclosing district. District population
  // must never be attached to the smaller locality polygon through name matching.
  const row=r.level>2?null:country==='botswana'?rows.get((r.level===1?'parent:':'')+norm(r.en)):rows.get(r.level===1?'parent:'+norm(r.en):norm(parent.en)+':'+norm(r.en));
  if(row){
   record.population={value:row.population,year:country==='botswana'?2022:2023,method:'census',source:country==='botswana'?'census':row.source,...(row.code?{sourceCode:row.code}:{})};
   if(country==='botswana'&&r.level===1){
    record.population.method='calculated';
    record.population.note='Sum of final 2022 census districts belonging to this geographical district, including enclosed separately administered towns and cities.';
    record.population.sourceCodes=row.codes;
   }
   if(country==='namibia'&&Number.isFinite(row.area)&&row.area>0){
    record.area={value:Math.round(row.area*100)/100,unit:'km²',year:2023,method:r.level===1?'calculated':'reported',source:row.source,...(r.level===1?{note:'Sum of the official census constituency areas for the region.'}:{})};
    reportedAreaCount++;
   }
   assert.ok(record.population.value>0,key+' population');populationCount++;
  }
  regions[key]=record;
 }
 assert.equal(populationCount,catalogue.records.filter(r=>r.level<=2).length,country+' census coverage must match every first/second-level subdivision');
 const top=catalogue.records.filter(r=>r.level===1);
 assert.equal(top.reduce((n,r)=>n+regions[country+':'+r.id].population.value,0),country==='botswana'?2359609:3022401,country+' district totals');
 for(const parent of top){
  const children=catalogue.records.filter(r=>r.parent===parent.id);
  if(children.length)assert.equal(children.reduce((n,r)=>n+regions[country+':'+r.id].population.value,0),regions[country+':'+parent.id].population.value,parent.id+' child populations');
 }
 const output={version:1,retrieved,country,sources,regions};
 await writeFile(resolve(folder,'statistics.json'),JSON.stringify(output,null,2)+'\n');
 const coverage={regions:catalogue.records.length,population:populationCount,reportedArea:reportedAreaCount,gdp:0};
 await writeFile(resolve(folder,'statistics-sources.json'),JSON.stringify({retrieved,sources,coverage,note:'Subnational GDP has not been verified; national GDP is not allocated to subdivisions.'},null,2)+'\n');
 counts[country]=coverage;
}
console.log(JSON.stringify(counts,null,2));
