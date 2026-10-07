const key='boundary-atlas-zoom-lock-v1';

export function createZoomLock(button,{getStorage=()=>localStorage,onLock=()=>{}}={}){
 let locked=false;
 try{locked=getStorage()?.getItem(key)==='true';}catch{}
 function render(){
  button.setAttribute('aria-pressed',String(locked));
  button.title=locked?'Automatic zoom locked · selections keep this view':'Lock automatic zoom on selection';
 }
 function set(value){
  const changed=locked!==!!value;locked=!!value;render();
  try{getStorage()?.setItem(key,String(locked));}catch{}
  if(changed&&locked)onLock();
 }
 button.onclick=()=>set(!locked);render();
 return{get locked(){return locked;},set,allows({manual=false,initial=false,restoring=false}={}){return !locked||manual||initial||restoring;}};
}
