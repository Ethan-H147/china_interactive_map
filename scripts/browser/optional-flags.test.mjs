
import assert from'node:assert/strict';import{gunzipSync}from'node:zlib';import fs from'node:fs';import{europeExpansionFlags as flags}from'../../dist/europe-expansion-flags.mjs';import{searchAndSelect}from'./countries.test.mjs';
const camera='JSON.stringify([map.getCenter().toArray(),map.getZoom()])';
const check=(page,prefix,hidden)=>page.evaluate('document.getElementById('+JSON.stringify(prefix+'-detail-flag-source')+').hidden').then(value=>assert.equal(value,hidden));
async function reveal(page,prefix){await page.tap('#'+prefix+'-source-options summary');await page.tap('#'+prefix+'-optional-flags');}
export default [
 {name:'unofficial Belgian banners are hidden unless deliberately enabled',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#belgium');await searchAndSelect(page,'Hainaut','Hainaut','Province');
  await check(page,'be',true);assert.equal(await page.evaluate('document.getElementById("be-flag-caption").hidden'),true);assert.equal(await page.evaluate('document.getElementById("be-source-options").open'),false);
  await page.screenshot('unofficial-flags-hidden');
  const before=await page.evaluate(camera);await reveal(page,'be');await check(page,'be',false);assert.equal(await page.evaluate(camera),before,'Revealing flags does not move the map');
  assert((await page.evaluate('document.getElementById("be-flag-caption").textContent')).includes('Unofficial provincial banner'));
  await page.screenshot('unofficial-flags-option');
  await page.evaluate('currentAtlas().restore("BE33")');await check(page,'be',false);
  await page.tap('#be-optional-flags');await check(page,'be',true);
  const catalogue=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/belgium/catalogue.bin'))).records;
  const inherited=catalogue.find(r=>r.level===3&&r.parent==='BE33'&&!flags.belgium.detailFlags[r.id]);assert(inherited);
  await page.evaluate('currentAtlas().restore('+JSON.stringify(inherited.id)+')');await check(page,'be',true);
  await page.evaluate('currentAtlas().restore("BE_62063")');await check(page,'be',false);assert.equal(await page.evaluate('document.getElementById("be-detail-flag").getAttribute("src")'),flags.belgium.detailFlags.BE_62063.file);
  await page.open(base,'#belgium');await page.evaluate('currentAtlas().restore("BE32")');await check(page,'be',true);
 }},
 {name:'unofficial Dutch logo flag is optional while Amsterdam stays visible',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#netherlands');await page.evaluate('currentAtlas().restore("NL_GM1942")');await check(page,'nl',true);
  await reveal(page,'nl');await check(page,'nl',false);await page.tap('#nl-optional-flags');await check(page,'nl',true);
  await page.evaluate('currentAtlas().restore("NL_GM0363")');await check(page,'nl',false);
 }},
 {name:'municipal flag renditions follow the same optional policy',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#germany');await page.evaluate('currentAtlas().restore("DE_03241005")');await check(page,'de',true);
  await reveal(page,'de');await check(page,'de',false);await page.tap('#de-optional-flags');await check(page,'de',true);
  await page.evaluate('currentAtlas().restore("DE_05334002")');await check(page,'de',false);
 }},
 {name:'discreet source option works on a phone',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#belgium');await searchAndSelect(page,'Hainaut','Hainaut','Province');await check(page,'be',true);
  await page.tap('#belgium-sidebar .sheet-handle');await reveal(page,'be');await check(page,'be',false);
  await page.tap('#be-detail-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');await page.key('Escape');
  await page.tap('#be-optional-flags');await check(page,'be',true);
 }}
];
