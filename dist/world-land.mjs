import {backgroundLandColor,syncBackgroundLand} from './map-palette.mjs';
import {addWorkerSource} from './geo-pack.mjs';

export async function addWorldLand(map){
 await addWorkerSource(map,'world-land','data/world-land.bin',{
  type:'geojson',tolerance:.25,buffer:64,maxzoom:6,
  attribution:'World land: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain)'
 });
 // A single unoutlined fill keeps foreign political borders out of the background.
 // Satellite imagery and selectable country silhouettes are inserted above it.
 map.addLayer({id:'world-land',metadata:{atlas:{role:'land',landPalette:true}},type:'fill',source:'world-land',paint:{
  'fill-color':backgroundLandColor(),'fill-antialias':false
 }});
 globalThis.addEventListener?.('atlas-developer-change',()=>syncBackgroundLand(map));
 // China's non-atlas land neighbours at the precision of China's outline, in a band along it
 // (build-china-neighbours.mjs), so they meet China without gaps; loaded after the world map.
 // Each polygon is its own feature (polygon-parts.mjs), unsimplified like the other portals. China's
 // own displayed land, under its simplified portal, is in the portal grey.
 // Sub-pixel tile simplification, as for China's own fills.
 addWorkerSource(map,'china-neighbour-land','data/china-neighbours.bin',{type:'geojson',tolerance:.25,maxzoom:12},'parts').then(()=>{
  // China's own land is left out while China's map is open (app.js syncPortals keeps this current).
  map.addLayer({id:'china-neighbour-land',metadata:{atlas:{role:'land'}},type:'fill',source:'china-neighbour-land',...(globalThis.document?.documentElement.dataset.atlas==='china'?{filter:['!=',['get','country'],'china']}:{}),paint:{'fill-color':backgroundLandColor(),'fill-antialias':false}},map.getStyle().layers[map.getStyle().layers.findIndex(l=>l.id==='world-land')+1]?.id);
 }).catch(error=>console.warn('China neighbours',error));
}
