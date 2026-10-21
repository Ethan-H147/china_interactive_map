import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,linesOf,lineIndex,metres} from './geo-index.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
export const pair='DEU-DNK',sourceRoot='scripts/boundary-sources/germany-denmark';
export function officialBorder(){
 const meta=load(sourceRoot+'/sources.json'),raw=gunzipSync(fs.readFileSync(sourceRoot+'/bkg-vg25-lines.geojson.gz'));
 assert.equal(createHash('sha256').update(raw).digest('hex'),meta.sha256,'Pinned BKG reference');
 const data=JSON.parse(raw),paths=joinReferencePaths(linesOf({...data,features:data.features.filter(f=>f.properties.agz===1)}));
 assert.equal(paths.length,1,'Official border reference is connected');const path=paths[0];return path[0][0]<path.at(-1)[0]?path:path.reverse();
}
function project(path,p){
 let best;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],c=Math.cos(p[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*c*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),q=[a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])],distance=metres(p,q);if(!best||distance<best.distance)best={position:i-1+u,distance};}return best;
}
export function germanyDenmarkFrontier(germany,denmark,national){
 const refs=joinReferencePaths(linesOf({features:national.filter(f=>f.properties.TYPE!=='Water Indicator'&&['DEU','DNK'].every(c=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(c)))}));assert.equal(refs.length,1);
 // The Danish coastline supplies the land endpoint: Natural Earth's endpoint in
 // Flensburg harbour is south of the actual border and cannot select Germany's arc.
 const maskFile='scripts/boundary-sources/denmark/atlas-land-mask.geojson.gz';
 const referenceLand=fs.existsSync(maskFile)?load(maskFile):denmark;
 let land=selectFrontierArc(referenceLand,refs[0]).path;if(land[0][0]>land.at(-1)[0])land=land.reverse();
 const danishEdge=lineIndex(denmark.features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()));assert(land.every(p=>danishEdge(p)<1),'Pinned land frontier remains on the Danish outline');
 const counterpart=selectFrontierArc(germany,land).path,toLand=lineIndex([land]),toOther=lineIndex([counterpart]);assert(land.every(p=>toOther(p)<1)&&counterpart.every(p=>toLand(p)<1),'Both countries use the same municipal land frontier');
 const reference=officialBorder(),west=project(reference,land[0]),east=project(reference,land.at(-1));assert(west.position<east.position);assert(west.distance<100&&east.distance<100,'GISCO land endpoints meet the official border within 100 metres');
 const marineWest=[...reference.slice(0,Math.ceil(west.position)),land[0]],marineEast=[land.at(-1),...reference.slice(Math.floor(east.position)+1)];
 const features=[['land',land],['water',marineWest],['water',marineEast]].map(([boundaryType,coordinates])=>({type:'Feature',properties:{countries:['germany'],pair,boundaryType,reference:boundaryType==='land'?'shared GISCO municipal topology':'BKG VG25 international boundary'},geometry:{type:'LineString',coordinates}}));
 const report={pair,method:'Shared municipality-derived land frontier, separate BKG VG25 sea boundaries; sea endpoints join the displayed GISCO shoreline.',landVertices:land.length,landEndpoints:[land[0],land.at(-1)],officialShoreEndpointErrorMetres:{west:west.distance,east:east.distance},bkgSource:sourceRoot+'/sources.json'};
 return {data:lineData({type:'FeatureCollection',features}),report};
}
