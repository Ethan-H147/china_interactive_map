import assert from 'node:assert/strict';
import {SCALE} from '../dist/geo-pack.mjs';

// Rounding to 1e-7 degrees moves a coordinate by at most half a step.
export const TOLERANCE=0.5/SCALE*(1+1e-9)+1e-13;

// Decoded compact geometry against its source: identical structure and values, except
// path coordinates, which may differ by the rounding (tolerance: half the step of a coarser
// scale). derived: properties computed from geometry, each with a check (actual, source) =>
// whether its difference is acceptable. Returns the largest coordinate difference seen.
export function assertNearGeo(actual,expected,label,tolerance=TOLERANCE,derived={}){
 let worst=0;
 const walk=(a,e,where,inCoordinates,key)=>{
  if(typeof e==='number'&&typeof a==='number'){
   if(Object.is(a,e))return;
   const diff=Math.abs(a-e);
   if(key in derived&&derived[key](a,e))return;
   if(!inCoordinates||!(diff<=tolerance))assert.fail(`${label}: ${where} is ${a}, source ${e}`);
   worst=Math.max(worst,diff);return;
  }
  if(Array.isArray(e)){
   if(!Array.isArray(a)||a.length!==e.length)assert.fail(`${label}: ${where} has ${Array.isArray(a)?a.length:typeof a} items, source ${e.length}`);
   for(let i=0;i<e.length;i++)walk(a[i],e[i],where+'['+i+']',inCoordinates);return;
  }
  if(e&&typeof e==='object'){
   if(!a||typeof a!=='object'||Array.isArray(a))assert.fail(`${label}: ${where} is not an object`);
   assert.deepEqual(Object.keys(a),Object.keys(e),`${label}: ${where} keys`);
   for(const k of Object.keys(e))walk(a[k],e[k],where+'.'+k,inCoordinates||k==='coordinates',k);return;
  }
  if(!Object.is(a,e))assert.fail(`${label}: ${where} is ${JSON.stringify(a)}, source ${JSON.stringify(e)}`);
 };
 walk(actual,expected,'',false);
 return worst;
}
