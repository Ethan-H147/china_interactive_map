import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export async function chooseMapView(page,value){
 const indices=await page.evaluate('(()=>{const s=document.getElementById("map-view");return {current:s.selectedIndex,target:[...s.options].findIndex(o=>o.value==='+JSON.stringify(value)+')}})()');
 assert(indices.target>=0,'Map view is available');await page.tap('#map-view');
 assert(await page.evaluate('document.getElementById("map-view").matches(":open")'),'The dropdown opens on its first click');
 const diff=indices.target-indices.current;for(let i=0;i<Math.abs(diff);i++)await page.key(diff>0?'ArrowDown':'ArrowUp');await page.key('Enter');
 await page.waitFor('document.getElementById("map-view").value==='+JSON.stringify(value)+'&&document.getElementById("map-view").getAttribute("aria-busy")==="false"');await page.settle();
}
export default [
 ...[{width:1280,height:820},{width:390,height:844,mobile:true},{width:320,height:780,mobile:true}].flatMap(options=>[
 {name:'US map views beside the subdivision toggle '+options.width,options,async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'California','California','State');
  assert(!await page.evaluate('[...document.querySelectorAll(".map-mode button")].some(b=>b.textContent.includes("Area codes"))'));
  await page.tap('#map-view');assert(await page.evaluate('document.getElementById("map-view").matches(":open")'));await page.screenshot('us-map-view-menu-'+options.width);await page.key('Escape');
  await chooseMapView(page,'area-codes');assert.equal(await page.evaluate('currentAtlas().getScope()'),'area-codes');
  assert(await page.evaluate('getComputedStyle(document.querySelector(".map-mode")).display==="none"'),'Administrative levels are not offered as telephone subdivisions');const shared=await page.evaluate('AtlasView.hashFor(captureView())');await page.open(base,shared);await page.send('Page.reload');await page.waitFor('currentAtlas()?.getScope()==="area-codes"&&document.getElementById("map-view").value==="area-codes"');await page.settle();
  await chooseMapView(page,'administrative');assert.equal(await page.evaluate('currentAtlas().getScope()'),'');assert.equal(await page.evaluate('currentAtlas().getMode()'),2,'Previous county level restored');
  assert(await page.evaluate('getComputedStyle(document.querySelector(".map-mode")).display!=="none"'));
  const boxes=await page.evaluate('(()=>{const a=document.querySelector(".map-mode").getBoundingClientRect(),b=document.getElementById("map-view").getBoundingClientRect();return {left:a.left,right:a.right,dropdown:b.left,edge:b.right,width:innerWidth}})()');
  assert(boxes.dropdown>=boxes.right-1&&boxes.edge<=boxes.width,'The dropdown fits beside the toggle');
  await page.screenshot('us-map-view-administrative-'+options.width);
  await page.evaluate('location.hash="#china"');await page.waitFor('AtlasEntry.current==="china"');await page.settle();assert(await page.evaluate('document.getElementById("map-view").hidden'),'Country switch clears the picker');
 }},
 {name:'Brazil DDD map views beside the subdivision toggle '+options.width,options,async run(page,base){
  await page.open(base,'#brazil');if(await page.evaluate('!document.getElementById("mode-prefecture").getClientRects().length'))await page.tap('#mode-province');await page.tap('#mode-prefecture');assert(!await page.evaluate('!!document.getElementById("south-map-types")'),'No duplicate sidebar switch');
  await chooseMapView(page,'ddd');assert.equal(await page.evaluate('currentAtlas().getScope()'),'ddd');
  await searchAndSelect(page,'Campinas','DDD 19','Telephone area code');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'BR-DDD-19');
  await page.screenshot('brazil-map-view-ddd-'+options.width);
  const hash=await page.evaluate('AtlasView.hashFor(captureView())');await page.open(base,hash);await page.send('Page.reload');await page.waitFor('currentAtlas()?.getScope()==="ddd"&&currentAtlas()?.getSelection()==="BR-DDD-19"');await page.settle();
  assert.equal(await page.evaluate('document.getElementById("map-view").value'),'ddd');
  await chooseMapView(page,'states');assert.equal(await page.evaluate('currentAtlas().getScope()'),'states');assert.equal(await page.evaluate('document.getElementById("mode-prefecture").getAttribute("aria-pressed")'),'true','Previous municipality level restored');
  assert(await page.evaluate('getComputedStyle(document.querySelector(".map-mode")).display!=="none"'));
  await page.screenshot('brazil-map-view-administrative-'+options.width);
 }}
 ])
];
