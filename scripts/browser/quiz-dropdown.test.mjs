import assert from 'node:assert/strict';
export default [{name:'Quiz scope names match the province dropdown',options:{width:1280,height:960},async run(p,base){
 await p.open(base,'#china');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'});chinaQuizLevel='prefectures';openChinaQuiz({scope:'510000',mode:'name'})");
 const result=await p.evaluate(`(()=>{const read=s=>{const o=document.querySelector(s),a=o.querySelector('.name-primary'),b=o.querySelector('.name-secondary');return {primary:a?.textContent,secondary:b?.textContent,color:b&&getComputedStyle(b).color,font:b&&getComputedStyle(b).fontFamily,text:o.textContent}};return {map:read('#province option[value="510000"]'),quiz:read('#cn-prefectures-quiz-scope option[value="510000"]')}})()`);
 assert.deepEqual(result.quiz,result.map);assert(!result.quiz.text.includes('·'));
 await p.tap('#cn-prefectures-quiz-scope');await p.screenshot('quiz-bilingual-province-picker');
}}];
