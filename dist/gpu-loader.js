function loadError(error){
  console.error(error);
  document.getElementById('map-loading').hidden=true;
  document.getElementById('status').textContent='Map could not load';
  document.getElementById('load-error').hidden=false;
  document.getElementById('retry').onclick=()=>location.reload();
}
try{
  window.AtlasQuiz=await import('./quiz-engine.mjs');
  window.AtlasNameQuiz=await import('./name-quiz.mjs');
  window.AtlasPlaceTools=await import('./place-tools.mjs');
  window.AtlasKorea=await import('./korea-portal.mjs');
  window.AtlasMongolia=await import('./mongolia.mjs');
  window.AtlasTheme=await import('./atlas-theme.mjs');
  window.AtlasLines=await import('./adaptive-lines.mjs');
  window.AtlasMotion=await import('./motion.mjs');
  window.AtlasCapitals=await import('./capitals.mjs');
  window.AtlasWater=await import('./water.mjs');
  window.AtlasSatellite=await import('./satellite.mjs');
  window.AtlasExplore=await import('./explore.mjs');
  const renderer=await import('./vendor/maplibre-gl.mjs');
  window.maplibregl=renderer;
  renderer.setWorkerCount(2);
  const script=document.createElement('script');
  script.src='app.js';script.onerror=loadError;
  document.head.append(script);
}catch(error){loadError(error);}
