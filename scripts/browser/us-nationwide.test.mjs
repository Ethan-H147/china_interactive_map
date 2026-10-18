import assert from 'node:assert/strict';
import {searchAndSelect as pick} from './countries.test.mjs';
const ready=async page=>{await page.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"',{timeout:45000});await page.settle();};
const choose=async(page,query,name,kind)=>{await pick(page,query,name,kind);await ready(page);};
export default [
 {name:'nationwide cities, New England towns and nested New York villages',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  for(const[query,name,kind,prefix]of [['Seattle WA','Seattle','City','US-PLACE-53'],['Houston TX','Houston','City','US-PLACE-48'],['Greenwich Connecticut','Greenwich','Town','US-MCD-09'],['Hempstead town New York','Hempstead','Town','US-MCD-36'],['Hempstead village New York','Hempstead','Village','US-PLACE-36'],['Princeton NJ','Princeton','Municipality','US-PLACE-34']]){
   await choose(page,query,name,kind);
   assert((await page.evaluate('currentAtlas().getSelection()')).startsWith(prefix));
   assert.equal(await page.evaluate('currentAtlas().getMode()'),3);
   assert(await page.evaluate('map.querySourceFeatures("united-states-third").length>0'));
   assert(!await page.evaluate('map.querySourceFeatures("united-states-third").some(f=>f.properties.incorporated===false)'),'Default source excludes CDP geometry');
  }
  await page.screenshot('us-nationwide-princeton');
 }},
 {name:'optional geometry replaces the default source and large lists stay bounded',options:{width:1280,height:820},async run(page,base){
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.detailJobs=[];const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(url,options){super(url,options);if(String(url).includes('country-boundary-worker')){const post=this.postMessage.bind(this);this.postMessage=(data,...rest)=>{window.detailJobs.push(data);return post(data,...rest)}}}};`});
  await page.open(base,'#united-states');await choose(page,'California','California','State');await page.tap('#mode-third');await ready(page);
  assert.equal(await page.evaluate('document.getElementById("us-children").children.length'),0,'Closed list creates no municipal buttons');
  await page.evaluate('document.getElementById("us-subdivisions").open=true');
  await page.waitFor('document.querySelectorAll("#us-children .search-result").length===100');
  await page.tap('#us-children .quiet-button');
  assert.equal(await page.evaluate('document.querySelectorAll("#us-children .search-result").length'),200);
  assert(!await page.evaluate('window.detailJobs.some(d=>JSON.stringify(d).includes("-census.bin"))'));
  await page.evaluate('document.getElementById("us-tab-layers").click();document.getElementById("us-census-places").click()');await ready(page);
  assert(await page.evaluate('window.detailJobs.some(d=>JSON.stringify(d).includes("US-CA-census.bin"))'));
  // Source features cover the viewport, so check selected CDP after its camera move.
  await choose(page,'Altadena CA','Altadena','Census-designated place');
  assert(await page.evaluate('map.querySourceFeatures("united-states-third").some(f=>f.properties.id==="US-PLACE-0601290")'));
  await page.evaluate('document.getElementById("us-census-places").click()');await ready(page);
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-CA');
  assert(!await page.evaluate('map.querySourceFeatures("united-states-third").some(f=>f.properties.incorporated===false)'));
 }},
 {name:'Hawaii communities and Alaska dateline municipalities remain usable',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#united-states');await choose(page,'Hawaii','Hawaii','State');await page.tap('.map-mode button[aria-pressed=true]:not(#mode-lock)');await page.tap('#mode-third');await ready(page);
  assert(await page.evaluate('!document.getElementById("us-detail-hint").hidden&&document.getElementById("us-detail-hint").textContent.includes("No incorporated")'));
  await choose(page,'Hilo HI','Hilo','Census-designated place');
  assert(await page.evaluate('document.getElementById("us-census-places").checked'));
  await choose(page,'Unalaska AK','Unalaska','City');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-0280770');
  assert((await page.evaluate('map.getBounds().getEast()-map.getBounds().getWest()'))<20,'Dateline geometry never fits the whole globe');
  await page.screenshot('us-nationwide-alaska-phone');
 }},
 {name:'consolidated cities use whole governments and keep statistical balances optional',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  await choose(page,'Indianapolis IN','Indianapolis','Consolidated city');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-CONCITY-1836000');
  assert(!await page.evaluate('map.querySourceFeatures("united-states-third").some(f=>f.properties.id==="US-PLACE-1836003")'));
  await choose(page,'Louisville KY','Louisville/Jefferson County','Consolidated city');
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-CONCITY-2148003');
  await choose(page,'Louisville/Jefferson County metro government','Louisville/Jefferson County metro government (balance)','Statistical city balance');
  assert(await page.evaluate('document.getElementById("us-census-places").checked'));
  assert(await page.evaluate('document.getElementById("us-municipal-card").textContent.includes("Census statistical remainder")'));
 }}
,
 {name:'California ZIP gap edges render in the normal border layer',options:{width:1280,height:820},async run(page,base){
  const {load,linesOf}=await import('../geo-index.mjs'),data=load('dist/data/europe/united-states/zip-codes/US-CA.bin');
  const paths=linesOf({type:'FeatureCollection',features:data.boundaries.features.filter(f=>f.properties.owners.length===1&&f.properties.owners.includes('US-ZIP-93546'))});
  let midpoint,length=0;
  for(const path of paths)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],size=Math.hypot(a[0]-b[0],a[1]-b[1]);if(size>length){length=size;midpoint=[(a[0]+b[0])/2,(a[1]+b[1])/2];}}
  assert(midpoint,'Previously omitted inland edge exists in the build');
  await page.open(base,'#united-states');await choose(page,'93546','ZIP 93546','ZIP code');
  await page.evaluate('void map.jumpTo({center:'+JSON.stringify(midpoint)+',zoom:12})');await page.settle();
  assert(await page.evaluate('(()=>{const p=map.project('+JSON.stringify(midpoint)+');return map.queryRenderedFeatures([[p.x-4,p.y-4],[p.x+4,p.y+4]],{layers:["united-states-zip-codes-lines"]}).some(f=>String(f.properties.owners).includes("US-ZIP-93546"))})()'),'The shared-border layer renders the formerly missing single-owner edge');
  await page.screenshot('us-california-zip-inland-edge');
 }}

];
