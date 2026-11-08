import assert from'node:assert/strict';
import{searchAndSelect}from'./countries.test.mjs';
export default [false,true].map(mobile=>({name:'Moscow label-only municipalities and deferred mergers '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.open(base,'#russia');await p.settle();
 for(const [id,en,ru,kind,full]of[
  ['RU-D-22082895013138','Istra','Истра','Municipal okrug','муниципальный округ Истра'],
  ['RU-D-91883426895496','Dmitrov','Дмитров','Municipal okrug','Дмитровский муниципальный округ'],
  ['RU-D-34201544951901','Leninsky','Ленинский','Urban okrug','Ленинский городской округ'],
  ['RU-D-19414322011791','Sergiyev Posad','Сергиев Посад','Urban okrug','Сергиево-Посадский городской округ'],
  ['RU-D-9877275388102','Yegoryevsk','Егорьевск','Municipal okrug','муниципальный округ Егорьевск']
 ]){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+').then(()=>true)');await p.settle();
  if(mobile){for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#russia-sidebar .sheet-handle');}
  const card=await p.evaluate(`(()=>{const a=document.querySelector('#ru-administrative'),s=a.querySelector('.name-secondary'),b=document.querySelector('#ru-pronunciation');return {en:document.querySelector('#ru-name').textContent,ru:document.querySelector('#ru-local').textContent,kind:document.querySelector('#ru-kind').textContent,full:s.textContent,stacked:s.getBoundingClientRect().top>=a.querySelector('.name-primary').getBoundingClientRect().bottom,speaker:!!b&&!b.hidden,overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
  assert.equal(card.en,en);assert.equal(card.ru,ru);assert.equal(card.kind,kind.toUpperCase());assert.equal(card.full,full);assert(card.stacked&&!card.overflow);assert.equal(card.speaker,id==='RU-D-9877275388102');
  if(en==='Istra')await p.screenshot('moscow-municipal-labels-'+(mobile?'phone':'desktop'));
 }
 // Contemporary place and full municipal names remain searchable beside legacy source names.
 await searchAndSelect(p,'Istra Municipal Okrug','Istra');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'RU-D-22082895013138');
 await searchAndSelect(p,'Istrinsky District','Istra');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'RU-D-22082895013138');
 await p.evaluate('currentAtlas().restore("RU-D-97204580379125").then(()=>true)');await p.settle();assert.equal(await p.evaluate('document.querySelector("#ru-name").textContent'),'Odintsovskiy District');
}}));
