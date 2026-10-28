function loadError(error){
  console.error(error);
  document.getElementById('map-loading').hidden=true;
  document.getElementById('status').textContent='Map could not load';
  document.getElementById('load-error').hidden=false;
  document.getElementById('retry').onclick=()=>location.reload();
}
try{
  const modules={AtlasRussia:'russia.mjs',AtlasSoutheastAsia:'southeast-asia.mjs',AtlasSouthAmerica:'south-america.mjs',AtlasArchipelago:'archipelago.mjs',AtlasSearchRanking:'search-ranking.mjs',AtlasJapan:'japan.mjs',AtlasStatistics:'statistics.mjs',AtlasQuiz:'quiz-engine.mjs',AtlasNameQuiz:'name-quiz.mjs',AtlasPlaceTools:'place-tools.mjs',AtlasKorea:'korea-portal.mjs',AtlasMongolia:'mongolia.mjs',AtlasTheme:'atlas-theme.mjs',AtlasLines:'adaptive-lines.mjs',AtlasMotion:'motion.mjs',AtlasCapitals:'capitals.mjs',AtlasWater:'water.mjs',AtlasSatellite:'satellite.mjs',AtlasExplore:'explore.mjs',AtlasLabels:'labels.mjs',AtlasView:'view-state.mjs'};
  modules.AtlasSettings='settings.mjs';
  modules.AtlasPerformance='map-performance.mjs';
  modules.AtlasGlobeRenderer='globe-renderer.mjs';
  modules.AtlasGlobeNavigation='globe-navigation.mjs';
  modules.AtlasInput='map-interaction.mjs';
  modules.AtlasFirstLevelQuiz='first-level-quiz.mjs';
  modules.AtlasQuizOverlay='quiz-overlay.mjs';modules.AtlasUsCountyQuiz='us-county-quiz.mjs';modules.AtlasCityQuiz='city-quiz.mjs';
  modules.AtlasQuizRecords='quiz-records.mjs';
  modules.AtlasQuizRecordsCore='quiz-records-core.mjs';
  modules.AtlasQuizModes='quiz-modes.mjs';
  modules.AtlasZoomLock='zoom-lock.mjs';
  modules.AtlasMapSources='map-sources.mjs';
  modules.AtlasChinaPage='china-page.mjs';
  modules.AtlasCountryPage='country-page.mjs';
  modules.AtlasFlagViewer='flag-viewer.mjs';
  modules.AtlasRegionColors='region-colors.mjs';
  modules.AtlasSouthernAfrica='southern-africa.mjs';
  modules.AtlasEurope='europe.mjs';
  modules.AtlasChinaLevels='china-levels.mjs';
  modules.AtlasSheet='mobile-sheet.mjs';
  modules.AtlasCountryLoader='country-loader.mjs';
  modules.AtlasCameraFit='camera-fit.mjs';
  modules.AtlasMapScene='map-scene.mjs';
  modules.AtlasPointer='pointer-performance.mjs';
  modules.AtlasGeoPack='geo-pack.mjs';
  modules.AtlasChinaSources='china-sources.mjs';
  modules.AtlasChinaMobile='china-mobile.mjs';
  const rendererPromise=import('./vendor/maplibre-gl.mjs');
  await Promise.all(Object.entries(modules).map(async([name,file])=>{window[name]=await import('./'+file);}));
  const renderer=await rendererPromise;window.maplibregl=renderer;renderer.setWorkerCount(window.AtlasEntry.lowMemory?1:2);
  await renderer.importScriptInWorkers(new URL('maplibre-worker-protocols.mjs',location.href).href);
  window.AtlasChinaPage.mountChinaPage();
  window.AtlasFlagViewer.createFlagViewer();
  const script=document.createElement('script');
  script.src='app.js';script.onerror=loadError;
  document.head.append(script);
}catch(error){loadError(error);}
