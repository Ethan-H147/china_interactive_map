import assert from 'node:assert/strict';
import {placePronunciations} from '../../dist/place-pronunciations.mjs';
export default [false,true].map(mobile=>({name:'China prefectures and Southeast Asian first levels '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:'globalThis.__asiaPlayed=[];document.addEventListener("playing",e=>{if(e.target.matches("audio[data-pronunciation]"))__asiaPlayed.push(e.target.currentSrc)},true);'});
 await p.open(base,'#china');await p.waitFor('allReady&&atlasesReady&&!countrySwitching');
 for(const [country,id,button] of [['china','130100','china-pronunciation'],['china','TW-10002','china-pronunciation'],['indonesia','ID11','id-pronunciation'],['malaysia','MY-01','my-pronunciation']]){
  if(country==='china')await p.evaluate(`(()=>{const r=regionByCode.get(${JSON.stringify(id)})||regionByCode.get(Number(${JSON.stringify(id)}));return selectRegion(r,r.feature.properties.provinceCode,false).then(()=>true)})()`);
  else {if(await p.evaluate('atlasMode')!==country){await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)');await p.settle();}await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');}
  await p.settle();if(mobile)for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#'+country+'-sidebar .sheet-handle');
  const e=placePronunciations[country+':'+id];assert(e);assert(await p.evaluate('!document.getElementById('+JSON.stringify(button)+').hidden'));
  const count=await p.evaluate('__asiaPlayed.length');await p.tap('#'+button);await p.waitFor('__asiaPlayed.length>'+count);assert((await p.evaluate('__asiaPlayed.at(-1)')).endsWith('/'+e.src));await p.evaluate('document.getElementById('+JSON.stringify(button)+').click()');
 }
 assert(!await p.evaluate('document.documentElement.scrollWidth>innerWidth+1'));
}}));
