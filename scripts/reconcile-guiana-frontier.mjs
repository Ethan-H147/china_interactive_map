import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {load,linesOf,lineIndex,metres} from './geo-index.mjs';
import {fc} from './build-regional-dataset.mjs';
import {joinReferencePaths,selectFrontierArc,pointKey} from './frontier-arcs.mjs';
import {lineData} from '../dist/adaptive-lines.mjs';
const root='dist/data/',write=(file,data)=>fs.writeFileSync(root+file,gzipSync(JSON.stringify(data),{level:9})),refs=load('scripts/boundary-sources/nordics/ne-borders.json.gz');
const guide=joinReferencePaths(linesOf(fc(refs.features.filter(f=>['BRA','FRA'].every(c=>[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R].includes(c))))))[0],france=fc(load(root+'europe/france/first.bin').regions.features.filter(f=>f.properties.id==='FR-R-03')),brazil=fc(load(root+'flight-context.bin').features.filter(f=>f.properties.country==='brazil')),canonical=selectFrontierArc(france,guide).path,previousBrazil=selectFrontierArc(brazil,guide).path,nearFrench=lineIndex([canonical]),nearBrazil=lineIndex([previousBrazil]);
const file=root+'guiana-frontier.json',oldReport=fs.existsSync(file)?load(file):null,oldAtlas=load(root+'atlas-frontiers.bin'),oldFrance=load(root+'europe/france/international.bin');
let removedFrench=0,removedBrazil=0,junctions=0;
function prune(data,distance,eligible,counter){return fc(data.features.flatMap(f=>{if(!eligible(f))return[f];const kept=[];for(const path of linesOf(fc([f]))){let run;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if([a,m,b].every(p=>distance(p)<2)){counter();run=null;continue;}if(!run)kept.push(run=[a]);run.push(b);}}return kept.map(coordinates=>({...f,geometry:{type:'LineString',coordinates}}));}));}
const french=prune(fc(oldFrance.features.filter(f=>f.properties.resolvedFrontier!=='BRA-FRA')),nearFrench,()=>true,()=>removedFrench++),global=prune(oldAtlas,nearBrazil,f=>String(f.properties.countries).split(' ').includes('brazil'),()=>removedBrazil++);
// The two surveys locate the rainforest tripoint about 1.9 km apart. Join the
// remaining Brazil–Suriname stroke to the French outline's shared endpoint.
assert(metres(previousBrazil[0],canonical[0])<5000);for(const f of global.features)if(String(f.properties.countries).split(' ').includes('brazil'))for(const path of linesOf(fc([f])))for(let i=0;i<path.length;i++)if(pointKey(path[i])===pointKey(previousBrazil[0])){path[i]=canonical[0];junctions++;}
write('europe/france/international.bin',lineData(fc([...french.features,{type:'Feature',properties:{countries:['france'],pair:'BRA-FRA',resolvedFrontier:'BRA-FRA',referenceOwner:'france'},geometry:{type:'LineString',coordinates:canonical}}])));write('atlas-frontiers.bin',lineData(global));
const hashes=Object.fromEntries(['europe/france/first.bin','europe/france/context.bin','flight-context.bin','south-america/brazil-first.bin'].filter(f=>fs.existsSync(root+f)).map(f=>[f,createHash('sha256').update(fs.readFileSync(root+f)).digest('hex')]));
const report={pair:'BRA-FRA',referenceOwner:'france',canonical,previousBrazil,method:'One complete French Guiana outline arc replaces fragmented French strokes and the separate Brazil-owned copy. The nearby rainforest tripoint joins the surviving Brazil–Suriname stroke. Administrative land geometry is unchanged.',removedFrenchSegments:Math.max(removedFrench,oldReport?.removedFrenchSegments||0),removedBrazilSegments:Math.max(removedBrazil,oldReport?.removedBrazilSegments||0),junctionDisplacementMetres:metres(previousBrazil[0],canonical[0]),preservedAssets:oldReport?.preservedAssets||hashes};fs.writeFileSync(file,JSON.stringify(report)+'\n');
for(const source of ['europe/france/sources.json','atlas-frontiers-sources.json']){const data=load(root+source);data.guianaFrontierReconciliation={source:'data/guiana-frontier.json',referenceOwner:'france',method:report.method};fs.writeFileSync(root+source,JSON.stringify(data,null,2)+'\n');}
console.log('Brazil–French Guiana:',canonical.length,'continuous shared vertices;',removedBrazil,'duplicate Brazilian segments removed;',removedFrench,'fragmented French segments replaced;',junctions,'tripoint joins');
