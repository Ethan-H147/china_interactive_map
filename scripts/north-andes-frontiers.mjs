import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,polygons,linesOf,metres,lineIndex} from './geo-index.mjs';
import {command,fc} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc,pointKey,segmentKey,removeArcSegments} from './frontier-arcs.mjs';
import {alignArc} from './korean-frontiers.mjs';
import {centralWater,waterFreeLines} from './central-europe-frontiers.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
export const save=(file,data)=>{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));};
export async function resolveNorthAndes(prepared){
 const codes={ECU:'ecuador',COL:'colombia',VEN:'venezuela',PER:'peru',BRA:'brazil'},outlines=new Map();
 for(const [iso,country]of Object.entries(codes)){const data=prepared.find(d=>d.country===country)?.bottom||(country==='brazil'?fc(load('dist/data/flight-context.bin').features.filter(f=>f.properties.country===country&&!f.properties.claimedBy)):load('dist/data/europe/'+country+'/context.bin'));outlines.set(iso,await command(data,'-dissolve'));}
 const ne=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),groups=new Map();
 for(const f of ne.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(!sides.some(s=>['ECU','VEN','COL'].includes(s)))continue;const pair=sides.slice().sort().join('-');if(!groups.has(pair))groups.set(pair,{pair,sides,paths:[]});groups.get(pair).paths.push(...linesOf(fc([f])));}
 const refs=[...groups.values()].map(g=>({...g,paths:joinReferencePaths(g.paths)})),priority=['PER','BRA','ECU','COL','VEN'],anchors=new Map(),old=load('dist/data/atlas-frontiers.bin');
 const frozen=fc(old.features.filter(f=>['PER-ECU','PER-COL'].includes(f.properties.resolvedFrontier))),frozenEnds=load('dist/data/frontier-continuity.json').frontiers.filter(f=>['PER-ECU','PER-COL'].includes(f.pair)).flatMap(f=>f.endpoints);
 const nearest=(outline,p)=>outline.features.flatMap(f=>polygons(f.geometry).map(poly=>poly[0])).flat().reduce((a,b)=>!a||metres(p,b)<metres(p,a)?b:a,null);
 for(const g of refs)for(const path of g.paths)for(const p of [path[0],path.at(-1)]){const key=pointKey(p);if(anchors.has(key))continue;const fixed=frozenEnds.filter(q=>metres(q,p)<10000).sort((a,b)=>metres(a,p)-metres(b,p))[0],sides=new Set(refs.filter(r=>r.paths.some(path=>[path[0],path.at(-1)].some(q=>metres(p,q)<2))).flatMap(r=>r.sides)),chosen=priority.find(i=>sides.has(i));anchors.set(key,fixed||nearest(outlines.get(chosen),p));}
 // The older Peru rendering divided this continuous river at a coarse locator
 // downstream of the actual Ecuador/Colombia confluence. Choose the first
 // approach of their detailed frontier to Peru's river, then a real Peru vertex.
 // Moving the division point preserves Peru's complete displayed outline.
 const ecCol=refs.find(g=>g.pair==='COL-ECU'),peruNear=lineIndex(outlines.get('PER').features.flatMap(f=>polygons(f.geometry).flat()));
 for(const guide of ecCol.paths){const tri=[guide[0],guide.at(-1)].find(p=>refs.filter(g=>g.sides.includes('PER')&&g.paths.some(path=>[path[0],path.at(-1)].some(q=>metres(p,q)<2))).length===2);if(!tri)continue;const extended=guide.slice();extended[0]=anchors.get(pointKey(guide[0]));extended[extended.length-1]=anchors.get(pointKey(guide.at(-1)));let raw=selectFrontierArc(outlines.get('ECU'),extended).path;if(metres(raw[0],tri)<metres(raw.at(-1),tri))raw.reverse();const first=raw.find(p=>metres(p,tri)<20000&&peruNear(p)<100);if(!first)throw Error('Peru river confluence not located');const junction=nearest(outlines.get('PER'),first);anchors.set(pointKey(tri),junction);console.log('Common river confluence',junction);}
 const canonical=[];
 for(const g of refs){const chosen=priority.find(iso=>g.sides.includes(iso)),owner=codes[chosen];for(const reference of g.paths){const guide=reference.slice();guide[0]=anchors.get(pointKey(reference[0]));guide[guide.length-1]=anchors.get(pointKey(reference.at(-1)));const path=selectFrontierArc(outlines.get(chosen),guide,{maximumScoreMetres:20000}).path;path[0]=guide[0];path[path.length-1]=guide.at(-1);canonical.push({type:'Feature',properties:{pair:g.pair,countries:owner,canonicalSource:owner+' displayed administrative outline',existingOwner:chosen==='PER'||chosen==='BRA'},geometry:{type:'LineString',coordinates:path}});}}
 save('scripts/boundary-sources/north-andes/resolved.bin',fc(canonical));
 for(const d of [...prepared].sort((a,b)=>priority.indexOf(a.iso)-priority.indexOf(b.iso))){const cache='artifacts/north-andes-'+d.country+'-aligned.bin';if(process.argv.includes('--continue')&&fs.existsSync(cache))d.bottom=load(cache).bottom;else{const paths=canonical.filter(f=>f.properties.pair.split('-').includes(d.iso)),owners=[...new Set(paths.filter(f=>f.properties.countries!==d.country).map(f=>f.properties.countries))];for(const owner of owners){const iso=Object.keys(codes).find(c=>codes[c]===owner),foreign=prepared.find(p=>p.country===owner)?.bottom||outlines.get(iso);d.bottom=await command({'land.json':d.bottom,'foreign.json':foreign},'-erase foreign.json -clean gap-fill-area=0');}for(const f of paths){console.log('Aligning',d.country,f.properties.pair);d.bottom=(await alignArc(d.bottom,f.geometry.coordinates,{maxDeviationMetres:3,coastalTrimMetres:2000,maxDistance:25000,maxSelectionMetres:25000})).regions;}d.bottom=await command({'land.json':d.bottom,'water.json':centralWater()},'-erase water.json -clean gap-fill-area=0');save(cache,{...d,units:[...d.units]});}
  // Owner frontiers must reflect its already reconciled tripoints, before a
  // later neighbour adopts them. This avoids carrying a raw river loop across
  // the Peru/Ecuador/Colombia or Brazil/Colombia/Venezuela junction.
  const outline=await command(d.bottom,'-dissolve');for(const f of canonical.filter(f=>f.properties.countries===d.country))f.geometry.coordinates=selectFrontierArc(outline,f.geometry.coordinates,{maximumScoreMetres:25000}).path;
 }
 save('scripts/boundary-sources/north-andes/resolved.bin',fc(canonical));
 return canonical;
}
export function writeNorthAndesBorders(canonical){for(const country of ['ecuador','colombia','venezuela'])save('dist/data/europe/'+country+'/international.bin',lineData(waterFreeLines(fc(canonical.filter(f=>f.properties.countries===country)))));
 // Their complete, reconciled portals replace Peru's older gray neighbours.
 const neighbours='dist/data/europe/peru/neighbours.bin';if(fs.existsSync(neighbours)){const previous=load(neighbours),next=previous.features.filter(f=>!['ecuador','colombia','venezuela'].includes(f.properties.country));if(next.length!==previous.features.length)save(neighbours,fc(next));}
 const brazil=canonical.filter(f=>f.properties.countries==='brazil'),keys=new Set(brazil.flatMap(f=>f.geometry.coordinates.slice(1).map((p,i)=>segmentKey(f.geometry.coordinates[i],p)))),atlas=load('dist/data/atlas-frontiers.bin');
 const clean=removeArcSegments(fc(atlas.features.filter(f=>!['BRA-COL','BRA-VEN'].includes(f.properties.resolvedFrontier))),keys,f=>f.properties.countries!=='brazil');
 save('dist/data/atlas-frontiers.bin',lineData(fc([...clean.features,...waterFreeLines(fc(brazil)).features.map(f=>({...f,properties:{...f.properties,resolvedFrontier:f.properties.pair,referenceOwner:'brazil'}}))])));
}
