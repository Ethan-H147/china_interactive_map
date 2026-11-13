import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeData} from '../dist/geo-pack.mjs';
import {landIndex,polygons} from './geo-index.mjs';
import {physicalShoreLines} from './uk-history-coasts.mjs';
const box=[60,-1,102,31];
const feature={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[70,30],[80,30],[80,31],[70,31],[70,30]]]}};
const lines=physicalShoreLines([feature],box).features;
assert(lines.length);
assert(lines.every(f=>f.geometry.coordinates.every((p,i,r)=>!i||!(p[1]===31&&r[i-1][1]===31))),'A regional cutoff cannot become a coastline');
assert(lines.some(f=>f.geometry.coordinates.some(p=>p[1]===30)),'Keep actual shores');
const root=process.argv[2]||'dist/data/europe/united-kingdom/history';
const data=await decodeData(fs.readFileSync(root+'/borders.bin'));
for(const year of [1850,1857,1858,1900,1946]){
 const config=data.configs[data.years[year].config];
 const tests=data.faces.features.filter(f=>config.units[config.face[f.properties.f]]?.key==='india').map(f=>landIndex(polygons(f.geometry).flat()));
 for(const x of [74,75,76,77,78])for(const y of [30.98,31.001,31.01,31.02,31.04,31.06,31.1])assert(tests.some(t=>t([x,y])),year+' retains inland ownership across regional cutoff at '+[x,y]);
}
console.log('Historical region seams: artificial coast edges excluded; South Asian land remains continuous across 31 degrees in five dated frames.');
