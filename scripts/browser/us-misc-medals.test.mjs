import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';
// US Miscellaneous topics each have their own medal beside the modes, per mode; unearned medals
// (cities included) show one generic question-mark medal.
const attempt=(n,scope,mode,total)=>({id:'66666666-aaaa-4111-8111-'+String(n).padStart(12,'0'),country:'united-states',level:3,mode,scope,scopeLabel:scope,poolHash:'ee'+n,total,correct:total,hints:0,reveals:0,elapsedMs:100000,completed:true,fullRound:true,finishedAt:new Date().toISOString()});
const medal=p=>p.evaluate(`(()=>{const m=document.querySelector('[data-mode-medal]');return {hidden:m.hidden,locked:!!m.querySelector('.quiz-medal-locked'),label:m.getAttribute('aria-label'),html:m.innerHTML.length}})()`);
const pick=(p,selector,value)=>p.evaluate(`{const s=document.querySelector('${selector}');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change'))}`);
export default [{name:'US Miscellaneous medals per topic and mode, question mark until earned',options:{width:1280,height:1000},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#united-states');
 await p.evaluate(`localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':${JSON.stringify([attempt(1,'misc-college-towns','find',40),attempt(2,'misc-revolution','name',22)])}}))`);await login(p);
 await chooseCountry(p,'united-states');await pick(p,'[data-quiz-level]','4');
 await pick(p,'[data-quiz-scope]','misc-college-towns');await p.tap('.quiz-mode-choice:has([data-quiz-mode=find])');
 let m=await medal(p);assert(!m.hidden&&!m.locked,'College towns medal earned in Find on map');assert.equal(m.label,'College towns medal earned');
 assert(await p.evaluate(`document.querySelector('[data-mode-medal]').innerHTML.includes('#c23a40')`),'The collegiate crest design is shown');
 await p.tap('.quiz-mode-choice:has([data-quiz-mode=identify])');m=await medal(p);assert(m.locked,'Another mode shows the question-mark medal');
 await pick(p,'[data-quiz-scope]','misc-revolution');await p.tap('.quiz-mode-choice:has([data-quiz-mode=name])');m=await medal(p);assert(!m.locked,'Liberty Bell earned in naming');
 const [modes,box]=await p.evaluate(`[document.querySelector('.quiz-mode-grid').getBoundingClientRect(),document.querySelector('[data-mode-medal]').getBoundingClientRect()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}))`);assert(box.left>=modes.right&&box.top<modes.bottom,'Medal sits to the right of the modes');
 await p.evaluate(`document.querySelector('.quiz-mode-fieldset').scrollIntoView({block:'center'})`);await p.screenshot('us-misc-medal-dashboard');
 await pick(p,'[data-quiz-level]','3');m=await medal(p);assert(!m.hidden&&m.locked,'Cities without a perfect round show the question-mark medal');
 await pick(p,'[data-quiz-level]','2');m=await medal(p);assert(m.hidden,'Counties have no medal');
}},{name:'China Miscellaneous medals per topic and mode',options:{width:1280,height:1000},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#china');
 await p.evaluate(`localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':${JSON.stringify([{...attempt(3,'misc-poet-birthplaces','find',16),country:'china'}])}}))`);await login(p);
 await chooseCountry(p,'china');await pick(p,'[data-quiz-level]','4');await pick(p,'[data-quiz-scope]','misc-poet-birthplaces');await p.tap('.quiz-mode-choice:has([data-quiz-mode=find])');
 const m=await medal(p);assert(!m.hidden&&!m.locked,'Poets fan medal earned');assert(await p.evaluate(`document.querySelector('[data-mode-medal]').innerHTML.includes('#d24b5a')`),'Plum-blossom fan design');
 await pick(p,'[data-quiz-scope]','misc-dynasty-capitals');assert((await medal(p)).locked,'Unplayed topics show the question mark');
 await pick(p,'[data-quiz-scope]','misc-poet-birthplaces');await p.evaluate(`document.querySelector('.quiz-mode-fieldset').scrollIntoView({block:'center'})`);await p.screenshot('china-misc-medal-dashboard');
}}];
