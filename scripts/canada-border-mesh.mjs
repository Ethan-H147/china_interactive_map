import {load,polygons,lineIndex,metres,linesOf} from './geo-index.mjs';
const root='scripts/boundary-sources/us-canada/';let source,arcs;
// Preserve legal subdivision lines through lakes. Only international junction
// endpoints move; dissolving water-masked polygons would remove those lines.
export function preserveCanadianBorderMesh(data){
 source||=lineIndex(load(root+'canada-original-outline.bin').features.flatMap(f=>polygons(f.geometry).flat()));arcs||=load(root+'land-arcs.json');
 function project(p){let best={distance:Infinity,q:p};for(const arc of arcs)for(let i=1;i<arc.path.length;i++){const a=arc.path[i-1],b=arc.path[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=a.map((v,j)=>v+(b[j]-v)*u),distance=metres(p,q);if(distance<best.distance)best={q:q.map(v=>+v.toFixed(6)),distance};}return best;}
 return {...data,features:data.features.map(f=>{const paths=linesOf({features:[f]}).map(path=>path.map((p,i)=>{if(i!==0&&i!==path.length-1||source(p)>1)return p;const near=project(p);return near.distance<2000?near.q:p;}));return {...f,geometry:{type:f.geometry.type,coordinates:f.geometry.type==='LineString'?paths[0]:paths}};})};
}
import {outlineSegmentKey} from '../dist/outline-edits.mjs';
let lakeShore;
// Re-dissolving parents can round or merge their shore vertices. Refresh the
// segment keys, while keeping the original legal outlines added through water.
export function preserveCanadianLakeEdits(data){
 if(!data.selectionOutlineEdits)return data;
 lakeShore||=lineIndex(load('scripts/boundary-sources/canada-lakes/lakes.geojson.gz').features.flatMap(f=>polygons(f.geometry).flat()));
 const ids=new Set(data.selectionOutlineEdits.ids),remove=new Set(data.selectionOutlineEdits.remove);
 for(const f of data.regions.features)if(ids.has(f.properties.id))for(const path of polygons(f.geometry).flat())for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],mid=a.map((v,j)=>(v+b[j])/2);if(lakeShore(a)<.3&&lakeShore(b)<.3&&lakeShore(mid)<.3)remove.add(outlineSegmentKey(a,b));}
 return {...data,selectionOutlineEdits:{...data.selectionOutlineEdits,remove:[...remove]}};
}
