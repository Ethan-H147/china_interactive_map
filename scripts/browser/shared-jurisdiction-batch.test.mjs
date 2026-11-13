import assert from 'node:assert/strict';
const cases=[{country:'germany',prefix:'de',pages:[['DE3','Berlin',['DE3','DE300','DE_11000000']],['DE6','Hamburg',['DE6','DE600','DE_02000000']]]},{country:'norway',prefix:'no',pages:[['NO-03','Oslo',['NO-03','NO-M-0301']]]},{country:'france',prefix:'fr',pages:[['FR-R-02','Martinique',['FR-R-02','FR-D-972']],['FR-R-03','French Guiana',['FR-R-03','FR-D-973']]]}];
export default cases.flatMap(c=>[false,true].map(mobile=>({name:c.country+' shared cards across all levels '+(mobile?'phone':'desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#'+c.country);await p.evaluate('AtlasSettings.setSettings({motion:"reduce"})');
 for(const [canonical,name,ids]of c.pages){const cards=[];for(let i=0;i<ids.length;i++){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(ids[i])+')');await p.evaluate('currentAtlas().setMode('+(i+1)+')');await p.waitFor('document.querySelector('+JSON.stringify('#'+c.prefix+'-explore-panel .region-statistics')+')?.dataset.region==='+JSON.stringify(c.country+':'+canonical));
  assert.equal(await p.evaluate('currentAtlas().getSelection()'),canonical);assert.equal(await p.evaluate('currentAtlas().getMode()'),i+1);
  const layer=c.country+'-'+['first','second','third'][i];assert.deepEqual(await p.evaluate('map.getFilter('+JSON.stringify(layer+'-selected')+')'),['==',['get','id'],ids[i]]);
  cards.push(await p.evaluate('({name:document.getElementById('+JSON.stringify(c.prefix+'-name')+').textContent,pop:document.querySelector('+JSON.stringify('#'+c.prefix+'-explore-panel .population-total')+')?.textContent})'));
  const flags=await p.evaluate('[...document.querySelectorAll('+JSON.stringify('#'+c.country+'-sidebar .division-flags img')+')].filter(i=>i.getAttribute("src")&&i.getClientRects().length&&!i.closest("a")?.hidden).map(i=>i.getAttribute("src"))');assert.equal(new Set(flags).size,flags.length,'Each flag appears once');
 }
 for(const card of cards){assert.deepEqual(card,cards[0]);assert.equal(card.name,name);}
 await p.evaluate('currentAtlas().restore('+JSON.stringify(canonical)+')');await p.evaluate('currentAtlas().setMode('+ids.length+')');await p.settle();assert.deepEqual(await p.evaluate('map.getFilter('+JSON.stringify(c.country+'-'+['first','second','third'][ids.length-1]+'-selected')+')'),['==',['get','id'],ids.at(-1)]);
 if(c.country==='germany')assert(await p.evaluate('document.getElementById("de-subdivisions").hidden'));
 else{assert(!await p.evaluate('document.getElementById('+JSON.stringify(c.prefix+'-subdivisions')+').hidden'),'Real child units remain available');assert((await p.evaluate('document.getElementById('+JSON.stringify(c.prefix+'-children-heading')+').textContent')).includes(c.country==='france'?'Communes':'Statistical areas'));await p.evaluate('currentAtlas().setMode(3)');await p.settle();assert.deepEqual(await p.evaluate('map.getFilter('+JSON.stringify(c.country+'-second-selected')+')'),['==',['get','id'],ids[1]]);}
 await p.evaluate('currentAtlas().setMode('+ids.length+')');await p.settle();const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);await p.waitFor('currentAtlas().getSelection()==='+JSON.stringify(canonical)+'&&currentAtlas().getMode()==='+ids.length);
 await p.screenshot('shared-'+c.country+'-'+canonical+'-'+(mobile?'phone':'desktop'));
 }
}})));
