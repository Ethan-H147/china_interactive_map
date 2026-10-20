import assert from 'node:assert/strict';
import {topology} from 'topojson-server';
import {mergeArcs,feature} from 'topojson-client';
import {fc,command} from './build-regional-dataset.mjs';
import {metres,polygons,lineIndex} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
// A gap enclosed by two or more municipalities is a broken shared survey seam.
// Single-owner holes remain intact; the separate water mask is reapplied afterwards.
export function angolaSeamGaps(regions){
 const t=topology({units:regions}),objects=t.objects.units.geometries,owners=new Map();
 for(const g of objects)for(const a of new Set(g.arcs.flat(Infinity).map(a=>a<0?~a:a))){if(!owners.has(a))owners.set(a,[]);owners.get(a).push(g.properties.id);}
 const union=mergeArcs(t,objects),gaps=[];
 for(const poly of union.arcs)for(const arcs of poly.slice(1)){
  const lengths=new Map();for(const a of arcs){const key=a<0?~a:a,path=t.arcs[key],length=path.slice(1).reduce((n,p,i)=>n+metres(path[i],p),0);for(const id of owners.get(key)||[])lengths.set(id,(lengths.get(id)||0)+length);}
  const geometry=feature(t,{type:'Polygon',arcs:[arcs]}).geometry,ring=geometry.coordinates[0],areaKm2=geographicAreaKm2(geometry),perimeter=ring.slice(1).reduce((n,p,i)=>n+metres(ring[i],p),0),ids=[...lengths.keys()].sort();
  const assignedTo=[...lengths].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0],assignedProvince=assignedTo?.split('-')[2],borderArcs=arcs.filter(a=>(owners.get(a<0?~a:a)||[]).some(id=>id.split('-')[2]!==assignedProvince)),candidates=(borderArcs.length?borderArcs:arcs).flatMap(a=>{const path=t.arcs[a<0?~a:a];return path.slice(1).map((p,i)=>({length:metres(path[i],p),point:[(path[i][0]+p[0])/2,(path[i][1]+p[1])/2]}));}).sort((a,b)=>b.length-a.length);
  gaps.push({ids,geometry,areaKm2,effectiveWidthMetres:4e6*areaKm2/perimeter,assignedTo,borderPoint:candidates[0]?.point});
 }
 return gaps;
}
export async function repairAngolaSeams(regions){
 const before=angolaSeamGaps(regions),seams=before.filter(g=>g.ids.length>1);
 for(const g of seams){assert(g.areaKm2<2,'Unexpected large internal gap requires source review');assert(g.effectiveWidthMetres<1000,'Unexpected broad internal gap requires source review');}
 const probes=seams.length?(await command(fc(seams.map((g,i)=>({type:'Feature',properties:{id:i},geometry:g.geometry}))),'-points inner')).features:[];
 const repaired=await command(fc([...regions.features,...seams.map(g=>({type:'Feature',properties:{id:g.assignedTo},geometry:g.geometry}))]),'-dissolve2 id gap-fill-area=0 -clean gap-fill-area=0'),after=angolaSeamGaps(repaired);
 assert.equal(after.filter(g=>g.ids.length>1).length,0,'Every enclosed shared municipal seam is closed');assert.equal(after.filter(g=>g.ids.length===1).length,before.filter(g=>g.ids.length===1).length,'Single-owner water holes are retained');
 const exterior=d=>{const t=topology({units:d});return polygons(feature(t,mergeArcs(t,t.objects.units.geometries)).geometry).map(p=>p[0]);},beforeExterior=exterior(regions),afterExterior=exterior(repaired),beforeEdge=lineIndex(beforeExterior),afterEdge=lineIndex(afterExterior);assert.equal(beforeExterior.length,afterExterior.length,'Country parts are preserved');let exteriorDisplacementMetres=0;for(const [paths,distance]of [[beforeExterior,afterEdge],[afterExterior,beforeEdge]])for(const path of paths)for(const point of path)exteriorDisplacementMetres=Math.max(exteriorDisplacementMetres,distance(point));assert(exteriorDisplacementMetres<.1,'Coastlines and international frontiers do not move');
 const report={exteriorDisplacementMetres,method:'Close enclosed gaps bounded by multiple municipalities, assigning each sliver to its longest adjoining municipality edge, then dissolve the provinces from those repaired municipalities. Preserve single-owner holes and reapply the source lake mask. Coastlines and international frontier arcs are unchanged.',closedGaps:seams.length,closedAreaKm2:seams.reduce((n,g)=>n+g.areaKm2,0),maxEffectiveWidthMetres:Math.max(0,...seams.map(g=>g.effectiveWidthMetres)),retainedSingleOwnerHoles:after.length,seams:seams.map((g,i)=>({gapPoint:probes[i].geometry.coordinates,borderPoint:g.borderPoint,owners:g.ids,assignedTo:g.assignedTo,areaKm2:g.areaKm2,effectiveWidthMetres:g.effectiveWidthMetres,referencePoint:g.geometry.coordinates[0][0]}))};
 return {regions:repaired,report};
}
