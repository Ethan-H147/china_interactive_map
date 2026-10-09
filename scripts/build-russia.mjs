import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import sharp from 'sharp';
import osmtogeojson from 'osmtogeojson';
import {topology} from 'topojson-server';
import {merge,mesh,feature} from 'topojson-client';
import {readData} from './read-data.mjs';
import {alignCountry} from './international-topology.mjs';
import {divisionBorders} from './south-america-borders.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {sourceNames} from './russia-names.mjs';

const source=path.resolve(process.argv[2]||'artifacts/russia-source'),out='dist/data/russia';
fs.mkdirSync(out+'/second',{recursive:true});fs.mkdirSync('dist/vendor/russia-flags',{recursive:true});
const fc=features=>({type:'FeatureCollection',features});
const read=name=>JSON.parse(fs.readFileSync(path.join(source,name),'utf8'));
const metadata=JSON.parse(fs.readFileSync('scripts/statistics-sources/russia/region-tables.json','utf8')).values;
const write=(name,data)=>{const bytes=gzipSync(JSON.stringify(data),{level:9});fs.writeFileSync(out+'/'+name,bytes);return bytes.length;};
async function command(data,commands,files={}){
 const result=JSON.parse((await mapshaper.applyCommands('-i input.json '+commands+' -o result.json format=geojson precision=.000001',{'input.json':JSON.stringify(data),...files}))['result.json']);
 return result.type==='FeatureCollection'?result:result.type==='Feature'?fc([result]):fc((result.type==='GeometryCollection'?result.geometries:[result]).map(geometry=>({type:'Feature',properties:{},geometry})));
}
function unwrap(g){const walk=c=>{if(typeof c[0]==='number'){if(c[0]<0)c[0]+=360;}else c.forEach(walk);};walk(g.coordinates);return g;}
function bounds(g){const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};walk(g.coordinates);return [[b[0],b[1]],[b[2],b[3]]];}
const original=level=>{const t=read('adm'+level+'.topojson');return feature(t,Object.values(t.objects)[0]);};
let first=fc(original(1).features.map(f=>{const m=metadata[f.properties.shapeISO];assert(m);return {...f,properties:{id:m.id},geometry:unwrap(f.geometry)};}));
first=await command(first,'-clean gap-width=0 -simplify dp interval=.0006 planar keep-shapes');
console.log('Russia first level prepared',first.features.length);
const china=readData('display-boundaries.json');
const ct=topology({regions:china.provinces});
const cn={type:'Feature',properties:{},geometry:merge(ct,ct.objects.regions.geometries)};
const mn=JSON.parse(gunzipSync(fs.readFileSync('dist/data/mongolia-outline.bin'))).features[0];
const kp=JSON.parse(gunzipSync(fs.readFileSync('dist/data/korea-outline.bin'))).features.find(f=>f.properties.country==='KP');
const corridor=(w,s,e,n)=>(a,b)=>[a,b].every(p=>p[0]>=w&&p[0]<=e&&p[1]>=s&&p[1]<=n);
const neighbors=[['china',cn,corridor(73,41,136,55)],['mongolia',mn,corridor(86,46,121,54)],['north-korea',kp,corridor(130.585,42.29,130.705,42.429)]];
const reports={};
for(const [name,reference,allowed] of neighbors){const result=alignCountry(first.features,reference,allowed,2500);first=fc(result.features);reports[name]=result.report;console.log('Aligned',name,result.report);}
first=await command(first,'-clean gap-width=0 snap-interval=.0000001 overlap-rule=min-area');
// Widen alignment only on enclosed seams touching Russia and a neighbor.
// The source snapshots disagree more around the tripoint and border lakes.
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const vertexKey=p=>p.map(v=>v.toFixed(6)).join(',');
const vertices=features=>new Set(features.flatMap(f=>polygons(f.geometry).flat(2).map(vertexKey)));
const united=await command(fc([...first.features,...neighbors.map(n=>n[1])]),'-dissolve');
const russianKeys=vertices(first.features);
for(const [name,reference,allowed] of neighbors){
 const referenceKeys=vertices([reference]);
 const gaps=united.features.flatMap(f=>polygons(f.geometry).flatMap(poly=>poly.slice(1))).filter(r=>r.every(p=>p[0]>=73&&p[0]<=136&&p[1]>=41&&p[1]<=55)&&r.some(p=>russianKeys.has(vertexKey(p)))&&r.some(p=>referenceKeys.has(vertexKey(p))));
 const gapKeys=new Set(gaps.flatMap(r=>r.map(vertexKey)));
 const repair=alignCountry(first.features,reference,allowed,name==='north-korea'?2500:15000,(a,b)=>gapKeys.has(vertexKey(a))&&gapKeys.has(vertexKey(b))&&(name!=='north-korea'||allowed(a,b)));
 first=fc(repair.features);reports[name].enclosedSeamRepair={gaps:gaps.length,...repair.report};console.log('Repaired enclosed seams',name,repair.report);
}
first=await command(first,'-clean gap-width=0 snap-interval=.0000001 overlap-rule=min-area');
// Erase reference land to eliminate small overlap left by independent source
// coast and island components; neighboring countries retain their geometry.
for(const [name,reference] of neighbors)first=await command(first,'-erase reference.json',{'reference.json':fc([reference])});
assert.equal(first.features.length,83);
const centers=await command(first,'-points inner');
const records=first.features.map((f,i)=>{const m=metadata[f.properties.id];return {id:m.id,en:m.en,local:m.local,kind:m.kind,level:1,aliases:[m.code,m.id,m.capital],capital:m.capital,center:centers.features[i].geometry.coordinates,bounds:bounds(f.geometry)};});
const byId=new Map(records.map(r=>[r.id,r]));
let second=fc(original(2).features.filter(f=>f.geometry).map(f=>({...f,properties:{id:'RU-D-'+f.properties.shapeID.replace('50074027B',''),...sourceNames(f.properties.shapeName)},geometry:unwrap(f.geometry)})));
second=await command(second,'-clean gap-width=0 -simplify dp interval=.00045 planar keep-shapes');
const points=await command(second,'-points inner');
const joinSource=fc(first.features.map(f=>({...f,properties:{parent:f.properties.id}})));
const assigned=await command(second,'-join parents.json fields=parent largest-overlap',{'parents.json':joinSource});
const unresolved=[];
for(let i=0;i<second.features.length;i++){const f=second.features[i];f.properties.parent=assigned.features[i].properties.parent;if(!f.properties.parent)unresolved.push(f.properties);}
console.log('Unassigned districts',unresolved.slice(0,10),unresolved.length);
assert.equal(unresolved.length,0,'Every district must have an unambiguous region owner');
// Federal cities have a separate administrative hierarchy, absent from the
// national 2017 district extract. Use their OSM administrative level 5 areas.
const cityData=osmtogeojson({elements:[...read('federal-cities-osm.json').elements,...read('zelenograd-osm.json').elements]},{flatProperties:false});
const cityFeatures=cityData.features.filter(f=>f.properties.type==='relation'&&f.properties.tags?.admin_level==='5').map(f=>{const tags=f.properties.tags,parent=tags.name.includes('административный округ')?'RU-MOW':'RU-SPE';return {...f,properties:{id:'RU-OSM-'+f.properties.id,en:tags['name:en']||tags.name,local:tags.name,parent,kind:parent==='RU-MOW'?'Administrative okrug':'District'},geometry:unwrap(f.geometry)};});
assert.equal(cityFeatures.filter(f=>f.properties.parent==='RU-MOW').length,12);
assert.equal(cityFeatures.filter(f=>f.properties.parent==='RU-SPE').length,18);
second.features.push(...cityFeatures);
const chunks={};
for(const parent of records.slice()){
 const children=second.features.filter(f=>f.properties.parent===parent.id);if(!children.length)continue;
 const mask=fc(first.features.filter(f=>f.properties.id===parent.id));
 const clipped=await command(fc(children),'-clip parent.json -clean gap-width=0',{'parent.json':mask});
 const points=await command(clipped,'-points inner');
 for(let i=0;i<clipped.features.length;i++){const f=clipped.features[i];records.push({id:f.properties.id,en:f.properties.en,local:f.properties.local||'',parent:parent.id,parentName:parent.en,level:2,kind:f.properties.kind||(/City|Urban|Okrug/i.test(f.properties.en)?'City / urban district':'District'),bounds:bounds(f.geometry),center:points.features[i].geometry.coordinates});}
 const borders=divisionBorders(clipped);for(const f of borders.features)f.properties={owners:f.properties.regionIds};
 const payload={regions:clipped,boundaries:borders},file='second/'+parent.id+'.bin';
 chunks[parent.id]={file,count:clipped.features.length,bytes:write(file,payload),decodedBytes:Buffer.byteLength(JSON.stringify(payload))};
 console.log(parent.id,chunks[parent.id].count,chunks[parent.id].bytes);
}
const borders=divisionBorders(first);for(const f of borders.features)f.properties={owners:f.properties.regionIds};
write('first.bin',{regions:first,boundaries:borders});
write('catalogue.bin',{records,chunks});
 const silhouette=await command(first,'-dissolve');
