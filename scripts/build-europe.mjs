import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {lineData,visibleSegments} from '../dist/adaptive-lines.mjs';
import {alignCountry,polygons} from './international-topology.mjs';
const require=createRequire(import.meta.url);
const mapshaper=require('mapshaper');
const source=path.resolve(process.argv[2]||'artifacts/europe-source'),out='dist/data/europe';
const read=n=>JSON.parse(fs.readFileSync(path.join(source,n))),fc=features=>({type:'FeatureCollection',features});
async function command(data,commands,files={}){const result=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson precision=.000001',{'input.json':JSON.stringify(data),...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))}))['result.json']);return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));}
function bounds(g){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
function write(country,name,data){const dir=out+'/'+country;fs.mkdirSync(path.dirname(dir+'/'+name),{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(dir+'/'+name,bytes);return bytes.length;}
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
const single=collection=>{const geometries=collection.features.map(f=>f.geometry).filter(Boolean);return {type:'MultiPolygon',coordinates:geometries.flatMap(polygons)};};

// Every country starts from its most detailed level (or a national outline while its
// subdivisions are pending). Parents are dissolved from those polygons, so all levels
// share one geometry.
const {unzipSync,strFromU8}=createRequire(require.resolve('mapshaper'))('fflate');
const {mesh}=require('topojson-client'),{topology}=require('topojson-server');
const simplify='-clean -simplify dp interval=.0003 planar keep-shapes -clean';
const italianRegions={1:'Piedmont',2:'Aosta Valley',3:'Lombardy',4:'Trentino-South Tyrol',5:'Veneto',6:'Friuli-Venezia Giulia',7:'Liguria',8:'Emilia-Romagna',9:'Tuscany',10:'Umbria',11:'Marche',12:'Lazio',13:'Abruzzo',14:'Molise',15:'Campania',16:'Apulia',17:'Basilicata',18:'Calabria',19:'Sicily',20:'Sardinia'};
const italianExonyms={Torino:'Turin',Milano:'Milan',Roma:'Rome',Napoli:'Naples',Firenze:'Florence',Venezia:'Venice',Genova:'Genoa',Padova:'Padua',Mantova:'Mantua',Siracusa:'Syracuse','Bolzano/Bozen':'South Tyrol',"Valle d'Aosta/Vallée d'Aoste":'Aosta Valley'};
const italianTypes={'Città metropolitana':'Metropolitan city',Provincia:'Province','Provincia autonoma':'Autonomous province','Libero consorzio di comuni':'Free municipal consortium','Unità non amministrativa':'Statistical unit (former province)'};
async function loadItaly(){
 const files=unzipSync(fs.readFileSync(path.join(source,'istat-limiti-2026.zip')));
 const layer=dir=>Object.fromEntries(['shp','shx','dbf','prj'].map(ext=>['in.'+ext,Buffer.from(files[Object.keys(files).find(k=>k.startsWith(dir+'/')&&k.toLowerCase().endsWith('.'+ext))])]));
 const attributes=async dir=>JSON.parse((await mapshaper.applyCommands('-i in.shp -drop geometry -o out.json format=json',layer(dir)))['out.json']);
 const units=new Map();
 for(const r of await attributes('Reg01012026'))units.set('IT-R-'+String(r.COD_REG).padStart(2,'0'),{level:1,parent:null,en:italianRegions[r.COD_REG],local:r.DEN_REG,kind:[2,4,6,19,20].includes(r.COD_REG)?'Autonomous region':'Region'});
 for(const p of await attributes('ProvCM01012026')){assert(italianTypes[p.TIPO_UTS],'Province type '+p.TIPO_UTS);units.set('IT-P-'+p.COD_UTS,{level:2,parent:'IT-R-'+String(p.COD_REG).padStart(2,'0'),en:italianExonyms[p.DEN_UTS]||p.DEN_UTS,local:p.DEN_UTS,kind:italianTypes[p.TIPO_UTS],code:p.SIGLA});}
 // Comuni: full-detail ISTAT polygons, projected from UTM 32N and simplified together so neighbours share edges.
 const comuni=JSON.parse((await mapshaper.applyCommands('-i in.shp -proj wgs84 '+simplify+' -o out.json format=geojson precision=.000001',layer('Com01012026')))['out.json']);
 for(const f of comuni.features){const p=f.properties,id='IT-C-'+p.PRO_COM_T;assert(units.has('IT-P-'+p.COD_UTS),'Comune parent '+id);units.set(id,{level:3,parent:'IT-P-'+p.COD_UTS,en:italianExonyms[p.COMUNE]||p.COMUNE,local:p.COMUNE,kind:'Comune',...(p.COMUNE_A?{aliases:[p.COMUNE_A]}:{})});f.properties={id};}
 return {features:comuni.features,units};
}
const spanishCommunities={'01':'Andalusia','02':'Aragon','03':'Asturias','04':'Balearic Islands','05':'Canary Islands','06':'Cantabria','07':'Castile and León','08':'Castilla–La Mancha','09':'Catalonia','10':'Valencian Community','11':'Extremadura','12':'Galicia','13':'Community of Madrid','14':'Region of Murcia','15':'Navarre','16':'Basque Country','17':'La Rioja','18':'Ceuta','19':'Melilla','20':'Minor sovereign territories'};
const spanishProvinces={'07':'Balearic Islands','41':'Seville','48':'Biscay','31':'Navarre','01':'Álava','03':'Alicante','12':'Castellón','46':'Valencia','54':'Minor sovereign territories'};
// IGN jurisdictional boundaries (BDLJE, INSPIRE GML in EPSG:4258, latitude first).
// National codes are 34 + community + province + the five-digit INE municipal code.
function gmlUnits(text){
 return text.split('<wfs:member>').slice(1).map(member=>{
  const code=/<au:nationalCode>(\d+)<\/au:nationalCode>/.exec(member)[1],name=/<gn:text>([^<]*)<\/gn:text>/.exec(member)[1].trim(),condominium=!/<au:condominium[^>]*nil=/.test(member);
  const coordinates=[...member.matchAll(/<gml:Polygon\b[\s\S]*?<\/gml:Polygon>/g)].map(([polygon])=>[...polygon.matchAll(/<gml:posList[^>]*>([^<]*)<\/gml:posList>/g)].map(([,list])=>{const n=list.trim().split(/\s+/).map(Number),ring=[];for(let i=0;i<n.length;i+=2)ring.push([n[i+1],n[i]]);return ring;}));
  return {code,name,condominium,coordinates};
 });
}
async function loadSpain(){
 const files=unzipSync(fs.readFileSync(path.join(source,'ign-lineas-limite-gml.zip')),{filter:f=>/AdministrativeUnit_(2nd|3rd|4th)Order/.test(f.name)});
 const text=pattern=>Object.entries(files).filter(([n])=>pattern.test(n)).map(([,d])=>strFromU8(d)).join('');
 const units=new Map();
 for(const u of gmlUnits(text(/2ndOrder/))){const cc=u.code.slice(2,4);units.set('ES-A-'+cc,{level:1,parent:null,en:spanishCommunities[cc],local:u.name,kind:cc==='18'||cc==='19'?'Autonomous city':cc==='20'?'Territory under central administration':'Autonomous community'});}
 for(const u of gmlUnits(text(/3rdOrder/))){const cc=u.code.slice(2,4),pp=u.code.slice(4,6);units.set('ES-P-'+pp,{level:2,parent:'ES-A-'+cc,en:spanishProvinces[pp]||u.name,local:u.name,kind:cc==='18'||cc==='19'?'Autonomous city':cc==='20'?'Territory under central administration':'Province'});}
 // Municipal polygons go to disk as GeoJSON, then mapshaper simplifies them together.
 const file=path.join(source,'spain-municipalities.geojson'),out=fs.openSync(file,'w');fs.writeSync(out,'{"type":"FeatureCollection","features":[');
 let first=true;
 // The BDLJE lists Gibraltar among the territories outside any province, reflecting
 // Spain's claim; it is a British overseas territory and is not mapped as Spanish.
 const specialKinds={'54001':'Islet claimed by Spain and Morocco','54007':'Condominium with France (Pheasant Island)'};
 for(const u of gmlUnits(text(/4thOrder/))){
  if(u.code.endsWith('54006')){assert.equal(u.name,'Gibraltar');continue;}
  const pp=u.code.slice(4,6),ine=u.code.slice(6),id=(u.condominium||ine.startsWith('53')?'ES-T-':'ES-M-')+ine;
  assert(units.has('ES-P-'+pp),'Municipal parent '+u.code);assert(!units.has(id),'Unique unit '+id);
  units.set(id,{level:3,parent:'ES-P-'+pp,en:u.name,local:u.name,kind:specialKinds[ine]||(id.startsWith('ES-T-')?'Shared territory (condominium)':pp==='54'?'Territory under central administration':'Municipality')});
  fs.writeSync(out,(first?'':',')+JSON.stringify({type:'Feature',properties:{id},geometry:{type:'MultiPolygon',coordinates:u.coordinates}}));first=false;
 }
 fs.writeSync(out,']}');fs.closeSync(out);
 const simplified=JSON.parse((await mapshaper.applyCommands(`-i "${file}" ${simplify} -o out.json format=geojson precision=.000001`))['out.json']);
 return {features:simplified.features,units};
}
// Camera bounds frame the main territory; Spain's Canary Islands remain in the data.
const countries={
 'united-kingdom':{id:'GB',en:'United Kingdom',local:'',file:'gbr-countries-2024-bgc.geojson',camera:[[-8.7,49.85],[1.8,60.9]],coverage:'Great Britain and Northern Ireland with their islands: the four countries of the Office for National Statistics December 2024 boundaries, generalised to 20 m and clipped to the coastline. Crown Dependencies (Isle of Man, Jersey, Guernsey) and overseas territories are not part of the United Kingdom and are excluded.'},
 spain:{id:'ES',en:'Spain',local:'España',file:'ign-lineas-limite-gml.zip',load:loadSpain,levels:['Autonomous community','Province','Municipality'],bundled:2,camera:[[-9.4,35.9],[4.4,43.8]],coverage:'17 autonomous communities, the autonomous cities of Ceuta and Melilla, and the minor sovereign territories under central administration (Gibraltar, which the BDLJE lists among them as Spain claims it, is a British overseas territory and is excluded); 52 provinces; and every municipality plus the shared territories (condominiums) that several municipalities own jointly, from the Instituto Geográfico Nacional jurisdictional boundaries (BDLJE). Communities and provinces are dissolved from the municipalities. Llívia takes its shape from the matching enclave in the French outline.'},
 france:{id:'FR',en:'France',local:'',file:'fra-adm1.geojson',camera:[[-5.2,41.3],[9.6,51.1]],coverage:'Metropolitan France and Corsica, dissolved from the IGN regions published by geoBoundaries. Overseas regions are not yet included.'},
 italy:{id:'IT',en:'Italy',local:'Italia',file:'istat-limiti-2026.zip',load:loadItaly,levels:['Region','Province','Comune'],bundled:2,camera:[[6.6,35.5],[18.6,47.1]],coverage:"20 regions, 110 provinces and equivalent units (metropolitan cities, autonomous provinces, Sicily's free municipal consortia and Friuli-Venezia Giulia's former provinces) and 7,896 comuni, from ISTAT's full-detail boundaries for statistical purposes at 1 January 2026. Regions and provinces are dissolved from the comuni. San Marino and Vatican City remain enclaves."}
};
const outlines={},lowest={};
for(const [country,c] of Object.entries(countries)){
 if(c.load){const loaded=await c.load();c.units=loaded.units;lowest[country]=fc(loaded.features);}
 else{const outline=await command(fc(read(c.file).features.map(f=>({type:'Feature',properties:{},geometry:f.geometry}))),'-dissolve '+simplify);lowest[country]=fc([{type:'Feature',properties:{id:c.id},geometry:single(outline)}]);}
 outlines[country]=lowest[country].features.length===1?single(lowest[country]):single(await command(lowest[country],'-dissolve'));
 console.log(country,lowest[country].features.length,'units; outline polygons',outlines[country].coordinates.length,'holes',outlines[country].coordinates.reduce((s,p)=>s+p.length-1,0));
}
// France is the reference for its frontiers with Spain and Italy: their border
// edges within the Pyrenees and Alpine corridors move onto France's line, and any
// remaining overlap is erased, so each pair shares exactly one edge.
const inBox=(w,s,e,n)=>(a,b)=>[a,b].every(p=>p[0]>=w&&p[0]<=e&&p[1]>=s&&p[1]<=n);
const france={type:'Feature',properties:{},geometry:outlines.france};
// Spain's Llívia is the hole in France near Puigcerdà; use that ring exactly.
const inLlivia=poly=>{const b=bounds({type:'Polygon',coordinates:poly});return b[0][0]>1.9&&b[1][0]<2.05&&b[0][1]>42.42&&b[1][1]<42.5;};
const llivia=polygons(outlines.france).flatMap(p=>p.slice(1)).find(r=>inLlivia([r]));
assert(llivia,'France has the Llívia enclave hole');
// Llívia is set aside during alignment and returns with France's ring.
const lliviaOwner=lowest.spain.features.find(f=>polygons(f.geometry).some(inLlivia));assert(lliviaOwner,'Spain has Llívia');
const lliviaId=lliviaOwner.properties.id;
lliviaOwner.geometry={type:'MultiPolygon',coordinates:polygons(lliviaOwner.geometry).filter(p=>!inLlivia(p))};
if(!lliviaOwner.geometry.coordinates.length)lowest.spain.features=lowest.spain.features.filter(f=>f!==lliviaOwner);
const seamReports={};
for(const [country,allowed] of [['spain',inBox(-2,42.2,3.3,43.45)],['italy',inBox(6.5,43.7,7.8,46)]]){
 const result=alignCountry(lowest[country].features,france,allowed,3000);
 seamReports[country+'-france']=result.report;console.log('Aligned',country,'to France',result.report.changedEdges,'edges, max',Math.round(result.report.maxDisplacementMetres),'m');
 lowest[country]=await command(fc(result.features),'-erase france.json -clean',{'france.json':fc([france])});
}
const lliviaRing=[[...llivia].reverse()],lliviaUnit=lowest.spain.features.find(f=>f.properties.id===lliviaId);
if(lliviaUnit)lliviaUnit.geometry={type:'MultiPolygon',coordinates:[...polygons(lliviaUnit.geometry),lliviaRing]};else lowest.spain.features.push({type:'Feature',properties:{id:lliviaId},geometry:{type:'Polygon',coordinates:lliviaRing}});
for(const country of ['spain','italy'])outlines[country]=lowest[country].features.length===1?single(lowest[country]):single(await command(lowest[country],'-dissolve'));

// Land frontiers. An outline edge is a frontier when foreign land lies just beyond it:
// a point 100 m or 300 m outward falls inside a neighbouring country (another outline
// here, or a geoBoundaries outline used only for this test), and a Natural Earth 1:10m
// land boundary line passes within 4 km. Coastline has sea beyond it. Probing out to
// 600 m, and closing short gaps inland, tolerates neighbouring sources that sit apart.
const ne=read('ne-10m-land-boundaries.geojson').features.flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)).filter(line=>line.some(p=>p[0]>-20&&p[0]<25&&p[1]>25&&p[1]<62));
const grid=new Map(),cell=.05,reach=4000;
ne.forEach((line,l)=>{for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([l,i]);}}});
// Distance to the nearest Natural Earth boundary line.
function frontierDistance(p){
 let best=Infinity;
 for(const [l,i] of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){
  const line=ne[l],a=line[i-1],b=line[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1];
  const u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])]);
  best=Math.min(best,d);
 }
 return best;
}
// Even-odd point-in-polygon, with edges bucketed by 0.01° latitude rows.
function landIndex(rings){
 const rows=new Map(),row=.01,box=[Infinity,Infinity,-Infinity,-Infinity];
 for(const ring of rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];box[0]=Math.min(box[0],a[0]);box[1]=Math.min(box[1],a[1]);box[2]=Math.max(box[2],a[0]);box[3]=Math.max(box[3],a[1]);if(a[1]===b[1])continue;for(let y=Math.floor(Math.min(a[1],b[1])/row);y<=Math.floor(Math.max(a[1],b[1])/row);y++){if(!rows.has(y))rows.set(y,[]);rows.get(y).push([a,b]);}}
 return p=>{if(p[0]<box[0]||p[0]>box[2]||p[1]<box[1]||p[1]>box[3])return false;let inside=false;for(const [a,b] of rows.get(Math.floor(p[1]/row))||[])if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;return inside;};
}
const rings=geometry=>polygons(geometry).flat();
// The Moroccan, Monégasque and Slovenian outlines include territorial waters, so a probe
// inside them counts only within 200 m of an OpenStreetMap land border way.
const maritime=new Set(['mar-adm0','mco-adm0','svn-adm2']);
const landWays=[];
for(const name of fs.readdirSync(source).filter(n=>n.startsWith('osm-relation-'))){
 const elements=read(name).elements,nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]]));
 for(const way of elements.filter(e=>e.type==='way')){const t=way.tags||{};if(t.admin_level==='2'&&t.maritime!=='yes'&&t.natural!=='coastline')landWays.push(way.nodes.map(id=>nodes.get(id)));}
}
const wayEdges=[],wayGrid=new Map();
for(const way of landWays)for(let i=1;i<way.length;i++){const a=way[i-1],b=way[i],k=wayEdges.push([a,b])-1;for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const key=x+','+y;if(!wayGrid.has(key))wayGrid.set(key,[]);wayGrid.get(key).push(k);}}
function nearLandWay(p,limit=200){for(const k of wayGrid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=wayEdges[k],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));if(metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])])<=limit)return true;}return false;}
const neighbours=['prt-adm0','and-adm0','gib-adm0','mar-adm0','bel-adm2','lux-adm0','deu-adm0','che-adm0','mco-adm0','aut-adm0','svn-adm2','smr-adm0','vat-adm0','irl-adm1'].map(file=>({maritime:maritime.has(file),inside:landIndex(read('neighbour-'+file+'.geojson').features.flatMap(f=>rings(f.geometry)))}));
const atlasLand=Object.fromEntries(Object.entries(outlines).map(([country,g])=>[country,landIndex(rings(g))]));
const signedArea=ring=>ring.slice(1).reduce((s,p,i)=>s+ring[i][0]*p[1]-p[0]*ring[i][1],0);
function frontierPaths(country,exclude=()=>false){
 const foreign=[...neighbours,...Object.entries(atlasLand).filter(([c])=>c!==country).map(([,inside])=>({maritime:false,inside}))];
 const paths=[];
 for(const poly of polygons(outlines[country]))for(const [r,ring] of poly.entries()){
  const n=ring.length-1;if(n<3)continue;
  // Foreign side: outside an exterior ring, inside a hole.
  const side=(signedArea(ring)>0)===(r===0)?-1:1;
  const distance=ring.map(p=>frontierDistance(p)),onLandWay=ring.map(p=>nearLandWay(p));
  const flags=Array.from({length:n},(_,i)=>{
   const a=ring[i],b=ring[i+1];if(distance[i]>reach||distance[i+1]>reach)return false;
   const c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return false;
   const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],nx=-dy/len*side,ny=dx/len*side;
   const shoreSafe=onLandWay[i]&&onLandWay[i+1];
   return [100,300,600].some(d=>{const p=[m[0]+nx*d/111195/c,m[1]+ny*d/111195];return foreign.some(f=>(!f.maritime||shoreSafe)&&f.inside(p));});
  });
  if(!flags.some(Boolean))continue;
  // Close gaps of up to 3 km where neighbouring sources sit further apart or a river
  // meanders. A gap facing open sea (points 300 m, 600 m and 1.5 km beyond all belong
  // to no country, this one included) is coastline and stays open.
  const anyone=[...foreign.map(f=>f.inside),atlasLand[country]];
  const beyond=i=>{const a=ring[i],b=ring[i+1],c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return true;return [300,600,1500].some(d=>{const p=[(a[0]+b[0])/2-dy/len*side*d/111195/c,(a[1]+b[1])/2+dx/len*side*d/111195];return anyone.some(inside=>inside(p));});};
  const start=flags.indexOf(true);
  for(let k=1;k<=n;k++){
   const i=(start+k)%n;if(flags[i])continue;
   const span=[];let length=0,j=i;while(!flags[j]&&length<=3000){span.push(j);length+=metres(ring[j],ring[j+1]);j=(j+1)%n;}
   if(length<=3000&&span.every(beyond))span.forEach(t=>flags[t]=true);
   k+=span.length-1;
  }
  for(let i=0;i<n;i++)if(flags[i]&&exclude(ring[i],ring[i+1]))flags[i]=false;
  if(flags.every(Boolean)){paths.push(ring.slice());continue;}
  const first=flags.indexOf(false);let current=null;
  for(let k=1;k<=n;k++){const i=(first+k)%n;if(flags[i]){if(!current){current=[ring[i]];paths.push(current);}current.push(ring[i+1]);}else current=null;}
 }
 // Open pieces under 1 km are shoreline beside a frontier's end (a harbour mole, a lough
 // shore), not a frontier of their own; enclave rings are kept whatever their size.
 return paths.filter(p=>metres(p[0],p.at(-1))<1||p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0)>=1000);
}
// Shared frontiers with France belong to France, so each edge is drawn once.
const franceEdges=[];for(const poly of polygons(outlines.france))for(const ring of poly)for(let i=1;i<ring.length;i++)franceEdges.push([ring[i-1],ring[i]]);
const fGrid=new Map();franceEdges.forEach(([a,b],i)=>{for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){const k=x+','+y;if(!fGrid.has(k))fGrid.set(k,[]);fGrid.get(k).push(i);}});
function nearFrance(p){for(const i of fGrid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=franceEdges[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));if(metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])])<2)return true;}return false;}
const sharedWithFrance=(a,b)=>nearFrance(a)&&nearFrance(b)&&nearFrance([(a[0]+b[0])/2,(a[1]+b[1])/2]);

