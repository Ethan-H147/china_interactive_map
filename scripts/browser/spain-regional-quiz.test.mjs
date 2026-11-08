import assert from 'node:assert/strict';
export default [{name:'Spain accepts regional names in type-all and highlighted-place quizzes',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#spain');
 const records=await p.evaluate('currentAtlas().quizMap.records().filter(r=>r.level===1)');
 const examples=[['ES-A-09','Catalunya'],['ES-A-16','Euskadi'],['ES-A-10','Comunitat Valenciana'],['ES-A-04','Illes Balears'],['ES-A-15','Nafarroako Foru Komunitatea'],['ES-A-12','Galicia']];
 // Exercise the actual country records in both shared answer engines.
 const results=await p.evaluate(`(async()=>{const {quizNamePlace,answerSpecified}=await import('./quiz-modes.mjs'),{createNameRound,submitName}=await import('./name-quiz-engine.mjs');const records=currentAtlas().quizMap.records();return ${JSON.stringify(examples)}.map(([id,value])=>{const place=quizNamePlace(records.find(r=>r.id===id)),round={questions:[{record:records.find(r=>r.id===id),feature:{properties:{adcode:id}}}],index:0,results:[],complete:false};return [submitName(createNameRound([place]),value).status,answerSpecified(round,value).status];});})()`);
 assert(results.every(r=>r.every(s=>s==='correct')));
 await p.tap('#es-tab-quiz');await p.evaluate('document.getElementById("es-quiz-type").value="name";document.getElementById("es-quiz-type").dispatchEvent(new Event("change"))');await p.tap('#es-quiz-panel [data-q=start]');await p.settle();
 for(const [id,value]of examples){await p.evaluate(`document.getElementById('es-quiz-answer').value=${JSON.stringify(value)};document.querySelector('#es-quiz-panel [data-q=form]').requestSubmit()`);assert.equal(await p.evaluate('document.querySelector("#es-quiz-panel [data-q=feedback]").dataset.status'),'correct',value);assert.equal(await p.evaluate(`map.getFeatureState({source:'spain-first',id:${JSON.stringify(id)}}).quizCorrect`),true);}
 await p.tap('#es-quiz-panel [data-q=end]');await p.settle();await p.tap('#es-tab-quiz');await p.evaluate('document.getElementById("es-quiz-type").value="identify";document.getElementById("es-quiz-type").dispatchEvent(new Event("change"));AtlasCountries.countries.spain.quiz.exclude.push(...currentAtlas().quizMap.records().filter(r=>r.level===1&&r.id!=="ES-A-16").map(r=>r.id))');await p.tap('#es-quiz-panel [data-q=start]');await p.settle();
 const target=await p.evaluate('currentAtlas().quizMap.records().find(r=>map.getFeatureState({source:"spain-first",id:r.id}).quizTarget)');assert(target);
 const value=examples.find(([id])=>id===target.id)?.[1];assert(value,'Deterministic first target has a regional name');
 await p.evaluate(`document.getElementById('es-quiz-answer').value=${JSON.stringify(value)};document.querySelector('#es-quiz-panel [data-q=form]').requestSubmit()`);assert.equal(await p.evaluate('document.querySelector("#es-quiz-panel [data-q=feedback]").dataset.status'),'correct');
 await p.tap('#es-quiz-panel [data-q=end]');await p.settle();
}}];
