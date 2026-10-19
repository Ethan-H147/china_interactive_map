import assert from 'node:assert/strict';
const settings=[['#settings-country-language','en'],['#settings-label-size','large'],['#settings-projection','globe'],['#settings-motion','reduce']];
async function heldClick(page,selector){
 const [x,y]=await page.evaluate(`(()=>{const s=document.querySelector(${JSON.stringify(selector)});s.scrollIntoView({block:'nearest'});const r=s.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
 await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
 for(let i=0;i<10;i++)await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+(i%2)/3,y,buttons:1});await new Promise(r=>setTimeout(r,180));await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});await new Promise(r=>setTimeout(r,250));
}
export default [{name:'Every Settings dropdown stays open and commits one mouse selection',options:{width:1280,height:900},async run(page,base){
 await page.open(base,'#nepal');await page.tap('#settings-open');
 for(const [control,value] of settings){
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(control)})).appearance`),'base-select',control+' shares the sidebar picker');
  await page.evaluate(`window.testSelectChanges=0;document.querySelector(${JSON.stringify(control)}).addEventListener('change',()=>window.testSelectChanges++)`);
  await heldClick(page,control);assert(await page.evaluate(`document.querySelector(${JSON.stringify(control)}).matches(':open')`),control+' stays open after release');assert(await page.evaluate("document.getElementById('atlas-settings').open"));
  if(control==='#settings-country-language')await page.screenshot('settings-dropdown-open');
  await page.tap(control+' option[value="'+value+'"]');await page.waitFor(`document.querySelector(${JSON.stringify(control)}).value===${JSON.stringify(value)}`);assert.equal(await page.evaluate('testSelectChanges'),1);assert.equal(await page.evaluate("!!document.querySelector('select:open')"),false,'Choice closes the picker');
  await page.tap(control);assert(await page.evaluate(`document.querySelector(${JSON.stringify(control)}).matches(':open')`),'Reopening works');await page.key('Escape');assert(await page.evaluate("document.getElementById('atlas-settings').open"),'Escape dismisses the picker before the dialog');
 }
 assert(await page.evaluate("AtlasSettings.getSettings().countryLanguage==='en'&&AtlasSettings.getSettings().labelSize==='large'&&AtlasSettings.getSettings().motion==='reduce'&&document.getElementById('globe-view').getAttribute('aria-pressed')==='true'"));
 await page.tap('#settings-close');
}},{name:'Quiz dropdowns and map dropdown use the same stable desktop picker',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#china');await page.tap('#tab-quiz');
 const controls=await page.evaluate("[...document.querySelectorAll('#china-sidebar select')].filter(s=>s.checkVisibility()&&!s.disabled).map(s=>'#'+s.id)");assert(controls.length>=3,'Quiz settings are available');
 for(const control of controls){assert.equal(await page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(control)})).appearance`),'base-select');await page.tap(control);assert(await page.evaluate(`document.querySelector(${JSON.stringify(control)}).matches(':open')`),control+' opens');await page.key('Escape');}
 await page.open(base,'#united-states');await page.tap('#map-view');assert(await page.evaluate("document.getElementById('map-view').matches(':open')"));await page.key('Escape');
}},{name:'Settings phone dropdowns retain platform selection',options:{width:390,height:844,mobile:true},async run(page,base){
 await page.open(base,'#nepal');await page.tap('#settings-open');
 for(const [control,value] of settings){assert.notEqual(await page.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(control)})).appearance`),'base-select');const diff=await page.evaluate(`(()=>{const s=document.querySelector(${JSON.stringify(control)});return [...s.options].findIndex(o=>o.value===${JSON.stringify(value)})-s.selectedIndex})()`);await page.tap(control);assert(await page.evaluate(`document.querySelector(${JSON.stringify(control)}).matches(':open')`));for(let i=0;i<Math.abs(diff);i++)await page.key(diff>0?'ArrowDown':'ArrowUp');await page.key('Enter');assert.equal(await page.evaluate(`document.querySelector(${JSON.stringify(control)}).value`),value);}
 await page.tap('#settings-close');assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'));
}}];
