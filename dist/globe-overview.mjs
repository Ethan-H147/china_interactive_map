import {addWorkerSource} from './geo-pack.mjs';
import {getMapScene} from './map-scene.mjs';
import {backgroundLandColor} from './map-palette.mjs';
import {internationalBorderPaint} from './adaptive-lines.mjs';
import {attachBorderHandoff} from './border-handoff.mjs';
import './countries.js';
const ids=['globe-overview-land','globe-overview-borders'];
const unclaimed=open=>['all',['!=',['coalesce',['get','claimedBy'],''],open],['any',['!',['has','claimants']],['in',open||'-',['get','claimants']]]];
export async function addGlobeOverview(map){
 let ready=false,disposed=false,bordersVisible=false,handoff,lastCountry,activeCountry=globalThis.AtlasEntry?.current||'china';
 const wrapHooks=new Map();
 const pinSources=()=>{for(const id of ids){
  const source=map.getSource(id);if(source)source.reparseOverscaled=false;
  const manager=map.style?.tileManagers?.[id];
  if(manager&&typeof manager.handleWrapJump==='function'&&!wrapHooks.has(manager)){
   const native=manager.handleWrapJump;
   // A globe's single root tile already covers every longitude. Re-keying it
   // when the camera normalizes across the date line needlessly reloads it.
   const handle=function(lng){if(map.getProjection()?.type==='globe'){this._prevLng=lng;return;}return native.call(this,lng);};
   manager.handleWrapJump=handle;wrapHooks.set(manager,{native,handle});
  }
 }};
 const snapshot=()=>({ready,activeCountry,overview:!!getMapScene(map)?.overview,borders:handoff?.snapshot(),sourceZoom:0,reparseOverscaled:false});
 const sync=()=>{
  if(disposed)return;pinSources();if(!ready&&ids.every(id=>map.getSource(id)&&map.isSourceLoaded(id)))ready=true;
  const scene=getMapScene(map),supported=!!handoff?.snapshot().supported;
  scene?.setBorderPreparation(ready&&supported&&map.getZoom()>=4.25);
  scene?.setOverview(ready&&map.getZoom()<(scene.overview?5.25:4.75));
  // The frame gate draws one border set after checking the current tile data.
  // Keep the previous zoom-based fallback for unsupported renderer versions.
  const showBorders=supported||!!scene?.overview;
  if(showBorders!==bordersVisible&&map.getLayer(ids[1])){bordersVisible=showBorders;map.setPaintProperty(ids[1],'line-opacity',showBorders?1:0);}
 };
 const countryChanged=country=>{
  activeCountry=country;if(lastCountry===country){sync();return;}lastCountry=country;const registry=globalThis.AtlasCountries,definition=registry.countries[country];
  if(map.getLayer(ids[0])){
   const color=country==='china'?'#e9dfc9':definition?.map?.fill||definition?.portal?.fill||'#d7d7d3';
   map.setPaintProperty(ids[0],'fill-color',['case',['==',['get','country'],country],color,backgroundLandColor()]);
   map.setFilter(ids[0],['all',unclaimed(country),...(definition?.snapshot?.replaces?.length?[['!',['in',['get','country'],['literal',definition.snapshot.replaces]]]]:[])]);
  }
  if(map.getLayer(ids[1]))map.setFilter(ids[1],['all',unclaimed(country),...(definition?.ownFrontier?[['any',['!=',['get','overviewOwner'],'atlas-frontiers'],['!',['in',' '+country+' ',['concat',' ',['get','countries'],' ']]]]]:[])]);
  sync();
 };
 const refreshPalette=()=>{lastCountry=undefined;countryChanged(activeCountry);};
 const controller={snapshot,setCountry:countryChanged,destroy(){disposed=true;handoff?.destroy();map.off('render',sync);map.off('move',sync);map.off('style.load',pinSources);map.off('webglcontextrestored',pinSources);for(const [manager,{native,handle}]of wrapHooks)if(manager.handleWrapJump===handle)manager.handleWrapJump=native;wrapHooks.clear();globalThis.removeEventListener?.('atlas-developer-change',refreshPalette);getMapScene(map)?.setOverview(false);getMapScene(map)?.setBorderPreparation(false);if(map.getLayer(ids[1]))map.setPaintProperty(ids[1],'line-opacity',0);}};
 // Source tile 0 is the whole world. Reusing its buffers at every camera zoom
 // avoids waiting for a new grid of worker tiles during a fast zoom or reversal.
 // Invisible paint keeps both root tiles warm even when opening a saved city
 // view. Land fades independently; borders switch after their tiles are ready.
 await Promise.all(ids.map(id=>addWorkerSource(map,id,'data/'+id+'.bin',{type:'geojson',maxzoom:0,tolerance:0,buffer:64})));
 pinSources();
 const opacity=['interpolate',['linear'],['zoom'],6.5,1,7,0];
 map.addLayer({id:ids[0],source:ids[0],type:'fill',metadata:{atlas:{role:'land',overview:true}},paint:{'fill-color':backgroundLandColor(),'fill-opacity':opacity,'fill-antialias':false}});
 map.addLayer({id:ids[1],source:ids[1],type:'line',metadata:{atlasInternationalBorder:true,atlas:{role:'border',overview:true}},layout:{'line-join':'round','line-cap':'round'},paint:{...internationalBorderPaint(),'line-opacity':0,'line-opacity-transition':{duration:0,delay:0}}});
 handoff=attachBorderHandoff(map,{rootLayer:ids[1],enabled:()=>ready,preferCoarse:()=>!!getMapScene(map)?.overview});
 map.on('render',sync);map.on('move',sync);map.on('style.load',pinSources);map.on('webglcontextrestored',pinSources);
 globalThis.AtlasGlobeOverviewController=controller;
 globalThis.addEventListener?.('atlas-developer-change',refreshPalette);
 countryChanged(activeCountry);map.triggerRepaint();return controller;
}
