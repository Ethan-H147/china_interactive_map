// Resolve complete shared frontiers once, in the global source. Country fills stay intact.
// Reference endpoints identify each frontier; its detailed path follows the displayed outline.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load,linesOf,metres} from './geo-index.mjs';
import {joinReferencePaths,selectFrontierArc,removeArcSegments,segmentKey,pointKey} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
import {withoutRetraced} from './channel-lines.mjs';
import {encodeGeo} from '../dist/geo-pack.mjs';

const root='dist/data/',reference=load('scripts/boundary-sources/nordics/ne-borders.json.gz');
const flight=load(root+'flight-context.bin'),atlas=load(root+'atlas-frontiers.bin');
const definitions=[
 {owner:'brazil',other:'paraguay',iso:['BRA','PRY'],outline:'flight-context.bin'},
 {owner:'argentina',other:'paraguay',iso:['ARG','PRY'],outline:'flight-context.bin'},
 {owner:'paraguay',other:'bolivia',iso:['PRY','BOL'],outline:'europe/paraguay/context.bin'},
 {owner:'peru',other:'ecuador',iso:['PER','ECU'],outline:'europe/peru/context.bin'},
 {owner:'peru',other:'colombia',iso:['PER','COL'],outline:'europe/peru/context.bin'}
];
const arcs=definitions.flatMap(definition=>{
 const data=definition.outline==='flight-context.bin'?flight:load(root+definition.outline);
 const outline={...data,features:data.features.filter(f=>f.properties.country===definition.owner&&!f.properties.claimedBy)};
 const paths=joinReferencePaths(reference.features.filter(f=>definition.iso.every(iso=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(iso))).flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates));
 if(paths.length!==1)throw Error(definition.iso+' must have one connected reference frontier');
 return paths.map(path=>({...definition,...selectFrontierArc(outline,path)}));
});
const keys=new Set(arcs.flatMap(a=>a.path.slice(1).map((p,i)=>segmentKey(a.path[i],p))));
// Preserve original indices for exact removal, before connecting shared endpoints.
const nodes=new Map();
for(const arc of arcs)for(const [end,ref] of [[0,0],[arc.path.length-1,arc.reference.length-1]]){
 const key=pointKey(arc.reference[ref]);if(!nodes.has(key))nodes.set(key,[]);nodes.get(key).push({arc,end,point:arc.path[end]});
}
for(const members of nodes.values()){
 if(members.length<2)continue;
 const shared=members.every(m=>pointKey(m.point)===pointKey(members[0].point))?members[0].point:
  [0,1].map(axis=>Math.round(members.reduce((s,m)=>s+m.point[axis],0)/members.length*1e6)/1e6);
 for(const {arc,end,point} of members){if(metres(point,shared)>10000)throw Error('Frontier junction sources do not meet');if(pointKey(point)===pointKey(shared))continue;end===0?arc.path.unshift(shared):arc.path.push(shared);}
}
const countryFiles=['europe/paraguay/international.bin','europe/peru/international.bin'];
const canonical=arcs.map(arc=>({type:'Feature',properties:{countries:[arc.owner,...(['paraguay'].includes(arc.other)?[arc.other]:[])].join(' '),resolvedFrontier:arc.iso.join('-'),referenceOwner:arc.owner},geometry:{type:'LineString',coordinates:arc.path}}));
const ownedTags=new Set(definitions.map(d=>d.iso.join('-')));
let remaining=removeArcSegments({...atlas,features:atlas.features.filter(f=>!ownedTags.has(f.properties.resolvedFrontier))},keys);
// Tiny claim-tagged runs from overlapping surveys must not redraw the resolved reference edge.
remaining.features=remaining.features.filter(f=>!arcs.some(arc=>{
 const countries=String(f.properties.countries).split(' ');
 return countries.includes(arc.owner)&&f.properties.claimedBy===arc.other&&['brazil','argentina'].includes(arc.owner);
}));
const write=(file,data)=>{
 const text=JSON.stringify(data);fs.writeFileSync(root+file,gzipSync(text,{level:9}));
 if(fs.existsSync(root+'compact/'+file))fs.writeFileSync(root+'compact/'+file,gzipSync(encodeGeo(data,{source:createHash('sha256').update(text).digest('hex')}),{level:9}));
};
for(const file of countryFiles){
 const data=removeArcSegments(load(root+file),keys);
 // Paraguay's few residual reference-overlap runs belong to the shared reference as well.
 if(file.includes('paraguay'))data.features=data.features.filter(f=>!['brazil','argentina'].includes(f.properties.claimedBy));
 write(file,data);
}
let normalized=lineData({...remaining,features:[...canonical,...remaining.features]});
// Renderer-sized path splits can expose short retraces at new path ends.
for(let pass=0;pass<6;pass++){
 const next=lineData({...normalized,features:withoutRetraced(normalized.features)});
 if(JSON.stringify(next)===JSON.stringify(normalized))break;
 normalized=next;
 if(pass===5)throw Error('Frontier retrace cleanup did not converge');
}
write('atlas-frontiers.bin',normalized);
const report=arcs.map(a=>({pair:a.iso.join('-'),owner:a.owner,outline:a.outline,vertices:a.path.length,endpoints:[a.path[0],a.path.at(-1)],endpointErrorMetres:Math.round(a.error),km:Math.round(a.path.slice(1).reduce((s,p,i)=>s+metres(a.path[i],p),0)/1000)}));
fs.writeFileSync(root+'frontier-continuity.json',JSON.stringify({method:'One continuous detailed-outline arc per reference frontier; shared tripoints join once; no per-piece opacity fading.',references:'Natural Earth v5.1.2 land boundary topology; existing displayed national outlines',frontiers:report},null,2)+'\n');

for(const country of ['paraguay','peru']){
 const file=root+'europe/'+country+'/sources.json',info=load(file);
 const own=linesOf(load(root+'europe/'+country+'/international.bin'));
 info.frontierKm=Math.round(own.reduce((s,p)=>s+p.slice(1).reduce((n,q,i)=>n+metres(p[i],q),0),0)/1000+arcs.filter(a=>a.owner===country).reduce((s,a)=>s+a.path.slice(1).reduce((n,q,i)=>n+metres(a.path[i],q),0)/1000,0));
 info.sharedFrontiers=[...(info.sharedFrontiers||[]).filter(a=>!ownedTags.has(a.pair)),...report.filter(a=>a.owner===country||a.pair.includes(country==='paraguay'?'PRY':'PER')).map(a=>({pair:a.pair,owner:a.owner,source:'atlas-frontiers.bin'}))];
 fs.writeFileSync(file,JSON.stringify(info,null,2)+'\n');
}
const sourceFile=root+'atlas-frontiers-sources.json',sourceInfo=load(sourceFile),built=load(root+'atlas-frontiers.bin');
sourceInfo.continuousFrontiers=report;
sourceInfo.pieces=built.features.length;
sourceInfo.frontierKm=Math.round(linesOf(built).reduce((s,p)=>s+p.slice(1).reduce((n,q,i)=>n+metres(p[i],q),0),0)/1000);
fs.writeFileSync(sourceFile,JSON.stringify(sourceInfo,null,2)+'\n');
for(const item of report)console.log(item.pair,item.km+' km',item.vertices+' vertices');
