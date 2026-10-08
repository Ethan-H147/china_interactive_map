import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {divisionBorders} from './south-america-borders.mjs';
const input='artifacts/uruguay/municipios-wfs.geojson',out='dist/data/south-america/uruguay-local/';
const bytes=fs.readFileSync(input),original=JSON.parse(bytes);
assert.equal(original.features.length,136);assert(original.features.every(f=>f.geometry));
const first=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/uruguay-first.bin')));
const fc=features=>({type:'FeatureCollection',features});
const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
const title=s=>s.toLocaleLowerCase('es').split(' ').map((word,i)=>i&&['de','del','los','las','la','el','y'].includes(word)?word:word[0].toUpperCase()+word.slice(1)).join(' ');
const bounds=c=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=p=>{if(typeof p[0]==='number'){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}else p.forEach(walk);};walk(c);return [[b[0],b[1]],[b[2],b[3]]];};
for(const f of original.features){const parent=first.records.find(r=>normalize(r.en)===normalize(f.properties.depto));assert(parent);const code=f.properties.cod_muni,id='UY-MUN-'+code;f.properties={id,code,en:parent.id==='UY-MO'?'Municipio '+f.properties.municipio:title(f.properties.municipio),local:'',kind:'Municipality',level:2,parent:parent.id,parentName:parent.en,aliases:[code,f.properties.municipio+' '+parent.en]};f.id=id;}
// Generalize the national topology together before splitting department files.
const simplified=await mapshaper.applyCommands('-i input.json -clean -simplify dp interval=25 keep-shapes -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(original)});
const all=JSON.parse(simplified['output.json']);assert.equal(all.features.length,136);
fs.mkdirSync(out,{recursive:true});const records=[],groups={};
for(const parent of first.records){
 const members=all.features.filter(f=>f.properties.parent===parent.id),exterior=first.regions.features.find(f=>f.properties.id===parent.id);
 assert(members.length);
 const clipped=await mapshaper.applyCommands('-i input.json -clip parent.json -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(fc(members)),'parent.json':JSON.stringify(fc([exterior]))});
 let regions=JSON.parse(clipped['output.json']);if(regions.type==='Feature')regions=fc([regions]);assert.equal(regions.features.length,members.length,parent.en+' lost a municipality');
 // Municipalities do not cover all departmental land. Include the remainder in
 // the topology only, retaining inland perimeters while omitting the exterior.
 const remainder=await mapshaper.applyCommands('-i parent.json -erase input.json -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(regions),'parent.json':JSON.stringify(fc([{...exterior,properties:{id:parent.id+'-remainder'}}]))});
 let rest=JSON.parse(remainder['output.json']);if(rest.type==='Feature')rest=fc([rest]);
 const lines=divisionBorders(fc([...regions.features,...rest.features]));
 const inner=await mapshaper.applyCommands('-i input.json -points inner -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(regions)});let points=JSON.parse(inner['output.json']);if(points.type==='Feature')points=fc([points]);
 const centers=new Map(points.features.map(f=>[f.properties.id,f.geometry.coordinates]));
 for(const f of regions.features){f.properties.bounds=bounds(f.geometry.coordinates);f.properties.center=centers.get(f.properties.id);assert(f.properties.center);}
 regions.features.sort((a,b)=>a.properties.en.localeCompare(b.properties.en,'es'));
 const local=regions.features.map(f=>f.properties);records.push(...local);for(const f of regions.features)f.properties={id:f.properties.id};
 const json=JSON.stringify({records:local,regions,lines}),data=gzipSync(json,{level:9});assert(data.length<1500000&&Buffer.byteLength(json)<10000000,'Department detail budget');fs.writeFileSync(out+parent.id+'.bin',data);groups[parent.id]={count:local.length,file:parent.id+'.bin',bytes:data.length,decodedBytes:Buffer.byteLength(json)};console.log(parent.en,local.length,data.length);
}
assert.equal(records.length,136);assert.equal(new Set(records.map(r=>r.id)).size,136);
const index=gzipSync(JSON.stringify({records,groups}),{level:9});assert(index.length<20000);fs.writeFileSync(out+'index.bin',index);
fs.writeFileSync(out+'sources.json',JSON.stringify({publisher:'DINOT · IDE · AGESIC · GTLA',referenceYear:2025,retrieved:'2026-10-08',sourceURL:'https://visualizador.ide.uy/geonetwork/static/api/records/82c71a84-97ac-4cf1-8ac9-c0296b2383ad',downloadURL:'https://mapas.ide.uy/geoserver-vectorial/ideuy/municipios_20250507/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=ideuy:municipios_20250507&outputFormat=application/json&srsName=EPSG:4326',license:'Licencia de Datos Abiertos Uruguay',sha256:createHash('sha256').update(bytes).digest('hex'),count:136,indexBytes:index.length,generalizationMeters:25,method:'Official 2025 municipality polygons based on electoral series and Circular 12208 (12 March 2025). Shared topology generalized to 25 metres, clipped to existing IGM department land. Nonmunicipal land remains visible and selectable as department land; it is not assigned to a municipality. A topology-only remainder preserves inland municipal perimeters without drawing coastlines or department exteriors. A national name index enables search; only one selected department geometry loads in a temporary worker. Detail is released on department, country or mode changes; lines simplify and fade with zoom. Municipality statistics are not inferred from department totals.',groups},null,2)+'\n');
console.log('Uruguay: 136 municipalities; name index',index.length,'bytes');
