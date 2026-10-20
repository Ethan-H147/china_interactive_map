import '../dist/countries.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {lineData,visibleSegments} from '../dist/adaptive-lines.mjs';
import {alignCountry,polygons} from './international-topology.mjs';
import {withoutRetraced} from './channel-lines.mjs';
import {readTerritory,coastLand,relationArea} from './europe-overseas.mjs';
const AdmZip=createRequire(import.meta.url)('adm-zip');
const require=createRequire(import.meta.url);
const mapshaper=require('mapshaper');
const source=path.resolve(process.argv[2]||'artifacts/europe-source'),out='dist/data/europe';
const read=n=>JSON.parse(fs.readFileSync(path.join(source,n))),fc=features=>({type:'FeatureCollection',features});
async function command(data,commands,files={}){const result=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson precision=.000001',{'input.json':JSON.stringify(data),...Object.fromEntries(Object.entries(files).map(([k,v])=>[k,JSON.stringify(v)]))}))['result.json']);return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));}
function bounds(g){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
function write(country,name,data){const dir=out+'/'+country;fs.mkdirSync(path.dirname(dir+'/'+name),{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(dir+'/'+name,bytes);return bytes.length;}
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
// Area in km² (planar, scaled at each ring's latitude).
const area=g=>polygons(g).reduce((s,poly)=>s+poly.reduce((t,ring,r)=>{const c=Math.cos(ring[0][1]*Math.PI/180);const a=Math.abs(ring.slice(1).reduce((u,p,i)=>u+ring[i][0]*p[1]-p[0]*ring[i][1],0))/2*c*111.195**2;return t+(r?-a:a);},0),0);
// A territory's land: OpenStreetMap coastline (or other land, given) clipped to its boundary
// relation, which includes territorial waters.
async function osmLand(name,land){
 const t=readTerritory(source,name),area=relationArea(t.relation,name),coast=land||coastLand(t.coastline,name);
 const clipped=await command(fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:coast}}]),'-clip clip.json',{'clip.json':fc([{type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:area}}])});
 const geometry=clipped.features.find(f=>f.geometry)?.geometry;assert(geometry,name+' has land');return geometry;
}
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
let gibraltar;
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
 // Spain's claim; it is a British overseas territory and is not mapped as Spanish. Its
 // outline is simplified with Spain's municipalities, so the frontier matches exactly, and
 // then goes to the United Kingdom.
 const specialKinds={'54001':'Islet claimed by Spain and Morocco','54007':'Condominium with France (Pheasant Island)'};
 for(const u of gmlUnits(text(/4thOrder/))){
  if(u.code.endsWith('54006')){assert.equal(u.name,'Gibraltar');fs.writeSync(out,(first?'':',')+JSON.stringify({type:'Feature',properties:{id:'GB-O-GI'},geometry:{type:'MultiPolygon',coordinates:u.coordinates}}));first=false;continue;}
  const pp=u.code.slice(4,6),ine=u.code.slice(6),id=(u.condominium||ine.startsWith('53')?'ES-T-':'ES-M-')+ine;
  assert(units.has('ES-P-'+pp),'Municipal parent '+u.code);assert(!units.has(id),'Unique unit '+id);
  units.set(id,{level:3,parent:'ES-P-'+pp,en:u.name,local:u.name,kind:specialKinds[ine]||(id.startsWith('ES-T-')?'Shared territory (condominium)':pp==='54'?'Territory under central administration':'Municipality')});
  fs.writeSync(out,(first?'':',')+JSON.stringify({type:'Feature',properties:{id},geometry:{type:'MultiPolygon',coordinates:u.coordinates}}));first=false;
 }
 fs.writeSync(out,']}');fs.closeSync(out);
 const simplified=JSON.parse((await mapshaper.applyCommands(`-i "${file}" ${simplify} -o out.json format=geojson precision=.000001`))['out.json']);
 gibraltar=simplified.features.find(f=>f.properties.id==='GB-O-GI');assert(gibraltar,'Gibraltar outline');
 return {features:simplified.features.filter(f=>f!==gibraltar),units};
}
const frenchRegions={'11':'Île-de-France','24':'Centre-Val de Loire','27':'Bourgogne-Franche-Comté','28':'Normandy','32':'Hauts-de-France','44':'Grand Est','52':'Pays de la Loire','53':'Brittany','75':'Nouvelle-Aquitaine','76':'Occitania','84':'Auvergne-Rhône-Alpes','93':"Provence-Alpes-Côte d'Azur",'94':'Corsica'};
// Overseas regions (each a single overseas department) and their departments' English names.
const frenchOverseasRegions={'01':'Guadeloupe','02':'Martinique','03':'French Guiana','04':'Réunion','06':'Mayotte'};
const frenchOverseasDepartements={'971':'Guadeloupe','972':'Martinique','973':'French Guiana','974':'Réunion','976':'Mayotte'};
// Overseas collectivities: their communes are their second level (Wallis and Futuna's three
// are chiefdom districts); Saint-Barthélemy and Saint-Martin are each a single former commune.
const frenchCollectivities={'975':['Saint Pierre and Miquelon','Saint-Pierre-et-Miquelon','Overseas collectivity'],'977':['Saint Barthélemy','Saint-Barthélemy','Overseas collectivity'],'978':['Saint Martin','Saint-Martin','Overseas collectivity'],'986':['Wallis and Futuna','Wallis-et-Futuna','Overseas collectivity'],'987':['French Polynesia','Polynésie française','Overseas collectivity'],'988':['New Caledonia','Nouvelle-Calédonie','Sui generis collectivity']};
// The French Southern Lands' four island districts (Adélie Land, an Antarctic claim, is not
// mapped) and Clipperton, from OpenStreetMap.
const frenchSouthernDistricts=[['FR-T-KER','Kerguelen Islands','Îles Kerguelen','kerguelen'],['FR-T-CRO','Crozet Islands','Îles Crozet','crozet'],['FR-T-SPA','Saint Paul and Amsterdam Islands','Îles Saint-Paul et Amsterdam','saint-paul-amsterdam'],['FR-T-EPA','Scattered Islands','Îles Éparses','scattered-islands']];
// France: IGN commune outlines from geo.api.gouv.fr, one file per département or collectivity.
async function loadFrance(){
 const units=new Map();
 for(const r of read('france-regions.json')){
  if(frenchRegions[r.code])units.set('FR-R-'+r.code,{level:1,parent:null,en:frenchRegions[r.code],local:r.nom,kind:r.code==='94'?'Territorial collectivity':'Region'});
  else if(frenchOverseasRegions[r.code])units.set('FR-R-'+r.code,{level:1,parent:null,en:frenchOverseasRegions[r.code],local:r.nom,kind:'Overseas region',overseas:true});
 }
 const departements=read('france-departements.json').filter(d=>units.has('FR-R-'+d.codeRegion));
 for(const d of departements)units.set('FR-D-'+d.code,{level:2,parent:'FR-R-'+d.codeRegion,en:frenchOverseasDepartements[d.code]||d.nom,local:d.nom,kind:frenchOverseasDepartements[d.code]?'Overseas department':'Department',code:d.code});
 assert.equal(units.size,18+101,'13 metropolitan and 5 overseas regions, 101 départements');
 const file=path.join(source,'france-communes.geojson'),out=fs.openSync(file,'w');fs.writeSync(out,'{"type":"FeatureCollection","features":[');
 let first=true;const put=(id,geometry)=>{fs.writeSync(out,(first?'':',')+JSON.stringify({type:'Feature',properties:{id},geometry}));first=false;};
 for(const d of departements)for(const f of read('france-communes-'+d.code+'.geojson').features){
  const p=f.properties,id='FR-C-'+p.code;assert.equal(p.codeDepartement,d.code,'Commune département '+id);assert(!units.has(id),'Unique commune '+id);
  units.set(id,{level:3,parent:'FR-D-'+d.code,en:p.nom,local:p.nom,kind:'Commune'});
  put(id,f.geometry);
 }
 for(const [code,[en,local,kind]] of Object.entries(frenchCollectivities)){
  const region='FR-R-'+code,communes=read('france-communes-'+code+'.geojson').features;
  units.set(region,{level:1,parent:null,en,local,kind,overseas:true,code});
  if(communes.length===1){put(region,communes[0].geometry);continue;}
  for(const f of communes){const id='FR-C-'+f.properties.code;assert(!units.has(id),'Unique commune '+id);units.set(id,{level:2,parent:region,en:f.properties.nom,local:f.properties.nom,kind:code==='986'?'District (chiefdom)':'Commune'});put(id,f.geometry);}
 }
 units.set('FR-R-984',{level:1,parent:null,en:'French Southern and Antarctic Lands',local:'Terres australes et antarctiques françaises',kind:'Overseas territory',overseas:true});
 for(const [id,en,local,name] of frenchSouthernDistricts){units.set(id,{level:2,parent:'FR-R-984',en,local,kind:'District'});put(id,await osmLand(name));}
 units.set('FR-R-989',{level:1,parent:null,en:'Clipperton Island',local:'Île de Clipperton',kind:'State-owned island',overseas:true});
 put('FR-R-989',await osmLand('clipperton'));
 fs.writeSync(out,']}');fs.closeSync(out);
 const simplified=JSON.parse((await mapshaper.applyCommands(`-i "${file}" ${simplify} -o out.json format=geojson precision=.000001`))['out.json']);
 return {features:simplified.features,units};
}
// United Kingdom: ONS local authority districts (December 2024, generalised to 20 m),
// grouped into counties and unitary authorities and the 12 ITL1 nations and regions.
// Single-tier authorities (unitaries, metropolitan and London boroughs, Welsh, Scottish
// and Northern Irish councils) are level-2 units with no districts below them.
const ukRegions={TLC:'North East',TLD:'North West',TLE:'Yorkshire and The Humber',TLF:'East Midlands',TLG:'West Midlands',TLH:'East of England',TLI:'London',TLJ:'South East',TLK:'South West',TLL:'Wales',TLM:'Scotland',TLN:'Northern Ireland'};
const ukKinds={E10:'County',E06:'Unitary authority',E08:'Metropolitan borough',E09:'London borough',W06:'Principal area',S12:'Council area',N09:'Local government district'};
const ukOverseasTerritories=[['GB-O-AI','Anguilla','anguilla'],['GB-O-BM','Bermuda','bermuda'],['GB-O-IO','British Indian Ocean Territory','british-indian-ocean-territory'],['GB-O-VG','British Virgin Islands','british-virgin-islands'],['GB-O-KY','Cayman Islands','cayman-islands'],['GB-O-FK','Falkland Islands','falkland-islands'],['GB-O-MS','Montserrat','montserrat'],['GB-O-PN','Pitcairn Islands','pitcairn-islands'],['GB-O-GS','South Georgia and the South Sandwich Islands','south-georgia'],['GB-O-TC','Turks and Caicos Islands','turks-and-caicos']];
async function loadUK(){
 const lad=read('ons-lad-dec-2024-bgc.geojson'),ctyua=read('ons-ctyua-dec-2024-bgc.geojson'),itl=read('ons-itl1-jan-2025-bgc.geojson');
 const joined=await command(fc(lad.features.map(f=>({type:'Feature',properties:{LAD:f.properties.LAD24CD,NM:f.properties.LAD24NM,NMW:f.properties.LAD24NMW||''},geometry:f.geometry}))),'-join ctyua.json fields=CTYUA24CD largest-overlap -join itl.json fields=ITL125CD largest-overlap',{'ctyua.json':ctyua,'itl.json':itl});
 const units=new Map(),counties=new Map(ctyua.features.map(f=>[f.properties.CTYUA24CD,f.properties]));
 for(const f of itl.features){const code=f.properties.ITL125CD;assert(ukRegions[code],'ITL1 '+code);units.set('GB-R-'+code,{level:1,parent:null,en:ukRegions[code],local:ukRegions[code],kind:['TLL','TLM','TLN'].includes(code)?'Nation':'Region'});}
 const features=[];
 for(const f of joined.features){
  // A district whose code is itself a county or unitary code is that unit; only the
  // English two-tier districts (E07) take their county by overlap.
  const p=f.properties;if(counties.has(p.LAD))p.CTYUA24CD=p.LAD;else assert(p.LAD.startsWith('E07'),'Two-tier district '+p.LAD);
  const county=counties.get(p.CTYUA24CD);assert(county&&p.ITL125CD&&(p.LAD===p.CTYUA24CD||p.CTYUA24CD.startsWith('E10')),'Parents of '+p.LAD);
  const cid='GB-C-'+p.CTYUA24CD,kind=ukKinds[p.CTYUA24CD.slice(0,3)];assert(kind,'Kind of '+p.CTYUA24CD);
  if(!units.has(cid))units.set(cid,{level:2,parent:'GB-R-'+p.ITL125CD,en:county.CTYUA24NM,local:county.CTYUA24NMW||county.CTYUA24NM,kind:p.CTYUA24CD==='E09000001'?'City of London':kind,code:p.CTYUA24CD});
  const id=p.LAD===p.CTYUA24CD?cid:'GB-D-'+p.LAD;
  if(id!==cid)units.set(id,{level:3,parent:cid,en:p.NM,local:p.NMW||p.NM,kind:'District',code:p.LAD});
  features.push({type:'Feature',properties:{id},geometry:f.geometry});
 }
 // British Overseas Territories and Crown Dependencies, from OpenStreetMap. Gibraltar joins
 // after Spain is loaded (its outline is the hole in Spain's), and the Sovereign Base Areas
 // take Cyprus's coastline.
 const territory=(id,en,kind,extra={})=>units.set(id,{level:1,parent:null,en,local:en,kind,overseas:true,...extra});
 for(const [id,en,name] of ukOverseasTerritories){territory(id,en,'British Overseas Territory',id==='GB-O-FK'?{claimedBy:'argentina'}:{});features.push({type:'Feature',properties:{id},geometry:await osmLand(name)});}
 territory('GB-O-SH','Saint Helena, Ascension and Tristan da Cunha','British Overseas Territory');
 for(const [id,en,name] of [['GB-O-SH-HL','Saint Helena','saint-helena'],['GB-O-SH-AC','Ascension Island','ascension'],['GB-O-SH-TA','Tristan da Cunha','tristan-da-cunha']]){units.set(id,{level:2,parent:'GB-O-SH',en,local:en,kind:'Constituent part'});features.push({type:'Feature',properties:{id},geometry:await osmLand(name)});}
 const cyprus=coastLand(read('osm-coastline-cyprus.json').elements,'Cyprus');
 territory('GB-O-SBA','Akrotiri and Dhekelia','British Overseas Territory',{aliases:['Sovereign Base Areas']});
 for(const [id,en,name] of [['GB-O-SBA-A','Akrotiri','akrotiri'],['GB-O-SBA-D','Dhekelia','dhekelia']]){units.set(id,{level:2,parent:'GB-O-SBA',en,local:en,kind:'Sovereign Base Area'});features.push({type:'Feature',properties:{id},geometry:await osmLand(name,cyprus)});}
 territory('GB-X-JE','Jersey','Crown Dependency');features.push({type:'Feature',properties:{id:'GB-X-JE'},geometry:await osmLand('jersey')});
 territory('GB-X-IM','Isle of Man','Crown Dependency');features.push({type:'Feature',properties:{id:'GB-X-IM'},geometry:await osmLand('isle-of-man')});
 // The Bailiwick of Guernsey: Alderney and Sark (with Brecqhou) are set apart from Guernsey,
 // which keeps Herm, Jethou and Lihou.
 territory('GB-X-GG','Bailiwick of Guernsey','Crown Dependency');
 // Alderney's and Sark's relations follow their coasts; their land comes from the Bailiwick's coastline.
 const bailiwick=coastLand(readTerritory(source,'guernsey').coastline,'Guernsey');
 const alderney=await osmLand('alderney',bailiwick),sark=await osmLand('sark',bailiwick);
 const guernsey=(await command(fc([{type:'Feature',properties:{},geometry:await osmLand('guernsey')}]),'-erase parts.json',{'parts.json':fc([alderney,sark].map(geometry=>({type:'Feature',properties:{},geometry})))})).features[0].geometry;
 for(const [id,en,geometry] of [['GB-X-GG-G','Guernsey',guernsey],['GB-X-GG-A','Alderney',alderney],['GB-X-GG-S','Sark',sark]]){units.set(id,{level:2,parent:'GB-X-GG',en,local:en,kind:'Island'});features.push({type:'Feature',properties:{id},geometry});}
 return {features:(await command(fc(features),simplify)).features,units};
}
// Camera bounds frame the main territory; Spain's Canary Islands remain in the data.
// Iceland: IS 50V municipalities, parts merged by municipal number. The eight regions
// (landshlutar) hold the municipalities whose number starts with their digit, as Statistics
// Iceland groups them (the capital region takes 0 and 1); region ids follow ISO 3166-2:IS.
const icelandRegions={1:['Capital Region','Höfuðborgarsvæðið'],2:['Southern Peninsula','Suðurnes'],3:['West','Vesturland'],4:['Westfjords','Vestfirðir'],5:['Northwest','Norðurland vestra'],6:['Northeast','Norðurland eystra'],7:['East','Austurland'],8:['South','Suðurland']};
const icelandExonyms={'Reykjavíkurborg':'Reykjavík','Kópavogsbær':'Kópavogur','Hafnarfjarðarkaupstaður':'Hafnarfjörður','Akureyrarbær':'Akureyri','Akraneskaupstaður':'Akranes','Vestmannaeyjabær':'Vestmannaeyjar','Bolungarvíkurkaupstaður':'Bolungarvík','Seltjarnarnesbær':'Seltjarnarnes','Grindavíkurbær':'Grindavík','Hveragerðisbær':'Hveragerði','Grundarfjarðarbær':'Grundarfjörður'};
async function loadIceland(){
 const raw=read('isl-sveitarfelog-is50v.geojson');
 const merged=await command(fc(raw.features.map(f=>({type:'Feature',properties:{code:String(f.properties.nrsveitarfelags).padStart(4,'0'),name:f.properties.sveitarfelag},geometry:f.geometry}))),'-dissolve code copy-fields=name '+simplify);
 const units=new Map(Object.entries(icelandRegions).map(([digit,[en,local]])=>['IS-R-'+digit,{level:1,parent:null,en,local,kind:'Region'}]));
 for(const f of merged.features){
  const {code,name}=f.properties,region=code[0]==='0'?'1':code[0];assert(icelandRegions[region],'Iceland region for '+code);
  units.set('IS-M-'+code,{level:2,parent:'IS-R-'+region,en:icelandExonyms[name]||name.replace(/^Sveitarfélagið /,''),local:name,kind:'Municipality'});f.properties={id:'IS-M-'+code};
 }
 assert.equal(merged.features.length,61,'Iceland has 61 municipalities');
 return {features:merged.features,units};
}
// Turkey: the 81 provinces and 973 districts of the General Command of Mapping (HGM), via OCHA.
// Provinces carry ISO 3166-2:TR (licence-plate) codes, from the P-codes (TUR001 is plate 01); the
// 12 statistical regions (İBBS level 1, NUTS 1) group the provinces as TÜİK does. Names are the
// Turkish ones; ASCII forms stay searchable. HGM's Turkish names lose the dotless ı and write İ
// as i with a combining dot, so each is spelled as OpenStreetMap's Turkish name that differs from it
// only in dots and accents (two districts OpenStreetMap lacks are spelled here).
const turkishSpellings=(()=>{const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/ı/g,'i').toLowerCase(),names=JSON.parse(fs.readFileSync('scripts/statistics-sources/europe/turkey-names-osm.json')).names.concat('Nazımiye','Sarıkaya'),byFold=new Map(names.map(n=>[fold(n),n]));return name=>byFold.get(fold(name))||name.replace(/i̇/g,'i');})();
const turkishRegions={TR1:['İstanbul','İstanbul'],TR2:['West Marmara','Batı Marmara'],TR3:['Aegean','Ege'],TR4:['East Marmara','Doğu Marmara'],TR5:['West Anatolia','Batı Anadolu'],TR6:['Mediterranean','Akdeniz'],TR7:['Central Anatolia','Orta Anadolu'],TR8:['West Black Sea','Batı Karadeniz'],TR9:['East Black Sea','Doğu Karadeniz'],TRA:['Northeast Anatolia','Kuzeydoğu Anadolu'],TRB:['Central East Anatolia','Ortadoğu Anadolu'],TRC:['Southeast Anatolia','Güneydoğu Anadolu']};
const turkishProvinceRegions={TR1:['34'],TR2:['10','17','22','39','59'],TR3:['03','09','20','35','43','45','48','64'],TR4:['11','14','16','26','41','54','77','81'],TR5:['06','42','70'],TR6:['01','07','15','31','32','33','46','80'],TR7:['38','40','50','51','58','66','68','71'],TR8:['05','18','19','37','55','57','60','67','74','78'],TR9:['08','28','29','52','53','61'],TRA:['04','24','25','36','69','75','76'],TRB:['12','13','23','30','44','49','62','65'],TRC:['02','21','27','47','56','63','72','73','79']};
async function loadTurkey(){
 const files=unzipSync(fs.readFileSync(path.join(source,'tur-hgm-admin-boundaries.geojson.zip'))),layer=name=>JSON.parse(strFromU8(files[Object.keys(files).find(k=>k.endsWith(name))]));
 const regionOf=new Map(Object.entries(turkishProvinceRegions).flatMap(([region,codes])=>codes.map(code=>[code,region])));
 assert.equal(regionOf.size,81,'Every Turkish province has a statistical region');
 const units=new Map(Object.entries(turkishRegions).map(([code,[en,local]])=>['TR-R-'+code,{level:1,parent:null,en,local,kind:'Statistical region'}]));
 const plate=pcode=>pcode.slice(4,6);
 for(const f of layer('tur_admin1.geojson').features){const p=f.properties,code=plate(p.adm1_pcode);assert(regionOf.has(code),'Province '+p.adm1_pcode);units.set('TR-P-'+code,{level:2,parent:'TR-R-'+regionOf.get(code),en:turkishSpellings(p.adm1_name1),local:turkishSpellings(p.adm1_name1),kind:'Province',code,...(p.adm1_name!==turkishSpellings(p.adm1_name1)?{aliases:[p.adm1_name]}:{})});}
 const districts=layer('tur_admin2.geojson').features.map(f=>{const p=f.properties,id='TR-D-'+p.adm2_pcode.slice(3);assert(units.has('TR-P-'+plate(p.adm1_pcode)),'District parent '+id);units.set(id,{level:3,parent:'TR-P-'+plate(p.adm1_pcode),en:turkishSpellings(p.adm2_name1),local:turkishSpellings(p.adm2_name1),kind:/ Merkez$/.test(p.adm2_name1)?'Central district':'District',...(p.adm2_name!==turkishSpellings(p.adm2_name1)?{aliases:[p.adm2_name]}:{})});return {type:'Feature',properties:{id},geometry:f.geometry};});
 assert.equal(districts.length,973,'Turkey has 973 districts');
 const simplified=await command(fc(districts),simplify);
 return {features:simplified.features,units};
}
// India: the 36 states and union territories (geoBoundaries' copy of DataMeet's map, which
// follows the Election Commission), with India's official boundaries. Ids are the current
// ISO 3166-2:IN codes; names are English, with Hindi beside them.
const indianNames={AN:['Andaman and Nicobar Islands','अंडमान और निकोबार द्वीपसमूह'],AP:['Andhra Pradesh','आन्ध्र प्रदेश'],AR:['Arunachal Pradesh','अरुणाचल प्रदेश'],AS:['Assam','असम'],BR:['Bihar','बिहार'],CH:['Chandigarh','चण्डीगढ़'],CG:['Chhattisgarh','छत्तीसगढ़'],DH:['Dadra and Nagar Haveli and Daman and Diu','दादरा और नगर हवेली और दमन और दीव'],DL:['Delhi','दिल्ली'],GA:['Goa','गोवा'],GJ:['Gujarat','गुजरात'],HP:['Himachal Pradesh','हिमाचल प्रदेश'],HR:['Haryana','हरियाणा'],JH:['Jharkhand','झारखण्ड'],JK:['Jammu and Kashmir','जम्मू और कश्मीर'],KA:['Karnataka','कर्नाटक'],KL:['Kerala','केरल'],LA:['Ladakh','लद्दाख'],LD:['Lakshadweep','लक्षद्वीप'],MH:['Maharashtra','महाराष्ट्र'],ML:['Meghalaya','मेघालय'],MN:['Manipur','मणिपुर'],MP:['Madhya Pradesh','मध्य प्रदेश'],MZ:['Mizoram','मिज़ोरम'],NL:['Nagaland','नागालैण्ड'],OD:['Odisha','ओडिशा'],PB:['Punjab','पंजाब'],PY:['Puducherry','पुडुचेरी'],RJ:['Rajasthan','राजस्थान'],SK:['Sikkim','सिक्किम'],TS:['Telangana','तेलंगाना'],TN:['Tamil Nadu','तमिल नाडु'],TR:['Tripura','त्रिपुरा'],UP:['Uttar Pradesh','उत्तर प्रदेश'],UK:['Uttarakhand','उत्तराखण्ड'],WB:['West Bengal','पश्चिम बंगाल']};
const indianUnionTerritories=new Set(['AN','CH','DH','DL','JK','LA','LD','PY']);
// geoBoundaries keeps four codes ISO 3166-2:IN has since changed.
const indianCodes={OR:'OD',CT:'CG',UT:'UK',TG:'TS'};
async function loadIndia(){
 const units=new Map(),features=read('ind-adm1.geojson').features.map(f=>{
  const code=f.properties.shapeISO.slice(3),current=indianCodes[code]||code,[en,local]=indianNames[current]||[];assert(en,'Indian state '+code);
  const plain=f.properties.shapeName.normalize('NFD').replace(/\p{M}/gu,'');
  units.set('IN-'+current,{level:1,parent:null,en,local,kind:indianUnionTerritories.has(current)?'Union territory':'State',code:current,...(plain!==en?{aliases:[plain]}:{})});
  return {type:'Feature',properties:{id:'IN-'+current},geometry:f.geometry};
 });
 // The map shows 2011, before the 2015 land boundary agreement: West Bengal's enclaves inside
 // Bangladesh (every separate part under 10 km² around Cooch Behar) became Bangladeshi, so they
 // are dropped.
 const westBengal=features.find(f=>f.properties.id==='IN-WB'),parts=polygons(westBengal.geometry);
 const enclave=poly=>{const ring=poly[0],c=[ring.reduce((s,p)=>s+p[0],0)/ring.length,ring.reduce((s,p)=>s+p[1],0)/ring.length];return c[0]>88.5&&c[0]<89.9&&c[1]>25.8&&c[1]<26.6&&area({type:'Polygon',coordinates:[ring]})<10;};
 westBengal.geometry={type:'MultiPolygon',coordinates:parts.filter(p=>!enclave(p))};
 console.log('India: dropped',parts.length-westBengal.geometry.coordinates.length,'former enclaves in Bangladesh');
 assert.equal(units.size,36,'India has 28 states and 8 union territories');
 return {features:(await command(fc(features),simplify)).features,units};
}
// Chile: the 345 communes of the Library of the National Congress (BCN), via geoBoundaries,
// with Chile's official codes (CUT) from OCHA's table, matched by name; Chile's Antarctic
// Territory (the commune of Antártica) is not mapped. Provinces and regions are dissolved from
// the communes by code. OCHA's table and geoBoundaries both name Pozo Almonte (01401) Tocopilla;
// the one in Tarapacá is Pozo Almonte.
const chileanRegions={'01':['Tarapacá','Tarapacá'],'02':['Antofagasta','Antofagasta'],'03':['Atacama','Atacama'],'04':['Coquimbo','Coquimbo'],'05':['Valparaíso','Valparaíso'],'06':["O'Higgins","Libertador General Bernardo O'Higgins"],'07':['Maule','Maule'],'08':['Biobío','Biobío'],'09':['Araucanía','La Araucanía'],'10':['Los Lagos','Los Lagos'],'11':['Aysén','Aysén del General Carlos Ibáñez del Campo'],'12':['Magallanes','Magallanes y de la Antártica Chilena'],'13':['Santiago Metropolitan Region','Región Metropolitana de Santiago'],'14':['Los Ríos','Los Ríos'],'15':['Arica and Parinacota','Arica y Parinacota'],'16':['Ñuble','Ñuble']};
const plainName=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z]/g,'');
async function loadChile(){
 const {readXlsx}=await import('./read-xlsx.mjs'),table=readXlsx(path.join(source,'chl-ocha-tabular.xlsx'));
 const units=new Map(Object.entries(chileanRegions).map(([code,[en,local]])=>['CL-R-'+code,{level:1,parent:null,en,local,kind:code==='13'?'Metropolitan region':'Region',code}]));
 for(const r of table.ADM2.slice(1)){const code=r[1].slice(2);units.set('CL-P-'+code,{level:2,parent:'CL-R-'+code.slice(0,2),en:r[0],local:r[0],kind:'Province',code});}
 const communes=new Map();for(const r of table.ADM3.slice(1)){const code=r[1].slice(2),name=code==='01401'?'Pozo Almonte':r[0];communes.set(plainName(name),{code,name});}
 const features=read('chl-adm3.geojson').features.map(f=>{
  let key=plainName(f.properties.shapeName);
  if(key==='tocopilla'&&bounds(f.geometry)[1][1]>-21)key='pozoalmonte';
  const c=communes.get(key);assert(c,'Chilean commune '+f.properties.shapeName);communes.delete(key);
  units.set('CL-C-'+c.code,{level:3,parent:'CL-P-'+c.code.slice(0,3),en:c.name,local:c.name,kind:'Commune',code:c.code});
  return {type:'Feature',properties:{id:'CL-C-'+c.code},geometry:f.geometry};
 });
 assert.equal(features.length,345,'Chile has 346 communes, Antártica unmapped');
 return {features:(await command(fc(features),simplify)).features,units};
}
// Peru: IGN's 25 first-level units (24 departments and Callao), 196 provinces and 1,873
// districts (July 2020). IGN's names drop accents, so names are OpenStreetMap's Spanish ones for
// the same UBIGEO codes where it has them (scripts/statistics-sources/europe/peru-osm-2025.json).
// IGN keeps Mazamari and Pangoa (Junín) as one area, 120699, whose limits are undefined.
async function loadPeru(){
 const zip=new AdmZip(path.join(source,'per-ign-admin-boundaries.geojson.zip')),layer=name=>JSON.parse(zip.readAsText(name)).features;
 const osm=JSON.parse(fs.readFileSync('scripts/statistics-sources/europe/peru-osm-2025.json')).units,name=(code,fallback)=>osm[code]?.name||fallback;
 const units=new Map();
 for(const {properties:p} of layer('per_admin1.geojson')){const code=p.adm1_pcode.slice(2);units.set('PE-R-'+code,{level:1,parent:null,en:name(code,p.adm1_name),local:name(code,p.adm1_name),kind:code==='07'?'Constitutional province':'Department',code});}
 for(const {properties:p} of layer('per_admin2.geojson')){const code=p.adm2_pcode.slice(2);units.set('PE-P-'+code,{level:2,parent:'PE-R-'+code.slice(0,2),en:name(code,p.adm2_name),local:name(code,p.adm2_name),kind:'Province',code});}
 const features=layer('per_admin3.geojson').map(f=>{const p=f.properties,code=p.adm3_pcode.slice(2),n=code==='120699'?'Mazamari y Pangoa':name(code,p.adm3_name);assert(units.has('PE-P-'+code.slice(0,4)),'Peruvian district parent '+code);units.set('PE-D-'+code,{level:3,parent:'PE-P-'+code.slice(0,4),en:n,local:n,kind:'District',code,...(plainName(n)!==plainName(p.adm3_name)||n!==p.adm3_name?{aliases:[p.adm3_name]}:{})});return {type:'Feature',properties:{id:'PE-D-'+code},geometry:f.geometry};});
 assert.equal(features.length,1873,'IGN maps 1,873 districts');
 return {features:(await command(fc(features),simplify)).features,units};
}
// Paraguay: INE's 17 departments and Asunción, and 263 districts (July 2026).
async function loadParaguay(){
 const zip=new AdmZip(path.join(source,'pry-ine-admin-boundaries.geojson.zip')),layer=name=>JSON.parse(zip.readAsText(name)).features;
 const units=new Map();
 for(const {properties:p} of layer('pry_admin1.geojson')){const code=p.adm1_pcode.slice(2);units.set('PY-D-'+code,{level:1,parent:null,en:p.adm1_name,local:p.adm1_name,kind:code==='00'?'Capital district':'Department',code});}
 const features=layer('pry_admin2.geojson').map(f=>{const p=f.properties,code=p.adm2_pcode.slice(2);units.set('PY-T-'+code,{level:2,parent:'PY-D-'+code.slice(0,2),en:p.adm2_name,local:p.adm2_name,kind:code==='0000'?'Capital district':'District',code});return {type:'Feature',properties:{id:'PY-T-'+code},geometry:f.geometry};});
 assert.equal(features.length,263,'Paraguay has 263 districts');
 return {features:(await command(fc(features),simplify)).features,units};
}
const countries={
 'united-kingdom':{id:'GB',en:'United Kingdom',local:'',file:'ons-lad-dec-2024-bgc.geojson',load:loadUK,levels:['Nation or region','County or unitary authority','District'],bundled:3,camera:[[-8.7,49.85],[1.8,60.9]],coverage:'The 12 ITL1 nations and regions, 218 counties and unitary authorities (including metropolitan and London boroughs and the Welsh, Scottish and Northern Irish councils) and the 164 districts of the English two-tier counties, from the Office for National Statistics December 2024 local authority boundaries, generalised to 20 m and clipped to the coastline. Counties and regions are dissolved from the districts; single-tier authorities have no districts below them. Crown Dependencies (Isle of Man, Jersey, Guernsey) and overseas territories are not part of the United Kingdom and are excluded.'},
 spain:{id:'ES',en:'Spain',local:'España',file:'ign-lineas-limite-gml.zip',load:loadSpain,levels:['Autonomous community','Province','Municipality'],bundled:2,camera:[[-9.4,35.9],[4.4,43.8]],coverage:'17 autonomous communities, the autonomous cities of Ceuta and Melilla, and the minor sovereign territories under central administration (Gibraltar, which the BDLJE lists among them as Spain claims it, is a British overseas territory and is excluded); 52 provinces; and every municipality plus the shared territories (condominiums) that several municipalities own jointly, from the Instituto Geográfico Nacional jurisdictional boundaries (BDLJE). Communities and provinces are dissolved from the municipalities. Llívia takes its shape from the matching enclave in the French outline.'},
 france:{id:'FR',en:'France',local:'',file:'france-communes-*.geojson',load:loadFrance,levels:['Region','Department','Commune'],bundled:2,camera:[[-5.2,41.3],[9.6,51.1]],coverage:'The 13 regions of metropolitan France (including the territorial collectivity of Corsica), its 96 départements and every commune, from IGN ADMIN EXPRESS outlines published by geo.api.gouv.fr. Regions and départements are dissolved from the communes. Overseas regions are not yet included.'},
 iceland:{id:'IS',en:'Iceland',local:'Ísland',file:'isl-sveitarfelog-is50v.geojson',load:loadIceland,levels:['Region','Municipality'],bundled:2,camera:[[-24.6,63.2],[-13.4,66.6]],coverage:'The eight regions (landshlutar) and 61 municipalities (sveitarfélög), from the IS 50V municipal boundaries of the Icelandic Institute of Natural History (formerly the National Land Survey), land only. Regions group the municipalities by their municipal number, as Statistics Iceland does, and are dissolved from them.'},
 turkey:{id:'TR',en:'Turkey',local:'Türkiye',file:'tur-hgm-admin-boundaries.geojson.zip',load:loadTurkey,levels:['Statistical region','Province','District'],bundled:2,camera:[[25.6,35.8],[44.9,42.2]],coverage:'The 12 statistical regions (İBBS level 1), 81 provinces and 973 districts, from the General Command of Mapping (HGM) boundaries published by OCHA (valid from 1 January 2022, January 2026 edition). Provinces and regions are dissolved from the districts; regions group the provinces as TÜİK does.'},
 india:{id:'IN',en:'India',local:'भारत',file:'ind-adm1.geojson',load:loadIndia,levels:['State or union territory'],camera:[[68,6.5],[97.5,37.1]],coverage:"India's 28 states and 8 union territories, from geoBoundaries' copy of the DataMeet map (after the Election Commission of India), with India's official boundaries. Where they meet China's outline, India's edges are moved onto it, and land between the two goes to India; the areas both countries claim are drawn by whichever country's map is open."},
 chile:{id:'CL',en:'Chile',local:'',file:'chl-adm3.geojson',load:loadChile,levels:['Region','Province','Commune'],bundled:2,camera:[[-76,-56],[-66.4,-17.5]],coverage:"Chile's 16 regions, 56 provinces and 345 communes, from the Library of the National Congress (BCN) commune boundaries via geoBoundaries, with Chile's official codes (CUT). Chilean Antarctic Territory (the commune of Antártica) is not mapped. Provinces and regions are dissolved from the communes. Chile's edges within 3 km of Argentina's outline are moved onto it; where the two claim the same land (the undemarcated Southern Patagonian Ice Field), each country's map draws its own claim."},
 paraguay:{id:'PY',en:'Paraguay',local:'',file:'pry-ine-admin-boundaries.geojson.zip',load:loadParaguay,levels:['Department','District'],bundled:2,camera:[[-62.7,-27.7],[-54.2,-19.2]],coverage:"Paraguay's 17 departments and Asunción, and 263 districts, from the National Statistics Institute (INE) boundaries published by OCHA (July 2026). Departments are dissolved from the districts; edges within 3 km of Argentina's and Brazil's outlines are moved onto them."},
 peru:{id:'PE',en:'Peru',local:'Perú',file:'per-ign-admin-boundaries.geojson.zip',load:loadPeru,levels:['Department','Province','District'],bundled:2,camera:[[-81.4,-18.4],[-68.6,-0.03]],coverage:"Peru's 24 departments and the Constitutional Province of Callao, 196 provinces and 1,873 districts, from the National Geographic Institute (IGN) boundaries published by OCHA (July 2020; 19 districts created since are within their former districts). Spanish names follow OpenStreetMap for the same UBIGEO codes. Edges within 3 km of Brazil's and Chile's outlines are moved onto them."},
 italy:{id:'IT',en:'Italy',local:'Italia',file:'istat-limiti-2026.zip',load:loadItaly,levels:['Region','Province','Comune'],bundled:2,camera:[[6.6,35.5],[18.6,47.1]],coverage:"20 regions, 110 provinces and equivalent units (metropolitan cities, autonomous provinces, Sicily's free municipal consortia and Friuli-Venezia Giulia's former provinces) and 7,896 comuni, from ISTAT's full-detail boundaries for statistical purposes at 1 January 2026. Regions and provinces are dissolved from the comuni. San Marino and Vatican City remain enclaves."}
};
// ONLY=india (comma-separated) builds just those countries while developing; the full build
// needs every country (Spain's and Italy's frontiers align to France's).
const only=process.env.ONLY?.split(',');
if(only)for(const country of Object.keys(countries))if(!only.includes(country))delete countries[country];
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
const seamReports={};
if(!only){
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
for(const [country,allowed] of [['spain',inBox(-2,42.2,3.3,43.45)],['italy',inBox(6.5,43.7,7.8,46)]]){
 const result=alignCountry(lowest[country].features,france,allowed,3000);
 seamReports[country+'-france']=result.report;console.log('Aligned',country,'to France',result.report.changedEdges,'edges, max',Math.round(result.report.maxDisplacementMetres),'m');
 lowest[country]=await command(fc(result.features),'-erase france.json -clean',{'france.json':fc([france])});
}
const lliviaRing=[[...llivia].reverse()],lliviaUnit=lowest.spain.features.find(f=>f.properties.id===lliviaId);
if(lliviaUnit)lliviaUnit.geometry={type:'MultiPolygon',coordinates:[...polygons(lliviaUnit.geometry),lliviaRing]};else lowest.spain.features.push({type:'Feature',properties:{id:lliviaId},geometry:{type:'Polygon',coordinates:lliviaRing}});
for(const country of ['spain','italy'])outlines[country]=lowest[country].features.length===1?single(lowest[country]):single(await command(lowest[country],'-dissolve'));
// Gibraltar joins the United Kingdom once Spain is loaded.
countries['united-kingdom'].units.set('GB-O-GI',{level:1,parent:null,en:'Gibraltar',local:'Gibraltar',kind:'British Overseas Territory',overseas:true});
lowest['united-kingdom'].features.push(gibraltar);
outlines['united-kingdom']=single(await command(lowest['united-kingdom'],'-dissolve'));
}

