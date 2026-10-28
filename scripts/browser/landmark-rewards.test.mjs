import assert from 'node:assert/strict';
import {open,seed} from './collection-expansion.test.mjs';
const names={china:'Great Wall','united-states':'Statue of Liberty',korea:'Gyeongbokgung throne hall',russia:'Saint Basil’s Cathedral'};
export default [
 {name:'Statue replacements inspect cleanly on phone',options:{width:390,height:844,mobile:true},async run(p,base){
  await open(p,base);await seed(p,['russia','united-states','brazil']);await p.waitFor(`document.querySelector('[data-trophy-count]').textContent==='3 / 13 collected'`);
  for(const [country,file]of [['russia','russia-saint-basil.glb'],['united-states','us-statue-of-liberty-v3.glb'],['brazil','brazil-christ-v2.glb']]){
   await p.tap('[data-trophy-card='+country+']');await p.waitFor(`document.querySelector('[data-trophy-canvas] canvas')?.dataset.ready==='true'`);
   assert(await p.evaluate(`document.querySelector('[data-trophy-download]').href.endsWith('/'+${JSON.stringify(file)})`));
   if(country==='brazil')assert(await p.evaluate(`(()=>{const a=document.querySelector('[data-trophy-source]');return !a.hidden&&a.textContent.includes('JuanG3D')&&a.href.includes('d143e5357efd42529777438d0f72c79c')})()`));
   const before=await p.evaluate(`document.querySelector('[data-trophy-canvas] canvas').dataset.draws`);await p.drag('[data-trophy-canvas] canvas',{dx:70,dy:18},{steps:5,duration:150});
   await p.waitFor(`Number(document.querySelector('[data-trophy-canvas] canvas').dataset.draws)>${Number(before)}`);await p.tap('[data-trophy-reset]');await p.evaluate(`document.getElementById('atlas-account').scrollTo({top:0,behavior:'instant'})`);await p.screenshot('russia-liberty-'+country+'-phone');
   assert(await p.evaluate(`document.getElementById('atlas-account').scrollWidth<=document.getElementById('atlas-account').clientWidth`));await p.tap('[data-trophy-back]');assert.equal(await p.evaluate(`document.querySelectorAll('#atlas-account canvas').length`),0);
  }
 }},
 {name:'Existing first-level scores unlock landmark replacements and reserve no objects publicly',options:{width:1280,height:1000},async run(p,base){
  await open(p,base);assert.equal(await p.evaluate(`document.querySelectorAll('[data-reserved-collectibles]').length`),0);
  assert(!p.requests.some(r=>r.includes('dev-collectibles')||r.includes('/reserved/')));
  await seed(p,Object.keys(names));await p.waitFor(`document.querySelector('[data-trophy-count]').textContent==='4 / 13 collected'`);
  for(const [country,name]of Object.entries(names)){
   await p.tap('[data-trophy-card='+country+']');assert.equal(await p.evaluate(`document.querySelector('[data-trophy-title]').textContent`),name);
   await p.waitFor(`document.querySelector('[data-trophy-canvas] canvas')?.dataset.ready==='true'`);
   assert(await p.evaluate(`!document.querySelector('[data-trophy-download]').hidden`));if(country==='united-states')assert(await p.evaluate(`(()=>{const a=document.querySelector('[data-trophy-source]');return !a.hidden&&a.textContent.includes('Metron3D')&&a.href.includes('8e808365b5a6453497826b114b02f155')})()`));await p.screenshot('landmark-reward-'+country);await p.tap('[data-trophy-back]');
  }
  assert(!p.requests.some(r=>r.includes('/reserved/')),'Qualifying scores never fetch reserved objects');
 }},
 ...[false,true].map(mobile=>({name:'Developer shelf preserves future rewards and releases previews on '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:1000},async run(p,base){
  await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('boundary-atlas-developer-v1','true')`});
  await open(p,base);await p.waitFor(`document.querySelectorAll('[data-reserved-collectible]').length===4`);assert.equal(await p.evaluate(`document.querySelectorAll('[data-trophy-card]').length`),13);
  assert.equal(await p.evaluate(`document.querySelector('[data-trophy-count]').textContent`),'0 / 13 collected');
  await p.tap('[data-reserved-collectibles]>summary');
  for(const id of ['china-jade-disc','korea-celadon','us-liberty-bell','russia-matryoshka']){
   await p.tap('[data-reserved-collectible='+id+']');await p.waitFor(`document.querySelector('[data-reserved-canvas] canvas')?.dataset.ready==='true'`);
   assert(await p.evaluate(`(()=>{const a=document.querySelector('[data-reserved-preview] a');return a.href.endsWith('/reserved/${id}.glb')&&a.hasAttribute('download')})()`));
   assert.equal(await p.evaluate(`document.querySelectorAll('#atlas-account canvas').length`),1);await p.screenshot('reserved-'+id+'-'+(mobile?'phone':'desktop'));
  }
  assert.equal(await p.evaluate(`document.querySelector('[data-trophy-count]').textContent`),'0 / 13 collected');
  assert(await p.evaluate(`document.getElementById('atlas-account').scrollWidth<=document.getElementById('atlas-account').clientWidth`));
  await p.tap('[data-trophy-card=china]');assert.equal(await p.evaluate(`document.querySelectorAll('#atlas-account canvas').length`),0,'Opening locked public reward releases reserved viewer');
  assert.equal(await p.evaluate(`document.querySelector('[data-trophy-detail] .quiz-trophy-stage').style.getPropertyValue('--trophy-tint')`),'#e4eee8','Public preview retains its own material background when the reserved stage exists');
  await p.key('Escape');await p.tap('.developer-exit');assert.equal(await p.evaluate(`AtlasDev.enabled`),false);
  const before=p.requests.filter(r=>r.includes('/reserved/')).length;await p.tap('#account-open');
  assert.equal(await p.evaluate(`document.querySelectorAll('[data-reserved-collectibles]').length`),0);assert.equal(await p.evaluate(`document.querySelectorAll('#atlas-account canvas').length`),0);
  assert.equal(p.requests.filter(r=>r.includes('/reserved/')).length,before);
 }}))
];
