import {russiaMunicipalLabels} from './russia-municipal-labels.mjs';
import {russiaCityNames} from './russia-city-names.mjs';
// Display city names without changing the sourced administrative records.
function retainedRussiaPlaceNames(record){
 const original={en:record.en,local:record.local,kind:record.kind};
 if(record.level!==2)return original;
 const en=record.en.replace(/^Urban (?:District|Okrug) (?:of )?/i,'').replace(/ (?:Urban (?:District|Okrug)|City District)$/i,'');
 const explicit=en!==record.en;
 const local=(record.local||'').replace(/^городской округ\s+(?:город\s+)?/i,'').replace(/^[«"]|[»"]$/g,'');
 const nativeCity=!!record.local&&local!==record.local&&!/\b(?:District|Raion|Rayon)\b/i.test(en);
 const city=russiaCityNames[record.id];
 if(!explicit&&!nativeCity&&!city)return original;
 const shortLocal=local.replace(/\s+городской округ$/i,'');
 return {en:city?.en||en,local:city?.local||shortLocal,kind:city?.kind||'Urban okrug',administrativeEn:city?.administrativeEn||en+' Urban Okrug',administrativeLocal:city?.administrativeLocal||(city||shortLocal!==record.local?record.local:undefined),...(city?.pronunciation===false?{pronunciation:false}:{})};
}

export function russiaNameAliases(record){const display=russiaPlaceNames(record);return [display.en,display.local,display.administrativeEn,display.administrativeLocal].filter(Boolean);}

// Explicit reviewed labels never change the retained catalogue or boundaries.
export function russiaPlaceNames(record){
 return record.level===2&&russiaMunicipalLabels[record.id] ? {...russiaMunicipalLabels[record.id]} : retainedRussiaPlaceNames(record);
}
