// Display city names without changing the sourced administrative records.
export function russiaPlaceNames(record){
 const original={en:record.en,local:record.local,kind:record.kind};
 if(record.level!==2)return original;
 const en=record.en.replace(/^Urban (?:District|Okrug) (?:of )?/i,'').replace(/ (?:Urban (?:District|Okrug)|City District)$/i,'');
 const explicit=en!==record.en;
 const local=(record.local||'').replace(/^городской округ\s+(?:город\s+)?/i,'').replace(/^[«"]|[»"]$/g,'');
 const nativeCity=!!record.local&&local!==record.local&&!/\b(?:District|Raion|Rayon)\b/i.test(en);
 if(!explicit&&!nativeCity)return original;
 return {en,local,kind:'Urban okrug',administrativeEn:en+' Urban Okrug',administrativeLocal:local!==record.local?record.local:undefined};
}
