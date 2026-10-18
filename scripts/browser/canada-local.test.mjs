import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {searchAndSelect as pick} from './countries.test.mjs';
const stats=JSON.parse(fs.readFileSync('dist/data/europe/canada/statistics.json')),facts=JSON.parse(fs.readFileSync('dist/data/europe/canada/municipalities/facts.json'));
const ready=async p=>{await p.waitFor('document.getElementById("canada-sidebar").getAttribute("aria-busy")!=="true"',{timeout:45000});await p.settle();};
const choose=async(p,q,name,kind='City')=>{await pick(p,q,name,kind);await ready(p);};
const value=async(p,id)=>{await p.waitFor('document.querySelector("#canada-sidebar .archipelago-population:not([hidden]) .population-total")?.textContent==='+JSON.stringify(stats.regions['canada:'+id].population.value.toLocaleString('en-US')));};
export default [
 {name:'Canadian municipal population, hierarchy and flags use the selected government',options:{width:1280,height:820},async run(p,base){
  await p.open(base,'#canada');await ready(p);assert(!p.requests.some(u=>/canada\/(?:second|third)\//.test(u)),'No detail download at national entry');assert(!p.requests.some(u=>u.includes('canada-municipal-flags/')));
  await choose(p,'Toronto ON','Toronto');await value(p,'CA-CSD-3520005');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'CA-CSD-3520005');
  assert(await p.evaluate('document.querySelector("#canada-sidebar .archipelago-population").textContent.includes("1 July 2025")'));
  await p.waitFor('document.getElementById("ca-detail-flag").complete&&document.getElementById("ca-detail-flag").naturalWidth>0');
  await p.tap('#ca-detail-flag-source');await p.waitFor('document.getElementById("flag-viewer").open');assert.equal(await p.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),facts.records['CA-CSD-3520005'].flag.full);await p.key('Escape');
  await p.screenshot('canada-toronto-municipal-population');
  await choose(p,'Montréal Quebec','Montréal');await value(p,'CA-CSD-2466023');assert(await p.evaluate('document.getElementById("ca-flag").naturalWidth>0'),'Quebec’s existing provincial flag remains');
  await choose(p,'Hamilton Township Ontario','Hamilton','Township');await value(p,'CA-CSD-3514019');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'CA-CSD-3514019','Hamilton township stays distinct from Hamilton city');
 }},
 {name:'Canadian search changes one province and one division of detail at a time',options:{width:1280,height:820},async run(p,base){
  await p.open(base,'#canada');await choose(p,'Vancouver BC','Vancouver');await value(p,'CA-CSD-5915022');
  await choose(p,'Ottawa Ontario','Ottawa');await value(p,'CA-CSD-3506008');
  const sources=await p.evaluate('Object.keys(map.getStyle().sources).filter(s=>/^canada-(second|third)$/.test(s))');assert.deepEqual(sources.sort(),['canada-second','canada-third']);
  assert(!await p.evaluate('!!map.getSource("canada-third-outlines")&&map.getSource("canada-third-outlines")._data?.features?.length>10'),'Only the selected municipal outline is indexed');
  for(const [q,kind,id]of [['Langley District municipality BC','District municipality','CA-CSD-5915001'],['Langley City BC','City','CA-CSD-5915002']]){
   await choose(p,q,'Langley',kind);await value(p,id);await p.waitFor('document.getElementById("ca-detail-flag").complete&&document.getElementById("ca-detail-flag").naturalWidth>0');assert.equal(await p.evaluate('document.getElementById("ca-detail-flag").getAttribute("src")'),facts.records[id].flag.file);
   await p.tap('#ca-detail-flag-source');await p.waitFor('document.getElementById("flag-viewer").open');assert.equal(await p.evaluate('document.getElementById("flag-viewer-image").getAttribute("src")'),facts.records[id].flag.full);await p.key('Escape');
  }
  await p.tap('#mode-lock');assert.equal(await p.evaluate('document.getElementById("mode-lock").getAttribute("aria-pressed")'),'true');
 }},
 {name:'Canadian phone deep links, flags and three-country memory cap survive reload',options:{width:390,height:844,mobile:true},async run(p,base){
  await p.open(base,'#canada');await choose(p,'Calgary Alberta','Calgary');await value(p,'CA-CSD-4806016');await p.screenshot('canada-calgary-municipal-phone');
  const hash=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,hash);await p.send('Page.reload');await ready(p);await value(p,'CA-CSD-4806016');
  for(const c of ['mexico','denmark','united-states']){await p.evaluate('location.hash="#'+c+'"');await p.waitFor('AtlasEntry.current==="'+c+'"');await p.settle();}
  assert((await p.evaluate('AtlasCountryMemory.snapshot().countries.length'))<=3);
  await p.evaluate('location.hash="#canada"');await p.waitFor('AtlasEntry.current==="canada"');await ready(p);await choose(p,'Toronto ON','Toronto');await value(p,'CA-CSD-3520005');
 }}
];
