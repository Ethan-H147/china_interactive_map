import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchAndSelect as pick} from './countries.test.mjs';
const facts=JSON.parse(fs.readFileSync('dist/data/europe/united-states/municipalities/facts.json'));
const ready=async page=>{await page.waitFor('document.getElementById("united-states-sidebar").getAttribute("aria-busy")!=="true"',{timeout:45000});await page.settle();};
const choose=async(page,query,name,kind)=>{await pick(page,query,name,kind);await ready(page);};
const population=async(page,value)=>{await page.waitFor('[...document.querySelectorAll("#united-states-sidebar .archipelago-population:not([hidden]) .population-total")].some(e=>e.textContent==='+JSON.stringify(value.toLocaleString('en-US'))+')');};
export default [
 {name:'whole-government populations, date and source stay attached to the selected city',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');await choose(page,'New York NY','New York','City');await population(page,8584629);
  assert(await page.evaluate('document.querySelector("#united-states-sidebar .archipelago-population").textContent.includes("1 July 2025")'));
  assert(await page.evaluate('document.querySelector("#united-states-sidebar .archipelago-population a").href.includes("sub-est2025.csv")'));
  assert(await page.evaluate('document.getElementById("us-municipal-card").hidden'),'Ranked cities reuse the shared statistics cards');
  await page.screenshot('us-new-york-municipal-population');
  await choose(page,'Hempstead town New York','Hempstead','Town');await population(page,795734);
  await choose(page,'Louisville KY','Louisville/Jefferson County','Consolidated city');await population(page,795222);
  assert.equal(await page.evaluate('currentAtlas().getSelection()'),'US-CONCITY-2148003');
  await choose(page,'Oak Park IL','Oak Park','Village');
  assert(await page.evaluate('!document.querySelector("#united-states-sidebar .archipelago-population:not([hidden])")'),'Below-cutoff places never inherit the preceding city population');
  assert(await page.evaluate('!document.getElementById("us-municipal-card").hidden'));
 }},
 {name:'municipal flags load only for the selection and open the exact original',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#united-states');
  assert(!page.requests.some(u=>u.includes('/us-municipal-flags/')),'No municipal image batch on entry');
  await ready(page);await page.tap('#us-search');await page.type('Chicago');
  await page.waitFor('document.querySelector("#us-search-results button strong")?.textContent==="Chicago"');
  assert((await page.evaluate('document.querySelector("#us-search-results button").textContent')).includes('City'),'Named cities precede ZIP and phone-code aliases');
  await page.key('Enter');await ready(page);await population(page,2731585);
  const flag=facts.records['US-PLACE-1714000'].flag;assert(flag);
  await page.waitFor('document.getElementById("us-detail-flag").complete&&document.getElementById("us-detail-flag").naturalWidth>0');
  assert.equal(await page.evaluate('document.getElementById("us-detail-flag").getAttribute("src")'),flag.file);
  await page.tap('#us-detail-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');
  assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),flag.full);await page.key('Escape');
  await page.screenshot('us-chicago-official-flag');
  for(const [query,name,id] of [['Seattle WA','Seattle','US-PLACE-5363000'],['Fargo ND','Fargo','US-PLACE-3825700'],['Cranston RI','Cranston','US-PLACE-4419180']]){
   await choose(page,query,name,'City');await population(page,facts.records[id].population);
   await page.waitFor('document.getElementById("us-detail-flag").complete&&document.getElementById("us-detail-flag").naturalWidth>0');
   assert.equal(await page.evaluate('document.getElementById("us-detail-flag").getAttribute("src")'),facts.records[id].flag.file);
   await page.tap('#us-detail-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');
   assert.equal(await page.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),facts.records[id].flag.full);await page.key('Escape');
  }
  await choose(page,'Boulder CO','Boulder','City');
  assert(await page.evaluate('document.getElementById("us-detail-flag-source").hidden'),'A map illustration must never appear as the city flag');
 }},
 {name:'phone population cards and municipal flags survive reload and country eviction',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#united-states');await choose(page,'Los Angeles CA','Los Angeles','City');await population(page,3869089);
  await page.tap('#us-detail-flag-source');await page.waitFor('document.getElementById("flag-viewer").open');await page.key('Escape');
  const hash=await page.evaluate('AtlasView.hashFor(captureView())');await page.open(base,hash);await page.send('Page.reload');await ready(page);await population(page,3869089);
  await page.screenshot('us-municipal-population-phone');
  for(const country of ['canada','mexico','denmark']){await page.evaluate('location.hash="#'+country+'"');await page.waitFor('AtlasEntry.current==="'+country+'"');await page.settle();}
  assert((await page.evaluate('AtlasCountryMemory.snapshot().countries.length'))<=3);
  await page.evaluate('location.hash="#united-states"');await page.waitFor('AtlasEntry.current==="united-states"');await page.settle();
  await choose(page,'Los Angeles CA','Los Angeles','City');await population(page,3869089);
 }}
];
