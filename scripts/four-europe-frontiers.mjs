import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,polygons,linesOf,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {save} from './central-europe-frontiers.mjs';
import {joinReferencePaths,selectFrontierArc,pointKey} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {additions} from './four-europe-config.mjs';
import {root} from './fetch-four-europe.mjs';
import {croatiaMontenegroLandArc} from './croatia-montenegro-land.mjs';
import {romanianBalkanLandArc} from './balkan-frontier-endpoints.mjs';
const pair=(a,b)=>[a,b].sort().join('-');
export async function resolveFourEurope(prepared){
 const codes={...Object.fromEntries(Object.entries(additions).map(([c,v])=>[v.iso,c])),POL:'poland',LTU:'lithuania',LVA:'latvia',UKR:'ukraine',HUN:'hungary',SVN:'slovenia',RUS:'russia'},newCodes=new Set(Object.values(additions).map(c=>c.iso));
 const refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),groups=new Map();
 for(const f of refs.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.some(c=>newCodes.has(c)))continue;const key=pair(...sides);if(!groups.has(key))groups.set(key,{key,sides,paths:[]});groups.get(key).paths.push(...linesOf(fc([f])));}
 for(const g of groups.values())g.paths=joinReferencePaths(g.paths);
 const outlines=new Map();for(const [iso,country]of Object.entries(codes)){const d=prepared.find(d=>d.country===country),file='dist/data/'+(country==='russia'?'russia/':'europe/'+country+'/')+'first.bin';outlines.set(iso,await command(d?d.bottom:load(file).regions,'-dissolve'));}
 const priority=['POL','LTU','LVA','UKR','HUN','SVN','RUS','HRV','ROU','BLR','BIH'],canonical=[],fixed=[];
 for(const g of groups.values()){const existing=priority.find(c=>g.sides.includes(c)&&!newCodes.has(c));if(!existing)continue;const country=codes[existing],base='dist/data/'+(country==='russia'?'russia/':'europe/'+country+'/'),all=load(base+'international.bin');let features=all.features.filter(f=>f.properties.pair&&pair(...f.properties.pair.split('-'))===g.key),paths=joinReferencePaths(linesOf(fc(features)));
  if(!paths.length)paths=g.paths.map(ref=>selectFrontierArc(outlines.get(existing),ref,{maximumScoreMetres:20000}).path);
  for(const path of paths){fixed.push(path[0],path.at(-1));canonical.push({type:'Feature',properties:{pair:g.key,countries:country,existingOwner:true},geometry:{type:'LineString',coordinates:path}});}
 }
 const nearest=(iso,p)=>outlines.get(iso).features.flatMap(f=>polygons(f.geometry).map(p=>p[0])).flat().reduce((best,q)=>!best||metres(q,p)<metres(best,p)?q:best,null),anchors=new Map();
 for(const g of groups.values())for(const ref of g.paths)for(const p of [ref[0],ref.at(-1)]){const k=pointKey(p);if(anchors.has(k))continue;const near=fixed.filter(q=>metres(p,q)<12000).sort((a,b)=>metres(a,p)-metres(b,p));if(near.length){anchors.set(k,near[0]);continue;}const touching=[...groups.values()].filter(x=>x.paths.some(path=>[path[0],path.at(-1)].some(q=>metres(p,q)<2))),sides=new Set(touching.flatMap(x=>x.sides)),owner=priority.find(c=>sides.has(c));anchors.set(k,nearest(owner,p));}
 for(const g of groups.values()){if(canonical.some(f=>f.properties.pair===g.key))continue;const owner=priority.find(c=>g.sides.includes(c));for(const ref of g.paths){const guide=ref.slice();guide[0]=anchors.get(pointKey(ref[0]));guide[guide.length-1]=anchors.get(pointKey(ref.at(-1)));const path=selectFrontierArc(outlines.get(owner),guide,{maximumScoreMetres:20000}).path;path[0]=guide[0];path[path.length-1]=guide.at(-1);canonical.push({type:'Feature',properties:{pair:g.key,countries:codes[owner],existingOwner:false},geometry:{type:'LineString',coordinates:path}});}}
 for(const f of canonical.filter(f=>f.properties.pair==='HRV-MNE'))f.geometry.coordinates=croatiaMontenegroLandArc(outlines.get('HRV'),f.geometry.coordinates);
 for(const f of canonical.filter(f=>['BGR-ROU','ROU-SRB'].includes(f.properties.pair)))f.geometry.coordinates=romanianBalkanLandArc(outlines.get('ROU'),f.geometry.coordinates);
 save(root+'resolved.bin',fc(canonical));
 for(const d of prepared.sort((a,b)=>priority.indexOf(additions[a.country].iso)-priority.indexOf(additions[b.country].iso))){const iso=additions[d.country].iso,paths=canonical.filter(f=>f.properties.pair.split('-').includes(iso)),neighbors=new Set(paths.filter(f=>f.properties.countries!==d.country).map(f=>f.properties.countries)),foreign=fc([...neighbors].flatMap(country=>{const code=Object.keys(codes).find(k=>codes[k]===country);return (prepared.find(p=>p.country===country)?.bottom||outlines.get(code)).features;}));if(foreign.features.length)d.bottom=await command({'own.json':d.bottom,'foreign.json':foreign},'-erase foreign.json -clean gap-fill-area=0');for(const f of paths){console.log('Aligning',d.country,f.properties.pair,f.geometry.coordinates.length);d.bottom=(await alignArc(d.bottom,f.geometry.coordinates,{maxDeviationMetres:5,coastalTrimMetres:2500,maxDistance:25000,maxSelectionMetres:22000})).regions;}save(root+d.country+'-aligned.bin',d.bottom);}
 assert(canonical.length>10);return canonical;
}
