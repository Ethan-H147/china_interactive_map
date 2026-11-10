import assert from 'node:assert/strict';
export default ['find','identify'].map((mode,i)=>({name:mode+' show-answer feedback uses the shared layout without awarding credit',options:i?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.open(base,'#brunei');await p.tap('#bn-tab-quiz');
 await p.evaluate(`(()=>{const e=document.getElementById('bn-quiz-type');e.value=${JSON.stringify(mode)};e.dispatchEvent(new Event('change'));})()`);
 const panel='#bn-quiz-panel';await p.tap(panel+' [data-q=start]');await p.settle();
 await p.tap(panel+' [data-q=reveal]');
 const shown=await p.evaluate(`(()=>{const box=document.querySelector('${panel} [data-q=feedback]'),row=box.querySelector('.quiz-answer-row'),detail=row?.querySelector('.name-secondary');return {status:box.dataset.status,rows:box.querySelectorAll('.quiz-answer-row').length,answer:row?.dataset.answer,icon:row?.querySelector('.quiz-answer-icon').textContent,name:row?.querySelector('.name-primary').textContent,display:row&&getComputedStyle(row).display,detail:detail&&getComputedStyle(detail).display,text:box.textContent,score:document.querySelector('${panel} [data-q=score]').textContent};})()`);
 assert.equal(shown.status,'skipped');assert.equal(shown.rows,1);assert.equal(shown.answer,'shown');assert.equal(shown.icon,'●');assert(shown.name);assert.equal(shown.display,'grid');if(shown.detail)assert.equal(shown.detail,'block');assert(shown.text.includes('Answer shown: '));assert(!shown.text.includes(' · '));assert.match(shown.score,/^0 correct/);
 await p.screenshot('shown-quiz-feedback-'+mode);
 await p.tap(panel+' [data-q=next]');await p.settle();assert(await p.evaluate(`document.querySelector('${panel} [data-q=feedback]').hidden`));
 }}));
