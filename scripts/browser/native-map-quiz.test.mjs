import assert from 'node:assert/strict';

const counts={korea:29,mongolia:22,japan:47,philippines:82,indonesia:38,brazil:27,uruguay:19,argentina:24,congo:41,ireland:31,belgium:11,turkey:81};
export default Object.entries(counts).map(([country,count])=>({
 name:country+' native map answers, naming, context, and restoration',options:{width:1280,height:900,developer:true},
 async run(p,base){
  await p.open(base,'#'+country);
  const prefix='quiz-'+country,panel='#'+prefix+'-quiz-panel';
  await p.waitFor('!!currentAtlas().quiz');
  const before=await p.evaluate('({id:currentAtlas().getSelection?.(),mode:currentAtlas().getMode?.(),scope:currentAtlas().getScope?.()})');
  await p.tap('#'+prefix+'-tab-quiz');
  const total=await p.evaluate('(()=>{const d=AtlasCountries.countries['+JSON.stringify(country)+'];return currentAtlas().quizMap.records().filter(r=>r.level===d.quiz.level&&r.bounds&&r.center&&!r.nonGeographic&&r.quizEligible!==false&&(!d.quiz.excludeSpecial||!r.special)).length})()');assert.equal(total,count);
  const available=await p.evaluate('(()=>{const d=AtlasCountries.countries['+JSON.stringify(country)+'],scope=d.quiz.scopes?.[0]?.id;return currentAtlas().quizMap.records().filter(r=>r.level===d.quiz.level&&(!d.quiz.excludeSpecial||!r.special)&&(!scope||r.parent===scope||r.country===scope||r.id.startsWith(scope+"-"))).length})()');
  assert.equal(await p.evaluate('document.querySelector('+JSON.stringify(panel+' [data-q=count]')+').textContent'),available+' '+await p.evaluate('AtlasCountries.countries['+JSON.stringify(country)+'].quiz.plural')+' available');
  await p.tap(panel+' [data-q=start]');await p.waitFor('currentAtlas().quiz.active');await p.settle();
  assert(await p.evaluate('currentAtlas().quiz.active'));
  assert.deepEqual(await p.evaluate('map.getStyle().layers.filter(l=>l.id.startsWith("quiz-overlay-")).map(l=>l.id)'),[]);
  const fills=await p.evaluate('currentAtlas().quizMap.fillLayers().filter(id=>map.getLayer(id))');assert(fills.length);
  for(const fill of fills)assert.equal(await p.evaluate('map.getLayoutProperty('+JSON.stringify(fill)+',"visibility")||"visible"'),'visible');
  const record=await p.evaluate('(()=>{const a=currentAtlas(),q=document.querySelector('+JSON.stringify(panel+' [data-q=question]')+').textContent;return a.quizMap.records().find(r=>r.en===q)})()');assert(record,'Question uses native records');
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(record.center)+',zoom:7})');await p.settle();
  const point=await p.evaluate('(()=>{const layers=currentAtlas().quizMap.fillLayers().filter(id=>map.getLayer(id)),id='+JSON.stringify(record.id)+',b=map.getCanvas().getBoundingClientRect(),center=map.project('+JSON.stringify(record.center)+');const hit=(x,y)=>map.queryRenderedFeatures([x,y],{layers}).some(f=>f.properties.id===id);if(hit(center.x,center.y))return[b.x+center.x,b.y+center.y];for(let y=12;y<b.height-12;y+=10)for(let x=12;x<b.width-12;x+=10)if(hit(x,y))return[b.x+x,b.y+y];return null;})()');if(!point)console.log(JSON.stringify(await p.evaluate('({center:map.getCenter(),target:'+JSON.stringify(record)+',fills:currentAtlas().quizMap.fillLayers().map(id=>({id,filter:map.getFilter(id),source:map.getLayer(id).source,rendered:map.queryRenderedFeatures({layers:[id]}).slice(0,10).map(f=>f.properties.id)}))})')));assert(point,'Target polygon can be clicked');await p.tap(point);
  await p.waitFor('document.querySelector('+JSON.stringify(panel+' [data-q=feedback]')+').dataset.status==="correct"');
  assert(await p.evaluate('currentAtlas().quizMap.fillLayers().some(id=>map.getFeatureState({source:map.getLayer(id).source,id:'+JSON.stringify(record.id)+'}).quizCorrect)'));
  await p.tap('#home');await p.settle();
  assert(!await p.evaluate('quiz.active'));
  assert.deepEqual(await p.evaluate('({id:currentAtlas().getSelection?.(),mode:currentAtlas().getMode?.(),scope:currentAtlas().getScope?.()})'),before);
  await p.tap('#'+prefix+'-tab-quiz');
  await p.evaluate('(()=>{const s=document.getElementById('+JSON.stringify(prefix+'-quiz-type')+');s.value="name";s.dispatchEvent(new Event("change"))})()');
  await p.tap(panel+' [data-q=start]');await p.waitFor('currentAtlas().quiz.active');await p.settle();
  const name=await p.evaluate('(()=>{const d=AtlasCountries.countries['+JSON.stringify(country)+'],scope=d.quiz.scopes?.[0]?.id;return currentAtlas().quizMap.records().find(r=>r.level===d.quiz.level&&!r.special&&r.quizEligible!==false&&(!scope||r.country===scope||r.parent===scope||r.id.startsWith(scope+"-"))).en})()');
  await p.tap('#'+prefix+'-quiz-answer');await p.type(name);await p.key('Enter');
  assert((await p.evaluate('document.querySelector('+JSON.stringify(panel+' [data-q=feedback]')+').textContent')).includes('correct'));
  await p.tap('#home');await p.settle();
  if(country==='brazil'){
   await p.tap('#'+prefix+'-tab-quiz');
   await p.evaluate('(()=>{const s=document.getElementById("quiz-brazil-quiz-panel-divisions");s.value="3";s.dispatchEvent(new Event("change"))})()');
   await p.waitFor('!document.querySelector("#brazil-cities-quiz-panel [data-q=start]").disabled');
   await p.tap('#brazil-cities-quiz-panel [data-q=start]');await p.settle();
   assert(await p.evaluate('currentAtlas().cityQuiz.active'));
   assert.equal(await p.evaluate('map.getLayoutProperty("south-brazil-fill","visibility")'),'visible');
   assert.equal(await p.evaluate('map.getLayoutProperty("south-brazil-borders","visibility")'),'visible');
   assert(await p.evaluate('!!map.getLayer("quiz-brazil-cities-dots")'));
   await p.screenshot('brazil-native-city-quiz');await p.tap('#home');await p.settle();
  }
  assert(!p.requests.some(url=>new URL(url).pathname==='/data/quiz/'+country+'.bin'),'No separate quiz geography request');
 }
}));
