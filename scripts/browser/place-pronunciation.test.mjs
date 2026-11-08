import assert from 'node:assert/strict';
import {placePronunciations} from '../../dist/place-pronunciations.mjs';
const audio='document.querySelector("audio[data-pronunciation]")';
const prefixes={china:'china',france:'fr',spain:'es',korea:'k',russia:'ru',germany:'de',italy:'it','united-states':'us',canada:'ca',mexico:'mx',brazil:'br',portugal:'pt',japan:'j',vietnam:'vn',turkey:'tr',poland:'pl',hungary:'hu',ukraine:'ua',romania:'ro',czechia:'cz',slovakia:'sk'};
const record=(country,id)=>[country,id,prefixes[country]];
const examples=[record('china','110000'),record('france','FR-R-53'),record('france','FR-D-49'),record('spain','ES-A-09'),record('spain','ES-P-28'),record('korea','KR-11'),record('korea','KP-356443'),record('russia','RU-MOW'),record('germany','DE2'),record('italy','IT-R-02'),record('italy','IT-P-21'),record('united-states','US-CA'),record('canada','CA-QB'),record('canada','CA-NB'),record('canada','CA-ON'),record('mexico','MX-COA'),record('brazil','BR-11'),record('portugal','PT-AC'),record('japan','JP-13'),record('vietnam','VN-01'),record('turkey','TR-P-34'),record('mexico','MX-VER'),record('mexico','MX-ZAC'),record('poland','PL-V-10'),record('hungary','HU-C-08'),record('ukraine','UA-80'),record('romania','RO213'),record('czechia','CZ-R-19'),record('slovakia','SK-R-1')];
async function choose(p,country,id){
 await p.waitFor('allReady&&atlasesReady&&!countrySwitching');
 if(await p.evaluate('atlasMode')!==country){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}
 if(country==='china')await p.evaluate('selectRegion(provinceLayers.get('+id+'),'+id+',false).then(()=>true)');
 else await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');
 await p.settle();
}
function buttonId(prefix){return prefix==='china'?'china-pronunciation':prefix+'-pronunciation';}
async function checkButton(p,prefix,country,placeId,variant=''){
 const entry=placePronunciations[country+':'+placeId+variant];assert.equal(entry.provider,'ElevenLabs');
 const id=buttonId(prefix)+(variant?'-variant-1':'');const style=await p.evaluate(`(()=>{const b=document.getElementById('${id}'),s=getComputedStyle(b),icon=b.querySelector('svg').getBoundingClientRect();return {hidden:b.hidden,border:s.borderTopWidth,radius:s.borderRadius,iconWidth:icon.width,pressed:b.getAttribute('aria-pressed'),overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
 assert(!style.hidden&&!style.overflow,JSON.stringify(style));assert.equal(style.border,'0px');assert.equal(style.radius,'0px');assert(style.iconWidth<=14.1&&style.iconWidth>=13.8,JSON.stringify(style));
 const played=await p.evaluate('globalThis.__pronunciationPlayed.length');
 await p.tap('#'+id);await p.waitFor('globalThis.__pronunciationPlayed.length>'+played);
 const decoded=await p.evaluate('globalThis.__pronunciationPlayed.at(-1)');assert(decoded.src.endsWith('/'+entry.src),JSON.stringify(decoded));assert(decoded.duration>0&&decoded.duration<16);
 assert.equal(await p.evaluate(`document.querySelectorAll('audio[data-pronunciation]').length`),1);
 await p.evaluate(`if(${audio}&&!${audio}.paused)document.getElementById('${id}').click()`);
 assert(await p.evaluate(`${audio}.paused&&!${audio}.hasAttribute('src')`));
}
export default [false,true].map(mobile=>({name:'Subtle speaker and shared playback '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"globalThis.__pronunciationPlayed=[];document.addEventListener('playing',event=>{const audio=event.target;if(audio instanceof HTMLMediaElement&&audio.hasAttribute('data-pronunciation'))globalThis.__pronunciationPlayed.push({src:audio.currentSrc,duration:audio.duration});},true);"});
 await p.open(base,'#china');
 assert(!p.requests.some(url=>url.endsWith('.mp3')),'No audio preload');
 for(const [country,id,prefix]of examples){
  await choose(p,country,id);await checkButton(p,prefix,country,id);
  if(country==='canada'){
   const controls=await p.evaluate(`Array.from(document.querySelectorAll('.pronunciation-button:not([hidden])')).map(b=>({language:b.dataset.pronunciationLanguage,label:b.dataset.languageLabel,locale:b.dataset.pronunciationLocale,width:b.getBoundingClientRect().width,heading:b.parentElement.textContent}))`);
   assert.deepEqual(controls.map(c=>c.language).sort(),['en','fr']);
   for(const c of controls){assert.equal(c.label,c.language.toUpperCase());assert.equal(c.locale,c.language+'-CA');assert(c.width<55);assert(!c.heading.includes('EN')&&!c.heading.includes('FR'),'Labels do not alter card names');}
   await checkButton(p,prefix,country,id,':fr');
   await p.screenshot('canada-'+id+'-pronunciation-'+(mobile?'phone':'desktop'));
  }
 }
 await p.screenshot('place-pronunciation-'+(mobile?'phone':'desktop'));
 await choose(p,'korea','KR-11');await p.tap('#k-pronunciation');await p.evaluate('currentAtlas().quizMap.begin().then(()=>true)');assert(await p.evaluate(`${audio}.paused&&!${audio}.hasAttribute('src')`),'Quiz clears audio');
 await choose(p,'france','FR-C-75056');assert(await p.evaluate('!document.getElementById("fr-pronunciation")||document.getElementById("fr-pronunciation").hidden'),'Communes outside scope have no audio');
 await choose(p,'spain','ES-P-28');await p.tap('#es-pronunciation');await p.waitFor(`${audio}.readyState>=2&&!${audio}.paused`);
 await p.evaluate('changeAtlas("korea",false)');await p.settle();assert(await p.evaluate(`${audio}.paused&&!${audio}.hasAttribute('src')`),'Navigation releases audio');
}}));
