import assert from 'node:assert/strict';

export default ['china','antarctica','japan'].map(country=>({
 name:'Interactive overview before detail for '+country,
 options:{width:country==='china'?1200:390,height:800,mobile:country!=='china'},
 async run(p,base){
  await p.send('Fetch.enable',{patterns:[{urlPattern:country==='antarctica'?'*facilities.json*':'*shared-context-borders.bin*'}]});
  try{
   await p.send('Page.navigate',{url:base+'/#'+country});
   await p.waitFor('document.getElementById("map-loading")?.hidden && !!window.AtlasEntry?.map?.getLayer("globe-overview-land")');
   const count=await p.evaluate('AtlasEntry.map.queryRenderedFeatures({layers:["globe-overview-land"]}).length');
   assert(count>0,'Existing overview rendered before detail');
   assert(await p.evaluate('!!document.documentElement.dataset.starting'));
   await p.evaluate('void AtlasEntry.map.panBy([20,0],{duration:0},{originalEvent:new Event("pointermove")})');
  }finally{await p.send('Fetch.disable');}
  const camera=await p.evaluate('AtlasEntry.previewCamera');
  await p.settle();
  const final=await p.evaluate('({country:atlasMode,overview:!!map.getLayer("globe-overview-land"),zoom:map.getZoom(),center:map.getCenter()})');
  assert.equal(final.country,country);assert(final.overview);
  assert(Math.abs(final.center.lng-camera.center.lng)<.01,'Initial pan survives detail loading');
  assert(Math.abs(final.zoom-camera.zoom)<.01,'Initial zoom survives detail loading');
 }
}));
