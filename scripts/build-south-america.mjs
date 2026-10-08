import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {divisionBorders,internationalBorders} from './south-america-borders.mjs';
import {alignCountry} from './international-topology.mjs';
const root='artifacts/south-america-source/',out='dist/data/south-america/';
fs.mkdirSync(out,{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
function bounds(coordinates){const box=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){box[0]=Math.min(box[0],c[0]);box[1]=Math.min(box[1],c[1]);box[2]=Math.max(box[2],c[0]);box[3]=Math.max(box[3],c[1]);}else c.forEach(walk);};walk(coordinates);return [[box[0],box[1]],[box[2],box[3]]];}
const area=ring=>Math.abs(ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0));
async function command(input,commands){
 const files=await mapshaper.applyCommands('-i input.json '+commands+' -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(input)}),result=JSON.parse(files['output.json']);
 if(result.type==='FeatureCollection')return result;
 if(result.type==='Feature')return fc([result]);
 // Attribute-free exports contain geometries directly. Wrap them in Features
 // before reading .geometry; otherwise country silhouettes lose their shape.
 return fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));
}
const context=JSON.parse(gunzipSync(fs.readFileSync('dist/data/flight-context.bin')));
const prepared={},inputs={},reports={};
const uruguayNames={'PAYSANDU':'Paysandú','RIO_NEGRO':'Río Negro','SAN_JOSE':'San José','TACUAREMBO':'Tacuarembó','TREINTA_Y_TRES':'Treinta y Tres'};
const uruguaySource='https://visualizador.ide.uy/geonetwork/srv/api/records/bb9e4263-6206-4cd7-aa9e-0ff5144b4fe4';
for(const country of ['brazil','argentina','uruguay']){
 const original=fs.readFileSync(root+country+'.geojson');let regions=JSON.parse(original);
 inputs[country]=original;
 if(country==='uruguay'){
  // IGM publishes 19 departments and two separately identified contested areas.
  // Keep the latter in the source archive, outside the ordinary department fill.
  regions.features=regions.features.filter(f=>f.properties.use_===24);
  regions=await command(regions,'-clean -simplify dp interval=75 keep-shapes');
 }
 if(country==='argentina'){
  // IGN includes Antarctic and disputed South Atlantic claims. This atlas view
  // covers continental Argentina and its nearby islands, not those claims.
  for(const f of regions.features){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const kept=polygons.filter(p=>{const b=bounds(p);return b[0][1]>-60&&(b[0][1]>-48||b[0][0]<-60);});f.geometry={type:'MultiPolygon',coordinates:kept};}
  regions.features=regions.features.filter(f=>f.geometry.coordinates.length);
  regions=await command(regions,'-clean -simplify dp interval=75 keep-shapes');
 }
 for(const f of regions.features){const p=f.properties;
  const rawCode=String(country==='brazil'?p.CD_UF:country==='uruguay'?p.codigo:p.in1??p.IN1),code=rawCode==='-2'?'02':rawCode;
  let en=country==='brazil'?p.NM_UF:country==='uruguay'?(uruguayNames[p.depto]||p.depto.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())):p.fna??p.FNA;
  en=en.replace(/^Provincia (?:de |del )?/i,'');
  if(country==='argentina'&&code==='02')en='Buenos Aires City';
  const local=country==='brazil'?en:code==='02'?'Ciudad Autónoma de Buenos Aires':en;
  if(country==='argentina'&&code==='94')en='Tierra del Fuego';
  const kind=country==='brazil'?(code==='53'?'Federal district':'State'):country==='uruguay'?'Department':(code==='02'?'Autonomous city':'Province');
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  const largest=[...polygons].sort((a,b)=>area(b[0])-area(a[0]))[0],b=bounds(largest);
  f.properties={id:country==='uruguay'?code:(country==='brazil'?'BR-':'AR-')+code,en,local,kind,level:1,parent:country,aliases:[country==='brazil'?p.SIGLA_UF:country==='uruguay'?p.depto.replace(/_/g,' '):p.nam??p.NAM,en==='Buenos Aires City'?'CABA':''].filter(Boolean),bounds:bounds(f.geometry.coordinates),center:[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2]};
  f.id=f.properties.id;
 }
 prepared[country]=regions;
}
// Use one reference edge at each shared border. Only exterior segments in
// these narrow geographic corridors can move; other coasts remain untouched.
const footprint=async regions=>({type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:(await command(regions,'-dissolve')).features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)}});
const brazil=await footprint(prepared.brazil);
const corridor=(west,south,east,north)=>(a,b)=>[a,b].every(p=>p[0]>=west&&p[0]<=east&&p[1]>=south&&p[1]<=north);
const uy=alignCountry(prepared.uruguay.features,brazil,corridor(-58.5,-34,-53,-30),2500);
prepared.uruguay=fc(uy.features);reports.brazilUruguay=uy.report;
const ar=alignCountry(prepared.argentina.features,brazil,corridor(-58,-30.3,-53.5,-25.5),2500);
prepared.argentina=fc(ar.features);reports.brazilArgentina=ar.report;
// These sources outline land on opposite shores of the Uruguay River. Do not
// snap those coastlines together: show IGN's international line separately.
const riverOriginal=fs.readFileSync(root+'argentina-international.geojson');
const river=JSON.parse(riverOriginal);
river.features=river.features.filter(f=>f.properties.gna==='Argentina - Uruguay'&&f.properties.objeto==='Límite internacional');
for(const f of river.features)f.properties={countries:['argentina','uruguay']};
context.riverBorders=await command(river,'-simplify dp interval=75 keep-shapes');
reports.uruguayArgentina={method:'Preserve the land polygons on both river shores; draw the official IGN international line separately.',source:'https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG',downloadURL:'https://wms.ign.gob.ar/geoserver/ign/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ign%3Alinea_de_limite_FA004&outputFormat=application%2Fjson&srsName=EPSG%3A4326',inputSHA256:createHash('sha256').update(riverOriginal).digest('hex'),featureCount:context.riverBorders.features.length};
console.log('Alignment',reports);
// Node the aligned edges together, including administrative junctions. A tiny
// snap tolerance removes rounding noise without changing geographic detail.
const joint=await command(fc(Object.values(prepared).flatMap(c=>c.features)),'-clean gap-width=0 snap-interval=0.0000001 overlap-rule=min-area');
const footprints=await command(joint,'-dissolve parent');
for(const country of Object.keys(prepared)){
 const regions=fc(joint.features.filter(f=>f.properties.parent===country));
 const points=await command(regions,'-points inner');
 const centers=new Map(points.features.map(f=>[f.properties.id,f.geometry.coordinates]));
 for(const f of regions.features){f.id=f.properties.id;f.properties.center=centers.get(f.properties.id);f.properties.bounds=bounds(f.geometry.coordinates);}
 const records=regions.features.map(f=>f.properties).sort((a,b)=>a.en.localeCompare(b.en));
 const lines=divisionBorders(regions);
 const payload={records,regions,lines},json=JSON.stringify(payload),bytes=gzipSync(json,{level:9});
 fs.writeFileSync(out+country+'-first.bin',bytes);
 // Context silhouettes use the same exterior geometry as detailed divisions.
 // Independently simplifying them previously produced gaps and double borders.
 const coordinates=footprints.features.filter(f=>f.properties.parent===country).flatMap(f=>{const g=f.geometry;if(g?.type==='Polygon')return [g.coordinates];if(g?.type==='MultiPolygon')return g.coordinates;throw Error('Invalid country silhouette: '+country);});
 if(!coordinates.length)throw Error('Empty country silhouette: '+country);
 const existing=context.features.find(f=>f.properties.country===country);existing.geometry={type:'MultiPolygon',coordinates};
 const info={publisher:country==='brazil'?'Instituto Brasileiro de Geografia e Estatística (IBGE)':country==='uruguay'?'Instituto Geográfico Militar (IGM), via IDE Uruguay':'Instituto Geográfico Nacional (IGN), Argentina',source:country==='brazil'?'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_UF_2025.zip':country==='uruguay'?uruguaySource:'https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG',downloadURL:country==='argentina'?'https://ide.ign.gob.ar/geoservicios/rest/services/servicio_fondos/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson&maxAllowableOffset=0.0005':country==='uruguay'?'https://mapas.ide.uy/geoserver-vectorial/INE_NO_SEGURO_CLON_NS/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=INE_NO_SEGURO_CLON_NS%3Alimites_departamentales_igm_20220211&outputFormat=application%2Fjson&srsName=EPSG%3A4326':null,downloaded:'2026-10-06',boundaryYear:country==='brazil'?2025:country==='uruguay'?2022:null,processedInputSHA256:createHash('sha256').update(inputs[country]).digest('hex'),count:records.length,bytes:bytes.length,decodedBytes:Buffer.byteLength(json),processing:'Shared topology across all three countries; 75 m detail simplification; shared exterior edges aligned within 2.5 km of the reference; rounded to 0.000001 degrees; matching context silhouettes. IGN service query uses 0.0005 degree geometry tolerance.',coverageNote:country==='argentina'?'23 provinces and Buenos Aires autonomous city. Continental territory and nearby islands; Antarctic and disputed South Atlantic claims from the source are excluded from this view.':country==='uruguay'?'19 departments. IGM separately marks Rincón de Maneco and Isla Brasileña as contested areas; those two features are excluded from regular department fills.':'26 states and the Federal District.'};
 fs.writeFileSync(out+country+'-sources.json',JSON.stringify(info,null,2)+'\n');
 console.log(country,info.count,info.bytes,info.decodedBytes);
}
context.landBorders=internationalBorders(joint);
fs.writeFileSync('dist/data/flight-context.bin',gzipSync(JSON.stringify(context),{level:9}));
fs.writeFileSync(out+'shared-border-sources.json',JSON.stringify(reports,null,2)+'\n');
