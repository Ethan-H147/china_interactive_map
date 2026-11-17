import {sakhalinPixelProbes,beginPixels,endPixels} from './russia-render-helpers.mjs';
import assert from 'node:assert/strict';
import {russiaPeriods} from '../../dist/russia-history.mjs';
async function year(p,value){await p.evaluate(`document.querySelector('#russia-history-dock [data-year="${value}"]').click()`);await p.waitFor(`currentAtlas().historicalYear===${value}`);await p.settle();}
async function open(p,base,hash='#russia'){await p.open(base,hash);if(hash==='#russia'){await p.tap('#historical-snapshot');await p.waitFor('currentAtlas().historicalActive&&!!document.getElementById("russia-history-dock")');}await p.settle();}
async function reload(p){
 // Wait for the new document, so a still-idle old map cannot satisfy settle
 // while Chrome is destroying its execution context for the reload.
 let cleared=false,finish;
 const context=new Promise(resolve=>finish=resolve);
 p.on('Runtime.executionContextsCleared',()=>{cleared=true;});
 p.on('Page.frameNavigated',({frame})=>{if(!frame.parentId)cleared=true;});
 p.on('Runtime.executionContextCreated',({context})=>{if(cleared&&context.auxData?.isDefault)finish();});
 await p.send('Page.reload');
 let timer;try{await Promise.race([context,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Reload did not create a new document context')),30000))]);}finally{clearTimeout(timer);}
 await p.settle();
}
const state=p=>p.evaluate(`({layers:map.getStyle().layers.filter(l=>l.id.startsWith('russia-')).map(l=>l.id).sort(),sources:Object.keys(map.getStyle().sources).filter(id=>id.startsWith('russia-')).sort()})`);
export default [
 {name:'Sakhalin renders canonical land and water at the same modern and historical camera',options:{width:1440,height:950},async run(p,base){
  await p.open(base,'#russia');await p.evaluate('AtlasComfort.set({appearance:"light"});void map.jumpTo({center:[142.1,52.4],zoom:7.4,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();
  const before=await state(p);await p.evaluate('window.coastCamera={center:map.getCenter().toArray(),zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch(),padding:map.getPadding()};');
  await p.screenshot('russia-coast-modern-sakhalin');
  await p.tap('#historical-snapshot');await p.waitFor('currentAtlas().historicalActive&&map.getSource("russia-first")?.type==="vector"');await p.settle();
  for(const [value,color]of [[1905,[117,153,198]],[1988,[200,140,127]]]){
   await year(p,value);await p.evaluate('void map.jumpTo(coastCamera)');await p.settle();const probes=await sakhalinPixelProbes(color,value);assert(probes.length>300);
   await beginPixels(p,probes);await p.evaluate('map.triggerRepaint()');await p.settle();const pixels=await endPixels(p);assert(pixels.points>300);assert.equal(pixels.bad,0,JSON.stringify(pixels));
   assert.deepEqual((await state(p)).layers,before.layers,'Same layers');await p.screenshot('russia-coast-'+value+'-sakhalin');
  }
  await p.tap('#historical-snapshot');await p.settle();assert.equal(await p.evaluate('map.getSource("russia-first").type'),'geojson');assert.deepEqual(await state(p),before);
 }},
 {name:'39 milestones reuse every host layer and restore present-day geometry and colors',options:{width:1440,height:950},async run(p,base){
  await p.open(base,'#russia');await p.evaluate('AtlasComfort.set({appearance:"light"});AtlasContextSourcesController.whenReady()');await p.settle();
  const before=await state(p),paint=await p.evaluate('JSON.stringify(map.getPaintProperty("russia-first-fill","fill-color"))'),modernAntialias=await p.evaluate('map.getPaintProperty("russia-first-selection-fill","fill-antialias")');
  await p.evaluate('window.historySourceRefs=["russia-first","russia-first-edges","russia-first-outlines"].map(id=>map.getSource(id));window.historySourceData=historySourceRefs.map(s=>s.serialize().data);');
  await p.tap('#historical-snapshot');await p.waitFor('currentAtlas().historicalYear===1721');await p.settle();
  await p.evaluate('void(window.historyVector=map.getSource("russia-first"));');
  assert.equal(await p.evaluate('document.querySelectorAll("#russia-history-dock [role=option]").length'),39);
  assert(await p.evaluate('(()=>{const a=document.querySelector("#russia-history-dock [aria-selected=true]").getBoundingClientRect(),b=document.querySelector("#russia-history-dock .election-strip").getBoundingClientRect();return a.left>=b.left&&a.right<=b.right})()'),'Selected milestone is visible on entry');
  for(const [value]of russiaPeriods){await year(p,value);assert.deepEqual((await state(p)).layers,before.layers,'No new layers at '+value);assert((await state(p)).sources.every(id=>before.sources.includes(id)),'No new source IDs');assert.equal(await p.evaluate('map.getPaintProperty("russia-first-selection-fill","fill-antialias")'),false,'No internal selection seams at '+value);assert(await p.evaluate('historyVector===map.getSource("russia-first")'),'Source objects reused at '+value);if(value===1914){await p.evaluate('void currentAtlas().restore("main","history")');await p.settle();}if([1478,1783,1860,1914,1991].includes(value))await p.screenshot('russia-history-'+value+'-light');}
  await year(p,1988);await p.evaluate('AtlasComfort.set({appearance:"dark"})');await p.settle();await p.screenshot('russia-history-1988-dark');
  await p.evaluate('document.getElementById("ru-province-layer").checked=false;document.getElementById("ru-province-layer").dispatchEvent(new Event("change"))');assert.equal(await p.evaluate('map.getLayoutProperty("russia-first-lines","visibility")'),'none');
  await p.evaluate('document.getElementById("ru-province-layer").checked=true;document.getElementById("ru-province-layer").dispatchEvent(new Event("change"));AtlasComfort.set({appearance:"light"})');await p.settle();
  await p.tap('#historical-snapshot');await p.settle();assert.equal(await p.evaluate('currentAtlas().historicalActive'),false);assert.equal(await p.evaluate('JSON.stringify(map.getPaintProperty("russia-first-fill","fill-color"))'),paint,'Modern paint restores exactly');
  assert.equal(await p.evaluate('map.getPaintProperty("russia-first-selection-fill","fill-antialias")'),modernAntialias,'Modern selection smoothing restores exactly');
  assert(await p.evaluate('["russia-first","russia-first-edges","russia-first-outlines"].every((id,i)=>map.getSource(id).serialize().data===historySourceData[i])'),'Original source URLs restore exactly');assert.deepEqual(await state(p),before);assert(await p.evaluate('document.getElementById("ru-tab-quiz").checkVisibility()'));assert(await p.evaluate('mapScene.assertOrder()'));
  assert.equal(p.requests.filter(url=>/\/russia\/history\/borders\.bin/.test(url)).length,0,'Authoring mesh is never reconstructed in the browser');
  assert.equal(p.requests.filter(url=>/\/europe\/soviet-union-1988\/first\.bin/.test(url)).length,0,'Soviet geometry is compiled ahead of time');
 }},
 {name:'1988 republic picking, capital search, all flags and independent 1991 states',options:{width:1440,height:950},async run(p,base){
  await open(p,base,'#russia/history=1988');assert.equal(await p.evaluate('currentAtlas().historicalYear'),1988);
  await p.evaluate('void map.jumpTo({center:[34.1,44.95],zoom:6})');await p.settle();assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([34.1,44.95])).en'),'Ukrainian SSR');
  const xy=await p.evaluate('(()=>{const q=map.project([34.1,44.95]),r=map.getCanvas().getBoundingClientRect();return [q.x+r.x,q.y+r.y]})()');await p.tap(xy);await p.waitFor('currentAtlas().getSelection()==="SU-UA"');
  assert.match(await p.evaluate('document.getElementById("ru-statistics").parentElement.textContent'),/51,706,742/);
  for(const code of ['RU','UA','BY','UZ','KZ','GE','AZ','LT','MD','LV','KG','TJ','AM','TM','EE']){await p.evaluate(`currentAtlas().restore('SU-${code}','history')`);await p.waitFor('document.querySelector("#ru-flag")?.complete&&document.querySelector("#ru-flag")?.naturalWidth>0');assert.equal(await p.evaluate('document.querySelector("#ru-flag").getAttribute("src")'),'vendor/soviet-flags/SU-'+code+'.svg');}
  await p.evaluate('document.getElementById("ru-search").value="Almaty";document.getElementById("ru-search").dispatchEvent(new Event("input"))');await p.waitFor('document.querySelector("#ru-search-results button")?.textContent==="Kazakh SSR"');await p.tap('#ru-search-results button');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'SU-KZ');assert.match(await p.evaluate('document.getElementById("ru-explore-panel").textContent'),/Alma-Ata/);
  await p.screenshot('russia-history-1988-kazakh');await year(p,1991);assert.equal(await p.evaluate('[...document.getElementById("ru-dated-unit").options].filter(o=>o.value).length'),15);assert.equal(await p.evaluate('document.querySelectorAll("#ru-flag-source:not([hidden])").length'),0);
  await p.evaluate('currentAtlas().restore("SU-UA","history")');assert.equal(await p.evaluate('document.getElementById("ru-name").textContent'),'Ukraine');assert.equal(await p.evaluate('document.getElementById("ru-kind").textContent'),'INDEPENDENT STATE');
 }},
 {name:'direct dates, saved views, Soviet bookmarks and country-switch cleanup',options:{width:1280,height:900},async run(p,base){
  await open(p,base,'#russia/history=882');assert.equal(await p.evaluate('currentAtlas().historicalYear'),882);await year(p,1988);await p.evaluate('currentAtlas().restore("SU-UA","history")');
  await p.evaluate('history.replaceState(null,"",viewHash(captureView()))');await reload(p);await p.waitFor('currentAtlas().historicalYear===1988&&currentAtlas().getSelection()==="SU-UA"');
  await p.evaluate('location.hash="#russia/history=882"');await p.waitFor('currentAtlas().historicalYear===882');await p.settle();await reload(p);assert.equal(await p.evaluate('currentAtlas().historicalYear'),882,'Explicit year beats previously saved view');
  const view=await p.evaluate('({...captureView(),country:"soviet-union-1988",selection:"SU-KG",scope:""})');await p.open(base,'#soviet-union-1988/view='+encodeURIComponent(JSON.stringify(view)));await p.waitFor('currentAtlas().historicalYear===1988&&currentAtlas().getSelection()==="SU-KG"');
  assert.equal(await p.evaluate('AtlasEntry.current'),'russia');assert.equal(await p.evaluate('!!map.getSource("soviet-union-1988-first")'),false);assert.match(await p.evaluate('document.getElementById("ru-history-card").textContent'),/Frunze/);
  await p.evaluate('location.hash="#united-states"');await p.waitFor('AtlasEntry.current==="united-states"&&!countrySwitching');await p.settle();assert.equal(await p.evaluate('document.getElementById("russia-history-dock")?.hidden??true'),true);assert.equal(await p.evaluate('!!map.getSource("russia-first")'),false);
  await p.evaluate('location.hash="#russia/history=1860"');await p.waitFor('AtlasEntry.current==="russia"&&currentAtlas().historicalYear===1860');await p.settle();assert(await p.evaluate('mapScene.assertOrder()'));
 }},
 {name:'phone timeline, keyboard steps, collapse and both appearances',options:{width:390,height:844,mobile:true},async run(p,base){
  await open(p,base,'#russia/history=1860');assert.equal(await p.evaluate('currentAtlas().historicalYear'),1860);assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  await p.evaluate('AtlasComfort.set({appearance:"light"});document.querySelector("#russia-history-dock [aria-selected=true]").focus()');await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await p.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await p.waitFor('currentAtlas().historicalYear===1866');await p.settle();await p.screenshot('russia-history-phone-light');
  await p.tap('#russia-history-dock .dock-collapse');assert.equal(await p.evaluate('document.querySelector("#russia-history-dock .dock-collapse").getAttribute("aria-expanded")'),'false');await p.tap('#russia-history-dock .dock-collapse');
  await p.evaluate('AtlasComfort.set({appearance:"dark"})');await year(p,1988);assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await p.screenshot('russia-history-phone-dark');
  for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#russia-sidebar .sheet-handle');await p.tap('#historical-snapshot');await p.settle();assert.equal(await p.evaluate('currentAtlas().historicalActive'),false);assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 }}
];
