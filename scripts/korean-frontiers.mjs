import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load,polygons,linesOf,lineIndex,metres,landIndex} from './geo-index.mjs';
import {command,fc,geographicBounds,sharedBorders} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
import {replaceOutlineArc} from './replace-outline-arc.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
export const root='scripts/boundary-sources/korean-frontiers/';
export const save=(file,data)=>{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));};
const round=p=>p.map(v=>+v.toFixed(6));
export function koreanFrontiers(){
 const full=load(root+'north-korea.json.gz'),relation=full.elements.find(e=>e.type==='relation'&&e.id===192734),nodes=new Map(full.elements.filter(e=>e.type==='node').map(e=>[e.id,[e.lon,e.lat]])),ways=new Map(full.elements.filter(e=>e.type==='way').map(e=>[e.id,e]));
 const shared=name=>{const ids=new Set(load(root+name+'.json.gz').elements[0].members.filter(m=>m.type==='way'&&m.role==='outer').map(m=>m.ref)),paths=joinReferencePaths(relation.members.filter(m=>m.type==='way'&&ids.has(m.ref)).map(m=>ways.get(m.ref)).filter(w=>w.tags?.maritime!=='yes').map(w=>w.nodes.map(id=>nodes.get(id))));assert.equal(paths.length,1);return paths[0].map(round);};
 const chinaKorea=shared('china'),russiaKorea=shared('russia');
 // Rejoin the corrected Tumen junction to the existing inland China–Russia border.
 // The reference includes complete OSM ways, never a line drawn across a peninsula.
 const junction=chinaKorea.at(-1);if(metres(russiaKorea[0],junction)>1)russiaKorea.reverse();assert(metres(russiaKorea[0],junction)<1);
 const raw=load(root+'china-russia-junction.json.gz').path.map(round);let length=0,i=0;while(i<raw.length-1&&length<28000){length+=metres(raw[i],raw[i+1]);i++;}const chinaRussia=raw.slice(0,i+1).reverse();
 const innerIds=new Set(load(root+'china.json.gz').elements[0].members.filter(m=>m.type==='way'&&m.role==='inner').map(m=>m.ref));
 const islands=joinReferencePaths(relation.members.filter(m=>m.type==='way'&&m.role==='outer'&&innerIds.has(m.ref)).map(m=>ways.get(m.ref)).map(w=>w.nodes.map(id=>nodes.get(id)))).map(path=>path.map(round));
 return {chinaKorea,russiaKorea,chinaRussia,junction,islands};
}
export async function alignArc(regions,canonical,{coastalTrimMetres=0,maxDistance=20000,maxSelectionMetres=15000,...options}={}){
 regions=await command(regions,'-clean gap-fill-area=0');
 const outline=await command(regions,'-dissolve'),own=selectFrontierArc(outline,canonical,{maximumScoreMetres:maxSelectionMetres}).path;
 return replaceOutlineArc(regions,own,canonical,maxDistance,{coastalTrimMetres,...options});
}
export async function alignKoreanContext(country,regions){
 const {chinaKorea,russiaKorea,chinaRussia}=koreanFrontiers();let result=regions;
 for(const path of country==='china'?[[...chinaKorea,...chinaRussia.slice(0,-1).reverse()]]:country==='korea'?[[...chinaKorea,...russiaKorea.slice(1)]]:country==='russia'?[[...chinaRussia,...russiaKorea.slice(1)]]:[])result=(await alignArc(result,path,{coastalTrimMetres:country==='korea'?6000:100})).regions;
 return result;
}
function removeNear(data,paths,{drop=()=>false,tolerance=120}={}){
 const distance=lineIndex(paths);return fc(data.features.flatMap(f=>{if(drop(f))return[];const kept=[];for(const path of linesOf(fc([f]))){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if([0,.25,.5,.75,1].every(t=>distance([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<tolerance)){run=null;continue;}if(!run)kept.push(run=[a]);run.push(b);}}return kept.map(coordinates=>({...f,geometry:{type:'LineString',coordinates}}));}));
}
export function preserveKoreanFrontiers(){
 const file=root+'resolved.bin';if(!fs.existsSync(file))return;const resolved=load(file),cn=resolved.features.filter(f=>f.properties.pair==='CHN-PRK'),ru=resolved.features.filter(f=>f.properties.pair!=='CHN-PRK'),paths=linesOf(resolved),previous=fs.existsSync(root+'previous-lines.bin')?linesOf(load(root+'previous-lines.bin')):[];
 const baseline=root+'atlas-reference/russia/first.bin';
 if(fs.existsSync(baseline)){const old=fc(load(baseline).regions.features.filter(f=>f.properties.id==='RU-PRI')),arcs=koreanFrontiers();previous.push(selectFrontierArc(old,[...arcs.chinaRussia,...arcs.russiaKorea.slice(1)]).path);}
 const shared='dist/data/shared-context-borders.bin';save(shared,lineData(fc([...load(shared).features.filter(f=>f.properties.neighbor!=='korea'),...cn.map(f=>({...f,properties:{...f.properties,neighbor:'korea'}}))])));
 const russian='dist/data/russia/international.bin',clean=removeNear(load(russian),[...paths,...previous],{drop:f=>f.properties.neighbor==='north-korea'||!!f.properties.koreanReconciliation});save(russian,lineData(fc([...clean.features,...ru.map(f=>({...f,properties:{...f.properties,neighbor:f.properties.pair==='PRK-RUS'?'north-korea':'china'}}))])));
 const global='dist/data/atlas-frontiers.bin',other=removeNear(load(global),[...paths,...previous],{drop:f=>!!f.properties.koreanReconciliation||['korea russia','china korea'].includes((f.properties.countries||'').split(' ').sort().join(' '))});save(global,lineData(other));
}
export async function repairKoreanContexts(){
 if(!fs.existsSync(root+'resolved.bin'))return;
 for(const country of ['russia']){const file='dist/data/'+(country==='russia'?'russia/context.bin':country+'-context.bin');if(!fs.existsSync(file))continue;const data=load(file),subset=country==='korea'?fc(data.features.filter(f=>f.properties.country==='KP')):data,aligned=await alignKoreanContext(country,subset);save(file,country==='korea'?fc([...data.features.filter(f=>f.properties.country!=='KP'),...aligned.features]):aligned);}
}
export function writeKoreanSources(report){
 const files={};for(const name of ['north-korea','china','russia','china-russia-junction','district-8426165','district-13284720','province-3781418','province-6648083'])files[name+'.json.gz']={sha256:createHash('sha256').update(fs.readFileSync(root+name+'.json.gz')).digest('hex')};
 const meta={retrieved:'2026-10-20',sources:[{title:'OpenStreetMap country boundary relations and their shared ways',urls:['https://www.openstreetmap.org/relation/192734','https://www.openstreetmap.org/relation/270056','https://www.openstreetmap.org/relation/60189','https://www.openstreetmap.org/relation/8426165','https://www.openstreetmap.org/relation/13284720','https://www.openstreetmap.org/relation/3781418','https://www.openstreetmap.org/relation/6648083'],license:'© OpenStreetMap contributors · ODbL 1.0'},{title:'Three-country junction protocol',url:'https://treaty.mfa.gov.cn/tykfiles/20180718/1531876080380.pdf'}],method:'Complete shared non-maritime OSM boundary arcs replace mismatched exterior runs, using a single Tumen tripoint. Interior subdivision boundaries and coasts outside the repair remain intact. The old Natural Earth junction is not used as a detailed geometry anchor. Border strokes are stored once and stay fully visible at every zoom. Display policy requested by the atlas owner suppresses all 22 small river enclaves: their separate outlines and Korean fill are removed, and the enclosing Chinese display region fills the cutouts. Original OSM island geometry and attribution remain separately retained; this is cartographic generalization, not a change to the source border claim.',files,...report};fs.writeFileSync(root+'sources.json',JSON.stringify(meta,null,2)+'\n');fs.writeFileSync('dist/data/korean-frontiers-sources.json',JSON.stringify(meta,null,2)+'\n');
 for(const file of ['dist/data/korea-sources.json','dist/data/russia/sources.json']){if(!fs.existsSync(file))continue;const data=load(file);data.koreanFrontiers={source:'data/korean-frontiers-sources.json',method:meta.method};fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');}
}
export async function repairKoreanMotion(output){
 if(!fs.existsSync(root+'resolved.bin'))return;
 const {islandLand}=await import('./korean-river-islands.mjs');
 for(const key of ['provinces','prefectures'])output[key]=await islandLand(await alignKoreanContext('china',output[key]),'china');
 for(const key of ['korea-first','korea-second','korea-portal']){
  const data=output[key];if(!data)continue;
  const aligned=await alignKoreanContext('korea',fc(data.features.filter(f=>f.properties.country==='KP')));
  output[key]=fc([...data.features.filter(f=>f.properties.country!=='KP'),...(await islandLand(aligned,key==='korea-first'?'first':key==='korea-second'?'second':'portal')).features]);
 }
}
