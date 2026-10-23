import assert from 'node:assert/strict';
import {load,polygons,landIndex} from './geo-index.mjs';
import {swissGermanProbes} from './swiss-german-probes.mjs';
const inside=data=>{const tests=data.features.map(f=>landIndex(polygons(f.geometry).flat()));return p=>tests.some(test=>test(p));};
const swiss=inside(load('dist/data/europe/switzerland/first.bin').regions),swissPortal=inside(load('dist/data/europe/switzerland/context.bin')),german=inside(load('dist/data/europe/germany/first.bin').regions),germanPortal=inside(load('dist/data/europe/germany/context.bin'));
const probes=swissGermanProbes();assert(probes.length>70,'A broad set of survey stations covers Schaffhausen, Jestetten and Büsingen');
for(const {center,sides} of probes)for(const p of sides){assert.equal(Number(swiss(p))+Number(germanPortal(p)),1,'Swiss detail and gray German land meet with no gap or overlap at '+p+' beside '+center);assert.equal(Number(german(p))+Number(swissPortal(p)),1,'German detail and gray Swiss land meet with no gap or overlap at '+p);}
console.log('Swiss–German land: both sides of',probes.length,'survey stations meet in active-country and gray portal views.');
