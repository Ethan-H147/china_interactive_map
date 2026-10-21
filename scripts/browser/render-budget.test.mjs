import assert from 'node:assert/strict';
const select=async(p,quality)=>{await p.tap('#settings-open');await p.evaluate(`(()=>{const e=document.getElementById('settings-rendering-quality');e.value=${JSON.stringify(quality)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await p.tap('#settings-close');};
export default [{name:'sustained slow drawing adapts resolution without interrupting touch motion and restores native sharpness',options:{width:1024,height:909,mobile:true},async run(p,base){
 await p.open(base,'#china');if(await p.evaluate('map.getProjection().type')!=='globe')await p.tap('#globe-view');await p.settle();
 await p.evaluate(`(()=>{const render=map.painter.render;window.budgetTest={ratios:[],starts:0,ends:0};map.painter.render=function(...args){if(map.isMoving()){const start=performance.now();while(performance.now()-start<32){}}return render.apply(this,args)};map.on('render',()=>{if(map.isMoving())budgetTest.ratios.push(map.getPixelRatio())});map.on('movestart',()=>budgetTest.starts++);map.on('moveend',()=>budgetTest.ends++);})()`);
 for(const [quality,expected]of [['balanced',[1.5,1.25,1]],['performance',[1,.875,.75]]]){
  await select(p,quality);await p.settle();await p.evaluate('budgetTest.ratios=[];budgetTest.starts=0;budgetTest.ends=0;void 0');
  const before=await p.evaluate('map.getCenter().toArray()');await p.drag('#map',{dx:140,dy:12},{steps:84,duration:3000});await p.settle();
  const report=await p.evaluate('({ratios:[...new Set(budgetTest.ratios)],starts:budgetTest.starts,ends:budgetTest.ends,ratio:map.getPixelRatio(),center:map.getCenter().toArray(),budget:AtlasPerformanceController.snapshot().frameBudget})');
  for(const ratio of expected)assert(report.ratios.includes(ratio),quality+' missing '+ratio+': '+JSON.stringify(report));assert.equal(report.ratio,2);assert.notDeepEqual(report.center,before);assert.equal(report.starts,1,'Canvas changes do not create new gestures');assert.equal(report.ends,1,'Canvas changes do not end the gesture');
 }
 await select(p,'full');await p.evaluate('budgetTest.ratios=[];void 0');await p.drag('#map',{dx:-60,dy:-10},{steps:36,duration:1000});await p.settle();assert((await p.evaluate('budgetTest.ratios')).every(n=>n===2),'Full resolution never adapts');await p.screenshot('adaptive-rendering-restored');
 }}];
