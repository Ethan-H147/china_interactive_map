import {command,fc,polygons} from './us-geography.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {linesOf,metres,lineIndex,landIndex} from './geo-index.mjs';
import {joinReferencePaths} from './frontier-arcs.mjs';

// Import adjacent footprints together so simplification retains one shared arc.
export async function sharedCodeReferences(seeds,codes){
 const features=[...new Set(codes)].map(code=>({...seeds.get(code),properties:{id:code}}));
 // The legacy 250 envelope also includes the Lower Mainland. Give 604 its
 // retained footprint before building the shared topology, rather than letting
 // an overlap cleanup arbitrarily choose which area owns Vancouver.
 if(codes.includes('250')&&codes.includes('604')){const mapshaper=(await import('mapshaper')).default,out=JSON.parse((await mapshaper.applyCommands('-i upper.json -erase lower.json -o out.json format=geojson precision=.000001',{'upper.json':JSON.stringify(fc([features.find(f=>f.properties.id==='250')])),'lower.json':JSON.stringify(fc([features.find(f=>f.properties.id==='604')]))}))['out.json']),parts=out.type==='FeatureCollection'?out.features:[out];features.find(f=>f.properties.id==='250').geometry={type:'MultiPolygon',coordinates:parts.flatMap(f=>polygons(f.geometry))};}
 return command(fc(features),'-clean gap-fill-area=0 -simplify dp interval=.001 planar keep-shapes');
}
// A province-wide overlay introduces no dividing edge. Only the disjoint base
// areas participate; innerlines omits coasts and provincial perimeter strokes.
export async function areaCodeBorders(features,provinceLand){
 if(features.length<2)return fc([]);
 const lines=await command(fc(features),'-snap interval=.000002 -clean gap-fill-area=0 -innerlines');
 const rings=provinceLand.features.flatMap(f=>polygons(f.geometry).flat());
 const nearest=p=>{let best,minimum=Infinity;const c=Math.cos(p[1]*Math.PI/180);for(const ring of rings)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=(b[0]-a[0])*c,dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],distance=metres(p,q);if(distance<minimum){minimum=distance;best=q;}}return {point:best,distance:minimum};};
 const near=lineIndex(rings),runs=[];
 for(const path of linesOf(lines)){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if([0,.25,.5,.75,1].every(t=>near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<1500)){run=null;continue;}if(!run)runs.push(run=[a]);run.push(b);}}
 const paths=joinReferencePaths(runs),degree=new Map(),key=p=>p.map(n=>n.toFixed(6)).join(',');
 for(const path of paths)for(let i=1;i<path.length;i++)for(const p of [path[i-1],path[i]])degree.set(key(p),(degree.get(key(p))||0)+1);
 // The old survey's coast may stop slightly inside today's provincial land.
 // Extend only terminal ends to the nearest current shoreline, never junctions.
 for(const path of paths)for(const side of [0,1]){const at=side?path.length-1:0;if(degree.get(key(path[at]))===1){const {point,distance}=nearest(path[at]);if(distance>1&&distance<15000){if(side===0)path.unshift(point);else path.push(point);}}}
 const input=fc(paths.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}}))),mapshaper=(await import('mapshaper')).default,out=JSON.parse((await mapshaper.applyCommands('-i lines.json -clip land.json -o out.json format=geojson precision=.000001',{'lines.json':JSON.stringify(input),'land.json':JSON.stringify(provinceLand)}))['out.json']),inner=out.type==='FeatureCollection'?out:out.type==='Feature'?fc([out]):fc((out.type==='GeometryCollection'?out.geometries:[out]).map(geometry=>({type:'Feature',properties:{},geometry})));
 // Rejoin adjacent survey arcs before applying zoom fades; tiny independent
 // pieces otherwise fade at different zooms and make a continuous border blink.
 return lineData(fc(joinReferencePaths(linesOf(inner)).map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}}))));
}

