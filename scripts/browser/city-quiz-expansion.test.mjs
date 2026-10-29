import assert from 'node:assert/strict';
import {fixture,login,chooseCountry} from './quiz-dashboard.test.mjs';

const cityPrefix=country=>country==='china'?'cn-cities':country==='united-states'?'us-cities':country+'-cities';
const cityFile=country=>'data/quiz/'+(country==='united-states'?'us':country)+'-cities.json';
async function openCities(p,country,scope='easy'){
 await p.evaluate(country==='china'?'openChinaCities({scope:'+JSON.stringify(scope)+'})':country==='united-states'?'currentAtlas().countyQuiz.open({level:3,scope:'+JSON.stringify(scope)+'})':'currentAtlas().cityQuiz.open({scope:'+JSON.stringify(scope)+'})');
 const panel='#'+cityPrefix(country)+'-quiz-panel';
 await p.waitFor('document.querySelector('+JSON.stringify(panel)+')&&!document.querySelector('+JSON.stringify(panel)+').hidden&&!document.querySelector('+JSON.stringify(panel+' [data-q=start]')+').disabled');
 return panel;
}
async function scope(p,prefix,value){await p.evaluate('(()=>{const s=document.getElementById('+JSON.stringify(prefix+'-quiz-scope')+');s.value='+JSON.stringify(value)+';s.dispatchEvent(new Event("change"))})()');}
async function verifyCoverage(p,country,panel){
 const value=await p.evaluate('(async()=>{const panel=document.querySelector('+JSON.stringify(panel)+'),data=await(await fetch('+JSON.stringify(cityFile(country))+')).json(),levels=data.levels.map(l=>l.id),scope=panel.querySelector("select[id$=-quiz-scope]").value,overseas=panel.querySelector("[data-q=overseas]").checked,expected=data.records.filter(r=>levels.indexOf(r.tier)<=levels.indexOf(scope)&&(overseas||!r.overseas));return{expected:expected.map(r=>r.en).sort(),actual:[...panel.querySelectorAll("[data-city-coverage-list] li")].map(e=>e.textContent).sort(),summary:panel.querySelector("[data-city-coverage] summary").textContent,count:parseInt(panel.querySelector("[data-q=count]").textContent)}})()');
 assert.deepEqual(value.actual,value.expected,country+' preview matches the actual pool');assert.equal(value.count,value.expected.length);assert.equal(value.summary,'Cities included ('+value.expected.length+')');return value.count;
}
export default [
 {name:'Every city quiz previews the selected cumulative list and overseas options',options:{width:1280,height:900,developer:true},async run(p,base){
  const countries=['canada','argentina','brazil','russia','spain','germany','united-kingdom','italy','france','united-states','china'];
  await p.open(base,'#canada');
  for(const country of countries){
   if(country!=='canada'){await p.evaluate('changeAtlas('+JSON.stringify(country)+')');await p.settle();}
   const panel=await openCities(p,country),prefix=cityPrefix(country),details=panel+' [data-city-coverage]';
   assert(!await p.evaluate('document.querySelector('+JSON.stringify(details)+').open'),'Preview starts collapsed');await p.tap(details+' summary');
   const levels=await p.evaluate('AtlasCountries.countries['+JSON.stringify(country)+'].quiz.cities.levels.map(l=>l.id)');
   for(const level of levels){await scope(p,prefix,level);await verifyCoverage(p,country,panel);assert(await p.evaluate('document.querySelector('+JSON.stringify(details)+').open'),'Changing difficulty preserves expansion');}
   if(['france','china'].includes(country))for(const include of [false,true]){await p.evaluate('(()=>{const c=document.querySelector('+JSON.stringify(panel+' [data-q=overseas]')+');c.checked='+include+';c.dispatchEvent(new Event("change"))})()');await verifyCoverage(p,country,panel);}
   assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal overflow');
  }
 }},
 ...['canada','argentina'].map(country=>({name:country+' four city tiers, map answers, typed aliases, highlighted mode and map restore',options:{width:1280,height:900,developer:true},async run(p,base){
  await p.open(base,'#'+country);
  await p.evaluate('currentAtlas().restore('+JSON.stringify(country==='canada'?'CA-ON':'AR-14')+')');await p.settle();
  const saved=await p.evaluate('({id:currentAtlas().getSelection(),mode:currentAtlas().getMode?.(),scope:currentAtlas().getScope?.()})');
  const prefix=cityPrefix(country),panel='#'+prefix+'-quiz-panel';
  await p.evaluate('currentAtlas().quiz.open()');
  await p.evaluate('(()=>{const s=document.getElementById(currentAtlas().quiz.panel.id+"-divisions");s.value="3";s.dispatchEvent(new Event("change"))})()');
  await p.waitFor('document.querySelector('+JSON.stringify(panel+' [data-city-coverage]')+')&&!document.querySelector('+JSON.stringify(panel+' [data-q=start]')+').disabled');
  assert.equal(await p.evaluate('document.getElementById('+JSON.stringify(prefix+'-quiz-scope')+').options.length'),4);
  const counts=[];for(const level of ['easy','medium','hard','expert']){await scope(p,prefix,level);counts.push(await verifyCoverage(p,country,panel));}assert.deepEqual(counts,country==='canada'?[10,25,45,65]:[8,25,45,65]);
  await scope(p,prefix,'easy');
  for(const mode of ['find','name','identify']){
   await p.evaluate('(()=>{const s=document.getElementById('+JSON.stringify(prefix+'-quiz-type')+');s.value='+JSON.stringify(mode)+';s.dispatchEvent(new Event("change"))})()');
   await p.tap(panel+' [data-q=start]');await p.waitFor('currentAtlas().cityQuiz.active');await p.settle();
   assert(!await p.evaluate('document.querySelector('+JSON.stringify(panel+' [data-city-coverage]')+').checkVisibility({visibilityProperty:true})'),'Covered names are hidden during a round');
   if(mode==='find'){
    const point=await p.evaluate('(async()=>{const name=document.querySelector('+JSON.stringify(panel+' [data-q=question]')+').textContent,data=await(await fetch('+JSON.stringify(cityFile(country))+')).json(),record=data.records.find(r=>r.en===name),p=map.project(record.center),b=map.getCanvas().getBoundingClientRect();return[b.x+p.x,b.y+p.y]})()');await p.tap(point);
   }else{
    const name=mode==='name'?(country==='canada'?'Montreal':'Cordoba'):await p.evaluate('(async()=>{const data=await(await fetch('+JSON.stringify(cityFile(country))+')).json();return data.records.find(r=>map.getFeatureState({source:'+JSON.stringify('quiz-'+prefix)+',id:r.id}).quizTarget).en})()');
    await p.evaluate('(()=>{const input=document.getElementById('+JSON.stringify(prefix+'-quiz-answer')+');input.value='+JSON.stringify(name)+';document.querySelector('+JSON.stringify(panel+' [data-q=form]')+').requestSubmit()})()');
   }
   await p.waitFor('document.querySelector('+JSON.stringify(panel+' [data-q=feedback]')+').dataset.status==="correct"');
   assert.equal(await p.evaluate('map.getLayoutProperty('+JSON.stringify(country==='canada'?'canada-first-fill':'south-argentina-fill')+',"visibility")'),'visible');
   await p.tap('#home');await p.settle();assert.deepEqual(await p.evaluate('({id:currentAtlas().getSelection(),mode:currentAtlas().getMode?.(),scope:currentAtlas().getScope?.()})'),saved);
   await openCities(p,country);
  }
 }})),
 {name:'Canada and Argentina city quizzes launch from the dashboard with four difficulties',options:{width:1280,height:900,developer:true},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#canada');await login(p);
  for(const country of ['canada','argentina']){
   await chooseCountry(p,country);
   await p.evaluate('(()=>{const s=document.querySelector("[data-quiz-level]");s.value="3";s.dispatchEvent(new Event("change"))})()');
   assert.deepEqual(await p.evaluate('[...document.querySelector("[data-quiz-scope]").options].map(o=>o.value)'),['easy','medium','hard','expert']);
   await p.evaluate('(()=>{const s=document.querySelector("[data-quiz-scope]");s.value="expert";s.dispatchEvent(new Event("change"))})()');
   await p.tap('[data-play-quiz]');await p.settle();const panel='#'+cityPrefix(country)+'-quiz-panel';
   await p.waitFor('!document.querySelector('+JSON.stringify(panel+' [data-q=start]')+').disabled');assert.equal(await verifyCoverage(p,country,panel),65);
   assert.equal(await p.evaluate('document.getElementById('+JSON.stringify(cityPrefix(country)+'-quiz-scope')+').value'),'expert');
   await p.tap('#account-open');
  }
 }},
 ...['canada','argentina'].map(country=>({name:country+' mobile city coverage expands, scrolls and stays within the setup panel',options:{width:390,height:844,mobile:true,developer:true},async run(p,base){
  await p.open(base,'#'+country);const panel=await openCities(p,country,'expert');
  await p.tap(panel+' [data-city-coverage] summary');assert.equal(await verifyCoverage(p,country,panel),65);
  assert(await p.evaluate('document.querySelector('+JSON.stringify(panel+' [data-city-coverage-list]')+').scrollHeight>document.querySelector('+JSON.stringify(panel+' [data-city-coverage-list]')+').clientHeight'));
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await p.screenshot(country+'-city-coverage-phone');await p.tap(panel+' [data-city-coverage] summary');
  assert(!await p.evaluate('document.querySelector('+JSON.stringify(panel+' [data-city-coverage]')+').open'));
 }}))
];
