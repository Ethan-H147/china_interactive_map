import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {divisionBorders} from './south-america-borders.mjs';

const input='artifacts/brazil-codes/',out='dist/data/south-america/brazil-local/';
const sourceURL='https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_Municipios_2025.zip';
// Reuse the official 2025 mesh already fetched for the DDD view. Its shared
// topology was simplified to 75 metres; retain every municipal jurisdiction.
const sha256=createHash('sha256').update(fs.readFileSync(input+'municipios.zip')).digest('hex');
const dddSource=JSON.parse(fs.readFileSync('dist/data/south-america/brazil-ddd-sources.json'));
if(sha256!==dddSource.boundarySHA256)throw Error('Municipal snapshot must match the reviewed IBGE 2025 source');
if(!fs.existsSync(input+'municipalities.geojson'))execFileSync(process.execPath,['--max-old-space-size=12000','node_modules/mapshaper/bin/mapshaper',input+'municipios.zip','-target','BR_Municipios_2025','-proj','wgs84','-clean','-simplify','dp','interval=75','keep-shapes','-o',input+'municipalities.geojson','target=BR_Municipios_2025','format=geojson','precision=0.000001'],{stdio:'inherit'});
const original=JSON.parse(fs.readFileSync(input+'municipalities.geojson'));
if(original.features.length!==5573)throw Error('Unexpected IBGE coverage');
const first=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/brazil-first.bin')));
const fc=features=>({type:'FeatureCollection',features});
const bounds=coordinates=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(coordinates);return [[b[0],b[1]],[b[2],b[3]]];};
const records=[],groups={},excluded=original.features.filter(f=>['4300001','4300002'].includes(String(f.properties.CD_MUN))).map(f=>({code:String(f.properties.CD_MUN),name:f.properties.NM_MUN,reason:'State operational lake area, not a municipality'}));
fs.mkdirSync(out,{recursive:true});
for(const parent of first.records){
 const members=original.features.filter(f=>'BR-'+f.properties.CD_UF===parent.id&&!excluded.some(r=>r.code===String(f.properties.CD_MUN)));
 const regions=fc(members.map(f=>{const p=f.properties,code=String(p.CD_MUN),id='BR-'+code;return {type:'Feature',id,properties:{id,code,en:p.NM_MUN,local:'',kind:code==='5300108'?'Federal district':code==='2605459'?'State district':'Municipality',level:2,parent:parent.id,parentName:parent.en,state:p.SIGLA_UF,aliases:[code,p.NM_MUN+' '+p.SIGLA_UF],bounds:bounds(f.geometry.coordinates)},geometry:f.geometry};}));
 const files=await mapshaper.applyCommands('-i input.json -points inner -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(regions)});
 const points=JSON.parse(files['output.json']),centers=new Map((points.features||[points]).map(f=>[f.properties.id,f.geometry.coordinates]));
 for(const f of regions.features)f.properties.center=centers.get(f.id);
 regions.features.sort((a,b)=>a.properties.en.localeCompare(b.properties.en,'pt'));
 const stateRecords=regions.features.map(f=>f.properties),lines=divisionBorders(regions);
 // Geometry tile sources contain only IDs, avoiding repeated search metadata.
 for(const f of regions.features)f.properties={id:f.id};
 const json=JSON.stringify({records:stateRecords,regions,lines}),bytes=gzipSync(json,{level:9});
 if(bytes.length>3000000||Buffer.byteLength(json)>18000000)throw Error(parent.en+' exceeds the state loading budget');
 const file=parent.id+'.bin';fs.writeFileSync(out+file,bytes);
 groups[parent.id]={count:stateRecords.length,file,bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};records.push(...stateRecords);
 console.log(parent.en,stateRecords.length,bytes.length);
}
if(records.length!==5571||records.filter(r=>r.kind==='Municipality').length!==5569)throw Error('Missing Brazilian municipal jurisdictions');
const index=gzipSync(JSON.stringify({records,groups}),{level:9});if(index.length>350000)throw Error('Municipal name index exceeds budget');
fs.writeFileSync(out+'index.bin',index);
fs.writeFileSync(out+'sources.json',JSON.stringify({publisher:'IBGE',sourceURL:'https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/15774-malhas.html',downloadURL:sourceURL,referenceYear:2025,retrieved:'2026-10-06',sha256,originalCount:5573,municipalities:5569,displayedCount:5571,specialJurisdictions:records.filter(r=>r.kind!=='Municipality').map(r=>({id:r.id,name:r.en,kind:r.kind})),excluded,indexBytes:index.length,generalizationMeters:75,method:'Official IBGE 2025 polygons with shared topology simplified to 75 metres and interior labels. Only shared internal edges are drawn, without coastal outlines. A small national name index supports search; a temporary worker loads one selected state, and switching states or views releases previous detail. MapLibre applies pixel-based simplification with zoom; tiny line paths fade continuously. No municipal statistics are included.',groups},null,2)+'\n');
console.log('Municipal jurisdictions',records.length,'Name index',index.length);
