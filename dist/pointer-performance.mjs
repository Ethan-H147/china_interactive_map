// High-rate input is sampled once per display frame. Clicks remain synchronous.
export function createFrameTask(run,{requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}={}){
 let pending=false,frame,value,generation=0;
 const schedule=next=>{value=next;if(pending)return;pending=true;const token=generation;frame=requestFrame(()=>{if(token!==generation)return;pending=false;const latest=value;value=undefined;run(latest);});};
 schedule.cancel=()=>{generation++;if(pending)cancelFrame(frame);pending=false;value=undefined;};
 return schedule;
}
const hoverFrames=new WeakMap();
// One listener and one frame service all canvas-hover consumers on a map.
export function onMapHover(map,run){
 let entry=hoverFrames.get(map);
 if(!entry){
  const callbacks=new Set(),update=createFrameTask(event=>{for(const callback of callbacks)callback(event);}),canvas=map.getCanvas();
  const stop=()=>update.cancel();map.on('mousemove',update);map.on('movestart',stop);canvas.addEventListener('mouseleave',stop);canvas.addEventListener('pointerdown',stop);
  entry={callbacks,update,canvas,stop};hoverFrames.set(map,entry);
 }
 entry.callbacks.add(run);
 let disposed=false;return ()=>{if(disposed)return;disposed=true;entry.callbacks.delete(run);if(entry.callbacks.size)return;entry.update.cancel();map.off('mousemove',entry.update);map.off('movestart',entry.stop);entry.canvas.removeEventListener('mouseleave',entry.stop);entry.canvas.removeEventListener('pointerdown',entry.stop);hoverFrames.delete(map);};
}
