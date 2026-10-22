import assert from 'node:assert/strict';
import {load,linesOf,metres,lineIndex} from './geo-index.mjs';
import {internationalBorderPaint,borderIndex,liesOnBorder} from '../dist/adaptive-lines.mjs';
import {segmentKey} from './frontier-arcs.mjs';
const atlas=load('dist/data/atlas-frontiers.bin'),resolved=atlas.features.filter(f=>f.properties.resolvedFrontier);
const expected={'BRA-PRY':[1300,1450],'ARG-PRY':[1950,2100],'PRY-BOL':[700,800],'PER-ECU':[1400,1650],'PER-COL':[1400,1650]};
assert.equal(internationalBorderPaint()['line-opacity'],1,'International borders never fade according to fragment size');
const keys=new Set();
for(const [pair,[min,max]] of Object.entries(expected)){
 const features=resolved.filter(f=>f.properties.resolvedFrontier===pair),paths=linesOf({features});
 assert(features.length,pair+' has a shared canonical route');
 assert(features.every(f=>!f.properties.claimedBy&&!f.properties.claimants),pair+' is visible from every country');
 const km=paths.reduce((s,p)=>s+p.slice(1).reduce((n,q,i)=>n+metres(p[i],q),0),0)/1000;
 assert(km>min&&km<max,pair+' retains the complete detailed frontier');
 const expectedEnds=load('dist/data/frontier-continuity.json').frontiers.find(f=>f.pair===pair).endpoints;
 const allPaths=linesOf({features:atlas.features.filter(f=>!f.properties.claimedBy)});
 for(const path of paths)for(const point of [path[0],path.at(-1)]){
  if(expectedEnds.some(end=>metres(point,end)<2))continue;
  assert(lineIndex(allPaths.filter(other=>other!==path))(point)<2,pair+' has no uncovered break: shared junction edges are stored only once');
 }
 for(const path of paths)for(let i=1;i<path.length;i++){const key=segmentKey(path[i-1],path[i]);assert(!keys.has(key),'Canonical edges are stored once');keys.add(key);}
}
const graph=linesOf({features:atlas.features.filter(f=>!f.properties.claimedBy)});
for(const feature of resolved.filter(f=>['BRA-PRY','ARG-PRY','PRY-BOL'].includes(f.properties.resolvedFrontier)))for(const path of linesOf({features:[feature]}))for(const point of [path[0],path.at(-1)])assert(lineIndex(graph.filter(other=>other!==path))(point)<2,'Resolved frontiers connect to the international-border graph');
const index=borderIndex({type:'FeatureCollection',features:resolved},2);
const other=[...atlas.features.filter(f=>!f.properties.resolvedFrontier),...load('dist/data/europe/paraguay/international.bin').features,...load('dist/data/europe/peru/international.bin').features];
let doubled=0;
for(const path of linesOf({features:other}))for(let i=1;i<path.length;i++)if(metres(path[i-1],path[i])>5&&liesOnBorder(index,path[i-1],path[i]))doubled++;
assert.equal(doubled,0,'Other international sources do not redraw resolved edges');
const north=resolved.filter(f=>f.properties.referenceOwner==='peru'),ends=linesOf({features:north}).flatMap(p=>[p[0],p.at(-1)]);
assert(ends.some(p=>p[0]<-80&&p[1]>-4),'Peru north reaches the Pacific end');
assert(ends.some(p=>p[0]>-70&&p[1]<-4),'Peru north reaches the Brazil tripoint');
console.log('Five continuous frontier routes: complete lengths, connected pieces/tripoints, unique edges, no source redraw and full-opacity strokes passed.');

// An unrelated political stroke must keep its original representation and pin.
const untouched={type:'FeatureCollection',features:[{type:'Feature',properties:{resolvedFrontier:'OTHER'},geometry:{type:'LineString',coordinates:[[0,0],[1,0]]}}]};
assert.deepEqual((await import('./frontier-arcs.mjs')).removeArcSegments(untouched,new Set()),untouched,'Unchanged frontiers retain their exact structure');
