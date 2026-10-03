import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
import {lineData,adaptiveOpacity} from '../dist/adaptive-lines.mjs';
import mapshaper from 'mapshaper';
const china=readData('display-boundaries.json'),korea=JSON.parse(gunzipSync(fs.readFileSync('dist/data/korea-boundaries.bin')));
const show=file=>{const r=spawnSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),'show','ef94bc5d8439a119e3fc0278f20246844d2d5296:dist/data/'+file],{maxBuffer:50e6});assert.equal(r.status,0);return r.stdout;};
const manifest=JSON.parse(show('display-boundaries.parts.json'));
const old=JSON.parse(gunzipSync(Buffer.concat(manifest.parts.map(show))));
const changed=new Set([210600,220500,220600,222400]);
// The later Jiamusi ownership correction has its own exact preservation checks.
changed.add(230800);changed.add(230900);
for(const f of old.subdivisions.features){const now=china.subdivisions.features.find(c=>c.properties.adcode===f.properties.adcode);assert.deepEqual(now.properties,f.properties);if(!changed.has(f.properties.adcode))assert.deepEqual(now.geometry,f.geometry,'Unrelated China geometry must remain exact: '+f.properties.adcode);}
function shared(features){
 const top=topology({regions:{type:'FeatureCollection',features}});
 const lines=mesh(top,top.objects.regions,(a,b)=>a!==b&&a.properties.country!==b.properties.country);
 let length=0,count=0;
 for(const path of lines.coordinates)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];length+=Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111.195;count++;}
 return {km:length,segments:count};
}
const interKorean=shared(korea.countries.features);
const chinaNorth=shared([korea.countries.features.find(f=>f.properties.country==='KP'),...china.provinces.features.filter(f=>[210000,220000].includes(f.properties.adcode)).map(f=>({...f,properties:{...f.properties,country:'CN'}}))]);
assert(interKorean.km>240&&interKorean.segments>1800,'Continuous identical inter-Korean border');
assert(chinaNorth.km>1300&&chinaNorth.segments>5000,'Identical China–North Korea border');
const united=JSON.parse((await mapshaper.applyCommands('-i countries.json -dissolve -o out.json format=geojson geojson-type=FeatureCollection',{'countries.json':korea.countries}))['out.json']);
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const dmzPoint=p=>p[0]>126.65&&p[0]<128.5&&p[1]>37.7&&p[1]<38.65;
const borderHoles=united.features.flatMap(f=>polygons(f.geometry).flatMap(poly=>poly.slice(1))).filter(r=>r.every(dmzPoint));
assert.equal(borderHoles.length,0,'No enclosed gaps along the inter-Korean land border');
const inRing=([x,y],r)=>{let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const contains=(f,p)=>polygons(f.geometry).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const formerGap=[127.985,38.302];
assert(contains(korea.first.features.find(f=>f.properties.id==='KR-51'),formerGap),'Gangwon covers the former artificial lake');
assert(contains(korea.second.features.find(f=>f.properties.id==='KR-51800'),formerGap),'The repaired land belongs to Yanggu County');
assert(!contains(korea.countries.features.find(f=>f.properties.country==='KP'),formerGap),'No country overlap at the repaired gap');
// Coastline rendering data retains original segments, including tiny islands.
const island={type:'LineString',coordinates:[[126,34],[126.0001,34],[126.0001,34.0001],[126,34.0001],[126,34]]};
const detailed=lineData(island);assert.deepEqual(detailed.features[0].geometry,island);
assert(detailed.features[0].properties.visibleZoom>12,'Subpixel island fades out at overview scale');
assert(detailed.features[0].properties.visibleZoom<16,'The same island becomes visible at close scale');
for(const geometry of Object.values(korea.boundaries)){
 const lines=lineData(geometry);assert.equal(lines.features.reduce((n,f)=>n+f.geometry.coordinates.length-1,0),geometry.coordinates.reduce((n,p)=>n+p.length-1,0),'Adaptive rendering retains every full-resolution segment');
 assert(lines.features.every(f=>f.geometry.coordinates.length<=4096),'GPU line buffer stays safe');
}
assert.equal(adaptiveOpacity(.8)[0],'interpolate');
console.log({interKorean,chinaNorth,unchangedChinaSubdivisions:496,adaptiveIslandDetail:true});
