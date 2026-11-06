import assert from 'node:assert/strict';
const button='document.getElementById("historical-snapshot")',dock='document.getElementById("china-history-dock")';
const name='document.getElementById("selection-name").textContent';
// The selection heading: kind, name and Chinese name.
const heading='["selection-kind","selection-name","selection-chinese"].map(id=>document.getElementById(id).textContent)';
const labels='[...document.querySelectorAll("[data-atlas-place^=history-]")].map(e=>e.dataset.atlasPlace)';
const shown=id=>`document.getElementById(${JSON.stringify(id)}).checkVisibility()`;
const tapAt=async(p,lngLat)=>{await p.evaluate('void map.jumpTo({center:[106,35],zoom:3.6})');await p.settle();const point=await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(lngLat)}),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()`);await p.tap(point);await p.settle();};
const period=async(p,y)=>{await p.evaluate(`void document.querySelector('#china-history-dock .election-tick[data-year="${y}"]').click()`);await p.settle();};
const head=p=>p.evaluate(`[${dock}.querySelector(".election-year strong").textContent,${dock}.querySelector(".election-year span").textContent]`);
const open=async p=>{
 await p.open(p.base,'#china');await p.waitFor('allReady&&chinaReady&&!countrySwitching',{timeout:60000});await p.settle();
 assert.deepEqual(await p.evaluate(`[${button}.hidden,${button}.textContent]`),[false,'Historical snapshot']);
 await p.evaluate(`void ${button}.click()`);await p.waitFor('!!map.getLayer("china-history-fill")',{timeout:30000});await p.settle();
};
export default [
 {name:'The China historical snapshot steps from the Han to the Republic of China on present-day land, and returns to the present day',options:{width:1360,height:900},async run(p,base){
  p.base=base;
  await p.open(base,'#china');await p.waitFor('allReady&&chinaReady&&!countrySwitching',{timeout:60000});await p.settle();
  const fill=await p.evaluate('JSON.stringify(map.getPaintProperty("province-fill","fill-color"))');
  await p.evaluate(`void ${button}.click()`);await p.waitFor('!!map.getLayer("china-history-fill")',{timeout:30000});await p.settle();
  assert.equal(await p.evaluate(`${button}.textContent`),'Present day');
  // The timeline: six periods in order, then the 1949 page.
  assert.deepEqual(await p.evaluate(`[...${dock}.querySelectorAll(".election-tick")].map(t=>t.dataset.mark)`),['2 CE','250 CE','742','1100','1430','1820','1949']);
  assert.equal(await p.evaluate(`${dock}.querySelector('[data-year="1949"]').tagName`),'BUTTON');
  assert.deepEqual(await head(p),['742','Tang dynasty']);
  assert(await p.evaluate('["province-lines","prefecture-lines","other-lines"].every(id=>!map.getLayer(id)||map.getLayoutProperty(id,"visibility")==="none")'),'Present-day lines are hidden');
  assert(await p.evaluate(`!${shown('province')}&&!${shown('prefecture-layer')}`),'Present-day region picker and line layers are hidden');
  await p.waitFor(labels+'.includes("history-tang")',{timeout:15000});
  await tapAt(p,[108.948,34.268]);await p.waitFor(name+'==="Chang’an"',{timeout:15000});
  assert.deepEqual(await p.evaluate(heading),['IMPERIAL CAPITAL','Chang’an','長安']);
  assert(await p.evaluate(`!${shown('selection-flag')}&&!${shown('selection-meta')}&&!${shown('subdivisions')}`),'No flag, statistics or subdivisions for a historical unit');
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Zheng and Wu/);
  await tapAt(p,[91.1,29.65]);await p.waitFor(name+'==="Tibetan Empire"',{timeout:15000});
  await p.screenshot('china-history-tang');
  for(const [year,label,unit] of [[2,'Han dynasty','Han'],[250,'Three Kingdoms','Wei'],[1100,'Song dynasty','Yongxingjun'],[1430,'Ming dynasty','Ming'],[1820,'Qing dynasty','Shaanxi']]){
   await period(p,year);
   assert.equal((await head(p))[1],label);
   await tapAt(p,[108.94,34.34]);await p.waitFor(name+'==='+JSON.stringify(unit),{timeout:15000});
  }
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Stanford University/);
  await p.evaluate('void document.getElementById("tab-layers").click()');
  await p.evaluate('void map.fitBounds([[68,17],[146,57]],{padding:{left:35,right:35,top:25,bottom:170},duration:0})');await p.settle();
  assert(await p.evaluate('[...document.querySelectorAll("[data-atlas-country-label]")].every(label=>label.firstChild.textContent!=="Mongolia")'));
  await p.screenshot('china-history-qing');
  assert(await p.evaluate('["province-fill","province-fragment-fill"].every(id=>map.getLayoutProperty(id,"visibility")==="none")&&!map.getLayer("china-history-selected-fill")'),'Qing uses one land fill, including selection');
  await tapAt(p,[115,43.9]);await p.waitFor(name+'==="Inner Mongolia"',{timeout:15000});
  for(const zoom of [3.9,4.8,5.4]){
   await p.evaluate(`void map.jumpTo({center:[114.6,43.6],zoom:${zoom}})`);await p.settle();
   assert(await p.evaluate('[[112.1,43.3],[115,43.9],[117,44.2],[118.2,45.2]].every(at=>map.queryRenderedFeatures(map.project(at),{layers:["china-history-fill"]}).some(face=>map.getFeatureState({source:"china-history-faces",id:face.id}).selected))'),'The selected province uses the same faces across tile zooms');
  }
  await p.screenshot('china-history-qing-inner-mongolia');
  await tapAt(p,[106.9,47.9]);await p.waitFor(name+'==="Uliastai"',{timeout:15000});
  await tapAt(p,[135.1,48.5]);await p.waitFor(name+'==="Jilin"',{timeout:15000});
  assert.equal(await p.evaluate('map.getLayoutProperty("atlas-frontiers","visibility")'),'none');
  await period(p,250);
  assert(await p.evaluate('map.getLayoutProperty("province-fill","visibility")!=="none"'));
  assert.match(await p.evaluate('document.getElementById("history-summary").textContent'),/Three Kingdoms, 250 CE.*Cliopatria/);
  assert(await p.evaluate(`[...${dock}.querySelectorAll(".election-key")].some(k=>k.textContent==="No state recorded")`),'Unrecorded land has a key');
  await tapAt(p,[104.07,30.67]);await p.waitFor(name+'==="Shu"',{timeout:15000});
  await tapAt(p,[118.8,32.06]);await p.waitFor(name+'==="Wu"',{timeout:15000});
  assert.deepEqual(await p.evaluate(heading),['KINGDOM','Wu','东吴']);
  await p.screenshot('china-history-three-kingdoms');
  // Search finds a present-day place and opens the historical unit there.
  await period(p,1100);
  await p.evaluate('void selectRegion(provinceLayers.get(110000),110000)');await p.waitFor(name+'==="Liao"',{timeout:15000});
  await period(p,1820);
  const before=await p.evaluate('map.getCenter().toArray().concat(map.getZoom())');
  await p.evaluate('void (window.historyFillSource=map.getSource("china-history-faces"))');
  await p.tap('#china-history-dock [data-step="1"]');await p.settle();
  assert.deepEqual(await head(p),['1949','Republic of China']);
  assert.deepEqual(await p.evaluate('map.getCenter().toArray().concat(map.getZoom())'),before);
  assert(await p.evaluate('AtlasEntry.current==="china"&&map.getSource("china-history-faces")===window.historyFillSource&&!map.getLayer("china-1949-first-fill")'));
  await p.tap('#china-history-dock [data-step="-1"]');await p.settle();
  assert.deepEqual(await head(p),['1820','Qing dynasty']);
  assert.deepEqual(await p.evaluate('map.getCenter().toArray().concat(map.getZoom())'),before);
  await period(p,1949);await period(p,742);
  assert.deepEqual(await head(p),['742','Tang dynasty']);
  await p.evaluate(`void ${button}.click()`);await p.settle();
  assert(await p.evaluate('!map.getLayer("china-history-fill")&&!map.getSource("china-history-faces")'),'The snapshot layers leave');
  assert.equal(await p.evaluate(`${button}.textContent`),'Historical snapshot');
  assert.equal(await p.evaluate('JSON.stringify(map.getPaintProperty("province-fill","fill-color"))'),fill,'The present-day fill returns');
  assert(await p.evaluate(`${dock}.hidden&&document.getElementById("history-card").hidden&&document.getElementById("history-summary").hidden`));
  assert(await p.evaluate(`${shown('province')}&&map.getLayoutProperty("province-lines","visibility")!=="none"`),'Present-day picker and lines return');
  await p.evaluate('void selectRegion(provinceLayers.get(110000),110000)');await p.waitFor(name+'==="Beijing"',{timeout:15000});
  assert(await p.evaluate(shown('selection-flag')),'The present-day flag returns');
 }},
 {name:'Tang and Song circuits shade only on selection and historical city dots use the shared cards',options:{width:1360,height:900},async run(p,base){
  p.base=base;await open(p);
  const layer='china-history-circuit-tint';
  const filter=()=>p.evaluate('map.getFilter("'+layer+'")');
  const tapHere=async at=>{
   const point=await p.evaluate(`(()=>{const q=map.project(${JSON.stringify(at)}),r=map.getCanvas().getBoundingClientRect();return[r.x+q.x,r.y+q.y]})()`);
   await p.tap(point);await p.settle();
  };
  assert.deepEqual(await filter(),['==',['get','id'],'']);
  await p.evaluate('void map.jumpTo({center:[112.5,34.27],zoom:5})');await p.settle();
  const camera=await p.evaluate('map.getCenter().toArray().concat(map.getZoom())');
  await tapHere([112.5,34.27]);
  await p.waitFor(name+'==="Duji"',{timeout:15000});
  assert.deepEqual(await p.evaluate('map.getCenter().toArray().concat(map.getZoom())'),camera);
  assert.deepEqual(await filter(),['==',['get','id'],'742-circuit-duji']);
  assert(await p.evaluate('map.queryRenderedFeatures(map.project([112.5,34.27]),{layers:["'+layer+'"]}).some(f=>f.properties.shade>.1)'));
  assert.equal(await p.evaluate('map.getLayer("'+layer+'").type'),'fill');
  assert.deepEqual(await p.evaluate('map.getPaintProperty("'+layer+'","fill-opacity")'),['get','opacity']);
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Luoyang.*approximate/s);
  await p.screenshot('china-history-tang-circuit');
  const assertCity=async(year,id,at,en,zh)=>{
   await p.evaluate(`void map.jumpTo({center:${JSON.stringify(at)},zoom:8})`);
   await p.settle();
   const label=`[data-atlas-place="${year}-city-${id}"]`;
   await p.waitFor(`document.querySelector(${JSON.stringify(label)})?.textContent.includes(${JSON.stringify(zh)})`);
   await tapHere(at);
   await p.waitFor(name+'==='+JSON.stringify(en));
   assert.equal(await p.evaluate('document.getElementById("selection-chinese").textContent'),zh);
  };
  await assertCity(742,570,[102.998,29.98],'Yandao','嚴道');
  await period(p,1100);
  assert.deepEqual(await filter(),['==',['get','id'],'']);
  await p.evaluate('void map.jumpTo({center:[114.346,34.804],zoom:6})');await p.settle();
  await tapHere([114.346,34.804]);
  await p.waitFor(name+'==="Dongjing"',{timeout:15000});
  assert.match(await p.evaluate('document.getElementById("history-card").innerText'),/Kaifeng capital district/);
  assert.match(await p.evaluate('document.querySelector("#china-history-dock .history-counts").textContent'),/23 circuits, 1 capital district/);
  await assertCity(1100,1253,[110.386,28.472],'Yuanling','沅陵');
  await period(p,1820);
  assert(await p.evaluate('!map.getLayer("'+layer+'")&&!map.getSource("china-history-cities")'));
 }},
 {name:'All Tang and Song circuit fades render on the shared map',options:{width:1000,height:760},async run(p,base){
  p.base=base;await open(p);
  const points=await p.evaluate(`(async()=>{const {decodeData}=await import('./geo-pack.mjs');const h=await decodeData(new Uint8Array(await (await fetch('data/china/history/borders.bin')).arrayBuffer()));return Object.fromEntries([742,1100].map(y=>{const {circuits,protectorates}=h.configs[h.years[y].config].points;return [y,{circuits,protectorates}];}));})()`);
  for(const year of [742,1100]){
   if(year===1100)await period(p,year);
   for(const {id,en,bounds,center} of points[year].circuits){
    await p.evaluate(`void chinaHistory.selectPlace(${JSON.stringify(id)},false);void map.fitBounds(${JSON.stringify(bounds)},{duration:0,padding:{left:30,right:30,top:30,bottom:145},maxZoom:7})`);
    await p.settle();
    assert.equal(await p.evaluate(name),en);
    const rendered=await p.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(center)}),{layers:['china-history-circuit-tint']}).map(f=>f.properties)`);
    assert(rendered.length>=5&&rendered.every(f=>f.id===id),en+' renders its selected nested contours');
    await p.screenshot(id+'-audit');
   }
   if(year===742){
    for(const {id,en,local} of points[year].protectorates){
     await p.evaluate(`void chinaHistory.selectPlace(${JSON.stringify(id)},false)`);
     assert.deepEqual(await p.evaluate(heading),['PROTECTORATE',en,local]);
    }
   }
  }
  for(const [id,at] of [['1100-circuit-liangzhe',[118.88,28.95]],['1100-circuit-jiangnan-east',[117.96,28.45]]]){
   await p.evaluate(`void chinaHistory.selectPlace(${JSON.stringify(id)},false);void map.jumpTo({center:${JSON.stringify(at)},zoom:8.6})`);
   await p.settle();await p.screenshot(id+'-detail-audit');
  }
 }},
 {name:'The China snapshot dock fits a phone',options:{width:390,height:844,mobile:true},async run(p,base){
  p.base=base;await open(p);
  assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No page-level horizontal overflow');
  assert(await p.evaluate(`(()=>{const r=${dock}.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`),'The dock fits the screen');
  await p.screenshot('china-history-phone');
 }}
];
