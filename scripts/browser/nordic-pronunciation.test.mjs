import assert from 'node:assert/strict';
import {placePronunciations} from '../../dist/place-pronunciations.mjs';
const cases=[['denmark','dk','DK01','DK-S-01100','DK-GL','DK-FO'],['finland','fi','FI-01','FI-S-0001','FI-21'],['iceland','is','IS-R-1','IS-S-50'],['norway','no','NO-50','NO-S-0801'],['sweden','se','SE-14','SE-S-0180TC101','SE-M-1480','SE-S-1480TC108']];
export default [false,true].map(mobile=>({name:'Nordic regions and cities: real pronunciation, languages and cleanup '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"globalThis.__nordicPlayed=[];document.addEventListener('playing',e=>{if(e.target.matches('audio[data-pronunciation]'))globalThis.__nordicPlayed.push({src:e.target.currentSrc,duration:e.target.duration});},true);"});
 await p.open(base,'#denmark');assert(!p.requests.some(url=>url.endsWith('.mp3')),'No audio preloading');
 for(const [country,prefix,...ids]of cases){
  await p.waitFor('allReady&&atlasesReady&&!countrySwitching');
  if(await p.evaluate('atlasMode')!==country){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}
  for(const id of ids){
   await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');await p.settle();
   if(mobile){for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#'+country+'-sidebar .sheet-handle');await p.waitFor('document.documentElement.dataset.sheet==="full"');}
   const entries=Object.values(placePronunciations).filter(e=>e.country===country&&e.id===id),selector='#'+prefix+'-name';
   const buttons=await p.evaluate(`Array.from(document.querySelector(${JSON.stringify(selector)}).parentElement.querySelectorAll('.pronunciation-button:not([hidden])')).map(b=>({id:b.id,lang:b.dataset.pronunciationLanguage,title:b.title,anchor:b.parentElement.id,anchorLang:b.parentElement.lang}))`);
   assert.deepEqual(buttons.map(b=>b.lang).sort(),entries.map(e=>e.language).sort(),id);
   if(country==='denmark'&&['DK-GL','DK-FO'].includes(id)){
    const spoken=entries[0].text;
    assert(await p.evaluate('Array.from(document.querySelectorAll("#denmark-sidebar .regional-name-row")).some(row=>row.querySelector("bdi[lang=da]")?.textContent==='+JSON.stringify(spoken)+'&&!!row.querySelector(".pronunciation-button:not([hidden])"))'));
    assert.equal(await p.evaluate('document.querySelector("#dk-local").textContent'),id==='DK-GL'?'Kalaallit Nunaat':'Føroyar');
   }
   if(country==='finland'&&id==='FI-S-0001'){
    assert.equal(buttons.find(b=>b.lang==='fi').anchor,'fi-name');
    assert.equal(buttons.find(b=>b.lang==='sv').anchorLang,'sv','Swedish speaker follows Helsingfors');
   }
   if(country==='sweden'&&['SE-M-1480','SE-S-1480TC108'].includes(id)){
    assert.equal(await p.evaluate('document.querySelector("#se-name").textContent'),'Gothenburg');
    assert((await p.evaluate('document.querySelector("#se-local").textContent')).startsWith('Göteborg'));
   }
   for(const entry of entries){
    const button=buttons.find(b=>b.lang===entry.language);assert(button.title.includes('AI-generated'));assert(!button.title.includes('Play local'));
    const before=await p.evaluate('globalThis.__nordicPlayed.length');await p.tap('#'+button.id);await p.waitFor('globalThis.__nordicPlayed.length>'+before);
    const played=await p.evaluate('globalThis.__nordicPlayed.at(-1)');assert(played.src.endsWith('/'+entry.src));assert(played.duration>.15&&played.duration<16);
    assert.equal(await p.evaluate('document.querySelectorAll("audio[data-pronunciation]").length'),1);
    await p.evaluate(`(()=>{const a=document.querySelector('audio[data-pronunciation]');if(!a.paused)document.getElementById(${JSON.stringify(button.id)}).click();})()`);
    assert(await p.evaluate(`(()=>{const a=document.querySelector('audio[data-pronunciation]');return a.paused&&!a.hasAttribute('src');})()`));
   }
   assert(!await p.evaluate('document.documentElement.scrollWidth>innerWidth+1'));
   if(country==='finland'&&id==='FI-S-0001')await p.screenshot('nordic-bilingual-pronunciation-'+(mobile?'phone':'desktop'));
  }
 }
 await p.evaluate('changeAtlas("china",false)');await p.settle();assert(await p.evaluate(`(()=>{const a=document.querySelector('audio[data-pronunciation]');return a.paused&&!a.hasAttribute('src');})()`));
}}));
