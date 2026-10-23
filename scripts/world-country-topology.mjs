import {createRequire} from 'node:module';
import {fc} from './build-regional-dataset.mjs';
import {lineIndex,polygons,linesOf} from './geo-index.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server'),{mesh}=require('topojson-client');
export function worldOutlines(clipped,mask){
 // KAS is an inland disputed source entity already drawn by the atlas's
 // India/Pakistan/China frontiers. Residual fill slivers are not coastlines.
 clipped=fc(clipped.features.filter(f=>f.properties.id!=='KAS'));
// Exact overlay arcs share the updated atlas edge. Those edges are already drawn by atlas frontiers.
const t=topology({countries:clipped}),owners=new Map();for(const g of t.objects.countries.geometries)for(const arc of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){let list=owners.get(arc);if(!list)owners.set(arc,list=[]);list.push(g.properties.id);}
const atlasEdge=lineIndex(mask.features.flatMap(f=>polygons(f.geometry).flat())),groups=new Map(),coasts=[];
for(const [arc,own]of owners){const coords=t.arcs[arc];if(own.length===1){let run=null;for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],shared=[a,mid,b].every(p=>atlasEdge(p)<.5);if(shared){run=null;continue;}if(!run){run=[a];coasts.push({type:'Feature',properties:{countries:own[0],kind:'coast'},geometry:{type:'LineString',coordinates:run}});}run.push(b);}continue;}const key=own.slice().sort().join(' ');if(!groups.has(key))groups.set(key,{owners:own.slice().sort(),arcs:[]});groups.get(key).arcs.push([arc]);}
const raw=fc([...coasts,...[...groups.values()].map(({owners,arcs})=>({type:'Feature',properties:{countries:owners.join(' '),kind:owners.length>1?'frontier':'coast'},geometry:mesh(t,{type:'MultiLineString',arcs})}))]);

 // Overlay intersections may differ below six decimal places, leaving microscopic retraces.
 // Keep one visible segment, splitting runs at the duplicate rather than fading either copy.
 const taken=new Set(),features=[];
 for(const f of raw.features)for(const path of linesOf({features:[f]})){let run=null;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],ends=[a.map(v=>v.toFixed(6)).join(','),b.map(v=>v.toFixed(6)).join(',')].sort(),key=ends.join('|');if(ends[0]===ends[1])continue;if(taken.has(key)){run=null;continue;}taken.add(key);if(!run){run=[a];features.push({...f,geometry:{type:'LineString',coordinates:run}});}run.push(b);}}
 return fc(features);
}
