import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
// Unreleased countries stay out of reach and out of the network until developer mode,
// which opens from Changning by typing "dev mode"; then each loads to its deepest level.
const desktop={width:1280,height:820};
const unreleased=['united-kingdom','spain','france','italy'];
const europeRequests=page=>page.requests.filter(u=>/\/data\/europe\//.test(u));

export default [
 {name:'public visitors cannot open or download unreleased countries',options:desktop,async run(page,base){
  for(const country of unreleased){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),'china',country+' falls back to China');
  }
  await page.evaluate(`location.hash='#korea'`);await page.settle();
  assert.deepEqual(europeRequests(page),[],'No European data is requested');
 }},
 {name:'Changning unlocks developer mode',options:desktop,async run(page,base){
  await page.open(base,'#china');
  await searchAndSelect(page,'Changning','Changning','Shanghai');
  assert.equal(await page.evaluate(`selected?.layer.feature.properties.adcode`),310105,'Shanghai Changning is selected');
  await page.evaluate(`document.activeElement?.blur()`);
  await page.type('dev mode');
  await page.waitFor(`document.getElementById('developer-dialog')?.open`,{label:'the developer dialog'});
  await page.tap('.developer-continue');
  assert.equal(await page.evaluate('AtlasDev.enabled'),true);
  await page.evaluate(`location.hash='#italy'`);await page.settle();
  assert.equal(await page.evaluate('AtlasEntry.current'),'italy','Italy opens in developer mode');
 }},
 ...[['italy','Bergamo','Bergamo','Comune'],['spain','Llívia','Llívia','Municipality'],['france','Fleury-devant','Fleury-devant-Douaumont','Commune'],['united-kingdom','Maidstone','Maidstone','District'],['united-kingdom','Cardiff','Cardiff','built-up area']].map(([country,query,pick,kind])=>({
  name:`${country}: ${pick} (${kind})`,options:{...desktop,developer:true},async run(page,base){
   await page.open(base,'#'+country);
   assert.equal(await page.evaluate('AtlasEntry.current'),country);
   await searchAndSelect(page,query,pick,kind);
   assert(await page.evaluate(`[...document.querySelectorAll('aside.sidebar')].find(a=>!a.hidden&&getComputedStyle(a).display!=='none').innerText.includes('Population')`),'The statistics card shows');
  }}))
];
