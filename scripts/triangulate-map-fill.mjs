import earcut,{flatten,deviation} from 'earcut';
import clipping from 'polygon-clipping';
import assert from 'node:assert/strict';
// Resolve ring contacts in the projection used to draw the fill, then triangulate
// before tile rounding can reconnect tiny holes. Outlines keep the original rings.
export function triangulateMapFill(feature){
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates,triangles=[];
 const project=([x,y])=>[x,Math.log(Math.tan(Math.PI/4+y*Math.PI/360))*180/Math.PI];
 const unproject=([x,y])=>[x,(2*Math.atan(Math.exp(y*Math.PI/180))-Math.PI/2)*180/Math.PI];
 for(const polygon of polygons){
  const original=new Map(),origin=project(polygon[0][0]);
  const local=polygon.map(r=>r.map(p=>{const q=project(p),xy=[q[0]-origin[0],q[1]-origin[1]];original.set(xy.join(','),p);return xy;}));
  for(const rings of clipping.union([local])){
   const points=rings.flat(),flat=flatten(rings),indices=earcut(flat.vertices,flat.holes,2);
   const error=deviation(flat.vertices,flat.holes,2,indices);
   const area=Math.abs(rings.reduce((s,r,i)=>s+(i?-1:1)*Math.abs(r.reduce((a,p,j)=>{const q=r[(j+1)%r.length];return a+p[0]*q[1]-q[0]*p[1];},0))/2,0));
   if(area<1e-16)continue;
   assert(error<1e-8||error*area<1e-14,'Triangulation preserves '+feature.properties.adcode+' error='+error+' area='+area+' vertices='+points.length);
   const geographic=points.map(p=>original.get(p.join(','))||unproject([p[0]+origin[0],p[1]+origin[1]]));
   for(let i=0;i<indices.length;i+=3){const a=geographic[indices[i]],b=geographic[indices[i+1]],c=geographic[indices[i+2]];triangles.push([[a,b,c,a]]);}
  }
 }
 return {...feature,geometry:{type:'MultiPolygon',coordinates:triangles}};
}
