import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';
const packs={mexico:[8,24,46,68],'south-africa':[6,18,40],korea:[7,19,49],japan:[10,25,55,83]};
export default [
 ...Object.entries(packs).flatMap(([country,counts])=>[1280,390].map(width=>({name:country+' city quiz at '+width+'px: tiers, all modes and map restore',options:{width,height:900,mobile:width===390,developer:true},async run(p,base){
  await p.open(base,'#'+country);await p.settle();
  await p.evaluate('currentAtlas().cityQuiz.open()');
  const prefix=country+'-cities',panel='#'+prefix+'-quiz-panel';
  await p.waitFor('document.querySelector('+JSON.stringify(panel+' [data-city-coverage]')+')&&!document.querySelector('+JSON.stringify(panel+' [data-q=start]')+').disabled',{timeout:30000});
  const set=async(suffix,value)=>p.evaluate('(()=>{const s=document.getElementById('+JSON.stringify(prefix+'-quiz-')+'+'+JSON.stringify(suffix)+');s.value='+JSON.stringify(value)+';s.dispatchEvent(new Event("change"))})()');
  assert.equal(await p.evaluate('document.getElementById('+JSON.stringify(prefix+'-quiz-scope')+').options.length'),counts.length);
  for(const [i,tier]of ['easy','medium','hard','expert'].slice(0,counts.length).entries()){
   await set('scope',tier);assert.equal(await p.evaluate('parseInt(document.querySelector('+JSON.stringify(panel+' [data-q=count]')+').textContent)'),counts[i]);
   assert.equal(await p.evaluate('document.querySelectorAll('+JSON.stringify(panel+' [data-city-coverage-list] li')+').length'),counts[i]);
  }
  await set('scope','easy');
  for(const mode of ['find','name','identify']){
   await set('type',mode);await p.tap(panel+' [data-q=start]');await p.waitFor('currentAtlas().cityQuiz.active');await p.settle();
   assert(!await p.evaluate('document.querySelector('+JSON.stringify(panel+' [data-city-coverage]')+').checkVisibility({visibilityProperty:true})'));
   if(mode==='find'){
    const point=await p.evaluate('(async()=>{const name=document.querySelector('+JSON.stringify(panel+' [data-q=question]')+').textContent,d=await(await fetch("data/quiz/'+country+'-cities.json")).json(),r=d.records.find(r=>r.en===name),p=map.project(r.center),b=map.getCanvas().getBoundingClientRect();return[b.left+p.x,b.top+p.y]})()');await p.tap(point);
   }else{
    const name=mode==='name'?({mexico:'CDMX','south-africa':'Port Elizabeth',korea:'서울',japan:'東京'}[country]):await p.evaluate('(async()=>{const d=await(await fetch("data/quiz/'+country+'-cities.json")).json();return d.records.find(r=>map.getFeatureState({source:"quiz-'+prefix+'",id:r.id}).quizTarget).en})()');
    await p.evaluate('(()=>{document.getElementById('+JSON.stringify(prefix+'-quiz-answer')+').value='+JSON.stringify(name)+';document.querySelector('+JSON.stringify(panel+' [data-q=form]')+').requestSubmit()})()');
   }
   await p.waitFor('document.querySelector('+JSON.stringify(panel+' [data-q=feedback]')+').dataset.status==="correct"');
   await p.tap(panel+' [data-q=end]');await p.settle();assert(!await p.evaluate('!!map.getLayer("quiz-'+prefix+'-dots")'));
  }
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal overflow');
  await p.screenshot('four-city-'+country+'-'+width);
  await p.evaluate('(()=>{const s=document.getElementById('+JSON.stringify(prefix+'-quiz-panel-divisions')+');s.value="1";s.dispatchEvent(new Event("change"))})()');
  assert(await p.evaluate('document.querySelector('+JSON.stringify(panel)+').hidden'),'Returns to division quiz');
 }}))),
 {name:'Four new city packs launch from the dashboard',options:{width:1280,height:900,developer:true},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#mexico');await login(p);
  for(const [country,counts]of Object.entries(packs)){
   await chooseCountry(p,country);await p.evaluate('(()=>{const s=document.querySelector("[data-quiz-level]");s.value="3";s.dispatchEvent(new Event("change"))})()');
   assert.equal(await p.evaluate('document.querySelector("[data-quiz-scope]").options.length'),counts.length);
   await p.tap('[data-play-quiz]');await p.waitFor('currentAtlas()?.cityQuiz?.panel&&!currentAtlas().cityQuiz.panel.hidden',{timeout:30000});await p.tap('#account-open');
  }
 }}
];
