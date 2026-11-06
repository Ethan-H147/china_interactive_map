// Historical snapshots drawn along whole present-day pieces (districts, counties), shared by the
// Korea and China histories (build-korea-history.mjs, build-china-history.mjs). Each piece is
// given one unit per snapshot; pieces with the same units in every snapshot are dissolved into
// faces, and the faces, their edges and one configuration per snapshot are written in the format
// of the United States and Canada histories (dist/historic-borders.mjs).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {command,fc,geographicBounds,sharedBorders} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {landIndex} from './geo-index.mjs';
import {selectionLineData} from '../dist/outline-detail.mjs';
const require=createRequire(import.meta.url),{topology}=require('topojson-server'),{feature}=require('topojson-client'),clip=require('polygon-clipping');

export const polygons=g=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
export const area=list=>list.length?geographicAreaKm2({type:'MultiPolygon',coordinates:list}):0;
const box=list=>{const b=[Infinity,Infinity,-Infinity,-Infinity];for(const polygon of list)for(const [x,y] of polygon[0]){if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}return b;};
const apart=(a,b)=>a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1];
export const centre=piece=>{const ring=piece.polygons.reduce((a,b)=>a[0].length>b[0].length?a:b)[0];return ring.reduce(([x,y],[a,b])=>[x+a/ring.length,y+b/ring.length],[0,0]);};
const distance=([a,b],[x,y])=>Math.hypot((a-x)*Math.cos(y*Math.PI/180),b-y);

// Each piece takes the reference unit covering most of it. With uncovered, land outside every
// reference polygon competes too, so a piece mostly outside them is left unassigned (undefined).
// shape gives the polygons measured (a simplified copy speeds up large pieces). Returns the
// pieces no reference polygon touches.
export function largestCover(pieces,reference,{field,uncovered=false,shape=piece=>piece.polygons}){
 const boxes=reference.map(r=>box(r.polygons)),outside=[];
 for(const piece of pieces){
  const own=shape(piece),b=box(own);
  const shares=reference.map((r,i)=>[r.unit,apart(b,boxes[i])?0:area(clip.intersection(own,r.polygons))]).sort((a,b)=>b[1]-a[1]);
  const rest=uncovered?area(own)-shares.reduce((n,[,a])=>n+a,0):0;
  piece[field]=shares[0][1]>0&&shares[0][1]>rest?shares[0][0]:undefined;
  if(!(shares[0][1]>0))outside.push(piece);
 }
 return outside;
}
// Pieces still unassigned (undefined, not null) that only allows take the unit of the nearest
// assigned piece, if it lies within limit degrees: by default measured between ring centres,
// or by distance(piece, assigned piece).
export function nearestUnit(pieces,field,{limit=Infinity,only=()=>true,distance:between}={}){
 const assigned=pieces.filter(p=>p[field]).map(p=>({unit:p[field],at:centre(p),piece:p}));
 for(const piece of pieces)if(piece[field]===undefined&&only(piece)){
  const at=centre(piece),[unit,d]=assigned.reduce((best,a)=>{const d=between?between(piece,a.piece):distance(a.at,at);return d<best[1]?[a.unit,d]:best;},[null,Infinity]);
  if(d<=limit)piece[field]=unit;
 }
}

// Discard a cartographic seam if a short probe on both sides of it
// remains inside the same historical division.
function boundaryRuns(geometry,owners){
 const paths=geometry.type==='MultiLineString'?geometry.coordinates:[geometry.coordinates];
 return paths.flatMap(path=>{
  const runs=[];let run=[];
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
   const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,offset=.00009/length;
   const internal=length&&owners.some(inside=>inside([x-dy*offset,y+dx*offset])&&inside([x+dy*offset,y-dx*offset]));
   if(internal){if(run.length)runs.push(run);run=[];continue;}
   if(!length)continue;
   if(!run.length)run.push(a);
   run.push(b);
  }
  if(run.length)runs.push(run);
  return runs;
 });
}

export function cleanFrontier(frontier,regions){
 const inside=landIndex(regions.features.flatMap(f=>polygons(f.geometry)).flat());
 return fc(frontier.features.map(f=>({...f,geometry:{type:'MultiLineString',coordinates:boundaryRuns(f.geometry,[inside])}})));
}

