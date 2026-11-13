import assert from 'node:assert/strict';
const prefix='united-kingdom-history';
const scenario=motion=>({name:motion?'1889 Canada prepares during a pan and keeps its country geometry ready':'1889 Canada cold fill completes without a prolonged tile-by-tile sweep',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#united-kingdom');await p.evaluate('AtlasComfort.set({appearance:"light"});void map.setProjection({type:"globe"});void document.getElementById("historical-snapshot").click()');await p.waitFor('!!map.getLayer("'+prefix+'-fill")');await p.settle();
 await p.evaluate('void document.querySelector('+JSON.stringify('#'+prefix+'-dock [data-year="1889"]')+').click()');await p.settle();
 const result=await p.evaluate(`new Promise((resolve,reject)=>{
  const samples=[[-123,57],[-110,56],[-101,55],[-86,53],[-75,51],[-92,65]],frames=[],updates=[],started=performance.now(),canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),source=map.getSource('${prefix}-faces'),set=source.setData;let ready=0,ended=0,warmed=0;
  source.setData=function(data){if(map.isMoving())warmed++;updates.push({ms:Math.round(performance.now()-started),center:map.getCenter(),scopes:new URLSearchParams(data.slice(data.indexOf('?')+1)).getAll('scope')});return set.call(this,data);};
  const finish=()=>{map.off('render',sample);map.off('moveend',stopped);source.setData=set;clearTimeout(timer);};
  const stopped=()=>{ended=performance.now()-started;};map.on('moveend',stopped);
  const timer=setTimeout(()=>{finish();reject(Error('Cold historical fill timed out'));},20000);
  function sample(){
   const colors=[],pixel=new Uint8Array(4);for(const location of samples){const q=map.project(location),x=Math.round(q.x*canvas.width/canvas.clientWidth),y=canvas.height-1-Math.round(q.y*canvas.height/canvas.clientHeight);if(x<0||x>=canvas.width||y<0||y>=canvas.height){colors.push(null);continue;}gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);colors.push(Array.from(pixel));}
   frames.push({ms:performance.now()-started,colors,inTarget:map.getCenter().lng<=-75});if(map.isSourceLoaded('${prefix}-faces')&&!map.isMoving())ready++;else ready=0;
   if(ready<3){map.triggerRepaint();return;}finish();resolve({frames,samples,ended,warmed,updates});
  }
  map.on('render',sample);${motion?'map.easeTo({center:[-100,58],zoom:3.5,duration:1400})':'map.jumpTo({center:[-100,58],zoom:3.5})'};
 })`);
 const final=result.frames.at(-1).colors,visible=final.map((c,i)=>c&&c[3]>0?i:-1).filter(i=>i>=0);assert(visible.length>=4,'At least four Canada interior points are visible');
 const same=(a,b)=>a&&b&&a.every((v,i)=>Math.abs(v-b[i])<=2),covered=frame=>frame.inTarget?visible.filter(i=>same(frame.colors[i],final[i])).length:0;
 const first=result.frames.find(f=>covered(f)>0)?.ms,complete=result.frames.find(f=>covered(f)===visible.length)?.ms;let previous=-1;
 const transitions=result.frames.flatMap(f=>{const n=covered(f);if(n===previous)return [];previous=n;return [[Math.round(f.ms),n]];});
 console.log('Canada actual paint:',JSON.stringify({motion,firstPixelMs:first,allPixelsMs:complete,sweepMs:complete-first,afterMotionMs:Math.max(0,complete-result.ended),warmedDuringMotion:result.warmed,updates:result.updates,transitions}));
 assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([-101,55]))?.en'),'Dominion of Canada');
 if(motion){
  assert(result.warmed>0,'The historical overview starts preparing while the camera is moving');assert(complete-result.ended<500,'Canada is filled within 500 ms of ending the first pan');
  await p.settle();const original=await p.evaluate('map.getSource("'+prefix+'-faces").serialize().data');
  for(const center of [[-112,58],[-95,58],[-105,62]]){await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom:3.5})+')');await p.settle();assert.equal(await p.evaluate('map.getSource("'+prefix+'-faces").serialize().data'),original,'Pans within Canada retain the country geometry instead of rebuilding viewport windows');}
 }else{assert(complete<1500,'Cold Canada fill completes within 1.5 seconds: '+complete);assert(complete-first<500,'Visible coloring sweep stays below 500 ms: '+(complete-first));}
 await p.screenshot('uk-history-1889-canada-'+(motion?'moving':'cold')+'-fill');
}});
export default [scenario(false),scenario(true)];
