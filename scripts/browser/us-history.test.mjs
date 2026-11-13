import assert from 'node:assert/strict';
const tapAt=async(p,lngLat)=>{const point=await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(lngLat)}),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()`);await p.tap(point);await p.settle();};
const year=async(p,y)=>{await p.evaluate(`void document.querySelector('#united-states-history-dock .election-tick[data-year="${y}"]').click()`);await p.settle();};
const button='document.getElementById("historical-snapshot")',card='document.getElementById("us-history-card").textContent',name='document.getElementById("us-name").textContent';
const labels='[...document.querySelectorAll("[data-atlas-place^=election-],[data-atlas-place^=history-]")].map(e=>e.firstChild.textContent)';
export default [
 {name:'The US historical snapshot opens from the header, shows each year\'s states, territories and the countries that held the rest, and returns to the present day',options:{width:1360,height:900},async run(p,base){
  await p.open(base,'#united-states');await p.settle();
  await p.evaluate('AtlasComfort.set({appearance:"light"})');await p.settle();
  assert.deepEqual(await p.evaluate(`[${button}.hidden,${button}.textContent]`),[false,'Historical snapshot']);
  const fill=await p.evaluate('JSON.stringify(map.getPaintProperty("united-states-first-fill","fill-color"))');
  await p.evaluate(`void ${button}.click()`);
  await p.waitFor('!!map.getLayer("united-states-history-fill")',{timeout:30000});await p.settle();
  assert.equal(await p.evaluate(`${button}.textContent`),'Present day');
  assert.equal(await p.evaluate('document.getElementById("map-selection").dataset.hidden'),'true','The view picker and level buttons leave with the present-day map');
  assert.equal(await p.evaluate('document.querySelector("#united-states-history-dock .election-year strong").textContent'),'1789','The snapshot opens on 1789');
  assert.equal(await p.evaluate('document.querySelector(".history-counts").textContent'),'13 states, 1 territory');
  for(const label of ['Spanish Louisiana','New Spain','Spanish Florida','Northwest Territory'])assert((await p.evaluate(labels)).includes(label),label+' is labelled');
  assert(!(await p.evaluate(labels)).includes('Maine'),'Maine is part of Massachusetts');
  await p.waitFor('!!map.getLayer("canada-history-context-fill")&&Array.isArray(map.getPaintProperty("canada-history-context-fill","fill-color"))',{timeout:30000});
  await p.evaluate('void map.jumpTo({center:[-104,51],zoom:5})');await p.settle();
  assert((await p.evaluate('JSON.stringify(map.getPaintProperty("canada-history-context-fill","fill-color"))')).includes("#e9e3d8"),"Rupert’s Land is drawn on the Canadian side");
  await p.screenshot('us-history-ruperts-land');
  await year(p,1870);
  assert(await p.evaluate('!map.getLayer("canada-history-context-fill")'),"Rupert’s Land leaves after the transfer");
  await p.evaluate('void map.jumpTo({center:[-97,38],zoom:3})');await p.settle();
  await year(p,1800);assert((await p.evaluate(labels)).includes('French Louisiana'),'Louisiana returned to France in 1800');
  await year(p,1803);assert.match(await p.evaluate('document.getElementById("us-history-summary").textContent'),/30 April 1803.*Louisiana/,'The Louisiana Purchase is listed among 1803\'s changes');
  await year(p,1840);await tapAt(p,[-119.5,37.2]);await p.waitFor(card+'.includes("Mexico")',{timeout:15000});
  assert.equal(await p.evaluate(name),'California','The present-day place stays selected');
  assert.match(await p.evaluate(card),/^Mexico.*Held by Mexico.*independent from Spain since 1821/,'California is part of Mexico in 1840');
  await p.screenshot('us-history-1840-california');
  // Oregon Country reached 54°40′ N, beyond the Alaska picker's band west of 129° W. A click there
  // opens Canada's atlas, so the hover label shows what the snapshot finds.
  const hover=lngLat=>p.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(lngLat)+'))?.en??null');
  assert.equal(await hover([-120.5,47]),'Oregon Country');
  assert.equal(await hover([-132,53.3]),'Oregon Country','Haida Gwaii is part of Oregon Country in 1840');
  await year(p,1863);await p.evaluate('void document.getElementById("us-reset").click()');await p.settle();await tapAt(p,[-80.6,38.6]);await p.waitFor(name+'==="West Virginia"',{timeout:15000});
  assert.match(await p.evaluate(card),/^West Virginia.*State.*Since20 June 1863.*Boundary2 November 1863 to present/,'West Virginia is a state from June 1863');
  await year(p,1866);await p.evaluate('void map.jumpTo({center:[-152,64],zoom:3})');await p.settle();await tapAt(p,[-152,64]);await p.waitFor(card+'.includes("Russian America")',{timeout:15000});
  assert.match(await p.evaluate(card),/Held by Russia.*bought it in 1867/,'Alaska is Russian until 1867');
  await p.screenshot('us-history-1866-alaska');
  await p.evaluate(`void ${button}.click()`);await p.settle();
  assert(await p.evaluate('!map.getLayer("united-states-history-fill")&&!map.getSource("united-states-history-faces")'),'The snapshot layers leave');
  assert.equal(await p.evaluate(`${button}.textContent`),'Historical snapshot');
  assert.equal(await p.evaluate('document.getElementById("map-selection").dataset.hidden'),undefined,'The view picker returns');
  assert.equal(await p.evaluate('JSON.stringify(map.getPaintProperty("united-states-first-fill","fill-color"))'),fill,'The present-day fill returns');
  assert(await p.evaluate('document.getElementById("united-states-history-dock").hidden'));
 }},
 {name:'The historical snapshot dock fits a phone',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#united-states');await p.settle();
  await p.evaluate(`void ${button}.click()`);await p.waitFor('!!map.getLayer("united-states-history-fill")',{timeout:30000});await p.settle();
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No page-level horizontal overflow');
  assert(await p.evaluate('(()=>{const r=document.getElementById("united-states-history-dock").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()'),'The dock fits the screen');
  await p.screenshot('us-history-phone');
 }}
];
