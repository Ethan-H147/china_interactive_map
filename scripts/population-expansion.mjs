import fs from 'node:fs';
const snapshot=new URL('./statistics-sources/population-expansion/normalized.json',import.meta.url);
let retained;
export function populationExpansion(){return retained??=JSON.parse(fs.readFileSync(snapshot));}
// Overlay only reviewed local observations; keep existing area and economic data.
export function applyPopulationExpansion(country,data){
 const rows=populationExpansion().countries[country];if(!rows)return 0;
 for(const row of rows){
  const key=country+':'+row.id,record=data.regions[key]??={name:row.en,level:row.level,parent:row.parent};
  record.population={...row.population};
  if(record.note?.includes('No population observation verified against this exact boundary release is assigned.')){
   record.note=record.note.replace('No population observation verified against this exact boundary release is assigned.','').trim();if(!record.note)delete record.note;
  }
  const source=populationExpansion().sources[row.population.source];
  data.sources[row.population.source]={title:source.title,url:source.url,retrieved:'2026-11-02'};
 }
 return rows.length;
}
