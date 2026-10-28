import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';
// US county quizzes: each state card lights one indicator per mode with a perfect full round.
const attempt=(n,scope,mode,correct,extra={})=>({id:'33333333-aaaa-4111-8111-'+String(n).padStart(12,'0'),country:'united-states',level:2,mode,scope,scopeLabel:scope,poolHash:'ab'+n,total:62,correct,hints:0,reveals:0,elapsedMs:300000,completed:true,fullRound:true,finishedAt:new Date().toISOString(),...extra});
const attempts=[attempt(1,'US-NY','find',62),attempt(2,'US-NY','name',62),attempt(3,'US-CA','identify',62),attempt(4,'US-TX','name',61),attempt(5,'US-FL','find',62,{hints:1}),attempt(6,'440000','name',21,{country:'china',total:21,scopeLabel:'Guangdong · 广东省'})];
const lights=(p,state)=>p.evaluate(`[...document.querySelectorAll('.quiz-state-card')].find(c=>c.title.startsWith(${JSON.stringify(state)}))?[...document.querySelectorAll('.quiz-state-card')].find(c=>c.title.startsWith(${JSON.stringify(state)})).querySelectorAll('.quiz-state-light.on').length:-1`);
export default [390,1280].map(width=>({name:'US county quiz state progress lights '+width,options:{width,height:1000,mobile:width===390},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#united-states');
 await p.evaluate(`AtlasSettings.setSettings({motion:'reduce'});localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':${JSON.stringify(attempts)}}))`);await login(p);
 await chooseCountry(p,'united-states');
 assert(await p.evaluate(`document.querySelector('[data-state-progress]').hidden`),'States quiz has no state grid');
 await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='2';l.dispatchEvent(new Event('change'))}`);
 await p.waitFor(`document.querySelectorAll('.quiz-state-card').length===50`);
 assert.equal(await lights(p,'New York'),2);assert.equal(await lights(p,'California'),1);assert.equal(await lights(p,'Texas'),0,'An imperfect round stays unlit');assert.equal(await lights(p,'Florida'),0,'A hinted round stays unlit');
 assert.equal(await p.evaluate(`document.querySelector('[data-state-count]').textContent`),'3 / 150');
 await p.evaluate(`[...document.querySelectorAll('.quiz-state-card')].find(c=>c.title.startsWith('New York')).click()`);
 assert.equal(await p.evaluate(`document.querySelector('[data-quiz-scope]').value`),'US-NY','A state card chooses that state');
 assert.equal(await p.evaluate(`[...document.querySelectorAll('.quiz-state-card')].find(c=>c.title.startsWith('New York')).getAttribute('aria-pressed')`),'true');
 await p.evaluate(`document.querySelectorAll('.quiz-state-card img').forEach(i=>i.loading='eager')`);await p.waitFor(`[...document.querySelectorAll('.quiz-state-card img')].every(i=>i.complete&&i.naturalWidth>0)`);
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal scroll');
 await p.evaluate(`document.querySelector('[data-state-progress]').scrollIntoView()`);await p.screenshot('quiz-state-progress-'+width);
 // China prefectures: the same grid by province, with short Chinese names in place of flags.
 await chooseCountry(p,'china');await p.evaluate(`{const l=document.querySelector('[data-quiz-level]');l.value='2';l.dispatchEvent(new Event('change'))}`);
 await p.waitFor(`document.querySelectorAll('.quiz-state-card').length===28`);
 assert.equal(await p.evaluate(`document.getElementById('quiz-state-title').textContent`),'Provinces');
 assert.equal(await lights(p,'Guangdong'),1);assert.equal(await lights(p,'New York'),-1,'US cards are replaced');
 assert.equal(await p.evaluate(`[...document.querySelectorAll('.quiz-state-card')].find(c=>c.title.startsWith('Inner Mongolia')).querySelector('.quiz-state-glyph').textContent`),'内蒙古');
 await p.evaluate(`[...document.querySelectorAll('.quiz-state-card')].find(c=>c.title.startsWith('Guangdong')).click()`);assert.equal(await p.evaluate(`document.querySelector('[data-quiz-scope]').value`),'440000');assert.equal(await p.evaluate(`document.querySelector('[data-quiz-scope] option[value="440000"]').textContent`),'Guangdong','Played provinces keep the library label');
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await p.evaluate(`document.querySelector('[data-state-progress]').scrollIntoView()`);await p.screenshot('quiz-province-progress-'+width);
}}));
