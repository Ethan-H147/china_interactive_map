import {loadCompressed} from './korea-data.mjs';

export async function addWorldLand(map){
 const data=await loadCompressed('data/world-land.bin');
 map.addSource('world-land',{
  type:'geojson',data,tolerance:.25,buffer:64,maxzoom:6,
  attribution:'World land: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain)'
 });
 // A single unoutlined fill keeps foreign political borders out of the background.
 // Satellite imagery and selectable country silhouettes are inserted above it.
 map.addLayer({id:'world-land',type:'fill',source:'world-land',paint:{
  'fill-color':'#e5e5e1','fill-antialias':false
 }});
}
