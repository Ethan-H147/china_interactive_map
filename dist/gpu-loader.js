function loadError(error){
  console.error(error);
  document.getElementById('status').textContent='Map could not load';
  document.getElementById('load-error').hidden=false;
  document.getElementById('retry').onclick=()=>location.reload();
}
try{
  const renderer=await import('./vendor/maplibre-gl.mjs');
  window.maplibregl=renderer;
  renderer.setWorkerCount(2);
  const script=document.createElement('script');
  script.src='app.js';script.onerror=loadError;
  document.head.append(script);
}catch(error){loadError(error);}
