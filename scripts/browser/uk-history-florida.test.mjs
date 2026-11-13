import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeData} from '../../dist/geo-pack.mjs';
import {polygons} from '../geo-index.mjs';

const dock='#united-kingdom-history-dock';
const detail='united-kingdom-history-coast-detail';
const modern=await decodeData(fs.readFileSync('dist/data/europe/united-states/first.bin'));
const shoreline=polygons(modern.regions.features.find(f=>f.properties.id==='US-FL').geometry)
  .flatMap(p=>p[0]).filter(p=>p[1]>25 && p[1]<30);
const samples=shoreline.filter((_,i)=>i%Math.max(1,Math.floor(shoreline.length/160))===0);
const hover=(p,point)=>p.evaluate('currentAtlas().hoverAt(map.project('+JSON.stringify(point)+'))?.en??null');
async function year(p,value){
  await p.evaluate('void document.querySelector('+JSON.stringify(dock+' [data-year="'+value+'"]')+').click()');
  await p.waitFor('document.querySelector('+JSON.stringify(dock+' .election-year strong')+').textContent==="'+value+'"');
  await p.settle();
}

export default [{
  name:'Georgia meets dated East and West Florida without wedges or coastal strokes',
  options:{width:1440,height:960},
  async run(p,base){
    await p.open(base,'#united-kingdom');
    await p.evaluate('AtlasComfort.set({appearance:"light"});void document.querySelector("#historical-snapshot").click()');
    await p.waitFor('!!map.getLayer("united-kingdom-history-fill")');
    await year(p,1775);
    for(const zoom of [5.2,5.6,6.5,7.1,5.2]){
      await p.evaluate('void map.jumpTo('+JSON.stringify({center:zoom>=7?[-86,31.3]:[-84.7,30.5],zoom})+')');
      if(zoom>=7)await p.waitFor('map.getLayer("'+detail+'")&&map.getPaintProperty("'+detail+'","fill-opacity")===1',{timeout:90000});
      await p.settle();
      for(const point of [[-83.28,30.83],[-84.15,31.58],[-84.6,32]])
        assert.equal(await hover(p,point),'Thirteen Colonies','Georgia has no unassigned wedge at '+point+' zoom '+zoom);
      for(const point of [[-81.65,30.1],[-84.28,30.44],[-85.3,31.9]])
        assert.equal(await hover(p,point),'East and West Florida','The dated Florida extent owns '+point+' zoom '+zoom);
      const stray=await p.evaluate('('+((points)=>{
        const layers=['united-kingdom-history-lines','united-kingdom-history-frontiers',
          'united-kingdom-history-coast-lines','united-kingdom-history-coast-frontiers'].filter(id=>map.getLayer(id));
        const canvas=map.getCanvas(),width=canvas.clientWidth,height=canvas.clientHeight;
        return points.filter(point=>{const q=map.project(point);
          return q.x>360&&q.x<width-60&&q.y>110&&q.y<height-160&&
            map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]],{layers}).length;
        });
      }).toString()+')('+JSON.stringify(samples)+')');
      assert.deepEqual(stray,[],'Florida physical coasts have no blue administrative strokes at zoom '+zoom);
      const borders=['united-kingdom-history-lines','united-kingdom-history-frontiers',
        'united-kingdom-history-coast-lines','united-kingdom-history-coast-frontiers'];
      for(const [point,present]of [[[-88,31],false],[[-88,32+28/60],true]]){
        const drawn=await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');const layers='+JSON.stringify(borders)+'.filter(id=>map.getLayer(id));return map.queryRenderedFeatures([[q.x-'+(present?4:2)+',q.y-'+(present?4:2)+'],[q.x+'+(present?4:2)+',q.y+'+(present?4:2)+']],{layers}).length>0})()');
        assert.equal(drawn,present,'Only the current West Florida boundary is drawn at '+point+' zoom '+zoom);
      }
      assert.equal(await hover(p,[-88,31.001]),'East and West Florida','The old survey join belongs to Florida at every zoom');
      await p.screenshot('uk-history-florida-clean-'+zoom);
    }
    await p.evaluate('void map.jumpTo({center:[-89,32],zoom:5.3})');await p.settle();
    await year(p,1763);
    assert.equal(await hover(p,[-89.5,31.7]),'Thirteen Colonies','The initial West Florida limit stays at latitude 31');
    await year(p,1764);
    assert.equal(await hover(p,[-89.5,31.7]),'East and West Florida','The 1764 northward extension has its own dated border');
    assert.equal(await hover(p,[-89.5,32.7]),'Thirteen Colonies','Georgia continues north of the extended province');
    await year(p,1776);
    await p.evaluate('void map.jumpTo({center:[-83.5,30.5],zoom:5.8})');await p.settle();
    assert.equal(await hover(p,[-83.28,30.83]),'British claims in the American Revolution');
    await year(p,1783);
    assert.equal(await hover(p,[-83.28,30.83]),null,'Colonial claims leave in 1783');
    assert.equal(await hover(p,[-84.28,30.44]),null,'The Floridas leave in 1783');
    assert(await p.evaluate('mapScene.assertOrder()'));
  }
}];
