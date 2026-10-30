import assert from 'node:assert/strict';
import {fixture,login} from './quiz-dashboard.test.mjs';
// Collection opens on the medal cabinet: earned medals on country shelves with per-mode dots, the
// owner's name on the plaque, and the case upgrading with points (Bronze 1 … Diamond 10, topics 5).
const attempt=(n,country,scope,mode,total)=>({id:'77777777-aaaa-4111-8111-'+String(n).padStart(12,'0'),country,level:3,mode,scope,scopeLabel:scope,poolHash:'ff'+n,total,correct:total,hints:0,reveals:0,elapsedMs:100000,completed:true,fullRound:true,finishedAt:new Date().toISOString()});
const seed=rows=>`localStorage.setItem('quiz-test-cloud',JSON.stringify({'11111111-1111-4111-8111-111111111111':${JSON.stringify(rows)}}))`;
const state=p=>p.evaluate(`(()=>{const c=document.querySelector('[data-cabinet-case]');return {tier:c.dataset.tier,points:document.querySelector('[data-cabinet-points]').textContent,owner:document.querySelector('[data-cabinet-owner]').textContent,shelves:[...document.querySelectorAll('[data-cabinet-country]')].map(s=>s.dataset.cabinetCountry),crest:!!c.querySelector('[data-cabinet-crest] svg'),hidden:document.querySelector('[data-medal-cabinet]').hidden,trinkets:document.querySelector('[data-quiz-collection]').hidden}})()`);
export default [{name:'Medal cabinet: shelves, mode dots, owner plaque, points and case upgrades',options:{width:1280,height:1000},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#italy');
 // Italy cities Gold (Hard) in all three modes = 12; Germany football top two in Find = 7; China Silk Road in Name = 5.
 const rows=[...['find','name','identify'].map((m,i)=>attempt(i+1,'italy','hard',m,64)),attempt(4,'germany','football-2026-27-tier2','find',36),attempt(5,'china','misc-silk-road','name',20)];
 await p.evaluate(seed(rows));await login(p);await p.tap('[data-quiz-view=collection]');
 let s=await state(p);assert(!s.hidden&&s.trinkets,'Collection opens on Medals');assert.deepEqual(s.shelves,['china','germany','italy'],'Only countries with medals get shelves');
 assert.equal(s.points,'24 / 50 points to Walnut');assert.equal(s.tier,'pine');assert.equal(s.owner,'Atlas explorer','The plaque reads the account name');
 const italy=await p.evaluate(`(()=>{const s=document.querySelector('[data-cabinet-country=italy]');return {complete:s.querySelector('.medal-shelf-plaque').classList.contains('complete'),dots:[...s.querySelectorAll('[data-cabinet-slot=cities] .medal-slot-modes i')].map(i=>i.style.background),football:s.querySelector('[data-cabinet-slot=football]').classList.contains('empty')}})()`);
 assert.equal(italy.dots.filter(Boolean).length,3,'Three mode dots lit');assert(italy.football,'Unearned football slot is an empty hollow');assert(!italy.complete,'Italy is not complete while football is missing');
 assert(await p.evaluate(`document.querySelector('[data-cabinet-country=germany] [data-cabinet-slot=football] svg').innerHTML.includes('#c4bddc')`),'Germany shows the Platinum eagle');
 await p.evaluate(`document.querySelector('[data-medal-cabinet]').scrollIntoView({block:'start'})`);await p.screenshot('medal-cabinet-pine');
 await p.tap('[data-collection-tab=trinkets]');s=await state(p);assert(s.hidden&&!s.trinkets,'Trinkets shows the 3D collectibles');
 await p.waitFor(`document.querySelectorAll('[data-trophy-card]').length>0`);
 // More medals: Italy football Diamond (+30), Germany cities Gold (+12), China cities Diamond (+30) and four
 // China topics in all modes (+60) take the case to Mahogany.
 const more=[...rows,...['find','name','identify'].map((m,i)=>attempt(10+i,'italy','football-2026-27-tier3',m,100)),...['find','name','identify'].map((m,i)=>attempt(20+i,'germany','hard',m,61)),...['find','name','identify'].map((m,i)=>attempt(30+i,'china','master',m,231)),...['misc-dynasty-capitals','misc-ancient-battles','misc-wall-passes','misc-imperial-tombs'].flatMap((t,k)=>['find','name','identify'].map((m,i)=>attempt(50+k*3+i,'china',t,m,20)))];
 await p.evaluate(seed(more));await p.send('Page.reload');await p.settle();await p.tap('#account-open');await p.waitFor(`document.querySelector('[data-record-status]').textContent==='Synced to your account'`);await p.tap('[data-quiz-view=collection]');
 s=await state(p);assert(!s.hidden,'Medals is the default again after reload');assert.equal(s.tier,'mahogany');assert(s.crest,'Mahogany has its laurel crest');assert.equal(s.points,'156 / 300 points to Ebony & gold');
 assert(await p.evaluate(`document.querySelector('[data-cabinet-country=italy] .medal-shelf-plaque').classList.contains('complete')`),'Italy shelf completes with every medal at its top material');
 assert(await p.evaluate(`!!document.querySelector('[data-cabinet-country=china] [data-cabinet-slot=cities] .medal-sparkle')`),'Diamond city medal glints');
 await p.evaluate(`document.querySelector('[data-medal-cabinet]').scrollIntoView({block:'start'})`);await p.screenshot('medal-cabinet-mahogany');
}},{name:'Medal cabinet on a phone',options:{width:390,height:844,mobile:true},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#italy');
 await p.evaluate(seed(['find','name'].map((m,i)=>attempt(40+i,'united-states','misc-college-towns',m,40))));await login(p);await p.tap('[data-quiz-view=collection]');
 const s=await state(p);assert.deepEqual(s.shelves,['united-states']);assert.equal(s.points,'10 / 50 points to Walnut');
 assert(await p.evaluate(`document.querySelector('[data-medal-cabinet]').scrollWidth<=document.querySelector('[data-medal-cabinet]').clientWidth+1`),'No sideways overflow');
 await p.evaluate(`document.querySelector('[data-medal-cabinet]').scrollIntoView({block:'start'})`);await p.screenshot('medal-cabinet-phone');
}}];
