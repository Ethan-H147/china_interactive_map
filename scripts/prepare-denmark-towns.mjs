import fs from'node:fs';import assert from'node:assert/strict';import{gunzipSync}from'node:zlib';import{createRequire}from'node:module';import mapshaper from'mapshaper';import{danishUrbanAreas}from'./denmark-settlements.mjs';import{retained}from'./denmark-statistics.mjs';
const source='https://kort.nunagis.gl/refserver/rest/services/Kortportal/Byer_og_bygder/MapServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=geojson',cache='scripts/boundary-sources/denmark/greenland-towns.geojson';
let geo;if(fs.existsSync(cache))geo=JSON.parse(fs.readFileSync(cache));else{const r=await fetch(source);assert(r.ok);geo=await r.json();assert(geo.features?.length);fs.writeFileSync(cache,JSON.stringify(geo)+'\n');}
const meta=retained('greenland-localities-metadata').data.variables.find(v=>v.code==='locality'),byName=new Map(meta.values.map((id,i)=>[meta.valueTexts[i].replace(/\(town\)$/,'').trim(),id])),totals=new Map();
for(const row of retained('greenland-localities').data.data)totals.set(row.key[2],(totals.get(row.key[2])||0)+ +row.values[0]);
const municipalities={'955':'GL-KU','956':'GL-SM','957':'GL-QE','959':'GL-QT','960':'GL-AV'},records=[];
for(const f of geo.features){const p=f.properties,name=p['Ny_grønlandsk'],code=byName.get(name),value=totals.get(code);if(!code||!value)continue;const parent=municipalities[code.slice(0,3)];assert(parent,name+' municipality');
 records.push({id:'DK-S-'+code,en:name,name,local:name,kind:'Town',center:f.geometry.coordinates,parentId:parent,provinceId:'DK-GL',aliases:[p['Gammel_grønlandsk'],p.Dansk].filter(Boolean),population:{value,year:2026,source:'https://bank.stat.gl/BEESTM4',periodLabel:'1 July 2026 population',scope:'Town proper',scopeNote:'Town proper'},provenance:{coordinates:source,population:'https://bank.stat.gl/BEESTM4'}});}
assert(records.some(r=>r.en==='Nuuk'&&r.population.value>20000));

const geometrySource='https://ftp.sdfe.dk/main.html?download&weblink=a21c146073ae7810022a6037a75a5732&realfilename=Bebyggelser%5F2024%2Ezip';
const require=createRequire(import.meta.url),{unzipSync}=require(require.resolve('fflate',{paths:[require.resolve('mapshaper')]}));
const archive=unzipSync(fs.readFileSync('scripts/boundary-sources/denmark/Bebyggelser_2024.zip')),points=new Map();
for(const prefix of ['Byer','Sommer']){
 const input={};for(const key of Object.keys(archive).filter(k=>k.startsWith(prefix)))input['Input'+key.slice(key.lastIndexOf('.'))]=Buffer.from(archive[key]);
 const output=await mapshaper.applyCommands('-i Input.shp encoding=win1252 -proj wgs84 -dissolve kode copy-fields=navn -points inner -o points.geojson format=geojson',input);
 for(const feature of JSON.parse(output['points.geojson']).features)points.set(String(feature.properties.kode).padStart(5,'0'),feature);
}
const catalogue=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/denmark/catalogue.bin'))).records,units=new Map(catalogue.map(r=>[r.id,r]));
const areas=danishUrbanAreas(retained('denmark-settlements').data);
// Statistical urban areas and named-place polygons use different codes for these two conurbations.
const geometryCodes={'01100':'18368','18767':'18980'};
const fallback=JSON.parse(fs.readFileSync('scripts/boundary-sources/denmark/norre-jernlose.json'));
const coordinate=fallback.data.entities.Q83531097.claims.P625[0].mainsnak.datavalue.value;
for(const area of areas){
 const feature=points.get(geometryCodes[area.code]||area.code),center=feature?.geometry.coordinates||(area.code==='18995'?[coordinate.longitude,coordinate.latitude]:null);
 assert(center,'Missing urban area coordinate: '+area.code+' '+area.name);
 const parts=area.parts.filter(p=>p.value>0).sort((a,b)=>b.value-a.value),parents=parts.map(p=>'DK_'+p.municipality),parentId=parents[0];
 assert(parents.every(id=>units.has(id)),area.name+' municipality');
 const copenhagen=area.code==='01100',name=copenhagen?'Copenhagen':area.name;
 records.push({id:'DK-S-'+area.code,en:name,name,local:copenhagen?'København':area.name,kind:'Urban area',center:center.map(v=>+v.toFixed(6)),parentId,parents,provinceId:units.get(parentId).parent,
  aliases:copenhagen?['Hovedstadsområdet','Greater Copenhagen','Greater Copenhagen Region']:area.code==='18767'?['Ølstykke','Stenløse']:[],
  population:{value:area.population,year:2026,date:'2026-01-01',source:'https://www.statbank.dk/BY1',periodLabel:'1 January 2026 population',scope:'Urban area',scopeNote:copenhagen?'Continuous Copenhagen urban area across municipality boundaries; includes Frederiksberg.':parents.length>1?'Whole urban area across '+parents.length+' municipalities.':'Urban settlement; distinct from the municipality.'},
  provenance:{urbanAreaCode:area.code,coordinates:feature?geometrySource:'https://www.wikidata.org/wiki/Q83531097',coordinateMethod:feature?'Interior point of official 2024 named-place polygon'+(geometryCodes[area.code]?' (place code '+geometryCodes[area.code]+')':''):'Wikidata coordinate; this urban area is absent from the 2024 polygon archive',population:'https://www.statbank.dk/BY1',municipalParts:parts}});
}
assert.equal(areas.length,1384);assert.equal(areas.reduce((sum,r)=>sum+r.population,0),5342281);

const out=process.env.DENMARK_OUTPUT||'dist/data/europe/denmark';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/settlements.json',JSON.stringify({country:'denmark',records,sources:[{title:'Statistics Denmark · all 1,384 urban areas, 1 January 2026',url:'https://www.statbank.dk/BY1'},{title:'Danish mapping agency · Bebyggelser 2024 town and summerhouse-area polygons',url:geometrySource},{title:'Wikidata · Nørre Jernløse coordinate',url:'https://www.wikidata.org/wiki/Q83531097'},{title:'NunaGIS · official Greenland town points',url:source},{title:'Statistics Greenland · population in localities, 1 July 2026',url:'https://bank.stat.gl/BEESTM4'}],selection:'All 1,384 Danish statistical urban areas with at least 200 residents in the 2026 BY1 release, plus 17 Greenland towns. Cross-municipality urban areas appear once. Points use official 2024 named-place polygons, with one documented Wikidata fallback. Settlements are separate from administrative subdivisions; rural hamlets under 200 residents are excluded.'})+'\n');
if(!fs.existsSync(out+'/place-names-flags.json'))fs.writeFileSync(out+'/place-names-flags.json',JSON.stringify({retrieved:'2026-10-17',places:{},sources:[]})+'\n');console.log('Denmark settlements: '+areas.length+' Danish urban areas and 17 Greenland towns, with 2026 resident populations.');
