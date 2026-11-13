import assert from 'node:assert/strict';
export default [false,true].map(mobile=>({name:'Zagreb has one card across both levels '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#croatia');await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');
 const cards=[];
 for(const [id,level,key]of [['HR050',1,'first'],['HR_01333',2,'second']]){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.waitFor('document.querySelector("#hr-explore-panel .region-statistics")?.dataset.region==="croatia:HR050"&&!!document.querySelector("#hr-explore-panel .population-total")?.textContent');
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),'HR050');assert.equal(await p.evaluate('currentAtlas().getMode()'),level);
  assert.deepEqual(await p.evaluate('map.getFilter("croatia-'+key+'-selected")'),['==',['get','id'],id]);
  assert(await p.evaluate('document.getElementById("hr-subdivisions").hidden'));
  cards.push(await p.evaluate('({title:document.getElementById("hr-name").textContent,pop:document.querySelector("#hr-explore-panel .population-total").textContent})'));
 }
 assert.deepEqual(cards[0],cards[1]);assert.equal(cards[0].title,'Zagreb');
 await p.evaluate('currentAtlas().setMode(1)');await p.settle();assert.deepEqual(await p.evaluate('map.getFilter("croatia-first-selected")'),['==',['get','id'],'HR050']);
 await p.evaluate('currentAtlas().setMode(2)');await p.settle();assert.deepEqual(await p.evaluate('map.getFilter("croatia-second-selected")'),['==',['get','id'],'HR_01333']);
 const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);await p.waitFor('currentAtlas().getSelection()==="HR050"&&currentAtlas().getMode()===2');
 await p.evaluate('(()=>{const i=document.getElementById("hr-search");i.value="Grad Zagreb";i.dispatchEvent(new Event("input",{bubbles:true}))})()');
 assert.equal(await p.evaluate('[...document.querySelectorAll("#hr-search-results button")].filter(b=>b.querySelector("strong")?.textContent==="Zagreb").length'),1);
 await p.evaluate('currentAtlas().restore("HR065")');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'HR065');
 await p.screenshot('zagreb-shared-page-'+(mobile?'phone':'desktop'));
}}));
