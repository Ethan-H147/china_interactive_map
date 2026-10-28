import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';
// China and Russia city quizzes: cumulative levels as dots, Taiwan behind its option, medals per mode.
const levels=['easy','medium','hard','expert','master'];
async function counts(p,panel,prefix){const out=[];for(const level of levels){await p.evaluate(`{const s=document.getElementById('${prefix}-quiz-scope');s.value='${level}';s.dispatchEvent(new Event('change'))}`);out.push(Number(await p.evaluate(`parseInt(document.querySelector('${panel} [data-q=count]').textContent)`)));}return out;}
const point=(p,file,name)=>p.evaluate(`(async()=>{const d=await (await fetch('${file}')).json(),r=d.records.find(r=>r.en===${JSON.stringify(name)}),q=map.project(r.center),b=map.getCanvas().getBoundingClientRect();return [b.left+q.x,b.top+q.y]})()`);
async function answerSome(p,panel,file,prefix,n){
 await p.evaluate(`{const t=document.getElementById('${prefix}-quiz-type');t.value='find';t.dispatchEvent(new Event('change'))}`);await p.tap(`${panel} [data-q=start]`);await p.settle();
 for(let i=0;i<n;i++){const name=await p.evaluate(`document.querySelector('${panel} [data-q=question]').textContent`);await p.tap(await point(p,file,name));await p.waitFor(`document.querySelector('${panel} [data-q=feedback]').dataset.status==='correct'`,{timeout:5000});await p.tap(`${panel} [data-q=next]`);await p.settle();}
}
export default [{name:'China city quiz: levels, Taiwan option, typed Chinese names and clean exit',options:{width:1280,height:900},async run(p,base){
 const panel='#cn-cities-quiz-panel';await p.open(base,'#china');await p.settle();await p.tap('#tab-quiz');await p.settle();
 await p.evaluate(`{const s=[...document.querySelectorAll('#china-quiz-level,#cn-quiz-level')].find(x=>x.offsetParent);s.value='cities';s.dispatchEvent(new Event('change'))}`);
 await p.waitFor(`!document.querySelector('${panel}').hidden&&/Cities available/.test(document.querySelector('${panel} [data-q=count]').textContent)`,{timeout:20000});
 assert.equal(await p.evaluate(`document.querySelector('${panel} [data-q=overseas-option] span').textContent`),'Include Taiwan');
 assert.deepEqual(await counts(p,panel,'cn-cities'),[15,46,93,167,231],'Taiwan included by default');
 await p.evaluate(`{const t=document.querySelector('${panel} [data-q=overseas]');t.checked=false;t.dispatchEvent(new Event('change'))}`);
 assert.deepEqual(await counts(p,panel,'cn-cities'),[14,42,86,157,219],'Taiwan can be left out');
 await p.evaluate(`{const t=document.querySelector('${panel} [data-q=overseas]');t.checked=true;t.dispatchEvent(new Event('change'));const s=document.getElementById('cn-cities-quiz-scope');s.value='easy';s.dispatchEvent(new Event('change'))}`);
 await answerSome(p,panel,'data/quiz/china-cities.json','cn-cities',3);
 assert.equal(await p.evaluate(`map.queryRenderedFeatures({layers:['quiz-cn-cities-dots']}).length`),15);
 await p.tap(`${panel} [data-q=end]`);await p.settle();
 // Typed answers accept Chinese names.
 await p.evaluate(`{const t=document.getElementById('cn-cities-quiz-type');t.value='name';t.dispatchEvent(new Event('change'))}`);await p.tap(`${panel} [data-q=start]`);await p.settle();
 for(const [typed,status] of [['北京','correct'],['Xian','correct'],['臺北','correct'],['HK','correct']]){await p.evaluate(`document.getElementById('cn-cities-quiz-answer').value=${JSON.stringify(typed)};document.querySelector('${panel} [data-q=form]').requestSubmit()`);assert.equal(await p.evaluate(`document.querySelector('${panel} [data-q=feedback]').dataset.status`),status,typed);}
 await p.tap(`${panel} [data-q=end]`);await p.settle();assert.equal(await p.evaluate(`map.getLayer('quiz-cn-cities-dots')`),undefined);
 // Switching back to provinces leaves the city panel.
 await p.evaluate(`{const s=document.getElementById('cn-cities-quiz-level');s.value='provinces';s.dispatchEvent(new Event('change'))}`);await p.settle();
 assert(await p.evaluate(`document.querySelector('${panel}').hidden&&!document.getElementById('cn-quiz-panel').hidden`));
}},{name:'Russia city quiz: Divisions picker, levels and clean exit',options:{width:1280,height:900},async run(p,base){
 const panel='#russia-cities-quiz-panel';await p.open(base,'#russia');await p.settle();await p.tap('#ru-tab-quiz');await p.settle();
 await p.evaluate(`{const s=[...document.querySelectorAll('select[id$=-quiz-panel-divisions]')].find(x=>x.offsetParent);s.value='3';s.dispatchEvent(new Event('change'))}`);
 await p.waitFor(`!document.querySelector('${panel}').hidden&&/Cities available/.test(document.querySelector('${panel} [data-q=count]').textContent)`,{timeout:20000});
 assert.deepEqual(await counts(p,panel,'russia-cities'),[8,31,63,106,149]);assert(await p.evaluate(`document.querySelector('${panel} [data-q=overseas-option]').hidden`));
 await p.evaluate(`{const s=document.getElementById('russia-cities-quiz-scope');s.value='easy';s.dispatchEvent(new Event('change'))}`);
 await answerSome(p,panel,'data/quiz/russia-cities.json','russia-cities',3);
 assert.equal(await p.evaluate(`map.getStyle().layers.filter(l=>l.source?.startsWith?.('russia-')&&(map.getLayoutProperty(l.id,'visibility')||'visible')!=='none').map(l=>l.id).sort().join()`),'russia-first-fill,russia-first-lines');
 await p.tap(`${panel} [data-q=end]`);await p.settle();assert.equal(await p.evaluate(`map.getLayer('quiz-russia-cities-dots')`),undefined);
 await p.tap('#ru-tab-quiz');await p.settle();assert(!await p.evaluate(`document.querySelector('${panel}').hidden`),'The Quiz tab returns to the last level used');
}},{name:'Western Europe city quizzes: three levels, France opens on the mainland with optional overseas cities',options:{width:1280,height:900},async run(p,base){
 for(const [country,tab,levels] of [['spain','es',[8,28,61]],['germany','de',[9,31,61]],['united-kingdom','gb',[10,29,63]],['italy','it',[10,32,64]],['france','fr',[8,31,63]]]){
  const panel='#'+country+'-cities-quiz-panel',prefix=country+'-cities';await p.open(base,'#'+country);await p.settle();await p.tap('#'+tab+'-tab-quiz');await p.settle();
  await p.evaluate(`{const s=[...document.querySelectorAll('select[id$=-quiz-panel-divisions]')].find(x=>x.offsetParent);s.value='3';s.dispatchEvent(new Event('change'))}`);
  await p.waitFor(`!document.querySelector('${panel}').hidden&&/Cities available/.test(document.querySelector('${panel} [data-q=count]').textContent)`,{timeout:20000});
  const out=[];for(const level of ['easy','medium','hard']){await p.evaluate(`{const s=document.getElementById('${prefix}-quiz-scope');s.value='${level}';s.dispatchEvent(new Event('change'))}`);out.push(Number(await p.evaluate(`parseInt(document.querySelector('${panel} [data-q=count]').textContent)`)));}
  assert.deepEqual(out,levels,country+' has three cumulative levels');assert.equal(await p.evaluate(`document.getElementById('${prefix}-quiz-scope').options.length`),3);
  if(country==='france'){
   assert.equal(await p.evaluate(`document.querySelector('${panel} [data-q=overseas-option] span').textContent`),'Include overseas');assert.equal(await p.evaluate(`document.querySelector('${panel} [data-q=overseas]').checked`),false,'Overseas cities are off by default');
   await p.evaluate(`{const t=document.querySelector('${panel} [data-q=overseas]');t.checked=true;t.dispatchEvent(new Event('change'))}`);assert.equal(Number(await p.evaluate(`parseInt(document.querySelector('${panel} [data-q=count]').textContent)`)),68);
   await p.evaluate(`{const t=document.querySelector('${panel} [data-q=overseas]');t.checked=false;t.dispatchEvent(new Event('change'))}`);
  }
  await p.evaluate(`{const s=document.getElementById('${prefix}-quiz-scope');s.value='easy';s.dispatchEvent(new Event('change'))}`);
  await answerSome(p,panel,'data/quiz/'+country+'-cities.json',prefix,2);
  if(country==='france'){const c=await p.evaluate('map.getCenter().toArray()');assert(c[0]>-5&&c[0]<10&&c[1]>41&&c[1]<51.5,'France opens on the mainland: '+c);}
  await p.tap(`${panel} [data-q=end]`);await p.settle();assert.equal(await p.evaluate(`map.getLayer('quiz-${prefix}-dots')`),undefined,country+' dots are removed');
 }
}},{name:'Quiz dashboard: China and Russia city medals and launch',options:{width:1280,height:1000},async run(p,base){
 const attempt=(n,country,scope,mode)=>({id:'55555555-aaaa-4111-8111-'+String(n).padStart(12,'0'),country,level:3,mode,scope,scopeLabel:scope,poolHash:'dd'+n,total:15,correct:15,hints:0,reveals:0,elapsedMs:100000,completed:true,fullRound:true,finishedAt:new Date().toISOString()});
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#china');
 await p.evaluate(`localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':${JSON.stringify([attempt(1,'china','medium','name'),attempt(2,'russia','expert','find')])}}))`);await login(p);
 await chooseCountry(p,'china');assert.equal(await p.evaluate(`document.querySelectorAll('[data-country-flag] img').length`),2,'China shows the PRC and ROC flags');
 assert.equal(await p.evaluate(`document.querySelector('[data-quiz-card=china] .quiz-card-divisions').textContent`),'Provinces, Prefectures & Cities');
 await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='3';l.dispatchEvent(new Event('change'))}`);
 assert.equal(await p.evaluate(`document.querySelector('[data-mode-medal]').getAttribute('aria-label')`),'Highest level completed: Medium, Silver medal');
 await chooseCountry(p,'russia');assert.equal(await p.evaluate(`document.querySelector('[data-quiz-card=russia] .quiz-card-divisions').textContent`),'Federal subjects & Cities');
 await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='3';l.dispatchEvent(new Event('change'))}`);await p.tap('.quiz-mode-choice:has([data-quiz-mode=find])');
 assert.equal(await p.evaluate(`document.querySelector('[data-mode-medal]').getAttribute('aria-label')`),'Highest level completed: Expert, Platinum medal');
 await p.evaluate(`{const s=document.querySelector('[data-quiz-scope]');s.value='hard';s.dispatchEvent(new Event('change'))}`);await p.tap('[data-play-quiz]');
 await p.waitFor(`document.getElementById('russia-cities-quiz-panel')&&!document.getElementById('russia-cities-quiz-panel').hidden`,{timeout:30000});
 assert.equal(await p.evaluate(`document.getElementById('russia-cities-quiz-scope').value`),'hard');
}}];
