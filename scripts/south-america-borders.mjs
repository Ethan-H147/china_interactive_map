import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';

const fc=features=>({type:'FeatureCollection',features});
const rings=geometry=>(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).flat();

// Only arcs shared by different countries belong to the international mesh.
export function internationalBorders(regions){
 const topo=topology({regions}),countries=[...new Set(regions.features.map(f=>f.properties.parent))].sort();
 return fc(countries.flatMap((country,i)=>countries.slice(i+1).flatMap(neighbor=>{
  const pair=[country,neighbor],geometry=mesh(topo,topo.objects.regions,(a,b)=>a!==b&&a.properties.parent!==b.properties.parent&&pair.includes(a.properties.parent)&&pair.includes(b.properties.parent));
  return geometry.coordinates.length?[{type:'Feature',properties:{countries:pair},geometry}]:[];
 })));
}

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
 // An edge shared by two cities is stored once, carrying both IDs: drawing it
 // from each city's outline stacked two translucent strokes on the same edge.
 const segment=(a,b)=>[a.join(),b.join()].sort().join('|'),owners=new Map();
 for(const region of regions.features)for(const ring of rings(region.geometry))for(let i=1;i<ring.length;i++){
  const key=segment(ring[i-1],ring[i]);if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(region.properties.id);
 }
 const groups=new Map();
 for(const region of regions.features){
  const id=region.properties.id;
  for(const ring of rings(region.geometry)){
   let path=[],group=null;
   const flush=()=>{if(path.length>1)groups.get(group).coordinates.push(path);path=[];};
   for(let i=1;i<ring.length;i++){
    const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const ids=[...owners.get(segment(a,b))].sort(),key=JSON.stringify(ids);
    // The first listed city draws a shared edge; the others skip it.
    if(onExterior(a)&&onExterior(mid)&&onExterior(b)||ids[0]!==id){flush();continue;}
    if(key!==group){flush();group=key;if(!groups.has(key))groups.set(key,{regionIds:ids,coordinates:[]});}
    if(!path.length)path.push(a);path.push(b);
   }
   flush();
  }
 }
 return fc([...groups.values()].filter(g=>g.coordinates.length).map(({regionIds,coordinates})=>({type:'Feature',properties:{regionIds},geometry:{type:'MultiLineString',coordinates}})));
}
