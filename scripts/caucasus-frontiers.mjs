import fs from 'node:fs';import {gzipSync} from 'node:zlib';import {lineData} from '../dist/adaptive-lines.mjs';import assert from 'node:assert/strict';import {source} from './fetch-caucasus-frontiers.mjs';import {load,linesOf,metres} from './geo-index.mjs';import {fc} from './build-regional-dataset.mjs';import {joinReferencePaths} from './frontier-arcs.mjs';
export function caucasusFrontiers(){
const ids={georgia:28699,azerbaijan:364110,armenia:364066,russia:60189},data=Object.fromEntries(Object.keys(ids).map(n=>[n,JSON.parse(source(n+'.json'))])),relations=Object.fromEntries(Object.entries(ids).map(([n,id])=>[n,data[n].elements.find(e=>e.type==='relation'&&e.id===id)])),round=p=>p.map(x=>+x.toFixed(6));
function shared(a,b){const other=new Set(relations[b].members.filter(m=>m.type==='way').map(m=>m.ref)),nodes=new Map(data[a].elements.filter(e=>e.type==='node').map(e=>[e.id,round([e.lon,e.lat])])),ways=new Map(data[a].elements.filter(e=>e.type==='way').map(e=>[e.id,e]));return joinReferencePaths(relations[a].members.filter(m=>m.type==='way'&&other.has(m.ref)).map(m=>ways.get(m.ref)).filter(w=>w&&w.tags?.maritime!=='yes').map(w=>w.nodes.map(id=>nodes.get(id))));}
const gr=shared('georgia','russia')[0],ar=shared('azerbaijan','russia')[0],ga=shared('georgia','azerbaijan')[0],ag=shared('armenia','georgia')[0],aa=shared('armenia','azerbaijan').find(p=>p.length>3000).reverse(),oldAG=linesOf(fc(load('dist/data/europe/armenia/international.bin').features.filter(f=>f.properties.pair==='ARM-GEO')))[0],oldAA=linesOf(fc(load('dist/data/europe/armenia/international.bin').features.filter(f=>f.properties.pair==='ARM-AZE'))).find(p=>p.length>3000),key=p=>p.map(x=>x.toFixed(6)).join(','),oldMapAG=new Map(oldAG.map((p,i)=>[key(p),i])),oldMapAA=new Map(oldAA.map((p,i)=>[key(p),i]));
let walked=0,tail;for(let i=ag.length-1;i>0;i--){walked+=metres(ag[i],ag[i-1]);if(walked>20000&&oldMapAG.has(key(ag[i-1]))){const n=i-1,j=oldMapAG.get(key(ag[n]));tail=[...oldAG.slice(0,j),...ag.slice(n)];break;}}
walked=0;let cap;for(let i=1;i<aa.length;i++){walked+=metres(aa[i-1],aa[i]);if(walked>20000&&oldMapAA.has(key(aa[i]))){cap=aa.slice(0,i+1);break;}}if(!tail||!cap)throw Error('No exact shared source splice');
// The older owned stroke starts with five Turkey–Armenia vertices. Keep those
// as the Turkish frontier, not as part of the Georgia–Armenia reference.
const west=tail.findIndex(p=>key(p)===key(ag[0]));assert(west>=0);tail=tail.slice(west);
const append=(...paths)=>paths.flatMap((p,i)=>i?p.slice(1):p),refs={russia:append(gr,ar.slice().reverse()),georgia:append(gr,ga.slice().reverse(),tail.slice().reverse()),armenia:append(tail,cap),azerbaijan:append(ar,ga.slice().reverse(),cap)},russianIds=new Set(['RU-KDA','RU-KC','RU-KB','RU-SE','RU-IN','RU-CE','RU-DA']);return {references:refs,arcs:{russiaGeorgia:gr,russiaAzerbaijan:ar,georgiaAzerbaijan:ga,armeniaGeorgia:tail,armeniaAzerbaijanCap:cap},russianIds,junctions:{russiaGeorgiaAzerbaijan:gr.at(-1),armeniaGeorgiaAzerbaijan:ga[0]}};
}

// Restore only this owned stroke pair after a global border rebuild.
export function preserveCaucasusBorders(){
 if(!fs.existsSync('dist/data/caucasus-frontiers.json'))return;
 const net=caucasusFrontiers(),file='dist/data/atlas-frontiers.bin',data=load(file);
 data.features=data.features.filter(f=>!f.properties.caucasusReconciliation&&!(f.properties.countries==='russia'&&linesOf(fc([f])).every(p=>p.every(([x,y])=>x>39.7&&x<49.2&&y>41&&y<43.7))));
 data.features.push(...[['GEO-RUS','russia georgia',net.arcs.russiaGeorgia],['AZE-RUS','russia azerbaijan',net.arcs.russiaAzerbaijan]].map(([pair,countries,coordinates])=>({type:'Feature',properties:{pair,countries,caucasusReconciliation:true},geometry:{type:'LineString',coordinates}})));
 fs.writeFileSync(file,gzipSync(JSON.stringify(lineData(data)),{level:9}));
}
