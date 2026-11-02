import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import proj4 from 'proj4';
import {load,landIndex,polygons,metres,lineIndex} from './geo-index.mjs';
import {combineLondonSettlements,londonRegion,londonId} from './london-settlement.mjs';

// The shared population scale (settlement-layer.mjs) stops at zoom 9.5, around 2,900 residents.
// UK census counts reach about 100, so smaller places continue the same scale to closer zooms.
export const populationZoom=population=>Math.max(4,Math.min(13.5,5.8+2.4*Math.log10(100000/Math.max(1,population))));
// Places without a census count lie below every official settlement threshold (NRS and NISRA
// settlements start near 500 residents; ONS built-up areas need 20 hectares of built land).
const unmeasuredZoom={City:6,Town:7,Village:+populationZoom(500).toFixed(2),'Town or village':+populationZoom(500).toFixed(2),Settlement:+populationZoom(500).toFixed(2),Hamlet:+populationZoom(100).toFixed(2),'Other Settlement':+populationZoom(100).toFixed(2)};

// Census settlements below the 1,000-resident statistical base, then namesake parishes and
// Welsh communities that contain no built-up area, give named places their official counts.
function attachSmallPlaceCensus(records,census,key){
 const open=records.filter(r=>!r.population&&r.provenance?.gazetteer),byName=new Map();
 for(const r of open)for(const name of new Set([r.en,r.local,...(r.aliases||[]),...Object.values(r.names||{}).map(n=>n.name)].filter(Boolean))){const k=key(name);if(!byName.has(k))byName.set(k,[]);byName.get(k).push(r);}
 const plain=name=>name.replace(/\s*\([^)]*\)\s*$/,''),taken=new Set(),counts={settlements:0,parishes:0},unmatched=[];
 const claim=(names,center,radius)=>[...new Set(names.filter(Boolean).flatMap(n=>byName.get(key(plain(n)))||[]))].filter(r=>!taken.has(r)&&metres(r.center,center)<=radius).sort((a,b)=>metres(a.center,center)-metres(b.center,center))[0];
 const scopes={'ons-towns':['Built-up area (ONS 2022)','The continuous built-up area, independent of council boundaries.','ONS, Towns and cities, characteristics of built-up areas, Census 2021 (tables 2c and 2d)',census.sources.builtUpAreas.towns,'2021'],'ons-oa':['Built-up area (ONS 2022)','The continuous built-up area, independent of council boundaries.','Census 2021 usual residents (TS001) summed over the built-up area\'s output areas (ONS OA21 to BUA22 lookup)',census.sources.census,'2021'],nrs:['Settlement (NRS Census 2022)','NRS settlements are built-up areas defined from postcode densities, independent of council boundaries.','National Records of Scotland, Scotland\'s Census 2022 settlements (Popcount)',census.sources.scotland,'2022'],nisra:['Settlement (NISRA 2015)','NISRA statistical settlements; Census 2021 counts are approximated from data zones and grid squares.','NISRA Census 2021 commissioned table CT0100',census.sources.northernIreland,'2021']};
 const assign=(s,record,combined)=>{
  const [scope,scopeNote,provenance,source,year]=scopes[s.source];taken.add(record);counts.settlements++;
  record.population={value:s.population,year:+year,source,periodLabel:year+' census',scope,scopeNote:combined?scopeNote+' This count covers the whole of '+s.name+'.':scopeNote};
  record.provenance.population=provenance;record.provenance.census={code:s.code,name:s.censusName||s.name,...(s.outputAreas?{outputAreas:s.outputAreas}:{})};
 };
 const settlements=[...census.settlements].sort((a,b)=>b.population-a.population||a.code.localeCompare(b.code)),later=[];
 for(const s of settlements){const record=claim([s.name,s.welsh],s.center,3000);if(record)assign(s,record,false);else later.push(s);}
 // A joint settlement ("Storth and Sandside") goes to its nearest named component.
 const components=name=>name.split(/\s*,\s*(?:and\s+)?|\s+and\s+|\s*\/\s*/).map(n=>n.trim()).filter(n=>n&&n!==name);
 for(const s of later){const parts=components(s.name),record=parts.length&&claim(parts,s.center,3000);if(record)assign(s,record,true);else unmatched.push({code:s.code,name:s.name,population:s.population,reason:'No named place of that name within 3 km'});}
 // Only parishes without built-up output areas: their count is the namesake village with its
 // surrounding hamlets and farms, never part of a separately counted town.
 for(const p of [...census.parishes].filter(p=>!p.builtUpOutputAreas&&p.population>0).sort((a,b)=>b.population-a.population||a.code.localeCompare(b.code))){
  const record=claim([p.name,p.welsh],p.center,5000);if(!record)continue;
  const wales=p.code.startsWith('W');taken.add(record);counts.parishes++;
  record.population={value:p.population,year:2021,source:census.sources.census,periodLabel:'2021 census',scope:wales?'Community (Census 2021)':'Civil parish (Census 2021)',scopeNote:'All usual residents of the '+(wales?'community':'parish')+', which contains no ONS built-up area: the named place with its outlying hamlets and farms.'};
  record.provenance.population='Census 2021 usual residents (TS001) summed over the '+(wales?'community':'parish')+'\'s output areas (ONS OA21 to PAR22 best-fit lookup)';record.provenance.census={code:p.code,name:p.name,outputAreas:p.outputAreas};
 }
 for(const r of records)if(r.population){const zoom=+populationZoom(r.population.value).toFixed(2);if(zoom>9.5)r.minzoom=zoom;else if(r.provenance?.gazetteer)delete r.minzoom;}
 return {...counts,unmatchedSettlements:unmatched};
}

