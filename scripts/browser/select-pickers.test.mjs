import assert from 'node:assert/strict';
const selector=country=>'#'+country+'-sidebar .view-preferences select';
const cases=[['china','[data-label-language]','local'],['france','[data-label-language]','en'],['united-kingdom','[data-regional-language]','en'],['singapore','[data-singapore-language]','en']];
async function choose(page,selector,value){
 const values=await page.evaluate('(()=>{const s=document.querySelector('+JSON.stringify(selector)+');return {index:s.selectedIndex,target:[...s.options].findIndex(o=>o.value==='+JSON.stringify(value)+')}})()');
 const count=values.target-values.index;for(let i=0;i<Math.abs(count);i++)await page.key(count>0?'ArrowDown':'ArrowUp');await page.key('Enter');
 await page.waitFor('document.querySelector('+JSON.stringify(selector)+').value==='+JSON.stringify(value));
}
export default [
 ...cases.map(([country,kind,value])=>({name:country+' language opens on its first mouse click',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#'+country);
  const control=selector(country);
  await page.waitFor('!!document.querySelector('+JSON.stringify(control)+')');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector('+JSON.stringify(control)+')).appearance'),'base-select','Desktop uses the in-page picker');
  const before=await page.evaluate('(()=>{const s=document.querySelector('+JSON.stringify(control)+');return {value:s.value,html:s.innerHTML}})()');
  await page.tap(control);
  assert(await page.evaluate('document.querySelector('+JSON.stringify(control)+').matches(":open")'),'First click opens the menu');
  assert.equal(await page.evaluate('document.querySelector('+JSON.stringify(control)+').value'),before.value,'Opening does not change the chosen language');
  assert.equal(await page.evaluate('document.querySelector('+JSON.stringify(control)+').innerHTML'),before.html,'Options remain intact');
  await choose(page,control,value);
  const language=await page.evaluate('currentAtlas()?.getLanguage?.()||AtlasLabels.getLanguage()');assert.equal(language,value);
  await page.tap(control);assert(await page.evaluate('document.querySelector('+JSON.stringify(control)+').matches(":open")'),'Reopening still works');
  if(country==='china')await page.screenshot('language-dropdown-first-click');
  await page.key('Escape');
 }})),
 {name:'keyboard opens in-page picker without programmatic activation',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');const control=selector('china');
  await page.evaluate('HTMLSelectElement.prototype.showPicker=function(){throw Error("No scripted activation allowed")}');
  await page.tap(control);assert(await page.evaluate('!!document.querySelector("select:open")'));await page.key('Escape');
  await page.key(' ',{code:'Space'});assert(await page.evaluate('!!document.querySelector("select:open")'),'Keyboard opens the menu');await page.key('Escape');
 }},
 {name:'color and region dropdowns share first-click activation',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#france');
  for(const control of ['#fr-region-color','#fr-province']){await page.tap(control);assert(await page.evaluate('document.querySelector('+JSON.stringify(control)+').matches(":open")'),control+' opens on its first click');await page.key('Escape');}
 }},
 {name:'phone language picker retains normal touch selection',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#china');await page.tap('#tab-layers');await page.tap('#china-sidebar .sheet-handle');await page.waitFor('document.documentElement.dataset.sheet==="full"');
  const control=selector('china');await page.tap(control);assert(await page.evaluate('!!document.querySelector("select:open")'));
  await choose(page,control,'en');assert.equal(await page.evaluate('AtlasLabels.getLanguage()'),'en');
 }},
 {name:'mouse motion bursts and held clicks keep the menu open after release',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');
  const [x,y]=await page.evaluate('(()=>{const s=document.querySelector("#china-sidebar .view-preferences select");s.scrollIntoView({block:"nearest"});const b=s.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]})()');
  for(const hold of [40,150,400]){
   await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
   await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
   for(let i=0;i<30;i++)await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+(i%3)/3,y:y+(i%2)/3,buttons:1});
   await new Promise(r=>setTimeout(r,hold));
   await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});
   await new Promise(r=>setTimeout(r,250));
   assert(await page.evaluate('!!document.querySelector("select:open")'),'Menu stays open after a '+hold+' ms click');
   await page.key('Escape');
  }
 }},
 {name:'mouse option selection commits once and does not reopen the picker',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');await page.tap(selector('china'));
  await page.evaluate('window.languageChanges=0;document.querySelector("#china-sidebar .view-preferences select").addEventListener("change",()=>window.languageChanges++)');
  await page.tap('#china-sidebar .view-preferences select option[value="en"]');
  await page.waitFor('AtlasLabels.getLanguage()==="en"');
  assert.equal(await page.evaluate('!!document.querySelector("select:open")'),false,'Choosing with the mouse closes the menu normally');
  assert.equal(await page.evaluate('window.languageChanges'),1);
  await page.screenshot('language-picker-mouse-selection');
 }}

];
