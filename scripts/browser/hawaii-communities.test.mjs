import assert from 'node:assert/strict';
const regions=p=>p.evaluate('fetch(map.getSource("united-states-third").serialize().data).then(r=>r.json()).then(d=>[...new Map(d.features.map(f=>[f.properties.id,f.properties])).values()])');
async function communities(p,width){if(width===390)await p.tap('.map-mode button[aria-pressed=true]:not(#mode-lock)');await p.tap('#mode-third');await p.settle();}
export default [1280,390].map(width=>({name:'Hawaii communities appear without enabling Census places in other states '+width,options:{width,height:960,mobile:width===390},async run(p,base){
 await p.open(base,'#united-states');assert.equal(await p.evaluate('document.getElementById("us-census-places").checked'),false);
 await p.evaluate('currentAtlas().restore("US-HI")');await p.settle();await communities(p,width);
 const places=await regions(p);assert.equal(places.length,163,'Hawaii uses its complete Census-community chunk');assert(places.every(r=>r.incorporated===false),'Communities retain their statistical classification');
 assert.equal(await p.evaluate('document.getElementById("mode-third").textContent'),'Communities');
 assert.equal(await p.evaluate('document.getElementById("us-census-places").checked'),false,'Hawaii does not alter the optional-places preference');
 assert(await p.evaluate('document.getElementById("us-census-places").closest("label").hidden'));
 assert(await p.evaluate('!document.getElementById("us-detail-hint").hidden&&document.getElementById("us-detail-hint").textContent.includes("Census-designated")'));
 await p.evaluate('void map.jumpTo({center:[-157.85,21.35],zoom:9})');await p.settle();assert(await p.evaluate('map.queryRenderedFeatures({layers:["united-states-third-fill"]}).length>0'),'Community boundaries render on Oahu');await p.screenshot('hawaii-communities-'+width);
 await p.evaluate('currentAtlas().restore("US-PLACE-1571550")');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'US-PLACE-1571550');assert(await p.evaluate('document.getElementById("us-municipal-card").textContent.includes("not an incorporated")'));
 assert.equal(await p.evaluate('document.getElementById("us-census-places").checked'),false,'Searching Hawaii communities keeps other-state preferences unchanged');
 const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'US-PLACE-1571550');assert.equal((await regions(p)).length,163,'A saved Hawaii community restores the correct boundary file');
 await p.evaluate('currentAtlas().restore("US-CA")');await p.settle();await communities(p,width);assert((await regions(p)).every(r=>r.incorporated===true),'Other states still exclude optional Census communities by default');
 assert.equal(await p.evaluate('document.getElementById("mode-third").textContent'),'Municipalities');assert(await p.evaluate('!document.getElementById("us-census-places").closest("label").hidden'));
}}));
