import assert from 'node:assert/strict';import {load} from '../geo-index.mjs';
const cat=load('dist/data/europe/france/catalogue.bin'),cases=[['FR-R-02','FR-D-972',34,'FR-C-97201',9],['FR-R-03','FR-D-973',22,'FR-C-97302',7],['FR-R-06','FR-D-976',17,'FR-C-97601',10]];
export default [false,true].map(mobile=>({name:'Merged overseas cards open selectable communes '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
for(const [region,department,count,commune,zoom]of cases){
 await p.open(base,'#france');await p.evaluate('AtlasSettings.setSettings({motion:"reduce"});void map.setProjection({type:"mercator"})');
 if(await p.evaluate('document.getElementById("mode-lock").getAttribute("aria-pressed")==="true"'))await p.tap('#mode-lock');
 const r=cat.records.find(r=>r.id===region),child=cat.records.find(r=>r.id===commune);
 await p.evaluate('void map.jumpTo({center:'+JSON.stringify(r.center)+',zoom:'+zoom+'})');await p.settle();
 const xy=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(r.center)+'),b=map.getCanvas().getBoundingClientRect();return [q.x+b.left,q.y+b.top]})()');await p.tap(xy);await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(region));
 assert.equal(await p.evaluate('currentAtlas().getMode()'),3,'Clicking the merged territory opens its communes');
 await p.waitFor('!!map.getLayer("france-third-fill")&&map.getLayoutProperty("france-third-fill","visibility")!=="none"');
 assert.equal(await p.evaluate('document.querySelectorAll("#fr-children button.search-result").length'),count);
 await p.waitFor('[...document.querySelectorAll("[data-atlas-place]")].some(e=>e.dataset.atlasPlace.startsWith('+JSON.stringify('FR-C-'+department.slice(-3))+'))');
 assert(!await p.evaluate('[...document.querySelectorAll("[data-atlas-place]")].some(e=>[ '+JSON.stringify(region)+','+JSON.stringify(department)+'].includes(e.dataset.atlasPlace))'),'The territory label gives way to commune labels');
 await p.screenshot('commune-labels-'+region+'-'+mobile);
 await p.evaluate('document.getElementById("fr-subdivisions").open=true');
 const selector=await p.evaluate('(()=>{const b=[...document.querySelectorAll("#fr-children button")].find(b=>b.textContent==='+JSON.stringify(child.en)+');b.id="commune-regression-target";return "#"+b.id})()');
 await p.evaluate('document.getElementById("commune-regression-target").scrollIntoView({block:"center"})');await p.tap(selector);await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(commune));assert.equal(await p.evaluate('document.getElementById("fr-kind").textContent'),'COMMUNE');
 await p.evaluate('currentAtlas().viewParent({duration:0})');await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(region));assert.equal(await p.evaluate('currentAtlas().getMode()'),3);
 await p.evaluate('void map.jumpTo({center:'+JSON.stringify(child.center)+',zoom:'+(zoom+2)+'})');await p.settle();
 const pos=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(child.center)+'),b=map.getCanvas().getBoundingClientRect();return [q.x+b.left,q.y+b.top]})()');await p.tap(pos);await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(commune));
 const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(commune)+'&&currentAtlas().getMode()===3');await p.screenshot('overseas-commune-'+commune+'-'+mobile);
}
}}));
