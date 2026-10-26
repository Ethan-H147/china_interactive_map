import {swissToWGS84} from './swiss-projection.mjs';
import {buildCanadaLocal} from './build-canada-local.mjs';
import {prepareCanadaMunicipalFacts} from './prepare-canada-municipal-facts.mjs';
import {prepareCanadaStatisticsSources} from './prepare-canada-statistics.mjs';
import {fetchCanadaLocal} from './fetch-canada-local.mjs';
import fs from 'node:fs';
import {buildUSCounties} from './build-us-counties.mjs';
import {buildMexicoMunicipalities} from './build-mexico-municipalities.mjs';
import {extendDenmark} from './denmark.mjs';
import {germanyDenmarkFrontier} from './germany-denmark-frontier.mjs';
import {fetchGermanyDenmarkFrontier} from './fetch-germany-denmark-frontier.mjs';
import {applyDenmarkStatistics} from './denmark-statistics.mjs';
import {countryContext} from './country-context.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {fetchExpansion,directory} from './fetch-country-expansion.mjs';
import {load,polygons,landIndex,lineIndex,linesOf,metres} from './geo-index.mjs';
import {lineData,visibleSegments} from '../dist/adaptive-lines.mjs';
import {withoutRetraced} from './channel-lines.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import '../dist/countries.js';
import {usTerritories,usTerritoryCoverage,territoryStatisticsSources,territoryStat,territoryFiles} from './us-territories.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper');
const {unzipSync}=createRequire(require.resolve('mapshaper'))('fflate'),{topology}=require('topojson-server'),{mesh}=require('topojson-client');
const pins=await fetchExpansion(),fc=features=>({type:'FeatureCollection',features});
const read=file=>JSON.parse(fs.readFileSync(directory+'/'+file));
const precision='.000001';
async function command(data,commands){
 const r=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o out.json format=geojson precision='+precision,{'input.json':JSON.stringify(data)}))['out.json']);
 return r.type==='FeatureCollection'?r:r.type==='Feature'?fc([r]):fc((r.type==='GeometryCollection'?r.geometries:[r]).map(geometry=>({type:'Feature',properties:{},geometry})));
}
async function shape(file,term,commands=''){
 const zip=unzipSync(fs.readFileSync(directory+'/'+file)),key=Object.keys(zip).find(k=>k.includes(term)&&k.endsWith('.shp'));assert(key,term+' shapefile');
 const files=Object.fromEntries(['shp','shx','dbf','prj'].map(ext=>['in.'+ext,Buffer.from(zip[key.replace(/shp$/,ext)])]));
 return JSON.parse((await mapshaper.applyCommands('-i in.shp '+commands+' -o out.json format=geojson precision='+precision,files))['out.json']);
}
function bounds(g){const b=[Infinity,Infinity,-Infinity,-Infinity];for(const p of polygons(g).flat(2)){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return [[b[0],b[1]],[b[2],b[3]]];}
function borders(regions){
 const t=topology({regions}),owners=new Map(),groups=new Map();
 for(const f of t.objects.regions.geometries)for(const a of new Set(f.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(a))owners.set(a,new Set());owners.get(a).add(f.properties.id);}
 for(const [a,ids]of owners){if(ids.size<2)continue;const list=[...ids].sort(),key=list.join('|');if(!groups.has(key))groups.set(key,{owners:list,arcs:[]});groups.get(key).arcs.push([a]);}
 return visibleSegments(fc([...groups.values()].map(({owners,arcs})=>({type:'Feature',properties:{owners},geometry:mesh(t,{type:'MultiLineString',arcs})}))));
}
const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const exonyms={'Hovedstaden':'Capital Region of Denmark','Sjælland':'Zealand','Syddanmark':'Southern Denmark','Midtjylland':'Central Denmark','Nordjylland':'North Denmark','København':'Copenhagen',...{"München":"Munich","München, Kreisfreie Stadt":"Munich","München, Landkreis":"Munich district","Köln":"Cologne","Köln, Kreisfreie Stadt":"Cologne","Nürnberg":"Nuremberg","Nürnberg, Kreisfreie Stadt":"Nuremberg","Hannover":"Hanover","Region Hannover":"Hanover Region","Antwerpen / Anvers":"Antwerp","Gent / Gand":"Ghent","Brugge / Bruges":"Bruges","Bruxelles / Brussel":"Brussels","'s-Gravenhage":"The Hague","Région de Bruxelles-Capitale/ Brussels Hoofdstedelijk Gewest":"Brussels-Capital Region"},'Bayern':'Bavaria','Hessen':'Hesse','Niedersachsen':'Lower Saxony','Nordrhein-Westfalen':'North Rhine-Westphalia','Rheinland-Pfalz':'Rhineland-Palatinate','Sachsen':'Saxony','Sachsen-Anhalt':'Saxony-Anhalt','Thüringen':'Thuringia','Vlaams Gewest':'Flanders','Région wallonne':'Wallonia','Région de Bruxelles-Capitale/Brussels Hoofdstedelijk Gewest':'Brussels-Capital Region','Prov. Antwerpen':'Antwerp','Prov. Limburg (BE)':'Limburg','Prov. Oost-Vlaanderen':'East Flanders','Prov. Vlaams-Brabant':'Flemish Brabant','Prov. West-Vlaanderen':'West Flanders','Prov. Brabant wallon':'Walloon Brabant','Prov. Hainaut':'Hainaut','Prov. Liège':'Liège','Prov. Luxembourg (BE)':'Luxembourg','Prov. Namur':'Namur','Noord-Holland':'North Holland','Zuid-Holland':'South Holland','Noord-Brabant':'North Brabant','Fryslân':'Friesland','Zürich':'Zurich','Genève':'Geneva','Luzern':'Lucerne','Graubünden':'Grisons','Ticino':'Ticino','Vaud':'Vaud','Wallis':'Valais','Neuchâtel':'Neuchâtel'};
const english=n=>exonyms[n]||n.replace(/^Prov\. /,'');
const nuts=read('nuts2024.geojson').features;
let lau;
async function loadGisco(country,iso,firstNuts,secondNuts){
 lau??=read('lau2024.geojson').features.filter(f=>['DE','BE','NL','DK'].includes(f.properties.CNTR_CODE));
 const units=new Map(),first=nuts.filter(f=>f.properties.CNTR_CODE===iso&&f.properties.LEVL_CODE===firstNuts),second=secondNuts?nuts.filter(f=>f.properties.CNTR_CODE===iso&&f.properties.LEVL_CODE===secondNuts):[];
 for(const f of first){const p=f.properties,id=p.NUTS_ID;units.set(id,{id,level:1,parent:null,en:english(p.NUTS_NAME),local:p.NUTS_NAME,kind:country==='germany'?'State':country==='belgium'?'Region':'Province',code:id});}
 for(const f of second){const p=f.properties,id=p.NUTS_ID,parent=id.slice(0,3);assert(units.has(parent),id+' parent');units.set(id,{id,level:2,parent,en:english(p.NUTS_NAME),local:p.NUTS_NAME,kind:country==='germany'?(/Stadtkreis|Kreisfreie Stadt/.test(p.NUTS_NAME)?'Independent city':'District'):id==='BE10'?'Capital region':'Province',code:id});}
 const parents=(second.length?second:first).map(f=>({id:f.properties.NUTS_ID,inside:landIndex(polygons(f.geometry).flat())}));
 const features=lau.filter(f=>f.properties.CNTR_CODE===iso).map(f=>structuredClone(f));
 const points=(await command(fc(features),'-points inner')).features;
 const unresolved=[];
 for(let i=0;i<features.length;i++){
  const f=features[i],p=f.properties,point=points[i].geometry.coordinates,id=p.GISCO_ID,cleanName=country==='germany'?p.LAU_NAME.split(',')[0].trim():p.LAU_NAME,match=parents.filter(r=>r.inside(point));
  if(country==='denmark'&&id==='DK_411'){units.set(id,{id,level:1,parent:null,en:'Christiansø',local:'Christiansø',kind:'State-administered area',code:'411',aliases:['Ertholmene'],reportedArea:p.AREA_KM2});f.properties={id};continue;}
  if(match.length!==1){unresolved.push([id,p.LAU_NAME,point,match.map(r=>r.id)]);continue;}
  units.set(id,{id,level:second.length?3:2,parent:match[0].id,en:english(cleanName),local:cleanName,...((cleanName!==p.LAU_NAME||cleanName==="'s-Gravenhage")?{aliases:[p.LAU_NAME,...(cleanName==="'s-Gravenhage"?['Den Haag']:[])]}:{}),kind:/gemfr\.|gemeindefrei/.test(p.LAU_NAME)?'Unincorporated area':'Municipality',code:id.split('_')[1],population:p.POP_2024>=0?{value:p.POP_2024,year:2024,date:'2024-01-01',periodLabel:'2024 resident population',source:'giscoPopulation'}:null,reportedArea:p.AREA_KM2});
  f.properties={id};
 }
 assert.equal(unresolved.length,0,'Every municipality has one official parent: '+JSON.stringify(unresolved.slice(0,15)));
 return {units,features,files:['lau2024.geojson','nuts2024.geojson'],levels:second.length?['State or region',country==='belgium'?'Province or capital region':'District or independent city','Municipality']:['Province','Municipality'],coverage:country==='germany'?'16 states, 400 districts and independent cities, and all 2024 LAU municipalities/municipal equivalents.':country==='belgium'?'Three regions, ten provinces plus the Brussels-Capital equivalent, and all 581 municipalities as of 1 January 2024 (before the 2025 municipal mergers).':'The twelve European provinces and 342 municipalities as of 1 January 2024. Caribbean Netherlands and the constituent countries Aruba, Curaçao and Sint Maarten are outside this release.'};
}
async function loadSwiss(){
 const units=new Map(),cantons=await shape('swiss2026.zip','KANTONSGEBIET',swissToWGS84),districts=await shape('swiss2026.zip','BEZIRKSGEBIET',swissToWGS84);
 for(const f of cantons.features){const p=f.properties,id='CH-K-'+p.KANTONSNUM;units.set(id,{id,level:1,parent:null,en:english(p.NAME),local:p.NAME,kind:'Canton',code:String(p.KANTONSNUM)});}
 for(const f of districts.features){const p=f.properties,id='CH-D-'+p.BEZIRKSNUM;units.set(id,{id,level:2,parent:'CH-K-'+p.KANTONSNUM,en:p.NAME,local:p.NAME,kind:'District',code:String(p.BEZIRKSNUM)});}
 // Include cantonal lake areas and the two shared territories so their land is not assigned
 // to a neighbouring municipality. Cantons without districts have municipalities at level 2.
 const features=(await shape('swiss2026.zip','HOHEITSGEBIET',swissToWGS84+' -clean -simplify dp interval=.0003 planar keep-shapes -clean')).features.filter(f=>f.properties.ICC==='CH');
 for(const f of features){const p=f.properties,id='CH-M-'+p.BFS_NUMMER,parent=p.BEZIRKSNUM&&units.has('CH-D-'+p.BEZIRKSNUM)?'CH-D-'+p.BEZIRKSNUM:'CH-K-'+p.KANTONSNUM;
  units.set(id,{id,level:parent.startsWith('CH-D-')?3:2,parent,en:english(p.NAME),local:p.NAME,kind:p.OBJEKTART==='Gemeindegebiet'?'Municipality':p.OBJEKTART==='Kommunanz'?'Shared territory':'Cantonal lake area',code:String(p.BFS_NUMMER),population:{value:p.EINWOHNERZ,year:2024,date:'2024-12-31',periodLabel:'31 December 2024 population',source:'swissPopulation'},reportedArea:p.GEM_FLAECH/100});f.properties={id};
 }
 return{units,features,files:['swiss2026.zip'],levels:['Canton','District or municipality','Municipality'],coverage:'All 26 cantons, 135 districts and 2,110 political municipalities at 1 January 2026, plus two shared territories and eleven cantonal lake areas. Cantons without districts connect directly to their municipalities; no district is invented. Liechtenstein and foreign enclaves are excluded.'};
}
function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}const header=rows.shift().map(c=>c.replace(/^\uFEFF/,''));return rows.map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));}
function zipCsv(file,match){const z=unzipSync(fs.readFileSync(directory+'/'+file)),key=Object.keys(z).find(match);assert(key,file+' CSV');return parseCSV(Buffer.from(z[key]).toString('utf8'));}
async function loadNorth(country){
 const units=new Map();let features,files;
 if(country==='united-states'){
  const census=await shape('us-states-2025.zip','cb_2025','-proj wgs84');
  features=census.features.filter(f=>+f.properties.STATEFP<60);
  const population=new Map(parseCSV(fs.readFileSync(directory+'/us-population.csv','utf8')).filter(r=>r.SUMLEV==='040').map(r=>[r.STATE,r]));
  for(const f of features){const p=f.properties,id='US-'+p.STUSPS,pop=population.get(p.STATEFP);assert(pop,p.NAME+' population');units.set(id,{id,parent:null,level:1,en:p.NAME,local:p.NAME,kind:p.STUSPS==='DC'?'Federal district':'State',code:p.STUSPS,...(['AK','HI'].includes(p.STUSPS)?{focusOnEntry:true}:{}),reportedArea:p.ALAND/1e6,population:{value:+pop.POPESTIMATE2025,year:2025,date:'2025-07-01',method:'estimate',periodLabel:'1 July 2025 estimate',source:'usPopulation'}});f.properties={id};
   // Keep the Aleutians contiguous with Alaska across the antimeridian.
   if(id==='US-AK')for(const q of polygons(f.geometry).flat(2))if(q[0]>0)q[0]-=360;
  }assert.equal(features.length,51);const territories=usTerritories(census,read('us-minor-islands-coastline.json'));territories.units.forEach((u,id)=>units.set(id,u));features.push(...territories.features);files=[...territoryFiles,'us-population.csv'];assert.equal(features.length,65);
 }else if(country==='canada'){
  features=read('canada-provinces.geojson').features;
  const pop=zipCsv('canada-population.zip',k=>k==='17100009.csv'),latest=new Map();for(const r of pop){const old=latest.get(norm(r.GEO));if(!old||old.REF_DATE<r.REF_DATE)latest.set(norm(r.GEO),r);}
  const french={'Quebec':'Québec','British Columbia':'Colombie-Britannique','New Brunswick':'Nouveau-Brunswick','Nova Scotia':'Nouvelle-Écosse','Prince Edward Island':'Île-du-Prince-Édouard','Newfoundland and Labrador':'Terre-Neuve-et-Labrador','Northwest Territories':'Territoires du Nord-Ouest'};
  for(const f of features){const p=f.properties,id=p.shapeISO,population=latest.get(norm(p.shapeName));assert(population,p.shapeName+' population');units.set(id,{id,parent:null,level:1,en:p.shapeName,local:french[p.shapeName]||p.shapeName,kind:['CA-NT','CA-YT','CA-NU'].includes(id)?'Territory':'Province',code:id,population:{value:+population.VALUE,year:+population.REF_DATE.slice(0,4),date:population.REF_DATE,method:'estimate',periodLabel:population.REF_DATE+' estimate',source:'canadaPopulation'}});f.properties={id};}
  files=['canada-provinces.geojson','canada-population.zip'];assert.equal(features.length,13);
 }else{
  features=read('mexico-inegi-states.geojson').features;
  const rows=zipCsv('mexico-population.zip',k=>k.includes('conjunto_de_datos/')&&k.endsWith('.csv')),totals=rows.filter(r=>+r.MUN===0&&+r.LOC===0&&+r.ENTIDAD>0&&+r.ENTIDAD<=32);
  const iso=['AGU','BCN','BCS','CAM','COA','COL','CHP','CHH','CMX','DUR','GUA','GRO','HID','JAL','MEX','MIC','MOR','NAY','NLE','OAX','PUE','QUE','ROO','SLP','SIN','SON','TAB','TAM','TLA','VER','YUC','ZAC'];
  for(const f of features){const code=+f.properties.cve_ent,id='MX-'+iso[code-1],lookup=totals.find(r=>+r.ENTIDAD===code);assert(lookup,id+' population');units.set(id,{id,parent:null,level:1,en:code===9?'Mexico City':lookup.NOM_ENT,local:lookup.NOM_ENT,kind:code===9?'Federal entity':'State',code:id,population:{value:+lookup.POBTOT,year:2020,date:'2020-03-15',method:'census',source:'mexicoPopulation'}});f.properties={id};}
  files=['mexico-inegi-states.geojson','mexico-population.zip'];assert.equal(features.length,32);
 }
 return {units,features:(await command(fc(features),'-clean -simplify dp interval=.0003 planar keep-shapes -clean')).features,files,levels:[country==='canada'?'Province or territory':'State, federal district or territory'],coverage:country==='united-states'?usTerritoryCoverage:country==='canada'?'All ten provinces and three territories, from the Statistics Canada/geoBoundaries 2023 release. No lower administrative detail.':'All 31 states and Mexico City, from INEGI December 2025 water-inclusive state envelopes. Population remains the 2020 census. Inland water is a separate optional overlay; no lower administrative detail.'};
}
const definitions={
 germany:()=>loadGisco('germany','DE',1,3),
 denmark:async()=>extendDenmark(await loadGisco('denmark','DK',2),read),
 belgium:()=>loadGisco('belgium','BE',1,2),
 netherlands:()=>loadGisco('netherlands','NL',2),
 switzerland:loadSwiss,
 'united-states':()=>loadNorth('united-states'),canada:()=>loadNorth('canada'),mexico:()=>loadNorth('mexico')
};
const only=process.env.ONLY?.split(','),datasets={};
for(const [country,loader]of Object.entries(definitions)){if(only&&!only.includes(country))continue;console.log('Loading',country);datasets[country]=await loader();console.log(country,datasets[country].features.length,'base units');}
const national=read('ne-10m-land-boundaries.geojson').features;
// Resolve entire frontiers by their reference topology, rather than keeping nearby
// outline fragments. Each pair has one owner; previously published European
// frontiers retain France/Italy's geometry.
const ownership=new Set(),frontierReports={};
for(const c of ['france','italy','spain','united-kingdom']){const iso=globalThis.AtlasCountries.countries[c].naturalEarth;for(const f of national)if([].concat(iso).some(i=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(i)))ownership.add([f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].sort().join('-'));}
async function frontiers(country,outline){
 const iso=[].concat(globalThis.AtlasCountries.countries[country].naturalEarth),groups=new Map(),arcs=[];
 for(const f of national){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.some(code=>iso.includes(code)))continue;const pair=sides.sort().join('-');const prior=Object.keys(definitions).slice(0,Object.keys(definitions).indexOf(country)).flatMap(c=>[].concat(globalThis.AtlasCountries.countries[c].naturalEarth));if(ownership.has(pair)||sides.some(s=>prior.includes(s)))continue;if(!groups.has(pair))groups.set(pair,{lines:[],water:false});groups.get(pair).lines.push(...linesOf(fc([f])));groups.get(pair).water||=f.properties.TYPE==='Water Indicator';}
 for(const [pair,group]of groups){
  if(pair==='DEU-DNK'){
   await fetchGermanyDenmarkFrontier();
   const danish=await command(fc(lau.filter(f=>f.properties.CNTR_CODE==='DK')),'-clean -simplify dp interval=.0003 planar keep-shapes -clean -dissolve');
   const resolved=germanyDenmarkFrontier(outline,danish,national);arcs.push(...resolved.data.features.flatMap(f=>linesOf(fc([f])).map(path=>({pair,path,error:0,method:resolved.report.method,boundaryType:f.properties.boundaryType,reference:f.properties.reference}))));ownership.add(pair);continue;
  }
  for(const reference of joinReferencePaths(group.lines)){if(reference.length<2||reference.slice(1).reduce((n,p,i)=>n+metres(reference[i],p),0)<2)continue;const resolved=group.water?{path:reference,error:0,method:'reference through water'}:{...selectFrontierArc(outline,reference),method:'continuous outline arc'};if(resolved.path.length<2)continue;arcs.push({pair,...resolved});}ownership.add(pair);}
 frontierReports[country]=arcs.map(a=>({pair:a.pair,vertices:a.path.length,endpointErrorMetres:Math.round(a.error),method:a.method}));
 return lineData(fc(withoutRetraced(arcs.map(a=>({type:'Feature',properties:{countries:[country],pair:a.pair,...(a.boundaryType?{boundaryType:a.boundaryType,reference:a.reference}:{})},geometry:{type:'LineString',coordinates:a.path}})))));
}
const sourcesOfStatistics={
 giscoPopulation:{title:'Eurostat GISCO · resident population and area of LAU 2024',url:'https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/local-administrative-units',license:'Eurostat GISCO terms; © EuroGeographics'},
 swissPopulation:{title:'swisstopo · swissBOUNDARIES3D 2026, population at 31 December 2024',url:'https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d',license:'© swisstopo, open government data'},
 usPopulation:{title:'US Census Bureau · 2025 Population Estimates, July 1',url:pins.files['us-population.csv'].url,license:'Public domain'},
 canadaPopulation:{title:'Statistics Canada · Table 17-10-0009-01, quarterly population estimates',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000901',license:'Statistics Canada Open Licence'},
 mexicoPopulation:{title:'INEGI · 2020 Population and Housing Census',url:'https://www.inegi.org.mx/programas/ccpv/2020/',license:'INEGI free use with attribution'},
 mappedArea:{title:'Surface area calculated from the published boundary geometry',url:'sources.json',license:'See boundary sources'}
};
for(const [country,d]of Object.entries(datasets)){
 const dir=(process.env.EXPANSION_OUTPUT||'dist/data/europe')+'/'+country,write=(file,data)=>{fs.mkdirSync(dir+'/'+file.slice(0,file.lastIndexOf('/')+1),{recursive:true});const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(dir+'/'+file,bytes);return bytes.length;};
 assert.equal(new Set(d.features.map(f=>f.properties.id)).size,d.features.length,country+' has unique source identifiers');
 const {units,levels}=d,maxLevel=levels.length,ancestor=(id,level)=>{while(units.get(id).level>level)id=units.get(id).parent;return id;},byLevel={},records=[],chunks={},counts={};
 // Simplify every municipal polygon together. Dissolving this one topology keeps parent
 // boundaries identical to their children; border meshes store each shared edge once.
 const base=await command(fc(d.features),'-clean -simplify dp interval=.0003 planar keep-shapes -clean');
 for(let level=1;level<=maxLevel;level++){
  const tagged=fc(base.features.filter(f=>units.get(f.properties.id).level>=level).map(f=>({...f,properties:{id:ancestor(f.properties.id,level)}})));
  byLevel[level]=await command(tagged,'-dissolve id');counts[level]=byLevel[level].features.length;
  const points=(await command(byLevel[level],'-points inner')).features,areas=(await command(byLevel[level],'-each "areaKm2=$.area/1000000"')).features;
  byLevel[level].features.forEach((f,i)=>{const u=units.get(f.properties.id);assert(u,u?.id);records.push({...Object.fromEntries(Object.entries(u).filter(([k])=>!['population','reportedArea'].includes(k))),center:points[i].geometry.coordinates,bounds:bounds(f.geometry),areaKm2:u.reportedArea||areas[i].properties.areaKm2});});
 }
 const outline=await command(byLevel[1],'-dissolve');
 write('context.bin',await countryContext(country,byLevel[1],new Map(records.filter(r=>r.level===1).map(r=>[r.id,r])),command));
 write('international.bin',await frontiers(country,outline));
 const whole={};for(let level=1;level<=maxLevel;level++)whole[level]={regions:byLevel[level],boundaries:borders(byLevel[level])};
 write('first.bin',whole[1]);
 const bundled=Math.min(2,maxLevel);if(maxLevel>1)write('all.bin',{levels:Array.from({length:bundled},(_,i)=>({level:i+1,...whole[i+1]}))});
 for(let level=2;level<=maxLevel;level++)for(const parent of byLevel[level-1].features){
  const children=fc(byLevel[level].features.filter(f=>ancestor(f.properties.id,level-1)===parent.properties.id));if(!children.features.length)continue;
  const ids=new Set(children.features.map(f=>f.properties.id)),data={regions:children,boundaries:fc(whole[level].boundaries.features.filter(f=>f.properties.owners.some(id=>ids.has(id))))},file=(level===2?'second/':'third/')+parent.properties.id+'.bin';
  chunks[parent.properties.id]={file,count:children.features.length,level,bytes:write(file,data),decodedBytes:Buffer.byteLength(JSON.stringify(data))};
 }
 write('catalogue.bin',{records,chunks,counts,levels});
 const metrics=new Map();
 function stats(id){if(metrics.has(id))return metrics.get(id);const u=units.get(id);if(u.population){metrics.set(id,u.population);return u.population;}const children=records.filter(r=>r.parent===id);if(!children.length)return null;const parts=children.map(r=>stats(r.id));if(parts.some(p=>!p))return null;const result={...parts[0],value:parts.reduce((s,p)=>s+p.value,0),method:'sum of component administrative units'};metrics.set(id,result);return result;}
 const regions={};for(const r of records){const population=stats(r.id);if(country==='united-states'&&r.overseas){regions[country+':'+r.id]=territoryStat(r,population);continue;}regions[country+':'+r.id]={name:r.en,level:r.level,parent:r.parent,...(population?{population}:{}),area:{value:r.areaKm2,unit:'km²',year:units.get(r.id).areaYear|| (country==='switzerland'?2026:country==='united-states'||country==='mexico'?2025:2024),method:units.get(r.id).reportedArea?'reported':'mapped',source:units.get(r.id).reportedArea?'boundaryArea':'mappedArea',...(country==='united-states'?{label:'Land area'}:{})}};}
 fs.writeFileSync(dir+'/statistics.json',JSON.stringify({version:1,country,retrieved:pins.retrieved,sources:{...sourcesOfStatistics,...territoryStatisticsSources,boundaryArea:{title:'Area reported in the official boundary dataset',url:'data/europe/'+country+'/sources.json'},mappedArea:{...sourcesOfStatistics.mappedArea,url:'data/europe/'+country+'/sources.json'}},regions}));
 const used=[...d.files,'ne-10m-land-boundaries.geojson'].map(file=>({file,...pins.files[file]}));
 fs.writeFileSync(dir+'/sources.json',JSON.stringify({retrieved:pins.retrieved,...(country==='switzerland'?{projection:{source:'EPSG:2056, CH1903+ / LV95',target:'EPSG:4326, WGS84',datumShiftMetres:[674.374,15.056,405.346],reference:'https://www.swisstopo.admin.ch/dam/en/sd-web/rbTNT25PXkEA/georef_d.pdf'}}:{}),counts,frontiers:frontierReports[country],kinds:records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{}),coverage:d.coverage,processing:'All subdivisions use the shared regional renderer. Parent polygons are dissolved from one municipal topology; shared internal edges are stored once. Geometry is simplified together to about 33 m north-south after the source generalisation. Deeper levels load per parent. Land frontiers retain the existing France/Italy reference where present and are drawn once; reference border lines cross large lakes and sea channels independently of coastlines. Population retains the original reference date; no GDP values are inferred.',sources:used},null,2)+'\n');
 if(country==='germany'){const source=JSON.parse(fs.readFileSync('scripts/boundary-sources/germany-denmark/sources.json')),file=dir+'/sources.json',info=JSON.parse(fs.readFileSync(file));info.sources.push({file:'bkg-vg25-lines.geojson.gz',...source});fs.writeFileSync(file,JSON.stringify(info,null,2)+'\n');}
 if(country==='denmark')applyDenmarkStatistics(dir);
 if(country==='united-states')await buildUSCounties(dir+'/');
 if(country==='mexico')await buildMexicoMunicipalities(dir+'/');
 if(country==='canada'){await fetchCanadaLocal();await prepareCanadaStatisticsSources();await buildCanadaLocal(dir+'/');prepareCanadaMunicipalFacts(dir+'/');}
 if(country==='india'){await import('./build-india-districts.mjs');(await import('./prepare-india-names.mjs')).prepareIndiaNames();}
 console.log('Built',country,counts,'chunks',Object.keys(chunks).length);
}

// Retained overseas additions are part of ordinary Netherlands rebuilds.
if(datasets.netherlands&&!process.env.EXPANSION_OUTPUT)await import('./add-dutch-caribbean.mjs');
