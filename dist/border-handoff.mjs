// Keep source preparation and displayed detail stable through small zoom reversals.
// Land has its own hysteresis; these thresholds only govern international lines.
export function createBorderZoomPolicy(){
 let prepare=false,coarse=true;
 return {
  update(zoom,enabled=true){
   prepare=!!enabled&&zoom>=(prepare?3:3.5);
   coarse=!enabled||zoom<(coarse?4:3.75);
   return this.snapshot();
  },
  snapshot:()=>({prepare,coarse})
 };
}

// Decide after native source updates, immediately before drawing. Preparing
// detail remains invisible until every visible international source is ready.
export function attachBorderHandoff(map,{rootLayer,enabled,preferCoarse,version=globalThis.maplibregl?.getVersion?.()}={}){
 let painter,native,hook,disposed=false,awaitingDetail=true;const marked=new Set();
 let last={supported:false,coarse:false,pending:[],detailedSources:0};
 const unhook=()=>{if(painter&&painter.render===hook)painter.render=native;};
 function install(){
  unhook();painter=map.painter;native=painter?.render;
  last={...last,supported:version==='6.11.2'&&typeof native==='function'};
  if(!last.supported)return;
  hook=function(style,...args){
   const root=style?._layers[rootLayer],zoom=this.transform?.zoom??map.getZoom();
   if(disposed||!enabled()||!root||root.isHidden(zoom))return native.call(this,style,...args);
   const allDetails=style._order.map(id=>style._layers[id]).filter(layer=>layer.type==='line'&&layer.metadata?.atlasInternationalBorder&&!layer.metadata?.atlas?.overview&&!layer.isHidden(zoom));
   // The global package contains these adapters' exact borders. Do not wait for
   // their lazy sources or switch geometry when a country is opened.
   const owners=new Set(allDetails.flatMap(layer=>layer.metadata?.atlas?.borderPreviewOwners||[]));
   const covered=allDetails.filter(layer=>owners.has(layer.id)),details=allDetails.filter(layer=>!owners.has(layer.id));
   const sources=[...new Set(details.map(layer=>layer.source))];
   const pending=sources.filter(id=>{const manager=style.tileManagers[id];return !manager?.used||manager._paused||manager._sourceErrored||!manager.loaded();});
   const rootReady=!!style.tileManagers[root.source]?.getRenderableIds().length;
   const overview=preferCoarse();if(overview)awaitingDetail=true;
   const coarse=rootReady&&(overview||awaitingDetail&&(!sources.length||pending.length>0));
   // After the first complete detail frame, retain native parent-tile fallback
   // for close-up navigation. A normal pan must not return to world resolution.
   if(!overview&&sources.length&&!pending.length)awaitingDetail=false;
   last={supported:true,coarse,pending,detailedSources:sources.length};
   // Gate only this draw pass. Native visibility outside it still prepares
   // source tiles, and both representations retain their normal paint.
   for(const layer of [root,...allDetails]){layer._atlasBorderSuppressed=false;marked.add(layer);}
   const suppressed=(coarse?allDetails:[root,...covered]).map(layer=>({layer,original:layer.isHidden}));
   for(const {layer}of suppressed)layer._atlasBorderSuppressed=true;
   for(const {layer}of suppressed)layer.isHidden=()=>true;
   try{return native.call(this,style,...args);}
   finally{for(const {layer,original}of suppressed)layer.isHidden=original;}
  };
  painter.render=hook;
 }
 install();map.on('webglcontextrestored',install);
 return {snapshot:()=>({...last,pending:[...last.pending]}),destroy(){disposed=true;unhook();for(const layer of marked)delete layer._atlasBorderSuppressed;marked.clear();map.off('webglcontextrestored',install);}};
}
