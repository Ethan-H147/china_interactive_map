import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
export const fixture=`(()=>{
 const real=fetch.bind(window),A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';window.quizApiOffline=false;window.quizApiCalls=[];
 const read=()=>JSON.parse(localStorage.getItem('quiz-test-cloud')||'{}'),save=data=>localStorage.setItem('quiz-test-cloud',JSON.stringify(data));
 const idFor=email=>email==='second@example.test'?B:A;
 function user(id){return{id,aud:'authenticated',role:'authenticated',email:id===B?'second@example.test':'atlas@example.test',email_confirmed_at:'2026-10-24T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{display_name:id===B?'Second explorer':'Atlas explorer'},created_at:'2026-10-24T00:00:00Z'};}
 const owner=init=>new Headers(init.headers).get('Authorization')?.includes(B)?B:A;
 window.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input.url||String(input),body=init.body?JSON.parse(init.body):{};
  if(url.startsWith('https://odenagmobrswlzkljayf.supabase.co/auth/v1/')){const path=new URL(url).pathname,id=body.email?idFor(body.email):owner(init);if(path.endsWith('/token'))return Response.json({access_token:'test-access-token-'+id,refresh_token:'test-refresh-token-'+id,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:user(id)});if(path.endsWith('/user'))return Response.json({...user(id),user_metadata:{...user(id).user_metadata,...body.data}});return Response.json({});}
  if(!url.startsWith('https://china-boundary-atlas.hys0423.chatgpt.site/api/quiz-records'))return real(input,init);
  window.quizApiCalls.push({owner:owner(init),method:init.method||'GET',body});if(window.quizApiOffline)throw TypeError('Offline');
  const id=owner(init),cloud=read(),all=cloud[id]||[];
  if(init.method==='POST'){for(const a of body.attempts)if(!all.some(old=>old.id===a.id))all.push(a);cloud[id]=all;save(cloud);return Response.json({accepted:body.attempts.map(a=>a.id)},{status:201});}
  const {summarizeQuizAttempts}=await import('/quiz-records-core.mjs');return Response.json({...summarizeQuizAttempts(all),recent:[...all].reverse(),nextCursor:null});
 };
})();`;
export async function login(p,email='atlas@example.test'){
 await p.tap('#account-open');await p.waitFor(`document.getElementById('account-form').getAttribute('aria-busy')!=='true'`);
 await p.evaluate(`document.getElementById('account-email').value=${JSON.stringify(email)};document.getElementById('account-password').value='Atlas-test-password-123';document.getElementById('account-form').requestSubmit()`);
 await p.waitFor(`document.getElementById('atlas-account').dataset.signedIn==='true'`);
 await p.waitFor(`document.querySelector('[data-record-status]').textContent==='Synced to your account'`);
}
export async function chooseCountry(p,country){
 if(await p.evaluate("!document.querySelector('[data-country-detail]').hidden"))await p.tap('[data-country-back]');else await p.tap('[data-quiz-view=countries]');
 await p.evaluate("document.getElementById('quiz-country-search').value=AtlasCountries.countries["+JSON.stringify(country)+"].en;document.getElementById('quiz-country-search').dispatchEvent(new Event('input'))");await p.tap('[data-quiz-card='+country+']');
}
export async function launch(p,country,level=1){
 await chooseCountry(p,country);if(country==='china')await p.evaluate("document.querySelector('[data-quiz-level]').value="+JSON.stringify(String(level))+";document.querySelector('[data-quiz-level]').dispatchEvent(new Event('change'))");await p.tap('.quiz-mode-choice:has([data-quiz-mode=name])');
 await p.tap('[data-play-quiz]');await p.settle();await p.waitFor("currentAtlas()?.quiz?.panel&&!currentAtlas().quiz.panel.hidden");
 const id=await p.evaluate('currentAtlas().quiz.panel.id');await p.waitFor("!document.querySelector('#"+id+" [data-q=start]').disabled");await p.tap('#'+id+' [data-q=start]');await p.settle();return id;
}

const names=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/san-marino/catalogue.bin'))).records.filter(r=>r.level===1).map(r=>r.en);
export default [
 {name:'Account quiz history, fastest record, reload and account isolation',options:{width:1280,height:960},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#australia');await p.evaluate(`AtlasSettings.setSettings({motion:'reduce'})`);await login(p);const panel=await launch(p,'san-marino');
  for(const name of names){await p.evaluate(`document.querySelector('#${panel} [data-q=form] input').value=${JSON.stringify(name)};document.querySelector('#${panel} [data-q=form]').requestSubmit()`);await new Promise(r=>setTimeout(r,25));}
  await p.waitFor(`document.querySelector('#${panel} [data-q=question]').textContent==='Round complete'`);await p.waitFor(`JSON.parse(localStorage.getItem('quiz-test-cloud')||'{}')['11111111-1111-4111-8111-111111111111']?.length===1`);
  await p.tap('#'+panel+' [data-q=end]');await p.tap('#account-open');await p.waitFor(`document.querySelectorAll('.quiz-history-row').length===1`);assert.match(await p.evaluate(`document.querySelector('.quiz-history-row').textContent`),/San Marino/);assert.match(await p.evaluate(`document.querySelector('.quiz-history-row').textContent`),/9 \/ 9/);
  await p.tap('[data-country-back]');await p.tap('[data-quiz-view=history]');await p.screenshot('quiz-dashboard-desktop');await p.key('Escape');await p.send('Page.reload');await p.settle();await p.tap('#account-open');await p.waitFor(`document.querySelectorAll('.quiz-history-row').length===1`);
  await p.tap('[data-account-section=profile]');await p.tap('#account-signout');await p.waitFor(`document.getElementById('atlas-account').dataset.signedIn==='false'`);await p.key('Escape');await login(p,'second@example.test');assert.equal(await p.evaluate(`document.querySelectorAll('.quiz-history-row').length`),0,'Another account cannot see the first account’s results');
  await p.tap('[data-account-section=quizzes]');assert.equal(await p.evaluate(`document.querySelector('.quiz-stat strong').textContent`),'0');await p.screenshot('quiz-dashboard-account-isolation');
 }},
 {name:'Phone dashboard and new subdivision quiz overlay',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture});await p.open(base,'#japan');await p.evaluate(`AtlasSettings.setSettings({motion:'reduce'})`);await login(p);await p.screenshot('quiz-dashboard-phone');assert(await p.evaluate(`document.getElementById('atlas-account').scrollWidth<=document.getElementById('atlas-account').clientWidth`));
  await chooseCountry(p,'japan');await p.waitFor("document.querySelector('[data-country-flag] img').getBoundingClientRect().width>0");await p.screenshot('quiz-country-japan-phone');assert(await p.evaluate("document.getElementById('atlas-account').scrollWidth<=document.getElementById('atlas-account').clientWidth"));const panel=await launch(p,'japan');assert.match(await p.evaluate(`document.querySelector('#${panel} [data-q=progress]').textContent`),/47/);assert(await p.evaluate(`map.getLayer('quiz-overlay-japan-fill')!==undefined`));
  assert(await p.evaluate(`Array.from(document.querySelectorAll('#map .maplibregl-marker:not(.quiz-answer-label)')).every(e=>getComputedStyle(e).visibility==='hidden')`),'Ordinary map labels do not reveal answers');
  await p.screenshot('japan-prefecture-quiz-phone');await p.tap('#'+panel+' [data-q=end]');assert(!await p.evaluate(`!!map.getLayer('quiz-overlay-japan-fill')`),'Quiz layers are removed on exit');
 }}
];