// Countries that meet atlas countries drawn outside this build (China's map, South America's)
// take those outlines as the reference for their shared frontier. Edges within 3 km of a
// reference move onto it, and land left enclosed between the two goes to the nearest unit, so the
// frontier is one line. Where both claim the same land (India and China: Aksai Chin, the Shaksgam
// valley, Arunachal Pradesh / South Tibet; Chile and Argentina: the undemarcated stretch of the
// Southern Patagonian Ice Field), each map draws its own claim: the country's portal carries the
// overlap as separate shapes (claimedBy), hidden while the reference country's map is open, and
// its frontier lines inside the reference outline are tagged the same way. Land the two enclose
// (Nepal, Bhutan) and the other land neighbours (geoBoundaries outlines cut by the drawn ones, land
// between the sources going to the nearest neighbour) are drawn beneath the country at this
// precision, since the world map's 1:110m silhouettes cannot meet these outlines.
const referenceOutline=geometry=>({type:'Feature',properties:{},geometry});
// China's displayed provinces (china-context.bin, its simplified portal, sits up to 300 m off them).
const chinaOutline=single(await command(fc((await import('./read-data.mjs')).readData('display-boundaries.json').provinces.features.map(f=>({type:'Feature',properties:{},geometry:f.geometry}))),'-dissolve -clean'));
const southAmerica=JSON.parse(gunzipSync(fs.readFileSync('dist/data/flight-context.bin'))).features;
const southAmericanOutline=country=>single(fc(southAmerica.filter(f=>f.properties.country===country)));
const references={china:chinaOutline,argentina:southAmericanOutline('argentina'),brazil:southAmericanOutline('brazil')};
const reconciled={};
async function reconcile(country,{align,edge,holes=[],neighbours=[],administered=async()=>[]}){
 if(!lowest[country])return;
 const refs=align.map(([name])=>({name,feature:referenceOutline(references[name]||outlines[name])}));
 let features=lowest[country].features;
 for(const [name,allowed] of align){
  const result=alignCountry(features,referenceOutline(references[name]||outlines[name]),allowed,3000);features=result.features;
  seamReports[country+'-'+name]=result.report;console.log('Aligned',country,'to',name,result.report.changedEdges,'edges, max',Math.round(result.report.maxDisplacementMetres),'m');
 }
 const box={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[edge[0],edge[1]],[edge[2],edge[1]],[edge[2],edge[3]],[edge[0],edge[3]],[edge[0],edge[1]]]]}};
 const onEdge=g=>polygons(g).flat(2).some(p=>[0,2].some(i=>Math.abs(p[0]-edge[i])<1e-6)||[1,3].some(i=>Math.abs(p[1]-edge[i])<1e-6));
 const inside=(f,p)=>landIndex(polygons(f.geometry).flat())(p),pieces=g=>g.features.filter(f=>f.geometry&&polygons(f.geometry)[0]?.[0]?.length);
 const units=(await command(fc(features),'-clean')).features;
 const enclosed=pieces(await command(fc([box]),'-erase land.json -explode',{'land.json':fc([...units,...refs.map(r=>r.feature)])})).filter(f=>!onEdge(f.geometry));
 const holeShapes=holes.map(([name,p])=>{const f=enclosed.find(f=>inside(f,p));assert(f,name+' lies between '+country+' and its references');return {type:'Feature',properties:{country:name},geometry:f.geometry};});
 // Other enclosed land touching the country is a gap between the sources; each goes to the unit
 // nearest it. Holes inside a reference that do not touch the country (China's outline, dissolved
 // from its provinces, keeps specks where they do not quite meet) are left alone.
 const ownVertices=new Set(units.flatMap(f=>polygons(f.geometry).flat(2).map(p=>p[0].toFixed(5)+','+p[1].toFixed(5))));
 const gaps=enclosed.filter(f=>!holeShapes.some(h=>h.geometry===f.geometry)&&polygons(f.geometry).flat(2).some(p=>ownVertices.has(p[0].toFixed(5)+','+p[1].toFixed(5))));
 assert(gaps.every(f=>area(f.geometry)<1000),'Only slivers lie between '+country+' and its references: '+gaps.filter(f=>area(f.geometry)>=1000).map(f=>Math.round(area(f.geometry))+' km² at '+polygons(f.geometry)[0][0][0].map(v=>v.toFixed(2))).join('; '));
 const vertices=units.map(f=>({id:f.properties.id,points:polygons(f.geometry).flat(2)}));
 const nearest=p=>{let best=null,d=Infinity;for(const v of vertices)for(const q of v.points){const m=metres(p,q);if(m<d){d=m;best=v.id;}}return best;};
 lowest[country]=await command(fc([...units,...gaps.map(f=>({type:'Feature',properties:{id:nearest(polygons(f.geometry)[0][0][0])},geometry:f.geometry}))]),'-dissolve2 id -clean');
 outlines[country]=single(await command(lowest[country],'-dissolve'));
 console.log(country+': filled',gaps.length,'gaps of',Math.round(gaps.reduce((s,f)=>s+area(f.geometry),0)),'km²');
 // Where the country overlaps a reference, pieces of 20 km² or more are claims both make, carried by
 // the portal while another country is open; smaller ones are slivers between the sources, which
 // the units give up, so the country's own map meets the reference's edge exactly too.
 const claims=[],slivers=[];
 for(const r of refs){
  const overlap=pieces(await command(fc([{type:'Feature',properties:{},geometry:outlines[country]}]),'-clip ref.json -explode',{'ref.json':fc([r.feature])}));
  claims.push(...overlap.filter(f=>area(f.geometry)>=20).map(f=>({type:'Feature',properties:{country,claimedBy:r.name},geometry:f.geometry})));slivers.push(...overlap.filter(f=>area(f.geometry)<20));
  console.log(country+': claims shared with',r.name,overlap.filter(f=>area(f.geometry)>=20).map(f=>Math.round(area(f.geometry))+' km²').join(', ')||'none','; slivers',overlap.filter(f=>area(f.geometry)<20).length);
 }
 if(slivers.length){lowest[country]=fc(pieces(await command(lowest[country],'-erase slivers.json -clean',{'slivers.json':fc(slivers)})));outlines[country]=single(await command(lowest[country],'-dissolve'));}
 const own=fc([{type:'Feature',properties:{},geometry:outlines[country]}]);
 const outside=await administered(own);
 // Normalize the dissolved polygon topology before clipping it. After sliver removal,
 // clipping Chile's uncleaned outline can drop its mainland while retaining the islands.
 const home=pieces(await command(own,'-clean -erase cut.json -clean',{'cut.json':fc([...refs.map(r=>r.feature),...outside])}));
 if(country==='chile')for(const p of [[-70.31,-18.48],[-70.65,-33.45],[-70.91,-53.16]])assert(home.some(f=>inside(f,p)),'Chile portal retains mainland at '+p);
 // Other land neighbours: the drawn outlines win where they overlap, except that a neighbour keeps
 // land it administers that the country claims (keepClaimed), which the country's map covers.
 const others=[];
 for(const [iso,name,keepClaimed] of neighbours){
  const cut=[...refs.map(r=>r.feature),...(keepClaimed?home:own.features)];
  const g=(await command(fc(read('neighbour-'+iso+'-adm0.geojson').features.map(f=>({type:'Feature',properties:{country:name},geometry:f.geometry}))),'-clip box.json -erase cut.json -dissolve country -clean',{'box.json':fc([box]),'cut.json':fc(cut)})).features.find(f=>f.geometry);
  if(g)others.push(g);
 }
 const drawn=[...holeShapes,...others],loose=pieces(await command(fc([box]),'-erase land.json -explode',{'land.json':fc([...lowest[country].features,...refs.map(r=>r.feature),...drawn])})).filter(f=>!onEdge(f.geometry));
 const neighbourPoints=drawn.map(f=>({country:f.properties.country,points:polygons(f.geometry).flat(2).filter((p,i)=>i%4===0)}));
 const nearestNeighbour=p=>{let best=null,d=Infinity;for(const v of neighbourPoints)for(const q of v.points){const m=metres(p,q);if(m<d){d=m;best=v.country;}}return best;};
 const byCountry=new Map(drawn.map(f=>[f.properties.country,[f]]));
 if(drawn.length)for(const f of loose)byCountry.get(nearestNeighbour(polygons(f.geometry)[0][0][0])).push(f);
 const neighbourShapes=[];
 for(const [name,list] of byCountry)neighbourShapes.push(...(await command(fc(list.map(f=>({type:'Feature',properties:{country:name},geometry:f.geometry}))),'-dissolve2 country -clean')).features.filter(f=>f.geometry));
 console.log(country+' neighbours:',neighbourShapes.map(f=>f.properties.country).join(', ')||'none','; filled',drawn.length?loose.length:0,'gaps');
 reconciled[country]={context:[{type:'Feature',properties:{country},geometry:single(fc(home))},...claims],neighbours:neighbourShapes.filter(f=>!globalThis.AtlasCountries.countries[f.properties.country]),references:refs.map(r=>r.name)};
}
// India: the Kashmir that Pakistan administers is left out of its portal too, so other maps
// show it as Pakistan's; India's own map covers it with India's claim.
await reconcile('india',{align:[['china',inBox(72,26,98.5,37.5)]],edge:[66,5,100,38],holes:[['nepal',[85.32,27.7]],['bhutan',[89.64,27.47]]],neighbours:[['pak','pakistan',true],['afg','afghanistan',true],['bgd','bangladesh'],['mmr','myanmar']],administered:async own=>{
 const pakistan=(await command(own,'-clip pakistan.json -explode',{'pakistan.json':fc(read('ne-10m-countries.geojson').features.filter(f=>f.properties.ADM0_A3==='PAK'))})).features.filter(f=>f.geometry&&area(f.geometry)>=1000);
 assert.equal(pakistan.length,1,'Pakistan administers one part of Kashmir');return pakistan;
}});
// South America: Chile meets Argentina, Paraguay meets Argentina and Brazil, and Peru meets
// Brazil and Chile (Chile reconciled first).
await reconcile('chile',{align:[['argentina',inBox(-76,-56,-66,-17)]],edge:[-80,-57,-62,-16],neighbours:[['bol','bolivia']]});
await reconcile('paraguay',{align:[['argentina',inBox(-63,-28,-54,-19)],['brazil',inBox(-63,-28,-54,-19)]],edge:[-64,-29,-53,-18],neighbours:[['bol','bolivia']]});
await reconcile('peru',{align:[['brazil',inBox(-75,-12,-68,-4)],['chile',inBox(-71,-18.6,-69.4,-17)]],edge:[-83,-20,-67,2],neighbours:[['bol','bolivia'],['ecu','ecuador'],['col','colombia']]});

