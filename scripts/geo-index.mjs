// Geometry helpers the boundary builds share: loading (gzip or plain JSON), polygon parts,
// distances, point-in-polygon and nearest-line indexes. No data of its own.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';

export const load=file=>{const b=fs.readFileSync(file);try{return JSON.parse(gunzipSync(b));}catch{return JSON.parse(b);}};
export const polygons=g=>!g?[]:g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
export const metres=(a,b)=>Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111195;

// Even-odd point-in-polygon over many rings, edges bucketed by 0.05° latitude rows.
export function landIndex(rings){
 const rows=new Map(),row=.05,box=[Infinity,Infinity,-Infinity,-Infinity];
 for(const ring of rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];box[0]=Math.min(box[0],a[0],b[0]);box[1]=Math.min(box[1],a[1],b[1]);box[2]=Math.max(box[2],a[0],b[0]);box[3]=Math.max(box[3],a[1],b[1]);if(a[1]===b[1])continue;for(let y=Math.floor(Math.min(a[1],b[1])/row);y<=Math.floor(Math.max(a[1],b[1])/row);y++){if(!rows.has(y))rows.set(y,[]);rows.get(y).push([a,b]);}}
 return p=>{if(p[0]<box[0]||p[0]>box[2]||p[1]<box[1]||p[1]>box[3])return false;let inside=false;for(const [a,b] of rows.get(Math.floor(p[1]/row))||[])if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;return inside;};
}
// Distance to the nearest segment of a set of lines, by a 0.1° grid.
export function lineIndex(lines){
 const cell=.1,grid=new Map(),segments=[];
 for(const line of lines)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],k=segments.push([a,b])-1;for(let x=Math.floor(Math.min(a[0],b[0])/cell)-1;x<=Math.floor(Math.max(a[0],b[0])/cell)+1;x++)for(let y=Math.floor(Math.min(a[1],b[1])/cell)-1;y<=Math.floor(Math.max(a[1],b[1])/cell)+1;y++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(k);}}
 return p=>{let best=Infinity;for(const k of grid.get(Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell))||[]){const [a,b]=segments[k],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,metres(p,[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])]));}return best;};
}
export const linesOf=collection=>collection.features.flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[]);
