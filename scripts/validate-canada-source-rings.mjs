import assert from 'node:assert/strict';
import {normalizeCensusRings} from './canada-source-rings.mjs';
import {polygons,landIndex} from './geo-index.mjs';
const outer=[[0,0],[0,10],[10,10],[10,0],[0,0]],hole=[[4,4],[6,4],[6,6],[4,6],[4,4]],island=[[20,0],[20,1],[21,1],[21,0],[20,0]],source={type:'MultiPolygon',coordinates:[[outer],[hole],[island]]},snapshot=JSON.stringify(source);
const fixed=normalizeCensusRings(source);assert.equal(fixed.repaired,1);assert.equal(polygons(fixed.geometry).length,2);assert.equal(polygons(fixed.geometry)[0].length,2);assert(!landIndex(polygons(fixed.geometry).flat())([5,5]));assert(landIndex(polygons(fixed.geometry).flat())([2,2]));assert(landIndex(polygons(fixed.geometry).flat())([20.5,.5]));assert.equal(JSON.stringify(source),snapshot,'Retained source bytes and input geometry remain unchanged');
assert.equal(normalizeCensusRings(fixed.geometry).repaired,0,'Normalization is idempotent');
console.log('Canadian source rings: enclosed service components become holes, separate islands survive, source remains unchanged and repeat processing is stable.');
