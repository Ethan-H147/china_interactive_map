import assert from 'node:assert/strict';import {load} from '../geo-index.mjs';
const arcs=load('scripts/boundary-sources/us-canada/land-arcs.json');
const points=arcs.map(a=>({name:a.name,point:a.path[Math.floor(a.path.length/2)]}));
const sharedLandScenarios=[{name:'Shared land edge has no border chords in either country or projection',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-states');
 for(const country of ['united-states','canada']){
  if(country==='canada'){await p.evaluate("changeAtlas('canada',true)");await p.settle();}
  for(const projection of ['mercator','globe']){
   await p.evaluate(`document.getElementById('globe-view').setAttribute('aria-pressed','${projection==='globe'}');syncGlobe(false);void 0`);await p.settle();
   for(const {name,point}of points){await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:12});void 0`);await p.settle();
    const hits=await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(point)});return map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:['united-states-international','country-border-previews']}).filter(f=>f.properties.pair==='CAN-USA').length;})()`);assert(hits>0,'Border follows shared '+name+' edge in '+country+' '+projection);
    if(projection==='mercator')await p.screenshot('us-canada-'+name+'-'+country);
   }
  }
 }
 await p.evaluate("changeAtlas('united-states',true)");await p.settle();
 for(const point of [[-94.92,49.06],[-92.94,48.43]]){await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:10});void 0`);await p.settle();assert.equal(await p.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(point)}),{layers:['united-states-first-fill']}).length`),0,'Minnesota lake water remains carved out');}
 await p.evaluate("map.jumpTo({center:[-94.8,48.9],zoom:8.5});void 0");await p.settle();await p.screenshot('us-canada-minnesota-corrected');
}}];

// Independent survey anchors at the photographed crossing, not points copied
// from either displayed country outline.
export const surveyCrossingScenario={name:'Surveyed Peace Arch crossing and bay line stay on the real boundary',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-states');
 for(const country of ['united-states','canada']){
  if(country==='canada'){await p.evaluate("changeAtlas('canada',true)");await p.settle();}
  for(const globe of [false,true]){
   await p.evaluate(`document.getElementById('globe-view').setAttribute('aria-pressed','${globe}');syncGlobe(false);map.jumpTo({center:[-122.756948,49.002086],zoom:15});void 0`);await p.settle();
   const result=await p.evaluate(`(()=>{const q=map.project([-122.756948,49.002086]),s=map.project([-122.756948,49.0018]),n=map.project([-122.756948,49.00235]);return {line:map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:['country-border-previews','united-states-international']}).some(f=>f.properties.resolvedFrontier==='USA-CAN-SURVEYED'),south:map.queryRenderedFeatures(s,{layers:['${country}-first-fill']}).length,north:map.queryRenderedFeatures(n,{layers:['${country}-first-fill']}).length}})()`);
   assert(result.line,'IBC line is visible at the physical crossing');assert(country==='united-states'?result.south>0&&result.north===0:result.north>0&&result.south===0,'Correct customs jurisdiction on both sides');
  }
 }
 await p.evaluate("map.jumpTo({center:[-122.9,48.992515],zoom:15});void 0");await p.settle();
 assert.equal(await p.evaluate("(()=>{const q=map.project([-122.9,48.992515]);return map.queryRenderedFeatures([[q.x-4,q.y-4],[q.x+4,q.y+4]],{layers:['country-border-previews','united-states-international']}).filter(f=>f.properties.pair==='CAN-USA').length})()"),0,'Old kilometre-displaced water stroke is gone');
}};

export default [...sharedLandScenarios,surveyCrossingScenario];
