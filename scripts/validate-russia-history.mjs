import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const root=path.resolve(process.env.ATLAS_ROOT||'.'),stage=path.resolve(process.env.RUSSIA_HISTORY_STAGE||root);
const locate=file=>fs.existsSync(path.join(stage,file))?path.join(stage,file):path.join(root,file);
const {decodeData,encodeGeo}=await import(pathToFileURL(path.join(root,'dist/geo-pack.mjs')));
const {packShapes,shapeAtLocation}=await import(pathToFileURL(path.join(root,'dist/historic-shapes.mjs')));
const {geographicAreaKm2}=await import(pathToFileURL(path.join(root,'scripts/geographic-area.mjs')));
const {russiaPeriods}=await import(pathToFileURL(locate('dist/russia-history.mjs')));
const {resolveSharedHistory}=await import(pathToFileURL(locate('dist/shared-history-geometry.mjs')));
const require=createRequire(path.join(root,'package.json')),mapshaper=require('mapshaper');
const load=async file=>decodeData(fs.readFileSync(locate(file)));
const data=await load('dist/data/russia/history/borders.bin'),sources=await load('dist/data/russia/history/sources.json');
assert.equal(data.sharedGeometry?.version,1,'Historical geometry consists of canonical path references');
assert(data.sharedGeometry.sharedVertices>500000,'Detailed existing geometry is actually referenced');
assert(data.sharedGeometry.localVertices<data.sharedGeometry.sharedVertices,'New points are limited to political paths and intersections');
for(const source of data.sharedGeometry.sources){assert.notEqual(source.file,'world-land.bin','Overview land cannot supply historical coast coordinates');assert.equal(createHash('sha256').update(fs.readFileSync(locate('dist/data/'+source.file))).digest('hex'),source.sha256,'Pinned canonical geometry '+source.file);}
await resolveSharedHistory(data,file=>load('dist/data/'+file));
// Exercise the same packed payload the existing map sources hand to workers,
// including unwrapped Russian America beyond 180 degrees.
const rendered=await decodeData(encodeGeo({faces:data.faces,arcs:data.arcs},{},{scale:1e6}));
data.faces=rendered.faces;data.arcs=rendered.arcs;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const years=Object.keys(data.years).map(Number);assert.deepEqual(years,russiaPeriods.map(p=>p[0]));assert.equal(years.length,39);assert.equal(years[0],882);assert.equal(years.at(-1),1991);
const shapes=packShapes(data.faces.features),config=year=>data.configs[data.years[year].config];
const at=(year,point)=>{const c=config(year),f=shapeAtLocation(shapes,{lng:point[0],lat:point[1]});return f&&c.units[c.face[f.properties.id]];};
for(const year of years){
 const c=config(year);assert(c.units.length,'Units in '+year);assert.equal(new Set(c.units.map(u=>u.id)).size,c.units.length);
 if(c.shared==='chronology'){
  assert.equal(c.face.length,data.faces.features.length);
  assert(c.face.every(i=>Number.isInteger(i)&&i>=-1&&i<c.units.length),'Valid ownership in '+year);
  for(const [i,u]of c.units.entries()){assert(c.face.includes(i),u.name+' has land');assert.equal(at(year,u.label)?.id,u.id,u.name+' interior label in '+year);}
 }else assert.fail('Every date uses the same physical partition');
 if(year>=1956){assert.equal(c.units.length,15);assert(!('regions'in c)&&!('geometry'in c),'USSR geometry is referenced, not duplicated');}
 for(const u of c.units){if(year<1988)assert(u.note);assert(u.bounds.flat().every(Number.isFinite));}
}
const checks=[
 [1237,[39.42,57.19],'main'],[1237,[30.52,50.45],'kyiv'],[1237,[31.28,58.52],'novgorod'],
 [882,[30.52,50.45],'main'],[1462,[31.28,58.52],'novgorod'],[1478,[31.28,58.52],'main'],
 [1547,[49.12,55.8],null],[1552,[49.12,55.8],'added'],[1556,[48.05,46.35],'added'],
 [1582,[68.25,58.2],'added'],[1648,[129.7,62.03],'added'],[1689,[131.89,43.12],null],
 [1721,[24.75,59.44],'added'],[1774,[34.1,44.95],null],[1783,[34.1,44.95],'added'],
 [1795,[24.94,60.17],null],[1809,[24.94,60.17],'added'],[1812,[37.6,55.75],'main'],
 [1809,[28.83,47.01],null],[1812,[28.83,47.01],'added'],[1828,[26.1,44.43],null],
 [1815,[21,52.23],'added'],[1860,[131.89,43.12],'added'],[1866,[210.1,61.2],'main'],[1867,[210.1,61.2],null],
 [1873,[64.42,39.77],'bukhara'],[1873,[60.36,41.38],'khiva'],[1922,[64.42,39.77],'bukhara'],[1922,[131.89,43.12],'main'],
 [1866,[66.96,39.65],null],[1867,[66.96,39.65],null],[1873,[66.96,39.65],'added'],
 [1936,[24.75,59.44],null],[1940,[24.75,59.44],'main'],[1945,[21,52.23],null],[1945,[20.51,54.7],'main'],
 [1866,[185,65],'main'],[1914,[185,65],'main'],[1936,[185,65],'main'],
 [1905,[143.2,51],'main'],[1905,[142.73,46.96],null],[1936,[142.73,46.96],null],[1945,[142.73,46.96],'main']
];
for(const [year,point,id]of checks)assert.equal(at(year,point)?.id??null,id,'Historical ownership '+year+' '+point);
assert.equal(config(1873).units.find(u=>u.id==='bukhara').type,'Protectorate');assert.equal(config(1922).units.find(u=>u.id==='bukhara').type,'Allied Soviet republic');
const total=data.faces.features.reduce((sum,f)=>sum+geographicAreaKm2(f.geometry),0);
const merged=await mapshaper.applyCommands('-i in.json -dissolve2 -o out.json format=geojson geojson-type=FeatureCollection',{'in.json':JSON.stringify(data.faces)});
const union=JSON.parse(merged['out.json']).features.reduce((sum,f)=>sum+geographicAreaKm2(f.geometry),0);
assert(Math.abs(total-union)/total<1e-6,'Chronology cells do not overlap');
for(const {properties:p}of data.arcs.features){assert(p.l>=0&&p.l<data.faces.features.length);assert(p.r===-1||p.r>=0&&p.r<data.faces.features.length);assert.notEqual(p.l,p.r,'No self-border');}
assert.equal(data.external.soviet.file,'data/europe/soviet-union-1988/first.bin');
const soviet=await load('dist/data/europe/soviet-union-1988/first.bin'),sovietShapes=packShapes(soviet.regions.features);
for(const [name,point,id]of [['Crimea',[34.1,44.95],'SU-UA'],['Kaliningrad',[20.5,54.7],'SU-RU'],['Baikonur',[63.31,45.62],'SU-KZ'],['Chukotka',[185,65],'SU-RU']])assert.equal(shapeAtLocation(sovietShapes,{lng:point[0],lat:point[1]})?.properties.id,id,name+' retains existing republic ownership');
for(const [name,point,id]of [['Crimea',[34.1,44.95],'SU-UA'],['Kaliningrad',[20.5,54.7],'SU-RU'],['Baikonur',[63.31,45.62],'SU-KZ'],['Chukotka',[185,65],'SU-RU']])assert.equal(at(1988,point)?.id,id,name+' resolved ownership matches the original republic');
const late=config(1988).units;assert.equal(late.reduce((sum,u)=>sum+u.population,0),286730817);
assert.equal(late.find(u=>u.id==='SU-KZ').capital,'Alma-Ata');assert.equal(late.find(u=>u.id==='SU-KG').capital,'Frunze');assert.equal(config(1991).units.find(u=>u.id==='SU-KG').capital,'Bishkek');
for(const u of late)assert.equal(hash(fs.readFileSync(locate('dist/'+u.flag.file))),u.flag.sha256,u.id+' original flag');
assert(config(1991).units.every(u=>u.kind==='independent'&&u.type==='Independent state'));
assert.equal(config(1991).units.find(u=>u.id==='SU-UA').name,'Ukraine');
assert.equal(hash(fs.readFileSync(locate(sources.sources[0].retained))),sources.sources[0].sha256,'Retained source hash');
assert.equal(hash(fs.readFileSync(locate('dist/data/europe/soviet-union-1988/first.bin'))),sources.sources.find(s=>s.title.startsWith('Existing MSU')).sha256,'Existing Soviet geometry hash');
const requiredSources=new Set(data.sharedGeometry.arcs.flatMap(a=>a.runs.flatMap(r=>r.ref?[r.ref[0]]:[])));
const referencedBytes=[...requiredSources].reduce((sum,i)=>sum+fs.statSync(locate('dist/data/'+data.sharedGeometry.sources[i].file)).size,0);
assert(fs.statSync(locate('dist/data/russia/history/borders.bin')).size<referencedBytes/3,'The chronology references existing land instead of storing another copy');
const adapter=fs.readFileSync(locate('dist/historic-source-swap.mjs'),'utf8');assert(!/map\.add(?:Layer|Source)\s*\(/.test(adapter),'In-place snapshot introduces zero map layers or sources');
// Compare physical shores themselves, including water holes and detached
// islands. Redundant collinear vertices may dissolve without moving a path.
const {topology}=require('topojson-server'),{merge}=require('topojson-client');
const {lineIndex,polygons}=await import(pathToFileURL(path.join(root,'scripts/geo-index.mjs')));
const key=([x,y])=>Math.round(x*1e7)+','+Math.round(y*1e7);
let shorelineVertices=0;
for(const [name,file,box,filter,shift=0]of [
 ['Sakhalin and Amur estuary','russia/first.bin',[139.5,50.3,144.8,54.6]],
 ['Kamchatka','russia/first.bin',[156,51,164,60]],
 ['Chukotka','russia/first.bin',[179,64,190,70]],
 ['Crimea and Sivash','europe/ukraine/first.bin',[32.4,44.3,36.9,46.1]],
 ['Finnish archipelago','europe/finland/first.bin',[19.5,59.4,25.5,61]],
 ['Curonian Lagoon','europe/lithuania/first.bin',[20.9,55.3,21.4,55.8]],
 ['Alaska','europe/united-states/first.bin',[194,54,224,72],'US-AK',360]
]){
 const modern=await load('dist/data/'+file),features=(modern.regions||modern.first||modern).features.filter(f=>!filter||f.properties.id===filter),[w,s,e,n]=box;
 const inside=([x,y])=>x>w&&x<e&&y>s&&y<n;
 const modernTopology=topology({land:{type:'FeatureCollection',features}}),land=merge(modernTopology,modernTopology.objects.land.geometries);
 const expected=new Set(polygons(land).flat(2).map(p=>shift?[p[0]+shift,p[1]]:p).filter(inside).map(key));
 const coast=data.arcs.features.filter(({properties:{r}})=>r<0),points=new Set(coast.flatMap(f=>f.geometry.coordinates.filter(inside).map(key)));
 const missing=[...expected].filter(k=>!points.has(k));
 if(name==='Sakhalin and Amur estuary'){
  assert.equal(missing.length,0,'Every original Sakhalin shore coordinate is reused');
  for(const year of [1866,1905,1914,1936,1945,1988,1991]){
   const c=config(year),active=new Set(coast.filter(f=>c.face[f.properties.l]>=0).flatMap(f=>f.geometry.coordinates.filter(inside).map(key)));
   assert([...expected].every(k=>active.has(k)),'Sakhalin stays on the same exact physical shore in '+year);
  }
 }else if(missing.length){
  const segments=coast.flatMap(f=>f.geometry.coordinates.slice(1).flatMap((b,i)=>{const a=f.geometry.coordinates[i];return inside(a)||inside(b)?[[a,b]]:[];})),distance=lineIndex(segments);
  assert(missing.every(k=>distance(k.split(',').map(v=>+v/1e7))<.001),name+' has no displaced shoreline');
 }
 shorelineVertices+=expected.size;
}
console.log('Canonical physical shores: '+shorelineVertices+' vertices checked across seven regions; exact Sakhalin geometry retained in imperial and Soviet dates.');
console.log('Russia history: 39 milestones, '+checks.length+' territorial probes, non-overlapping shared topology, original USSR geometry/flags/census, independent 1991 states and zero added map layers passed.');
