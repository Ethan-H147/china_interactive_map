import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import {source,root} from './fetch-moldova-central-asia.mjs';
import {definitions} from './moldova-central-asia-definitions.mjs';
import {load,polygons,linesOf,lineIndex,landIndex,metres} from './geo-index.mjs';
import {command,fc,buildRegionalDataset} from './build-regional-dataset.mjs';
import {readData} from './read-data.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper'),osm=require('osmtogeojson'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const manifest=load(root+'manifest.json'),wb=JSON.parse(source('worldbank.json'))[1],refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const mdNames=['Anenii Noi','Bălți','Basarabeasca','Tighina','Briceni','Cahul','Călărași','Cantemir','Căușeni','Chișinău','Cimișlia','Criuleni','Dondușeni','Drochia','Dubăsari','Edineț','Fălești','Florești','Glodeni','Hîncești','Ialoveni','Leova','Nisporeni','Ocnița','Orhei','Rezina','Rîșcani','Sîngerei','Șoldănești','Soroca','Ștefan Vodă','Strășeni','Taraclia','Telenești','Stânga Nistrului','Ungheni','Găgăuzia'];
const uzEnglish={Andizhan:'Andijan',Dzhizak:'Jizzakh','Republic of Karakalpakstan':'Karakalpakstan'};
const uzPopulation={UZ03:3487900,UZ06:2089400,UZ08:1551700,UZ30:4181000,UZ10:3673700,UZ33:2045700,UZ14:3158400,UZ12:1103300,UZ35:2040700,UZ18:4335700,UZ22:2974400,UZ24:938500,UZ27:3134100,UZ26:3145200};
const tjPopulation={'TJ-RA':2325100,'TJ-SU':3035800,'TJ-KT':3919200,'TJ-GB':236800,'TJ-DU':1300800};
const tmPopulation={'TM-S':1030063,'TM-B':529895,'TM-D':1550354,'TM-L':1447298,'TM-M':1613386};
const tmTop=[7328329,223031,223032,223028,223029,223030,15654588],tjTop=[3279615,3279374,3279616,3279614,7328360];
const relation=(prefix,id)=>{const data=JSON.parse(source(prefix+'-relation-'+id+'.json')),r=data.elements.find(x=>x.type==='relation'&&x.id===id),f=osm(data).features.find(x=>x.id==='relation/'+id);assert(f&&!f.properties.tainted&&['Polygon','MultiPolygon'].includes(f.geometry.type),'Complete polygon '+id);return{tags:r.tags,relation:r,feature:f};};
const closed=path=>metres(path[0],path.at(-1))<1;
function nearestRing(regions,guide){const near=lineIndex([guide]),options=[];for(const f of regions.features)for(const polygon of polygons(f.geometry))for(const ring of polygon){const points=ring.filter((_,i)=>i%Math.max(1,Math.floor(ring.length/100))===0);options.push({ring,f,polygon,score:points.reduce((s,p)=>s+near(p),0)/points.length});}const best=options.sort((a,b)=>a.score-b.score)[0];assert(best&&best.score<20000,'Closed enclave frontier');return best;}
const frontier=(outline,guide)=>closed(guide)?nearestRing(outline,guide).ring:selectFrontierArc(outline,guide,{maximumScoreMetres:50000}).path;
async function shape(name){const z=unzipSync(source(name)),key=Object.keys(z).find(k=>k.endsWith('.shp')),files=Object.fromEntries(['shp','shx','dbf','prj'].map(ext=>['in.'+ext,Buffer.from(z[key.replace(/shp$/,ext)])]));return JSON.parse((await mapshaper.applyCommands('-i in.shp -proj wgs84 -o out.json format=geojson precision=.000001',files))['out.json']);}
// Clip each local partition to its displayed parent. Source gaps extend only an
// adjoining local area; isolated islands use the nearest area in that parent.
async function conform(children,parent){
 const clipped=await command({'children.json':children,'parent.json':fc([parent])},'-clip parent.json -clean gap-fill-area=0'),mask=polygons(parent.geometry);
 const gaps=polygonClipping.difference(mask,...clipped.features.map(f=>polygons(f.geometry))),edges=clipped.features.map(f=>lineIndex(polygons(f.geometry).flat())),patches=clipped.features.map(()=>[]);
 for(const g of gaps){const lengths=clipped.features.map(()=>0);for(const ring of g)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];edges.forEach((edge,j)=>{if(edge(mid)<.5)lengths[j]+=metres(a,b);});}let owner=lengths.indexOf(Math.max(...lengths));if(!lengths[owner])owner=edges.map(e=>e(g[0][0])).indexOf(Math.min(...edges.map(e=>e(g[0][0]))));assert(owner>=0);patches[owner].push(g);}
 const rounded=value=>typeof value==='number'?Math.round(value*1e9)/1e9:value.map(rounded),pieces=[...clipped.features];
 for(let i=0;i<clipped.features.length;i++)for(const coordinates of patches[i])pieces.push({type:'Feature',properties:{...clipped.features[i].properties},geometry:{type:'Polygon',coordinates:rounded(coordinates)}});
 const merged=await command(fc(pieces),'-dissolve2 id,parent -clean gap-fill-area=0',{precision:null});
 for(const f of merged.features)f.geometry={type:'MultiPolygon',coordinates:polygonClipping.intersection(polygons(f.geometry),mask)};
 return merged;
}
const old={ROU:'europe/romania',UKR:'europe/ukraine',KAZ:'europe/kazakhstan',KGZ:'europe/kyrgyzstan',AFG:'europe/afghanistan'},processed=new Map(),frontiers=fs.existsSync(root+'frontiers.json')?load(root+'frontiers.json'):{};
const selectedCountry=process.argv.find(a=>a.startsWith('--country='))?.split('=')[1];
if(selectedCountry)assert(definitions.some(d=>d.country===selectedCountry),'Known country');
for(const country of ['moldova','uzbekistan','tajikistan','turkmenistan'].filter(c=>!selectedCountry||c===selectedCountry)){
 const d=definitions.find(d=>d.country===country),units=new Map();let first,bottom;
 const put=(f,u)=>{assert(!units.has(u.id));units.set(u.id,u);f.properties={id:u.id,...(u.parent?{parent:u.parent}:{})};return f;};
 if(country==='moldova'){
  first=JSON.parse(Buffer.from(unzipSync(source('mda.zip'))['mda_admin1.geojson']));
  const census=load(root+'moldova-census-normalized.json');assert.equal(census.sourceSha256,createHash('sha256').update(source('moldova-census.xlsx')).digest('hex'));
  for(const f of first.features){const p=f.properties,id=p.adm1_pcode,local=mdNames[+id.slice(2)-1],en=id==='MD004'?'Bender':id==='MD035'?'Transnistria':id==='MD037'?'Gagauzia':local;
   const row=census.rows.find(r=>norm(r.name.replace(/ mun\./,''))===norm(local)||id==='MD037'&&norm(r.name).includes('gagauz'));
   const population=row&&!['MD004','MD009','MD015','MD035'].includes(id)?{value:row.population,year:2024,date:'2024-04-08',method:'census',periodLabel:'2024 census · usual residents',source:'population'}:null;
   put(f,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:1,parent:null,en,local,names:{ro:local},kind:['MD002','MD004','MD010'].includes(id)?'Municipality':id==='MD037'?'Autonomous territorial unit':id==='MD035'?'Territorial unit':'District',aliases:[p.adm1_name,...(id==='MD004'?['Tighina']:id==='MD035'?['Pridnestrovie','Transdniestria','Stânga Nistrului']:id==='MD037'?['Gagauz Yeri','UTA Găgăuzia']:[])],...(population?{population}:{}),...(['MD004','MD035'].includes(id)?{note:'Shown within Moldova’s internationally recognized borders. This area is administered by the de facto Transnistrian authorities.'}:['MD009','MD015'].includes(id)?{note:'The 2024 census excluded some localities within this mapped district; its partial count is not used for the whole polygon.'}:{})});
  }
 }else if(country==='uzbekistan'){
  first=await shape('uzb-adm1.zip');bottom=await shape('uzb-adm2.zip');
  for(const f of first.features){const p=f.properties,id=p.ADM1_PCODE,en=uzEnglish[p.ADM1_EN]||p.ADM1_EN,local=p.ADM1_UZ.replace('ш.','shahri');put(f,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:1,parent:null,en,local,names:{uz:local,ru:p.ADM1_RU},kind:id==='UZ35'?'Autonomous republic':id==='UZ26'?'City':'Region',aliases:[p.ADM1_EN,p.ADM1_RU,p.ADM1_UZ,...(id==='UZ26'?['Toshkent city','Tashkent capital']:[])],population:{value:uzPopulation[id],year:2025,date:'2025-07-01',method:'estimate',periodLabel:'1 July 2025 · permanent population',source:'population'}});}
  for(const f of bottom.features){const p=f.properties,id=p.ADM2_PCODE,en=p.ADM2_EN,local=p.ADM2_UZ;put(f,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:2,parent:p.ADM1_PCODE,en,local,names:{uz:local,ru:p.ADM2_RU},kind:p.ADM2TYPEEN==='city'?'City':'District',aliases:[p.ADM2_EN,p.ADM2_RU,p.ADM2_UZ,en+', '+units.get(p.ADM1_PCODE).en]});}
  bottom=await command(bottom,'-clean gap-fill-area=0');first=await command(bottom,'-dissolve2 parent -rename-fields id=parent');
 }else{
  const prefix=d.prefix,top=country==='tajikistan'?tjTop:tmTop,features=[],topIds=new Map();
  for(const id of top){const {tags:t,feature:f}=relation(prefix,id),code=t['ISO3166-2']||(id===7328360?'TJ-DU':id===15654588?'TM-ARK':null);assert(code);topIds.set(id,code);
   let en=t['name:en']||t.int_name||t.name;en=en.replace(/ (Province|Region)$/,'');if(id===3279614)en='Gorno-Badakhshan';if(id===3279615)en='Districts of Republican Subordination';const local=(t['name:'+d.lang]||t.name).replace(/ (welaýaty)$/,'');
   const value=country==='tajikistan'?tjPopulation[code]:tmPopulation[code];features.push(put(f,{id:code,code,codeScheme:code==='TM-ARK'?'Atlas code; OSM relation 15654588':'ISO 3166-2',osmRelation:id,level:1,parent:null,en,local,names:{[d.lang]:local,...(t['name:ru']?{ru:t['name:ru']}:{})},kind:id===3279614?'Autonomous region':id===3279615?'Republican districts':[7328360,7328329,15654588].includes(id)?'City':country==='turkmenistan'?'Province':'Region',aliases:[t.name,t['name:en'],t['name:ru'],...(id===223028?['Dashoguz','Tashauz']:id===7328360?['Dushanbe city']:id===7328329?['Aşgabat','Ashkhabad']:id===15654588?['Arkadag city']:[])].filter(Boolean),...(value?{population:{value,year:country==='tajikistan'?2026:2022,date:country==='tajikistan'?'2026-07-01':'2022-12-17',method:country==='tajikistan'?'estimate':'census',periodLabel:country==='tajikistan'?'1 July 2026 · preliminary estimate':'2022 census',source:'population'}}:{}),...(code==='TM-A'?{note:'The 2022 census reported Ahal before Arkadag became a separate city. That earlier combined total is not applied to this current province polygon.'}:{})}));
  }
  first=fc(features);
  if(country==='turkmenistan'){
   const cities=fc(features.filter(f=>['TM-S','TM-ARK'].includes(f.properties.id))),provinces=await command({'provinces.json':fc(features.filter(f=>!['TM-S','TM-ARK'].includes(f.properties.id))),'cities.json':cities},'-erase cities.json');first=fc([...provinces.features,...cities.features]);
   const children=Object.entries(manifest.files).filter(([name,m])=>name.startsWith('tm-relation-')&&m.parentRelation);bottom=fc(children.map(([name,m])=>{const {tags:t,feature:f}=relation('tm',m.relation),en=(t['name:en']||t.name).replace(/ District$/,''),local=t['name:tk']||t.name;return put(f,{id:'TM-OSM-'+m.relation,code:String(m.relation),codeScheme:'OpenStreetMap relation',osmRelation:m.relation,level:2,parent:topIds.get(m.parentRelation),en,local,names:{tk:local,...(t['name:ru']?{ru:t['name:ru']}:{})},kind:t.place==='city'||!t['name:en']?.includes('District')?'City':'District',aliases:[t.name,t['name:en'],t['name:ru']].filter(Boolean)});}));
  }
 }
 first=await command(first,'-clean gap-fill-area=0');
 const groups=new Map();for(const f of refs.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.includes(d.iso))continue;const other=sides.find(x=>x!==d.iso);if(!groups.has(other))groups.set(other,[]);groups.get(other).push(...linesOf(fc([f])));}
 const reports=[];
 for(const [other,paths]of groups){let target=processed.get(other);if(!target&&old[other]){const data=load('dist/data/'+old[other]+'/first.bin');target=data.regions||data;}if(other==='CHN')target=readData('display-boundaries.json').provinces;if(!target)continue;const outline=await command(target,'-dissolve2');
  for(const guide of joinReferencePaths(paths)){console.log('Align',d.iso,other,closed(guide)?'enclave':'frontier');
   // Romania already owns the complete Prut frontier, including its lake
   // crossing and tripoints. Reuse that arc rather than a second survey.
   const romanian=country==='moldova'&&other==='ROU'?load('scripts/boundary-sources/four-europe/resolved.bin').features.find(f=>f.properties.pair==='MDA-ROU'):null;
   const canonical=romanian?romanian.geometry.coordinates:frontier(outline,guide);let displacement=0;if(closed(guide)){const match=nearestRing(first,guide);match.polygon[match.polygon.indexOf(match.ring)]=structuredClone(canonical);first=await command(first,'-clean gap-fill-area=0');}else{const result=await alignArc(first,canonical,{maxDistance:40000,maxSelectionMetres:40000,maxDeviationMetres:romanian?5:5000,coastalTrimMetres:romanian?0:5000});first=result.regions;displacement=result.maxEndpointDisplacementMetres;}reports.push({pair:[d.iso,other].sort().join('-'),vertices:canonical.length,owner:other,maxEndpointDisplacementMetres:displacement});}
 }
 const legal=structuredClone(first);first=await command({'first.json':first,'lakes.json':lakes},'-erase lakes.json -clean gap-fill-area=0');
 if(bottom){const aligned=[];for(const p of first.features){const children=fc(bottom.features.filter(f=>units.get(f.properties.id).parent===p.properties.id));if(children.features.length)aligned.push(...(await conform(children,p)).features);}bottom=fc(aligned);}
 assert.equal(first.features.length,d.counts[1]);if(bottom)assert.equal(bottom.features.length,country==='uzbekistan'?199:d.counts[2]);
 const populationSource={title:country==='moldova'?'NBS Moldova: final 2024 census, table 5; usual residents, census-covered territory':country==='uzbekistan'?'National Statistics Committee: permanent population by region, 1 July 2025':country==='tajikistan'?'Agency on Statistics: preliminary population by region, 1 July 2026':'State Committee on Statistics: 17 December 2022 census; mapped regions with unchanged scope',url:manifest.files[country==='moldova'?'moldova-census.xlsx':country==='uzbekistan'?'uzbekistan-population.html':country==='tajikistan'?'tajikistan-population.html':'turkmenistan-census.html'].url};
 const coverage=country==='moldova'?'37 source units: 32 districts, three municipalities, Gagauzia and the left-bank territorial unit. The eastern territory remains within Moldova. 2022 OCHA/UNHCR geometry. Census coverage excludes Transnistrian-administered places; partial district totals are not applied to full polygons.':country==='uzbekistan'?'14 top-level units and 199 district/city units from the retained OCHA 2018 reference, reviewed January 2024. The administrative roster is dated and does not claim later district reforms. Native Uzbek and Russian names come from the same source.':'Current mapped '+(country==='tajikistan'?'five regions/equivalents; lower-level geometry is not offered because the available national layer is dated 2017 and lacks current city divisions.':'five provinces plus Ashgabat and Arkadag; 51 mapped district/city units, including the capital city boroughs. Arkadag is promoted from its OSM subarea position to its statutory first-level city status and removed from Ahal’s fill.')+' OpenStreetMap relation snapshots retrieved 26 October 2026. Boundaries are an administrative map reference. Shared international edges follow existing atlas neighbours; population is separately dated. Inland lake surfaces are excluded. National GDP is retained separately and never assigned to regions.';
 for(const unit of units.values())unit.localLang=d.lang;
 await buildRegionalDataset({country,units,byLevel:{1:first,...(bottom?{2:bottom}:{})},year:['moldova','uzbekistan'].includes(country)?country==='moldova'?2022:2018:2026,retrieved:manifest.retrieved,levels:d.levels,sources:Object.fromEntries(Object.entries(manifest.files).filter(([name])=>name.startsWith(d.prefix+'-')||name.startsWith(d.iso.toLowerCase())||name.startsWith(country))),coverage,statisticsSources:{population:populationSource,worldbank:{title:'World Bank World Development Indicators: national current-price GDP, GDP per capita and population',url:manifest.files['worldbank.json'].url,license:'CC BY 4.0'}}});
 const dir='dist/data/europe/'+country+'/',write=(file,value)=>fs.writeFileSync(dir+file,gzipSync(JSON.stringify(value),{level:9}));write('political.bin',first);
 if(country==='moldova'){
  const canonical=load('scripts/boundary-sources/four-europe/resolved.bin').features.find(f=>f.properties.pair==='MDA-ROU').geometry.coordinates;
  // Context simplification must retain the same shared edge as Romania.
  const context=await alignArc(load(dir+'context.bin'),canonical,{maxDistance:1000,maxSelectionMetres:1000,maxDeviationMetres:5});
  write('context.bin',context.regions);
 }
 const own=[],outline=await command(legal,'-dissolve2');for(const [other,paths]of groups){if(old[other]||other==='CHN'||processed.has(other))continue;for(const guide of joinReferencePaths(paths)){const path=frontier(outline,guide);own.push({type:'Feature',properties:{countries:[country],pair:[d.iso,other].sort().join('-'),boundaryType:'land frontier'},geometry:{type:'LineString',coordinates:path}});}}
 write('international.bin',lineData(fc(own)));processed.set(d.iso,legal);frontiers[country]={aligned:reports,owned:own.map(f=>({pair:f.properties.pair,vertices:f.geometry.coordinates.length}))};
 const stats=load(dir+'statistics.json'),cat=load(dir+'catalogue.bin'),rows=wb.filter(r=>r.countryiso3code===d.iso),year=[2025,2024,2023].find(y=>['NY.GDP.MKTP.CD','NY.GDP.PCAP.CD','SP.POP.TOTL'].every(code=>rows.some(r=>r.indicator.id===code&&+r.date===y&&r.value>0)));assert(year,'National economics '+country);const value=code=>rows.find(r=>r.indicator.id===code&&+r.date===year).value;
 stats.regions[country+':'+d.iso]={name:d.en,level:0,parent:null,area:{value:cat.records.filter(r=>r.level===1).reduce((sum,r)=>sum+r.areaKm2,0),unit:'km²',year:2026,source:'boundaryArea',method:'mapped',label:'Mapped land area'},population:{value:value('SP.POP.TOTL'),year,source:'worldbank',method:'estimate'},gdp:{value:value('NY.GDP.MKTP.CD'),currency:'USD',usd:value('NY.GDP.MKTP.CD'),year,priceBasis:'current',source:'worldbank'},gdpPerCapita:{value:value('NY.GDP.PCAP.CD'),currency:'USD',usd:value('NY.GDP.PCAP.CD'),year,priceBasis:'current',source:'worldbank',method:'published'}};fs.writeFileSync(dir+'statistics.json',JSON.stringify(stats)+'\n');
 fs.writeFileSync('dist/vendor/flag-'+d.prefix+'.svg',source('flag-'+d.prefix+'.svg'));
 console.log('Finished',country,cat.counts,'population cards',Object.values(stats.regions).filter(r=>r.level===1&&r.population).length);
}
fs.writeFileSync(root+'frontiers.json',JSON.stringify(frontiers,null,2)+'\n');
if(!selectedCountry){
const flags=load('dist/data/europe/flag-sources.json'),images=load('dist/data/flag-images.json'),prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,''));
for(const d of definitions){const sourceRecord=manifest.files['flag-'+d.prefix+'.svg'],svg=source('flag-'+d.prefix+'.svg').toString(),tag=svg.match(/<svg\b[^>]*>/)[0],view=tag.match(/viewBox="([^"]+)"/)?.[1].split(/[ ,]+/).map(Number),width=view?.[2]||Number(tag.match(/\bwidth="([\d.]+)/)?.[1]),height=view?.[3]||Number(tag.match(/\bheight="([\d.]+)/)?.[1]);assert(width>0&&height>0);const f={file:'vendor/flag-'+d.prefix+'.svg',full:'vendor/flag-'+d.prefix+'.svg',width,height,...sourceRecord,source:sourceRecord.url};flags.flags[d.country]=f;images[f.file]=f;national[f.file]=f;}
fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions.\n'+prefix+JSON.stringify(national)+';\n');
}
