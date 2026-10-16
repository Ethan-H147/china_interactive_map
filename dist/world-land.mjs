import {loadCompressed} from './korea-data.mjs';
import {polygonParts} from './polygon-parts.mjs';

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
 // China's non-atlas land neighbours at the precision of China's outline, in a band along it
 // (build-china-neighbours.mjs), so they meet China without gaps; loaded after the world map.
 // Each polygon is its own feature (polygon-parts.mjs), unsimplified like the other portals.
 loadCompressed('data/china-neighbours.bin').then(neighbours=>{
  map.addSource('china-neighbour-land',{type:'geojson',data:polygonParts(neighbours),tolerance:0,maxzoom:10});
  map.addLayer({id:'china-neighbour-land',type:'fill',source:'china-neighbour-land',paint:{'fill-color':'#e5e5e1','fill-antialias':false}},map.getStyle().layers[map.getStyle().layers.findIndex(l=>l.id==='world-land')+1]?.id);
 }).catch(error=>console.warn('China neighbours',error));
}
