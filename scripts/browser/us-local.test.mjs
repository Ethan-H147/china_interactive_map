import assert from 'node:assert/strict';
import {searchAndSelect as pickSearch} from './countries.test.mjs';
async function searchAndSelect(page,...args){await pickSearch(page,...args);await page.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"',{timeout:45000,label:'selected US boundaries to finish indexing'});await page.settle();}
import {chooseMapView} from './map-view-dropdown.test.mjs';
const selected=(page,id)=>page.waitFor('currentAtlas()?.getSelection()==='+JSON.stringify(id));
export default [
 {name:'municipalities retain whole boundaries and survive flights',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  assert(!await page.evaluate('!!map.getSource("united-states-third")||!!map.getSource("united-states-zip-codes")'));
  await searchAndSelect(page,'Los Angeles CA','Los Angeles','City');await selected(page,'US-PLACE-0644000');
  assert.equal(await page.evaluate('currentAtlas().getMode()'),3);
  assert.equal(await page.evaluate('map.getLayoutProperty("united-states-third-lines","visibility")'),'visible');
  assert(await page.evaluate('[...document.querySelectorAll("#united-states-sidebar .population-total")].some(p=>p.textContent.includes("3,869,089"))'));
  await page.evaluate('window.placeVisibility=[];map.on("move",()=>window.placeVisibility.push(map.getLayoutProperty("united-states-third-lines","visibility")))');
  await searchAndSelect(page,'San Diego CA','San Diego','City');
  assert(await page.evaluate('window.placeVisibility.length>0&&window.placeVisibility.every(v=>v==="visible")'));
  await page.screenshot('us-municipalities-california');
  await searchAndSelect(page,'Aurora IL','Aurora','City');await selected(page,'US-PLACE-1703012');
  assert(!await page.evaluate('map.querySourceFeatures("united-states-third").some(f=>f.properties.id==="US-PLACE-0644000")'));
  await searchAndSelect(page,'Columbus OH','Columbus','City');await selected(page,'US-PLACE-3918000');
  await page.screenshot('us-municipalities-ohio');
 }},
 {name:'villages, optional Census places, coverage and municipality reload',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  await searchAndSelect(page,'Oak Park IL','Oak Park','Village');
  assert(await page.evaluate('document.getElementById("us-municipal-card").textContent.includes("Incorporated village")'));
  const id=await page.evaluate('currentAtlas().getSelection()'),hash=await page.evaluate('AtlasView.hashFor(captureView())');
  await page.open(base,hash);await page.send('Page.reload');await selected(page,id);await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getMode()'),3);
  await searchAndSelect(page,'Altadena CA','Altadena','Census-designated place');
  assert(await page.evaluate('document.getElementById("us-census-places").checked'));
  assert(await page.evaluate('document.getElementById("us-municipal-card").textContent.includes("not an incorporated")'));
  await page.evaluate('document.getElementById("us-census-places").click()');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-CA');
  assert.equal(await page.evaluate('currentAtlas().getMode()'),3);
  await searchAndSelect(page,'Texas','Texas','State');
  await page.tap('#mode-third');await page.settle();
  assert(await page.evaluate('document.getElementById("us-detail-hint").hidden&&!!map.getSource("united-states-third")'));
 }},
 {name:'ZIP lookup, leading zeroes, directory-only codes and reload',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  await searchAndSelect(page,'60601','ZIP 60601','ZIP code');await selected(page,'US-ZIP-60601');
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'zip-codes');
  assert.equal(await page.evaluate('map.getLayoutProperty("united-states-zip-codes-lines","visibility")'),'visible');
  assert(!await page.evaluate('!!map.getSource("united-states-second")||!!map.getSource("united-states-third")'));
  assert(await page.evaluate('document.getElementById("us-zip-code-card").textContent.includes("Census 2020 ZCTA")'));
  await page.screenshot('us-zip-chicago');
  const hash=await page.evaluate('AtlasView.hashFor(captureView())');await page.open(base,hash);await page.send('Page.reload');await selected(page,'US-ZIP-60601');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'zip-codes');
  await searchAndSelect(page,'00601','ZIP 00601','ZIP code');await selected(page,'US-ZIP-00601');
  await searchAndSelect(page,'00501','ZIP 00501','ZIP code');await selected(page,'US-ZIP-00501');
  assert(await page.evaluate('document.getElementById("us-zip-code-card").textContent.includes("No Census ZIP-area boundary")'));
  assert(await page.evaluate('document.getElementById("us-statistics").hidden'));
  await searchAndSelect(page,'09002','ZIP 09002','ZIP code');
  assert(await page.evaluate('!map.getSource("united-states-zip-codes")'));
 }},
 {name:'ZIP dropdown, cross-state areas, satellite and bounded eviction',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'California','California','State');
  await chooseMapView(page,'zip-codes');
  assert.equal(await page.evaluate('currentAtlas().getScope()'),'zip-codes');
  await chooseMapView(page,'area-codes');
  assert(!await page.evaluate('!!map.getSource("united-states-zip-codes")'));
  await searchAndSelect(page,'42223','ZIP 42223','ZIP code');
  assert(await page.evaluate('document.getElementById("us-zip-code-card").textContent.includes("crosses state lines")'));
  await page.evaluate('document.getElementById("satellite-layer").click()');await page.settle();
  assert.equal(await page.evaluate('map.getLayoutProperty("united-states-zip-codes-lines","visibility")'),'visible');
  for(const c of ['canada','mexico','denmark']){await page.evaluate('location.hash="#'+c+'"');await page.waitFor('AtlasEntry.current==="'+c+'"');await page.settle();}
  assert(!await page.evaluate('!!map.getSource("united-states-zip-codes")||!!map.getSource("united-states-third")'));
  assert((await page.evaluate('AtlasCountryMemory.snapshot().countries.length'))<=3);
  await page.evaluate('location.hash="#united-states"');await page.waitFor('AtlasEntry.current==="united-states"');await page.settle();await searchAndSelect(page,'Oak Park IL','Oak Park','Village');
 }},
 {name:'phone municipality and ZIP controls fit and switch cleanly',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'Columbus OH','Columbus','City');
  await page.screenshot('us-municipalities-phone');
  await searchAndSelect(page,'43215','ZIP 43215','ZIP code');
  assert.equal(await page.evaluate('document.getElementById("map-view").value'),'zip-codes');
  await page.screenshot('us-zip-phone');
  await chooseMapView(page,'administrative');
  assert(!await page.evaluate('!!map.getSource("united-states-zip-codes")'));
 }}
];
