import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {load} from './geo-index.mjs';
import {createRequire} from 'node:module';
import {readNordic} from './fetch-nordics.mjs';
const require=createRequire(import.meta.url),osmToGeoJSON=require('osmtogeojson');
import {command,fc,sharedBorders,geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2 as area} from './geographic-area.mjs';
import {manifest,sha,readLocalSource} from './fetch-nordic-local.mjs';
import {localDefinitions,localFeatures} from './nordic-local-data.mjs';
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});const raw=Buffer.from(JSON.stringify(value)),bytes=gzipSync(raw,{level:9});fs.writeFileSync(file,bytes);return{bytes:bytes.length,decodedBytes:raw.length};};
const sum=data=>data.features.reduce((n,f)=>n+area(f.geometry),0);
export async function buildNordicLocal(countries=Object.keys(localDefinitions)){
 const sources=manifest();
 for(const country of countries){
  const definition=localDefinitions[country],base='dist/data/europe/'+country+'/',catalogue=load(base+'catalogue.bin'),facts=load(base+'statistics.json'),provenance=load(base+'sources.json');
  const parents=new Map(catalogue.records.filter(r=>r.level===2).map(r=>[r.id,r])),geometry=new Map(),baseFiles={};
  for(const name of ['first.bin',...fs.existsSync(base+'all.bin')?['all.bin']:[],...Object.values(catalogue.chunks).filter(c=>c.level!==3).map(c=>c.file)]){
   const bytes=fs.readFileSync(base+name);baseFiles[name]=sha(bytes);const data=load(base+name);
   for(const part of data.levels||[{regions:data.regions}])for(const f of part.regions?.features||[])if(parents.has(f.properties.id))geometry.set(f.properties.id,f);
  }
  assert.equal(geometry.size,parents.size,'Existing municipality geometry '+country);
  catalogue.records=catalogue.records.filter(r=>r.level<3);for(const [parent,chunk]of Object.entries(catalogue.chunks))if(chunk.level===3){delete catalogue.chunks[parent];}
  for(const [id,record]of Object.entries(facts.regions))if(record.level===3)delete facts.regions[id];
  const originalFacts=sha(Buffer.from(JSON.stringify(facts.regions)));
  let clipGeometry=geometry;
  if(country==='sweden'){
   const waterIds=[1433877,1298025,1239458,253599],water=waterIds.map(id=>{const data=osmToGeoJSON(JSON.parse(readLocalSource('swedish-lake-osm-'+id+'.json'))),feature=data.features.find(f=>f.id==='relation/'+id);assert(feature&&!feature.properties.tainted,'Complete lake relation '+id);return feature;});
   const ids=new Set(water.map(f=>f.properties.tags?.wikidata||f.properties.wikidata)),oldWater=JSON.parse(readNordic('ne-lakes.json')).features.filter(f=>!ids.has(f.properties.wikidataid));
   const raw=JSON.parse(readNordic('nordic-lau-2024.json')),political=fc(raw.features.filter(f=>f.properties.CNTR_CODE==='SE').map(f=>({...f,properties:{id:'SE-M-'+f.properties.GISCO_ID.slice(3)}})));
   const mask=await command({'land.json':political,'water.json':fc([...oldWater,...water])},'-erase water.json -clean gap-fill-area=0');clipGeometry=new Map(mask.features.map(f=>[f.properties.id,f]));
  }
  const input=localFeatures(country);for(const unit of input.units.values())assert(country==='denmark'||parents.has(unit.parent),'Known municipality '+unit.id+' → '+unit.parent);
  // Dissolve official basic units into their named areas before simplifying their
  // shared topology. The existing atlas municipality land remains the clipping mask.
  console.log('Preparing',country,input.regions.features.length,'source polygons',input.units.size,'named local areas');
  let regions=await command(input.regions,'-dissolve id -clean gap-fill-area=0 -simplify dp interval=0.00003 planar keep-shapes -clean gap-fill-area=0');
  if(country==='denmark'){
   const mask=fc([...geometry.values()].filter(f=>/^DK_/.test(f.properties.id)).map(f=>({...f,properties:{municipality:f.properties.id}})));
   regions=await command({'local.json':regions,'mask.json':mask},'-i mask.json name=mask -target local -clip mask -join mask fields=municipality largest-overlap -each "primary=municipality" -join mask calc="parents=collect(municipality)" min-overlap-area=0.01km2');
   for(const f of regions.features){const unit=input.units.get(f.properties.id),primary=f.properties.primary;assert(parents.has(primary),'Parish navigation municipality '+unit.id);unit.parent=primary;const ids=[...new Set([primary,...f.properties.parents||[]])];if(ids.length>1)unit.parents=ids;f.properties={id:unit.id};}
  }
  const byParent=new Map();for(const feature of regions.features)for(const parent of input.units.get(feature.properties.id).parents||[input.units.get(feature.properties.id).parent]){if(!byParent.has(parent))byParent.set(parent,[]);byParent.get(parent).push(feature);}
  const report={country,retrieved:sources.retrieved,type:definition.label,sourceUnits:input.units.size,baseFiles,originalFacts,parents:[],omitted:[]};
  const mappedRecords=new Map();for(const [parent,features]of byParent){
   const clipped=country==='denmark'?fc(features):await command({'local.json':fc(features),'parent.json':fc([clipGeometry.get(parent)])},'-clip parent.json -clean gap-fill-area=0');
   if(!clipped.features.length){report.omitted.push(...features.map(f=>f.properties.id));continue;}
   const points=await command(clipped,'-points inner');
   const present=new Set(clipped.features.map(f=>f.properties.id));report.omitted.push(...features.filter(f=>!present.has(f.properties.id)).map(f=>f.properties.id));
   for(const [i,feature]of clipped.features.entries()){
    const unit=input.units.get(feature.properties.id),mappedArea=area(feature.geometry);assert(mappedArea>0,'Mapped local land '+unit.id);
    const record={...unit,center:points.features[i].geometry.coordinates,bounds:geographicBounds(feature.geometry),areaKm2:mappedArea};
    mappedRecords.set(record.id,record);facts.regions[country+':'+record.id]={name:record.en,level:3,parent:unit.parent,area:{value:mappedArea,unit:'km²',year:definition.year,source:'nordicLocalBoundaries',method:'mapped',label:'Mapped land area'},note:unit.note};
   }
   const file='third/'+parent+'.bin',data={regions:clipped,boundaries:sharedBorders(clipped)},sizes=write(base+file,data);
   catalogue.chunks[parent]={file,level:3,count:clipped.features.length,...sizes};
   report.parents.push({id:parent,count:clipped.features.length,parentAreaKm2:area(geometry.get(parent).geometry),coveredAreaKm2:sum(clipped),...sizes});
  }
  report.omitted=[...input.units.keys()].filter(id=>!mappedRecords.has(id));const count=mappedRecords.size;catalogue.records.push(...mappedRecords.values());catalogue.counts['3']=count;catalogue.levels=[...catalogue.levels.slice(0,2),definition.label];
  catalogue.localAreas={type:definition.label,coverage:definition.note,municipalities:report.parents.map(p=>p.id),sourceUnits:input.units.size,mappedUnits:count};
  facts.sources.nordicLocalBoundaries={title:'Official Nordic statistical areas and city districts, with municipality land masks and detailed Swedish lake masks',url:'data/europe/'+country+'/sources.json'};
  provenance.counts={...catalogue.counts};provenance.localAreas={...catalogue.localAreas,retrieved:sources.retrieved,processing:'Official named areas retained. Danish parishes that cross municipal boundaries keep one identity and the same complete land geometry in each overlapping municipality; the largest overlap is used for primary navigation. Swedish local areas use the original GISCO municipality outline with detailed OpenStreetMap masks for Mälaren, Storsjön, Vänern and Vättern, restoring land removed by the coarse overview lake mask. Other areas are clipped to their existing municipality. Shared local topology simplified by 0.00003 degrees (about 3 m north–south), then clipped to the existing municipality land mask. Existing regional and municipal geometry is unchanged. Uncovered coastal slivers keep the municipality backdrop; no local administrative units or population estimates are invented.',sources:Object.fromEntries(Object.entries(sources.files).filter(([,s])=>s.country===country))};
  write(base+'catalogue.bin',catalogue);fs.writeFileSync(base+'statistics.json',JSON.stringify(facts));fs.writeFileSync(base+'sources.json',JSON.stringify(provenance,null,2)+'\n');fs.writeFileSync(base+'local-areas.json',JSON.stringify(report,null,2)+'\n');
  console.log('Built',country,count,'local areas in',report.parents.length,'municipal chunks; omitted',report.omitted.length);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildNordicLocal(process.argv.slice(2).length?process.argv.slice(2):undefined);