// Land frontiers. An outline edge is a frontier when foreign land lies just beyond it:
// a point 100 m or 300 m outward falls inside a neighbouring country (another outline
// here, or a geoBoundaries outline used only for this test), and a Natural Earth 1:10m
// land boundary line passes within 4 km. Coastline has sea beyond it. Probing out to
// 600 m, and closing short gaps inland, tolerates neighbouring sources that sit apart.
// Europe, and the overseas land frontiers: French Guiana, Saint-Martin and Cyprus.
// Turkey's frontiers run from the Evros (26°E) to Iran (44.8°E).
const frontierBoxes=[[-20,25,25,62],[-56,1.5,-51,6.5],[-82,-57,-50,2],[-63.3,17.9,-62.9,18.2],[32,34.4,34.8,35.4],[25.5,35.5,45,42.2]];
const ne=read('ne-10m-land-boundaries.geojson').features.flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)).filter(line=>line.some(p=>frontierBoxes.some(([w,s,e,n])=>p[0]>w&&p[0]<e&&p[1]>s&&p[1]<n)));
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
const maritime=new Set(['mar-adm0','mco-adm0','svn-adm2','sxm-osm']);
const landWays=[];
for(const name of fs.readdirSync(source).filter(n=>n.startsWith('osm-relation-'))){
 const elements=read(name).elements,nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]]));
 for(const way of elements.filter(e=>e.type==='way')){const t=way.tags||{};if(t.admin_level==='2'&&t.maritime!=='yes'&&t.natural!=='coastline')landWays.push(way.nodes.map(id=>nodes.get(id)));}
}
const wayEdges=[],wayGrid=new Map();
for(const way of landWays)for(let i=1;i<way.length;i++){const a=way[i-1],b=way[i],k=wayEdges.push([a,b])-1;for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const key=x+','+y;if(!wayGrid.has(key))wayGrid.set(key,[]);wayGrid.get(key).push(k);}}
function nearLandWay(p,limit=200){for(const k of wayGrid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=wayEdges[k],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));if(metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])])<=limit)return true;}return false;}
const neighbours=['prt-adm0','and-adm0','gib-adm0','mar-adm0','bel-adm2','lux-adm0','deu-adm0','che-adm0','mco-adm0','aut-adm0','svn-adm2','smr-adm0','vat-adm0','irl-adm1','sur-adm0','bra-adm0','cyp-adm0','grc-adm0','bgr-adm0','geo-adm0','arm-adm0','aze-adm0','irn-adm1','irq-adm2','syr-adm0','pak-adm0','afg-adm0','npl-adm0','btn-adm0','bgd-adm0','mmr-adm0'].map(file=>({file,maritime:maritime.has(file),inside:landIndex(read('neighbour-'+file+'.geojson').features.flatMap(f=>rings(f.geometry)))}));
// Sint Maarten has no geoBoundaries outline: its OpenStreetMap relation (with territorial waters).
{const elements=read('osm-relation-1231790.json').elements,nodes=new Map(elements.filter(e=>e.type==='node').map(e=>[e.id,{lon:e.lon,lat:e.lat}])),ways=new Map(elements.filter(e=>e.type==='way').map(e=>[e.id,e.nodes.map(id=>nodes.get(id))]));
 const relation=elements.find(e=>e.type==='relation'&&e.id===1231790);
 const area=relationArea({members:relation.members.map(m=>({...m,geometry:ways.get(m.ref)}))},'Sint Maarten');
 neighbours.push({maritime:maritime.has('sxm-osm'),inside:landIndex(area.flat())});}
