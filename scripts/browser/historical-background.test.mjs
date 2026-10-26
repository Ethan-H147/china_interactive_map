import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'Historical land replaces modern gray shapes at every zoom '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 for(const [country,center]of [['china-1949',[110,35]],['soviet-union-1988',[68,41]]]){
  await p.open(base,'#'+country);
  for(const projection of ['mercator','globe'])for(const zoom of [2,3.6,5.6,2]){
   await p.evaluate('map.setProjection({type:'+JSON.stringify(projection)+'});map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'});void 0');await p.settle();
   await p.waitFor('map.getLayoutProperty('+JSON.stringify(country+'-first-fill')+',"visibility")==="visible"');
   const layers=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(center)+');return map.queryRenderedFeatures(q).map(f=>({id:f.layer.id,country:f.properties.country}))})()');assert(layers.some(l=>l.id===country+'-first-fill'),country+' historical land is drawn in '+projection+' at zoom '+zoom);
   const replaces=await p.evaluate('AtlasCountries.countries['+JSON.stringify(country)+'].snapshot.replaces');assert(!layers.some(l=>l.id==='globe-overview-land'&&replaces.includes(l.country)),'Modern gray country is suppressed beneath the historical fill');
   if(zoom===2)await p.screenshot('historical-background-'+country+'-'+projection+'-'+width);
  }
 }
 await p.evaluate("changeAtlas('russia',false)");await p.settle();assert.notEqual(await p.evaluate('map.getLayoutProperty("soviet-union-1988-first-fill","visibility")'),'visible');assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
}}));
