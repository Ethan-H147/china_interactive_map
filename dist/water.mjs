export function waterVisible({enabled,mode,quiz}){return enabled&&mode==='china'&&!quiz;}

export function createWaterDisplay(map,host){
  const input=document.getElementById('water-layer');
  const status=document.getElementById('water-status');
  const ids=['major-lakes','major-lake-shores','major-rivers'];
  let enabled=false,loading=null,ready=false,lastVisibility;
  function sync(){
    if(!ready)return;
    const visible=waterVisible({enabled,mode:host.mode(),quiz:host.quiz()});
    if(visible===lastVisibility)return;
    lastVisibility=visible;
    ids.forEach(id=>map.setLayoutProperty(id,'visibility',visible?'visible':'none'));
  }
  async function load(){
    const data=await host.load();
    // Match the boundary line tile settings so coincident vertices remain
    // consistent as the GPU simplifies them at each zoom level.
    map.addSource('major-water',{type:'geojson',data,tolerance:.65,maxzoom:18,buffer:128});
    const before='prefecture-lines';
    map.addLayer({id:ids[0],type:'fill',source:'major-water',filter:['==',['get','kind'],'lake'],layout:{visibility:'none'},paint:{'fill-color':'#8cb5c4','fill-opacity':.88,'fill-antialias':true}},before);
    map.addLayer({id:ids[1],type:'line',source:'major-water',filter:['==',['get','kind'],'lake'],layout:{visibility:'none','line-join':'round'},paint:{'line-color':'#608fa3','line-width':['interpolate',['linear'],['zoom'],3,.4,9,.9],'line-opacity':.85}},before);
    // Draw above administrative strokes: a coincident boundary river has one
    // blue stroke instead of a brown line stacked over a translucent blue one.
    map.addLayer({id:ids[2],type:'line',source:'major-water',filter:['==',['get','kind'],'river'],layout:{visibility:'none','line-cap':'round','line-join':'round'},paint:{'line-color':'#608fa3','line-width':['interpolate',['linear'],['zoom'],3,['case',['<=',['get','rank'],4],1.1,.8],8,['case',['<=',['get','rank'],4],2.3,1.5],12,2.8],'line-opacity':1}});
    ready=true;sync();
  }
  input.addEventListener('change',async()=>{
    enabled=input.checked;
    if(enabled&&!ready){
      status.textContent='Loading waterways…';status.hidden=false;
      if(!loading)loading=load();
      try{await loading;status.hidden=true;}
      catch(error){
        enabled=false;input.checked=false;loading=null;
        status.textContent='Waterways could not load. Toggle on to retry.';
        console.warn('Water layer:',error);
      }
    }
    sync();
  });
  return{sync};
}
