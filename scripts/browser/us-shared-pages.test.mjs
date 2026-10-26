import assert from 'node:assert/strict';
import fs from 'node:fs';
const defs=JSON.parse(fs.readFileSync('dist/data/europe/united-states/shared-place-pages.json'));
const examples=['US-COUNTY-29510','US-COUNTY-51760','US-COUNTY-51720','US-COUNTY-24510','US-COUNTY-32510','US-COUNTY-08031','US-COUNTY-42101','US-COUNTY-47037','US-COUNTY-25019','US-COUNTY-06075'].map(id=>defs.pages.find(p=>p.id===id));
export default [false,true].map(mobile=>({name:'Shared city/county pages preserve map levels, one identity and statistics '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#united-states');
 for(const page of examples){
  const snapshots=[];
  for(const [id,level]of [[page.id,2],[page.municipality,3]]){
   await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');
   await p.waitFor('document.querySelector("#us-explore-panel .region-statistics")?.dataset.region==='+JSON.stringify('united-states:'+page.id)+'&&!!document.querySelector("#us-explore-panel .population-total")?.textContent');
   assert.equal(await p.evaluate('currentAtlas().getSelection()'),page.id);
   assert.equal(await p.evaluate('currentAtlas().getMode()'),level);
   const layer=level===2?'united-states-second':'united-states-third';
   assert.deepEqual(await p.evaluate('map.getFilter('+JSON.stringify(layer+'-selected')+')'),['==',['get','id'],id]);
   assert.equal(await p.evaluate('map.getFeatureState({source:'+JSON.stringify(layer)+',id:'+JSON.stringify(id)+'}).selected'),true);
   assert.equal(await p.evaluate('document.getElementById("us-kind").textContent'),page.kind.toUpperCase());
   assert.equal(await p.evaluate('document.getElementById("us-name").textContent'),page.name);
   snapshots.push(await p.evaluate('JSON.stringify({name:document.getElementById("us-name").textContent,kind:document.getElementById("us-kind").textContent,note:document.getElementById("us-status").textContent,stats:document.querySelector("#us-explore-panel .country-info-cards").textContent,flags:[...document.querySelectorAll("#us-explore-panel .division-flags img")].map(i=>i.getAttribute("src")),breadcrumb:document.getElementById("breadcrumb-region").textContent})'));
  }
  assert.equal(snapshots[0],snapshots[1],page.name+' has identical details at both levels');
  await p.evaluate('currentAtlas().setMode(2)');
  assert.deepEqual(await p.evaluate('map.getFilter("united-states-second-selected")'),['==',['get','id'],page.id]);
  await p.evaluate('currentAtlas().setMode(3)');
  assert.deepEqual(await p.evaluate('map.getFilter("united-states-third-selected")'),['==',['get','id'],page.municipality]);
 }
 assert.equal(await p.evaluate('document.getElementById("us-status").matches(":popover-open")'),false);
 await p.tap('#us-status-info');
 assert.equal(await p.evaluate('document.getElementById("us-status").matches(":popover-open")'),true);
 assert(await p.evaluate('!!document.querySelector("#us-status a[href^=https]")'));
 await p.screenshot('jurisdiction-info-'+(mobile?'phone':'desktop'));
 await p.key('Escape');
 assert.equal(await p.evaluate('document.getElementById("us-status").matches(":popover-open")'),false);
 await p.screenshot('san-francisco-shared-page-'+(mobile?'phone':'desktop'));
 await p.evaluate('currentAtlas().restore("US-COUNTY-29510")');
 await p.screenshot('st-louis-shared-page-'+(mobile?'phone':'desktop'));
 await p.evaluate('(()=>{const e=document.getElementById("us-search");e.value="St. Louis";e.dispatchEvent(new Event("input",{bubbles:true}))})()');
 const results=await p.evaluate('[...document.querySelectorAll("#us-search-results button")].map(b=>b.textContent)');
 assert.equal(results.filter(t=>t.includes('Independent city')&&t.includes('Missouri')).length,1,'One St Louis city search result');
 assert(results.some(t=>t.includes('St. Louis County')),'Separate St Louis County remains searchable');
 await p.evaluate('(()=>{const input=document.getElementById("us-search");input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));})()');await p.tap('#us-status-info');await p.evaluate('currentAtlas().restore("US-COUNTY-29189")');assert.equal(await p.evaluate('document.getElementById("us-status").matches(":popover-open")'),false);assert.equal(await p.evaluate('document.getElementById("us-name").textContent'),'St. Louis County');
 assert.equal(await p.evaluate('document.getElementById("us-status-info").hidden'),true);
 // Saving the city-layer selection uses the canonical page ID plus its map level.
 await p.evaluate('currentAtlas().restore("US-PLACE-2965000")');
 const saved=await p.evaluate('({id:currentAtlas().getSelection(),mode:currentAtlas().getMode()})');
 await p.evaluate('currentAtlas().home()');await p.evaluate('currentAtlas().restore('+JSON.stringify(saved.id)+')');await p.evaluate('currentAtlas().setMode('+saved.mode+',false,true)');
 assert.equal(await p.evaluate('currentAtlas().getSelection()'),saved.id);assert.deepEqual(await p.evaluate('map.getFilter("united-states-third-selected")'),['==',['get','id'],'US-PLACE-2965000']);
 for(const level of [2,3]){
  await p.evaluate('currentAtlas().restore("US-MO")');await p.evaluate('currentAtlas().setMode('+level+')');
  await p.evaluate('void map.jumpTo({center:[-90.2451,38.6358],zoom:10})');await p.settle();
  const point=await p.evaluate('(()=>{const p=map.project([-90.2451,38.6358]),b=map.getCanvas().getBoundingClientRect();return [p.x+b.left,p.y+b.top]})()');
  await p.tap(point);await p.waitFor('currentAtlas().getSelection()==="US-COUNTY-29510"');
  assert.equal(await p.evaluate('currentAtlas().getMode()'),level,'Map click preserves the chosen administrative level');
 }
}}));
