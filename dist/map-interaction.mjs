const storageKey='boundary-atlas-input-v1';
export const modes=['auto','trackpad','mouse'];
export const validateMode=value=>modes.includes(value)?value:'auto';
export function resolveMode(mode,device=globalThis.navigator){
 if(mode!=='auto')return validateMode(mode);
 return /Mac|iPad|iPhone|iPod/i.test((device?.platform||'')+' '+(device?.userAgent||''))?'trackpad':'mouse';
}
export function wheelPixels(event,width,height){
 const unit=event.deltaMode===1?40:1;
 let x=event.deltaX*(event.deltaMode===2?width:unit),y=event.deltaY*(event.deltaMode===2?height:unit);
 if(event.shiftKey&&!x){x=y;y=0;}
 return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:[0,0];
}
function readMode(){try{return validateMode(globalThis.localStorage?.getItem(storageKey));}catch{return 'auto';}}

export function attach(map,{beforeInput=()=>{},canInteract=()=>true}={}){
 const container=map.getCanvasContainer(),easeId='atlas-trackpad';
 let mode=readMode(),frame=0,dx=0,dy=0,lastEvent,gesture=null,touches=0,lastWheelPinch=-Infinity,suppressWheelUntil=0,running=false;
 // Constant easing applies the entire delta on the next map frame. The short
 // lifetime groups moveend/label work across wheel events; it adds no glide.
 const cameraOptions={duration:100,easing:()=>1,essential:true,easeId};
 const trackpad=()=>resolveMode(mode)==='trackpad';
 function cancelFrame(){if(frame)cancelAnimationFrame(frame);frame=0;dx=dy=0;}
 function stop(){cancelFrame();gesture=null;if(running){map.stop();running=false;}}
 function flush(){
  frame=0;if(!canInteract()){dx=dy=0;return;}
  const offset=[dx,dy];dx=dy=0;
  if(offset[0]||offset[1]){running=true;map.panBy(offset,cameraOptions,{originalEvent:lastEvent,atlasTrackpad:true});}
 }
 function point(event){
  const r=map.getCanvas().getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;
  return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=r.width&&y>=0&&y<=r.height?[x,y]:[r.width/2,r.height/2];
 }
 function consume(event){event.preventDefault();event.stopImmediatePropagation();}
 function wheel(event){
  if(!canInteract())return;
  if(event.ctrlKey){
   if(gesture?.driver==='gesture'||performance.now()<suppressWheelUntil){consume(event);return;}
   lastWheelPinch=performance.now();if(gesture)gesture.driver='wheel';
   // MapLibre already handles the standard ctrl+wheel trackpad-pinch stream.
   beforeInput(event);return;
  }
  if(!trackpad())return;
  consume(event);beforeInput(event);
  if(!map.dragPan.isEnabled())return;
  const [x,y]=wheelPixels(event,container.clientWidth,container.clientHeight);
  dx+=x;dy+=y;lastEvent=event;
  if((dx||dy)&&!frame)frame=requestAnimationFrame(flush);
 }
 function gestureStart(event){
  // Touchscreen pinch stays with MapLibre's touch handler. Safari's trackpad
  // GestureEvents have no active screen touches and need their own fallback.
  if(touches||!canInteract())return;
  consume(event);beforeInput({type:'wheel'});cancelFrame();
  const screenPoint=point(event);
  gesture={zoom:map.getZoom(),scale:event.scale>0?event.scale:1,anchor:map.unproject(screenPoint),point:screenPoint,driver:performance.now()-lastWheelPinch<120?'wheel':null};
 }
 function gestureChange(event){
  if(!gesture||touches||!canInteract())return;
  consume(event);if(gesture.driver==='wheel')return;
  if(!(event.scale>0&&Number.isFinite(event.scale)))return;
  gesture.driver='gesture';suppressWheelUntil=performance.now()+150;
  const zoom=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),gesture.zoom+Math.log2(event.scale/gesture.scale)));
  const target=map.calculateAnchoredCameraOptions({anchorLocation:gesture.anchor,anchorScreenPoint:gesture.point,zoom});
  running=true;map.easeTo({...cameraOptions,...target},{originalEvent:event,atlasTrackpad:true});
 }
 function gestureEnd(event){
  if(!gesture)return;consume(event);if(gesture.driver==='gesture')suppressWheelUntil=performance.now()+150;gesture=null;
 }
 const touch=event=>{touches=event.touches?.length||0;};
 const movementEnd=()=>{running=false;};
 const interrupt=()=>{cancelFrame();gesture=null;};
 const visibility=()=>{if(document.hidden)stop();};
 const bindings=[['wheel',wheel],['gesturestart',gestureStart],['gesturechange',gestureChange],['gestureend',gestureEnd],['touchstart',touch],['touchend',touch],['touchcancel',touch],['mousedown',interrupt]];
 for(const [type,handler]of bindings)container.addEventListener(type,handler,{capture:true,passive:false});
 map.on('moveend',movementEnd);document.addEventListener('visibilitychange',visibility);
 function sync(){
  const select=document.getElementById('settings-map-interaction');if(select)select.value=mode;
  const hint=document.getElementById('settings-map-interaction-hint');if(hint)hint.textContent=trackpad()?'Two-finger scrolling pans. Pinch to zoom. Click-drag also pans.':'The scroll wheel zooms. Click-drag pans. Pinch zoom is also supported.';
 }
 function setMode(value){stop();mode=validateMode(value);try{globalThis.localStorage?.setItem(storageKey,mode);}catch{}sync();}
 const storage=event=>{if(event.key===storageKey){stop();mode=validateMode(event.newValue);sync();}};
 globalThis.addEventListener('storage',storage);
 function mountSettings(){
  const content=document.querySelector('#atlas-settings .settings-content');if(!content||document.getElementById('settings-map-interaction'))return;
  const section=document.createElement('fieldset');section.innerHTML='<legend>Mouse &amp; trackpad on this device</legend><label class="settings-field" for="settings-map-interaction">Map controls<select id="settings-map-interaction" aria-describedby="settings-map-interaction-hint"><option value="auto">Automatic</option><option value="trackpad">Trackpad · scroll to pan</option><option value="mouse">Mouse · scroll to zoom</option></select><small id="settings-map-interaction-hint"></small></label>';
  content.append(section);document.getElementById('settings-map-interaction').onchange=event=>setMode(event.target.value);
  document.getElementById('settings-reset').addEventListener('click',()=>setMode('auto'));sync();
 }
 return {mountSettings,setMode,getMode:()=>mode,getResolvedMode:()=>resolveMode(mode),destroy(){stop();for(const [type,handler]of bindings)container.removeEventListener(type,handler,true);map.off('moveend',movementEnd);document.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('storage',storage);}};
}
