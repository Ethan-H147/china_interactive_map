import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fetchUSLocal,directory,municipalStates,townshipStates} from './fetch-us-local.mjs';
import {fetchUSDetails,readUSSource} from './fetch-us-details.mjs';
import {shape,fc,command,load,bounds,write,polygons} from './us-geography.mjs';
import {visibleSegments} from '../dist/adaptive-lines.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server'),{mesh}=require('topojson-client'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
export function gazetteer(name){const zip=unzipSync(readUSSource(name+'-status.zip')),lines=Buffer.from(Object.values(zip)[0]).toString().trim().split(/\r?\n/),headers=lines.shift().split('|');return new Map(lines.map(line=>{const row=Object.fromEntries(line.split('|').map((v,i)=>[headers[i],v]));return[row.GEOID,row];}));}
const active=status=>['A','B','C','G'].includes(status);
export function municipalSource(source,subdivisions,placeStatus,subStatus){
 const result=[],audit=[],ansi=new Set(source.features.filter(f=>f.properties.LSAD!=='57').map(f=>f.properties.PLACENS||f.properties.CONCTYNS));
 for(const feature of source.features){const p=feature.properties,type=p.CONCTYFP?'concity':'place',status=type==='concity'?{FUNCSTAT:'A'}:placeStatus.get(p.GEOID);if(!status)throw Error('Missing place status: '+p.GEOID);result.push({feature,type,status:status.FUNCSTAT});}
 for(const feature of subdivisions?.features||[]){const p=feature.properties,status=subStatus.get(p.GEOID);if(!status)throw Error('Missing town status: '+p.GEOID);
  let reason=!active(status.FUNCSTAT)?'Nonfunctioning or statistical subdivision':ansi.has(p.COUSUBNS)?'Same legal entity already represented as a place':'';
  // Consolidated town/city records may have distinct ANSI identifiers. Only
  // collapse those with the same name, government and exact Census land area.
  if(!reason&&status.FUNCSTAT==='C'&&source.features.some(f=>f.properties.LSAD!=='57'&&f.properties.NAME===p.NAME&&Math.abs(f.properties.ALAND-p.ALAND)<1))reason='Consolidated government already represented as a place';
  if(reason)audit.push({geoid:p.GEOID,reason});else result.push({feature,type:'cousub',status:status.FUNCSTAT});
 }
 return {result,audit};
}
export function municipalEdges(regions,land,records){const t=topology({regions,land}),coast=new Set(t.objects.land.geometries.flatMap(g=>g.arcs.flat(Infinity)).map(a=>a<0?~a:a)),owners=new Map(),groups=new Map(),inc=new Set(records.filter(r=>r.incorporated).map(r=>r.id));
 for(const g of t.objects.regions.geometries)for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(a))owners.set(a,new Set());owners.get(a).add(g.properties.id);}
 for(const[a,set]of owners){if(coast.has(a))continue;const ids=[...set].sort(),key=ids.join('|');if(!groups.has(key))groups.set(key,{owners:ids,arcs:[]});groups.get(key).arcs.push([a]);}
 return visibleSegments(fc([...groups.values()].map(g=>({type:'Feature',properties:{owners:g.owners,incorporated:g.owners.some(id=>inc.has(id))},geometry:mesh(t,{type:'MultiLineString',arcs:g.arcs})}))));
}
export async function buildUSMunicipalities(root='dist/data/europe/united-states/'){
 await fetchUSDetails(['counties.zip']);
 const names=['consolidated-cities.zip','place-status.zip','cousub-status.zip',...Object.keys(municipalStates).map(s=>'places-'+s+'.zip'),...[...townshipStates].map(s=>'cousubs-'+s+'.zip')],pins=await fetchUSLocal(names),catalogue=load(root+'catalogue.bin'),states=new Map(catalogue.records.filter(r=>r.level===1).map(r=>[r.id,r])),countySource=await shape(directory+'/counties.zip'),placeStatus=gazetteer('place'),subStatus=gazetteer('cousub'),consolidated=await shape(directory+'/consolidated-cities.zip'),records=[],chunks={},counts={},audit={};
 for(const f of countySource.features)if(f.properties.STUSPS==='AK')for(const point of polygons(f.geometry).flat(2))if(point[0]>0)point[0]-=360;
 for(const[fips,abbr]of Object.entries(municipalStates)){
  const parent='US-'+abbr,source=await shape(directory+'/places-'+fips+'.zip');source.features.push(...consolidated.features.filter(f=>f.properties.STATEFP===fips));const subdivisions=townshipStates.has(fips)?await shape(directory+'/cousubs-'+fips+'.zip'):null,{result,audit:omitted}=municipalSource(source,subdivisions,placeStatus,subStatus),metadata=new Map();audit[parent]=omitted;
  const features=result.map(({feature:f,type,status})=>{const p=f.properties,id=(type==='cousub'?'US-MCD-':type==='concity'?'US-CONCITY-':'US-PLACE-')+p.GEOID,incorporated=type!=='place'||p.LSAD!=='57'&&!['S','F'].includes(status),kind=status==='F'?'Statistical city balance':type==='concity'?'Consolidated city':incorporated?({'21':'Borough','25':'City','43':'Town','44':'Township','47':'Village'}[p.LSAD]||'Municipality'):'Census-designated place';
   metadata.set(id,{id,parent,parentName:states.get(parent).en,level:3,en:p.NAME,local:p.NAME,kind,incorporated,governmentStatus:status,sourceType:type,code:p.GEOID,areaKm2:p.ALAND/1e6,aliases:[...(type==='concity'?[p.NAME.split(/[-/]/)[0]+' '+abbr,p.NAME.split(/[-/]/)[0]+' '+states.get(parent).en]:[]),p.NAMELSAD,p.NAME+' '+abbr,p.NAMELSAD+' '+abbr,p.NAME+' '+states.get(parent).en,p.NAMELSAD+' '+states.get(parent).en,...(type==='cousub'?[p.NAME+' '+p.NAMELSADCO,p.NAMELSAD+' '+p.NAMELSADCO]:[])],boundaryYear:2025});
   if(abbr==='AK')for(const point of polygons(f.geometry).flat(2))if(point[0]>0)point[0]-=360;
   return {...f,properties:{id,incorporated}};
  });
  const rawLand=await command(fc(countySource.features.filter(f=>f.properties.STUSPS===abbr).map(f=>({...f,properties:{id:'land'}}))),'-dissolve id'),combined=await command(fc([...features,...rawLand.features]),'-simplify dp interval=.0001 planar keep-shapes'),land=fc(combined.features.filter(f=>f.properties.id==='land')),data=fc(combined.features.filter(f=>f.properties.id!=='land').sort((a,b)=>Number(metadata.get(a.properties.id).sourceType!=='cousub')-Number(metadata.get(b.properties.id).sourceType!=='cousub')||metadata.get(b.properties.id).areaKm2-metadata.get(a.properties.id).areaKm2)),points=await command(data,'-points inner'),list=data.features.map((f,i)=>({...metadata.get(f.properties.id),center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry)}));records.push(...list);
  // Default navigation never downloads or tiles optional CDP polygons. The
  // combined variant is fetched only when that setting or a CDP search needs it.
  const incorporated=fc(data.features.filter(f=>f.properties.incorporated)),file='municipalities/'+parent+'.bin',censusFile='municipalities/'+parent+'-census.bin';
  const primary=write(root+file,{regions:incorporated,boundaries:municipalEdges(incorporated,land,list)});
  const census=write(root+censusFile,{regions:data,boundaries:municipalEdges(data,land,list)});
  counts[parent]={incorporated:list.filter(r=>r.incorporated).length,places:list.filter(r=>r.sourceType==='place'&&r.incorporated).length,townsAndTownships:list.filter(r=>r.sourceType==='cousub').length,consolidatedCities:list.filter(r=>r.sourceType==='concity').length,cdps:list.filter(r=>!r.incorporated).length};
  chunks[parent]={file,censusFile,level:3,count:incorporated.features.length,totalCount:list.length,...primary,censusBytes:census.bytes,censusDecodedBytes:census.decodedBytes};
  console.log(parent,JSON.stringify(counts[parent]),Math.round(primary.bytes/1024)+' KB default / '+Math.round(census.bytes/1024)+' KB optional');
 }
 catalogue.records=[...catalogue.records.filter(r=>r.level!==3),...records];catalogue.thirdChunks=chunks;catalogue.counts[3]=records.length;catalogue.levels[2]='Municipalities, towns and townships; optional Census places';catalogue.municipalCoverage={states:50,district:true,puertoRico:true,vintage:2025};write(root+'catalogue.bin',catalogue);
 const sources=load(root+'sources.json');sources.counts=catalogue.counts;sources.municipalities={vintage:2025,counts,sources:'municipalities/sources.json'};write(root+'sources.json',sources);
 write(root+'municipalities/sources.json',{vintage:2025,counts,files:Object.fromEntries(names.map(name=>[name,pins.files[name]])),omittedSubdivisions:audit,coverage:'All Census 2025 places in the 50 states, DC and Puerto Rico, plus functioning minor civil division governments in town/township states. Incorporated cities, towns, boroughs and villages and active towns/townships are included by default. Statistical and nonfunctioning county divisions are excluded; duplicate legal entities and consolidated town/city governments are represented once. Full consolidated-city boundaries are included. Statistical city balances and CDPs are separately labeled and opt-in. Whole governments are retained across county lines. Nested municipalities and townships retain their own legal boundaries. Cartographic boundaries are generalized, not survey or parcel boundaries.',coastlineSource:load('scripts/us-detail-sources.json').files['counties.zip'],classificationSources:['https://www.census.gov/library/reference/code-lists/functional-status-codes.html','https://www.census.gov/programs-surveys/geography/technical-documentation/records-layout/gaz-record-layouts/gaz25-record-layouts.html']});
 console.log('US municipalities:',records.filter(r=>r.incorporated).length,'legal municipalities/towns/townships;',records.filter(r=>!r.incorporated).length,'optional Census/statistical areas;',Object.keys(chunks).length,'state-scoped chunks.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await buildUSMunicipalities();
