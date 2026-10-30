import assert from 'node:assert/strict';import osm from 'osmtogeojson';import {source,root} from './fetch-indian-ocean.mjs';import {fc,command,geographicBounds} from './build-regional-dataset.mjs';import {polygons,metres} from './geo-index.mjs';import {geographicAreaKm2} from './geographic-area.mjs';import {selectFrontierArc} from './frontier-arcs.mjs';import {replaceOutlineArc} from './replace-outline-arc.mjs';import {conform} from './regional-coverage-tools.mjs';
export const borderLakeRelations={chiuta:2259615,malombe:2631185,chilwa:4656098,amaramba:19351588};
export function borderLakeWater(){return fc(Object.entries(borderLakeRelations).map(([name,id])=>{const f=osm(JSON.parse(source(name+'-osm.json'))).features.find(f=>f.id==='relation/'+id);assert(f&&polygons(f.geometry).length&&!f.properties.tainted,'Complete lake polygon '+name);return {...f,properties:{name,source:'© OpenStreetMap contributors · ODbL 1.0'}};}));}
export async function malawiIslandLand(leaves){const national=await command(leaves,'-dissolve2'),parts=national.features.flatMap(f=>polygons(f.geometry)).map(coordinates=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates}})).sort((a,b)=>geographicAreaKm2(b.geometry)-geographicAreaKm2(a.geometry));assert(geographicAreaKm2(parts[0].geometry)>80000);return fc(parts.slice(1));}
// Correct the full shared interior before repartitioning local areas. Endpoints
// beside existing three-country junctions keep their established neighboring arcs.
export async function conformMozambiqueMalawi(leaves,reference){
 let first=0,last=reference.length-1,distance=0;while(distance<5000){distance+=metres(reference[first],reference[first+1]);first++;}distance=0;while(distance<5000){distance+=metres(reference[last],reference[last-1]);last--;}
 const canonical=reference.slice(first,last+1),outline=await command(leaves,'-dissolve2'),own=selectFrontierArc(outline,canonical).path,mask=(await replaceOutlineArc(outline,own,canonical,35000,{maxDeviationMetres:1,coastalTrimMetres:0})).regions;assert.equal(mask.features.length,1);
 const result=await conform(leaves,mask.features[0]);return {regions:result,canonical};
}

// Alignment must not turn the opposite lake shore into detached Mozambican land.
// Clip only detached pieces near these lakes to the original national source;
// the connected mainland and ocean islands keep the reconciled geometry.
export async function removeFalseMozambiqueLakeFragments(leaves){
 const national=await command(leaves,'-dissolve2'),parts=national.features.flatMap(f=>polygons(f.geometry)).map(coordinates=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates}})),boxes=borderLakeWater().features.map(f=>geographicBounds(f.geometry)),near=[],kept=[];
 for(const f of parts){const b=geographicBounds(f.geometry),local=geographicAreaKm2(f.geometry)<10000&&boxes.some(a=>b[0][0]<a[1][0]+.05&&b[1][0]>a[0][0]-.05&&b[0][1]<a[1][1]+.05&&b[1][1]>a[0][1]-.05);(local?near:kept).push(f);}
 if(!near.length)return leaves;const original=JSON.parse(source('moz-adm1.geojson')),clipped=await command({'parts.json':fc(near),'original.json':original},'-clip original.json -clean gap-fill-area=0'),mask=fc([...kept,...clipped.features.filter(f=>f.geometry)]);
 console.log('Checked',near.length,'detached lake-area pieces against the original Mozambique outline');return command({'local.json':leaves,'mask.json':mask},'-clip mask.json -clean gap-fill-area=0');
}
