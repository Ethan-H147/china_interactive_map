import assert from 'node:assert/strict';

const coast='united-kingdom-history-coast-detail';
const dock='#united-kingdom-history-dock';
const hover = (p, point) => p.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(point)+'))?.en??null');
async function year(p, value) {
  await p.evaluate('void document.querySelector('+JSON.stringify(dock+' [data-year="'+value+'"]')+').click()');
  await p.waitFor('document.querySelector('+JSON.stringify(dock+' .election-year strong')+').textContent==="'+value+'"');
  await p.settle();
}
async function view(p, center, zoom) {
  await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom})+')');
  await p.waitFor('map.getLayer("'+coast+'")&&map.getPaintProperty("'+coast+'","fill-opacity")===1',{timeout:90000});
  await p.settle();
}

export default [{
  name:'Shared North American fills, inland borders and Newfoundland transitions',
  options:{width:1440,height:960},
  async run(p,base) {
    await p.open(base,'#united-kingdom');
    await p.evaluate('AtlasComfort.set({appearance:"light"});void document.querySelector("#historical-snapshot").click()');
    await p.waitFor('!!map.getLayer("united-kingdom-history-fill")');
    await view(p,[-73.35,40.9],8);
    for(const point of [[-73.459,40.674],[-73.21,40.703],[-73.95,40.9],[-73.94,41.13]]) {
      assert.equal(await hover(p,point),'British American colonies','The former gray patch has the colonial owner '+point);
    }
    await p.screenshot('uk-history-long-island-and-hudson-fixed');

    await year(p,1763);
    await view(p,[-63.4,45.6],6.7);
    assert.equal(await hover(p,[-63.62,44.65]),'Nova Scotia');
    assert.equal(await hover(p,[-63.15,46.24]),'St John’s Island');
    assert.equal(await hover(p,[-60.25,46.13]),'Nova Scotia');
    assert.equal(await p.evaluate('map.queryRenderedFeatures({layers:["united-kingdom-history-lines","united-kingdom-history-frontiers"]}).length'),0,'Obsolete coarse border strokes are replaced');
    const nearShore=[[-63.94,44.52],[-63.6,44.4],[-62.7,44.7]];
    assert(!await p.evaluate('('+((points)=>points.some(point=>map.queryRenderedFeatures(map.project(point),{
      layers:['united-kingdom-history-coast-lines','united-kingdom-history-coast-frontiers']
    }).length)).toString()+')('+JSON.stringify(nearShore)+')'),'Open coastal water has no historical borders');
    await p.screenshot('uk-history-maritimes-shared-geometry');
    await year(p,1784);
    assert.equal(await hover(p,[-60.25,46.13]),'Cape Breton Island');
    await p.evaluate('void map.jumpTo({zoom:5})');
    await p.settle();
    await p.evaluate('(()=>{const control=document.querySelector("#gb-province-layer");control.checked=false;control.dispatchEvent(new Event("change"));})()');
    await view(p,[-63.4,45.6],6.7);
    assert.equal(await p.evaluate('map.getLayoutProperty("united-kingdom-history-coast-lines","visibility")'),'none','New detailed borders respect the outline setting');
    await p.evaluate('(()=>{const control=document.querySelector("#gb-province-layer");control.checked=true;control.dispatchEvent(new Event("change"));})()');
    await p.settle();
    assert.equal(await p.evaluate('map.getLayoutProperty("united-kingdom-history-coast-lines","visibility")'),'visible');
    await year(p,1820);
    assert.equal(await hover(p,[-60.25,46.13]),'Nova Scotia');

    await year(p,1713);
    await view(p,[-57.5,51],6.4);
    assert.equal(await hover(p,[-56,49]),'Newfoundland');
    assert.notEqual(await hover(p,[-56.4,51.78]),'Newfoundland','An island-only frame excludes Labrador');
    await year(p,1763);
    await view(p,[-61,54.5],5.6);
    assert.equal(await hover(p,[-61.8,56.5]),'Newfoundland and Labrador');
    await year(p,1774);
    assert.equal(await hover(p,[-61.8,56.5]),'Province of Quebec');
    await year(p,1809);
    assert.equal(await hover(p,[-61.8,56.5]),'Newfoundland and Labrador');
    await year(p,1926);
    assert.equal(await hover(p,[-62,53]),'Dominion of Canada');
    await year(p,1927);
    assert.equal(await hover(p,[-62,53]),'Dominion of Newfoundland');
    await p.screenshot('uk-history-newfoundland-labrador-shared-geometry');
    await year(p,1949);
    assert.equal(await hover(p,[-56,49]),null,'Newfoundland leaves the imperial timeline on joining Canada');
    assert(await p.evaluate('mapScene.assertOrder()'));
  }
}];
