import {command,fc,polygons} from './us-geography.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {linesOf,metres,lineIndex} from './geo-index.mjs';
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
