import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {merge} from 'topojson-client';
import mapshaper from 'mapshaper';
import {readData} from './read-data.mjs';
import {polygons} from './international-topology.mjs';
const data=JSON.parse(gunzipSync(fs.readFileSync('dist/data/mongolia-boundaries.bin'))),report=JSON.parse(fs.readFileSync('dist/data/mongolia-sources.json'));
const raw=JSON.parse(fs.readFileSync('scripts/mongolia-sources/nso-original-soum.geojson'));
const population=JSON.parse(fs.readFileSync('dist/data/province-population.json'));
assert.equal(data.first.features.length,22);assert.equal(data.second.features.length,339);
assert.equal(data.second.features.filter(f=>f.properties.parent==='MN-11').length,9);
assert.equal(new Set(data.first.features.map(f=>f.properties.iso)).size,22);
for(const f of [...data.first.features,...data.second.features]){
 assert.equal(f.properties.country,'MN');assert(f.properties.en&&f.properties.mn);
 assert(f.properties.bounds&&f.properties.center);
 for(const p of polygons(f.geometry))for(const r of p){assert(r.length>=4);assert.deepEqual(r[0],r.at(-1));assert(r.every(p=>p.length===2&&p.every(Number.isFinite)));}
 if(f.properties.level===1){const record=population.mongolia[f.properties.iso];assert(record);assert.equal(f.properties.traditional,record.traditional);}
 else assert(data.first.features.some(p=>p.properties.id===f.properties.parent));
}
assert.deepEqual(JSON.parse(gunzipSync(fs.readFileSync('dist/data/mongolia-outline.bin'))),data.countries);
const st=topology({r:data.second});
assert.deepEqual(merge(st,st.objects.r.geometries),data.countries.features[0].geometry,'Country derives from the same subdivisions');
const cn=readData('display-boundaries.json'),ct=topology({r:cn.subdivisions});
const canonical=merge(ct,ct.objects.r.geometries),ring=polygons(canonical).sort((a,b)=>b[0].length-a[0].length)[0][0];
const grid=new Map(),cell=.1;
for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];for(let x=Math.floor(Math.min(a[0],b[0])/cell)-2;x<=Math.floor(Math.max(a[0],b[0])/cell)+2;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-2;y<=Math.floor(Math.max(a[1],b[1])/cell)+2;y++){const k=x+','+y;if(!grid.has(k))grid.set(k,[]);grid.get(k).push([a,b]);}}
const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
function nearest(p){let best=Infinity;for(const [a,b] of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])]));}return best;}
let sharedKm=0,sharedSegments=0,transitionEdges=0,maxSharedDistanceMetres=0;
for(const poly of polygons(data.countries.features[0].geometry))for(const r of poly)for(let i=1;i<r.length;i++){
 const a=r[i-1],b=r[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],distance=nearest(mid);
 if(distance<=.002){sharedKm+=metres(a,b)/1000;sharedSegments++;maxSharedDistanceMetres=Math.max(maxSharedDistanceMetres,distance);}
 else if(distance<2500){assert(mid[1]>48.9&&(mid[0]<88||mid[0]>116.5&&mid[0]<117),'No unmatched parallel border outside the Russian tripoint transitions');transitionEdges++;}
}
assert(sharedKm>4400);assert(transitionEdges<=2);
const currentPoints=new Map();for(const p of polygons(data.countries.features[0].geometry).flat(2)){const k=p.map(n=>n.toFixed(7)).join(',');if(!currentPoints.has(k))currentPoints.set(k,[]);currentPoints.get(k).push(p);}
const sourceTop=topology({r:raw}),sourceCountry=merge(sourceTop,sourceTop.objects.r.geometries);
let remoteRussianVertices=0,maxRemoteRussianDisplacementMetres=0;
const sourceExterior=polygons(sourceCountry).sort((a,b)=>b[0].length-a[0].length)[0][0];
for(const p of sourceExterior)if(nearest(p)>10000){
 const candidates=currentPoints.get(p.map(n=>n.toFixed(7)).join(','));assert(candidates,'Remote Russian boundary vertex remains present: '+p.join(','));
 maxRemoteRussianDisplacementMetres=Math.max(maxRemoteRussianDisplacementMetres,Math.min(...candidates.map(q=>metres(p,q))));remoteRussianVertices++;
}
assert(maxRemoteRussianDisplacementMetres<.002);
for(const [file,sha] of Object.entries(report.sha256))assert.equal(createHash('sha256').update(fs.readFileSync('scripts/mongolia-sources/'+file)).digest('hex'),sha);
const license=JSON.parse(fs.readFileSync('scripts/mongolia-sources/hdx-license.json')).result;assert.equal(license.license_id,'cc-by-igo');
const process=async(command,files)=>JSON.parse((await mapshaper.applyCommands(command+' -o out.json format=geojson geojson-type=FeatureCollection',structuredClone(files)))['out.json']);
for(const f of data.first.features){
 const children={type:'FeatureCollection',features:data.second.features.filter(c=>c.properties.parent===f.properties.id)};
 const difference=await process('-i children.json -erase parent.json',{'children.json':children,'parent.json':f});assert.equal(difference.features.length,0,'All children contained in their province');
}
const result={first:22,second:339,soums:330,ulaanbaatarDistricts:9,sharedKm,sharedSegments,maxSharedDistanceMetres,unmatchedParallelBorderEdges:0,russianTripointTransitionEdges:transitionEdges,remoteRussianVertices,maxRemoteRussianDisplacementMetres};
const borderPath='dist/data/mongolia-border-report.json',border=JSON.parse(fs.readFileSync(borderPath));border.validation=result;fs.writeFileSync(borderPath,JSON.stringify(border,null,2)+'\n');
console.log(result);
