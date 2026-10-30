const button=document.getElementById('refresh-app'),message=document.getElementById('message'),root=new URL('./',location.href);
function activated(worker){return new Promise((resolve,reject)=>{if(!worker){reject(Error('Worker unavailable'));return;}const timer=setTimeout(()=>finish(false),20000),changed=()=>{if(worker.state==='activated')finish(true);else if(worker.state==='redundant')finish(false);};function finish(ok){clearTimeout(timer);worker.removeEventListener('statechange',changed);ok?resolve(worker):reject(Error('Worker unavailable'));}worker.addEventListener('statechange',changed);changed();});}
function refresh(worker){return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>finish(false),20000);function finish(ok){clearTimeout(timer);channel.port1.close();ok?resolve():reject(Error('Refresh unavailable'));}channel.port1.onmessage=event=>finish(event.data?.refreshed===true);worker.postMessage({refreshAppFiles:true},[channel.port2]);});}
button.onclick=async()=>{
 if(button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');message.hidden=true;
 try{
  if(!('serviceWorker' in navigator))throw Error('Service workers unavailable');
  const registration=await navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname,updateViaCache:'none'});await registration.update();
  const worker=await activated(registration.installing||registration.waiting||registration.active);await refresh(worker);
  const target=new URL(root);let hash=location.hash;try{if(!hash){const country=localStorage.getItem('boundary-atlas-country-v1');if(/^[a-z0-9-]+$/.test(country||''))hash='#'+country;}}catch{}
  target.hash=hash;target.searchParams.set('app-refreshed',String(Date.now()));location.replace(target.href);
 }catch{message.textContent='Could not refresh the app files. Check your connection and try again.';message.hidden=false;button.disabled=false;button.setAttribute('aria-busy','false');}
};