export function prepareUKPlaces(){
 const sourceRoot='scripts/boundary-sources/uk-places/',root='dist/data/europe/united-kingdom/',source=load(sourceRoot+'os-places.json.gz'),ni=load(sourceRoot+'osni-places.geojson'),geonames=load(sourceRoot+'geonames-ni.json.gz'),manifest=load(sourceRoot+'manifest.json'),data=load(sourceRoot+'statistical-base.json.gz'),catalogue=load(root+'catalogue.bin'),units=new Map(catalogue.records.map(r=>[r.id,r])),bundle=load(root+'all.bin');
 const children=new Set(catalogue.records.map(r=>r.parent)),leaves=bundle.levels.flatMap(l=>l.regions.features).filter(f=>!children.has(f.properties.id)),grid=new Map(),cell=.25;
 const shapes=leaves.map(f=>{const rings=polygons(f.geometry).flat(),box=[Infinity,Infinity,-Infinity,-Infinity];for(const ring of rings)for(const [x,y]of ring){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}return{id:f.properties.id,box,inside:landIndex(rings),rings};});
 for(const shape of shapes){const b=shape.box;for(let x=Math.floor(b[0]/cell)-1;x<=Math.floor(b[2]/cell)+1;x++)for(let y=Math.floor(b[1]/cell)-1;y<=Math.floor(b[3]/cell)+1;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(shape);}}
 const coastal=[];
 function container(center,sourceId){const candidates=grid.get(Math.floor(center[0]/cell)+','+Math.floor(center[1]/cell))||[],inside=candidates.find(s=>s.inside(center));if(inside)return inside.id;const near=candidates.map(s=>{s.distance??=lineIndex(s.rings);return{id:s.id,d:s.distance(center)};}).sort((a,b)=>a.d-b.d)[0];assert(near&&near.d<5000,'Gazetteer place outside mapped UK land: '+sourceId+' '+center);coastal.push({sourceId,parent:near.id,distanceMetres:Math.round(near.d)});return near.id;}
 const province=id=>{let r=units.get(id);while(r.parent)r=units.get(r.parent);return r.id;},key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''),namesOf=r=>[r.en,r.name,...(r.aliases||[]),...Object.values(r.names||{}).map(n=>n.name)].filter(Boolean);
 const records=data.records.map(r=>structuredClone(r)),candidates=new Map();
 function index(record){for(const name of namesOf(record)){const k=key(name);if(!candidates.has(k))candidates.set(k,[]);if(!candidates.get(k).includes(record))candidates.get(k).push(record);}}
 // Multi-town census areas retain their population and ID. Their component towns
 // get their own named-place points instead of inheriting a conurbation's count.
 // Index the real records, using only their displayed name for census matching.
 candidates.clear();for(const r of records){const k=key(r.en);if(!candidates.has(k))candidates.set(k,[]);candidates.get(k).push(r);if(r.en.startsWith('Greater ')){const k2=key(r.en.slice(8));if(!candidates.has(k2))candidates.set(k2,[]);candidates.get(k2).push(r);}}
 const locatedBy=new Map(records.filter(r=>r.provenance?.geonamesId).map(r=>[r.provenance.geonamesId,r]));
 const mapping=[],counts={added:0,merged:0,london:0},languages={cym:'cy',wel:'cy',gla:'gd',sco:'sco',eng:'en'},transform=proj4('+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.060,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs','EPSG:4326');
 const places=[...source.places.map(p=>({...p,source:'os',center:transform.forward([p.easting,p.northing])})),...ni.features.map(f=>({id:String(f.properties.OBJECTID),name:f.properties.PLACENAME.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()),type:'Town or village',center:f.geometry.coordinates,source:'osni'})),...geonames.places.map(p=>({...p,type:'Settlement',source:'geonames'}))];
 for(const p of places){const sourceId=p.source+':'+p.id,center=p.center.map(v=>+v.toFixed(6)),parentId=container(center,sourceId),provinceId=province(parentId),allNames=[...new Set([p.name,p.alternate,...(p.aliases||[])].filter(Boolean))];if(provinceId===londonRegion){counts.london++;mapping.push({sourceId,recordId:londonId,action:'london'});continue;}
  const matches=[...new Set(allNames.flatMap(n=>candidates.get(key(n))||[]))].filter(r=>r.parentId===parentId&&metres(center,r.center)<3000).sort((a,b)=>metres(center,a.center)-metres(center,b.center));
  // A NISRA settlement placed at a GeoNames entry ("Metropolitan Castlereagh" at Castlereagh) is that entry's dot.
  let record=(p.source==='geonames'&&locatedBy.get(p.id))||matches[0];const names={};if(p.language&&languages[p.language])names[languages[p.language]]={name:p.name};if(p.alternate&&languages[p.alternateLanguage])names[languages[p.alternateLanguage]]={name:p.alternate};
  if(record){record.aliases=[...new Set([...(record.aliases||[]),...allNames])];record.names={...names,...record.names};(record.provenance.gazetteer??=[]).push({source:p.source,id:p.id,type:p.type});counts.merged++;}
  else{const english=p.alternateLanguage==='eng'?p.alternate:p.name;record={id:'GB-'+p.source.toUpperCase()+'-'+p.id,en:english,name:english,local:p.name,kind:p.type,names,aliases:allNames,center,parentId,parentName:units.get(parentId).en,provinceId,minzoom:unmeasuredZoom[p.type],provenance:{gazetteer:[{source:p.source,id:p.id,type:p.type}]}};records.push(record);counts.added++;}
  index(record);mapping.push({sourceId,recordId:record.id,action:record.population?'census':'named-place'});
 }
 const small=attachSmallPlaceCensus(records,load(sourceRoot+'small-place-census.json.gz'),key);
 const byRecord=new Map(records.map(r=>[r.id,r]));for(const m of mapping)if(m.action==='named-place'&&byRecord.get(m.recordId).population)m.action=byRecord.get(m.recordId).population.scope.startsWith('Settlement')||byRecord.get(m.recordId).population.scope.startsWith('Built-up')?'small-census-settlement':'census-parish';
 assert.equal(new Set(mapping.map(m=>m.sourceId)).size,places.length,'Each source place represented exactly once');assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 data.records=records;data.sources.push(...manifest.sources);data.selection='All Ordnance Survey Open Names cities, towns, villages, hamlets and other settlements in Great Britain, supplemented by OSNI towns/villages and GeoNames populated places in Northern Ireland. No population cutoff for named places; suburban-area-only names, historical/deserted places and individual properties are excluded. Census populations remain attached to their whole statistical areas. Named places take the census count of a smaller official settlement of the same name within 3 km (ONS 2022 built-up areas, NRS 2022 and NISRA settlements), or of a namesake parish or Welsh community without any built-up area within 5 km; other named places have no inferred population.';
 data.coverage={statisticalBase:load(sourceRoot+'statistical-base.json.gz').records.length,osPlaces:source.places.length,osClasses:source.types,osniPlaces:ni.features.length,geonamesNI:geonames.places.length,...counts,totalPoints:records.length,snapshot:manifest.snapshot,coastalAssignments:coastal.length,smallCensusSettlements:small.settlements,censusParishes:small.parishes,withoutPopulation:records.filter(r=>!r.population).length};
 const result=combineLondonSettlements(data,catalogue,load(root+'statistics.json'));fs.writeFileSync(root+'settlements.json',JSON.stringify(result)+'\n');fs.writeFileSync(root+'settlements.bin',gzipSync(JSON.stringify(result),{level:9}));fs.writeFileSync(sourceRoot+'display-mapping.json',JSON.stringify({coverage:data.coverage,mapping,coastalAssignments:coastal,unmatchedSmallSettlements:small.unmatchedSettlements})+'\n');const sources=load(root+'sources.json');sources.settlementCoverage=data.selection;sources.settlementSources=manifest.sources;fs.writeFileSync(root+'sources.json',JSON.stringify(sources,null,2)+'\n');console.log('UK named places:',data.coverage);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)prepareUKPlaces();
