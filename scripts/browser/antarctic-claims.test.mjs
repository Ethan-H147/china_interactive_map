import assert from 'node:assert/strict';
const points=[['norway',[14,-76]],['australia',[80,-75]],['new-zealand',[170,-84]]];
export default [{name:'Antarctic wedges belong only to the selected claimant; a neutral click opens Antarctica',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#antarctica');await p.waitFor('currentAtlas()?.ready&&AtlasEntry.current==="antarctica"');
 for(const [country,point] of points){
  assert(await p.evaluate('changeAtlas('+JSON.stringify(country)+',false)'));
  await p.evaluate('void map.jumpTo('+JSON.stringify({center:point,zoom:3})+')');await p.settle();
  assert.equal(await p.evaluate('countryAt(map.project('+JSON.stringify(point)+'))?.country'),country,'The open claimant keeps its existing sector');
  await p.screenshot('antarctic-claim-'+country);
 }
 assert(await p.evaluate('changeAtlas("bahrain",false)'));await p.evaluate('void map.jumpTo({center:[80,-75],zoom:3})');await p.settle();
 assert.equal(await p.evaluate('countryAt(map.project([80,-75]))?.country'),'antarctica','An inactive Australian sector cannot intercept the click');
 const click=await p.evaluate('(()=>{const p=map.project([80,-75]),b=map.getCanvas().getBoundingClientRect();return [p.x+b.x,p.y+b.y]})()');await p.tap(click);
 await p.waitFor('AtlasEntry.current==="antarctica"&&currentAtlas()?.ready&&!countrySwitching');await p.settle();
 for(const [,point]of points)assert.equal(await p.evaluate('countryAt(map.project('+JSON.stringify(point)+'))?.country'),'antarctica','The Antarctica map has one continental identity');
 const claimed=await p.evaluate('map.queryRenderedFeatures({layers:["globe-overview-land"]}).filter(f=>f.properties.claimants).map(f=>f.properties.claimants)');assert.deepEqual(claimed,[],'No claimant wedges render on the Antarctica map');
 await p.screenshot('antarctica-neutral-routing');
}}];
