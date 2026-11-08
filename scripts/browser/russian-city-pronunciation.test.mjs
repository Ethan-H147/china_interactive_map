import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {russiaPlaceNames} from '../../dist/russia-names.mjs';
import {placePronunciations} from '../../dist/place-pronunciations.mjs';
const cities=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../dist/data/russia/catalogue.bin',import.meta.url)))).records.filter(r=>russiaPlaceNames(r).administrativeEn);
const selected=['Владивосток','Ангарск','Петрозаводск','Малышева','Кемерово','Мурманск','Горноуральский'].map(name=>cities.find(r=>russiaPlaceNames(r).local===name));
assert(selected.every(Boolean));
export default [false,true].map(mobile=>({name:'Russian city-only pronunciation beside its native heading '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"globalThis.__cityPlayed=[];document.addEventListener('playing',e=>{if(e.target.matches('audio[data-pronunciation]'))__cityPlayed.push({src:e.target.currentSrc,duration:e.target.duration});},true);"});
 await p.open(base,'#russia');await p.settle();assert(!p.requests.some(url=>url.endsWith('.mp3')),'Click-only loading');
 for(const record of selected){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(record.id)+').then(()=>true)');await p.settle();
  if(mobile){for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#russia-sidebar .sheet-handle');await p.waitFor('document.documentElement.dataset.sheet==="full"');}
  const entry=placePronunciations['russia:'+record.id],names=russiaPlaceNames(record);assert.equal(entry.text,names.local);assert(!/городской округ/i.test(entry.text));
  const details=await p.evaluate(`(()=>{const b=document.getElementById('ru-pronunciation'),n=document.getElementById('ru-local'),a=document.getElementById('ru-administrative');return {visible:!b.hidden,parent:b.parentElement.id,label:b.getAttribute('aria-label'),text:n.textContent,technical:a.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
  assert(details.visible&&!details.overflow);assert.equal(details.parent,'ru-local');assert.equal(details.text,names.local);assert(details.label.includes(' of '+names.local+' (AI-generated)'));assert(details.technical.includes(names.administrativeEn));if(names.administrativeLocal)assert(details.technical.includes(names.administrativeLocal));
  const before=await p.evaluate('__cityPlayed.length');await p.tap('#ru-pronunciation');await p.waitFor('__cityPlayed.length>'+before);
  const played=await p.evaluate('__cityPlayed.at(-1)');assert(played.src.endsWith('/'+entry.src));assert(played.duration>.15&&played.duration<16);assert.equal(await p.evaluate('document.querySelectorAll("audio[data-pronunciation]").length'),1);
  await p.evaluate("document.getElementById('ru-pronunciation').click()");assert(await p.evaluate("(()=>{const a=document.querySelector('audio[data-pronunciation]');return a.paused&&!a.hasAttribute('src')})()"));
  if(names.local==='Владивосток')await p.screenshot('russian-city-pronunciation-'+(mobile?'phone':'desktop'));
 }
 await p.evaluate('changeAtlas("china",false)');await p.settle();assert(await p.evaluate("(()=>{const a=document.querySelector('audio[data-pronunciation]');return a.paused&&!a.hasAttribute('src')})()"));
}}));
