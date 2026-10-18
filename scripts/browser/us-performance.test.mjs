import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const ready=async page=>{await page.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"',{timeout:45000});await page.settle();};
const choose=(page,query,name)=>page.evaluate('(()=>{const input=document.getElementById("us-search");input.value='+JSON.stringify(query)+';input.dispatchEvent(new Event("input"));const button=[...document.querySelectorAll("#us-search-results button")].find(b=>b.querySelector("strong")?.textContent==='+JSON.stringify(name)+'&&/^(City|Village)/.test(b.querySelector("small")?.textContent));if(!button)throw Error("Missing city search result");button.click()})()');
export default [
 {name:'one boundary job loads both levels and indexes only selected outlines',options:{width:1280,height:820},async run(page,base){
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.detailJobs=[];const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(url,options){super(url,options);if(String(url).includes('country-boundary-worker')){const post=this.postMessage.bind(this);this.postMessage=(data,...rest)=>{window.detailJobs.push(data);return post(data,...rest)}}}};`});
  await page.open(base,'#united-states');await searchAndSelect(page,'Los Angeles CA','Los Angeles','City');await ready(page);
  await page.evaluate('window.detailJobs=[]');await choose(page,'Cincinnati Ohio','Cincinnati');await ready(page);
  const jobs=await page.evaluate('window.detailJobs');
  assert.equal(jobs.length,1,'Cross-state municipality selection uses one boundary worker job');
  assert.deepEqual(jobs[0].urls,['data/europe/united-states/second/US-OH.bin','data/europe/united-states/municipalities/US-OH.bin']);
  assert.equal(jobs[0].deferOutlines,true);
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-3915000');
  assert.deepEqual(await page.evaluate('[...new Set(map.querySourceFeatures("united-states-third-outlines").map(f=>f.properties.id))]'),['US-PLACE-3915000']);
  assert.equal(await page.evaluate('map.querySourceFeatures("united-states-second-outlines").length'),0,'Unused county selection outlines are not indexed');
  assert(await page.evaluate('map.querySourceFeatures("united-states-third-edges").length>0'),'The full shared municipal border network remains present');
  await searchAndSelect(page,'Columbus OH','Columbus','City');await ready(page);
  assert.deepEqual(await page.evaluate('[...new Set(map.querySourceFeatures("united-states-third-outlines").map(f=>f.properties.id))]'),['US-PLACE-3918000']);
 }},
 {name:'rapid cross-state searches cancel obsolete batches and keep one state',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');await searchAndSelect(page,'Los Angeles CA','Los Angeles','City');await ready(page);
  await choose(page,'Cincinnati Ohio','Cincinnati');await choose(page,'Oak Park IL','Oak Park');await ready(page);
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-PLACE-1754885');
  assert(await page.evaluate('map.querySourceFeatures("united-states-third").every(f=>/^(US-PLACE-17|US-MCD-17)/.test(f.properties.id))'));
  assert(await page.evaluate('map.querySourceFeatures("united-states-second").every(f=>f.properties.id.startsWith("US-COUNTY-17"))'));
  assert.deepEqual(await page.evaluate('[...new Set(map.querySourceFeatures("united-states-third-outlines").map(f=>f.properties.id))]'),['US-PLACE-1754885']);
  for(const c of ['canada','mexico','denmark']){await page.evaluate('location.hash="#'+c+'"');await page.waitFor('AtlasEntry.current==="'+c+'"');await page.settle();}
  assert(!await page.evaluate('!!map.getSource("united-states-third")||!!map.getSource("united-states-second")'));
  assert((await page.evaluate('AtlasCountryMemory.snapshot().countries.length'))<=3);
 }}
];
