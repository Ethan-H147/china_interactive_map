function loadError(error){
  console.error(error);
  document.getElementById('map-loading').hidden=true;
  document.getElementById('status').textContent='Map could not load';
  document.getElementById('load-error').hidden=false;
  document.getElementById('retry').onclick=()=>location.reload();
}
try{
  const modules={AtlasRussia:'russia.mjs',AtlasSoutheastAsia:'southeast-asia.mjs',AtlasArchipelago:'archipelago.mjs',AtlasSearchRanking:'search-ranking.mjs',AtlasJapan:'japan.mjs',AtlasStatistics:'statistics.mjs',AtlasQuiz:'quiz-engine.mjs',AtlasPlaceTools:'place-tools.mjs',AtlasKorea:'korea-portal.mjs',AtlasMongolia:'mongolia.mjs',AtlasTheme:'atlas-theme.mjs',AtlasLines:'adaptive-lines.mjs',AtlasMotion:'motion.mjs',AtlasCapitals:'capitals.mjs',AtlasWater:'water.mjs',AtlasSatellite:'satellite.mjs',AtlasExplore:'explore.mjs',AtlasLabels:'labels.mjs',AtlasView:'view-state.mjs'};
  modules.AtlasComfortModule='atlas-comfort.mjs';
  modules.AtlasTypography='inline-typography.mjs';
  modules.AtlasSettings='settings.mjs';
  modules.AtlasPerformance='map-performance.mjs';
  modules.AtlasCountryRenderPipeline='country-render-pipeline.mjs';
  modules.AtlasGlobeRenderer='globe-renderer.mjs';
  modules.AtlasGlobeNavigation='globe-navigation.mjs';
  modules.AtlasInput='map-interaction.mjs';
  modules.AtlasPlaceSearch='place-search.mjs';
  modules.AtlasInteractionPolicy='interaction-policy.mjs';
  modules.AtlasFirstLevelQuiz='first-level-quiz.mjs';
  modules.AtlasMapQuiz='map-quiz.mjs';modules.AtlasUsCountyQuiz='us-county-quiz.mjs';modules.AtlasCityQuiz='city-quiz.mjs';modules.AtlasChinaMiscQuiz='china-misc-quiz.mjs';
  modules.AtlasQuizRecords='quiz-records.mjs';
  modules.AtlasQuizRecordsCore='quiz-records-core.mjs';
  modules.AtlasQuizModes='quiz-modes.mjs';
  modules.AtlasZoomLock='zoom-lock.mjs';
  modules.AtlasMapSources='map-sources.mjs';
  modules.AtlasChinaPage='china-page.mjs';
  modules.AtlasCountryPage='country-page.mjs';
  modules.AtlasFeedback='feedback.mjs';
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
  const [renderer,performanceSettings,settings]=await Promise.all([
    import('./vendor/maplibre-gl.mjs'),import('./map-performance.mjs'),import('./settings.mjs')
  ]);
  window.maplibregl=renderer;
  const {initial,lowMemory}=window.AtlasEntry;
  const country=window.AtlasCountries.countries[initial];
  const background=getComputedStyle(document.body).getPropertyValue('--map').trim()||country.background||'#f4f0e7';
  renderer.setWorkerCount(lowMemory?1:2);
  const map=new renderer.Map({
    container:'map',maxTileCacheSize:lowMemory?12:48,maxTileCacheZoomLevels:2,
    ...(lowMemory?{pixelRatio:Math.min(devicePixelRatio||1,2)}:{}),
    style:{
      version:8,projection:{type:country.polar?'globe':settings.getSettings().projection},
      sources:{},layers:[{id:'background',type:'background',paint:{'background-color':background}}],transition:{duration:0,delay:0}
    },
    center:country.map?.center||[105,36],zoom:country.map?.zoom??3,
    ...(!country.map?.center&&country.home.bounds?{bounds:country.home.bounds,fitBoundsOptions:{padding:30}}:{}),
    minZoom:.5,maxZoom:16,renderWorldCopies:!!country.worldCopies,
    dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,attributionControl:false,
    canvasContextAttributes:performanceSettings.contextOptions(),fadeDuration:0
  });
  window.AtlasEntry.map=map;
  const rememberCamera=event=>{
    if(event.originalEvent)window.AtlasEntry.previewCamera={center:map.getCenter(),zoom:map.getZoom()};
  };
  map.on('move',rememberCamera);
  window.AtlasEntry.finishPreview=()=>{
    map.off('move',rememberCamera);
  };
  await new Promise(resolve=>map.once('load',resolve));
  await Promise.all([
    renderer.importScriptInWorkers(new URL('maplibre-worker-protocols.mjs',location.href).href),
    ...Object.entries(modules).map(async([name,file])=>{window[name]=await import('./'+file);})
  ]);
  window.AtlasChinaPage.mountChinaPage();
  window.AtlasFlagViewer.createFlagViewer();
  const script=document.createElement('script');
  script.src='app.js';script.onerror=loadError;
  document.head.append(script);
}catch(error){loadError(error);}
