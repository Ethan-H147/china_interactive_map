import assert from'node:assert/strict';import{placePronunciations}from'../../dist/place-pronunciations.mjs';
const examples=[["austria","AT-B-3","at"],["bulgaria","BG411","bg"],["thailand","TH-10","th"],["thailand","TH-50","th"],["switzerland","CH-K-2","ch"],["switzerland","CH-K-10","ch"],["switzerland","CH-K-23","ch"],["switzerland","CH-K-18","ch"],["switzerland","CH-K-22","ch"],["switzerland","CH-K-21","ch"]];
export default [false,true].map(mobile=>({name:'Thai Bulgarian Austrian and Swiss name playback '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:'globalThis.__newPlayed=[];document.addEventListener("playing",e=>{if(e.target.matches("audio[data-pronunciation]"))__newPlayed.push({src:e.target.currentSrc,duration:e.target.duration});},true);'});
 await p.open(base,'#austria');await p.settle();assert(!p.requests.some(u=>u.endsWith('.mp3')),'No audio preload');
 for(const[country,id,prefix]of examples){await p.waitFor('allReady&&atlasesReady&&!countrySwitching');if(await p.evaluate('atlasMode')!==country){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');await p.settle();
  if(mobile)for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#'+country+'-sidebar .sheet-handle');
  const entries=Object.values(placePronunciations).filter(e=>e.country===country&&e.id===id);const visible=await p.evaluate('Array.from(document.getElementById('+JSON.stringify(prefix+'-name')+').parentElement.querySelectorAll(".pronunciation-button:not([hidden])")).map(b=>({id:b.id,lang:b.dataset.pronunciationLanguage,title:b.title,anchor:b.parentElement.textContent}))');
  assert.deepEqual(visible.map(b=>b.lang).sort(),entries.map(e=>e.language).sort());
  for(const e of entries){const b=visible.find(b=>b.lang===e.language);assert(b.anchor.includes(e.text),'Speaker is beside its exact spoken name');assert(!b.title.includes('local pronunciation'));const before=await p.evaluate('__newPlayed.length');await p.tap('#'+b.id);await p.waitFor('__newPlayed.length>'+before);const played=await p.evaluate('__newPlayed.at(-1)');assert(played.src.endsWith('/'+e.src));assert(played.duration>.15&&played.duration<16);await p.evaluate('(()=>{const a=document.querySelector("audio[data-pronunciation]");if(!a.paused)document.getElementById('+JSON.stringify(b.id)+').click();})()');}
  if(country==='switzerland'&&['CH-K-2','CH-K-10','CH-K-23'].includes(id)){
   const expected={'CH-K-2':['de','Berne'],'CH-K-10':['fr','Freiburg'],'CH-K-23':['fr','Wallis']}[id];
   const layout=await p.evaluate('(()=>{const h=document.getElementById("ch-name"),rows=[...document.querySelectorAll("#ch-names .regional-name-row")];return {headingLanguage:h.querySelector("button:not([hidden])")?.dataset.pronunciationLanguage,rows:rows.map(r=>r.querySelector("bdi").textContent),title:h.firstChild.textContent};})()');
   assert.equal(layout.headingLanguage,expected[0]);assert.deepEqual(layout.rows,[expected[1]]);assert(!layout.rows.includes(layout.title),'No duplicate Swiss title row');
   if(id==='CH-K-10')await p.screenshot('fribourg-title-speaker-'+(mobile?'phone':'desktop'));
  }
  if(id==='CH-K-18'){const info=await p.evaluate('(()=>{const b=document.querySelector("#ch-names bdi[lang=rm]");return {text:b?.textContent,button:!!b?.parentElement.querySelector("button")};})()');assert.equal(info.text,'Grischun');assert(!info.button);await p.screenshot('swiss-trilingual-names-'+(mobile?'phone':'desktop'));}
  assert(!await p.evaluate('document.documentElement.scrollWidth>innerWidth+1'));
 }
 assert.equal(await p.evaluate('document.querySelectorAll("audio[data-pronunciation]").length'),1);await p.evaluate('changeAtlas("china",false)');await p.settle();assert(await p.evaluate('document.querySelector("audio[data-pronunciation]").paused'));
}}));
