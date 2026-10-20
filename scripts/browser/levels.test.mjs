import assert from 'node:assert/strict';
// The level toggle: all levels side by side on desktop; on a phone, three or more levels
// collapse to the current one and open as a vertical list.
const phone={width:390,height:844,mobile:true};
const shown=page=>page.evaluate(`[...document.querySelectorAll('.map-mode button')].filter(b=>b.id!=='mode-lock'&&b.getClientRects().length).map(b=>b.textContent.trim())`);
const pressed=page=>page.evaluate(`document.querySelector('.map-mode button[aria-pressed=true]:not(#mode-lock)')?.textContent.trim()`);
const button=(page,label)=>page.evaluate(`(()=>{const b=[...document.querySelectorAll('.map-mode button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&b.getClientRects().length);const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()`);

export default [
 {name:'phone: three levels collapse and open vertically',options:phone,async run(page,base){
  await page.open(base,'#south-africa');
  assert.deepEqual(await shown(page),['Provinces'],'Only the current level shows');
  await page.tap(await button(page,'Provinces'));
  assert.deepEqual(await shown(page),['Provinces','Districts & metros','Municipalities'],'Tapping lists every level');
  await page.waitFor(`[...document.querySelectorAll('.map-mode button')].filter(b=>b.id!=='mode-lock'&&b.getClientRects().length).every(b=>b.getBoundingClientRect().height>=44)`,{timeout:3000,label:'touch targets of at least 44 px'});
  const boxes=await page.evaluate(`[...document.querySelectorAll('.map-mode button')].filter(b=>b.id!=='mode-lock'&&b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.height];})`);
  assert(boxes.every(b=>Math.abs(b[0]-boxes[0][0])<1)&&boxes[1][1]>boxes[0][1],'The list is vertical');assert(boxes.every(b=>b[2]>=44),'Touch targets are at least 44 px tall');
  await page.tap(await button(page,'Municipalities'));await page.settle();
  assert.deepEqual(await shown(page),['Municipalities'],'Choosing closes the list');assert.equal(await pressed(page),'Municipalities');
  await page.tap(await button(page,'Municipalities'));await page.tap([195,500]);
  assert.deepEqual(await shown(page),['Municipalities'],'Tapping the map closes an open list');
 }},
 {name:'phone: two levels stay side by side',options:phone,async run(page,base){
  await page.open(base,'#china');
  assert.equal((await shown(page)).length,2);
  await page.open(base,'#mongolia');
  assert.equal((await shown(page)).length,2,'Switching countries resets the toggle');
  await page.open(base,'#japan');
  assert.deepEqual(await shown(page),['Prefectures'],'The area-code view picker uses the compact level menu');
  await page.tap(await button(page,'Prefectures'));
  assert.deepEqual(await shown(page),['Prefectures','Municipalities']);
  await page.tap(await button(page,'Municipalities'));await page.settle();
  assert.deepEqual(await shown(page),['Municipalities'],'Choosing a level closes the compact menu');
 }},
 {name:'desktop: every level visible and switchable',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#south-africa');
  assert.deepEqual(await shown(page),['Provinces','Districts & metros','Municipalities']);
  await page.tap(await button(page,'Districts & metros'));await page.settle();
  assert.equal(await pressed(page),'Districts & metros');
  assert.equal(await page.evaluate(`map.getLayoutProperty('south-africa-second-fill','visibility')`),'visible','Districts are drawn');
 }}
];
