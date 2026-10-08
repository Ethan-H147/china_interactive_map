import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {cities,rankingURL} from './argentina-city-list.mjs';
const input='artifacts/argentina-cities/',out='dist/data/south-america/argentina-cities/';
const original=fs.readFileSync(input+'municipalities.geojson'),municipalities=JSON.parse(original).features;
const georef=JSON.parse(fs.readFileSync(input+'georef-localities.json')).features;
const first=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/argentina-first.bin')));
const normalize=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const fc=features=>({type:'FeatureCollection',features});
const records=[],features=[],groups={},boundaries=new Map();
fs.mkdirSync(out,{recursive:true});
for(const file of fs.readdirSync(out))if(file.endsWith('.bin'))fs.unlinkSync(out+file);
function bounds(c){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=p=>{if(typeof p[0]==='number'){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}else p.forEach(walk);};walk(c);return[[b[0],b[1]],[b[2],b[3]]];}
for(const city of cities){
 const parent=first.records.find(p=>p.id==='AR-'+city.province);
 let geometry,code,sourceURL,boundaryName,source,kind;
 if(city.rank===1){geometry=first.regions.features.find(f=>f.properties.id==='AR-02').geometry;code='02';source='IGN';sourceURL='https://www.ign.gob.ar/';boundaryName='Ciudad Autónoma de Buenos Aires';kind='Autonomous city';}
 else if(city.province==='86'){
  // IGN currently supplies no municipal polygons for this province. A mapped
  // city/locality perimeter is not evidence of its legal municipal jurisdiction.
  code='';source='Pending';sourceURL='https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG';boundaryName=city.name;kind='Municipality';
 }else{
  const matches=municipalities.filter(f=>f.properties.in1.startsWith(city.province)&&normalize(f.properties.nam)===normalize(city.localityParent||city.municipality));
  if(matches.length!==1)throw Error('Ambiguous or missing municipality: '+city.name);
  const feature=matches[0];geometry=feature.geometry;code=feature.properties.in1;source='IGN';sourceURL='https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG';boundaryName=feature.properties.nam;kind='Municipality';
 }
 const places=georef.filter(f=>f.properties.provincia.id===city.province&&normalize(f.properties.nombre)===normalize(city.name));
 const place=places.find(p=>p.properties.gobierno_local?.nombre===city.municipality)||places[0];
 const record={id:'AR-CITY-'+String(city.rank).padStart(2,'0'),en:city.name,local:city.rank===1?'Ciudad Autónoma de Buenos Aires':'',kind,level:3,parent:parent.id,parentName:parent.en,code,cityRank:city.rank,source,sourceURL,boundaryName,
  aliases:[city.name,city.municipality||'',...(city.rank===1?['CABA','Buenos Aires']:city.rank===8?['Santa Fe']:city.rank===40?['San Fernando']:[])],
  municipality:city.localityParent||city.municipality||boundaryName,departmentId:place?.properties.departamento?.id?'AR-'+place.properties.departamento.id:null,boundaryAvailable:!!geometry};
 records.push(record);
 if(geometry){const key=parent.id+':'+code;record.boundaryId=boundaries.get(key)?.properties.id||record.id;if(!boundaries.has(key)){const feature={type:'Feature',id:record.id,properties:record,geometry};boundaries.set(key,feature);features.push(feature);}}
 else{record.bounds=parent.bounds;record.center=place?.geometry.coordinates||parent.center;}
}
for(const parent of first.records){
 const members=features.filter(f=>f.properties.parent===parent.id);if(!members.length)continue;
 // Several ranked cities share a municipality. Store its jurisdiction once.
 const files=await mapshaper.applyCommands('-i input.json -simplify dp interval=25 keep-shapes -clip parent.json -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(fc(members)),'parent.json':JSON.stringify(fc([first.regions.features.find(f=>f.properties.id===parent.id)]))});
 let regions=JSON.parse(files['output.json']);if(regions.type==='Feature')regions=fc([regions]);
 if(regions.features.length!==members.length)throw Error(parent.en+' lost a city');
 const inner=await mapshaper.applyCommands('-i input.json -points inner -o output.json format=geojson',{'input.json':JSON.stringify(regions)});
 let points=JSON.parse(inner['output.json']);if(points.type==='Feature')points=fc([points]);const centers=new Map(points.features.map(f=>[f.properties.id,f.geometry.coordinates]));
 for(const feature of regions.features){const record=records.find(r=>r.id===feature.properties.id);for(const member of records.filter(r=>r.boundaryId===record.id)){member.bounds=bounds(feature.geometry.coordinates);member.center=centers.get(record.id);}feature.properties=record;feature.id=record.id;}
 const lines=fc(regions.features.map(f=>({type:'Feature',properties:{kind:f.properties.kind},geometry:{type:'MultiLineString',coordinates:(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat()}})));
 const localRecords=regions.features.map(f=>f.properties),bytes=gzipSync(JSON.stringify({records:localRecords,regions,lines}),{level:9});
 fs.writeFileSync(out+parent.id+'.bin',bytes);groups[parent.id]={count:localRecords.length,file:parent.id+'.bin',bytes:bytes.length};console.log(parent.en,localRecords.length,bytes.length);
}
fs.writeFileSync(out+'index.bin',gzipSync(JSON.stringify({records,groups}),{level:9}));
fs.writeFileSync(out+'sources.json',JSON.stringify({retrieved:'2026-10-08',rankingURL,rankingNote:'First 80 entries in the supplied Wikipedia list; that list combines 2010 and 2001 figures and is not a new 2022 population ranking.',municipalSource:'Instituto Geográfico Nacional (IGN)',municipalURL:'https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG',municipalSHA256:createHash('sha256').update(original).digest('hex'),method:'Only IGN municipal jurisdictions. Cities within a larger municipality share its polygon, stored once; municipal borders can coincide with partidos or departments. CABA reuses its existing IGN exterior. Santiago del Estero and La Banda have no IGN municipal polygons and remain pending. Generalized to 25 m and clipped to the existing provincial exterior. All 80 cities remain searchable; geometry loads by province on demand.',count:records.length,groups,records:records.map(({id,en,kind,source,sourceURL,boundaryName,municipality,cityRank,boundaryAvailable,boundaryId})=>({id,name:en,kind,source,sourceURL,boundaryName,municipality,rank:cityRank,boundaryAvailable,boundaryId}))},null,2)+'\n');
console.log('80 city records, index',fs.statSync(out+'index.bin').size,'bytes');
