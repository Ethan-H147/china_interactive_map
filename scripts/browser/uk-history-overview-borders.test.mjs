import assert from 'node:assert/strict';

const dock='#united-kingdom-history-dock';
const baseLayers=['united-kingdom-first-lines','united-kingdom-first-lines'];
const detailLayers=['united-kingdom-first-lines','united-kingdom-first-lines'];
const coastline='united-kingdom-first';
const borderPoint=[-67.475207,47.896854];

export default [{
  name:'Historical coastal strokes stay absent below and across the detail threshold',
  options:{width:1440,height:960},
  async run(p,base) {
    await p.open(base,'#united-kingdom');
    await p.evaluate('AtlasComfort.set({appearance:"light"});void document.querySelector("#historical-snapshot").click()');
    await p.waitFor('map.getSource("united-kingdom-first")?.type==="vector"');
    await p.evaluate('void document.querySelector('+JSON.stringify(dock+' [data-year="1763"]')+').click()');
    await p.waitFor('document.querySelector('+JSON.stringify(dock+' .election-year strong')+').textContent==="1763"');
    for(const zoom of [3.5,4.5,5.4,5.6,6.7,5.4,4.5]) {
      await p.evaluate('void map.jumpTo('+JSON.stringify({center:[-61.2,48],zoom})+')');
      await p.settle();
      assert.equal(await p.evaluate('map.getSource("united-kingdom-first").type'),'vector','One tiled source spans every zoom');
      const lines=await p.evaluate('(()=>{const ids='+JSON.stringify([...baseLayers,...detailLayers])+'.filter(id=>map.getLayer(id));return map.queryRenderedFeatures({layers:ids}).filter(f=>f.layer.paint["line-opacity"]>0).map(f=>f.properties)})()');
      assert(!lines.some(line=>line.selectionOnly),'Discarded coarse coastline strokes never render at zoom '+zoom);
      assert(!lines.some(line=>line.coast===true),'Physical coastlines have no administrative strokes at zoom '+zoom);
      if(zoom>=4.5 && zoom<=5.6) {
        assert(await p.evaluate('(()=>{const point=map.project('+JSON.stringify(borderPoint)+');const layers='+
          JSON.stringify([...baseLayers,...detailLayers])+'.filter(id=>map.getLayer(id));return map.queryRenderedFeatures([[point.x-4,point.y-4],[point.x+4,point.y+4]],{layers}).filter(f=>f.layer.paint["line-opacity"]>0).length>0})()'),
          'The Quebec–Nova Scotia inland border stays visible at zoom '+zoom);
      }
      if(zoom===4.5||zoom===5.4)await p.screenshot('uk-history-overview-clean-coasts-'+zoom);
    }
    assert(await p.evaluate('mapScene.assertOrder()'));
  }
}];
