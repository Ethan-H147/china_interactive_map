import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,polygons,linesOf,metres} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {save} from './central-europe-frontiers.mjs';
import {joinReferencePaths,selectFrontierArc,pointKey} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {additions} from './balkans-config.mjs';
import {root} from './fetch-balkans.mjs';
import {source} from './fetch-balkans.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {croatiaMontenegroLandArc} from './croatia-montenegro-land.mjs';
const pair=(a,b)=>[a,b].sort().join('-');
export async function resolveBalkans(prepared){
 const codes={...Object.fromEntries(Object.entries(additions).map(([c,v])=>[v.iso,c])),HRV:'croatia',BIH:'bosnia-herzegovina',ROU:'romania',HUN:'hungary',GRC:'greece',TUR:'turkey'},newCodes=new Set(Object.values(additions).map(c=>c.iso));
 const refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),groups=new Map();
 for(const f of refs.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.some(c=>newCodes.has(c)))continue;const key=pair(...sides);if(!groups.has(key))groups.set(key,{key,sides,paths:[]});groups.get(key).paths.push(...linesOf(fc([f])));}
 for(const g of groups.values())g.paths=joinReferencePaths(g.paths);
 const raw=JSON.parse(source('lau2024.geojson')).features,points=c=>new Set(raw.filter(f=>f.properties.CNTR_CODE===c).flatMap(f=>polygons(f.geometry).flat(2)).map(pointKey)),serbianPoints=points('RS'),bulgarianPoints=points('BG'),romanianPoints=new Set(load('dist/data/europe/romania/first.bin').regions.features.flatMap(f=>polygons(f.geometry).flat(2)).map(pointKey)),joint=[...serbianPoints].filter(p=>bulgarianPoints.has(p)&&romanianPoints.has(p));assert.equal(joint.length,1,'Unique shared GISCO Romania–Serbia–Bulgaria junction');const romanianTripoint=joint[0].split(',').map(Number);
 const outlines=new Map();for(const [iso,country]of Object.entries(codes)){const d=prepared.find(d=>d.country===country),file='dist/data/'+(country==='russia'?'russia/':'europe/'+country+'/')+'first.bin';outlines.set(iso,await command(d?d.bottom:load(file).regions,'-dissolve'));}
 const priority=['HRV','ROU','HUN','BIH','GRC','TUR','SRB','BGR','ALB','MKD','MNE','KOS'],canonical=[],fixed=[];
 for(const g of groups.values()){const existing=priority.find(c=>g.sides.includes(c)&&!newCodes.has(c));if(!existing)continue;const country=codes[existing],base='dist/data/'+(country==='russia'?'russia/':'europe/'+country+'/'),all=load(base+'international.bin');let features=all.features.filter(f=>f.properties.pair&&pair(...f.properties.pair.split('-'))===g.key),paths=joinReferencePaths(linesOf(fc(features)));
  if(!paths.length)paths=g.paths.map(ref=>selectFrontierArc(outlines.get(existing),ref,{maximumScoreMetres:20000}).path);
  if(['BGR-ROU','ROU-SRB'].includes(g.key)){
   paths=paths.map(path=>{const guide=path.slice();if(metres(guide[0],romanianTripoint)<metres(guide.at(-1),romanianTripoint))guide[0]=romanianTripoint;else guide[guide.length-1]=romanianTripoint;return selectFrontierArc(outlines.get('ROU'),guide).path;});
   const replacement=paths.map(path=>({type:'Feature',properties:{pair:g.key,countries:'romania',junction:'Exact shared GISCO local/region vertex'},geometry:{type:'LineString',coordinates:path}}));save(base+'international.bin',lineData(fc([...load(base+'international.bin').features.filter(f=>f.properties.pair!==g.key),...replacement])));
   const priorFile='scripts/boundary-sources/four-europe/resolved.bin',prior=load(priorFile);prior.features=prior.features.filter(f=>f.properties.pair!==g.key);prior.features.push(...replacement);save(priorFile,prior);
  }
  if(g.key==='HRV-MNE'){
   paths=[croatiaMontenegroLandArc(outlines.get(existing),paths[0])];
   // Retain Croatia's existing display survey and tripoint, but stop its land
   // frontier at the shared-way coast endpoint instead of tracing Prevlaka.
   const replacement={type:'Feature',properties:{pair:'HRV-MNE',countries:'croatia',coastalEndpoint:'Shared OSM country/municipal ways select the end of the existing Croatian land arc'},geometry:{type:'LineString',coordinates:paths[0]}};
   save(base+'international.bin',lineData(fc([...all.features.filter(f=>f.properties.pair!=='HRV-MNE'),replacement])));
   const priorFile='scripts/boundary-sources/four-europe/resolved.bin',prior=load(priorFile);prior.features=prior.features.map(f=>f.properties.pair==='HRV-MNE'?replacement:f);save(priorFile,prior);
  }
  for(const path of paths){fixed.push(path[0],path.at(-1));canonical.push({type:'Feature',properties:{pair:g.key,countries:country,existingOwner:true},geometry:{type:'LineString',coordinates:path}});}
 }
 const nearest=(iso,p)=>outlines.get(iso).features.flatMap(f=>polygons(f.geometry).map(p=>p[0])).flat().reduce((best,q)=>!best||metres(q,p)<metres(best,p)?q:best,null),anchors=new Map();
 for(const g of groups.values())for(const ref of g.paths)for(const p of [ref[0],ref.at(-1)]){const k=pointKey(p);if(anchors.has(k))continue;const near=fixed.filter(q=>metres(p,q)<12000).sort((a,b)=>metres(a,p)-metres(b,p));if(near.length){anchors.set(k,near[0]);continue;}const touching=[...groups.values()].filter(x=>x.paths.some(path=>[path[0],path.at(-1)].some(q=>metres(p,q)<2))),sides=new Set(touching.flatMap(x=>x.sides)),owner=priority.find(c=>sides.has(c));anchors.set(k,nearest(owner,p));}
 const nuts=JSON.parse(source('nuts2024.geojson')).features,sourceSets=code=>new Set((raw.some(f=>f.properties.CNTR_CODE===code)?raw.filter(f=>f.properties.CNTR_CODE===code):nuts.filter(f=>f.properties.CNTR_CODE===code&&f.properties.LEVL_CODE===0)).flatMap(f=>polygons(f.geometry).flat(2)).map(pointKey)),verified=[];
 for(const [sides,codeList]of [[['ALB','MKD','KOS'],['AL','MK','XK']],[['BGR','MKD','SRB'],['BG','MK','RS']]]){const sets=codeList.map(sourceSets),shared=[...sets[0]].filter(p=>sets.slice(1).every(set=>set.has(p)));assert.equal(shared.length,1,'Exact shared GISCO junction '+sides.join('-'));verified.push({sides,point:shared[0].split(',').map(Number),evidence:'Vertex present in all three retained GISCO country/local geometries'});}
 for(const g of groups.values())for(const ref of g.paths)for(const p of [ref[0],ref.at(-1)]){const touching=new Set([...groups.values()].filter(x=>x.paths.some(path=>[path[0],path.at(-1)].some(q=>metres(p,q)<2))).flatMap(x=>x.sides)),pin=verified.find(v=>v.sides.every(c=>touching.has(c)));if(pin)anchors.set(pointKey(p),pin.point);}
 fs.writeFileSync(root+'verified-junctions.json',JSON.stringify({method:'Exact shared source vertices replace approximate Natural Earth junction locators. No geographic coordinates are invented.',junctions:[...verified,{sides:['ROU','SRB','BGR'],point:romanianTripoint,evidence:'Vertex present in the retained Romanian regional outline and both Serbian and Bulgarian local sources'}]},null,2)+'\n');
 for(const g of groups.values()){if(canonical.some(f=>f.properties.pair===g.key))continue;const owner=priority.find(c=>g.sides.includes(c));for(const ref of g.paths){const guide=ref.slice();guide[0]=anchors.get(pointKey(ref[0]));guide[guide.length-1]=anchors.get(pointKey(ref.at(-1)));const path=selectFrontierArc(outlines.get(owner),guide,{maximumScoreMetres:20000}).path;path[0]=guide[0];path[path.length-1]=guide.at(-1);canonical.push({type:'Feature',properties:{pair:g.key,countries:codes[owner],existingOwner:false},geometry:{type:'LineString',coordinates:path}});}}
 save(root+'resolved.bin',fc(canonical));
 for(const d of prepared.sort((a,b)=>priority.indexOf(additions[a.country].iso)-priority.indexOf(additions[b.country].iso))){const iso=additions[d.country].iso,paths=canonical.filter(f=>f.properties.pair.split('-').includes(iso)),neighbors=new Set(paths.filter(f=>f.properties.countries!==d.country).map(f=>f.properties.countries)),foreign=fc([...neighbors].flatMap(country=>{const code=Object.keys(codes).find(k=>codes[k]===country);return (prepared.find(p=>p.country===country)?.bottom||outlines.get(code)).features;}));if(process.argv.includes('--continue')&&fs.existsSync(root+d.country+'-aligned.bin'))d.bottom=load(root+d.country+'-aligned.bin');else{if(foreign.features.length)d.bottom=await command({'own.json':d.bottom,'foreign.json':foreign},'-erase foreign.json -clean gap-fill-area=0');for(const f of paths){console.log('Aligning',d.country,f.properties.pair,f.geometry.coordinates.length);d.bottom=(await alignArc(d.bottom,f.geometry.coordinates,{maxDeviationMetres:5,coastalTrimMetres:2500,maxDistance:25000,maxSelectionMetres:22000})).regions;}save(root+d.country+'-aligned.bin',d.bottom);}
  const cornerPairs={kosovo:['ALB-KOS','KOS-MKD'],bulgaria:['BGR-MKD','BGR-SRB']}[d.country];if(cornerPairs){const joined=joinReferencePaths(canonical.filter(f=>cornerPairs.includes(f.properties.pair)).map(f=>f.geometry.coordinates));assert.equal(joined.length,1,'Contiguous two-frontier junction '+d.country);console.log('Preserving complete junction',d.country);d.bottom=(await alignArc(d.bottom,joined[0],{maxDeviationMetres:5,coastalTrimMetres:2500,maxDistance:25000,maxSelectionMetres:22000})).regions;save(root+d.country+'-aligned.bin',d.bottom);}
  const outline=await command(d.bottom,'-dissolve');for(const f of canonical.filter(f=>f.properties.countries===d.country)){const old=f.geometry.coordinates,next=selectFrontierArc(outline,old).path;f.geometry.coordinates=next;for(const other of canonical.filter(g=>!g.properties.existingOwner&&g!==f)){const p=other.geometry.coordinates;for(const [before,after]of [[old[0],next[0]],[old.at(-1),next.at(-1)]]){if(pointKey(p[0])===pointKey(before))p[0]=after;if(pointKey(p.at(-1))===pointKey(before))p[p.length-1]=after;}}}
 }
 save(root+'resolved.bin',fc(canonical));
 assert(canonical.length>10);return canonical;
}
