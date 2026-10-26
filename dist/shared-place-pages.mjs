// Geographic records keep their layer IDs; a shared page owns the public identity.
export function applySharedPlacePages(records,definitions){
 const byId=new Map(records.map(r=>[r.id,r]));
 for(const page of definitions.pages){
  const county=byId.get(page.id),city=byId.get(page.municipality);
  if(!county||!city||county.parent!==city.parent||county.level!==2||city.level!==3)throw Error('Invalid shared place: '+page.id);
  const aliases=[...new Set([county.en,city.en,county.code,city.code,...county.aliases||[],...city.aliases||[]])].sort();
  const shared={en:page.name,local:page.name,kind:page.kind,sharedPageId:page.id,sharedGeometryIds:{2:county.id,3:city.id}};
  Object.assign(county,shared,{aliases,statusNote:page.note,statusSource:definitions.sources[page.source].url,statusSourceLabel:' Source',...(city.flag?{flag:city.flag}:{})});
  Object.assign(city,shared);
 }
 const independentNames=new Set(definitions.pages.filter(p=>p.type==='independent-city').map(p=>p.parent+'|'+p.name));
 for(const record of records){
  if(record.level!==2||!record.id.startsWith('US-COUNTY-')||!/(?: County| Parish| Borough| Census Area)$/.test(record.en))continue;
  const name=record.en.replace(/ (?:County|Parish|(?:City and )?Borough|Census Area)$/,'');
  record.shortMapLabel=independentNames.has(record.parent+'|'+name)?record.en:name;
 }
}
export const sharedPlacePage=(record,index)=>record?.sharedPageId?index.get(record.sharedPageId)||record:record;
export const sharedPlaceGeometry=(record,level,index)=>record?.sharedGeometryIds?index.get(record.sharedGeometryIds[level])||null:record;
export const uniquePlacePages=records=>records.filter(r=>!r.sharedPageId||r.sharedPageId===r.id);