// snapshots: [{year,date,field,units}], each piece holding its unit key (or nothing) under field.
// firstLevel: the present-day first level, [{id,polygons}], for coverage and partOf; partOf
// (snapshot,units,dissolved) may replace the default measure, which intersects each present-day
// unit with each historical one.
export async function writeMosaic({pieces,snapshots,firstLevel,partOf:partOfFor,source,label,out,tolerance=.5,cleanRoundedFaces=false}){
 const pieceFeatures=fc(pieces.map(p=>({type:'Feature',properties:{face:snapshots.map(s=>p[s.field]||'-').join('|')+(p.external?'|outside':'')},geometry:{type:'MultiPolygon',coordinates:p.polygons}})));
 const rounded=await command(pieceFeatures,'-dissolve2 face',{precision:.000001});
 const mesh=cleanRoundedFaces?await command(rounded,'-clean gap-width=0',{precision:null}):rounded;
 const faces=mesh.features.filter(f=>f.geometry).sort((a,b)=>a.properties.face.localeCompare(b.properties.face));
 const t=topology({faces:fc(faces)}),sides=new Map();
 t.objects.faces.geometries.forEach((g,i)=>{for(const a of g.arcs.flat(Infinity)){const k=a<0?~a:a;sides.set(k,[...(sides.get(k)||[]),i]);}});
 // A ring can retrace a quantized edge. Keep it internal to that face and
 // count distinct faces when checking for an actual overlap.
 for(const [arc,uses] of sides){
  const owners=[...new Set(uses)];
  sides.set(arc,owners.length===1&&uses.length>1?[owners[0],owners[0]]:owners);
 }
 const overlap=[...sides].find(([,list])=>list.length>2);
 if(overlap){const [arc,list]=overlap;assert.fail('Every edge separates at most two faces near '+JSON.stringify(t.arcs[arc][0])+' ('+list.map(i=>faces[i].properties.face).join(', ')+')');}
 const arcs=[...sides].map(([arc,[l,r=-1]])=>({arc,l,r,geometry:feature(t,{type:'LineString',arcs:[arc]}).geometry}));

 const inside=faces.map(f=>!f.properties.face.endsWith('|outside'));
 const configs=[],versions=[],borders=[];
 for(const [n,s] of snapshots.entries()){
  const keys=Object.keys(s.units).filter(key=>pieces.some(p=>p[s.field]===key));
  assert.equal(keys.length,Object.keys(s.units).length,'Every '+s.field+' unit has land');
  const regions=fc(keys.map(key=>({type:'Feature',properties:{id:key},geometry:{type:'MultiPolygon',coordinates:s.dissolvedBoundaries?faces.filter(f=>f.properties.face.split('|')[n]===key).flatMap(f=>polygons(f.geometry)):pieces.filter(p=>p[s.field]===key).flatMap(p=>p.polygons)}})));
  const dissolved=await command(regions,s.dissolvedBoundaries?'-dissolve2 id -clean gap-width=35m close-outer-gaps':'-dissolve2 id',{precision:.000001}),labels=new Map((await command(dissolved,'-points inner',{precision:null})).features.map(f=>[f.properties.id,f.geometry.coordinates.map(v=>+v.toFixed(4))]));
  const units=dissolved.features.map(f=>{const key=f.properties.id;versions.push({id:versions.length,key,name:s.units[key].name,type:s.units[key].type,start:s.date,end:s.date});return {id:key,key,...s.units[key],label:labels.get(key),bounds:geographicBounds(f.geometry)};});
  const index=new Map(units.map((u,i)=>[u.key,i]));
  const face=faces.map(f=>{const key=f.properties.face.split('|')[n];return key==='-'?-1:index.get(key);});
  const lines=[],frontiers=[];let selectionLines;
  if(s.dissolvedBoundaries){
   const tests=new Map(dissolved.features.map(f=>[f.properties.id,landIndex(polygons(f.geometry).flat())]));
   const selectionRegions=units.some(u=>u.selectionGroup)?await command(fc(dissolved.features.map(f=>{
    const id=f.properties.id;
    return {...f,properties:{id:s.units[id].selectionGroup||id}};
   })),'-dissolve2 id -clean gap-width=35m close-outer-gaps',{precision:.000001}):dissolved;
   selectionLines=Object.fromEntries(selectionRegions.features.map(f=>{
    const id=f.properties.id,inside=landIndex(polygons(f.geometry).flat());
    const lines=selectionLineData(fc([f])).features.flatMap(line=>
     boundaryRuns(line.geometry,[inside]).map(coordinates=>({...line,geometry:{type:'LineString',coordinates}})));
    return [id,fc(lines)];
   }));
   for(const edge of sharedBorders(dissolved).features){
    const [left,right]=edge.properties.owners.map(id=>index.get(id));
    for(const coordinates of boundaryRuns(edge.geometry,edge.properties.owners.map(id=>tests.get(id)))){
     const arc=t.arcs.length+arcs.length;
     arcs.push({arc,l:face.indexOf(left),r:face.indexOf(right),drawOnly:true,geometry:{type:'LineString',coordinates}});
     (s.frontierBetween?.(units[left],units[right])?frontiers:lines).push(arc);
    }
   }
  }else for(const a of arcs)if(!a.drawOnly&&a.r>=0&&face[a.l]!==face[a.r]&&(s.frontier?face[a.l]>=0&&face[a.r]>=0:inside[a.l]&&inside[a.r])){
   const frontier=s.frontierBetween?.(units[face[a.l]],units[face[a.r]]);
   (frontier?frontiers:lines).push(a.arc);
  }
  const frontier=s.frontier&&s.dissolvedBoundaries?cleanFrontier(s.frontier,dissolved):s.frontier;
  const borderIds=frontier?.features.map(f=>{const b=borders.length;borders.push({...f,properties:{b}});return b;})||[];
  // A present-day unit selected without a click shows the historical unit covering most of it.
  let partOf={};
  if(partOfFor)partOf=partOfFor(s,units,dissolved);
  else for(const p of firstLevel){const best=units.map((u,i)=>[i,area(clip.intersection(p.polygons,polygons(dissolved.features[i].geometry)))]).sort((a,b)=>b[1]-a[1])[0];if(best[1]>0)partOf[p.id]=best[0];}
  configs.push({units,face,lines,frontiers,borders:borderIds,partOf,...(s.fullLand?{fullLand:true,modernLand:inside.flatMap((yes,i)=>yes?[i]:[])}:{}),...(s.points?{points:s.points}:{}),...(selectionLines?{selectionLines}:{})});
 }

 // The snapshots cover all present-day land exactly once.
 const land=firstLevel.reduce((n,p)=>n+area(p.polygons),0),faceArea=faces.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0);
 assert(Math.abs(faceArea-land)<tolerance,'Faces cover present-day land: '+faceArea.toFixed(1)+' vs '+land.toFixed(1)+' km²');

 const precision=v=>Array.isArray(v)?v.map(precision):typeof v==='number'?+v.toFixed(6):v;
 const data={
  source,versions,
  faces:fc(faces.map((f,i)=>({type:'Feature',properties:{f:i},geometry:{type:f.geometry.type,coordinates:precision(f.geometry.coordinates)}}))),
  arcs:fc(arcs.map(a=>({type:'Feature',properties:{a:a.arc,l:a.l,r:a.r,...(a.drawOnly?{drawOnly:true}:{})},geometry:{type:a.geometry.type,coordinates:precision(a.geometry.coordinates)}}))),
  borders:fc(borders),configs,
  years:Object.fromEntries(snapshots.map((s,i)=>[s.year,{date:s.date,config:i}])),
  events:{}
 };
 fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});
 fs.writeFileSync(out,gzipSync(encodeGeo(data,{source:label},{scale:1e6}),{level:9}));
 return {faces:faces.length,edges:arcs.length,bytes:fs.statSync(out).size,land,faceArea};
}

// A written mosaic for checks: each snapshot's configuration, the unit key at a point (null where
// the land has none), every face's area, and a check that drawn lines separate different units.
export async function readMosaic(file){
 const {decodeData}=await import('../dist/geo-pack.mjs'),{landIndex}=await import('./geo-index.mjs');
 const history=await decodeData(fs.readFileSync(file));
 const faceArea=history.faces.features.map(f=>geographicAreaKm2(f.geometry));
 const faceTests=history.faces.features.map(f=>landIndex(polygons(f.geometry).flat()));
 const config=year=>history.configs[history.years[year].config];
 const unit=(year,p)=>{const face=faceTests.findIndex(test=>test(p));assert(face>=0,'Land at '+p);const i=config(year).face[face];return i>=0?config(year).units[i].key:null;};
 const arcs=new Map(history.arcs.features.map(f=>[f.properties.a,f.properties]));
 const linesSeparate=year=>{const c=config(year);return c.lines.every(a=>{const {l,r}=arcs.get(a);return r>=0&&c.face[l]!==c.face[r];});};
 return {history,config,unit,faceArea,linesSeparate};
}
