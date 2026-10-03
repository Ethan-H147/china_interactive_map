import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {chongmingWindow} from './chongming-overlay.mjs';
const show=name=>{const r=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show','993fa80bf7fb149e74ba8448888470d3354dbb6d:dist/data/'+name],{maxBuffer:40e6});assert.equal(r.status,0,r.stderr.toString());return r.stdout;};
const manifest=JSON.parse(show('display-boundaries.parts.json'));
const previous=JSON.parse(gunzipSync(Buffer.concat(manifest.parts.map(show))));
const current=readData('display-boundaries.json');
const island=readData('chongming-island.json'),bank=readData('chongming-north-bank.json');
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
const area=g=>polygons(g).reduce((s,p)=>s+p.reduce((t,r,i)=>t+(i?-1:1)*Math.abs(r.slice(1).reduce((a,c,j)=>a+(r[j][0]-r[0][0])*(c[1]-r[0][1])-(c[0]-r[0][0])*(r[j][1]-r[0][1]),0)/2),0),0);
const key=p=>JSON.stringify(p);
function edges(g){const values=[];for(const poly of polygons(g))for(const ring of poly)for(let i=1;i<ring.length;i++){const a=key(ring[i-1]),b=key(ring[i]);if(a!==b)values.push(a<b?a+'|'+b:b+'|'+a);}return createHash('sha256').update(values.sort().join('\n')).digest('hex');}
function inRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const contains=(f,p)=>polygons(f.geometry).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const owners=(data,p)=>data.subdivisions.features.filter(f=>contains(f,p)).map(f=>f.properties.adcode);
let unchanged=0;
assert.equal(current.subdivisions.features.length,previous.subdivisions.features.length);
// Macau's eight shared parish/area polygons received a later numerical seam
// repair, independently checked against the government export in validate-sar.
const subsequentlyRepaired=[820001,820002,820003,820004,820005,820006,820007,820008];
for(const f of previous.subdivisions.features){const now=current.subdivisions.features.find(c=>c.properties.adcode===f.properties.adcode);assert(now);assert.deepEqual(now.properties,f.properties);if(![310151,320600,...subsequentlyRepaired].includes(f.properties.adcode)){assert.equal(edges(now.geometry),edges(f.geometry),'Unrelated subdivision changed: '+f.properties.adcode);unchanged++;}}
assert.equal(unchanged,492);
const selected=current.subdivisions.features.filter(f=>[310151,320600].includes(f.properties.adcode));
const vertexSet=new Set(selected.flatMap(f=>polygons(f.geometry).flatMap(p=>p.flatMap(r=>r.map(key)))));
assert.equal(island.properties.osmRelation,'3292765');
assert.equal(island.geometry.coordinates[0].length,3685);
for(const p of island.geometry.coordinates[0])assert(vertexSet.has(key(p)),'Detailed island vertex lost');
const [w,s,e,n]=chongmingWindow;
const bankPoints=bank.geometry.coordinates.filter(p=>p[0]>w&&p[0]<e&&p[1]>s&&p[1]<n);
for(const p of bankPoints)assert(vertexSet.has(key(p)),'Detailed north bank vertex lost');
const clip=async(command,files)=>{const result=JSON.parse((await mapshaper.applyCommands(command+' -o output.json format=geojson',files))['output.json']);if(result.features)return result.features;assert.equal(result.type,'GeometryCollection');assert.equal(result.geometries.length,0);return [];};
const islandCoverage=await clip('-i selected.json -clip island.json',{'selected.json':{type:'FeatureCollection',features:selected},'island.json':island});
assert(Math.abs(islandCoverage.reduce((t,f)=>t+area(f.geometry),0)-area(island.geometry))<1e-12,'Island coverage is incomplete or overlapping');
const oldN=previous.subdivisions.features.find(f=>f.properties.adcode===320600),newN=selected.find(f=>f.properties.adcode===320600);
const extent={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}};
for(const [a,b] of [[oldN,newN],[newN,oldN]]){const difference=await clip('-i a.json -erase b.json -erase extent.json',{'a.json':a,'b.json':b,'extent.json':extent});assert(difference.reduce((t,f)=>t+area(f.geometry),0)<1e-12,'Nantong changed outside the coastal window');}
const oldC=previous.subdivisions.features.find(f=>f.properties.adcode===310151),newC=selected.find(f=>f.properties.adcode===310151);
const otherParts=f=>({type:'MultiPolygon',coordinates:polygons(f.geometry).filter(p=>!p[0].some(c=>c[1]>31.6))});
assert.equal(edges(otherParts(oldC)),edges(otherParts(newC)),'Chongming’s other islands changed');
const water=[[121.70,31.71],[121.85,31.68],[121.70,31.70],[121.93,31.69],[121.90,31.66]];
for(const p of water){assert.deepEqual(owners(previous,p),[320600],'Regression point did not reproduce old land bridge');assert.deepEqual(owners(current,p),[],'North Branch is still filled as land');}
for(const p of [[121.30,31.85],[121.50,31.73],[121.70,31.64],[121.40,31.72]])assert.deepEqual(owners(current,p),[310151],'Shanghai island land missing');
// Preserve Jiangsu land and the complete existing administrative split wherever
// both old jurisdictions and the detailed physical island cover the point.
let jiangsuLand=0,shanghaiLand=0;
for(let x=121.17;x<122.01;x+=0.005)for(let y=31.44;y<31.88;y+=0.005){const p=[x,y];if(!contains(island,p))continue;const before=[oldC,oldN].filter(f=>contains(f,p)).map(f=>f.properties.adcode);if(before.length!==1)continue;assert.deepEqual(selected.filter(f=>contains(f,p)).map(f=>f.properties.adcode),before,'Administrative island ownership changed');if(before[0]===320600)jiangsuLand++;else shanghaiLand++;}
assert(jiangsuLand>50&&shanghaiLand>1000);
const sources=readData('additional-sources.json').sources;
for(const name of ['chongming-island.json','chongming-north-bank.json']){const source=sources.find(s=>s.sourceFile===name);assert(source&&source.license==='ODbL 1.0');assert.equal(source.sha256,createHash('sha256').update(fs.readFileSync('dist/data/'+name)).digest('hex'));}
console.log(JSON.stringify({unchangedSubdivisions:unchanged,islandVertices:3685,northBankVerticesRetained:bankPoints.length,waterPoints:water.length,jiangsuLandSamples:jiangsuLand,shanghaiLandSamples:shanghaiLand}));
