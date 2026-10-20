import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const text=(p,id)=>p.evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
const select=async(p,id)=>{await p.evaluate(`currentAtlas().restore(${JSON.stringify(id)})`);await p.settle();};
export default [
 {name:'Turkish casing, municipality search and saved selection',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#turkey');assert.equal(await p.evaluate(`document.querySelector('#tr-province option[value="TR-R-TR1"]').textContent`),'İstanbul');
  await searchAndSelect(p,'Istanbul','İstanbul','Province');assert.equal(await text(p,'tr-name'),'İstanbul');assert.equal(await text(p,'tr-kind'),'PROVINCE · İL');assert.equal(await text(p,'tr-administrative'),'Metropolitan municipality · İstanbul Büyükşehir Belediyesi');
  await searchAndSelect(p,'Kadikoy Belediyesi','Kadıköy','District');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'TR-D-034023');assert.equal(await text(p,'tr-kind'),'DISTRICT · İLÇE');assert.equal(await text(p,'tr-administrative'),'Municipality · Kadıköy Belediyesi');await p.screenshot('turkey-names-kadikoy-desktop');
  for(const [query,name,id]of [['Igdir','Iğdır','TR-P-76'],['Isparta','Isparta','TR-P-32'],['Izmir','İzmir','TR-P-35']]){await searchAndSelect(p,query,name,'Province');assert.equal(await text(p,'tr-name'),name);assert.equal(await p.evaluate('currentAtlas().getSelection()'),id);}
  await p.evaluate(`currentAtlas().setLanguage('tr');location.hash='#turkey/view='+encodeURIComponent(JSON.stringify(captureView()))`);await p.send('Page.reload');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'TR-P-35');assert.equal(await p.evaluate('currentAtlas().getLanguage()'),'tr');assert.equal(await text(p,'tr-name'),'İzmir');
  assert(await p.evaluate(`!!document.querySelector('a[href="./data/europe/turkey/regional-names.json"],a[href="data/europe/turkey/regional-names.json"]')`),'Name provenance is available');
 }},
 {name:'city dots and map labels use Turkish names in every language mode',options:{width:1280,height:900},async run(p,base){
  await p.open(base,'#turkey');await select(p,'TR-R-TR3');await p.evaluate(`currentAtlas().setMode(1);map.jumpTo({center:[28,38.5],zoom:5});currentAtlas().setLanguage('tr')`);await p.settle();
  assert(await p.evaluate(`[...document.querySelectorAll('.korea-marker')].some(e=>e.textContent==='Ege')`),'Turkish region label is rendered');
  await p.evaluate(`currentAtlas().setLanguage('both')`);await p.settle();assert(await p.evaluate(`[...document.querySelectorAll('.korea-marker')].some(e=>e.textContent.includes('Aegean')&&e.textContent.includes('Ege'))`),'Both region names are rendered');
  await searchAndSelect(p,'Istanbul','İstanbul','City');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'TR-S-1882099475');assert.equal(await text(p,'tr-name'),'İstanbul');assert((await text(p,'tr-administrative')).includes('İstanbul Büyükşehir Belediyesi'));await p.screenshot('turkey-names-istanbul-city');
 }},
 {name:'Turkish municipal names fit the phone detail panel',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#turkey');await select(p,'TR-D-034023');
  for(let i=0;i<3&&await p.evaluate(`document.documentElement.dataset.sheet!=='full'`);i++)await p.tap('#turkey-sidebar .sheet-handle');await p.waitFor(`document.documentElement.dataset.sheet==='full'`);
  assert.equal(await text(p,'tr-kind'),'DISTRICT · İLÇE');assert((await text(p,'tr-administrative')).includes('Kadıköy Belediyesi'));assert(await p.evaluate(`(()=>{const b=document.getElementById('tr-administrative');return b.scrollWidth<=b.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth;})()`),'No horizontal overflow');
  await p.evaluate(`document.getElementById('tr-name').scrollIntoView({block:'start'})`);await p.screenshot('turkey-names-kadikoy-phone');
 }}
];
