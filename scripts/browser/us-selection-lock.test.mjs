import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
async function at(page,coordinates){
 await page.evaluate('void map.jumpTo({center:'+JSON.stringify(coordinates)+',zoom:9})');await page.settle();
 return page.evaluate('(()=>{const p=map.project('+JSON.stringify(coordinates)+'),r=map.getCanvas().getBoundingClientRect();return [r.left+p.x,r.top+p.y]})()');
}
export default [1280,390].map(width=>({
 name:'municipality lock rejects underlying counties and states '+width,
 options:width===390?{width,height:844,mobile:true}:{width,height:820},
 async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'San Diego CA','San Diego','City');
  await page.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-0666000');
  await page.tap('#mode-lock');
  const rural=[-115.7,34.8],ruralPoint=await at(page,rural);
  const hits=await page.evaluate('(()=>{const p=map.project('+JSON.stringify(rural)+');return {county:map.queryRenderedFeatures(p,{layers:["united-states-second-fill"]}).map(f=>f.properties.id),municipalities:map.queryRenderedFeatures(p,{layers:["united-states-third-fill"]}).map(f=>f.properties.id)}})()');
  assert(hits.county.includes('US-COUNTY-06071'),'Rural point hits San Bernardino County');
  assert.equal(hits.municipalities.length,0,'Rural point has no enabled municipal polygon');
  await page.tap(ruralPoint);await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-0666000','Locked municipality view must not select the underlying county');
  assert.equal(await page.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(rural)+'))?.id'),undefined,'Underlying county is not offered by hover');
  assert.equal(await page.evaluate('currentAtlas().hoverAt(null,"US-COUNTY-06071")?.id'),undefined,'A county label cannot bypass the lock');
  await page.tap(await at(page,[-118.2437,34.0522]));await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-0644000','Another municipality remains selectable');
  assert.equal(await page.evaluate('currentAtlas().getMode()'),3);
  await page.tap(await at(page,[-112.074,33.4484]));await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-0644000','The underlying state outside loaded municipal coverage is not selected');
  await page.tap('#mode-lock');await page.tap(await at(page,rural));await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-COUNTY-06071','Unlocking restores normal parent fallback');
  assert.equal(await page.evaluate('currentAtlas().getMode()'),2);
 }
}));
