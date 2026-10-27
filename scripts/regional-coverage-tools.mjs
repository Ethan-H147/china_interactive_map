import assert from 'node:assert/strict';
import polygonClipping from 'polygon-clipping';
import {polygons,lineIndex,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {selectFrontierArc} from './frontier-arcs.mjs';
const closed=path=>metres(path[0],path.at(-1))<1;
function nearestRing(regions,guide){const near=lineIndex([guide]),options=[];for(const f of regions.features)for(const polygon of polygons(f.geometry))for(const ring of polygon){const points=ring.filter((_,i)=>i%Math.max(1,Math.floor(ring.length/100))===0);options.push({ring,f,polygon,score:points.reduce((s,p)=>s+near(p),0)/points.length});}const best=options.sort((a,b)=>a.score-b.score)[0];assert(best&&best.score<20000,'Closed enclave frontier');return best;}
const frontier=(outline,guide)=>closed(guide)?nearestRing(outline,guide).ring:selectFrontierArc(outline,guide,{maximumScoreMetres:50000}).path;
// Clip each local partition to its displayed parent. Source gaps extend only an
// adjoining local area; isolated islands use the nearest area in that parent.
async function conform(children,parent){
 const clipped=await command({'children.json':children,'parent.json':fc([parent])},'-clip parent.json -clean gap-fill-area=0'),mask=polygons(parent.geometry);
 const gaps=polygonClipping.difference(mask,...clipped.features.map(f=>polygons(f.geometry))),edges=clipped.features.map(f=>lineIndex(polygons(f.geometry).flat())),patches=clipped.features.map(()=>[]);
 for(const g of gaps){const lengths=clipped.features.map(()=>0);for(const ring of g)for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];edges.forEach((edge,j)=>{if(edge(mid)<.5)lengths[j]+=metres(a,b);});}let owner=lengths.indexOf(Math.max(...lengths));if(!lengths[owner])owner=edges.map(e=>e(g[0][0])).indexOf(Math.min(...edges.map(e=>e(g[0][0]))));assert(owner>=0);patches[owner].push(g);}
 const rounded=value=>typeof value==='number'?Math.round(value*1e9)/1e9:value.map(rounded),pieces=[...clipped.features];
 for(let i=0;i<clipped.features.length;i++)for(const coordinates of patches[i])pieces.push({type:'Feature',properties:{...clipped.features[i].properties},geometry:{type:'Polygon',coordinates:rounded(coordinates)}});
 const merged=await command(fc(pieces),'-dissolve2 id,parent -clean gap-fill-area=0',{precision:null});
 for(const f of merged.features)f.geometry={type:'MultiPolygon',coordinates:polygonClipping.intersection(polygons(f.geometry),mask)};
 return merged;
}

export {closed,nearestRing,frontier,conform};
