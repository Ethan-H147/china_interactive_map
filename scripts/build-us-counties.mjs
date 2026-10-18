import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {fetchUSDetails,directory} from './fetch-us-details.mjs';
import {fc,command,shape,load,polygons,bounds,borders,csv,write} from './us-geography.mjs';
import {countryContext} from './country-context.mjs';
export async function buildUSCounties(root='dist/data/europe/united-states/'){
 const pins=await fetchUSDetails(),source=await shape(directory+'/counties.zip'),catalogue=load(root+'catalogue.bin'),oldFirst=load(root+'first.bin'),stats=load(root+'statistics.json');
 const states=new Map(catalogue.records.filter(r=>r.level===1).map(r=>[r.id,r])),metadata=new Map(),population=new Map(csv(fs.readFileSync(directory+'/population.csv','utf8')).filter(r=>r.SUMLEV==='050').map(r=>[r.STATE+r.COUNTY,r]));
 for(const f of source.features){const p=f.properties,parent='US-'+p.STUSPS,id='US-COUNTY-'+p.GEOID;assert(states.has(parent),parent);if(p.STUSPS==='AK')for(const q of polygons(f.geometry).flat(2))if(q[0]>0)q[0]-=360;
 const kind=p.STUSPS==='LA'?'Parish':p.STUSPS==='CT'?'Planning region':p.STUSPS==='PR'?'Municipio':p.STUSPS==='DC'?'Federal district':p.LSAD==='25'?'Independent city':p.NAMELSAD.endsWith('Census Area')?'Census area':/City and Borough$/.test(p.NAMELSAD)?'City and borough':p.NAMELSAD.endsWith('Borough')?'Borough':p.STUSPS==='AS'?'District or atoll':p.STUSPS==='MP'?'Municipality':p.STUSPS==='VI'?'Island district':p.STUSPS==='GU'?'Territory':'County';
 metadata.set(id,{id,parent,parentName:states.get(parent).en,level:2,en:p.NAMELSAD,local:p.NAMELSAD,kind,code:p.GEOID,areaKm2:p.ALAND/1e6,aliases:[p.NAME,p.GEOID,p.NAME+' '+p.STUSPS,p.NAMELSAD+' '+p.STUSPS,p.NAME+' '+states.get(parent).en]});f.properties={id,parent};
 }
 assert.equal(source.features.length,3235);
 const base=await command(source,'-clean -simplify dp interval=.0003 planar keep-shapes -clean'),points=await command(base,'-points inner');assert.equal(base.features.length,3235);
 const records=base.features.map((f,i)=>({...metadata.get(f.properties.id),center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry)}));
 const dissolved=await command(fc(base.features.map(f=>({...f,properties:{id:f.properties.parent}}))),'-dissolve id');
 const countyStates=new Set(dissolved.features.map(f=>f.properties.id)),first=fc([...dissolved.features,...oldFirst.regions.features.filter(f=>!countyStates.has(f.properties.id))]);
 // Keep one topology for each parent and its children. Coastlines remain selection-only.
 const statePoints=await command(first,'-points inner');first.features.forEach((f,i)=>{const r=states.get(f.properties.id);r.center=statePoints.features[i].geometry.coordinates;r.bounds=bounds(f.geometry);});
 write(root+'first.bin',{regions:first,boundaries:borders(first)});
 const edges=borders(base,{sameParent:id=>metadata.get(id).parent}),chunks={};
 for(const parent of countyStates){const children=fc(base.features.filter(f=>f.properties.parent===parent).map(f=>({...f,properties:{id:f.properties.id}}))),ids=new Set(children.features.map(f=>f.properties.id)),payload={regions:children,boundaries:fc(edges.features.filter(f=>f.properties.owners.some(id=>ids.has(id))))},file='second/'+parent+'.bin';chunks[parent]={file,level:2,count:children.features.length,...write(root+file,payload)};}
 catalogue.records=[...states.values(),...records,...catalogue.records.filter(r=>r.level===3)];catalogue.chunks=chunks;catalogue.counts={1:65,2:3235,...(catalogue.records.some(r=>r.level===3)?{3:catalogue.records.filter(r=>r.level===3).length}:{})};catalogue.levels=['State, federal district or territory','County or county equivalent',...(catalogue.thirdChunks?[catalogue.levels?.[2]||'Municipalities and optional Census areas']:[])];write(root+'catalogue.bin',catalogue);
 // A nationwide county bundle would defeat state-at-a-time loading.
 if(fs.existsSync(root+'all.bin'))fs.unlinkSync(root+'all.bin');
 write(root+'context.bin',await countryContext('united-states',first,states,command));
 stats.sources.usCountyPopulation={title:pins.files['population.csv'].provider,url:pins.files['population.csv'].url,license:'Public domain'};
 stats.sources.usCountyBoundaries={title:pins.files['counties.zip'].provider,url:pins.files['counties.zip'].url,license:'Public domain'};
 for(const key of Object.keys(stats.regions))if(key.startsWith('united-states:US-COUNTY-'))delete stats.regions[key];
 for(const r of records){const p=population.get(r.code);stats.regions['united-states:'+r.id]={name:r.en,level:2,parent:r.parent,area:{value:r.areaKm2,unit:'km²',year:2025,method:'reported',source:'usCountyBoundaries',label:'Land area'},...(p?{population:{value:+p.POPESTIMATE2025,year:2025,date:'2025-07-01',method:'estimate',periodLabel:'1 July 2025 estimate',source:'usCountyPopulation'}}:{note:'County-equivalent land area is from the 2025 Census boundary file. No population estimate is supplied by the county estimates release for this territory.'})};}
 write(root+'statistics.json',stats);
 const sources=load(root+'sources.json');sources.counts=catalogue.counts;sources.countySources=['counties.zip','population.csv'].map(file=>({file,...pins.files[file]}));sources.kinds=catalogue.records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{});sources.countyCoverage='All 3,235 counties and county equivalents in the Census 2025 cartographic county file: 3,144 in the 50 states and DC, 78 Puerto Rico municipios, 13 equivalents in American Samoa, Guam, Northern Mariana Islands and US Virgin Islands. Connecticut uses its nine current planning regions. No invented counties for the Minor Outlying Islands. Geometry loads one state or territory at a time; coasts are outlined only for a selection.';write(root+'sources.json',sources);
 console.log('US counties: 3,235 units, '+Object.keys(chunks).length+' lazy state/territory chunks; existing state statistics retained.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await buildUSCounties();
