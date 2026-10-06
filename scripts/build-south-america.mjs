import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
const root='artifacts/south-america-source/',out='dist/data/south-america/';
fs.mkdirSync(out,{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
function bounds(coordinates){const box=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){box[0]=Math.min(box[0],c[0]);box[1]=Math.min(box[1],c[1]);box[2]=Math.max(box[2],c[0]);box[3]=Math.max(box[3],c[1]);}else c.forEach(walk);};walk(coordinates);return [[box[0],box[1]],[box[2],box[3]]];}
const area=ring=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0));
async function command(input,commands){const files=await mapshaper.applyCommands('-i input.json '+commands+' -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(input)});const result=JSON.parse(files['output.json']);return result.type==='FeatureCollection'?result:fc([result]);}
const context=JSON.parse(gunzipSync(fs.readFileSync('dist/data/flight-context.bin')));
for(const country of ['brazil','argentina']){
 const original=fs.readFileSync(root+country+'.geojson');let regions=JSON.parse(original);
 if(country==='argentina'){
  // IGN includes Antarctic and disputed South Atlantic claims. This atlas view
  // covers continental Argentina and its nearby islands, not those claims.
  for(const f of regions.features){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const kept=polygons.filter(p=>{const b=bounds(p);return b[0][1]>-60&&(b[0][1]>-48||b[0][0]<-60);});f.geometry={type:'MultiPolygon',coordinates:kept};}
  regions.features=regions.features.filter(f=>f.geometry.coordinates.length);
  regions=await command(regions,'-clean -simplify dp interval=75 keep-shapes');
 }
 for(const f of regions.features){const p=f.properties;
  const rawCode=String(country==='brazil'?p.CD_UF:p.in1??p.IN1),code=rawCode==='-2'?'02':rawCode;
  let en=country==='brazil'?p.NM_UF:p.fna??p.FNA;
  en=en.replace(/^Provincia (?:de |del )?/i,'');
  if(country==='argentina'&&code==='02')en='Buenos Aires City';
  const local=country==='brazil'?en:code==='02'?'Ciudad Autónoma de Buenos Aires':en;
  if(country==='argentina'&&code==='94')en='Tierra del Fuego';
  const kind=country==='brazil'?(code==='53'?'Federal district':'State'):(code==='02'?'Autonomous city':'Province');
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  const largest=[...polygons].sort((a,b)=>area(b[0])-area(a[0]))[0],b=bounds(largest);
  f.properties={id:(country==='brazil'?'BR-':'AR-')+code,en,local,kind,level:1,parent:country,aliases:[country==='brazil'?p.SIGLA_UF:p.nam??p.NAM,en==='Buenos Aires City'?'CABA':''].filter(Boolean),bounds:bounds(f.geometry.coordinates),center:[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2]};
  f.id=f.properties.id;
 }
 const points=await command(regions,'-points inner');
 const centers=new Map(points.features.map(f=>[f.properties.id,f.geometry.coordinates]));
 for(const f of regions.features)f.properties.center=centers.get(f.properties.id);
 const records=regions.features.map(f=>f.properties).sort((a,b)=>a.en.localeCompare(b.en));
 const topo=topology({regions});const lines=fc([{type:'Feature',properties:{},geometry:mesh(topo,topo.objects.regions)}]);
 const payload={records,regions,lines},json=JSON.stringify(payload),bytes=gzipSync(json,{level:9});
 fs.writeFileSync(out+country+'-first.bin',bytes);
 const footprint=await command(regions,'-dissolve -simplify dp interval=1500 keep-shapes');
 const existing=context.features.find(f=>f.properties.country===country);existing.geometry=footprint.features[0].geometry;
 const info={publisher:country==='brazil'?'Instituto Brasileiro de Geografia e Estatística (IBGE)':'Instituto Geográfico Nacional (IGN), Argentina',source:country==='brazil'?'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_UF_2025.zip':'https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG',downloadURL:country==='argentina'?'https://ide.ign.gob.ar/geoservicios/rest/services/servicio_fondos/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson&maxAllowableOffset=0.0005':null,downloaded:'2026-10-06',boundaryYear:country==='brazil'?2025:null,processedInputSHA256:createHash('sha256').update(original).digest('hex'),count:records.length,bytes:bytes.length,decodedBytes:Buffer.byteLength(json),processing:'Shared topology; 75 m detail simplification; rounded to 0.000001 degrees; one shared boundary mesh. IGN service query uses 0.0005 degree geometry tolerance.',coverageNote:country==='argentina'?'23 provinces and Buenos Aires autonomous city. Continental territory and nearby islands; Antarctic and disputed South Atlantic claims from the source are excluded from this view.':'26 states and the Federal District.'};
 fs.writeFileSync(out+country+'-sources.json',JSON.stringify(info,null,2)+'\n');
 console.log(country,info.count,info.bytes,info.decodedBytes);
}
fs.writeFileSync('dist/data/flight-context.bin',gzipSync(JSON.stringify(context),{level:9}));
