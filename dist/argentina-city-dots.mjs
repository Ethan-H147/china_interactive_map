export function createCityDots(map,host){
 const source='argentina-city-points',layer='argentina-city-dots';
 let records=[],selected,hovered=false;
 function install(value){
  records=value;
  if(!map.getSource(source))map.addSource(source,{type:'geojson',promoteId:'id',data:{type:'FeatureCollection',features:records.map(r=>({type:'Feature',properties:{id:r.id,name:r.en},geometry:{type:'Point',coordinates:r.point}}))},attribution:'City locations: <a href="https://www.argentina.gob.ar/georef">Georef / INDEC</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'});
  if(!map.getLayer(layer))map.addLayer({id:layer,type:'circle',source,paint:{'circle-radius':['case',['boolean',['feature-state','selected'],false],3.5,2],'circle-color':'#677d88','circle-opacity':.7,'circle-stroke-color':'#f8fafb','circle-stroke-width':.6}});
  sync();
 }
 function sync(){
  if(!map.getLayer(layer))return;
  map.setLayoutProperty(layer,'visibility',host.active()?'visible':'none');
  const next=host.selected()?.level===3?host.selected().id:null;
  if(next!==selected){if(selected)map.setFeatureState({source,id:selected},{selected:false});if(next)map.setFeatureState({source,id:next},{selected:true});selected=next;}
 }
 function hit(point){
  if(!host.active()||!map.getLayer(layer))return;
  // A larger hit area leaves the visible dot small, including on touchscreens.
  const hits=map.queryRenderedFeatures([[point.x-8,point.y-8],[point.x+8,point.y+8]],{layers:[layer]});
  let closest,distance=Infinity;
  for(const feature of hits){const r=records.find(r=>r.id===feature.properties.id);if(!r)continue;const p=map.project(r.point),d=(p.x-point.x)**2+(p.y-point.y)**2;if(d<distance){distance=d;closest=r;}}
  return closest;
 }
 function clearHover(){if(!hovered)return;const canvas=map.getCanvas?.();if(canvas){canvas.style.cursor='';canvas.title='';}hovered=false;}
 map.on('mousemove',e=>{const r=hit(e.point),canvas=map.getCanvas?.();if(r&&canvas){canvas.style.cursor='pointer';canvas.title=r.en;hovered=true;}else clearHover();});
 function clear(){clearHover();if(map.getLayer(layer))map.removeLayer(layer);if(map.getSource(source))map.removeSource(source);selected=null;records=[];}
 return{install,sync,hit,clear};
}