// A small overview keeps first-level and district downloads out of startup.
// Preserve the complete neighboring land borders; simplify only other coasts.
function overviewPath(r){
 const fixed=p=>p[0]>=73&&p[0]<=136&&p[1]>=41&&p[1]<=55;
 const anchors=new Set([0,Math.floor((r.length-1)/2),r.length-1]);r.forEach((p,i)=>{if(fixed(p))anchors.add(i);});
 const keep=new Set(anchors),indices=[...anchors].sort((a,b)=>a-b);
 const stack=indices.slice(1).map((j,i)=>[indices[i],j]);
 while(stack.length){const [a,b]=stack.pop();let max=.015*.015,at=-1,dx=r[b][0]-r[a][0],dy=r[b][1]-r[a][1];for(let j=a+1;j<b;j++){const t=Math.max(0,Math.min(1,((r[j][0]-r[a][0])*dx+(r[j][1]-r[a][1])*dy)/(dx*dx+dy*dy||1))),d=(r[j][0]-r[a][0]-t*dx)**2+(r[j][1]-r[a][1]-t*dy)**2;if(d>max){max=d;at=j;}}if(at>=0){keep.add(at);stack.push([a,at],[at,b]);}}
 const result=r.filter((_,i)=>keep.has(i));return result.length>=4?result:r;
}
const context=structuredClone(silhouette);for(const f of context.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys)for(let i=0;i<poly.length;i++)poly[i]=overviewPath(poly[i]);}
write('context.bin',context);
// Only matched, inland exterior stretches appear in the international layer.
// Reuse the same vertices and zoom simplification as existing shared borders.
const rings=g=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).flat();
const pointKey=p=>p.map(v=>v.toFixed(6)).join(',');
const shared=[];
for(const [name,reference,allowed] of neighbors){
 const segments=rings(reference.geometry).flatMap(r=>r.slice(1).map((b,i)=>[r[i],b])).filter(([a,b])=>allowed(a,b));
 const cell=.2,grid=new Map();
 for(const [a,b] of segments)for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([a,b]);}
 const near=p=>(grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]).some(([a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<.000004;});
 const paths=[];let km=0;
 for(const f of silhouette.features)for(const r of rings(f.geometry)){let run=[];const flush=()=>{if(run.length>1)paths.push(run);run=[];};for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(allowed(a,b)&&near(a)&&near(mid)&&near(b)){if(!run.length)run.push(a);run.push(b);km+=Math.hypot((a[0]-b[0])*Math.cos(mid[1]*Math.PI/180),a[1]-b[1])*111.195;}else flush();}flush();}
 shared.push({type:'Feature',properties:{neighbor:name},geometry:{type:'MultiLineString',coordinates:paths}});reports[name].sharedKilometres=km;console.log('Shared border',name,km);
}
write('international.bin',lineData(fc(shared)));
const flags={};
for(const [id,m] of Object.entries(metadata)){
 const sourceFile=path.join(source,'flags',id+(fs.existsSync(path.join(source,'flags',id+'.svg'))?'.svg':'.png'));
 const file='vendor/russia-flags/'+id+'.webp';await sharp(sourceFile).resize({width:240}).webp({lossless:true}).toFile('dist/'+file);
 flags[id]={file,page:'https://commons.wikimedia.org/wiki/File:'+new URL(m.flagURL).pathname.split('/').at(-1),source:m.flagURL,credit:'Official regional flag · Wikimedia Commons',license:'Public domain (official Russian symbols, PD-RU-exempt)',sha256:createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex')};
}
fs.copyFileSync(path.join(source,'flags/ru.svg'),'dist/vendor/flag-ru.svg');
fs.writeFileSync('dist/russia-flags.mjs','export const russiaFlags='+JSON.stringify(flags)+';\n');
fs.writeFileSync(out+'/sources.json',JSON.stringify({retrieved:'2026-10-08',boundaries:{provider:'geoBoundaries / OpenStreetMap / Wambacher',source:'https://www.geoboundaries.org/api/current/gbOpen/RUS/',version:'9469f09',boundaryYear:2017,license:'ODbL 1.0',licenseURL:'https://www.openstreetmap.org/copyright',counts:{first:83,second:records.filter(r=>r.level===2).length},sha256:Object.fromEntries(['adm1.topojson','adm2.topojson'].map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join(source,n))).digest('hex')]))},coverage:'83 federal subjects in the source’s internationally recognized Russia coverage. The 2017 district snapshot includes districts and urban jurisdictions and does not guarantee later municipal reforms. Crimea and other Russian territorial claims in Ukraine are outside this Russia layer. The source topology contains 2,327 second-level geometries; API metadata lists 2,328. Only actual geometries are displayed. Moscow’s 12 administrative okrugs and Saint Petersburg’s 18 districts supplement the national source using OpenStreetMap boundaries retrieved in October 2026.',processing:'Shared topology, 0.0006° first-level / 0.00045° second-level shared simplification (less than 70 m north-south). Districts assigned by greatest polygon overlap, clipped to their aligned parent. Russia’s mainland border follows the existing China, Mongolia and North Korea reference edges within 2.5 km; only narrow inland border corridors are adjusted. Enclosed seams touching both countries use a separate, seam-only repair within 15 km (2.5 km at North Korea); unrelated coasts remain unchanged. Coastlines are unoutlined. District geometry loads for one region at a time. Cyrillic-only source titles retain native labels with Latin transliterations and translated administrative terms. Longitudes across the date line are unwrapped eastward to preserve Chukotka.',nationalFlag:{source:'https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg',license:'Public domain (official Russian symbols, PD-RU-exempt)',aspectRatio:'3:2'},federalCities:{source:'https://www.openstreetmap.org/',retrieved:'2026-10-08',levels:{'RU-MOW':12,'RU-SPE':18},license:'ODbL 1.0'},borders:reports,flags},null,2)+'\n');
console.log('Russia complete',records.filter(r=>r.level===1).length,records.filter(r=>r.level===2).length);


