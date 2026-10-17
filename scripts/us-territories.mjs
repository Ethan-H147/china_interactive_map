import fs from 'node:fs';
import assert from 'node:assert/strict';
import {coastLand} from './europe-overseas.mjs';
export const usTerritorySpec=JSON.parse(fs.readFileSync(new URL('./us-territories.json',import.meta.url)));
export const usTerritoryCoverage='50 states, Washington, DC, all five inhabited US territories and the nine Minor Outlying Islands, each at first level. Excludes military bases on foreign soil and the independent freely associated states. Island Areas population is the 2020 census; no permanent-resident count or GDP is invented for the Minor Outlying Islands. Five territories use Census 2025 land outlines; the minor islands use the same directed OpenStreetMap land-coastline method as the UK and French territories.';
export const territoryFiles=['us-states-2025.zip','us-minor-islands-coastline.json'];
export function usTerritories(census,coast){
 assert(coast.elements?.length&&!coast.remark,'The minor-island coastline snapshot must be complete');
 const assigned=new Set(),units=new Map(),features=[];
 for(const t of usTerritorySpec.territories){
  let geometry,reportedArea;
  if(t.iso){
   const f=census.features.find(f=>f.properties.STUSPS===t.code);assert(f,t.name+' Census geometry');
   geometry=structuredClone(f.geometry);reportedArea=f.properties.ALAND/1e6;
  }else{
   const ways=coast.elements.filter(way=>{if(way.type!=='way')return false;const p=way.geometry[0],b=t.box,inside=p.lon>=b[0]&&p.lon<=b[2]&&p.lat>=b[1]&&p.lat<=b[3];if(inside){assert(!assigned.has(way.id),'Each coastline way belongs to one territory');assigned.add(way.id);}return inside;});
   const parts=coastLand(ways,t.name);assert(parts.length,t.name+' must have closed land coastlines');geometry={type:'MultiPolygon',coordinates:parts};
  }
  const population=t.population?{value:t.population,year:2020,date:'2020-04-01',method:'census',source:t.code==='PR'?'puertoRicoCensus':'islandAreasCensus'}:undefined;
  units.set(t.id,{id:t.id,parent:null,level:1,en:t.name,local:t.local||t.name,kind:'Territory',code:t.code,overseas:true,...(t.code==='VI'?{aliases:['United States Virgin Islands','US Virgin Islands']}:{}),...(t.code==='MP'?{aliases:['CNMI','Commonwealth of the Northern Mariana Islands']}:{}),...(population?{population}:{populationStatus:'no-permanent-population'}),...(reportedArea?{reportedArea}:{}),note:t.note||''});
  features.push({type:'Feature',properties:{id:t.id},geometry});
 }
 assert.equal(assigned.size,coast.elements.filter(e=>e.type==='way').length,'Every Minor Outlying Islands coastline way is assigned');
 return {units,features};
}
export const territoryStatisticsSources={
 islandAreasCensus:{title:'US Census Bureau · 2020 Island Areas Censuses',url:usTerritorySpec.populationUrl,license:'Public domain'},
 puertoRicoCensus:{title:'US Census Bureau · Puerto Rico, 1 April 2020 census',url:usTerritorySpec.puertoRicoPopulationUrl,license:'Public domain'}
};
export function territoryStat(record,population){
 return {name:record.en,level:1,parent:null,...(population?{population}:{}),area:{value:record.areaKm2,unit:'km²',year:record.id.startsWith('US-UM-')?2026:2025,method:record.id.startsWith('US-UM-')?'mapped':'reported',source:record.id.startsWith('US-UM-')?'mappedArea':'boundaryArea',label:record.id.startsWith('US-UM-')?'Mapped land area':'Land area'},note:[record.note,record.populationStatus?'No permanent population; temporary staff and military personnel are not treated as a resident census.':'Population is the 1 April 2020 census.', 'Mapped as a US territory.'].filter(Boolean).join(' ')};
}
