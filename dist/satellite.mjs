import {createMapScene} from './map-scene.mjs';
export {provinceOpacity,blendColor} from './map-scene.mjs';
export const sourceId='satellite-imagery';
export const satelliteSource={
  type:'raster',tileSize:256,minzoom:0,maxzoom:19,
  tiles:['https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=AAPTaRY-wBoaKL26yIgOLY0a4ZA..aIn4btMRn549Qv-dDUe7AoA-w3A_Cb71sZnvN25r3zbMDZBmTp7yqeC0COIM4hcmdMnXgoz5CkwOEavPR9veN0iuQvIzUjGRZWQTZg8Id2rin2bMBNji8nO9IQhigj6K911OkkItLEnz6tVY9mQ2s1nzz3JMIUcicr49obsHZ_U_wRBmIuk1Klxi6zboPMekzlV5o4aZCaxSU-Y6Atmiz-K09SxghVeXALUfuQXTOzVrKmB5joMDAT1_855Xcq7d'],
  attribution:'Powered by <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> · Esri, Vantor, Earthstar Geographics, and the GIS User Community'
};
export function satelliteVisible({enabled,quiz}){return enabled&&!quiz;}
export function imageryOpacity(value){const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(100,number))/100:1;}
export function createSatelliteDisplay(map,host,ui={
  input:document.getElementById('satellite-layer'),
  options:document.getElementById('satellite-options'),
  opacity:document.getElementById('satellite-opacity'),
  output:document.getElementById('satellite-opacity-value'),
  status:document.getElementById('satellite-status')
}){
  let enabled=false,ready=false,hasTile=false,lastVisible=false,lastOpacity=1,lastLayout,timer;
  const scene=createMapScene(map);
  const schedule=host.schedule||setTimeout,cancel=host.cancel||clearTimeout;
  function message(text){ui.status.textContent=text;ui.status.hidden=!text;}
  function appearance(visible){
    const opacity=imageryOpacity(ui.opacity.value);
    scene.setSatellite(visible,opacity);
    if(visible!==lastVisible||opacity!==lastOpacity){lastVisible=visible;lastOpacity=opacity;host.onVisible?.(visible,opacity);}
  }
  function stopTimer(){if(timer!==undefined){cancel(timer);timer=undefined;}}
  function fail(){
    stopTimer();enabled=false;ui.input.checked=false;ui.options.hidden=true;
    if(ready)map.setLayoutProperty(sourceId,'visibility','none');
    appearance(false);message('Imagery could not load. Toggle on to retry.');
    // Remove failed requests so the next attempt can fetch fresh tiles.
    if(map.getLayer(sourceId))map.removeLayer(sourceId);
    if(map.getSource(sourceId))map.removeSource(sourceId);
    ready=false;hasTile=false;lastLayout=undefined;
  }
  function ensureLayer(){
    if(ready)return;
    map.addSource(sourceId,satelliteSource);
    // Keep imagery below every country's selectable fills and boundary lines.
    map.addLayer({id:sourceId,metadata:{atlas:{role:'imagery'}},type:'raster',source:sourceId,layout:{visibility:'none'},paint:{'raster-opacity':imageryOpacity(ui.opacity.value),'raster-fade-duration':200}});
    ready=true;
  }
  function sync(){
    host.placeControls?.();
    const visible=satelliteVisible({enabled,quiz:host.quiz()});
    ui.options.hidden=!enabled;
    if(!ready){appearance(false);return;}
    if(visible!==lastLayout){map.setLayoutProperty(sourceId,'visibility',visible?'visible':'none');lastLayout=visible;}
    appearance(visible&&hasTile);
    if(visible&&!hasTile&&timer===undefined){
      message('Loading imagery…');
      timer=schedule(()=>{timer=undefined;if(enabled&&!hasTile)fail();},25000);
    }
    if(!visible){stopTimer();if(enabled)message('Imagery is hidden during quizzes.');}
    else if(hasTile)message('');
  }
  map.on('sourcedata',event=>{
    // Raster tile completion events omit sourceDataType in MapLibre 6.
    if(event.sourceId!==sourceId||!ready||event.tile?.state!=='loaded')return;
    hasTile=true;stopTimer();sync();
  });
  map.on('error',event=>{
    if(event.sourceId!==sourceId||!enabled)return;
    if(hasTile)message('Some imagery tiles could not load.');
    // One failed tile does not disable imagery that can still load elsewhere.
  });
  ui.input.addEventListener('change',()=>{
    enabled=ui.input.checked;
    try{if(enabled)ensureLayer();sync();if(!enabled)message('');}
    catch(error){fail();console.warn('Satellite imagery:',error);}
  });
  ui.opacity.addEventListener('input',()=>{
    const opacity=imageryOpacity(ui.opacity.value);
    ui.output.textContent=Math.round(opacity*100)+'%';
    if(ready)map.setPaintProperty(sourceId,'raster-opacity',opacity);
    appearance(satelliteVisible({enabled,quiz:host.quiz()})&&hasTile);
  });
  return{sync,get state(){return {enabled,ready,hasTile,...scene.satellite};}};
}
