import fs from 'node:fs';
import {countryContext} from './country-context.mjs';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load} from './geo-index.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {fetchExpansion,directory} from './fetch-country-expansion.mjs';
import {usTerritories,usTerritoryCoverage,territoryStatisticsSources,territoryStat,territoryFiles} from './us-territories.mjs';
const require=createRequire(import.meta.url),mapshaper=require('mapshaper'),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const pins=await fetchExpansion(),zip=unzipSync(fs.readFileSync(directory+'/us-states-2025.zip')),files=Object.fromEntries(['shp','shx','dbf','prj'].map(ext=>['in.'+ext,Buffer.from(zip['cb_2025_us_state_500k.'+ext])]));
const census=JSON.parse((await mapshaper.applyCommands('-i in.shp -proj wgs84 -o out.json format=geojson precision=.000001',files))['out.json']);
const data=usTerritories(census,load(directory+'/us-minor-islands-coastline.json'));
async function command(d,args){const v=JSON.parse((await mapshaper.applyCommands('-i in.json '+args+' -o out.json format=geojson precision=.000001',{'in.json':JSON.stringify(d)}))['out.json']);return v.type==='FeatureCollection'?v:{type:'FeatureCollection',features:[v]};}
const fc=features=>({type:'FeatureCollection',features}),bounds=g=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];};
const prepared=await command(fc(data.features),'-clean -simplify dp interval=.0003 planar keep-shapes -clean'),points=await command(prepared,'-points inner'),areas=await command(prepared,'-each "areaKm2=$.area/1000000"');
const records=prepared.features.map((f,i)=>{const u=data.units.get(f.properties.id);const {population,reportedArea,...r}=u;return {...r,center:points.features[i].geometry.coordinates,bounds:bounds(f.geometry),areaKm2:reportedArea||areas.features[i].properties.areaKm2};});
const root='dist/data/europe/united-states/',backup='artifacts/us-territories-backup/';
function save(file,data){
 const target='dist/data/'+file,original=backup+file;fs.mkdirSync(original.slice(0,original.lastIndexOf('/')),{recursive:true});if(!fs.existsSync(original))fs.copyFileSync(target,original);
 const text=JSON.stringify(data);fs.writeFileSync(target,file.endsWith('.bin')?gzipSync(text,{level:9}):text+'\n');
 const compact='dist/data/compact/'+file;if(fs.existsSync(compact))fs.writeFileSync(compact,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
}
const first=load(root+'first.bin');first.regions.features=first.regions.features.filter(f=>!data.units.has(f.properties.id)).concat(prepared.features);save('europe/united-states/first.bin',first);
const catalogue=load(root+'catalogue.bin');catalogue.records=catalogue.records.filter(r=>!data.units.has(r.id)).concat(records);for(const r of catalogue.records)if(['US-AK','US-HI'].includes(r.id))r.focusOnEntry=true;catalogue.counts[1]=catalogue.records.length;catalogue.levels=['State, federal district or territory'];save('europe/united-states/catalogue.bin',catalogue);
const context=await countryContext('united-states',first.regions,new Map(catalogue.records.map(r=>[r.id,r])),command);save('europe/united-states/context.bin',context);
const stats=load(root+'statistics.json');Object.assign(stats.sources,territoryStatisticsSources);for(const r of records)stats.regions['united-states:'+r.id]=territoryStat(r,data.units.get(r.id).population);save('europe/united-states/statistics.json',stats);
const sources=load(root+'sources.json');sources.counts=catalogue.counts;sources.sources=sources.sources.filter(s=>s.file!=='ne-10m-countries.geojson');sources.coverage=usTerritoryCoverage;sources.territoryScope={url:'https://www.doi.gov/node/11613',included:records.map(r=>r.id),excluded:['Military bases on foreign soil','Freely associated sovereign states','Bajo Nuevo and Serranilla (administered by Colombia)']};for(const file of territoryFiles)if(!sources.sources.some(s=>s.file===file))sources.sources.push({file,...pins.files[file]});sources.kinds=catalogue.records.reduce((o,r)=>(o[r.kind]=(o[r.kind]||0)+1,o),{});save('europe/united-states/sources.json',sources);
console.log('Added '+records.length+' US territories; '+catalogue.records.length+' first-level units. Existing state statistics and GDP retained.');