// The reference outlines count as foreign land, and, because some neighbours' geoBoundaries outlines
// are coarse (Bangladesh, Bhutan, Ecuador, Colombia), so do Natural Earth's countries around each
// reconciled country, its own excepted.
neighbours.push(...Object.values(references).map(g=>({maritime:false,inside:landIndex(rings(g))})));
const naturalEarth=read('ne-10m-countries.geojson').features;
for(const [country,iso,[w,south,e,n]] of [['india','IND',[60,0,100,40]],['chile','CHL',[-82,-57,-60,-15]],['peru','PER',[-84,-21,-66,3]],['paraguay','PRY',[-65,-30,-52,-17]]])neighbours.push({maritime:false,only:country,inside:landIndex(naturalEarth.filter(f=>f.properties.ADM0_A3!==iso&&(b=>b[0][0]<e&&b[1][0]>w&&b[0][1]<n&&b[1][1]>south)(bounds(f.geometry))).flatMap(f=>rings(f.geometry)))});
const atlasLand=Object.fromEntries(Object.entries(outlines).map(([country,g])=>[country,landIndex(rings(g))]));
const signedArea=ring=>ring.slice(1).reduce((s,p,i)=>s+ring[i][0]*p[1]-p[0]*ring[i][1],0);
function frontierPaths(country,exclude=()=>false){
 // geoBoundaries' Gibraltar is a neighbour of Spain, and the United Kingdom's own territory.
 const foreign=[...neighbours.filter(n=>!(country==='united-kingdom'&&n.file==='gib-adm0')&&(!n.only||n.only===country)),...Object.entries(atlasLand).filter(([c])=>c!==country).map(([,inside])=>({maritime:false,inside}))];
 const paths=[];
 for(const poly of polygons(outlines[country]))for(const [r,ring] of poly.entries()){
  const n=ring.length-1;if(n<3)continue;
  // Foreign side: outside an exterior ring, inside a hole.
  const side=(signedArea(ring)>0)===(r===0)?-1:1;
  const distance=ring.map(p=>frontierDistance(p)),onLandWay=ring.map(p=>nearLandWay(p));
  // French Guiana's river frontiers are up to 2 km wide and its tripoints lie in forest far
  // from any source line, so rings in the Americas probe further and close longer inland gaps;
  // so does Turkey, whose eastern neighbours' outlines are coarse (Iraq's, Iran's, Syria's).
  const wide=ring.some(p=>p[0]<-30)||country==='turkey'||country==='india',gap=wide?8000:3000;
  const flags=Array.from({length:n},(_,i)=>{
   // India's frontier follows its claims, which Natural Earth's lines do not.
   const a=ring[i],b=ring[i+1],limit=country==='india'?Infinity:wide?10000:reach;if(distance[i]>limit||distance[i+1]>limit)return false;
   const c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return false;
   const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],nx=-dy/len*side,ny=dx/len*side;
   const shoreSafe=onLandWay[i]&&onLandWay[i+1];
   return (wide?[100,300,600,1000,1500,2500]:[100,300,600]).some(d=>{const p=[m[0]+nx*d/111195/c,m[1]+ny*d/111195];return foreign.some(f=>(!f.maritime||shoreSafe)&&f.inside(p));});
  });
  // Paraguay is landlocked: every edge is a frontier (those its references draw are left out below).
  if(country==='paraguay')flags.fill(true);
  if(!flags.some(Boolean))continue;
  // Close gaps of up to 3 km where neighbouring sources sit further apart or a river
  // meanders. A gap facing open sea (points 300 m, 600 m and 1.5 km beyond all belong
  // to no country, this one included) is coastline and stays open.
  const anyone=[...foreign.map(f=>f.inside),atlasLand[country]];
  const beyond=i=>{const a=ring[i],b=ring[i+1],c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return true;return (wide?[300,600,1500,3000,5000]:[300,600,1500]).some(d=>{const p=[(a[0]+b[0])/2-dy/len*side*d/111195/c,(a[1]+b[1])/2+dx/len*side*d/111195];return anyone.some(inside=>inside(p));});};
  const start=flags.indexOf(true);
  for(let k=1;k<=n;k++){
   const i=(start+k)%n;if(flags[i])continue;
   const span=[];let length=0,j=i;while(!flags[j]&&length<=gap){span.push(j);length+=metres(ring[j],ring[j+1]);j=(j+1)%n;}
   // Turkey's neighbours' sources do not quite meet at tripoints and border rivers (Iraq–Iran,
   // Armenia), leaving slivers that belong to no one; its frontier reaches the sea only at its four
   // ends, so breaks of up to 1.5 km between frontier pieces close regardless.
   // Peru's frontier, too, reaches the sea only at its ends; its river frontiers with Colombia and
   // Bolivia leave breaks of up to 5 km where the sources follow different banks.
   if(length<=gap&&(span.every(beyond)||country==='turkey'&&length<=1500||country==='peru'&&length<=5000))span.forEach(t=>flags[t]=true);
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
// A frontier shared with France belongs to France, and Gibraltar's to Spain, so each edge is
// drawn once.
function sharedWith(geometry){
 const edges=[];for(const poly of polygons(geometry))for(const ring of poly)for(let i=1;i<ring.length;i++)edges.push([ring[i-1],ring[i]]);
 const grid=new Map();edges.forEach(([a,b],i)=>{for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}});
 const near=p=>{for(const i of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=edges[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));if(metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])])<2)return true;}return false;};
 return (a,b)=>near(a)&&near(b)&&near([(a[0]+b[0])/2,(a[1]+b[1])/2]);
}
const sharedWithFrance=outlines.france?sharedWith(outlines.france):()=>false;
// A reconciled country's references draw their frontier with it (China's with India, Argentina's
// with Chile), so its shared edges are left out; its frontier inside a reference's outline is its
// claim, shown only while that country's map is closed.
const referenceShapes=country=>(reconciled[country]?.references||[]).map(name=>({name,geometry:references[name]||outlines[name]}));
const sharedWithReferences=country=>{const tests=referenceShapes(country).map(r=>sharedWith(r.geometry));return (a,b)=>tests.some(t=>t(a,b));};
// A claim line also says whether it is the line of actual control: where the claim area it bounds is
// mostly the country's own by Natural Earth's de facto boundaries (India holds Arunachal Pradesh),
// its claim line is the one third countries' maps draw; otherwise (China holds Aksai Chin) the line
// is contested, shown only on its claimants' maps. Returns '', the reference's name, or name|contested.
const naturalIso={india:'IND',chile:'CHL',paraguay:'PRY',peru:'PER'};
// Who holds a claim area: the country holding most of it by Natural Earth's de facto boundaries.
function heldBy(geometry,inside){const b=bounds(geometry),contains=landIndex(polygons(geometry).flat());let yes=0,all=0;for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){const p=[b[0][0]+(b[1][0]-b[0][0])*i/20,b[0][1]+(b[1][1]-b[0][1])*j/20];if(!contains(p))continue;all++;if(inside(p))yes++;}return all?yes/all>.5:false;}
function claimOf(country){
 const tests=referenceShapes(country).map(r=>({name:r.name,inside:landIndex(rings(r.geometry))})),mine=landIndex(rings(outlines[country]));
 const held=landIndex(naturalEarth.filter(f=>f.properties.ADM0_A3===naturalIso[country]).flatMap(f=>rings(f.geometry)));
 const areas=(reconciled[country]?.context||[]).filter(f=>f.properties.claimedBy).map(f=>({inside:landIndex(polygons(f.geometry).flat()),mine:heldBy(f.geometry,held)}));
 return (a,b)=>{const c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return '';const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],at=d=>[1,-1].map(side=>[m[0]-dy/len*side*d/111195/c,m[1]+dx/len*side*d/111195]),sides=at(100);
  const t=tests.find(t=>sides.every(p=>t.inside(p)));if(!t)return '';
  const claimed=at(300).find(p=>mine(p)),area=claimed&&areas.find(k=>k.inside(claimed));return area?.mine?t.name:t.name+'|contested';};
}
// Gibraltar's one land frontier is the fence, which Spain draws; its marina and harbour coasts
// face La Línea across water, so the United Kingdom draws no frontier there.
const inGibraltar=(a,b)=>[a,b].every(p=>p[0]>-5.4&&p[0]<-5.3&&p[1]>36.1&&p[1]<36.16);

