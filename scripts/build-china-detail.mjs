import fs from 'node:fs';
import readline from 'node:readline';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {mesh} from 'topojson-client';
import {topology} from 'topojson-server';
import {readData} from './read-data.mjs';
import {transformFeature} from './coordinates.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

const root='dist/data/china-detail/';fs.mkdirSync(root,{recursive:true});
const old=readData('display-boundaries.json'),fc=features=>({type:'FeatureCollection',features});
const count=c=>typeof c[0]==='number'?1:c.reduce((s,p)=>s+count(p),0);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const run=async(command,inputs)=>JSON.parse((await mapshaper.applyCommands(command+' -o out.json format=geojson geojson-type=FeatureCollection',Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,JSON.stringify(v)]))))['out.json']);
const protectedProvinces=new Set([110000,120000,310000,500000,220000,650000,710000,810000,820000]);
const protectedCities=new Set([320100,320500,320600,330100,330900,440100,440300,440400,441300]);
const eligible=f=>f.properties.level==='city'&&String(f.properties.adcode).slice(2,4)!=='90'&&!protectedProvinces.has(f.properties.provinceCode)&&!protectedCities.has(f.properties.adcode);
const wanted=new Map(old.subdivisions.features.filter(eligible).map(f=>[f.properties.adcode,f])),raw=[];
const file='scripts/additional-sources/ok_geo.csv';
if(fs.existsSync(file)&&!process.argv.includes('--archive'))for await(const line of readline.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity})){
 const first=line.indexOf(','),id=line.slice(0,first);if(id.length!==4||!wanted.has(Number(id)*100))continue;
 const c=[...line.matchAll(/"([^"]*)"|([^,]+)/g)].map(m=>m[1]??m[2]);if(c[2]!=='1'||c[6]==='EMPTY')continue;
 const source=wanted.get(Number(id)*100);assert.equal(c[3],source.properties.name,'Administrative name mismatch '+id);
 const coordinates=c[6].split(';').map(part=>part.split('~').map(ring=>{const points=ring.split(',').map(p=>p.trim().split(/\s+/).map(Number));if(JSON.stringify(points[0])!==JSON.stringify(points.at(-1)))points.push([...points[0]]);return points;}));
 raw.push(transformFeature({type:'Feature',properties:source.properties,geometry:{type:'MultiPolygon',coordinates}}));
}else for(const f of JSON.parse(gunzipSync(fs.readFileSync('archives/china-boundaries-2026-10-06/areacity-prefectures.bin'))).features)if(wanted.has(f.properties.adcode))raw.push({...f,properties:wanted.get(f.properties.adcode).properties});
assert(raw.length>250,'Incomplete candidate source');
// Retain the reusable full candidate outside the deployed site, including every source vertex.
fs.mkdirSync('archives/china-boundaries-2026-10-06',{recursive:true});
fs.writeFileSync('archives/china-boundaries-2026-10-06/areacity-prefectures.bin',gzipSync(JSON.stringify(fc(raw)),{level:9}));
const changed=new Map(),reports=[];
for(const province of old.provinces.features){
 const code=province.properties.adcode,local=raw.filter(f=>f.properties.provinceCode===code);if(!local.length)continue;
 const ids=new Set(local.map(f=>f.properties.adcode)),previous=old.subdivisions.features.filter(f=>f.properties.provinceCode===code),fixed=previous.filter(f=>!ids.has(f.properties.adcode));
 // Preserve reviewed places and all existing province/national edges. Only replace internal prefecture edges.
 const mask=fixed.length?await run('-i extent.json -erase fixed.json',{'extent.json':fc([province]),'fixed.json':fc(fixed)}):fc([province]);
 const simplified=await run('-i new.json -clean gap-width=0 overlap-rule=min-area -simplify dp interval=20 keep-shapes',{'new.json':fc(local)});
 const clipped=await run('-i new.json -clip mask.json',{'new.json':simplified,'mask.json':mask});
 const fallback=await run('-i old.json -erase new.json',{'old.json':fc(previous.filter(f=>ids.has(f.properties.adcode))),'new.json':clipped});
 let combined=await run('-i all.json -dissolve2 adcode',{'all.json':fc([...clipped.features,...fallback.features])});
 const residual=await run('-i old.json -erase coverage.json',{'old.json':fc(previous.filter(f=>ids.has(f.properties.adcode))),'coverage.json':fc([...combined.features,...fixed])});
 if(residual.features.length)combined=await run('-i all.json -dissolve2 adcode',{'all.json':fc([...combined.features,...residual.features])});
 const centers=await run('-i all.json -points inner',{'all.json':combined});
 for(const [i,f]of combined.features.entries()){const original=wanted.get(f.properties.adcode);assert(original);changed.set(f.properties.adcode,{...original,properties:{...original.properties,center:centers.features[i].geometry.coordinates,centroid:centers.features[i].geometry.coordinates,geometrySource:'AreaCity 2025.251231.260403, 20 m display'},geometry:f.geometry});}
 assert.equal(combined.features.length,local.length);
 const originalVertices=previous.filter(f=>ids.has(f.properties.adcode)).reduce((s,f)=>s+count(f.geometry.coordinates),0),displayVertices=combined.features.reduce((s,f)=>s+count(f.geometry.coordinates),0);
 reports.push({province:code,regions:local.length,originalVertices,displayVertices});console.log(code,local.length,originalVertices,'->',displayVertices);
}
const subdivisions=fc(old.subdivisions.features.map(f=>changed.get(f.properties.adcode)||f));
// Node shared line segments independently; protected polygon coordinates remain byte-for-byte intact.
const topo=JSON.parse((await mapshaper.applyCommands('-i all.json -o out.json format=topojson no-quantization',{'all.json':JSON.stringify(subdivisions)}))['out.json']);
const regions=Object.values(topo.objects)[0],same=(a,b)=>a.properties.provinceCode===b.properties.provinceCode,pref=g=>g.properties.level==='taiwan-region'||g.properties.level==='city'&&String(g.properties.adcode).slice(2,4)!=='90';
const boundaries={province:old.boundaries.province,prefecture:mesh(topo,regions,(a,b)=>a!==b&&same(a,b)&&(pref(a)||pref(b))),other:old.boundaries.other};
const display={...old,subdivisions,boundaries},objects={provinces:display.provinces,subdivisions,annotations:display.annotations,...Object.fromEntries(Object.entries(boundaries).map(([key,g])=>[key,{type:'Feature',properties:{},geometry:g}]))};
// Shared edges are stored once, losslessly; the browser never downloads both profiles.
const serialized=Buffer.from(JSON.stringify(topology(objects))),compressed=gzipSync(serialized,{level:9}),parts=[];
assert(compressed.length<32*1024*1024,'Candidate exceeds compressed browser budget');assert(serialized.length<150*1024*1024,'Candidate exceeds decoded browser budget');
assert(Buffer.byteLength(JSON.stringify(display))<150*1024*1024,'Expanded geometry exceeds browser budget');
for(let offset=0;offset<compressed.length;offset+=4*1024*1024){const name='display.'+parts.length+'.bin';parts.push(name);fs.writeFileSync(root+name,compressed.subarray(offset,offset+4*1024*1024));}
const previousManifest=fs.existsSync(root+'display.parts.json')?JSON.parse(fs.readFileSync(root+'display.parts.json')):null;
for(const name of previousManifest?.parts||[])if(!parts.includes(name)){assert(/^display\.\d+\.bin$/.test(name));fs.unlinkSync(root+name);}
fs.writeFileSync(root+'display.parts.json',JSON.stringify({compression:'gzip',format:'topojson',parts,compressedBytes:compressed.length,uncompressedBytes:serialized.length,sha256:digest(serialized)},null,2));
// Jilin and Yanbian are protected, so their reviewed triangulation stays exact.
const motion=JSON.parse(gunzipSync(fs.readFileSync('dist/data/china-motion.bin')));
const motionPref=await run('-i all.json -filter-islands min-area=1km2 -simplify dp interval=200',{'all.json':fc(subdivisions.features.filter(f=>changed.has(f.properties.adcode)))});
const motionIds=new Set(motionPref.features.map(f=>f.properties.adcode));for(const f of subdivisions.features.filter(f=>changed.has(f.properties.adcode)&&!motionIds.has(f.properties.adcode)))motionPref.features.push(f);
motion.prefectures.features=motion.prefectures.features.filter(f=>!changed.has(f.properties.adcode)).concat(motionPref.features.map(f=>({...f,properties:{adcode:f.properties.adcode}})));
motion['prefecture-boundaries']=lineData((await run('-i lines.json -simplify dp interval=200',{'lines.json':fc([{type:'Feature',properties:{},geometry:boundaries.prefecture}])})).features[0].geometry);
fs.writeFileSync(root+'china-motion.bin',gzipSync(JSON.stringify(motion),{level:9}));
const originalParts=JSON.parse(fs.readFileSync('dist/data/display-boundaries.parts.json'));
const archiveFiles=[...originalParts.parts,'display-boundaries.parts.json','china-motion.bin','china-context.bin','fill-fragments.bin','city-districts.bin','major-water.bin','additional-sources.json','boundary-corrections.json','international-border-report.json'];
const report={profile:'detail',source:'https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov/releases/tag/2025.251231.260403',version:'2025.251231.260403',sourceReleased:'2026-04-03',license:'MIT',coordinateSystem:'WGS84, numerically converted from GCJ-02',sourceCSVsha256:fs.existsSync(file)?digest(fs.readFileSync(file)):JSON.parse(fs.readFileSync(root+'source.json')).sourceCSVsha256,rawVertices:raw.reduce((s,f)=>s+count(f.geometry.coordinates),0),changedRegions:[...changed.keys()],regions:reports,displayCompressedBytes:compressed.length,displayDecodedBytes:serialized.length,expandedGeometryBytes:Buffer.byteLength(JSON.stringify(display)),originalCompressedBytes:originalParts.compressedBytes,originalDecodedBytes:originalParts.uncompressedBytes,originalCommit:'41978546b3ac68d2d1facccbdf5ee08812344883',archiveFiles:Object.fromEntries(archiveFiles.map(name=>[name,digest(fs.readFileSync('dist/data/'+name))])),method:'Finer internal prefecture boundaries, jointly simplified to 20 m per province, clipped to existing province coverage. Reviewed coastal cities, municipal districts, Jilin/Yanbian, Xinjiang, Taiwan and SARs retain their original geometry. Original province/national boundaries and city-district overlays remain unchanged. Small differences at the retained outer edge use original ownership. This is a source preview, not a claim of legal survey accuracy.',rejectedSources:[{source:'https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM2/',reason:'2017 county-level data, average 66 vertices; not an appropriate higher-detail prefecture replacement.'},{source:'https://github.com/BarbarossaWang/cn-atlas',reason:'Redistributed geometry is already quantized and simplified; reusable data permission was not established.'}]};
fs.writeFileSync(root+'source.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('archives/china-boundaries-2026-10-06/manifest.json',JSON.stringify({commit:report.originalCommit,files:report.archiveFiles,restore:'Original files remain at their existing dist/data paths. Choose Original boundaries in China Map settings or use ?china-boundaries=original#china. The original deployment is Sites version 89.'},null,2)+'\n');
console.log({changedRegions:changed.size,bytes:compressed.length,decodedBytes:serialized.length});
