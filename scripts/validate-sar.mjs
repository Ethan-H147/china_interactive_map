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
// Check geometric fidelity against the untouched government export, allowing
// only numerical seam correction, bounded to 50 cm even at narrow junctions.
const project=([x,y])=>[x*103100,y*111200];
const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function distanceIndex(lines){
 const grid=new Map(),cell=100;
 for(const line of lines)for(let i=1;i<line.length;i++){
  const a=project(line[i-1]),b=project(line[i]);
  for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([a,b]);}
 }
 return point=>{const p=project(point),x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell);let d=Infinity;for(let u=x-1;u<=x+1;u++)for(let v=y-1;v<=y+1;v++)for(const [a,b] of grid.get(u+','+v)||[])d=Math.min(d,segmentDistance(p,a,b));return d;};
}
let maxMacauDisplacement=0;
const stats=[];
for(const code of [810000,820000]){
 const source=readData('sar-'+code+'.json'),original=readData(code+'.json');
 const children=display.subdivisions.features.filter(f=>f.properties.provinceCode===code);
 assert.equal(children.length,code===810000?18:11);
 for(const f of source.features){const drawn=children.find(c=>c.properties.adcode===f.properties.adcode);if(code===810000)assert.equal(edges(drawn.geometry),edges(f.geometry),'Source resolution lost: '+f.properties.name);assert.equal(drawn.properties.name,f.properties.name);}
 if(code===820000)for(const f of source.features){
  const drawn=children.find(c=>c.properties.adcode===f.properties.adcode);
  for(const [a,b] of [[f,drawn],[drawn,f]]){const distance=distanceIndex(polygons(b.geometry).flat());for(const p of polygons(a.geometry).flat(2)){const d=distance(p);maxMacauDisplacement=Math.max(maxMacauDisplacement,d);assert(d<0.5,'Macau boundary moved more than 50 cm: '+f.properties.name+' '+p+' '+d);}}
 }
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
// These formerly solid segments are shared administrative edges, not coast.
const repairedSeams=[
 [113.54812006581699,22.205545224055122],
 [113.55114258525992,22.195405194987053],
 [113.55148979310448,22.20277243549687],
 [113.54713438097136,22.195904637606468],
 [113.55529714383896,22.198105786181813],
 [113.558360102,22.150051139475114],
 [113.5748231852582,22.15384105173171]
];
const localLines=g=>g.coordinates.filter(r=>r.some(([x,y])=>x>113.5&&x<113.61&&y>22.08&&y<22.23));
const internalDistance=distanceIndex(localLines(display.boundaries.other)),outerDistance=distanceIndex(localLines(display.boundaries.province));
for(const p of repairedSeams){assert(internalDistance(p)<0.5,'Missing internal Macau border');assert(outerDistance(p)>1,'Internal Macau edge still drawn as coastline');}
console.log(JSON.stringify({sarResolution:stats,separateIslandsVerified:4,waterChannelsVerified:3,macauParishes:7,macauOtherAreas:4,maxMacauDisplacementMetres:maxMacauDisplacement}));
