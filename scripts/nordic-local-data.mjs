import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readLocalSource,manifest} from './fetch-nordic-local.mjs';
const require=createRequire(import.meta.url),dependencies=createRequire(require.resolve('mapshaper')),{unzipSync}=dependencies('fflate'),{DOMParser}=dependencies('@xmldom/xmldom');
const json=name=>JSON.parse(readLocalSource(name).toString('utf8').replace(/^\uFEFF/,''));
const title=(name,locale)=>name.toLocaleLowerCase(locale).replace(/(^|[\s-])\p{L}/gu,s=>s.toLocaleUpperCase(locale));
export const localDefinitions={
 denmark:{label:'Parishes',year:2026,kind:'Parish',kindLocal:'Sogn',lang:'da',note:'Official DAGI parish. Parishes are ecclesiastical areas and may cross municipal boundaries. Navigation uses mapped land overlap, with the largest overlap as the primary municipality; all parish land parts are retained.'},
 norway:{label:'Statistical areas',year:2025,kind:'Statistical area',kindLocal:'Delområde',lang:'nb',note:'Named statistical subarea (delområde), dissolved from Kartverket basic statistical units. It has no separate municipal government. Geometry: December 2025; names: SSB 2026 classification.'},
 sweden:{label:'Statistical areas',year:2025,kind:'Statistical area',kindLocal:'RegSO',lang:'sv',note:'Named regional statistical area (RegSO 2025), within a municipality. This is a statistical division, not a separate local government.'},
 finland:{label:'Helsinki & Espoo districts',year:2026,kind:'City district',lang:'fi',note:'Official city district. Local coverage in this release is Helsinki and Espoo; other Finnish municipalities retain their existing municipality-level map.'},
 iceland:{label:'Reykjavík districts',year:2026,kind:'City district',kindLocal:'Borgarhluti',lang:'is',note:'Official Reykjavík city district. Other Icelandic municipalities retain their existing municipality-level map. Source: Reykjavík open geodata service; the city permits reuse with attribution and respect for moral rights.'}
};
function espoo(){
 const doc=new DOMParser().parseFromString(readLocalSource('espoo-districts.gml').toString('utf8'),'text/xml');
 const nodes=Array.from(doc.getElementsByTagNameNS('*','featureMember'));
 return nodes.map(node=>{
  const properties=Object.fromEntries(['KAUPUNGINOSANNUMERO','KAUPUNGINOSANNIMI_FI','KAUPUNGINOSANNIMI_SE'].map(key=>[key,node.getElementsByTagNameNS('*',key)[0]?.textContent]));
  const coordinates=Array.from(node.getElementsByTagNameNS('*','Polygon')).map(polygon=>{
   const ring=element=>element.getElementsByTagNameNS('*','coordinates')[0].textContent.trim().split(/\s+/).map(p=>p.split(',').slice(0,2).map(Number));
   return [ring(polygon.getElementsByTagNameNS('*','outerBoundaryIs')[0]),...Array.from(polygon.getElementsByTagNameNS('*','innerBoundaryIs')).map(ring)];
  });
  assert(coordinates.length,'Espoo polygon');return{type:'Feature',properties,geometry:{type:'MultiPolygon',coordinates}};
 });
}
export function localFeatures(country){
 const definition=localDefinitions[country];assert(definition,'Supported local area country');
 const units=new Map();
 const make=(feature,id,code,parent,name,names={},aliases=[])=>{
  assert(!units.has(id),'Unique official local identity '+id);
  units.set(id,{id,code,sourceId:code,level:3,parent,en:name,local:name,localLang:definition.lang,kind:definition.kind,...definition.kindLocal?{kindLocal:definition.kindLocal}:{},names,aliases:[...new Set([name,...Object.values(names),...aliases].filter(Boolean))],note:definition.note});
  return{type:'Feature',properties:{id},geometry:feature.geometry};
 };
 let features;
 if(country==='denmark'){
  features=Object.keys(manifest().files).filter(name=>name.startsWith('denmark-parishes-part-')).flatMap(name=>json(name).features).map(f=>{const p=f.properties,code=String(p.SogneKode);return make(f,'DK-S-'+code,code,null,p.Navn);});
 }else if(country==='norway'){
  const zip=unzipSync(readLocalSource('norway-grunnkretser.zip'),{filter:file=>/_Grunnkrets_GeoJSON\.geojson$/.test(file.name)});
  const bytes=Object.values(zip)[0];assert(bytes,'Retained grunnkrets geometry');
  const source=JSON.parse(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/,''));
  const names=new Map(json('norway-classification-2026.json').classificationItems.filter(r=>r.level==='1').map(r=>[r.code,r.name]));
  const groups=new Map();features=source.features.map(feature=>{
   const p=feature.properties,code=String(p.grunnkretsnummer).slice(0,6)+'00',id='NO-D-'+code,parent='NO-M-'+String(p.kommunenummer).padStart(4,'0');
   if(!groups.has(code)){assert(names.has(code),'Official delområde name '+code);make(feature,id,code,parent,names.get(code));groups.set(code,id);}
   assert.equal(units.get(id).parent,parent);return{type:'Feature',properties:{id},geometry:feature.geometry};
  });
 }else if(country==='sweden'){
  features=json('sweden-regso-2025.geojson').features.map(f=>make(f,'SE-R-'+f.properties.regsokod,String(f.properties.regsokod),'SE-M-'+f.properties.kommunkod,f.properties.regsonamn));
 }else if(country==='finland'){
  features=[
   ...json('helsinki-districts.geojson').features.map(f=>{const p=f.properties,fi=title(p.nimi_fi,'fi'),sv=title(p.nimi_se,'sv');assert.equal(p.kunta,'091');return make(f,'FI-HKI-'+p.tunnus,p.tunnus,'FI-M-091',fi,{fi,sv},[p.nimi_fi,p.nimi_se]);}),
   ...espoo().map(f=>{const p=f.properties,code=p.KAUPUNGINOSANNUMERO,fi=title(p.KAUPUNGINOSANNIMI_FI,'fi'),sv=title(p.KAUPUNGINOSANNIMI_SE,'sv');return make(f,'FI-ESP-'+code,code,'FI-M-049',fi,{fi,sv},[p.KAUPUNGINOSANNIMI_FI,p.KAUPUNGINOSANNIMI_SE]);})
  ];
 }else{
  features=json('reykjavik-districts.geojson').features.map(f=>{const text=f.properties.HVERFI,match=/^(\d+)\.\s*(.+)$/.exec(text);assert(match,'Reykjavík district identity');return make(f,'IS-RV-'+match[1],match[1],'IS-M-0000',match[2],{},[text]);});
 }
 return{units,regions:{type:'FeatureCollection',features}};
}
