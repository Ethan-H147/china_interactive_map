import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync,gzipSync} from 'node:zlib';
import {readData} from './read-data.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';

// Keep only geometry coincident with China, never a neighbor's coastline.
const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
const china=readData('display-boundaries.json'),grid=new Map(),cell=.2;
for(const f of china.provinces.features)for(const poly of polygons(f.geometry))for(const ring of poly)for(let i=1;i<ring.length;i++){
 const a=ring[i-1],b=ring[i];
 for(let x=Math.floor(Math.min(a[0],b[0])/cell);x<=Math.floor(Math.max(a[0],b[0])/cell);x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell);y<=Math.floor(Math.max(a[1],b[1])/cell);y++){
  const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([a,b]);
 }
}
function nearest(p){
 let best=Infinity;const x=Math.floor(p[0]/cell),y=Math.floor(p[1]/cell),cos=Math.cos(p[1]*Math.PI/180);
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const [a,b] of grid.get((x+dx)+','+(y+dy))||[]){
  const vx=(b[0]-a[0])*cos,vy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*cos*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  best=Math.min(best,Math.hypot((p[0]-a[0]-t*(b[0]-a[0]))*cos,p[1]-a[1]-t*vy)*111195);
 }return best;
}
const features=[];
for(const country of ['korea','mongolia']){
 const data=JSON.parse(gunzipSync(fs.readFileSync('dist/data/'+country+'-outline.bin'))),paths=[];let km=0;
 for(const f of data.features){if(country==='korea'&&f.properties.country!=='KP')continue;
  for(const poly of polygons(f.geometry))for(const ring of poly){let path=[];const flush=()=>{if(path.length>1)paths.push(path);path=[];};
   for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    if(nearest(mid)<.02&&nearest(a)<.02&&nearest(b)<.02){if(!path.length)path.push(a);path.push(b);km+=Math.hypot((a[0]-b[0])*Math.cos(mid[1]*Math.PI/180),a[1]-b[1])*111.195;}else flush();
   }flush();
  }
 }
 assert(km>(country==='korea'?1300:4400)&&km<(country==='korea'?1500:4700),'Unexpected shared border length: '+country+' '+km);
 features.push({type:'Feature',properties:{neighbor:country},geometry:{type:'MultiLineString',coordinates:paths}});
 console.log(country,Math.round(km)+' km of shared land border');
}
fs.writeFileSync('dist/data/shared-context-borders.bin',gzipSync(JSON.stringify(lineData({type:'FeatureCollection',features})),{level:9}));
