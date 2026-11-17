import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'Soviet republics reuse province cards, dates stay in Sources and 1956 merges into 1988 '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#russia/history=1956');await p.waitFor('currentAtlas().historicalYear===1988');await p.settle();
 assert.equal(await p.evaluate('[...document.querySelectorAll("#russia-history-dock [data-year]")].filter(el=>el.dataset.year==="1956").length'),0);
 assert.equal(await p.evaluate('document.querySelectorAll("#russia-history-dock [role=option]").length'),39);
 await p.evaluate('void currentAtlas().restore("SU-RU","history")');await p.waitFor('document.querySelector("#russia-sidebar .population-total")?.textContent.includes("147,400,537")');await p.settle();
 assert.equal(await p.evaluate('document.getElementById("ru-history-card").hidden'),true);
 const text=await p.evaluate('document.getElementById("ru-explore-panel").textContent');assert(!/These dates remain distinct|Crimea and Sevastopol|atlas’s original 1988 snapshot/.test(text));
 assert(await p.evaluate('!document.getElementById("ru-flag-source").hidden&&document.getElementById("ru-flag").closest(".selection-top")!==null'));
 assert.equal(await p.evaluate('document.getElementById("ru-capital").textContent'),'Moscow');
 assert.match(await p.evaluate('document.querySelector("#russia-sidebar .statistics-area").textContent'),/17,075,400/);
 assert.match(await p.evaluate('document.getElementById("ru-source-options").textContent'),/1 January 1988/);assert.match(await p.evaluate('document.getElementById("ru-source-options").textContent'),/1 January 1989/);assert.match(await p.evaluate('document.getElementById("ru-source-options").textContent'),/12 January 1989/);
 await p.evaluate('AtlasComfort.set({appearance:"light"})');await p.settle();
 if(width===390){for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#russia-sidebar .sheet-handle');await p.settle();}
 await p.screenshot('russia-province-cards-'+width);
 if(width!==390){await p.tap('#ru-flag');await p.waitFor('document.getElementById("flag-viewer").open');await p.tap('.flag-viewer-close');}
 await p.evaluate('void currentAtlas().setHistoryYear(1991)');await p.settle();assert.equal(await p.evaluate('document.querySelector("#russia-sidebar .archipelago-population").hidden'),true);assert(await p.evaluate('document.getElementById("ru-flag-source").hidden'));
 await p.evaluate('void currentAtlas().setHistoryYear(1956)');await p.waitFor('currentAtlas().historicalYear===1988');await p.settle();assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.settle();assert(!await p.evaluate('currentAtlas().historicalActive'));assert.equal(await p.evaluate('document.getElementById("ru-history-source-notes").hidden'),true);
} }));
