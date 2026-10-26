export const londonId='GB-S-LONDON',londonRegion='GB-R-TLI',cityOfLondon='GB-C-E09000001';
const explanation='https://www.cityoflondon.gov.uk/about-us/about-the-city-of-london-corporation/our-role-in-london';
export function combineLondonSettlements(data,catalogue,statistics){
 const region=catalogue.records.find(r=>r.id===londonRegion),city=catalogue.records.find(r=>r.id===cityOfLondon);
 if(!region||!city)throw Error('London administrative records are required');
 const duplicates=data.records.filter(r=>r.provinceId===londonRegion&&r.id!==londonId),outside=data.records.filter(r=>r.provinceId!==londonRegion);
 const section=(id,title,description)=>{
  const stats=statistics.regions['united-kingdom:'+id];if(!stats?.population||!stats?.area)throw Error('London comparison figures are required');
  return {title,description,source:{title:'City of London Corporation · The two London areas',url:explanation},metrics:['population','area'].map(type=>({type,...stats[type],source:statistics.sources[stats[type].source]}))};
 };
 const greater=statistics.regions['united-kingdom:'+londonRegion],source=statistics.sources[greater.population.source];
 const london={id:londonId,en:'London',name:'London',kind:'City',center:city.center,parentId:londonRegion,provinceId:londonRegion,bounds:region.bounds,selectionMode:2,replacesLabel:londonRegion,aliases:['London overview','Greater London'],population:{...greater.population,source:source.url},area:{...greater.area,source:statistics.sources[greater.area.source].url},provenance:{population:source.title,coordinates:'City of London administrative interior point; the marker opens the whole Greater London extent.'},overview:{description:'The City of London is a small part of Greater London. These figures describe two different areas.',sections:[section(londonRegion,'Greater London','The London administrative region: 32 London boroughs plus the City of London.'),section(cityOfLondon,'City of London','The historic Square Mile within Greater London, with its own local government, the City of London Corporation.')]}};
 const policy=' Greater London uses one London marker; boroughs and the City of London remain administrative selections.';
 return {...data,records:[london,...outside].sort((a,b)=>(b.population?.value||0)-(a.population?.value||0)),selectionAliases:{...(data.selectionAliases||{}),...Object.fromEntries(duplicates.map(r=>[r.id,r.parentId]))},selection:data.selection.split(policy)[0]+policy};
}
