import assert from 'node:assert/strict';
import {placePronunciations} from '../../dist/place-pronunciations.mjs';
const examples=[['argentina','AR-02','ar'],['argentina','AR-94','ar'],['uruguay','UY-LA','uy'],['uruguay','UY-RV','uy'],['chile','CL-R-11','cl'],['chile','CL-R-06','cl'],['costa-rica','CR-P-3','cr'],['costa-rica','CR-P-4','cr'],['costa-rica','CR-P-6','cr'],['united-kingdom','GB-C-E06000038','gb']];
export default [false,true].map(mobile=>({name:'Latin American Spanish and corrected Reading '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"globalThis.__nativePlayed=[];document.addEventListener('playing',e=>{if(e.target.matches('audio[data-pronunciation]'))globalThis.__nativePlayed.push({src:e.target.currentSrc,duration:e.target.duration});},true);"});
 await p.open(base,'#argentina');assert(!p.requests.some(url=>url.endsWith('.mp3')),'No audio preload');
 for(const [country,id,prefix]of examples){
  await p.waitFor('allReady&&atlasesReady&&!countrySwitching');
  if(await p.evaluate('atlasMode')!==country){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');await p.settle();
  if(mobile){for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#'+country+'-sidebar .sheet-handle');await p.waitFor('document.documentElement.dataset.sheet==="full"');}
  const entries=Object.values(placePronunciations).filter(e=>e.country===country&&e.id===id);
  const visible=await p.evaluate(`Array.from(document.getElementById('${prefix}-name').parentElement.querySelectorAll('.pronunciation-button:not([hidden])')).map(b=>({lang:b.dataset.pronunciationLanguage,label:b.dataset.languageLabel,title:b.title,anchor:b.parentElement.id,regional:b.parentElement.classList.contains('regional-name-row')}))`);
  assert.deepEqual(visible.map(b=>b.lang).sort(),entries.map(e=>e.language).sort());
  if(country==='india'&&id==='IN-TN'){
   assert.equal(visible.find(b=>b.lang==='en').anchor,'in-name');assert.equal(visible.find(b=>b.lang==='ta').anchor,'in-local');assert(visible.find(b=>b.lang==='te').regional,'Telugu control follows the Telugu row');
  }
  for(const entry of entries){
   const selector='#'+prefix+'-name',language=JSON.stringify(entry.language);
   const buttonId=await p.evaluate(`Array.from(document.querySelector(${JSON.stringify(selector)}).parentElement.querySelectorAll('.pronunciation-button:not([hidden])')).find(b=>b.dataset.pronunciationLanguage===${language}).id`);
   const disclosure=await p.evaluate(`(()=>{const d=document.getElementById(${JSON.stringify(buttonId)}).closest('details');return d&&!d.open;})()`);
   if(disclosure)await p.tap('#'+prefix+'-names .regional-name-details > summary');
   const before=await p.evaluate('globalThis.__nativePlayed.length');await p.tap('#'+buttonId);await p.waitFor('globalThis.__nativePlayed.length>'+before);
   const played=await p.evaluate('globalThis.__nativePlayed.at(-1)');assert(played.src.endsWith('/'+entry.src),JSON.stringify(played));assert(played.duration>.15&&played.duration<16);
   assert.equal(await p.evaluate('document.querySelectorAll("audio[data-pronunciation]").length'),1);
   await p.evaluate(`(()=>{const a=document.querySelector('audio[data-pronunciation]');if(!a.paused)document.getElementById(${JSON.stringify(buttonId)}).click();})()`);
   assert(await p.evaluate(`(()=>{const a=document.querySelector('audio[data-pronunciation]');return a.paused&&!a.hasAttribute('src');})()`));
  }
  assert(!await p.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'No horizontal overflow');
  if(id==='AR-02'||id==='CR-P-3'||id==='GB-C-E06000038')await p.screenshot(country+'-latin-spanish-audio-'+(mobile?'phone':'desktop'));
 }
 await p.evaluate('changeAtlas("china",false)');await p.settle();assert(await p.evaluate(`(()=>{const a=document.querySelector('audio[data-pronunciation]');return a.paused&&!a.hasAttribute('src');})()`));
}}));
