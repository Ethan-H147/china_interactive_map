import {load} from './geo-index.mjs';import {fc,command} from './build-regional-dataset.mjs';import {segmentKey,removeArcSegments} from './frontier-arcs.mjs';import {lineData} from '../dist/adaptive-lines.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import osmtogeojson from 'osmtogeojson';
export const brazilBoliviaRoot='scripts/boundary-sources/brazil-bolivia/';
export function brazilBoliviaReference(){const manifest=JSON.parse(fs.readFileSync(brazilBoliviaRoot+'manifest.json')),read=name=>{const bytes=gunzipSync(fs.readFileSync(brazilBoliviaRoot+name+'.gz'));assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.files[name].sha256);return JSON.parse(bytes);},raw=read('uberaba.json'),water=osmtogeojson(raw).features.filter(f=>f.id==='relation/456940');assert.equal(water.length,1);assert(/Polygon/.test(water[0].geometry.type));return {path:read('brazil-reference.json'),water:{type:'FeatureCollection',features:water},manifest};}

export async function brazilBoliviaStrokes(data){
 const {path,water}=brazilBoliviaReference(),keys=new Set(path.slice(1).map((p,i)=>segmentKey(path[i],p))),kept=removeArcSegments(data,keys,f=>!String(f.properties.countries).includes('brazil'));
 kept.features=kept.features.filter(f=>f.properties.resolvedFrontier!=='BRA-BOL-SAN-MATIAS');
 const border=await command({'border.json':fc([{type:'Feature',properties:{countries:'brazil bolivia',resolvedFrontier:'BRA-BOL-SAN-MATIAS',referenceOwner:'brazil'},geometry:{type:'LineString',coordinates:path}}]),'water.json':water},'-erase water.json');
 kept.features.push(...lineData(border).features);return {data:kept,border};
}
export async function preserveBrazilBoliviaBorder(){
 if(!fs.existsSync('dist/data/brazil-bolivia-repair.json'))return;
 const file='dist/data/atlas-frontiers.bin',{data}=await brazilBoliviaStrokes(load(file));fs.writeFileSync(file,gzipSync(JSON.stringify(data),{level:9}));
}
