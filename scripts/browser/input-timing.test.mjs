import assert from 'node:assert/strict';
export default [{name:'mouse diagnostics distinguish native input, camera movement and render submissions',options:{width:1652,height:773},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify({quality:'performance',diagnostics:true}));localStorage.setItem('boundary-atlas-globe-v1','true')"});
 await p.open(base,'#china');await p.waitFor('atlasesReady');await p.drag('#map',{dx:180,dy:30},{steps:36,duration:1000});await p.settle();
 const report=await p.evaluate('AtlasPerformanceController.snapshot()'),trace=report.lastGesture.inputTiming;
 assert(report.graphics.renderer);assert(trace.inputs.pointermove.events>0);assert(trace.cameraChanges>0);assert(trace.renderedCameraPositions>0);assert(trace.renderSubmissions>=trace.renderedCameraPositions);assert(trace.rendererCpuMs.samples>0);assert(trace.rendererCpuMs.p95>=0);
 assert(trace.inputs.pointermove.gaps.samples<=600);assert.equal(report.lastGesture.pixelRatioMin,1,'Diagnostics do not change the selected rendering quality');
 assert(trace.inputs.pointermove.sampleGaps.samples>0);assert(trace.inputs.pointermove.deliveryDelayMs.max>=0,'Native event timestamps remain distinguishable from listener delivery');
 await p.evaluate('AtlasPerformance.setPreferences({diagnostics:false})');await p.drag('#map',{dx:-180,dy:-30},{steps:36,duration:1000});await p.settle();assert.equal(await p.evaluate('AtlasPerformanceController.snapshot().lastGesture.inputTiming'),null,'Detailed tracing is inactive when the readout is hidden');
 }}];
