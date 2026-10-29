import assert from 'node:assert/strict';
export default [1280,390].map(width=>({name:'China keeps its original fill and continuous map through selection '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:2,mobile:width===390});await p.open(base,'#china');
 await p.evaluate(`window.selectionFrames=[];window.sampleSelection=()=>selectionFrames.push({ratio:map.getPixelRatio(),fill:map.getLayoutProperty('province-fill','visibility'),held:document.querySelector('.map-handoff-frame').style.display});map.on('render',sampleSelection);void 0`);
 for(const [code,parent,fill,source]of [[510000,510000,'province-fill','provinces'],[440300,440000,'prefecture-fill','prefectures'],[510104,510000,'city-district-fill','city-districts']]){
  await p.evaluate(`selectRegion(regionByCode.get(${code}),${parent},true)`);await p.settle();
  const opacity=await p.evaluate(`map.style.getLayer('${fill}').paint.get('fill-opacity').evaluate({properties:{adcode:${code}}},map.getFeatureState({source:'${source}',id:${code}}))`);assert.equal(opacity,.3,'Original translucent selection opacity');
 }
 await p.evaluate("map.off('render',sampleSelection);void 0");const frames=await p.evaluate('selectionFrames');assert(frames.length>5);assert(frames.every(f=>f.ratio===2),'Selection never reallocates the canvas');assert(frames.every(f=>f.fill!=='none'),'Original map stays visible');assert(frames.every(f=>f.held==='none'),'No frozen-frame handoff');assert(!await p.evaluate("!!map.getLayer('province-fill-motion')"),'No alternate China map');assert(!p.requests.some(url=>url.includes('/china-motion.bin')),'No preview download');await p.screenshot('china-restored-fill-'+width);
}}));
