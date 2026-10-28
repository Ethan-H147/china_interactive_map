import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import '../dist/countries.js';
import {load,polygons} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import earcut from 'earcut';
// The neutral cap uses the shared continent outline (build-antarctica.mjs).
// Triangulate in a polar plane, then store true unit-sphere positions. The
// renderer's Mercator tile boundary cannot represent this coast near the pole.
const radians=Math.PI/180;
const polar=([x,y])=>{const r=2*Math.tan(Math.PI/4+y*radians/2);return [r*Math.sin(x*radians),r*Math.cos(x*radians)];};
const sphere=([x,y])=>{const r2=x*x+y*y,d=4+r2;return [4*x/d,(r2-4)/d,4*y/d];};
function ringPoints(ring,whole){
 // A continent ring closes along ±180° and the pole in geographic GeoJSON.
 // Remove only that artificial closure before triangulating around the pole.
 const seam=ring.filter(p=>Math.abs(p[0])>=179.999999),coast=Math.max(...seam.map(p=>p[1]));
 const points=[];
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],steps=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))));
  for(let n=0;n<steps;n++){const t=n/steps,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
   if(whole&&(p[1]<=-89.999999||Math.abs(p[0])>=179.999999&&p[1]<coast-1e-9))continue;
   const q=polar(p);if(!points.length||Math.hypot(q[0]-points.at(-1)[0],q[1]-points.at(-1)[1])>1e-10)points.push(q);
  }
 }
 if(points.length&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<1e-10)points.pop();
 const closed=[...points,points[0]],keep=new Set([0,points.length]),stack=[[0,points.length]];
 while(stack.length){const [a,b]=stack.pop(),p=closed[a],q=closed[b],dx=q[0]-p[0],dy=q[1]-p[1],d=dx*dx+dy*dy;let best=4e-10,index=-1;
  for(let i=a+1;i<b;i++){const r=closed[i],t=d?Math.max(0,Math.min(1,((r[0]-p[0])*dx+(r[1]-p[1])*dy)/d)):0,dist=(r[0]-p[0]-t*dx)**2+(r[1]-p[1]-t*dy)**2;if(dist>best){best=dist;index=i;}}
  if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}
 }
 return [...keep].sort((a,b)=>a-b).filter(i=>i<points.length).map(i=>points[i]);
}
function triangle(a,b,c,out){
 const distance=(p,q)=>(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2,ab=distance(a,b),bc=distance(b,c),ca=distance(c,a),max=Math.max(ab,bc,ca);
 if(max<=.0004){out.push(...a,...b,...c);return;}
 const middle=(p,q)=>{const s=p.map((v,i)=>v+q[i]),l=Math.hypot(...s);return s.map(v=>v/l);};
 if(max===ab){const m=middle(a,b);triangle(a,m,c,out);triangle(m,b,c,out);}
 else if(max===bc){const m=middle(b,c);triangle(a,b,m,out);triangle(a,m,c,out);}
 else{const m=middle(c,a);triangle(a,b,m,out);triangle(m,b,c,out);}
}
async function mesh(data,whole){
 const clipped=await command(data,'-clip bbox=-180,-90,360,-84',{precision:null}),positions=[],outlines=[];
 for(const f of clipped.features)for(const p of polygons(f.geometry)){
  const rings=p.map(r=>ringPoints(r,whole)).filter(r=>r.length>=3);if(!rings.length)continue;
  const vertices=rings.flat(),holes=[];let offset=rings[0].length;for(const r of rings.slice(1)){holes.push(offset);offset+=r.length;}
  const indices=earcut(vertices.flat(),holes),vectors=vertices.map(sphere);outlines.push(rings);
  for(let i=0;i<indices.length;i+=3)triangle(vectors[indices[i]],vectors[indices[i+1]],vectors[indices[i+2]],positions);
 }
 return {positions:positions.map(v=>Math.round(v*1e9)/1e9),outlines};
}
export async function buildAntarcticCap(){
 const land=load('dist/data/antarctica/context.bin');
 const neutral=await mesh(land,true),claims=[];
 for(const country of globalThis.AtlasCountries.byAdapter('europe')){
  const file='dist/data/europe/'+country+'/context.bin';if(!fs.existsSync(file))continue;
  for(const f of load(file).features){
   if(!polygons(f.geometry).some(p=>p.flat(Infinity).every((v,i)=>i%2===0||v<=-60)&&p.some(r=>r.some(p=>p[1]<=-84))))continue;
   const copy=structuredClone(f);for(const p of polygons(copy.geometry))for(const r of p)for(const point of r)if(point[1]<=-84.999999)point[1]=-90;
   const data=await mesh(fc([copy]),false);if(data.positions.length)claims.push({country,region:f.properties.region,...data});
  }
 }
 const result={version:1,southOf:-84,neutral,claims};fs.writeFileSync('dist/data/antarctica/pole-mesh.bin',gzipSync(JSON.stringify(result),{level:9}));
 console.log('True geographic Antarctic cap:',neutral.positions.length/9,'triangles;',claims.length,'claimant meshes;',fs.statSync('dist/data/antarctica/pole-mesh.bin').size,'bytes.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/build-antarctic-cap.mjs'))await buildAntarcticCap();