// Shared internal borders of a level, one line per pair of owners, each edge drawn once.
function borders(regions){const t=topology({regions}),owners=new Map(),groups=new Map();for(const f of t.objects.regions.geometries)for(const arc of new Set(f.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(arc))owners.set(arc,new Set());owners.get(arc).add(f.properties.id);}for(const [arc,ids]of owners){if(ids.size<2)continue;const list=[...ids].sort(),key=list.join('|');if(!groups.has(key))groups.set(key,{owners:list,arcs:[]});groups.get(key).arcs.push([arc]);}return visibleSegments(fc([...groups.values()].map(({owners,arcs})=>({type:'Feature',properties:{owners},geometry:mesh(t,{type:'MultiLineString',arcs})}))));}
const round=(v,d=5)=>Math.round(v*10**d)/10**d;
const manifest=read('manifest.json');
const processing='Polygons are simplified to about 33 m north-south, with neighbouring units sharing edges; parent units are dissolved from the most detailed level. Spanish and Italian frontier edges within 3 km of the French outline are moved onto it and overlap is erased, so shared frontiers coincide. An outline edge is a land frontier when a point 100, 300 or 600 m beyond it lies inside a neighbouring country and a Natural Earth 1:10m land boundary line passes within 4 km. The Moroccan, Monégasque and Slovenian outlines include territorial waters, so edges facing them must also lie within 200 m of an OpenStreetMap land border way. Gaps of up to 3 km between frontier edges are closed unless they face open sea, and open pieces under 1 km are dropped. Neighbouring outlines (geoBoundaries) and the OpenStreetMap ways are used only for this test; none of their geometry is published. Each shared frontier is stored once (France holds its frontiers with Spain and Italy). Coastlines are not outlined. Mapped areas are spherical polygon areas.';
for(const [country,c] of Object.entries(countries)){
 const geometry=outlines[country];
 fs.rmSync(out+'/'+country,{recursive:true,force:true});
 write(country,'context.bin',fc([{type:'Feature',properties:{country},geometry}]));
 const levels=c.levels||['Country'],maxLevel=levels.length,records=[],chunks={},counts={};
 const unit=id=>c.units?.get(id)||{level:1,parent:null,en:c.en,local:c.local||c.en,kind:'Country'};
 const ancestor=(id,level)=>{let u=id;while(unit(u).level>level)u=unit(u).parent;return u;};
 // Each level: the most detailed polygons, or their union per ancestor.
 const byLevel={};
 for(let level=maxLevel;level>=1;level--){
  const tagged=fc(lowest[country].features.map(f=>({type:'Feature',properties:{id:ancestor(f.properties.id,level)},geometry:f.geometry})));
  byLevel[level]=level===maxLevel?tagged:await command(tagged,'-dissolve id');
 }
 for(let level=1;level<=maxLevel;level++){
  const regions=byLevel[level],points=await command(regions,'-points inner'),areas=await command(regions,'-each "areaKm2=$.area/1000000"');
  counts[level]=regions.features.length;
  regions.features.forEach((f,i)=>{const id=f.properties.id,u=unit(id);records.push({id,parent:u.parent,level,en:u.en,local:u.local,kind:u.kind,...(u.aliases?{aliases:u.aliases}:{}),...(u.code?{code:u.code}:{}),center:points.features[i].geometry.coordinates.map(v=>round(v)),bounds:c.units?bounds(f.geometry).map(p=>p.map(v=>round(v))):c.camera,areaKm2:(a=>a<1?Math.round(a*1e4)/1e4:Math.round(a*100)/100)(areas.features[i].properties.areaKm2)});});
 }
 const payload=regions=>({regions:fc(regions.features.map(f=>({type:'Feature',properties:{id:f.properties.id},geometry:f.geometry}))),boundaries:borders(regions)});
 write(country,'first.bin',payload(byLevel[1]));
 if((c.bundled||1)>1)write(country,'all.bin',{levels:Array.from({length:c.bundled},(_,i)=>({level:i+1,...payload(byLevel[i+1])}))});
 for(let level=2;level<=maxLevel;level++)for(const parent of byLevel[level-1].features){
  const id=parent.properties.id,children=fc(byLevel[level].features.filter(f=>ancestor(f.properties.id,level-1)===id));
  if(!children.features.length)continue;
  const file=(level===2?'second/':'third/')+id+'.bin',data=payload(children);
  chunks[id]={file,count:children.features.length,level,bytes:write(country,file,data),decodedBytes:Buffer.byteLength(JSON.stringify(data))};
 }
 write(country,'catalogue.bin',{records,chunks,counts,levels});
 const paths=frontierPaths(country,country==='spain'||country==='italy'?sharedWithFrance:()=>false);
 const length=paths.reduce((s,p)=>s+p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0),0);
 write(country,'international.bin',lineData(fc(paths.map(coordinates=>({type:'Feature',properties:{countries:[country]},geometry:{type:'LineString',coordinates}})))));
 const files=[c.file,'ne-10m-land-boundaries.geojson',...Object.keys(manifest.files).filter(n=>n.startsWith('neighbour-')||n.startsWith('osm-relation-'))];
 fs.writeFileSync(out+'/'+country+'/sources.json',JSON.stringify({retrieved:manifest.retrieved,counts,coverage:c.coverage,processing,frontierKm:Math.round(length/1000),seamReports:Object.fromEntries(Object.entries(seamReports).filter(([k])=>k.includes(country))),sources:files.map(n=>({file:n,...manifest.files[n]}))},null,2)+'\n');
 console.log(country,counts,'chunks',Object.keys(chunks).length,'; land frontier',Math.round(length/1000),'km in',paths.length,'paths');
}
console.log('Europe build complete.');
