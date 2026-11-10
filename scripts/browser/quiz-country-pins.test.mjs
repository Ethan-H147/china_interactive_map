import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';
const owner='11111111-1111-4111-8111-111111111111';
export default [false,true].map(mobile=>({name:(mobile?'phone':'desktop')+' quiet header pin preserves ordering, limit and account isolation',options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:960},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#china');await login(p);await p.tap('[data-account-section=quizzes]');
 async function back(){await p.tap('[data-country-back]');await p.evaluate(`document.getElementById('quiz-country-search').value='';document.getElementById('quiz-country-search').dispatchEvent(new Event('input'))`);}
 async function toggle(id){await chooseCountry(p,id);await p.tap('[data-pin-country='+id+']');assert(!await p.evaluate(`document.querySelector('[data-country-detail]').hidden`));await back();}
 const ids=['china','japan','brunei','france','canada'];for(const id of ids)await toggle(id);
 const first=()=>p.evaluate(`[...document.querySelector('.quiz-country-grid').children].slice(0,5).map(e=>e.querySelector('[data-quiz-card]').dataset.quizCard)`);
 assert.deepEqual(await first(),ids);assert.equal(await p.evaluate(`document.querySelectorAll('.quiz-country-grid button[data-pin-country]').length`),0,'No pins on country cards');
 await chooseCountry(p,'albania');assert(await p.evaluate(`document.querySelector('[data-pin-country=albania]').disabled`));await back();
 await toggle('brunei');await toggle('albania');assert.deepEqual(await first(),['china','japan','france','canada','albania']);await p.screenshot('quiz-header-pin-library-'+(mobile?'phone':'desktop'));
 await chooseCountry(p,'china');assert.equal(await p.evaluate(`document.querySelector('[data-pin-country=china]').getAttribute('aria-pressed')`),'true');
 const layout=await p.evaluate(`(()=>{const h=document.querySelector('.quiz-country-hero'),b=h.querySelector('[data-pin-country]'),title=h.querySelector('h3'),x=b.getBoundingClientRect(),y=title.getBoundingClientRect();return {inside:h.contains(b),right:x.left>=y.right,background:getComputedStyle(b).backgroundColor,overflow:document.getElementById('atlas-account').scrollWidth>document.getElementById('atlas-account').clientWidth};})()`);
 assert(layout.inside&&layout.right);assert.equal(layout.background,'rgba(0, 0, 0, 0)');assert(!layout.overflow);await p.screenshot('quiz-header-pin-'+(mobile?'phone':'desktop'));
 await p.key('Escape');await p.send('Page.reload');await p.settle();await p.tap('#account-open');await p.tap('[data-account-section=quizzes]');await chooseCountry(p,'china');assert.equal(await p.evaluate(`document.querySelector('[data-pin-country=china]').getAttribute('aria-pressed')`),'true');
 assert.equal(await p.evaluate(`JSON.parse(localStorage.getItem('boundary-atlas-quiz-pins-v1:${owner}')).length`),5);
 await p.tap('[data-account-section=profile]');await p.tap('#account-signout');await p.waitFor(`document.getElementById('atlas-account').dataset.signedIn==='false'`);await p.key('Escape');await login(p,'second@example.test');await p.tap('[data-account-section=quizzes]');await chooseCountry(p,'china');assert.equal(await p.evaluate(`document.querySelector('[data-pin-country=china]').getAttribute('aria-pressed')`),'false');
 }}));
