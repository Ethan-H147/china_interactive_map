import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
import {chooseMapView} from './map-view-dropdown.test.mjs';
export default [
 {name:'mobile county and area-code navigation',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'Orleans LA','Orleans Parish','Parish');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-COUNTY-22071');
  await page.screenshot('us-orleans-mobile');
  await searchAndSelect(page,'213','Area code 213','Telephone area');
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'area-codes');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-NPA-213');
  await page.screenshot('us-area-code-mobile');
  await page.evaluate('void currentAtlas().home()');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),null);
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'area-codes');
  assert(!await page.evaluate('document.getElementById("us-detail-hint").hidden'));
 }},

 {name:'counties load by state and remain visible during county flights',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  assert(!await page.evaluate('!!map.getSource("united-states-second")'),'No nationwide county geometry at startup');
  await searchAndSelect(page,'Los Angeles CA','Los Angeles County','County');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-COUNTY-06037');
  assert(await page.evaluate('map.getLayoutProperty("united-states-second-lines","visibility")==="visible"'));
  await page.evaluate('window.countyVisibility=[];map.on("move",()=>window.countyVisibility.push(map.getLayoutProperty("united-states-second-lines","visibility")))');
  await searchAndSelect(page,'San Diego CA','San Diego County','County');
  assert(await page.evaluate('window.countyVisibility.length>0&&window.countyVisibility.every(v=>v==="visible")'));
  await page.screenshot('us-california-counties');
  await searchAndSelect(page,'Cook Illinois','Cook County','County');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-COUNTY-17031');
  assert(!await page.evaluate('map.querySourceFeatures("united-states-second").some(f=>f.properties.id==="US-COUNTY-06037")'),'Previous state geometry was released');
 }},
 {name:'area-code search, partial overlays, services, reload and county return',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  await searchAndSelect(page,'212','Area code 212','Telephone area');
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'area-codes');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-NPA-212');
  assert(!await page.evaluate('!!map.getSource("united-states-second")'));
  assert(await page.evaluate('document.getElementById("us-statistics").hidden'),'A code does not inherit state GDP');
  const small=await page.evaluate('map.getBounds().getEast()-map.getBounds().getWest()');
  await searchAndSelect(page,'917','Area code 917','Telephone area');
  assert((await page.evaluate('map.getBounds().getEast()-map.getBounds().getWest()'))>small,'917 covers more than Manhattan');
  await page.screenshot('us-new-york-area-codes');
  const hash=await page.evaluate('AtlasView.hashFor(captureView())');
  await page.open(base,hash);await page.send('Page.reload');await page.waitFor('currentAtlas()?.getSelection()==="US-NPA-917"');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'area-codes');
  assert(await page.evaluate('map.getLayoutProperty("united-states-area-codes-lines","visibility")==="visible"'));
  await searchAndSelect(page,'800','Area code 800','Non-geographic service');
  assert(await page.evaluate('document.getElementById("us-area-code-card").textContent.includes("No geographic area")'));
  await searchAndSelect(page,'Los Angeles CA','Los Angeles County','County');
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'');
  assert(!await page.evaluate('!!map.getSource("united-states-area-codes")'));
 }},
 {name:'area-code controls, satellite and eviction remain bounded',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'California','California','State');
  await page.tap('#mode-lock');await page.tap('#mode-province');await chooseMapView(page,'area-codes');await page.waitFor('currentAtlas().getScope()==="area-codes"&&map.getLayer("united-states-area-codes-fill")&&map.getLayoutProperty("united-states-area-codes-fill","visibility")==="visible"');
  await page.settle();await page.evaluate('document.getElementById("map-view").value="administrative";document.getElementById("map-view").dispatchEvent(new Event("change"));document.getElementById("map-view").value="area-codes";document.getElementById("map-view").dispatchEvent(new Event("change"))');await page.waitFor('map.getLayer("united-states-area-codes-fill")&&map.getLayoutProperty("united-states-area-codes-fill","visibility")==="visible"');assert.equal(await page.evaluate('currentAtlas().getScope()'),'area-codes');assert(!await page.evaluate('!!map.getSource("united-states-second")'));await page.evaluate('document.getElementById("satellite-layer").click()');await page.settle();
  assert.equal(await page.evaluate('map.getLayoutProperty("united-states-area-codes-lines","visibility")'),'visible');
  await page.screenshot('us-area-codes-satellite');
  for(const c of ['canada','mexico','denmark']){await page.evaluate('location.hash="#'+c+'"');await page.waitFor('AtlasEntry.current==="'+c+'"');await page.settle();}
  assert(!await page.evaluate('!!map.getSource("united-states-area-codes")||!!map.getSource("united-states-second")'));
  assert((await page.evaluate('AtlasCountryMemory.snapshot().countries.length'))<=3);
  await page.evaluate('location.hash="#united-states"');await page.waitFor('AtlasEntry.current==="united-states"');await page.settle();
  await searchAndSelect(page,'684','Area code 684','Telephone area');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-NPA-684');
 }}
];
