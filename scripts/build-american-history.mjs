// Rebuild dated frames from retained IBGE archives, the US historical mosaic and explicit
// modern-state aggregations. No downloads or modifications to present-day datasets.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import {gzipSync} from 'node:zlib';import assert from 'node:assert/strict';
const root=path.resolve(process.env.ATLAS_ROOT||'.'),source=path.resolve(process.env.HISTORY_SOURCE||path.join(root,'scripts/boundary-sources/american-history')),output=path.resolve(process.env.HISTORY_OUTPUT||path.join(root,'dist/data/europe'));
const require=createRequire(path.join(root,'package.json')),mapshaper=require('mapshaper'),AdmZip=require('adm-zip'),{topology}=require('topojson-server'),{feature}=require('topojson-client');
const {decodeData,encodeGeo}=await import(pathToFileURL(path.join(root,'dist/geo-pack.mjs'))),{packShapes,shapeAtLocation}=await import(pathToFileURL(path.join(root,'dist/historic-borders.mjs')));
const {brazilPeriods,mexicoPeriods}=await import(pathToFileURL(process.env.HISTORY_PERIODS||path.join(root,'dist/american-history.mjs')));
const fc=features=>({type:'FeatureCollection',features}),f=(id,geometry)=>({type:'Feature',properties:{id},geometry}),read=file=>JSON.parse(fs.readFileSync(file)),readBin=async file=>decodeData(fs.readFileSync(path.join(root,'dist',file)));
async function command(data,cmd){const values=Object.fromEntries(Object.entries(data.type?{'in.json':data}:data).map(([k,v])=>[k,JSON.stringify(v)]));const r=await mapshaper.applyCommands('-i '+Object.keys(values)[0]+' '+cmd+' -o out.json format=geojson geojson-type=FeatureCollection precision=0.000001',values);return JSON.parse(r['out.json']);}
const slug=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const bounds=g=>{const b=[180,90,-180,-90];for(const p of g.coordinates.flat(g.type==='MultiPolygon'?2:1)){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return [[b[0],b[1]],[b[2],b[3]]];};
function write(country,file,data,geo=true){const dest=path.join(output,country,file);fs.mkdirSync(path.dirname(dest),{recursive:true});const bytes=gzipSync(geo?encodeGeo(data,{source:country+' historical boundaries'},{scale:1e6}):JSON.stringify(data),{level:9});fs.writeFileSync(dest,bytes);return bytes.length;}
function mesh(regions){const t=topology({regions}),owners=new Map(),groups=new Map();for(const g of t.objects.regions.geometries)for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(a))owners.set(a,new Set());owners.get(a).add(g.properties.id);}for(const [a,ids]of owners){const key=[...ids].sort().join('|');if(!groups.has(key))groups.set(key,{ids:[...ids].sort(),arcs:[]});groups.get(key).arcs.push([a]);}return fc([...groups.values()].map(({ids,arcs})=>({type:'Feature',properties:{a:ids[0],b:ids[1]||''},geometry:feature(t,{type:'MultiLineString',arcs}).geometry})));}
async function frame(country,year,regions,defs,extra={}){regions=await command(regions,'-clean -dissolve2 id');const points=await command(regions,'-points inner');const units=regions.features.map((p,i)=>{const id=p.properties.id,def=defs.get(id);assert(def,'Unknown '+country+' '+year+' '+id);return {id,key:id,...def,bounds:bounds(p.geometry),label:points.features[i].geometry.coordinates};});const value={regions,edges:mesh(regions),units};const bytes=write(country,'history/'+year+'.bin',value);console.log(country,year,units.length,Math.round(bytes/1024)+' KB');return {file:'history/'+year+'.bin',units,...extra};}
async function ibge(year,kind){const dir=path.join(source,'brazil',String(year)),zip=new AdmZip(path.join(dir,fs.readdirSync(dir).find(n=>n.startsWith(kind==='states'?'04':'05')&&n.endsWith('.zip'))));const files={};for(const e of zip.getEntries())if(/\.(shp|shx|dbf|prj)$/i.test(e.entryName))files[path.basename(e.entryName)]=e.getData();const shp=Object.keys(files).find(n=>n.endsWith('.shp'));const result=await mapshaper.applyCommands('-i "'+shp+'" encoding=win1252 -proj wgs84 -o out.json format=geojson geojson-type=FeatureCollection',files);return JSON.parse(result['out.json']);}
const report={brazil:{},mexico:{}};
if(!process.argv.includes('--mexico')){
 const cache=new Map();for(const year of [1872,1900,1933,1940,1960,1980,1991])cache.set(year,await ibge(year,'states'));
 const years={},configs=[];
 for(const [year,period,dated,type]of brazilPeriods){const defs=new Map(),regions=fc(cache.get(dated).features.map(p=>{let name=p.properties.nome;
   if(year<1850&&name==='Amazonas')name='Pará';if(year<1853&&name==='Paraná')name='São Paulo';if(year<1834&&name==='Município neutro')name='Rio de Janeiro';
   if(year===1808){if(name==='Alagôas'||name==='Rio Grande do Norte')name='Pernambuco';if(name==='Sergipe')name='Bahia';}
   const id=slug(name);let kind=type;if(/Município neutro/i.test(name))kind='Neutral municipality';if(/Distrito Federal/i.test(name))kind='Federal district';if(/^Territ.rio/i.test(name))kind='Territory';if(/^Distrito estadual/i.test(name))kind='State district';
   defs.set(id,{name,type:kind,note:year<1872?'Reconstructed from the 1872 IBGE provinces, with later subdivisions merged. Local boundaries and external frontiers are generalized.':'IBGE historical territorial division for '+dated+'.'+(kind==='State district'?' Fernando de Noronha was an administrative district of Pernambuco, not a separate state.':'')});return f(id,p.geometry);}));
   if(year===1821||year===1822){const uy=(await readBin('data/south-america/uruguay-first.bin')).regions;regions.features.push(...uy.features.map(p=>f('cisplatina',p.geometry)));defs.set('cisplatina',{name:'Cisplatina',type:'Province',note:'Annexed to the United Kingdom in 1821 and retained by the Empire after independence. Its independence as Uruguay was recognized in 1828. The shape uses present-day Uruguay as a generalized proxy.'});}
   const detail=year===dated?'history/municipal-'+year+'.bin':undefined;configs.push(await frame('brazil',year,regions,defs,{sourceYear:dated,...(detail?{detail}:{} )}));years[year]={date:year+'-12-31',config:configs.length-1};report.brazil[year]={period,divisions:configs.at(-1).units.length,sourceYear:dated};
 }
 // The 1991 archive splits some municipalities into repeated polygon records.
 for(const year of [1872,1900,1933,1940,1960,1980,1991]){const municipalities=await ibge(year,'municipal');municipalities.features.forEach((p,i)=>p.properties={id:String(year===1991&&p.properties.BR91POLY_I||i)});const boundaries=await command(municipalities,year===1991?'-clean -dissolve2 id -innerlines':'-clean -innerlines');const bytes=write('brazil','history/municipal-'+year+'.bin',{boundaries});report.brazil[year].municipalities=municipalities.features.length;console.log('Brazil municipal borders',year,municipalities.features.length,Math.round(bytes/1024)+' KB');}
 write('brazil','history/borders.bin',{source:{name:'IBGE, Evolução da divisão territorial do Brasil 1872–2010',firstDate:'1808-01-01',lastDate:'1991-12-31'},years,configs,versions:[],events:{}},false);
}
if(!process.argv.includes('--brazil')){
 const modern=(await readBin('data/europe/mexico/first.bin')).regions,catalogue=(await readBin('data/europe/mexico/catalogue.bin')).records.filter(p=>p.level===1),names=new Map(catalogue.map(p=>[p.id.slice(3),p.en]));
 const us=await readBin('data/europe/united-states/history/borders.bin');const usPieces=(year,test)=>{const c=us.configs[us.years[year].config];return us.faces.features.flatMap((p,i)=>{const unit=c.units[c.face[i]];return unit&&test(unit)?[{unit,geometry:p.geometry}]:[];});};
 const years={},configs=[];
 // Generalized administrative assignments are stated in the interface and source manifest.
 function assignment(code,year){let id=code,name=names.get(code),type=year===1820?'Intendancy':year===1822?'Province':[1843,1853].includes(year)?'Department':'State';
  const group=(from,to,label)=>{if(from.includes(code)){id=to;name=label;}};
  if(year<=1824||year===1847)group(['AGU','ZAC'],'ZAC','Zacatecas');
  if(year<1869)group(['HID','MOR','MEX'],'MEX','México');
  if(year<1849)group(['GRO','MEX','HID','MOR'],'MEX','México');
  if(year<1917)group(['NAY','JAL'],'JAL','Jalisco');
  if(year<1863)group(['CAM','ROO','YUC'],'YUC','Yucatán');else if(year<1902)group(['ROO','YUC'],'YUC','Yucatán');
  if(year<1931)group(['BCN','BCS'],'BCN','Baja California');
  if(year<=1824)group(['SON','SIN'],'SON',year===1824?'Occidente':'Sonora y Sinaloa');
  if(year<=1822){group(['CHH','DUR'],'DUR','Nueva Vizcaya');group(['JAL','NAY','COL'],'JAL','Guadalajara');group(['CMX','MEX','GRO','HID','MOR'],'MEX','México');if(code==='MIC')name='Valladolid';if(code==='TAM')name='Nuevo Santander';if(code==='NLE')name='Nuevo Reino de León';if(code==='BCN'||code==='BCS'){id='CAL';name='Californias';}}
  if(year===1824&&code==='COA'){id='COA';name='Coahuila y Texas';}
  if(year===1857&&['COA','NLE'].includes(code)){id='NLE';name='Nuevo León y Coahuila';}
  if(code==='CMX'&&year>1822){name=year<1917?'Distrito Federal':'Distrito Federal';type='Federal district';}
  if(['BCN','BCS'].includes(code)&&year>1822)type=year<1952||code==='BCS'&&year<1974?'Territory':'State';
  if(code==='COL'&&year>=1824&&year<1857||code==='TLA'&&year>=1824&&year<1857||code==='ROO'&&year>=1902&&year<1974)type='Territory';
  if(year===1843){if(code==='COL'){id='MIC';name='Michoacán';type='Department';}if(['TLA','CMX'].includes(code)){id='MEX';name='México';type='Department';}if(['BCN','BCS'].includes(code)){id='CAL';name='Californias';type='Department';}if(id==='YUC')type='Seceding republic';}if(year===1847&&['BCN','BCS'].includes(code)){id='CAL';name='Californias';type='State';}
  if(year===1910&&code==='NAY'){id='NAY';name='Tepic';type='Territory';}
  return {id,name,type,note:'Generalized historical administration reconstructed from present-day state boundaries. Smaller boundary changes are not surveyed here.'+(id==='MEX'&&year<1849?' Guerrero was created from parts of México, Puebla and Michoacán in 1849; this reconstruction merges its present-day outline into México.':'')};
 }
 for(const [year,period]of mexicoPeriods){let regions,defs=new Map();
  if(year===1865){
   const data=read(path.join(source,'mexico','1865-georeferenced.json')),departmentNames=['California','Arizona','Sonora','Chihuahua','Álamos','Batopilas','Huejuquilla','Mapimí','Sinaloa','Nazas','Coahuila','Nuevo León','Matamoros','Mazatlán','Durango','Fresnillo','Matehuala','Tamaulipas','Nayarit','Zacatecas','Aguascalientes','Potosí','Tuxpan','Jalisco','Guanajuato','Querétaro','Tula','Tulancingo','Autlán','Colima','Coalcomán','Tancítaro','Michoacán','Toluca','Valle de México','Tlaxcala','Veracruz','Acapulco','Iturbide','Puebla','Guerrero','Teposcolula','Oaxaca','Ejutla','Tehuantepec','Tabasco','Chiapas','La Laguna','Campeche','Yucatán'];
   const main=data.shapes.filter(s=>data.labels.some(l=>l.path===s.index)),nearest=point=>main.reduce((best,s)=>{const distance=Math.min(...s.rings.flat().map(p=>(p[0]-point[0])**2+(p[1]-point[1])**2));return distance<best.distance?{shape:s,distance}:best;},{distance:Infinity}).shape;
   const raw=fc(data.shapes.map(s=>{const label=data.labels.find(l=>l.path===s.index)||data.labels.find(l=>l.path===nearest(s.rings[0][0]).index),id='D'+String(label.name).padStart(2,'0');defs.set(id,{name:departmentNames[+label.name-1],type:'Department',note:'One of the 50 departments decreed on 3 March 1865. This shows the imperial administrative plan, not territory effectively controlled by the Empire. Borders are georeferenced from a generalized historical map.'});return f(id,{type:'Polygon',coordinates:s.rings});}));
   const land=await command(modern,'-dissolve2');land.features.forEach(p=>p.properties={id:'land'});
   // Cut a topology with the modern land outline, retaining the historical internal strokes.
   const mosaic=await command(fc([...raw.features,...land.features.map(p=>f('land',p.geometry))]),'-clean allow-overlaps -mosaic');mosaic.features=mosaic.features.filter(p=>p.geometry?.coordinates.length);const points=await command(mosaic,'-points inner'),insideLand=packShapes(land.features),insideDept=packShapes(raw.features);
   regions=fc(mosaic.features.flatMap((p,i)=>{const q=points.features[i].geometry?.coordinates;if(!q)return[];const at={lng:q[0],lat:q[1]};if(!shapeAtLocation(insideLand,at))return[];let id=shapeAtLocation(insideDept,at)?.properties.id;if(!id){const s=nearest(q),label=data.labels.find(l=>l.path===s.index);id='D'+String(label.name).padStart(2,'0');}return[f(id,p.geometry)];}));
  }else{
   regions=fc(modern.features.flatMap(p=>{const code=p.properties.id.slice(3);if(year===1820&&code==='CHP')return[];const u=assignment(code,year);defs.set(u.id,{name:u.name,type:u.type,note:u.note});return[f(u.id,p.geometry)];}));
   if(year<=1853){
    const northernYear=year<=1822?1822:year===1824?1824:year<=1847?1843:1852;
    const pieces=usPieces(northernYear,u=>u.key==='foreign:mexico'||year>=1836&&year<1848&&u.key==='tx_republic');
    const land=await command(fc(pieces.map(p=>f('north',p.geometry))),'-dissolve2');land.features.forEach(p=>p.properties={id:'north'});
    const sourceMap=read(path.join(source,'mexico','1821-georeferenced.json'));
    const translations={'Californias':year<=1822||year===1843||year===1847?'CAL':'ALT','Nuevo México':'NM','Texas':year===1824?'COA':'TEX','Sonora':'SON','NuevaVizcaya':year<=1822?'DUR':'CHH'};
    const raw=fc(sourceMap.shapes.flatMap(p=>{const label=sourceMap.labels.find(l=>l.path===p.index&&translations[l.name]);if(!label)return[];const id=translations[label.name];return[f(id,{type:'Polygon',coordinates:p.rings})];}));
    if(year>=1836&&year<1848){raw.features=raw.features.filter(p=>p.properties.id!=='TEX');raw.features.unshift(...usPieces(2000,u=>u.name==='Texas').map(p=>f('TEX',p.geometry)));}
    const packed=packShapes(raw.features),landShapes=packShapes(land.features),nearest=q=>raw.features.reduce((best,p)=>{const coordinates=p.geometry.coordinates.flat(p.geometry.type==='MultiPolygon'?2:1);let distance=Infinity;for(const x of coordinates)distance=Math.min(distance,(q[0]-x[0])**2+(q[1]-x[1])**2);return distance<best.distance?{id:p.properties.id,distance}:best;},{distance:Infinity}).id;
    const mosaic=await command(fc([...raw.features,...land.features]),'-clean allow-overlaps -mosaic');mosaic.features=mosaic.features.filter(p=>p.geometry?.coordinates.length);const points=await command(mosaic,'-points inner');
    const shown=new Set();for(let i=0;i<mosaic.features.length;i++){const p=mosaic.features[i],q=points.features[i].geometry?.coordinates;if(!q)continue;const at={lng:q[0],lat:q[1]};if(!shapeAtLocation(landShapes,at))continue;const id=shapeAtLocation(packed,at)?.properties.id||nearest(q);regions.features.push(f(id,p.geometry));shown.add(id);}
    for(const id of shown){if(['SON','CHH','DUR','COA','CAL'].includes(id)&&defs.has(id))continue;const name={ALT:'Alta California',NM:'Nuevo México',TEX:'Texas',CAL:'Californias'}[id]||defs.get(id)?.name;assert(name,id);defs.set(id,{name,type:id==='TEX'&&year>=1836?'Disputed claim':year<=1822?'Province':year===1843?'Department':year===1847?'State':'Territory',note:id==='TEX'&&year>=1836?'Texas was independent from 1836 and annexed by the United States in 1845. Its disputed extent is generalized to present-day Texas; it does not represent Mexican control.':'Northern extent from the Newberry historical US boundary mosaic. Interior provincial boundaries are generalized from the retained 1821 historical map, rather than surveyed for each date.'});}
   }
   if(year===1822)for(const [country,name]of [['guatemala','Guatemala'],['honduras','Honduras'],['el-salvador','El Salvador'],['nicaragua','Nicaragua'],['costa-rica','Costa Rica']]){const v=(await readBin('data/europe/'+country+'/first.bin')).regions;regions.features.push(...v.features.map(p=>f(country,p.geometry)));defs.set(country,{name,type:'Annexed province',note:'Central America joined the First Mexican Empire in 1822 and separated in 1823. Provincial outlines use generalized present-day country boundaries; incorporation and effective authority varied locally.'});}
  }
  configs.push(await frame('mexico',year,regions,defs));years[year]={date:year===1853?'1853-07-01':year===1910?'1910-01-01':year+'-12-31',config:configs.length-1};report.mexico[year]={period,divisions:configs.at(-1).units.length};
 }
 write('mexico','history/borders.bin',{source:{name:'Newberry Library, historical Mexican administrative references and modern atlas geometry',firstDate:'1820-01-01',lastDate:'2000-12-31'},years,configs,versions:[],events:{}},false);
}
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'american-history-build.json'),JSON.stringify(report,null,2));
