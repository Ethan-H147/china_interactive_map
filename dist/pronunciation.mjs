/** One lazy native audio element; stop releases its source and decoded audio. */
export function createPronunciationPlayer({onState=()=>{}}={}){
 let audio,epoch=0,state='idle';
 const notify=value=>{state=value;onState(value);};
 const stop=()=>{++epoch;if(audio){audio.pause();audio.removeAttribute('src');audio.load();}notify('idle');};
 return {
  get state(){return state;},
  stop,
  async play(src){
   stop();const request=epoch;
   if(!audio){audio=document.createElement('audio');audio.preload='none';audio.hidden=true;audio.dataset.pronunciation='';document.body.append(audio);audio.addEventListener('ended',stop);audio.addEventListener('error',()=>{if(audio.hasAttribute('src')){stop();notify('error');}});}
   audio.src=new URL(src,import.meta.url).href;notify('loading');
   try{await audio.play();if(request===epoch)notify('playing');}
   catch(error){if(request===epoch){stop();notify('error');}}
  }
 };
}
