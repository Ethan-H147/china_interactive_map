import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {load} from './geo-index.mjs';
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {borderIndex,liesOnBorder} from '../dist/adaptive-lines.mjs';
import {manifest,readLocalSource,sha} from './fetch-nordic-local.mjs';
import {localFeatures,localDefinitions} from './nordic-local-data.mjs';
const base='dist/data/europe/denmark/';
const write=(file,data)=>{fs.mkdirSync(path.dirname(base+file),{recursive:true});const raw=Buffer.from(JSON.stringify(data)),bytes=gzipSync(raw,{level:9});fs.writeFileSync(base+file,bytes);return{bytes:bytes.length,decodedBytes:raw.length};};
const sum=features=>features.reduce((s,f)=>s+area(f.geometry),0);
// Classify coincident strokes by their highest administrative owner. A finer
// layer supplies that edge only when its owning outline checkbox is disabled.
function ownedBorders(data,municipal,regional){
 const mi=borderIndex(municipal,.5),ri=borderIndex(regional,.5),features=[];
 for(const f of data.features)for(const p of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates){let run=[],last;
  const flush=()=>{if(run.length>1)features.push({...f,properties:{...f.properties,upperLevel:last},geometry:{type:'LineString',coordinates:run}});run=[];};
  for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],level=liesOnBorder(ri,a,b)?1:liesOnBorder(mi,a,b)?2:3;if(level!==last){flush();last=level;}if(!run.length)run.push(a);run.push(b);}flush();
 }
 return fc(features);
}
export async function buildDenmarkLocal(){
 const sources=manifest(),definition=localDefinitions.denmark,cat=load(base+'catalogue.bin'),facts=load(base+'statistics.json'),provenance=load(base+'sources.json'),old=load(base+'all.bin');
 cat.records=cat.records.filter(r=>r.level<3);for(const [id,c]of Object.entries(cat.chunks))if(c.level===3)delete cat.chunks[id];for(const [id,r]of Object.entries(facts.regions))if(r.level===3)delete facts.regions[id];
 const originalFacts=sha(Buffer.from(JSON.stringify(facts.regions))),records=new Map(cat.records.map(r=>[r.id,r]));
 const mask=load('scripts/boundary-sources/denmark/atlas-land-mask.geojson.gz'),fallback=load('scripts/boundary-sources/denmark/atlas-municipalities.geojson.gz');
 assert.equal(sha(Buffer.from(JSON.stringify(fallback))),'c9ca2f1528d7b4d6fee74f14bdc5bb2b67f929ff9455aaf4dbdb99e45f143eb5','Pinned former municipal coast assignments');
 assert.equal(sha(Buffer.from(JSON.stringify(mask))),'ebb403316c369562bb702b8100fd27e3430ef3a7b8c42f8a2ba5b0583fbc6aba','Pinned national silhouette');
 const official=fc(Object.keys(sources.files).filter(n=>n.startsWith('denmark-municipalities')).flatMap(n=>JSON.parse(readLocalSource(n)).features).filter(f=>f.properties.kommunekod!==411).map(f=>{const id='DK_'+f.properties.kommunekod;assert(records.has(id),'Existing municipal identity '+id);const region=({1084:'DK01',1085:'DK02',1083:'DK03',1082:'DK04',1081:'DK05'})[f.properties.RegionsKode];assert.equal(records.get(id).parent,region,'Official region '+id);return {...f,properties:{id}};}));
 assert.equal(official.features.length,98);
 console.log('Aligning Denmark: official 98 municipalities and 2,096 municipal parishes on the retained country silhouette');
 const municipal=await command({'municipal.json':official,'land.json':mask},'-clip land.json -clean gap-fill-area=0');
 const coast=await command({'old.json':fallback,'municipal.json':municipal},'-erase municipal.json -clean gap-fill-area=0');
 const filled=await command(fc([...municipal.features,...coast.features]),'-dissolve id -clean gap-fill-area=0');
 const input=localFeatures('denmark');const parish=await command({'parish.json':fc(input.regions.features.filter(f=>f.properties.id!=='DK-S-7568')),'land.json':mask},'-dissolve id -clean gap-fill-area=0 -clip land.json');
 // Import both surveys into one topology before simplification: coincident arcs
 // have identical vertices at every level, including selected outlines.
 const joined=await command(fc([...filled.features.map(f=>({...f,properties:{...f.properties,kind:'municipal'}})),...parish.features.map(f=>({...f,properties:{...f.properties,kind:'parish'}}))]),'-snap interval=.000001 -simplify dp interval=.00003 planar keep-shapes');
 let municipalities=fc(joined.features.filter(f=>f.properties.kind==='municipal').map(f=>({...f,properties:{id:f.properties.id}}))),locals=fc(joined.features.filter(f=>f.properties.kind==='parish').map(f=>({...f,properties:{id:f.properties.id}})));
 assert.equal(municipalities.features.length,98);assert.equal(locals.features.length,2096);
 // Overlay the complete pinned land polygon after simplification. Its uncovered
 // coastal pieces keep the former municipal assignment, with no sliver removal.
 const mosaic=await command({'land.json':fc(mask.features.map(f=>({...f,properties:{land:true}}))),'municipal.json':municipalities,'fallback.json':fc(fallback.features.map(f=>({...f,properties:{fallbackId:f.properties.id}})))},'-i municipal.json name=municipal -target land,municipal -union -filter "land===true" -join fallback.json fields=fallbackId largest-overlap -each "id=id||fallbackId" -dissolve id');
 municipalities=fc(mosaic.features.map(f=>({...f,properties:{id:f.properties.id}})));
 const firstMain=await command(fc(municipalities.features.map(f=>({...f,properties:{id:records.get(f.properties.id).parent}}))),'-dissolve id');
 const first=fc([...firstMain.features,...old.levels.find(l=>l.level===1).regions.features.filter(f=>!/^DK0/.test(f.properties.id))]);
 const second=fc([...municipalities.features,...old.levels.find(l=>l.level===2).regions.features.filter(f=>!/^DK_/.test(f.properties.id))]);
 const regional=sharedBorders(first),allMunicipal=sharedBorders(second),secondBorders=ownedBorders(allMunicipal,allMunicipal,regional);
 write('first.bin',{regions:first,boundaries:regional});write('all.bin',{levels:[{level:1,regions:first,boundaries:regional},{level:2,regions:second,boundaries:secondBorders}]});
 const geometry=new Map(second.features.map(f=>[f.properties.id,f]));
 for(const r of cat.records.filter(r=>r.level===1)){const children=fc(second.features.filter(f=>records.get(f.properties.id).parent===r.id));if(!children.features.length)continue;const ids=new Set(children.features.map(f=>f.properties.id)),file='second/'+r.id+'.bin',data={regions:children,boundaries:fc(secondBorders.features.filter(f=>f.properties.owners.some(id=>ids.has(id))))};cat.chunks[r.id]={file,level:2,count:children.features.length,...write(file,data)};}
 const basePoints=await command(fc([...firstMain.features,...municipalities.features]),'-points inner');[...firstMain.features,...municipalities.features].forEach((f,i)=>{const r=records.get(f.properties.id);r.bounds=geographicBounds(f.geometry);r.center=basePoints.features[i].geometry.coordinates;});
 const crosswalk=await command({'local.json':fc(input.regions.features.filter(f=>f.properties.id!=='DK-S-7568')),'municipal.json':fc(official.features.map(f=>({...f,properties:{municipality:f.properties.id}})))},'-i municipal.json name=municipal -target local -join municipal fields=municipality largest-overlap -each "primary=municipality" -join municipal calc="parents=collect(municipality)" min-overlap-area=.01km2');
 const navigation=new Map(crosswalk.features.map(f=>[f.properties.id,f.properties]));
 const points=await command(locals,'-points inner'),byParent=new Map(),localRecords=new Map();
 for(const [i,f]of locals.features.entries()){
  const unit=input.units.get(f.properties.id),parent=navigation.get(f.properties.id).primary;assert(records.has(parent),'Parish parent '+unit.id);const parents=[...new Set([parent,...navigation.get(f.properties.id).parents||[]])];unit.parent=parent;if(parents.length>1)unit.parents=parents;
  const record={...unit,center:points.features[i].geometry.coordinates,bounds:geographicBounds(f.geometry),areaKm2:area(f.geometry)};localRecords.set(unit.id,record);f.properties={id:unit.id};
  for(const p of parents){if(!byParent.has(p))byParent.set(p,[]);byParent.get(p).push(f);}
  facts.regions['denmark:'+unit.id]={name:unit.en,level:3,parent,area:{value:record.areaKm2,unit:'km²',year:definition.year,source:'nordicLocalBoundaries',method:'mapped',label:'Mapped land area'},note:unit.note};
 }
 const localBorders=ownedBorders(sharedBorders(locals),allMunicipal,regional),report={country:'denmark',retrieved:sources.retrieved,type:definition.label,sourceUnits:input.units.size,baseFiles:{},originalFacts,parents:[],omitted:['DK-S-7568'],alignment:{municipalities:98,crossMunicipalParishes:[...localRecords.values()].filter(r=>r.parents?.length>1).map(r=>({id:r.id,name:r.en,parents:r.parents})),coastFallbackAreaKm2:sum(coast.features),countryMaskSha256:sha(Buffer.from(JSON.stringify(mask))),territories:'unchanged',processing:'DAGI municipal interior edges and parishes simplified in one topology; retained atlas national silhouette and coastal fallback preserve the existing international frontier.'}};
 // Normal local strokes stay inside the municipality being explored. Complete
 // official parish polygons and selection outlines retain legitimate crossings.
 for(const [parent,features]of byParent){const ids=new Set(features.map(f=>f.properties.id)),lines=fc(localBorders.features.filter(f=>f.properties.owners.every(id=>ids.has(id)))),clippedLines=await command({'lines.json':lines,'parent.json':fc([geometry.get(parent)])},'-clip parent.json');const file='third/'+parent+'.bin',data={regions:fc(features),boundaries:clippedLines},sizes=write(file,data);cat.chunks[parent]={file,level:3,count:features.length,...sizes};report.parents.push({id:parent,count:features.length,parentAreaKm2:area(geometry.get(parent).geometry),coveredAreaKm2:sum(features),...sizes});}
 cat.records.push(...localRecords.values());cat.counts[3]=localRecords.size;cat.levels=[...cat.levels.slice(0,2),definition.label];cat.rendering={...cat.rendering,fillTolerance:.125};cat.localAreas={type:definition.label,coverage:definition.note,municipalities:[...byParent.keys()],sourceUnits:input.units.size,mappedUnits:localRecords.size};
 for(const file of ['first.bin','all.bin',...Object.values(cat.chunks).filter(c=>c.level===2).map(c=>c.file)])report.baseFiles[file]=sha(fs.readFileSync(base+file));
 facts.sources.nordicLocalBoundaries={title:'DAGI official parishes, with matching municipal topology',url:'data/europe/denmark/sources.json'};
 provenance.processing="Danish municipal interiors and parishes share one DAGI topology simplified at 0.00003 degrees; regions dissolve from the same municipalities. The retained atlas national silhouette and coastal fallback preserve the international frontier. Ordinary internal edges have one visible owner; selected outlines use the same screen-space detail. Population, economy and North Atlantic territory geometry remain unchanged.";provenance.counts={...cat.counts};provenance.coverage=provenance.coverage.replace('Denmark: five regions and 98 municipalities (GISCO 2024)','Denmark: five regions and 98 municipalities (DAGI, July 2026 interior boundaries; retained atlas national silhouette)');provenance.localAreas={...cat.localAreas,retrieved:sources.retrieved,processing:'Danish municipal interiors and parish boundaries use matching official DAGI surveys, snapped within 0.000001 degrees and simplified together at 0.00003 degrees. Regions dissolve from the municipal topology. The retained national land silhouette and GISCO coastal fallback keep the international boundary exact. Normal parish strokes are clipped to the explored municipality; the 27 observed cross-municipal parishes retain their full official land geometry and a primary municipality by largest overlap. Coincident boundary strokes have one visible administrative owner. Existing population/economic facts, Christiansø, Greenland and Faroe geometry remain unchanged.',sources:Object.fromEntries(Object.entries(sources.files).filter(([,s])=>s.country==='denmark'))};
 write('catalogue.bin',cat);fs.writeFileSync(base+'statistics.json',JSON.stringify(facts));fs.writeFileSync(base+'sources.json',JSON.stringify(provenance,null,2)+'\n');fs.writeFileSync(base+'local-areas.json',JSON.stringify(report,null,2)+'\n');
 console.log('Denmark aligned',cat.counts,'cross-municipal parishes',report.alignment.crossMunicipalParishes.length,'coastal fallback km²',sum(coast.features));
}
