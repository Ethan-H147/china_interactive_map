import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {topology} from 'topojson-server';
import {mesh} from 'topojson-client';
import {reconcileWater} from './river-conflation.mjs';
const rulesUrl=new URL('additional-sources/water/boundary-reaches.json',import.meta.url);
export function reviewedPaths(subdivisions,config){
 const t=topology({regions:subdivisions}),byRiver=new Map(),pathRules=new Map();
 for(const rule of config.rules){
  const pair=(a,b,field,wanted)=>[a.properties[field],b.properties[field]].sort((a,b)=>a-b).join(',')===[...wanted].sort((a,b)=>a-b).join(',');
  const shared=mesh(t,t.objects.regions,(a,b)=>a!==b&&(rule.regionPair?pair(a,b,'adcode',rule.regionPair):pair(a,b,'provinceCode',rule.provincePair)));
  const allowed=p=>!rule.bounds||(p[0]>=rule.bounds[0]&&p[1]>=rule.bounds[1]&&p[0]<=rule.bounds[2]&&p[1]<=rule.bounds[3]);
  const paths=[];
  for(const line of shared.coordinates){let current=[];for(let i=1;i<line.length;i++){if(allowed(line[i-1])&&allowed(line[i])){if(!current.length)current.push(line[i-1]);current.push(line[i]);}else{if(current.length>1)paths.push(current);current=[];}}if(current.length>1)paths.push(current);}
  if(!byRiver.has(rule.river)){byRiver.set(rule.river,[]);pathRules.set(rule.river,[]);}
  byRiver.get(rule.river).push(...paths);pathRules.get(rule.river).push(...paths.map(()=>rule.id));
 }
 return{byRiver,pathRules};
}
export function reconcileRiverBoundaries(features,display){
 const bytes=fs.readFileSync(rulesUrl),config=JSON.parse(bytes),{byRiver,pathRules}=reviewedPaths(display.subdivisions,config);
 const result=reconcileWater(features,byRiver);
 for(const reach of result.report){reach.rule=pathRules.get(reach.river)[reach.pathId];delete reach.pathId;}
 const report={method:'The optional river overlay reuses existing shared administrative vertices only within reviewed river/region pairs. Matching requires a continuous parallel run of at least 8 km, displacement at most 2.5 km and average at most 1.2 km, monotonic traversal, bounded detours and bidirectional proximity. The first and last 1 km of each accepted run taper inside the reviewed reach. Source endpoints and all shared river junctions remain fixed. Selectable administrative geometry is unchanged.',settings:{sampleMetres:250,minRunMetres:8000,maxDisplacementMetres:2500,maxMeanDisplacementMetres:1200,taperMetres:1000,minDirectionalAgreement:.8,maxStretch:1.8},scope:config,rulesSha256:createHash('sha256').update(bytes).digest('hex'),administrativeSha256:createHash('sha256').update(JSON.stringify(display.subdivisions)).digest('hex'),reaches:result.report,alignedKilometres:Math.round(result.report.reduce((s,r)=>s+r.alignedMetres,0)/1000)};
 return{features:result.features,report};
}
