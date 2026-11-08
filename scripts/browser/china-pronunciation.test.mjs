import assert from 'node:assert/strict';
import {chinaPronunciations} from '../../dist/china-pronunciations.mjs';
const button='document.getElementById("china-pronunciation")';
const audio='document.querySelector("audio[data-pronunciation]")';
const select=(p,id)=>p.evaluate(`selectRegion(provinceLayers.get(${id}),${id},false).then(()=>true)`);
const playing=async(p,id)=>{await p.waitFor(`${audio}?.readyState>=2&&${audio}.currentSrc.endsWith('/${id}.mp3')`);const duration=await p.evaluate(`${audio}.duration`);assert(duration>.3&&duration<8,'Real decoded speech duration: '+duration);};
const released=async p=>assert(await p.evaluate(`${audio}.paused&&!${audio}.hasAttribute('src')&&${button}.dataset.state==='idle'`),'Audio source is released');
export default [{name:'34 Mandarin clips and navigation cleanup',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#china');await p.waitFor('allReady&&chinaReady&&atlasesReady&&!countrySwitching');
 assert(!p.requests.some(r=>r.endsWith('.mp3')),'Audio is never preloaded');assert.equal(await p.evaluate(audio),null);
 for(const [id,entry] of Object.entries(chinaPronunciations)){
  await select(p,id);assert.equal(await p.evaluate(`${button}.hidden`),false);
  assert.equal(await p.evaluate('document.getElementById("selection-chinese").textContent'),entry.text);
  assert((await p.evaluate(`${button}.getAttribute('aria-label')`)).includes(entry.text));
  if(id==='110000')await p.tap('#china-pronunciation');else await p.evaluate(`${button}.click()`);
  await playing(p,id);assert.equal(await p.evaluate(`document.querySelectorAll('audio[data-pronunciation]').length`),1);
 }
 await p.evaluate(`${button}.click()`);await released(p);
 await select(p,500000);await p.evaluate(`${button}.click()`);await playing(p,500000);
 await select(p,610000);await released(p);assert.equal(await p.evaluate(`${button}.hidden`),false);
 await p.tap('#china-pronunciation');await playing(p,610000);await p.waitFor(`${audio}.paused&&!${audio}.hasAttribute('src')`);await released(p);
 await p.tap('#china-pronunciation');await playing(p,610000);
 await p.evaluate('document.getElementById("historical-snapshot").click()');await p.waitFor('historyActive()');await p.settle();await released(p);assert(await p.evaluate(`${button}.hidden`),'Present-day audio is hidden in history');
 await p.evaluate('document.getElementById("historical-snapshot").click()');await p.settle();
 await select(p,150000);await p.screenshot('china-pronunciation');
 await p.tap('#china-pronunciation');await playing(p,150000);
 await p.evaluate('changeAtlas("spain",false)');await p.settle();await released(p);assert(await p.evaluate(`${button}.hidden`));
 }},
 {name:'Mandarin audio fits phone cards',options:{width:390,height:844,mobile:true},async run(p,base){
 await p.open(base,'#china');await p.waitFor('allReady&&chinaReady&&!countrySwitching');
 await select(p,650000);await p.settle();await p.tap('#china-pronunciation');await playing(p,650000);
 const box=await p.evaluate(`(()=>{const r=${button}.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,screen:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
 assert(box.width>=27.5&&box.left>=0&&box.right<=box.screen&&!box.overflow,JSON.stringify(box));
 await p.screenshot('china-pronunciation-phone');await p.tap('#china-pronunciation');await released(p);
 }}];
