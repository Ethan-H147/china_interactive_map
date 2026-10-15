import assert from 'node:assert/strict';
import {stable} from './countries.test.mjs';
// The phone bottom sheet, driven by real touch, keyboard and viewport changes.
const phone={width:390,height:844,mobile:true};
// The displayed sidebar: every country has one, only the active country's is shown.
const sidebar=`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none')`;
const box=(page,expression)=>page.evaluate(`(()=>{const e=${expression};if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,top:b.top,bottom:b.bottom,left:b.left,height:b.height};})()`);
// Waits for an element to stop moving (the sheet animates its height) before aiming at it.
const point=async(page,expression)=>{await stable(page,`JSON.stringify(${expression}?.getBoundingClientRect())`);const b=await box(page,expression);assert(b,'Element present: '+expression);return [b.x,b.y];};
const handle=`${sidebar}.querySelector('.sheet-handle')`,search=`${sidebar}.querySelector('.sidebar-tools input')`;
const result=name=>`[...${sidebar}.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.includes(${JSON.stringify(name)})&&!b.closest('.panel-tabs'))`;
const state=page=>page.evaluate(`({sheet:document.documentElement.dataset.sheet,height:${sidebar}.getBoundingClientRect().height,innerHeight})`);

export default [
 {name:'drag, flick and snap',options:phone,async run(page,base){
  await page.open(base,'#china');
  assert.equal((await state(page)).sheet,'peek','Opens with the sheet tucked away');
  const peek=(await state(page)).height;
  await page.drag(await point(page,handle),{dx:0,dy:-260},{duration:500});
  const half=await state(page);assert.equal(half.sheet,'half','A slow drag snaps to the nearest height');assert(half.height>peek+150);
  await page.drag(await point(page,handle),{dx:0,dy:-320},{duration:500});
  const full=await state(page);assert.equal(full.sheet,'full');assert(full.height<=full.innerHeight,'The full sheet stays on screen');
  await page.drag(await point(page,handle),{dx:0,dy:70},{steps:4,duration:60});
  assert.equal((await state(page)).sheet,'half','A quick downward flick steps one height');
  await page.drag(await point(page,handle),{dx:0,dy:-70},{steps:4,duration:60});
  assert.equal((await state(page)).sheet,'full','A quick upward flick steps one height');
  await page.drag(await point(page,handle),{dx:0,dy:900},{duration:500});
  assert.equal((await state(page)).sheet,'peek','Dragging past the bottom returns to peek');
  // The sheet animates to its new height; compare once it has settled.
  await stable(page,`${sidebar}.getBoundingClientRect().height`);
  assert(Math.abs((await state(page)).height-peek)<2,'Peek height is stable');
 }},
 {name:'handle tap and keyboard',options:phone,async run(page,base){
  await page.open(base,'#china');
  const sequence=[];for(let i=0;i<3;i++){await page.tap(await point(page,handle));sequence.push((await state(page)).sheet);}
  assert.deepEqual(sequence,['half','full','peek'],'Tapping the handle steps through the heights');
  assert.equal(await page.evaluate(`${handle}.getAttribute('aria-expanded')`),'false');
  await page.evaluate(`${handle}.focus()`);
  await page.key('Enter');assert.equal((await state(page)).sheet,'half','Enter on the focused handle opens the sheet');
  assert.equal(await page.evaluate(`${handle}.getAttribute('aria-expanded')`),'true');
  await page.key(' ');assert.equal((await state(page)).sheet,'full','Space steps again');
  assert.equal(await page.evaluate(`${handle}.getAttribute('aria-label')`),'Collapse panel');
  await page.key('Enter');assert.equal((await state(page)).sheet,'peek');
  assert.equal(await page.evaluate(`document.activeElement===${handle}`),true,'Focus stays on the handle');
 }},
 {name:'search with the phone keyboard',options:phone,async run(page,base){
  await page.open(base,'#china');
  await page.tap(await point(page,search));
  assert.equal((await state(page)).sheet,'full','Focusing search opens the full sheet');
  await page.type('Suzhou');
  await page.waitFor(`!!${result('Suzhou')}`,{label:'search results'});
  await stable(page,`[...${sidebar}.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>b.textContent).join('|')`);
  // The on-screen keyboard shrinks the viewport; the sheet must still fit and show results.
  await page.viewport(390,480);
  const s=await state(page);assert(s.height<=s.innerHeight,'The sheet fits above the keyboard');
  const input=await box(page,search);assert(input.top>=0&&input.bottom<=480,'The search field stays visible above the keyboard');
  assert((await box(page,result('Suzhou'))).top<480,'The first result is reachable above the keyboard');
  await page.viewport(390,844);
  await page.tap(await point(page,result('Suzhou')));
  await page.settle();
  assert.equal((await state(page)).sheet,'half','Choosing a place brings the sheet down so the place is visible');
  const crumb=await box(page,`document.getElementById('breadcrumb-region')`),header=await page.evaluate(`Math.max(...[...document.querySelectorAll('.site-header > *')].map(e=>e.getBoundingClientRect().bottom))`);
  assert(crumb.height>0&&crumb.top>=header,'The breadcrumb sits below the header pill');
 }},
 {name:'panning tucks the sheet away',options:phone,async run(page,base){
  await page.open(base,'#china');
  await page.tap(await point(page,handle));assert.equal((await state(page)).sheet,'half');
  await page.drag([195,260],{dx:-120,dy:40},{duration:300});
  assert.equal((await state(page)).sheet,'peek','Moving the map returns the sheet to peek');
 }},
 {name:'desktop keeps the side panel',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');
  assert.equal(await page.evaluate(`document.documentElement.dataset.sheet??null`),null,'No sheet state on desktop');
  assert(await page.evaluate(`[...document.querySelectorAll('.sheet-handle')].every(h=>!h.getClientRects().length)`),'No handle shows on desktop');
  const side=await box(page,sidebar);assert(side.left<1&&side.height>600,'The sidebar is a full-height panel');
 }}
];
