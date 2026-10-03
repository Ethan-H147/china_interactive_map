import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {MAX_LINE_POINTS,splitLinePaths,polygonLines} from '../dist/korea-lines.mjs';
import {prepareKorea} from '../dist/korea-preparation.mjs';
const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/data/korea-boundaries.bin',import.meta.url))));
function segments(paths){
 const hash=createHash('sha256');let count=0;
 for(const path of paths)for(let i=1;i<path.length;i++){hash.update(JSON.stringify([path[i-1],path[i]]));count++;}
 return {count,hash:hash.digest('hex')};
}
function check(paths,lines){
 assert(lines.features.every(f=>f.geometry.type==='LineString'&&f.geometry.coordinates.length<=MAX_LINE_POINTS),'Every drawing path stays below the renderer limit');
 assert.deepEqual(segments(lines.features.map(f=>f.geometry.coordinates)),segments(paths),'Every original segment must remain in order, without added connectors');
}
for(const geometry of Object.values(data.boundaries))check(geometry.coordinates,splitLinePaths(geometry.coordinates));
for(const collection of [data.first,data.second,data.countries]){
 const lines=polygonLines(collection);
 for(const f of collection.features){
  const paths=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();
  check(paths,{features:lines.features.filter(l=>l.properties===f.properties)});
 }
}
assert(MAX_LINE_POINTS*10<65535,'Allow for the renderer’s worst-case vertex allocation');
const prepared=prepareKorea(data);
for(const level of ['first','second']){
 assert(prepared.metadata[level].features.every(f=>f.geometry===null),'UI metadata contains no large coordinate arrays');
 assert.deepEqual(prepared.metadata[level].features.map(f=>f.properties),data[level].features.map(f=>f.properties),'Names and navigation remain complete');
 assert.deepEqual(JSON.parse(await prepared.sources['korea-'+level].text()),data[level],'Worker source preserves exact fill and hit-test geometry');
 const lines=JSON.parse(await prepared.sources['korea-'+level+'-selection-edges'].text());
 check(data[level].features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()),lines);
}
for(const [name,geometry] of Object.entries(data.boundaries))check(geometry.coordinates,JSON.parse(await prepared.sources['korea-'+name+'-edges'].text()));
console.log('Korean line paths retain every segment and stay within the GPU vertex limit.');
