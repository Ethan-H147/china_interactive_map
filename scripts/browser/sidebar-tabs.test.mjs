import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const sidebar="[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none')";
async function tabs(p){return p.waitFor(`(()=>{const s=${sidebar};if(!s)return null;const t=Object.fromEntries([...s.querySelectorAll('.panel-tabs button')].filter(b=>b.getClientRects().length).map(b=>[b.textContent.trim(),b.getAttribute('aria-controls')]));return t.Quiz&&t['Map settings']?t:null;})()`,{label:'the country tabs to finish loading'});}
async function selected(p,label){const panel=(await tabs(p))[label];const state=await p.evaluate(`(()=>{const s=${sidebar};return{pressed:[...s.querySelectorAll('.panel-tabs button[aria-pressed=true]')].map(b=>b.getAttribute('aria-controls')),panels:[...s.querySelectorAll('.sidebar-scroll > section')].filter(s=>!s.hidden).map(s=>s.id)};})()`);assert.deepEqual(state.pressed,[panel],'Only the current tab is highlighted');assert.deepEqual(state.panels,[panel],'Only its panel is visible');}
async function clickTab(p,label){const panel=(await tabs(p))[label];await p.tap('.panel-tabs button[aria-controls='+JSON.stringify(panel)+']');await selected(p,label);}
export default [1280,390].map(width=>({name:'Quiz tab highlight clears on tab and place navigation '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const country of ['qatar','japan','philippines','malaysia','mongolia','brazil','korea','china']){await p.open(base,'#'+country);const t=await tabs(p);assert(t.Quiz&&t['Map settings'],country+': '+JSON.stringify(t));for(let i=0;i<2;i++){await clickTab(p,'Quiz');await clickTab(p,'Map settings');}}
 await p.open(base,'#qatar');await searchAndSelect(p,'Doha','Doha','Municipality');const t=await tabs(p);await clickTab(p,'Quiz');await clickTab(p,'Discover');
 await clickTab(p,'Quiz');await searchAndSelect(p,'Al Shahaniya','Al Shahaniya','Municipality');await selected(p,'Discover');await p.screenshot('sidebar-tabs-fixed-'+width);
}}));
