import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {readData} from './read-data.mjs';
const data=readData('display-boundaries.json');
const t=topology({r:data.subdivisions});
const water=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/major-water.bin',import.meta.url))));
const rivers=water.features.filter(f=>f.properties.kind==='river');
const grid=new Map(),cell=.05;
for(const f of rivers)for(const line of f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates)for(let i=1;i<line.length;i++){
 const a=line[i-1],b=line[i];
 for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){
  const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push({a,b,name:f.properties.name});
 }
}
function nearest(p){let best={distance:Infinity};const c=Math.cos(p[1]*Math.PI/180);for(const s of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const dx=(s.b[0]-s.a[0])*c,dy=s.b[1]-s.a[1],u=Math.max(0,Math.min(1,((p[0]-s.a[0])*c*dx+(p[1]-s.a[1])*dy)/(dx*dx+dy*dy||1))),q=[s.a[0]+u*(s.b[0]-s.a[0]),s.a[1]+u*(s.b[1]-s.a[1])],d=Math.hypot((p[0]-q[0])*c,p[1]-q[1])*111195;if(d<best.distance)best={distance:d,name:s.name};}return best;}
const owners=new Map();const arcs=(a,code)=>{if(typeof a==='number'){const id=a<0?~a:a;if(!owners.has(id))owners.set(id,new Set());owners.get(id).add(code);}else a.forEach(x=>arcs(x,code));};
for(const g of t.objects.r.geometries)arcs(g.arcs,g.properties.adcode);
const props=new Map(data.subdivisions.features.map(f=>[f.properties.adcode,f.properties]));
const summary=new Map();
for(const [id,codes] of owners){if(codes.size!==2)continue;const pair=[...codes].sort((a,b)=>a-b);const line=t.arcs[id];for(let i=1;i<line.length;i++){
 const a=line[i-1],b=line[i],length=Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;
 const hit=nearest([(a[0]+b[0])/2,(a[1]+b[1])/2]);if(hit.distance>2500)continue;
 const key=hit.name+':'+pair.join('-');if(!summary.has(key))summary.set(key,{river:hit.name,pair,names:pair.map(c=>props.get(c).name),provinces:pair.map(c=>props.get(c).provinceCode),length:0,maxDistance:0,bounds:[Infinity,Infinity,-Infinity,-Infinity]});const s=summary.get(key);s.length+=length;s.maxDistance=Math.max(s.maxDistance,hit.distance);for(const p of [a,b]){s.bounds[0]=Math.min(s.bounds[0],p[0]);s.bounds[1]=Math.min(s.bounds[1],p[1]);s.bounds[2]=Math.max(s.bounds[2],p[0]);s.bounds[3]=Math.max(s.bounds[3],p[1]);}
}}
const result=[...summary.values()].filter(s=>s.length>10000).sort((a,b)=>b.length-a.length).map(s=>({...s,lengthKm:Math.round(s.length/1000),maxDistance:Math.round(s.maxDistance),length:undefined}));
fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../artifacts/river-boundary-candidates.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result.slice(0,60),null,2));
