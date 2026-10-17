import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export default [{name:'public counties keep their borders throughout district navigation',options:{width:1280,height:820},async run(page,base){
 await page.open(base,'#china');
 await page.waitFor('chinaCounties',{label:'public county boundaries',timeout:60000});
 assert.equal(await page.evaluate('AtlasDev.enabled'),false);
 assert.equal(await page.evaluate('districtCities.size'),329);
 await searchAndSelect(page,'Jinjiang','Jinjiang District');
 await page.evaluate("zoomLock.set(false)");
 // A neighbouring-district flight normally lasts about 220 ms. Give software-rendered
 // CI enough actual moving frames to check continuity rather than testing its FPS.
 await page.evaluate("window.districtCamera={};for(const method of ['easeTo','flyTo']){districtCamera[method]=map[method];map[method]=function(options,...args){return districtCamera[method].call(this,{...options,duration:1200},...args);};}0");
 await page.evaluate("window.districtFrames=[];window.sampleDistrict=()=>{if(cameraBusy)districtFrames.push({visible:map.getLayoutProperty('city-district-lines','visibility'),features:map.queryRenderedFeatures({layers:['city-district-lines']}).length});};map.on('render',sampleDistrict);window.nextDistrict=selectRegion(regionByCode.get(510105),510000);0");
 await page.waitFor('cameraBusy',{label:'district camera movement'});
 await page.waitFor('!cameraBusy',{label:'district navigation complete',timeout:20000});
 await page.evaluate('map.off("render",sampleDistrict);for(const [method,original] of Object.entries(districtCamera))map[method]=original;0');
 const frames=await page.evaluate('districtFrames');
 assert(frames.length>=3,'Multiple moving frames sampled');
 assert(frames.every(f=>f.visible!=='none'&&f.features>0),'District borders stay visible on every frame: '+JSON.stringify(frames));
 assert.equal(await page.evaluate('selected.layer.feature.properties.adcode'),510105);
 assert.equal(await page.evaluate("!!map.getLayer('city-district-lines-motion')"),false,'No stale district preview');
 await page.evaluate("saveView(true);0");
 await page.send("Page.reload");await page.settle();
 await page.waitFor('chinaCounties',{label:'county coverage after reload',timeout:60000});
 assert.equal(await page.evaluate('districtCities.size'),329);
 assert.equal(await page.evaluate('selected?.layer.feature.properties.adcode'),510105,'The county selection survives reload');
}}];
