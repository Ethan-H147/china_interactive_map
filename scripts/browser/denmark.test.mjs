import assert from 'node:assert/strict';import{load}from'../geo-index.mjs';import{searchAndSelect}from'./countries.test.mjs';
const catalogue=load('dist/data/europe/denmark/catalogue.bin').records,delta=(a,b)=>Math.abs(((a-b+540)%360)-180);
export default [
 ...[{width:1280,height:820},{width:390,height:844,mobile:true}].map(options=>({name:'Denmark public route, Copenhagen, economy and Nuuk '+options.width,options,async run(page,base){
 await page.open(base,'#denmark');assert.equal(await page.evaluate('AtlasEntry.current'),'denmark');assert.equal(await page.evaluate('AtlasDev.enabled'),false);assert(await page.evaluate('map.getCenter().lng>8&&map.getCenter().lng<16'));
 await searchAndSelect(page,'Copenhagen','Copenhagen','Municipality');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'DK_101');assert.equal(await page.evaluate('currentAtlas().getMode()'),2);assert(!await page.evaluate("!!map.getLayer('denmark-third-fill')"));assert(await page.evaluate('document.querySelector("#denmark-sidebar .division-flags>img").getBoundingClientRect().width>30'),'The viewBox-only national flag has a visible thumbnail');
 await searchAndSelect(page,'Capital Region','Capital Region of Denmark','Region');await page.waitFor('document.querySelector("#denmark-sidebar .country-info-cards").textContent.includes("GDP")');
 await searchAndSelect(page,'Nuuk','Nuuk','Town');assert((await page.evaluate('currentAtlas().getSelection()')).startsWith('DK-S-'));await page.waitFor('document.querySelector("#denmark-sidebar .country-info-cards").textContent.includes("20,384")');
 const hash=await page.evaluate('AtlasView.hashFor(captureView())');assert(hash.includes('denmark'));await page.send('Page.navigate',{url:'about:blank'});await page.open(base,hash);assert((await page.evaluate('currentAtlas().getSelection()')).startsWith('DK-S-'));assert(delta((await page.evaluate('map.getCenter().toArray()'))[0],-51.737)<1);
 assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'));await page.screenshot('denmark-nuuk-'+options.width);
 }})),
 ...['DK-GL','DK-FO'].map(id=>({name:'clicking '+id+' opens Denmark at the territory',options:{width:1280,height:820},async run(page,base){
 const r=catalogue.find(r=>r.id===id);await page.open(base,'#china');await page.evaluate('void map.jumpTo({center:'+JSON.stringify(r.center)+',zoom:'+(id==='DK-GL'?4:9)+'})');await page.settle();await page.waitFor('!!map.getLayer("denmark-portal-fill")&&map.isSourceLoaded("denmark-portal")');
 const point=await page.evaluate('(()=>{window.realmMoves=[];map.on("move",()=>window.realmMoves.push(map.getCenter().toArray()));const p=map.project('+JSON.stringify(r.center)+'),b=map.getCanvas().getBoundingClientRect();return [b.left+p.x,b.top+p.y]})()');await page.tap(point);await page.waitFor('AtlasEntry.current==="denmark"&&currentAtlas()?.getSelection()==='+JSON.stringify(id));await page.settle();
 const [[w,s],[e,n]]=r.bounds,moves=await page.evaluate('window.realmMoves');assert(moves.every(p=>delta(p[0],(w+e)/2)<(e-w)/2+3),'No detour through European Denmark');
 assert(await page.evaluate('document.getElementById("dk-flag").complete&&document.getElementById("dk-flag").naturalWidth>0'));await page.screenshot('denmark-territory-'+id);
 await page.tap('#dk-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');await page.key('Escape');
 }})),
 {name:'Faroese municipalities, Greenland municipalities and bare coastlines',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#denmark');await searchAndSelect(page,'Torshavn','Tórshavn','Municipality');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'FO-M-29');await page.screenshot('denmark-faroe-municipalities');
 await searchAndSelect(page,'Avannaata','Avannaata','Municipality');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'GL-AV');
 await searchAndSelect(page,'Christiansø','Christiansø','State-administered area');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'DK_411');
 assert.equal(await page.evaluate('mapScene.assertOrder()'),true);
 }}
];
