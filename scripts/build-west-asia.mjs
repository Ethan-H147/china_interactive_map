import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {source,root} from './fetch-west-asia.mjs';
import {definitions} from './west-asia-definitions.mjs';
import {load,polygons,linesOf,lineIndex,metres} from './geo-index.mjs';
import {command,fc,buildRegionalDataset} from './build-regional-dataset.mjs';
import {joinReferencePaths} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {frontier} from './regional-coverage-tools.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {caspianWater} from './caucasus-gulf-water.mjs';
const require=createRequire(import.meta.url),osm=require('osmtogeojson'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const manifest=load(root+'manifest.json'),refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),lakes=load('scripts/boundary-sources/nordics/ne-lakes.json.gz'),wb=JSON.parse(source('worldbank.json'))[1];
const population={iran:load(root+'iran-population-normalized.json'),iraq:load(root+'iraq-population-normalized.json'),'saudi-arabia':load(root+'saudi-population-normalized.json')};
for(const [c,name]of [['iran','iran-population.pdf'],['iraq','iraq-population.xlsx'],['saudi-arabia','saudi-population.pdf']])assert.equal(population[c].sourceSha256,createHash('sha256').update(source(name)).digest('hex'),'Census normalization checksum '+c);
const iqIso={IQG01:'IQ-AN',IQG02:'IQ-BA',IQG03:'IQ-MU',IQG04:'IQ-NA',IQG05:'IQ-QA',IQG06:'IQ-SU',IQG07:'IQ-BB',IQG08:'IQ-BG',IQG09:'IQ-DA',IQG10:'IQ-DI',IQG11:'IQ-AR',IQG12:'IQ-KA',IQG13:'IQ-KI',IQG14:'IQ-MA',IQG15:'IQ-NI',IQG16:'IQ-SD',IQG17:'IQ-DQ',IQG18:'IQ-WA'};
const iraqNames=load(root+'iraq-governorate-mapping.json');
const existing={TUR:'turkey',ARM:'armenia',AZE:'azerbaijan',TKM:'turkmenistan',AFG:'afghanistan',PAK:'pakistan',QAT:'qatar',ARE:'united-arab-emirates'},processed=new Map(),frontiers=fs.existsSync(root+'frontiers.json')?load(root+'frontiers.json'):{};
const only=process.argv.find(a=>a.startsWith('--country='))?.slice(10);if(only)assert(definitions.some(d=>d.country===only),'Known country');
const save=(file,data)=>fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
for(const d of definitions){
 if(only&&d.country!==only){processed.set(d.iso,load('dist/data/europe/'+d.country+'/political.bin'));continue;}
 const country=d.country,units=new Map(),z=unzipSync(source(d.iso.toLowerCase()+'.zip'));let first=JSON.parse(Buffer.from(z[d.iso.toLowerCase()+'_admin1.geojson']));
 for(const f of first.features){const p=f.properties,id=p.adm1_pcode,iso=country==='iraq'?iqIso[id]:null,rows=population[country],row=country==='iraq'?rows.records.find(r=>r.iso===iso):rows.rows.find(r=>r.id===id);assert(row,'Exact regional census join '+country+' '+id);
  const mapping=country==='iraq'?iraqNames.find(r=>r.iso===iso):null;
  const en=country==='iraq'?row.en:row.en||p.adm1_name,local=country==='iraq'?row.ar:row.local||p.adm1_name1;
  const pop=country==='iraq'&&iso==='IQ-SU'?null:{value:row.population,year:row.year,source:'population',method:'census',periodLabel:row.periodLabel||'2024 census · residents'};
  const note=country==='iraq'&&iso==='IQ-SU'?'The 2024 census reports Sulaymaniyah together with Halabja. Its combined count is not assigned to this smaller polygon.':null;
  units.set(id,{id,code:id,codeScheme:'OCHA COD administrative P-code',...(iso?{iso}:{}),level:1,parent:null,en,local,localLang:d.lang,localDir:'rtl',names:{[d.lang]:local,...(mapping?.ckb?{ckb:mapping.ckb.replace(/^پارێزگای\s*/, '')}:{}),...(mapping?.ku?{ku:mapping.ku}:{})},aliases:[p.adm1_name,p.adm1_name1,...(row.aliases||[]),...(mapping?[mapping.en,mapping.ar,mapping.ckb,mapping.ku]:[])].filter(Boolean),kind:country==='iran'?'Province':country==='iraq'?'Governorate':'Administrative region',...(pop?{population:pop}:{}),...(note?{note}:{})});
  f.properties={id};
 }
 if(country==='iraq'){
  const data=JSON.parse(source('halabja-relation.json')),shape=osm(data).features.find(f=>f.id==='relation/3826029');assert(shape&&!shape.properties.tainted,'Complete Halabja OSM relation');
  const parent=first.features.find(f=>f.properties.id==='IQG06'),halabja=await command({'halabja.json':fc([shape]),'parent.json':fc([parent])},'-clip parent.json -dissolve2 -clean gap-fill-area=0');
  assert(halabja.features[0]?.geometry,'Halabja lies inside retained Sulaymaniyah');const id='IQ-OSM-3826029';
  const remainder=await command({'parent.json':fc([parent]),'halabja.json':halabja},'-erase halabja.json -clean gap-fill-area=0');
  first.features=[...first.features.filter(f=>f!==parent),...remainder.features,...halabja.features.map(f=>({...f,properties:{id}}))];
  const mapping=iraqNames.find(r=>r.relation===3826029);assert(mapping);
  units.set(id,{id,code:'3826029',codeScheme:'OpenStreetMap relation; clipped to the retained HDX parent',level:1,parent:null,en:'Halabja',local:'حلبجة',localLang:'ar',localDir:'rtl',names:{ar:'حلبجة',ckb:mapping.ckb?.replace(/^پارێزگای\s*/,'')||'هەڵەبجە',ku:mapping.ku||'Helebce'},aliases:[mapping.en,mapping.ar,mapping.ckb,mapping.ku,'Halabjah','Helebce'].filter(Boolean),kind:'Governorate',osmRelation:3826029,note:'Separate governorate recognized federally in 2025. The current OSM split is clipped to the dated HDX Sulaymaniyah exterior. The 2024 census has no separate matching population count.'});
 }
 first=await command(first,'-clean gap-fill-area=0');
 const groups=new Map();for(const f of refs.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.includes(d.iso)||f.properties.TYPE==='Water Indicator')continue;const other=sides.find(x=>x!==d.iso);if(!groups.has(other))groups.set(other,[]);groups.get(other).push(...linesOf(fc([f])));}
 const reports=[],foreignShapes=[];
 for(const [other,paths]of groups){const owner=existing[other]||definitions.find(x=>x.iso===other)?.country;let target=processed.get(other);if(!target&&existing[other]){const dir='dist/data/europe/'+owner+'/';target=load(fs.existsSync(dir+'political.bin')?dir+'political.bin':dir+'first.bin');target=target.regions||target;}if(!target)continue;
  foreignShapes.push(...target.features);
  const outline=await command(target,'-dissolve2'),stored=existing[other]?load('dist/data/europe/'+owner+'/international.bin').features.filter(f=>f.properties.pair===[d.iso,other].sort().join('-')):[],storedPaths=joinReferencePaths(linesOf(fc(stored)));
  for(const guide of joinReferencePaths(paths)){
   const canonical=storedPaths.find(path=>Math.min(metres(path[0],guide[0])+metres(path.at(-1),guide.at(-1)),metres(path[0],guide.at(-1))+metres(path.at(-1),guide[0]))<30000)||frontier(outline,guide);
   console.log('Align',d.iso,other,canonical.length,'vertices');
   // The Qatar reference wraps the Khor Al Adaid inlet. Its water-separated
   // coastal tip must stay on the Saudi shore rather than filling the inlet.
   const options={maxDistance:40000,maxSelectionMetres:40000,maxDeviationMetres:5,coastalTrimMetres:other==='QAT'?20000:5000};let result;
   try{result=await alignArc(first,canonical,options);}catch(error){
    if(!/Replacement outline follows|Every canonical bend/.test(error.message))throw error;
    // A source subdivision tip can become exterior only after the first clean.
    // Align that exposed tip in a second pass, then enforce the strict join.
    const exposed=await alignArc(first,canonical,{...options,maxDeviationMetres:5000});
    result=await alignArc(exposed.regions,canonical,options);
   }
   first=result.regions;
   reports.push({pair:[d.iso,other].sort().join('-'),owner,vertices:canonical.length,maxEndpointDisplacementMetres:result.maxEndpointDisplacementMetres,...(other==='QAT'?{coastalTrimMetres:20000,coastalNote:'Retain the water-separated Khor Al Adaid inlet shore.'}:{})});
  }
 }
 // At a river mouth, a retained coast can cross the neighbouring survey even
 // after its land arc joins. Existing neighbouring land keeps that small tip.
 if(foreignShapes.length)first=await command({'regions.json':first,'neighbours.json':fc(foreignShapes)},'-erase neighbours.json -clean gap-fill-area=0');
 const legal=structuredClone(first);first=await command({'regions.json':first,'lakes.json':lakes},'-erase lakes.json -clean gap-fill-area=0');
 if(country==='iran')first=await command({'land.json':first,'water.json':await caspianWater()},'-erase water.json -clean gap-fill-area=0');
 assert.equal(first.features.length,d.counts[1]);
 const popMeta=population[country],coverage=country==='iran'?'31 provinces from UNHCR/OCHA May 2019 geometry, reviewed October 2024. Population is the Statistical Centre of Iran 2016 census, retained with its date; newer country totals are not assigned to provinces.':country==='iraq'?'19 governorates: the OCHA 2019 administrative reference, reviewed December 2024, with the OSM Halabja split clipped to its original Sulaymaniyah parent. This retains administrative boundaries rather than substituting lines of de facto control. Population uses the raw resident column of the official 2024 census workbook, not the cabinet-adjusted allocation to origin governorates. Combined Sulaymaniyah–Halabja population is withheld from the two split polygons.':'13 administrative regions from the retained OCHA boundary reference created November 2015 and valid May 2021, reviewed December 2024. Population is GASTAT’s 2022 census, reproduced in Ministry of Health Table 1-12; administrative regions are used, not health-service regions.';
 await buildRegionalDataset({country,units,byLevel:{1:first},year:country==='saudi-arabia'?2021:2019,retrieved:manifest.retrieved,levels:d.levels,sources:Object.fromEntries(Object.entries(manifest.files).filter(([name])=>name.startsWith(d.iso.toLowerCase())||country==='iraq'&&name==='halabja-relation.json')),coverage:coverage+' Shared land frontiers follow existing atlas neighbours. Inland lake surfaces are excluded. Country overview pages stay hidden.',statisticsSources:{population:{title:popMeta.title||'Iraqi Statistics and GIS Authority / National Open Government Portal: 2024 census resident population',url:popMeta.url||popMeta.source},worldbank:{title:'World Bank World Development Indicators: national population, GDP and GDP per capita',url:manifest.files['worldbank.json'].url}}});
 const dir='dist/data/europe/'+country+'/';save(dir+'political.bin',first);
 const own=[],outline=await command(legal,'-dissolve2');for(const[other,paths]of groups){if(existing[other]||processed.has(other))continue;for(const guide of joinReferencePaths(paths))own.push({type:'Feature',properties:{countries:[country],pair:[d.iso,other].sort().join('-'),boundaryType:'land frontier'},geometry:{type:'LineString',coordinates:frontier(outline,guide)}});}
 save(dir+'international.bin',lineData(fc(own)));processed.set(d.iso,legal);frontiers[country]={aligned:reports,owned:own.map(f=>({pair:f.properties.pair,vertices:f.geometry.coordinates.length}))};
 const stats=load(dir+'statistics.json'),cat=load(dir+'catalogue.bin'),rows=wb.filter(r=>r.countryiso3code===d.iso),year=[2025,2024,2023].find(y=>['NY.GDP.MKTP.CD','NY.GDP.PCAP.CD','SP.POP.TOTL'].every(code=>rows.some(r=>r.indicator.id===code&&+r.date===y&&r.value>0)));assert(year);const value=code=>rows.find(r=>r.indicator.id===code&&+r.date===year).value;
 stats.regions[country+':'+d.iso]={name:d.en,level:0,parent:null,area:{value:cat.records.reduce((s,r)=>s+r.areaKm2,0),unit:'km²',year:country==='saudi-arabia'?2021:2019,source:'boundaryArea',method:'mapped',label:'Mapped land area'},population:{value:value('SP.POP.TOTL'),year,source:'worldbank',method:'estimate'},gdp:{value:value('NY.GDP.MKTP.CD'),usd:value('NY.GDP.MKTP.CD'),currency:'USD',year,priceBasis:'current',source:'worldbank'},gdpPerCapita:{value:value('NY.GDP.PCAP.CD'),usd:value('NY.GDP.PCAP.CD'),currency:'USD',year,priceBasis:'current',source:'worldbank'}};
 fs.writeFileSync(dir+'statistics.json',JSON.stringify(stats)+'\n');fs.writeFileSync('dist/vendor/flag-'+d.prefix+'.svg',source('flag-'+d.prefix+'.svg'));
 console.log('Built',country,cat.counts,'population cards',Object.values(stats.regions).filter(r=>r.level===1&&r.population).length);
}
fs.writeFileSync(root+'frontiers.json',JSON.stringify(frontiers,null,2)+'\n');
const flags=load('dist/data/europe/flag-sources.json'),images=load('dist/data/flag-images.json'),prefix='export const nationalFlagImages=',text=fs.readFileSync('dist/national-flags.mjs','utf8'),national=JSON.parse(text.slice(text.indexOf(prefix)+prefix.length).trim().replace(/;$/,''));
for(const d of definitions){const src=manifest.files['flag-'+d.prefix+'.svg'],svg=source('flag-'+d.prefix+'.svg').toString(),tag=svg.match(/<svg\b[^>]*>/)[0],view=tag.match(/viewBox="([^"]+)"/)?.[1].split(/[ ,]+/).map(Number),width=view?.[2]||Number(tag.match(/\bwidth="([\d.]+)/)?.[1]),height=view?.[3]||Number(tag.match(/\bheight="([\d.]+)/)?.[1]);assert(width>0&&height>0);const f={file:'vendor/flag-'+d.prefix+'.svg',full:'vendor/flag-'+d.prefix+'.svg',width,height,...src,source:src.url};flags.flags[d.country]=f;images[f.file]=f;national[f.file]=f;}
fs.writeFileSync('dist/data/europe/flag-sources.json',JSON.stringify(flags,null,2)+'\n');fs.writeFileSync('dist/data/flag-images.json',JSON.stringify(images));fs.writeFileSync('dist/national-flags.mjs','// Original national artwork and dimensions.\n'+prefix+JSON.stringify(national)+';\n');
