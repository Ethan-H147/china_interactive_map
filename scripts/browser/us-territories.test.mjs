import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {searchAndSelect} from './countries.test.mjs';
const records=JSON.parse(gunzipSync(fs.readFileSync('dist/data/europe/united-states/catalogue.bin'))).records;
const territories=records.filter(r=>r.overseas),states=records.filter(r=>r.focusOnEntry);
const delta=(a,b)=>Math.abs(((a-b+540)%360)-180);
export default [
 {name:'US mainland remains visible and clickable from another country',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');await page.evaluate('void map.jumpTo({center:[-100,40],zoom:4})');await page.settle();
  await page.waitFor('!!map.getLayer("united-states-portal-fill")&&map.isSourceLoaded("united-states-portal")');
  assert(await page.evaluate('map.queryRenderedFeatures(map.project([-100,40]),{layers:["united-states-portal-fill"]}).some(f=>f.properties.country==="united-states"&&!f.properties.region)'),'The mainland is drawn as a clickable polygon');
  await page.screenshot('us-mainland-restored');
  const point=await page.evaluate('(()=>{const p=map.project([-100,40]),b=map.getCanvas().getBoundingClientRect();return [b.left+p.x,b.top+p.y]})()');
  await page.tap(point);await page.waitFor('AtlasEntry.current==="united-states"');await page.settle();
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),null);
  assert(await page.evaluate('map.queryRenderedFeatures(map.project([-100,40]),{layers:["united-states-first-fill"]}).length>0'),'US states render after entering');
 }},

 ...[...territories.map(r=>({r,options:{width:1280,height:820}})),...states.flatMap(r=>[{r,options:{width:1280,height:820}},{r,options:{width:390,height:844,mobile:true}}])].map(({r,options})=>({name:'clicking '+r.en+' opens the US at that place '+options.width,options,async run(page,base){
  await page.open(base,'#china');
  await page.evaluate('void map.jumpTo({center:'+JSON.stringify(r.center)+',zoom:'+(r.id==='US-AK'?5:r.id==='US-HI'?7:r.areaKm2<.1?15:r.areaKm2<20?12:9)+'})');await page.settle();
  await page.waitFor("!!map.getLayer('united-states-portal-fill')");
  const point=await page.evaluate('(()=>{const p=map.project('+JSON.stringify(r.center)+'),b=map.getCanvas().getBoundingClientRect();window.territoryMoves=[];map.on("move",()=>window.territoryMoves.push(map.getCenter().toArray()));return [b.left+p.x,b.top+p.y]})()');
  await page.tap(point);
  await page.waitFor('AtlasEntry.current==="united-states"&&currentAtlas()?.getSelection()==='+JSON.stringify(r.id),{timeout:30000});
  await page.settle();
  const result=await page.evaluate('({center:map.unproject([(map.getContainer().clientWidth-20)/2,(76+map.getContainer().clientHeight-Math.max(55,window.AtlasSheet?.navigationInset()||0))/2]).toArray(),moves:window.territoryMoves,name:document.getElementById("us-name").textContent,span:map.getBounds().getEast()-map.getBounds().getWest()})');
  const [[west,south],[east,north]]=r.bounds,near=p=>delta(p[0],(west+east)/2)<(east-west)/2+2&&p[1]>south-2&&p[1]<north+2;
  assert.equal(result.name,r.en);assert(near(result.center),'The camera stays at the clicked place');
  assert(result.moves.every(p=>delta(p[0],(west+east)/2)<(east-west)/2+2),'The camera never detours through mainland America');
  if(r.focusOnEntry||r.id==='US-GU'||r.id==='US-PR'||r.id==='US-UM-79')await page.screenshot('us-territory-'+r.code);
 }})),
 ...[{width:1280,height:820},{width:390,height:844,mobile:true}].map(options=>({name:'territory search, official flag, saved view and reload '+options.width,options,async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'Guam','Guam','Territory');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-GU');
  assert(await page.evaluate('document.getElementById("us-flag").complete&&document.getElementById("us-flag").naturalWidth>0'));
  await page.tap('#us-flag-source');await page.waitFor('document.getElementById("flag-viewer").open&&document.getElementById("flag-viewer-image").src.includes("US-GU.svg")');await page.key('Escape');
  const hash=await page.evaluate('AtlasView.hashFor(captureView())');assert(hash);await page.open(base,hash);
  await page.waitFor('currentAtlas()?.getSelection()==="US-GU"');
  assert(delta((await page.evaluate('map.getCenter().toArray()'))[0],144.72)<1);
  await page.evaluate('void map.jumpTo({center:[-215.28,13.4],zoom:10})');await page.settle();
  assert(await page.evaluate('[...document.querySelectorAll(".korea-marker")].some(e=>e.textContent.includes("Guam"))'),'Territory labels follow the visible world copy');
  const wrapped=await page.evaluate('AtlasView.hashFor(captureView())');assert(wrapped,'Repeated world views remain shareable');await page.open(base,wrapped);
  await page.waitFor('currentAtlas()?.getSelection()==="US-GU"');
  assert(delta((await page.evaluate('map.getCenter().toArray()'))[0],144.72)<1);
  await page.screenshot('us-guam-'+options.width);
 }})),
 {name:'US home frames the mainland and Alaska remains selectable',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');const center=await page.evaluate('map.getCenter().toArray()');assert(center[0]>-110&&center[0]<-85&&center[1]>25);
  await searchAndSelect(page,'Alaska','Alaska','State');assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-AK');
  const span=await page.evaluate('map.getBounds().getEast()-map.getBounds().getWest()');assert(span<150,'Alaska does not frame all overseas territories');
 }},
 {name:'clicking Pacific territories within a repeated US world keeps the camera nearby',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  for(const id of ['US-GU','US-UM-79']){
   const r=territories.find(r=>r.id===id),at=[r.center[0]-360,r.center[1]];
   await page.evaluate('void map.jumpTo({center:'+JSON.stringify(at)+',zoom:12})');await page.settle();
   const point=await page.evaluate('(()=>{const p=map.project('+JSON.stringify(at)+'),b=map.getCanvas().getBoundingClientRect();window.copyMoves=[];map.on("move",()=>window.copyMoves.push(map.getCenter().toArray()));return [b.left+p.x,b.top+p.y]})()');
   await page.tap(point);await page.waitFor('currentAtlas().getSelection()==='+JSON.stringify(id));await page.settle();
   const moves=await page.evaluate('window.copyMoves');
   assert(moves.every(p=>delta(p[0],at[0])<2&&Math.abs(p[1]-at[1])<2),'A nearby world-copy click does not fly around the globe');
  }
 }}

];
