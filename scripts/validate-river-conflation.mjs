import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {alignRiver,reconcileWater,metres,measuredPath,segmentIndex} from './river-conflation.mjs';
import {reviewedPaths} from './reconcile-river-boundaries.mjs';
import {readData} from './read-data.mjs';
const path=Array.from({length:101},(_,i)=>[100+i*.01,30+Math.sin(i*.11)*.0008]);
const river=path.map(([x,y])=>[x,y+.004]);
const forward=alignRiver(river,[path]);
assert(forward.changes.length,'A long close parallel reach must reconcile');
assert.deepEqual(forward.line[0],river[0]);assert.deepEqual(forward.line.at(-1),river.at(-1));
assert(forward.line.filter(p=>path.some(q=>p[0]===q[0]&&p[1]===q[1])).length>80,'Copy canonical vertices instead of inventing a smoothed boundary');
assert(alignRiver([...river].reverse(),[path]).changes.length,'Both river directions must work');
const leaving=river.map(([x,y])=>[x,y+Math.max(0,x-100.55)*.6]);
const partial=alignRiver(leaving,[path]);assert(partial.changes.length);
for(const p of leaving.filter(p=>p[0]>100.7))assert(partial.line.some(q=>p[0]===q[0]&&p[1]===q[1]),'River must retain its independent inland course after leaving the boundary');
const crossing=Array.from({length:101},(_,i)=>[100.5,29.5+i*.01]);
assert.deepEqual(alignRiver(crossing,[path]).line,crossing,'A transverse crossing must not snap');
assert.deepEqual(alignRiver(river.slice(0,5),[path]).line,river.slice(0,5),'Short accidental proximity must not snap');
assert.deepEqual(alignRiver(river.map(([x,y])=>[x,y+.1]),[path]).changes,[],'Distant geometry must stay untouched');
const feature=(name,line)=>({type:'Feature',properties:{kind:'river',name,sourceId:name},geometry:{type:'LineString',coordinates:line}});
const tributary=feature('Tributary',[[100.5,30.3],river[50]]),lake={type:'Feature',properties:{kind:'lake',name:'Lake'},geometry:{type:'Polygon',coordinates:[[[100,30],[100.1,30],[100,30.1],[100,30]]]}};
const network=reconcileWater([feature('Main',river),tributary,lake],new Map([['Main',[path]]]));
assert(network.report.length);assert.deepEqual(network.features[1],tributary);assert.deepEqual(network.features[2],lake);
assert(network.features[0].geometry.coordinates.some(p=>p[0]===river[50][0]&&p[1]===river[50][1]),'Shared tributary junction must remain exact');
assert.deepEqual(reconcileWater([feature('Other',river)],new Map([['Main',[path]]])).features[0],feature('Other',river),'Unapproved river names must not change');

const display=readData('display-boundaries.json'),config=JSON.parse(fs.readFileSync(new URL('additional-sources/water/boundary-reaches.json',import.meta.url))),report=readData('river-boundary-report.json');
assert.equal(createHash('sha256').update(JSON.stringify(display.subdivisions)).digest('hex'),report.administrativeSha256,'Reviewed boundary snapshot must match the deployed polygons');
assert.equal(createHash('sha256').update(fs.readFileSync(new URL('additional-sources/water/boundary-reaches.json',import.meta.url))).digest('hex'),report.rulesSha256);
const {byRiver}=reviewedPaths(display.subdivisions,config);
const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/major-water.bin',import.meta.url))));
const baseline=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/major-water-original.bin',import.meta.url))));
assert.equal(data.features.length,baseline.features.length,'No rivers or lakes may be dropped');
const lines=f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
function crossings(line){
 const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let count=0;
 for(let i=1;i<line.length;i++)for(let j=i+2;j<line.length;j++){
  const a=line[i-1],b=line[i],c=line[j-1],d=line[j];
  if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))continue;
  if(orient(a,b,c)*orient(a,b,d)<-1e-20&&orient(c,d,a)*orient(c,d,b)<-1e-20)count++;
 }
 return count;
}
const nodeKey=p=>p.join(','),nodeCounts=new Map(),outputNodes=new Set();
for(const f of baseline.features.filter(f=>f.properties.kind==='river'))for(const line of lines(f))for(const p of line)nodeCounts.set(nodeKey(p),(nodeCounts.get(nodeKey(p))||0)+1);
for(const f of data.features.filter(f=>f.properties.kind==='river'))for(const line of lines(f))for(const p of line)outputNodes.add(nodeKey(p));
for(const [node,count] of nodeCounts)if(count>1)assert(outputNodes.has(node),'Every existing shared river node must survive exactly');
let preserved=0;
for(const [i,f] of data.features.entries()){
 const old=baseline.features[i];
 if(!f.properties.boundaryAligned){assert.deepEqual(f,old,'Unapproved or rejected river and lake features must be byte-equivalent');preserved++;continue;}
 assert.equal(lines(f).length,lines(old).length);
 for(const [j,line] of lines(f).entries()){
  const original=lines(old)[j];assert.deepEqual(line[0],original[0]);assert.deepEqual(line.at(-1),original.at(-1));
  assert(crossings(line)<=crossings(original),'Reconciliation must not introduce self-crossing river geometry');
  const nearOriginal=segmentIndex([measuredPath(original)],2500);
  for(const p of line)assert(nearOriginal(p),'Adjusted river exceeds its bounded source corridor');
 }
}
// Every reported shared stretch must exist on the specified river and reviewed
// administrative edge, including the exact copied intervening vertices.
let copied=0;
for(const reach of report.reaches){
 assert(reach.maxDisplacementMetres<=2500);assert(reach.meanDisplacementMetres<=1200);assert(reach.alignedMetres>=4000);
 const rule=config.rules.find(r=>r.id===reach.rule);assert(rule&&rule.river===reach.river);
 const canonical=segmentIndex(byRiver.get(reach.river).map(measuredPath),.01);
 const f=data.features[reach.featureIndex],line=lines(f)[reach.lineIndex],a=line.findIndex(p=>metres(p,reach.start)<.001),b=line.findIndex(p=>metres(p,reach.end)<.001);
 assert(a>=0&&b>a,'Reported reach endpoints must exist in the output');
 for(const p of line.slice(a,b+1)){assert(canonical(p),'Shared reach diverged from the canonical boundary');copied++;}
}
assert(report.reaches.some(r=>r.rule==='yellow-shaanxi-shanxi-gorge'));
assert(report.reaches.some(r=>r.rule==='yangtze-huangshi-huanggang'));
// Explicitly unreviewed lower Yangtze channels must remain unchanged.
assert.deepEqual(data.features.find(f=>f.properties.sourceId==='osm-relation-9392345'),baseline.features.find(f=>f.properties.sourceId==='osm-relation-9392345'));
console.log(`River reconciliation validated: ${report.reaches.length} reviewed stretches, ${report.alignedKilometres} km, ${copied} shared vertices; ${preserved} features unchanged. Crossing, inland departure, direction, confluences, extent and lake regressions passed.`);
