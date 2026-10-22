import assert from 'node:assert/strict';
const select=async(p,quality)=>{await p.tap('#settings-open');await p.evaluate(`(()=>{const e=document.getElementById('settings-rendering-quality');e.value=${JSON.stringify(quality)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await p.tap('#settings-close');};
export default [{name:'motion uses bounded quality resolution without interrupting touch and restores native sharpness',options:{width:1024,height:909,mobile:true},async run(p,base){
 await p.open(base,'#china');if(await p.evaluate('map.getProjection().type')!=='globe')await p.tap('#globe-view');await p.settle();
 await p.evaluate(`(()=>{window.budgetTest={ratios:[],starts:0,ends:0};map.on('render',()=>{if(map.isMoving())budgetTest.ratios.push(map.getPixelRatio())});map.on('movestart',()=>budgetTest.starts++);map.on('moveend',()=>budgetTest.ends++);})()`);
 for(const [quality,expected]of [['balanced',[1.5,1.25,1]],['performance',[1,.875,.75]]]){
  await select(p,quality);await p.settle();await p.evaluate('budgetTest.ratios=[];budgetTest.starts=0;budgetTest.ends=0;void 0');
  const before=await p.evaluate('map.getCenter().toArray()');await p.drag('#map',{dx:140,dy:12},{steps:84,duration:3000});await p.settle();
  const report=await p.evaluate('({ratios:[...new Set(budgetTest.ratios)],starts:budgetTest.starts,ends:budgetTest.ends,ratio:map.getPixelRatio(),center:map.getCenter().toArray(),budget:AtlasPerformanceController.snapshot().frameBudget})');
  assert.equal(report.ratios[0],expected[0],quality+' starts at its configured motion resolution');for(const ratio of report.ratios)assert(expected.includes(ratio),quality+' stays within its bounded resolution steps: '+JSON.stringify(report));assert(report.ratios.every((ratio,i)=>!i||ratio<=report.ratios[i-1]),'Resolution only decreases within one gesture');assert(report.budget.adjustments<=2);assert.equal(report.ratio,2);assert.notDeepEqual(report.center,before);assert.equal(report.starts,1,'Canvas changes do not create new gestures');assert.equal(report.ends,1,'Canvas changes do not end the gesture');
 }
 await select(p,'full');await p.evaluate('budgetTest.ratios=[];void 0');await p.drag('#map',{dx:-60,dy:-10},{steps:36,duration:1000});await p.settle();assert((await p.evaluate('budgetTest.ratios')).every(n=>n===2),'Full resolution never adapts');await p.screenshot('adaptive-rendering-restored');
 }}];
