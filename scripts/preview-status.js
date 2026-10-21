(()=>{
 let failures=0,banner,seen;
 function show(text,reload=false){
  if(!banner){banner=document.createElement('div');banner.setAttribute('role','status');banner.style.cssText='position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:10000;background:#392e29;color:white;padding:10px 16px;border-radius:12px;font:14px system-ui;box-shadow:0 3px 20px #0003;max-width:90vw';document.body.append(banner);}
  banner.replaceChildren(document.createTextNode(text));
  if(reload){const button=document.createElement('button');button.textContent='Reload';button.style.cssText='margin-left:12px;padding:6px 10px;border-radius:6px';button.onclick=()=>location.reload();banner.append(button);}
 }
 async function check(){
  if(document.hidden)return;
  try{const response=await fetch('/__preview-health',{cache:'no-store',signal:AbortSignal.timeout(2500)}),state=await response.json();if(!response.ok||state.application!=='boundary-atlas')throw Error('Unavailable');failures=0;
   if(seen===undefined)seen=state.revision;
   if(state.revision!==seen)show('Preview updated',true);else{banner?.remove();banner=null;}
  }catch{if(++failures>=2)show('Preview stopped · Restart the server on your PC');}
 }
 check();setInterval(check,3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();
