import {measureCadence} from './frame-timing.mjs';
const button=document.getElementById('run'),output=document.getElementById('rate'),status=document.getElementById('status'),dot=document.querySelector('.dot'),track=document.querySelector('.track');let controller;
async function run(){
 if(controller)return;controller=new AbortController();button.disabled=true;output.textContent='Measuring…';status.textContent='Keep this tab visible while the dot moves.';const distance=Math.max(0,track.clientWidth-dot.clientWidth);
 try{
  const result=await measureCadence({signal:controller.signal,animate:elapsed=>{dot.style.transform='translate3d('+((Math.sin(elapsed/500)+1)*distance/2).toFixed(2)+'px,0,0)';}});
  output.textContent=result.callbackFps.toFixed(1)+' callback fps';
  status.textContent=result.callbackFps>100?'This browser is currently scheduling updates above 100 per second.':result.callbackFps>=50&&result.callbackFps<75?'This page is currently updating near 60 times per second. Browser or device limits may prevent a 100 fps map until that ceiling changes.':'This page is currently scheduling fewer than 100 updates per second. Compare again when the device is cool and the tab stays visible.';
  const report={...result,secureContext:isSecureContext,visibility:document.visibilityState,maximumFrameRateAPI:'maximumFrameRate' in document.timeline?document.timeline.maximumFrameRate:null,animationFrameRateAPI:typeof Animation!=='undefined'&&'frameRate' in Animation.prototype,userAgent:navigator.userAgent};
  document.getElementById('report').value=JSON.stringify(report,null,2);document.getElementById('details').hidden=false;globalThis.AtlasDisplayTiming=report;
 }catch(error){if(error.name!=='AbortError')throw error;output.textContent='Interrupted';status.textContent='Keep this tab visible, then run the check again.';}
 finally{controller=null;button.disabled=false;dot.style.transform='translate3d(0,0,0)';}
}
button.onclick=run;document.addEventListener('visibilitychange',()=>{if(document.hidden)controller?.abort();});if(new URLSearchParams(location.search).has('run'))run();
