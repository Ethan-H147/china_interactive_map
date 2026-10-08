import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import mapshaper from 'mapshaper';
const dir='scripts/additional-sources/singapore/',out='dist/data/southeast-asia/';
fs.mkdirSync(out+'singapore',{recursive:true});
const read=name=>JSON.parse(fs.readFileSync(dir+name));
const fc=features=>({type:'FeatureCollection',features});
const run=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson geojson-type=FeatureCollection',structuredClone(files)))['output.json']);
const raw=read('planning-areas-2025.geojson'),names=read('names.json'),population=read('population-totals-2026.json');
const regionNames={CR:{en:'Central Region',zh:'中区',ms:'Wilayah Tengah',ta:'மத்திய வட்டாரம்'},ER:{en:'East Region',zh:'东区',ms:'Wilayah Timur',ta:'கிழக்கு வட்டாரம்'},NR:{en:'North Region',zh:'北区',ms:'Wilayah Utara',ta:'வடக்கு வட்டாரம்'},NER:{en:'North-East Region',zh:'东北区',ms:'Wilayah Timur Laut',ta:'வடகிழக்கு வட்டாரம்'},WR:{en:'West Region',zh:'西区',ms:'Wilayah Barat',ta:'மேற்கு வட்டாரம்'}};
const regionPopulation=new Map(read('population-regions-2026.json').Data.row.filter(r=>!r.seriesNo.includes('.')&&!r.rowText.includes('(')).map(r=>[r.rowText,Number(r.columns.find(c=>c.key==='2026').value)]));
const areas=fc(raw.features.map(f=>({...f,properties:{id:'SG-'+f.properties.PLN_AREA_C,parent:'SG-'+f.properties.REGION_C}})));
const first=await run('-i input.json -clean gap-width=0 -dissolve parent',{'input.json':areas});
for(const f of first.features)f.properties={id:f.properties.parent,parent:'SG'};
const bounds=g=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const visit=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(visit);};visit(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];};
const centers=await run('-i input.json -points inner',{'input.json':fc([...first.features,...areas.features])});
const centersById=new Map(centers.features.map(f=>[f.properties.id,f.geometry.coordinates]));
const records=[],chunks={},statistics={version:1,country:'singapore',retrieved:'2026-10-08',sources:{
 'ura-area':{title:'URA Master Plan 2025 planning boundaries (no sea)',url:'https://data.gov.sg/datasets/d_2cc750190544007400b2cfd5d7f53209/view',license:'Singapore Open Data Licence'},
 'singstat-area-population':{title:'SingStat Population Trends 2026, geographic tables',url:'https://www.singstat.gov.sg/publication-resources/population-trends-2026'},
 'singstat-region-population':{title:'SingStat planning-region resident population, M810771',url:'https://tablebuilder.singstat.gov.sg/table/TS/M810771'}
},regions:{}};
const makeRecord=(f,name,level,kind)=>({...name,en:name.en,local:name.zh,names:name,aliases:Object.values(name),id:f.properties.id,parent:f.properties.parent,level,kind,bounds:bounds(f.geometry),center:centersById.get(f.properties.id)});
const areaMetric=value=>({value,unit:'km²',year:2025,method:'reported',label:'Planning area',source:'ura-area',note:'URA’s SHAPE.AREA in square metres, converted to square kilometres. Planning extents exclude sea but can include reservoirs and inland water, and differ from physical land area.'});
const popMetric=(value,source)=>({value:value==='-'?0:value,...(value==='-'?{displayValue:'Nil or negligible'}:{}),year:2026,date:'2026-06',method:'estimate',label:'Resident population',source,coverageNote:'Citizens and permanent residents only. Non-residents are excluded; figures are rounded to the nearest 10.',note:'Citizens and permanent residents at end-June 2026; non-residents are excluded. Uses published overall totals, not sums of rounded age or subzone cells. Figures are rounded to the nearest 10; a dash denotes nil or negligible.'});
const populationScopes={
 PN:'This is the industrial Pioneer planning area. The residential neighbourhood around Pioneer MRT is counted under Jurong West.',
 BL:'This is the industrial Boon Lay planning area. The residential Boon Lay neighbourhood (Boon Lay Place) is counted under Jurong West.'
};
const regionTop=topology({regions:structuredClone(first)}),areaTop=topology({regions:structuredClone(areas)});
const borders=(top,ids)=>{
 const owners=new Map(),pairs=new Map();
 const visit=(arcs,id)=>{if(typeof arcs[0]==='number'){for(const a of arcs){const key=a<0?~a:a;if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(id);}}else arcs.forEach(a=>visit(a,id));};
 for(const g of top.objects.regions.geometries)visit(g.arcs,g.properties.id);
 for(const ownersOfArc of owners.values())if(ownersOfArc.size===2){const pair=[...ownersOfArc].sort();pairs.set(pair.join('|'),pair);}
 return fc([...pairs.values()].filter(pair=>pair.some(id=>ids.includes(id))).map(pair=>({type:'Feature',properties:{owners:pair},geometry:mesh(top,top.objects.regions,(a,b)=>a!==b&&pair.includes(a.properties.id)&&pair.includes(b.properties.id))})));
};
const write=(file,data)=>{const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(out+file,bytes);return {file,bytes:bytes.length,decodedBytes:Buffer.byteLength(JSON.stringify(data))};};
for(const f of first.features){
 const code=f.properties.id.slice(3),name=regionNames[code];assert(name);
 records.push(makeRecord(f,name,1,'Region'));
 const children=areas.features.filter(a=>a.properties.parent===f.properties.id);
 const chunk=write('singapore/'+f.properties.id+'.bin',{regions:fc(children),boundaries:borders(areaTop,children.map(a=>a.properties.id))});chunks[f.properties.id]={...chunk,count:children.length};
 const regionRaw=raw.features.filter(a=>'SG-'+a.properties.REGION_C===f.properties.id);
 statistics.regions['singapore:'+f.properties.id]={name:name.en,country:'SG',level:1,population:popMetric(regionPopulation.get(name.en),'singstat-region-population'),area:areaMetric(regionRaw.reduce((n,a)=>n+a.properties['SHAPE.AREA']/1e6,0)),note:'Region area is the sum of its planning-area extents under Master Plan 2025. Resident population is the independently published regional total; rounded planning-area counts may not add up exactly.'};
}
for(const f of areas.features){
 const source=raw.features.find(a=>'SG-'+a.properties.PLN_AREA_C===f.properties.id),name=names.names[source.properties.PLN_AREA_N];assert(name,'Missing multilingual name '+source.properties.PLN_AREA_N);
 const value=population.values[source.properties.PLN_AREA_N];assert(value!==undefined,'Missing population '+source.properties.PLN_AREA_N);
 const scopeNote=populationScopes[source.properties.PLN_AREA_C];
 records.push(makeRecord(f,name,2,scopeNote?'Industrial planning area':'Planning area'));
 statistics.regions['singapore:'+f.properties.id]={name:name.en,country:'SG',level:2,population:{...popMetric(value,'singstat-area-population'),...(scopeNote?{scopeNote,relatedPlace:{id:'SG-JW',label:'View residential Jurong West'}}:{})},area:areaMetric(source.properties['SHAPE.AREA']/1e6),note:'Population and area use Master Plan 2025 planning areas. Planning areas are urban-planning and statistical units.'};
}
records.unshift({id:'SG',en:'Singapore',local:'新加坡',names:{en:'Singapore',zh:'新加坡',ms:'Singapura',ta:'சிங்கப்பூர்'},aliases:['Singapura','சிங்கப்பூர்'],level:0,kind:'City-state',center:[103.83,1.33],bounds:[[103.58,1.14],[104.12,1.49]]});
fs.mkdirSync(out+'singapore',{recursive:true});
write('singapore-first.bin',{regions:first,boundaries:borders(regionTop,first.features.map(f=>f.properties.id))});
write('singapore-catalogue.bin',{records,chunks});
fs.writeFileSync(out+'singapore-statistics.json',JSON.stringify(statistics));
const review=read('population-review-2026.json');
fs.writeFileSync(out+'singapore-population-review.json',JSON.stringify(review,null,2)+'\n');
const sources=JSON.parse(fs.readFileSync(out+'singapore-sources.json'));sources.subdivisions={url:statistics.sources['ura-area'].url,masterPlan:2025,regions:5,planningAreas:55,method:'Planning regions dissolved from the same 55 URA planning areas. Every original boundary vertex is retained. Shared internal edges only; coastlines are not stroked. Detail is loaded only for the selected region.'};sources.names={url:names.source,license:names.license,languages:['English','Chinese','Malay','Tamil']};sources.population=statistics.sources['singstat-area-population'];sources.coverage='SLA coastal context; five URA planning regions and 55 planning areas under Master Plan 2025, with June 2026 resident population and URA planning-area extent measurements.';
sources.population.review={url:'singapore-population-review.json',reviewed:review.reviewed,planningAreasChecked:review.planningAreasChecked,method:'Every published overall planning-area total agrees across the dwelling-type and single-year-of-age workbooks. The downloaded ZIP was checked against the current official release.'};
fs.writeFileSync(out+'singapore-sources.json',JSON.stringify(sources,null,2)+'\n');
console.log('Singapore: 5 regions, 55 planning areas, four languages, 2026 resident population and official planning extents.');
