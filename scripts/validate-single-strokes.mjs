import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {withoutSegments} from '../dist/adaptive-lines.mjs';
import {decodePack} from '../dist/china-pack.mjs';

// Every boundary line set the site ships must draw each edge once. A segment drawn
// twice in one translucent layer turns darker, and partial retracing reads as
// alternating thick and thin pieces along a border.
// This check is independent of drawing order: a segment fails when five points
// along it lie within 0.5 m of other segments of the same set (other paths, or
// non-adjacent parts of its own path). Overlaps shorter than 2 m are ignored;
// they stay below one pixel at the map's maximum zoom of 16.
const tolerance=.5,minimum=2,cell=.02;
const metres=(a,b)=>Math.hypot((b[0]-a[0])*111320*Math.cos((a[1]+b[1])*Math.PI/360),(b[1]-a[1])*110540);
function retraced(paths){
 const grid=new Map();
 paths.forEach((p,k)=>{for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];
  for(let x=Math.floor((Math.min(a[0],b[0])-1e-4)/cell);x<=Math.floor((Math.max(a[0],b[0])+1e-4)/cell);x++)
   for(let y=Math.floor((Math.min(a[1],b[1])-1e-4)/cell);y<=Math.floor((Math.max(a[1],b[1])+1e-4)/cell);y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([a,b,k,i]);}}});
 const near=(x,y,k,i)=>{const kx=111320*Math.cos(y*Math.PI/180),ky=110540;
  for(const [a,b,o,j] of grid.get(Math.floor(x/cell)+','+Math.floor(y/cell))||[]){
   if(o===k&&Math.abs(j-i)<=1)continue;
   const ax=(a[0]-x)*kx,ay=(a[1]-y)*ky,dx=(b[0]-a[0])*kx,dy=(b[1]-a[1])*ky,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
   if(Math.hypot(ax+t*dx,ay+t*dy)<=tolerance)return true;
  }return false;};
 const found=[];
 paths.forEach((p,k)=>{for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];if(metres(a,b)>=minimum&&[0,.25,.5,.75,1].every(t=>near(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,k,i)))found.push(b);}});
 return found;
}
const pathsOf=v=>v.type==='FeatureCollection'?v.features.flatMap(f=>pathsOf(f.geometry)):v.type==='LineString'?[v.coordinates]:v.coordinates;
function lineSets(value,where,out){
 if(!value||typeof value!=='object')return out;
 if(value.type==='FeatureCollection'&&value.features.length&&value.features.every(f=>/LineString/.test(f.geometry?.type)))out.push([where,value]);
 else if(/LineString/.test(value.type||''))out.push([where,value]);
 else for(const [k,v] of Object.entries(value))if(k!=='properties')lineSets(v,where+'.'+k,out);
 return out;
}
const sets=[];
const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);
 if(e.isDirectory())walk(p);
 else if(/\.(bin|json)$/.test(e.name)&&!/^display-boundaries|pack\.bin$|motion/.test(e.name)){
  const bytes=fs.readFileSync(p);let data;try{data=JSON.parse(bytes[0]===31&&bytes[1]===139?gunzipSync(bytes):bytes);}catch{continue;}
  sets.push(...lineSets(data,path.relative('dist/data',p),[]));
 }}};
walk('dist/data');
// China as drawn: canonical outlines minus the pack's hidden segments.
const china=decodePack(gunzipSync(fs.readFileSync('dist/data/china-boundaries.pack.bin')));
for(const [name,geometry] of Object.entries(china.display.boundaries))sets.push(['china '+name+' outlines',withoutSegments(geometry,china.lineOmissions[name]||[])]);
const failures=[];let segments=0;
for(const [where,set] of sets){const paths=pathsOf(set);segments+=paths.reduce((n,p)=>n+p.length-1,0);const found=retraced(paths);if(found.length)failures.push(`${where}: ${found.length} doubled, e.g. ${found[0].map(v=>+v.toFixed(5))}`);}
assert.deepEqual(failures,[],'Boundary lines draw every edge once');
console.log(`Single strokes: ${sets.length} line sets, ${segments} segments, no edge drawn twice.`);
