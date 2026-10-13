// Settlements are points, independent of a country's administrative hierarchy.
export const nameKey=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function settlementStatistics(record,key){
 const metrics={},sources={};
 for(const type of ['population','area']){
  const metric=record[type];if(!metric)continue;
  metrics[type]=metric;
  if(metric.source)sources[metric.source]={title:record.provenance?.[type]||`${metric.year||''} census settlement ${type}`.trim(),url:metric.source};
 }
 return {regions:{[key]:metrics},sources};
}
export function enrichPlaces(records,supplement={}){
 const entries=new Map(Object.entries(supplement.places||{}));
 for(const entry of Object.values(supplement.places||{}))for(const alias of entry.aliases||[])if(!entries.has(nameKey(alias)))entries.set(nameKey(alias),entry);
 for(const record of records){const entry=[record.en,...(record.aliases||[])].map(nameKey).map(key=>entries.get(key)).find(Boolean);if(!entry)continue;const former=record.en;if(entry.renameSource&&entry.name)record.en=entry.name;record.names=entry.names;record.flag=entry.flag;record.aliases=[...new Set([former,...(record.aliases||[]),...(entry.aliases||[]),...Object.values(entry.names||{}).map(v=>typeof v==='string'?v:v.name)].filter(Boolean))];}
 return records;
}
export function placeLines(record,language='both'){
 const variants=Object.entries(record.names||{}).filter(([,value])=>value.type!=='historical language label').map(([code,value])=>[code,typeof value==='string'?value:value.name]).filter(([,name])=>name);
 if(language==='en')return [record.en];
 if(language!=='both')return [variants.find(([code])=>code===language)?.[1]||record.en];
 return [...new Set([record.en,...variants.filter(([,name])=>name!==record.en).slice(0,1).map(([,name])=>name)])];
}
// A tenfold population decrease needs 2.4 more zoom levels, without abrupt batches.
export function settlementZoom(record){const population=Math.max(1,record.population?.value||0);return Math.max(4,Math.min(9.5,5.8+2.4*Math.log10(100000/population)));}
export function visibleSettlements(records,zoom,bounds,selected){return records.filter(r=>(r.id===selected||zoom>=settlementZoom(r))&&r.center[0]>=bounds.getWest()&&r.center[0]<=bounds.getEast()&&r.center[1]>=bounds.getSouth()&&r.center[1]<=bounds.getNorth()).sort((a,b)=>(b.population?.value||0)-(a.population?.value||0));}
export function settlementFeatures(records){return {type:'FeatureCollection',features:records.map(r=>({type:'Feature',properties:{id:r.id,minzoom:settlementZoom(r)},geometry:{type:'Point',coordinates:r.center}}))};}
