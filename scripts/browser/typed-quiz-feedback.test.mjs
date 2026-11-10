import assert from 'node:assert/strict';
export default [
 {country:'china',prefix:'cn-prefectures',options:{width:1280,height:900}},
 {country:'brunei',prefix:'bn',options:{width:390,height:844,mobile:true}}
].map(({country,prefix,options})=>({name:country+' highlighted-place feedback uses shared answer rows',options,async run(p,base){
 await p.open(base,'#'+country);await p.tap(country==='china'?'#tab-quiz':'#bn-tab-quiz');
 if(country==='china')await p.evaluate(`(()=>{const e=document.getElementById('cn-quiz-level');e.value='prefectures';e.dispatchEvent(new Event('change'));})()`);
 const panel='#'+prefix+'-quiz-panel';
 await p.evaluate(`(()=>{const e=document.getElementById('${prefix}-quiz-type');e.value='identify';e.dispatchEvent(new Event('change'));})()`);
 await p.tap(panel+' [data-q=start]');await p.settle();
 const typed='<img src=x onerror=alert(1)>';
 await p.evaluate(`document.getElementById('${prefix}-quiz-answer').value=${JSON.stringify(typed)}`);await p.tap(panel+' [data-q=submit]');
 await p.waitFor(`document.querySelector('${panel} [data-q=feedback]').dataset.status==='incorrect'`);
 const content=await p.evaluate(`(()=>{const b=document.querySelector('${panel} [data-q=feedback]');return {text:b.textContent,images:b.querySelectorAll('img').length,rows:[...b.querySelectorAll('.quiz-answer-row')].map(r=>({answer:r.dataset.answer,icon:r.querySelector('.quiz-answer-icon').textContent,name:r.querySelector('.name-primary').textContent,display:getComputedStyle(r).display,detail:r.querySelector('.name-secondary')?getComputedStyle(r.querySelector('.name-secondary')).display:null}))};})()`);
 assert.equal(content.images,0,'Typed answers render as text');assert.equal(content.rows.length,2);assert.deepEqual(content.rows.map(r=>r.answer),['chosen','correct']);assert.deepEqual(content.rows.map(r=>r.icon),['×','✓']);assert.equal(content.rows[0].name,typed);assert(content.rows[1].name);assert.equal(content.rows[1].display,'grid');if(content.rows[1].detail)assert.equal(content.rows[1].detail,'block');assert(!content.text.includes('Incorrect · correct answer:'));assert(content.text.includes('Your answer:'));
 await p.screenshot('typed-quiz-feedback-'+country);
 await p.tap(panel+' [data-q=next]');await p.settle();
 assert(await p.evaluate(`document.querySelector('${panel} [data-q=feedback]').hidden`),'Next question clears feedback');
 }}));
