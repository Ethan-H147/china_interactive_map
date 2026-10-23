import fs from 'node:fs';
import assert from 'node:assert/strict';
import {source,root} from './fetch-balkans.mjs';
import {pointKey,selectFrontierArc} from './frontier-arcs.mjs';
import {polygons,metres} from './geo-index.mjs';
export function romanianBalkanLandArc(outline,previous){
 if(!fs.existsSync(root+'lau2024.geojson.gz'))return previous;
 const raw=JSON.parse(source('lau2024.geojson')).features,keys=c=>new Set(raw.filter(f=>f.properties.CNTR_CODE===c).flatMap(f=>polygons(f.geometry).flat(2)).map(pointKey)),rs=keys('RS'),bg=keys('BG'),ro=new Set(outline.features.flatMap(f=>polygons(f.geometry).flat(2)).map(pointKey)),shared=[...rs].filter(p=>bg.has(p)&&ro.has(p));assert.equal(shared.length,1,'Exact retained Romania–Bulgaria–Serbia junction');const point=shared[0].split(',').map(Number),guide=previous.slice();if(metres(guide[0],point)<metres(guide.at(-1),point))guide[0]=point;else guide[guide.length-1]=point;return selectFrontierArc(outline,guide).path;
}
