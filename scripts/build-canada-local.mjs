import {prepareCanadaTopology} from './prepare-canada-topology.mjs';
import fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fc,command,load,bounds,write,borders,csv} from './us-geography.mjs';
import {directory,provinces} from './fetch-canada-local.mjs';
import {canadaPopulation,canadaTargets,excludedTypes,isMunicipalGovernment,provinceNames} from './canada-municipalities.mjs';
export async function buildCanadaLocal(root='dist/data/europe/canada/'){
const pins=load('scripts/canada-local-sources.json'),partition=await prepareCanadaTopology();
const kind={C:'City',CY:'City',CV:'City',V:'City',T:'Town',TV:'Town',VL:'Village',RM:'Rural municipality',RMU:'Resort municipality',RCR:'Rural community',RGM:'Regional municipality',MRM:'Regional municipality',M:'Municipality',MU:'Municipality','MÉ':'Municipality',CT:'Township',CU:'United townships',TP:'Township',PE:'Parish municipality',P:'Parish',SM:'Specialized municipality',MD:'Municipal district',DM:'District municipality',HAM:'Hamlet',NV:'Northern village',NH:'Northern hamlet',SV:'Summer village',RV:'Resort village',CC:'Chartered community',CG:'Community government',GR:'Regional government',NO:'Unorganized area',SNO:'Unorganized subdivision',RDA:'Regional district electoral area',SC:'County municipality subdivision',IRI:'First Nation reserve','S-É':'First Nation settlement','SÉ':'Settlement',SET:'Settlement',ID:'Improvement district',FD:'Fire district',SA:'Special area',CN:'Crown colony',LGD:'Local government district',IM:'Island municipality',SG:'Self-government',NL:"Nisga'a land",IGD:'First Nation government district',TAL:"Tla'amin Lands",TWL:'Tsawwassen Lands',TL:'Teslin land',TC:'Cree reserved land',TK:'Naskapi reserved land',TI:'Inuit land',VC:'Cree village',VK:'Naskapi village',VN:'Northern village'};
const cdKind={CTY:'County',RM:'Regional municipality',RD:'Regional district',MRC:'Regional county municipality','TÉ':'Equivalent territory',DIS:'District',DM:'District municipality',UC:'United counties',TER:'Territory',CDR:'Census division',CT:'County'};
const divisions=new Map(load(directory+'/division-roster.json.gz').features.map(f=>[String(f.properties.CDUID),f.properties])),population=canadaPopulation(),top=canadaTargets(),targets=new Map(top.map(r=>[r.id,r]));
const census=csv(fs.existsSync('scripts/statistics-sources/canada/census-area.csv.gz')?gunzipSync(fs.readFileSync('scripts/statistics-sources/canada/census-area.csv.gz')).toString('utf8'):fs.readFileSync('artifacts/canada-source/census-area.csv','utf8')),areaKey=Object.keys(census[0]).find(k=>k.includes('Land area')),areas=new Map(census.filter(r=>/^2021A000[35]/.test(r.DGUID)).map(r=>[r.DGUID,Number(r[areaKey])]));
const old=load(root+'catalogue.bin'),oldStats=load(root+'statistics.json'),states=new Map(old.records.filter(r=>r.level===1).map(r=>[r.id,r])),records=[],chunks={},thirdChunks={},firstFeatures=[],audit={};
for(const[pr,abbr]of Object.entries(provinces)){
 const state=states.get('CA-'+abbr)||[...states.values()].find(r=>r.en===provinceNames[pr]);if(!state)throw Error('Missing province '+pr);const provinceId=state.id;
 const files=fs.readdirSync(partition).filter(name=>name===pr+'.bin'),raw=fc(files.flatMap(name=>load(partition+'/'+name).features)),meta=new Map();
 for(const f of raw.features){
  const p=f.properties,code=String(p.CSDUID),id='CA-CSD-'+code,parent='CA-CD-'+code.slice(0,4),source=population.get(code),cd=divisions.get(code.slice(0,4)),reported=areas.get('2021A0005'+code);
  if(!cd||!source||!kind[p.CSDTYPE])throw Error('Missing source metadata '+id+' '+p.CSDTYPE);
  const en=p.CSDNAME_E,land=reported>0?reported:p.AREA_SQKM;
  meta.set(id,{id,parent,parentName:cd.CDNAME_E,province:provinceId,provinceName:provinceNames[pr],level:3,en,local:p.SDRNOM,kind:kind[p.CSDTYPE],censusType:p.CSDTYPE,municipality:isMunicipalGovernment(p.CSDTYPE,pr),code,areaKm2:land,areaSource:reported>0?'canadaCensusArea':'canadaMappedArea',boundaryYear:2021,aliases:[en+' '+abbr,en+' '+provinceNames[pr],en+' '+kind[p.CSDTYPE],en+' '+cd.CDNAME_E,...(en==='Québec'?['Quebec City','Québec City']:[]),...(en.includes(' / ')?en.split(' / '):[])],...(targets.has(id)?{municipalRank:targets.get(id).rank}:{})});
  f.properties={id};
 }
 const data=raw;const localPoints=(await command(data,'-points inner')).features;
 if(data.features.length!==raw.features.length)throw Error('Simplification lost a municipality '+abbr);
 for(let i=0;i<data.features.length;i++){const f=data.features[i],r=meta.get(f.properties.id);records.push({...r,center:localPoints[i].geometry.coordinates,bounds:bounds(f.geometry)});}
 const cds=await command(fc(data.features.map(f=>({...f,properties:{id:meta.get(f.properties.id).parent}}))),'-dissolve id'),points=(await command(cds,'-points inner')).features;
 for(let i=0;i<cds.features.length;i++){
  const f=cds.features[i],code=f.properties.id.slice(6),p=divisions.get(code),reported=areas.get('2021A0003'+code);
  records.push({id:f.properties.id,parent:provinceId,level:2,en:p.CDNAME_E,local:p.DRNOM,kind:cdKind[p.CDTYPE]||'Census division',censusType:p.CDTYPE,code,areaKm2:reported>0?reported:p.AREA_SQKM,areaSource:reported>0?'canadaCensusArea':'canadaMappedArea',center:points[i].geometry.coordinates,bounds:bounds(f.geometry),boundaryYear:2021,aliases:[p.CDNAME_E+' '+abbr,p.CDNAME_E+' '+provinceNames[pr]]});
 }
 const province=await command(fc(cds.features.map(f=>({...f,properties:{id:provinceId}}))),'-dissolve id'),point=(await command(province,'-points inner')).features[0].geometry.coordinates;
 firstFeatures.push(...province.features);records.push({...state,center:point,bounds:bounds(province.features[0].geometry),boundaryYear:2021});
 const file='second/'+provinceId+'.bin',payload={regions:cds,boundaries:borders(cds)},budget=write(root+file,payload);
 chunks[provinceId]={file,level:2,count:cds.features.length,...budget};
 const shared=borders(data,{sameParent:id=>meta.get(id).parent});
 for(const cd of cds.features){
  const list=data.features.filter(f=>meta.get(f.properties.id).parent===cd.properties.id),ids=new Set(list.map(f=>f.properties.id)),file='third/'+cd.properties.id+'.bin',budget=write(root+file,{regions:fc(list),boundaries:fc(shared.features.filter(f=>f.properties.owners.some(id=>ids.has(id))))});
  chunks[cd.properties.id]={file,level:3,count:list.length,...budget};
 }
 audit[provinceId]={municipalities:data.features.length,divisions:cds.features.length,bytes:budget.bytes};
 console.log(abbr,data.features.length,'local units;',cds.features.length,'divisions;',Math.round(budget.bytes/1024)+' KB division chunk');global.gc?.();
}
if(records.filter(r=>r.level===3).length!==5161||records.filter(r=>r.level===2).length!==293)throw Error('Incomplete Canada coverage');
write(root+'first.bin',{regions:fc(firstFeatures),boundaries:borders(fc(firstFeatures))});
const counts={1:13,2:293,3:5161};records.sort((a,b)=>a.level-b.level||a.id.localeCompare(b.id));
write(root+'catalogue.bin',{records,chunks,counts,levels:['Provinces & territories','Census divisions','Municipalities & equivalents'],boundaryYear:2021});
write(root+'context.bin',fc([{type:'Feature',properties:{country:'canada'},geometry:{type:'MultiPolygon',coordinates:firstFeatures.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)}}]));
const stats=oldStats;
stats.sources.canadaLocalPopulation={title:'Statistics Canada · Table 17-10-0155-01, July 1 population estimates, 2021 boundaries',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',license:'Statistics Canada Open Licence'};
stats.sources.canadaCensusArea={title:'Statistics Canada · Table 98-10-0004-01, 2021 Census land area',url:'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000401',license:'Statistics Canada Open Licence'};
stats.sources.canadaMappedArea={title:'Statistics Canada / AAFC · mapped area in 2021 cartographic boundaries',url:pins.service,license:pins.license};
for(const r of records.filter(r=>r.level>1)){
 const value=r.level===3?population.get(r.code).value:null,children=r.level===2?records.filter(c=>c.parent===r.id):null,parts=children?.map(c=>population.get(c.code).value),sum=parts?.every(n=>n!==null)?parts.reduce((a,b)=>a+b,0):null,total=r.level===2?sum:value;
 stats.regions['canada:'+r.id]={name:r.en,level:r.level,parent:r.parent,area:{value:r.areaKm2,unit:'km²',year:2021,method:r.areaSource==='canadaCensusArea'?'reported':'mapped',label:r.areaSource==='canadaCensusArea'?'Land area':'Mapped area',source:r.areaSource},...(total===null?{note:'The source does not publish a complete population estimate for this unit.'}:{population:{value:total,year:2025,date:'2025-07-01',method:r.level===2?'sum of component census subdivisions':'estimate',periodLabel:'1 July 2025 estimate',coverageNote:'2021 census boundaries',source:'canadaLocalPopulation',note:'2021 census boundaries'+(r.level===2?'; sum of complete component estimates.':'.')}})};
}
write(root+'statistics.json',stats);
const sources=load(root+'sources.json');sources.counts=counts;sources.coverage='All 13 provinces/territories, 293 census divisions and 5,161 census subdivisions on the 2021 census geography. Municipalities, Indigenous territories and statistical/unorganized units retain their published legal types. July 2025 estimates use the same 2021 boundaries; later amalgamations are not substituted.';
sources.processing='Original federal AAFC mirror of Statistics Canada cartographic boundaries. Enclosed counterclockwise components emitted as separate polygons by the source service are reattached as holes using winding and containment; independent islands remain unchanged. Hierarchy is derived from official geographic-code prefixes: 2-digit province, 4-digit division, 7-digit subdivision; inconsistent parent columns in the mirror are not used. One national topology uses shared-arc variable Douglas-Peucker simplification: .00015 degrees for local units up to 20 km², .0005 up to 2,000 km², and .003 for larger units. Shared arcs keep the more detailed adjacent requirement; polygon survival is protected. Parents dissolve from those same children. Shared internal borders draw once; coastlines outline only when selected. Detailed geometry loads per province/division, and releases on scope change.';
sources.kinds=records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{});sources.localSources={manifest:'data/europe/canada/local-sources.json',boundaryYear:2021,counts,audit,sourceRingNormalization:load(partition+'/ready.json').normalizedHoles};
write(root+'sources.json',sources);write(root+'local-sources.json',pins);
write(root+'municipalities/top500.json',{asOf:'2025-07-01',cutoffPopulation:top.at(-1).population,definition:'Largest 500 municipal and self-governing local governments by July 2025 estimate on 2021 census boundaries. Unorganized/statistical subdivisions, reserve parcels and special-purpose areas excluded from the flag ranking.',records:top});
console.log('Canadian local geography prepared',counts);

}
if(process.argv[1]?.endsWith('build-canada-local.mjs'))await buildCanadaLocal();
