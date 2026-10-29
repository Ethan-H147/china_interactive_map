import assert from 'node:assert/strict';

async function scope(page,code,parent){
 await page.evaluate(`selectRegion(regionByCode.get(${code}),${parent},true)`);
 await page.waitFor(`chinaCountyScope.loaded===${code}`);await page.settle();
 const data=await page.evaluate(`map.querySourceFeatures('city-districts').map(f=>f.properties)`);
 assert(data.length,'County fills are rendered');assert(data.every(p=>p.parentCity===code),'Only the selected area is indexed');
}
export default [
 ...[true,false].map(mobile=>({name:(mobile?'phone':'desktop')+' loads exact China sources and one county area; switching releases geometry',options:{width:mobile?390:1280,height:844,mobile},async run(page,base){
  await page.open(base,'#china');
  assert.equal(await page.evaluate('AtlasEntry.lowMemory'),mobile);
  assert.equal(await page.evaluate('maplibregl.getWorkerCount()'),mobile?1:2);
  assert.equal(await page.evaluate('AtlasCountryMemory.snapshot().limit'),mobile?1:3);
  assert.equal(await page.evaluate('chinaCounties'),true,'Every county remains searchable');
  assert.equal(await page.evaluate('chinaCountyScope.loaded'),null);
  assert(!page.requests.some(url=>/china-(?:boundaries|overview|counties)\.pack\.bin|china-mobile\/counties\//.test(url)),'Opening China does not download country-wide packs or county shapes');
  if(mobile)assert(!page.requests.some(url=>url.includes('/europe/')&&url.endsWith('/context.bin')),'Unused country previews remain unloaded');
  assert.equal(await page.evaluate("map.getLayer('province-selection').source"),'provinces-selection-edges','Selection shares the outline profile');
  await page.evaluate('selectRegion(provinceLayers.get(220000),220000,true)');await page.settle();
  assert((await page.evaluate("map.queryRenderedFeatures({layers:['province-selection']}).length"))>0,'Jilin uses its exterior, not the internal repair triangles');
  await scope(page,510100,510000);
  await scope(page,440300,440000);
  await page.evaluate('selectRegion(regionByCode.get(510100),510000,false);selectRegion(regionByCode.get(440100),440000,false);selectRegion(regionByCode.get(440300),440000,false)');
  await page.waitFor('chinaCountyScope.loaded===440300');await page.settle();
  await page.evaluate('selectRegion(provinceLayers.get(440000),440000,false)');
  await page.waitFor('chinaCountyScope.loaded===null');await page.settle();
  assert.equal(await page.evaluate("map.getSource('city-districts').serialize().data.features.length"),0,'Leaving county detail releases it');
  for(const country of ['korea','japan','mongolia','china']){
   assert(await page.evaluate(`changeAtlas('${country}',false)`));await page.settle();
   const memory=await page.evaluate('AtlasCountryMemory.snapshot()');assert.equal(memory.active,country);assert(memory.countries.length<=(mobile?1:3));
   if(mobile||country==='mongolia'||country==='china')assert.equal(await page.evaluate("!!map.getSource('provinces')"),country==='china');
  }
  await page.evaluate('location.hash="#china/place=510104"');
  await page.waitFor('selected?.layer.feature.properties.adcode===510104&&chinaCountyScope.loaded===510100');await page.settle();
  assert.equal(await page.evaluate("map.getFeatureState({source:'city-districts',id:510104}).selected"),true);
  await page.screenshot('china-county-'+(mobile?'phone':'desktop'));
 }})),
 {name:'mobile world hit targets open unloaded countries and failed switches recover',options:{width:390,height:844,mobile:true},async run(page,base){
  await page.open(base,'#china');await page.evaluate('void map.jumpTo({center:[25,64],zoom:6})');await page.settle();
  assert.equal(await page.evaluate('countryAt(map.project([25,64]))?.country'),'finland');
  assert(await page.evaluate('changeAtlas("finland",false)'));await page.settle();
  assert.deepEqual(await page.evaluate('AtlasCountryMemory.snapshot().countries.map(r=>r.id)'),['finland']);
  assert(await page.evaluate('changeAtlas("botswana",false)'));await page.settle();
  assert.equal(await page.evaluate(`(async()=>{const add=map.addSource.bind(map);map.addSource=(id,options)=>{if(id==='prefectures')throw Error('Simulated boundary load failure');return add(id,options);};try{return await changeAtlas('china',false);}finally{map.addSource=add;}})()`),false);await page.settle();
  assert.equal(await page.evaluate('atlasMode'),'botswana');
  assert.deepEqual(await page.evaluate('AtlasCountryMemory.snapshot().countries.map(r=>r.id)'),['botswana']);
  assert(await page.evaluate('changeAtlas("china",false)'));await page.settle();
 }},
];
