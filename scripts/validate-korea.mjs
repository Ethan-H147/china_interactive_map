import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/korea-boundaries.bin',import.meta.url))));
const all=[...data.first.features,...data.second.features],byId=new Map(all.map(f=>[f.properties.id,f]));
const hanja=JSON.parse(fs.readFileSync(new URL('../dist/data/korea-hanja.json',import.meta.url)));
for(const f of all){const p=f.properties,entry=hanja.names[p.id];if(entry){assert.equal(p.ko,entry.ko);assert.equal(p.hanja,entry.hanja);assert.equal(p.hanjaSource,entry.url);assert(/^[\p{Script=Han}\s]+$/u.test(p.hanja),'Hanja script '+p.en);}else{assert(hanja.omitted[p.id],'Explicit omission '+p.en);assert(!p.hanja,'No invented Hanja '+p.en);}}
assert.equal(all.filter(f=>f.properties.hanja).length,455);
assert(!byId.get('KR-11').properties.hanja,'Seoul must not be assigned a Chinese translation');
assert(!byId.get('KP-5469504').properties.hanja,'Kwail is a native Korean name');
assert.equal(byId.get('KR-41610').properties.hanja,'廣州市','Gyeonggi Gwangju');
assert.equal(byId.get('KR-51820').properties.hanja,'高城郡','Gangwon Goseong');
assert.equal(byId.get('KR-48820').properties.hanja,'固城郡','South Gyeongsang Goseong');
assert.equal(byId.get('KP-356533').properties.hanja,'黃海南道');
assert.equal(all.length,byId.size,'Region IDs must be unique');
assert.equal(data.first.features.filter(f=>f.properties.country==='KP').length,13);
assert.equal(data.first.features.filter(f=>f.properties.country==='KR').length,16);
const inRing=([x,y],r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const contains=(f,p)=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
for(const f of all){const p=f.properties;assert(p.en&&p.ko&&p.type&&p.center&&p.bounds,'Complete names and navigation');assert(contains(f,p.center),'Label must be inside '+p.en);if(p.level===2){const parent=byId.get(p.parent);assert(parent&&parent.properties.level===1&&parent.properties.country===p.country,'Valid parent '+p.en);assert(contains(parent,p.center),'Child belongs to parent '+p.en);}}
assert(!data.second.features.some(f=>f.properties.parent==='KR-36'),'Sejong must not have a fabricated second level');
assert(data.second.features.some(f=>f.properties.ko==='수원시'),'Suwon must be represented as a city');
assert(!data.second.features.some(f=>f.properties.ko.startsWith('수원시')&&f.properties.ko!=='수원시'),'Suwon districts must not be counted as second level');
for(const [point,name] of [[[126.978,37.5665],'Seoul'],[[125.75,39.04],'Pyongyang'],[[129.0756,35.1796],'Busan'],[[126.5312,33.4996],'Jeju']])assert(data.first.features.some(f=>f.properties.en===name&&contains(f,point)),name+' mapped location');
for(const point of [[129.5,40],[124.5,37.5],[128,34]])assert(!data.first.features.some(f=>contains(f,point)),'Sea must not be filled '+point);
const count=g=>typeof g[0]==='number'?1:g.reduce((n,c)=>n+count(c),0);
const vertices=all.reduce((n,f)=>n+count(f.geometry.coordinates),0);assert(vertices>250000,'Detailed geometry retained');
console.log(JSON.stringify({first:data.first.features.length,second:data.second.features.length,vertices,checkedHierarchy:all.length,coastalWaterChecks:3}));
