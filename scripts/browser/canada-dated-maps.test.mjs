import assert from 'node:assert/strict';
import {chooseMapView} from './map-view-dropdown.test.mjs';
const heading='document.getElementById("ca-name").textContent';
const historyCard='document.getElementById("ca-history-card")',electionCard='document.getElementById("ca-election-card")';
const pick=async(p,where)=>{
 await p.evaluate(`void map.jumpTo({center:${JSON.stringify(where)},zoom:9});`);
 await p.settle();
 const point=await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(where)}),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()`);
 const before=await p.evaluate('JSON.stringify([map.getCenter().toArray(),map.getZoom()])');
 await p.tap(point);await p.settle();
 assert.notEqual(await p.evaluate('JSON.stringify([map.getCenter().toArray(),map.getZoom()])'),before,'Selecting a dated place moves the camera');
};
const pan=async(p,layer)=>{
 await p.waitFor('!map.isMoving()&&map.dragPan.isEnabled()&&document.getElementById("map-shell").getAttribute("aria-busy")==="false"',{timeout:25000});
 await p.waitFor('Array.isArray(map.getPaintProperty('+JSON.stringify(layer)+',"fill-color"))',{timeout:25000});
 const before=await p.evaluate('({center:map.getCenter().toArray(),zoom:map.getZoom(),projection:map.getProjection().type,target:document.elementFromPoint(910,290)?.className})');
 await p.drag('#map',{dx:150,dy:35});await p.settle();
 const after=await p.evaluate('map.getCenter().toArray()');
 assert(Math.hypot(after[0]-before.center[0],after[1]-before.center[1])>.01,'Dragging pans the dated map '+JSON.stringify({before,after}));
};
const tick=async(p,dock,year)=>{
 await p.evaluate(`void document.querySelector('#${dock} [data-year="${year}"]').click()`);
 await p.waitFor(`document.querySelector('#${dock} .election-year strong').textContent==='${year}'`,{timeout:60000});await p.settle();
};
export default [
 {name:'Canada historical divisions have their own cards and dated coastlines',options:{width:1360,height:900},async run(p,base){
  await p.open(base,'#canada');await p.settle();
  await p.evaluate('void document.getElementById("historical-snapshot").click()');
  await p.waitFor('!!map.getLayer("canada-history-fill")',{timeout:45000});await p.settle();
  assert.equal(await p.evaluate('document.querySelectorAll("#canada-history-dock [data-year]").item(0).dataset.year'),'1866');
  await pan(p,'canada-history-fill');
  await tick(p,'canada-history-dock',1866);
  await pick(p,[-76.6,45.4]);
  await p.waitFor(heading+'.includes("Province of Canada")',{timeout:15000});
  assert.match(await p.evaluate(historyCard+'.textContent'),/Canada East and Canada West/);
  assert.equal(await p.evaluate('document.getElementById("ca-dated-unit").value'),'PC');
  assert.equal(await p.evaluate('document.getElementById("ca-explore-panel").hidden'),false);
  assert(await p.evaluate('(()=>{const d=map.getSource("canada-history-selection")?.serialize().data;return typeof d==="string"&&/[?&]unit=\\d/.test(d)})()'),'The selected division is outlined');
  await pick(p,[-98,51.8]);
  await p.waitFor(heading+'.includes("Rupert")',{timeout:15000});
  await tick(p,'canada-history-dock',1870);
  assert.match(await p.evaluate(heading),/Northwest Territories/);
  await p.evaluate('void map.jumpTo({center:[-63.1,46.4],zoom:7})');await p.settle();await p.screenshot('canada-history-maritime-coast-1870');
  await tick(p,'canada-history-dock',1901);
  await pick(p,[-135,62]);
  await p.waitFor(heading+'.includes("Yukon")',{timeout:15000});
  await tick(p,'canada-history-dock',2003);
  assert.match(await p.evaluate(heading),/^Yukon/);
  await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.settle();
  assert(await p.evaluate('!map.getLayer("canada-history-fill")&&'+historyCard+'.hidden'));
 }},
 {name:'Canada federal elections use the ridings of each election and count seats',options:{width:1360,height:900},async run(p,base){
  await p.open(base,'#canada');await chooseMapView(p,'elections');
  await p.waitFor('!!map.getLayer("canada-ridings-fill")',{timeout:45000});await p.settle();
  assert.match(await p.evaluate('document.querySelector("#election-dock .election-needed").textContent'),/172 seats/);
  assert.equal(await p.evaluate('document.querySelectorAll("#election-dock .election-tick").length'),45);
  assert.match(await p.evaluate('document.querySelector("#election-dock .election-range").textContent'),/1867–2025/);
  await p.tap('#election-dock [data-step="-1"]');
  await p.waitFor('document.querySelector("#election-dock .election-year strong").textContent==="2021"');
  await tick(p,'election-dock',2025);
  assert.match(await p.evaluate('document.getElementById("ca-election-summary").textContent'),/Liberal169/);
  await pick(p,[-75.7028,45.3943]);
  await p.waitFor(heading+'.includes("Ottawa Centre")',{timeout:15000});
  assert.match(await p.evaluate(electionCard+'.textContent'),/Naqvi.*elected/);
  // Elections outline the riding without filling it; the shape source stays empty.
  assert(await p.evaluate('(()=>{const layer=map.getLayer("canada-ridings-selected-fill");if(!layer)return true;const data=map.getSource(layer.source).serialize().data;return typeof data==="object"&&data.features.length===0})()'),'Riding selection is not filled');
  assert(await p.evaluate('(()=>{const d=map.getSource("canada-ridings-outlines")?.serialize().data;return typeof d==="string"&&/[?&]unit=\\d/.test(d)})()'),'The selected riding is outlined');
  assert(await p.evaluate('map.getPaintProperty("canada-ridings-selected","line-color")===map.getPaintProperty("canada-first-selected","line-color")'));
  assert.match(await p.evaluate('JSON.stringify(map.getPaintProperty("canada-ridings-selected","line-opacity"))'),/visibleZoom/);
  assert.match(await p.evaluate('JSON.stringify(map.getPaintProperty("canada-ridings-lines","line-opacity"))'),/visibleZoom/);
  await p.screenshot('canada-election-ottawa-2025');
  await tick(p,'election-dock',1867);
  await pan(p,'canada-ridings-fill');
  assert.match(await p.evaluate('JSON.stringify(map.getPaintProperty("canada-ridings-lines","line-opacity"))'),/visibleZoom/);
  await pick(p,[-63.576,44.65]);
  await p.waitFor(heading+'.includes("Halifax")',{timeout:15000});
  assert.match(await p.evaluate(electionCard+'.textContent'),/Alfred JONES.*Patrick POWERS|Patrick POWERS.*Alfred JONES/);
  await p.evaluate('void document.querySelector("#election-dock .dock-collapse").click()');
  assert.equal(await p.evaluate('document.querySelector("#election-dock .dock-collapse").getAttribute("aria-expanded")'),'false');
  await chooseMapView(p,'administrative');await p.settle();
  assert(await p.evaluate('!map.getLayer("canada-ridings-fill")&&'+electionCard+'.hidden'));
 }}
];

