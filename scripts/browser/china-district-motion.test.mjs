import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export default [{name:'public counties keep their borders throughout district navigation',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#china');
 await page.waitFor('chinaCounties',{label:'public county boundaries',timeout:60000});
 assert.equal(await page.evaluate('AtlasDev.enabled'),false);
 assert.equal(await page.evaluate('districtCities.size'),329);
 await searchAndSelect(page,'Jinjiang','Jinjiang District');
 await page.evaluate("zoomLock.set(false)");
 // Exercise three real district changes. A short flight on a slow renderer can
 // contain fewer than three frames; every frame from every flight must keep its borders.
 await page.evaluate("window.districtFrames=[];window.districtTarget=0;window.sampleDistrict=()=>{if(cameraBusy)districtFrames.push({target:districtTarget,moving:map.isMoving(),visible:map.getLayoutProperty('city-district-lines','visibility'),features:map.queryRenderedFeatures({layers:['city-district-lines']}).length});};map.on('render',sampleDistrict);0");
 for(const code of [510106,510107,510105]){
  await page.evaluate('window.districtTarget='+code+';window.nextDistrict=selectRegion(regionByCode.get('+code+'),510000);0');
  await page.waitFor('cameraBusy',{label:'district camera movement'});
  await page.waitFor('!cameraBusy',{label:'district navigation complete',timeout:20000});
 }
 await page.evaluate('map.off("render",sampleDistrict);0');
 const frames=await page.evaluate('districtFrames');
 assert(frames.length>=3,'Multiple district-navigation frames sampled: '+JSON.stringify(frames));
 for(const code of [510106,510107,510105])assert(frames.some(f=>f.target===code),'A rendered frame from district '+code+': '+JSON.stringify(frames));
 assert(frames.every(f=>f.visible!=='none'&&f.features>0),'District borders stay visible on every frame: '+JSON.stringify(frames));
 assert.equal(await page.evaluate('selected.layer.feature.properties.adcode'),510105);
 assert.equal(await page.evaluate("!!map.getLayer('city-district-lines-motion')"),false,'No stale district preview');
 await page.evaluate("saveView(true);0");
 await page.send("Page.reload");await page.settle();
 await page.waitFor('chinaCounties',{label:'county coverage after reload',timeout:60000});
 assert.equal(await page.evaluate('districtCities.size'),329);
 assert.equal(await page.evaluate('selected?.layer.feature.properties.adcode'),510105,'The county selection survives reload');
}}];
