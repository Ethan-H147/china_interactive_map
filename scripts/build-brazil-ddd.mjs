import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {divisionBorders} from './south-america-borders.mjs';

// Build the 67 telephone regions offline. The browser never loads municipalities.
const folder='artifacts/brazil-codes/',out='dist/data/south-america/';
const csv=fs.readFileSync(folder+'ddd/Codigos_Nacionais.csv');
const rows=csv.toString('utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1);
const assignments=new Map();
for(const line of rows){
 const cells=line.match(/(?:"(?:[^"]|"")*"|[^;]*)(?:;|$)/g).filter(Boolean).map(c=>c.replace(/;$/,'').replace(/^"|"$/g,'').replace(/""/g,'"'));
 if(cells[8]!=='Sim')continue;
 const [ibge,uf,,name,code]=cells;
 if(assignments.has(ibge))throw Error('Multiple current DDD assignments: '+ibge);
 assignments.set(ibge,{ibge,uf,name,code});
}
const shape=folder+'municipalities.geojson';
if(!fs.existsSync(shape))execFileSync(process.execPath,['--max-old-space-size=12000','node_modules/mapshaper/bin/mapshaper',folder+'municipios.zip','-target','BR_Municipios_2025','-proj','wgs84','-clean','-simplify','dp','interval=75','keep-shapes','-o',shape,'target=BR_Municipios_2025','format=geojson','precision=0.000001'],{stdio:'inherit'});
const municipalities=JSON.parse(fs.readFileSync(shape)),groups=new Map(),seen=new Set();
// IBGE includes two operational lake areas, not telephone municipalities.
municipalities.features=municipalities.features.filter(f=>!['4300001','4300002'].includes(String(f.properties.CD_MUN)));
for(const f of municipalities.features){
 const ibge=String(f.properties.CD_MUN),a=assignments.get(ibge);
 if(!a)throw Error('No official current DDD assignment: '+ibge+' '+f.properties.NM_MUN);
 seen.add(ibge);if(!groups.has(a.code))groups.set(a.code,[]);groups.get(a.code).push(a);
 f.properties={code:a.code};
}
if(seen.size!==5571||groups.size!==67)throw Error('Unexpected municipality or DDD coverage: '+seen.size+'/'+groups.size);
const fc=features=>({type:'FeatureCollection',features});
async function command(input,commands){const files=await mapshaper.applyCommands('-i input.json '+commands+' -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(input)});const value=JSON.parse(files['output.json']);return value.type==='FeatureCollection'?value:fc(value.type==='Feature'?[value]:[{type:'Feature',properties:{},geometry:value}]);}
const regions=await command(municipalities,'-dissolve code -clean gap-width=0 snap-interval=0.0000001');
const centers=new Map((await command(regions,'-points inner')).features.map(f=>[f.properties.code,f.geometry.coordinates]));
function bounds(coords){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(coords);return [[b[0],b[1]],[b[2],b[3]]];}
for(const f of regions.features){
 const code=String(f.properties.code),members=groups.get(code),ufs=[...new Set(members.map(m=>m.uf))].sort();
 f.id='BR-DDD-'+code;
 f.properties={id:f.id,code,en:'DDD '+code,local:'',kind:'Telephone area code',level:1,parent:'brazil',states:ufs,municipalityCount:members.length,municipalities:members.map(m=>({id:m.ibge,name:m.name,state:m.uf})),aliases:[code,'+55 '+code,'area code '+code,...members.map(m=>m.name)],bounds:bounds(f.geometry.coordinates),center:centers.get(code)};
}
const records=regions.features.map(f=>f.properties).sort((a,b)=>a.code.localeCompare(b.code));
// Search metadata stays out of the geometry source to avoid copying it per tile.
for(const f of regions.features)f.properties={id:f.id,code:f.properties.code};
const lines=divisionBorders(regions);
const json=JSON.stringify({records,regions,lines}),bytes=gzipSync(json,{level:9});
if(bytes.length>3200000||Buffer.byteLength(json)>10000000)throw Error('DDD geometry exceeds the loading budget: '+bytes.length+' compressed / '+Buffer.byteLength(json)+' decoded');
fs.writeFileSync(out+'brazil-ddd.bin',bytes);
const info={publishers:['Anatel','IBGE'],downloaded:'2026-10-06',assignmentSource:'https://informacoes.anatel.gov.br/paineis/areas-tarifarias',assignmentDownload:'https://www.anatel.gov.br/dadosabertos/paineis_de_dados/areastarifarias/pgcn.zip',boundarySource:'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_Municipios_2025.zip',boundaryYear:2025,assignmentSHA256:createHash('sha256').update(csv).digest('hex'),boundarySHA256:createHash('sha256').update(fs.readFileSync(folder+'municipios.zip')).digest('hex'),regions:67,municipalities:seen.size,bytes:bytes.length,decodedBytes:Buffer.byteLength(json),method:'Only current (VIGENTE=Sim) Anatel assignments, joined by IBGE municipality ID; shared municipal topology simplified to 75 metres and dissolved by DDD. Boundaries follow the official municipal assignments; the displayed geometry is generalized, not a cadastral survey.'};
fs.writeFileSync(out+'brazil-ddd-sources.json',JSON.stringify(info,null,2)+'\n');
fs.writeFileSync(out+'brazil-ddd-municipalities.json',JSON.stringify([...groups].sort().flatMap(([code,members])=>members.map(m=>({id:m.ibge,code,name:m.name,state:m.uf}))))+'\n');
console.log(info);
