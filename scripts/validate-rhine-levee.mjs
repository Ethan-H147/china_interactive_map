import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {load,polygons,landIndex,linesOf} from './geo-index.mjs';
import {waterFreeLines} from './central-europe-frontiers.mjs';
import {decodeGeoStructure} from '../dist/geo-pack.mjs';
const probes=[[9.647,47.522],[9.6428,47.5276]],water=[[9.641,47.522],[9.65,47.527],[9.648,47.525]],inLand=f=>landIndex(polygons(f.geometry).flat());
for(const country of ['germany','austria']){
 const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin'),ids=country==='germany'?['DE2','DE27A','DE_09776120']:['AT-B-8','AT-D-802','AT-M-80215'];
 const files=['first.bin',...(fs.existsSync(base+'all.bin')?['all.bin']:[]),'political.bin',...(country==='germany'?['second/DE2.bin','third/DE27A.bin']:['second/AT-B-8.bin','third/AT-D-802.bin'])].filter(f=>fs.existsSync(base+f));
 for(const file of files){const d=load(base+file);for(const part of d.levels||[d])for(const f of (part.regions||part).features||[]){if(!ids.includes(f.properties.id))continue;const inside=inLand(f);for(const p of probes)assert.equal(inside(p),country==='austria',country+' '+file+' '+f.properties.id+' levee '+p);for(const p of water)assert(!inside(p),'No added lake fill '+country+' '+file+' '+p);}}
 for(const name of ['context.bin']){const d=load(base+name);for(const p of probes)assert.equal(d.features.some(f=>inLand(f)(p)),country==='austria',country+' context levee');const raw=gunzipSync(fs.readFileSync(base+name)),packed=decodeGeoStructure(gunzipSync(fs.readFileSync(base.replace('dist/data/','dist/data/compact/')+name)));assert.equal(packed.meta.source,createHash('sha256').update(raw).digest('hex'));}
 for(const ch of Object.values(cat.chunks)){const b=fs.readFileSync(base+ch.file);assert.equal(ch.bytes,b.length);assert.equal(ch.decodedBytes,gunzipSync(b).length);}
 const first=load(base+'first.bin');assert(first.regions.features.some(f=>inLand(f)(country==='germany'?[9.65,47.58]:[9.69,47.49])),'Nearby mainland retained');
}
for(const d of [load('dist/data/europe/austria/international.bin'),load('dist/data/globe-overview-borders.bin'),waterFreeLines(load('scripts/boundary-sources/central-europe/resolved.bin'))])for(const points of linesOf(d))for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;assert(!(x>9.64&&x<9.655&&y>47.518&&y<47.53),'No false international line across levee');}
console.log('Rhine levee: Austrian ownership at every administrative level and in contexts; lake stays water; no false border across levee; nearby mainland, compact hashes and chunk sizes passed.');
