import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import polygonClipping from 'polygon-clipping';
import '../dist/countries.js';
import {definitions} from './world-completion-definitions.mjs';
import {source,root} from './fetch-world-completion.mjs';
import {load,polygons,lineIndex,landIndex,metres,linesOf} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {firstLevelPool} from '../dist/first-level-quiz.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const canonical=load(root+'frontiers.bin'),mapping=load(root+'frontier-mapping.json'),indices=new Map(),audit=[];let probes=0,maxDeviation=0;
const needed=new Set(canonical.features.flatMap(f=>f.properties.pair.split('-')));for(const [iso,country]of Object.entries(mapping).filter(([iso])=>needed.has(iso))){const file='dist/data/europe/'+country+'/first.bin';if(!fs.existsSync(file))continue;const rings=load(file).regions.features.flatMap(f=>polygons(f.geometry).flat());indices.set(iso,lineIndex(rings));}
for(const f of canonical.features){let worst=0,checked=0;const path=f.geometry.coordinates,[a,b]=f.properties.pair.split('-');for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],steps=Math.max(1,Math.ceil(metres(p,q)/2000));for(let k=0;k<steps;k++){const point=p.map((v,j)=>v+(q[j]-v)*(k+.5)/steps);if(Math.min(metres(point,path[0]),metres(point,path.at(-1)))<10000)continue;const distance=Math.max(indices.get(a)(point),indices.get(b)(point));worst=Math.max(worst,distance);checked++;}}audit.push({pair:f.properties.pair,checked,maxDeviationMetres:worst});probes+=checked;maxDeviation=Math.max(maxDeviation,worst);}
console.log(JSON.stringify({probes,maxDeviation,audit},null,2));
