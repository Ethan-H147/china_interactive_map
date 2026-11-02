import fs from 'node:fs';
import assert from 'node:assert/strict';
import {load} from './geo-index.mjs';
const root=new URL('../',import.meta.url),read=file=>load(new URL(file,root));
export function applyKoreaPopulation(data){
 const mois=read('scripts/statistics-sources/korea-population.json'),entities=read('scripts/statistics-sources/korea-entities.json'),metadata=read('dist/data/scoped/korea/metadata.bin');
 assert.equal(mois.rows.reduce((sum,row)=>sum+row.population,0),mois.national);
 data.sources['korea-mois-population']={title:mois.source.title,url:mois.source.url,retrieved:mois.source.retrieved};
 const districts=read('scripts/statistics-sources/korea-population-districts.json'),districtIndex=new Map(districts.rows.map(r=>[r.code,r]));
 data.sources['korea-mois-district-population']={title:districts.source.title,url:districts.source.url,retrieved:districts.source.retrieved};
 const counts={KR:0,KP:0,missing:[]};
 for(const f of [...metadata.first.features,...metadata.second.features]){
  const p=f.properties,key='korea:'+p.id,record=data.regions[key];assert(record,key);
  delete record.population;
  if(p.country==='KR'){
   const row=p.level===1?mois.rows.find(row=>row.name===p.ko):districtIndex.get(p.id.slice(3).padEnd(10,'0'));
   if(row&&p.level===2)assert(row.name.includes(p.ko),'District code/name mismatch '+p.id);
   if(row)record.population={value:row.population,year:2026,date:mois.source.date,method:'registration',periodLabel:'September 2026 resident registration',source:p.level===1?'korea-mois-population':'korea-mois-district-population',infoNotes:true,scopeNote:'Registered Korean nationals; excludes foreign residents.',coverageNote:'Includes registrations with unknown address and overseas registrations.'};
  }else{
   const q=entities.mapping[p.id],claims=entities.entities[q]?.claims?.P1082||[];
   // Keep one consistent census vintage. Never choose an undated or conflicting value.
   const candidates=claims.filter(c=>c.rank!=='deprecated'&&c.qualifiers?.P585?.[0]?.datavalue?.value?.time?.startsWith('+2008-')&&Number(c.mainsnak?.datavalue?.value?.amount)>0);
   const values=[...new Set(candidates.map(c=>Number(c.mainsnak.datavalue.value.amount)))];
   if(p.id==='KP-356443'){values.splice(0,values.length,3255288);}
   if(values.length===1){
    const source='korea-population-'+q;data.sources[source]={title:'Wikidata population statement · retained 2008 census figure',url:'https://www.wikidata.org/wiki/'+q+'#P1082',underlyingSource:'https://unstats.un.org/unsd/demographic/sources/census/wphc/North_Korea/Final%20national%20census%20report.pdf'};
    record.population={value:values[0],infoNotes:true,areaComparable:false,year:2008,method:'census',periodLabel:'2008 census (historical population)',source,scopeNote:'Population of the area reported in 2008; not a current estimate.',coverageNote:'Historical census boundaries may differ from the map and include areas now shown separately. These figures must not be added across levels or combined with current boundary areas. Census regional tables cover private households and institutional living quarters.'};
    if(p.id==='KP-356443')data.sources[source]={title:'DPR Korea 2008 census · Table 2, printed page 22',url:'https://unstats.un.org/unsd/demographic/sources/census/wphc/North_Korea/Final%20national%20census%20report.pdf'};
    if(['Nampo','Kaesong'].includes(p.en))record.population.coverageNote='The figure describes the 2008 city, not the expanded special-city boundary shown today. '+record.population.coverageNote;
   }
  }
  if(record.population)counts[p.country]++;else counts.missing.push(p.id);
 }
 data.coverage.korea.population=counts;return counts;
}
