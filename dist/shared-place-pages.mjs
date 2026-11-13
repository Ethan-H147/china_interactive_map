// Geographic records keep their layer IDs; a shared page owns the public identity.
export function applySharedPlacePages(records,definitions){
 const byId=new Map(records.map(r=>[r.id,r]));
 for(const page of definitions.pages){
  const ids=page.members||[page.id,page.municipality],members=ids.map(id=>byId.get(id)),county=members[0],city=members.at(-1);
  if(ids[0]!==page.id||members.length<2||new Set(ids).size!==ids.length||members.some((r,i)=>!r||i>0&&(r.level!==members[i-1].level+1||!(r.parent===members[i-1].id||i===1&&members[i-1].parent!=null&&r.parent===members[i-1].parent))))throw Error('Invalid shared place: '+page.id);
  const aliases=[...new Set(members.flatMap(r=>[r.en,r.local,r.code,...r.aliases||[]]).filter(Boolean))].sort();
  const shared={en:page.name,local:page.local??page.name,kind:page.kind,sharedPageId:page.id,sharedGeometryIds:Object.fromEntries(members.map(r=>[r.level,r.id]))};
  for(const member of members)Object.assign(member,shared);
  Object.assign(county,{aliases,...(page.note?{statusNote:page.note,statusSource:definitions.sources[page.source].url,statusSourceLabel:' Source'}:{}),...(city.flag?{flag:city.flag}:{})});
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
