import assert from'node:assert/strict';
export default[{name:'hidden readout retains an intermittent stall after recovery and country changes',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#norway');await p.settle();assert(!await p.evaluate('AtlasPerformance.getPreferences().diagnostics'));
 await p.evaluate('new Promise(resolve=>{map.once("moveend",()=>resolve(true));setTimeout(()=>{const end=performance.now()+220;while(performance.now()<end){}},140);map.easeTo({center:[10.8,61.2],zoom:5,duration:850});})');await p.settle();
 const slow=await p.evaluate('AtlasPerformanceController.snapshot().gestureHistory');assert(slow.slow.some(s=>s.maxFrameGapMs>=100||s.maxRenderGapMs>=100),'A main-thread stall is captured with the readout hidden');const saved=slow.slow.at(-1).sequence;assert(slow.slow.at(-1).resources.sources>0);
 for(let i=0;i<18;i++){await p.evaluate('new Promise(resolve=>{map.once("moveend",()=>resolve(true));map.easeTo({center:['+(10+i%2*.2)+',61.2],duration:80});})');}
 await p.settle();await p.evaluate('changeAtlas("singapore",false)');await p.settle();
 const report=await p.evaluate('AtlasPerformanceController.snapshot()');assert(report.gestureHistory.recent.length<=12);assert(report.gestureHistory.slow.some(s=>s.sequence===saved),'Recovery and a light country do not erase evidence');assert.equal(report.session.visibility,'visible');assert(report.resources.sources>0);assert.equal(await p.evaluate('document.querySelectorAll("#map-performance").length'),0,'No extra interface appears');
 const calls=await p.evaluate('(()=>{let n=0;const f=()=>n++;map.on("render",f);window.__idleCount=()=>n;window.__endIdle=()=>map.off("render",f);return true;})()');await new Promise(r=>setTimeout(r,1500));const before=await p.evaluate('__idleCount()');await new Promise(r=>setTimeout(r,600));assert.equal(await p.evaluate('__idleCount()'),before,'Recording does not keep the map rendering while idle');await p.evaluate('__endIdle();void 0');
}}];
