import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
import {chooseMapView} from './map-view-dropdown.test.mjs';

export default [1280,390].map(width=>({name:'South America uses the US renderer, preserves selections and special views '+width,options:{width,height:900,mobile:width===390},async run(page,base){
 const open=async(hash)=>{await page.open(base,hash);await page.waitFor('currentAtlas()?.ready&&!countrySwitching&&!cameraBusy&&AtlasRenderPipeline.snapshot().phase==="ready"');};
 await open('#united-states');await page.evaluate('currentAtlas().restore("US-OH")');await page.settle();
 const reference=await page.evaluate('document.querySelector("#united-states-sidebar .country-selection-heading").className');
 for(const [country,prefix,id,name,flagCount]of [['brazil','br','BR-17','Tocantins',2],['uruguay','uy','UY-FD','Florida',1],['argentina','ar','AR-06','Buenos Aires',2]]){
  console.log('Shared renderer check: '+country+' '+width);await open('#'+country);
  assert.equal(await page.evaluate('AtlasCountries.countries['+JSON.stringify(country)+'].adapter'),'europe');
  assert(await page.evaluate('document.getElementById('+JSON.stringify(country+'-sidebar')+').classList.contains("regional-sidebar")'));
  assert.equal(await page.evaluate('!!document.getElementById("south-america-sidebar")'),false,'The old adapter is not installed');
  assert.equal(await page.evaluate('document.getElementById('+JSON.stringify(prefix+'-layers-panel')+').hidden'),false);
  await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),id);
  assert.equal(await page.evaluate('document.getElementById('+JSON.stringify(prefix+'-name')+').textContent'),name);
  assert.equal(await page.evaluate('document.querySelector('+JSON.stringify('#'+country+'-sidebar .country-selection-heading')+').className'),reference);
  await page.waitFor('(()=>{const images=[...document.querySelectorAll('+JSON.stringify('#'+country+'-sidebar .division-flags img')+')].filter(e=>e.getClientRects().length);return images.length==='+flagCount+'&&images.every(e=>e.complete&&e.naturalWidth)})()');
  await page.waitFor('document.querySelector('+JSON.stringify('#'+prefix+'-explore-panel .region-statistics')+')?.dataset.region==='+JSON.stringify(country+':'+id));
  assert(await page.evaluate('mapScene.sourceInventory().some(id=>id==='+JSON.stringify(country+'-first')+')'));
  assert(!await page.evaluate('mapScene.sourceInventory().some(id=>/^south-(?:brazil|argentina|uruguay|america|land|river)-|^arg-local-|^br-local-|^uy-local-/.test(id))'));
  assert(await page.evaluate('mapScene.assertOrder()'));
  assert(!await page.evaluate('document.documentElement.scrollWidth>innerWidth'));
  await page.screenshot('shared-renderer-'+country+'-'+width);
  await page.evaluate('currentAtlas().home()');await page.settle();
  assert.equal(await page.evaluate('document.getElementById('+JSON.stringify(prefix+'-layers-panel')+').hidden'),false);
 }
 await open('#brazil');await searchAndSelect(page,'Curitiba','Curitiba','Municipality');
 assert.equal(await page.evaluate('currentAtlas().getSelection()'),'BR-4106902');
 assert(await page.evaluate('map.getSource("brazil-second")!==undefined'));
 await chooseMapView(page,'ddd');await searchAndSelect(page,'Campinas','DDD 19','Telephone area code');
 assert.equal(await page.evaluate('currentAtlas().getSelection()'),'BR-DDD-19');
 const hash=await page.evaluate('AtlasView.hashFor(captureView())');await open(hash);await page.settle();
 assert.equal(await page.evaluate('currentAtlas().getScope()'),'ddd');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'BR-DDD-19');
 await chooseMapView(page,'cep');
 assert(await page.evaluate('document.getElementById("br-detail-hint").textContent.includes("licensed dataset")&&!document.getElementById("br-detail-hint").hidden'));
 await chooseMapView(page,'states');assert.equal(await page.evaluate('currentAtlas().getScope()'),'states');
 await open('#argentina');
 assert.equal(await page.evaluate('!!map.getSource("argentina-city-points")'),true);
 await page.evaluate('currentAtlas().restore("AR-CITY-03")');await page.settle();
 assert.equal(await page.evaluate('currentAtlas().getSelection()'),'AR-CITY-03');
 assert(await page.evaluate('!!map.getSource("argentina-third")'));
 await page.evaluate('currentAtlas().restore("AR-CITY-01")');await page.settle();
 assert.equal(await page.evaluate('currentAtlas().getSelection()'),'AR-02','CABA keeps one page');
 await open('#japan');assert(!await page.evaluate('mapScene.sourceInventory().some(id=>/^brazil-|^argentina-|^uruguay-/.test(id)&&!/-portal$|-international$/.test(id))'),'Leaving releases subdivision geometry');
}}));
