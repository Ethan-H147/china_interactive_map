import assert from 'node:assert/strict';
import {open,seed} from './collection-expansion.test.mjs';
const countries=['argentina','chile','brazil','united-kingdom','spain','italy'];
export default [false,true].map(mobile=>({
 name:'Six detailed collectibles: concealed artwork, earned models, downloads and rotation on '+(mobile?'phone':'desktop'),
 options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:1000},
 async run(p,base){
  await open(p,base);
  for(const country of countries){
   await p.tap('[data-trophy-card='+country+']');
   assert(await p.evaluate(`(()=>{const c=document.querySelector('[data-trophy-card=${country}]');return c.dataset.earned==='false'&&c.querySelector('strong').hidden&&c.querySelector('strong').textContent===''&&!c.querySelector('.quiz-trophy-art img')&&!document.querySelector('[data-trophy-canvas] canvas')&&!document.querySelector('[data-trophy-download]').hasAttribute('href')&&!document.querySelector('[data-trophy-poster]').hasAttribute('src')})()`));
   await p.tap('[data-trophy-back]');
  }
  assert(!p.requests.some(r=>r.includes('data/trophies/')),'No locked artwork or mesh is fetched');
  await seed(p,countries);await p.waitFor(`document.querySelector('[data-trophy-count]').textContent==='6 / 13 collected'`);
  for(const country of countries){
   await p.tap('[data-trophy-card='+country+']');await p.waitFor(`document.querySelector('[data-trophy-canvas] canvas')?.dataset.ready==='true'`);
   const file=country==='brazil'?'brazil-christ-v2.glb':country+'.glb';
   assert(await p.evaluate(`(()=>{const a=document.querySelector('[data-trophy-download]');return !a.hidden&&a.href.endsWith('/data/trophies/'+${JSON.stringify(file)})&&a.hasAttribute('download')})()`));
   assert.equal(await p.evaluate(`document.querySelectorAll('#atlas-account canvas').length`),1);
   const before=await p.evaluate(`document.querySelector('[data-trophy-canvas] canvas').dataset.draws`);
   if(mobile)await p.drag('[data-trophy-canvas] canvas',{dx:80,dy:24},{steps:5,duration:150});
   else{await p.tap('[data-trophy-canvas] canvas');await p.key('ArrowRight');}
   await p.waitFor(`Number(document.querySelector('[data-trophy-canvas] canvas').dataset.draws)>${Number(before)}`);
   await p.tap('[data-trophy-reset]');await p.screenshot('six-collectibles-'+country+'-'+(mobile?'phone':'desktop'));
   assert(await p.evaluate(`document.getElementById('atlas-account').scrollWidth<=document.getElementById('atlas-account').clientWidth`));
   await p.tap('[data-trophy-back]');assert.equal(await p.evaluate(`document.querySelectorAll('#atlas-account canvas').length`),0);
  }
 }
}));
