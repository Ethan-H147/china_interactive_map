// Decide after native source updates, immediately before drawing. Preparing
// detail remains invisible until every visible international source is ready.
export function attachBorderHandoff(map,{rootLayer,enabled,preferCoarse,version=globalThis.maplibregl?.getVersion?.()}={}){
 let painter,native,hook,disposed=false,awaitingDetail=false;
 let last={supported:false,coarse:false,pending:[],detailedSources:0};
 const unhook=()=>{if(painter&&painter.render===hook)painter.render=native;};
 function install(){
  unhook();painter=map.painter;native=painter?.render;
  last={...last,supported:version==='6.11.2'&&typeof native==='function'};
  if(!last.supported)return;
  hook=function(style,...args){
   const root=style?._layers[rootLayer],zoom=this.transform?.zoom??map.getZoom();
   if(disposed||!enabled()||!root||root.isHidden(zoom))return native.call(this,style,...args);
   const details=style._order.map(id=>style._layers[id]).filter(layer=>layer.type==='line'&&layer.metadata?.atlasInternationalBorder&&!layer.metadata?.atlas?.overview&&!layer.isHidden(zoom));
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
   const suppressed=(coarse?details:[root]).map(layer=>({layer,original:layer.isHidden}));
   for(const {layer}of suppressed)layer.isHidden=()=>true;
   try{return native.call(this,style,...args);}
   finally{for(const {layer,original}of suppressed)layer.isHidden=original;}
  };
  painter.render=hook;
 }
 install();map.on('webglcontextrestored',install);
 return {snapshot:()=>({...last,pending:[...last.pending]}),destroy(){disposed=true;unhook();map.off('webglcontextrestored',install);}};
}
