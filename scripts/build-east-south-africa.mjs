import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {unzipSync} from 'fflate';
import {source,root} from './fetch-east-south-africa.mjs';
import {load,linesOf,polygons,lineIndex} from './geo-index.mjs';
import {command,fc,buildRegionalDataset} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper'),manifest=load(root+'manifest.json'),census=JSON.parse(source('census-normalized.json')),wb=JSON.parse(source('worldbank.json'))[1];
const definitions=[{country:'zimbabwe',iso:'ZWE',prefix:'zw',first:10,second:91,year:2018,firstKind:'Province',secondKind:'District',levels:['Provinces & cities','Districts']},{country:'zambia',iso:'ZMB',prefix:'zm',first:10,second:116,year:2020,firstKind:'Province',secondKind:'District',levels:['Provinces','Districts']},{country:'tanzania',iso:'TZA',prefix:'tz',first:31,second:170,year:2018,firstKind:'Region',secondKind:'District',levels:['Regions','Districts']},{country:'kenya',iso:'KEN',prefix:'ke',first:47,second:290,year:2018,firstKind:'County',secondKind:'Sub-county',levels:['Counties','Sub-counties']}];
const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^northwestern$/,'northwestern').replace(/^nairobicity$/,'nairobi');
const canonical=s=>({'Dar-es-salaam':'Dar es Salaam','Nairobi':'Nairobi City'}[s]||s.trim());
async function shapes(d){
 if(d.iso==='ZMB')return Object.fromEntries([1,2].map(level=>[level,JSON.parse(source('zmb-admin'+level+'.geojson'))]));
 if(d.iso!=='TZA'){const z=unzipSync(source(d.iso.toLowerCase()+'-boundaries.zip'),{filter:f=>new RegExp(d.iso.toLowerCase()+'_admin[12]\\.geojson$').test(f.name)});return Object.fromEntries([1,2].map(level=>{const key=Object.keys(z).find(k=>k.endsWith('_admin'+level+'.geojson'));assert(key);return[level,JSON.parse(Buffer.from(z[key]))];}));}
 const out={};for(const level of [1,2]){const z=unzipSync(source('tza-'+level+'.zip')),key=Object.keys(z).find(k=>k.endsWith('.shp')),files=Object.fromEntries(['shp','shx','dbf','prj'].filter(ext=>z[key.replace(/shp$/,ext)]).map(ext=>['in.'+ext,Buffer.from(z[key.replace(/shp$/,ext)])]));out[level]=JSON.parse((await mapshaper.applyCommands('-i in.shp -proj wgs84 -o out.json format=geojson precision=.000001',files))['out.json']);}return out;
}
const refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz');
const lakeEdge=lineIndex(lakes.features.flatMap(f=>polygons(f.geometry).flat()));
const old={ZAF:'southern-africa/south-africa',BWA:'southern-africa/botswana',NAM:'southern-africa/namibia',AGO:'europe/angola',COD:'europe/congo'},processed=new Map(),frontiers={};
const guideGroups=iso=>{const groups=new Map();for(const f of refs.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.includes(iso))continue;const other=sides.find(c=>c!==iso),water=f.properties.TYPE==='Water Indicator',key=other+':'+water;if(!groups.has(key))groups.set(key,{other,water,paths:[]});groups.get(key).paths.push(...linesOf(fc([f])));}return [...groups.values()].flatMap(g=>joinReferencePaths(g.paths).map(reference=>({...g,reference})));};
async function landAndWaterGuides(iso){
 const out=[];for(const g of guideGroups(iso)){
  if(g.water){out.push(g);continue;}
  const line=fc([{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:g.reference}}]);
  for(const [operation,water]of [['erase',false],['clip',true]]){const parts=await command({'guide.json':line,'lakes.json':lakes},'-'+operation+' lakes.json');for(const reference of joinReferencePaths(linesOf(parts)))if(reference.length>1)out.push({...g,water,reference});}
 }return out;
}
for(const d of definitions){
 const raw=await shapes(d),units=new Map();assert.equal(raw[1].features.length,d.first);assert.equal(raw[2].features.length,d.second);
 const prop=(p,level,key)=>p['adm'+level+'_'+key]??p['ADM'+level+'_'+(key==='name'?'EN':'PCODE')];
 for(const f of raw[1].features){const p=f.properties,id=prop(p,1,'pcode'),en=canonical(prop(p,1,'name'));units.set(id,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:1,parent:null,en,local:'',kind:d.country==='zimbabwe'&&['Harare','Bulawayo'].includes(en)?'City province':d.firstKind,aliases:[prop(p,1,'name'),en+' '+d.firstKind.toLowerCase()]});}
 for(const f of raw[2].features){const p=f.properties,id=prop(p,2,'pcode'),parent=prop(p,1,'pcode'),en=canonical(prop(p,2,'name'));assert(units.has(parent));assert(!units.has(id));units.set(id,{id,code:id,codeScheme:'OCHA COD administrative P-code',level:2,parent,en,local:'',kind:d.secondKind,aliases:[prop(p,2,'name'),en+', '+units.get(parent).en]});f.properties={id,parent};}
 let bottom=await command(raw[2],'-clean gap-fill-area=0 -simplify dp interval=.00015 planar keep-shapes -clean gap-fill-area=0');
 const groups=await landAndWaterGuides(d.iso),report=[];
 for(const g of groups){
  if(g.water)continue;let target;
  if(processed.has(g.other))target=processed.get(g.other);
  else if(old[g.other]){const data=load('dist/data/'+old[g.other]+'/first.bin');target=data.regions||data;}
  if(!target)continue;
  console.log('Reconciling',d.iso,g.other,g.reference[0],g.reference.at(-1));
  const outline=await command(target,'-dissolve2'),reference=selectFrontierArc(outline,g.reference,{maximumScoreMetres:50000}).path;
  const coastalTrimMetres=[g.reference[0],g.reference.at(-1)].some(p=>lakeEdge(p)<50)?20000:7000;
  const result=await alignArc(bottom,reference,{maxDistance:30000,maxSelectionMetres:30000,maxDeviationMetres:2500,coastalTrimMetres});bottom=result.regions;report.push({pair:[d.iso,g.other].sort().join('-'),vertices:reference.length,owner:processed.has(g.other)?definitions.find(x=>x.iso===g.other).country:old[g.other],maxEndpointDisplacementMetres:result.maxEndpointDisplacementMetres,validationToleranceMetres:2500,coastalTrimMetres,method:'New districts follow the existing neighbour outline; river-island survey differences and lake-separated endpoint allowances are recorded explicitly'});
 }
 const legalFirst=await command(bottom,'-dissolve2 parent -rename-fields id=parent');
 bottom=await command({'districts.json':bottom,'lakes.json':lakes},'-erase lakes.json -clean gap-fill-area=0');assert.equal(bottom.features.length,d.second,'Every district survives lake masking');
 const first=await command(bottom,'-dissolve2 parent -rename-fields id=parent');assert.equal(first.features.length,d.first);
 const stats={},popSource={title:d.country==='zambia'?'ZamStats: 2022 Census preliminary report, provincial population':d.country==='kenya'?'KNBS: 2019 census population by county, all sexes':d.country==='tanzania'?'NBS / OCGS: 2022 Census, population by region':'ZIMSTAT: final 2022 Census report, population by province',url:census[d.country].url};
 const sourceRows=census[d.country].rows;
 for(const r of units.values()){
  if(r.level===1){const row=sourceRows.find(p=>norm(p.name)===norm(r.en));assert(row,'Census identity '+d.country+' '+r.en);r.population={value:row.population,year:census[d.country].year,method:'census',periodLabel:census[d.country].year+' census'+(census[d.country].status?' · '+census[d.country].status:''),source:'population'};}
  else r.note=d.country==='kenya'?'This dated boundary source maps 290 sub-counties. The census uses a different lower-level roster; county population is shown without assigning mismatched sub-county counts.':'A census population count matching this dated district boundary has not yet been verified. Province or region population is available.';
 }
 assert.equal([...units.values()].filter(r=>r.level===1).reduce((s,r)=>s+r.population.value,0),census[d.country].national);
 const coverage='Retained OCHA COD-AB '+d.year+' boundary reference: '+d.first+' '+d.levels[0].toLowerCase()+' and '+d.second+' '+d.levels[1].toLowerCase()+'. This is a dated source, not a claim that every later administrative reform is included. '+(d.country==='tanzania'?'All five Zanzibar regions and Songwe are included. The district layer is the 170-unit 2018 reference, not the later council roster. ':d.country==='zimbabwe'?'Harare and Bulawayo retain their provincial status; the 91 district polygons include separately mapped urban districts. ':d.country==='zambia'?'Constituencies and wards are not substituted for administrative districts. ':'The source’s 290 sub-county reference is retained and is distinct from the census sub-county division. Its northern outline follows the retained source around the disputed Ilemi Triangle; it is not a sovereignty determination. ')+'First-level population uses the separately dated national census source. Inland lake surfaces are excluded from mapped land. National GDP is not allocated to subdivisions.';
 await buildRegionalDataset({country:d.country,units,byLevel:{1:first,2:bottom},sources:manifest.files,coverage,year:d.year,retrieved:manifest.retrieved,levels:d.levels,statisticsSources:{population:popSource,worldbank:{title:'World Bank World Development Indicators: 2025 nominal national GDP and GDP per capita',url:manifest.files['worldbank.json'].url,license:'CC BY 4.0'}}});
 const dir='dist/data/europe/'+d.country+'/',write=(file,value)=>fs.writeFileSync(dir+file,gzipSync(JSON.stringify(value),{level:9}));write('political.bin',first);
 const own=[];const outline=await command(legalFirst,'-dissolve2');
 for(const g of groups){if(old[g.other]||processed.has(g.other))continue;const pair=[d.iso,g.other].sort().join('-'),disputed=d.country==='kenya'&&['SDS','SSD'].includes(g.other),path=g.water?g.reference:selectFrontierArc(outline,g.reference,{maximumScoreMetres:disputed?100000:50000}).path;own.push({type:'Feature',properties:{countries:[d.country],pair,boundaryType:g.water?'water reference':disputed?'disputed administrative reference':'land frontier'},geometry:{type:'LineString',coordinates:path}});}
 write('international.bin',lineData(fc(own)));processed.set(d.iso,legalFirst);frontiers[d.country]={aligned:report,owned:own.map(f=>({pair:f.properties.pair,vertices:f.geometry.coordinates.length,water:f.properties.boundaryType==='water reference'})),delegatedToExisting:groups.filter(g=>old[g.other]||processed.has(g.other)&&g.other!==d.iso).map(g=>[d.iso,g.other].sort().join('-'))};
 const data=load(dir+'statistics.json'),records=load(dir+'catalogue.bin').records;
 const value=code=>{const r=wb.find(r=>r.countryiso3code===d.iso&&r.indicator.id===code&&r.date==='2025');assert(r?.value>0);return r.value;},gdp=value('NY.GDP.MKTP.CD'),pc=value('NY.GDP.PCAP.CD');if(d.country!=='tanzania')assert(Math.abs(gdp/pc-value('SP.POP.TOTL'))<.01);
 data.regions[d.country+':'+d.iso]={name:d.country[0].toUpperCase()+d.country.slice(1),level:0,parent:null,area:{value:records.filter(r=>r.level===1).reduce((s,r)=>s+r.areaKm2,0),unit:'km²',year:d.year,source:'boundaryArea',method:'mapped',label:'Mapped land area'},population:{value:census[d.country].national,year:census[d.country].year,method:'census',periodLabel:census[d.country].year+' census'+(census[d.country].status?' · '+census[d.country].status:''),source:'population'},gdp:{value:gdp,usd:gdp,currency:'USD',year:2025,priceBasis:'current',source:'worldbank'},gdpPerCapita:{value:pc,usd:pc,currency:'USD',year:2025,priceBasis:'current',method:'published',source:'worldbank',populationYear:2025,populationValue:value('SP.POP.TOTL'),scopeNote:'Published using the 2025 annual population series, separately dated from the census population above.'},note:'National economic output is not assigned to individual provinces, regions, counties or districts.'};
 if(d.country==='tanzania'){
  const e=JSON.parse(source('tza-national-economy.json'));assert.equal(e.population,e.mainlandPopulation+e.zanzibarPopulation);assert.equal(e.year,2025);data.sources.economy={title:'NBS / OCGS: 2025 current-price GDP of the United Republic of Tanzania, including Zanzibar; Table 26',url:e.url};
  const money=value=>({value,usd:value/e.exchangeRate,currency:'TZS',year:2025,priceBasis:'current',source:'economy',exchangeRate:e.exchangeRate,exchangeYear:2025,exchangeSource:'economy'});
  Object.assign(data.regions[d.country+':'+d.iso],{gdp:{...money(e.gdp),scopeNote:'Whole United Republic of Tanzania, including Zanzibar.'},gdpPerCapita:{...money(e.gdpPerCapita),label:'GDP per resident (calculated)',method:'calculated',populationYear:2025,populationValue:e.population,populationSource:'economy',scopeNote:'Uses the sum of the report’s 2025 mainland and Zanzibar population components.',note:e.perCapitaMethod}});
 }
 fs.writeFileSync(dir+'statistics.json',JSON.stringify(data)+'\n');
 fs.writeFileSync('dist/vendor/flag-'+d.prefix+'.svg',source('flag-'+d.prefix+'.svg'));
}
fs.writeFileSync(root+'frontiers.json',JSON.stringify(frontiers,null,2)+'\n');
const flags=load('dist/data/europe/flag-sources.json'),images=load('dist/data/flag-images.json'),prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,''));
for(const d of definitions){const file='flag-'+d.prefix+'.svg',pin=manifest.files[file],svg=source(file).toString(),box=svg.match(/viewBox=["']([^"']+)/)?.[1].split(/\s+/).map(Number),width=box?.[2]||+svg.match(/width=["']([\d.]+)/)?.[1],height=box?.[3]||+svg.match(/height=["']([\d.]+)/)?.[1];assert(width>0&&height>0);const entry={file:'vendor/'+file,full:'vendor/'+file,width,height,source:pin.url,page:pin.page,license:pin.license,credit:pin.credit,sha256:pin.sha256};flags.flags[d.country]=entry;images[entry.file]=entry;national[entry.file]=entry;}
fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions, independent of thumbnail proportions.\n'+prefix+JSON.stringify(national)+';\n');
