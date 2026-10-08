import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {divisionBorders} from './south-america-borders.mjs';
const input='artifacts/argentina-second/departments.geojson',out='dist/data/south-america/argentina-local/';
const original=fs.readFileSync(input),official=JSON.parse(original);
const first=JSON.parse(gunzipSync(fs.readFileSync('dist/data/south-america/argentina-first.bin')));
fs.mkdirSync(out,{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
function bounds(coordinates){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
async function process(regions,parent,commands){const files=await mapshaper.applyCommands('-i input.json '+commands+' -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(regions),'parent.json':JSON.stringify(fc([parent]))});const result=JSON.parse(files['output.json']);return result.type==='FeatureCollection'?result:fc([result]);}
const records=[],groups={},omitted=[];
for(const parent of first.records){
 const members=official.features.filter(f=>String(f.properties.in1).slice(0,2)===parent.id.slice(3));
 const kept=members.filter(f=>!['94021','94028'].includes(f.properties.in1));
 for(const f of members)if(!kept.includes(f))omitted.push({code:f.properties.in1,name:f.properties.nam});
 for(const f of kept){const p=f.properties,kind=parent.id==='AR-06'?'Partido':parent.id==='AR-02'?'Comuna':'Department';f.properties={id:'AR-'+p.in1,code:p.in1,en:p.nam,local:'',kind,level:2,parent:parent.id,parentName:parent.en,aliases:[p.fna,p.in1,...(kind==='Comuna'?['Commune '+p.nam.replace(/\D/g,'')]:[])]};}
 // The national map retains its reconciled exterior. Detailed internal edges
 // come from IGN; clip them to that exterior to avoid double coastlines.
 const region=first.regions.features.find(f=>f.properties.id===parent.id);
 let regions=await process(fc(kept),region,'-clean gap-width=0 -simplify dp interval=50 keep-shapes -clip parent.json -clean gap-width=0');
 if(regions.features.length!==kept.length)throw Error(parent.en+' lost a division');
 const points=await process(regions,region,'-points inner');const centers=new Map(points.features.map(f=>[f.properties.id,f.geometry.coordinates]));
 for(const f of regions.features){f.id=f.properties.id;f.properties.bounds=bounds(f.geometry.coordinates);f.properties.center=centers.get(f.id);}
 regions.features.sort((a,b)=>a.properties.en.localeCompare(b.properties.en,'es',{numeric:true}));
 const localRecords=regions.features.map(f=>f.properties),lines=divisionBorders(regions);
 const file=parent.id+'.bin',bytes=gzipSync(JSON.stringify({records:localRecords,regions,lines}),{level:9});fs.writeFileSync(out+file,bytes);
 records.push(...localRecords);groups[parent.id]={count:localRecords.length,bytes:bytes.length,file};console.log(parent.en,localRecords.length,bytes.length);
}
fs.writeFileSync(out+'index.bin',gzipSync(JSON.stringify({records,groups}),{level:9}));
fs.writeFileSync(out+'sources.json',JSON.stringify({source:'Instituto Geográfico Nacional, Argentina',sourceURL:'https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG',downloadURL:'https://wms.ign.gob.ar/geoserver/ign/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ign%3Adepartamento&outputFormat=application%2Fjson&srsName=EPSG%3A4326',retrieved:'2026-10-07',sha256:createHash('sha256').update(original).digest('hex'),originalCount:official.features.length,displayedCount:records.length,omitted,generalizationMeters:50,method:'Shared internal topology simplified to 50 m with shapes retained; clipped to the existing reconciled provincial exterior. Only one selected province is loaded. Buenos Aires City is separate from Buenos Aires Province; its subdivisions are comunas.',groups},null,2)+'\n');
console.log('Total',records.length,'Index',fs.statSync(out+'index.bin').size);
