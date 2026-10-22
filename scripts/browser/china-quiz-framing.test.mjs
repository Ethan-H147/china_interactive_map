import assert from 'node:assert/strict';
const camera=p=>p.evaluate('[map.getCenter().toArray(),map.getZoom()]');
async function same(p,expected,label){const actual=await camera(p);for(let i=0;i<2;i++)assert(Math.abs(actual[0][i]-expected[0][i])<1e-6,label+' center');assert(Math.abs(actual[1]-expected[1])<1e-6,label+' zoom');}
export default [1280,390].map(width=>({name:'China quiz matches default fit '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#china');await p.tap('#fit-map');await p.settle();const expected=await camera(p);
 await p.tap('#tab-quiz');await p.evaluate('document.getElementById("china-quiz-level").value="provinces";document.getElementById("china-quiz-level").dispatchEvent(new Event("change"))');
 for(const type of ['find','identify','name']){
  await p.evaluate('document.getElementById("cn-quiz-type").value='+JSON.stringify(type)+';document.getElementById("cn-quiz-type").dispatchEvent(new Event("change"))');await p.settle();await p.tap('#cn-quiz-panel [data-q=start]');await p.waitFor('chinaFirstQuiz.active');await p.settle();await same(p,expected,type+' start');
  if(type==='find'){await p.evaluate('void map.jumpTo({center:[110,32],zoom:7})');await p.settle();await p.tap('#fit-map');await p.settle();await same(p,expected,'Quiz fit');const reveal=width===390?'.first-quiz-map:not([hidden]) button':'#cn-quiz-panel [data-q=reveal]';await p.waitFor('(()=>{const e=document.querySelector('+JSON.stringify(reveal)+');return e&&e.getClientRects().length&&!e.disabled})()');await p.tap(reveal);const next=width===390?reveal:'#cn-quiz-panel [data-q=next]';await p.waitFor('(()=>{const e=document.querySelector('+JSON.stringify(next)+');return e&&e.getClientRects().length&&!e.disabled&&e.textContent.includes("Next")})()');await p.tap(next);await p.settle();await same(p,expected,'Next question');}
  await p.evaluate('chinaFirstQuiz.end()');await p.settle();await same(p,expected,type+' exit');await p.tap('#tab-quiz');
 }
 await p.evaluate('document.getElementById("cn-quiz-level").value="prefectures";document.getElementById("cn-quiz-level").dispatchEvent(new Event("change"))');await p.settle();await p.tap('#quiz-start');await p.settle();await same(p,expected,'All-China prefecture quiz');await p.screenshot('china-quiz-default-framing-'+width);await p.tap('#home');await p.settle();
}}));
