import {loadCompressed} from './korea-data.mjs';
let pending;
export function loadJapanLocalFacts(){
 if(!pending)pending=loadCompressed('data/japan-local-facts.bin').catch(error=>{pending=null;throw error;});
 return pending;
}
export function japanPopulation(facts,id,kind){
 const value=facts.records[id]?.population;
 return value==null?null:{total:value,dateLabel:facts.source.dateLabel,sourceUrl:facts.source.url,measure:kind==='City ward'?'Residents of this city ward':'Entire administrative region · 2025 census boundaries'};
}
export function japanLocalStatistics(facts,id){
 const value=facts.records[id]?.area;
 return {regions:{['japan:'+id]:{area:value==null?null:{value,unit:'km²',year:2025,source:'japan-census',method:'reported',note:'Reference area reported in the 2025 census.'}}},sources:{'japan-census':facts.source}};
}
