import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'Country names appear across adapters and Chile stays on its land '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#south-africa');
 for(const [id,point]of [['russia',[100,61]],['mongolia',[103.8,46.8]],['china',[104,35]],['KP',[126.5,40.7]],['KR',[127.8,35.4]],['japan',[138.4,36.5]],['indonesia',[113.5,-1]],['chile',[-72.45,-37]]]){
  await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:5})');await p.settle();
  assert.equal(await p.evaluate('document.querySelectorAll(\'[data-atlas-place="'+id+'"][data-atlas-country-label]\').length'),1,id+' has exactly one visible country label');
 }
 await p.screenshot('country-labels-chile-'+width);
 await p.evaluate('void map.jumpTo({center:[110,40],zoom:2.5})');await p.settle();if(width===1280)for(const id of ['KP','KR'])assert.equal(await p.evaluate('document.querySelectorAll(\'[data-atlas-place="'+id+'"][data-atlas-country-label]\').length'),1,'Both Korean country names fit at overview scale');await p.screenshot('country-labels-asia-'+width);
 await p.evaluate('location.hash="#mongolia"');await p.waitFor('AtlasEntry.current==="mongolia"');await p.settle();
 assert.equal(await p.evaluate('document.querySelectorAll(\'[data-atlas-place="mongolia"][data-atlas-country-label]\').length'),0,'Opening a country replaces its background label with subdivision labels');
 assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
}}));
