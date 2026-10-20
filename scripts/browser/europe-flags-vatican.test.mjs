import '../../dist/countries.js';

import assert from'node:assert/strict';
import{europeExpansionFlags as flags}from'../../dist/europe-expansion-flags.mjs';
import{searchAndSelect}from'./countries.test.mjs';
export default [
 ...Object.entries(flags).map(([country,c])=>({name:country+' all regional flags and originals',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#'+country);const optionPrefix=globalThis.AtlasCountries.countries[country].prefix;await page.tap('#'+optionPrefix+'-source-options summary');const optional='#'+optionPrefix+'-optional-flags';if(await page.evaluate('!!document.querySelector('+JSON.stringify(optional)+')?.getClientRects().length'))await page.tap(optional);
  for(const [id,f]of [...Object.entries(c.firstFlags),...Object.entries(c.detailFlags)]){
   await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');
   const own=!!c.detailFlags[id],prefix=globalThis.AtlasCountries.countries[country].prefix,image=prefix+(own?'-detail-flag':'-flag');
   await page.waitFor('(()=>{const i=document.getElementById('+JSON.stringify(image)+');return !i.closest("a").hidden&&i.getAttribute("src")==='+JSON.stringify(f.file)+'&&i.complete&&i.naturalWidth>0})()',{label:id+' flag'});
  }
  const prefix=globalThis.AtlasCountries.countries[country].prefix,id=Object.keys(c.firstFlags)[0],f=c.firstFlags[id];
  await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await page.tap('#'+prefix+'-flag-source');
  await page.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(f.full));await page.key('Escape');
  await page.screenshot('europe-flags-'+country);
 }})),
 ...[{width:1440,height:960},{width:390,height:844,mobile:true}].map(options=>({name:'Vatican Italy subpage '+options.width,options,async run(page,base){
  await page.open(base,'#italy');if(options.mobile)await page.tap('#it-tab-layers');assert.equal(await page.evaluate('document.querySelectorAll("#italy-sidebar a.country-subpage-link").length'),0);await page.open(base,'#vatican-city');await page.settle();
  await page.waitFor('AtlasEntry.current==="vatican-city"&&currentAtlas()?.ready&&currentAtlas().getSelection()==="VA"');
  assert.equal(await page.evaluate('document.getElementById("va-name").textContent'),'Vatican City');assert(await page.evaluate('map.getZoom()>14'));
  await page.tap('#country-switch');assert.equal(await page.evaluate('document.querySelectorAll("#country-menu [data-atlas=vatican-city]").length'),0);assert.equal(await page.evaluate('document.querySelector("#country-menu [aria-current=true]").dataset.atlas'),'italy');await page.key('Escape');
  await page.evaluate('document.querySelector(".vatican-devotion").scrollIntoView({block:"center"})');
  await page.screenshot('vatican-'+options.width);
  await page.evaluate('document.querySelector("[data-landmark=va-square]").scrollIntoView({block:"center"})');
  await page.tap('[data-landmark=va-square]');await page.settle();assert(await page.evaluate('map.getCenter().lng>12.454'));
  await page.open(base,'#vatican-city');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'VA');
  await page.tap('#vatican-city-sidebar .country-parent-link');await page.settle();assert.equal(await page.evaluate('AtlasEntry.current'),'italy');
  assert.equal(await page.evaluate('document.querySelector("#italy-sidebar").hidden'),false);
 }}))
];
