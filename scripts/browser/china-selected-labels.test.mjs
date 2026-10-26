import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'Selected province gives prefecture labels space '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#china');
 await p.evaluate('selectRegion(provinceLayers.get(510000),510000,false)');
 await p.waitFor('detailLayers.get(510000)?.length>0');
 await p.evaluate('void map.jumpTo({center:[103,30.5],zoom:6})');await p.settle();
 await p.evaluate('updateLabels()');
 await p.waitFor('document.querySelectorAll(".province-label[data-atlas-place]").length>0');
 assert.equal(await p.evaluate('[...document.querySelectorAll("[data-atlas-place]")].some(e=>e.dataset.atlasPlace==="510000")'),false);
 assert(await p.evaluate('[...document.querySelectorAll(".province-label[data-atlas-place]")].some(e=>e.dataset.atlasPlace.startsWith("51")&&e.dataset.atlasPlace!=="510000")'));
 await p.evaluate('reset()');await p.settle();
 await p.evaluate('void map.jumpTo({center:[103,30.5],zoom:6})');await p.settle();
 await p.waitFor('[...document.querySelectorAll("[data-atlas-place]")].some(e=>e.dataset.atlasPlace==="510000")');
}}));