// The survey's outside edges include coarse inland staircases. Rebuild the
// partition using only its shared dividers and the atlas's current land rings.
// This keeps real code boundaries while covering the complete coast and islands.
export async function coastalCodePartitions(features,provinceLand,boundaries){
 if(!features.length)return new Map();
 const rings=provinceLand.features.flatMap(f=>polygons(f.geometry).flat()),inside=landIndex(rings),coast=lineIndex(rings),dividers=linesOf(boundaries).map(path=>path.map(p=>[...p]));
 // Rounded exported endpoints can stop a fraction of a metre short of a coast
 // segment. Cross that segment during polygonization so it actually cuts land.
 for(const path of dividers)for(const side of [0,1]){const at=side?path.length-1:0,p=path[at],q=path[side?at-1:1];if(coast(p)<3){const d=metres(p,q);if(d>0){const end=[p[0]+(p[0]-q[0])*100/d,p[1]+(p[1]-q[1])*100/d];if(side)path.push(end);else path.unshift(end);}}}
 const lines=fc([...rings.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}})),...dividers.map(coordinates=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates}}))]);
 const cells=await command(lines,'-snap interval=.00002 -polygons gap-tolerance=.00002'),points=await command(cells,'-points inner');
 const seeds=features.map(f=>({id:f.properties.id,inside:landIndex(polygons(f.geometry).flat())}));
 // Islands missing from the old envelope inherit the nearest reference area.
 // A segment tree bounds that search without scanning every coastal vertex.
 const segments=features.flatMap(f=>polygons(f.geometry).flat().flatMap(r=>r.slice(1).map((b,i)=>({id:f.properties.id,a:r[i],b,box:[Math.min(r[i][0],b[0]),Math.min(r[i][1],b[1]),Math.max(r[i][0],b[0]),Math.max(r[i][1],b[1])]}))));
 const tree=items=>{
  const box=items.reduce((b,s)=>[Math.min(b[0],s.box[0]),Math.min(b[1],s.box[1]),Math.max(b[2],s.box[2]),Math.max(b[3],s.box[3])],[Infinity,Infinity,-Infinity,-Infinity]);
  if(items.length<=16)return {box,items};
  const axis=box[2]-box[0]>box[3]-box[1]?0:1;
  items.sort((a,b)=>a.box[axis]+a.box[axis+2]-b.box[axis]-b.box[axis+2]);
  const middle=items.length>>1;return {box,children:[tree(items.slice(0,middle)),tree(items.slice(middle))]};
 },root=tree(segments);
 const nearest=p=>{
  const c=Math.cos(p[1]*Math.PI/180);let best=Infinity,id;
  const distance=box=>Math.hypot(Math.max(box[0]-p[0],0,p[0]-box[2])*c,Math.max(box[1]-p[1],0,p[1]-box[3]));
  const visit=node=>{
   if(distance(node.box)>best)return;
   if(node.items)for(const s of node.items){
    const dx=(s.b[0]-s.a[0])*c,dy=s.b[1]-s.a[1],t=Math.max(0,Math.min(1,((p[0]-s.a[0])*c*dx+(p[1]-s.a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot((p[0]-s.a[0]-t*(s.b[0]-s.a[0]))*c,p[1]-s.a[1]-t*dy);
    if(d<best){best=d;id=s.id;}
   }else for(const child of node.children.toSorted((a,b)=>distance(a.box)-distance(b.box)))visit(child);
  };
  visit(root);return id;
 };
 const grouped=new Map(features.map(f=>[f.properties.id,[]]));
 for(let i=0;i<cells.features.length;i++){const p=points.features[i].geometry.coordinates;if(!inside(p))continue;const id=seeds.find(s=>s.inside(p))?.id||nearest(p);grouped.get(id).push(...polygons(cells.features[i].geometry));}
 return new Map([...grouped].map(([id,coordinates])=>[id,fc([{type:'Feature',properties:{id},geometry:{type:'MultiPolygon',coordinates}}])]));
}
