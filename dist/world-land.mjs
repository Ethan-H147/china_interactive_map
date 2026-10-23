import {addGlobeOverview} from './globe-overview.mjs';
import {backgroundLandColor,syncBackgroundLand} from './map-palette.mjs';
import {addWorkerSource} from './geo-pack.mjs';
import {internationalLineSourceOptions,internationalBorderPaint} from './adaptive-lines.mjs';

export async function addWorldLand(map){
 const overview=addGlobeOverview(map).catch(error=>{console.warn('Globe overview unavailable',error);return null;});
 const outlines=addWorkerSource(map,'world-country-outlines','data/world-country-outlines.bin',{...internationalLineSourceOptions,attribution:'Country outlines: <a href="https://www.naturalearthdata.com/">Natural Earth</a> · reconciled atlas display edges'}).then(()=>true,error=>{console.warn('World country outlines',error);return false;});
 await addWorkerSource(map,'world-land','data/world-land.bin',{
  type:'geojson',tolerance:0,buffer:64,maxzoom:8,
  attribution:'World land: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (public domain) · <a href="data/world-land-sources.json">Atlas sources &amp; licenses</a> · © OpenStreetMap contributors'
 });
 // Background land and country outlines come from one shared topology.
 // These features never enter country routing or acquire a clickable-country palette.
 map.addLayer({id:'world-land',metadata:{atlas:{role:'land',landPalette:true}},type:'fill',source:'world-land',paint:{
  'fill-color':backgroundLandColor(),'fill-antialias':false
 }});
 await overview;
 if(await outlines)map.addLayer({id:'world-country-outlines',type:'line',source:'world-country-outlines',metadata:{atlasInternationalBorder:true,atlas:{role:'border'}},layout:{'line-join':'round','line-cap':'round'},paint:internationalBorderPaint()});
 globalThis.addEventListener?.('atlas-developer-change',()=>syncBackgroundLand(map));
 // China's non-atlas land neighbours at the precision of China's outline, in a band along it
 // (build-china-neighbours.mjs), so they meet China without gaps; loaded after the world map.
 // Each polygon is its own feature (polygon-parts.mjs), unsimplified like the other portals. China's
 // own displayed land, under its simplified portal, is in the portal grey.
 // Sub-pixel tile simplification, as for China's own fills.
 addWorkerSource(map,'china-neighbour-land','data/china-neighbours.bin',{type:'geojson',tolerance:.25,maxzoom:12},'parts').then(()=>{
  // China's own land is left out while China's map is open (app.js syncPortals keeps this current).
  map.addLayer({id:'china-neighbour-land',metadata:{atlas:{role:'land'}},type:'fill',source:'china-neighbour-land',filter:['!',['in',['get','country'],['literal',globalThis.AtlasCountries?.countries[globalThis.document?.documentElement.dataset.atlas]?.snapshot?.replaces||(globalThis.document?.documentElement.dataset.atlas==='china'?['china']:[])]]],paint:{'fill-color':backgroundLandColor(),'fill-antialias':false}},map.getStyle().layers[map.getStyle().layers.findIndex(l=>l.id==='world-land')+1]?.id);
 }).catch(error=>console.warn('China neighbours',error));
}
