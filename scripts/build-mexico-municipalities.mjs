import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fetchMexicoMunicipalities,root as sourceRoot} from './fetch-mexico-municipalities.mjs';
import {fc,command,load,bounds,borders,write} from './us-geography.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {countryContext} from './country-context.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const iso=['AGU','BCN','BCS','CAM','COA','COL','CHP','CHH','CMX','DUR','GUA','GRO','HID','JAL','MEX','MIC','MOR','NAY','NLE','OAX','PUE','QUE','ROO','SLP','SIN','SON','TAB','TAM','TLA','VER','YUC','ZAC'];
export async function buildMexicoMunicipalities(root='dist/data/europe/mexico/'){
 const pins=await fetchMexicoMunicipalities(),catalogue=load(root+'catalogue.bin'),statistics=load(root+'statistics.json'),sources=load(root+'sources.json'),states=new Map(catalogue.records.filter(r=>r.level===1).map(r=>[r.id,r])),metadata=new Map(),features=[],seats=new Map(load(sourceRoot+'census-seats.json.gz').map(r=>[r.code,r.name]));
 for(let i=1;i<=32;i++){
  const code=String(i).padStart(2,'0'),raw=load(sourceRoot+'geo-'+code+'.json.gz'),roster=load(sourceRoot+'catalogue-'+code+'.json.gz').datos,parent='MX-'+iso[i-1];
  assert(states.has(parent));assert.equal(raw.totalReg,roster.length,code+' vector and catalogue totals');assert.deepEqual(raw.features.map(f=>f.properties.cvegeo).sort(),roster.map(r=>r.cvegeo).sort(),code+' complete catalogue coverage');
  for(const f of raw.features){
   const p={...f.properties,nom_cab:f.properties.nom_cab||seats.get(f.properties.cvegeo+f.properties.cve_cab)},id='MX-MUN-'+p.cvegeo,entry=roster.find(r=>r.cvegeo===p.cvegeo);assert.equal(p.cve_ent,code);assert.equal(p.nomgeo,entry.nomgeo);assert(!metadata.has(id));
   metadata.set(id,{id,parent,parentName:states.get(parent).en,level:2,en:p.nomgeo,local:p.nomgeo,localLang:'es',kind:i===9?'Borough':'Municipality',code:p.cvegeo,seat:p.nom_cab||'',boundaryYear:2025,aliases:[p.cvegeo,p.nomgeo+' '+states.get(parent).en,...(p.nom_cab&&p.nom_cab!==p.nomgeo?[p.nom_cab,p.nom_cab+' '+states.get(parent).en]:[])],...(/^\d+$/.test(p.pob_total)?{population:{value:+p.pob_total,year:2020,date:'2020-03-15',method:'census',periodLabel:'2020 census',source:'mexicoMunicipalCensus'}}:{note:'The INEGI municipal service does not publish a 2020 census population for this newer municipality; no population or GDP is inferred.'})});
   features.push({type:'Feature',properties:{id,parent},geometry:{type:f.geometry.type,coordinates:f.geometry.coordinates}});
  }
 }
 assert.equal(features.length,2478,'Complete December 2025 municipal boundary snapshot');
 // Build one topology nationwide, then dissolve parents from the same arcs.
 // No independently simplified parent outline can leave a sliver beside a child.
 const base=await command(fc(features),'-clean gap-fill-area=0 -simplify dp interval=.0001 planar keep-shapes -clean gap-fill-area=0');assert.equal(base.features.length,2478);
 const points=await command(base,'-points inner'),records=base.features.map((f,i)=>{const {population,note,...r}=metadata.get(f.properties.id);return {...r,center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry),areaKm2:geographicAreaKm2(f.geometry)};});
 const first=await command(fc(base.features.map(f=>({...f,properties:{id:f.properties.parent}}))),'-dissolve id'),firstPoints=await command(first,'-points inner');assert.equal(first.features.length,32);
 first.features.forEach((f,i)=>{const r=states.get(f.properties.id);r.center=firstPoints.features[i].geometry.coordinates;r.bounds=bounds(f.geometry);r.areaKm2=geographicAreaKm2(f.geometry);});
 write(root+'first.bin',{regions:first,boundaries:borders(first)});
 const mesh=borders(base,{sameParent:id=>metadata.get(id).parent}),chunks={};
 for(const [parent]of states){
  const children=fc(base.features.filter(f=>f.properties.parent===parent).map(f=>({...f,properties:{id:f.properties.id}}))),ids=new Set(children.features.map(f=>f.properties.id)),data={regions:children,boundaries:fc(mesh.features.filter(f=>f.properties.owners.some(id=>ids.has(id))))},file='second/'+parent+'.bin';
  assert(children.features.length,parent+' has municipalities');chunks[parent]={file,level:2,count:children.features.length,...write(root+file,data)};
 }
 catalogue.records=[...states.values(),...records];catalogue.chunks=chunks;catalogue.counts={1:32,2:2478};catalogue.levels=['State or federal entity','Municipality or Mexico City borough'];write(root+'catalogue.bin',catalogue);
 write(root+'context.bin',await countryContext('mexico',first,states,command));
 // Preserve existing state population and economic figures. Local figures keep
 // their own census date, including explicit gaps for post-census municipalities.
 statistics.sources.mexicoMunicipalCensus={title:'INEGI · 2020 Population and Housing Census, municipal service',url:pins.documentation,license:pins.license};
 statistics.sources.mexicoMunicipalBoundaries={title:'INEGI · Marco Geoestadístico, December 2025 municipal areas',url:pins.documentation,license:pins.license};
 for(const key of Object.keys(statistics.regions))if(key.startsWith('mexico:MX-MUN-'))delete statistics.regions[key];
 for(const r of records){const {population,note}=metadata.get(r.id);statistics.regions['mexico:'+r.id]={name:r.en,level:2,parent:r.parent,area:{value:r.areaKm2,unit:'km²',year:2025,method:'mapped',source:'mexicoMunicipalBoundaries',label:'Mapped administrative area'},...(population?{population}:{}),...(note?{note}:{})};}
 write(root+'statistics.json',statistics);
 sources.retrieved=pins.retrieved;sources.counts=catalogue.counts;sources.kinds=catalogue.records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{});
 sources.coverage='All 31 states and Mexico City, with all 2,478 INEGI municipal areas: 2,462 municipalities and Mexico City’s 16 boroughs (alcaldías). December 2025 boundary snapshot, checked against the municipal catalogue retrieved 23 October 2026. 2020 census populations are shown only where INEGI publishes them. Inland water remains a separate optional overlay.';
 sources.processing='All municipalities are cleaned and simplified together at .0001 degree tolerance (about 11 m north-south), with parent states dissolved from that same topology. Shared internal edges are stored once. Municipal geometry loads only for the selected federal entity. State statistics and economic sources are retained; no local GDP is inferred.';
 sources.municipalSources=Object.entries(pins.files).map(([file,p])=>({file,...p,provider:pins.provider,license:pins.license}));write(root+'sources.json',sources);
 // Context is one of the existing compact first-frame sources. Refresh only
 // its copy so the portal and active map use the same tested Mexican outline.
 if(path.resolve(root)===path.resolve('dist/data/europe/mexico')){
  const context=fs.readFileSync(root+'context.bin'),{gunzipSync}=await import('node:zlib'),text=gunzipSync(context).toString(),target='dist/data/compact/europe/mexico/context.bin';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,gzipSync(encodeGeo(JSON.parse(text),{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
  (await import('./prepare-region-colors.mjs')).prepareRegionColors(['mexico']);
 }
 if(path.resolve(root)===path.resolve('dist/data/europe/mexico')&&fs.existsSync('scripts/boundary-sources/mexico-localities/localities-2020.json.gz'))await (await import('./prepare-mexico-localities.mjs')).prepareMexicoLocalities();
 console.log('Mexico: 32 federal entities, 2,462 municipalities, 16 boroughs; 32 lazy chunks. Existing state statistics retained.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await buildMexicoMunicipalities();
