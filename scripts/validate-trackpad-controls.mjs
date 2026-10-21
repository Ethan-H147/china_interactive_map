import assert from 'node:assert/strict';
import {resolveMode,validateMode,wheelPixels} from '../dist/map-interaction.mjs';
assert.equal(validateMode('unknown'),'auto');assert.equal(validateMode('trackpad'),'trackpad');
assert.equal(resolveMode('auto',{platform:'MacIntel',maxTouchPoints:5}),'trackpad');assert.equal(resolveMode('auto',{platform:'Win32'}),'mouse');assert.equal(resolveMode('mouse',{platform:'MacIntel'}),'mouse');assert.equal(resolveMode('trackpad',{platform:'Win32'}),'trackpad');
assert.deepEqual(wheelPixels({deltaX:3,deltaY:-4,deltaMode:0},800,600),[3,-4]);assert.deepEqual(wheelPixels({deltaX:0,deltaY:2,deltaMode:1},800,600),[0,80]);assert.deepEqual(wheelPixels({deltaX:1,deltaY:-1,deltaMode:2},800,600),[800,-600]);assert.deepEqual(wheelPixels({deltaX:0,deltaY:5,deltaMode:0,shiftKey:true},800,600),[5,0]);assert.deepEqual(wheelPixels({deltaX:Infinity,deltaY:1,deltaMode:0},800,600),[0,0]);
console.log('Automatic iPad/mouse defaults, explicit overrides and two-axis wheel normalization passed.');