// Shared internal borders of a level, one line per pair of owners, each edge drawn once.
function borders(regions){const t=topology({regions}),owners=new Map(),groups=new Map();for(const f of t.objects.regions.geometries)for(const arc of new Set(f.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(arc))owners.set(arc,new Set());owners.get(arc).add(f.properties.id);}for(const [arc,ids]of owners){if(ids.size<2)continue;const list=[...ids].sort(),key=list.join('|');if(!groups.has(key))groups.set(key,{owners:list,arcs:[]});groups.get(key).arcs.push([arc]);}return visibleSegments(fc([...groups.values()].map(({owners,arcs})=>({type:'Feature',properties:{owners},geometry:mesh(t,{type:'MultiLineString',arcs})}))));}
const round=(v,d=5)=>Math.round(v*10**d)/10**d;
const manifest=read('manifest.json');
const processing='Polygons are simplified to about 33 m north-south, with neighbouring units sharing edges; parent units are dissolved from the most detailed level. Spanish and Italian frontier edges within 3 km of the French outline are moved onto it and overlap is erased, so shared frontiers coincide. An outline edge is a land frontier when a point 100, 300 or 600 m beyond it lies inside a neighbouring country and a Natural Earth 1:10m land boundary line passes within 4 km. The Moroccan, Monégasque and Slovenian outlines include territorial waters, so edges facing them must also lie within 200 m of an OpenStreetMap land border way. Gaps of up to 3 km between frontier edges are closed unless they face open sea, and open pieces under 1 km are dropped. Neighbouring outlines (geoBoundaries) and the OpenStreetMap ways are used only for this test; none of their geometry is published. Each shared frontier is stored once (France holds its frontiers with Spain and Italy). Coastlines are not outlined. Mapped areas are spherical polygon areas.';
for(const [country,c] of Object.entries(countries)){
 const geometry=outlines[country];
 fs.rmSync(out+'/'+country,{recursive:true,force:true});
 const levels=c.levels||['Country'],maxLevel=levels.length,records=[],chunks={},counts={};
 const unit=id=>c.units?.get(id)||{level:1,parent:null,en:c.en,local:c.local||c.en,kind:'Country'};
 const ancestor=(id,level)=>{let u=id;while(unit(u).level>level)u=unit(u).parent;return u;};
 // Each level: the most detailed polygons, or their union per ancestor.
 const byLevel={};
 for(let level=maxLevel;level>=1;level--){
  const tagged=fc(lowest[country].features.filter(f=>unit(f.properties.id).level>=level).map(f=>({type:'Feature',properties:{id:ancestor(f.properties.id,level)},geometry:f.geometry})));
  byLevel[level]=level===maxLevel?tagged:await command(tagged,'-dissolve id');
 }
 // The portal shown while another country is open: the home territory as one shape, and each
 // overseas territory as its own, carrying its id and bounds so a click opens it directly.
 // A territory another atlas country draws as its own claim (the Falklands, in Argentina's
 // map) carries that country, and is hidden while its map is open.
 // French Guiana's land neighbours, drawn beneath France: all of Suriname and Brazil's north as
 // far as Amapá's coast, their land from geoBoundaries and their frontier exactly France's (IGN), since the
 // world map's 1:110m silhouettes cannot meet the detailed outline. Land between those
 // outlines and Guiana's (the sources differ by up to a few kilometres) goes to the nearer
 // neighbour; open water reaching the edge of the area is sea and stays empty.
 if(country==='france'){
  const guiana=byLevel[1].features.find(f=>f.properties.id==='FR-R-03');
  // The area ends inside Guyana and Brazil's interior, where the detailed and 1:110m land share
  // one grey, so no seam shows.
  const edge=[-58.3,.8,-49.5,6.3];
  const box={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[edge[0],edge[1]],[edge[2],edge[1]],[edge[2],edge[3]],[edge[0],edge[3]],[edge[0],edge[1]]]]}};
  const local=async(file,name)=>(await command(fc(read(file).features.map(f=>({type:'Feature',properties:{country:name},geometry:f.geometry}))),'-clip box.json -dissolve country '+simplify,{'box.json':fc([box])})).features[0];
  const parts={suriname:[await local('neighbour-sur-adm0.geojson','suriname')],brazil:[await local('neighbour-bra-adm0.geojson','brazil')]};
  const rest=await command(fc([box]),'-erase land.json -explode',{'land.json':fc([...parts.suriname,...parts.brazil,guiana])});
  const onEdge=g=>polygons(g).flat(2).some(p=>[0,2].some(i=>Math.abs(p[0]-edge[i])<1e-6)||[1,3].some(i=>Math.abs(p[1]-edge[i])<1e-6));
  const near=(p,f)=>Math.min(...polygons(f.geometry).flat().flatMap(ring=>ring.map(q=>metres(p,q))));
  for(const gap of rest.features.filter(f=>f.geometry&&!onEdge(f.geometry))){const p=polygons(gap.geometry)[0][0][0];parts[near(p,parts.suriname[0])<=near(p,parts.brazil[0])?'suriname':'brazil'].push(gap);}
  const neighbours=[];
  for(const [name,list] of Object.entries(parts))neighbours.push(...(await command(fc(list.map(f=>({type:'Feature',properties:{country:name},geometry:f.geometry}))),'-dissolve2 country -erase guiana.json',{'guiana.json':fc([guiana])})).features.filter(f=>f.geometry));
  write(country,'neighbours.bin',fc(neighbours));
  console.log('French Guiana neighbours:',neighbours.map(f=>f.properties.country+' '+polygons(f.geometry).length+' polygons').join(', '));
 }
 const overseasFirst=byLevel[1].features.filter(f=>unit(f.properties.id).overseas);
 const homeGeometry=overseasFirst.length?single(await command(fc(byLevel[1].features.filter(f=>!unit(f.properties.id).overseas)),'-dissolve')):geometry;
 if(reconciled[country]){write(country,'context.bin',fc(reconciled[country].context));if(reconciled[country].neighbours.length)write(country,'neighbours.bin',fc(reconciled[country].neighbours));}
 else write(country,'context.bin',fc([{type:'Feature',properties:{country},geometry:homeGeometry},...overseasFirst.map(f=>{const u=unit(f.properties.id),b=bounds(f.geometry);return {type:'Feature',properties:{country,region:f.properties.id,bounds:[...b[0],...b[1]].map(v=>round(v)),...(u.claimedBy?{claimedBy:u.claimedBy}:{})},geometry:f.geometry};})]));
 for(let level=1;level<=maxLevel;level++){
  const regions=byLevel[level],points=await command(regions,'-points inner'),areas=await command(regions,'-each "areaKm2=$.area/1000000"');
  counts[level]=regions.features.length;
  regions.features.forEach((f,i)=>{const id=f.properties.id,u=unit(id);records.push({id,parent:u.parent,level,en:u.en,local:u.local,kind:u.kind,...(u.overseas?{overseas:true}:{}),...(u.aliases?{aliases:u.aliases}:{}),...(u.code?{code:u.code}:{}),center:points.features[i].geometry.coordinates.map(v=>round(v)),bounds:c.units?bounds(f.geometry).map(p=>p.map(v=>round(v))):c.camera,areaKm2:(a=>a<1?Math.round(a*1e4)/1e4:Math.round(a*100)/100)(areas.features[i].properties.areaKm2)});});
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
 const paths=frontierPaths(country,country==='spain'||country==='italy'?sharedWithFrance:country==='united-kingdom'?inGibraltar:reconciled[country]?sharedWithReferences(country):()=>false);
 const length=paths.reduce((s,p)=>s+p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0),0);
 // Each path splits where it enters or leaves a reference's outline.
 const claimAt=reconciled[country]?claimOf(country):()=>'',lines=[];for(const p of paths){let current=null,claim;for(let i=1;i<p.length;i++){const inside=claimAt(p[i-1],p[i]);if(!current||inside!==claim){current=[p[i-1]];claim=inside;lines.push({claim,coordinates:current});}current.push(p[i]);}}
 // A split can leave a stub of a few metres doubling back along its neighbour.
 // A ring that doubles back on itself (a spike in a source) is drawn once.
 write(country,'international.bin',lineData(fc(withoutRetraced(lines.filter(l=>l.coordinates.slice(1).reduce((t,q,i)=>t+metres(l.coordinates[i],q),0)>=20).map(({claim,coordinates})=>({type:'Feature',properties:{countries:[country],...(claim?{claimedBy:claim.split('|')[0],...(claim.endsWith('|contested')?{claimants:country+' '+claim.split('|')[0]}:{})}:{})},geometry:{type:'LineString',coordinates}}))))));
 // A wildcard source name lists every matching file (France has one per département).
 const own=c.file.includes('*')?Object.keys(manifest.files).filter(n=>n.startsWith(c.file.split('*')[0])||n==='france-regions.json'||n==='france-departements.json'):[c.file];
 const files=[...own,'ne-10m-land-boundaries.geojson',...(reconciled[country]?['ne-10m-countries.geojson']:[]),...Object.keys(manifest.files).filter(n=>n.startsWith('neighbour-')||n.startsWith('osm-relation-'))];
 fs.writeFileSync(out+'/'+country+'/sources.json',JSON.stringify({retrieved:manifest.retrieved,counts,coverage:c.coverage,processing,frontierKm:Math.round(length/1000),seamReports:Object.fromEntries(Object.entries(seamReports).filter(([k])=>k.includes(country))),sources:files.map(n=>({file:n,...manifest.files[n]}))},null,2)+'\n');
 console.log(country,counts,'chunks',Object.keys(chunks).length,'; land frontier',Math.round(length/1000),'km in',paths.length,'paths');
}
if(!only||only.includes('india')){const {prepareIndiaNames}=await import('./prepare-india-names.mjs');prepareIndiaNames(out+'/india/');}
console.log('Europe build complete.');

if(!only||only.includes('peru')){await (await import('./titicaca-water.mjs')).writeTiticacaWater();await (await import('./mask-titicaca.mjs')).maskTiticacaCountry('peru');}

if(!only||only.includes('turkey')){const {prepareTurkeyNames}=await import('./prepare-turkey-names.mjs');prepareTurkeyNames();}
