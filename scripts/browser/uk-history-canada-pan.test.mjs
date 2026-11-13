import assert from 'node:assert/strict';
import {workerIndexes} from './uk-history-memory-guards.test.mjs';
const prefix='united-kingdom-history';
export default [{name:'1889 Canada keeps its dated fill warm when panning away and back',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-kingdom');await p.evaluate('AtlasComfort.set({appearance:"light"});void document.getElementById("historical-snapshot").click()');await p.waitFor('!!map.getLayer("'+prefix+'-fill")');await p.settle();
 await p.evaluate('void document.querySelector('+JSON.stringify('#'+prefix+'-dock [data-year="1889"]')+').click()');await p.settle();
 const jump=async(center,zoom)=>p.evaluate(`new Promise((resolve,reject)=>{const started=performance.now(),timer=setTimeout(()=>{map.off('render',check);reject(Error('Historical fill did not load'));},15000);function check(){if(!map.isSourceLoaded('${prefix}-faces'))return;map.off('render',check);clearTimeout(timer);resolve(performance.now()-started);}map.on('render',check);map.jumpTo(${JSON.stringify({center,zoom})});})`);
 const timings=[];
 for(const projection of ['mercator','globe']){
  await p.evaluate('void map.setProjection('+JSON.stringify({type:projection})+')');await p.settle();
  for(const zoom of [4,5]){
   await jump([-95,57],zoom);await p.settle();
   for(let repeat=0;repeat<2;repeat++){
    await jump([10,45],zoom);await p.settle();
    const original=await p.evaluate('map.getSource("'+prefix+'-faces").serialize().data');
    const ms=await jump([-95,57],zoom);timings.push({projection,zoom,ms});
    console.log('Canada return',projection,zoom,repeat,Math.round(ms),'ms');
    await p.settle();
    assert.equal(await p.evaluate('map.getSource("'+prefix+'-faces").serialize().data'),original,'Returning reuses the same bounded loading window');
    assert(new URLSearchParams(original.slice(original.indexOf('?')+1)).getAll('scope').length<=2,'At most two view windows remain in the overview');
    assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([-97.5,50.3]))?.en'),'Dominion of Canada');
    assert(await p.evaluate('map.queryRenderedFeatures(map.project([-97.5,50.3]),{layers:["'+prefix+'-fill"]}).length>0'),'The dated fill is actually rendered over Canada');
   }
  }
 }
 await workerIndexes(p);assert(timings.every(t=>t.ms<900),'Every warm return fills within 900 ms: '+JSON.stringify(timings));
 console.log('Canada warm fill return (ms):',JSON.stringify(timings));await p.screenshot('uk-history-1889-canada-warm-return');
}}];
