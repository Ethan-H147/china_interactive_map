export const sourceId='satellite-imagery';
export const satelliteSource={
  type:'raster',tileSize:256,minzoom:0,maxzoom:14,
  tiles:['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg'],
  attribution:'<a href="https://cloudless.eox.at" target="_blank" rel="noopener">EOxCloudless</a> by <a href="https://eox.at" target="_blank" rel="noopener">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2025) · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>'
};
export function satelliteVisible({enabled,mode,quiz}){return enabled&&mode==='china'&&!quiz;}
export function imageryOpacity(value){const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(100,number))/100:1;}
export function provinceOpacity(visible,opacity=1){const amount=visible?opacity:0;return ['case',
  ['boolean',['feature-state','inactive'],false],1,
  ['boolean',['feature-state','quizActive'],false],1,
  ['boolean',['feature-state','quizCorrect'],false],.65,
  ['boolean',['feature-state','quizWrong'],false],.55,
  ['boolean',['feature-state','selected'],false],.3-.12*amount,
  ['boolean',['feature-state','hover'],false],.35-.2*amount,
  1-amount];}
export function blendColor(from,to,amount){const channels=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));return '#'+channels(from).map((channel,i)=>Math.round(channel+(channels(to)[i]-channel)*amount).toString(16).padStart(2,'0')).join('');}

export function createSatelliteDisplay(map,host,ui={
  input:document.getElementById('satellite-layer'),
  options:document.getElementById('satellite-options'),
  opacity:document.getElementById('satellite-opacity'),
  output:document.getElementById('satellite-opacity-value'),
  status:document.getElementById('satellite-status')
}){
  let enabled=false,ready=false,hasTile=false,lastVisible=false,lastOpacity=1,lastLayout,timer;
  const schedule=host.schedule||setTimeout,cancel=host.cancel||clearTimeout;
  function message(text){ui.status.textContent=text;ui.status.hidden=!text;}
  function appearance(visible){const opacity=imageryOpacity(ui.opacity.value);if(visible!==lastVisible||(visible&&opacity!==lastOpacity)){lastVisible=visible;lastOpacity=opacity;host.onVisible(visible,opacity);}}
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
    // Keep the inactive Korean Peninsula gray above the imagery.
    map.addLayer({id:sourceId,type:'raster',source:sourceId,layout:{visibility:'none'},paint:{'raster-opacity':imageryOpacity(ui.opacity.value),'raster-fade-duration':200}},map.getLayer('korea-portal-fill')?'korea-portal-fill':'province-fill');
    ready=true;
  }
  function sync(){
    const visible=satelliteVisible({enabled,mode:host.mode(),quiz:host.quiz()});
    ui.options.hidden=!enabled;
    if(!ready){appearance(false);return;}
    if(visible!==lastLayout){map.setLayoutProperty(sourceId,'visibility',visible?'visible':'none');lastLayout=visible;}
    appearance(visible&&hasTile);
    if(visible&&!hasTile&&timer===undefined){
      message('Loading imagery…');
      timer=schedule(()=>{timer=undefined;if(enabled&&!hasTile)fail();},25000);
    }
    if(!visible){stopTimer();if(enabled)message(host.quiz()?'Imagery is hidden during quizzes.':'Imagery is available in China mode.');}
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
    appearance(satelliteVisible({enabled,mode:host.mode(),quiz:host.quiz()})&&hasTile);
  });
  return{sync};
}
