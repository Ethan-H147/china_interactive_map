
import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
async function check(page,country){
 const state=await page.evaluate('AtlasCountryMemory.snapshot()');
 assert(state.countries.length<=3,'At most three detailed countries reside in memory');
 assert.equal(state.active,country);assert(state.countries.some(r=>r.id===country));
 assert(await page.evaluate('mapScene.assertOrder()'));
 return state.countries.map(r=>r.id);
}
async function go(page,country){
 const changed=await page.evaluate('changeAtlas('+JSON.stringify(country)+',true)');if(!changed)throw Error('Switch to '+country+' failed: '+page.warnings.join(' | '));
 try{await page.waitFor('!countrySwitching&&AtlasEntry.current==='+JSON.stringify(country));}catch(e){throw Error(e.message+' '+JSON.stringify(await page.evaluate('({memory:AtlasCountryMemory.snapshot(),mode:atlasMode,failed:countryLoadFailed,source:!!map.getSource("provinces")})'))+' '+page.warnings.join(' | '));}await page.settle();return check(page,country);
}
export default [
 {name:'China and legacy adapters unload and reload after the fourth country',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');await page.waitFor('chinaCounties');await check(page,'china');
  await searchAndSelect(page,'Jinjiang','Jinjiang','District');
  await go(page,'korea');await searchAndSelect(page,'Busan','Busan');
  await go(page,'mongolia');await searchAndSelect(page,'Darkhan','Darkhan');
  await go(page,'japan');assert.equal(await page.evaluate('!!map.getSource("provinces")'),false,'China geometry is released');
  assert.equal(await page.evaluate('regionIndex.length'),0,'China search records are released');await searchAndSelect(page,'Osaka','Osaka');
  await go(page,'china');await page.waitFor('chinaCounties');await searchAndSelect(page,'Jinjiang','Jinjiang','District');
  await go(page,'korea');await searchAndSelect(page,'Busan','Busan');await go(page,'mongolia');await searchAndSelect(page,'Darkhan','Darkhan');
  await go(page,'japan');await searchAndSelect(page,'Osaka','Osaka');
  await page.evaluate('location.hash="#china/place=510104"');await page.waitFor('!countrySwitching&&selected?.layer.feature.properties.adcode===510104');await page.settle();await check(page,'china');
 }},
 {name:'regional, island and South American adapters share one three-country budget',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#denmark');
  const visits=[['denmark','Copenhagen','Copenhagen'],['singapore','Tampines','Tampines'],['philippines','Cebu','Cebu'],['brazil','Curitiba','Curitiba'],['botswana','Francistown','Francistown'],['russia','Novosibirsk','Novosibirsk']];
  const counts=[];for(let round=0;round<2;round++){for(const [id,query,pick]of visits){await go(page,id);await searchAndSelect(page,query,pick);await check(page,id);}counts.push(await page.evaluate('Object.keys(map.getStyle().sources).length'));}assert.equal(counts[1],counts[0],'Repeated visits do not accumulate map sources');
  assert.equal(await page.evaluate('!!map.getSource("denmark-first")'),false);
  await page.screenshot('country-memory-after-repeated-switching');
 }},
 {name:'failed fourth-country load preserves the active country and retries within budget',options:{width:1280,height:820},async run(page,base){
  await page.open(base,'#china');await go(page,'korea');await go(page,'denmark');
  await page.send('Network.setBlockedURLs',{urls:['*archipelago/philippines-*']});
  const changed=await page.evaluate('changeAtlas("philippines",false)');assert.equal(changed,false);await page.settle();await check(page,'denmark');
  assert.equal(await page.evaluate('!!map.getSource("provinces")'),false);
  assert(!(await page.evaluate('AtlasCountryMemory.snapshot().countries')).some(r=>r.id==='philippines'));
  page.failures.length=0;page.problems.length=0;await page.send('Network.setBlockedURLs',{urls:[]});
  await go(page,'philippines');await searchAndSelect(page,'Cebu','Cebu');await check(page,'philippines');
 }}

];
