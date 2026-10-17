import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {readData} from './read-data.mjs';
import {load,polygons,linesOf} from './geo-index.mjs';
import {decodePack} from '../dist/china-pack.mjs';
import {chinaSourceBuilders} from '../dist/china-sources.mjs';
const display=readData('display-boundaries.json'),regions=display.subdivisions.features.filter(f=>['TW-10016','TW-09020','TW-09007'].includes(f.properties.adcode));
const point=p=>p.map(n=>n.toFixed(6)).join(','),edge=(a,b)=>[point(a),point(b)].sort().join('|');
const owners=new Map();
for(const r of regions)for(const ring of polygons(r.geometry).flat())for(let i=1;i<ring.length;i++){
 const key=edge(ring[i-1],ring[i]);if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(r.properties.adcode);
}
const coasts=new Set([...owners].filter(([,ids])=>ids.size===1).map(([key])=>key));
const frontiers=load('dist/data/atlas-frontiers.bin');
const check=(data,label)=>{let overlap=0;for(const path of linesOf(data))for(let i=1;i<path.length;i++)if(coasts.has(edge(path[i-1],path[i])))overlap++;assert.equal(overlap,0,label+' must never stroke an unselected Taiwan coast');};
check(frontiers,'International borders');
for(const file of ['china-boundaries.pack.bin','china-overview.pack.bin']){
 const pack=decodePack(gunzipSync(fs.readFileSync('dist/data/'+file))),builders=chinaSourceBuilders(pack);
 if(file==='china-boundaries.pack.bin')for(const name of ['province','prefecture','other'])check(builders[name+'-boundaries'](),file+' '+name);
 const selected=builders['prefectures-selection-edges']();
 for(const code of ['TW-10016','TW-09020','TW-09007'])assert(selected.features.some(f=>f.properties.adcode===code),code+' retains a complete selectable outline in '+file);
}
console.log('Taiwan island coasts: '+coasts.size+' exterior edges excluded from normal province, county and international strokes; Penghu, Kinmen and Matsu selection outlines retained.');
