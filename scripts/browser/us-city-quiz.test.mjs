import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';
// US city quiz: dots in five cumulative difficulties, a medal for the highest perfect level.
const panel='#us-cities-quiz-panel';
async function openCities(p){
 await p.tap('#us-tab-quiz');await p.settle();
 await p.evaluate(`{const picker=[...document.querySelectorAll('[data-us-quiz-level]')].find(x=>x.offsetParent);picker.value='3';picker.dispatchEvent(new Event('change'))}`);
 await p.waitFor(`!document.querySelector('${panel}').hidden&&/18 Cities available/.test(document.querySelector('${panel} [data-q=count]').textContent)`,{timeout:20000});
}
const cityPoint=(p,name)=>p.evaluate(`(async()=>{const d=await (await fetch('data/quiz/us-cities.json')).json(),r=d.records.find(r=>r.en===${JSON.stringify(name)}),q=map.project(r.center),b=map.getCanvas().getBoundingClientRect();return [b.left+q.x,b.top+q.y]})()`);
const attempt=(n,scope,mode,correct,total)=>({id:'44444444-aaaa-4111-8111-'+String(n).padStart(12,'0'),country:'united-states',level:3,mode,scope,scopeLabel:scope,poolHash:'cc'+n,total,correct,hints:0,reveals:0,elapsedMs:200000,completed:true,fullRound:true,finishedAt:new Date().toISOString()});
export default [{name:'US city quiz: cumulative levels, dots only, labels and a bronze medal for a perfect Easy round',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-states');await p.settle();await openCities(p);
 const counts=[];for(const level of ['easy','medium','hard','expert','master']){await p.evaluate(`{const s=document.getElementById('us-cities-quiz-scope');s.value='${level}';s.dispatchEvent(new Event('change'))}`);counts.push(Number(await p.evaluate(`parseInt(document.querySelector('${panel} [data-q=count]').textContent)`)));}
 assert.deepEqual(counts,[18,36,68,134,232],'Each level includes the easier ones');
 await p.evaluate(`{const s=document.getElementById('us-cities-quiz-scope');s.value='easy';s.dispatchEvent(new Event('change'));const t=document.getElementById('us-cities-quiz-type');t.value='find';t.dispatchEvent(new Event('change'))}`);
 await p.tap(`${panel} [data-q=start]`);await p.settle();
 assert.equal(await p.evaluate(`map.queryRenderedFeatures({layers:['quiz-us-cities-dots']}).length`),18);
 assert.equal(await p.evaluate(`map.getStyle().layers.filter(l=>l.source?.startsWith?.('united-states-')&&(map.getLayoutProperty(l.id,'visibility')||'visible')!=='none').map(l=>l.id).sort().join()`),'united-states-first-fill,united-states-first-lines','Only state fills and borders remain as context');
 for(let i=0;i<18;i++){
  const name=await p.evaluate(`document.querySelector('${panel} [data-q=question]').textContent`);await p.tap(await cityPoint(p,name));
  await p.waitFor(`document.querySelector('${panel} [data-q=feedback]').dataset.status==='correct'`,{timeout:5000});
  if(i===2)assert(await p.evaluate(`document.querySelectorAll('.quiz-answer-label').length>=1`),'Answered cities are labelled without moving the map');
  await p.tap(`${panel} [data-q=next]`);await p.settle();
 }
 assert.match(await p.evaluate(`document.querySelector('${panel} [data-q=instruction]').textContent`),/18 correct/);await p.screenshot('us-city-quiz-complete');
 await p.tap(`${panel} [data-q=end]`);await p.settle();
 await openCities(p);assert.match(await p.evaluate(`document.querySelector('${panel} .quiz-medal-note').textContent`),/Easy/,'A perfect Easy round earns the bronze medal');
 assert(await p.evaluate(`!document.querySelector('${panel} .quiz-medal-note').hidden`));
 await p.evaluate(`{const t=document.getElementById('us-cities-quiz-type');t.value='name';t.dispatchEvent(new Event('change'))}`);assert(await p.evaluate(`document.querySelector('${panel} .quiz-medal-note').hidden`),'Medals are separate for each mode');
 // Typed answers accept common short forms and "City, State".
 await p.evaluate(`{const t=document.getElementById('us-cities-quiz-type');t.value='name';t.dispatchEvent(new Event('change'))}`);await p.tap(`${panel} [data-q=start]`);await p.settle();
 for(const [typed,status] of [['NYC','correct'],['Portland','no-match-or-correct'],['Washington, DC','correct'],['New York','duplicate']]){await p.evaluate(`document.getElementById('us-cities-quiz-answer').value=${JSON.stringify(typed)};document.querySelector('${panel} [data-q=form]').requestSubmit()`);const result=await p.evaluate(`document.querySelector('${panel} [data-q=feedback]').dataset.status`);if(status!=='no-match-or-correct')assert.equal(result,status,typed);}
 await p.tap(`${panel} [data-q=end]`);await p.settle();
 assert.equal(await p.evaluate(`map.getLayer('quiz-us-cities-dots')`),undefined,'Dots are removed after the quiz');
 // Naming a highlighted city zooms toward it, part way.
 await p.evaluate(`{const s=document.getElementById('us-cities-quiz-scope');s.value='master';s.dispatchEvent(new Event('change'));const t=document.getElementById('us-cities-quiz-type');t.value='identify';t.dispatchEvent(new Event('change'))}`);
 const frame=Number(await p.evaluate('map.getZoom()'));await p.tap(`${panel} [data-q=start]`);await p.settle();
 const [zoom,onScreen]=await p.evaluate(`(()=>{const f=map.querySourceFeatures('quiz-us-cities').find(f=>map.getFeatureState({source:'quiz-us-cities',id:f.properties.id}).quizTarget),q=map.project(f.geometry.coordinates),c=map.getContainer();return [map.getZoom(),q.x>0&&q.y>0&&q.x<c.clientWidth&&q.y<c.clientHeight]})()`);
 assert(zoom>=frame+.9&&zoom<=7.6,'Highlighted city zoom '+zoom+' (frame '+frame+')');assert(onScreen,'The highlighted city is in view');
 await p.tap(`${panel} [data-q=end]`);await p.settle();
}},{name:'Quiz dashboard: US cities medal beside the modes and opening a level',options:{width:1280,height:1000},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#united-states');
 await p.evaluate(`localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':${JSON.stringify([attempt(1,'easy','name',18,18),attempt(2,'hard','find',68,68),attempt(3,'expert','name',120,134)])}}))`);await login(p);
 await chooseCountry(p,'united-states');assert.match(await p.evaluate(`document.querySelector('[data-quiz-card=united-states] .quiz-card-divisions').textContent`),/Cities/);
 await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='3';l.dispatchEvent(new Event('change'))}`);
 assert(await p.evaluate(`document.querySelector('[data-state-progress]').hidden`),'Cities have no level panel');
 assert.equal(await p.evaluate(`document.querySelector('[data-mode-medal]').getAttribute('aria-label')`),'Highest level completed: Easy, Bronze medal','Naming: a perfect Easy round');assert.equal(await p.evaluate(`document.querySelector('[data-mode-medal]').textContent`),'','No caption under the medal');
 await p.tap('.quiz-mode-choice:has([data-quiz-mode=find])');assert(await p.evaluate(`document.querySelector('[data-mode-medal] .quiz-medal').innerHTML.includes('#e8b232')`),'Find on map: a perfect Hard round shows gold, beside the modes');
 assert.equal(await p.evaluate(`document.querySelector('[data-mode-medal]').getAttribute('aria-label')`),'Highest level completed: Hard, Gold medal');
 await p.tap('.quiz-mode-choice:has([data-quiz-mode=identify])');assert(await p.evaluate(`document.querySelector('[data-mode-medal]').classList.contains('unearned')`),'No medal yet in the third mode');await p.tap('.quiz-mode-choice:has([data-quiz-mode=find])');
 const [modes,medal]=await p.evaluate(`[document.querySelector('.quiz-mode-grid').getBoundingClientRect(),document.querySelector('[data-mode-medal]').getBoundingClientRect()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))`);assert(medal.left>=modes.right&&medal.top<modes.bottom&&medal.bottom>modes.top,'The medal sits to the right of the modes');
 await p.evaluate(`{const s=document.querySelector('[data-quiz-scope]');s.value='hard';s.dispatchEvent(new Event('change'))}`);
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await p.evaluate(`document.querySelector('.quiz-mode-fieldset').scrollIntoView({block:'center'})`);await p.screenshot('us-city-dashboard-medal');
 await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='2';l.dispatchEvent(new Event('change'))}`);assert(await p.evaluate(`document.querySelector('[data-mode-medal]').hidden`),'Counties have no medal');
 await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='3';l.dispatchEvent(new Event('change'))}`);await p.evaluate(`{const s=document.querySelector('[data-quiz-scope]');s.value='hard';s.dispatchEvent(new Event('change'))}`);
 await p.tap('[data-play-quiz]');await p.waitFor(`document.querySelector('${panel}')&&!document.querySelector('${panel}').hidden`,{timeout:30000});
 assert.equal(await p.evaluate(`document.getElementById('us-cities-quiz-scope').value`),'hard','The dashboard opens the chosen level');
}}];
