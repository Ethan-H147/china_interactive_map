import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readData} from './read-data.mjs';
const display=readData('display-boundaries.json');
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
function inRing([x,y],r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const contains=(g,p)=>polygons(g).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
function edges(g){const keys=[];for(const poly of polygons(g))for(const r of poly)for(let i=1;i<r.length;i++){const a=JSON.stringify(r[i-1]),b=JSON.stringify(r[i]);if(a!==b)keys.push(a<b?a+'|'+b:b+'|'+a);}return createHash('sha256').update(keys.sort().join('\n')).digest('hex');}
function vertices(g){return polygons(g).reduce((n,p)=>n+p.reduce((s,r)=>s+r.length,0),0);}
const stats=[];
for(const code of [810000,820000]){
 const source=readData('sar-'+code+'.json'),original=readData(code+'.json');
 const children=display.subdivisions.features.filter(f=>f.properties.provinceCode===code);
 assert.equal(children.length,code===810000?18:11);
 for(const f of source.features){const drawn=children.find(c=>c.properties.adcode===f.properties.adcode);assert.equal(edges(drawn.geometry),edges(f.geometry),'Source resolution lost: '+f.properties.name);assert.equal(drawn.properties.name,f.properties.name);}
 const sourceVertices=source.features.reduce((s,f)=>s+vertices(f.geometry),0),oldVertices=original.features.reduce((s,f)=>s+vertices(f.geometry),0);
 assert(sourceVertices>oldVertices*5,'Detailed source must improve coordinate density');
 stats.push({code,sourceVertices,oldVertices,parts:children.reduce((s,f)=>s+polygons(f.geometry).length,0)});
}
const hk=display.provinces.features.find(f=>f.properties.adcode===810000);
for(const p of [[114.17,22.26],[113.947,22.242],[114.12762,22.19164],[114.028889,22.210556]])assert(contains(hk.geometry,p),'Hong Kong island lost: '+p);
for(const p of [[114.17,22.291],[114.1,22.26],[114.2,22.2]])assert(!contains(hk.geometry,p),'Hong Kong sea rendered as land: '+p);
assert.equal(hk.properties.name,'香港特別行政區');
assert.equal(display.provinces.features.find(f=>f.properties.adcode===820000).properties.name,'澳門特別行政區');
const mo=display.subdivisions.features.filter(f=>f.properties.provinceCode===820000);
assert.equal(mo.filter(f=>f.properties.adminType==='Parish').length,7);
assert.deepEqual(mo.filter(f=>f.properties.adcode>=820009).map(f=>f.properties.adcode).sort(),[820009,820010,820011]);
console.log(JSON.stringify({sarResolution:stats,separateIslandsVerified:4,waterChannelsVerified:3,macauParishes:7,macauOtherAreas:4}));
