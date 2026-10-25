import assert from 'node:assert/strict';
export default [true,false].map(mobile=>({name:(mobile?'phone':'desktop')+' keeps subdivision geometry scoped and every place searchable',options:{width:mobile?390:1280,height:844,mobile},async run(page,base){
 await page.open(base,'#france');
 for(const id of ['france','germany','poland','estonia','latvia','lithuania','united-kingdom','south-africa','korea','mongolia']){
  const start=page.requests.length;
  if(id!=='france'){assert(await page.evaluate(`changeAtlas('${id}',false)`));await page.settle();}
  assert(!page.requests.slice(start).some(url=>/\/all\.bin|(?:korea|mongolia)-(?:boundaries|motion)\.bin/.test(url)),id+' never loads every subdivision at once');
  if(id==='korea'||id==='mongolia'){
   assert.equal(await page.evaluate(`map.querySourceFeatures('${id}-second').length`),0);
   const prefix=id==='korea'?'k':'m';
   const chosen=await page.evaluate(`(()=>{const p=document.querySelector('#${prefix}-province option[value]:not([value=""])');return p.value;})()`);
   await page.evaluate(`(()=>{const select=document.getElementById('${prefix}-province');select.value=${JSON.stringify(chosen)};select.dispatchEvent(new Event('change'));})()`);
   await page.waitFor(`map.querySourceFeatures('${id}-second').length>0`);await page.settle();
   assert((await page.evaluate(`map.querySourceFeatures('${id}-second').map(f=>f.properties.parent)`)).every(p=>p===chosen),id+' contains only the selected parent');
  }else{
   assert(!await page.evaluate(`!!map.getSource('${id}-second')`),id+' opens with first-level geometry');
   const config=await page.evaluate(`AtlasCountries.countries['${id}']`),prefix=config.prefix;
   const chosen=await page.evaluate(`document.querySelector('#${prefix}-province option[value]:not([value=""])').value`);
   await page.evaluate(`(()=>{const select=document.getElementById('${prefix}-province');select.value=${JSON.stringify(chosen)};select.dispatchEvent(new Event('change'));})()`);
   await page.waitFor(`!!map.getSource('${id}-second')&&map.isSourceLoaded('${id}-second')`);await page.settle();
   assert((await page.evaluate(`(async()=>{const {loadCompressed}=await import('./korea-data.mjs');const c=await loadCompressed('data/'+(${JSON.stringify(id)}==='south-africa'?'southern-africa/':'europe/')+${JSON.stringify(id)}+'/catalogue.bin'),parents=new Map(c.records.map(r=>[r.id,r.parent]));return map.querySourceFeatures('${id}-second').map(f=>parents.get(f.properties.id));})()`)).every(p=>p===chosen),id+' contains only the selected parent');
  }
 }
}}));

