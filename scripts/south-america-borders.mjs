import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';

const fc=features=>({type:'FeatureCollection',features});
const rings=geometry=>(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).flat();

// Each shared arc is drawn once and carries both adjacent division IDs, so a
// selected division can emphasize its inland boundaries without tracing water.
export function divisionBorders(regions){
 const topo=topology({regions}),owners=new Map(),groups=new Map();
 for(const region of topo.objects.regions.geometries){
  for(const arc of new Set(region.arcs.flat(Infinity).map(a=>a<0?~a:a))){
   if(!owners.has(arc))owners.set(arc,new Set());
   owners.get(arc).add(region.properties.id);
  }
 }
 for(const [arc,ids] of owners){
  if(ids.size<2)continue;
  const regionIds=[...ids].sort(),key=regionIds.join('|');
  if(!groups.has(key))groups.set(key,{regionIds,arcs:[]});
  groups.get(key).arcs.push([arc]);
 }
 return fc([...groups.values()].map(({regionIds,arcs})=>({type:'Feature',properties:{regionIds},geometry:mesh(topo,{type:'MultiLineString',arcs})})));
}

// Municipal files contain only the ranked cities, rather than a complete land
// partition. Keep their jurisdiction boundaries, excluding the parent exterior
// already covered by the national layer. Index that exterior for fast queries.
export function municipalBorders(regions,parent){
 const grid=new Map(),cell=.1,tolerance=1.5e-6;
 for(const ring of rings(parent.geometry))for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];
  for(let x=Math.floor((Math.min(a[0],b[0])-tolerance)/cell);x<=Math.floor((Math.max(a[0],b[0])+tolerance)/cell);x++)
   for(let y=Math.floor((Math.min(a[1],b[1])-tolerance)/cell);y<=Math.floor((Math.max(a[1],b[1])+tolerance)/cell);y++){
    const key=x+':'+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([a,b]);
   }
 }
 const onExterior=p=>(grid.get(Math.floor(p[0]/cell)+':'+Math.floor(p[1]/cell))||[]).some(([a,b])=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=tolerance;
 });
 return fc(regions.features.map(region=>{
  const coordinates=[];
  for(const ring of rings(region.geometry)){
   let path=[];
   for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    if(onExterior(a)&&onExterior(mid)&&onExterior(b)){if(path.length>1)coordinates.push(path);path=[];}
    else{if(!path.length)path.push(a);path.push(b);}
   }
   if(path.length>1)coordinates.push(path);
  }
  return{type:'Feature',properties:{regionIds:[region.properties.id]},geometry:{type:'MultiLineString',coordinates}};
 }).filter(f=>f.geometry.coordinates.length));
}
