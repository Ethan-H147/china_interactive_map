import assert from 'node:assert/strict';
const tapAt=async(p,lngLat)=>{await p.evaluate('void map.jumpTo({center:[127.6,38.3],zoom:5.6})');await p.settle();const point=await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(lngLat)}),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()`);await p.tap(point);await p.settle();};
const period=async(p,y)=>{await p.evaluate(`void document.querySelector('#korea-history-dock .election-tick[data-year="${y}"]').click()`);await p.settle();};
const button='document.getElementById("historical-snapshot")',card='document.getElementById("k-history-card").innerText',dock='document.getElementById("korea-history-dock")';
// The selection heading: kind, name, Korean, hanja, period and flag.
const heading='["kind","name","chinese","hanja-name","country"].map(id=>document.getElementById("k-selection-"+id).textContent).concat(document.getElementById("k-selection-flag").hidden?null:document.getElementById("k-selection-flag").getAttribute("src"))';
const name='document.getElementById("k-selection-name").textContent';
const labels='[...document.querySelectorAll("[data-atlas-place^=history-]")].map(e=>e.dataset.atlasPlace)';
const open=async p=>{
 await p.open(p.base,'#korea');await p.waitFor('!!currentAtlas()?.ready&&!!map.getLayer("korea-first-fill")',{timeout:60000});await p.settle();
 assert.deepEqual(await p.evaluate(`[${button}.hidden,${button}.textContent]`),[false,'Historical snapshot']);
 await p.evaluate(`void ${button}.click()`);await p.waitFor('!!map.getLayer("korea-history-fill")',{timeout:30000});await p.settle();
};
export default [
 {name:'The Korea historical snapshot shows Joseon and the Samhan period on present-day land, and returns to the present day',options:{width:1360,height:900},async run(p,base){
  p.base=base;
  const fill=await (async()=>{await p.open(base,'#korea');await p.waitFor('!!currentAtlas()?.ready&&!!map.getLayer("korea-first-fill")',{timeout:60000});await p.settle();return p.evaluate('JSON.stringify(map.getPaintProperty("korea-first-fill","fill-color"))');})();
  await p.evaluate(`void ${button}.click()`);await p.waitFor('!!map.getLayer("korea-history-fill")',{timeout:30000});await p.settle();
  assert.equal(await p.evaluate(`${button}.textContent`),'Present day');
  assert.equal(await p.evaluate('document.getElementById("map-selection").dataset.hidden'),'true','The view picker and level buttons leave with the present-day map');
  assert.deepEqual(await p.evaluate(`[${dock}.querySelector(".election-year strong").textContent,${dock}.querySelector(".history-counts").textContent]`),['1890','8 provinces']);
  assert(await p.evaluate('["korea-first-lines","korea-countries-lines"].every(id=>map.getLayoutProperty(id,"visibility")==="none")'),'Present-day province lines and the line between North and South Korea are hidden');
  await p.waitFor(labels+'.includes("history-pyeongan")',{timeout:15000});
  assert(await p.evaluate('document.getElementById("k-country").hidden&&document.getElementById("k-province").hidden'),'Present-day scope and region pickers are hidden');
  await tapAt(p,[126.98,37.57]);await p.waitFor(name+'==="Gyeonggi"',{timeout:15000});
  assert.deepEqual(await p.evaluate(heading),['PROVINCE','Gyeonggi','경기도','京畿道','Joseon','vendor/flag-joseon.svg'],'Gyeonggi has its own card with Joseon’s flag');
  assert.match(await p.evaluate(card),/Provincial seat: Hanseong, the capital\./);
  assert(await p.evaluate('["k-subdivisions","k-selection-meta","k-compare-place"].every(id=>document.getElementById(id).hidden)'),'Present-day subdivisions, statistics and comparison are hidden');
  await tapAt(p,[127.44,39.15]);await p.waitFor(name+'==="Hamgyeong"',{timeout:15000});
  await p.screenshot('korea-history-joseon');
  await period(p,100);
  assert.deepEqual(await p.evaluate(`[${dock}.querySelector(".election-year strong").textContent,${dock}.querySelector(".history-counts").textContent]`),['c. 100','8 polities']);
  await p.waitFor(name+'==="Dongye"',{timeout:15000});
  await tapAt(p,[126.98,37.57]);await p.waitFor(name+'==="Mahan"',{timeout:15000});
  assert.deepEqual(await p.evaluate(heading),['CONFEDERACY','Mahan','마한','馬韓','Samhan period',null],'The Samhan polities have no flag');
  assert.match(await p.evaluate('document.getElementById("k-history-summary").textContent'),/Samhan period.*Cliopatria/);
  await p.screenshot('korea-history-samhan');
  await p.evaluate(`void ${button}.click()`);await p.settle();
  assert(await p.evaluate('!map.getLayer("korea-history-fill")&&!map.getSource("korea-history-faces")'),'The snapshot layers leave');
  assert.equal(await p.evaluate(`${button}.textContent`),'Historical snapshot');
  assert.equal(await p.evaluate('document.getElementById("map-selection").dataset.hidden'),undefined,'The view picker returns');
  assert.equal(await p.evaluate('JSON.stringify(map.getPaintProperty("korea-first-fill","fill-color"))'),fill,'The present-day fill returns');
  assert(await p.evaluate(`${dock}.hidden&&document.getElementById("k-history-card").hidden`));
  assert(await p.evaluate('!document.getElementById("k-country").hidden&&!document.getElementById("k-selection-flag").hidden'),'Present-day pickers and flag return');
 }},
 {name:'The Korea snapshot dock fits a phone',options:{width:390,height:844,mobile:true},async run(p,base){
  p.base=base;await open(p);
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No page-level horizontal overflow');
  assert(await p.evaluate(`(()=>{const r=${dock}.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`),'The dock fits the screen');
  await p.screenshot('korea-history-phone');
 }}
];
