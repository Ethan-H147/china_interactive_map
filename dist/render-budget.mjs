// Learn from sustained motion, not the expensive first frame of a gesture.
// The idle callback probe supplies a scheduling ceiling, never an FPS claim.
export function createRenderBudget({quality='balanced',deviceRatio=1,displayFps=60}={}){
 let options={quality,deviceRatio,displayFps},levels=[],index=0,target=60,ready=0,last,sum=0,count=0,changes=0,active=false,measured=null;
 function configure(patch){
  const previous=options;options={...options,...patch};
  const native=Number.isFinite(options.deviceRatio)&&options.deviceRatio>0?options.deviceRatio:1;
  const steps=options.quality==='performance'?[1,.875,.75]:options.quality==='balanced'?[1.5,1.25,1]:[native];
  levels=[...new Set(steps.map(value=>Math.min(native,value)))];
  if(previous.quality!==options.quality||previous.deviceRatio!==options.deviceRatio)index=0;
  index=Math.min(index,levels.length-1);
  const requested=options.quality==='performance'?90:60;
  // Leave headroom when callbacks allow it; do not blur a 60 Hz page trying to
  // obtain frames the browser is not scheduling. No map redraws are rate-limited.
  const ceiling=Number.isFinite(options.displayFps)?options.displayFps:60;
  target=Math.min(requested,ceiling>=78?requested:ceiling>=48?60:30);
 }
 function start(now){active=true;ready=now+180;last=undefined;sum=0;count=0;changes=0;measured=null;}
 function sample(now){
  if(!active||options.quality==='full'||now<ready)return null;
  if(last!==undefined){const interval=now-last;if(interval<=0||interval>250){sum=0;count=0;}else{sum+=interval;count++;}}
  last=now;
  if(sum<700||count<20)return null;
  measured=1000*count/sum;sum=0;count=0;
  if(measured>=target*.9||index===levels.length-1||changes>=2)return null;
  index++;changes++;ready=now+250;last=undefined;
  return levels[index];
 }
 configure({});
 return{configure,start,sample,stop(){active=false;last=undefined;sum=0;count=0;},reset(){index=0;},ratio:()=>levels[index],snapshot:()=>({targetFps:target,requestedFps:options.quality==='performance'?90:60,displayCallbackFps:options.displayFps,movingPixelRatio:levels[index],measuredCallbackFps:measured,adjustments:changes})};
}

// The pinned renderer's internal resize preserves a running gesture and applies
// its normal canvas limits. CSS dimensions and geographic detail do not change.
export function resizeDuringMotion(map,ratio,version=globalThis.maplibregl?.getVersion?.()){
 if(version!=='6.11.2'||!Number.isFinite(ratio)||ratio<=0||typeof map._resizeInternal!=='function'||map._lostContextStyle?.style||map.painter?.context?.gl?.isContextLost?.())return false;
 const previous=map._overridePixelRatio;map._overridePixelRatio=ratio;
 try{map._resizeInternal(false);map.triggerRepaint();return true;}
 catch(error){map._overridePixelRatio=previous;throw error;}
}
