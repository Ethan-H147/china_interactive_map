import assert from 'node:assert/strict';

export default [{name:'Brazil native map restores selected states and DDD views after division and city quizzes',options:{width:1280,height:900,developer:true},async run(p,base){
 await p.open(base,'#brazil');
 for(const [selection,scope]of [['BR-35','states'],['BR-DDD-11','ddd']]){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(selection)+','+JSON.stringify(scope)+')');await p.settle();
  const saved=await p.evaluate('currentAtlas().quizMap.capture()');assert.equal(saved.id,selection);assert.equal(saved.scope,scope);
  await p.tap('#quiz-brazil-tab-quiz');await p.evaluate('currentAtlas().quiz.open()');await p.waitFor('!document.querySelector("#quiz-brazil-quiz-panel [data-q=start]").disabled');
  await p.tap('#quiz-brazil-quiz-panel [data-q=start]');await p.waitFor('currentAtlas().quiz.active');await p.settle();
  assert.equal(await p.evaluate('map.getLayoutProperty("south-brazil-fill","visibility")'),'visible');
  await p.tap('#home');await p.settle();assert.deepEqual(await p.evaluate('currentAtlas().quizMap.capture()'),saved);
  await p.tap('#quiz-brazil-tab-quiz');
  await p.evaluate('(()=>{const s=document.getElementById("quiz-brazil-quiz-panel-divisions");s.value="3";s.dispatchEvent(new Event("change"))})()');
  await p.waitFor('!document.querySelector("#brazil-cities-quiz-panel [data-q=start]").disabled');
  await p.tap('#brazil-cities-quiz-panel [data-q=start]');await p.waitFor('currentAtlas().cityQuiz.active');await p.settle();
  assert.equal(await p.evaluate('map.getLayoutProperty("south-brazil-fill","visibility")'),'visible');
  assert.equal(await p.evaluate('map.getLayoutProperty("south-brazil-borders","visibility")'),'visible');
  const point=await p.evaluate('(async()=>{const q=document.querySelector("#brazil-cities-quiz-panel [data-q=question]").textContent,data=await(await fetch("data/quiz/brazil-cities.json")).json(),r=data.records.find(r=>r.en===q),p=map.project(r.center),b=map.getCanvas().getBoundingClientRect();return[b.x+p.x,b.y+p.y]})()');await p.tap(point);
  await p.waitFor('document.querySelector("#brazil-cities-quiz-panel [data-q=feedback]").textContent==="Correct"');
  await p.tap('#home');await p.settle();assert.deepEqual(await p.evaluate('currentAtlas().quizMap.capture()'),saved);
 }
}},{name:'Japan native quiz restores a selected prefecture and its map filters',options:{width:1280,height:900,developer:true},async run(p,base){
 await p.open(base,'#japan');
 await p.evaluate('currentAtlas().restore("JP-13")');await p.settle();
 const saved=await p.evaluate('currentAtlas().quizMap.capture()');
 await p.tap('#quiz-japan-tab-quiz');await p.tap('#quiz-japan-quiz-panel [data-q=start]');await p.waitFor('currentAtlas().quiz.active');await p.settle();
 await p.tap('#quiz-japan-quiz-panel [data-q=reveal]');await p.tap('#home');await p.settle();
 assert.deepEqual(await p.evaluate('currentAtlas().quizMap.capture()'),saved);
 assert(!await p.evaluate('quiz.active'));
}},{name:'Indonesia native quiz keeps coastal province pieces visible and correctly colored',options:{width:1280,height:900,developer:true},async run(p,base){
 await p.open(base,'#indonesia');await p.tap('#quiz-indonesia-tab-quiz');
 await p.evaluate('(()=>{const s=document.getElementById("quiz-indonesia-quiz-type");s.value="name";s.dispatchEvent(new Event("change"))})()');
 await p.tap('#quiz-indonesia-quiz-panel [data-q=start]');await p.waitFor('currentAtlas().quiz.active');await p.settle();
 const name=await p.evaluate('currentAtlas().quizMap.records().find(r=>r.id==="ID64").en');
 await p.tap('#quiz-indonesia-quiz-answer');await p.type(name);await p.key('Enter');
 assert.equal(await p.evaluate('map.getFeatureState({source:"indonesia-first",id:"ID64~mahakam"}).quizCorrect'),true);
 await p.evaluate('void map.jumpTo({center:[117.475,-.6],zoom:10})');await p.settle();
 assert.equal(await p.evaluate('map.getLayoutProperty("indonesia-first-coastal-fill","visibility")'),'visible');
 assert.equal(await p.evaluate('map.getLayoutProperty("indonesia-first-coastal-lines","visibility")'),'visible');
 assert(await p.evaluate('map.queryRenderedFeatures({layers:["indonesia-first-coastal-fill"]}).some(f=>f.properties.regionId==="ID64")'));
 await p.tap('#home');await p.settle();assert(!await p.evaluate('quiz.active'));
}}];
