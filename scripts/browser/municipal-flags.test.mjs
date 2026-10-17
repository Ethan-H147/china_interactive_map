
import assert from'node:assert/strict';import fs from'node:fs';import{europeExpansionFlags as flags}from'../../dist/europe-expansion-flags.mjs';import{searchAndSelect}from'./countries.test.mjs';
export default [
 {name:'Amsterdam and Dutch major municipalities show their own flags',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#netherlands');await searchAndSelect(page,'Amsterdam','Amsterdam','Municipality');
 assert.equal(await page.evaluate('document.getElementById("nl-detail-flag").getAttribute("src")'),flags.netherlands.detailFlags.NL_GM0363.file);
 await page.tap('#nl-detail-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),flags.netherlands.detailFlags.NL_GM0363.full);await page.key('Escape');await page.screenshot('amsterdam-city-flag');
 await page.tap('#nl-source-options summary');await page.tap('#nl-optional-flags');
 for(const r of JSON.parse(fs.readFileSync('scripts/europe-city-flag-audit.json')).cities.filter(r=>r.country==='netherlands')){await page.evaluate('currentAtlas().restore('+JSON.stringify(r.id)+')');await page.waitFor('(()=>{const i=document.getElementById("nl-detail-flag");return !i.closest("a").hidden&&i.getAttribute("src")==='+JSON.stringify(flags.netherlands.detailFlags[r.id].file)+'&&i.complete&&i.naturalWidth>0})()');}
 }},
 {name:'German major municipalities including ordinary district towns have flags',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#germany');await page.tap('#de-source-options summary');await page.tap('#de-optional-flags');for(const name of ['Aachen','Hanover','Saarbrücken','Göttingen','Garbsen','Langenhagen']){await searchAndSelect(page,name,name,'Municipality');assert.equal(await page.evaluate('document.getElementById("de-detail-flag-source").hidden'),false);await page.waitFor('document.getElementById("de-detail-flag").complete&&document.getElementById("de-detail-flag").naturalWidth>0');}await page.screenshot('german-city-flags');
 }},
 {name:'Belgian city flags differ from provinces and unofficial banners are labeled',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#belgium');await page.tap('#be-source-options summary');await page.tap('#be-optional-flags');for(const id of ['BE32','BE33']){await page.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');assert.equal(await page.evaluate('document.getElementById("be-flag-caption").hidden'),false);assert((await page.evaluate('document.getElementById("be-flag-caption").textContent')).includes('Unofficial provincial banner'));}
 for(const r of JSON.parse(fs.readFileSync('scripts/europe-city-flag-audit.json')).cities.filter(r=>r.country==='belgium')){await page.evaluate('currentAtlas().restore('+JSON.stringify(r.id)+')');await page.waitFor('(()=>{const i=document.getElementById("be-detail-flag");return !i.closest("a").hidden&&i.getAttribute("src")==='+JSON.stringify(flags.belgium.detailFlags[r.id].file)+'&&i.complete&&i.naturalWidth>0})()');}
 await searchAndSelect(page,'Antwerp','Antwerp','Municipality');assert.notEqual(flags.belgium.detailFlags.BE_11002.file,flags.belgium.detailFlags.BE21.file);await page.screenshot('antwerp-city-flag');
 }},
 {name:'Amsterdam flag opens on a phone',options:{width:390,height:844,mobile:true},async run(page,base){await page.open(base,'#netherlands');await searchAndSelect(page,'Amsterdam','Amsterdam','Municipality');await page.tap('#nl-detail-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),flags.netherlands.detailFlags.NL_GM0363.full);await page.screenshot('amsterdam-flag-phone');}}
];
