import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {load,polygons,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {alpineWater,sourceRoot} from './alpine-lakes.mjs';
import {decodeGeoStructure} from '../dist/geo-pack.mjs';
const points=[[6.5,46.45],[6.7,46.45],[9.3,47.62],[9,47.68]],water=alpineWater(),inside=landIndex(water.features.flatMap(f=>polygons(f.geometry).flat())),shore=lineIndex(water.features.flatMap(f=>polygons(f.geometry).flat()));
assert(points.every(inside),'Independent probes are in the mapped lakes');
for(const country of ['switzerland','france','germany']){const base='dist/data/europe/'+country+'/',cat=load(base+'catalogue.bin');for(const file of ['context.bin','first.bin','all.bin',...Object.values(cat.chunks).map(c=>c.file)]){if(!fs.existsSync(base+file))continue;const d=load(base+file);for(const part of d.levels||[d]){const regions=part.regions||part;if(!regions.features)continue;const land=landIndex(regions.features.flatMap(f=>polygons(f.geometry).flat()));for(const p of points)assert(!land(p),country+' '+file+' is open water '+p);if(part.selectionOutlines)for(const p of linesOf(part.selectionOutlines).flat())assert(!inside(p)||shore(p)<1,'No selection outline through a lake');}}for(const ch of Object.values(cat.chunks)){const b=fs.readFileSync(base+ch.file);assert.equal(b.length,ch.bytes);assert.equal(gunzipSync(b).length,ch.decodedBytes);}}
for(const file of ['world-land.bin','flight-context.bin','globe-overview-land.bin']){const data=load('dist/data/'+file),land=landIndex(data.features.flatMap(f=>polygons(f.geometry).flat()));for(const p of points)assert(!land(p),file+' open lake '+p);}
const border=lineIndex(linesOf({features:load('dist/data/europe/germany/international.bin').features.filter(f=>f.properties.pair==='CHE-DEU')}));for(const p of [[8.664052,47.688148],[8.678441,47.687491],[8.604166,47.641268],[8.441666,47.717894]])assert(border(p)<.2,'Previously missing or displaced Swiss survey border '+p);
for(const name of ['leman','constance']){const meta=load('dist/data/alpine-lakes-sources.json').files[name];assert.equal(createHash('sha256').update(gunzipSync(fs.readFileSync(sourceRoot+name+'.json.gz'))).digest('hex'),meta.sha256);}
for(const name of ['world-land.bin','flight-context.bin','world-country-outlines.bin',...['switzerland','france','germany'].flatMap(c=>['context.bin','international.bin'].map(n=>'europe/'+c+'/'+n))]){const file='dist/data/'+name,raw=gunzipSync(fs.readFileSync(file)),packed=decodeGeoStructure(gunzipSync(fs.readFileSync('dist/data/compact/'+name)));assert.equal(packed.meta.source,createHash('sha256').update(raw).digest('hex'),file+' compact copy');}
console.log('Alpine lakes: permanent water at every level, no selection shore outline, complete Swiss–German survey edge, source hashes and chunk accounting passed.');
