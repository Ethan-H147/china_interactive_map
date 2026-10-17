import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const places=[['paraguay','Filadelfia','Filadelfia','District','PY-T-1604',2],['peru','San Sebastián','San Sebastián','District','PE-D-080105',3]];
export default [
 ...places.flatMap(([country,query,pick,kind,id,level])=>[{width:1280,height:820},{width:390,height:844,mobile:true}].map(options=>({
  name:country+' public route, deepest division and reload '+options.width,options,async run(page,base){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasDev.enabled'),false);
   assert.equal(await page.evaluate('AtlasEntry.current'),country);
   await page.tap('#country-switch');
   assert(await page.evaluate('!!document.querySelector('+JSON.stringify('.country-option[data-atlas='+country+']')+')'),'Country is in the ordinary menu');
   await page.key('Escape');
   await searchAndSelect(page,query,pick,kind);
   assert.equal(await page.evaluate('currentAtlas().getSelection()'),id);
   assert.equal(await page.evaluate('currentAtlas().getMode()'),level);
   const hash=await page.evaluate('AtlasView.hashFor(captureView())');
   await page.open(base,hash);
   await page.waitFor('currentAtlas().getSelection()==='+JSON.stringify(id));
   assert.equal(await page.evaluate('AtlasDev.enabled'),false);
   assert.equal(await page.evaluate('currentAtlas().getMode()'),level);
  }
 }))),
 {name:'Pilcomayo frontier has no inland spike from either country',options:{width:1280,height:820},async run(page,base){
  for(const country of ['paraguay','argentina']){
   await page.open(base,'#'+country);
   await page.evaluate('void map.jumpTo({center:[-62.34,-23.1],zoom:6.2})');await page.settle();
   assert(await page.evaluate("!!map.getLayer('atlas-frontiers')"));
   assert.equal(await page.evaluate("(()=>{const p=map.project([-62.342017,-23.2]);return map.queryRenderedFeatures([[p.x-4,p.y-4],[p.x+4,p.y+4]],{layers:['atlas-frontiers']}).length})()"),0,'No international line projects into Argentina');
   assert(await page.evaluate("(()=>{const p=map.project([-62.3425,-22.4565]);return map.queryRenderedFeatures([[p.x-6,p.y-6],[p.x+6,p.y+6]],{layers:['atlas-frontiers']}).length>0})()"),'The real river frontier still renders');
   await page.screenshot('pilcomayo-fixed-'+country);
  }
 }}
];
