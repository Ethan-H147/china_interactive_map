function loadError(error){
  console.error(error);
  document.getElementById('map-loading').hidden=true;
  document.getElementById('status').textContent='Map could not load';
  document.getElementById('load-error').hidden=false;
  document.getElementById('retry').onclick=()=>location.reload();
}
try{
  const modules={AtlasRussia:'russia.mjs',AtlasSoutheastAsia:'southeast-asia.mjs',AtlasSouthAmerica:'south-america.mjs',AtlasArchipelago:'archipelago.mjs',AtlasSearchRanking:'search-ranking.mjs',AtlasJapan:'japan.mjs',AtlasStatistics:'statistics.mjs',AtlasQuiz:'quiz-engine.mjs',AtlasNameQuiz:'name-quiz.mjs',AtlasPlaceTools:'place-tools.mjs',AtlasKorea:'korea-portal.mjs',AtlasMongolia:'mongolia.mjs',AtlasTheme:'atlas-theme.mjs',AtlasLines:'adaptive-lines.mjs',AtlasMotion:'motion.mjs',AtlasCapitals:'capitals.mjs',AtlasWater:'water.mjs',AtlasSatellite:'satellite.mjs',AtlasExplore:'explore.mjs',AtlasLabels:'labels.mjs',AtlasView:'view-state.mjs'};
  modules.AtlasZoomLock='zoom-lock.mjs';
  modules.AtlasMapSources='map-sources.mjs';
  modules.AtlasChinaPage='china-page.mjs';
  modules.AtlasCountryPage='country-page.mjs';
  const rendererPromise=import('./vendor/maplibre-gl.mjs');
  await Promise.all(Object.entries(modules).map(async([name,file])=>{window[name]=await import('./'+file);}));
  const renderer=await rendererPromise;window.maplibregl=renderer;renderer.setWorkerCount(2);
  window.AtlasChinaPage.mountChinaPage();
  const script=document.createElement('script');
  script.src='app.js';script.onerror=loadError;
  document.head.append(script);
}catch(error){loadError(error);}
