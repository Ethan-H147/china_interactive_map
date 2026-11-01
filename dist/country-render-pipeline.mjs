// Keep existing fills and outlines live. Reveal newly installed country detail
// after paint, then attach place labels within a per-frame DOM budget. A gesture cancels
// the previous reveal without touching source data or intended layer visibility.
export function createCountryRenderPipeline(map,scene,{getCountry,pauseLabels,refreshLabels,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,now=()=>performance.now()}={}){
 let generation=0,countryToken=0,holding=false,phase='ready',paintListener,frame=0,destroyed=false;
 const jobs=new Map(),details=new Set(),fillWaiters=new Set();let jobId=0,blockedFrames=0,largestLabelBatch=0;
 const staged=()=>getCountry()!=='china';
 const labelPhase=()=>phase==='labels'||phase==='ready';
 function cancelPaint(){if(paintListener)map.off('render',paintListener);paintListener=null;}
 function cancelWork(){for(const cancel of [...fillWaiters])cancel();generation++;cancelPaint();if(frame)cancelFrame(frame);frame=0;jobs.clear();}
 function painted(callback,token=generation){
  cancelPaint();paintListener=()=>{paintListener=null;if(!destroyed&&token===generation)callback();};
  map.once('render',paintListener);map.triggerRepaint();
 }
 function drain(){
  frame=0;if(destroyed||holding||map.isMoving()||!labelPhase())return;
  const start=now();let count=0;
  for(const [id,run] of jobs){jobs.delete(id);run();count++;if(count>=6||now()-start>=3)break;}
  largestLabelBatch=Math.max(largestLabelBatch,count);
  if(jobs.size)frame=requestFrame(drain);else phase='ready';
 }
 function labels(){
  phase='labels';refreshLabels();if(jobs.size){if(!frame)frame=requestFrame(drain);}else phase='ready';
 }
 function reveal(){
  if(holding||map.isMoving())return;
  phase='borders';const pending=staged()?scene.pendingDetailLayers():[];
  if(pending.length){pending.slice(0,3).forEach(id=>details.add(id));scene.setDetailStage(details);painted(reveal);}
  else{scene.setDetailStage(null);painted(labels);}
 }
 function settle(){
  if(destroyed||holding||map.isMoving())return;
  cancelWork();phase='fill';painted(()=>painted(reveal));
 }
 function pause(){
  if(destroyed)return;cancelWork();phase=map.isMoving()?'moving':'fill';
  // A gesture cancels pending work, never an outline already on the map.
  pauseLabels();
 }
 const start=()=>{blockedFrames++;pause();};
 map.on('movestart',start);map.on('moveend',settle);
 return {
  get labelsReady(){return !holding&&!map.isMoving()&&labelPhase();},
  beginCountry(country=getCountry()){const token=++countryToken;holding=true;pause();details.clear();if(country==='china')scene.setDetailStage(null);else scene.beginDetailStage();return token;},
  finishCountry(token){if(token!==countryToken)return;holding=false;settle();},
  pause,resume(){if(!holding&&!map.isMoving()&&(phase==='fill'||phase==='moving'))settle();},
  paintFill(){
   if(destroyed)return Promise.resolve(false);
   return new Promise(resolve=>{let paints=0;const finish=value=>{map.off('render',check);fillWaiters.delete(cancel);resolve(value);},cancel=()=>finish(false),check=()=>{if(++paints===2)finish(true);else map.triggerRepaint();};fillWaiters.add(cancel);map.on('render',check);map.triggerRepaint();});
  },
  enqueueLabel(run){
   if(destroyed)return ()=>{};const id=++jobId;jobs.set(id,run);
   if(labelPhase()&&!holding){phase='labels';if(!frame)frame=requestFrame(drain);}
   return ()=>jobs.delete(id);
  },
  snapshot:()=>({phase,generation,holding,pendingLabels:jobs.size,stagedBorders:staged(),gestures:blockedFrames,largestLabelBatch,detail:scene.detailStageStats()}),
  destroy(){destroyed=true;cancelWork();map.off('movestart',start);map.off('moveend',settle);scene.setDetailStage(null);}
 };
}
