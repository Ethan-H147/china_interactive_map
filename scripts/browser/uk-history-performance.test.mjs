import assert from 'node:assert/strict';
export default [{name:'UK 1889 keeps compact paint and hover ownership during real pan and zoom gestures',options:{width:1440,height:960},async run(p,base){
 await p.open(base,'#united-kingdom');await p.evaluate('AtlasComfort.set({appearance:"light"});document.getElementById("historical-snapshot").click()');await p.waitFor('map.getSource("united-kingdom-first")?.type==="vector"');await p.settle();
 await p.evaluate(`document.querySelector('#united-kingdom-history-dock [data-year="1889"]').click();void map.jumpTo({center:[-100,58],zoom:3.5,padding:{top:0,bottom:0,left:0,right:0}})`);await p.waitFor('currentAtlas().historicalYear===1889');await p.settle();
 const ownership=await p.evaluate(`(()=>{const hit=currentAtlas().hoverAt(map.project([-101,55]));return{name:hit?.en,ids:hit?.hoverIds};})()`);
 assert.equal(ownership.name,'Dominion of Canada');assert(ownership.ids.length>100&&ownership.ids.length<250,'Hover targets drawable cells rather than thousands of dissolved cells');
 const result=await p.evaluate(`(()=>{const node=document.getElementById('gb-dated-unit'),start=performance.now();node.value='canada';node.dispatchEvent(new Event('change'));return{ms:performance.now()-start,bytes:JSON.stringify(mapScene.basePaint('united-kingdom-first-selected','line-opacity')).length};})()`);
 assert(result.bytes<10000,'A selected region must not enumerate hundreds of thousands of edge IDs');await p.settle();
 const source=await p.evaluate('JSON.stringify(map.getSource("united-kingdom-first").serialize())');
 await p.evaluate(`window.gestureFrames=[];window.gestureLong=[];let last=performance.now();window.gestureTick=requestAnimationFrame(function tick(){const now=performance.now();gestureFrames.push(now-last);last=now;gestureTick=requestAnimationFrame(tick);});window.gestureObserver=new PerformanceObserver(list=>gestureLong.push(...list.getEntries().map(e=>e.duration)));gestureObserver.observe({type:'longtask'});`);
 for(let i=0;i<3;i++){
  await p.drag([1050,430],[i%2?1250:800,500],{steps:30,duration:850});
  for(const deltaY of [-80,-80,80,80])await p.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:1000,y:450,deltaX:0,deltaY});
 }
 await p.settle();const motion=await p.evaluate(`(()=>{cancelAnimationFrame(gestureTick);gestureObserver.disconnect();const a=gestureFrames.sort((a,b)=>a-b);return{frames:a.length,p95:a[Math.floor(a.length*.95)],max:Math.max(...a),long:gestureLong};})()`);
 console.log('UK 1889 interaction',JSON.stringify({selection:result,motion}));assert(motion.frames>60);assert(motion.p95<50,'Continuous pan/zoom must retain responsive frame cadence');
 assert.equal(await p.evaluate('JSON.stringify(map.getSource("united-kingdom-first").serialize())'),source,'Gestures retain the same geometry source');
 await p.evaluate('void map.jumpTo({center:[-100,58],zoom:3.5,padding:{top:0,bottom:0,left:0,right:0}})');await p.settle();assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([-101,55]))?.en'),'Dominion of Canada');assert(await p.evaluate('mapScene.assertOrder()'));
 assert(!(await p.evaluate('map.getStyle().layers.some(l=>l.id.startsWith("united-kingdom-history-"))')));
 await p.screenshot('uk-1889-performance');
}}];
